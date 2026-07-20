import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchDispensas,
  createDispensa,
  deleteDispensa,
} from "@/services/dispensas.service";
import {
  Dispensa,
  CreateDispensaData,
  DispensasResponse,
} from "@/types/dispensas";

export function useDispensas(): UseQueryResult<DispensasResponse, Error> {
  return useQuery({
    queryKey: ["dispensas"],
    queryFn: fetchDispensas,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDispensa(): UseMutationResult<
  Dispensa,
  Error,
  CreateDispensaData
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDispensa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispensas"] });
    },
  });
}

export function useDeleteDispensa(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDispensa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispensas"] });
    },
  });
}
