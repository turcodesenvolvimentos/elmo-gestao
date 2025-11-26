export interface FoodVoucherData {
  employee_id: number;
  work_date: string; // YYYY-MM-DD
  vale_alimentacao: boolean;
  ajuda_custo: boolean;
  company_id?: string;
}

export interface FoodVoucher extends FoodVoucherData {
  id: string;
  created_at: string;
  updated_at: string;
}

export async function toggleFoodVoucher(
  data: FoodVoucherData
): Promise<FoodVoucher> {
  const response = await fetch("/api/food-vouchers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao salvar configuração");
  }

  return response.json();
}

export async function getFoodVouchers(params?: {
  employee_id?: number;
  start_date?: string;
  end_date?: string;
}): Promise<FoodVoucher[]> {
  const searchParams = new URLSearchParams();

  if (params?.employee_id) {
    searchParams.append("employee_id", params.employee_id.toString());
  }
  if (params?.start_date) {
    searchParams.append("start_date", params.start_date);
  }
  if (params?.end_date) {
    searchParams.append("end_date", params.end_date);
  }

  const queryString = searchParams.toString();
  const url = `/api/food-vouchers${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao buscar configurações");
  }

  return response.json();
}
