import { getCompanyNameFromRawAddresses } from "@/utils/company-mapping";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface EscalaCompanyEntry {
  employee_solides_id: number;
  start_date: string;
  end_date: string | null;
  company_name: string;
}

type EscalaRow = {
  start_date: string;
  end_date: string | null;
  employee: { solides_id: number } | null;
  shift: {
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

export function pickEscalaCompanyName(
  entries: EscalaCompanyEntry[],
  employeeSolidesId: number,
  workDate: string
): string | undefined {
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
  return matching[0].company_name;
}

export function resolveWorkCompanyName(params: {
  employeeSolidesId: number;
  workDate: string;
  locationInAddress?: string | null;
  locationOutAddress?: string | null;
  escalaEntries: EscalaCompanyEntry[];
}): string {
  const fromEscala = pickEscalaCompanyName(
    params.escalaEntries,
    params.employeeSolidesId,
    params.workDate
  );
  if (fromEscala) return fromEscala;
  return getCompanyNameFromRawAddresses(
    params.locationInAddress,
    params.locationOutAddress
  );
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
      employee:employees(solides_id),
      shift:shifts(
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
    });
  }

  return out;
}
