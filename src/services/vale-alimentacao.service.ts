import axios from "axios";

// Interface para dados de vale alimentação no relatório
export interface ValeAlimentacaoData {
  employeeName: string;
  date: string;
  company: string;
  entry1: string;
  exit1: string;
  entry2?: string;
  exit2?: string;
  totalHours: string;
  valeAlimentacao: boolean;
  ajudaCusto: boolean;
  vrValue: number;
  costHelpValue: number;
  employeeCpf?: string;
  employeeAdmissionDate?: string;
}

export interface EmployeeSummary {
  employeeName: string;
  totalVr: number;
  totalCostHelp: number;
  employeeCpf?: string;
  employeeAdmissionDate?: string;
}

export interface ExportValeAlimentacaoParams {
  employeeName?: string;
  startDate: string;
  endDate: string;
  data: ValeAlimentacaoData[] | EmployeeSummary[];
  reportType?: "summary" | "detailed";
  employeeCpf?: string;
  employeeAdmissionDate?: string;
  filtersApplied?: {
    employeeId?: number;
  };
}

// Tipos para histórico de relatórios de vale alimentação
export interface ValeAlimentacaoExport {
  id: string;
  employee_id: number | null;
  employee_name: string | null;
  start_date: string;
  end_date: string;
  pdf_storage_path: string;
  pdf_url: string;
  file_size_bytes: number;
  total_vr: number;
  total_cost_help: number;
  total_employees: number;
  total_records: number;
  filters_applied: Record<string, any>;
  exported_at: string;
  exported_by: string | null;
}

export interface SaveValeAlimentacaoToHistoryParams {
  employeeId?: number;
  employeeName?: string;
  startDate: string;
  endDate: string;
  data: ValeAlimentacaoData[] | EmployeeSummary[];
  reportType?: "summary" | "detailed";
  employeeCpf?: string;
  employeeAdmissionDate?: string;
  filtersApplied?: {
    employeeId?: number;
  };
}

export interface ValeAlimentacaoHistoryResponse {
  data: ValeAlimentacaoExport[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface FetchValeAlimentacaoHistoryParams {
  employee_id?: number;
  page?: number;
  page_size?: number;
}

// Exportar PDF de vale alimentação
export const exportValeAlimentacaoPDF = async (
  params: ExportValeAlimentacaoParams
): Promise<Blob> => {
  const { data } = await axios.post("/api/vale-alimentacao/export", params, {
    responseType: "blob",
  });
  return data;
};

// Salvar relatório de vale alimentação no histórico
export const saveValeAlimentacaoToHistory = async (
  params: SaveValeAlimentacaoToHistoryParams
): Promise<ValeAlimentacaoExport> => {
  const { data } = await axios.post<{ data: ValeAlimentacaoExport }>(
    "/api/vale-alimentacao/history",
    params
  );
  return data.data;
};

// Listar histórico de relatórios de vale alimentação
export const fetchValeAlimentacaoHistory = async (
  params: FetchValeAlimentacaoHistoryParams = {}
): Promise<ValeAlimentacaoHistoryResponse> => {
  const { data } = await axios.get<ValeAlimentacaoHistoryResponse>(
    "/api/vale-alimentacao/history",
    {
      params,
    }
  );
  return data;
};

// Download de relatório de vale alimentação do histórico
export const downloadValeAlimentacaoFromHistory = async (
  id: string
): Promise<Blob> => {
  const { data } = await axios.get(`/api/vale-alimentacao/history/${id}`, {
    responseType: "blob",
  });
  return data;
};

// Deletar relatório de vale alimentação do histórico
export const deleteValeAlimentacaoFromHistory = async (
  id: string
): Promise<void> => {
  await axios.delete(`/api/vale-alimentacao/history/${id}`);
};
