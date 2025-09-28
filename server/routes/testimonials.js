const express = require('express');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

const prisma = new PrismaClient();

// Cache para testimonios diarios
let dailyTestimonials = null;
let lastGeneratedDate = null;

// Banco de palabras para generar testimonios orgánicos en primera persona
const testimonialTemplates = [
    "Esta plataforma es realmente {adjective} y me encanta. {achievement} en mi primer torneo y {benefit} de inmediato.",
    "La {aspect} aquí es {quality} y me hace sentir parte de algo grande. Los {feature} están {organization} y eso motiva mucho.",
    "Me resulta {usage} usar esta plataforma, todo es intuitivo. Los {payment} con USDT son seguros y confiables al 100%.",
    "El {support} es rápido y eficiente, siempre me ayudan cuando tengo dudas. Los {prizes} son justos y motivadores.",
    "He {improvement} mis habilidades como gamer desde que empecé aquí. Ahora {earning} y me siento mucho mejor.",
    "Mi {experience} en esta plataforma ha sido {experience_type}, definitivamente {return} por más torneos emocionantes.",
    "Esta plataforma es {reliability} y {fun} al mismo tiempo. Me divierto compitiendo y ganando premios.",
    "Los {payments} son rápidos y seguros, nunca he tenido problemas. La {community} de gamers es increíble.",
    "Me siento parte de una {community} real de competidores apasionados. Todos somos gamers que nos apoyamos mutuamente.",
    "¡No puedo dejar de jugar! Esta plataforma me tiene {addiction} con sus torneos emocionantes y premios atractivos.",
    "Nunca había visto algo tan {adjective} como esta plataforma. {achievement} cambió completamente mi experiencia gamer.",
    "Los {feature} son {quality} y me encanta participar en ellos. Siempre hay algo nuevo que probar.",
    "El {support} es excelente, responden rápido a todas mis consultas. Me siento respaldado en todo momento.",
    "Ganar dinero jugando es posible aquí, {earning} en mi primer torneo y fue una experiencia increíble.",
    "La {aspect} me motiva a seguir jugando todos los días. Es adictiva pero de la mejor manera.",
    "La interfaz es {usage}, perfecta tanto para principiantes como para expertos. Todo fluye de manera natural.",
    "Los premios son {prizes}, justo lo que esperaba después de tanto esfuerzo. Me siento recompensado.",
    "Me siento parte de una {community} real de competidores. He hecho amigos y conocido gente increíble.",
    "Esta plataforma me ha hecho {improvement} como jugador profesional. Mis skills han mejorado notablemente.",
    "Mi {experience} aquí ha sido inolvidable, definitivamente {return} por más aventuras gaming.",
    "Los pagos en USDT son {reliability}, nunca he tenido ningún problema con las transacciones.",
    "¡Qué {fun} es competir aquí! Cada torneo es una nueva aventura llena de emoción.",
    "Desde que empecé, no he parado de {achievement}. Esta plataforma me mantiene enganchado.",
    "El sistema de {payment} es impecable, todo funciona perfectamente sin complicaciones.",
    "El soporte es {support}, siempre están dispuestos a ayudar con cualquier problema que surja.",
    "He conocido gente increíble en la {community}. Todos compartimos la pasión por los juegos.",
    "Los torneos están {organization}, todo fluye perfecto y sin contratiempos de ningún tipo.",
    "Mi primer {achievement} fue increíble, la {benefit} llegó inmediatamente y me hizo muy feliz.",
    "Esta es la mejor {aspect} que he encontrado online. Me siento en casa jugando aquí.",
    "Es fácil de {usage}, intuitivo y moderno. La experiencia de usuario es excelente.",
    "Los premios {prizes} motivan a dar lo mejor en cada competencia. Vale la pena el esfuerzo.",
    "Me he {improvement} mucho gracias a las competencias. Mi nivel de juego ha subido considerablemente.",
    "La {experience} es única, no la cambio por nada. Es exactamente lo que buscaba.",
    "Los pagos son {reliability}, siempre llegan a tiempo sin excepciones de ningún tipo.",
    "¡Es tan {fun} que no puedo dejar de jugar! Cada sesión es una nueva aventura.",
    "La {community} es lo mejor, todos somos gamers apasionados que nos entendemos perfectamente.",
    "El sistema de {payment} es seguro y eficiente, nunca he tenido problemas con mis transacciones.",
    "El soporte {support} resuelve todo rápido, son profesionales y atentos en todo momento.",
    "Los torneos están {organization}, sin fallos ni contratiempos que arruinen la experiencia.",
    "Mi {achievement} favorito hasta ahora ha sido ganar mi primer torneo importante aquí.",
    "Los beneficios son {benefit}, perfectos para recompensar el esfuerzo invertido en cada partida.",
    "La interfaz es {usage}, muy cómoda y fácil de navegar en cualquier dispositivo.",
    "Los premios son {prizes}, justos y atractivos para mantener la motivación alta.",
    "He mejorado mis {improvement} significativamente gracias a las constantes competencias.",
    "La experiencia es {experience}, altamente recomendable para cualquier gamer serio.",
    "Los pagos son {reliability}, confiables al 100% sin ningún tipo de problema.",
    "La diversión es {fun}, pura adrenalina en cada torneo que participo.",
    "La comunidad es {community}, unida y solidaria en todo momento.",
    "Las transacciones de {payment} son seguras con USDT, nunca he tenido inconvenientes.",
    "La ayuda del {support} está siempre disponible cuando la necesito.",
    "Los eventos están {organization}, bien planificados para maximizar la diversión.",
    "Los logros son {achievement}, motivadores que me impulsan a seguir mejorando.",
    "Las recompensas son {benefit}, instantáneas y satisfactorias cuando llegan.",
    "El uso es {usage}, sencillo y práctico para todos los niveles de experiencia.",
    "Los galardones son {prizes}, merecidos después de tanto esfuerzo y dedicación.",
    "Mi desarrollo como {improvement} ha sido continuo y progresivo gracias a la plataforma.",
    "La aventura es {experience}, emocionante y llena de sorpresas en cada torneo.",
    "La fiabilidad es {reliability}, comprobada en cada transacción y pago realizado.",
    "El entretenimiento es {fun}, garantizado en cada sesión de juego.",
    "La red de {community} es global, conectando gamers de todo el mundo.",
    "Los métodos de pago son {payment}, variados y seguros para todos los usuarios.",
    "La asistencia del {support} es profesional y eficiente en todo momento.",
    "La coordinación es {organization}, excelente para mantener todo funcionando perfectamente.",
    "Las victorias son {achievement}, satisfactorias y motivadoras para seguir compitiendo.",
    "Los bonos son {benefit}, generosos y justos para todos los participantes.",
    "La navegación es {usage}, fluida y sin problemas de ningún tipo.",
    "Los reconocimientos son {prizes}, valiosos y apreciados por toda la comunidad.",
    "Mi progreso ha sido {improvement}, notable en cada aspecto de mi juego.",
    "El viaje ha sido {experience}, increíble desde el primer día que empecé.",
    "La consistencia es {reliability}, admirable en todos los servicios ofrecidos.",
    "El placer es {fun}, incomparable con cualquier otra plataforma de gaming.",
    "El grupo de {community} es diverso y amigable, creando un ambiente perfecto."
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

// Función para generar testimonios diarios (consistentes por día)
function generateDailyTestimonials() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    if (dailyTestimonials && lastGeneratedDate === today) {
        return dailyTestimonials;
    }

    // Usar fecha como seed para consistencia diaria
    const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
    const seededRandom = seedRandom(seed);

    const testimonials = [];
    const usedNames = new Set();
    const usedTemplates = new Set();

    while (testimonials.length < 10) {
        // Seleccionar template no usado
        let templateIndex;
        do {
            templateIndex = Math.floor(seededRandom() * testimonialTemplates.length);
        } while (usedTemplates.has(templateIndex) && usedTemplates.size < testimonialTemplates.length);

        if (usedTemplates.has(templateIndex)) break;
        usedTemplates.add(templateIndex);

        const template = testimonialTemplates[templateIndex];

        // Generar nombre único
        let author;
        do {
            author = generateUserName(seededRandom);
        } while (usedNames.has(author));

        usedNames.add(author);

        // Reemplazar placeholders usando seeded random
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

        testimonials.push({ text, author });
    }

    dailyTestimonials = testimonials;
    lastGeneratedDate = today;

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

// Endpoint para obtener testimonios del día
router.get('/', async (req, res) => {
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
                testimonials.push({
                    text: ut.text,
                    author: ut.user.username
                });
            }
        } else {
            // Si hay menos de 10, usar todos los de usuarios y completar con generados
            for (const ut of userTestimonials) {
                testimonials.push({
                    text: ut.text,
                    author: ut.user.username
                });
            }

            // Completar con generados hasta llegar a 10
            if (testimonials.length < 10) {
                const generated = generateDailyTestimonials();
                const needed = 10 - testimonials.length;

                // Usar los primeros 'needed' generados, pero asegurarse de que no haya nombres duplicados
                const usedNames = new Set(testimonials.map(t => t.author));
                let added = 0;

                for (const gen of generated) {
                    if (added >= needed) break;
                    const author = gen.author;
                    if (!usedNames.has(author)) {
                        testimonials.push(gen);
                        usedNames.add(author);
                        added++;
                    }
                }
            }
        }

        res.json({ testimonials });
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        res.status(500).json({ error: 'Failed to fetch testimonials' });
    }
});

// Endpoint para guardar testimonio de usuario
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { text } = req.body;
        const userId = req.user.id;

        if (!text || text.trim().length < 10) {
            return res.status(400).json({ error: 'Testimonial must be at least 10 characters long' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Verificar si ya tiene un testimonio hoy
        const existing = await prisma.userTestimonial.findFirst({
            where: {
                userId,
                date: {
                    gte: today,
                    lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'You can only submit one testimonial per day' });
        }

        // Crear testimonio
        const testimonial = await prisma.userTestimonial.create({
            data: {
                userId,
                text: text.trim(),
                date: today
            }
        });

        res.json({ success: true, testimonial });
    } catch (error) {
        console.error('Error saving testimonial:', error);
        res.status(500).json({ error: 'Failed to save testimonial' });
    }
});

module.exports = router;