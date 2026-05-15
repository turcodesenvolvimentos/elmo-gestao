"use client";

import * as React from "react";
import {
  Home,
  Utensils,
  Clock,
  File,
  LogOut,
  Building,
  CalendarDays,
  Users,
  type LucideIcon,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Permission, hasAnyPermission, isAdmin } from "@/types/permissions";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import logo from "@/assets/logo.png";
import Image from "next/image";

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  permissions: Permission[];
  badge?: string | number;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Geral",
    items: [
      {
        title: "Início",
        url: "/home",
        icon: Home,
        permissions: [],
      },
    ],
  },
  {
    label: "Operacional",
    items: [
      {
        title: "Ponto",
        url: "/ponto",
        icon: Clock,
        permissions: [Permission.PONTO],
      },
      {
        title: "Vale Alimentação",
        url: "/vale-alimentacao",
        icon: Utensils,
        permissions: [Permission.VALE_ALIMENTACAO],
      },
      {
        title: "Escalas",
        url: "/escala",
        icon: CalendarDays,
        permissions: [Permission.ESCALAS],
      },
      {
        title: "Boletim",
        url: "/boletim",
        icon: File,
        permissions: [Permission.BOLETIM],
      },
    ],
  },
  {
    label: "Cadastros",
    items: [
      {
        title: "Empresas & Funcionários",
        url: "/empresas-e-funcionarios",
        icon: Building,
        permissions: [Permission.COMPANIES, Permission.EMPLOYEES],
      },
      {
        title: "Usuários",
        url: "/usuarios",
        icon: Users,
        permissions: [Permission.USERS],
      },
    ],
  },
];

function getInitials(name?: string | null): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function shortName(name?: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function roleLabel(permissions: string[] | undefined): string {
  if (!permissions || permissions.length === 0) return "Usuário";
  if (isAdmin(permissions)) return "Administrador";
  return "Usuário";
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleNavigation = (url: string) => {
    router.push(url);
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  // Filter nav items by user permissions while keeping group structure.
  const visibleGroups = React.useMemo(() => {
    const userPermissions = session?.user?.permissions;
    const userIsAdmin = userPermissions ? isAdmin(userPermissions) : false;

    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.permissions.length === 0) return true;
          if (!userPermissions) return false;
          if (userIsAdmin) return true;
          return hasAnyPermission(userPermissions, item.permissions);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [session?.user?.permissions]);

  const userName = session?.user?.name ?? "";
  const initials = getInitials(userName);
  const displayName = shortName(userName);
  const role = roleLabel(session?.user?.permissions);

  const isActive = (url: string) => {
    if (!pathname) return false;
    if (url === "/home") return pathname === "/home" || pathname === "/";
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  return (
    <Sidebar {...props} collapsible="icon">
      <SidebarHeader className="pb-2">
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg group-data-[collapsible=icon]:hidden">
            <Image src={logo} alt="Elmosys" className="size-8 object-contain" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">Elmosys</span>
            <span className="text-muted-foreground truncate text-xs">v0.2.0</span>
          </div>
          <SidebarTrigger className="text-muted-foreground hover:text-foreground size-7 shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() => handleNavigation(item.url)}
                        tooltip={item.title}
                        isActive={active}
                        className={cn(
                          "data-[active=true]:bg-green-100 data-[active=true]:text-green-900 data-[active=true]:font-medium hover:bg-green-50",
                        )}
                      >
                        {item.icon && <item.icon className="size-4" />}
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      {item.badge !== undefined && (
                        <SidebarMenuBadge className="bg-amber-100 text-amber-800">
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-green-100 text-sm font-semibold text-green-900">
            {initials}
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">
              {displayName || "Usuário"}
            </span>
            <span className="text-muted-foreground truncate text-xs">{role}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="Sair"
            title="Sair"
            className="text-muted-foreground hover:text-foreground size-8 group-data-[collapsible=icon]:hidden"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
