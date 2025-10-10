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

// Banco de palabras para testimonios
const testimonialTemplates = [
    "¡{adjective} plataforma! {achievement} y {benefit}.",
    "La {aspect} es {quality} y los {feature} están {organization}.",
    "{usage} de usar, {payment} seguros con USDT.",
    "{support} rápido y {prizes} justos.",
    "He {improvement} mis skills y {earning}.",
    "{experience} experiencia, {return}.",
    "Plataforma {reliability} y {fun}.",
    "{payments} rápidos y seguros.",
    "{community} increíble de gamers.",
    "¡{addiction}!",
    "Nunca había visto algo tan {adjective}, {achievement} cambió mi vida gamer.",
    "Los {feature} son {quality}, me encanta participar.",
    "{support} es excelente, siempre responden rápido.",
    "Ganar dinero jugando es posible aquí, {earning} en mi primer torneo.",
    "La {aspect} me motiva a seguir jugando todos los días.",
    "{usage} interfaz, perfecta para principiantes y expertos.",
    "Premios {prizes}, justo lo que esperaba.",
    "Me siento parte de una {community} real de competidores.",
    "Esta plataforma me ha hecho {improvement} como jugador.",
    "{experience} inolvidable, definitivamente {return}.",
    "Pagos en USDT son {reliability}, sin problemas.",
    "¡Qué {fun} es competir aquí!",
    "Desde que empecé, no he parado de {achievement}.",
    "El sistema de {payment} es impecable.",
    "Soporte {support}, siempre dispuestos a ayudar.",
    "He conocido gente increíble en la {community}.",
    "Los torneos están {organization}, todo fluye perfecto.",
    "Mi primer {achievement} fue increíble, {benefit} inmediata.",
    "Esta es la mejor {aspect} que he encontrado online.",
    "Fácil de {usage}, intuitivo y moderno.",
    "Premios {prizes}, motivan a dar lo mejor.",
    "Me he {improvement} mucho gracias a las competencias.",
    "{experience} única, no la cambio por nada.",
    "Pagos {reliability}, siempre a tiempo.",
    "¡Tan {fun} que no puedo dejar de jugar!",
    "La {community} es lo mejor, todos somos gamers apasionados.",
    "Sistema de {payment} seguro y eficiente.",
    "Soporte {support}, resuelven todo rápido.",
    "Torneos {organization}, sin fallos.",
    "Mi {achievement} favorito hasta ahora.",
    "Beneficios {benefit}, perfectos.",
    "Interfaz {usage}, muy cómoda.",
    "Premios {prizes}, justos y atractivos.",
    "Mejoré mis {improvement} significativamente.",
    "Experiencia {experience}, altamente recomendable.",
    "Pagos {reliability}, confiables al 100%.",
    "Diversión {fun}, pura adrenalina.",
    "Comunidad {community}, unida y solidaria.",
    "Transacciones {payment}, seguras con USDT.",
    "Ayuda {support}, siempre disponible.",
    "Eventos {organization}, bien planificados.",
    "Logros {achievement}, motivadores.",
    "Recompensas {benefit}, instantáneas.",
    "Uso {usage}, sencillo y práctico.",
    "Galardones {prizes}, merecidos.",
    "Desarrollo {improvement}, continuo.",
    "Aventura {experience}, emocionante.",
    "Fiabilidad {reliability}, comprobada.",
    "Entretenimiento {fun}, garantizado.",
    "Red {community}, global de gamers.",
    "Métodos de pago {payment}, variados y seguros.",
    "Asistencia {support}, profesional.",
    "Coordinación {organization}, excelente.",
    "Victorias {achievement}, satisfactorias.",
    "Bonos {benefit}, generosos.",
    "Navegación {usage}, fluida.",
    "Reconocimientos {prizes}, valiosos.",
    "Progreso {improvement}, notable.",
    "Viaje {experience}, increíble.",
    "Consistencia {reliability}, admirable.",
    "Placer {fun}, incomparable.",
    "Grupo {community}, diverso y amigable."
];

const adjectives = ["Increíble", "Fantástica", "Excelente", "Genial", "Asombrosa", "Espectacular"];
const achievements = ["Ganó mi primer torneo", "Obtuvo el primer lugar", "Triunfó en la competencia", "Se llevó el premio"];
const benefits = ["el pago fue instantáneo", "recibió su recompensa inmediatamente", "los fondos llegaron rápido", "la transacción fue veloz"];
const aspects = ["comunidad", "atmósfera", "ambiente", "vibración"];
const qualities = ["genial", "increíble", "divertida", "competitiva"];
const features = ["torneos", "eventos", "competiciones", "desafíos"];
const organizations = ["bien organizados", "perfectamente estructurados", "excelentemente planeados", "profesionalmente gestionados"];
const usages = ["Fácil", "Sencillo", "Intuitivo", "Accesible"];
const payments = ["pagos", "transacciones", "depósitos", "retiros"];
const supports = ["Soporte", "Ayuda", "Asistencia", "Servicio al cliente"];
const prizes = ["premios", "recompensas", "galardones", "premios"];
const improvements = ["mejorado", "desarrollado", "incrementado", "potenciado"];
const earnings = ["ganado dinero", "obtenido ganancias", "generado ingresos", "conseguido premios"];
const experiences = ["Excelente", "Inolvidable", "Única", "Memorable"];
const returns = ["volveré por más", "regresaré pronto", "repetiré la experiencia", "lo haré de nuevo"];
const reliabilities = ["confiable", "segura", "estable", "robusta"];
const funs = ["divertida", "entretenida", "emocionante", "adictiva"];
const communities = ["Comunidad", "Grupo", "Colectivo", "Red"];
const addictions = ["No puedo parar de jugar", "Estoy enganchado", "Es adictivo", "No me detengo"];

// Arrays para generar nombres de usuario orgánicos
const prefixes = ["Pro", "Elite", "Master", "Cyber", "Pixel", "Digital", "Battle", "Arena", "Game", "Skill", "Winner", "Champion", "Ninja", "Warrior", "Hunter", "Builder", "Changer", "King", "Star", "Legend", "Shadow", "Storm", "Fire", "Ice", "Thunder", "Lightning", "Dark", "Light", "Mystic", "Phantom"];
const words = ["Gamer", "Player", "Fan", "Master", "Lover", "Champ", "Hero", "Slayer", "Hunter", "Warrior", "Ninja", "Knight", "Mage", "Ranger", "Assassin", "Berserker", "Paladin", "Druid", "Shaman", "Sorcerer", "Archer", "Fighter", "Gladiator", "Samurai", "Viking", "Pirate", "Cowboy", "Robot", "Alien", "Zombie"];
const suffixes = ["X", "99", "2024", "King", "Queen", "Lord", "Lady", "Boss", "Ace", "Pro", "Elite", "Max", "Ultra", "Super", "Mega", "Hyper", "Turbo", "Flash", "Storm", "Blaze", "Frost", "Void", "Nova", "Zenith", "Apex", "Prime", "Core", "Edge", "Pulse", "Wave"];
const numbers = ["23", "99", "2024", "007", "42", "69", "88", "13", "777", "404", "1337", "2023", "2025", "100", "500", "1000", "123", "456", "789", "000"];

// Función para generar nombres de usuario únicos
function generateUserName(randomFunc = Math.random) {
    const patterns = [
        () => `${prefixes[Math.floor(randomFunc() * prefixes.length)]}${words[Math.floor(randomFunc() * words.length)]}${numbers[Math.floor(randomFunc() * numbers.length)]}`,
        () => `${words[Math.floor(randomFunc() * words.length)]}${suffixes[Math.floor(randomFunc() * suffixes.length)]}${numbers[Math.floor(randomFunc() * numbers.length)]}`,
        () => `${prefixes[Math.floor(randomFunc() * prefixes.length)]}${words[Math.floor(randomFunc() * words.length)]}${suffixes[Math.floor(randomFunc() * suffixes.length)]}`,
        () => `${words[Math.floor(randomFunc() * words.length)]}${numbers[Math.floor(randomFunc() * numbers.length)]}`,
        () => `${prefixes[Math.floor(randomFunc() * prefixes.length)]}${numbers[Math.floor(randomFunc() * numbers.length)]}`,
    ];

    return patterns[Math.floor(randomFunc() * patterns.length)]();
}

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
/opiniones - Lo que dicen nuestros guerreros

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

// 🔥 COMANDO ASK (Hybrid with xAI)
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
    let predefinedAnswer = null;

    if (lowerQuestion.includes('cuenta') || lowerQuestion.includes('registro') || lowerQuestion.includes('crear')) {
        predefinedAnswer = 'Regístrate con tus datos e incluye una wallet USDT (red TRC20). Puedes editar o eliminar tu cuenta en tu perfil, siempre que no estés inscrito en un torneo.';
    } else if (lowerQuestion.includes('unir') || lowerQuestion.includes('join') || lowerQuestion.includes('torneo')) {
        predefinedAnswer = 'Selecciona un torneo abierto, paga la tarifa de inscripción con USDT y espera la confirmación de pago.';
    } else if (lowerQuestion.includes('pago') || lowerQuestion.includes('deposito') || lowerQuestion.includes('usdt')) {
        predefinedAnswer = 'Envía USDT a tu wallet asignada (red TRC20). Confirmaciones en 2-5 minutos. Sin comisiones por depósitos.';
    } else if (lowerQuestion.includes('retiro') || lowerQuestion.includes('withdraw')) {
        predefinedAnswer = 'Retiros procesados tras finalizar torneo y verificación. Menos de 24 horas con 1% comisión.';
    } else if (lowerQuestion.includes('premio') || lowerQuestion.includes('prize') || lowerQuestion.includes('ganar')) {
        predefinedAnswer = 'Premios acreditados automáticamente tras torneo. Ver resultados en Top 10 de Premios. Pago a tu wallet USDT en 2-5 minutos.';
    } else if (lowerQuestion.includes('problema') || lowerQuestion.includes('reportar') || lowerQuestion.includes('soporte')) {
        predefinedAnswer = 'Usa tickets o contacta por Telegram @CufireArena para asistencia inmediata.';
    } else if (lowerQuestion.includes('regla') || lowerQuestion.includes('conducta') || lowerQuestion.includes('cheat')) {
        predefinedAnswer = 'Mayor de 18 años, cuenta verificada, respeto a otros, prohibido cheating/toxicidad. Sanciones por infracciones.';
    } else if (lowerQuestion.includes('privacidad') || lowerQuestion.includes('datos')) {
        predefinedAnswer = 'Protegemos tus datos con encriptación. Usados para servicios, mejoras y prevención de fraudes.';
    } else if (lowerQuestion.includes('termino') || lowerQuestion.includes('legal')) {
        predefinedAnswer = 'Acepta términos al registrarte. Derechos de propiedad para CUFIRE, responsabilidad del usuario.';
    } else if (lowerQuestion.includes('score') || lowerQuestion.includes('puntuacion') || lowerQuestion.includes('leaderboard')) {
        predefinedAnswer = 'Puntuaciones de torneos activos. Usa /global_scores para ranking global.';
    } else if (lowerQuestion.includes('notificacion') || lowerQuestion.includes('notification')) {
        predefinedAnswer = 'Usa /subscribe para notificaciones de torneos en tu chat privado.';
    }

    let answer;
    if (predefinedAnswer) {
        answer = `¡Hola! Soy el asistente de CUFIRE Arena. ${predefinedAnswer}`;
    } else {
        // Respuesta genérica para preguntas no predefinidas
        answer = '¡Hola! Soy el asistente de CUFIRE Arena. Para preguntas específicas sobre torneos, pagos o reglas, consulta nuestra documentación o contacta a @CufireArena para asistencia personalizada.';
    }

    ctx.reply(`💡 ${answer}`);
});

// 🔥 COMANDO OPINIONES
bot.command('opiniones', async (ctx) => {
    console.log('📢 OPINIONES recibido de:', ctx.from.first_name);
    ctx.reply('🤔 Opiniones de nuestros guerreros...');
    try {
        const testimonials = await generateDailyTestimonials();
        ctx.reply(`🌟 *OPINIONES - CUFIRE ARENA*\n\n${testimonials}\n\n¡Únete y vive la experiencia! Usa /tournaments para ver torneos disponibles.`);
    } catch (error) {
        console.error('Error generando testimonios:', error);
        ctx.reply('❌ Error no se encontraron opiniones. Inténtalo de nuevo.');
    }
});

// Función para generar testimonios diarios usando DB primero, luego banco de palabras
async function generateDailyTestimonials() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Obtener testimonios de usuarios de hoy
        const userTestimonials = await prisma.userTestimonial.findMany({
            where: {
                date: {
                    gte: today,
                    lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                }
            },
            include: {
                user: {
                    select: { username: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const testimonials = [];

        // Lógica para seleccionar testimonios
        if (userTestimonials.length >= 10) {
            // Si hay 10 o más, seleccionar 10 aleatoriamente
            const shuffled = [...userTestimonials].sort(() => 0.5 - Math.random());
            for (const ut of shuffled.slice(0, 10)) {
                testimonials.push(`⭐ "${ut.text}" - ${ut.user.username}`);
            }
        } else {
            // Si hay menos de 10, usar todos los de usuarios y completar con generados
            for (const ut of userTestimonials) {
                testimonials.push(`⭐ "${ut.text}" - ${ut.user.username}`);
            }

            // Completar con generados hasta llegar a 10
            if (testimonials.length < 10) {
                const generated = generateFallbackTestimonials();
                const needed = 10 - testimonials.length;

                // Usar los primeros 'needed' generados, pero asegurarse de que no haya nombres duplicados
                const usedNames = new Set(testimonials.map(t => t.split(' - ')[1]));
                let added = 0;

                for (const gen of generated) {
                    if (added >= needed) break;
                    const author = gen.split(' - ')[1];
                    if (!usedNames.has(author)) {
                        testimonials.push(gen);
                        usedNames.add(author);
                        added++;
                    }
                }
            }
        }

        return testimonials.join('\n\n');
    } catch (error) {
        console.error('Error generating testimonials:', error);
        return generateFallbackTestimonials().join('\n\n');
    }
}

// Función fallback para generar testimonios cuando no hay DB
function generateFallbackTestimonials() {
    const today = new Date().toISOString().split('T')[0];
    const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
    const seededRandom = seedRandom(seed);

    const testimonials = [];
    const usedNames = new Set();
    const usedTemplates = new Set();

    while (testimonials.length < 10) {
        let templateIndex;
        do {
            templateIndex = Math.floor(seededRandom() * testimonialTemplates.length);
        } while (usedTemplates.has(templateIndex) && usedTemplates.size < testimonialTemplates.length);

        if (usedTemplates.has(templateIndex)) break;
        usedTemplates.add(templateIndex);

        const template = testimonialTemplates[templateIndex];

        let author;
        do {
            author = generateUserName(seededRandom);
        } while (usedNames.has(author));

        usedNames.add(author);

        let text = template;
        text = text.replace('{adjective}', adjectives[Math.floor(seededRandom() * adjectives.length)]);
        text = text.replace('{achievement}', achievements[Math.floor(seededRandom() * achievements.length)]);
        text = text.replace('{benefit}', benefits[Math.floor(seededRandom() * benefits.length)]);
        text = text.replace('{aspect}', aspects[Math.floor(seededRandom() * aspects.length)]);
        text = text.replace('{quality}', qualities[Math.floor(seededRandom() * qualities.length)]);
        text = text.replace('{feature}', features[Math.floor(seededRandom() * features.length)]);
        text = text.replace('{organization}', organizations[Math.floor(seededRandom() * organizations.length)]);
        text = text.replace('{usage}', usages[Math.floor(seededRandom() * usages.length)]);
        text = text.replace('{payment}', payments[Math.floor(seededRandom() * payments.length)]);
        text = text.replace('{support}', supports[Math.floor(seededRandom() * supports.length)]);
        text = text.replace('{prizes}', prizes[Math.floor(seededRandom() * prizes.length)]);
        text = text.replace('{improvement}', improvements[Math.floor(seededRandom() * improvements.length)]);
        text = text.replace('{earning}', earnings[Math.floor(seededRandom() * earnings.length)]);
        text = text.replace('{experience}', experiences[Math.floor(seededRandom() * experiences.length)]);
        text = text.replace('{experience_type}', experiences[Math.floor(seededRandom() * experiences.length)]);
        text = text.replace('{return}', returns[Math.floor(seededRandom() * returns.length)]);
        text = text.replace('{reliability}', reliabilities[Math.floor(seededRandom() * reliabilities.length)]);
        text = text.replace('{fun}', funs[Math.floor(seededRandom() * funs.length)]);
        text = text.replace('{community}', communities[Math.floor(seededRandom() * communities.length)]);
        text = text.replace('{addiction}', addictions[Math.floor(seededRandom() * addictions.length)]);

        testimonials.push(`⭐ "${text}" - ${author}`);
    }

    return testimonials;
}

// Función de random seeded para consistencia diaria
function seedRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return function() {
        x = Math.sin(x) * 10000;
        return x - Math.floor(x);
    };
}

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

// Exportar la instancia del bot
module.exports = bot;
