import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchDepartmentsByCompany,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/services/departments.service";
import {
  DepartmentsResponse,
  Department,
  CreateDepartmentData,
  UpdateDepartmentData,
} from "@/types/departments";

export function useDepartments(
  companyId: string
): UseQueryResult<DepartmentsResponse, Error> {
  return useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => fetchDepartmentsByCompany(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDepartment(): UseMutationResult<
  Department,
  Error,
  { companyId: string; data: CreateDepartmentData }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, data }) => createDepartment(companyId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["departments", variables.companyId],
      });
    },
  });
}

export function useUpdateDepartment(): UseMutationResult<
  Department,
  Error,
  { id: string; data: UpdateDepartmentData; companyId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateDepartment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["departments", variables.companyId],
      });
    },
  });
}

export function useDeleteDepartment(): UseMutationResult<
  void,
  Error,
  { id: string; companyId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }) => deleteDepartment(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["departments", variables.companyId],
      });
    },
  });
}
