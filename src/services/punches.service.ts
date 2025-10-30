export async function fetchPunches(
  page = 0,
  size = 50,
  startDate?: string,
  endDate?: string,
  employeeId?: number,
  status?: "APPROVED" | "PENDING" | "REPROVED"
) {
  const searchParams = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  });

  if (startDate) searchParams.append("startDate", startDate);
  if (endDate) searchParams.append("endDate", endDate);
  if (employeeId) searchParams.append("employeeId", employeeId.toString());
  if (status) searchParams.append("status", status);

  const response = await fetch(`/api/punches?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Erro ao buscar pontos");
  }

  return response.json();
}
