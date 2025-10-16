const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to determine tournament state (MEJORADA)
function getFrontendState(tournament, now = new Date()) {
  // Si el torneo está marcado como inactivo, está finalizado
  if (!tournament.isActive) return "Finalizado";
  
  // Verificar si el torneo ya ha comenzado y ha terminado por tiempo
  if (tournament.startDate && tournament.duration) {
    const endTime = new Date(tournament.startDate.getTime() + tournament.duration * 60000);
    if (now > endTime) {
      return "Finalizado";
    }
  }
  
  // Calcular montos actuales (SOLO pagos verificados)
  const currentAmount = tournament.payments 
    ? tournament.payments.filter(p => p.isActive).reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : tournament.currentAmount || 0;
    
  const potentialAmount = tournament.payments 
    ? tournament.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    : tournament.potentialAmount || currentAmount;

  // Verificar límite de recaudación (si está definido)
  if (tournament.maxAmount !== null && tournament.maxAmount !== undefined) {
    // Si el monto actual (VERIFICADO) alcanzó o superó el máximo
    if (currentAmount >= tournament.maxAmount) {
      // Si ya comenzó, está en curso; si no, está completo
      if (tournament.startDate && now >= tournament.startDate) {
        return "En curso";
      }
      return "Completo";
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
      // Si ya comenzó, está en curso; si no, está completo
      if (tournament.startDate && now >= tournament.startDate) {
        return "En curso";
      }
      return "Completo";
    }
  }

  // Verificar si el torneo ya comenzó por fecha
  if (tournament.startDate && now >= tournament.startDate) {
    // Si tiene duración, verificar si ya terminó
    if (tournament.duration) {
      const endTime = new Date(tournament.startDate.getTime() + tournament.duration * 60000);
      if (now > endTime) {
        return "Finalizado";
      }
    }
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

    // Primero actualizamos los scores para que persistan (set tournamentId = null)
    await prisma.score.updateMany({
      where: { tournamentId },
      data: { tournamentId: null }
    });

    // Luego eliminamos el torneo (los registros y pagos se eliminan en cascada)
    await prisma.tournament.delete({
      where: { id: tournamentId }
    });

    res.json({ message: 'Torneo eliminado exitosamente' });
  } catch (error) {
    console.error('Delete tournament error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }
    res.status(500).json({ error: 'Error al eliminar torneo' });
  }
});


// POST - Distribute prizes (admin only) - MEJORADO
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
        },
        registrations: true
      }
    });

    if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

    const currentAmount = tournament.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const frontendState = getFrontendState({ 
      ...tournament, 
      currentAmount,
      participantCount: tournament.registrations.length
    });
    
    if (frontendState !== "Finalizado") {
      return res.status(400).json({ 
        error: 'El torneo debe estar finalizado para distribuir premios',
        currentState: frontendState
      });
    }
    
    // Prize calculation function
    function getPrizeForRank(rank, maxAmount, prizePercentage = 70) {
      const PRIZE_MAP = [0.30, 0.18, 0.13, 0.09, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
      
      if (rank < 1 || rank > 10) return 0;
      const prizeBase = Number(maxAmount) * (Number(prizePercentage) / 100);
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
        prizeUSDT: prizeUSDT.toFixed(2)
      };
    });

    // Mark tournament as inactive (distributed) usando transacción
    await prisma.$transaction(async (tx) => {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { isActive: false }
      });

      // Incrementar gamesWon para el ganador (1er lugar)
      if (prizes.length > 0 && prizes[0].userId) {
        await tx.user.update({
          where: { id: prizes[0].userId },
          data: {
            gamesWon: {
              increment: 1
            }
          }
        });
      }

      // Opcional: también puedes marcar los registros como inactivos si lo deseas
      // await tx.tournamentRegistration.updateMany({
      //   where: { tournamentId },
      //   data: { isActive: false }
      // });
    });

    res.json({
      tournamentId,
      prizes,
      totalPrizePool: prizes.reduce((sum, prize) => sum + Number(prize.prizeUSDT), 0).toFixed(2),
      message: 'Premios calculados y torneo finalizado'
    });
  } catch (error) {
    console.error('Distribute prizes error:', error);
    res.status(500).json({ error: 'Error al distribuir premios' });
  }
});


// GET - Check if user has active registration (OPTIMIZADO)
router.get('/active-registration', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    
    // Buscar el ÚLTIMO registro de torneo del usuario que podría estar activo
    const activeRegistration = await prisma.tournamentRegistration.findFirst({
      where: {
        userId,
        tournament: {
          isActive: true,
          OR: [
            // Torneos que comenzaron recientemente (últimas 48 horas)
            {
              startDate: {
                gte: new Date(now.getTime() - (48 * 60 * 60000)),
                lte: now
              }
            },
            // Torneos que no han comenzado pero están activos
            {
              startDate: null,
              isActive: true
            },
            // Torneos sin fecha pero activos
            {
              startDate: {
                equals: null
              }
            }
          ]
        }
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            isActive: true,
            startDate: true,
            duration: true,
            maxAmount: true,
            maxPlayers: true
          }
        }
      },
      orderBy: {
        registeredAt: 'desc'
      }
    });

    // Si no hay registro, retornar false inmediatamente
    if (!activeRegistration) {
      return res.json({ 
        hasActiveRegistration: false, 
        tournamentId: null 
      });
    }

    const tournament = activeRegistration.tournament;
    
    // Verificación rápida del estado del torneo
    let isActuallyActive = tournament.isActive;
    
    // Verificar si el torneo terminó por tiempo
    if (tournament.startDate && tournament.duration) {
      const endTime = new Date(tournament.startDate.getTime() + tournament.duration * 60000);
      if (now > endTime) {
        isActuallyActive = false;
      }
    }

    res.json({ 
      hasActiveRegistration: isActuallyActive, 
      tournamentId: isActuallyActive ? activeRegistration.tournamentId : null 
    });
  } catch (error) {
    console.error('Active registration check error:', error);
    res.status(500).json({ error: 'Error al verificar registro activo' });
  }
});

// POST - Join tournament (ULTRA OPTIMIZADO)
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

    // VERIFICACIÓN RÁPIDA 1: ¿Ya está inscrito en ESTE torneo?
    const existingInThisTournament = await prisma.tournamentRegistration.findUnique({
      where: {
        userId_tournamentId: {
          userId,
          tournamentId
        }
      },
      select: { id: true }
    });

    if (existingInThisTournament) {
      return res.status(400).json({ error: 'Ya estás inscrito en este torneo' });
    }

    // VERIFICACIÓN RÁPIDA 2: ¿Tiene algún torneo activo?
    const now = new Date();
    const activeRegistration = await prisma.tournamentRegistration.findFirst({
      where: {
        userId,
        tournament: {
          isActive: true,
          OR: [
            {
              startDate: {
                gte: new Date(now.getTime() - (48 * 60 * 60000))
              }
            },
            { startDate: null }
          ]
        }
      },
      select: {
        tournamentId: true,
        tournament: {
          select: {
            startDate: true,
            duration: true
          }
        }
      }
    });

    if (activeRegistration) {
      const tournament = activeRegistration.tournament;
      let isActive = true;
      
      // Verificación rápida de si el torneo terminó
      if (tournament.startDate && tournament.duration) {
        const endTime = new Date(tournament.startDate.getTime() + tournament.duration * 60000);
        if (now > endTime) {
          isActive = false;
        }
      }
      
      if (isActive) {
        return res.status(400).json({ error: 'Ya estás inscrito en otro torneo activo' });
      }
    }

    // Obtener información básica del torneo
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        maxPlayers: true,
        maxAmount: true,
        registrationFee: true,
        isActive: true,
        startDate: true,
        duration: true,
        _count: {
          select: {
            registrations: true,
            payments: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    // Verificaciones rápidas del torneo
    if (!tournament.isActive) {
      return res.status(400).json({ error: 'El torneo no está activo' });
    }

    if (tournament.startDate && now >= tournament.startDate) {
      return res.status(400).json({ error: 'El torneo ya comenzó' });
    }

    if (tournament.maxPlayers && tournament._count.registrations >= tournament.maxPlayers) {
      return res.status(400).json({ error: 'El torneo está lleno' });
    }

    if (tournament.maxAmount) {
      const totalCollected = tournament._count.payments * tournament.registrationFee;
      if (totalCollected >= tournament.maxAmount) {
        return res.status(400).json({ error: 'El torneo alcanzó el límite de recaudación' });
      }
    }

    // CREAR REGISTRO - TODO OK
    const [payment, registration] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          userId,
          tournamentId,
          txHash,
          amount: tournament.registrationFee,
          isActive: false
        }
      }),
      prisma.tournamentRegistration.create({
        data: {
          userId,
          tournamentId
        }
      }),
      // Incrementar gamesPlayed del usuario
      prisma.user.update({
        where: { id: userId },
        data: {
          gamesPlayed: {
            increment: 1
          }
        }
      })
    ]);

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

// Función para actualizar automáticamente el estado de torneos finalizados
async function updateFinishedTournaments() {
  try {
    const now = new Date();

    // Obtener todos los torneos activos que podrían haber finalizado
    const activeTournaments = await prisma.tournament.findMany({
      where: { isActive: true },
      include: {
        payments: {
          where: { isActive: true }
        },
        registrations: true,
        scores: {
          include: {
            user: true
          },
          orderBy: { value: 'desc' },
          take: 1  // Solo necesitamos el primer lugar
        }
      }
    });

    const updatePromises = [];

    for (const tournament of activeTournaments) {
      const currentAmount = tournament.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const frontendState = getFrontendState({
        ...tournament,
        currentAmount,
        participantCount: tournament.registrations.length
      }, now);

      // Si el torneo está finalizado pero aún marcado como activo, actualizarlo
      if (frontendState === "Finalizado" && tournament.isActive) {
        updatePromises.push(
          prisma.tournament.update({
            where: { id: tournament.id },
            data: { isActive: false }
          })
        );

        // Incrementar gamesWon para el usuario en primer lugar si hay scores
        if (tournament.scores.length > 0) {
          const winner = tournament.scores[0];
          updatePromises.push(
            prisma.user.update({
              where: { id: winner.userId },
              data: {
                gamesWon: {
                  increment: 1
                }
              }
            })
          );
        }
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`Actualizados ${updatePromises.length} torneos finalizados y gamesWon incrementados para ganadores`);
    }
  } catch (error) {
    console.error('Error updating finished tournaments:', error);
  }
}

router.getFrontendState = getFrontendState;

// Ejecutar la función de actualización cada minuto
setInterval(updateFinishedTournaments, 60000); // 60,000 ms = 1 minuto

// Ejecutar inmediatamente al iniciar el servidor
updateFinishedTournaments().catch(console.error);

module.exports = router;