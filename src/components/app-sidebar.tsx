"use client";

import * as React from "react";
import {
  Home,
  Utensils,
  Clock,
  Users,
  File,
  LogOut,
  Building,
  CalendarDays,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
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
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="pointer-events-none hover:bg-transparent cursor-default"
            >
              <a href="#">
                <div className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image src={logo} alt="image" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Elmosys</span>
                  <span className="">v0.1.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {filteredNavItems.map((item) => (
              <Collapsible key={item.title} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      {item.icon && <item.icon className="size-4" />}
                      <a href={item.url}>{item.title}</a>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto pb-5">
        <SidebarGroup>
          <SidebarMenu>
            <Collapsible className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton onClick={handleLogout}>
                    <LogOut className="size-4" />
                    <span>Sair</span>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>
      </div>
      <SidebarRail />
    </Sidebar>
  );
}
