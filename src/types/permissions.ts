/**
 * Permissões disponíveis no sistema
 */
export enum Permission {
  // Permissão especial de administrador (acesso total)
  ADMIN = "admin",

  // Gerenciamento de usuários
  USERS = "users",

  // Gerenciamento de empresas
  COMPANIES = "companies",

  // Gerenciamento de funcionários
  EMPLOYEES = "employees",

  // Gerenciamento de ponto
  PONTO = "ponto",

  // Gerenciamento de vale alimentação
  VALE_ALIMENTACAO = "vale_alimentacao",

  // Gerenciamento de boletim
  BOLETIM = "boletim",

  // Gerenciamento de escalas
  ESCALAS = "escalas",
}

/**
 * Tipo para array de permissões do usuário
 */
export type UserPermissions = Permission[];

/**
 * Todas as permissões disponíveis (exceto admin, que é especial)
 */
export const ALL_PERMISSIONS: Permission[] = Object.values(Permission).filter(
  (p) => p !== Permission.ADMIN
);

/**
 * Verifica se o usuário tem uma permissão específica
 * Se o usuário tem permissão "admin", tem acesso a tudo
 */
export function hasPermission(
  userPermissions: string[] | undefined,
  permission: Permission
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  // Se tem admin, tem acesso a tudo
  if (userPermissions.includes(Permission.ADMIN)) {
    return true;
  }
  return userPermissions.includes(permission);
}

/**
 * Verifica se o usuário tem pelo menos uma das permissões especificadas
 * Se o usuário tem permissão "admin", tem acesso a tudo
 */
export function hasAnyPermission(
  userPermissions: string[] | undefined,
  permissions: Permission[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  // Se tem admin, tem acesso a tudo
  if (userPermissions.includes(Permission.ADMIN)) {
    return true;
  }
  return permissions.some((permission) => userPermissions.includes(permission));
}

/**
 * Verifica se o usuário tem todas as permissões especificadas
 */
export function hasAllPermissions(
  userPermissions: string[] | undefined,
  permissions: Permission[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  return permissions.every((permission) => userPermissions.includes(permission));
}

/**
 * Verifica se o usuário é admin (tem a permissão "admin")
 */
export function isAdmin(userPermissions: string[] | undefined): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  return userPermissions.includes(Permission.ADMIN);
}

/**
 * Mapeamento de permissões para labels legíveis
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  [Permission.ADMIN]: "Administrador (Acesso Total)",
  [Permission.USERS]: "Usuários",
  [Permission.COMPANIES]: "Empresas",
  [Permission.EMPLOYEES]: "Funcionários",
  [Permission.PONTO]: "Ponto",
  [Permission.VALE_ALIMENTACAO]: "Vale Alimentação",
  [Permission.BOLETIM]: "Boletim",
  [Permission.ESCALAS]: "Escalas",
};
