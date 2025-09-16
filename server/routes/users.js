const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET - Get user profile
router.get('/:username', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true,
        username: true,
        email: true,
        usdtWallet: true,
        isAdmin: true,
        gamesPlayed: true,
        gamesWon: true,
        createdAt: true,
        updatedAt: true,
        participations: {
          include: {
            tournament: {
              select: { 
                id: true,
                name: true, 
                status: true,
                frontendState: true
              }
            }
          }
        },
        scores: {
          orderBy: { value: 'desc' },
          take: 10,
          include: {
            tournament: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Error al obtener perfil de usuario' });
  }
});

// GET - Get all users (admin only)
router.get('/', authMiddleware, async (req, res) => {
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
        createdAt: true,
        updatedAt: true,
        scores: {
          select: {
            value: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate total score for each user from their scores
    const formattedUsers = users.map(user => {
      const totalScore = user.scores.reduce((sum, score) => sum + score.value, 0);
      const { scores, ...userWithoutScores } = user;
      return {
        ...userWithoutScores,
        totalScore
      };
    });

    res.json({ users: formattedUsers });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// POST - Create user (admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const { username, email, password, usdtWallet, isAdmin } = req.body;

    if (!username || !email || !password || !usdtWallet) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email },
          { usdtWallet }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'El usuario, email o wallet ya existen' });
    }

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password, // En producción, esto debería estar hasheado
        usdtWallet,
        isAdmin: isAdmin || false
      },
      select: {
        id: true,
        username: true,
        email: true,
        usdtWallet: true,
        isAdmin: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT - Update user profile (current user)
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, usdtWallet } = req.body;
    const userId = req.user.id;

    if (!username && !usdtWallet) {
      return res.status(400).json({ error: 'Al menos un campo es requerido para actualizar' });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (usdtWallet) updateData.usdtWallet = usdtWallet;

    // Check if username or wallet is taken by another user
    if (username || usdtWallet) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            username ? { username, NOT: { id: userId } } : {},
            usdtWallet ? { usdtWallet, NOT: { id: userId } } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'El username o wallet ya están en uso' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        usdtWallet: true,
        isAdmin: true,
        gamesPlayed: true,
        gamesWon: true,
        totalScore: true,
        tournamentsWon: true
      }
    });

    res.json({ 
      message: 'Perfil actualizado exitosamente',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// PUT - Update user (admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const { username, email, usdtWallet, isAdmin, gamesPlayed, gamesWon, totalScore, tournamentsWon } = req.body;

    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (usdtWallet !== undefined) updateData.usdtWallet = usdtWallet;
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin;
    if (gamesPlayed !== undefined) updateData.gamesPlayed = gamesPlayed;
    if (gamesWon !== undefined) updateData.gamesWon = gamesWon;
    if (totalScore !== undefined) updateData.totalScore = totalScore;
    if (tournamentsWon !== undefined) updateData.tournamentsWon = tournamentsWon;

    // Check if username, email or wallet are taken by another user
    if (username || email || usdtWallet) {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            username ? { username, NOT: { id: userId } } : {},
            email ? { email, NOT: { id: userId } } : {},
            usdtWallet ? { usdtWallet, NOT: { id: userId } } : {}
          ].filter(condition => Object.keys(condition).length > 0)
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'El username, email o wallet ya están en uso' });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        usdtWallet: true,
        isAdmin: true,
        gamesPlayed: true,
        gamesWon: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ 
      message: 'Usuario actualizado exitosamente',
      user 
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE - Delete user (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // Primero eliminamos registros relacionados para evitar errores de foreign key
    await prisma.$transaction([
      prisma.tournamentRegistration.deleteMany({
        where: { userId }
      }),
      prisma.payment.deleteMany({
        where: { userId }
      }),
      prisma.score.deleteMany({
        where: { userId }
      }),
      prisma.user.delete({
        where: { id: userId }
      })
    ]);

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Delete user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// GET - Get user statistics
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        gamesPlayed: true,
        gamesWon: true,
        participations: {
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                frontendState: true
              }
            }
          }
        },
        scores: {
          orderBy: { value: 'desc' },
          take: 5,
          include: {
            tournament: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de usuario' });
  }
});

module.exports = router;