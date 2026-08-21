export type PunchWarningTipo =
  | "PERIODO_ABERTO"
  | "DUPLICADA"
  | "ALMOCO_CURTO"
  | "INTERVALO_LONGO"
  | "PERIODO_LONGO"
  | "JORNADA_SEM_INTERVALO"
  | "SOBREPOSICAO";

export type PunchWarningSeveridade = "erro" | "alerta";

export interface PunchWarning {
  tipo: PunchWarningTipo;
  severidade: PunchWarningSeveridade;
  mensagem: string;
}

export interface PunchForValidation {
  dateIn?: string;
  dateOut?: string;
  adjust?: boolean;
}

export interface ValidatePunchesOptions {
  duplicataMinutos?: number;
  almocoMinimoMinutos?: number;
  intervaloMaximoMinutos?: number;
  jornadaMaximaSemIntervaloMinutos?: number;
}

const DEFAULT_DUPLICATA_MINUTOS = 10;
const DEFAULT_ALMOCO_MINIMO_MINUTOS = 50;
const DEFAULT_INTERVALO_MAXIMO_MINUTOS = 120;
const DEFAULT_JORNADA_MAXIMA_SEM_INTERVALO_MINUTOS = 360;
const MS_POR_MINUTO = 60 * 1000;

function parseTime(value?: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function diffMinutos(aMs: number, bMs: number): number {
  return Math.abs(aMs - bMs) / MS_POR_MINUTO;
}

function formatarDuracao(minutos: number): string {
  const total = Math.round(minutos);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}min`;
}

export function validateDayPunches(
  punches: PunchForValidation[],
  options: ValidatePunchesOptions = {},
): PunchWarning[] {
  const duplicataMinutos = options.duplicataMinutos ?? DEFAULT_DUPLICATA_MINUTOS;
  const almocoMinimoMinutos =
    options.almocoMinimoMinutos ?? DEFAULT_ALMOCO_MINIMO_MINUTOS;
  const intervaloMaximoMinutos =
    options.intervaloMaximoMinutos ?? DEFAULT_INTERVALO_MAXIMO_MINUTOS;
  const jornadaMaximaSemIntervaloMinutos =
    options.jornadaMaximaSemIntervaloMinutos ??
    DEFAULT_JORNADA_MAXIMA_SEM_INTERVALO_MINUTOS;

  const warnings: PunchWarning[] = [];
  const tiposEmitidos = new Set<PunchWarningTipo>();

  const push = (warning: PunchWarning) => {
    if (tiposEmitidos.has(warning.tipo)) return;
    tiposEmitidos.add(warning.tipo);
    warnings.push(warning);
  };

  for (const punch of punches) {
    if (punch.adjust) continue;
    const hasIn = Boolean(punch.dateIn);
    const hasOut = Boolean(punch.dateOut);
    if (hasIn !== hasOut) {
      push({
        tipo: "PERIODO_ABERTO",
        severidade: "erro",
        mensagem: hasIn
          ? "Batida sem saída (falta bater a saída)"
          : "Batida sem entrada (falta bater a entrada)",
      });
    }
  }

  const entradas = punches
    .map((p) => parseTime(p.dateIn))
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);

  for (let i = 1; i < entradas.length; i++) {
    if (diffMinutos(entradas[i], entradas[i - 1]) < duplicataMinutos) {
      push({
        tipo: "DUPLICADA",
        severidade: "alerta",
        mensagem: `Batidas de entrada com menos de ${duplicataMinutos} min entre si (possível duplicata)`,
      });
      break;
    }
  }

  const periodos = punches
    .map((p) => {
      const inicio = parseTime(p.dateIn);
      const fim = parseTime(p.dateOut);
      if (inicio === null || fim === null) return null;
      return { inicio, fim };
    })
    .filter((p): p is { inicio: number; fim: number } => p !== null)
    .sort((a, b) => a.inicio - b.inicio);

  let maiorPeriodoMinutos = 0;
  let jornadaMinutos = 0;
  for (const periodo of periodos) {
    const duracao = (periodo.fim - periodo.inicio) / MS_POR_MINUTO;
    if (duracao <= 0) continue;
    jornadaMinutos += duracao;
    maiorPeriodoMinutos = Math.max(maiorPeriodoMinutos, duracao);
  }

  let maiorIntervaloMinutos = 0;

  for (let i = 1; i < periodos.length; i++) {
    const anterior = periodos[i - 1];
    const atual = periodos[i];
    const gapMinutos = (atual.inicio - anterior.fim) / MS_POR_MINUTO;

    if (gapMinutos < 0) {
      push({
        tipo: "SOBREPOSICAO",
        severidade: "erro",
        mensagem: "Sobreposição de horários (períodos se cruzam)",
      });
      continue;
    }

    maiorIntervaloMinutos = Math.max(maiorIntervaloMinutos, gapMinutos);

    if (gapMinutos > intervaloMaximoMinutos) {
      push({
        tipo: "INTERVALO_LONGO",
        severidade: "erro",
        mensagem: `Intervalo de ${formatarDuracao(gapMinutos)} entre períodos (acima de ${formatarDuracao(intervaloMaximoMinutos)}, provável batida faltando)`,
      });
    } else if (gapMinutos > 0 && gapMinutos < almocoMinimoMinutos) {
      push({
        tipo: "ALMOCO_CURTO",
        severidade: "alerta",
        mensagem: `Intervalo de ${formatarDuracao(gapMinutos)} entre períodos (mínimo de ${almocoMinimoMinutos} min)`,
      });
    }
  }

  if (maiorPeriodoMinutos > jornadaMaximaSemIntervaloMinutos) {
    push({
      tipo: "PERIODO_LONGO",
      severidade: "erro",
      mensagem: `Período contínuo de ${formatarDuracao(maiorPeriodoMinutos)} sem intervalo (acima de ${formatarDuracao(jornadaMaximaSemIntervaloMinutos)})`,
    });
  } else if (
    jornadaMinutos > jornadaMaximaSemIntervaloMinutos &&
    maiorIntervaloMinutos < almocoMinimoMinutos
  ) {
    push({
      tipo: "JORNADA_SEM_INTERVALO",
      severidade: "erro",
      mensagem: `Jornada de ${formatarDuracao(jornadaMinutos)} sem intervalo de pelo menos ${almocoMinimoMinutos} min`,
    });
  }

  return warnings;
}
