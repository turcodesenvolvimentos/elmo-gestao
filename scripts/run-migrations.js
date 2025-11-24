import fs from "fs";
import path from "path";

const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

function getMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Diretório não encontrado: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("❌ Nenhuma migration encontrada!");
    process.exit(1);
  }

  return files;
}

function combineMigrations() {
  const migrations = getMigrations();

  console.log("📦 Migrations encontradas:\n");
  migrations.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file}`);
  });

  console.log("\n" + "=".repeat(60));
  console.log("SQL COMBINADO (copie e cole no SQL Editor do Supabase):");
  console.log("=".repeat(60) + "\n");

  migrations.forEach((file) => {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`-- ============================================`);
    console.log(`-- Migration: ${file}`);
    console.log(`-- ============================================\n`);
    console.log(sql);
    console.log("\n");
  });
}

combineMigrations();
