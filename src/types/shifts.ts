export interface Shift {
  id: string;
  name: string;
  company_id: string;
  entry1: string; // formato TIME do PostgreSQL: "HH:MM:SS"
  exit1: string;
  entry2?: string | null;
  exit2?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateShiftData {
  name: string;
  company_id: string;
  entry1: string; // formato "HH:MM" do input type="time"
  exit1: string;
  entry2?: string | null;
  exit2?: string | null;
}

export interface UpdateShiftData {
  name?: string;
  entry1?: string;
  exit1?: string;
  entry2?: string | null;
  exit2?: string | null;
}

export interface ShiftsResponse {
  shifts: Shift[];
  total: number;
}
