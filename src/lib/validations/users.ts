import { z } from "zod";
import { Permission, ALL_PERMISSIONS } from "@/types/permissions";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Schema para criação de usuário
 */
export const createUserSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .regex(emailRegex, "Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres"),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(100, "Senha deve ter no máximo 100 caracteres"),
  permissions: z
    .array(z.nativeEnum(Permission))
    .default([])
    .refine(
      (permissions) => {
        // Verifica se todas as permissões são válidas
        return permissions.every((p) => ALL_PERMISSIONS.includes(p));
      },
      {
        message: "Permissões inválidas",
      }
    ),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Schema para atualização de usuário
 */
export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional(),
  email: z
    .string()
    .regex(emailRegex, "Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres")
    .optional(),
  password: z
    .string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(100, "Senha deve ter no máximo 100 caracteres")
    .optional(),
  permissions: z
    .array(z.nativeEnum(Permission))
    .refine(
      (permissions) => {
        if (!permissions) return true;
        return permissions.every((p) => ALL_PERMISSIONS.includes(p));
      },
      {
        message: "Permissões inválidas",
      }
    )
    .optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
