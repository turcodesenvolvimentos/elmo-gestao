import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchCustomHolidays,
  createCustomHoliday,
  updateCustomHoliday,
  deleteCustomHoliday,
  CreateCustomHolidayData,
  UpdateCustomHolidayData,
} from "@/services/custom-holidays.service";
import { CustomHoliday, CustomHolidaysResponse } from "@/types/custom-holidays";

export function useCustomHolidays(): UseQueryResult<
  CustomHolidaysResponse,
  Error
> {
  return useQuery({
    queryKey: ["custom-holidays"],
    queryFn: fetchCustomHolidays,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCustomHoliday(): UseMutationResult<
  CustomHoliday,
  Error,
  CreateCustomHolidayData
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-holidays"] });
    },
  });
}

export function useUpdateCustomHoliday(): UseMutationResult<
  CustomHoliday,
  Error,
  { id: string; data: UpdateCustomHolidayData }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateCustomHoliday(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-holidays"] });
    },
  });
}

export function useDeleteCustomHoliday(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-holidays"] });
    },
  });
}
