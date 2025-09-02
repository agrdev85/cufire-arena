import { Trophy, Shield, Zap, Globe } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card/30 backdrop-blur-sm border-t border-border py-12">
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
              <li><a href="#" className="hover:text-neon-blue transition-colors">FPS Championships</a></li>
              <li><a href="#" className="hover:text-neon-blue transition-colors">Weekly Leagues</a></li>
              <li><a href="#" className="hover:text-neon-blue transition-colors">Elite Matches</a></li>
              <li><a href="#" className="hover:text-neon-blue transition-colors">Custom Events</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-orbitron font-bold text-foreground">Soporte</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-neon-purple transition-colors">Centro de Ayuda</a></li>
              <li><a href="#" className="hover:text-neon-purple transition-colors">Reglas del Juego</a></li>
              <li><a href="#" className="hover:text-neon-purple transition-colors">Pagos & Retiros</a></li>
              <li><a href="#" className="hover:text-neon-purple transition-colors">Contacto</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="text-lg font-orbitron font-bold text-foreground">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-neon-pink transition-colors">Términos de Uso</a></li>
              <li><a href="#" className="hover:text-neon-pink transition-colors">Privacidad</a></li>
              <li><a href="#" className="hover:text-neon-pink transition-colors">Políticas USDT</a></li>
              <li><a href="#" className="hover:text-neon-pink transition-colors">Fair Play</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
            © 2024 CUFIRE Arena. Todos los derechos reservados.
          </div>
          <div className="text-sm text-muted-foreground mt-4 md:mt-0">
            Powered by <span className="text-neon-blue">Unity</span> + <span className="text-neon-purple">USDT</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;