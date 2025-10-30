"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useEmployees } from "@/hooks/use-employees";
import { usePunches } from "@/hooks/use-punches";
import { useState } from "react";

const columns = [
  "Funcionário",
  "Empresa",
  "Data",
  "Dia da semana",
  "Entrada",
  "Saída",
  "Horas diurnas",
  "Horas noturnas",
  "Horas fictas",
  "Total de horas",
  "Horas normais",
  "Adicional noturno",
  "50% diurno",
  "50% noturno",
  "100% diurno",
  "100% noturno",
];

export default function PontoPage() {
  const [filter, setFilter] = useState<{
    startDate: string;
    endDate: string;
    employeeId: number;
    status: "APPROVED" | "PENDING" | "REPROVED";
  }>({
    startDate: "",
    endDate: "",
    employeeId: 0,
    status: "APPROVED",
  });

  const {
    data: employees,
    isLoading: employeesLoading,
    error: employeesError,
  } = useEmployees({
    page: 1,
    size: 100,
  });

  const {
    data: punches,
    isLoading: punchesLoading,
    error: punchesError,
  } = usePunches(
    0,
    50,
    filter.startDate,
    filter.endDate,
    filter.employeeId,
    filter.status
  );

  if (employeesLoading || punchesLoading) {
    return <div>Carregando...</div>;
  }

  if (employeesError || punchesError) {
    return <div>Erro ao carregar dados</div>;
  }

  const companies = employees?.content
    ? Array.from(
        new Map(
          employees.content.map((emp) => [
            emp.company.id,
            {
              id: emp.company.id,
              name: emp.company.fantasyName,
            },
          ])
        ).values()
      )
    : [];

  return (
    <SidebarProvider>
      <AppSidebar collapsible='icon' />
      <div className="min-h-screen w-full p-6">
        <SidebarTrigger className="-ml-1" />
        <div className="space-y-6">
          <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
            Filtrar horários registrados
          </h2>
        <div className="flex flex-row gap-2">
          <Label>Funcionário: </Label>
          <Select>
            <SelectTrigger>
              <SelectValue
                className="w-full max-w-[180px] px-4 py-2 text-sm"
                placeholder={employeesLoading ? "Carregando..." : "todos"}
              />
            </SelectTrigger>
            <SelectContent>
              {employeesLoading ? (
                <SelectItem value="loading" disabled>
                  Carregando...
                </SelectItem>
              ) : employeesError ? (
                <SelectItem value="error" disabled>
                  Erro ao carregar
                </SelectItem>
              ) : employees?.content?.length ? (
                employees.content.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="empty" disabled>
                  Nenhum funcionário encontrado
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Label>Empresa: </Label>{" "}
          <Select>
            <SelectTrigger>
              <SelectValue
                className="w-full max-w-[260px] px-6 py-3 text-base"
                placeholder="todos"
              />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label>Data inicial</Label>
          <Input type="date" className="max-w-[140px] px-2 py-1 text-sm" />
          <Label>Data final</Label>
          <Input type="date" className="max-w-[140px] px-2 py-1 text-sm" />
        </div>
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Resultado
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <tr className="bg-gray-50/50">
                  {columns.map((item, index) => (
                    <TableHead
                      key={item}
                      className={`px-4 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap ${
                        index < columns.length - 1
                          ? "border-r border-gray-200"
                          : ""
                      }`}
                    >
                      {item}
                    </TableHead>
                  ))}
                </tr>
              </TableHeader>
              <TableBody>
                {punchesLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center py-8"
                    >
                      Carregando pontos...
                    </TableCell>
                  </TableRow>
                ) : punchesError ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center py-8 text-red-500"
                    >
                      Erro ao carregar pontos
                    </TableCell>
                  </TableRow>
                ) : punches?.content?.length ? (
                  punches.content.map((punch) => {
                    const date = new Date(punch.date);
                    const dayOfWeek = date.toLocaleDateString("pt-BR", {
                      weekday: "long",
                    });
                    const formattedDate = date.toLocaleDateString("pt-BR");
                    const entryTime = punch.dateIn
                      ? new Date(punch.dateIn).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";
                    const exitTime = punch.dateOut
                      ? new Date(punch.dateOut).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";

                    return (
                      <TableRow key={punch.id}>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          {punch.employee?.name || "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          {punch.employer?.name || "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          {formattedDate}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200 capitalize">
                          {dayOfWeek}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          {entryTime}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          {exitTime}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          -
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          -
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          -
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          -
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          -
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          -
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          -
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          -
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200">
                          -
                        </TableCell>
                        <TableCell className="px-4 py-3">-</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center py-8"
                    >
                      Nenhum ponto encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
    </SidebarProvider>
  );
}

