import {
  Dispensa,
  CreateDispensaData,
  DispensasResponse,
} from "@/types/dispensas";

export async function fetchDispensas(): Promise<DispensasResponse> {
  const response = await fetch("/api/dispensas");

  if (!response.ok) {
    throw new Error("Erro ao buscar dispensas");
  }

  return response.json();
}

export async function createDispensa(
  data: CreateDispensaData
): Promise<Dispensa> {
  const response = await fetch("/api/dispensas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao adicionar dispensa");
  }

  return response.json();
}

export async function deleteDispensa(id: string): Promise<void> {
  const response = await fetch(`/api/dispensas/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao remover dispensa");
  }
}
