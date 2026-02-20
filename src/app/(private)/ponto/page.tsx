"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { calcularHorasPorPeriodo, formatarHoras } from "@/lib/ponto-calculator";
import Holidays from "date-holidays";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileText, History } from "lucide-react";
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useEmployees } from "@/hooks/use-employees";
import { usePunchesInfinite } from "@/hooks/use-punches";
import {
  getCompanyFromPunch,
  getMappedCompanies,
} from "@/utils/company-mapping";
import { useSyncPunches, useLastSyncDate } from "@/hooks/use-sync";
import { RefreshCw, Download, Loader2, X } from "lucide-react";
import { PontoHistory } from "./components/ponto-history";
import { useExportPontoPDF, useSavePontoToHistory } from "@/hooks/use-ponto";
import type { PontoData } from "@/services/ponto.service";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

/** Acidente/doença do trabalho (#0070C0) ou não relacionada ao trabalho (#00B0F0) */
export type AjusteTipo = "work" | "non_work";

function removeAccentsFrom(str: string): string {
  return str.normalize("NFD").replace(/\u0300-\u036f/g, "");
}

/** Classifica em apenas 2 motivos: trabalho ou não relacionada ao trabalho. */
function classifyAjusteTipo(
  description: string | undefined
): AjusteTipo | null {
  if (!description || !String(description).trim()) return null;
  const n = removeAccentsFrom(String(description).toLowerCase());
  if (n.includes("nao relacionad")) return "non_work";
  if (
    (n.includes("acidente") || n.includes("doenca")) &&
    n.includes("trabalho")
  ) {
    return "work";
  }
  return null;
}

interface GroupedPunch {
  key: string;
  employeeName: string;
  company: string;
  isHoliday: boolean;
  date: string;
  formattedDate: string;
  dayOfWeek: string;
  dayOfWeekNumber: number;
  punches: Array<{
    dateIn?: string;
    dateOut?: string;
    adjust?: boolean;
    adjustmentReasonDescription?: string;
    adjustmentReasonId?: number;
  }>;
  /** Preenchido quando algum punch do dia é um dos 2 motivos (trabalho / não trabalho). */
  ajusteTipo?: AjusteTipo;
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

/** Motivo de ajuste vindo da API Solides. */
function getAdjustmentReasonDescription(
  punch: PunchFromApi
): string | undefined {
  const desc =
    punch.adjustmentReason?.description ??
    punch.adjustmentReasonRecord?.adjustmentReason?.description;
  if (desc && String(desc).trim()) return String(desc).trim();
  const origem = punch.adjustmentReasonRecord?.origem;
  if (origem && String(origem).trim()) return String(origem).trim();
  return punch.justification?.description?.trim();
}

interface PunchFromApi {
  id: number;
  date?: string;
  dateIn?: string;
  dateOut?: string;
  locationIn?: { address?: string };
  locationOut?: { address?: string };
  employee?: { name: string };
  employer?: { name: string };
  adjust?: boolean;
  adjustmentReason?: { id?: number; description?: string };
  adjustmentReasonRecord?: {
    adjustmentReason?: { id?: number; description?: string };
    origem?: string;
  };
  justification?: { description?: string };
}

interface Punch extends PunchFromApi {}

export default function PontoPage() {
  const hd = useMemo(() => new Holidays("BR"), []);
  const [activeTab, setActiveTab] = useState("visualizar");
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
  const removeAccents = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const normalizeSearch = (str: string) => {
    return removeAccents(str.toLowerCase().trim());
  };

  const { data: employees, isLoading: employeesLoading } = useEmployees({
    page: 1,
    size: 100,
  });

  // Lista de nomes de funcionários para o Combobox
  const employeeNames = useMemo(() => {
    if (!employees?.content) return [];
    return employees.content
      .map((emp) => emp.name)
      .sort((a, b) => a.localeCompare(b));
  }, [employees?.content]);

  // Função para filtrar funcionários baseado na busca (ignorando acentos)
  const filterEmployees = useMemo(() => {
    return (searchTerm: string) => {
      if (!employees?.content) return [];

      if (!searchTerm.trim()) {
        return employeeNames;
      }

      const normalizedSearch = normalizeSearch(searchTerm);

      return employeeNames.filter((name) => {
        const normalizedName = normalizeSearch(name);
        return normalizedName.includes(normalizedSearch);
      });
    };
  }, [employeeNames, employees?.content]);

  // Obter nome do funcionário selecionado
  const selectedEmployeeName = useMemo(() => {
    if (!filter.employeeId || !employees?.content) return "";
    const employee = employees.content.find((e) => e.id === filter.employeeId);
    return employee?.name || "";
  }, [filter.employeeId, employees?.content]);

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

  const syncMutation = useSyncPunches();
  const { data: lastSyncData } = useLastSyncDate();

  // Hooks para exportação
  const exportPDFMutation = useExportPontoPDF();
  const saveToHistoryMutation = useSavePontoToHistory();

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
      const rawDate = punch.date ?? punch.dateIn ?? punch.dateOut;
      let punchDateStr: string | null = null;
      if (typeof rawDate === "string") {
        punchDateStr = rawDate.includes("T")
          ? rawDate.split("T")[0]
          : rawDate.substring(0, 10);
      } else if (typeof rawDate === "number") {
        const d = new Date(rawDate > 1e12 ? rawDate : rawDate * 1000);
        punchDateStr = d.toISOString().split("T")[0];
      }
      if (!punchDateStr) return;

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
        adjust: punch.adjust === true,
        adjustmentReasonDescription: punch.adjust
          ? getAdjustmentReasonDescription(punch)
          : undefined,
        adjustmentReasonId:
          punch.adjustmentReason?.id ??
          punch.adjustmentReasonRecord?.adjustmentReason?.id,
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

      let ajusteTipo: AjusteTipo | null = null;
      for (const p of group.punches) {
        if (!p.adjust || !p.adjustmentReasonDescription) continue;
        const t = classifyAjusteTipo(p.adjustmentReasonDescription);
        if (t === "work") {
          ajusteTipo = "work";
          break;
        }
        if (t === "non_work") ajusteTipo = "non_work";
      }
      if (ajusteTipo) group.ajusteTipo = ajusteTipo;

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

  // Função para preparar dados para exportação
  const prepareExportData = (): PontoData[] => {
    return groupedPunches.map((group) => {
      const emp = employees?.content?.find(
        (e) => e.name === group.employeeName
      );
      const entry1 = group.punches[0]?.dateIn
        ? new Date(group.punches[0].dateIn).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
      const exit1 = group.punches[0]?.dateOut
        ? new Date(group.punches[0].dateOut).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
      const entry2 = group.punches[1]?.dateIn
        ? new Date(group.punches[1].dateIn).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined;
      const exit2 = group.punches[1]?.dateOut
        ? new Date(group.punches[1].dateOut).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined;

      return {
        employeeName: group.employeeName || "",
        company: group.company || "",
        date: group.date || "",
        dayOfWeek: group.dayOfWeek || "",
        entry1: entry1 || "-",
        exit1: exit1 || "-",
        entry2: entry2,
        exit2: exit2,
        horasDiurnas: group.horasDiurnas || "00:00",
        horasNoturnas: group.horasNoturnas || "00:00",
        horasFictas: group.horasFictas || "00:00",
        totalHoras: group.totalHoras || "00:00",
        horasNormais: group.horasNormais || "00:00",
        adicionalNoturno: group.adicionalNoturno || "00:00",
        extra50Diurno: group.extra50Diurno || "00:00",
        extra50Noturno: group.extra50Noturno || "00:00",
        extra100Diurno: group.extra100Diurno || "00:00",
        extra100Noturno: group.extra100Noturno || "00:00",
        employeeCpf: emp?.cpf,
        employeeAdmissionDate: emp?.admissionDate,
      };
    });
  };

  // Função para exportar relatório
  const handleExportReport = async () => {
    if (!filter.startDate || !filter.endDate || groupedPunches.length === 0) {
      return;
    }

    const exportData = prepareExportData();
    const selectedEmployee = employees?.content?.find(
      (e) => e.id === filter.employeeId
    );

    // Salvar no histórico e exportar PDF
    saveToHistoryMutation.mutate(
      {
        employeeId: filter.employeeId > 0 ? filter.employeeId : undefined,
        employeeName: selectedEmployee?.name,
        startDate: filter.startDate,
        endDate: filter.endDate,
        data: exportData,
        employeeCpf: selectedEmployee?.cpf,
        employeeAdmissionDate: selectedEmployee?.admissionDate,
        filtersApplied: {
          employeeId: filter.employeeId > 0 ? filter.employeeId : undefined,
          company: filter.company !== "Todos" ? filter.company : undefined,
          status: filter.status,
        },
      },
      {
        onSuccess: () => {
          // Após salvar no histórico, fazer download do PDF
          exportPDFMutation.mutate({
            employeeName: selectedEmployee?.name,
            startDate: filter.startDate,
            endDate: filter.endDate,
            data: exportData,
            employeeCpf: selectedEmployee?.cpf,
            employeeAdmissionDate: selectedEmployee?.admissionDate,
            filtersApplied: {
              employeeId: filter.employeeId > 0 ? filter.employeeId : undefined,
              company: filter.company !== "Todos" ? filter.company : undefined,
              status: filter.status,
            },
          });
        },
      }
    );
  };

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

  const hasAnyError = !!punchesError;

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
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-xl font-semibold">Ponto</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          {hasAnyError && (
            <Alert variant="destructive">
              <AlertDescription>
                Erro ao carregar dados. Tente atualizar os filtros ou recarregar
                a página.
              </AlertDescription>
            </Alert>
          )}

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
                Pontos registrados
              </h2>
              <div className="flex items-center gap-2">
                {lastSyncData && (
                  <span className="text-sm text-muted-foreground">
                    Última sincronização:{" "}
                    {new Date(lastSyncData.lastSyncDate).toLocaleString(
                      "pt-BR"
                    )}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  {syncMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sincronizar
                    </>
                  )}
                </Button>
              </div>
            </div>

            <TabsList>
              <TabsTrigger value="visualizar">Visualizar</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="visualizar" className="mt-6 space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Filtros</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Selecione os filtros para visualizar os pontos
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
                    <div className="flex-1 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="whitespace-nowrap text-sm font-medium">
                          Funcionário:
                        </Label>
                        <div className="flex items-center gap-1">
                          <Combobox
                            items={employeeNames}
                            value={selectedEmployeeName}
                            onValueChange={(value: string | null) => {
                              if (!value) {
                                setFilter((prev) => ({
                                  ...prev,
                                  employeeId: 0,
                                }));
                              } else {
                                const employee = employees?.content.find(
                                  (e) => e.name === value
                                );
                                if (employee) {
                                  setFilter((prev) => ({
                                    ...prev,
                                    employeeId: employee.id,
                                  }));
                                }
                              }
                            }}
                          >
                            <ComboboxInput
                              placeholder="Selecione ou digite um funcionário..."
                              className="w-[300px]"
                            />
                            <ComboboxContent>
                              <ComboboxEmpty>
                                Nenhum funcionário encontrado.
                              </ComboboxEmpty>
                              <ComboboxList>
                                {employeeNames.map((item: string) => (
                                  <ComboboxItem key={item} value={item}>
                                    {item}
                                  </ComboboxItem>
                                ))}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>

                          {filter.employeeId > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setFilter((prev) => ({
                                  ...prev,
                                  employeeId: 0,
                                }));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="whitespace-nowrap text-sm font-medium">
                          Empresa:
                        </Label>
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
                        <Label className="whitespace-nowrap text-sm font-medium">
                          Data inicial:
                        </Label>
                        <Input
                          type="date"
                          className="w-[140px]"
                          value={filter.startDate}
                          onChange={(e) =>
                            setFilter((prev) => ({
                              ...prev,
                              startDate: e.target.value,
                            }))
                          }
                          max={filter.endDate || undefined}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Label className="whitespace-nowrap text-sm font-medium">
                          Data final:
                        </Label>
                        <div className="flex flex-col">
                          <Input
                            type="date"
                            className={`w-[140px] ${
                              shouldSendDates && !isDateRangeValid
                                ? "border-red-500"
                                : ""
                            }`}
                            value={filter.endDate}
                            onChange={(e) =>
                              setFilter((prev) => ({
                                ...prev,
                                endDate: e.target.value,
                              }))
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

                      {hasFilters &&
                        shouldSendDates &&
                        isDateRangeValid &&
                        groupedPunches.length > 0 && (
                          <Button
                            onClick={handleExportReport}
                            disabled={
                              exportPDFMutation.isPending ||
                              saveToHistoryMutation.isPending
                            }
                            className="ml-auto"
                          >
                            {exportPDFMutation.isPending ||
                            saveToHistoryMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Exportando...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar PDF
                              </>
                            )}
                          </Button>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex-1 overflow-hidden">
                <CardContent className="pt-6">
                  <div className="border-b pb-4 mb-4">
                    <h3 className="text-lg font-semibold">Resultado</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Visualização dos pontos registrados
                    </p>
                  </div>

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
                              className="text-center py-8 text-muted-foreground"
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
                              className="text-center py-8 text-muted-foreground"
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
                                  className={`px-4 py-3 border-r border-gray-200 font-medium ${
                                    group.ajusteTipo === "work"
                                      ? "text-white"
                                      : group.ajusteTipo === "non_work"
                                      ? "text-white"
                                      : group.isHoliday ||
                                        group.dayOfWeekNumber === 0
                                      ? "bg-blue-100 text-blue-800"
                                      : ""
                                  }`}
                                  style={
                                    group.ajusteTipo === "work"
                                      ? { backgroundColor: "#0070C0" }
                                      : group.ajusteTipo === "non_work"
                                      ? { backgroundColor: "#00B0F0" }
                                      : undefined
                                  }
                                >
                                  {group.formattedDate}
                                </TableCell>
                                <TableCell
                                  className={`px-4 py-3 border-r border-gray-200 capitalize font-medium ${
                                    group.ajusteTipo === "work"
                                      ? "text-white"
                                      : group.ajusteTipo === "non_work"
                                      ? "text-white"
                                      : group.isHoliday ||
                                        group.dayOfWeekNumber === 0
                                      ? "bg-blue-100 text-blue-800"
                                      : ""
                                  }`}
                                  style={
                                    group.ajusteTipo === "work"
                                      ? { backgroundColor: "#0070C0" }
                                      : group.ajusteTipo === "non_work"
                                      ? { backgroundColor: "#00B0F0" }
                                      : undefined
                                  }
                                >
                                  {group.dayOfWeek}
                                </TableCell>

                                {Array.from({ length: maxPunchPairs }).map(
                                  (_, index) => {
                                    const punch = group.punches[index];
                                    const entryTime = punch?.dateIn
                                      ? new Date(
                                          punch.dateIn
                                        ).toLocaleTimeString("pt-BR", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "-";
                                    const exitTime = punch?.dateOut
                                      ? new Date(
                                          punch.dateOut
                                        ).toLocaleTimeString("pt-BR", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "-";

                                    return (
                                      <Fragment
                                        key={`punch-${group.key}-${index}`}
                                      >
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
                              {Array.from({
                                length: 4 + maxPunchPairs * 2,
                              }).map((_, idx) => (
                                <TableCell
                                  key={`totals-empty-${idx}`}
                                  className="px-4 py-3 border-r border-gray-200 text-gray-700 font-medium"
                                >
                                  {idx === 0 ? "Totais" : "-"}
                                </TableCell>
                              ))}
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historico" className="mt-6">
              <PontoHistory />
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
