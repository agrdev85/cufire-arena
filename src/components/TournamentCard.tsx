import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, DollarSign, Trophy } from "lucide-react";

interface TournamentCardProps {
  id: number;
  name: string;
  prizePool: number;
  participants: number;
  maxParticipants: number;
  startDate: string;
  entryFee: number;
  status: "active" | "upcoming" | "ended";
}

const TournamentCard = ({
  name,
  prizePool,
  participants,
  maxParticipants,
  startDate,
  entryFee,
  status
}: TournamentCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case "active": return "bg-cyber-green";
      case "upcoming": return "bg-neon-blue";
      case "ended": return "bg-muted";
      default: return "bg-neon-purple";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "active": return "EN VIVO";
      case "upcoming": return "PRÓXIMO";
      case "ended": return "FINALIZADO";
      default: return "DESCONOCIDO";
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm cyber-border hover:shadow-glow-primary transition-all duration-300 hover:scale-105">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl font-orbitron text-foreground">{name}</CardTitle>
          <Badge className={`${getStatusColor()} text-card font-orbitron font-bold`}>
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-cyber-gold" />
            <div>
              <div className="text-sm text-muted-foreground">Premio Total</div>
              <div className="font-bold text-cyber-gold">${prizePool} USDT</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-neon-blue" />
            <div>
              <div className="text-sm text-muted-foreground">Participantes</div>
              <div className="font-bold text-neon-blue">{participants}/{maxParticipants}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-neon-purple" />
          <div>
            <div className="text-sm text-muted-foreground">Inicio</div>
            <div className="font-bold text-neon-purple">{startDate}</div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-sm text-muted-foreground mb-1">Inscripción</div>
          <div className="text-2xl font-orbitron font-bold text-foreground">
            {entryFee} USDT
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button 
          variant={status === "active" ? "cyber" : "neon"} 
          className="w-full"
          disabled={status === "ended"}
        >
          <Trophy className="h-4 w-4" />
          {status === "ended" ? "Finalizado" : "Unirse al Torneo"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TournamentCard;