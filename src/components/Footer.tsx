import { useState, useRef } from "react";
import { Trophy, Shield, Zap, Globe, X, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useSections } from "./SectionsContent";

const Footer = () => {
  const { tournaments, support, legal } = useSections();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, key: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 20
    });
    
    setActiveTooltip(key);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveTooltip(null);
    }, 300);
  };

  const toggleExpand = (sectionKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const renderTooltipContent = (key: string) => {
    switch (key) {
      case "fpsChampionships":
      case "weeklyLeagues":
      case "eliteMatches":
      case "customEvents":
        return (
          <div>
            <h4 className="font-orbitron font-bold text-neon-blue text-sm mb-2">
              {key === "fpsChampionships" ? "Campeonatos FPS" :
               key === "weeklyLeagues" ? "Ligas Semanales" :
               key === "eliteMatches" ? "Partidos de Élite" : "Eventos Personalizados"}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {tournaments[key as keyof typeof tournaments]}
            </p>
            <div className="cyber-underline"></div>
          </div>
        );
      
      case "helpCenter":
        const showAllHelp = expandedSections["helpCenter"];
        const helpItems = showAllHelp ? support.helpCenter.faq : support.helpCenter.faq.slice(0, 3);
        
        return (
          <div>
            <h4 className="font-orbitron font-bold text-neon-purple text-sm mb-2">
              {support.helpCenter.title}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {support.helpCenter.content}
            </p>
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {helpItems.map((item, index) => (
                <div key={index} className="text-xs">
                  <span className="text-neon-purple font-medium">• {item.question}:</span>
                  <span className="text-muted-foreground"> {item.answer}</span>
                </div>
              ))}
            </div>
            {support.helpCenter.faq.length > 3 && (
              <button 
                onClick={(e) => toggleExpand("helpCenter", e)}
                className="text-xs text-neon-purple mt-2 flex items-center"
              >
                {showAllHelp ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver todas las {support.helpCenter.faq.length} preguntas
                  </>
                )}
              </button>
            )}
            <div className="cyber-underline mt-2"></div>
          </div>
        );
      
      case "gameRules":
        const showAllRules = expandedSections["gameRules"];
        const ruleSections = showAllRules ? support.gameRules.sections : support.gameRules.sections.slice(0, 3);
        
        return (
          <div>
            <h4 className="font-orbitron font-bold text-neon-purple text-sm mb-2">
              {support.gameRules.title}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {support.gameRules.content}
            </p>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {ruleSections.map((section, index) => (
                <div key={index}>
                  <h5 className="text-xs font-medium text-neon-purple">{section.title}</h5>
                  <p className="text-xs text-muted-foreground">{section.content}</p>
                </div>
              ))}
            </div>
            {support.gameRules.sections.length > 3 && (
              <button 
                onClick={(e) => toggleExpand("gameRules", e)}
                className="text-xs text-neon-purple mt-2 flex items-center"
              >
                {showAllRules ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver todas las {support.gameRules.sections.length} secciones
                  </>
                )}
              </button>
            )}
            <div className="cyber-underline mt-2"></div>
          </div>
        );
      
      case "paymentsWithdrawals":
        const showAllPayments = expandedSections["paymentsWithdrawals"];
        const paymentSteps = showAllPayments ? support.paymentsWithdrawals.steps : support.paymentsWithdrawals.steps.slice(0, 3);
        
        return (
          <div>
            <h4 className="font-orbitron font-bold text-neon-purple text-sm mb-2">
              {support.paymentsWithdrawals.title}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {support.paymentsWithdrawals.content}
            </p>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {paymentSteps.map((step, index) => (
                <div key={index}>
                  <h5 className="text-xs font-medium text-neon-purple">{step.title}</h5>
                  <p className="text-xs text-muted-foreground">{step.content}</p>
                </div>
              ))}
            </div>
            {support.paymentsWithdrawals.steps.length > 3 && (
              <button 
                onClick={(e) => toggleExpand("paymentsWithdrawals", e)}
                className="text-xs text-neon-purple mt-2 flex items-center"
              >
                {showAllPayments ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver todos los {support.paymentsWithdrawals.steps.length} pasos
                  </>
                )}
              </button>
            )}
            <div className="cyber-underline mt-2"></div>
          </div>
        );
      
      case "contact":
        return (
          <div>
            <h4 className="font-orbitron font-bold text-neon-purple text-sm mb-2">
              {support.contact.title}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {support.contact.content}
            </p>
            <a 
              href={support.contact.telegramLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-neon-purple hover:text-neon-blue transition-colors"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Unirse a Telegram de Soporte
            </a>
            <div className="cyber-underline mt-2"></div>
          </div>
        );
      
      case "termsOfUse":
        const showAllTerms = expandedSections["termsOfUse"];
        const termSections = showAllTerms ? legal.termsOfUse.sections : legal.termsOfUse.sections.slice(0, 3);
        
        return (
          <div>
            <h4 className="font-orbitron font-bold text-neon-pink text-sm mb-2">
              {legal.termsOfUse.title}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {legal.termsOfUse.content}
            </p>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {termSections.map((section, index) => (
                <div key={index}>
                  <h5 className="text-xs font-medium text-neon-pink">{section.title}</h5>
                  <p className="text-xs text-muted-foreground">{section.content}</p>
                </div>
              ))}
            </div>
            {legal.termsOfUse.sections.length > 3 && (
              <button 
                onClick={(e) => toggleExpand("termsOfUse", e)}
                className="text-xs text-neon-pink mt-2 flex items-center"
              >
                {showAllTerms ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver todas las {legal.termsOfUse.sections.length} secciones
                  </>
                )}
              </button>
            )}
            <div className="cyber-underline mt-2"></div>
          </div>
        );
      
      case "privacy":
        const showAllPrivacy = expandedSections["privacy"];
        const privacySections = showAllPrivacy ? legal.privacy.sections : legal.privacy.sections.slice(0, 3);
        
        return (
          <div>
            <h4 className="font-orbitron font-bold text-neon-pink text-sm mb-2">
              {legal.privacy.title}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {legal.privacy.content}
            </p>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {privacySections.map((section, index) => (
                <div key={index}>
                  <h5 className="text-xs font-medium text-neon-pink">{section.title}</h5>
                  <p className="text-xs text-muted-foreground">{section.content}</p>
                </div>
              ))}
            </div>
            {legal.privacy.sections.length > 3 && (
              <button 
                onClick={(e) => toggleExpand("privacy", e)}
                className="text-xs text-neon-pink mt-2 flex items-center"
              >
                {showAllPrivacy ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver todas las {legal.privacy.sections.length} secciones
                  </>
                )}
              </button>
            )}
            <div className="cyber-underline mt-2"></div>
          </div>
        );
      
      case "usdtPolicies":
        return (
          <div>
            <h4 className="font-orbitron font-bold text-neon-pink text-sm mb-2">
              Políticas USDT
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed max-h-40 overflow-y-auto">
              {legal.usdtPolicies}
            </p>
            <div className="cyber-underline mt-2"></div>
          </div>
        );
      
      case "fairPlay":
        return (
          <div>
            <h4 className="font-orbitron font-bold text-neon-pink text-sm mb-2">
              Juego Limpio
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed max-h-40 overflow-y-auto">
              {legal.fairPlay}
            </p>
            <div className="cyber-underline mt-2"></div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <footer className="bg-card/30 backdrop-blur-sm border-t border-border py-12 relative footer-mobile">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Trophy className="h-8 w-8 text-neon-purple" />
                <span className="text-2xl font-orbitron font-bold bg-gradient-primary bg-clip-text text-transparent">
                  CUFIRE
                </span>
              </div>
              <p className="text-muted-foreground text-sm">
                La plataforma de torneos FPS más avanzada del mundo. 
                Compite, gana y domina el metaverso gaming.
              </p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-neon-blue/20 rounded-lg flex items-center justify-center">
                  <Globe className="h-5 w-5 text-neon-blue" />
                </div>
                <div className="w-10 h-10 bg-neon-purple/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-neon-purple" />
                </div>
                <div className="w-10 h-10 bg-neon-pink/20 rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-neon-pink" />
                </div>
              </div>
            </div>

            {/* Tournaments */}
            <div className="space-y-4">
              <h3 className="text-lg font-orbitron font-bold text-foreground">Torneos</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a 
                    href="#" 
                    className="hover:text-neon-blue transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, "fpsChampionships")}
                    onMouseLeave={handleMouseLeave}
                  >
                    Campeonatos FPS
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="hover:text-neon-blue transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, "weeklyLeagues")}
                    onMouseLeave={handleMouseLeave}
                  >
                    Ligas Semanales
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="hover:text-neon-blue transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, "eliteMatches")}
                    onMouseLeave={handleMouseLeave}
                  >
                    Partidos de Élite
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="hover:text-neon-blue transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, "customEvents")}
                    onMouseLeave={handleMouseLeave}
                  >
                    Eventos Personalizados
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h3 className="text-lg font-orbitron font-bold text-foreground">Soporte</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a 
                    href="#" 
                    className="hover:text-neon-purple transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, "helpCenter")}
                    onMouseLeave={handleMouseLeave}
                  >
                    Centro de Ayuda
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="hover:text-neon-purple transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, "gameRules")}
                    onMouseLeave={handleMouseLeave}
                  >
                    Reglas del Juego
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="hover:text-neon-purple transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, "paymentsWithdrawals")}
                    onMouseLeave={handleMouseLeave}
                  >
                    Pagos & Retiros
                  </a>
                </li>
                <li>
                  <a 
                    href={support.contact.telegramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-neon-purple transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, "contact")}
                    onMouseLeave={handleMouseLeave}
                  >
                    Contacto
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h3 className="text-lg font-orbitron font-bold text-foreground">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a 
                    href="#" 
                    className="hover:text-neon-pink transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, "termsOfUse")}
                    onMouseLeave={handleMouseLeave}
                  >
                    Términos de Uso
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="hover:text-neon-pink transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, "privacy")}
                    onMouseLeave={handleMouseLeave}
                  >
                    Privacidad
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="hover:text-neon-pink transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, "usdtPolicies")}
                    onMouseLeave={handleMouseLeave}
                  >
                    Políticas USDT
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="hover:text-neon-pink transition-colors"
                    onMouseEnter={(e) => handleMouseEnter(e, "fairPlay")}
                    onMouseLeave={handleMouseLeave}
                  >
                    Juego Limpio
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/50 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-muted-foreground">
              © 2025 CUFIRE Arena. Todos los derechos reservados.
            </div>
            <div className="text-sm text-muted-foreground mt-4 md:mt-0">
              Realizado con <span className="text-neon-blue">Unity</span> + <span className="text-neon-purple">USDT</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Tooltip Futurista Mejorado con Scroll */}
      {activeTooltip && (
        <div 
          className="fixed z-50 cyber-tooltip"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
          onMouseEnter={() => timeoutRef.current && clearTimeout(timeoutRef.current)}
          onMouseLeave={handleMouseLeave}
        >
          <div className="cyber-border bg-card/95 backdrop-blur-md p-4 rounded-lg shadow-2xl max-w-md cyber-glows">
            <div className="flex justify-between items-start mb-2">
              <button 
                onClick={() => setActiveTooltip(null)}
                className="text-muted-foreground hover:text-foreground transition-colors ml-auto"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="max-h-64 overflow-hidden">
              {renderTooltipContent(activeTooltip)}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;
