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
  updateEmployeeCompanyPosition,
  removeCompanyFromEmployee,
  createEmployee,
  updateEmployee,
} from "@/services/employees.service";
import {
  CreateEmployeeData,
  Employee,
  FindAllEmployeesParams,
  TangerinoEmployeesResponse,
  UpdateEmployeeData,
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
  {
    solidesId: number;
    companyId: string;
    positionId?: string;
    department?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ solidesId, companyId, positionId, department }) =>
      addCompanyToEmployee(solidesId, companyId, positionId, department),
    onSuccess: async () => {
      // Invalidar e recarregar a lista de funcionários
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      // Invalidar e fazer refetch da lista de empresas para atualizar contadores
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
      await queryClient.refetchQueries({ queryKey: ["companies"] });
    },
  });
}

export function useUpdateEmployeeCompanyPosition(): UseMutationResult<
  void,
  Error,
  {
    solidesId: number;
    companyId: string;
    positionId?: string;
    department?: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ solidesId, companyId, positionId, department }) =>
      updateEmployeeCompanyPosition(solidesId, companyId, positionId, department),
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

export function useCreateEmployee(): UseMutationResult<
  Employee,
  Error,
  CreateEmployeeData
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmployee,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployee(): UseMutationResult<
  Employee,
  Error,
  { solidesId: number; data: UpdateEmployeeData }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ solidesId, data }) => updateEmployee(solidesId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
