import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchShiftsByCompany,
  createShift,
  updateShift,
  deleteShift,
} from "@/services/shifts.service";
import {
  ShiftsResponse,
  Shift,
  CreateShiftData,
  UpdateShiftData,
} from "@/types/shifts";

export function useShifts(
  companyId: string
): UseQueryResult<ShiftsResponse, Error> {
  return useQuery({
    queryKey: ["shifts", companyId],
    queryFn: () => fetchShiftsByCompany(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateShift(): UseMutationResult<
  Shift,
  Error,
  { companyId: string; data: CreateShiftData }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, data }) => createShift(companyId, data),
    onSuccess: (_, variables) => {
      // Invalidar a query específica da empresa
      queryClient.invalidateQueries({
        queryKey: ["shifts", variables.companyId],
      });
      // Invalidar a query de todos os shifts
      queryClient.invalidateQueries({
        queryKey: ["shifts", "all"],
      });
    },
  });
}

export function useUpdateShift(): UseMutationResult<
  Shift,
  Error,
  { companyId: string; shiftId: string; data: UpdateShiftData }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, shiftId, data }) =>
      updateShift(companyId, shiftId, data),
    onSuccess: (_, variables) => {
      // Invalidar a query específica da empresa
      queryClient.invalidateQueries({
        queryKey: ["shifts", variables.companyId],
      });
      // Invalidar a query de todos os shifts
      queryClient.invalidateQueries({
        queryKey: ["shifts", "all"],
      });
    },
  });
}

export function useDeleteShift(): UseMutationResult<
  void,
  Error,
  { companyId: string; shiftId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, shiftId }) => deleteShift(companyId, shiftId),
    onSuccess: (_, variables) => {
      // Invalidar a query específica da empresa
      queryClient.invalidateQueries({
        queryKey: ["shifts", variables.companyId],
      });
      // Invalidar a query de todos os shifts
      queryClient.invalidateQueries({
        queryKey: ["shifts", "all"],
      });
    },
  });
}
