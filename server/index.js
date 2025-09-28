const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Initialize Telegram bot
require('./bot');

const { corsOptions } = require('./cors-config'); // Importar configuración CORS

const authRoutes = require('./routes/auth');
const tournamentRoutes = require('./routes/tournaments');
const leaderboardRoutes = require('./routes/leaderboard');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - DEFINITIVA
app.use(cors(corsOptions));

// Logging de CORS para debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// Manejar preflight requests explícitamente
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/payments', require('./routes/payments'));
app.use('/api/scores', require('./routes/scores'));
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/testimonials', require('./routes/testimonials'));

// Unity Routes
app.use('/unity', require('./routes/unity'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    allowedOrigins: corsOptions.allowedOrigins || 'Custom origin function'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'CORS Error',
      message: 'Origin not allowed',
      yourOrigin: req.headers.origin,
      allowedOrigins: corsOptions.allowedOrigins || 'Custom origin function'
    });
  }

  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Verificación segura para evitar el error
  if (corsOptions.allowedOrigins && Array.isArray(corsOptions.allowedOrigins)) {
    console.log(`🌐 CORS enabled for: ${corsOptions.allowedOrigins.join(', ')}`);
  } else if (corsOptions.origin) {
    console.log(`🌐 CORS enabled with custom origin configuration`);
  } else {
    console.log(`🌐 CORS enabled with default configuration`);
  }
});