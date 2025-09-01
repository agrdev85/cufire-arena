import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Users, DollarSign, Trophy, Wallet } from "lucide-react";
import { api, useAuth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface TournamentCardProps {
  id: number;
  name: string;
  maxAmount?: number;
  currentAmount: number;
  registrationFee: number;
  participantCount: number;
  maxPlayers?: number;
  startDate?: string;
  frontendState: "Open" | "En curso" | "Finalizado";
  countdownRemaining?: number;
}

const TournamentCard = ({
  id,
  name,
  maxAmount,
  currentAmount,
  registrationFee,
  participantCount,
  maxPlayers,
  startDate,
  frontendState,
  countdownRemaining
}: TournamentCardProps) => {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [txHash, setTxHash] = useState("");

  const handleJoinTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txHash.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar el hash de la transacción",
        variant: "destructive"
      });
      return;
    }

    setIsJoining(true);
    try {
      await api.joinTournament(id.toString(), txHash);
      toast({
        title: "¡Inscripción enviada!",
        description: "Tu pago está pendiente de verificación por parte del administrador",
      });
      setShowJoinDialog(false);
      setTxHash("");
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo procesar la inscripción",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  };

  const getStatusColor = () => {
    switch (frontendState) {
      case "En curso": return "bg-cyber-green";
      case "Open": return "bg-neon-blue";
      case "Finalizado": return "bg-muted";
      default: return "bg-neon-purple";
    }
  };

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getJoinButtonText = () => {
    if (isJoining) return "Procesando...";
    if (frontendState === "Finalizado") return "Finalizado";
    if (frontendState === "En curso") return "En Curso";
    return "Unirse al Torneo";
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm cyber-border hover:shadow-glow-primary transition-all duration-300 hover:scale-105">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl font-orbitron text-foreground">{name}</CardTitle>
          <Badge className={`${getStatusColor()} text-card font-orbitron font-bold`}>
            {frontendState.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-cyber-gold" />
            <div>
              <div className="text-sm text-muted-foreground">Premio Total</div>
              <div className="font-bold text-cyber-gold">${maxAmount || 0} USDT</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-neon-blue" />
            <div>
              <div className="text-sm text-muted-foreground">Participantes</div>
              <div className="font-bold text-neon-blue">{participantCount}/{maxPlayers || "∞"}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-neon-purple" />
          <div>
            <div className="text-sm text-muted-foreground">Recaudado</div>
            <div className="font-bold text-neon-purple">${currentAmount} USDT</div>
          </div>
        </div>

        {frontendState === "En curso" && countdownRemaining && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-cyber-green" />
            <div>
              <div className="text-sm text-muted-foreground">Tiempo restante</div>
              <div className="font-bold text-cyber-green">{formatCountdown(countdownRemaining)}</div>
            </div>
          </div>
        )}

        {startDate && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-neon-purple" />
            <div>
              <div className="text-sm text-muted-foreground">Inicio</div>
              <div className="font-bold text-neon-purple">{new Date(startDate).toLocaleString()}</div>
            </div>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-sm text-muted-foreground mb-1">Inscripción</div>
          <div className="text-2xl font-orbitron font-bold text-foreground">
            {registrationFee} USDT
          </div>
        </div>

        {frontendState === "Open" && (
          <div className="text-sm text-muted-foreground p-2 bg-neon-blue/10 rounded">
            ℹ️ Inscripciones abiertas - No se aceptan puntuaciones aún
          </div>
        )}
      </CardContent>

      <CardFooter>
        {frontendState === "Open" ? (
          <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="neon" 
                className="w-full"
                disabled={!isAuthenticated}
                onClick={() => {
                  if (!isAuthenticated) {
                    toast({
                      title: "Inicia sesión",
                      description: "Debes iniciar sesión para unirte a un torneo",
                      variant: "destructive"
                    });
                  }
                }}
              >
                <Trophy className="h-4 w-4" />
                {!isAuthenticated ? "Inicia Sesión" : "Unirse al Torneo"}
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center">Unirse a {name}</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleJoinTournament} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tu Wallet USDT</Label>
                  <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded">
                    <Wallet className="h-4 w-4" />
                    <span className="text-sm">{user?.usdtWallet}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Envía {registrationFee} USDT a:</Label>
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="text-sm font-mono">TU_WALLET_ADMIN_AQUI</div>
                    <div className="text-xs text-muted-foreground mt-1">Red: TRC20 (Tron)</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="txHash">Hash de Transacción</Label>
                  <Input
                    id="txHash"
                    placeholder="Pega aquí el hash de tu transacción"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isJoining}>
                  {isJoining ? "Procesando..." : "Confirmar Inscripción"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Button 
            variant={frontendState === "En curso" ? "cyber" : "outline"} 
            className="w-full"
            disabled={frontendState === "Finalizado"}
          >
            <Trophy className="h-4 w-4" />
            {getJoinButtonText()}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default TournamentCard;