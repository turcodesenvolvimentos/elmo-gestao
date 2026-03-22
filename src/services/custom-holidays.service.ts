import {
  CustomHoliday,
  CustomHolidaysResponse,
} from "@/types/custom-holidays";

export async function fetchCustomHolidays(): Promise<CustomHolidaysResponse> {
  const response = await fetch("/api/custom-holidays");

  if (!response.ok) {
    throw new Error("Erro ao buscar feriados");
  }

  return response.json();
}

export interface CreateCustomHolidayData {
  holiday_date: string;
  name: string;
}

export interface UpdateCustomHolidayData {
  holiday_date?: string;
  name?: string;
}

export async function createCustomHoliday(
  data: CreateCustomHolidayData
): Promise<CustomHoliday> {
  const response = await fetch("/api/custom-holidays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao criar feriado");
  }

  return response.json();
}

export async function updateCustomHoliday(
  id: string,
  data: UpdateCustomHolidayData
): Promise<CustomHoliday> {
  const response = await fetch(`/api/custom-holidays/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao atualizar feriado");
  }

  return response.json();
}

export async function deleteCustomHoliday(id: string): Promise<void> {
  const response = await fetch(`/api/custom-holidays/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Erro ao excluir feriado");
  }
}
