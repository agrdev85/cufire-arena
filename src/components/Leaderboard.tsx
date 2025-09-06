import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  prize?: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, username: "CyberSniper", score: 2450, prize: 1500 },
  { rank: 2, username: "NeonKiller", score: 2380, prize: 900 },
  { rank: 3, username: "PlasmaGhost", score: 2290, prize: 650 },
  { rank: 4, username: "QuantumFox", score: 2180, prize: 450 },
  { rank: 5, username: "VoidHunter", score: 2120, prize: 250 },
  { rank: 6, username: "ElectroWolf", score: 2050, prize: 250 },
  { rank: 7, username: "PhotonStrike", score: 1980, prize: 250 },
  { rank: 8, username: "ChromaBlast", score: 1920, prize: 250 },
  { rank: 9, username: "NanoShooter", score: 1850, prize: 250 },
  { rank: 10, username: "LaserEdge", score: 1780, prize: 250 },
];

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await api.getGlobalLeaderboard();
        setLeaderboard(response.leaderboard || []);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-cyber-gold" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-orbitron font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankTextClass = (rank: number) => {
    switch (rank) {
      case 1: return "leaderboard-gold";
      case 2: return "leaderboard-silver";
      case 3: return "leaderboard-bronze";
      default: return "text-foreground";
    }
  };

  return (
    <section id="leaderboard" className="py-20 px-4 scroll-mt-24">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-orbitron font-bold mb-4 bg-gradient-secondary bg-clip-text text-transparent">
            CLASIFICACIÓN GLOBAL
          </h2>
          <p className="text-lg text-muted-foreground">
            Los mejores jugadores a nivel global
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm cyber-border">
          <CardHeader>
            <CardTitle className="text-2xl font-orbitron text-center">
              <span className="text-neon-purple">TOP 10 </span>
              <span className="text-neon-blue">Global</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando leaderboard...
                </div>
              ) : leaderboard.length > 0 ? (
                leaderboard.map((entry, index) => (
                <div
                  key={entry.username}
                  className={`flex items-center justify-between p-4 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors ${
                    entry.rank <= 3 ? 'bg-gradient-to-r from-transparent via-muted/10 to-transparent' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div>
                      <div className={`font-orbitron font-bold text-lg ${getRankTextClass(entry.rank)}`}>
                        {entry.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rango #{entry.rank}
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-2xl font-orbitron font-bold text-neon-blue">
                      {entry.score.toLocaleString()}
                    </div>
                    {entry.prize && (
                      <Badge variant="outline" className="text-xs border-cyber-gold text-cyber-gold">
                        ${entry.prize} USDT
                      </Badge>
                    )}
                  </div>
                </div>
              ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos en el leaderboard
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Actualizado en tiempo real
          </p>
        </div>
      </div>
    </section>
  );
};

export default Leaderboard;