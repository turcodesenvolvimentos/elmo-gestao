import {
  PositionsResponse,
  Position,
  CreatePositionData,
  UpdatePositionData,
} from "@/types/positions";

export async function fetchPositionsByCompany(
  companyId: string
): Promise<PositionsResponse> {
  const response = await fetch(`/api/companies/${companyId}/positions`);

  if (!response.ok) {
    throw new Error("Erro ao buscar cargos");
  }

  return response.json();
}

export async function createPosition(
  companyId: string,
  data: CreatePositionData
): Promise<Position> {
  const response = await fetch(`/api/companies/${companyId}/positions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao criar cargo");
  }

  return response.json();
}

export async function updatePosition(
  id: string,
  data: UpdatePositionData
): Promise<Position> {
  const response = await fetch(`/api/positions/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao atualizar cargo");
  }

  return response.json();
}

export async function deletePosition(id: string): Promise<void> {
  const response = await fetch(`/api/positions/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao excluir cargo");
  }
}
