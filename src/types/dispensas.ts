export interface Dispensa {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string; // formato "YYYY-MM-DD"
  created_at?: string;
}

export interface CreateDispensaData {
  employee_id: string;
  employee_name: string;
  date: string;
}

export interface DispensasResponse {
  dispensas: Dispensa[];
}
