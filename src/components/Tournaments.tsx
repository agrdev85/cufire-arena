import TournamentCard from "./TournamentCard";

const mockTournaments = [
  {
    id: 1,
    name: "Elite FPS Championship",
    prizePool: 5000,
    participants: 85,
    maxParticipants: 100,
    startDate: "15 Dic, 18:00",
    entryFee: 10,
    status: "active" as const,
  },
  {
    id: 2,
    name: "Cyber Arena Weekly",
    prizePool: 2500,
    participants: 67,
    maxParticipants: 64,
    startDate: "20 Dic, 20:00",
    entryFee: 10,
    status: "upcoming" as const,
  },
  {
    id: 3,
    name: "Neon Shootout",
    prizePool: 1000,
    participants: 32,
    maxParticipants: 32,
    startDate: "10 Dic, 16:00",
    entryFee: 10,
    status: "ended" as const,
  },
  {
    id: 4,
    name: "Quantum Masters",
    prizePool: 7500,
    participants: 45,
    maxParticipants: 128,
    startDate: "25 Dic, 14:00",
    entryFee: 10,
    status: "upcoming" as const,
  },
  {
    id: 5,
    name: "Plasma League",
    prizePool: 3000,
    participants: 78,
    maxParticipants: 80,
    startDate: "18 Dic, 19:00",
    entryFee: 10,
    status: "active" as const,
  },
  {
    id: 6,
    name: "Neural Network Cup",
    prizePool: 4000,
    participants: 23,
    maxParticipants: 64,
    startDate: "30 Dic, 15:00",
    entryFee: 10,
    status: "upcoming" as const,
  },
];

const Tournaments = () => {
  return (
    <section id="tournaments" className="py-20 px-4">
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
          {mockTournaments.map((tournament) => (
            <TournamentCard key={tournament.id} {...tournament} />
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