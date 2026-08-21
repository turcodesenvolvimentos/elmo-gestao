import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  fetchAvisosIgnorados,
  createAvisoIgnorado,
  deleteAvisoIgnorado,
} from "@/services/avisos-ignorados.service";
import {
  AvisoIgnorado,
  CreateAvisoIgnoradoData,
  AvisosIgnoradosResponse,
} from "@/types/avisos-ignorados";

export function useAvisosIgnorados(): UseQueryResult<
  AvisosIgnoradosResponse,
  Error
> {
  return useQuery({
    queryKey: ["avisos-ignorados"],
    queryFn: fetchAvisosIgnorados,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAvisoIgnorado(): UseMutationResult<
  AvisoIgnorado,
  Error,
  CreateAvisoIgnoradoData
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAvisoIgnorado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avisos-ignorados"] });
    },
  });
}

export function useDeleteAvisoIgnorado(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAvisoIgnorado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avisos-ignorados"] });
    },
  });
}
