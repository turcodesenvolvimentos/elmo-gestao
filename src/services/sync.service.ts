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

export interface SyncProgress {
  percent: number;
  processed: number;
  total: number;
}

export interface LastSyncResponse {
  lastSyncAt: string;
  lastSyncDate: string;
}

/** Sincroniza pontos consumindo o stream SSE e reporta progresso via onProgress. */
export async function syncPunches(
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResponse> {
  const response = await fetch("/api/sync/punches", {
    method: "POST",
  });

  if (!response.ok || !response.body) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData?.error || `Erro ao sincronizar pontos (${response.status})`;
    throw new Error(errorMessage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  function processChunk(chunk: string): SyncResponse | null {
    const match = chunk.match(/^data:\s*(.+)/m);
    if (!match) return null;
    try {
      const data = JSON.parse(match[1].trim());
      if (data.type === "progress" && onProgress) {
        onProgress({
          percent: data.percent ?? 0,
          processed: data.processed ?? 0,
          total: data.total ?? 0,
        });
      }
      if (data.type === "done") {
        return {
          success: data.success ?? true,
          stats: data.stats,
          error: data.error,
        };
      }
      if (data.type === "error") {
        throw new Error(data.error || "Erro na sincronização");
      }
    } catch (e) {
      if (e instanceof SyntaxError) return null;
      throw e;
    }
    return null;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const result = processChunk(part);
      if (result) return result;
    }
  }

  const last = processChunk(buffer);
  if (last) return last;
  throw new Error("Sincronização encerrada sem resposta");
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
