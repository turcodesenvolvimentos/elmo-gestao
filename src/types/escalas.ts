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
  };
  shift?: {
    id: string;
    name: string;
    entry1: string;
    exit1: string;
    entry2?: string | null;
    exit2?: string | null;
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
}

export interface EscalasResponse {
  escalas: Escala[];
  total: number;
}
