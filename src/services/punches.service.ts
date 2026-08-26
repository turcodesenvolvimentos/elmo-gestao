export async function fetchPunches(
  page = 0,
  size = 1000,
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
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData?.error || `Erro ao buscar pontos (${response.status})`;
    throw new Error(errorMessage);
  }

  return response.json();
}

export interface BatidaManualPayload {
  employeeId: number;
  date: string;
  entrada: string;
  saida?: string | null;
}

export async function criarBatidaManual(payload: BatidaManualPayload) {
  const response = await fetch("/api/punches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "Erro ao lançar batida");
  }

  return response.json();
}

export async function editarBatidaManual(
  uuid: string,
  payload: Omit<BatidaManualPayload, "employeeId">
) {
  const response = await fetch(`/api/punches/${uuid}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "Erro ao editar batida");
  }

  return response.json();
}

export async function apagarBatidaManual(uuid: string) {
  const response = await fetch(`/api/punches/${uuid}`, { method: "DELETE" });

  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.error || "Erro ao apagar batida");
  }

  return response.json();
}
