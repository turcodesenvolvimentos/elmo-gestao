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
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

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

const data = {
  navMain: [
    {
      title: "Inicio",
      url: "/home",
      icon: Home,
    },
    {
      title: "Empresas e Funcionários",
      url: "/empresas-e-funcionarios",
      icon: Building,
    },
    {
      title: "Ponto",
      url: "/ponto",
      icon: Clock,
    },
    {
      title: "Vale Alimentação",
      url: "/vale-alimentacao",
      icon: Utensils,
    },
    {
      title: "Boletim",
      url: "/boletim",
      icon: File,
    },
    {
      title: "Escalas",
      url: "/escala",
      icon: CalendarDays,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();

  const handleNavigation = (url: string) => {
    router.push(url);
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

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
            {data.navMain.map((item) => (
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