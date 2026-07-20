import {
  ShiftVacanciesResponse,
  ShiftVacancyInput,
} from "@/types/shift-vacancies";

export async function fetchShiftVacancies(
  shiftId: string
): Promise<ShiftVacanciesResponse> {
  const response = await fetch(`/api/shifts/${shiftId}/vacancies`);

  if (!response.ok) {
    throw new Error("Erro ao buscar vagas da escala");
  }

  return response.json();
}

export async function saveShiftVacancies(
  shiftId: string,
  items: ShiftVacancyInput[]
): Promise<void> {
  const response = await fetch(`/api/shifts/${shiftId}/vacancies`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao salvar vagas da escala");
  }
}
