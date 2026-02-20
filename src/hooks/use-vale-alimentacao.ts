import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  exportValeAlimentacaoPDF,
  ExportValeAlimentacaoParams,
  saveValeAlimentacaoToHistory,
  fetchValeAlimentacaoHistory,
  downloadValeAlimentacaoFromHistory,
  deleteValeAlimentacaoFromHistory,
  SaveValeAlimentacaoToHistoryParams,
  ValeAlimentacaoHistoryResponse,
  FetchValeAlimentacaoHistoryParams,
  ValeAlimentacaoExport,
} from "@/services/vale-alimentacao.service";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

// Hook para exportar PDF de vale alimentação
export const useExportValeAlimentacaoPDF = () => {
  return useMutation<Blob, Error, ExportValeAlimentacaoParams>({
    mutationFn: exportValeAlimentacaoPDF,
    onSuccess: (blob, variables) => {
      // Criar URL para o blob e fazer download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-vale-alimentacao-${
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

// Hook para salvar relatório de vale alimentação no histórico
export const useSaveValeAlimentacaoToHistory = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ValeAlimentacaoExport,
    Error,
    SaveValeAlimentacaoToHistoryParams
  >({
    mutationFn: saveValeAlimentacaoToHistory,
    onSuccess: () => {
      // Invalidar queries de histórico para atualizar a lista
      queryClient.invalidateQueries({
        queryKey: ["vale-alimentacao-history"],
      });
      toast.success("Relatório salvo no histórico com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao salvar relatório no histórico:", error);
      toast.error("Erro ao salvar relatório no histórico");
    },
  });
};

// Hook para listar histórico de relatórios de vale alimentação
export const useValeAlimentacaoHistory = (
  params: FetchValeAlimentacaoHistoryParams = {},
  enabled: boolean = true
) => {
  return useQuery<ValeAlimentacaoHistoryResponse, Error>({
    queryKey: ["vale-alimentacao-history", params],
    queryFn: () => fetchValeAlimentacaoHistory(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para download de relatório de vale alimentação do histórico
export const useDownloadValeAlimentacaoFromHistory = () => {
  return useMutation<Blob, Error, string>({
    mutationFn: downloadValeAlimentacaoFromHistory,
    onSuccess: (blob, id) => {
      // Criar URL para o blob e fazer download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-vale-alimentacao-${id}.pdf`;
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

// Hook para deletar relatório de vale alimentação do histórico
export const useDeleteValeAlimentacaoFromHistory = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteValeAlimentacaoFromHistory,
    onSuccess: () => {
      // Invalidar queries de histórico para atualizar a lista
      queryClient.invalidateQueries({
        queryKey: ["vale-alimentacao-history"],
      });
      toast.success("Relatório deletado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar relatório:", error);
      toast.error("Erro ao deletar relatório");
    },
  });
};
