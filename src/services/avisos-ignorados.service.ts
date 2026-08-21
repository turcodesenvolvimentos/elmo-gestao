import {
  AvisoIgnorado,
  CreateAvisoIgnoradoData,
  AvisosIgnoradosResponse,
} from "@/types/avisos-ignorados";

export async function fetchAvisosIgnorados(): Promise<AvisosIgnoradosResponse> {
  const response = await fetch("/api/avisos-ignorados");

  if (!response.ok) {
    throw new Error("Erro ao buscar avisos ignorados");
  }

  return response.json();
}

export async function createAvisoIgnorado(
  data: CreateAvisoIgnoradoData
): Promise<AvisoIgnorado> {
  const response = await fetch("/api/avisos-ignorados", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao ignorar aviso");
  }

  return response.json();
}

export async function deleteAvisoIgnorado(id: string): Promise<void> {
  const response = await fetch(`/api/avisos-ignorados/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao restaurar aviso");
  }
}
