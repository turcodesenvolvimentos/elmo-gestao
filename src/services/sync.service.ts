export interface SyncStats {
  processed: number;
  saved: number;
  errors: number;
  failedEmployees?: Array<{ id: number; name: string; error: string }>;
  duration: number;
  startDate: string;
  endDate: string;
}

export interface SyncResponse {
  success: boolean;
  message?: string;
  error?: string;
  stats?: SyncStats;
}

export interface LastSyncResponse {
  lastSyncAt: string;
  lastSyncDate: string;
}

export async function syncPunches(): Promise<SyncResponse> {
  const response = await fetch("/api/sync/punches", {
    method: "POST",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData?.error || `Erro ao sincronizar pontos (${response.status})`;
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getLastSyncDate(): Promise<LastSyncResponse> {
  const response = await fetch("/api/sync/punches");

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData?.error || `Erro ao buscar última sincronização (${response.status})`;
    throw new Error(errorMessage);
  }

  return response.json();
}
