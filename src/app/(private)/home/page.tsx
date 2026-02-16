"use client";

import { Utensils, Clock, Users, File, LogOut, Building, CalendarDays } from "lucide-react";
import banner from "@/assets/banner.png";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Permission, hasAnyPermission, isAdmin } from "@/types/permissions";
import { useMemo } from "react";

interface MenuCard {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  permissions: Permission[];
}

const menuCards: MenuCard[] = [
  {
    href: "/usuarios",
    icon: Users,
    label: "Usuários",
    permissions: [Permission.USERS],
  },
  {
    href: "/empresas-e-funcionarios",
    icon: Building,
    label: "Empresas e Funcionários",
    permissions: [Permission.COMPANIES, Permission.EMPLOYEES],
  },
  {
    href: "/ponto",
    icon: Clock,
    label: "Ponto",
    permissions: [Permission.PONTO],
  },
  {
    href: "/vale-alimentacao",
    icon: Utensils,
    label: "Vale-Alimentação",
    permissions: [Permission.VALE_ALIMENTACAO],
  },
  {
    href: "/boletim",
    icon: File,
    label: "Boletim",
    permissions: [Permission.BOLETIM],
  },
  {
    href: "/escala",
    icon: CalendarDays,
    label: "Escalas",
    permissions: [Permission.ESCALAS],
  },
];

export default function Page() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  // Filtrar cards baseado nas permissões do usuário
  const visibleCards = useMemo(() => {
    if (!session?.user?.permissions) {
      // Se não houver permissões, não mostrar nenhum card
      return [];
    }

    const userPermissions = session.user.permissions;
    const userIsAdmin = isAdmin(userPermissions);

    return menuCards.filter((card) => {
      // Se for admin, mostrar tudo
      if (userIsAdmin) {
        return true;
      }

      // Verificar se tem pelo menos uma das permissões necessárias
      return hasAnyPermission(userPermissions, card.permissions);
    });
  }, [session?.user?.permissions]);
  return (
    <div className="bg-gray-100 h-screen flex justify-center items-center flex-1 flex-col gap-8 relative">
      <Button
        onClick={handleLogout}
        variant="outline"
        className="absolute top-4 right-4"
      >
        <LogOut size={16} className="mr-2" />
        Sair
      </Button>

      <Image
        src={banner}
        alt="banner"
        className="bg-white max-w-xl rounded-xl shadow-lg"
      />

      <div className="flex flex-col gap-6 w-full max-w-4xl px-4 sm:px-0">
        {visibleCards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto w-full">
            {visibleCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="bg-white flex justify-center items-center flex-col py-8 px-6 rounded-2xl border border-green-800/20 hover:border-green-900/50 transition-all duration-300 cursor-pointer hover:scale-105 hover:bg-transparent shadow-lg hover:shadow-xl backdrop-blur-sm"
                >
                  {card.href === "/empresas-e-funcionarios" ? (
                    <div className="flex items-center gap-3 mb-2">
                      <Building size={40} className="transition-colors duration-300" />
                      <Users size={40} className="transition-colors duration-300" />
                    </div>
                  ) : (
                    <IconComponent
                      size={40}
                      className="mb-2 transition-colors duration-300"
                    />
                  )}
                  <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors duration-300 text-sm sm:text-base">
                    {card.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
            <p className="text-gray-600 text-lg">
              Você não tem permissão para acessar nenhum módulo do sistema.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Entre em contato com o administrador para obter as permissões necessárias.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
