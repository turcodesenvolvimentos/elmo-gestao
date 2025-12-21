import { CompaniesResponse, Company } from "@/types/companies";

export async function fetchCompanies(): Promise<CompaniesResponse> {
  const response = await fetch("/api/companies");

  if (!response.ok) {
    throw new Error("Erro ao buscar empresas");
  }

  return response.json();
}

export interface CreateCompanyData {
  name: string;
  address: string;
  vr_per_hour?: number;
  cost_help_per_hour?: number;
}

export interface UpdateCompanyData {
  name: string;
  address: string;
  vr_per_hour?: number;
  cost_help_per_hour?: number;
}

export async function createCompany(data: CreateCompanyData): Promise<Company> {
  const response = await fetch("/api/companies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao criar empresa");
  }

  return response.json();
}

export async function updateCompany(
  id: string,
  data: UpdateCompanyData
): Promise<Company> {
  const response = await fetch(`/api/companies/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao atualizar empresa");
  }

  return response.json();
}

export async function deleteCompany(id: string): Promise<void> {
  const response = await fetch(`/api/companies/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao excluir empresa");
  }
}

export interface CompanyEmployee {
  id: string;
  name: string;
  solides_id: number;
}

export interface CompanyEmployeesResponse {
  employees: CompanyEmployee[];
  total: number;
}

export async function fetchCompanyEmployees(
  companyId: string
): Promise<CompanyEmployeesResponse> {
  const response = await fetch(`/api/companies/${companyId}/employees`);

  if (!response.ok) {
    throw new Error("Erro ao buscar funcionários da empresa");
  }

  return response.json();
}
