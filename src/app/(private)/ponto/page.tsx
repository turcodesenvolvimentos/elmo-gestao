"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  calcularHorasPorPeriodo,
  formatarHoras,
  isHolidayForDisplay,
} from "@/lib/ponto-calculator";
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
import {
  History,
  Eye,
  Check,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useEmployees } from "@/hooks/use-employees";
import { useCustomHolidays } from "@/hooks/use-custom-holidays";
import { usePunchesInfinite } from "@/hooks/use-punches";
import {
  getMappedCompanies,
  NO_MAPPED_COMPANY_LABEL,
} from "@/utils/company-mapping";
import { formatEmployeeName } from "@/utils/employee-name-format";
import { resolveWorkCompanyName } from "@/lib/punch-company-resolution";
import { usePontoEscalaCompanies } from "@/hooks/use-ponto-escala-companies";
import { useSyncPunches, useLastSyncDate } from "@/hooks/use-sync";
import { RefreshCw, Download, Loader2, X } from "lucide-react";
import { PontoHistory } from "./components/ponto-history";
import {
  useExportPontoPDF,
  useExportPontoResumoPDF,
  useSavePontoToHistory,
} from "@/hooks/use-ponto";
import type { PontoData } from "@/services/ponto.service";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/** Acidente/doença do trabalho (#0070C0) ou não relacionada ao trabalho (#00B0F0) */
export type AjusteTipo = "work" | "non_work";

function removeAccentsFrom(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Classifica em apenas 2 motivos: trabalho ou não relacionada ao trabalho. */
function classifyAjusteTipo(
  description: string | undefined,
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

function toDateKey(value: string | number | undefined): string | null {
  if (value === undefined || value === null) return null;
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  if (typeof value === "string") {
    if (!value) return null;
    if (value.includes("T")) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return formatLocalDate(d);
      return value.split("T")[0];
    }
    return value.substring(0, 10);
  }
  if (typeof value === "number") {
    const d = new Date(value > 1e12 ? value : value * 1000);
    if (isNaN(d.getTime())) return null;
    return formatLocalDate(d);
  }
  return null;
}

function getHourFromDateValue(
  value: string | number | undefined,
): number | null {
  if (value === undefined || value === null) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.getHours();
}

function toYyyyMmDdFromUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isNoCompany(value?: string | null): boolean {
  return (value || "").trim().toLowerCase() === "sem empresa";
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
  punch: PunchFromApi,
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

type Punch = PunchFromApi;

export default function PontoPage() {
  const { data: customHolidaysData } = useCustomHolidays();
  const customHolidaySet = useMemo(() => {
    const s = new Set<string>();
    customHolidaysData?.holidays.forEach((h) => s.add(h.holiday_date));
    return s;
  }, [customHolidaysData?.holidays]);

  const [activeTab, setActiveTab] = useState("visualizar");
  const [openEmployee, setOpenEmployee] = useState(false);
  const [filter, setFilter] = useState<{
    startDate: string;
    endDate: string;
    employeeId: number;
    company: string;
    status: "APPROVED" | "PENDING" | "REPROVED";
  }>({
    startDate: "",
    endDate: "",
    employeeId: -1,
    company: "Todos",
    status: "APPROVED",
  });

  const [showInactiveEmployees, setShowInactiveEmployees] = useState(false);
  const { data: employees, isLoading: employeesLoading } = useEmployees({
    page: 1,
    size: 100,
    includeFired: showInactiveEmployees,
  });

  const employeeOptions = useMemo(() => {
    if (!employees?.content) return [];
    return employees.content
      .map((emp) => ({
        id: emp.id,
        name: formatEmployeeName(emp.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const selectedEmployeeName = useMemo(() => {
    if (!filter.employeeId || !employees?.content) return "";
    const employee = employees.content.find((e) => e.id === filter.employeeId);
    return employee ? formatEmployeeName(employee.name) : "";
  }, [filter.employeeId, employees]);

  const navigateEmployee = (direction: "prev" | "next") => {
    if (employeeOptions.length === 0) return;
    const currentIndex = employeeOptions.findIndex(
      (employee) => employee.id === filter.employeeId,
    );
    let nextIndex: number;
    if (currentIndex === -1) {
      nextIndex = direction === "next" ? 0 : employeeOptions.length - 1;
    } else {
      nextIndex =
        direction === "next"
          ? (currentIndex + 1) % employeeOptions.length
          : (currentIndex - 1 + employeeOptions.length) %
            employeeOptions.length;
    }
    const nextEmployee = employeeOptions[nextIndex];
    if (nextEmployee) {
      setFilter((prev) => ({ ...prev, employeeId: nextEmployee.id }));
    }
  };

  // employeeId: -1 = nada selecionado, 0 = "Todos", N > 0 = funcionario especifico.
  // hasFilters permite o fetch tanto para um funcionario quanto para Todos,
  // para que o botao "Resumo PDF" funcione tambem com Todos.
  const hasFilters = filter.employeeId >= 0;
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
          date.setUTCDate(date.getUTCDate() + 1);
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
    canFetch,
  );

  const { data: escalaEntries = [] } = usePontoEscalaCompanies({
    startDate: filter.startDate || "1900-01-01",
    endDate: filter.endDate || "2100-12-31",
    employeeSolidesId: filter.employeeId > 0 ? filter.employeeId : undefined,
    enabled: canFetch && (shouldSendDates ? isDateRangeValid : true),
  });

  const syncMutation = useSyncPunches();
  const { data: lastSyncData } = useLastSyncDate();

  const exportPDFMutation = useExportPontoPDF();
  const exportResumoMutation = useExportPontoResumoPDF();
  const saveToHistoryMutation = useSavePontoToHistory();

  const loadMoreRef = useRef<HTMLTableRowElement>(null);

  const { groupedPunches, maxPunchPairs, totals } = useMemo(() => {
    let allPunchesRaw =
      punchesData?.pages.flatMap((page) => page.content || []) || [];
    const contextStartDateStr =
      shouldSendDates && filter.startDate
        ? (() => {
            const d = new Date(filter.startDate + "T00:00:00Z");
            d.setUTCDate(d.getUTCDate() - 1);
            return toYyyyMmDdFromUtcDate(d);
          })()
        : null;
    const contextEndDateStr =
      shouldSendDates && filter.endDate
        ? (() => {
            const d = new Date(filter.endDate + "T00:00:00Z");
            d.setUTCDate(d.getUTCDate() + 1);
            return toYyyyMmDdFromUtcDate(d);
          })()
        : null;

    if (shouldSendDates && filter.startDate && filter.endDate) {
      allPunchesRaw = allPunchesRaw.filter((punch: Punch) => {
        const punchDateStr =
          toDateKey(punch.dateIn) ??
          toDateKey(punch.dateOut) ??
          toDateKey(punch.date);

        if (!punchDateStr) return false;

        return (
          punchDateStr >= (contextStartDateStr || filter.startDate) &&
          punchDateStr <= (contextEndDateStr || filter.endDate)
        );
      });
    }

    if (filter.company !== "Todos") {
      allPunchesRaw = allPunchesRaw.filter((punch) => {
        const punchDateStr =
          toDateKey(punch.dateIn) ??
          toDateKey(punch.dateOut) ??
          toDateKey(punch.date);
        if (!punchDateStr) return false;
        const company = resolveWorkCompanyName({
          employeeSolidesId: filter.employeeId,
          workDate: punchDateStr,
          locationInAddress: punch.locationIn?.address,
          locationOutAddress: punch.locationOut?.address,
          escalaEntries,
        });
        return company === filter.company;
      });
    }

    allPunchesRaw.sort((a: Punch, b: Punch) => {
      const employeeCompare = (a.employee?.name || "").localeCompare(
        b.employee?.name || "",
      );
      if (employeeCompare !== 0) return employeeCompare;

      const dateA = String(a.dateIn || a.dateOut || a.date);
      const dateB = String(b.dateIn || b.dateOut || b.date);
      return dateA.localeCompare(dateB);
    });

    const grouped = new Map<string, GroupedPunch>();
    const lastGroupByEmployee = new Map<
      string,
      {
        key: string;
        dateStr: string;
        hadNightShift: boolean;
        lastNightShiftOpen: boolean;
        lastShiftEndAt: Date | null;
        lastShiftEndedAfterMidnight: boolean;
        lastShiftEndedLateNight: boolean;
      }
    >();

    const CONTINUACAO_NOTURNA_MAX_HORAS = 2;
    // Saida a partir desta hora (mesmo dia, antes da meia-noite) e considerada
    // "tarde da noite": suficiente para colar o retorno da madrugada seguinte.
    const HORA_SAIDA_NOTURNA_TARDE = 22;

    allPunchesRaw.forEach((punch: Punch) => {
      const employeeName =
        formatEmployeeName(punch.employee?.name) || "Sem Nome";
      const punchDateStr =
        toDateKey(punch.dateIn) ??
        toDateKey(punch.dateOut) ??
        toDateKey(punch.date);
      if (!punchDateStr) return;

      const entryDate = punch.dateIn ? new Date(punch.dateIn) : undefined;
      const exitDate = punch.dateOut ? new Date(punch.dateOut) : undefined;
      const entryHour = entryDate ? entryDate.getHours() : undefined;
      const isEarlyMorning = entryHour !== undefined ? entryHour < 12 : false;
      const isNightShiftEntry =
        entryHour !== undefined ? entryHour >= 18 : false;
      const shiftCrossedMidnight = !!(
        entryDate &&
        exitDate &&
        (entryDate.getFullYear() !== exitDate.getFullYear() ||
          entryDate.getMonth() !== exitDate.getMonth() ||
          entryDate.getDate() !== exitDate.getDate())
      );

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
          if (Math.round(diffDays) !== 1) return false;
          if (!lastGroup.hadNightShift) return false;

          // Caso 1: turno anterior ficou aberto (esqueceu de bater saida)
          if (lastGroup.lastNightShiftOpen) return true;

          // Caso 2: turno anterior fechou de madrugada (saida cruzou meia-noite)
          // OU fechou tarde da noite (>= HORA_SAIDA_NOTURNA_TARDE, antes da
          // meia-noite) e o retorno foi em ate CONTINUACAO_NOTURNA_MAX_HORAS horas.
          if (
            (lastGroup.lastShiftEndedAfterMidnight ||
              lastGroup.lastShiftEndedLateNight) &&
            lastGroup.lastShiftEndAt &&
            entryDate
          ) {
            const diffHoras =
              (entryDate.getTime() - lastGroup.lastShiftEndAt.getTime()) /
              (1000 * 60 * 60);
            if (
              diffHoras >= 0 &&
              diffHoras <= CONTINUACAO_NOTURNA_MAX_HORAS
            ) {
              return true;
            }
          }

          return false;
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
          employeeName: formatEmployeeName(punch.employee?.name) || "-",
          company: resolveWorkCompanyName({
            employeeSolidesId: filter.employeeId,
            workDate: baseDateStr,
            locationInAddress: punch.locationIn?.address,
            locationOutAddress: punch.locationOut?.address,
            escalaEntries,
          }),
          isHoliday: isHolidayForDisplay(baseDateStr, customHolidaySet),
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
      const currentPunchIsNightShiftWithoutOut =
        (isNightShiftEntry || shiftCrossedMidnight) && !punch.dateOut;

      // Se este punch tem saida e ela cruzou meia-noite, registramos o horario
      // da saida para que um eventual retorno em ate 2h da proxima madrugada
      // seja anexado a este dia. Caso contrario, herda do prev (mesmo key).
      let lastShiftEndAt: Date | null = null;
      let lastShiftEndedAfterMidnight = false;
      let lastShiftEndedLateNight = false;
      if (exitDate && shiftCrossedMidnight) {
        lastShiftEndAt = exitDate;
        lastShiftEndedAfterMidnight = true;
      } else if (exitDate && exitDate.getHours() >= HORA_SAIDA_NOTURNA_TARDE) {
        // Saiu tarde da noite, mas antes da meia-noite (ex.: 23:30).
        lastShiftEndAt = exitDate;
        lastShiftEndedLateNight = true;
      } else if (prev && prev.key === key) {
        lastShiftEndAt = prev.lastShiftEndAt;
        lastShiftEndedAfterMidnight = prev.lastShiftEndedAfterMidnight;
        lastShiftEndedLateNight = prev.lastShiftEndedLateNight;
      }

      lastGroupByEmployee.set(employeeName, {
        key,
        dateStr: baseDateStr,
        hadNightShift:
          (prev?.hadNightShift && prev.key === key) ||
          isNightShiftEntry ||
          shiftCrossedMidnight,
        lastNightShiftOpen:
          currentPunchIsNightShiftWithoutOut ||
          (!!prev &&
            prev.key === key &&
            prev.lastNightShiftOpen &&
            !isNightShiftEntry),
        lastShiftEndAt,
        lastShiftEndedAfterMidnight,
        lastShiftEndedLateNight,
      });
    });

    const groupedByEmployeeForReallocation = new Map<string, GroupedPunch[]>();
    grouped.forEach((group) => {
      if (!groupedByEmployeeForReallocation.has(group.employeeName)) {
        groupedByEmployeeForReallocation.set(group.employeeName, []);
      }
      groupedByEmployeeForReallocation.get(group.employeeName)!.push(group);
    });

    groupedByEmployeeForReallocation.forEach((groups) => {
      groups.sort((a, b) => a.date.localeCompare(b.date));

      for (let i = 1; i < groups.length; i += 1) {
        const previousGroup = groups[i - 1];
        const currentGroup = groups[i];

        // "Ultimo turno noturno" do dia anterior pode ser identificado por:
        //  (a) entrada >= 18h, OU
        //  (b) saida em dia diferente da entrada (cruzou meia-noite).
        const lastNightPunch = previousGroup.punches
          .slice()
          .reverse()
          .find((p) => {
            const entryHour = getHourFromDateValue(p.dateIn);
            if (entryHour !== null && entryHour >= 18) return true;
            const inD = p.dateIn ? new Date(p.dateIn) : null;
            const outD = p.dateOut ? new Date(p.dateOut) : null;
            if (
              inD &&
              outD &&
              (inD.getFullYear() !== outD.getFullYear() ||
                inD.getMonth() !== outD.getMonth() ||
                inD.getDate() !== outD.getDate())
            ) {
              return true;
            }
            return false;
          });

        if (!lastNightPunch) continue;

        const lastPunchOut = lastNightPunch.dateOut
          ? new Date(lastNightPunch.dateOut)
          : null;
        const lastPunchIn = lastNightPunch.dateIn
          ? new Date(lastNightPunch.dateIn)
          : null;
        const lastShiftCrossedMidnight = !!(
          lastPunchIn &&
          lastPunchOut &&
          (lastPunchIn.getFullYear() !== lastPunchOut.getFullYear() ||
            lastPunchIn.getMonth() !== lastPunchOut.getMonth() ||
            lastPunchIn.getDate() !== lastPunchOut.getDate())
        );

        const punchesToMove = currentGroup.punches.filter((p) => {
          const punchDate = toDateKey(p.dateIn) ?? toDateKey(p.dateOut);
          if (punchDate !== currentGroup.date) return false;
          const entryHour = getHourFromDateValue(p.dateIn);
          if (entryHour === null || entryHour >= 12) return false;

          // Caso 1: turno anterior ficou aberto (sem saida) -> realocar.
          if (!lastPunchOut) return true;

          // Caso 2: turno anterior fechou de madrugada e o retorno aconteceu
          // em ate 2h da saida -> continuacao da mesma jornada.
          if (lastShiftCrossedMidnight) {
            const newEntry = p.dateIn ? new Date(p.dateIn) : null;
            if (newEntry) {
              const diffHoras =
                (newEntry.getTime() - lastPunchOut.getTime()) /
                (1000 * 60 * 60);
              if (diffHoras >= 0 && diffHoras <= 2) return true;
            }
          }
          return false;
        });

        if (punchesToMove.length === 0) continue;

        previousGroup.punches.push(...punchesToMove);
        currentGroup.punches = currentGroup.punches.filter(
          (p) => !punchesToMove.includes(p),
        );
      }
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

      const calculoHoras = calcularHorasPorPeriodo(
        group.punches,
        group.date,
        customHolidaySet,
      );
      const includeInSelectedRange =
        !shouldSendDates ||
        !filter.startDate ||
        !filter.endDate ||
        (group.date >= filter.startDate && group.date <= filter.endDate);
      if (includeInSelectedRange) {
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
      }
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

    const groupedByEmployee = new Map<string, GroupedPunch[]>();
    grouped.forEach((group) => {
      if (!groupedByEmployee.has(group.employeeName)) {
        groupedByEmployee.set(group.employeeName, []);
      }
      groupedByEmployee.get(group.employeeName)!.push(group);
    });

    const startDateForFill =
      shouldSendDates && filter.startDate ? filter.startDate : null;
    const endDateForFill =
      shouldSendDates && filter.endDate ? filter.endDate : null;

    groupedByEmployee.forEach((groups, employeeName) => {
      groups.sort((a, b) => a.date.localeCompare(b.date));

      const firstDate = startDateForFill || groups[0].date;
      const lastDate = endDateForFill || groups[groups.length - 1].date;

      const existingDates = new Set(groups.map((g) => g.date));

      const [startYear, startMonth, startDay] = firstDate
        .split("-")
        .map(Number);
      const [endYear, endMonth, endDay] = lastDate.split("-").map(Number);
      const startDateObj = new Date(
        Date.UTC(startYear, startMonth - 1, startDay),
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

          const company = resolveWorkCompanyName({
            employeeSolidesId: filter.employeeId,
            workDate: dateStr,
            locationInAddress: null,
            locationOutAddress: null,
            escalaEntries,
          });

          const emptyGroup: GroupedPunch = {
            key: `${employeeName}-${dateStr}`,
            employeeName,
            company,
            isHoliday: isHolidayForDisplay(dateStr, customHolidaySet),
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

      groups.sort((a, b) => a.date.localeCompare(b.date));
    });

    const finalGroupedPunches: GroupedPunch[] = [];
    groupedByEmployee.forEach((groups) => {
      finalGroupedPunches.push(...groups);
    });

    const groupedPunchesInSelectedRange = finalGroupedPunches.filter(
      (group) => {
        if (!shouldSendDates || !filter.startDate || !filter.endDate)
          return true;
        return group.date >= filter.startDate && group.date <= filter.endDate;
      },
    );

    groupedPunchesInSelectedRange.sort((a, b) => {
      const employeeCompare = a.employeeName.localeCompare(b.employeeName);
      if (employeeCompare !== 0) return employeeCompare;
      return a.date.localeCompare(b.date);
    });

    let maxPairs = 1;
    groupedPunchesInSelectedRange.forEach((group) => {
      maxPairs = Math.max(maxPairs, group.punches.length);
    });

    return {
      groupedPunches: groupedPunchesInSelectedRange,
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
    filter.employeeId,
    shouldSendDates,
    customHolidaySet,
    escalaEntries,
  ]);

  const prepareExportData = (): PontoData[] => {
    return groupedPunches.map((group) => {
      const emp = employees?.content?.find(
        (e) => formatEmployeeName(e.name) === group.employeeName,
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

  const handleExportReport = async () => {
    if (!filter.startDate || !filter.endDate || groupedPunches.length === 0) {
      return;
    }

    const exportData = prepareExportData();
    const selectedEmployee = employees?.content?.find(
      (e) => e.id === filter.employeeId,
    );

    saveToHistoryMutation.mutate(
      {
        employeeId: filter.employeeId > 0 ? filter.employeeId : undefined,
        employeeName: formatEmployeeName(selectedEmployee?.name),
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
          exportPDFMutation.mutate({
            employeeName: formatEmployeeName(selectedEmployee?.name),
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
      },
    );
  };

  // Agrega groupedPunches por funcionario e gera o PDF de resumo
  // (uma linha por funcionario com totais somados no periodo).
  const handleExportResumo = () => {
    if (!filter.startDate || !filter.endDate || groupedPunches.length === 0) {
      return;
    }

    // Converte "HH:mm" em decimal de horas (tolerante a vazio/-)
    const parseHm = (t?: string): number => {
      if (!t || t === "-" || t.trim() === "") return 0;
      const [h, m] = t.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return 0;
      return h + m / 60;
    };
    const fmtHm = (hours: number): string => {
      const totalMin = Math.round(hours * 60);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    type Acc = {
      employeeName: string;
      adn: number;
      e50d: number;
      e100d: number;
      e50n: number;
      e100n: number;
      normal: number;
    };
    const byEmp = new Map<string, Acc>();
    for (const g of groupedPunches) {
      const key = g.employeeName || "—";
      const prev = byEmp.get(key) ?? {
        employeeName: key,
        adn: 0,
        e50d: 0,
        e100d: 0,
        e50n: 0,
        e100n: 0,
        normal: 0,
      };
      prev.adn += parseHm(g.adicionalNoturno);
      prev.e50d += parseHm(g.extra50Diurno);
      prev.e100d += parseHm(g.extra100Diurno);
      prev.e50n += parseHm(g.extra50Noturno);
      prev.e100n += parseHm(g.extra100Noturno);
      prev.normal += parseHm(g.horasNormais);
      byEmp.set(key, prev);
    }

    const data = Array.from(byEmp.values())
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName))
      .map((r) => ({
        employeeName: r.employeeName,
        adicionalNoturno: fmtHm(r.adn),
        extra50Diurno: fmtHm(r.e50d),
        extra100Diurno: fmtHm(r.e100d),
        extra50Noturno: fmtHm(r.e50n),
        extra100Noturno: fmtHm(r.e100n),
        horasNormais: fmtHm(r.normal),
      }));

    exportResumoMutation.mutate({
      startDate: filter.startDate,
      endDate: filter.endDate,
      data,
    });
  };

  useEffect(() => {
    if (!canFetch || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
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
    ...[...mappedCompanies, NO_MAPPED_COMPANY_LABEL]
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b)),
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
    <>
  <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
    <div className="flex items-center gap-2">
      <h1 className="text-xl font-semibold">Ponto</h1>
    </div>
  </header>

  <div className="flex flex-1 flex-col gap-6 p-6 w-full min-h-0">
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
        <TabsList>
          <TabsTrigger
            value="visualizar"
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Visualizar
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          {lastSyncData && (
            <span className="text-sm text-muted-foreground">
              Última sincronização:{" "}
              {new Date(lastSyncData.lastSyncAt).toLocaleString("pt-BR")}
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
                {syncMutation.progress &&
                  syncMutation.progress.total > 0 && (
                    <span className="ml-2 font-medium">
                      {syncMutation.progress.percent}%
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        ({syncMutation.progress.processed}/
                        {syncMutation.progress.total})
                      </span>
                    </span>
                  )}
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

      <TabsContent value="visualizar" className="space-y-6">
        <Card>
          <CardContent className="">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between">
              <div>
                <h3 className="text-lg font-semibold">Filtros</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione os filtros para visualizar os pontos
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
              <div className="flex-1 space-y-4 lg:space-y-0 lg:flex lg:items-center lg:gap-4">
                {/* ── Colaborador ── */}
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="whitespace-nowrap text-sm font-medium">
                    Colaborador:
                  </Label>
                  <div className="flex items-center gap-1">
                    <Popover
                      open={openEmployee}
                      onOpenChange={setOpenEmployee}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openEmployee}
                          className="w-[300px] justify-between font-normal"
                        >
                          <span className="truncate">
                            {selectedEmployeeName ||
                              "Selecione um colaborador..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command
                          filter={(value, search) => {
                            const v = removeAccentsFrom(
                              value,
                            ).toLowerCase();
                            const s = removeAccentsFrom(
                              search,
                            ).toLowerCase();
                            return v.includes(s) ? 1 : 0;
                          }}
                        >
                          <CommandInput placeholder="Pesquisar colaborador..." />
                          <CommandList>
                            <CommandEmpty>
                              Nenhum colaborador encontrado.
                            </CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="todos"
                                onSelect={() => {
                                  setFilter((prev) => ({
                                    ...prev,
                                    employeeId: 0,
                                  }));
                                  setOpenEmployee(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    filter.employeeId === 0
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                Todos
                              </CommandItem>
                              {employeeOptions.map((employee) => {
                                return (
                                  <CommandItem
                                    key={employee.id}
                                    value={employee.name}
                                    onSelect={() => {
                                      setFilter((prev) => ({
                                        ...prev,
                                        employeeId: employee.id,
                                      }));
                                      setOpenEmployee(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        filter.employeeId === employee?.id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    {employee.name}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => navigateEmployee("prev")}
                      disabled={employeeOptions.length === 0}
                      title="Colaborador anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => navigateEmployee("next")}
                      disabled={employeeOptions.length === 0}
                      title="Próximo colaborador"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground whitespace-nowrap">
                      <Checkbox
                        checked={showInactiveEmployees}
                        onCheckedChange={(checked) =>
                          setShowInactiveEmployees(checked === true)
                        }
                      />
                      Exibir inativos
                    </label>
                    {filter.employeeId >= 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setFilter((prev) => ({
                            ...prev,
                            employeeId: -1,
                          }))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── Empresa ── */}
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

                {/* ── Data inicial ── */}
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

                {/* ── Data final ── */}
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

                {/* ── Botoes de exportacao ── */}
                {hasFilters &&
                  shouldSendDates &&
                  isDateRangeValid &&
                  groupedPunches.length > 0 && (
                    <div className="ml-auto flex gap-2">
                      {/* Resumo PDF: apenas no modo Todos (employeeId === 0) */}
                      {filter.employeeId === 0 && (
                        <Button
                          variant="outline"
                          onClick={handleExportResumo}
                          disabled={exportResumoMutation.isPending}
                        >
                          {exportResumoMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4" />
                              Resumo PDF
                            </>
                          )}
                        </Button>
                      )}
                      {/* Exportar PDF detalhado: somente para funcionario unico */}
                      {filter.employeeId > 0 && (
                        <Button
                          onClick={handleExportReport}
                          disabled={
                            exportPDFMutation.isPending ||
                            saveToHistoryMutation.isPending
                          }
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
                  )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardContent className="flex flex-col flex-1 min-h-0 pb-6">
            <div className="border-b pb-4 mb-4">
              <h3 className="text-lg font-semibold">Resultado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Visualização dos pontos registrados
              </p>
            </div>

            {filter.employeeId <= 0 ? (
              <div className="flex flex-1 items-center justify-center min-h-[280px] rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20">
                <p className="text-muted-foreground text-center text-sm px-4">
                  Selecione um colaborador para visualizar os pontos
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto min-h-[200px]">
                <Table className="w-full min-w-[800px]">
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
                    {shouldSendDates && !isDateRangeValid ? (
                      <TableRow>
                        <TableCell
                          colSpan={dynamicColumns.length}
                          className="text-center py-8 text-red-500"
                        >
                          Data final deve ser maior ou igual à data
                          inicial
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
                            <TableCell
                              className={`px-4 py-3 border-r border-gray-200 ${
                                isNoCompany(group.company)
                                  ? "bg-yellow-100 text-yellow-900 font-semibold"
                                  : ""
                              }`}
                            >
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

                            {(() => {
                              const dayHasIncomplete =
                                group.punches.length === 0 ||
                                group.punches.some(
                                  (p) => !p.dateIn || !p.dateOut,
                                );
                              const highlightDay =
                                dayHasIncomplete &&
                                !isNoCompany(group.company);
                              const cellHighlight = highlightDay
                                ? "bg-red-300 text-red-900 font-semibold"
                                : "";

                              return Array.from({ length: maxPunchPairs }).map(
                                (_, index) => {
                                  const punch = group.punches[index];
                                  const entryTime = punch?.dateIn
                                    ? new Date(
                                        punch.dateIn,
                                      ).toLocaleTimeString("pt-BR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "-";
                                  const exitTime = punch?.dateOut
                                    ? new Date(
                                        punch.dateOut,
                                      ).toLocaleTimeString("pt-BR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "-";

                                  return (
                                    <Fragment
                                      key={`punch-${group.key}-${index}`}
                                    >
                                      <TableCell
                                        className={`px-4 py-3 border-r border-gray-200 ${cellHighlight}`}
                                      >
                                        {entryTime}
                                      </TableCell>
                                      <TableCell
                                        className={`px-4 py-3 border-r border-gray-200 ${cellHighlight}`}
                                      >
                                        {exitTime}
                                      </TableCell>
                                    </Fragment>
                                  );
                                },
                              );
                            })()}

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
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="historico" className="mt-6">
        <PontoHistory />
      </TabsContent>
    </Tabs>
  </div>
    </>
  );
}
