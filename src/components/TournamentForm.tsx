import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: number;
  name: string;
  description?: string;
  maxPlayers?: number;
  maxAmount?: number;
  registrationFee: number;
  prizePercentage: number;
  duration?: number;
}

interface TournamentFormProps {
  tournament?: Tournament | null;
  onSave: () => void;
}

const TournamentForm = ({ tournament, onSave }: TournamentFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: tournament?.name || '',
    description: tournament?.description || '',
    maxPlayers: tournament?.maxPlayers || '',
    maxAmount: tournament?.maxAmount || '',
    registrationFee: tournament?.registrationFee || 10,
    prizePercentage: tournament?.prizePercentage || 70,
    duration: tournament?.duration || 90
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        maxPlayers: formData.maxPlayers ? parseInt(formData.maxPlayers.toString()) : null,
        maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount.toString()) : null,
      };

      if (tournament) {
        await api.updateTournament(tournament.id.toString(), data);
        toast({ title: "Torneo actualizado" });
      } else {
        await api.createTournament(data);
        toast({ title: "Torneo creado" });
      }
      
      onSave();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar torneo",
        variant: "destructive"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nombre</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium">Descripción</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Jugadores máximos</label>
          <Input
            type="number"
            value={formData.maxPlayers}
            onChange={(e) => setFormData({ ...formData, maxPlayers: e.target.value })}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Meta USDT</label>
          <Input
            type="number"
            step="0.01"
            value={formData.maxAmount}
            onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Inscripción (USDT)</label>
          <Input
            type="number"
            step="0.01"
            value={formData.registrationFee}
            onChange={(e) => setFormData({ ...formData, registrationFee: parseFloat(e.target.value) })}
            required
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">% Premio</label>
          <Input
            type="number"
            min="1"
            max="100"
            value={formData.prizePercentage}
            onChange={(e) => setFormData({ ...formData, prizePercentage: parseInt(e.target.value) })}
            required
          />
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium">Duración (minutos)</label>
        <Input
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="submit">
          {tournament ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
};

export default TournamentForm;