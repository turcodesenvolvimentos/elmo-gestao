import { useQuery } from "@tanstack/react-query";
import { fetchTimeSheet } from "@/services/time-sheets.service";

export function useTimeSheet(
  startDate: string,
  endDate: string,
  employeeId?: number,
  companyId?: number,
  format: "PDF" | "XLS" | "JPG" = "PDF"
) {
  return useQuery({
    queryKey: ["timeSheet", startDate, endDate, employeeId, companyId, format],
    queryFn: () =>
      fetchTimeSheet(startDate, endDate, employeeId, companyId, format),
    enabled: !!startDate && !!endDate,
  });
}
