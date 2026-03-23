import type { EscalaCompanyEntry } from "@/lib/punch-company-resolution";
import axios from "axios";

export async function fetchPontoEscalaCompanies(params: {
  start_date: string;
  end_date: string;
  employee_solides_id?: number;
}): Promise<EscalaCompanyEntry[]> {
  const searchParams = new URLSearchParams({
    start_date: params.start_date,
    end_date: params.end_date,
  });
  if (params.employee_solides_id != null) {
    searchParams.append(
      "employee_solides_id",
      String(params.employee_solides_id)
    );
  }

  const { data } = await axios.get<{ entries: EscalaCompanyEntry[] }>(
    `/api/ponto/escala-companies?${searchParams.toString()}`
  );
  return data.entries ?? [];
}
