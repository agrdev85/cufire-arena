import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface Props {
  tournamentId: number;
  onClose: () => void;
}

const TournamentDetails = ({ tournamentId, onClose }: Props) => {
  const [tournament, setTournament] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    api.getTournament(String(tournamentId)).then(res => setTournament(res.tournament));
    api.getTournamentLeaderboard(String(tournamentId)).then(res => setLeaderboard(res.leaderboard || []));
  }, [tournamentId]);

  if (!tournament) return <div className="p-4">Cargando...</div>;

  return (
    <Card className="max-w-2xl mx-auto my-6">
      <CardHeader>
        <CardTitle>
          {tournament.name} <Badge>{tournament.frontendState}</Badge>
        </CardTitle>
        <button className="text-xs text-muted-foreground float-right" onClick={onClose}>Cerrar</button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <strong>Participantes:</strong>
          <ul className="list-disc ml-6">
            {(tournament.participants || tournament.registrations || []).map((p: any) => (
              <li key={p.id || p.user?.id}>{p.username || p.user?.username}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong>Leaderboard:</strong>
          <ol className="list-decimal ml-6">
            {leaderboard.slice(0, 10).map((entry: any) => (
              <li key={entry.tournamentId}>
                {entry.username} - {entry.score} pts
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentDetails;
