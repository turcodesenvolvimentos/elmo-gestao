/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from "@/lib/db/client";
import {
  solidesEmployerClient,
  solidesApiClient,
} from "@/lib/axios/solides.client";

const CONFIG = {
  REQUEST_DELAY: 200,
  BATCH_SIZE: 500,
  PUNCHES_PAGE_SIZE: 1000,
  EMPLOYEES_PAGE_SIZE: 100,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
};

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface EmployeeInfo {
  uuid: string | null;
  name: string;
  employerName: string | null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateToTimestamp(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return formatDate(new Date(y, m - 1, d + days, 12, 0, 0, 0));
}

async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = CONFIG.MAX_RETRIES
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(CONFIG.RETRY_DELAY);
    }
  }
  throw new Error("Retry failed");
}

export function buildMonthChunks(
  startDate: string,
  endDate: string
): Array<{ start: string; end: string }> {
  const chunks: Array<{ start: string; end: string }> = [];
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const cursor = new Date(sy, sm - 1, sd);
  const limit = new Date(
    Number(endDate.slice(0, 4)),
    Number(endDate.slice(5, 7)) - 1,
    Number(endDate.slice(8, 10))
  );

  while (cursor <= limit) {
    const monthEnd = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0
    );
    const chunkEnd = monthEnd > limit ? limit : monthEnd;
    chunks.push({ start: formatDate(cursor), end: formatDate(chunkEnd) });
    cursor.setTime(
      new Date(chunkEnd.getFullYear(), chunkEnd.getMonth(), chunkEnd.getDate() + 1).getTime()
    );
  }

  return chunks;
}

async function fetchAllEmployees() {
  const employees: any[] = [];
  const seenIds = new Set<number>();

  const fetchPages = async (showFired: number) => {
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const response = await retry(() =>
        solidesEmployerClient.get("/employee/find-all", {
          params: {
            page,
            size: CONFIG.EMPLOYEES_PAGE_SIZE,
            showFired,
          },
        })
      );

      const data = response.data;
      if (data.content && data.content.length > 0) {
        for (const emp of data.content) {
          if (!seenIds.has(emp.id)) {
            seenIds.add(emp.id);
            employees.push(emp);
          }
        }
        page++;
        hasMore = !data.last && page <= (data.totalPages || Infinity);
      } else {
        hasMore = false;
      }
      await sleep(CONFIG.REQUEST_DELAY);
    }
  };

  await fetchPages(0);
  await fetchPages(1);
  return employees;
}

function normalizeDate(dateValue: any): string | null {
  if (!dateValue) return null;

  if (typeof dateValue === "string") {
    return dateValue.includes("T")
      ? dateValue.split("T")[0]
      : dateValue.substring(0, 10);
  }

  if (typeof dateValue === "number") {
    return formatDate(new Date(dateValue));
  }

  if (dateValue instanceof Date) {
    return formatDate(dateValue);
  }

  try {
    const dateStr = String(dateValue);
    return dateStr.includes("T")
      ? dateStr.split("T")[0]
      : dateStr.substring(0, 10);
  } catch {
    return null;
  }
}

function normalizeDateTime(dateTimeValue: any): string | null {
  if (!dateTimeValue) return null;

  if (typeof dateTimeValue === "string") {
    return dateTimeValue;
  }

  if (typeof dateTimeValue === "number") {
    const timestamp =
      dateTimeValue > 1e12 ? dateTimeValue : dateTimeValue * 1000;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }

  if (dateTimeValue instanceof Date) {
    if (isNaN(dateTimeValue.getTime())) {
      return null;
    }
    return dateTimeValue.toISOString();
  }

  try {
    return String(dateTimeValue);
  } catch {
    return null;
  }
}

async function saveEmployees(
  employees: any[]
): Promise<Map<number, EmployeeInfo>> {
  const info = new Map<number, EmployeeInfo>();

  for (const employee of employees) {
    info.set(employee.id, {
      uuid: null,
      name: employee.name || "Desconhecido",
      employerName:
        employee.company?.fantasyName ||
        employee.company?.descriptionName ||
        null,
    });
  }

  const rows = employees.map((employee) => ({
    solides_id: employee.id,
    external_id: employee.externalId || null,
    name: employee.name || "Desconhecido",
    social_name: employee.socialName || null,
    cpf: employee.cpf || null,
    email: employee.email || null,
    phone: employee.phone || null,
    pis: employee.pis || null,
    gender: employee.gender || null,
    admission_date: normalizeDate(employee.admissionDate),
    resignation_date: normalizeDate(employee.resignationDate),
    fired: employee.fired || false,
    status: employee.status || null,
    synced_at: new Date().toISOString(),
  }));

  for (let i = 0; i < rows.length; i += CONFIG.BATCH_SIZE) {
    const batch = rows.slice(i, i + CONFIG.BATCH_SIZE);
    const { data, error } = await supabaseAdmin
      .from("employees")
      .upsert(batch, { onConflict: "solides_id", ignoreDuplicates: false })
      .select("id, solides_id");

    if (error) throw error;

    for (const row of data || []) {
      const entry = info.get(row.solides_id);
      if (entry) entry.uuid = row.id;
    }
  }

  const missing = [...info.entries()]
    .filter(([, entry]) => !entry.uuid)
    .map(([solidesId]) => solidesId);

  if (missing.length > 0) {
    const { data } = await supabaseAdmin
      .from("employees")
      .select("id, solides_id")
      .in("solides_id", missing);

    for (const row of data || []) {
      const entry = info.get(row.solides_id);
      if (entry) entry.uuid = row.id;
    }
  }

  return info;
}

function getAdjustmentReasonDescription(punch: any): string | null {
  const desc =
    punch.adjustmentReason?.description ??
    punch.adjustmentReasonRecord?.adjustmentReason?.description;
  if (desc && String(desc).trim()) return String(desc).trim();
  const origem = punch.adjustmentReasonRecord?.origem;
  if (origem && String(origem).trim()) return String(origem).trim();
  const just = punch.justification?.description?.trim();
  return just || null;
}

function classifyAdjustmentReasonTipo(
  description: string | null
): "work" | "non_work" | null {
  if (!description || !String(description).trim()) return null;
  const n = String(description)
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "")
    .toLowerCase();
  if (n.includes("nao relacionad")) return "non_work";
  if (
    (n.includes("acidente") || n.includes("doenca")) &&
    n.includes("trabalho")
  ) {
    return "work";
  }
  return null;
}

function punchDateKey(punch: any): string | null {
  const fromValue = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "string") {
      return value.includes("T") ? value.split("T")[0] : value.substring(0, 10);
    }
    if (typeof value === "number") {
      const timestamp = value > 1e12 ? value : value * 1000;
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : formatDate(date);
    }
    return null;
  };

  return fromValue(punch.date) ?? fromValue(punch.dateIn) ?? fromValue(punch.dateOut);
}

function normalizePunch(punch: any, employee: EmployeeInfo | undefined) {
  const employeeId = punch.employee?.id;
  if (typeof employeeId !== "number") {
    throw new Error(`Ponto ${punch.id} não tem funcionário`);
  }

  const dateStr = punchDateKey(punch);
  if (!dateStr) {
    throw new Error(`Ponto ${punch.id} não tem data válida`);
  }

  if (!punch.dateIn && !punch.dateOut) {
    throw new Error(`Ponto ${punch.id} não tem horários de entrada ou saída`);
  }

  const adjust = punch.adjust === true;
  const adjustmentReasonDescription = adjust
    ? getAdjustmentReasonDescription(punch)
    : null;
  const adjustmentReasonTipo = adjustmentReasonDescription
    ? classifyAdjustmentReasonTipo(adjustmentReasonDescription)
    : null;

  return {
    solides_id: punch.id,
    date: dateStr,
    date_in: normalizeDateTime(punch.dateIn),
    date_out: normalizeDateTime(punch.dateOut),
    location_in_address: punch.locationIn?.address || null,
    location_out_address: punch.locationOut?.address || null,
    employee_id: employeeId,
    employee_uuid: employee?.uuid ?? null,
    employee_name: employee?.name || punch.employee?.name || "Desconhecido",
    employer_name: employee?.employerName ?? null,
    status: punch.status || "APPROVED",
    adjust,
    adjustment_reason_description: adjustmentReasonDescription,
    adjustment_reason_tipo: adjustmentReasonTipo,
    synced_at: new Date().toISOString(),
  };
}

async function fetchPunchesInPeriod(
  startDate: string,
  endDate: string
): Promise<any[]> {
  const startTs = dateToTimestamp(shiftDate(startDate, -1));
  const endTs = dateToTimestamp(shiftDate(endDate, 1));
  const collected: any[] = [];

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await retry(() =>
        solidesApiClient.get("punch", {
          params: {
            page,
            size: CONFIG.PUNCHES_PAGE_SIZE,
            startDate: startTs.toString(),
            endDate: endTs.toString(),
            showFired: true,
          },
        })
      );

      const data = response.data;
      const content: any[] = data?.content || [];
      collected.push(...content);
      page++;
      hasMore =
        content.length > 0 &&
        !data?.last &&
        page <= (data?.totalPages ?? Infinity);

      await sleep(CONFIG.REQUEST_DELAY);
    } catch (error: any) {
      const httpStatus = error?.response?.status ?? error?.status;

      // A Solides devolve 404 quando se pede uma pagina alem da ultima, e por
      // isso o 404 encerra a paginacao. Mas 404 ja na primeira pagina nao e
      // "acabou": ou o modulo de batidas esta fora do ar, ou a rota mudou.
      // Tratar esse caso como sucesso fazia a sincronizacao terminar dizendo
      // "0 batidas" e o banco congelar sem ninguem perceber.
      if (httpStatus === 404 && page > 1) {
        hasMore = false;
        break;
      }

      if (httpStatus === 404) {
        throw new Error(
          "A API de batidas da Solides respondeu 404 (api.tangerino.com.br). " +
            "O modulo de ponto esta indisponivel ou mudou de endereco. " +
            "Nenhuma batida foi lida e o banco nao foi alterado."
        );
      }

      throw error;
    }
  }

  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const raw of collected) {
    const key =
      raw?.id != null
        ? `id:${raw.id}`
        : `c:${raw?.employee?.id ?? ""}|${raw?.dateIn ?? ""}|${raw?.dateOut ?? ""}|${raw?.date ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(raw);
  }

  return deduped;
}

async function savePunchesBatch(punches: any[]) {
  if (punches.length === 0) return;

  const { error } = await supabaseAdmin.from("punches").upsert(punches, {
    onConflict: "solides_id",
    ignoreDuplicates: false,
  });

  if (error) {
    throw error;
  }
}

async function removeStalePunches(
  startDate: string,
  endDate: string,
  solidesIdsPresentes: Set<number>
): Promise<number> {
  const obsoletos: number[] = [];
  const PAGE = 1000;
  let from = 0;
  let totalNoBanco = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("punches")
      .select("solides_id")
      .not("solides_id", "is", null)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("solides_id", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    totalNoBanco += data.length;
    for (const row of data) {
      if (!solidesIdsPresentes.has(row.solides_id)) {
        obsoletos.push(row.solides_id);
      }
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (totalNoBanco > 0 && solidesIdsPresentes.size < totalNoBanco * 0.5) {
    return 0;
  }

  for (let i = 0; i < obsoletos.length; i += CONFIG.BATCH_SIZE) {
    const batch = obsoletos.slice(i, i + CONFIG.BATCH_SIZE);
    const { error } = await supabaseAdmin
      .from("punches")
      .delete()
      .in("solides_id", batch);

    if (error) throw error;
  }

  return obsoletos.length;
}

export async function getLastSyncDate(): Promise<Date> {
  const { data, error } = await supabaseAdmin
    .from("sync_status")
    .select("last_sync_at")
    .eq("sync_type", "punches")
    .maybeSingle();

  if (error || !data?.last_sync_at) {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() - 30);
    defaultDate.setHours(0, 0, 0, 0);
    return defaultDate;
  }

  return new Date(data.last_sync_at);
}

export async function updateLastSyncDate() {
  await supabaseAdmin.from("sync_status").upsert(
    {
      sync_type: "punches",
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "sync_type",
    }
  );
}

export interface SyncPunchesResult {
  savedPunches: number;
  removedPunches: number;
  employees: number;
  errors: number;
  startDate: string;
  endDate: string;
}

export async function sincronizarPunches(
  startDate: string,
  endDate: string,
  onProgress?: (passo: number, total: number) => void,
): Promise<SyncPunchesResult> {
  const hoje = formatDate(new Date());
  const chunks = buildMonthChunks(startDate, endDate);
  const totalSteps = chunks.length + 1;
  let step = 0;

  const avanca = () => {
    step++;
    onProgress?.(step, totalSteps);
  };

  const employees = await fetchAllEmployees();
  const employeeInfo = await saveEmployees(employees);
  avanca();

  let savedPunches = 0;
  let removedPunches = 0;
  let errors = 0;

  for (const chunk of chunks) {
    const raw = await fetchPunchesInPeriod(chunk.start, chunk.end);

    const normalized: any[] = [];
    const idsPresentes = new Set<number>();

    for (const punch of raw) {
      try {
        normalized.push(
          normalizePunch(punch, employeeInfo.get(punch.employee?.id)),
        );
        if (typeof punch.id === "number") idsPresentes.add(punch.id);
      } catch {
        errors++;
      }
    }

    for (let i = 0; i < normalized.length; i += CONFIG.BATCH_SIZE) {
      const batch = normalized.slice(i, i + CONFIG.BATCH_SIZE);
      await savePunchesBatch(batch);
      savedPunches += batch.length;
    }

    removedPunches += await removeStalePunches(
      chunk.start,
      chunk.end,
      idsPresentes,
    );

    avanca();
  }

  if (endDate >= hoje) {
    await updateLastSyncDate();
  }

  return {
    savedPunches,
    removedPunches,
    employees: employees.length,
    errors,
    startDate,
    endDate,
  };
}
