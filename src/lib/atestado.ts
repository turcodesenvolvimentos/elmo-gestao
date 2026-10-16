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

export function buildAtestadoDayMap<
  T extends {
    employee_name: string;
    start_date: string;
    days: number;
    considerar_fds_feriado?: boolean | null;
  },
>(atestados: ReadonlyArray<T>): Map<string, T> {
  const map = new Map<string, T>();
  for (const a of atestados) {
    for (const date of expandAtestadoDates(a.start_date, a.days)) {
      const key = buildAtestadoKey(a.employee_name, date);
      const atual = map.get(key);
      if (!atual || (!atual.considerar_fds_feriado && a.considerar_fds_feriado)) {
        map.set(key, a);
      }
    }
  }
  return map;
}

export type TipoDiaAtestado = "util" | "fim_de_semana" | "feriado";

export function getTipoDiaAtestado(
  dateYyyyMmDd: string,
  customHolidayDates?: ReadonlySet<string>
): TipoDiaAtestado {
  // Meio-dia local, mesma convencao do `calcularHorasPorPeriodo`, para que
  // sabado/domingo aqui coincidam com o que o calculo de horas enxerga.
  const [y, m, day] = dateYyyyMmDd.slice(0, 10).split("-").map(Number);
  const d = new Date(y, m - 1, day, 12, 0, 0, 0);
  if (isHolidayForDisplay(dateYyyyMmDd.slice(0, 10), customHolidayDates)) {
    return "feriado";
  }
  const dayOfWeek = d.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return "fim_de_semana";
  return "util";
}

/**
 * Carga horária coberta pelo atestado: 8h de segunda a sexta. Sábado, domingo
 * e feriado só geram crédito quando o atestado foi lançado com a opção
 * "Considerar feriados e final de semana".
 */
export function getCargaHorariaDia(
  dateYyyyMmDd: string,
  customHolidayDates?: ReadonlySet<string>,
  considerarFdsFeriado = false
): number {
  if (considerarFdsFeriado) return CARGA_HORARIA_DIA_UTIL;
  return getTipoDiaAtestado(dateYyyyMmDd, customHolidayDates) === "util"
    ? CARGA_HORARIA_DIA_UTIL
    : 0;
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

export function isDomingoOuFeriado(
  dateYyyyMmDd: string,
  customHolidayDates?: ReadonlySet<string>
): boolean {
  const [y, m, day] = dateYyyyMmDd.slice(0, 10).split("-").map(Number);
  const d = new Date(y, m - 1, day, 12, 0, 0, 0);
  return (
    d.getDay() === 0 ||
    isHolidayForDisplay(dateYyyyMmDd.slice(0, 10), customHolidayDates)
  );
}

export const ATESTADO_SABADO_HORAS_NORMAIS = 4;

export interface AtestadoNoBoletim {
  normal: number;
  extra50Diurno: number;
  extra100Diurno: number;
}

/**
 * Como as horas de atestado entram na cobrança do boletim. No ponto elas
 * sempre aparecem como atestado; aqui só muda a forma de cobrar:
 * - não cobrar do cliente: nada é cobrado (a linha segue marcada como atestado);
 * - domingo e feriado (com a opção de fim de semana): tudo como 100%;
 * - sábado (com a opção de fim de semana): até 4h normais e o resto como 50%;
 * - demais dias: hora normal.
 */
export function distribuirAtestadoBoletim(
  dateYyyyMmDd: string,
  horasAtestado: number,
  horasNormaisTrabalhadas: number,
  customHolidayDates: ReadonlySet<string> | undefined,
  opcoes: { considerarFdsFeriado?: boolean; naoCobrarCliente?: boolean }
): AtestadoNoBoletim {
  const resultado: AtestadoNoBoletim = {
    normal: 0,
    extra50Diurno: 0,
    extra100Diurno: 0,
  };
  if (horasAtestado <= 0 || opcoes.naoCobrarCliente) return resultado;

  if (opcoes.considerarFdsFeriado) {
    if (isDomingoOuFeriado(dateYyyyMmDd, customHolidayDates)) {
      resultado.extra100Diurno = horasAtestado;
      return resultado;
    }
    if (getTipoDiaAtestado(dateYyyyMmDd, customHolidayDates) === "fim_de_semana") {
      const normal = Math.min(
        horasAtestado,
        Math.max(0, ATESTADO_SABADO_HORAS_NORMAIS - (horasNormaisTrabalhadas || 0))
      );
      resultado.normal = normal;
      resultado.extra50Diurno = horasAtestado - normal;
      return resultado;
    }
  }

  resultado.normal = horasAtestado;
  return resultado;
}

/**
 * Em domingo e feriado tudo o que foi trabalhado é 100% e não entra em normal,
 * então o atestado completa a carga descontando o total trabalhado. Nos demais
 * dias desconta só as horas normais.
 */
export function calcularHorasAtestado(
  dateYyyyMmDd: string,
  horasTrabalhadas: { horasNormais: number; totalHoras: number },
  customHolidayDates?: ReadonlySet<string>,
  considerarFdsFeriado = false
): number {
  const carga = getCargaHorariaDia(
    dateYyyyMmDd,
    customHolidayDates,
    considerarFdsFeriado
  );
  const descontar = isDomingoOuFeriado(dateYyyyMmDd, customHolidayDates)
    ? horasTrabalhadas.totalHoras
    : horasTrabalhadas.horasNormais;
  return Math.max(0, carga - (descontar || 0));
}
