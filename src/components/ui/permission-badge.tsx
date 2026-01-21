"use client";

import { Permission, PERMISSION_LABELS } from "@/types/permissions";
import { Badge } from "@/components/ui/badge";

interface PermissionBadgeProps {
  permission: Permission;
}

export function PermissionBadge({ permission }: PermissionBadgeProps) {
  const isAdmin = permission === Permission.ADMIN;
  
  return (
    <Badge 
      variant={isAdmin ? "default" : "secondary"} 
      className="text-xs"
    >
      {PERMISSION_LABELS[permission]}
    </Badge>
  );
}

interface PermissionBadgesProps {
  permissions: string[];
}

export function PermissionBadges({ permissions }: PermissionBadgesProps) {
  if (!permissions || permissions.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">Sem permissões</span>
    );
  }

  // Se tem admin, mostra apenas o badge de admin
  if (permissions.includes(Permission.ADMIN)) {
    return (
      <PermissionBadge permission={Permission.ADMIN} />
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {permissions.map((permission) => (
        <PermissionBadge
          key={permission}
          permission={permission as Permission}
        />
      ))}
    </div>
  );
}
