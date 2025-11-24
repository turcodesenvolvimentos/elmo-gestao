import type { NextConfig } from "next";

// Validação básica de variáveis críticas no build
const requiredEnvVars = [
  "AUTH_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SOLIDES_API_TOKEN",
];

const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.error("\n❌ ERRO: Variáveis de ambiente faltando:\n");
  missingVars.forEach((key) => console.error(`   - ${key}`));
  console.error("\nPor favor, configure todas as variáveis no arquivo .env\n");
  console.error("Veja .env.example para referência.\n");
  process.exit(1);
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
