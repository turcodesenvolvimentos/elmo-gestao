import {
  EscalasResponse,
  Escala,
  BatchCreateEscalaData,
  EscalaConflito,
} from "@/types/escalas";

export class EscalaConflitoError extends Error {
  conflitos: EscalaConflito[];

  constructor(message: string, conflitos: EscalaConflito[]) {
    super(message);
    this.name = "EscalaConflitoError";
    this.conflitos = conflitos;
  }
}

export async function fetchEscalas(params?: {
  employee_id?: string;
  shift_id?: string;
  company_id?: string;
}): Promise<EscalasResponse> {
  const searchParams = new URLSearchParams();

  if (params?.employee_id) {
    searchParams.append("employee_id", params.employee_id);
  }
  if (params?.shift_id) {
    searchParams.append("shift_id", params.shift_id);
  }
  if (params?.company_id) {
    searchParams.append("company_id", params.company_id);
  }

  const queryString = searchParams.toString();
  const url = `/api/escalas${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar escalas");
  }

  return response.json();
}

export async function fetchEscala(id: string): Promise<Escala> {
  const response = await fetch(`/api/escalas/${id}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao buscar escala");
  }

  return response.json();
}

export async function batchCreateEscalas(
  data: BatchCreateEscalaData
): Promise<{
  success: boolean;
  created: number;
  skipped?: number;
  escalas: Escala[];
}> {
  const response = await fetch("/api/escalas/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 409 && Array.isArray(errorData.conflitos)) {
      throw new EscalaConflitoError(
        errorData.error || "Funcionário já escalado no período",
        errorData.conflitos
      );
    }

    throw new Error(errorData.error || "Erro ao aplicar escalas");
  }

  return response.json();
}

export async function deleteEscala(id: string): Promise<void> {
  const response = await fetch(`/api/escalas/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao excluir escala");
  }
}
