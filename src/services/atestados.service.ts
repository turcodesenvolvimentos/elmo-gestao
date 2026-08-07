import {
  Atestado,
  CreateAtestadoData,
  AtestadosResponse,
} from "@/types/atestados";

export async function fetchAtestados(): Promise<AtestadosResponse> {
  const response = await fetch("/api/atestados");

  if (!response.ok) {
    throw new Error("Erro ao buscar atestados");
  }

  return response.json();
}

export async function createAtestado(
  data: CreateAtestadoData
): Promise<Atestado> {
  const response = await fetch("/api/atestados", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao adicionar atestado");
  }

  return response.json();
}

export async function deleteAtestado(id: string): Promise<void> {
  const response = await fetch(`/api/atestados/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao remover atestado");
  }
}
