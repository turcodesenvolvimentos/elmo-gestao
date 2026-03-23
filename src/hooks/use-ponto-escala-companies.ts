import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { fetchPontoEscalaCompanies } from "@/services/ponto-escala-companies.service";
import type { EscalaCompanyEntry } from "@/lib/punch-company-resolution";

export function usePontoEscalaCompanies(params: {
  startDate: string;
  endDate: string;
  employeeSolidesId?: number;
  enabled?: boolean;
}): UseQueryResult<EscalaCompanyEntry[], Error> {
  const enabled =
    (params.enabled ?? true) &&
    !!params.startDate &&
    !!params.endDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.startDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.endDate);

  return useQuery({
    queryKey: [
      "ponto-escala-companies",
      params.startDate,
      params.endDate,
      params.employeeSolidesId ?? "all",
    ],
    queryFn: () =>
      fetchPontoEscalaCompanies({
        start_date: params.startDate,
        end_date: params.endDate,
        employee_solides_id: params.employeeSolidesId,
      }),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
