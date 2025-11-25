import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchEmployees,
  addCompanyToEmployee,
  removeCompanyFromEmployee,
} from "@/services/employees.service";
import {
  FindAllEmployeesParams,
  TangerinoEmployeesResponse,
} from "@/types/employees";

export function useEmployees(
  params: FindAllEmployeesParams = {
    page: 1,
    size: 10,
  }
): UseQueryResult<TangerinoEmployeesResponse, Error> {
  return useQuery({
    queryKey: ["employees", params],
    queryFn: () => fetchEmployees(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddCompanyToEmployee(): UseMutationResult<
  void,
  Error,
  { solidesId: number; companyId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ solidesId, companyId }) =>
      addCompanyToEmployee(solidesId, companyId),
    onSuccess: async () => {
      // Invalidar e recarregar a lista de funcionários
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      // Invalidar e fazer refetch da lista de empresas para atualizar contadores
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      await queryClient.refetchQueries({ queryKey: ["companies"] });
    },
  });
}

export function useRemoveCompanyFromEmployee(): UseMutationResult<
  void,
  Error,
  { solidesId: number; companyId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ solidesId, companyId }) =>
      removeCompanyFromEmployee(solidesId, companyId),
    onSuccess: async () => {
      // Invalidar e recarregar a lista de funcionários
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      // Invalidar e fazer refetch da lista de empresas para atualizar contadores
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      await queryClient.refetchQueries({ queryKey: ["companies"] });
    },
  });
}
