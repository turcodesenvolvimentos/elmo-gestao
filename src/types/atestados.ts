export interface Atestado {
  id: string;
  employee_id: string;
  employee_name: string;
  start_date: string; // formato "YYYY-MM-DD"
  days: number;
  created_at?: string;
}

export interface CreateAtestadoData {
  employee_id: string;
  employee_name: string;
  start_date: string;
  days: number;
}

export interface AtestadosResponse {
  atestados: Atestado[];
}
