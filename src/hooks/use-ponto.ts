import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  exportPontoPDF,
  ExportPontoParams,
  savePontoToHistory,
  fetchPontoHistory,
  downloadPontoFromHistory,
  deletePontoFromHistory,
  SavePontoToHistoryParams,
  PontoHistoryResponse,
  FetchPontoHistoryParams,
  PontoExport,
} from "@/services/ponto.service";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

// Hook para exportar PDF de ponto
export const useExportPontoPDF = () => {
  return useMutation<Blob, Error, ExportPontoParams>({
    mutationFn: exportPontoPDF,
    onSuccess: (blob, variables) => {
      // Criar URL para o blob e fazer download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-ponto-${
        variables.employeeName
          ? variables.employeeName.replace(/\s+/g, "-").toLowerCase()
          : "geral"
      }-${variables.startDate}-${variables.endDate}.pdf`;
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

// Hook para salvar relatório de ponto no histórico
export const useSavePontoToHistory = () => {
  const queryClient = useQueryClient();

  return useMutation<PontoExport, Error, SavePontoToHistoryParams>({
    mutationFn: savePontoToHistory,
    onSuccess: () => {
      // Invalidar queries de histórico para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["ponto-history"] });
      toast.success("Relatório salvo no histórico com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao salvar relatório no histórico:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.details ||
        error?.message ||
        "Erro ao salvar relatório no histórico";
      toast.error(errorMessage);
    },
  });
};

// Hook para listar histórico de relatórios de ponto
export const usePontoHistory = (
  params: FetchPontoHistoryParams = {},
  enabled: boolean = true
) => {
  return useQuery<PontoHistoryResponse, Error>({
    queryKey: ["ponto-history", params],
    queryFn: () => fetchPontoHistory(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para download de relatório de ponto do histórico
export const useDownloadPontoFromHistory = () => {
  return useMutation<Blob, Error, string>({
    mutationFn: downloadPontoFromHistory,
    onSuccess: (blob, id) => {
      // Criar URL para o blob e fazer download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-ponto-${id}.pdf`;
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

// Hook para deletar relatório de ponto do histórico
export const useDeletePontoFromHistory = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deletePontoFromHistory,
    onSuccess: () => {
      // Invalidar queries de histórico para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["ponto-history"] });
      toast.success("Relatório deletado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar relatório:", error);
      toast.error("Erro ao deletar relatório");
    },
  });
};
