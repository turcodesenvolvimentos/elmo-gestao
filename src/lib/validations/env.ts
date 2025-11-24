import { z } from "zod";

const envSchema = z.object({
  // NextAuth
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET é obrigatório"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.url(
    "NEXT_PUBLIC_SUPABASE_URL deve ser uma URL válida"
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatório"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY é obrigatório"),

  // Solides API
  SOLIDES_API_TOKEN: z.string().min(1, "SOLIDES_API_TOKEN é obrigatório"),
});

export function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((err: z.core.$ZodIssue) => err.path.join("."))
        .join(", ");
      throw new Error(
        `❌ Variáveis de ambiente inválidas ou faltando: ${missingVars}\n` +
          `Por favor, verifique seu arquivo .env`
      );
    }
    throw error;
  }
}
