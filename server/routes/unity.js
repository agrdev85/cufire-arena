const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Almacenamiento simple de sesiones en memoria (sistema por IP)
const activeSessions = new Map();

// Middleware para identificar usuario por IP (sistema original)
const identifyUser = (req, res, next) => {
  const userIP = req.ip || req.connection.remoteAddress;
  req.userIP = userIP;
  
  if (activeSessions.has(userIP)) {
    req.user = activeSessions.get(userIP);
  }
  
  next();
};

router.use(identifyUser);

// Unity Login - Compatible EXACTO con index.php
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.type('text/plain').send("SERVER: error, enter a valid username & password");
    }

    const user = await prisma.user.findUnique({
      where: { username: name }
    });

    if (!user) {
      return res.type('text/plain').send("SERVER: error, invalid username or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.type('text/plain').send("SERVER: error, invalid username or password");
    }

    // Guardar sesión asociada a esta IP (sistema original)
    const userIP = req.ip || req.connection.remoteAddress;
    activeSessions.set(userIP, {
      id: user.id,
      username: user.username
    });

    console.log(`Usuario ${user.username} logueado desde IP: ${userIP}`);

    // Respuesta EXACTA como index.php
    res.type('text/plain').send(`SERVER: ID#${user.id} - ${user.username} Aprobado - ${user.aprobado ? 1 : 0}`);
  } catch (error) {
    console.error('Unity login error:', error);
    res.type('text/plain').send("SERVER: error, Internal Server Error");
  }
});

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.type('text/plain').send("SERVER: error, usuario no autenticado");
  }
  next();
};

// Obtener scores - Compatible EXACTO con leerHiscore.php
router.get('/scores', requireAuth, async (req, res) => {
  try {
    const username = req.user.username;

    console.log(`Buscando scores para usuario: ${username} desde IP: ${req.userIP}`);

    // Buscar usuario y sus torneos (activos y finalizados)
    const user = await prisma.user.findUnique({
      where: { username: username },
      include: {
        tournaments: {
          include: {
            tournament: true
          }
        }
      }
    });

    if (!user) {
      return res.type('text/plain').send("SERVER: error, usuario no encontrado");
    }

    if (user.tournaments.length === 0) {
      return res.type('text/plain').send("SERVER: error, No estas inscrito aun");
    }

    const tournamentIds = user.tournaments.map(t => t.tournamentId);

    // Leer top 10 scores SOLO de los torneos donde está inscrito
    const scores = await prisma.score.findMany({
      where: {
        tournamentId: { in: tournamentIds },
        mode: "Tournament"
      },
      include: { 
        user: { select: { username: true } }
      },
      orderBy: { value: 'desc' },
      take: 10
    });

    if (scores.length === 0) {
      return res.type('text/plain').send("SERVER: error, no hay datos para leer");
    }

    // FORMATO EXACTO de leerHiscore.php: "usernameNombre|Puntos100;usernameOtro|Puntos90;"
    let result = "";
    scores.forEach(score => {
      if (score.user && score.user.username) {
        result += `username${score.user.username}|Puntos${score.value};`;
      }
    });

    console.log(`Enviando scores (formato exacto PHP): ${result}`);
    res.type('text/plain').send(result);
  } catch (error) {
    console.error('Unity get scores error:', error);
    res.type('text/plain').send("SERVER: error, al leer datos en leerHiscore");
  }
});

// Enviar score - Compatible EXACTO con escribirHiscore.php
router.post('/score', async (req, res) => {
  try {
    // Formato EXACTO de escribirHiscore.php: parámetros 'name' y 'puntos'
    const { name, puntos } = req.body;

    console.log(`Recibiendo score: name=${name}, puntos=${puntos}`);

    if (!name || !puntos) {
      return res.type('text/plain').send("SERVER: error, entre datos correctos");
    }

    const scoreValue = parseInt(puntos);
    if (isNaN(scoreValue) || scoreValue < 0) {
      return res.type('text/plain').send("SERVER: error, entre datos correctos");
    }

    // Buscar usuario por nombre (sin autenticación por sesión, como en PHP)
    const user = await prisma.user.findUnique({
      where: { username: name },
      include: {
        tournaments: {
          include: {
            tournament: true
          }
        }
      }
    });

    if (!user) {
      return res.type('text/plain').send("SERVER: error, entre datos correctos");
    }

    if (user.tournaments.length === 0) {
      return res.type('text/plain').send("SERVER: error, usuario no inscrito en torneo");
    }

    // Buscar torneo en curso entre todas las inscripciones
    const now = new Date();
    const currentTournament = user.tournaments.find(treg => {
      const state = require('./tournaments').getFrontendState(treg.tournament, now);
      return state === "En curso";
    });
    if (!currentTournament) {
      return res.type('text/plain').send("SERVER: error, el torneo no está en curso");
    }
    // Insertar score vinculado al torneo en curso
    await prisma.score.create({
      data: {
        userId: user.id,
        tournamentId: currentTournament.tournament.id,
        value: scoreValue,
        mode: "Tournament"
      }
    });
    // Respuesta EXACTA de escribirHiscore.php
    res.type('text/plain').send("SERVER: Bien, se escribieron los datos");
  } catch (error) {
    console.error('Unity submit score error:', error);
    res.type('text/plain').send("SERVER: error, Internal Server Error");
  }
});

// Ruta alternativa para scores con parámetro de usuario (sin autenticación)
router.get('/scores/:username', async (req, res) => {
  try {
    const { username } = req.params;

    console.log(`Buscando scores para usuario por parámetro: ${username}`);

    const user = await prisma.user.findUnique({
      where: { username: username },
      include: {
        tournaments: {
          include: {
            tournament: true
          }
        }
      }
    });

    if (!user) {
      return res.type('text/plain').send("SERVER: error, usuario no encontrado");
    }

    if (user.tournaments.length === 0) {
      return res.type('text/plain').send("SERVER: error, No estas inscrito aun");
    }

    const tournamentIds = user.tournaments.map(t => t.tournamentId);

    const scores = await prisma.score.findMany({
      where: {
        tournamentId: { in: tournamentIds },
        mode: "Tournament"
      },
      include: { 
        user: { select: { username: true } }
      },
      orderBy: { value: 'desc' },
      take: 10
    });

    if (scores.length === 0) {
      return res.type('text/plain').send("SERVER: error, no hay datos para leer");
    }

    // Formato EXACTO de leerHiscore.php
    let result = "";
    scores.forEach(score => {
      if (score.user && score.user.username) {
        result += `username${score.user.username}|Puntos${score.value};`;
      }
    });

    console.log(`Enviando scores: ${result}`);
    res.type('text/plain').send(result);
  } catch (error) {
    console.error('Unity get scores error:', error);
    res.type('text/plain').send("SERVER: error, al leer datos en leerHiscore");
  }
});

// Ruta de health check
router.get('/health', (req, res) => {
  res.type('text/plain').send("SERVER: OK - Server is running");
});

// Limpiar sesiones antiguas cada hora
setInterval(() => {
  console.log(`Limpiando sesiones. Actuales: ${activeSessions.size}`);
  if (activeSessions.size > 50) {
    const keys = Array.from(activeSessions.keys());
    for (let i = 0; i < 10; i++) {
      activeSessions.delete(keys[i]);
    }
  }
}, 60 * 60 * 1000);

module.exports = router;