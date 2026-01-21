import { Session } from "next-auth";
import { Permission, hasPermission, hasAnyPermission, isAdmin } from "@/types/permissions";

/**
 * Verifica se a sessão do usuário tem uma permissão específica
 */
export function checkPermission(
  session: Session | null,
  permission: Permission
): boolean {
  if (!session?.user?.permissions) {
    return false;
  }
  return hasPermission(session.user.permissions, permission);
}

/**
 * Verifica se a sessão do usuário tem pelo menos uma das permissões especificadas
 */
export function checkAnyPermission(
  session: Session | null,
  permissions: Permission[]
): boolean {
  if (!session?.user?.permissions) {
    return false;
  }
  return hasAnyPermission(session.user.permissions, permissions);
}

/**
 * Verifica se o usuário da sessão é admin
 */
export function checkIsAdmin(session: Session | null): boolean {
  if (!session?.user?.permissions) {
    return false;
  }
  return isAdmin(session.user.permissions);
}

/**
 * Requer que o usuário tenha uma permissão específica, caso contrário lança erro
 */
export function requirePermission(
  session: Session | null,
  permission: Permission
): void {
  if (!checkPermission(session, permission)) {
    throw new Error(`Permissão necessária: ${permission}`);
  }
}

/**
 * Requer que o usuário tenha pelo menos uma das permissões especificadas
 */
export function requireAnyPermission(
  session: Session | null,
  permissions: Permission[]
): void {
  if (!checkAnyPermission(session, permissions)) {
    throw new Error(`Uma das permissões é necessária: ${permissions.join(", ")}`);
  }
}

/**
 * Mapeamento de rotas para permissões necessárias
 */
export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  "/usuarios": [Permission.USERS],
  "/empresas-e-funcionarios": [
    Permission.COMPANIES,
    Permission.EMPLOYEES,
  ],
  "/ponto": [Permission.PONTO],
  "/vale-alimentacao": [Permission.VALE_ALIMENTACAO],
  "/boletim": [Permission.BOLETIM],
  "/escala": [Permission.ESCALAS],
};

/**
 * Verifica se o usuário tem permissão para acessar uma rota específica
 */
export function canAccessRoute(
  session: Session | null,
  pathname: string
): boolean {
  // Se for admin, tem acesso a tudo
  if (checkIsAdmin(session)) {
    return true;
  }

  // Verifica se a rota requer permissões específicas
  const requiredPermissions = ROUTE_PERMISSIONS[pathname];
  if (!requiredPermissions) {
    // Rotas sem permissões específicas são acessíveis por todos os usuários autenticados
    return true;
  }

  return checkAnyPermission(session, requiredPermissions);
}
