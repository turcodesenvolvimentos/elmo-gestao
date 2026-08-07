import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchAtestados,
  createAtestado,
  deleteAtestado,
} from "@/services/atestados.service";
import {
  Atestado,
  CreateAtestadoData,
  AtestadosResponse,
} from "@/types/atestados";

export function useAtestados(): UseQueryResult<AtestadosResponse, Error> {
  return useQuery({
    queryKey: ["atestados"],
    queryFn: fetchAtestados,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAtestado(): UseMutationResult<
  Atestado,
  Error,
  CreateAtestadoData
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAtestado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atestados"] });
    },
  });
}

export function useDeleteAtestado(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAtestado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atestados"] });
    },
  });
}
