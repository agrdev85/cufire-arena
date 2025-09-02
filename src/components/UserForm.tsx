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
  user: User;
  onSave: () => void;
}

const UserForm = ({ user, onSave }: UserFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    usdtWallet: user.usdtWallet,
    isAdmin: user.isAdmin,
    gamesPlayed: user.gamesPlayed,
    gamesWon: user.gamesWon
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await api.updateUser(user.id.toString(), formData);
      toast({ title: "Usuario actualizado" });
      onSave();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar usuario",
        variant: "destructive"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Username</label>
        <Input
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Wallet USDT</label>
        <Input
          value={formData.usdtWallet}
          onChange={(e) => setFormData({ ...formData, usdtWallet: e.target.value })}
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Juegos jugados</label>
          <Input
            type="number"
            value={formData.gamesPlayed}
            onChange={(e) => setFormData({ ...formData, gamesPlayed: parseInt(e.target.value) })}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Juegos ganados</label>
          <Input
            type="number"
            value={formData.gamesWon}
            onChange={(e) => setFormData({ ...formData, gamesWon: parseInt(e.target.value) })}
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isAdmin"
          checked={formData.isAdmin}
          onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: !!checked })}
        />
        <label htmlFor="isAdmin" className="text-sm font-medium">
          Es administrador
        </label>
      </div>
      
      <div className="flex justify-end">
        <Button type="submit">Actualizar</Button>
      </div>
    </form>
  );
};

export default UserForm;