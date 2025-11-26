import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  toggleFoodVoucher,
  getFoodVouchers,
  FoodVoucherData,
} from "@/services/food-vouchers.service";
import { FoodVoucher } from "@/services/food-vouchers.service";

export function useFoodVouchers(params?: {
  employee_id?: number;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["food-vouchers", params],
    queryFn: () => getFoodVouchers(params),
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

export function useToggleFoodVoucher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FoodVoucherData) => toggleFoodVoucher(data),
    onSuccess: () => {
      // Invalidar todas as queries de food-vouchers para recarregar os dados
      queryClient.invalidateQueries({
        queryKey: ["food-vouchers"],
        refetchType: "active", // Recarregar apenas queries ativas
      });
    },
  });
}
