import axios from "axios";

// Interface para dados de ponto no relatório
export interface PontoData {
  employeeName: string;
  company: string;
  date: string;
  dayOfWeek: string;
  entry1: string;
  exit1: string;
  entry2?: string;
  exit2?: string;
  horasDiurnas: string;
  horasNoturnas: string;
  horasFictas: string;
  totalHoras: string;
  horasNormais: string;
  adicionalNoturno: string;
  extra50Diurno: string;
  extra50Noturno: string;
  extra100Diurno: string;
  extra100Noturno: string;
  employeeCpf?: string;
  employeeAdmissionDate?: string;
}

export interface ExportPontoParams {
  employeeName?: string;
  startDate: string;
  endDate: string;
  data: PontoData[];
  employeeCpf?: string;
  employeeAdmissionDate?: string;
  filtersApplied?: {
    employeeId?: number;
    company?: string;
    status?: string;
  };
}

// Tipos para histórico de relatórios de ponto
export interface PontoExport {
  id: string;
  employee_id: number | null;
  employee_name: string | null;
  start_date: string;
  end_date: string;
  pdf_storage_path: string;
  pdf_url: string;
  file_size_bytes: number;
  total_hours: number;
  total_normal_hours: number;
  total_night_additional: number;
  total_extra_50: number;
  total_extra_100: number;
  total_records: number;
  filters_applied: Record<string, any>;
  exported_at: string;
  exported_by: string | null;
}

export interface SavePontoToHistoryParams {
  employeeId?: number;
  employeeName?: string;
  startDate: string;
  endDate: string;
  data: PontoData[];
  employeeCpf?: string;
  employeeAdmissionDate?: string;
  filtersApplied?: {
    employeeId?: number;
    company?: string;
    status?: string;
  };
}

export interface PontoHistoryResponse {
  data: PontoExport[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface FetchPontoHistoryParams {
  employee_id?: number;
  page?: number;
  page_size?: number;
}

// Exportar PDF de ponto
export const exportPontoPDF = async (
  params: ExportPontoParams
): Promise<Blob> => {
  const { data } = await axios.post("/api/ponto/export", params, {
    responseType: "blob",
  });
  return data;
};

// Salvar relatório de ponto no histórico
export const savePontoToHistory = async (
  params: SavePontoToHistoryParams
): Promise<PontoExport> => {
  const { data } = await axios.post<{ data: PontoExport }>(
    "/api/ponto/history",
    params
  );
  return data.data;
};

// Listar histórico de relatórios de ponto
export const fetchPontoHistory = async (
  params: FetchPontoHistoryParams = {}
): Promise<PontoHistoryResponse> => {
  const { data } = await axios.get<PontoHistoryResponse>(
    "/api/ponto/history",
    {
      params,
    }
  );
  return data;
};

// Download de relatório de ponto do histórico
export const downloadPontoFromHistory = async (
  id: string
): Promise<Blob> => {
  const { data } = await axios.get(`/api/ponto/history/${id}`, {
    responseType: "blob",
  });
  return data;
};

// Deletar relatório de ponto do histórico
export const deletePontoFromHistory = async (id: string): Promise<void> => {
  await axios.delete(`/api/ponto/history/${id}`);
};
