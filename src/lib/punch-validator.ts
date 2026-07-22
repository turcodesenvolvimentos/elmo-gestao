export type PunchWarningTipo =
  | "PERIODO_ABERTO"
  | "DUPLICADA"
  | "ALMOCO_CURTO"
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
}

const DEFAULT_DUPLICATA_MINUTOS = 10;
const DEFAULT_ALMOCO_MINIMO_MINUTOS = 30;
const MS_POR_MINUTO = 60 * 1000;

function parseTime(value?: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function diffMinutos(aMs: number, bMs: number): number {
  return Math.abs(aMs - bMs) / MS_POR_MINUTO;
}

export function validateDayPunches(
  punches: PunchForValidation[],
  options: ValidatePunchesOptions = {},
): PunchWarning[] {
  const duplicataMinutos = options.duplicataMinutos ?? DEFAULT_DUPLICATA_MINUTOS;
  const almocoMinimoMinutos =
    options.almocoMinimoMinutos ?? DEFAULT_ALMOCO_MINIMO_MINUTOS;

  const warnings: PunchWarning[] = [];

  for (const punch of punches) {
    if (punch.adjust) continue;
    const hasIn = Boolean(punch.dateIn);
    const hasOut = Boolean(punch.dateOut);
    if (hasIn !== hasOut) {
      warnings.push({
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
      warnings.push({
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

  for (let i = 1; i < periodos.length; i++) {
    const anterior = periodos[i - 1];
    const atual = periodos[i];
    const gapMinutos = (atual.inicio - anterior.fim) / MS_POR_MINUTO;

    if (gapMinutos < 0) {
      warnings.push({
        tipo: "SOBREPOSICAO",
        severidade: "erro",
        mensagem: "Sobreposição de horários (períodos se cruzam)",
      });
    } else if (gapMinutos > 0 && gapMinutos < almocoMinimoMinutos) {
      warnings.push({
        tipo: "ALMOCO_CURTO",
        severidade: "alerta",
        mensagem: `Intervalo entre períodos menor que ${almocoMinimoMinutos} min`,
      });
    }
  }

  return warnings;
}
