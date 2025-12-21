import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchEscalas,
  fetchEscala,
  batchCreateEscalas,
  deleteEscala,
} from "@/services/escalas.service";
import {
  EscalasResponse,
  Escala,
  BatchCreateEscalaData,
} from "@/types/escalas";

export function useEscalas(params?: {
  employee_id?: string;
  shift_id?: string;
  company_id?: string;
}): UseQueryResult<EscalasResponse, Error> {
  return useQuery({
    queryKey: ["escalas", params],
    queryFn: () => fetchEscalas(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEscala(
  id: string | undefined
): UseQueryResult<Escala, Error> {
  return useQuery({
    queryKey: ["escalas", id],
    queryFn: () => fetchEscala(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBatchCreateEscalas(): UseMutationResult<
  { success: boolean; created: number; skipped?: number; escalas: Escala[] },
  Error,
  BatchCreateEscalaData
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchCreateEscalas,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas"] });
    },
  });
}

export function useDeleteEscala(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEscala,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas"] });
    },
  });
}
