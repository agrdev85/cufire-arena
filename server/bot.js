require('dotenv').config();
const { Telegraf } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

// Verificar que todo esté cargado
console.log('🔧 Iniciando bot...');
console.log('✅ Bot:', process.env.TELEGRAM_BOT_TOKEN ? 'Token cargado' : 'No token');
console.log('✅ Channel:', process.env.TELEGRAM_CHANNEL_ID || 'No channel');
console.log('✅ Respuestas simples: activadas (gratis)');
console.log('✅ API URL:', process.env.SERVER_API_URL || 'No API URL');

// Inicializar Prisma
const prisma = new PrismaClient();

// Cache para estados de torneos
let tournamentStates = {};

// Rate limiting para Q&A
const userQuestionTimestamps = new Map();

// Inicializar bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Función para verificar torneos y notificar
async function checkTournamentsAndNotify() {
  try {
    const response = await axios.get(`${process.env.SERVER_API_URL}/api/tournaments`);
    const tournaments = response.data.tournaments;

    const changes = [];

    for (const tournament of tournaments) {
      const prevState = tournamentStates[tournament.id];
      const currentState = tournament.frontendState;

      if (!prevState) {
        if (currentState === 'Open') {
          changes.push({
            type: 'new',
            tournament: tournament,
            message: `🏆 Nuevo torneo: ${tournament.name}\nEstado: ${currentState}\nMonto: $${tournament.maxAmount}\nJugadores: ${tournament.participantCount}/${tournament.maxPlayers || '∞'}`
          });
        }
      } else if (prevState !== currentState) {
        if (['Open', 'En curso', 'Finalizado'].includes(currentState)) {
          changes.push({
            type: 'update',
            tournament: tournament,
            message: `📢 Torneo ${tournament.name}: ${prevState} → ${currentState}`
          });
        }
      }

      tournamentStates[tournament.id] = currentState;
    }

    if (changes.length > 0) {
      const subscribedUsers = await prisma.userSubscription.findMany({
        where: { subscribed: true }
      });

      for (const change of changes) {
        for (const user of subscribedUsers) {
          try {
            await bot.telegram.sendMessage(user.telegramUserId.toString(), change.message);
          } catch (error) {
            console.error(`Error notificando a ${user.telegramUserId}:`, error.message);
          }
        }
      }

      try {
        for (const change of changes) {
          await bot.telegram.sendMessage(process.env.TELEGRAM_CHANNEL_ID, change.message);
        }
      } catch (error) {
        console.error('Error enviando a canal:', error.message);
      }
    }
  } catch (error) {
    console.error('Error verificando torneos:', error.message);
  }
}

// Iniciar verificación cada 1 minuto para notificaciones más rápidas
setInterval(checkTournamentsAndNotify, 5000);
checkTournamentsAndNotify();

// Función para rate limiting Q&A
function checkRateLimit(userId) {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);

  if (!userQuestionTimestamps.has(userId)) {
    userQuestionTimestamps.set(userId, []);
  }

  const timestamps = userQuestionTimestamps.get(userId);
  const recentTimestamps = timestamps.filter(ts => ts > oneHourAgo);

  if (recentTimestamps.length >= 25) {
    return false;
  }

  recentTimestamps.push(now);
  userQuestionTimestamps.set(userId, recentTimestamps);
  return true;
}

// 🔥 COMANDO START - CONFIRMACIÓN INMEDIATA
bot.start((ctx) => {
    console.log('🎯 START recibido de:', ctx.from.first_name, ctx.from.id);
    ctx.reply('🎉 ¡BOT CUFIRE ACTIVADO! \n\n¡Hola! Soy tu asistente de CUFIRE Arena.\n\nUsa /help para ver todos los comandos disponibles.');
});

// 🔥 COMANDO HELP
bot.help((ctx) => {
    console.log('❓ HELP recibido de:', ctx.from.first_name);
    ctx.reply(`
🤖 COMANDOS DE CUFIRE ARENA BOT 🤖

/start - Iniciar el bot
/help - Ver ayuda
/tournaments - Ver torneos disponibles
/tournament <id> - Detalles de un torneo
/scores <id> - Scores de un torneo
/global_scores - Leaderboard global
/subscribe - Suscribirse a notificaciones
/unsubscribe - Cancelar suscripción
/ask <pregunta> - Preguntar dudas (25/hora)

💬 Soporte: @CufireArena
    `.trim());
});

// 🔥 COMANDO TEST - RESPUESTA INMEDIATA
bot.command('test', (ctx) => {
    console.log('✅ TEST recibido');
    ctx.reply('✅ ¡Bot funcionando perfectamente! \n\nEl comando /test se ejecutó correctamente.');
});

// 🔥 COMANDO TOURNAMENTS
bot.command('tournaments', async (ctx) => {
    console.log('🏆 TOURNAMENTS recibido');
    try {
        const response = await axios.get(`${process.env.SERVER_API_URL}/api/tournaments`);
        const tournaments = response.data.tournaments;

        if (tournaments.length === 0) {
            ctx.reply('❌ No hay torneos disponibles en este momento.');
            return;
        }

        let message = '🏆 *TORNEOS DISPONIBLES*\n\n';
        tournaments.forEach((t, index) => {
            message += `${index + 1}. *${t.name}*\n`;
            message += `   🆔 ID: ${t.id}\n`;
            message += `   📊 Estado: ${t.frontendState}\n`;
            message += `   👥 Jugadores: ${t.participantCount}${t.maxPlayers ? `/${t.maxPlayers}` : ''}\n\n`;
        });

        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error obteniendo torneos:', error);
        ctx.reply('❌ Error al obtener torneos. Inténtalo de nuevo.');
    }
});

// 🔥 COMANDO SUBSCRIBE
bot.command('subscribe', async (ctx) => {
    console.log('📩 SUBSCRIBE recibido de:', ctx.from.id);
    try {
        await prisma.userSubscription.upsert({
            where: { telegramUserId: BigInt(ctx.from.id) },
            update: { subscribed: true },
            create: { telegramUserId: BigInt(ctx.from.id), subscribed: true }
        });
        ctx.reply('✅ ¡Suscripción activada! Recibirás notificaciones de torneos.');
    } catch (error) {
        console.error('Error en subscribe:', error);
        ctx.reply('❌ Error al suscribirte. Inténtalo de nuevo.');
    }
});

// 🔥 COMANDO UNSUBSCRIBE
bot.command('unsubscribe', async (ctx) => {
    console.log('📩 UNSUBSCRIBE recibido de:', ctx.from.id);
    try {
        await prisma.userSubscription.upsert({
            where: { telegramUserId: BigInt(ctx.from.id) },
            update: { subscribed: false },
            create: { telegramUserId: BigInt(ctx.from.id), subscribed: false }
        });
        ctx.reply('✅ Suscripción cancelada. Ya no recibirás notificaciones.');
    } catch (error) {
        console.error('Error en unsubscribe:', error);
        ctx.reply('❌ Error al cancelar suscripción. Inténtalo de nuevo.');
    }
});

// 🔥 COMANDO TOURNAMENT <ID> (con leaderboard)
bot.command('tournament', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const tournamentId = args[0];

    if (!tournamentId || isNaN(tournamentId)) {
        ctx.reply('❌ Uso: /tournament <id>\nEjemplo: /tournament 1');
        return;
    }

    try {
        // Obtener detalles del torneo
        const tournamentResponse = await axios.get(`${process.env.SERVER_API_URL}/api/tournaments/${tournamentId}`);
        const tournament = tournamentResponse.data.tournament;

        let message = `🏆 *${tournament.name}*\n\n`;
        message += `ID: ${tournament.id}\n`;
        message += `Estado: ${tournament.frontendState}\n`;
        message += `Jugadores: ${tournament.participantCount}${tournament.maxPlayers ? `/${tournament.maxPlayers}` : ''}\n`;
        message += `Monto máximo: $${tournament.maxAmount}\n`;
        message += `Tarifa: $${tournament.registrationFee}\n\n`;

        // Obtener leaderboard si hay scores
        try {
            const scoresResponse = await axios.get(`${process.env.SERVER_API_URL}/api/scores/leaderboard/tournament/${tournamentId}`);
            const leaderboard = scoresResponse.data.leaderboard;

            if (leaderboard.length > 0) {
                message += `🏅 *LEADERBOARD TOP 10:*\n`;
                leaderboard.slice(0, 10).forEach((entry, index) => {
                    const rank = index + 1;
                    message += `${getRankEmoji(rank)} ${entry.username} - ${entry.score} pts\n`;
                });
            } else {
                message += `📊 *Aún no hay scores para este torneo.*`;
            }
        } catch (scoresError) {
            console.error('Error obteniendo scores:', scoresError);
            message += `📊 *Error al cargar leaderboard.*`;
        }

        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error obteniendo torneo:', error);
        ctx.reply('❌ Torneo no encontrado o error al obtener detalles.');
    }
});

// Función para calcular premio por rango
function getPrizeForRank(rank, maxAmount, prizePercentage = 70) {
    const PRIZE_MAP = [0.30, 0.18, 0.13, 0.09, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
    if (rank < 1 || rank > 10) return 0;
    const prizeBase = Number(maxAmount) * (Number(prizePercentage) / 100);
    return Math.floor(prizeBase * PRIZE_MAP[rank - 1] * 100) / 100;
}

// Función para obtener emoji de ranking
function getRankEmoji(rank) {
    switch (rank) {
        case 1: return '🏆';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return `#${rank}`;
    }
}

// 🔥 COMANDO SCORES <ID> (con premios)
bot.command('scores', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const tournamentId = args[0];

    if (!tournamentId || isNaN(tournamentId)) {
        ctx.reply('❌ Uso: /scores <id>\nEjemplo: /scores 1');
        return;
    }

    try {
        // Obtener detalles del torneo para calcular premios
        const tournamentResponse = await axios.get(`${process.env.SERVER_API_URL}/api/tournaments/${tournamentId}`);
        const tournament = tournamentResponse.data.tournament;

        // Obtener leaderboard
        const scoresResponse = await axios.get(`${process.env.SERVER_API_URL}/api/scores/leaderboard/tournament/${tournamentId}`);
        const leaderboard = scoresResponse.data.leaderboard;

        if (leaderboard.length === 0) {
            ctx.reply('❌ No hay scores para este torneo.');
            return;
        }

        let message = `🏆 *SCORES TORNEO ${tournamentId}*\n*${tournament.name}*\n\n`;
        leaderboard.slice(0, 10).forEach((entry, index) => {
            const rank = index + 1;
            const prize = getPrizeForRank(rank, tournament.maxAmount, tournament.prizePercentage);
            message += `${getRankEmoji(rank)} ${entry.username} - ${entry.score} pts`;
            if (prize > 0) {
                message += ` 💰 $${prize} USDT\n`;
            } else {
                message += `\n`;
            }
        });

        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error obteniendo scores:', error);
        ctx.reply('❌ Error al obtener scores.');
    }
});

// 🔥 COMANDO GLOBAL_SCORES
bot.command('global_scores', async (ctx) => {
    try {
        const response = await axios.get(`${process.env.SERVER_API_URL}/api/scores/leaderboard/global`);
        const leaderboard = response.data.leaderboard;

        if (leaderboard.length === 0) {
            ctx.reply('❌ No hay scores globales.');
            return;
        }

        let message = `🌍 *LEADERBOARD GLOBAL*\n\n`;
        leaderboard.slice(0, 10).forEach((entry, index) => {
            const rank = index + 1;
            message += `${getRankEmoji(rank)} ${entry.username} - ${entry.score}\n`;
        });

        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error obteniendo global scores:', error);
        ctx.reply('❌ Error al obtener leaderboard global.');
    }
});

// 🔥 COMANDO ASK (DeepSeek)
bot.command('ask', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    const question = args.join(' ');

    if (!question) {
        ctx.reply('❌ Uso: /ask <tu pregunta>\nEjemplo: /ask ¿Cómo funciona el sistema de torneos?');
        return;
    }

    const userId = ctx.from.id.toString();

    if (!checkRateLimit(userId)) {
        ctx.reply('❌ Límite excedido. Máximo 25 preguntas por hora.');
        return;
    }

    ctx.reply('🤔 Procesando tu pregunta...');

    // Respuestas basadas en SectionsContent.tsx
    const lowerQuestion = question.toLowerCase();
    let answer = '¡Hola! Soy el asistente de CUFIRE Arena. ';

    if (lowerQuestion.includes('cuenta') || lowerQuestion.includes('registro') || lowerQuestion.includes('crear')) {
        answer += 'Regístrate con tus datos e incluye una wallet USDT (red TRC20). Puedes editar o eliminar tu cuenta en tu perfil, siempre que no estés inscrito en un torneo.';
    } else if (lowerQuestion.includes('unir') || lowerQuestion.includes('join') || lowerQuestion.includes('torneo')) {
        answer += 'Selecciona un torneo abierto, paga la tarifa de inscripción con USDT y espera la confirmación de pago.';
    } else if (lowerQuestion.includes('pago') || lowerQuestion.includes('deposito') || lowerQuestion.includes('usdt')) {
        answer += 'Envía USDT a tu wallet asignada (red TRC20). Confirmaciones en 2-5 minutos. Sin comisiones por depósitos.';
    } else if (lowerQuestion.includes('retiro') || lowerQuestion.includes('withdraw')) {
        answer += 'Retiros procesados tras finalizar torneo y verificación. Menos de 24 horas con 1% comisión.';
    } else if (lowerQuestion.includes('premio') || lowerQuestion.includes('prize') || lowerQuestion.includes('ganar')) {
        answer += 'Premios acreditados automáticamente tras torneo. Ver resultados en Top 10 de Premios. Pago a tu wallet USDT en 2-5 minutos.';
    } else if (lowerQuestion.includes('problema') || lowerQuestion.includes('reportar') || lowerQuestion.includes('soporte')) {
        answer += 'Usa tickets o contacta por Telegram @CufireArena para asistencia inmediata.';
    } else if (lowerQuestion.includes('regla') || lowerQuestion.includes('conducta') || lowerQuestion.includes('cheat')) {
        answer += 'Mayor de 18 años, cuenta verificada, respeto a otros, prohibido cheating/toxicidad. Sanciones por infracciones.';
    } else if (lowerQuestion.includes('privacidad') || lowerQuestion.includes('datos')) {
        answer += 'Protegemos tus datos con encriptación. Usados para servicios, mejoras y prevención de fraudes.';
    } else if (lowerQuestion.includes('termino') || lowerQuestion.includes('legal')) {
        answer += 'Acepta términos al registrarte. Derechos de propiedad para CUFIRE, responsabilidad del usuario.';
    } else if (lowerQuestion.includes('score') || lowerQuestion.includes('puntuacion') || lowerQuestion.includes('leaderboard')) {
        answer += 'Puntuaciones de torneos activos. Usa /global_scores para ranking global.';
    } else if (lowerQuestion.includes('notificacion') || lowerQuestion.includes('notification')) {
        answer += 'Usa /subscribe para notificaciones de torneos en tu chat privado.';
    } else {
        answer += 'Para más ayuda, contacta a @CufireArena o usa /help para ver comandos.';
    }

    ctx.reply(`💡 ${answer}`);
});

// 🔥 MENSAJES DE TEXTO NORMALES
bot.on('text', (ctx) => {
    const message = ctx.message.text;
    console.log('📨 Mensaje recibido:', message);
    
    if (!message.startsWith('/')) {
        ctx.reply('💬 ¡Hola! Recibí tu mensaje.\n\nUsa /help para ver los comandos disponibles.');
    }
});

// 🔥 MANEJO DE ERRORES MEJORADO
bot.catch((err, ctx) => {
    console.error('❌ Error del bot:', err);
    try {
        if (ctx && ctx.reply) {
            ctx.reply('❌ Ocurrió un error. Por favor, intenta de nuevo.');
        }
    } catch (e) {
        console.error('Error al enviar mensaje de error:', e);
    }
});

// Manejar errores de polling
bot.on('polling_error', (err) => {
    console.error('❌ Error de polling:', err);
});

// 🔥 INICIAR BOT CON CONFIRMACIÓN
console.log('🚀 Iniciando bot...');
bot.launch()
    .then(() => {
        console.log('✅ BOT INICIADO CORRECTAMENTE');
        console.log('🤖 Bot username: @' + bot.botInfo.username);
        console.log('📱 Bot listo y escuchando mensajes...');
    })
    .catch((error) => {
        console.error('❌ ERROR al iniciar bot:', error);
    });

// Apagado graceful
process.once('SIGINT', () => {
    console.log('🛑 Apagando bot...');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    console.log('🛑 Apagando bot...');
    bot.stop('SIGTERM');
});