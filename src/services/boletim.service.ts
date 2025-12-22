import axios from "axios";

export interface BoletimData {
  employee_id: string;
  employee_name: string;
  position: string;
  department: string;
  date: string;
  day_of_week: string;
  entry1?: string;
  exit1?: string;
  entry2?: string;
  exit2?: string;
  total_hours: string;
  normal_hours: string;
  night_additional?: string;
  extra_50_day: string;
  extra_50_night: string;
  extra_100_day: string;
  extra_100_night: string;
  value: number;
}

export interface FetchBoletimParams {
  company_id: string;
  start_date: string;
  end_date: string;
}

export interface ExportBoletimParams {
  companyName: string;
  startDate: string;
  endDate: string;
  data: BoletimData[];
}

export const fetchBoletim = async (
  params: FetchBoletimParams
): Promise<BoletimData[]> => {
  const { data } = await axios.get<{ data: BoletimData[] }>("/api/boletim", {
    params,
  });
  return data.data;
};

export const exportBoletimPDF = async (
  params: ExportBoletimParams
): Promise<Blob> => {
  const { data } = await axios.post("/api/boletim/export", params, {
    responseType: "blob",
  });
  return data;
};

// Tipos para histórico de boletins
export interface BoletimExport {
  id: string;
  company_id: string;
  company_name: string;
  start_date: string;
  end_date: string;
  pdf_storage_path: string;
  pdf_url: string;
  file_size_bytes: number;
  total_hours: number;
  total_value: number;
  total_employees: number;
  total_records: number;
  manual_edits: Record<string, any>;
  filters_applied: {
    employee?: string;
    position?: string;
    department?: string;
    date?: string;
  };
  exported_at: string;
  exported_by: string | null;
}

export interface SaveBoletimToHistoryParams {
  companyId: string;
  companyName: string;
  startDate: string;
  endDate: string;
  data: BoletimData[];
  manualEdits?: Record<string, any>;
  filtersApplied?: {
    employee?: string;
    position?: string;
    department?: string;
    date?: string;
  };
}

export interface BoletimHistoryResponse {
  data: BoletimExport[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface FetchBoletimHistoryParams {
  company_id?: string;
  page?: number;
  page_size?: number;
}

// Salvar boletim no histórico
export const saveBoletimToHistory = async (
  params: SaveBoletimToHistoryParams
): Promise<BoletimExport> => {
  const { data } = await axios.post<{ data: BoletimExport }>(
    "/api/boletim/history",
    params
  );
  return data.data;
};

// Listar histórico de boletins
export const fetchBoletimHistory = async (
  params: FetchBoletimHistoryParams = {}
): Promise<BoletimHistoryResponse> => {
  const { data } = await axios.get<BoletimHistoryResponse>(
    "/api/boletim/history",
    {
      params,
    }
  );
  return data;
};

// Download de boletim do histórico
export const downloadBoletimFromHistory = async (
  id: string
): Promise<Blob> => {
  const { data } = await axios.get(`/api/boletim/history/${id}`, {
    responseType: "blob",
  });
  return data;
};

// Deletar boletim do histórico
export const deleteBoletimFromHistory = async (id: string): Promise<void> => {
  await axios.delete(`/api/boletim/history/${id}`);
};
