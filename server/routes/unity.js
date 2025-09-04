const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');


const router = express.Router();
const prisma = new PrismaClient();


// Middleware para parsear 'application/x-www-form-urlencoded'
router.use(express.urlencoded({ extended: true }));


// Función auxiliar para determinar el estado de un torneo
function getFrontendState(tournament, now = new Date()) {
  if (!tournament.isActive) return "Finalizado";

  const maxAmount = tournament.maxAmount || Infinity;

  if (tournament.currentAmount >= maxAmount) {
    if (tournament.startDate && tournament.duration) {
      const endAt = new Date(tournament.startDate.getTime() + tournament.duration * 60000);
      return now < endAt ? "En curso" : "Finalizado";
    }
    return "En curso";
  }

  return "Open";
}


// Unity Login (Server.cs)
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.send("error: Name o Password Invalid!");
    }

    const user = await prisma.user.findUnique({
      where: { username: name }
    });

    if (!user) {
      return res.send("error: Name o Password Invalid!");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.send("error: Name o Password Invalid!");
    }

    res.send("Login OK");
  } catch (error) {
    console.error('Unity login error:', error);
    res.send("error: Internal Server Error");
  }
});


// Unity Check User (web.cs)
router.post('/checkuser', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.send("error: No existe el usuario!");
    }

    const user = await prisma.user.findUnique({
      where: { username: name }
    });

    if (!user) {
      return res.send("error: No existe el usuario!");
    }

    res.send("User exists");
  } catch (error) {
    console.error('Unity check user error:', error);
    res.send("error: Internal Server Error");
  }
});


// Unity Get Scores (web.cs)
router.get('/scores', async (req, res) => {
  try {
    const { name } = req.query;
    let scores;
    let usernameToFetch = name || 'Anonymous'; // Usamos un nombre de usuario anónimo si no se proporciona
    
    // Primero, encuentra al usuario para obtener su ID
    const user = await prisma.user.findUnique({
        where: { username: usernameToFetch }
    });
    
    if (!user) {
        // Si el usuario no existe, devuelve una lista vacía de puntajes
        return res.type('text/plain').send("");
    }

    // Ahora, busca directamente una inscripción activa para ese usuario.
    const activeRegistration = await prisma.tournamentRegistration.findFirst({
        where: {
            userId: user.id,
            tournament: {
                isActive: true
            }
        },
        include: {
            tournament: true
        }
    });

    if (activeRegistration) {
        const tournamentId = activeRegistration.tournamentId;
        scores = await prisma.score.findMany({
            where: { tournamentId: tournamentId, mode: "Tournament" },
            include: {
                user: { select: { username: true } }
            },
            orderBy: { value: 'desc' },
            take: 50
        });
    } else {
        // Si no está en un torneo activo, obtiene los puntajes globales
        scores = await prisma.score.findMany({
            where: { tournamentId: null, mode: "Global" },
            include: {
                user: { select: { username: true } }
            },
            orderBy: { value: 'desc' },
            take: 50
        });
    }

    // Filtra los puntajes para asegurar que tienen un usuario válido antes de enviarlos a Unity.
    const formattedScores = scores
      .filter(score => score.user && score.user.username)
      .map(score =>
        `username=${score.user.username}|Puntos=${score.value}`
      ).join(';');

    res.type('text/plain').send(formattedScores);
  } catch (error) {
    console.error('Unity get scores error:', error);
    res.type('text/plain').send("");
  }
});


// Unity Submit Score (web.cs)
router.post('/score', async (req, res) => {
  try {
    const { name, puntos } = req.body;

    if (!name || !puntos) {
      return res.send("error: Datos incompletos");
    }

    const scoreValue = parseInt(puntos);
    if (isNaN(scoreValue) || scoreValue < 0) {
      return res.send("error: Puntuación inválida");
    }

    const user = await prisma.user.findUnique({
      where: { username: name }
    });

    if (!user) {
      return res.send("error: Usuario no encontrado");
    }

    const activeRegistration = await prisma.tournamentRegistration.findFirst({
      where: {
        userId: user.id,
        tournament: {
          isActive: true
        }
      },
      include: {
        tournament: true
      }
    });

    if (!activeRegistration) {
      await prisma.score.create({
        data: {
          userId: user.id,
          value: scoreValue,
          mode: "Global"
        }
      });
    } else {
      const tournament = activeRegistration.tournament;
      const state = getFrontendState(tournament);

      if (state !== "En curso") {
        return res.send("error: Torneo no acepta puntuaciones");
      }

      await prisma.score.create({
        data: {
          userId: user.id,
          tournamentId: tournament.id,
          value: scoreValue,
          mode: "Tournament"
        }
      });
    }

    res.send("OK");
  } catch (error) {
    console.error('Unity submit score error:', error);
    res.send("error: Error interno");
  }
});


module.exports = router;