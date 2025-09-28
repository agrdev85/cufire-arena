import { Button } from "@/components/ui/button";
import { Trophy, User, LogIn, UserPlus, LogOut } from "lucide-react";
import { useState } from "react";
import { AuthModal } from "./AuthModal";
import { useAuth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom"; // Importar Link y useNavigate
import TestimonialsWidget from "./TestimonialsWidget";

const Header = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate(); // Hook para navegación programática
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión exitosamente",
    });
  };

  const handleAuthSuccess = () => {
    window.location.reload();
  };

  // Función para manejar navegación a secciones
  const handleSectionNavigation = (sectionId: string) => {
    // Cerrar el menú móvil al navegar
    setIsMenuOpen(false);

    if (window.location.pathname === "/") {
      // Si ya estamos en la página principal, hacer scroll
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Si estamos en otra página, navegar a home y luego hacer scroll
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border cyber-border header-mobile">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link to="/" className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-neon-purple neon-text" />
            <h1 className="text-2xl font-orbitron font-bold bg-gradient-primary bg-clip-text text-transparent">
              CUFIRE
            </h1>
            <span className="text-sm text-muted-foreground font-orbitron">ARENA</span>
          </Link>
        </div>

        <div className="md:hidden">
          <button className={`mobile-menu-btn ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        <nav className={isMenuOpen ? 'mobile-open' : ''}>
          <button
            onClick={() => handleSectionNavigation("tournaments")}
            className="text-foreground hover:text-neon-blue transition-colors"
          >
            Torneos
          </button>
          <button
            onClick={() => handleSectionNavigation("leaderboard")}
            className="text-foreground hover:text-neon-purple transition-colors"
          >
            Clasificaciones
          </button>
          <button
            onClick={() => handleSectionNavigation("prizes")}
            className="text-foreground hover:text-neon-pink transition-colors"
          >
            Premios
          </button>
          <TestimonialsWidget
            trigger={
              <button className="text-foreground hover:text-cyber-gold transition-colors">
                Opiniones
              </button>
            }
          />
          {isAuthenticated && (
            <>
              {user?.isAdmin ? (
                <Link
                  to="/admin"
                  className="text-foreground hover:text-cyber-green transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin
                </Link>
              ) : (
                <Link
                  to="/profile"
                  className="text-foreground hover:text-neon-blue transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Mi Perfil
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center space-x-3">
          {isAuthenticated && user ? (
            <>
              <div className="flex items-center space-x-2 text-foreground">
                {!user.isAdmin && (
                  <Link to="/profile" className="flex items-center space-x-2 hover:text-neon-blue transition-colors">
                    <User className="h-4 w-4" />
                    <span className="font-medium">{user.username}</span>
                  </Link>
                )}
                {user.isAdmin && (
                  <>
                    <User className="h-4 w-4" />
                    <span className="font-medium">{user.username}</span>
                  </>
                )}
              </div>
              <Button variant="neon" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </Button>
            </>
          ) : (
            <>
              <Button variant="neon" size="sm" onClick={() => setShowAuthModal(true)}>
                <LogIn className="h-4 w-4" />
                Iniciar Sesión
              </Button>
              <Button variant="cyber" size="sm" onClick={() => setShowAuthModal(true)}>
                <UserPlus className="h-4 w-4" />
                Registro
              </Button>
            </>
          )}
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </header>
  );
};

export default Header;