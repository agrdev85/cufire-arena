import { createContext, useContext, ReactNode } from 'react';

interface SectionContent {
  tournaments: {
    fpsChampionships: string;
    weeklyLeagues: string;
    eliteMatches: string;
    customEvents: string;
  };
  support: {
    helpCenter: { title: string; content: string; faq: { question: string; answer: string }[] };
    gameRules: { title: string; content: string; sections: { title: string; content: string }[] };
    paymentsWithdrawals: { title: string; content: string; steps: { title: string; content: string }[] };
    contact: { title: string; content: string; telegramLink: string };
  };
  legal: {
    termsOfUse: { title: string; content: string; sections: { title: string; content: string }[] };
    privacy: { title: string; content: string; sections: { title: string; content: string }[] };
    usdtPolicies: string;
    fairPlay: string;
  };
}

const sectionContent: SectionContent = {
  tournaments: {
    fpsChampionships: "Competiciones individuales de élite para los mejores jugadores FPS. Torneos estacionales con premios sustanciales en USDT, donde solo los más hábiles sobreviven. Demuestra tu superioridad táctica en batallas intensas que pondrán a prueba todos tus reflejos y estrategias. Clasificación individual basada en K/D ratio, precisión y victorias.",
    weeklyLeagues: "Competiciones individuales regulares cada fin de semana para todos los niveles. Sistema de liga con puntuación acumulativa en TOP 10 Global basada en rendimiento individual, rankings en tiempo real y recompensas consistentes. Perfecto para jugadores que buscan mejorar constantemente y acumular ganancias semana tras semana.",
    eliteMatches: "Enfrentamientos individuales de alto nivel entre jugadores preseleccionados. Eventos por invitación con premios garantizados y cobertura exclusiva. La cúspide del competitivo individual donde se deciden las verdaderas leyendas del metaverso gaming.",
    customEvents: "¿Tienes una idea para un torneo individual único? Ponte en contacto con nuestra plataforma para crear eventos personalizados con reglas específicas, formatos innovadores y premios ajustados a tus necesidades. Ideal para comunidades que buscan experiencias gaming exclusivas para jugadores individuales."
  },
  support: {
    helpCenter: {
      title: "Centro de Ayuda - FAQ",
      content: "Sistema de soporte completo con recursos detallados para maximizar tu experiencia en la plataforma.",
      faq: [
        {
          question: "¿Cómo crear una cuenta?",
          answer: "Regístrate con tus datos incluye una wallet USDT (red TRC20), edita o elimina tu cuenta en tu perfil de jugador en caso que lo requieras siempre y cuando no estes inscrito en un Torneo."
        },
        {
          question: "¿Cómo unirme a un torneo?",
          answer: "Selecciona un torneo abierto, paga la tarifa de inscripción con USDT y espera la confirmación de pago."
        },
        {
          question: "¿Cómo reportar un problema?",
          answer: "Usa nuestro sistema de tickets o contacta directamente por Telegram para asistencia inmediata."
        },
        {
          question: "¿Qué hacer si mi pago no se procesa?",
          answer: "Verifica que la transacción se haya completado en la blockchain y contacta soporte con el hash de transacción."
        }
      ]
    },
    gameRules: {
      title: "Reglas del Juego - Guía Completa",
      content: "Normativas detalladas que garantizan competencias justas y transparentes para todos los participantes.",
      sections: [
        {
          title: "Elegibilidad y Requisitos",
          content: "Mayor de 18 años, cuenta verificada, conexión a internet estable, hardware sin modificaciones no permitidas."
        },
        {
          title: "Código de Conducta",
          content: "Respeto a otros jugadores, prohibición de toxicidad, cheating, smurfing o cualquier comportamiento antideportivo."
        },
        {
          title: "Sistema de Verificación",
          content: "Todos los partidos son monitorizados con anti-cheat avanzado y grabaciones son revisadas para validar resultados."
        },
        {
          title: "Procedimiento de Disputas",
          content: "Reportar incidencias dentro de la 1ra hora posterior al partido con evidencias claras y detalladas."
        },
        {
          title: "Política de Sanciones",
          content: "Infracciones resultan en descalificación, suspensión temporal o permanente según la gravedad."
        }
      ]
    },
    paymentsWithdrawals: {
      title: "Pagos & Retiros - Guía Completa",
      content: "Sistema financiero transparente con procesamiento seguro de transacciones USDT.",
      steps: [
        {
          title: "Depósitos",
          content: "Envía USDT a tu wallet asignada en la plataforma (red TRC20). Las confirmaciones toman 2-5 minutos."
        },
        {
          title: "Inscripciones",
          content: "Las tarifas de torneos se deducen automáticamente de tu balance. Recibes confirmación inmediata."
        },
        {
          title: "Premios",
          content: "Los premios se acreditan automáticamente al finalizar el torneo tras verificación de resultados. Puedes ver los resultados en la tabla Top 10 de Premios seleccionando el torneo al cual te inscribist. Recibiras el pago a tu billetera USDT (red TRC20), el tiempo varía según la conexión (por lo general Las confirmaciones toman 2-5 minutos)."
        },
        {
          title: "Retiros",
          content: "Retiros al finalizar el torneo tras verificación de resultados. Procesamiento en menos de 24 horas."
        },
        {
          title: "Comisiones",
          content: "Sin comisiones por depósitos. Retiros con 0% comisión. Transparente sin sorpresas."
        }
      ]
    },
    contact: {
      title: "Contacto - Soporte 24/7",
      content: "Asistencia inmediata a través de nuestro canal oficial de Telegram para resolver cualquier consulta o problema.",
      telegramLink: "https://t.me/cufireBot" 
    }
  },
  legal: {
    termsOfUse: {
      title: "Términos de Uso - Contrato Legal",
      content: "Condiciones que regulan el uso de nuestra plataforma y servicios de gaming competitivo.",
      sections: [
        {
          title: "Aceptación de Términos",
          content: "Al registrarte aceptas cumplir con todos los términos establecidos aquí. Lee detenidamente antes de proceder."
        },
        {
          title: "Derechos de Propiedad",
          content: "CUFIRE posee todos los derechos sobre la plataforma, contenido y marcas. No se permite uso comercial no autorizado."
        },
        {
          title: "Responsabilidades del Usuario",
          content: "Mantener información veraz, proteger credenciales de acceso, cumplir reglas de juego y conducta apropiada."
        },
        {
          title: "Limitación de Responsabilidad",
          content: "No nos hacemos responsables por pérdidas indirectas, bugs temporales o problemas de conexión del usuario."
        },
        {
          title: "Modificaciones",
          content: "Nos reservamos el derecho de modificar estos términos notificando con 15 días de anticipación."
        },
        {
          title: "Ley Aplicable",
          content: "Estos términos se rigen por las leyes de Zona Franca Internacional con arbitraje como método de resolución."
        }
      ]
    },
    privacy: {
      title: "Política de Privacidad - Protección de Datos",
      content: "Compromiso con la protección y uso responsable de tu información personal.",
      sections: [
        {
          title: "Datos Recopilados",
          content: "Información de registro, datos de juego, transacciones financieras y métricas de rendimiento."
        },
        {
          title: "Uso de Datos",
          content: "Para proporcionar servicios, mejorar experiencia, prevenir fraudes y comunicaciones relevantes."
        },
        {
          title: "Protección de Datos",
          content: "Encriptación avanzada, almacenamiento seguro y acceso restringido a personal autorizado."
        },
        {
          title: "Derechos del Usuario",
          content: "Acceso, rectificación, eliminación y portabilidad de tus datos personales upon request."
        },
        {
          title: "Cookies y Tracking",
          content: "Uso de cookies esenciales para funcionalidad y analíticas para mejorar servicios."
        },
        {
          title: "Terceros",
          content: "Compartimos datos mínimos necesarios con procesadores de pago y proveedores esenciales bajo NDA."
        }
      ]
    },
    usdtPolicies: "Transacciones con USDT realizadas bajo los más estrictos estándares de seguridad financiera. Implementamos verificaciones anti-fraude de tres niveles, confirmaciones blockchain múltiples y auditorías regulares independientes. Todas las operaciones son transparentes, trazables y cumplen con regulaciones internacionales anti-lavado. Proporcionamos total claridad sobre el movimiento de fondos con historiales detallados y soporte para declaraciones fiscales.",
    fairPlay: "Compromiso inquebrantable con la competencia limpia y transparente. Utilizamos sistemas anti-cheat de última generación con monitorización en tiempo real, análisis de patrones de juego y revisiones manuales expertas. Implementamos sanciones severas e inmediatas para infractores con sistema de apelación justo. Reporta comportamientos sospechosos a través de nuestro sistema verificado y contribuye a mantener la integridad competitiva que define nuestra comunidad gaming de élite."
  }
};

const SectionsContext = createContext<SectionContent>(sectionContent);

interface SectionsProviderProps {
  children: ReactNode;
}

export const SectionsProvider = ({ children }: SectionsProviderProps) => {
  return (
    <SectionsContext.Provider value={sectionContent}>
      {children}
    </SectionsContext.Provider>
  );
};

export const useSections = () => {
  const context = useContext(SectionsContext);
  if (!context) {
    throw new Error('useSections must be used within a SectionsProvider');
  }
  return context;
};

export default sectionContent;