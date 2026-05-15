"use client";

import {
  Utensils,
  Clock,
  Users,
  File,
  Building,
  CalendarDays,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Permission, hasAnyPermission, isAdmin } from "@/types/permissions";
import { useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/use-employees";
import { useEscalas } from "@/hooks/use-escalas";
import { useLastSyncDate } from "@/hooks/use-sync";

type BadgeTone = "amber" | "neutral" | "green";

interface MenuCard {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  permissions: Permission[];
  badge?: { label: string; tone?: BadgeTone };
}

const badgeToneClasses: Record<BadgeTone, string> = {
  amber: "bg-amber-100 text-amber-800",
  neutral: "bg-muted text-muted-foreground",
  green: "bg-green-100 text-green-800",
};

function formatRelativeSync(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (sameDay) return `hoje, ${time}`;
  if (isYesterday) return `ontem, ${time}`;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Page() {
  const { data: session } = useSession();

  // Data sources powering the card badges and footer status.
  const { data: employeesData } = useEmployees({ page: 1, size: 1 });
  const { data: escalasData } = useEscalas();
  const { data: lastSync } = useLastSyncDate();

  const totalEmployees = employeesData?.totalElements ?? 0;

  // Count distinct employees with an active escala today (start_date <= today
  // <= end_date OR end_date is open). Computed on the client because the API
  // returns the full list and we don't want to thread a date filter through it.
  const employeesScheduledToday = useMemo(() => {
    const escalas = escalasData?.escalas ?? [];
    if (escalas.length === 0) return 0;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const ids = new Set<string>();
    for (const e of escalas) {
      const starts = e.start_date <= today;
      const open = !e.end_date || e.end_date >= today;
      if (starts && open) ids.add(e.employee_id);
    }
    return ids.size;
  }, [escalasData?.escalas]);

  const menuCards = useMemo<MenuCard[]>(
    () => [
      {
        href: "/ponto",
        icon: Clock,
        label: "Ponto",
        description: "Folhas de ponto, ajustes e horas extras",
        permissions: [Permission.PONTO],
      },
      {
        href: "/vale-alimentacao",
        icon: Utensils,
        label: "Vale Alimentação",
        description: "Cálculo de VR e ajuda de custo por dia",
        permissions: [Permission.VALE_ALIMENTACAO],
      },
      {
        href: "/escala",
        icon: CalendarDays,
        label: "Escalas",
        description: "Planejamento e atribuição por empresa",
        permissions: [Permission.ESCALAS],
        badge:
          employeesScheduledToday > 0
            ? {
                label: `${employeesScheduledToday} ${
                  employeesScheduledToday === 1
                    ? "funcionário escalado hoje"
                    : "funcionários escalados hoje"
                }`,
                tone: "neutral",
              }
            : undefined,
      },
      {
        href: "/boletim",
        icon: File,
        label: "Boletim",
        description: "Relatórios consolidados em PDF",
        permissions: [Permission.BOLETIM],
      },
      {
        href: "/empresas-e-funcionarios",
        icon: Building,
        label: "Empresas & Funcionários",
        description: "Cadastro, feriados e cargos",
        permissions: [Permission.COMPANIES, Permission.EMPLOYEES],
        badge:
          totalEmployees > 0
            ? { label: `${totalEmployees} funcionários`, tone: "neutral" }
            : undefined,
      },
      {
        href: "/usuarios",
        icon: Users,
        label: "Usuários",
        description: "Permissões e acessos do sistema",
        permissions: [Permission.USERS],
      },
    ],
    [totalEmployees, employeesScheduledToday],
  );

  const userPermissions = session?.user?.permissions;
  const visibleCards = useMemo(() => {
    if (!userPermissions) return [];
    if (isAdmin(userPermissions)) return menuCards;
    return menuCards.filter((c) => hasAnyPermission(userPermissions, c.permissions));
  }, [userPermissions, menuCards]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const fullName = session?.user?.name ?? "Bem-vindo";
  const syncLabel = formatRelativeSync(lastSync?.lastSyncAt);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <span className="text-sm font-medium">Início</span>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
        {/* Greeting */}
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-muted-foreground text-sm">{greeting},</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {fullName}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Aqui está o resumo dos módulos disponíveis para você.
          </p>
        </div>

        {/* Module grid */}
        <div className="mx-auto w-full max-w-6xl">
          {visibleCards.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="group focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <Card className="h-full p-5 transition-all duration-200 group-hover:border-green-800/40 group-hover:shadow-md">
                      <div className="flex items-start justify-between">
                        <div className="grid size-10 place-items-center rounded-lg bg-green-50 text-green-800 transition-colors group-hover:bg-green-100">
                          <Icon className="size-5" />
                        </div>
                        {card.badge && (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                              badgeToneClasses[card.badge.tone ?? "neutral"],
                            )}
                          >
                            {card.badge.label}
                          </span>
                        )}
                      </div>
                      <div className="mt-6">
                        <h2 className="text-lg font-semibold leading-tight tracking-tight">
                          {card.label}
                        </h2>
                        <p className="text-muted-foreground mt-1.5 text-sm leading-snug">
                          {card.description}
                        </p>
                      </div>
                      <div className="mt-6 flex items-center text-sm font-medium text-green-800">
                        Abrir
                        <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="p-10 text-center">
              <p className="text-foreground text-base">
                Você não tem permissão para acessar nenhum módulo do sistema.
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                Entre em contato com o administrador para obter as permissões necessárias.
              </p>
            </Card>
          )}
        </div>

        {/* Status bar */}
        <div className="mx-auto w-full max-w-6xl">
          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                </span>
                <span className="font-medium">Sistema operando normalmente</span>
              </div>
              <Separator
                orientation="vertical"
                className="hidden h-4 sm:block"
              />
              <span className="text-muted-foreground">
                Última sincronização Solides:{" "}
                <span className="text-foreground font-mono text-xs">
                  {syncLabel}
                </span>
              </span>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
