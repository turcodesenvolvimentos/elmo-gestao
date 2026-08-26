interface Employee {
  /** Matrícula. Vem da Sólides ou é gerada pelo sistema (a partir de 900.000.000). */
  id: number;
  name: string;
  cpf?: string;
  admissionDate?: string;
  fired: boolean;
  origem?: "SOLIDES" | "MANUAL";

  externalId?: string | null;
  socialName?: string | null;
  email?: string | null;
  phone?: string | null;
  pis?: string | null;
  resignationDate?: string | null;
  status?: number | null;
  gender?: string | null;

  companies?: {
    id: string;
    name: string;
    address: string;
    position_id?: string;
    position?: {
      id: string;
      name: string;
      hour_value: number;
    };
    department?: string;
  }[];
}

interface TangerinoEmployeesResponse {
  content: Employee[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

interface FindAllEmployeesParams {
  page?: number;
  size?: number;
  showFired?: number;
  /** Incluir funcionários inativos/demitidos na lista. */
  includeFired?: boolean;
  lastUpdate?: number;
  managerExternalId?: string;
  branchExternalId?: string;
}

interface CreateEmployeeData {
  name: string;
  cpf: string;
  admission_date?: string | null;
}

interface UpdateEmployeeData {
  name?: string;
  cpf?: string;
  admission_date?: string | null;
  ativo?: boolean;
}

export type {
  Employee,
  TangerinoEmployeesResponse,
  FindAllEmployeesParams,
  CreateEmployeeData,
  UpdateEmployeeData,
};
