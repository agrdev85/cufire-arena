const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const { getFrontendState } = require('./tournaments');

const router = express.Router();
const prisma = new PrismaClient();

// GET - Get all payments for admin with search and filtering
router.get('/', authMiddleware, async (req, res) => {
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
        { tournament: { name: { contains: search, mode: 'insensitive' } } },
        { txHash: { contains: search, mode: 'insensitive' } }
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

// PUT - Verify payment (admin only)
router.put('/:paymentId/verify', authMiddleware, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const paymentId = parseInt(req.params.paymentId);

    if (isNaN(paymentId)) {
      return res.status(400).json({ error: 'ID de pago inválido' });
    }

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

module.exports = router;