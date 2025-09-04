import { useEffect } from 'react';
import { api } from '@/lib/api';

// Hook to handle tournament auto-finalization when countdown reaches 0
export const useTournamentFinalization = (
  tournamentId: number,
  countdown: number | undefined,
  frontendState: string
) => {
  useEffect(() => {
    if (frontendState !== 'En curso' || countdown === undefined || countdown > 0) {
      return;
    }

    // Tournament should be finished when countdown reaches 0
    const finalizeTournament = async () => {
      try {
        // Update tournament status to finished
        await api.updateTournament(tournamentId.toString(), {
          isActive: false,
          frontendState: 'Finalizado'
        });
        
        // Reload page to reflect changes
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('Error finalizing tournament:', error);
      }
    };

    // Small delay to ensure we don't trigger multiple times
    const timer = setTimeout(finalizeTournament, 2000);
    return () => clearTimeout(timer);
  }, [tournamentId, countdown, frontendState]);
};