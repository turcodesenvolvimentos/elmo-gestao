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

export async function addCompanyToEmployee(
  solidesId: number,
  companyId: string,
  positionId?: string
): Promise<void> {
  const response = await fetch(`/api/employees/${solidesId}/companies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ companyId, positionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao adicionar empresa ao funcionário");
  }
}

export async function updateEmployeeCompanyPosition(
  solidesId: number,
  companyId: string,
  positionId?: string
): Promise<void> {
  const response = await fetch(`/api/employees/${solidesId}/companies`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ companyId, positionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao atualizar cargo do funcionário");
  }
}

export async function removeCompanyFromEmployee(
  solidesId: number,
  companyId: string
): Promise<void> {
  const response = await fetch(
    `/api/employees/${solidesId}/companies?companyId=${companyId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Erro ao remover empresa do funcionário");
  }
}
