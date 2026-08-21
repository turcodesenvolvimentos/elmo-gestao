export interface AvisoIgnorado {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string; // formato "YYYY-MM-DD"
  created_at?: string;
}

export interface CreateAvisoIgnoradoData {
  employee_id: string;
  employee_name: string;
  date: string;
}

export interface AvisosIgnoradosResponse {
  avisos: AvisoIgnorado[];
}
