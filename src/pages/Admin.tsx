import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, DollarSign, Trophy, Users } from "lucide-react";

interface Payment {
  id: number;
  userId: number;
  tournamentId: number;
  txHash: string;
  amount: number;
  isActive: boolean;
  createdAt: string;
  user: {
    username: string;
    email: string;
    usdtWallet: string;
  };
  tournament: {
    name: string;
  };
}

interface Tournament {
  id: number;
  name: string;
  frontendState: string;
  currentAmount: number;
  maxAmount?: number;
}

const Admin = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      window.location.href = '/';
      return;
    }

    fetchData();
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      // In a real implementation, you would have endpoints for admin data
      // For now, we'll simulate the data structure
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (paymentId: number) => {
    try {
      await api.verifyPayment(paymentId.toString());
      toast({
        title: "Pago verificado",
        description: "El pago ha sido verificado exitosamente",
      });
      fetchData(); // Refresh data
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al verificar pago",
        variant: "destructive"
      });
    }
  };

  const handleDistributePrizes = async (tournamentId: number) => {
    try {
      const result = await api.distributePrizes(tournamentId.toString());
      toast({
        title: "Premios distribuidos",
        description: `Se han calculado los premios para ${result.prizes?.length || 0} jugadores`,
      });
      fetchData(); // Refresh data
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al distribuir premios",
        variant: "destructive"
      });
    }
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-orbitron font-bold mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground">No tienes permisos de administrador</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-orbitron font-bold mb-4">Cargando...</h2>
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-orbitron font-bold mb-2 bg-gradient-to-r from-cyber-green to-neon-blue bg-clip-text text-transparent">
            Panel de Administración
          </h1>
          <p className="text-muted-foreground">Gestiona pagos, torneos y premios</p>
        </div>

        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payments">Pagos Pendientes</TabsTrigger>
            <TabsTrigger value="tournaments">Torneos</TabsTrigger>
            <TabsTrigger value="prizes">Distribución de Premios</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Pagos Pendientes de Verificación</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No hay pagos pendientes</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Torneo</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>TX Hash</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payment.user.username}</div>
                              <div className="text-sm text-muted-foreground">{payment.user.email}</div>
                              <div className="text-xs font-mono">{payment.user.usdtWallet}</div>
                            </div>
                          </TableCell>
                          <TableCell>{payment.tournament.name}</TableCell>
                          <TableCell className="font-bold">${payment.amount} USDT</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {payment.txHash.substring(0, 20)}...
                            </code>
                          </TableCell>
                          <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleVerifyPayment(payment.id)}
                              className="bg-cyber-green hover:bg-cyber-green/80"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verificar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Gestión de Torneos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tournaments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No hay torneos disponibles</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {tournaments.map((tournament) => (
                      <div key={tournament.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-orbitron font-bold">{tournament.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <Badge variant="outline">{tournament.frontendState}</Badge>
                            <span>Recaudado: ${tournament.currentAmount} USDT</span>
                            {tournament.maxAmount && (
                              <span>Meta: ${tournament.maxAmount} USDT</span>
                            )}
                          </div>
                        </div>
                        <div className="space-x-2">
                          {tournament.frontendState === "Finalizado" && (
                            <Button
                              variant="outline"
                              onClick={() => handleDistributePrizes(tournament.id)}
                            >
                              <Trophy className="h-4 w-4 mr-1" />
                              Distribuir Premios
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prizes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5" />
                  <span>Cálculo de Premios (Top-10)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-cyber-gold/10 rounded-lg">
                      <div className="text-2xl font-bold text-cyber-gold">1°</div>
                      <div className="text-sm text-muted-foreground">30%</div>
                    </div>
                    <div className="text-center p-4 bg-muted/10 rounded-lg">
                      <div className="text-2xl font-bold">2°</div>
                      <div className="text-sm text-muted-foreground">18%</div>
                    </div>
                    <div className="text-center p-4 bg-amber-600/10 rounded-lg">
                      <div className="text-2xl font-bold text-amber-600">3°</div>
                      <div className="text-sm text-muted-foreground">13%</div>
                    </div>
                    <div className="text-center p-4 bg-muted/10 rounded-lg">
                      <div className="text-xl font-bold">4°</div>
                      <div className="text-sm text-muted-foreground">9%</div>
                    </div>
                    <div className="text-center p-4 bg-muted/10 rounded-lg">
                      <div className="text-xl font-bold">5°</div>
                      <div className="text-sm text-muted-foreground">5%</div>
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-muted/10 rounded-lg">
                    <div className="text-lg font-bold">6° - 10°</div>
                    <div className="text-sm text-muted-foreground">5% cada uno</div>
                  </div>

                  <div className="text-xs text-muted-foreground text-center">
                    Los porcentajes se calculan sobre el <strong>maxAmount</strong> del torneo
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;