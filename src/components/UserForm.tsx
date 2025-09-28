import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  username: string;
  email: string;
  usdtWallet: string;
  isAdmin: boolean;
  gamesPlayed: number;
  gamesWon: number;
}

interface UserFormProps {
  user?: User;
  onSave: (userData: any) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

const UserForm = ({ user, onSave, onCancel, isSaving }: UserFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    usdtWallet: user?.usdtWallet || '',
    isAdmin: user?.isAdmin || false,
    gamesPlayed: user?.gamesPlayed || 0,
    gamesWon: user?.gamesWon || 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await onSave(formData);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar usuario",
        variant: "destructive"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form space-y-6">
      {/* Información básica */}
      <div className="space-y-4">
        {/* Username */}
        <div className="form-field">
          <label className="text-sm md:text-base font-medium block mb-2">Nombre de usuario</label>
          <Input
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
            className="w-full text-sm md:text-base min-h-[44px] px-3 md:px-4"
            placeholder="Ingresa el username"
          />
        </div>

        {/* Email */}
        <div className="form-field">
          <label className="text-sm md:text-base font-medium block mb-2">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="w-full text-sm md:text-base min-h-[44px] px-3 md:px-4"
            placeholder="usuario@ejemplo.com"
          />
        </div>

        {/* Wallet USDT */}
        <div className="form-field">
          <label className="text-sm md:text-base font-medium block mb-2">Wallet USDT</label>
          <Input
            value={formData.usdtWallet}
            onChange={(e) => setFormData({ ...formData, usdtWallet: e.target.value })}
            required
            className="w-full text-sm md:text-base min-h-[44px] px-3 md:px-4"
            placeholder="Dirección de wallet USDT"
          />
          <p className="text-xs text-muted-foreground mt-1">Para recibir pagos de premios</p>
        </div>
      </div>
      
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="form-field">
          <label className="text-sm md:text-base font-medium block mb-2">Juegos jugados</label>
          <Input
            type="number"
            min="0"
            value={formData.gamesPlayed}
            onChange={(e) => setFormData({ ...formData, gamesPlayed: parseInt(e.target.value) || 0 })}
            className="w-full text-sm md:text-base min-h-[44px] px-3 md:px-4"
          />
        </div>

        <div className="form-field">
          <label className="text-sm md:text-base font-medium block mb-2">Juegos ganados</label>
          <Input
            type="number"
            min="0"
            value={formData.gamesWon}
            onChange={(e) => setFormData({ ...formData, gamesWon: parseInt(e.target.value) || 0 })}
            className="w-full text-sm md:text-base min-h-[44px] px-3 md:px-4"
          />
        </div>
      </div>
      
      {/* Checkbox para admin */}
      <div className="flex items-center space-x-3 p-3 bg-muted/20 rounded-lg">
        <Checkbox
          id="isAdmin"
          checked={formData.isAdmin}
          onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: !!checked })}
          className="h-5 w-5 md:h-6 md:w-6"
        />
        <label htmlFor="isAdmin" className="text-sm md:text-base font-medium flex-1">
          Usuario administrador
        </label>
      </div>

      {/* Información adicional */}
      <div className="bg-cyber-gold/10 p-3 rounded-lg">
        <p className="text-xs md:text-sm text-cyber-gold text-center">
          {user ? "Actualizando usuario existente" : "Creando nuevo usuario"}
        </p>
      </div>

      {/* Acciones del formulario */}
      <div className="pt-6 border-t border-border/50">
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto min-h-[44px] text-sm md:text-base px-4 md:px-6 bg-cyber-green hover:bg-cyber-green/80 disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : (user ? "Actualizar Usuario" : "Crear Usuario")}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full sm:w-auto min-h-[44px] text-sm md:text-base px-4 md:px-6"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
};

export default UserForm;