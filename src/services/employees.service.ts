import {
  FindAllEmployeesParams,
  TangerinoEmployeesResponse,
} from "@/types/employees";

export async function fetchEmployees(
  params: FindAllEmployeesParams = { page: 1, size: 10 }
): Promise<TangerinoEmployeesResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.append("page", params.page.toString());
  if (params.size) searchParams.append("size", params.size.toString());
  if (params.showFired !== undefined)
    searchParams.append("showFired", params.showFired.toString());
  if (params.lastUpdate)
    searchParams.append("lastUpdate", params.lastUpdate.toString());
  if (params.managerExternalId)
    searchParams.append("managerExternalId", params.managerExternalId);
  if (params.branchExternalId)
    searchParams.append("branchExternalId", params.branchExternalId);

  const response = await fetch(`/api/employees?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Erro ao buscar funcionários");
  }

  return response.json();
}
