import TournamentCard from "./TournamentCard";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface TournamentDTO {
  id: number;
  name: string;
  maxAmount?: number;
  currentAmount: number;
  registrationFee: number;
  participantCount: number;
  maxPlayers?: number;
  startDate?: string | null;
  frontendState: "Open" | "En curso" | "Finalizado";
  countdownRemaining?: number | null;
  prizePercentage?: number;
  duration?: number;
}

const Tournaments = () => {
  const [tournaments, setTournaments] = useState<TournamentDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await api.getTournaments();
        const list: TournamentDTO[] = (response.tournaments || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          maxAmount: t.maxAmount ?? undefined,
          currentAmount: t.currentAmount || 0,
          registrationFee: t.registrationFee,
          participantCount: t.participantCount || 0,
          maxPlayers: t.maxPlayers ?? undefined,
          startDate: t.startDate ? String(t.startDate) : null,
          frontendState: t.frontendState,
          countdownRemaining: t.countdownRemaining ?? null,
          prizePercentage: t.prizePercentage ?? 0,
          duration: t.duration ?? 90,
        }));
        setTournaments(list);
      } catch (error) {
        console.error('Failed to fetch tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchTournaments, 10000);
    return () => clearInterval(interval);
  }, []);

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
            <TournamentCard
              key={t.id}
              id={t.id}
              name={t.name}
              maxAmount={t.maxAmount}
              currentAmount={t.currentAmount}
              registrationFee={t.registrationFee}
              participantCount={t.participantCount}
              maxPlayers={t.maxPlayers}
              startDate={t.startDate || undefined}
              frontendState={t.frontendState}
              countdownRemaining={t.countdownRemaining || undefined}
              prizePercentage={t.prizePercentage}
              duration={t.duration}
            />
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
                <div className="text-muted-foreground">Gana premios reales</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Tournaments;