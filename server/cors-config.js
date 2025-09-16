const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173', 
  'http://localhost:3000',
  'http://localhost:4000',
  'https://cufire-arena.vercel.app',
  'https://*.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Exporta ambos para poder usar allowedOrigins en los logs
module.exports = { corsOptions, allowedOrigins };