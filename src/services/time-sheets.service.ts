export async function fetchTimeSheet(
  startDate: string,
  endDate: string,
  employeeId?: number,
  companyId?: number,
  format: "PDF" | "XLS" | "JPG" = "PDF"
) {
  const searchParams = new URLSearchParams({
    startDate,
    endDate,
    format,
  });

  if (employeeId) searchParams.append("employeeId", employeeId.toString());
  if (companyId) searchParams.append("companyId", companyId.toString());

  const response = await fetch(`/api/time-sheets?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Erro ao gerar relatório");
  }

  return response.json();
}
