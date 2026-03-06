/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Script de sincronização massiva de pontos da Sólides para o Supabase
 *
 * Sincroniza todos os pontos de todos os funcionários (ativos e inativos) de uma data inicial até hoje.
 * Por padrão inclui funcionários demitidos/inativos; use --only-active para sincronizar só ativos.
 *
 * Uso:
 *   node scripts/sync-punches.js [--start-date=YYYY-MM-DD] [--end-date=YYYY-MM-DD] [--employee-id=ID] [--only-active]
 *
 * Exemplos:
 *   node scripts/sync-punches.js --start-date=2025-01-01
 *   node scripts/sync-punches.js --start-date=2025-01-01 --end-date=2025-11-24
 *   node scripts/sync-punches.js --start-date=2025-01-01 --employee-id=123
 *   node scripts/sync-punches.js --start-date=2025-01-01 --only-active
 */

// Tentar carregar variáveis de ambiente do .env
try {
  require("dotenv").config({ path: ".env" });
} catch {
  // dotenv não disponível, usar variáveis do ambiente
}
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

// Configurações
const SOLIDES_ENDPOINTS = {
  employer: "https://employer.tangerino.com.br/",
  api: "https://api.tangerino.com.br/api/",
};

const CONFIG = {
  // Rate limiting: delay entre requisições (ms)
  REQUEST_DELAY: 500,
  // Tamanho do lote para inserção no Supabase
  BATCH_SIZE: 100,
  // Tamanho da página ao buscar pontos
  PUNCHES_PAGE_SIZE: 1000,
  // Tamanho da página ao buscar funcionários
  EMPLOYEES_PAGE_SIZE: 100,
  // Número de tentativas em caso de erro
  MAX_RETRIES: 3,
  // Delay entre tentativas (ms)
  RETRY_DELAY: 2000,
};

// Clientes
const solidesEmployerClient = axios.create({
  baseURL: SOLIDES_ENDPOINTS.employer,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Authorization: process.env.SOLIDES_API_TOKEN,
  },
});

const solidesApiClient = axios.create({
  baseURL: SOLIDES_ENDPOINTS.api,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Authorization: process.env.SOLIDES_API_TOKEN,
  },
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Utilitários
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function parseDate(dateStr) {
  const date = new Date(dateStr);
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}

function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix =
    {
      info: "ℹ️",
      success: "✅",
      error: "❌",
      warning: "⚠️",
      progress: "🔄",
    }[type] || "ℹ️";

  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Função de retry
async function retry(fn, maxRetries = CONFIG.MAX_RETRIES) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      log(
        `Tentativa ${i + 1}/${maxRetries} falhou. Tentando novamente em ${
          CONFIG.RETRY_DELAY
        }ms...`,
        "warning"
      );
      await sleep(CONFIG.RETRY_DELAY);
    }
  }
}

// Buscar todos os funcionários (ativos e inativos/demitidos)
async function fetchAllEmployees(options = { includeFired: true }) {
  const { includeFired } = options;
  log(
    includeFired
      ? "Buscando lista de funcionários (ativos e inativos)..."
      : "Buscando lista de funcionários (apenas ativos)..."
  );
  const employees = [];
  const seenIds = new Set();

  const fetchPage = async (showFired, label) => {
    let page = 1;
    let hasMore = true;
    let total = 0;

    while (hasMore) {
      const response = await retry(() =>
        solidesEmployerClient.get("/employee/find-all", {
          params: {
            page,
            size: CONFIG.EMPLOYEES_PAGE_SIZE,
            showFired: showFired,
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
        total += data.content.length;
        log(
          `  ${label} - Página ${page}/${data.totalPages || "?"}: ${
            data.content.length
          } (Total único: ${employees.length})`
        );
        page++;
        hasMore = !data.last && page <= (data.totalPages || Infinity);
      } else {
        hasMore = false;
      }

      await sleep(CONFIG.REQUEST_DELAY);
    }
    return total;
  };

  try {
    await fetchPage(0, "Ativos");
    if (includeFired) {
      await fetchPage(1, "Inativos/Demitidos");
    }
  } catch (error) {
    log(
      `Erro ao buscar funcionários: ${error.message}`,
      "error"
    );
    throw error;
  }

  log(`Total de funcionários encontrados: ${employees.length}`, "success");
  return employees;
}

// Buscar pontos de um funcionário em um período
async function fetchEmployeePunches(
  employeeId,
  startDate,
  endDate,
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
        log(
          `  Funcionário ${employeeId} - Página ${page + 1}: ${
            data.content.length
          } pontos (Total: ${punches.length})`
        );
        page++;
        hasMore = !data.last && page < (data.totalPages || Infinity);
      } else {
        hasMore = false;
      }

      await sleep(CONFIG.REQUEST_DELAY);
    } catch (error) {
      if (error.response?.status === 404) {
        // Funcionário pode não ter pontos no período
        hasMore = false;
      } else {
        log(
          `Erro ao buscar pontos do funcionário ${employeeId} (página ${page}): ${error.message}`,
          "error"
        );
        throw error;
      }
    }
  }

  return punches;
}

// Função auxiliar para normalizar datas
function normalizeDate(dateValue) {
  if (!dateValue) return null;

  // Se já for string, processar normalmente
  if (typeof dateValue === "string") {
    return dateValue.includes("T")
      ? dateValue.split("T")[0]
      : dateValue.substring(0, 10);
  }

  // Se for número (timestamp), converter para Date
  if (typeof dateValue === "number") {
    const date = new Date(dateValue);
    return formatDate(date);
  }

  // Se for objeto Date
  if (dateValue instanceof Date) {
    return formatDate(dateValue);
  }

  // Tentar converter para string e processar
  try {
    const dateStr = String(dateValue);
    return dateStr.includes("T")
      ? dateStr.split("T")[0]
      : dateStr.substring(0, 10);
  } catch {
    return null;
  }
}

// Normalizar e salvar funcionário
async function saveEmployee(employee) {
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

  try {
    const { data, error } = await supabase
      .from("employees")
      .upsert(employeeData, {
        onConflict: "solides_id",
        ignoreDuplicates: false,
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id; // Retorna o UUID do funcionário
  } catch (error) {
    log(`Erro ao salvar funcionário ${employee.id}: ${error.message}`, "error");
    throw error;
  }
}

// Função auxiliar para normalizar timestamps/datas para ISO string
function normalizeDateTime(dateTimeValue) {
  if (!dateTimeValue) return null;

  // Se já for string ISO, retornar como está
  if (typeof dateTimeValue === "string") {
    return dateTimeValue;
  }

  // Se for número (timestamp), converter para Date e depois para ISO string
  if (typeof dateTimeValue === "number") {
    // Verificar se é timestamp em milissegundos ou segundos
    const timestamp =
      dateTimeValue > 1e12 ? dateTimeValue : dateTimeValue * 1000;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }

  // Se for objeto Date
  if (dateTimeValue instanceof Date) {
    if (isNaN(dateTimeValue.getTime())) {
      return null;
    }
    return dateTimeValue.toISOString();
  }

  // Tentar converter para string
  try {
    return String(dateTimeValue);
  } catch {
    return null;
  }
}

/** Descrição do motivo de ajuste vinda da API Solides. */
function getAdjustmentReasonDescription(punch) {
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
function classifyAdjustmentReasonTipo(description) {
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

// Normalizar e preparar dados para inserção
function normalizePunch(
  punch,
  employeeId,
  employeeUuid,
  employeeName,
  employerName
) {
  // Extrair data do ponto (prioridade: date > dateIn > dateOut)
  let dateStr = null;
  if (punch.date) {
    if (typeof punch.date === "string") {
      dateStr = punch.date.includes("T")
        ? punch.date.split("T")[0]
        : punch.date.substring(0, 10);
    } else if (typeof punch.date === "number") {
      // Se for timestamp, converter para data
      const timestamp = punch.date > 1e12 ? punch.date : punch.date * 1000;
      const date = new Date(timestamp);
      dateStr = formatDate(date);
    }
  } else if (punch.dateIn) {
    if (typeof punch.dateIn === "string") {
      dateStr = punch.dateIn.split("T")[0];
    } else if (typeof punch.dateIn === "number") {
      const timestamp =
        punch.dateIn > 1e12 ? punch.dateIn : punch.dateIn * 1000;
      const date = new Date(timestamp);
      dateStr = formatDate(date);
    }
  } else if (punch.dateOut) {
    if (typeof punch.dateOut === "string") {
      dateStr = punch.dateOut.split("T")[0];
    } else if (typeof punch.dateOut === "number") {
      const timestamp =
        punch.dateOut > 1e12 ? punch.dateOut : punch.dateOut * 1000;
      const date = new Date(timestamp);
      dateStr = formatDate(date);
    }
  }

  if (!dateStr) {
    throw new Error(`Ponto ${punch.id} não tem data válida`);
  }

  // Validar que temos pelo menos um horário
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
    employee_id: employeeId, // ID da Sólides (mantido para compatibilidade)
    employee_uuid: employeeUuid, // UUID do funcionário na tabela employees
    employee_name: employeeName || punch.employee?.name || "Desconhecido",
    employer_name: employerName || punch.employer?.name || null,
    status: punch.status || "APPROVED",
    adjust,
    adjustment_reason_description: adjustmentReasonDescription,
    adjustment_reason_tipo: adjustmentReasonTipo,
    synced_at: new Date().toISOString(),
  };
}

// Salvar pontos no Supabase (upsert em lote)
async function savePunchesBatch(punches) {
  if (punches.length === 0) return;

  try {
    const { error } = await supabase.from("punches").upsert(punches, {
      onConflict: "solides_id",
      ignoreDuplicates: false,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    log(
      `Erro ao salvar lote de ${punches.length} pontos: ${error.message}`,
      "error"
    );
    throw error;
  }
}

// Processar sincronização de um funcionário
async function syncEmployeePunches(employee, startDate, endDate, stats) {
  const employeeId = employee.id;
  const employeeName = employee.name || "Desconhecido";
  const employerName =
    employee.company?.fantasyName || employee.company?.descriptionName || null;

  try {
    log(
      `Processando funcionário: ${employeeName} (ID: ${employeeId})`,
      "progress"
    );

    // Primeiro, salvar/atualizar o funcionário na tabela employees
    let employeeUuid;
    try {
      employeeUuid = await saveEmployee(employee);
      log(`  Funcionário salvo/atualizado (UUID: ${employeeUuid})`, "progress");
    } catch (error) {
      log(`  Erro ao salvar funcionário: ${error.message}`, "error");
      // Tentar buscar o UUID existente
      const { data: existingEmployee } = await supabase
        .from("employees")
        .select("id")
        .eq("solides_id", employeeId)
        .single();

      if (existingEmployee) {
        employeeUuid = existingEmployee.id;
        log(
          `  Usando funcionário existente (UUID: ${employeeUuid})`,
          "warning"
        );
      } else {
        throw new Error(
          `Não foi possível obter UUID do funcionário ${employeeId}`
        );
      }
    }

    // Buscar pontos aprovados
    const approvedPunches = await fetchEmployeePunches(
      employeeId,
      startDate,
      endDate,
      "APPROVED"
    );

    // Buscar pontos pendentes
    const pendingPunches = await fetchEmployeePunches(
      employeeId,
      startDate,
      endDate,
      "PENDING"
    );

    const allPunches = [...approvedPunches, ...pendingPunches];

    if (allPunches.length === 0) {
      log(`  Nenhum ponto encontrado para ${employeeName}`, "warning");
      stats.processed++;
      return;
    }

    // Normalizar e preparar dados
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
      } catch (error) {
        log(
          `  Erro ao normalizar ponto ${punch.id}: ${error.message}`,
          "warning"
        );
        stats.errors++;
      }
    }

    // Salvar em lotes
    for (let i = 0; i < normalizedPunches.length; i += CONFIG.BATCH_SIZE) {
      const batch = normalizedPunches.slice(i, i + CONFIG.BATCH_SIZE);
      await savePunchesBatch(batch);
      stats.saved += batch.length;
    }

    log(
      `  ✅ ${employeeName}: ${normalizedPunches.length} pontos sincronizados`,
      "success"
    );
    stats.processed++;
  } catch (error) {
    log(
      `  ❌ Erro ao processar funcionário ${employeeName} (ID: ${employeeId}): ${error.message}`,
      "error"
    );
    stats.errors++;
    stats.failedEmployees.push({
      id: employeeId,
      name: employeeName,
      error: error.message,
    });
  }
}

// Função principal
async function main() {
  // Parse de argumentos
  const args = process.argv.slice(2);
  const options = {
    startDate: "2025-01-01",
    endDate: formatDate(new Date()),
    employeeId: null,
    onlyActive: false,
  };

  args.forEach((arg) => {
    if (arg.startsWith("--start-date=")) {
      options.startDate = arg.split("=")[1];
    } else if (arg.startsWith("--end-date=")) {
      options.endDate = arg.split("=")[1];
    } else if (arg.startsWith("--employee-id=")) {
      options.employeeId = parseInt(arg.split("=")[1]);
    } else if (arg === "--only-active") {
      options.onlyActive = true;
    }
  });

  log("=".repeat(60));
  log("🚀 Iniciando sincronização de pontos", "info");
  log("=".repeat(60));
  log(`Período: ${options.startDate} até ${options.endDate}`);
  log(
    `Funcionários: ${options.onlyActive ? "apenas ativos" : "ativos e inativos"}`
  );
  if (options.employeeId) {
    log(`Funcionário específico: ID ${options.employeeId}`);
  }
  log("");

  // Validação de variáveis de ambiente
  if (!process.env.SOLIDES_API_TOKEN) {
    log("❌ SOLIDES_API_TOKEN não configurado", "error");
    process.exit(1);
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    log("❌ Variáveis do Supabase não configuradas", "error");
    process.exit(1);
  }

  const stats = {
    processed: 0,
    saved: 0,
    errors: 0,
    failedEmployees: [],
    startTime: Date.now(),
  };

  try {
    // Buscar funcionários
    let employees;
    if (options.employeeId) {
      // Se especificou um ID, buscar todos e filtrar
      log(`Buscando funcionário específico (ID: ${options.employeeId})...`);
      const allEmployees = await fetchAllEmployees({
        includeFired: !options.onlyActive,
      });
      const employee = allEmployees.find(
        (emp) => emp.id === options.employeeId
      );
      if (!employee) {
        log(`Funcionário com ID ${options.employeeId} não encontrado`, "error");
        process.exit(1);
      }
      employees = [employee];
      log(`Funcionário encontrado: ${employee.name}`, "success");
    } else {
      employees = await fetchAllEmployees({
        includeFired: !options.onlyActive,
      });
    }

    if (employees.length === 0) {
      log("Nenhum funcionário encontrado", "warning");
      process.exit(0);
    }

    log(`\nSincronizando pontos de ${employees.length} funcionário(s)...\n`);

    // Processar cada funcionário
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      log(`[${i + 1}/${employees.length}]`, "progress");
      await syncEmployeePunches(
        employee,
        options.startDate,
        options.endDate,
        stats
      );
      await sleep(CONFIG.REQUEST_DELAY);
    }

    // Resumo final
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
    log("\n" + "=".repeat(60));
    log("📊 Resumo da sincronização", "info");
    log("=".repeat(60));
    log(`Funcionários processados: ${stats.processed}/${employees.length}`);
    log(`Pontos salvos: ${stats.saved}`);
    log(`Erros: ${stats.errors}`);
    log(`Tempo total: ${duration}s`);
    log("");

    if (stats.failedEmployees.length > 0) {
      log("Funcionários com erro:", "warning");
      stats.failedEmployees.forEach((emp) => {
        log(`  - ${emp.name} (ID: ${emp.id}): ${emp.error}`, "error");
      });
    }

    if (stats.errors === 0 && stats.failedEmployees.length === 0) {
      log("✅ Sincronização concluída com sucesso!", "success");
    } else {
      log("⚠️ Sincronização concluída com alguns erros", "warning");
    }
  } catch (error) {
    log(`\n❌ Erro fatal: ${error.message}`, "error");
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Executar
if (require.main === module) {
  main().catch((error) => {
    log(`Erro não tratado: ${error.message}`, "error");
    process.exit(1);
  });
}

module.exports = { main };
