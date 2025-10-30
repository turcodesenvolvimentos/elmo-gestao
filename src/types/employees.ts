interface Employee {
  id: number;
  externalId: string;
  name: string;
  socialName: string;
  cpf: string;
  email: string;
  phone: string;
  pis: string;
  admissionDate: string;
  resignationDate: string;
  fired: boolean;
  status: number;
  gender: "FEMININO" | "MASCULINO";

  company: {
    id: number;
    fantasyName: string;
    descriptionName: string;
    externalId: string;
    accountStatus: "PAGANTE" | "TRIAL";
  };

  jobRoleDTO?: {
    id: number;
    description: string;
    cbo: string;
  };

  currentWorkplaceDTO?: {
    id: number;
    name: string;
    externalId: string;
  };

  currentWorkSchedule?: {
    id: number;
    name: string;
    externalId: string | number;
  };
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
  lastUpdate?: number;
  managerExternalId?: string;
  branchExternalId?: string;
}

export type { Employee, TangerinoEmployeesResponse, FindAllEmployeesParams };
