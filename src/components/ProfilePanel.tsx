import Header from "@/components/Header";
import { useEffect, useState, useCallback } from "react";
import { useAuth, api } from "@/lib/api";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: number;
  username: string;
  email: string;
  usdtWallet: string;
  gamesPlayed: number;
  gamesWon: number;
  tournaments?: any[];
  scores?: any[];
}

const ProfilePanel = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ username: "", usdtWallet: "" });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Cargar perfil al montar
  const fetchProfile = useCallback(async () => {
    if (!user || !isAuthenticated || hasFetched) {
      return;
    }
    
    if (user.isAdmin) {
      window.location.replace("/admin");
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching profile for user:', user.username);
      const res = await api.getUserProfile(user.username);
      console.log('Profile response:', res);
      
      if (res && res.user) {
        setProfile(res.user);
        setForm({
          username: res.user.username || "",
          usdtWallet: res.user.usdtWallet || ""
        });
        setHasFetched(true);
      } else {
        throw new Error("No se encontraron datos del usuario");
      }
    } catch (e: any) {
      console.error('Error fetching profile:', e);
      toast({ 
        title: "Error", 
        description: e.message || "No se pudo cargar el perfil del usuario", 
        variant: "destructive" 
      });
      if (e.status === 401) {
        window.location.replace("/");
      }
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated, toast, hasFetched]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  // Verificar si el usuario tiene torneos activos
  const hasActiveTournaments = profile && Array.isArray(profile.tournaments)
    ? profile.tournaments.some((t: any) => t.tournament && t.tournament.isActive)
    : false;

  // Verificar si el usuario tiene scores registrados
  const hasScores = profile && Array.isArray(profile.scores)
    ? profile.scores.length > 0
    : false;

  // Guardar cambios
  const handleSave = async () => {
    if (!profile) return;
    if (hasActiveTournaments) {
      toast({
        title: "No se puede modificar el perfil",
        description: "No puedes modificar tu perfil mientras tengas torneos activos",
        variant: "destructive"
      });
      return;
    }
    try {
      setLoading(true);
      await api.updateProfile({
        username: form.username,
        usdtWallet: form.usdtWallet
      });
      
      // Actualizar perfil localmente
      setProfile(prev => prev ? {
        ...prev,
        username: form.username,
        usdtWallet: form.usdtWallet
      } : null);
      
      toast({
        title: "Perfil actualizado",
        description: "Tus datos han sido guardados"
      });
      setEditMode(false);
    } catch (e: any) {
      const errorMessage = e.message || "No se pudo actualizar el perfil";
      toast({
        title: "Error",
        description: errorMessage.includes("403") ?
          "No puedes modificar tu perfil mientras tengas torneos activos" :
          errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Eliminar cuenta
  const handleDelete = async () => {
    if (!profile) return;
    
    if (hasActiveTournaments) {
      toast({
        title: "No se puede eliminar la cuenta",
        description: "No puedes eliminar tu cuenta mientras tengas torneos activos",
        variant: "destructive"
      });
      return;
    }

    if (hasScores) {
      toast({
        title: "No se puede eliminar la cuenta",
        description: "No puedes eliminar tu cuenta mientras tengas puntuaciones registradas",
        variant: "destructive"
      });
      return;
    }

    if (!window.confirm("¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.")) {
      return;
    }
    
    setDeleting(true);
    try {
      await api.deleteUserProfile();
      toast({
        title: "Cuenta eliminada",
        description: "Tu cuenta ha sido eliminada correctamente"
      });
      logout();
      window.location.replace("/");
    } catch (e: any) {
      const errorMessage = e.message || "No se pudo eliminar la cuenta";
      let description = errorMessage;
      
      if (errorMessage.includes("403")) {
        if (errorMessage.includes("torneos activos")) {
          description = "No puedes eliminar tu cuenta mientras tengas torneos activos";
        } else if (errorMessage.includes("puntuaciones")) {
          description = "No puedes eliminar tu cuenta mientras tengas puntuaciones registradas";
        } else if (errorMessage.includes("pagos pendientes")) {
          description = "No puedes eliminar tu cuenta mientras tengas pagos pendientes";
        }
      }
      
      toast({
        title: "Error",
        description: description,
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Debes iniciar sesión para ver tu perfil
      </div>
    );
  }

  if (user.isAdmin) {
    window.location.replace("/admin");
    return null;
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        Cargando perfil...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No se encontró el perfil
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
    <Header />
    <div className="max-w-xl mx-auto py-10 px-4 mt-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-orbitron">Mi Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          {!editMode ? (
            <div className="space-y-4">
              <div>
                <span className="font-bold">Usuario:</span> {profile.username}
              </div>
              <div>
                <span className="font-bold">Email:</span> {profile.email}
              </div>
              <div>
                <span className="font-bold">Wallet USDT:</span> {profile.usdtWallet}
              </div>
              <div className="flex gap-4">
                <div>
                  <span className="font-bold">Torneos jugados:</span> {profile.gamesPlayed}
                </div>
                <div>
                  <span className="font-bold">Torneos ganados:</span> {profile.gamesWon}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => setEditMode(true)} 
                  variant="outline"
                  disabled={hasActiveTournaments}
                >
                  Editar información
                </Button>
                <Button 
                  onClick={handleDelete} 
                  variant="destructive" 
                  disabled={deleting || hasActiveTournaments || hasScores}
                >
                  Eliminar cuenta
                </Button>
              </div>
              {(hasActiveTournaments || hasScores) && (
                <div className="text-sm text-muted-foreground mt-4">
                  {hasActiveTournaments && (
                    <p>• No puedes modificar tu perfil o eliminar tu cuenta mientras tengas torneos activos</p>
                  )}
                  {hasScores && (
                    <p>• No puedes eliminar tu cuenta mientras tengas puntuaciones registradas</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block font-bold mb-1">Usuario</label>
                <Input 
                  name="username" 
                  value={form.username} 
                  onChange={handleChange} 
                  disabled={loading} 
                  className="w-full"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Wallet USDT</label>
                <Input 
                  name="usdtWallet" 
                  value={form.usdtWallet} 
                  onChange={handleChange} 
                  disabled={loading} 
                  className="w-full"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={handleSave} 
                  variant="default" 
                  disabled={loading}
                >
                  Guardar cambios
                </Button>
                <Button 
                  onClick={() => setEditMode(false)} 
                  variant="outline" 
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
  );
};

export default ProfilePanel;