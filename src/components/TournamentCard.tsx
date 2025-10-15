import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Users,
  DollarSign,
  Trophy,
  Wallet,
  XCircle,
} from "lucide-react";
import { api, useAuth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useTournamentFinalization } from "@/hooks/useTournamentFinalization";

interface TournamentCardProps {
  id: number;
  name: string;
  maxAmount?: number;
  currentAmount: number;
  potentialAmount?: number;
  registrationFee: number;
  participantCount: number;
  maxPlayers?: number;
  startDate?: string;
  endDate?: string;
  frontendState: "Open" | "En curso" | "Finalizado" | "Completo";
  countdownRemaining?: number;
  prizePercentage?: number;
  duration?: number;
}

const TournamentCard = ({
  id,
  name,
  maxAmount,
  currentAmount,
  potentialAmount,
  registrationFee,
  participantCount,
  maxPlayers,
  startDate,
  endDate,
  frontendState,
  countdownRemaining,
  prizePercentage,
  duration,
}: TournamentCardProps) => {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [hasActiveRegistration, setHasActiveRegistration] = useState(false);
  const [calculatedState, setCalculatedState] = useState<
    "Open" | "En curso" | "Finalizado" | "Completo"
  >(frontendState);

  // Estado para cache
  const [lastActiveCheck, setLastActiveCheck] = useState<number>(0);
  const ACTIVE_CHECK_CACHE_TIME = 30000; // 30 segundos de cache

  useEffect(() => {
    const checkActive = async () => {
      if (!isAuthenticated) return;

      // Usar cache para evitar solicitudes frecuentes
      const now = Date.now();
      if (now - lastActiveCheck < ACTIVE_CHECK_CACHE_TIME) {
        return;
      }

      try {
        const res = await api.hasActiveRegistration();
        setHasActiveRegistration(!!res.hasActiveRegistration);
        setLastActiveCheck(now);
      } catch (e) {
        console.error("Error checking active registration:", e);
        // En caso de error, no bloquear al usuario
        setHasActiveRegistration(false);
      }
    };

    checkActive();

    // Limpiar cache al desmontar
    return () => {
      setLastActiveCheck(0);
    };
  }, [isAuthenticated, lastActiveCheck]);

  // Determinar el estado real del torneo considerando los límites
  useEffect(() => {
    // Si el estado ya es "En curso" o "Finalizado", mantenerlo
    if (frontendState === "En curso" || frontendState === "Finalizado") {
      setCalculatedState(frontendState);
      return;
    }

    // Si está "Open" pero se alcanzaron los límites, cambiar a "Completo"
    if (frontendState === "Open") {
      const isAtCapacity = !canJoinTournament();
      setCalculatedState(isAtCapacity ? "Completo" : "Open");
    } else {
      setCalculatedState(frontendState);
    }
  }, [
    frontendState,
    maxAmount,
    maxPlayers,
    currentAmount,
    potentialAmount,
    participantCount,
    registrationFee,
  ]);

  // Countdown handling: prefer server value, fallback to startDate + duration
  const [countdown, setCountdown] = useState<number | undefined>(() => {
    if (typeof countdownRemaining === "number") return countdownRemaining;
    if (
      calculatedState === "En curso" &&
      startDate &&
      typeof duration === "number"
    ) {
      const end = new Date(startDate).getTime() + duration * 60 * 1000;
      return Math.max(0, Math.floor((end - Date.now()) / 1000));
    }
    return undefined;
  });

  useEffect(() => {
    if (
      calculatedState !== "En curso" ||
      !startDate ||
      typeof duration !== "number"
    )
      return;
    const tick = () => {
      const end = new Date(startDate).getTime() + duration * 60 * 1000;
      const secs = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setCountdown(secs);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [calculatedState, startDate, duration]);

  // Auto-finalize tournament when countdown reaches 0
  useTournamentFinalization(id, countdown, calculatedState);

  // Función para verificar si el usuario puede unirse al torneo
  const canJoinTournament = (): boolean => {
    // Si el torneo no está abierto, no se puede unir
    if (calculatedState !== "Open") return false;

    // Verificar límite de recaudación (si está definido) - usando potentialAmount como el backend
    if (maxAmount !== null && maxAmount !== undefined) {
      // Usar potentialAmount (incluye pagos pendientes) para coincidir exactamente con el backend
      const amountToCheck =
        potentialAmount !== undefined ? potentialAmount : currentAmount;
      if (amountToCheck + registrationFee > maxAmount) return false;
    }

    // Verificar límite de jugadores (si está definido)
    if (maxPlayers !== null && maxPlayers !== undefined) {
      if (participantCount >= maxPlayers) return false;
    }

    return true;
  };

  const handleJoinTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txHash.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar el hash de la transacción",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsJoining(false);
      toast({
        title: "Error de conexión",
        description:
          "La solicitud está tardando demasiado. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    }, 30000); // 30 second timeout

    try {
      await api.joinTournament(id.toString(), txHash);
      clearTimeout(timeoutId);
      toast({
        title: "¡Inscripción enviada!",
        description:
          "Tu pago está pendiente de verificación por parte del administrador",
      });
      setShowJoinDialog(false);
      setTxHash("");
      window.location.reload();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Join tournament error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo procesar la inscripción",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const getStatusColor = () => {
    switch (calculatedState) {
      case "En curso":
        return "bg-cyber-green";
      case "Open":
        return "bg-neon-blue";
      case "Finalizado":
        return "bg-muted";
      case "Completo":
        return "bg-amber-500";
      default:
        return "bg-neon-purple";
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
    if (calculatedState === "Finalizado") return "Finalizado";
    if (calculatedState === "En curso") return "En Curso";
    if (calculatedState === "Completo") {
      // Mensaje específico para estado "Completo"
      if (maxAmount !== null && maxAmount !== undefined) {
        const amountToCheck =
          potentialAmount !== undefined ? potentialAmount : currentAmount;
        if (amountToCheck + registrationFee > maxAmount) {
          return "Límite de recaudación alcanzado";
        }
      }

      if (
        maxPlayers !== null &&
        maxPlayers !== undefined &&
        participantCount >= maxPlayers
      ) {
        return "Límite de jugadores alcanzado";
      }

      return "Torneo Completo";
    }
    if (hasActiveRegistration) return "Ya estás en un torneo";

    return "Unirse al Torneo";
  };

  const isTournamentAtCapacity = (): boolean => {
    return calculatedState === "Completo";
  };

  const handleButtonClick = () => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para unirte a un torneo",
        variant: "destructive",
      });
      return;
    }

    if (hasActiveRegistration) {
      toast({
        title: "No disponible",
        description: "Ya estás inscrito en un torneo activo",
        variant: "destructive",
      });
      return;
    }

    if (isTournamentAtCapacity()) {
      // Mostrar mensaje específico según qué límite se alcanzó
      let message = "No se pueden aceptar más inscripciones";

      // Verificar maxAmount primero (como en el backend)
      if (maxAmount !== null && maxAmount !== undefined) {
        const amountToCheck =
          potentialAmount !== undefined ? potentialAmount : currentAmount;
        if (amountToCheck + registrationFee > maxAmount) {
          message = "El torneo ha alcanzado su capacidad máxima de recaudación";
        }
      }

      // Si maxAmount no fue el problema, verificar maxPlayers
      if (
        message === "No se pueden aceptar más inscripciones" &&
        maxPlayers !== null &&
        maxPlayers !== undefined &&
        participantCount >= maxPlayers
      ) {
        message = "El torneo ha alcanzado el límite máximo de jugadores";
      }

      toast({
        title: "Torneo completo",
        description: message,
        variant: "destructive",
      });
      return;
    }

    // Solo abrir el modal si pasa todas las validaciones
    setShowJoinDialog(true);
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm cyber-border hover:shadow-glow-primary transition-all duration-300 hover:scale-105 tournament-card">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl font-orbitron text-foreground">
            {name}
          </CardTitle>
          <Badge
            className={`${getStatusColor()} text-card font-orbitron font-bold`}
          >
            {calculatedState.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="info-grid">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-cyber-gold" />
            <div>
              <div className="text-sm text-muted-foreground">Premio Total</div>
              <div className="font-bold text-cyber-gold">
                ${maxAmount || 0} USDT
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-neon-blue" />
            <div>
              <div className="text-sm text-muted-foreground">Participantes</div>
              <div className="font-bold text-neon-blue">
                {participantCount}/{maxPlayers || "∞"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-neon-purple" />
          <div>
            <div className="text-sm text-muted-foreground">
              Recaudación actual
            </div>
            <div className="font-bold text-neon-purple">
              ${currentAmount} USDT
            </div>
            {potentialAmount !== undefined &&
              potentialAmount !== currentAmount && (
                <div className="text-xs text-muted-foreground">
                  (${potentialAmount} USDT incluyendo pendientes)
                </div>
              )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-neon-purple" />
          <div>
            <div className="text-sm text-muted-foreground">
              Porcentaje a repartir
            </div>
            <div className="font-bold text-neon-purple">
              {prizePercentage ?? 0}%
            </div>
            <div className="text-xs text-muted-foreground">
              Total: $
              {((maxAmount ?? 0) * ((prizePercentage ?? 0) / 100)).toFixed(2)}{" "}
              USDT
            </div>
          </div>
        </div>

        {calculatedState === "En curso" && countdown !== undefined && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-cyber-green" />
            <div>
              <div className="text-sm text-muted-foreground">
                Tiempo restante
              </div>
              <div className="font-bold text-cyber-green">
                {formatCountdown(countdown)}
              </div>
            </div>
          </div>
        )}

        {startDate && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-neon-purple" />
            <div>
              <div className="text-sm text-muted-foreground">Inicio</div>
              <div className="font-bold text-neon-purple">
                {new Date(startDate).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {calculatedState === "Finalizado" && endDate && (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Finalización</div>
              <div className="font-bold text-muted-foreground">
                {new Date(endDate).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-sm text-muted-foreground mb-1">Inscripción</div>
          <div className="text-2xl font-orbitron font-bold text-foreground">
            {registrationFee} USDT
          </div>
        </div>

        {calculatedState === "Open" && (
          <div className="text-sm text-muted-foreground p-2 bg-neon-blue/10 rounded">
            ℹ️ Inscripciones abiertas - No se aceptan puntuaciones aún
          </div>
        )}

        {calculatedState === "Completo" && (
          <div className="w-full text-center py-3 bg-amber-100 text-amber-700 rounded-md">
            {maxAmount !== null &&
            maxAmount !== undefined &&
            (potentialAmount !== undefined ? potentialAmount : currentAmount) +
              registrationFee >
              maxAmount
              ? "Torneo completo"
              : "Torneo completo"}
          </div>
        )}
      </CardContent>

      <CardFooter>
        {calculatedState === "Open" ? (
          <>
            <Button
              variant="neon"
              className="w-full"
              onClick={handleButtonClick}
              disabled={
                !isAuthenticated ||
                hasActiveRegistration ||
                isTournamentAtCapacity()
              }
            >
              <Trophy className="h-4 w-4" />
              {!isAuthenticated ? "Inicia Sesión" : getJoinButtonText()}
            </Button>

            <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-center">
                    Unirse a {name}
                  </DialogTitle>
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
                    <div className="p-3 bg-muted/50 rounded relative">
                      <div className="text-sm font-mono">
                        0x40b0c9F670d07f7439AE291E9De9b0Bd8CeD4e6e
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Red: BEP20 (BNB)
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 h-7 px-2 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            "0x40b0c9F670d07f7439AE291E9De9b0Bd8CeD4e6e"
                          );
                          toast({
                            title: "Wallet copiada",
                            description:
                              "La dirección de la wallet ha sido copiada al portapapeles",
                          });
                        }}
                      >
                        Copiar
                      </Button>
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
          </>
        ) : calculatedState === "Completo" ? (
          <div className="w-full text-center py-3 bg-amber-100 text-amber-700 rounded-md">
            <XCircle className="h-5 w-5 inline-block mr-2" />
            <span className="font-medium">{getJoinButtonText()}</span>
          </div>
        ) : (
          <Button
            variant={calculatedState === "En curso" ? "cyber" : "outline"}
            className="w-full"
            disabled={calculatedState === "Finalizado"}
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
