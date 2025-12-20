import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  CreateCompanyData,
  UpdateCompanyData,
} from "@/services/companies.service";
import { CompaniesResponse, Company } from "@/types/companies";

export function useCompanies(): UseQueryResult<CompaniesResponse, Error> {
  return useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCompany(): UseMutationResult<
  Company,
  Error,
  CreateCompanyData
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useUpdateCompany(): UseMutationResult<
  Company,
  Error,
  { id: string; data: UpdateCompanyData }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateCompany(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useDeleteCompany(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
