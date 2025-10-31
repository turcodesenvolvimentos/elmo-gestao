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
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useEmployees } from "@/hooks/use-employees";
import { usePunchesInfinite } from "@/hooks/use-punches";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  getCompanyFromPunch,
  getMappedCompanies,
} from "@/utils/company-mapping";

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
    company: string;
    status: "APPROVED" | "PENDING" | "REPROVED";
  }>({
    startDate: "",
    endDate: "",
    employeeId: 0,
    company: "Todos",
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

  const hasFilters = filter.employeeId > 0;
  const shouldSendDates = !!(filter.startDate && filter.endDate);

  const isDateRangeValid =
    !filter.startDate ||
    !filter.endDate ||
    new Date(filter.endDate) >= new Date(filter.startDate);

  const canFetch = hasFilters && (shouldSendDates ? isDateRangeValid : true);

  const {
    data: punchesData,
    isLoading: punchesLoading,
    error: punchesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePunchesInfinite(
    50,
    undefined,
    undefined,
    filter.employeeId > 0 ? filter.employeeId : undefined,
    filter.status,
    canFetch
  );

  const loadMoreRef = useRef<HTMLTableRowElement>(null);

  const allPunches = useMemo(() => {
    let allPunchesRaw =
      punchesData?.pages.flatMap((page) => page.content || []) || [];

    if (shouldSendDates && isDateRangeValid) {
      const startDateStr = filter.startDate;
      const endDateStr = filter.endDate;

      allPunchesRaw = allPunchesRaw.filter((punch: { date: string }) => {
        if (!punch.date || typeof punch.date !== "string") {
          return false;
        }

        let punchDateStr: string;

        if (punch.date.includes("T")) {
          punchDateStr = punch.date.split("T")[0];
        } else if (punch.date.includes(" ")) {
          punchDateStr = punch.date.split(" ")[0];
        } else if (punch.date.length >= 10) {
          punchDateStr = punch.date.substring(0, 10);
        } else {
          const punchDate = new Date(punch.date);
          if (isNaN(punchDate.getTime())) {
            return false;
          }
          punchDateStr = `${punchDate.getUTCFullYear()}-${String(
            punchDate.getUTCMonth() + 1
          ).padStart(2, "0")}-${String(punchDate.getUTCDate()).padStart(
            2,
            "0"
          )}`;
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(punchDateStr)) {
          const punchDate = new Date(punch.date);
          if (isNaN(punchDate.getTime())) {
            return false;
          }
          punchDateStr = `${punchDate.getUTCFullYear()}-${String(
            punchDate.getUTCMonth() + 1
          ).padStart(2, "0")}-${String(punchDate.getUTCDate()).padStart(
            2,
            "0"
          )}`;
        }

        return punchDateStr >= startDateStr && punchDateStr <= endDateStr;
      });
    }

    if (filter.company !== "Todos") {
      allPunchesRaw = allPunchesRaw.filter((punch) => {
        const company = getCompanyFromPunch(punch);
        return company === filter.company;
      });
    }

    return allPunchesRaw;
  }, [
    punchesData,
    shouldSendDates,
    isDateRangeValid,
    filter.startDate,
    filter.endDate,
    filter.company,
  ]);

  useEffect(() => {
    if (!canFetch || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [canFetch, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (employeesLoading) {
    return <div>Carregando...</div>;
  }

  if (employeesError || punchesError) {
    return <div>Erro ao carregar dados</div>;
  }

  const mappedCompanies = getMappedCompanies();
  const companiesList = [
    "Todos",
    ...mappedCompanies.sort((a, b) => a.localeCompare(b)),
  ];

  return (
    <SidebarProvider>
      <AppSidebar collapsible="icon" />
      <div className="min-h-screen w-full p-6">
        <SidebarTrigger className="-ml-1" />
        <div className="space-y-6">
          <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
            Filtrar horários registrados
          </h2>
          <div className="flex flex-row gap-4 items-end flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Funcionário:</Label>
              <Select
                value={
                  filter.employeeId > 0 ? filter.employeeId.toString() : ""
                }
                onValueChange={(value) =>
                  setFilter((prev) => ({
                    ...prev,
                    employeeId: value ? parseInt(value, 10) : 0,
                  }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue
                    placeholder={
                      employeesLoading
                        ? "Carregando..."
                        : "Selecione um funcionário"
                    }
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
                    [...employees.content]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((employee) => (
                        <SelectItem
                          key={employee.id}
                          value={employee.id.toString()}
                        >
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
            </div>
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Empresa:</Label>
              <Select
                value={filter.company}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, company: value }))
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {companiesList.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Data inicial:</Label>
              <Input
                type="date"
                className="w-[140px]"
                value={filter.startDate}
                onChange={(e) =>
                  setFilter((prev) => ({ ...prev, startDate: e.target.value }))
                }
                max={filter.endDate || undefined}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">Data final:</Label>
              <div className="flex flex-col">
                <Input
                  type="date"
                  className={`w-[140px] ${
                    shouldSendDates && !isDateRangeValid ? "border-red-500" : ""
                  }`}
                  value={filter.endDate}
                  onChange={(e) =>
                    setFilter((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  min={filter.startDate || undefined}
                />
                {shouldSendDates && !isDateRangeValid && (
                  <span className="text-xs text-red-500 mt-1">
                    Data final deve ser maior ou igual à data inicial
                  </span>
                )}
              </div>
            </div>
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
                  {!hasFilters ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="text-center py-8 text-gray-500"
                      >
                        Selecione um funcionário para visualizar os pontos
                      </TableCell>
                    </TableRow>
                  ) : shouldSendDates && !isDateRangeValid ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="text-center py-8 text-red-500"
                      >
                        Data final deve ser maior ou igual à data inicial
                      </TableCell>
                    </TableRow>
                  ) : punchesLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="text-center py-8 text-gray-500"
                      >
                        Selecione um funcionário para visualizar os pontos
                      </TableCell>
                    </TableRow>
                  ) : shouldSendDates && !isDateRangeValid ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="text-center py-8 text-red-500"
                      >
                        Data final deve ser maior ou igual à data inicial
                      </TableCell>
                    </TableRow>
                  ) : punchesLoading ? (
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
                        {punchesError
                          ? String(punchesError)
                          : "Erro ao carregar pontos"}
                      </TableCell>
                    </TableRow>
                  ) : allPunches.length > 0 ? (
                    <>
                      {allPunches.map(
                        (punch: {
                          id: number;
                          date: string;
                          dateIn?: string;
                          dateOut?: string;
                          locationIn?: { address?: string };
                          locationOut?: { address?: string };
                          employee?: { name: string };
                          employer?: { name: string };
                        }) => {
                          const companyName = getCompanyFromPunch(punch);
                          const punchDateStr = punch.date.includes("T")
                            ? punch.date.split("T")[0]
                            : punch.date.substring(0, 10);

                          const [year, month, day] = punchDateStr.split("-");
                          const formattedDate = `${day}/${month}/${year}`;

                          const date = new Date(
                            punch.date +
                              (punch.date.includes("T") ? "" : "T12:00:00Z")
                          );
                          const dayOfWeek = date.toLocaleDateString("pt-BR", {
                            weekday: "long",
                            timeZone: "UTC",
                          });
                          const entryTime = punch.dateIn
                            ? new Date(punch.dateIn).toLocaleTimeString(
                                "pt-BR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "-";
                          const exitTime = punch.dateOut
                            ? new Date(punch.dateOut).toLocaleTimeString(
                                "pt-BR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "-";

                          return (
                            <TableRow key={punch.id}>
                              <TableCell className="px-4 py-3 border-r border-gray-200">
                                {punch.employee?.name || "-"}
                              </TableCell>
                              <TableCell className="px-4 py-3 border-r border-gray-200">
                                {companyName}
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
                        }
                      )}
                      <TableRow ref={loadMoreRef}>
                        <TableCell
                          colSpan={columns.length}
                          className="text-center py-4"
                        >
                          {isFetchingNextPage ? (
                            <span className="text-gray-500">
                              Carregando mais pontos...
                            </span>
                          ) : hasNextPage ? (
                            <span className="text-gray-400 text-sm">
                              Role para carregar mais
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">
                              Todos os pontos foram carregados
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    </>
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
