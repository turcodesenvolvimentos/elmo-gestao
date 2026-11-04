import { NO_MAPPED_COMPANY_LABEL } from "@/utils/company-mapping";
import { estaDemitido } from "@/lib/employees";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface EscalaCompanyEntry {
  employee_solides_id: number;
  start_date: string;
  end_date: string | null;
  company_name: string;
  employee_name?: string | null;
  admission_date?: string | null;
  resignation_date?: string | null;
  employee_inativo?: boolean;
  entry1?: string | null;
  exit1?: string | null;
  entry2?: string | null;
  exit2?: string | null;
}

type EscalaRow = {
  start_date: string;
  end_date: string | null;
  employee: {
    solides_id: number;
    name: string | null;
    admission_date: string | null;
    resignation_date: string | null;
    fired: boolean | null;
    ativo_override: boolean | null;
  } | null;
  shift: {
    entry1: string | null;
    exit1: string | null;
    entry2: string | null;
    exit2: string | null;
    companies: { name: string } | { name: string }[] | null;
  } | null;
};

function companyNameFromShiftRow(
  shift: EscalaRow["shift"]
): string | undefined {
  if (!shift?.companies) return undefined;
  const c = shift.companies;
  const name = Array.isArray(c) ? c[0]?.name : c.name;
  return name?.trim() || undefined;
}

export function pickEscalaEntry(
  entries: EscalaCompanyEntry[],
  employeeSolidesId: number,
  workDate: string
): EscalaCompanyEntry | undefined {
  const matching = entries.filter(
    (e) =>
      e.employee_solides_id === employeeSolidesId &&
      e.start_date <= workDate &&
      (e.end_date === null ||
        e.end_date === undefined ||
        e.end_date >= workDate)
  );
  if (matching.length === 0) return undefined;
  matching.sort((a, b) => b.start_date.localeCompare(a.start_date));
  return matching[0];
}

export function pickEscalaCompanyName(
  entries: EscalaCompanyEntry[],
  employeeSolidesId: number,
  workDate: string
): string | undefined {
  return pickEscalaEntry(entries, employeeSolidesId, workDate)?.company_name;
}

function timeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function periodoMinutos(entrada?: string | null, saida?: string | null): number {
  const inicio = timeToMinutes(entrada);
  const fim = timeToMinutes(saida);
  if (inicio === null || fim === null) return 0;
  const diff = fim - inicio;
  return diff > 0 ? diff : diff + 24 * 60;
}

export function escalaVigenteNoDia(
  entry: EscalaCompanyEntry,
  workDate: string
): boolean {
  const admissao = entry.admission_date?.slice(0, 10);
  const demissao = entry.resignation_date?.slice(0, 10);
  if (admissao && workDate < admissao) return false;
  if (demissao && workDate > demissao) return false;
  if (!demissao && entry.employee_inativo) return false;
  return true;
}

export function escalaJornadaMinutos(entry: EscalaCompanyEntry): number {
  return (
    periodoMinutos(entry.entry1, entry.exit1) +
    periodoMinutos(entry.entry2, entry.exit2)
  );
}

export function resolveWorkCompanyName(params: {
  employeeSolidesId: number;
  workDate: string;
  escalaEntries: EscalaCompanyEntry[];
}): string {
  const fromEscala = pickEscalaCompanyName(
    params.escalaEntries,
    params.employeeSolidesId,
    params.workDate
  );
  return fromEscala ?? NO_MAPPED_COMPANY_LABEL;
}

export async function fetchEscalaCompanyEntries(
  supabase: SupabaseClient,
  params: {
    startDate: string;
    endDate: string;
    employeeIds: string[];
  }
): Promise<EscalaCompanyEntry[]> {
  if (params.employeeIds.length === 0) return [];

  const { data, error } = await supabase
    .from("escalas")
    .select(
      `
      start_date,
      end_date,
      employee:employees(
        solides_id,
        name,
        admission_date,
        resignation_date,
        fired,
        ativo_override
      ),
      shift:shifts(
        entry1,
        exit1,
        entry2,
        exit2,
        companies(name)
      )
    `
    )
    .in("employee_id", params.employeeIds)
    .lte("start_date", params.endDate)
    .or(`end_date.is.null,end_date.gte.${params.startDate}`);

  if (error) throw error;

  const rows = (data || []) as unknown as EscalaRow[];
  const out: EscalaCompanyEntry[] = [];

  for (const row of rows) {
    const solides = row.employee?.solides_id;
    const companyName = companyNameFromShiftRow(row.shift);
    if (solides == null || companyName === undefined) continue;
    out.push({
      employee_solides_id: solides,
      start_date: row.start_date,
      end_date: row.end_date,
      company_name: companyName,
      employee_name: row.employee?.name ?? null,
      admission_date: row.employee?.admission_date ?? null,
      resignation_date: row.employee?.resignation_date ?? null,
      employee_inativo: estaDemitido(row.employee ?? {}),
      entry1: row.shift?.entry1 ?? null,
      exit1: row.shift?.exit1 ?? null,
      entry2: row.shift?.entry2 ?? null,
      exit2: row.shift?.exit2 ?? null,
    });
  }

  return out;
}
