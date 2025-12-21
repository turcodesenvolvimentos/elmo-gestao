import {
  ShiftsResponse,
  Shift,
  CreateShiftData,
  UpdateShiftData,
} from "@/types/shifts";

export async function fetchShiftsByCompany(
  companyId: string
): Promise<ShiftsResponse> {
  const response = await fetch(`/api/companies/${companyId}/shifts`);

  if (!response.ok) {
    throw new Error("Erro ao buscar escalas");
  }

  return response.json();
}

export async function fetchAllShifts(
  companyId?: string
): Promise<ShiftsResponse> {
  const url = companyId ? `/api/shifts?company_id=${companyId}` : "/api/shifts";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar escalas");
  }

  return response.json();
}

export async function createShift(
  companyId: string,
  data: CreateShiftData
): Promise<Shift> {
  const response = await fetch(`/api/companies/${companyId}/shifts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao criar escala");
  }

  return response.json();
}

export async function updateShift(
  companyId: string,
  shiftId: string,
  data: UpdateShiftData
): Promise<Shift> {
  const response = await fetch(
    `/api/companies/${companyId}/shifts/${shiftId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao atualizar escala");
  }

  return response.json();
}

export async function deleteShift(
  companyId: string,
  shiftId: string
): Promise<void> {
  const response = await fetch(
    `/api/companies/${companyId}/shifts/${shiftId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao excluir escala");
  }
}
