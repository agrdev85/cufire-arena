import Header from "@/components/Header";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import TournamentDetails from "@/components/TournamentDetails";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth, api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, DollarSign, Trophy, Users, Plus, Edit, Trash2, Search, UserPlus } from "lucide-react";
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
  participantCount: number;
  participants: string[];
  startDate?: string;
  endDate?: string;
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
  updatedAt: string;
}

export default function Admin() {
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
  const [userDialog, setUserDialog] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isFetchingRef = useRef(false);
  // Tournament details modal
  const [detailsTournamentId, setDetailsTournamentId] = useState<number | null>(null);
  // Switch global para ocultar torneos finalizados
  const [hideFinalized, setHideFinalized] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('hideFinalizedTournaments') : null;
    return stored === null ? true : stored === 'true';
  });
  // Estado global de IDs de torneos finalizados ocultos (persistente en DB)
  const [hiddenFinalizedIds, setHiddenFinalizedIds] = useState<number[]>([]);

  // Cargar lista global al montar
  useEffect(() => {
    api.getHiddenFinalizedTournaments().then(res => {
      setHiddenFinalizedIds(res.hidden || []);
    });
  }, []);

  // Ocultar/desocultar individual (persistente en DB)
  const handleToggleHideFinalized = async (id: number) => {
    const isHidden = hiddenFinalizedIds.includes(id);
    await api.setHiddenFinalizedTournament(id, !isHidden);
    // Refrescar lista
    const res = await api.getHiddenFinalizedTournaments();
    setHiddenFinalizedIds(res.hidden || []);
  };

  // Ocultar/desocultar todos los finalizados (persistente en DB)
  const handleHideFinalizedChange = async (checked: boolean) => {
    setHideFinalized(checked);
    await api.setHideAllFinalized(checked);
    // Refrescar lista
    const res = await api.getHiddenFinalizedTournaments();
    setHiddenFinalizedIds(res.hidden || []);
  };
  // Usar useCallback para memoizar fetchData
  const fetchData = useCallback(async (isPolling = false) => {
    if (!isAuthenticated || !user?.isAdmin) return;

    // Si es una llamada de polling y hay una búsqueda activa, no hacer la llamada
    if (isPolling && (paymentSearch || userSearch)) return;

    // Prevenir llamadas concurrentes
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000); // 5 segundos timeout

    try {
      if (!isPolling) setLoading(true);

      const fetchOptions = {
        signal: abortController.signal,
        headers: { 'Cache-Control': 'no-cache' }
      };

      const [paymentsRes, tournamentsRes, usersRes] = await Promise.allSettled([
        api.getPayments({ status: paymentStatus as any, search: paymentSearch }),
        api.getTournaments({}, false), // ← CORRECCIÓN: Añadido {}, false
        api.getUsers(userSearch, fetchOptions),
      ]);

      if (paymentsRes.status === 'fulfilled') {
        setPayments(Array.isArray(paymentsRes.value.payments) ? paymentsRes.value.payments : []);
      } else {
        console.error('Error fetching payments:', paymentsRes.reason);
        setPayments([]);
      }

      if (tournamentsRes.status === 'fulfilled') {
        setTournaments(Array.isArray(tournamentsRes.value.tournaments) ? tournamentsRes.value.tournaments : []);
      } else {
        console.error('Error fetching tournaments:', tournamentsRes.reason);
        setTournaments([]);
      }

      if (usersRes.status === 'fulfilled') {
        setUsers(Array.isArray(usersRes.value.users) ? usersRes.value.users : []);
      } else {
        console.error('Error fetching users:', usersRes.reason);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Error al cargar datos de administración",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isAuthenticated, user, paymentStatus, paymentSearch, userSearch, toast]);

  // Estado para controlar la última actualización
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const THROTTLE_TIME = 2000; // 2 segundos entre actualizaciones
  const isProduction = process.env.NODE_ENV === 'production';

  // Effect para autenticación y redireccionamiento
  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      window.location.href = '/';
    }
  }, [isAuthenticated, user]);

  // Effect unificado para manejo de datos
  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdate < THROTTLE_TIME) {
      return; // Evitar actualizaciones muy frecuentes
    }

    // Función para manejar la actualización
    const handleUpdate = async () => {
      if (!isAuthenticated || !user?.isAdmin) return;

      try {
        setLastUpdate(now);
        await fetchData(false);
      } catch (error) {
        console.error('Error en actualización:', error);
      }
    };

    // Configurar debounce para búsquedas
    const debounceTimer = setTimeout(handleUpdate, 800);

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [paymentStatus, paymentSearch, userSearch, isAuthenticated, user, lastUpdate, fetchData]);

  // Effect separado para polling con intervalo largo (deshabilitado en producción)
  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin || isProduction) return;

    // Solo hacer polling si no hay búsquedas activas
    if (paymentSearch || userSearch) return;

    const pollingInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdate >= THROTTLE_TIME) {
        fetchData(true);
        setLastUpdate(now);
      }
    }, 60000); // 1 minuto

    return () => clearInterval(pollingInterval);
  }, [isAuthenticated, user, paymentSearch, userSearch, lastUpdate, fetchData, isProduction]);

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
    if (!confirm('¿Estás seguro de que quieres eliminar este torneo?')) return;

    try {
      await api.deleteTournament(id.toString());
      toast({
        title: "Torneo eliminado",
        description: "El torneo se ha eliminado correctamente"
      });
      fetchData();
    } catch (error) {
      console.error('Delete tournament error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar torneo",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    try {
      await api.deleteUser(id.toString());
      toast({
        title: "Usuario eliminado",
        description: "El usuario se ha eliminado correctamente"
      });
      fetchData();
    } catch (error) {
      console.error('Delete user error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar usuario",
        variant: "destructive"
      });
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      setIsSaving(true);
      await api.createUser(userData);
      toast({
        title: "Usuario creado",
        description: "El usuario se ha creado correctamente"
      });
      setUserDialog(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear usuario",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUser = async (id: number, userData: any) => {
    try {
      setIsSaving(true);
      await api.updateUser(id.toString(), userData);
      toast({
        title: "Usuario actualizado",
        description: "El usuario se ha actualizado correctamente"
      });
      setEditingUser(null);
      setUserDialog(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar usuario",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered data based on search
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesSearch = paymentSearch === '' ||
        payment.user.username.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        payment.user.email.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        payment.tournament.name.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        payment.txHash.toLowerCase().includes(paymentSearch.toLowerCase());

      const matchesStatus = paymentStatus === 'all' ||
        (paymentStatus === 'pending' && !payment.isActive) ||
        (paymentStatus === 'verified' && payment.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [payments, paymentSearch, paymentStatus]);

  // Mostrar todos los torneos siempre en el panel admin, incluso si hiddenFinalized=true
  // El icono de ojo solo es un indicador visual, nunca oculta el torneo aquí
  const filteredTournaments = useMemo(() => {
    return tournaments.filter(tournament => {
      if (!tournamentSearch) return true;
      return (
        tournament.name.toLowerCase().includes(tournamentSearch.toLowerCase()) ||
        (tournament.description || '').toLowerCase().includes(tournamentSearch.toLowerCase())
      );
    });
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
       <Header />
      <div className="container mx-auto px-4 py-8 mt-16">
        <div className="mb-8">
          <h1 className="text-4xl font-orbitron font-bold mb-2 bg-gradient-to-r from-cyber-green to-neon-blue bg-clip-text text-transparent">
            Panel de Administración
          </h1>
          <p className="text-muted-foreground">Gestiona pagos, torneos y usuarios</p>
        </div>

        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payments">Pagos</TabsTrigger>
            <TabsTrigger value="tournaments">Torneos</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="prizes">Premios</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-6">
            <Card className="admin-card">
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
                              {payment.txHash.substring(0, 150)}...
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
            <div className="flex items-center justify-end mb-4">
              <span className="mr-2 text-sm">Ocultar finalizados</span>
              <Switch checked={hideFinalized} onCheckedChange={handleHideFinalizedChange} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
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
                      <DialogContent className="max-w-2xl admin-dialog">
                        <DialogHeader>
                          <DialogTitle>
                            {editingTournament ? 'Editar Torneo' : 'Crear Torneo'}
                          </DialogTitle>
                        </DialogHeader>
                        <TournamentForm
                          tournament={editingTournament}
                          onSave={() => {
                            setTournamentDialog(false);
                            setEditingTournament(null);
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
                    {filteredTournaments
                      .map((tournament) => (
                        <div key={tournament.id} className="flex items-center justify-between p-4 border rounded-lg relative">
                          <div className="flex-1">
                            <h3 className="font-orbitron font-bold text-lg">{tournament.name}</h3>
                            {tournament.description && (
                              <p className="text-sm text-muted-foreground mt-1">{tournament.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-2">
                              <Badge variant="outline">{tournament.frontendState}</Badge>
                              <span>Jugadores: {tournament.participantCount}{tournament.maxPlayers && `/${tournament.maxPlayers}`}</span>
                              <span>Recaudado: ${tournament.currentAmount} USDT</span>
                              {tournament.maxAmount && (
                                <span>Meta: ${tournament.maxAmount} USDT</span>
                              )}
                              <span>Premio: {tournament.prizePercentage}%</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDetailsTournamentId(tournament.id)}
                            >
                              <Users className="h-4 w-4 mr-1" />
                              Ver Detalles
                            </Button>
                          </div>
                          {/* Icono de ocultar/desocultar individual solo para finalizados, pero nunca oculta el torneo del admin */}
                          {tournament.frontendState === 'Finalizado' && (
                            <button
                              type="button"
                              title={hiddenFinalizedIds.includes(tournament.id) ? 'Mostrar torneo en público' : 'Ocultar torneo en público'}
                              onClick={() => handleToggleHideFinalized(tournament.id)}
                              className="absolute top-2 right-2 z-50 bg-card/80 rounded-full p-2 border border-border hover:bg-muted transition"
                            >
                              {hiddenFinalizedIds.includes(tournament.id) ? (
                                <EyeOff className="w-5 h-5 text-cyber-gold" />
                              ) : (
                                <Eye className="w-5 h-5 text-cyber-gold" />
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                )}
                {detailsTournamentId !== null && (
                  <TournamentDetails
                    tournamentId={detailsTournamentId}
                    onClose={() => setDetailsTournamentId(null)}
                  />
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
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Buscar usuarios..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-64"
                    />
                    {/* // Diálogo de usuario */}
                    <Dialog open={userDialog} onOpenChange={(open) => {
                      setUserDialog(open);
                      if (!open) setEditingUser(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button onClick={() => setEditingUser(null)}>
                          <UserPlus className="h-4 w-4 mr-1" />
                          Crear Usuario
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl admin-dialog">
                        <DialogHeader>
                          <DialogTitle>
                            {editingUser ? 'Editar Usuario' : 'Crear Usuario'}
                          </DialogTitle>
                        </DialogHeader>
                        <UserForm
                          user={editingUser}
                          onSave={async (userData) => {
                            try {
                              setIsSaving(true);
                              if (editingUser) {
                                await api.updateUser(editingUser.id.toString(), userData);
                                toast({
                                  title: "Usuario actualizado",
                                  description: "El usuario se ha actualizado correctamente"
                                });
                              } else {
                                await api.createUser(userData);
                                toast({
                                  title: "Usuario creado",
                                  description: "El usuario se ha creado correctamente"
                                });
                              }
                              setUserDialog(false);
                              setEditingUser(null);
                              fetchData();
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: error instanceof Error ? error.message : "Error al procesar usuario",
                                variant: "destructive"
                              });
                            } finally {
                              setIsSaving(false);
                            }
                          }}
                          onCancel={() => {
                            setUserDialog(false);
                            setEditingUser(null);
                          }}
                          isSaving={isSaving}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
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
                            <div className="text-sm space-y-1">
                              <div>Jugados: {user.gamesPlayed}</div>
                              <div>Ganados: {user.gamesWon}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isAdmin ? "default" : "secondary"}>
                              {user.isAdmin ? "Admin" : "User"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{new Date(user.createdAt).toLocaleDateString()}</div>
                              <div className="text-muted-foreground">
                                {new Date(user.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setUserDialog(true);
                                }}
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
      </div>
    </div>
  );
};