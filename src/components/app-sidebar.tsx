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
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Permission, hasAnyPermission, isAdmin } from "@/types/permissions";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import logo from "@/assets/logo.png";
import Image from "next/image";

const navItems = [
  {
    title: "Inicio",
    url: "/home",
    icon: Home,
    permissions: [] as Permission[], // Sempre visível
  },
  {
    title: "Usuários",
    url: "/usuarios",
    icon: Users,
    permissions: [Permission.USERS],
  },
  {
    title: "Empresas e Funcionários",
    url: "/empresas-e-funcionarios",
    icon: Building,
    permissions: [Permission.COMPANIES, Permission.EMPLOYEES],
  },
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
    title: "Boletim",
    url: "/boletim",
    icon: File,
    permissions: [Permission.BOLETIM],
  },
  {
    title: "Escalas",
    url: "/escala",
    icon: CalendarDays,
    permissions: [Permission.ESCALAS],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const { data: session } = useSession();

  const handleNavigation = (url: string) => {
    router.push(url);
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  // Filtrar itens do menu baseado nas permissões do usuário
  const filteredNavItems = React.useMemo(() => {
    if (!session?.user?.permissions) {
      // Se não houver permissões, mostrar apenas Home
      return navItems.filter((item) => item.permissions.length === 0);
    }

    const userPermissions = session.user.permissions;
    const isUserAdmin = isAdmin(userPermissions);

    return navItems.filter((item) => {
      // Se não requer permissões, sempre mostrar
      if (item.permissions.length === 0) {
        return true;
      }

      // Se for admin, mostrar tudo
      if (isUserAdmin) {
        return true;
      }

      // Verificar se tem pelo menos uma das permissões necessárias
      return hasAnyPermission(userPermissions, item.permissions);
    });
  }, [session?.user?.permissions]);

  return (
    <Sidebar {...props} collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="pointer-events-none hover:bg-transparent cursor-default"
            >
              <div className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Image src={logo} alt="image" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Elmosys</span>
                <span className="">v0.1.0</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {filteredNavItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  onClick={() => handleNavigation(item.url)}
                  tooltip={item.title}
                >
                  {item.icon && <item.icon className="size-4" />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto pb-5">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
                <LogOut className="size-4" />
                <span>Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </div>
      <SidebarRail />
    </Sidebar>
  );
}
