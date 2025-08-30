const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Get global leaderboard
router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        totalScore: true,
        gamesPlayed: true,
        tournamentsWon: true
      },
      orderBy: { totalScore: 'desc' },
      take: 100
    });

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      score: user.totalScore,
      gamesPlayed: user.gamesPlayed,
      tournamentsWon: user.tournamentsWon,
      prize: index < 3 ? getPrizeForRank(index + 1) : null
    }));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get tournament leaderboard
router.get('/tournament/:id', async (req, res) => {
  try {
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId: req.params.id },
      include: {
        user: {
          select: { username: true }
        }
      },
      orderBy: { score: 'desc' }
    });

    const leaderboard = participants.map((participant, index) => ({
      rank: index + 1,
      username: participant.user.username,
      score: participant.score,
      prize: index < 3 ? getPrizeForRank(index + 1) : null
    }));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Get tournament leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get tournament leaderboard' });
  }
});

function getPrizeForRank(rank) {
  const prizes = {
    1: 5000,
    2: 3000,
    3: 2000
  };
  return prizes[rank] || null;
}

module.exports = router;