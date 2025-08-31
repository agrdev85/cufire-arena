import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

const Prizes = () => {
  return (
    <section id="prizes" className="py-20 px-4 scroll-mt-24">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-orbitron font-bold mb-4 bg-gradient-accent bg-clip-text text-transparent">
            PREMIOS
          </h2>
          <p className="text-lg text-muted-foreground">
            Reparto de premios para los mejores jugadores en cada torneo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { place: "1°", amount: 5000, accent: "text-cyber-gold" },
            { place: "2°", amount: 3000, accent: "text-foreground" },
            { place: "3°", amount: 2000, accent: "text-foreground" },
          ].map((p) => (
            <Card key={p.place} className="bg-card/50 backdrop-blur-sm cyber-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2 font-orbitron">
                  <Trophy className="h-5 w-5 text-neon-purple" />
                  {p.place} Lugar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-center text-3xl font-orbitron font-bold ${p.accent}`}>
                  ${p.amount} USDT
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Prizes;
