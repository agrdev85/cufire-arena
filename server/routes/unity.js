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
    let name = req.body.name;
    if (!name) {
      name = req.query.name;
    }

    // Si no se envía name, devuelve lista vacía
    if (!name) {
      return res.type('text/plain').send("");
    }

    // Busca el usuario por nombre
    const user = await prisma.user.findUnique({
      where: { username: name }
    });

    if (!user) {
      return res.type('text/plain').send("");
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
    // Lee los 10 mejores puntajes globales de torneos en curso
    const scores = await prisma.score.findMany({
      where: { mode: "Tournament" },
      include: { user: { select: { username: true } } },
      orderBy: { value: 'desc' },
      take: 10
    });
    let result = "";
    for (const score of scores) {
      if (score.user && score.user.username) {
        result += `username=${score.user.username}|Puntos=${score.value};`;
      }
    }
    res.type('text/plain').send(result);
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

    // Busca el usuario por nombre
    const user = await prisma.user.findUnique({
      where: { username: name }
    });

    if (!user) {
      return res.send("error: Usuario no encontrado");
    }

    // Busca un torneo activo
    const activeTournament = await prisma.tournament.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' }
    });

    if (!activeTournament) {
      return res.send("error: No hay torneo activo");
    }

    // Guarda el nuevo puntaje (como escribirHiscore.php)
    await prisma.score.create({
      data: {
        userId: user.id,
        tournamentId: activeTournament.id,
        value: scoreValue,
        mode: "Tournament"
      }
    });

    res.send("SERVER: Bien, se escribieron los datos");
  } catch (error) {
    console.error('Unity submit score error:', error);
    res.send("error: Error interno");
  }
});


module.exports = router;