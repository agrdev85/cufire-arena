import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth, api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, DollarSign, Trophy, Users, Plus, Edit, Trash2, Search } from "lucide-react";
import TournamentForm from "@/components/TournamentForm";
import UserForm from "@/components/UserForm";

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
  description?: string;
  maxPlayers?: number;
  maxAmount?: number;
  currentAmount: number;
  registrationFee: number;
  prizePercentage: number;
  duration?: number;
  frontendState: string;
  isActive: boolean;
}

interface User {
  id: number;
  username: string;
  email: string;
  usdtWallet: string;
  isAdmin: boolean;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string;
}

const Admin = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search states
  const [paymentSearch, setPaymentSearch] = useState('');
  const [tournamentSearch, setTournamentSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  
  // Dialog states
  const [tournamentDialog, setTournamentDialog] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      window.location.href = '/';
      return;
    }

    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, paymentStatus, paymentSearch, userSearch]);

  const fetchData = async () => {
    try {
      const [paymentsRes, tournamentsRes, usersRes] = await Promise.all([
        api.getPayments({ status: paymentStatus as any, search: paymentSearch }),
        api.getTournaments(),
        api.getUsers(userSearch),
      ]);
      setPayments(paymentsRes.payments || []);
      setTournaments(tournamentsRes.tournaments || []);
      setUsers(usersRes.users || []);
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
      fetchData();
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
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al distribuir premios",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTournament = async (id: number) => {
    try {
      await api.deleteTournament(id.toString());
      toast({ title: "Torneo eliminado" });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar torneo",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await api.deleteUser(id.toString());
      toast({ title: "Usuario eliminado" });
      fetchData();
    } catch (error) {
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Error al eliminar usuario",
        variant: "destructive"
      });
    }
  };

  // Filtered data based on search
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesSearch = paymentSearch === '' || 
        payment.user.username.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        payment.user.email.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        payment.tournament.name.toLowerCase().includes(paymentSearch.toLowerCase());
      
      const matchesStatus = paymentStatus === 'all' || 
        (paymentStatus === 'pending' && !payment.isActive) ||
        (paymentStatus === 'verified' && payment.isActive);
      
      return matchesSearch && matchesStatus;
    });
  }, [payments, paymentSearch, paymentStatus]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter(tournament =>
      tournament.name.toLowerCase().includes(tournamentSearch.toLowerCase())
    );
  }, [tournaments, tournamentSearch]);

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.usdtWallet.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payments">Pagos</TabsTrigger>
            <TabsTrigger value="tournaments">Torneos</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>  
            <TabsTrigger value="prizes">Premios</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Gestión de Pagos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Buscar pagos..."
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      className="w-64"
                    />
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="pending">Pendientes</option>
                      <option value="verified">Verificados</option>
                      <option value="all">Todos</option>
                    </select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No hay pagos que mostrar</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Torneo</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>TX Hash</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
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
                          <TableCell>
                            <Badge variant={payment.isActive ? "default" : "secondary"}>
                              {payment.isActive ? "Verificado" : "Pendiente"}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {!payment.isActive && (
                              <Button
                                size="sm"
                                onClick={() => handleVerifyPayment(payment.id)}
                                className="bg-cyber-green hover:bg-cyber-green/80"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Verificar
                              </Button>
                            )}
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
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Gestión de Torneos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Buscar torneos..."
                      value={tournamentSearch}
                      onChange={(e) => setTournamentSearch(e.target.value)}
                      className="w-64"
                    />
                    <Dialog open={tournamentDialog} onOpenChange={setTournamentDialog}>
                      <DialogTrigger asChild>
                        <Button onClick={() => setEditingTournament(null)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Crear Torneo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editingTournament ? 'Editar Torneo' : 'Crear Torneo'}
                          </DialogTitle>
                        </DialogHeader>
                        <TournamentForm
                          tournament={editingTournament}
                          onSave={() => {
                            setTournamentDialog(false);
                            fetchData();
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTournaments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No hay torneos que mostrar</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredTournaments.map((tournament) => (
                      <div key={tournament.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-orbitron font-bold">{tournament.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <Badge variant="outline">{tournament.frontendState}</Badge>
                            <span>Recaudado: ${tournament.currentAmount} USDT</span>
                            {tournament.maxAmount && (
                              <span>Meta: ${tournament.maxAmount} USDT</span>
                            )}
                            <span>Premio: {tournament.prizePercentage}%</span>
                          </div>
                        </div>
                        <div className="space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTournament(tournament);
                              setTournamentDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTournament(tournament.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Gestión de Usuarios</span>
                  </div>
                  <Input
                    placeholder="Buscar usuarios..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-64"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No hay usuarios que mostrar</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Wallet USDT</TableHead>
                        <TableHead>Estadísticas</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Registro</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="font-mono text-xs">{user.usdtWallet}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Jugados: {user.gamesPlayed}</div>
                              <div>Ganados: {user.gamesWon}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isAdmin ? "default" : "secondary"}>
                              {user.isAdmin ? "Admin" : "User"}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                    Los porcentajes se calculan sobre el <strong>maxAmount × prizePercentage</strong> del torneo
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {editingUser && (
          <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Usuario</DialogTitle>
              </DialogHeader>
              <UserForm
                user={editingUser}
                onSave={() => {
                  setEditingUser(null);
                  fetchData();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default Admin;