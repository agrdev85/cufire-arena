const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to determine tournament state
function getFrontendState(tournament, now = new Date()) {
  if (!tournament.isActive) return "Finalizado";
  
  if (tournament.currentAmount >= (tournament.maxAmount || Infinity)) {
    if (tournament.startDate && tournament.duration) {
      const endAt = new Date(tournament.startDate.getTime() + tournament.duration * 60000);
      return now < endAt ? "En curso" : "Finalizado";
    }
    return "En curso";
  }
  
  return "Open";
}

// Submit score
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { value } = req.body;
    const userId = req.user.id;

    if (!value || value < 0) {
      return res.status(400).json({ error: 'Puntuación inválida' });
    }

    // Check if user is in any active tournament
    const activeRegistration = await prisma.tournamentRegistration.findFirst({
      where: {
        userId,
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
      const score = await prisma.score.create({
        data: {
          userId,
          value: parseInt(value),
          mode: "Global"
        }
      });

      return res.json({
        mode: "Global",
        scoreId: score.id,
        value: score.value,
        message: "Puntuación global guardada"
      });
    }

    // User is in a tournament, check tournament state
    const tournament = activeRegistration.tournament;
    const frontendState = getFrontendState(tournament);

    if (frontendState !== "En curso") {
      return res.status(400).json({ 
        error: `El torneo no acepta puntuaciones en estado: ${frontendState}` 
      });
    }

    // Submit tournament score
    const score = await prisma.score.create({
      data: {
        userId,
        tournamentId: tournament.id,
        value: parseInt(value),
        mode: "Tournament"
      }
    });

    res.json({
      mode: "Tournament",
      tournamentId: tournament.id,
      scoreId: score.id,
      value: score.value,
      message: "Puntuación de torneo guardada"
    });
  } catch (error) {
    console.error('Submit score error:', error);
    res.status(500).json({ error: 'Error al guardar puntuación' });
  }
});


// Get global leaderboard
router.get('/leaderboard/global', async (req, res) => {
  try {
    const topScores = await prisma.score.findMany({
  where: { mode: "Tournament" },
  include: { user: { select: { username: true } } },
  orderBy: { value: 'desc' },
  take: 10
  });

    const leaderboard = topScores.map((score, index) => ({
      rank: index + 1,
      username: score.user.username,
      score: score.value,
      createdAt: score.createdAt
    }));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Get global leaderboard error:', error);
    res.status(500).json({ error: 'Error al obtener leaderboard global' });
  }
});

// Get tournament leaderboard
router.get('/leaderboard/tournament/:tournamentId', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.tournamentId);
    if (isNaN(tournamentId)) {
      return res.status(400).json({ error: 'ID de torneo inválido' });
    }
    const scores = await prisma.score.findMany({
      where: {
        tournamentId,
        mode: "Tournament"
      },
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: { value: 'desc' },
      take: 100
    });
    const leaderboard = scores.map((score, index) => ({
      rank: index + 1,
      username: score.user.username,
      score: score.value,
      createdAt: score.createdAt
    }));
    res.json({ leaderboard });
  } catch (error) {
    console.error('Get tournament leaderboard error:', error);
    res.status(500).json({ error: 'Error al obtener leaderboard de torneo' });
  }
});

module.exports = router;