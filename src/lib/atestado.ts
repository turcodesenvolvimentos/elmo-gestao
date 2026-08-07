import { isHolidayForDisplay } from "@/lib/ponto-calculator";

export const CARGA_HORARIA_DIA_UTIL = 8;

export function normalizeAtestadoName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function buildAtestadoKey(
  employeeName: string,
  dateYyyyMmDd: string
): string {
  return `${normalizeAtestadoName(employeeName)}|${dateYyyyMmDd.slice(0, 10)}`;
}

function addDays(dateYyyyMmDd: string, amount: number): string {
  const d = new Date(dateYyyyMmDd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + amount);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Dias cobertos por um atestado. O primeiro dia já conta na quantidade. */
export function expandAtestadoDates(
  startDate: string,
  days: number
): string[] {
  const total = Math.max(1, Math.floor(days || 1));
  const base = startDate.slice(0, 10);
  const result: string[] = [];
  for (let i = 0; i < total; i += 1) {
    result.push(addDays(base, i));
  }
  return result;
}

/**
 * Conjunto de chaves `nome|YYYY-MM-DD` cobertas pelos atestados, já expandindo
 * cada atestado para todos os seus dias.
 */
export function buildAtestadoKeySet(
  atestados: ReadonlyArray<{
    employee_name: string;
    start_date: string;
    days: number;
  }>
): Set<string> {
  const set = new Set<string>();
  for (const a of atestados) {
    for (const date of expandAtestadoDates(a.start_date, a.days)) {
      set.add(buildAtestadoKey(a.employee_name, date));
    }
  }
  return set;
}

/**
 * Carga horária coberta pelo atestado: 8h de segunda a sexta. Sábado, domingo
 * e feriado não geram crédito — o atestado só vale em dia útil.
 */
export function getCargaHorariaDia(
  dateYyyyMmDd: string,
  customHolidayDates?: ReadonlySet<string>
): number {
  // Meio-dia local, mesma convencao do `calcularHorasPorPeriodo`, para que
  // sabado/domingo aqui coincidam com o que o calculo de horas enxerga.
  const [y, m, day] = dateYyyyMmDd.slice(0, 10).split("-").map(Number);
  const d = new Date(y, m - 1, day, 12, 0, 0, 0);
  const dayOfWeek = d.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return 0;
  if (isHolidayForDisplay(dateYyyyMmDd.slice(0, 10), customHolidayDates)) {
    return 0;
  }
  return CARGA_HORARIA_DIA_UTIL;
}

/**
 * Horas de atestado do dia: o que falta para fechar a carga horária normal.
 * Mantém tudo o que foi efetivamente trabalhado (extras, adicional noturno e
 * 100% continuam intactos) e só injeta a diferença até a carga.
 */
export interface AtestadoPeriodo {
  entrada: string;
  saida: string;
}

const MINUTOS_POR_DIA = 24 * 60;
const ATESTADO_INICIO_PADRAO = 8 * 60; // 08:00
const ATESTADO_ALMOCO_INICIO = 12 * 60; // 12:00
const ATESTADO_ALMOCO_FIM = 13 * 60; // 13:00

function parseHmToMinutes(value?: string | null): number | null {
  if (!value || value === "-") return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function formatMinutesToHm(minutes: number): string {
  const normalized = ((Math.round(minutes) % MINUTOS_POR_DIA) + MINUTOS_POR_DIA) %
    MINUTOS_POR_DIA;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Horários fictícios que representam as horas de atestado do dia, para que a
 * linha apareça preenchida como se tivesse sido trabalhada.
 *
 * - Sem batida real: usa o padrão 08:00–12:00 / 13:00–17:00, truncado na
 *   quantidade de horas.
 * - Com batida real: emenda um bloco único logo após a última saída
 *   (ex.: saiu 18:33 faltando 6:27 → 18:33–01:00).
 *
 * Os horários são apenas de exibição: as horas já foram creditadas por
 * `calcularHorasAtestado` e não devem ser recalculadas a partir daqui.
 */
export function buildAtestadoPeriodos(
  horasAtestado: number,
  ultimaSaida?: string | null
): AtestadoPeriodo[] {
  const totalMin = Math.round((horasAtestado || 0) * 60);
  if (totalMin <= 0) return [];

  const saidaMin = parseHmToMinutes(ultimaSaida);
  if (saidaMin !== null) {
    return [
      {
        entrada: formatMinutesToHm(saidaMin),
        saida: formatMinutesToHm(saidaMin + totalMin),
      },
    ];
  }

  const manha = Math.min(totalMin, ATESTADO_ALMOCO_INICIO - ATESTADO_INICIO_PADRAO);
  const periodos: AtestadoPeriodo[] = [
    {
      entrada: formatMinutesToHm(ATESTADO_INICIO_PADRAO),
      saida: formatMinutesToHm(ATESTADO_INICIO_PADRAO + manha),
    },
  ];

  const resto = totalMin - manha;
  if (resto > 0) {
    periodos.push({
      entrada: formatMinutesToHm(ATESTADO_ALMOCO_FIM),
      saida: formatMinutesToHm(ATESTADO_ALMOCO_FIM + resto),
    });
  }

  return periodos;
}

export function calcularHorasAtestado(
  dateYyyyMmDd: string,
  horasNormaisTrabalhadas: number,
  customHolidayDates?: ReadonlySet<string>
): number {
  const carga = getCargaHorariaDia(dateYyyyMmDd, customHolidayDates);
  return Math.max(0, carga - (horasNormaisTrabalhadas || 0));
}
