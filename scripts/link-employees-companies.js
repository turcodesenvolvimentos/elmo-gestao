try {
  import("dotenv").config({ path: ".env" });
} catch (e) {}

import { createClient } from "@supabase/supabase-js";

function log(message, type = "info") {
  const timestamp = new Date().toISOString();
  const prefix =
    {
      info: "ℹ",
      success: "✓",
      error: "✗",
      warning: "⚠",
      progress: "→",
    }[type] || "ℹ";

  console.log(`[${timestamp}] ${prefix} ${message}`);
}

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

async function linkEmployeesToCompanies() {
  try {
    log("Iniciando vinculação de funcionários às empresas...", "info");

    log("Buscando funcionários...", "progress");
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("id, solides_id, name");

    if (employeesError) {
      throw employeesError;
    }

    if (!employees || employees.length === 0) {
      log("Nenhum funcionário encontrado.", "warning");
      return;
    }

    log(`Encontrados ${employees.length} funcionários.`, "success");

    log("Buscando empresas...", "progress");
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, address");

    if (companiesError) {
      throw companiesError;
    }

    if (!companies || companies.length === 0) {
      log("Nenhuma empresa encontrada.", "warning");
      return;
    }

    log(`Encontradas ${companies.length} empresas.`, "success");

    const addressToCompany = new Map();
    companies.forEach((company) => {
      if (company.address) {
        addressToCompany.set(company.address.trim(), company.id);
      }
    });

    log(
      `Mapa de endereços criado com ${addressToCompany.size} empresas.`,
      "success"
    );

    let totalLinks = 0;
    let totalCreated = 0;
    let totalSkipped = 0;

    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      const progress = `[${i + 1}/${employees.length}]`;

      log(
        `${progress} Processando funcionário: ${employee.name} (ID: ${employee.solides_id})`,
        "progress"
      );

      const { data: punches, error: punchesError } = await supabase
        .from("punches")
        .select("location_in_address, location_out_address")
        .eq("employee_uuid", employee.id);

      if (punchesError) {
        log(
          `  Erro ao buscar pontos do funcionário ${employee.name}: ${punchesError.message}`,
          "error"
        );
        continue;
      }

      if (!punches || punches.length === 0) {
        log(`  Nenhum ponto encontrado para ${employee.name}.`, "warning");
        continue;
      }

      const uniqueAddresses = new Set();
      punches.forEach((punch) => {
        if (punch.location_in_address && punch.location_in_address.trim()) {
          uniqueAddresses.add(punch.location_in_address.trim());
        }
        if (punch.location_out_address && punch.location_out_address.trim()) {
          uniqueAddresses.add(punch.location_out_address.trim());
        }
      });

      if (uniqueAddresses.size === 0) {
        log(
          `  Nenhum endereço válido encontrado para ${employee.name}.`,
          "warning"
        );
        continue;
      }

      log(
        `  Encontrados ${uniqueAddresses.size} endereço(s) único(s).`,
        "info"
      );

      for (const address of uniqueAddresses) {
        const companyId = addressToCompany.get(address);

        if (!companyId) {
          log(
            `  ⚠ Endereço não encontrado em nenhuma empresa: "${address}"`,
            "warning"
          );
          continue;
        }

        const { data: existingLink, error: checkError } = await supabase
          .from("employee_companies")
          .select("id")
          .eq("employee_id", employee.id)
          .eq("company_id", companyId)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          log(`  Erro ao verificar vínculo: ${checkError.message}`, "error");
          continue;
        }

        if (existingLink) {
          log(`  Vínculo já existe: ${employee.name} <-> ${address}`, "info");
          totalSkipped++;
          continue;
        }

        const { error: insertError } = await supabase
          .from("employee_companies")
          .insert({
            employee_id: employee.id,
            company_id: companyId,
          });

        if (insertError) {
          log(`  Erro ao criar vínculo: ${insertError.message}`, "error");
          continue;
        }

        log(`  ✓ Vínculo criado: ${employee.name} <-> ${address}`, "success");
        totalCreated++;
        totalLinks++;
      }
    }

    log("", "info");
    log("=".repeat(60), "info");
    log("RESUMO DA VINCULAÇÃO", "info");
    log("=".repeat(60), "info");
    log(`Total de funcionários processados: ${employees.length}`, "info");
    log(`Total de vínculos criados: ${totalCreated}`, "success");
    log(`Total de vínculos já existentes: ${totalSkipped}`, "info");
    log(`Total de vínculos processados: ${totalLinks + totalSkipped}`, "info");
    log("=".repeat(60), "info");
    log("Vinculação concluída com sucesso!", "success");
  } catch (error) {
    log(`Erro fatal: ${error.message}`, "error");
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  linkEmployeesToCompanies()
    .then(() => {
      log("Script finalizado.", "success");
      process.exit(0);
    })
    .catch((error) => {
      log(`Erro ao executar script: ${error.message}`, "error");
      console.error(error);
      process.exit(1);
    });
}

module.exports = { linkEmployeesToCompanies };
