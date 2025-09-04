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

// Get all tournaments with calculated state and current amount
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
      const currentAmount = tournament.payments.reduce((sum, payment) => sum + payment.amount, 0);
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
        frontendState: getFrontendState({ ...tournament, currentAmount }, now),
        participantCount: tournament._count.registrations,
        participants: tournament.registrations.map(reg => reg.user.username),
        countdownRemaining: tournament.startDate && tournament.duration && getFrontendState({ ...tournament, currentAmount }, now) === "En curso" 
          ? Math.max(0, Math.floor((new Date(tournament.startDate.getTime() + tournament.duration * 60000) - now) / 1000))
          : null
      };
    });

    res.json({ tournaments: formattedTournaments });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: 'Error al obtener torneos' });
  }
});

// Get tournament by ID - ERROR CORREGIDO AQUÍ
router.get('/:id', async (req, res) => {
   try {
     const tournamentId = parseInt(req.params.id);
     
     if (isNaN(tournamentId)) {
       return res.status(400).json({ error: 'ID de torneo inválido' });
     }

     const tournament = await prisma.tournament.findUnique({
       where: {
         id: tournamentId
       },
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
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const now = new Date();
    const frontendState = getFrontendState(tournament, now);
    
    const formattedTournament = {
      id: tournament.id,
      name: tournament.name,
      description: tournament.description,
      maxPlayers: tournament.maxPlayers,
      maxAmount: tournament.maxAmount,
      currentAmount: tournament.currentAmount,
      registrationFee: tournament.registrationFee,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
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

// Join tournament
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const userId = req.user.id;
    const { txHash } = req.body;

    if (!txHash) {
      return res.status(400).json({ error: 'Hash de transacción requerido' });
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

// Admin: Verify payment
router.put('/payments/:paymentId/verify', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const paymentId = parseInt(req.params.paymentId);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { tournament: true }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    if (payment.isActive) {
      return res.status(400).json({ error: 'El pago ya está verificado' });
    }

    // Update payment and tournament amount
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // Mark payment as verified
      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: { isActive: true }
      });

      // Update tournament current amount
      const tournament = await tx.tournament.update({
        where: { id: payment.tournamentId },
        data: {
          currentAmount: {
            increment: payment.amount
          }
        }
      });

      // Check if tournament should start
      if (tournament.currentAmount >= (tournament.maxAmount || Infinity) && !tournament.startDate) {
        await tx.tournament.update({
          where: { id: tournament.id },
          data: { startDate: new Date() }
        });
      }

      return { payment, tournament };
    });

    res.json({
      message: 'Pago verificado exitosamente',
      paymentId: updatedPayment.payment.id,
      verified: true,
      tournament: {
        id: updatedPayment.tournament.id,
        currentAmount: updatedPayment.tournament.currentAmount,
        frontendState: getFrontendState(updatedPayment.tournament)
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Error al verificar pago' });
  }
});

// Prize calculation function
function getPrizeForRank(rank, maxAmount, prizePercentage = 70) {
  const PRIZE_MAP = [0.30, 0.18, 0.13, 0.09, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
  
  if (rank < 1 || rank > 10) return 0;
  const prizeBase = maxAmount * (prizePercentage / 100);
  return Math.floor(prizeBase * PRIZE_MAP[rank - 1] * 100) / 100;
}

// Create tournament (admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const { name, description, maxPlayers, maxAmount, registrationFee, duration, prizePercentage } = req.body;

    const tournament = await prisma.tournament.create({
      data: {
        name,
        description,
        maxPlayers,
        maxAmount, 
        registrationFee: registrationFee || 10,
        duration,
        prizePercentage: prizePercentage || 70
      }
    });

    res.json({ tournament });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Error al crear torneo' });
  }
});

// Update tournament (admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const tournamentId = parseInt(req.params.id);
    
    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: req.body
    });

    res.json({ tournament });
  } catch (error) {
    console.error('Update tournament error:', error);
    res.status(500).json({ error: 'Error al actualizar torneo' });
  }
});

// Delete tournament (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const tournamentId = parseInt(req.params.id);
    
    await prisma.tournament.delete({
      where: { id: tournamentId }
    });

    res.json({ message: 'Torneo eliminado' });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ error: 'Error al eliminar torneo' });
  }
});

// Get all payments for admin with search and filtering
router.get('/payments', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const { search, status } = req.query;
    
    const where = {};
    if (status === 'pending') where.isActive = false;
    if (status === 'verified') where.isActive = true;
    
    if (search) {
      where.OR = [
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { tournament: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: {
          select: { username: true, email: true, usdtWallet: true }
        },
        tournament: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
});

// Get all users for admin with search
router.get('/users', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const { search } = req.query;
    
    const where = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { usdtWallet: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        usdtWallet: true,
        isAdmin: true,
        gamesPlayed: true,
        gamesWon: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Update user (admin only)
router.put('/users/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const userId = parseInt(req.params.id);
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: req.body,
      select: {
        id: true,
        username: true,
        email: true,
        usdtWallet: true,
        isAdmin: true,
        gamesPlayed: true,
        gamesWon: true
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const userId = parseInt(req.params.id);
    
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// Distribute prizes
router.post('/:id/distribute', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const tournamentId = parseInt(req.params.id);

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        scores: {
          include: {
            user: {
              select: { id: true, username: true }
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
    
    const prizes = tournament.scores.map((score, index) => {
      const rank = index + 1;
      const prizeUSDT = getPrizeForRank(rank, tournament.maxAmount || 0, tournament.prizePercentage || 70);
      
      return {
        rank,
        userId: score.user.id,
        username: score.user.username,
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
      message: 'Premios calculados y torneo finalizado'
    });
  } catch (error) {
    console.error('Distribute prizes error:', error);
    res.status(500).json({ error: 'Error al distribuir premios' });
  }
});

// Check if user has active verified payment in an active tournament
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

// Admin: list pending payments
router.get('/payments/pending', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const payments = await prisma.payment.findMany({
      where: { isActive: false },
      include: {
        user: { select: { username: true, email: true, usdtWallet: true } },
        tournament: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ payments });
  } catch (error) {
    console.error('List pending payments error:', error);
    res.status(500).json({ error: 'Error al listar pagos pendientes' });
  }
});

module.exports = router;