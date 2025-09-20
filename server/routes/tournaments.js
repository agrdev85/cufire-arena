const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to determine tournament state
function getFrontendState(tournament, now = new Date()) {
  // Si el torneo está marcado como inactivo, está finalizado
  if (!tournament.isActive) return "Finalizado";
  
  // Verificar si el torneo ya ha comenzado y ha terminado
  if (tournament.startDate && tournament.duration) {
    const endTime = new Date(tournament.startDate.getTime() + tournament.duration * 60000);
    if (now > endTime) {
      return "Finalizado";
    }
  }
  
  // Calcular montos actuales (SOLO pagos verificados) y potenciales (todos los pagos)
  const currentAmount = tournament.payments 
    ? tournament.payments.filter(p => p.isActive).reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : tournament.currentAmount || 0;
    
  const potentialAmount = tournament.payments 
    ? tournament.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : tournament.potentialAmount || currentAmount;

  // Verificar límite de recaudación (si está definido)
  if (tournament.maxAmount !== null && tournament.maxAmount !== undefined) {
    // Si el monto actual (VERIFICADO) alcanzó o superó el máximo, el torneo debe comenzar
    if (currentAmount >= tournament.maxAmount) {
      return "En curso";
    }
    
    // Si el monto potencial (incluyendo pendientes) supera el máximo, está completo
    if (potentialAmount + tournament.registrationFee > tournament.maxAmount) {
      return "Completo";
    }
  }

  // Verificar límite de jugadores (si está definido)
  if (tournament.maxPlayers !== null && tournament.maxPlayers !== undefined) {
    const participantCount = tournament.registrations 
      ? tournament.registrations.length 
      : tournament.participantCount || 0;
    
    if (participantCount >= tournament.maxPlayers) {
      return "Completo";
    }
  }

  // Verificar si el torneo ya comenzó por fecha
  if (tournament.startDate && now >= tournament.startDate) {
    return "En curso";
  }

  // Si no se cumple ninguna de las condiciones anteriores, está abierto
  return "Open";
}

// NUEVO: GET - Obtener lista de IDs de torneos finalizados ocultos desde DB
router.get('/hidden-finalized', async (req, res) => {
  try {
    // Primero obtenemos todos los torneos para calcular su estado
    const allTournaments = await prisma.tournament.findMany({
      include: {
        payments: {
          where: { isActive: true }
        }
      }
    });

    const now = new Date();
    
    // Filtramos los torneos que están finalizados según nuestra lógica
    const finalizedTournaments = allTournaments.filter(tournament => {
      const currentAmount = tournament.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const state = getFrontendState({ ...tournament, currentAmount }, now);
      return state === "Finalizado" && tournament.hiddenFinalized;
    });

    res.json({ hidden: finalizedTournaments.map(t => t.id) });
  } catch (error) {
    console.error('Error getting hidden finalized tournaments:', error);
    res.status(500).json({ error: 'Error al obtener torneos ocultos' });
  }
});

// NUEVO: POST - Ocultar/desocultar torneos finalizados (solo admin)
router.post('/hidden-finalized', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'No autorizado' });
    
    const { hidden, id, hideAll } = req.body;
    
    if (hideAll) {
      // Ocultar todos los torneos finalizados
      // Primero obtenemos los IDs de los torneos finalizados
      const allTournaments = await prisma.tournament.findMany({
        include: {
          payments: {
            where: { isActive: true }
          }
        }
      });

      const now = new Date();
      const finalizedIds = allTournaments
        .filter(tournament => {
          const currentAmount = tournament.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
          const state = getFrontendState({ ...tournament, currentAmount }, now);
          return state === "Finalizado";
        })
        .map(t => t.id);

      // Actualizamos todos los torneos finalizados
      await prisma.tournament.updateMany({
        where: { id: { in: finalizedIds } },
        data: { hiddenFinalized: hidden }
      });
      
      return res.json({ success: true, updated: finalizedIds.length });
    }
    
    if (typeof id === 'number') {
      // Ocultar/desocultar individual
      await prisma.tournament.update({
        where: { id },
        data: { hiddenFinalized: hidden }
      });
      return res.json({ success: true });
    }
    
    return res.status(400).json({ error: 'Parámetros inválidos' });
  } catch (error) {
    console.error('Error updating hidden finalized:', error);
    res.status(500).json({ error: 'Error al actualizar torneos ocultos' });
  }
});

// GET - Get all tournaments
router.get('/', async (req, res) => {
  try {
    // Obtener el parámetro hideFinalized (true por defecto)
    const hideFinalized = req.query.hideFinalized !== '0' && req.query.hideFinalized !== 'false';
    
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
        payments: true // CAMBIAR: incluir TODOS los pagos, no solo los activos
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const formattedTournaments = tournaments.map(tournament => {
      // Calcular montos correctamente
      const currentAmount = tournament.payments
        .filter(payment => payment.isActive) // Solo pagos verificados
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
        
      const potentialAmount = tournament.payments // Todos los pagos
        .reduce((sum, payment) => sum + Number(payment.amount), 0);

      const frontendState = getFrontendState({ ...tournament, currentAmount }, now);
      
      let countdownRemaining = null;
      if (tournament.startDate && tournament.duration && frontendState === "En curso") {
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
        potentialAmount,
        registrationFee: tournament.registrationFee,
        prizePercentage: tournament.prizePercentage || 70,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        duration: tournament.duration,
        isActive: tournament.isActive,
        frontendState,
        hiddenFinalized: tournament.hiddenFinalized,
        participantCount: tournament._count.registrations,
        participants: tournament.registrations.map(reg => reg.user.username),
        countdownRemaining
      };
    });

    // Filtrar torneos finalizados ocultos
    const filteredTournaments = hideFinalized 
      ? formattedTournaments.filter(t => 
          t.frontendState !== "Finalizado" || 
          (t.frontendState === "Finalizado" && !t.hiddenFinalized)
        )
      : formattedTournaments;

    res.json({ tournaments: filteredTournaments });
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
        payments: true // CAMBIAR: incluir TODOS los pagos
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const now = new Date();
    const currentAmount = tournament.payments
      .filter(payment => payment.isActive) // Solo pagos verificados
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
      
    const potentialAmount = tournament.payments // Todos los pagos
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
      
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
      potentialAmount,
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
      /*prisma.tournamentRegistration.deleteMany({
        where: { tournamentId }
      }),
      prisma.payment.deleteMany({
        where: { tournamentId }
      }),
       prisma.score.deleteMany({
        where: { tournamentId }
      }), */
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

    // Check if tournament exists and get complete information
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        payments: true, // Get ALL payments
        registrations: true
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    // Calcular montos actuales (solo verificados) y potenciales (todos)
    const currentAmount = tournament.payments
      .filter(payment => payment.isActive)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
      
    const potentialAmount = tournament.payments
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const frontendState = getFrontendState({ ...tournament, currentAmount });
    
    // Solo permitir unirse si el torneo está abierto
    if (frontendState !== "Open") {
      return res.status(400).json({ error: 'El torneo no está abierto a inscripciones' });
    }

    // Check if maxAmount is defined and if adding this registration would exceed it
    if (tournament.maxAmount !== null && tournament.maxAmount !== undefined) {
      if (potentialAmount + tournament.registrationFee > tournament.maxAmount) {
        return res.status(400).json({ 
          error: 'El torneo ha alcanzado su capacidad máxima de recaudación. No se pueden aceptar más inscripciones.' 
        });
      }
    }

    // Check if maxPlayers is defined and if adding this registration would exceed it
    if (tournament.maxPlayers !== null && tournament.maxPlayers !== undefined) {
      const currentPlayers = tournament.registrations.length;

      if (currentPlayers >= tournament.maxPlayers) {
        return res.status(400).json({
          error: 'El torneo ha alcanzado su capacidad máxima de jugadores. No se pueden aceptar más inscripciones.'
        });
      }
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

// GET - Obtener lista global de torneos finalizados ocultos
router.get('/hidden-finalized', (req, res) => {
  res.json({ hidden: hiddenFinalizedTournaments });
});

// POST - Actualizar lista global (solo admin)
router.post('/hidden-finalized', authMiddleware, (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Solo admin' });
  const { hidden } = req.body;
  if (!Array.isArray(hidden)) return res.status(400).json({ error: 'Formato inválido' });
  hiddenFinalizedTournaments = hidden;
  res.json({ hidden: hiddenFinalizedTournaments });
});

router.getFrontendState = getFrontendState;

module.exports = router;