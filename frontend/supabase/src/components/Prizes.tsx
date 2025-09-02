import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";

interface TournamentOption {
  id: number;
  name: string;
  maxAmount?: number;
  frontendState: "Open" | "En curso" | "Finalizado";
}

interface TournamentDetail {
  id: number;
  name: string;
  maxAmount?: number;
  leaderboard: { rank: number; username: string; score: number }[];
}

const PRIZE_MAP = [0.30, 0.18, 0.13, 0.09, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];

const calcPrize = (rank: number, base: number) => {
  if (rank < 1 || rank > 10) return 0;
  return Math.floor((base * PRIZE_MAP[rank - 1]) * 100) / 100;
};

const Prizes = () => {
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<TournamentDetail | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getTournaments();
        const options: TournamentOption[] = (res.tournaments || [])
          .filter((t: any) => t.isActive)
          .map((t: any) => ({ id: t.id, name: t.name, maxAmount: t.maxAmount ?? 0, frontendState: t.frontendState }));
        setTournaments(options);
        if (options.length > 0) setSelectedId(String(options[0].id));
      } catch (e) {
        // silent
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedId) return;
      try {
        const res = await api.getTournament(selectedId);
        const t = res.tournament;
        const d: TournamentDetail = {
          id: t.id,
          name: t.name,
          maxAmount: t.maxAmount ?? 0,
          leaderboard: (t.leaderboard || []).slice(0, 10),
        };
        setDetail(d);
      } catch (e) {
        setDetail(null);
      }
    })();
  }, [selectedId]);

  const base = useMemo(() => detail?.maxAmount || 0, [detail]);

  return (
    <section id="prizes" className="py-20 px-4 scroll-mt-24">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-orbitron font-bold mb-4 bg-gradient-accent bg-clip-text text-transparent">
            PREMIOS
          </h1>
          <p className="text-lg text-muted-foreground">
            Selecciona un torneo activo para ver el reparto de premios Top-10
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-8">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un torneo" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name} <span className="text-muted-foreground">({t.frontendState})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm cyber-border">
          <CardHeader>
            <CardTitle className="text-center font-orbitron">
              {detail ? `Top 10 • ${detail.name}` : "Selecciona un torneo"}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/50 p-0">
            {detail && detail.leaderboard && detail.leaderboard.length > 0 ? (
              detail.leaderboard.map((entry) => (
                <div key={`${entry.rank}-${entry.username}`} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 text-center font-orbitron font-bold">#{entry.rank}</div>
                    <div>
                      <div className="font-orbitron font-bold text-foreground">{entry.username}</div>
                      <div className="text-sm text-muted-foreground">{entry.score.toLocaleString()} pts</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-cyber-gold border-cyber-gold">
                      ${calcPrize(entry.rank, base)} USDT
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-muted-foreground">No hay datos para este torneo</div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Nota: Los porcentajes se calculan sobre la meta del torneo (maxAmount). Un porcentaje de reparto configurable se integrará al crear torneos.
        </p>
      </div>
    </section>
  );
};

export default Prizes;
