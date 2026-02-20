import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";
import { solidesEmployerClient, solidesApiClient } from "@/lib/axios/solides.client";

const CONFIG = {
  REQUEST_DELAY: 500,
  BATCH_SIZE: 100,
  PUNCHES_PAGE_SIZE: 1000,
  EMPLOYEES_PAGE_SIZE: 100,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parseDate(dateStr: string): number {
  const date = new Date(dateStr);
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}

async function retry<T>(fn: () => Promise<T>, maxRetries = CONFIG.MAX_RETRIES): Promise<T> {
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

async function fetchAllEmployees() {
  const employees = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await retry(() =>
      solidesEmployerClient.get("/employee/find-all", {
        params: {
          page,
          size: CONFIG.EMPLOYEES_PAGE_SIZE,
          showFired: 0,
        },
      })
    );

    const data = response.data;
    if (data.content && data.content.length > 0) {
      employees.push(...data.content);
      page++;
      hasMore = !data.last && page <= (data.totalPages || Infinity);
    } else {
      hasMore = false;
    }

    await sleep(CONFIG.REQUEST_DELAY);
  }

  return employees;
}

async function fetchEmployeePunches(
  employeeId: number,
  startDate: string,
  endDate: string,
  status = "APPROVED"
) {
  const punches = [];
  let page = 0;
  let hasMore = true;

  const startTimestamp = parseDate(startDate);
  const endTimestamp = parseDate(endDate);

  while (hasMore) {
    try {
      const response = await retry(() =>
        solidesApiClient.get("punch", {
          params: {
            page,
            size: CONFIG.PUNCHES_PAGE_SIZE,
            startDate: startTimestamp.toString(),
            endDate: endTimestamp.toString(),
            employeeId,
            status,
          },
        })
      );

      const data = response.data;
      if (data.content && data.content.length > 0) {
        punches.push(...data.content);
        page++;
        hasMore = !data.last && page < (data.totalPages || Infinity);
      } else {
        hasMore = false;
      }

      await sleep(CONFIG.REQUEST_DELAY);
    } catch (error: any) {
      if (error.response?.status === 404) {
        hasMore = false;
      } else {
        throw error;
      }
    }
  }

  return punches;
}

function normalizeDate(dateValue: any): string | null {
  if (!dateValue) return null;

  if (typeof dateValue === "string") {
    return dateValue.includes("T")
      ? dateValue.split("T")[0]
      : dateValue.substring(0, 10);
  }

  if (typeof dateValue === "number") {
    const date = new Date(dateValue);
    return formatDate(date);
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
    const timestamp = dateTimeValue > 1e12 ? dateTimeValue : dateTimeValue * 1000;
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

async function saveEmployee(employee: any) {
  const employeeData = {
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
  };

  const { data, error } = await supabaseAdmin
    .from("employees")
    .upsert(employeeData, {
      onConflict: "solides_id",
      ignoreDuplicates: false,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

/** Descrição do motivo de ajuste vinda da API Solides. */
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

/** work = Acidente/Doença do trabalho | non_work = não relacionada ao trabalho. */
function classifyAdjustmentReasonTipo(description: string | null): "work" | "non_work" | null {
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

function normalizePunch(
  punch: any,
  employeeId: number,
  employeeUuid: string,
  employeeName: string,
  employerName: string | null
) {
  let dateStr = null;
  if (punch.date) {
    if (typeof punch.date === "string") {
      dateStr = punch.date.includes("T")
        ? punch.date.split("T")[0]
        : punch.date.substring(0, 10);
    } else if (typeof punch.date === "number") {
      const timestamp = punch.date > 1e12 ? punch.date : punch.date * 1000;
      const date = new Date(timestamp);
      dateStr = formatDate(date);
    }
  } else if (punch.dateIn) {
    if (typeof punch.dateIn === "string") {
      dateStr = punch.dateIn.split("T")[0];
    } else if (typeof punch.dateIn === "number") {
      const timestamp = punch.dateIn > 1e12 ? punch.dateIn : punch.dateIn * 1000;
      const date = new Date(timestamp);
      dateStr = formatDate(date);
    }
  } else if (punch.dateOut) {
    if (typeof punch.dateOut === "string") {
      dateStr = punch.dateOut.split("T")[0];
    } else if (typeof punch.dateOut === "number") {
      const timestamp = punch.dateOut > 1e12 ? punch.dateOut : punch.dateOut * 1000;
      const date = new Date(timestamp);
      dateStr = formatDate(date);
    }
  }

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
    employee_uuid: employeeUuid,
    employee_name: employeeName || punch.employee?.name || "Desconhecido",
    employer_name: employerName || punch.employer?.name || null,
    status: punch.status || "APPROVED",
    adjust,
    adjustment_reason_description: adjustmentReasonDescription,
    adjustment_reason_tipo: adjustmentReasonTipo,
    synced_at: new Date().toISOString(),
  };
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

async function getLastSyncDate(): Promise<Date> {
  const { data, error } = await supabaseAdmin
    .from("sync_status")
    .select("last_sync_at")
    .eq("sync_type", "punches")
    .single();

  if (error || !data) {
    // Se não existe registro, retornar data de 30 dias atrás
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() - 30);
    return defaultDate;
  }

  return new Date(data.last_sync_at);
}

async function updateLastSyncDate() {
  await supabaseAdmin
    .from("sync_status")
    .upsert(
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

async function syncEmployeePunches(
  employee: any,
  startDate: string,
  endDate: string,
  stats: {
    processed: number;
    saved: number;
    errors: number;
    failedEmployees: Array<{ id: number; name: string; error: string }>;
  }
) {
  const employeeId = employee.id;
  const employeeName = employee.name || "Desconhecido";
  const employerName =
    employee.company?.fantasyName || employee.company?.descriptionName || null;

  try {
    let employeeUuid;
    try {
      employeeUuid = await saveEmployee(employee);
    } catch (error: any) {
      const { data: existingEmployee } = await supabaseAdmin
        .from("employees")
        .select("id")
        .eq("solides_id", employeeId)
        .single();

      if (existingEmployee) {
        employeeUuid = existingEmployee.id;
      } else {
        throw new Error(`Não foi possível obter UUID do funcionário ${employeeId}`);
      }
    }

    const approvedPunches = await fetchEmployeePunches(
      employeeId,
      startDate,
      endDate,
      "APPROVED"
    );

    const pendingPunches = await fetchEmployeePunches(
      employeeId,
      startDate,
      endDate,
      "PENDING"
    );

    const allPunches = [...approvedPunches, ...pendingPunches];

    if (allPunches.length === 0) {
      stats.processed++;
      return;
    }

    const normalizedPunches = [];
    for (const punch of allPunches) {
      try {
        const normalized = normalizePunch(
          punch,
          employeeId,
          employeeUuid,
          employeeName,
          employerName
        );
        normalizedPunches.push(normalized);
      } catch (error: any) {
        stats.errors++;
      }
    }

    for (let i = 0; i < normalizedPunches.length; i += CONFIG.BATCH_SIZE) {
      const batch = normalizedPunches.slice(i, i + CONFIG.BATCH_SIZE);
      await savePunchesBatch(batch);
      stats.saved += batch.length;
    }

    stats.processed++;
  } catch (error: any) {
    stats.errors++;
    stats.failedEmployees.push({
      id: employeeId,
      name: employeeName,
      error: error.message || "Erro desconhecido",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Buscar última data de sincronização
    const lastSyncDate = await getLastSyncDate();
    const startDate = formatDate(lastSyncDate);
    const endDate = formatDate(new Date());

    // Buscar funcionários
    const employees = await fetchAllEmployees();

    if (employees.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "Nenhum funcionário encontrado",
          stats: {
            processed: 0,
            saved: 0,
            errors: 0,
            duration: 0,
          },
        },
        { status: 200 }
      );
    }

    const stats = {
      processed: 0,
      saved: 0,
      errors: 0,
      failedEmployees: [] as Array<{ id: number; name: string; error: string }>,
    };

    // Processar cada funcionário
    for (const employee of employees) {
      await syncEmployeePunches(employee, startDate, endDate, stats);
      await sleep(CONFIG.REQUEST_DELAY);
    }

    // Atualizar data da última sincronização apenas se não houve erros críticos
    if (stats.errors === 0 || stats.saved > 0) {
      await updateLastSyncDate();
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json(
      {
        success: true,
        message: "Sincronização concluída",
        stats: {
          processed: stats.processed,
          saved: stats.saved,
          errors: stats.errors,
          failedEmployees: stats.failedEmployees,
          duration: parseFloat(duration),
          startDate,
          endDate,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro na sincronização:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro desconhecido na sincronização",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const lastSyncDate = await getLastSyncDate();
    return NextResponse.json(
      {
        lastSyncAt: lastSyncDate.toISOString(),
        lastSyncDate: formatDate(lastSyncDate),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Erro ao buscar última sincronização",
      },
      { status: 500 }
    );
  }
}
