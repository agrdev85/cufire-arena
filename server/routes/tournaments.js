const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to determine tournament state
function getFrontendState(tournament, now = new Date()) {
  if (!tournament.isActive) return "Finalizado";
  if (tournament.currentAmount >= (tournament.maxAmount || Infinity)) {
    if (!tournament.startDate) {
      return "En curso";
    }
    const endAt = new Date(tournament.startDate.getTime() + (tournament.duration || 90) * 60000);
    if (now < endAt) {
      return "En curso";
    } else {
      // Marcar torneo como finalizado y actualizar isActive y endDate
      if (tournament.isActive) {
        prisma.tournament.update({
          where: { id: tournament.id },
          data: {
            isActive: false,
            endDate: endAt
          }
        }).catch(() => {});
      }
      return "Finalizado";
    }
  }
  return "Open";
}

// GET - Get all tournaments
router.get('/', async (req, res) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        registrations: {
          include: {
            user: {
              select: { username: true }
            }
          }
        },
        _count: {
          select: { registrations: true }
        },
        payments: {
          where: { isActive: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const formattedTournaments = tournaments.map(tournament => {
      const currentAmount = tournament.payments
        .filter(payment => payment.isActive)
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      const frontendState = getFrontendState({ ...tournament, currentAmount }, now);
      let countdownRemaining = null;
      if (
        tournament.startDate &&
        tournament.duration &&
        frontendState === "En curso"
      ) {
        const endTime = new Date(tournament.startDate.getTime() + tournament.duration * 60000);
        countdownRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
      }
      return {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        maxPlayers: tournament.maxPlayers,
        maxAmount: tournament.maxAmount,
        currentAmount,
        registrationFee: tournament.registrationFee,
        prizePercentage: tournament.prizePercentage || 70,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        duration: tournament.duration,
        isActive: tournament.isActive,
        frontendState,
        participantCount: tournament._count.registrations,
        participants: tournament.registrations.map(reg => reg.user.username),
        countdownRemaining
      };
    });
    res.json({ tournaments: formattedTournaments });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: 'Error al obtener torneos' });
  }
});

// GET - Get tournament by ID
router.get('/:id', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({ error: 'ID de torneo inválido' });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        registrations: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        },
        scores: {
          include: {
            user: {
              select: { username: true }
            }
          },
          orderBy: { value: 'desc' }
        },
        payments: {
          where: { isActive: true }
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const now = new Date();
    const currentAmount = tournament.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const frontendState = getFrontendState({ ...tournament, currentAmount }, now);
    
    let endDate = tournament.endDate;
    // Calcular endDate si tiene startDate y duration
    if (tournament.startDate && tournament.duration) {
      const calculatedEnd = new Date(tournament.startDate.getTime() + tournament.duration * 60000);
      if (!endDate || frontendState === "Finalizado") {
        endDate = calculatedEnd;
      }
    }
    const formattedTournament = {
      id: tournament.id,
      name: tournament.name,
      description: tournament.description,
      maxPlayers: tournament.maxPlayers,
      maxAmount: tournament.maxAmount,
      currentAmount,
      registrationFee: tournament.registrationFee,
      prizePercentage: tournament.prizePercentage || 70,
      startDate: tournament.startDate,
      endDate,
      duration: tournament.duration,
      isActive: tournament.isActive,
      frontendState,
      participantCount: tournament.registrations.length,
      participants: tournament.registrations.map(reg => ({
        id: reg.user.id,
        username: reg.user.username,
        joinedAt: reg.registeredAt
      })),
      leaderboard: tournament.scores.map((score, index) => ({
        rank: index + 1,
        username: score.user.username,
        score: score.value,
        createdAt: score.createdAt
      })),
      countdownRemaining: tournament.startDate && tournament.duration && frontendState === "En curso" 
        ? Math.max(0, Math.floor((new Date(tournament.startDate.getTime() + tournament.duration * 60000) - now) / 1000))
        : null
    };

    res.json({ tournament: formattedTournament });
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ error: 'Error al obtener torneo' });
  }
});

// POST - Create tournament (admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const { name, description, maxPlayers, maxAmount, registrationFee, duration, prizePercentage } = req.body;

    if (!name || !maxAmount || !registrationFee) {
      return res.status(400).json({ error: 'Nombre, monto máximo y tarifa de registro son requeridos' });
    }

    const tournament = await prisma.tournament.create({
      data: {
        name,
        description,
        maxPlayers: maxPlayers || null,
        maxAmount,
        registrationFee,
        duration: duration || null,
        prizePercentage: prizePercentage || 70
      }
    });

    res.status(201).json({ 
      message: 'Torneo creado exitosamente',
      tournament 
    });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Error al crear torneo' });
  }
});

// PUT - Update tournament (admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const tournamentId = parseInt(req.params.id);
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({ error: 'ID de torneo inválido' });
    }

    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: req.body
    });

    res.json({ 
      message: 'Torneo actualizado exitosamente',
      tournament 
    });
  } catch (error) {
    console.error('Update tournament error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }
    res.status(500).json({ error: 'Error al actualizar torneo' });
  }
});

// DELETE - Delete tournament (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const tournamentId = parseInt(req.params.id);
    
    if (isNaN(tournamentId)) {
      return res.status(400).json({ error: 'ID de torneo inválido' });
    }

    // Primero eliminamos registros relacionados para evitar errores de foreign key
    await prisma.$transaction([
      prisma.tournamentRegistration.deleteMany({
        where: { tournamentId }
      }),
      prisma.payment.deleteMany({
        where: { tournamentId }
      }),
      prisma.score.deleteMany({
        where: { tournamentId }
      }),
      prisma.tournament.delete({
        where: { id: tournamentId }
      })
    ]);

    res.json({ message: 'Torneo eliminado exitosamente' });
  } catch (error) {
    console.error('Delete tournament error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }
    res.status(500).json({ error: 'Error al eliminar torneo' });
  }
});

// POST - Join tournament
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const userId = req.user.id;
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({ error: 'Hash de transacción requerido' });
    }

    if (isNaN(tournamentId)) {
      return res.status(400).json({ error: 'ID de torneo inválido' });
    }

    // Check if tournament exists and is in Open state
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const frontendState = getFrontendState(tournament);
    if (frontendState !== "Open") {
      return res.status(400).json({ error: 'El torneo no está abierto a inscripciones' });
    }

    // Check if user is already in any active tournament
    const existingRegistration = await prisma.tournamentRegistration.findFirst({
      where: {
        userId,
        tournament: {
          isActive: true
        }
      }
    });

    if (existingRegistration) {
      return res.status(400).json({ error: 'Ya estás inscrito en otro torneo activo' });
    }

    // Check if user already joined this tournament
    const existingTournamentRegistration = await prisma.tournamentRegistration.findUnique({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId
        }
      }
    });

    if (existingTournamentRegistration) {
      return res.status(400).json({ error: 'Ya estás inscrito en este torneo' });
    }

    // Create payment record (pending verification)
    const payment = await prisma.payment.create({
      data: {
        userId,
        tournamentId,
        txHash,
        amount: tournament.registrationFee,
        isActive: false // Pending admin verification
      }
    });

    // Create tournament registration
    const registration = await prisma.tournamentRegistration.create({
      data: {
        userId,
        tournamentId
      }
    });

    res.status(201).json({
      message: 'Inscripción exitosa. Pago pendiente de verificación.',
      paymentId: payment.id,
      registrationId: registration.id,
      status: 'pending'
    });
  } catch (error) {
    console.error('Join tournament error:', error);
    res.status(500).json({ error: 'Error al unirse al torneo' });
  }
});

// POST - Distribute prizes (admin only)
router.post('/:id/distribute', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const tournamentId = parseInt(req.params.id);

    if (isNaN(tournamentId)) {
      return res.status(400).json({ error: 'ID de torneo inválido' });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        scores: {
          include: {
            user: {
              select: { id: true, username: true, usdtWallet: true }
            }
          },
          orderBy: { value: 'desc' },
          take: 10
        },
        payments: {
          where: { isActive: true }
        }
      }
    });

    if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

    const currentAmount = tournament.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const frontendState = getFrontendState({ ...tournament, currentAmount });
    
    if (frontendState !== "Finalizado") {
      return res.status(400).json({ error: 'El torneo debe estar finalizado para distribuir premios' });
    }
    
    // Prize calculation function
    function getPrizeForRank(rank, maxAmount, prizePercentage = 70) {
      const PRIZE_MAP = [0.30, 0.18, 0.13, 0.09, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
      
      if (rank < 1 || rank > 10) return 0;
      const prizeBase = maxAmount * (prizePercentage / 100);
      return Math.floor(prizeBase * PRIZE_MAP[rank - 1] * 100) / 100;
    }

    const prizes = tournament.scores.map((score, index) => {
      const rank = index + 1;
      const prizeUSDT = getPrizeForRank(rank, tournament.maxAmount || 0, tournament.prizePercentage || 70);
      
      return {
        rank,
        userId: score.user.id,
        username: score.user.username,
        usdtWallet: score.user.usdtWallet,
        score: score.value,
        prizeUSDT
      };
    });

    // Mark tournament as inactive (distributed)
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { isActive: false }
    });

    res.json({
      tournamentId,
      prizes,
      totalPrizePool: prizes.reduce((sum, prize) => sum + prize.prizeUSDT, 0),
      message: 'Premios calculados y torneo finalizado'
    });
  } catch (error) {
    console.error('Distribute prizes error:', error);
    res.status(500).json({ error: 'Error al distribuir premios' });
  }
});


// GET - Check if user has active registration
router.get('/active-registration', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const payment = await prisma.payment.findFirst({
      where: {
        userId,
        isActive: true,
        tournament: { isActive: true }
      },
      select: { tournamentId: true }
    });
    res.json({ hasActiveRegistration: !!payment, tournamentId: payment?.tournamentId || null });
  } catch (error) {
    console.error('Active registration check error:', error);
    res.status(500).json({ error: 'Error al verificar registro activo' });
  }
});

router.getFrontendState = getFrontendState;

module.exports = router;