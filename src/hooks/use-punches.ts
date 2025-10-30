import { useQuery } from "@tanstack/react-query";
import { fetchPunches } from "@/services/punches.service";

export function usePunches(
  page = 0,
  size = 50,
  startDate?: string,
  endDate?: string,
  employeeId?: number,
  status?: "APPROVED" | "PENDING" | "REPROVED"
) {
  return useQuery({
    queryKey: ["punches", page, size, startDate, endDate, employeeId, status],
    queryFn: () =>
      fetchPunches(page, size, startDate, endDate, employeeId, status),
    staleTime: 2 * 60 * 1000,
  });
}
