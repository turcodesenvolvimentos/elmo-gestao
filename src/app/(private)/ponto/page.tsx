"use client";

import { Fragment } from "react";
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
  date: string;
  formattedDate: string;
  dayOfWeek: string;
  dayOfWeekNumber: number; // 0=domingo, 1=segunda, ..., 6=sábado
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
}

// Interface para o punch da API
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

// Função para calcular horas entre dois horários
function calcularHorasEntreDatas(inicio: Date, fim: Date): number {
  const diferencaMs = fim.getTime() - inicio.getTime();
  return diferencaMs / (1000 * 60 * 60); // Converter para horas
}

// Função para verificar se um horário está no período noturno (22h às 5h)
function ehHorarioNoturno(hora: number): boolean {
  return hora >= 22 || hora < 5;
}

// Função para calcular horas por período com lógica de extras
function calcularHorasPorPeriodo(
  punches: Array<{ dateIn?: string; dateOut?: string }>,
  dayOfWeekNumber: number
) {
  // Definir carga horária por dia da semana
  let cargaHoraria = 0;
  if (dayOfWeekNumber >= 1 && dayOfWeekNumber <= 5) {
    // Segunda a Sexta
    cargaHoraria = 8;
  } else if (dayOfWeekNumber === 6) {
    // Sábado
    cargaHoraria = 4;
  } else {
    // Domingo
    cargaHoraria = 0;
  }

  // Coletar todos os períodos trabalhados em ordem cronológica
  const periodos: Array<{ inicio: Date; fim: Date }> = [];
  punches.forEach((punch) => {
    if (!punch.dateIn || !punch.dateOut) return;
    periodos.push({
      inicio: new Date(punch.dateIn),
      fim: new Date(punch.dateOut),
    });
  });

  // Ordenar períodos por horário de início
  periodos.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  // Variáveis para acumular horas
  let horasTrabalhadasAcumuladas = 0; // Horas REAIS acumuladas (sem multiplicador)
  let totalHorasNoturnas = 0;
  let totalHorasDiurnas = 0;
  let horasNormaisNoturnas = 0;
  let horasNormaisDiurnas = 0;
  let horasExtrasNoturnas50 = 0;
  let horasExtrasDiurnas50 = 0;
  let horasExtrasNoturnas100 = 0;
  let horasExtrasDiurnas100 = 0;

  // Iterar por cada período
  periodos.forEach((periodo) => {
    let horaAtual = new Date(periodo.inicio);

    while (horaAtual < periodo.fim) {
      const proximaHora = new Date(horaAtual);
      proximaHora.setHours(horaAtual.getHours() + 1);
      proximaHora.setMinutes(0);
      proximaHora.setSeconds(0);
      proximaHora.setMilliseconds(0);

      const fimPeriodo = proximaHora > periodo.fim ? periodo.fim : proximaHora;
      const horasNoPeriodo = calcularHorasEntreDatas(horaAtual, fimPeriodo);

      // Verificar se é domingo OU se passou de 23:59 de sábado
      const diaAtual = horaAtual.getDay();
      const horaAtualNum = horaAtual.getHours();
      const eh100 = diaAtual === 0 || (dayOfWeekNumber === 6 && diaAtual === 0);
      const ehNoturno = ehHorarioNoturno(horaAtualNum);

      // Calcular quantas horas esta hora representa (com multiplicador se noturno)
      const horasComMultiplicador = ehNoturno
        ? horasNoPeriodo * 1.142857
        : horasNoPeriodo;

      // Verificar se esta hora cruza o limite da carga horária
      const horasRestantesParaCargaHoraria = Math.max(
        0,
        cargaHoraria - horasTrabalhadasAcumuladas
      );

      let horasNormaisNestePeriodo = 0;
      let horasExtrasNestePeriodo = 0;

      if (horasRestantesParaCargaHoraria > 0) {
        // Parte desta hora é normal, parte é extra
        horasNormaisNestePeriodo = Math.min(
          horasComMultiplicador,
          horasRestantesParaCargaHoraria
        );
        horasExtrasNestePeriodo =
          horasComMultiplicador - horasNormaisNestePeriodo;
      } else {
        // Toda esta hora é extra
        horasExtrasNestePeriodo = horasComMultiplicador;
      }

      // Converter de volta para horas reais (sem multiplicador) para classificar
      const horasNormaisReais =
        horasNormaisNestePeriodo / (ehNoturno ? 1.142857 : 1);
      const horasExtrasReais =
        horasExtrasNestePeriodo / (ehNoturno ? 1.142857 : 1);

      if (ehNoturno) {
        totalHorasNoturnas += horasNoPeriodo;
        horasNormaisNoturnas += horasNormaisReais;
        if (horasExtrasReais > 0) {
          if (eh100) {
            horasExtrasNoturnas100 += horasExtrasReais;
          } else {
            horasExtrasNoturnas50 += horasExtrasReais;
          }
        }
      } else {
        totalHorasDiurnas += horasNoPeriodo;
        horasNormaisDiurnas += horasNormaisReais;
        if (horasExtrasReais > 0) {
          if (eh100) {
            horasExtrasDiurnas100 += horasExtrasReais;
          } else {
            horasExtrasDiurnas50 += horasExtrasReais;
          }
        }
      }

      // Atualizar horas acumuladas (considerando multiplicador noturno)
      horasTrabalhadasAcumuladas += horasComMultiplicador;

      horaAtual = fimPeriodo;
    }
  });

  const totalHoras = totalHorasNoturnas * 1.142857 + totalHorasDiurnas;
  const horasFictas = totalHorasNoturnas * 0.142857;
  const horasNormais = horasNormaisDiurnas + horasNormaisNoturnas * 1.142857;

  // Calcular extras 50% com multiplicador noturno aplicado
  const extra50Diurno = horasExtrasDiurnas50;
  const extra50Noturno = horasExtrasNoturnas50 * 1.142857;

  return {
    horasNoturnas: totalHorasNoturnas * 1.142857,
    horasDiurnas: totalHorasDiurnas,
    totalHoras: totalHoras,
    horasFictas: horasFictas,
    horasNormais: horasNormais,
    adicionalNoturno: horasNormaisNoturnas * 1.142857,
    extra50Diurno: extra50Diurno,
    extra50Noturno: extra50Noturno,
    extra100Diurno: horasExtrasDiurnas100,
    extra100Noturno: horasExtrasNoturnas100 * 1.142857,
  };
}

// Função para formatar horas decimais em HH:MM
function formatarHoras(horas: number): string {
  let horasInteiras = Math.floor(horas);
  let minutos = Math.round((horas - horasInteiras) * 60);

  // Tratar quando minutos chega a 60
  if (minutos >= 60) {
    horasInteiras += Math.floor(minutos / 60);
    minutos = minutos % 60;
  }

  return `${String(horasInteiras).padStart(2, "0")}:${String(minutos).padStart(
    2,
    "0"
  )}`;
}

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
    shouldSendDates && isDateRangeValid ? filter.startDate : undefined,
    shouldSendDates && isDateRangeValid ? filter.endDate : undefined,
    filter.employeeId > 0 ? filter.employeeId : undefined,
    filter.status,
    canFetch
  );

  const loadMoreRef = useRef<HTMLTableRowElement>(null);

  const { groupedPunches, maxPunchPairs } = useMemo(() => {
    let allPunchesRaw =
      punchesData?.pages.flatMap((page) => page.content || []) || [];

    // Filtrar por data se as datas estiverem definidas
    if (shouldSendDates && filter.startDate && filter.endDate) {
      allPunchesRaw = allPunchesRaw.filter((punch: Punch) => {
        // Pegar a data do ponto (pode ser date, dateIn ou dateOut)
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

        // Comparar apenas as datas (sem hora)
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

    // Ordenar todos os punches por funcionário e data/hora
    allPunchesRaw.sort((a: Punch, b: Punch) => {
      const employeeCompare = (a.employee?.name || "").localeCompare(
        b.employee?.name || ""
      );
      if (employeeCompare !== 0) return employeeCompare;

      const dateA = String(a.dateIn || a.dateOut || a.date);
      const dateB = String(b.dateIn || b.dateOut || b.date);
      return dateA.localeCompare(dateB);
    });

    // Agrupar punches considerando turno noturno
    const grouped = new Map<string, GroupedPunch>();
    let currentJourneyKey: string | null = null;
    let lastPunchWasNightShift = false;

    allPunchesRaw.forEach((punch: Punch) => {
      const employeeName = punch.employee?.name || "sem-nome";
      const punchDateStr = punch.date.includes("T")
        ? punch.date.split("T")[0]
        : punch.date.substring(0, 10);

      // Verificar se é entrada após 18h (turno noturno)
      const isNightShift = punch.dateIn
        ? (() => {
            const entryDate = new Date(punch.dateIn);
            const hours = entryDate.getHours();
            return hours >= 18; // Entrada após 18h
          })()
        : false;

      // Verificar se é uma batida de madrugada (antes das 12h)
      const isEarlyMorning = punch.dateIn
        ? (() => {
            const entryDate = new Date(punch.dateIn);
            const hours = entryDate.getHours();
            return hours < 12; // Antes do meio-dia
          })()
        : false;

      // Decidir se continua na mesma jornada ou cria nova
      let key: string;
      if (
        lastPunchWasNightShift &&
        isEarlyMorning &&
        currentJourneyKey &&
        currentJourneyKey.startsWith(employeeName)
      ) {
        // Continua na mesma jornada (turno noturno que atravessa a madrugada)
        key = currentJourneyKey;
      } else {
        // Nova jornada
        key = `${employeeName}-${punchDateStr}`;
        currentJourneyKey = key;
        lastPunchWasNightShift = isNightShift;

        if (!grouped.has(key)) {
          const [year, month, day] = punchDateStr.split("-");
          const formattedDate = `${day}/${month}/${year}`;
          const date = new Date(
            punch.date + (punch.date.includes("T") ? "" : "T12:00:00Z")
          );
          const dayOfWeek = date.toLocaleDateString("pt-BR", {
            weekday: "long",
            timeZone: "UTC",
          });
          const dayOfWeekNumber = date.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado

          grouped.set(key, {
            key,
            employeeName: punch.employee?.name || "-",
            company: getCompanyFromPunch(punch),
            date: punchDateStr,
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
          });
        }
      }

      grouped.get(key)!.punches.push({
        dateIn: punch.dateIn,
        dateOut: punch.dateOut,
      });
    });

    // Ordenar punches dentro de cada grupo por horário e calcular horas
    grouped.forEach((group) => {
      group.punches.sort((a, b) => {
        const timeA = String(a.dateIn || a.dateOut || "");
        const timeB = String(b.dateIn || b.dateOut || "");
        return timeA.localeCompare(timeB);
      });

      // Calcular horas diurnas, noturnas, fictas, extras e total
      const calculoHoras = calcularHorasPorPeriodo(
        group.punches,
        group.dayOfWeekNumber
      );
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
    });

    // Encontrar o número máximo de pares de entrada/saída
    let maxPairs = 1;
    grouped.forEach((group) => {
      maxPairs = Math.max(maxPairs, group.punches.length);
    });

    return {
      groupedPunches: Array.from(grouped.values()),
      maxPunchPairs: maxPairs,
    };
  }, [
    punchesData,
    filter.company,
    filter.startDate,
    filter.endDate,
    shouldSendDates,
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
                      {groupedPunches.map((group) => (
                        <TableRow key={group.key}>
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.employeeName}
                          </TableCell>
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.company}
                          </TableCell>
                          <TableCell className="px-4 py-3 border-r border-gray-200">
                            {group.formattedDate}
                          </TableCell>
                          <TableCell className="px-4 py-3 border-r border-gray-200 capitalize">
                            {group.dayOfWeek}
                          </TableCell>

                          {/* Renderizar entrada e saída de forma dinâmica */}
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

                          {/* Colunas de horas calculadas */}
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
