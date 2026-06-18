import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { solidesApiClient } from "@/lib/axios/solides.client";
import { calcularHorasPorPeriodo, formatarHoras } from "@/lib/ponto-calculator";
import { Permission } from "@/types/permissions";
import { checkPermission } from "@/lib/auth/permissions";
import type { BoletimData } from "@/services/boletim.service";
import {
  getCompanyNameFromRawAddresses,
  NO_MAPPED_COMPANY_LABEL,
} from "@/utils/company-mapping";

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
  location_in_address?: string | null;
  location_out_address?: string | null;
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
  locationIn?: { address?: string | null } | null;
  locationOut?: { address?: string | null } | null;
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

  let page = 0;
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
        page < (data?.totalPages ?? Infinity);
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

  return collected;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: 401 }
    );
  }

  if (!checkPermission(session, Permission.BOLETIM)) {
    return NextResponse.json(
      { error: "Sem permissão para gerenciar boletim" },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("company_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!companyId) {
      return NextResponse.json(
        { error: "ID da empresa é obrigatório" },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Data inicial e final são obrigatórias" },
        { status: 400 }
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Datas devem estar no formato YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: "Data final deve ser maior ou igual à data inicial" },
        { status: 400 }
      );
    }

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

    const employeeSolidesIds = Array.from(
      new Set(Array.from(employeeMap.values()).map((e) => e.solidesId))
    ).filter((id): id is number => typeof id === "number");

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
    const solidesPunches = await fetchPunchesFromSolides(
      contextStartDate,
      contextEndDate,
    );

    const { data: customHolidayRows } = await supabaseAdmin
      .from("custom_holidays")
      .select("holiday_date");

    const customHolidaySet = new Set<string>(
      (customHolidayRows || []).map(
        (r: { holiday_date: string }) => r.holiday_date
      )
    );

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
        location_in_address: raw.locationIn?.address ?? null,
        location_out_address: raw.locationOut?.address ?? null,
      });
    }

    const solidesIdsWithPunches = Array.from(punchesByEmployee.keys());

    if (solidesIdsWithPunches.length > 0) {
      const { data: allEscalasInPeriod } = await supabaseAdmin
        .from("escalas")
        .select("employee_id")
        .lte("start_date", endDate)
        .or(`end_date.is.null,end_date.gte.${startDate}`);

      const scheduledEmployeeUuids = new Set<string>(
        (allEscalasInPeriod || []).map(
          (e: { employee_id: string }) => e.employee_id
        )
      );

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

      const orphanEmployees = ((employeesWithPunches || []) as EmpInfo[]).filter(
        (emp) => !scheduledEmployeeUuids.has(emp.id)
      );

      for (const orphan of orphanEmployees) {
        if (!employeeMap.has(orphan.id)) {
          employeeMap.set(orphan.id, {
            id: orphan.id,
            name: orphan.name,
            solidesId: orphan.solides_id,
            isOrphan: true,
          });
        }

        if (!scheduledDaysByEmployee.has(orphan.id)) {
          scheduledDaysByEmployee.set(orphan.id, new Set<string>());
        }
        const orphanDays = scheduledDaysByEmployee.get(orphan.id)!;

        const orphanPunches = punchesByEmployee.get(orphan.solides_id) || [];
        for (const p of orphanPunches) {
          const day =
            toLocalDateKey(p.date_in) ??
            toLocalDateKey(p.date_out) ??
            toLocalDateKey(p.date);
          if (day && day >= startDate && day <= endDate) {
            orphanDays.add(day);
          }
        }
      }
    }

    const boletimData: BoletimData[] = [];

    for (const [employeeUuid, employee] of employeeMap.entries()) {
      const scheduledDays = scheduledDaysByEmployee.get(employeeUuid);
      if (!scheduledDays || scheduledDays.size === 0) continue;

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

      let lastGroupByEmployee:
        | {
            dateStr: string;
            hadNightShift: boolean;
            lastNightShiftOpen: boolean;
            lastShiftEndAt: Date | null;
            lastShiftEndedAfterMidnight: boolean;
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
            // e o retorno foi em ate CONTINUACAO_NOTURNA_MAX_HORAS horas.
            if (
              lastGroupByEmployee!.lastShiftEndedAfterMidnight &&
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
        if (exitDate && shiftCrossedMidnight) {
          lastShiftEndAt = exitDate;
          lastShiftEndedAfterMidnight = true;
        } else if (prev && prev.dateStr === workDate) {
          lastShiftEndAt = prev.lastShiftEndAt;
          lastShiftEndedAfterMidnight = prev.lastShiftEndedAfterMidnight;
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
        };
      });

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
      for (const [workDate, dayPunches] of punchesByWorkDate.entries()) {
        if (workDate < startDate || workDate > endDate) continue;

        // Dias escalados nesta empresa sempre entram.
        if (scheduledDays.has(workDate)) {
          allDaysSet.add(workDate);
          continue;
        }

        // Dia NAO escalado: decide pelo local das batidas.
        let pertenceAEstaEmpresa = false;
        let pertenceAOutraEmpresa = false;
        for (const p of dayPunches) {
          const empresaDoPunch = getCompanyNameFromRawAddresses(
            p.location_in_address,
            p.location_out_address,
          );
          if (empresaDoPunch === NO_MAPPED_COMPANY_LABEL) continue;
          if (empresaDoPunch === companyName) {
            pertenceAEstaEmpresa = true;
          } else {
            pertenceAOutraEmpresa = true;
          }
        }

        // Inclui se as batidas sao desta empresa OU se nenhum endereco foi
        // mapeado (hora extra nao planejada no proprio local / local
        // desconhecido). Pula apenas quando pertencem a outra empresa.
        if (pertenceAEstaEmpresa || !pertenceAOutraEmpresa) {
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

        // Adicional noturno de 20% aplicado SOMENTE nas horas extras noturnas,
        // de forma multiplicativa: primeiro a hora extra, depois +20% sobre o
        // resultado (ordem indiferente, é comutativo):
        //   extra 50% noturna  -> 1,5 × 1,20 = 1,80
        //   extra 100% noturna -> 2,0 × 1,20 = 2,40
        // As horas extras diurnas mantêm 1,5 e 2,0 normalmente.
        const ADICIONAL_NOTURNO_EXTRA = 0.2;

        const valorNormal = horasCalculadas.horasNormais * hourValue;
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
              ? "Não escalado"
              : companyName,
          position: position?.name || "Sem cargo",
          department: department || "Sem setor",
          date,
          day_of_week: dayOfWeek,
          entry1,
          exit1,
          entry2,
          exit2,
          total_hours: formatarHoras(horasCalculadas.totalHoras),
          normal_hours: formatarHoras(horasCalculadas.horasNormais),
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

    return NextResponse.json({ data: boletimData }, { status: 200 });
  } catch (error: unknown) {
    console.error("Erro ao buscar dados do boletim:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar dados do boletim",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
