export interface Escala {
  id: string;
  employee_id: string;
  shift_id: string;
  start_date: string; // formato DATE: "YYYY-MM-DD"
  end_date?: string | null;
  created_at: string;
  updated_at: string;

  // Dados relacionados (opcional, quando incluído via JOIN)
  employee?: {
    id: string;
    name: string;
    solides_id: number;
    position_name?: string | null;
    department_name?: string | null;
  };
  shift?: {
    id: string;
    name: string;
    entry1: string;
    exit1: string;
    entry2?: string | null;
    exit2?: string | null;
    company_id?: string;
  };
}

export interface CreateEscalaData {
  employee_id: string;
  shift_id: string;
  start_date: string; // formato "YYYY-MM-DD"
  end_date?: string; // formato "YYYY-MM-DD" (opcional)
}

export interface BatchCreateEscalaData {
  employee_ids: string[];
  shift_id: string;
  start_date: string;
  end_date?: string; // formato "YYYY-MM-DD" (opcional)
  force?: boolean;
}

export interface EscalaConflito {
  employee_id: string;
  employee_name: string;
  company_id: string | null;
  company_name: string | null;
  shift_id: string;
  shift_name: string | null;
  start_date: string;
  end_date: string | null;
}

export interface EscalasResponse {
  escalas: Escala[];
  total: number;
}
