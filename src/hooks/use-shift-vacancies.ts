import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchShiftVacancies,
  saveShiftVacancies,
} from "@/services/shift-vacancies.service";
import {
  ShiftVacanciesResponse,
  ShiftVacancyInput,
} from "@/types/shift-vacancies";

export function useShiftVacancies(
  shiftId: string
): UseQueryResult<ShiftVacanciesResponse, Error> {
  return useQuery({
    queryKey: ["shift-vacancies", shiftId],
    queryFn: () => fetchShiftVacancies(shiftId),
    enabled: !!shiftId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveShiftVacancies(): UseMutationResult<
  void,
  Error,
  { shiftId: string; items: ShiftVacancyInput[] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shiftId, items }) => saveShiftVacancies(shiftId, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["shift-vacancies", variables.shiftId],
      });
    },
  });
}
