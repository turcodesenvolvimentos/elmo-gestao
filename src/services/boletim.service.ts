import axios from "axios";

export interface BoletimData {
  employee_id: string;
  employee_name: string;
  position: string;
  department: string;
  date: string;
  day_of_week: string;
  entry1?: string;
  exit1?: string;
  entry2?: string;
  exit2?: string;
  total_hours: string;
  normal_hours: string;
  extra_50_day: string;
  extra_50_night: string;
  extra_100_day: string;
  extra_100_night: string;
  value: number;
}

export interface FetchBoletimParams {
  company_id: string;
  start_date: string;
  end_date: string;
}

export interface ExportBoletimParams {
  companyName: string;
  startDate: string;
  endDate: string;
  data: BoletimData[];
}

export const fetchBoletim = async (
  params: FetchBoletimParams
): Promise<BoletimData[]> => {
  const { data } = await axios.get<{ data: BoletimData[] }>("/api/boletim", {
    params,
  });
  return data.data;
};

export const exportBoletimPDF = async (
  params: ExportBoletimParams
): Promise<Blob> => {
  const { data } = await axios.post("/api/boletim/export", params, {
    responseType: "blob",
  });
  return data;
};
