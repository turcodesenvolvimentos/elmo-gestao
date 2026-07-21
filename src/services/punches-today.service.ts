export interface PunchesTodayResponse {
  date: string;
  employeeIds: number[];
}

export async function fetchPunchesToday(
  date: string
): Promise<PunchesTodayResponse> {
  const response = await fetch(
    `/api/punches/today?date=${encodeURIComponent(date)}`
  );

  if (!response.ok) {
    throw new Error("Erro ao buscar as batidas do dia");
  }

  return response.json();
}
