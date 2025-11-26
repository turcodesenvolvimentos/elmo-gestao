import { Position } from "./positions";

export interface Company {
  id: string;
  name: string;
  address: string;
  vr_per_hour: number;
  cost_help_per_hour: number;
  created_at: string;
  updated_at: string;
  employee_count: number;
  positions?: Position[];
}

export interface CompaniesResponse {
  companies: Company[];
  total: number;
  totalEmployees?: number;
}
