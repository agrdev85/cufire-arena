import { Button } from "@/components/ui/button";
import { Play, Zap, Trophy } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-background/60"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-20 h-20 bg-neon-blue/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-neon-purple/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-neon-pink/20 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-6xl md:text-8xl font-orbitron font-black mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent neon-text">
              CUFIRE
            </span>
          </h1>
          <h2 className="text-2xl md:text-4xl font-orbitron font-bold text-neon-blue neon-text mb-2">
            TOURNAMENT ARENA
          </h2>
          <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto">
            Únete a la élite del gaming competitivo. Torneos FPS con premios en USDT.
            Demuestra tu habilidad y gana recompensas reales.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button variant="cyber" size="lg" className="text-lg px-8 py-6">
            <Play className="h-5 w-5" />
            Jugar Ahora
          </Button>
          <Button variant="tournament" size="lg" className="text-lg px-8 py-6">
            <Trophy className="h-5 w-5" />
            Ver Torneos
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-6 cyber-border">
            <div className="text-3xl font-orbitron font-bold text-cyber-gold mb-2">$50K+</div>
            <div className="text-foreground/70">En Premios Distribuidos</div>
          </div>
          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-6 cyber-border">
            <div className="text-3xl font-orbitron font-bold text-neon-blue mb-2">1000+</div>
            <div className="text-foreground/70">Jugadores Activos</div>
          </div>
          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-6 cyber-border">
            <div className="text-3xl font-orbitron font-bold text-neon-purple mb-2">24/7</div>
            <div className="text-foreground/70">Competición Disponible</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-neon-blue rounded-full flex justify-center">
          <div className="w-1 h-3 bg-neon-blue rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;