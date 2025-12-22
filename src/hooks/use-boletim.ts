import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchBoletim,
  exportBoletimPDF,
  FetchBoletimParams,
  ExportBoletimParams,
  BoletimData,
  saveBoletimToHistory,
  fetchBoletimHistory,
  downloadBoletimFromHistory,
  deleteBoletimFromHistory,
  SaveBoletimToHistoryParams,
  BoletimHistoryResponse,
  FetchBoletimHistoryParams,
  BoletimExport,
} from "@/services/boletim.service";
import { toast } from "sonner";

export const useBoletim = (params: FetchBoletimParams, enabled: boolean = false) => {
  return useQuery<BoletimData[], Error>({
    queryKey: ["boletim", params],
    queryFn: () => fetchBoletim(params),
    enabled,
    staleTime: 0, // Sempre buscar dados frescos
  });
};

export const useExportBoletimPDF = () => {
  return useMutation<Blob, Error, ExportBoletimParams>({
    mutationFn: exportBoletimPDF,
    onSuccess: (blob, variables) => {
      // Criar URL para o blob e fazer download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `boletim-${variables.companyName
        .replace(/\s+/g, "-")
        .toLowerCase()}-${variables.startDate}-${variables.endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("PDF exportado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    },
  });
};

// Hook para salvar boletim no histórico
export const useSaveBoletimToHistory = () => {
  const queryClient = useQueryClient();

  return useMutation<BoletimExport, Error, SaveBoletimToHistoryParams>({
    mutationFn: saveBoletimToHistory,
    onSuccess: () => {
      // Invalidar queries de histórico para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["boletim-history"] });
      toast.success("Boletim salvo no histórico com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao salvar boletim no histórico:", error);
      toast.error("Erro ao salvar boletim no histórico");
    },
  });
};

// Hook para listar histórico de boletins
export const useBoletimHistory = (
  params: FetchBoletimHistoryParams = {},
  enabled: boolean = true
) => {
  return useQuery<BoletimHistoryResponse, Error>({
    queryKey: ["boletim-history", params],
    queryFn: () => fetchBoletimHistory(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para download de boletim do histórico
export const useDownloadBoletimFromHistory = () => {
  return useMutation<Blob, Error, string>({
    mutationFn: downloadBoletimFromHistory,
    onSuccess: (blob, id) => {
      // Criar URL para o blob e fazer download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `boletim-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("PDF baixado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao baixar PDF:", error);
      toast.error("Erro ao baixar PDF");
    },
  });
};

// Hook para deletar boletim do histórico
export const useDeleteBoletimFromHistory = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteBoletimFromHistory,
    onSuccess: () => {
      // Invalidar queries de histórico para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["boletim-history"] });
      toast.success("Boletim deletado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar boletim:", error);
      toast.error("Erro ao deletar boletim");
    },
  });
};
