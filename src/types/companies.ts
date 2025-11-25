export interface Company {
  id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
  employee_count: number;
}

export interface CompaniesResponse {
  companies: Company[];
  total: number;
  totalEmployees?: number;
}
