export interface Department {
  id: string;
  name: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentData {
  name: string;
  company_id: string;
}

export interface UpdateDepartmentData {
  name?: string;
}

export interface DepartmentsResponse {
  departments: Department[];
  total: number;
}
