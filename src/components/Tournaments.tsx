import TournamentCard from "./TournamentCard";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

interface TournamentDTO {
  id: number;
  name: string;
  maxAmount?: number;
  currentAmount: number;
  potentialAmount?: number; // Añadir este campo
  registrationFee: number;
  participantCount: number;
  maxPlayers?: number;
  startDate?: string | null;
  frontendState: "Abierto" | "En curso" | "Finalizado" | "Completo"; // Actualizar para incluir "Completo"
  countdownRemaining?: number | null;
  prizePercentage?: number;
  duration?: number;
}

const Tournaments = () => {
  const [tournaments, setTournaments] = useState<TournamentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideFinalized, setHideFinalized] = useState(true);
  const [hiddenFinalizedIds, setHiddenFinalizedIds] = useState<number[]>([]);

  // Cargar estado global de ocultar finalizados y lista de IDs ocultos
  useEffect(() => {
    const loadGlobalState = async () => {
      // Cargar IDs ocultos desde backend primero
      const res = await api.getHiddenFinalizedTournaments();
      setHiddenFinalizedIds(res.hidden || []);
      
      // Luego cargar switch global
      const stored = typeof window !== 'undefined' ? localStorage.getItem('hideFinalizedTournaments') : null;
      setHideFinalized(stored === null ? true : stored === 'true');
    };

    // Cargar estado inicial
    loadGlobalState();

    // Función de sincronización para actualizaciones
    const sync = async () => {
      try {
        const res = await api.getHiddenFinalizedTournaments();
        setHiddenFinalizedIds(res.hidden || []);
        const stored = localStorage.getItem('hideFinalizedTournaments');
        setHideFinalized(stored === null ? true : stored === 'true');
      } catch (error) {
        console.error('Error syncing hidden tournaments:', error);
      }
    };

    // Configurar event listeners
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hideFinalizedTournaments' || e.key === 'hiddenFinalizedTournamentsUpdated') {
        sync();
      }
    };

    // Escuchar eventos de cambios
    window.addEventListener('hideFinalizedTournamentsChanged', sync);
    window.addEventListener('hiddenFinalizedTournamentsUpdated', sync);
    window.addEventListener('storage', handleStorageChange);

    // Polling cada 30 segundos para mantener sincronización
    const pollInterval = setInterval(sync, 30000);

    return () => {
      window.removeEventListener('hideFinalizedTournamentsChanged', sync);
      window.removeEventListener('hiddenFinalizedTournamentsUpdated', sync);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const stored = localStorage.getItem('hideFinalizedTournaments');
      setHideFinalized(stored === null ? true : stored === 'true');
    };
    window.addEventListener('hideFinalizedTournamentsChanged', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('hideFinalizedTournamentsChanged', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        // Pasar hideFinalized como parámetro para filtrado en backend
        const response = await api.getTournaments({}, hideFinalized);
        const list: TournamentDTO[] = (response.tournaments || []).map((t: any) => {
          return {
            id: t.id,
            name: t.name,
            maxAmount: t.maxAmount ?? undefined,
            currentAmount: t.currentAmount || 0,
            potentialAmount: t.potentialAmount ?? undefined, // Añadir este campo
            registrationFee: t.registrationFee,
            participantCount: t.participantCount || 0,
            maxPlayers: t.maxPlayers ?? undefined,
            startDate: t.startDate ? String(t.startDate) : null,
            frontendState: t.frontendState,
            countdownRemaining: t.countdownRemaining ?? null,
            prizePercentage: t.prizePercentage ?? 0,
            duration: t.duration ?? 90,
          };
        });
        setTournaments(list);
      } catch (error) {
        console.error('Failed to fetch tournaments:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
    const interval = setInterval(fetchTournaments, 30000);

    // Escuchar eventos de cambios en la visibilidad
    const handleVisibilityChange = () => {
      fetchTournaments();
    };
    window.addEventListener('hideFinalizedTournamentsChanged', handleVisibilityChange);
    window.addEventListener('hiddenFinalizedTournamentsUpdated', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('hideFinalizedTournamentsChanged', handleVisibilityChange);
      window.removeEventListener('hiddenFinalizedTournamentsUpdated', handleVisibilityChange);
    };
  }, [hideFinalized]); // Agregamos hideFinalized como dependencia

  if (loading) {
    return (
      <section id="tournaments" className="py-20 px-4 scroll-mt-24">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-orbitron font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
              TORNEOS ACTIVOS
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cargando torneos disponibles...
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="tournaments" className="py-20 px-4 scroll-mt-24">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-orbitron font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            TORNEOS ACTIVOS
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compite en torneos de élite con premios reales en USDT. 
            Cada victoria cuenta, cada bala importa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => (
              <div key={t.id} className="relative group">
                <TournamentCard
                  id={t.id}
                  name={t.name}
                  maxAmount={t.maxAmount}
                  currentAmount={t.currentAmount}
                  potentialAmount={t.potentialAmount} // Pasar este campo
                  registrationFee={t.registrationFee}
                  participantCount={t.participantCount}
                  maxPlayers={t.maxPlayers}
                  startDate={t.startDate || undefined}
                  frontendState={t.frontendState}
                  countdownRemaining={t.countdownRemaining || undefined}
                  prizePercentage={t.prizePercentage}
                  duration={t.duration}
                />
                {/* El icono de ocultar solo se controla desde el admin, aquí no se muestra */}
              </div>
            ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-6 cyber-border max-w-2xl mx-auto">
            <h3 className="text-xl font-orbitron font-bold text-neon-purple mb-3">
              ¿Cómo Participar?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <div className="w-8 h-8 bg-neon-blue rounded-full flex items-center justify-center mx-auto text-card font-bold">
                  1
                </div>
                <div className="text-foreground font-medium">Regístrate</div>
                <div className="text-muted-foreground">Crea tu cuenta de guerrero</div>
              </div>
              <div className="space-y-2">
                <div className="w-8 h-8 bg-neon-purple rounded-full flex items-center justify-center mx-auto text-card font-bold">
                  2
                </div>
                <div className="text-foreground font-medium">Paga 10 USDT</div>
                <div className="text-muted-foreground">Inscripción al torneo</div>
              </div>
              <div className="space-y-2">
                <div className="w-8 h-8 bg-neon-pink rounded-full flex items-center justify-center mx-auto text-card font-bold">
                  3
                </div>
                <div className="text-foreground font-medium">¡Domina!</div>
                <div className="text-muted-foreground">Gana premios reales al instante</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Tournaments;
