"use client";

import { Fragment } from "react";
import { calcularHorasPorPeriodo, formatarHoras } from "@/lib/ponto-calculator";
import Holidays from "date-holidays";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEmployees } from "@/hooks/use-employees";
import { usePunchesInfinite } from "@/hooks/use-punches";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  getCompanyFromPunch,
  getMappedCompanies,
} from "@/utils/company-mapping";

interface GroupedPunch {
  key: string;
  employeeName: string;
  company: string;
  isHoliday: boolean;
  date: string;
  formattedDate: string;
  dayOfWeek: string;
  dayOfWeekNumber: number;
  punches: Array<{ dateIn?: string; dateOut?: string }>;
  horasDiurnas: string;
  horasNoturnas: string;
  horasFictas: string;
  totalHoras: string;
  horasNormais: string;
  adicionalNoturno: string;
  extra50Diurno: string;
  extra50Noturno: string;
  extra100Diurno: string;
  extra100Noturno: string;
  heDomEFer: string;
}

interface Punch {
  id: number;
  date: string;
  dateIn?: string;
  dateOut?: string;
  locationIn?: { address?: string };
  locationOut?: { address?: string };
  employee?: { name: string };
  employer?: { name: string };
}

export default function PontoPage() {
  const hd = useMemo(() => new Holidays("BR"), []);
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

  const startDateTimestamp =
    shouldSendDates && isDateRangeValid && filter.startDate
      ? (() => {
          const date = new Date(filter.startDate + "T00:00:00Z");
          return date.getTime().toString();
        })()
      : undefined;
  const endDateTimestamp =
    shouldSendDates && isDateRangeValid && filter.endDate
      ? (() => {
          const date = new Date(filter.endDate + "T23:59:59.999Z");
          return date.getTime().toString();
        })()
      : undefined;

  const {
    data: punchesData,
    isLoading: punchesLoading,
    error: punchesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePunchesInfinite(
    1000,
    startDateTimestamp,
    endDateTimestamp,
    filter.employeeId > 0 ? filter.employeeId : undefined,
    filter.status,
    canFetch
  );

  const loadMoreRef = useRef<HTMLTableRowElement>(null);

  const { groupedPunches, maxPunchPairs, totals } = useMemo(() => {
    let allPunchesRaw =
      punchesData?.pages.flatMap((page) => page.content || []) || [];

    if (shouldSendDates && filter.startDate && filter.endDate) {
      allPunchesRaw = allPunchesRaw.filter((punch: Punch) => {
        const punchDateStr = punch.date
          ? punch.date.includes("T")
            ? punch.date.split("T")[0]
            : punch.date.substring(0, 10)
          : punch.dateIn
          ? punch.dateIn.split("T")[0]
          : punch.dateOut
          ? punch.dateOut.split("T")[0]
          : null;

        if (!punchDateStr) return false;

        return (
          punchDateStr >= filter.startDate && punchDateStr <= filter.endDate
        );
      });
    }

    if (filter.company !== "Todos") {
      allPunchesRaw = allPunchesRaw.filter((punch) => {
        const company = getCompanyFromPunch(punch);
        return company === filter.company;
      });
    }

    allPunchesRaw.sort((a: Punch, b: Punch) => {
      const employeeCompare = (a.employee?.name || "").localeCompare(
        b.employee?.name || ""
      );
      if (employeeCompare !== 0) return employeeCompare;

      const dateA = String(a.dateIn || a.dateOut || a.date);
      const dateB = String(b.dateIn || b.dateOut || b.date);
      return dateA.localeCompare(dateB);
    });

    const grouped = new Map<string, GroupedPunch>();
    const lastGroupByEmployee = new Map<
      string,
      { key: string; dateStr: string; hadNightShift: boolean }
    >();

    allPunchesRaw.forEach((punch: Punch) => {
      const employeeName = punch.employee?.name || "sem-nome";
      const punchDateStr = punch.date.includes("T")
        ? punch.date.split("T")[0]
        : punch.date.substring(0, 10);

      const entryDate = punch.dateIn ? new Date(punch.dateIn) : undefined;
      const entryHour = entryDate ? entryDate.getHours() : undefined;
      const isEarlyMorning = entryHour !== undefined ? entryHour < 12 : false;
      const isNightShiftEntry =
        entryHour !== undefined ? entryHour >= 18 : false;

      const lastGroup = lastGroupByEmployee.get(employeeName);
      const shouldAttachToPreviousDay =
        !!lastGroup &&
        isEarlyMorning &&
        (() => {
          const [y, m, d] = lastGroup.dateStr.split("-").map(Number);
          const lastDate = new Date(Date.UTC(y, m - 1, d));
          const [cy, cm, cd] = punchDateStr.split("-").map(Number);
          const currentDate = new Date(Date.UTC(cy, cm - 1, cd));
          const diffDays =
            (currentDate.getTime() - lastDate.getTime()) /
            (1000 * 60 * 60 * 24);
          return Math.round(diffDays) === 1 && lastGroup.hadNightShift;
        })();

      const baseDateStr = shouldAttachToPreviousDay
        ? lastGroup!.dateStr
        : punchDateStr;
      const key = `${employeeName}-${baseDateStr}`;

      if (!grouped.has(key)) {
        const [year, month, day] = baseDateStr.split("-");
        const formattedDate = `${day}/${month}/${year}`;
        const date = new Date(baseDateStr + "T12:00:00Z");
        const dayOfWeek = date.toLocaleDateString("pt-BR", {
          weekday: "long",
          timeZone: "UTC",
        });
        const dayOfWeekNumber = date.getDay();

        grouped.set(key, {
          key,
          employeeName: punch.employee?.name || "-",
          company: getCompanyFromPunch(punch),
          isHoliday: !!hd.isHoliday(new Date(baseDateStr + "T12:00:00Z")),
          date: baseDateStr,
          formattedDate,
          dayOfWeek,
          dayOfWeekNumber,
          punches: [],
          horasDiurnas: "00:00",
          horasNoturnas: "00:00",
          horasFictas: "00:00",
          totalHoras: "00:00",
          horasNormais: "00:00",
          adicionalNoturno: "00:00",
          extra50Diurno: "00:00",
          extra50Noturno: "00:00",
          extra100Diurno: "00:00",
          extra100Noturno: "00:00",
          heDomEFer: "00:00",
        });
      }

      grouped.get(key)!.punches.push({
        dateIn: punch.dateIn,
        dateOut: punch.dateOut,
      });

      const prev = lastGroupByEmployee.get(employeeName);
      lastGroupByEmployee.set(employeeName, {
        key,
        dateStr: baseDateStr,
        hadNightShift:
          (prev?.hadNightShift && prev.key === key) || isNightShiftEntry,
      });
    });

    const totalsNumeric = {
      horasDiurnas: 0,
      horasNoturnas: 0,
      horasFictas: 0,
      totalHoras: 0,
      horasNormais: 0,
      adicionalNoturno: 0,
      extra50Diurno: 0,
      extra50Noturno: 0,
      extra100Diurno: 0,
      extra100Noturno: 0,
      heDomEFer: 0,
    };

    grouped.forEach((group) => {
      group.punches.sort((a, b) => {
        const timeA = String(a.dateIn || a.dateOut || "");
        const timeB = String(b.dateIn || b.dateOut || "");
        return timeA.localeCompare(timeB);
      });

      const calculoHoras = calcularHorasPorPeriodo(group.punches, group.date);
      totalsNumeric.horasDiurnas += calculoHoras.horasDiurnas;
      totalsNumeric.horasNoturnas += calculoHoras.horasNoturnas;
      totalsNumeric.horasFictas += calculoHoras.horasFictas;
      totalsNumeric.totalHoras += calculoHoras.totalHoras;
      totalsNumeric.horasNormais += calculoHoras.horasNormais;
      totalsNumeric.adicionalNoturno += calculoHoras.adicionalNoturno;
      totalsNumeric.extra50Diurno += calculoHoras.extra50Diurno;
      totalsNumeric.extra50Noturno += calculoHoras.extra50Noturno;
      totalsNumeric.extra100Diurno += calculoHoras.extra100Diurno;
      totalsNumeric.extra100Noturno += calculoHoras.extra100Noturno;
      totalsNumeric.heDomEFer += calculoHoras.heDomEFer;
      group.horasDiurnas = formatarHoras(calculoHoras.horasDiurnas);
      group.horasNoturnas = formatarHoras(calculoHoras.horasNoturnas);
      group.horasFictas = formatarHoras(calculoHoras.horasFictas);
      group.totalHoras = formatarHoras(calculoHoras.totalHoras);
      group.horasNormais = formatarHoras(calculoHoras.horasNormais);
      group.adicionalNoturno = formatarHoras(calculoHoras.adicionalNoturno);
      group.extra50Diurno = formatarHoras(calculoHoras.extra50Diurno);
      group.extra50Noturno = formatarHoras(calculoHoras.extra50Noturno);
      group.extra100Diurno = formatarHoras(calculoHoras.extra100Diurno);
      group.extra100Noturno = formatarHoras(calculoHoras.extra100Noturno);
      group.heDomEFer = formatarHoras(calculoHoras.heDomEFer);
    });

    // Preencher dias faltantes entre a primeira e última data de cada funcionário
    const groupedByEmployee = new Map<string, GroupedPunch[]>();
    grouped.forEach((group) => {
      if (!groupedByEmployee.has(group.employeeName)) {
        groupedByEmployee.set(group.employeeName, []);
      }
      groupedByEmployee.get(group.employeeName)!.push(group);
    });

    // Determinar o range de datas para preenchimento
    const startDateForFill =
      shouldSendDates && filter.startDate ? filter.startDate : null;
    const endDateForFill =
      shouldSendDates && filter.endDate ? filter.endDate : null;

    groupedByEmployee.forEach((groups, employeeName) => {
      // Ordenar grupos por data
      groups.sort((a, b) => a.date.localeCompare(b.date));

      // Determinar primeira e última data
      const firstDate = startDateForFill || groups[0].date;
      const lastDate = endDateForFill || groups[groups.length - 1].date;

      // Criar um Set com as datas existentes para busca rápida
      const existingDates = new Set(groups.map((g) => g.date));

      // Preencher dias faltantes
      const [startYear, startMonth, startDay] = firstDate
        .split("-")
        .map(Number);
      const [endYear, endMonth, endDay] = lastDate.split("-").map(Number);
      const startDateObj = new Date(
        Date.UTC(startYear, startMonth - 1, startDay)
      );
      const endDateObj = new Date(Date.UTC(endYear, endMonth - 1, endDay));

      const currentDate = new Date(startDateObj);
      while (currentDate <= endDateObj) {
        const year = currentDate.getUTCFullYear();
        const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getUTCDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        if (!existingDates.has(dateStr)) {
          const formattedDate = `${day}/${month}/${year}`;
          const date = new Date(dateStr + "T12:00:00Z");
          const dayOfWeek = date.toLocaleDateString("pt-BR", {
            weekday: "long",
            timeZone: "UTC",
          });
          const dayOfWeekNumber = date.getDay();

          // Encontrar a empresa do funcionário (pegar da primeira ocorrência)
          const company = groups[0]?.company || "-";

          const emptyGroup: GroupedPunch = {
            key: `${employeeName}-${dateStr}`,
            employeeName,
            company,
            isHoliday: !!hd.isHoliday(new Date(dateStr + "T12:00:00Z")),
            date: dateStr,
            formattedDate,
            dayOfWeek,
            dayOfWeekNumber,
            punches: [],
            horasDiurnas: "00:00",
            horasNoturnas: "00:00",
            horasFictas: "00:00",
            totalHoras: "00:00",
            horasNormais: "00:00",
            adicionalNoturno: "00:00",
            extra50Diurno: "00:00",
            extra50Noturno: "00:00",
            extra100Diurno: "00:00",
            extra100Noturno: "00:00",
            heDomEFer: "00:00",
          };

          groups.push(emptyGroup);
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      // Reordenar após adicionar dias faltantes
      groups.sort((a, b) => a.date.localeCompare(b.date));
    });

    // Reconstruir o array final com todos os grupos (incluindo os vazios)
    const finalGroupedPunches: GroupedPunch[] = [];
    groupedByEmployee.forEach((groups) => {
      finalGroupedPunches.push(...groups);
    });

    // Ordenar por funcionário e depois por data
    finalGroupedPunches.sort((a, b) => {
      const employeeCompare = a.employeeName.localeCompare(b.employeeName);
      if (employeeCompare !== 0) return employeeCompare;
      return a.date.localeCompare(b.date);
    });

    let maxPairs = 1;
    finalGroupedPunches.forEach((group) => {
      maxPairs = Math.max(maxPairs, group.punches.length);
    });

    return {
      groupedPunches: finalGroupedPunches,
      maxPunchPairs: maxPairs,
      totals: {
        horasDiurnas: formatarHoras(totalsNumeric.horasDiurnas),
        horasNoturnas: formatarHoras(totalsNumeric.horasNoturnas),
        horasFictas: formatarHoras(totalsNumeric.horasFictas),
        totalHoras: formatarHoras(totalsNumeric.totalHoras),
        horasNormais: formatarHoras(totalsNumeric.horasNormais),
        adicionalNoturno: formatarHoras(totalsNumeric.adicionalNoturno),
        extra50Diurno: formatarHoras(totalsNumeric.extra50Diurno),
        extra50Noturno: formatarHoras(totalsNumeric.extra50Noturno),
        extra100Diurno: formatarHoras(totalsNumeric.extra100Diurno),
        extra100Noturno: formatarHoras(totalsNumeric.extra100Noturno),
        heDomEFer: formatarHoras(totalsNumeric.heDomEFer),
      },
    };
  }, [
    punchesData,
    filter.company,
    filter.startDate,
    filter.endDate,
    shouldSendDates,
    hd,
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

  const hasAnyError = !!(employeesError || punchesError);

  const mappedCompanies = getMappedCompanies();
  const companiesList = [
    "Todos",
    ...mappedCompanies.sort((a, b) => a.localeCompare(b)),
  ];

  const dynamicColumns = useMemo(() => {
    const baseColumns = ["Funcionário", "Empresa", "Data", "Dia da semana"];
    const punchColumns: string[] = [];

    for (let i = 1; i <= maxPunchPairs; i++) {
      punchColumns.push(`Entrada ${i}`, `Saída ${i}`);
    }

    const extraColumns = [
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

    return [...baseColumns, ...punchColumns, ...extraColumns];
  }, [maxPunchPairs]);

  if (employeesLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-muted-foreground/30 border-t-green-700 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar collapsible="icon" />
      <div className="min-h-screen w-full p-6">
        <SidebarTrigger className="-ml-1" />
        <div className="space-y-6">
          {hasAnyError && (
            <Alert variant="destructive">
              <AlertDescription>
                Erro ao carregar dados. Tente atualizar os filtros ou recarregar
                a página.
              </AlertDescription>
            </Alert>
          )}
          <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
            Pontos registrados
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
                    {dynamicColumns.map((item, index) => (
                      <TableHead
                        key={item}
                        className={`px-4 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap ${
                          index < dynamicColumns.length - 1
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
                        colSpan={dynamicColumns.length}
                        className="text-center py-8 text-gray-500"
                      >
                        Selecione um funcionário para visualizar os pontos
                      </TableCell>
                    </TableRow>
                  ) : shouldSendDates && !isDateRangeValid ? (
                    <TableRow>
                      <TableCell
                        colSpan={dynamicColumns.length}
                        className="text-center py-8 text-red-500"
                      >
                        Data final deve ser maior ou igual à data inicial
                      </TableCell>
                    </TableRow>
                  ) : punchesLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={dynamicColumns.length}
                        className="text-center py-8"
                      >
                        Carregando pontos...
                      </TableCell>
                    </TableRow>
                  ) : punchesError ? (
                    <TableRow>
                      <TableCell
                        colSpan={dynamicColumns.length}
                        className="text-center py-8 text-red-500"
                      >
                        {punchesError
                          ? String(punchesError)
                          : "Erro ao carregar pontos"}
                      </TableCell>
                    </TableRow>
                  ) : groupedPunches.length > 0 ? (
                    <>
                      {groupedPunches.map((group, index) => (
                        <TableRow
                          key={group.key}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-100"
                          }
                        >
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.employeeName}
                          </TableCell>
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.company}
                          </TableCell>
                          <TableCell
                            className={`px-4 py-3 border-r border-gray-200 ${
                              group.isHoliday || group.dayOfWeekNumber === 0
                                ? "bg-blue-100 text-blue-800 font-medium"
                                : ""
                            }`}
                          >
                            {group.formattedDate}
                          </TableCell>
                          <TableCell
                            className={`px-4 py-3 border-r border-gray-200 capitalize ${
                              group.isHoliday || group.dayOfWeekNumber === 0
                                ? "bg-blue-100 text-blue-800 font-medium"
                                : ""
                            }`}
                          >
                            {group.dayOfWeek}
                          </TableCell>

                          {Array.from({ length: maxPunchPairs }).map(
                            (_, index) => {
                              const punch = group.punches[index];
                              const entryTime = punch?.dateIn
                                ? new Date(punch.dateIn).toLocaleTimeString(
                                    "pt-BR",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )
                                : "-";
                              const exitTime = punch?.dateOut
                                ? new Date(punch.dateOut).toLocaleTimeString(
                                    "pt-BR",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )
                                : "-";

                              return (
                                <Fragment key={`punch-${group.key}-${index}`}>
                                  <TableCell className="px-4 py-3 border-r border-gray-200">
                                    {entryTime}
                                  </TableCell>
                                  <TableCell className="px-4 py-3 border-r border-gray-200">
                                    {exitTime}
                                  </TableCell>
                                </Fragment>
                              );
                            }
                          )}

                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.horasDiurnas}
                          </TableCell>
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.horasNoturnas}
                          </TableCell>
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.horasFictas}
                          </TableCell>
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.totalHoras}
                          </TableCell>
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.horasNormais}
                          </TableCell>
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.adicionalNoturno}
                          </TableCell>
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.extra50Diurno}
                          </TableCell>
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.extra50Noturno}
                          </TableCell>
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.extra100Diurno}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {group.extra100Noturno}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50/50">
                        {Array.from({ length: 4 + maxPunchPairs * 2 }).map(
                          (_, idx) => (
                            <TableCell
                              key={`totals-empty-${idx}`}
                              className="px-4 py-3 border-r border-gray-200 text-gray-700 font-medium"
                            >
                              {idx === 0 ? "Totais" : "-"}
                            </TableCell>
                          )
                        )}
                        <TableCell className="px-4 py-3 border-r border-gray-200 font-semibold">
                          {totals.horasDiurnas}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200 font-semibold">
                          {totals.horasNoturnas}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200 font-semibold">
                          {totals.horasFictas}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200 font-semibold">
                          {totals.totalHoras}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200 font-semibold">
                          {totals.horasNormais}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200 font-semibold">
                          {totals.adicionalNoturno}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200 font-semibold">
                          {totals.extra50Diurno}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200 font-semibold">
                          {totals.extra50Noturno}
                        </TableCell>
                        <TableCell className="px-4 py-3 border-r border-gray-200 font-semibold">
                          {totals.extra100Diurno}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-semibold">
                          {totals.extra100Noturno}
                        </TableCell>
                      </TableRow>
                      <TableRow ref={loadMoreRef}>
                        <TableCell
                          colSpan={dynamicColumns.length}
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
                        colSpan={dynamicColumns.length}
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
