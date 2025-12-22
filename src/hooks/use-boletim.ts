import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchBoletim,
  exportBoletimPDF,
  FetchBoletimParams,
  ExportBoletimParams,
  BoletimData,
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
