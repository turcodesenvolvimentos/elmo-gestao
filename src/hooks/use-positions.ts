import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchPositionsByCompany,
  createPosition,
  updatePosition,
  deletePosition,
} from "@/services/positions.service";
import {
  PositionsResponse,
  Position,
  CreatePositionData,
  UpdatePositionData,
} from "@/types/positions";

export function usePositions(
  companyId: string
): UseQueryResult<PositionsResponse, Error> {
  return useQuery({
    queryKey: ["positions", companyId],
    queryFn: () => fetchPositionsByCompany(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useCreatePosition(): UseMutationResult<
  Position,
  Error,
  { companyId: string; data: CreatePositionData }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, data }) => createPosition(companyId, data),
    onSuccess: (_, variables) => {
      // Invalidar e recarregar a lista de cargos da empresa
      queryClient.invalidateQueries({
        queryKey: ["positions", variables.companyId],
      });
      // Também invalidar a lista de empresas para atualizar os cargos
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useUpdatePosition(): UseMutationResult<
  Position,
  Error,
  { id: string; data: UpdatePositionData; companyId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updatePosition(id, data),
    onSuccess: (_, variables) => {
      // Invalidar e recarregar a lista de cargos da empresa
      queryClient.invalidateQueries({
        queryKey: ["positions", variables.companyId],
      });
      // Também invalidar a lista de empresas
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useDeletePosition(): UseMutationResult<
  void,
  Error,
  { id: string; companyId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }) => deletePosition(id),
    onSuccess: (_, variables) => {
      // Invalidar e recarregar a lista de cargos da empresa
      queryClient.invalidateQueries({
        queryKey: ["positions", variables.companyId],
      });
      // Também invalidar a lista de empresas
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
