import {
  DepartmentsResponse,
  Department,
  CreateDepartmentData,
  UpdateDepartmentData,
} from "@/types/departments";

export async function fetchDepartmentsByCompany(
  companyId: string
): Promise<DepartmentsResponse> {
  const response = await fetch(`/api/companies/${companyId}/departments`);

  if (!response.ok) {
    throw new Error("Erro ao buscar setores");
  }

  return response.json();
}

export async function createDepartment(
  companyId: string,
  data: CreateDepartmentData
): Promise<Department> {
  const response = await fetch(`/api/companies/${companyId}/departments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao criar setor");
  }

  return response.json();
}

export async function updateDepartment(
  id: string,
  data: UpdateDepartmentData
): Promise<Department> {
  const response = await fetch(`/api/departments/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao atualizar setor");
  }

  return response.json();
}

export async function deleteDepartment(id: string): Promise<void> {
  const response = await fetch(`/api/departments/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao excluir setor");
  }
}
