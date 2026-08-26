import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  syncPunches,
  getLastSyncDate,
  type SyncProgress,
} from "@/services/sync.service";
import { toast } from "sonner";

export function useSyncPunches() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const mutationFn = useCallback(async () => {
    setProgress({ percent: 0, processed: 0, total: 0 });
    try {
      return await syncPunches((p) => setProgress(p));
    } finally {
      setProgress(null);
    }
  }, []);

  const mutation = useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (data.success && data.stats) {
        const { savedPunches, removedPunches, employees, duration } =
          data.stats;
        const removidas =
          removedPunches > 0 ? `, ${removedPunches} removidas` : "";
        toast.success(
          `Sincronização concluída! ${savedPunches} batidas de ${employees} funcionários${removidas} em ${duration}s`
        );

        queryClient.invalidateQueries({ queryKey: ["punches"] });
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        queryClient.invalidateQueries({ queryKey: ["sync-status"] });
      } else {
        toast.error(data.error || "Erro na sincronização");
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  return { ...mutation, progress };
}

export function useLastSyncDate() {
  return useQuery({
    queryKey: ["sync-status"],
    queryFn: getLastSyncDate,
    refetchInterval: 60000,
  });
}
