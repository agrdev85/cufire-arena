const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Unity Login (Server.cs)
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.send("error: Name o Password Invalid!");
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username: name }
    });

    if (!user) {
      return res.send("error: Name o Password Invalid!");
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.send("error: Name o Password Invalid!");
    }

    res.send("Login OK");
  } catch (error) {
    console.error('Unity login error:', error);
    res.send("error: Name o Password Invalid!");
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
    res.send("error: No existe el usuario!");
  }
});

// Unity Get Scores (web.cs)
router.get('/scores', async (req, res) => {
  try {
    const scores = await prisma.score.findMany({
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: { value: 'desc' },
      take: 50
    });

    // Format: username=alex|Puntos=12345;username=carla|Puntos=11000
    const formattedScores = scores.map(score => 
      `username=${score.user.username}|Puntos=${score.value}`
    ).join(';');

    res.send(formattedScores);
  } catch (error) {
    console.error('Unity get scores error:', error);
    res.send("");
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

    // Find user
    const user = await prisma.user.findUnique({
      where: { username: name }
    });

    if (!user) {
      return res.send("error: Usuario no encontrado");
    }

    // Check if user is in any active tournament
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
      // Submit global score
      await prisma.score.create({
        data: {
          userId: user.id,
          value: scoreValue,
          mode: "Global"
        }
      });
    } else {
      // Check tournament state
      const tournament = activeRegistration.tournament;
      const now = new Date();
      
      let frontendState = "Open";
      if (!tournament.isActive) {
        frontendState = "Finalizado";
      } else if (tournament.currentAmount >= (tournament.maxAmount || Infinity)) {
        if (tournament.startDate && tournament.duration) {
          const endAt = new Date(tournament.startDate.getTime() + tournament.duration * 60000);
          frontendState = now < endAt ? "En curso" : "Finalizado";
        } else {
          frontendState = "En curso";
        }
      }

      if (frontendState !== "En curso") {
        return res.send("error: Torneo no acepta puntuaciones");
      }

      // Submit tournament score
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