"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useLastSyncDate } from "@/hooks/use-sync";

/**
 * O agendamento roda uma vez por dia (limite do plano Hobby da Vercel), entao
 * so vira alerta quando passa de um ciclo inteiro sem sincronizar. Durante o
 * dia o dado envelhece por padrao e quem precisa de algo recente usa o botao
 * de sincronizar.
 */
const HORAS_PARA_ALERTA = 26;

function descreveIdade(horas: number): string {
  if (horas < 1) {
    const minutos = Math.max(1, Math.floor(horas * 60));
    return `há ${minutos} min`;
  }
  if (horas < 24) {
    const arredondado = Math.floor(horas);
    return arredondado === 1 ? "há 1 hora" : `há ${arredondado} horas`;
  }
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

export function UltimaSincronizacao({ className }: { className?: string }) {
  const { data } = useLastSyncDate();

  if (!data?.lastSyncAt) return null;

  const quando = new Date(data.lastSyncAt);
  if (Number.isNaN(quando.getTime())) return null;

  const horasAtras = (Date.now() - quando.getTime()) / (1000 * 60 * 60);
  const idade = descreveIdade(horasAtras);
  const formatado = quando.toLocaleString("pt-BR");

  if (horasAtras < HORAS_PARA_ALERTA) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground ${className ?? ""}`}
        title={`Última sincronização: ${formatado}`}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Sincronizado {idade}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-yellow-300 bg-yellow-50 px-2 py-1 text-sm font-medium text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200 ${className ?? ""}`}
      title={`Última sincronização: ${formatado}. O agendamento diário pode ter falhado — use o botão Sincronizar.`}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      Sem sincronizar {idade}
    </span>
  );
}
