import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { fetchEmployees } from "@/services/employees.service";
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
