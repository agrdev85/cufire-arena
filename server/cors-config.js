// Configuración mejorada con variables de entorno
const productionOrigins = [
  'https://cufire-arena-frontend.onrender.com',
  'https://cufire-arena.onrender.com',
  'https://cufire-arena.vercel.app',
  'https://cufire-arena-frontend.vercel.app',
  'https://*.vercel.app',
  'https://*.onrender.com'
];

const developmentOrigins = [
  'http://localhost:8080',
  'http://localhost:5173', 
  'http://localhost:3000',
  'http://localhost:4000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

// Combinar origins basado en el entorno
const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    return productionOrigins;
  } else {
    return developmentOrigins;
  }
};

const corsOptions = {
  origin: function (origin, callback) {
    // Allow all in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    const allowedOrigins = getAllowedOrigins();

    if (!origin || origin === 'null') return callback(null, true);

    if (allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const domain = allowedOrigin.replace('*.', '');
        return origin.endsWith(domain);
      }
      return origin === allowedOrigin;
    })) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked for origin:', origin);
      console.log('✅ Allowed origins:', allowedOrigins);
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'cache-control',
    'Cache-Control'
  ],
  optionsSuccessStatus: 200
};

module.exports = { corsOptions, allowedOrigins: getAllowedOrigins };