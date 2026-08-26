import { supabaseAdmin } from "@/lib/db/client";
import { solidesApiClient } from "@/lib/axios/solides.client";
import { calcularHorasPorPeriodo, formatarHoras } from "@/lib/ponto-calculator";
import {
  buildAtestadoKey,
  buildAtestadoPeriodos,
  calcularHorasAtestado,
} from "@/lib/atestado";
import type { BoletimData } from "@/services/boletim.service";
import { NO_MAPPED_COMPANY_LABEL } from "@/utils/company-mapping";
import { aplicarPrioridadeManual } from "@/lib/punches";

const DAYS_OF_WEEK = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function getPreviousDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDateKey(value: string | number | undefined): string | null {
  if (value === undefined || value === null) return null;
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  if (typeof value === "string") {
    if (!value) return null;
    if (value.includes("T")) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return formatLocalDate(d);
      return value.split("T")[0];
    }
    return value.substring(0, 10);
  }
  if (typeof value === "number") {
    const d = new Date(value > 1e12 ? value : value * 1000);
    if (isNaN(d.getTime())) return null;
    return formatLocalDate(d);
  }
  return null;
}

interface Punch {
  date: string;
  date_in: string;
  date_out: string;
}

function dateToTimestamp(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

function toIso(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

interface SolidesPunchRaw {
  id?: number;
  date?: string | number | null;
  dateIn?: string | number | null;
  dateOut?: string | number | null;
  employee?: { id?: number; name?: string } | null;
  status?: string;
}

/**
 * Busca todos os pontos APROVADOS do período direto da API do Solides
 * (mesma fonte usada pela página de Ponto). Pagina até esgotar.
 *
 * IMPORTANTE: vai buscar pontos de toda a Solides nesse período; a filtragem
 * por empresa acontece downstream via `punchesByEmployee` cruzando com a
 * lista de funcionários da empresa selecionada.
 */
async function fetchPunchesFromSolides(
  startDate: string,
  endDate: string,
): Promise<SolidesPunchRaw[]> {
  const startTs = dateToTimestamp(startDate);
  const endTs = dateToTimestamp(endDate);
  const PAGE_SIZE = 1000;
  const collected: SolidesPunchRaw[] = [];

  // A API do Solides e 1-indexada (mesma convencao do employees/route.ts).
  // Comecar em 0 fazia a pagina 1 ser buscada duas vezes (duplicando batidas)
  // e a ultima pagina nunca ser buscada (perdendo as batidas mais antigas do
  // periodo, que apareciam como "falta").
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await solidesApiClient.get("punch", {
        params: {
          page,
          size: PAGE_SIZE,
          startDate: startTs.toString(),
          endDate: endTs.toString(),
          status: "APPROVED",
          showFired: true,
        },
      });
      const data = response.data;
      const content: SolidesPunchRaw[] = data?.content || [];
      collected.push(...content);
      page++;
      hasMore =
        content.length > 0 &&
        !data?.last &&
        page <= (data?.totalPages ?? Infinity);
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      // 404 = sem registros, encerra paginação silenciosamente.
      if (status === 404) {
        hasMore = false;
        break;
      }
      throw err;
    }
  }

  // Deduplica registros repetidos. A paginacao da API do Solides pode devolver
  // o mesmo ponto em mais de uma pagina quando o resultado passa de uma pagina
  // (ex.: periodos longos, que buscam o Solides inteiro). Sem isso, cada batida
  // entraria mais de uma vez e os totais do boletim ficariam multiplicados.
  // Chave: o `id` do ponto quando existe; senao, uma chave composta estavel.
  const seen = new Set<string>();
  const deduped: SolidesPunchRaw[] = [];
  for (const raw of collected) {
    const key =
      raw.id != null
        ? `id:${raw.id}`
        : `c:${raw.employee?.id ?? ""}|${raw.dateIn ?? ""}|${raw.dateOut ?? ""}|${raw.date ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(raw);
  }

  return deduped;
}

export type FontePunches = "solides" | "banco";

async function fetchPunchesFromBanco(
  startDate: string,
  endDate: string,
): Promise<SolidesPunchRaw[]> {
  const PAGE = 1000;
  const linhas: Array<{
    solides_id: number | null;
    employee_id: number;
    employee_name: string | null;
    date: string;
    date_in: string | null;
    date_out: string | null;
    status: string;
    origem: string | null;
  }> = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("punches")
      .select(
        "solides_id, employee_id, employee_name, date, date_in, date_out, status, origem",
      )
      .eq("status", "APPROVED")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .order("date_in", { ascending: true, nullsFirst: true })
      .order("solides_id", { ascending: true, nullsFirst: true })
      .range(from, from + PAGE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    linhas.push(...(data as typeof linhas));

    if (data.length < PAGE) break;
    from += PAGE;
  }

  // A regra de conflito é aplicada sobre o período inteiro, depois de juntar
  // todas as páginas: uma batida manual da última página precisa esconder a da
  // Sólides que veio na primeira.
  return aplicarPrioridadeManual(linhas).map((row) => ({
    id: row.solides_id ?? undefined,
    date: row.date,
    dateIn: row.date_in,
    dateOut: row.date_out,
    employee: { id: row.employee_id, name: row.employee_name },
    status: row.status,
  }));
}

export function compararBoletins(
  viaSolides: BoletimData[],
  viaBanco: BoletimData[],
) {
  const chave = (r: BoletimData) => `${r.employee_id}|${r.date}`;
  const campos: Array<keyof BoletimData> = [
    "employee_name",
    "work_company",
    "position",
    "department",
    "day_of_week",
    "entry1",
    "exit1",
    "entry2",
    "exit2",
    "total_hours",
    "normal_hours",
    "atestado_hours",
    "night_additional",
    "extra_50_day",
    "extra_50_night",
    "extra_100_day",
    "extra_100_night",
    "value",
  ];

  const mapS = new Map(viaSolides.map((r) => [chave(r), r]));
  const mapB = new Map(viaBanco.map((r) => [chave(r), r]));

  const soNoSolides = [...mapS.keys()].filter((k) => !mapB.has(k));
  const soNoBanco = [...mapB.keys()].filter((k) => !mapS.has(k));
  const diferentes: Array<{
    chave: string;
    campo: string;
    solides: unknown;
    banco: unknown;
  }> = [];

  for (const [k, linhaS] of mapS) {
    const linhaB = mapB.get(k);
    if (!linhaB) continue;
    for (const campo of campos) {
      const valorS = linhaS[campo] ?? null;
      const valorB = linhaB[campo] ?? null;
      if (valorS !== valorB) {
        diferentes.push({
          chave: k,
          campo: String(campo),
          solides: valorS,
          banco: valorB,
        });
      }
    }
  }

  const somaValor = (linhas: BoletimData[]) =>
    Number(linhas.reduce((acc, r) => acc + (r.value || 0), 0).toFixed(2));

  return {
    identico:
      soNoSolides.length === 0 &&
      soNoBanco.length === 0 &&
      diferentes.length === 0,
    linhasSolides: viaSolides.length,
    linhasBanco: viaBanco.length,
    valorSolides: somaValor(viaSolides),
    valorBanco: somaValor(viaBanco),
    soNoSolides,
    soNoBanco,
    totalDiferencas: diferentes.length,
    diferentes: diferentes.slice(0, 200),
  };
}

export async function gerarBoletim(
  companyId: string,
  startDate: string,
  endDate: string,
  fonte: FontePunches,
): Promise<BoletimData[]> {
    const { data: companyRow } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    const companyName = companyRow?.name ?? "";

    const { data: companyShifts } = await supabaseAdmin
      .from("shifts")
      .select("id")
      .eq("company_id", companyId);

    const shiftIds = (companyShifts || []).map((s: { id: string }) => s.id);
    const shiftIdSet = new Set<string>(shiftIds);

    const { data: escalasRows, error: escalasError } =
      shiftIds.length === 0
        ? { data: [], error: null }
        : await supabaseAdmin
            .from("escalas")
            .select(
              `
        employee_id,
        start_date,
        end_date,
        employees!inner (
          id,
          name,
          solides_id,
          fired,
          synced_at
        )
      `
            )
            .in("shift_id", shiftIds)
            .lte("start_date", endDate)
            .or(`end_date.is.null,end_date.gte.${startDate}`);

    if (escalasError) throw escalasError;

    type EmpJoin = {
      id: string;
      name: string;
      solides_id: number;
      fired: boolean;
      synced_at: string | null;
    };
    type EscalaRowJoined = {
      employee_id: string;
      start_date: string;
      end_date: string | null;
      employees: EmpJoin | EmpJoin[] | null;
    };

    const normalizeEmployee = (row: EscalaRowJoined) => {
      const e = row.employees;
      if (!e) return null;
      return Array.isArray(e) ? e[0] ?? null : e;
    };

    const validEscalas = ((escalasRows || []) as EscalaRowJoined[]).filter(
      (row) => !!normalizeEmployee(row),
    );

    const employeeUuids = Array.from(
      new Set(validEscalas.map((row) => row.employee_id))
    );

    const employeeMap = new Map<
      string,
      { id: string; name: string; solidesId: number; isOrphan?: boolean }
    >();
    for (const row of validEscalas) {
      const emp = normalizeEmployee(row);
      if (!emp) continue;
      if (!employeeMap.has(emp.id)) {
        employeeMap.set(emp.id, {
          id: emp.id,
          name: emp.name,
          solidesId: emp.solides_id,
        });
      }
    }

    const { data: employeeCompaniesRows } = await supabaseAdmin
      .from("employee_companies")
      .select(
        `
        employee_id,
        department,
        positions (
          id,
          name,
          hour_value
        )
      `
      )
      .eq("company_id", companyId)
      .in("employee_id", employeeUuids);

    type PositionRow = { id: string; name: string; hour_value: number };
    type EcRow = {
      employee_id: string;
      department: string | null;
      positions: PositionRow | PositionRow[] | null;
    };

    const positionByEmployee = new Map<
      string,
      { department: string | null; position: PositionRow | null }
    >();
    for (const ec of (employeeCompaniesRows || []) as EcRow[]) {
      const pos = Array.isArray(ec.positions)
        ? ec.positions[0] ?? null
        : ec.positions ?? null;
      positionByEmployee.set(ec.employee_id, {
        department: ec.department,
        position: pos,
      });
    }

    // Busca a position padrao "Aj. Carga e Desc." da empresa do boletim,
    // usada como fallback quando um funcionario nao tem cargo vinculado
    // (ex.: alguem removeu o vinculo). Assim o boletim sempre mostra
    // "Aj. Carga e Desc." + o valor da empresa em vez de "Sem cargo" + R$ 0.
    const { data: defaultPositionRow } = await supabaseAdmin
      .from("positions")
      .select("id, name, hour_value")
      .eq("company_id", companyId)
      .eq("name", "Aj. Carga e Desc.")
      .maybeSingle();
    const defaultPosition: PositionRow | null = defaultPositionRow ?? null;

    const scheduledDaysByEmployee = new Map<string, Set<string>>();
    for (const row of validEscalas) {
      const employeeUuid = row.employee_id;
      let cursor = row.start_date > startDate ? row.start_date : startDate;
      const escalaEnd = row.end_date ?? endDate;
      const limit = escalaEnd < endDate ? escalaEnd : endDate;

      if (!scheduledDaysByEmployee.has(employeeUuid)) {
        scheduledDaysByEmployee.set(employeeUuid, new Set<string>());
      }
      const set = scheduledDaysByEmployee.get(employeeUuid)!;

      while (cursor <= limit) {
        set.add(cursor);
        cursor = getNextDate(cursor);
      }
    }

    const contextStartDate = getPreviousDate(startDate);
    const contextEndDate = getNextDate(endDate);

    // ---------------------------------------------------------------------
    // Busca pontos LIVE do Solides em vez de ler da tabela local — assim o
    // boletim reflete exatamente o que aparece na página de Ponto (que
    // também consulta a API), incluindo apagamentos feitos no Solides
    // depois do último sync.
    // ---------------------------------------------------------------------
    const solidesPunches =
      fonte === "banco"
        ? await fetchPunchesFromBanco(contextStartDate, contextEndDate)
        : await fetchPunchesFromSolides(contextStartDate, contextEndDate);

    const { data: customHolidayRows } = await supabaseAdmin
      .from("custom_holidays")
      .select("holiday_date");

    const customHolidaySet = new Set<string>(
      (customHolidayRows || []).map(
        (r: { holiday_date: string }) => r.holiday_date
      )
    );

    // Atestados: um registro cobre `days` dias corridos a partir de start_date
    // (o primeiro dia ja conta). Aqui expandimos em chaves por dia. A chave usa
    // solides_id quando o funcionario existe na tabela e tambem o nome
    // normalizado, cobrindo cadastros feitos por nome.
    const { data: atestadoRows } = await supabaseAdmin
      .from("atestados")
      .select("employee_id, employee_name, start_date, days")
      .lte("start_date", endDate);

    const atestadoDayKeys = new Set<string>();
    // Datas de atestado por solides_id, usadas para trazer para o boletim
    // funcionarios de atestado que nao foram convocados.
    const atestadoDatesBySolidesId = new Map<string, Set<string>>();
    for (const a of (atestadoRows || []) as {
      employee_id: string;
      employee_name: string;
      start_date: string;
      days: number;
    }[]) {
      const total = Math.max(1, Math.floor(a.days || 1));
      const cursor = new Date(a.start_date.slice(0, 10) + "T12:00:00Z");
      for (let i = 0; i < total; i += 1) {
        const y = cursor.getUTCFullYear();
        const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
        const d = String(cursor.getUTCDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`;
        if (dateStr >= startDate && dateStr <= endDate) {
          const solidesKey = String(a.employee_id);
          atestadoDayKeys.add(`id:${solidesKey}|${dateStr}`);
          atestadoDayKeys.add(buildAtestadoKey(a.employee_name, dateStr));
          if (!atestadoDatesBySolidesId.has(solidesKey)) {
            atestadoDatesBySolidesId.set(solidesKey, new Set<string>());
          }
          atestadoDatesBySolidesId.get(solidesKey)!.add(dateStr);
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    const punchesByEmployee = new Map<number, Punch[]>();

    for (const raw of solidesPunches) {
      const employeeId = raw.employee?.id;
      if (typeof employeeId !== "number") continue;

      const dateIn = toIso(raw.dateIn);
      const dateOut = toIso(raw.dateOut);
      // Sem entrada nem saída → ponto inutilizável, pula.
      if (!dateIn && !dateOut) continue;

      // Data canônica do ponto (mesmo fallback usado no sync).
      let dateStr: string | null = null;
      if (raw.date) {
        if (typeof raw.date === "string") {
          dateStr = raw.date.includes("T")
            ? raw.date.split("T")[0]
            : raw.date.substring(0, 10);
        } else if (typeof raw.date === "number") {
          const ms = raw.date > 1e12 ? raw.date : raw.date * 1000;
          const d = new Date(ms);
          if (!Number.isNaN(d.getTime())) {
            dateStr =
              `${d.getFullYear()}-` +
              `${String(d.getMonth() + 1).padStart(2, "0")}-` +
              `${String(d.getDate()).padStart(2, "0")}`;
          }
        }
      }
      if (!dateStr) {
        const fallback = dateIn ?? dateOut;
        if (fallback) dateStr = fallback.split("T")[0];
      }
      if (!dateStr) continue;

      if (!punchesByEmployee.has(employeeId)) {
        punchesByEmployee.set(employeeId, []);
      }
      punchesByEmployee.get(employeeId)!.push({
        date: dateStr,
        date_in: dateIn ?? "",
        date_out: dateOut ?? "",
      });
    }

    const solidesIdsWithPunches = Array.from(punchesByEmployee.keys());

    // Dias em que cada funcionario esta escalado em OUTRA empresa (shift que
    // NAO pertence a esta empresa). Usado para excluir do boletim os dias nao
    // escalados aqui que, na verdade, pertencem a escala de outra empresa.
    const otherCompanyScheduledDaysByEmployee = new Map<string, Set<string>>();

    // Dias com batida que nao estao cobertos por escala em NENHUMA empresa.
    // Entram no boletim de todas elas como "Nao escalado": sem escala nao da
    // para saber onde a pessoa trabalhou, entao o aviso precisa chegar a todos
    // os gestores, nao so ao da empresa onde ela costuma ser escalada.
    const diasSemEscalaByEmployee = new Map<string, Set<string>>();

    if (solidesIdsWithPunches.length > 0) {
      const { data: allEscalasInPeriod } = await supabaseAdmin
        .from("escalas")
        .select("employee_id, start_date, end_date, shift_id")
        .lte("start_date", endDate)
        .or(`end_date.is.null,end_date.gte.${startDate}`);

      type AllEscalaRow = {
        employee_id: string;
        start_date: string;
        end_date: string | null;
        shift_id: string;
      };

      const scheduledEmployeeUuids = new Set<string>(
        ((allEscalasInPeriod || []) as AllEscalaRow[]).map(
          (e) => e.employee_id
        )
      );

      for (const row of (allEscalasInPeriod || []) as AllEscalaRow[]) {
        // So interessam escalas de OUTRAS empresas (shift fora desta empresa).
        if (shiftIdSet.has(row.shift_id)) continue;

        let cursor = row.start_date > startDate ? row.start_date : startDate;
        const escalaEnd = row.end_date ?? endDate;
        const limit = escalaEnd < endDate ? escalaEnd : endDate;

        if (!otherCompanyScheduledDaysByEmployee.has(row.employee_id)) {
          otherCompanyScheduledDaysByEmployee.set(
            row.employee_id,
            new Set<string>()
          );
        }
        const set = otherCompanyScheduledDaysByEmployee.get(row.employee_id)!;
        while (cursor <= limit) {
          set.add(cursor);
          cursor = getNextDate(cursor);
        }
      }

      const { data: employeesWithPunches } = await supabaseAdmin
        .from("employees")
        .select("id, name, solides_id, fired, synced_at")
        .in("solides_id", solidesIdsWithPunches);

      type EmpInfo = {
        id: string;
        name: string;
        solides_id: number;
        fired: boolean;
        synced_at: string | null;
      };

      for (const emp of (employeesWithPunches || []) as EmpInfo[]) {
        const isOrphan = !scheduledEmployeeUuids.has(emp.id);

        const punchDays = new Set<string>();
        for (const p of punchesByEmployee.get(emp.solides_id) || []) {
          const day =
            toLocalDateKey(p.date_in) ??
            toLocalDateKey(p.date_out) ??
            toLocalDateKey(p.date);
          if (day && day >= startDate && day <= endDate) {
            punchDays.add(day);
          }
        }

        if (isOrphan) {
          if (!employeeMap.has(emp.id)) {
            employeeMap.set(emp.id, {
              id: emp.id,
              name: emp.name,
              solidesId: emp.solides_id,
              isOrphan: true,
            });
          }

          if (!scheduledDaysByEmployee.has(emp.id)) {
            scheduledDaysByEmployee.set(emp.id, new Set<string>());
          }
          const orphanDays = scheduledDaysByEmployee.get(emp.id)!;
          for (const day of punchDays) orphanDays.add(day);
          continue;
        }

        const escaladoAqui =
          scheduledDaysByEmployee.get(emp.id) ?? new Set<string>();
        const escaladoEmOutra =
          otherCompanyScheduledDaysByEmployee.get(emp.id) ?? new Set<string>();

        const semEscala = new Set<string>();
        for (const day of punchDays) {
          if (escaladoAqui.has(day) || escaladoEmOutra.has(day)) continue;
          semEscala.add(day);
        }

        if (semEscala.size === 0) continue;

        diasSemEscalaByEmployee.set(emp.id, semEscala);

        if (!employeeMap.has(emp.id)) {
          employeeMap.set(emp.id, {
            id: emp.id,
            name: emp.name,
            solidesId: emp.solides_id,
          });
        }
      }
    }

    // Funcionario de atestado que nao esta escalado em lugar nenhum entra em
    // todos os boletins como "Nao escalado" — mesmo tratamento de um dia batido
    // sem escala —, servindo de aviso de que falta convoca-lo.
    const atestadoDaysByEmployee = new Map<string, Set<string>>();

    if (atestadoDatesBySolidesId.size > 0) {
      const atestadoSolidesIds = Array.from(atestadoDatesBySolidesId.keys())
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));

      if (atestadoSolidesIds.length > 0) {
        const { data: atestadoEmployees } = await supabaseAdmin
          .from("employees")
          .select("id, name, solides_id")
          .in("solides_id", atestadoSolidesIds);

        for (const emp of (atestadoEmployees || []) as {
          id: string;
          name: string;
          solides_id: number;
        }[]) {
          const dates = atestadoDatesBySolidesId.get(String(emp.solides_id));
          if (!dates || dates.size === 0) continue;
          atestadoDaysByEmployee.set(emp.id, new Set(dates));
          if (!employeeMap.has(emp.id)) {
            employeeMap.set(emp.id, {
              id: emp.id,
              name: emp.name,
              solidesId: emp.solides_id,
            });
          }
        }
      }
    }

    const boletimData: BoletimData[] = [];

    for (const [employeeUuid, employee] of employeeMap.entries()) {
      const scheduledDays =
        scheduledDaysByEmployee.get(employeeUuid) ?? new Set<string>();
      const atestadoDays =
        atestadoDaysByEmployee.get(employeeUuid) ?? new Set<string>();
      const diasSemEscala =
        diasSemEscalaByEmployee.get(employeeUuid) ?? new Set<string>();
      if (
        scheduledDays.size === 0 &&
        atestadoDays.size === 0 &&
        diasSemEscala.size === 0
      ) {
        continue;
      }

      const positionInfo = positionByEmployee.get(employeeUuid);
      // Se o funcionario nao tem cargo vinculado nesta empresa, usa a
      // position padrao "Aj. Carga e Desc." da empresa como fallback.
      const position = positionInfo?.position ?? defaultPosition;
      const department = positionInfo?.department ?? null;

      const employeePunches = punchesByEmployee.get(employee.solidesId) || [];

      const punchesByWorkDate = new Map<string, Punch[]>();
      const sortedEmployeePunches = [...employeePunches].sort(
        (a, b) =>
          new Date(a.date_in).getTime() - new Date(b.date_in).getTime()
      );

      const CONTINUACAO_NOTURNA_MAX_HORAS = 2;
      // Saida a partir desta hora (mesmo dia, antes da meia-noite) e considerada
      // "tarde da noite": suficiente para colar o retorno da madrugada seguinte
      // (mesma regra da pagina de Ponto).
      const HORA_SAIDA_NOTURNA_TARDE = 22;

      let lastGroupByEmployee:
        | {
            dateStr: string;
            hadNightShift: boolean;
            lastNightShiftOpen: boolean;
            lastShiftEndAt: Date | null;
            lastShiftEndedAfterMidnight: boolean;
            lastShiftEndedLateNight: boolean;
          }
        | undefined;

      sortedEmployeePunches.forEach((punch) => {
        const punchDateStr =
          toLocalDateKey(punch.date_in) ??
          toLocalDateKey(punch.date_out) ??
          toLocalDateKey(punch.date);
        if (!punchDateStr) return;
        const entryDate = punch.date_in ? new Date(punch.date_in) : undefined;
        const exitDate = punch.date_out ? new Date(punch.date_out) : undefined;
        const entryHour = entryDate ? entryDate.getHours() : undefined;
        const isEarlyMorning = entryHour !== undefined ? entryHour < 12 : false;
        const isNightShiftEntry =
          entryHour !== undefined ? entryHour >= 18 : false;
        const shiftCrossedMidnight = !!(
          entryDate &&
          exitDate &&
          (entryDate.getFullYear() !== exitDate.getFullYear() ||
            entryDate.getMonth() !== exitDate.getMonth() ||
            entryDate.getDate() !== exitDate.getDate())
        );

        const shouldAttachToPreviousDay =
          !!lastGroupByEmployee &&
          isEarlyMorning &&
          (() => {
            const [y, m, d] = lastGroupByEmployee!.dateStr
              .split("-")
              .map(Number);
            const lastDate = new Date(Date.UTC(y, m - 1, d));
            const [cy, cm, cd] = punchDateStr.split("-").map(Number);
            const currentDate = new Date(Date.UTC(cy, cm - 1, cd));
            const diffDays =
              (currentDate.getTime() - lastDate.getTime()) /
              (1000 * 60 * 60 * 24);
            if (Math.round(diffDays) !== 1) return false;
            if (!lastGroupByEmployee!.hadNightShift) return false;

            // Caso 1: turno anterior ficou aberto (esqueceu de bater saida)
            if (lastGroupByEmployee!.lastNightShiftOpen) return true;

            // Caso 2: turno anterior fechou de madrugada (saida cruzou meia-noite)
            // OU fechou tarde da noite (>= HORA_SAIDA_NOTURNA_TARDE, antes da
            // meia-noite) e o retorno foi em ate CONTINUACAO_NOTURNA_MAX_HORAS
            // horas (mesma regra da pagina de Ponto).
            if (
              (lastGroupByEmployee!.lastShiftEndedAfterMidnight ||
                lastGroupByEmployee!.lastShiftEndedLateNight) &&
              lastGroupByEmployee!.lastShiftEndAt &&
              entryDate
            ) {
              const diffHoras =
                (entryDate.getTime() -
                  lastGroupByEmployee!.lastShiftEndAt.getTime()) /
                (1000 * 60 * 60);
              if (
                diffHoras >= 0 &&
                diffHoras <= CONTINUACAO_NOTURNA_MAX_HORAS
              ) {
                return true;
              }
            }

            return false;
          })();

        const workDate = shouldAttachToPreviousDay
          ? lastGroupByEmployee!.dateStr
          : punchDateStr;

        if (!punchesByWorkDate.has(workDate)) {
          punchesByWorkDate.set(workDate, []);
        }
        punchesByWorkDate.get(workDate)!.push(punch);

        const prev = lastGroupByEmployee;
        const currentPunchIsNightShiftWithoutOut =
          (isNightShiftEntry || shiftCrossedMidnight) && !punch.date_out;

        let lastShiftEndAt: Date | null = null;
        let lastShiftEndedAfterMidnight = false;
        let lastShiftEndedLateNight = false;
        if (exitDate && shiftCrossedMidnight) {
          lastShiftEndAt = exitDate;
          lastShiftEndedAfterMidnight = true;
        } else if (exitDate && exitDate.getHours() >= HORA_SAIDA_NOTURNA_TARDE) {
          // Saiu tarde da noite, mas antes da meia-noite (ex.: 23:30).
          lastShiftEndAt = exitDate;
          lastShiftEndedLateNight = true;
        } else if (prev && prev.dateStr === workDate) {
          lastShiftEndAt = prev.lastShiftEndAt;
          lastShiftEndedAfterMidnight = prev.lastShiftEndedAfterMidnight;
          lastShiftEndedLateNight = prev.lastShiftEndedLateNight;
        }

        lastGroupByEmployee = {
          dateStr: workDate,
          hadNightShift:
            (prev?.hadNightShift && prev.dateStr === workDate) ||
            isNightShiftEntry ||
            shiftCrossedMidnight,
          lastNightShiftOpen:
            currentPunchIsNightShiftWithoutOut ||
            (!!prev &&
              prev.dateStr === workDate &&
              prev.lastNightShiftOpen &&
              !isNightShiftEntry),
          lastShiftEndAt,
          lastShiftEndedAfterMidnight,
          lastShiftEndedLateNight,
        };
      });

      // Segundo passe (mesma logica da pagina de Ponto): realoca batidas de
      // madrugada para o turno noturno do dia anterior, cobrindo casos que o
      // agrupamento sequencial acima nao pegou.
      const sortedWorkDates = Array.from(punchesByWorkDate.keys()).sort((a, b) =>
        a.localeCompare(b)
      );
      for (let i = 1; i < sortedWorkDates.length; i += 1) {
        const prevDate = sortedWorkDates[i - 1];
        const currDate = sortedWorkDates[i];
        const prevPunches = punchesByWorkDate.get(prevDate);
        const currPunches = punchesByWorkDate.get(currDate);
        if (!prevPunches || !currPunches) continue;

        // "Ultimo turno noturno" do dia anterior: entrada >= 18h OU cruzou
        // a meia-noite.
        const lastNightPunch = [...prevPunches].reverse().find((p) => {
          const inD = p.date_in ? new Date(p.date_in) : null;
          if (inD && inD.getHours() >= 18) return true;
          const outD = p.date_out ? new Date(p.date_out) : null;
          if (
            inD &&
            outD &&
            (inD.getFullYear() !== outD.getFullYear() ||
              inD.getMonth() !== outD.getMonth() ||
              inD.getDate() !== outD.getDate())
          ) {
            return true;
          }
          return false;
        });
        if (!lastNightPunch) continue;

        const lastPunchIn = lastNightPunch.date_in
          ? new Date(lastNightPunch.date_in)
          : null;
        const lastPunchOut = lastNightPunch.date_out
          ? new Date(lastNightPunch.date_out)
          : null;
        const lastShiftCrossedMidnight = !!(
          lastPunchIn &&
          lastPunchOut &&
          (lastPunchIn.getFullYear() !== lastPunchOut.getFullYear() ||
            lastPunchIn.getMonth() !== lastPunchOut.getMonth() ||
            lastPunchIn.getDate() !== lastPunchOut.getDate())
        );

        const punchesToMove = currPunches.filter((p) => {
          const punchDate =
            toLocalDateKey(p.date_in) ?? toLocalDateKey(p.date_out);
          if (punchDate !== currDate) return false;
          const inD = p.date_in ? new Date(p.date_in) : null;
          if (!inD || inD.getHours() >= 12) return false;

          // Caso 1: turno anterior ficou aberto (sem saida) -> realocar.
          if (!lastPunchOut) return true;

          // Caso 2: turno anterior fechou de madrugada e o retorno aconteceu
          // em ate 2h da saida -> continuacao da mesma jornada.
          if (lastShiftCrossedMidnight) {
            const diffHoras =
              (inD.getTime() - lastPunchOut.getTime()) / (1000 * 60 * 60);
            if (diffHoras >= 0 && diffHoras <= 2) return true;
          }
          return false;
        });

        if (punchesToMove.length === 0) continue;

        prevPunches.push(...punchesToMove);
        const remaining = currPunches.filter(
          (p) => !punchesToMove.includes(p)
        );
        if (remaining.length === 0) {
          punchesByWorkDate.delete(currDate);
        } else {
          punchesByWorkDate.set(currDate, remaining);
        }
      }

      const hourValue = position?.hour_value || 0;
      // Adicional noturno de 20% sobre as horas NORMAIS noturnas (a hora normal
      // ja foi paga em "Normal"; aqui entra so o acrescimo de 20%).
      const ADICIONAL_NOTURNO_NORMAL = 0.2;

      // Inclui na iteracao tanto os dias da escala quanto dias com punches
      // (mesmo fora da escala). Dias com punches mas fora da escala viram
      // "Nao escalado" naquele dia especifico. Util para casos de hora extra
      // em dias que nao estavam previstos na escala do funcionario.
      //
      // POREM: se as batidas de um dia NAO escalado foram feitas em OUTRA
      // empresa conhecida (pelo endereco GPS), esse dia pertence ao boletim
      // daquela empresa e nao deve aparecer aqui. Sem isso, um funcionario
      // que trabalha em outra empresa no periodo (ex.: Ourofertil 2) e tem
      // apenas alguns dias de escala neste boletim apareceria como "Nao
      // escalado" nos dias da outra empresa.
      const allDaysSet = new Set<string>(scheduledDays);

      // Dia de atestado sem escala aqui segue a mesma regra do dia batido sem
      // escala: entra como "Nao escalado", a menos que o funcionario esteja
      // escalado em OUTRA empresa nesse dia — ai o dia pertence aquele boletim.
      for (const atestadoDay of atestadoDays) {
        if (atestadoDay < startDate || atestadoDay > endDate) continue;
        if (scheduledDays.has(atestadoDay)) {
          allDaysSet.add(atestadoDay);
          continue;
        }
        const escaladoEmOutraEmpresa =
          otherCompanyScheduledDaysByEmployee
            .get(employeeUuid)
            ?.has(atestadoDay) ?? false;
        if (!escaladoEmOutraEmpresa) {
          allDaysSet.add(atestadoDay);
        }
      }

      for (const workDate of punchesByWorkDate.keys()) {
        if (workDate < startDate || workDate > endDate) continue;

        // Dias escalados nesta empresa sempre entram.
        if (scheduledDays.has(workDate)) {
          allDaysSet.add(workDate);
          continue;
        }

        // Dia NAO escalado nesta empresa: se o funcionario esta escalado em
        // OUTRA empresa neste dia, o dia pertence aquela empresa. Caso
        // contrario entra aqui como "Nao escalado", virando alerta de escala
        // faltando.
        const scheduledElsewhereThisDay =
          otherCompanyScheduledDaysByEmployee
            .get(employeeUuid)
            ?.has(workDate) ?? false;

        if (!scheduledElsewhereThisDay) {
          allDaysSet.add(workDate);
        }
      }
      const sortedDays = Array.from(allDaysSet).sort((a, b) =>
        a.localeCompare(b)
      );

      for (const date of sortedDays) {
        if (date < startDate || date > endDate) continue;

        // Funcionario esta escalado neste dia especifico?
        const isScheduledThisDay = scheduledDays.has(date);

        const dayPunches = punchesByWorkDate.get(date) || [];
        const sortedPunches = [...dayPunches].sort(
          (a, b) =>
            new Date(a.date_in).getTime() - new Date(b.date_in).getTime()
        );

        const entry1 = sortedPunches[0]?.date_in
          ? new Date(sortedPunches[0].date_in).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined;

        const exit1 = sortedPunches[0]?.date_out
          ? new Date(sortedPunches[0].date_out).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined;

        const entry2 = sortedPunches[1]?.date_in
          ? new Date(sortedPunches[1].date_in).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined;

        const exit2 = sortedPunches[1]?.date_out
          ? new Date(sortedPunches[1].date_out).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined;

        const punchesForCalculation = sortedPunches.map((p) => ({
          dateIn: p.date_in,
          dateOut: p.date_out,
        }));

        const horasCalculadas =
          punchesForCalculation.length > 0
            ? calcularHorasPorPeriodo(
                punchesForCalculation,
                date,
                customHolidaySet
              )
            : {
                totalHoras: 0,
                horasNormais: 0,
                adicionalNoturno: 0,
                extra50Diurno: 0,
                extra50Noturno: 0,
                extra100Diurno: 0,
                extra100Noturno: 0,
              };

        const ADICIONAL_NOTURNO_EXTRA = 0.2;

        // Atestado: completa as horas normais ate 8h em dia util. Sabado,
        // domingo e feriado nao geram credito. O trabalhado e mantido.
        const temAtestado =
          atestadoDayKeys.has(`id:${employee.solidesId}|${date}`) ||
          atestadoDayKeys.has(buildAtestadoKey(employee.name, date));
        const horasAtestado = temAtestado
          ? calcularHorasAtestado(
              date,
              horasCalculadas.horasNormais,
              customHolidaySet
            )
          : 0;
        const horasNormaisComAtestado =
          horasCalculadas.horasNormais + horasAtestado;

        // Horarios ficticios do atestado: emendam apos a ultima saida real ou,
        // se o dia nao teve batida, usam o padrao 08:00-12:00 / 13:00-17:00.
        const atestadoPeriodos = buildAtestadoPeriodos(
          horasAtestado,
          exit2 || exit1
        );

        const valorNormal = horasNormaisComAtestado * hourValue;
        const valorAdicionalNoturno =
          horasCalculadas.adicionalNoturno *
          hourValue *
          ADICIONAL_NOTURNO_NORMAL;
        const valorExtra50 =
          horasCalculadas.extra50Diurno * hourValue * 1.5 +
          horasCalculadas.extra50Noturno *
            hourValue *
            1.5 *
            (1 + ADICIONAL_NOTURNO_EXTRA);
        const valorExtra100 =
          horasCalculadas.extra100Diurno * hourValue * 2 +
          horasCalculadas.extra100Noturno *
            hourValue *
            2 *
            (1 + ADICIONAL_NOTURNO_EXTRA);

        const valorTotal =
          valorNormal + valorAdicionalNoturno + valorExtra50 + valorExtra100;

        const dateObj = new Date(date + "T12:00:00Z");
        const dayOfWeek = DAYS_OF_WEEK[dateObj.getDay()];

        boletimData.push({
          employee_id: employee.id,
          employee_name: employee.name,
          work_company:
            employee.isOrphan || !isScheduledThisDay
              ? NO_MAPPED_COMPANY_LABEL
              : companyName,
          position: position?.name || "Sem cargo",
          department: department || "Sem setor",
          date,
          day_of_week: dayOfWeek,
          entry1,
          exit1,
          entry2,
          exit2,
          total_hours: formatarHoras(
            horasCalculadas.totalHoras + horasAtestado
          ),
          normal_hours: formatarHoras(horasNormaisComAtestado),
          atestado_hours: temAtestado
            ? formatarHoras(horasAtestado)
            : undefined,
          atestado_periodos: atestadoPeriodos.length > 0
            ? atestadoPeriodos
            : undefined,
          night_additional: formatarHoras(horasCalculadas.adicionalNoturno),
          extra_50_day: formatarHoras(horasCalculadas.extra50Diurno),
          extra_50_night: formatarHoras(horasCalculadas.extra50Noturno),
          extra_100_day: formatarHoras(horasCalculadas.extra100Diurno),
          extra_100_night: formatarHoras(horasCalculadas.extra100Noturno),
          value: valorTotal,
        });
      }
    }

    boletimData.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;

      const parseTime = (time?: string): number => {
        if (!time || time === "-") return Infinity;
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const timeA = parseTime(a.entry1);
      const timeB = parseTime(b.entry1);

      if (timeA !== timeB) return timeA - timeB;

      return a.employee_name.localeCompare(b.employee_name);
    });

  return boletimData;
}
