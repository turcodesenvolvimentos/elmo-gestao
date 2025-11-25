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
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";

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
      url: "#",
      icon: Utensils,
    },
    {
      title: "Boletim",
      url: "#",
      icon: File,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

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
            {data.navMain.map((item) => (
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
