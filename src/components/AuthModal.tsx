import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal = ({ isOpen, onClose, onSuccess }: AuthModalProps) => {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ 
    email: "", 
    username: "", 
    password: "", 
    usdtWallet: "" 
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.login(loginData.email, loginData.password);
      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión exitosamente",
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al iniciar sesión",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.register(registerData.email, registerData.username, registerData.password, registerData.usdtWallet);
      toast({
        title: "¡Cuenta creada!",
        description: "Te has registrado exitosamente",
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al registrarse",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            CUFIRE ARENA
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Iniciando..." : "Iniciar Sesión"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-username">Nombre de Usuario</Label>
                <Input
                  id="register-username"
                  type="text"
                  placeholder="ProGamer2024"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Contraseña</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-wallet">Wallet USDT BEP20 (BNB)</Label>
                <Input
                  id="register-wallet"
                  type="text"
                  placeholder="TU_WALLET_USDT_AQUI"
                  value={registerData.usdtWallet}
                  onChange={(e) => setRegisterData({ ...registerData, usdtWallet: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registrando..." : "Crear Cuenta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
