const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        participants: {
          include: {
            user: {
              select: { username: true }
            }
          }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    const formattedTournaments = tournaments.map(tournament => ({
      ...tournament,
      participants: tournament.participants.length,
      participantsList: tournament.participants.map(p => p.user.username)
    }));

    res.json({ tournaments: formattedTournaments });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: 'Failed to get tournaments' });
  }
});

// Get tournament by ID
router.get('/:id', async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          },
          orderBy: { score: 'desc' }
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({ tournament });
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ error: 'Failed to get tournament' });
  }
});

// Join tournament
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const userId = req.user.id;

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { participants: true }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.status === 'ENDED') {
      return res.status(400).json({ error: 'Tournament has ended' });
    }

    if (tournament.participants.length >= tournament.maxParticipants) {
      return res.status(400).json({ error: 'Tournament is full' });
    }

    // Check if user already joined
    const existingParticipant = await prisma.tournamentParticipant.findUnique({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId
        }
      }
    });

    if (existingParticipant) {
      return res.status(400).json({ error: 'Already joined this tournament' });
    }

    // Join tournament
    const participant = await prisma.tournamentParticipant.create({
      data: {
        userId,
        tournamentId
      }
    });

    res.json({ 
      message: 'Successfully joined tournament',
      participant 
    });
  } catch (error) {
    console.error('Join tournament error:', error);
    res.status(500).json({ error: 'Failed to join tournament' });
  }
});

// Update tournament score
router.post('/:id/score', authMiddleware, async (req, res) => {
  try {
    const { score } = req.body;
    const tournamentId = req.params.id;
    const userId = req.user.id;

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    const participant = await prisma.tournamentParticipant.findUnique({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId
        }
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Not participating in this tournament' });
    }

    // Update score
    const updatedParticipant = await prisma.tournamentParticipant.update({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId
        }
      },
      data: { score }
    });

    // Update user total score
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalScore: {
          increment: score - participant.score
        },
        gamesPlayed: {
          increment: 1
        }
      }
    });

    res.json({ 
      message: 'Score updated successfully',
      participant: updatedParticipant 
    });
  } catch (error) {
    console.error('Update score error:', error);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

module.exports = router;