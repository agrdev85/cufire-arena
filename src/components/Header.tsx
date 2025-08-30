import { Button } from "@/components/ui/button";
import { Trophy, User, LogIn, UserPlus } from "lucide-react";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border cyber-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Trophy className="h-8 w-8 text-neon-purple neon-text" />
          <h1 className="text-2xl font-orbitron font-bold bg-gradient-primary bg-clip-text text-transparent">
            CUFIRE
          </h1>
          <span className="text-sm text-muted-foreground font-orbitron">ARENA</span>
        </div>

        <nav className="hidden md:flex items-center space-x-6">
          <a href="#tournaments" className="text-foreground hover:text-neon-blue transition-colors">
            Torneos
          </a>
          <a href="#leaderboard" className="text-foreground hover:text-neon-purple transition-colors">
            Clasificaciones
          </a>
          <a href="#prizes" className="text-foreground hover:text-neon-pink transition-colors">
            Premios
          </a>
        </nav>

        <div className="flex items-center space-x-3">
          <Button variant="neon" size="sm">
            <LogIn className="h-4 w-4" />
            Iniciar Sesión
          </Button>
          <Button variant="cyber" size="sm">
            <UserPlus className="h-4 w-4" />
            Registro
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;