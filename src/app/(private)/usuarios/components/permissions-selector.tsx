"use client";

import { Permission, ALL_PERMISSIONS, PERMISSION_LABELS, isAdmin } from "@/types/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface PermissionsSelectorProps {
  selectedPermissions: Permission[];
  onChange: (permissions: Permission[]) => void;
}

export function PermissionsSelector({
  selectedPermissions,
  onChange,
}: PermissionsSelectorProps) {
  const isUserAdmin = isAdmin(selectedPermissions);

  const handleAdminToggle = (checked: boolean) => {
    if (checked) {
      // Se marcar admin, adiciona admin e remove todas as outras permissões
      onChange([Permission.ADMIN]);
    } else {
      // Se desmarcar admin, remove admin
      onChange(selectedPermissions.filter((p) => p !== Permission.ADMIN));
    }
  };

  const handlePermissionToggle = (permission: Permission) => {
    // Se tentar marcar uma permissão específica e já for admin, remove admin primeiro
    if (isUserAdmin && !selectedPermissions.includes(permission)) {
      onChange([permission]);
      return;
    }

    if (selectedPermissions.includes(permission)) {
      onChange(selectedPermissions.filter((p) => p !== permission));
    } else {
      onChange([...selectedPermissions, permission]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissões</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Checkbox Admin */}
        <div className="flex items-center space-x-2 p-3 rounded-md hover:bg-accent transition-colors bg-muted/50 mb-4">
          <Checkbox
            id="admin"
            checked={isUserAdmin}
            onCheckedChange={handleAdminToggle}
          />
          <Label
            htmlFor="admin"
            className="text-sm font-medium cursor-pointer flex-1"
          >
            {PERMISSION_LABELS[Permission.ADMIN]}
          </Label>
        </div>

        {!isUserAdmin && (
          <>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ALL_PERMISSIONS.map((permission) => (
                <div
                  key={permission}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent transition-colors"
                >
                  <Checkbox
                    id={permission}
                    checked={selectedPermissions.includes(permission)}
                    onCheckedChange={() => handlePermissionToggle(permission)}
                    disabled={isUserAdmin}
                  />
                  <Label
                    htmlFor={permission}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {PERMISSION_LABELS[permission]}
                  </Label>
                </div>
              ))}
            </div>
          </>
        )}

        {selectedPermissions.length === 0 && (
          <p className="text-sm text-muted-foreground mt-4">
            Nenhuma permissão selecionada. O usuário terá acesso apenas à página inicial.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
