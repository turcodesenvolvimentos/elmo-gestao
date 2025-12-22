import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadEnv() {
  try {
    const dotenv = await import("dotenv");
    dotenv.config({ path: ".env" });
  } catch (e) {}
}

const migrationsDir = path.join(
  __dirname,
  "..",
  "src",
  "lib",
  "db",
  "migrations"
);

function getMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Diretório não encontrado: ${migrationsDir}`);
    process.exit(1);
  }

  const allFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"));

  if (allFiles.length === 0) {
    console.error("❌ Nenhuma migration encontrada!");
    process.exit(1);
  }

  const executionOrder = [
    "create_users_table.sql",
    "create_companies_table.sql",
    "create_employees_table.sql",
    "create_punches_table.sql",
    "create_employee_companies_table.sql",
    "update_punches_table_with_foreign_keys.sql",
    "create_shifts_table.sql",
    "create_escalas_table.sql",
    "create_boletim_exports_table.sql",
  ];

  const orderedFiles = executionOrder.filter((file) => allFiles.includes(file));

  const remainingFiles = allFiles
    .filter((file) => !executionOrder.includes(file))
    .sort();

  return [...orderedFiles, ...remainingFiles];
}

async function executeMigration(filename, client) {
  const filePath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(filePath, "utf-8");

  console.log(`\n📄 Executando: ${filename}`);
  console.log("─".repeat(60));

  try {
    await client.query(sql);
    console.log(`✅ ${filename} executada com sucesso!`);
    return true;
  } catch (error) {
    if (
      error.message.includes("already exists") ||
      error.message.includes("duplicate key") ||
      error.code === "42P07" ||
      error.code === "42710"
    ) {
      console.log(`⚠️  ${filename} - alguns objetos já existem (ignorando)`);
      return true;
    }

    console.error(`❌ Erro ao executar ${filename}:`);
    console.error(`   ${error.message}`);
    throw error;
  }
}

async function runMigrations() {
  await loadEnv();

  console.log("🚀 Iniciando execução de migrations\n");
  console.log("=".repeat(60));

  const migrations = getMigrations();

  console.log(`\n📦 ${migrations.length} migration(s) encontrada(s):\n`);
  migrations.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file}`);
  });

  let pg;
  try {
    pg = await import("pg");
  } catch (e) {
    console.error("\n❌ Biblioteca 'pg' não encontrada!");
    console.error("   Instale com: yarn add pg");
    console.error("   Ou use: yarn migrations --print para ver o SQL\n");
    process.exit(1);
  }

  let connectionString = process.env.SUPABASE_DB_URL;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  let projectRef = null;
  let client = null;

  if (connectionString) {
    console.log("\n🔗 Usando SUPABASE_DB_URL do .env");
    const safeUrl = connectionString.replace(/:[^:@]+@/, ":***@");
    console.log(`   Connection string: ${safeUrl}`);

    if (
      connectionString.includes("@db.") &&
      connectionString.includes(".supabase.co:5432")
    ) {
      console.log(
        "   ⚠️  Detectado: Direct connection (pode não funcionar em redes IPv4)"
      );
      console.log(
        "   💡 Se falhar, use Session Pooler ao invés de Direct connection"
      );
      console.log(
        "   💡 No Supabase: Connection String > Method > Session Pooler\n"
      );
    } else {
      console.log("\n");
    }
  } else {
    if (!supabaseUrl) {
      console.error("❌ NEXT_PUBLIC_SUPABASE_URL não configurado no .env");
      process.exit(1);
    }

    if (!dbPassword) {
      console.log(
        "\n⚠️  Para executar migrations automaticamente, você precisa:"
      );
      console.log(
        "   Opção 1 (Recomendada): Configurar SUPABASE_DB_URL no .env"
      );
      console.log("      (Connection string completa do Supabase)");
      console.log("   Opção 2: Configurar SUPABASE_DB_PASSWORD no .env");
      console.log("      (Senha do banco de dados PostgreSQL)");
      console.log("\n💡 Como obter:");
      console.log("   - Dashboard Supabase > Settings > Database");
      console.log("   - Copie a 'Connection string' (URI mode) completa");
      console.log(
        "   - Adicione no .env como: SUPABASE_DB_URL=postgresql://..."
      );
      console.log(
        "\n📋 Alternativa: Use --print para ver o SQL e executar manualmente"
      );
      console.log("   yarn migrations --print\n");
      return;
    }

    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!urlMatch) {
      console.error("❌ URL do Supabase inválida");
      console.error("   Formato esperado: https://xxxxx.supabase.co");
      console.error(`   Recebido: ${supabaseUrl}`);
      process.exit(1);
    }

    projectRef = urlMatch[1];

    connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(
      dbPassword
    )}@aws-0-us-east-2.pooler.supabase.com:5432/postgres`;

    console.log(`\n🔗 Usando Session Pooler (IPv4 compatible - Ohio):`);
    console.log(
      `   postgresql://postgres.${projectRef}:***@aws-0-us-east-2.pooler.supabase.com:5432/postgres\n`
    );
  }

  client = new pg.Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log("\n🔌 Conectando ao banco de dados...");
    await client.connect();
    console.log("✅ Conectado!\n");

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      try {
        await executeMigration(migration, client);
        successCount++;
      } catch {
        errorCount++;
        console.error(`\n❌ Falha ao executar ${migration}`);
        console.error(`   Continuando com as próximas migrations...\n`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 Resumo:");
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log("=".repeat(60) + "\n");

    if (errorCount > 0) {
      console.log("⚠️  Algumas migrations falharam. Verifique os erros acima.");
      process.exit(1);
    } else {
      console.log("✅ Todas as migrations foram executadas com sucesso!");
    }
  } catch (error) {
    console.error("\n❌ Erro ao conectar ao banco de dados:");
    console.error(`   ${error.message}`);
    console.error("\n💡 Soluções:");

    if (process.env.SUPABASE_DB_URL) {
      console.error("   Você está usando SUPABASE_DB_URL. Verifique:");
      console.error("   1. A connection string está completa e correta");
      console.error("   2. A senha está correta (não é a SERVICE_ROLE_KEY)");
      console.error("   3. O formato está correto:");
      console.error(
        "      postgresql://postgres:[SENHA]@db.[PROJECT].supabase.co:5432/postgres"
      );
    } else {
      console.error(
        "   1. Verifique se SUPABASE_DB_PASSWORD está correto no .env"
      );
      console.error("   2. A senha do banco é diferente da SERVICE_ROLE_KEY");
    }

    console.error("\n📋 RECOMENDAÇÃO: Use --print para executar manualmente");
    console.error("   yarn migrations --print");
    console.error("   Depois copie o SQL e execute no SQL Editor do Supabase");
    console.error("   (Dashboard > SQL Editor > New query)\n");
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

function printMigrations() {
  const migrations = getMigrations();

  migrations.forEach((file) => {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    const cleanSql = sql.trim();

    console.log(cleanSql);
    console.log("\n");
  });
}

const args = process.argv.slice(2);
const shouldPrint = args.includes("--print") || args.includes("-p");

if (shouldPrint) {
  printMigrations();
} else {
  runMigrations().catch((error) => {
    console.error("\n❌ Erro fatal:", error.message);
    console.error(
      "\n💡 Dica: Use --print para ver o SQL e executar manualmente"
    );
    process.exit(1);
  });
}
