import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchPunches,
  criarBatidaManual,
  editarBatidaManual,
  apagarBatidaManual,
  type BatidaManualPayload,
} from "@/services/punches.service";

export function usePunches(
  page = 0,
  size = 50,
  startDate?: string,
  endDate?: string,
  employeeId?: number,
  status?: "APPROVED" | "PENDING" | "REPROVED",
  enabled = true
) {
  return useQuery({
    queryKey: ["punches", page, size, startDate, endDate, employeeId, status],
    queryFn: () =>
      fetchPunches(page, size, startDate, endDate, employeeId, status),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function usePunchesInfinite(
  size = 50,
  startDate?: string,
  endDate?: string,
  employeeId?: number,
  status?: "APPROVED" | "PENDING" | "REPROVED",
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: [
      "punches-infinite",
      size,
      startDate,
      endDate,
      employeeId,
      status,
    ],
    queryFn: ({ pageParam = 0 }) =>
      fetchPunches(pageParam, size, startDate, endDate, employeeId, status),
    getNextPageParam: (lastPage) => {
      if (lastPage.last === true) {
        return undefined;
      }

      if (
        lastPage.last === false ||
        (lastPage.content && lastPage.content.length > 0)
      ) {
        const nextPage = (lastPage.number ?? lastPage.page ?? 0) + 1;

        if (
          lastPage.totalPages !== undefined &&
          nextPage >= lastPage.totalPages
        ) {
          return undefined;
        }
        return nextPage;
      }
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function useCriarBatidaManual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: criarBatidaManual,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["punches-infinite"] });
      await queryClient.invalidateQueries({ queryKey: ["punches"] });
    },
  });
}

export function useEditarBatidaManual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      uuid,
      ...payload
    }: { uuid: string } & Omit<BatidaManualPayload, "employeeId">) =>
      editarBatidaManual(uuid, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["punches-infinite"] });
      await queryClient.invalidateQueries({ queryKey: ["punches"] });
    },
  });
}

export function useApagarBatidaManual() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apagarBatidaManual,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["punches-infinite"] });
      await queryClient.invalidateQueries({ queryKey: ["punches"] });
    },
  });
}
