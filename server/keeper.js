const cron = require('node-cron');
const axios = require('axios');

// Ping cada 10 minutos para mantener despierto
cron.schedule('*/10 * * * *', async () => {
  try {
    const response = await axios.get('https://cufire-arena.onrender.com/api/health');
    console.log('Ping exitoso AGR:', response.status);
  } catch (error) {
    console.error('Error en ping:', error.message);
  }
});

console.log('Keeper iniciado: ping cada 10 minutos');
