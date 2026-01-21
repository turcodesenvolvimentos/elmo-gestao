"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useEmployees } from "@/hooks/use-employees";
import { usePunchesInfinite } from "@/hooks/use-punches";
import { useCompanies } from "@/hooks/use-companies";
import {
  useFoodVouchers,
  useToggleFoodVoucher,
} from "@/hooks/use-food-vouchers";
import { calcularHorasPorPeriodo, formatarHoras } from "@/lib/ponto-calculator";
import { getCompanyFromPunch } from "@/utils/company-mapping";
import Holidays from "date-holidays";
import { Employee } from "@/types/employees";
import { Company } from "@/types/companies";
import { toast } from "sonner";

interface WorkDay {
  date: string;
  formattedDate: string;
  company: string;
  companyId?: string;
  entry1: string;
  exit1: string;
  entry2?: string;
  exit2?: string;
  totalHours: string;
  totalHoursNumeric: number;
  valeAlimentacao: boolean;
  ajudaCusto: boolean;
  vrValue: number;
  costHelpValue: number;
}

interface EmployeeSummary {
  id: number;
  name: string;
  totalVr: number;
  totalCostHelp: number;
}

export default function ValeAlimentacaoPage() {
  const hd = useMemo(() => new Holidays("BR"), []);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{
    startDate: string;
    endDate: string;
  }>({ startDate: "", endDate: "" });

  const { data: employeesData, isLoading: employeesLoading } = useEmployees({
    page: 1,
    size: 100,
  });

  const { data: companiesData } = useCompanies();

  const hasFilters = !!(appliedFilters.startDate && appliedFilters.endDate);
  const isDateRangeValid =
    !appliedFilters.startDate ||
    !appliedFilters.endDate ||
    new Date(appliedFilters.endDate) >= new Date(appliedFilters.startDate);

  // Validação para os campos de input (antes de aplicar)
  const isInputDateRangeValid =
    !startDate || !endDate || new Date(endDate) >= new Date(startDate);

  // Buscar estados salvos de vale alimentação e ajuda de custo
  const { data: foodVouchersData } = useFoodVouchers(
    hasFilters && isDateRangeValid
      ? {
          start_date: appliedFilters.startDate,
          end_date: appliedFilters.endDate,
        }
      : undefined
  );

  // Criar mapa de estados por funcionário/data
  const foodVouchersMap = useMemo(() => {
    const map = new Map<
      string,
      { vale_alimentacao: boolean; ajuda_custo: boolean }
    >();
    if (foodVouchersData) {
      foodVouchersData.forEach((fv) => {
        const key = `${fv.employee_id}-${fv.work_date}`;
        map.set(key, {
          vale_alimentacao: fv.vale_alimentacao,
          ajuda_custo: fv.ajuda_custo,
        });
      });
    }
    return map;
  }, [foodVouchersData]);

  const toggleFoodVoucherMutation = useToggleFoodVoucher();

  const startDateTimestamp =
    hasFilters && isDateRangeValid && appliedFilters.startDate
      ? (() => {
          const date = new Date(appliedFilters.startDate + "T00:00:00Z");
          return date.getTime().toString();
        })()
      : undefined;
  const endDateTimestamp =
    hasFilters && isDateRangeValid && appliedFilters.endDate
      ? (() => {
          const date = new Date(appliedFilters.endDate + "T23:59:59.999Z");
          return date.getTime().toString();
        })()
      : undefined;

  const {
    data: punchesData,
    isLoading: punchesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePunchesInfinite(
    1000,
    startDateTimestamp,
    endDateTimestamp,
    undefined,
    "APPROVED",
    hasFilters && isDateRangeValid
  );

  // Criar mapa de empresas por nome para buscar valores de VR e Ajuda de Custo
  const companiesMap = useMemo(() => {
    const map = new Map<string, Company>();
    if (companiesData?.companies) {
      companiesData.companies.forEach((company) => {
        map.set(company.name, company);
      });
    }
    return map;
  }, [companiesData]);

  // Agrupar pontos por funcionário e data
  const groupedPunchesByEmployee = useMemo(() => {
    if (!punchesData || !hasFilters || !isDateRangeValid) {
      return new Map<number, WorkDay[]>();
    }

    const allPunchesRaw =
      punchesData.pages.flatMap((page) => page.content || []) || [];

    if (allPunchesRaw.length === 0) {
      return new Map<number, WorkDay[]>();
    }

    // Filtrar por período de datas (a API já filtra, mas garantimos aqui também)
    const filteredPunches = allPunchesRaw.filter((punch: any) => {
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

      // Se temos filtros aplicados, validar o período
      if (appliedFilters.startDate && appliedFilters.endDate) {
        return (
          punchDateStr >= appliedFilters.startDate &&
          punchDateStr <= appliedFilters.endDate
        );
      }

      return true;
    });

    // Agrupar por funcionário e data
    const grouped = new Map<number, Map<string, any>>();
    const lastGroupByEmployee = new Map<
      string,
      { key: string; dateStr: string; hadNightShift: boolean }
    >();

    // Criar mapa de funcionários por nome para obter IDs (normalizado para comparação)
    const employeesByNameMap = new Map<string, number>();
    const employeesByNameNormalizedMap = new Map<string, number>();
    if (employeesData?.content) {
      employeesData.content.forEach((emp) => {
        employeesByNameMap.set(emp.name, emp.id);
        // Também criar mapa com nome normalizado (sem espaços extras, lowercase)
        const normalizedName = emp.name
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " ");
        employeesByNameNormalizedMap.set(normalizedName, emp.id);
      });
    }

    filteredPunches.forEach((punch: any) => {
      const employeeName = punch.employee?.name || "sem-nome";
      // Tentar encontrar por nome exato primeiro
      let employeeId = employeesByNameMap.get(employeeName);

      // Se não encontrar, tentar com nome normalizado
      if (!employeeId) {
        const normalizedName = employeeName
          .toLowerCase()
          .trim()
          .replace(/\s+/g, " ");
        employeeId = employeesByNameNormalizedMap.get(normalizedName);
      }

      if (!employeeId) {
        // Funcionário não encontrado na lista - pode ser que o nome não corresponda exatamente
        // ou o funcionário foi removido. Ignorar este ponto.
        return;
      }

      const punchDateStr = punch.date
        ? punch.date.includes("T")
          ? punch.date.split("T")[0]
          : punch.date.substring(0, 10)
        : punch.dateIn
          ? punch.dateIn.split("T")[0]
          : punch.dateOut
            ? punch.dateOut.split("T")[0]
            : null;

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

      if (!grouped.has(employeeId)) {
        grouped.set(employeeId, new Map());
      }

      const employeeGroups = grouped.get(employeeId)!;

      if (!employeeGroups.has(baseDateStr)) {
        const [year, month, day] = baseDateStr.split("-");
        const formattedDate = `${day}/${month}/${year}`;
        const company = getCompanyFromPunch(punch);

        employeeGroups.set(baseDateStr, {
          date: baseDateStr,
          formattedDate,
          company,
          punches: [],
        });
      }

      employeeGroups.get(baseDateStr)!.punches.push({
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

    // Processar grupos e calcular valores
    const result = new Map<number, WorkDay[]>();

    grouped.forEach((employeeGroups, employeeId) => {
      const workDays: WorkDay[] = [];

      employeeGroups.forEach((group, dateStr) => {
        const calculoHoras = calcularHorasPorPeriodo(group.punches, dateStr);
        const totalHoursNumeric = calculoHoras.totalHoras;
        const totalHours = formatarHoras(totalHoursNumeric);

        // Obter empresa e valores FIXOS de VR/Ajuda de Custo
        const company = companiesMap.get(group.company);
        const vrValue = company?.vr_per_hour || 0; // Valor fixo por dia
        const costHelpValue = company?.cost_help_per_hour || 0; // Valor fixo por dia

        // Verificar estados salvos de vale alimentação e ajuda de custo
        const voucherKey = `${employeeId}-${dateStr}`;
        const savedState = foodVouchersMap.get(voucherKey);

        // Determinar tipo de dia para regra de ativação automática
        const workDate = new Date(dateStr + "T12:00:00Z");
        const dayOfWeek = workDate.getDay(); // 0 = domingo, 6 = sábado
        const isHoliday = !!hd.isHoliday(workDate);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Domingo ou sábado
        const isWeekendOrHoliday = isWeekend || isHoliday;

        // Regras de ativação automática:
        // - Dia útil (segunda a sexta, não feriado): > 6 horas → ativa automaticamente
        // - Sábado, domingo ou feriado: > 4 horas → ativa automaticamente
        const minHoursForAutoActivation = isWeekendOrHoliday ? 4 : 6;
        const shouldAutoActivate =
          totalHoursNumeric > minHoursForAutoActivation;

        // Se há estado salvo, usar ele; senão, usar regra automática baseada nas horas
        const valeAlimentacaoEnabled = savedState
          ? savedState.vale_alimentacao
          : shouldAutoActivate && vrValue > 0;
        const ajudaCustoEnabled = savedState
          ? savedState.ajuda_custo
          : shouldAutoActivate && costHelpValue > 0;

        // Formatar entradas e saídas
        const punches = group.punches.filter(
          (p: { dateIn?: string; dateOut?: string }) => p.dateIn && p.dateOut
        );

        const sortedPunches = [...punches].sort((a, b) => {
          if (!a.dateIn || !b.dateIn) return 0;
          return new Date(a.dateIn).getTime() - new Date(b.dateIn).getTime();
        });

        const entry1 = sortedPunches[0]?.dateIn
          ? new Date(sortedPunches[0].dateIn).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-";
        const exit1 = sortedPunches[0]?.dateOut
          ? new Date(sortedPunches[0].dateOut).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-";
        const entry2 = sortedPunches[1]?.dateIn
          ? new Date(sortedPunches[1].dateIn).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined;
        const exit2 = sortedPunches[1]?.dateOut
          ? new Date(sortedPunches[1].dateOut).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined;

        workDays.push({
          date: dateStr,
          formattedDate: group.formattedDate,
          company: group.company,
          companyId: company?.id,
          entry1,
          exit1,
          entry2,
          exit2,
          totalHours,
          totalHoursNumeric,
          valeAlimentacao: valeAlimentacaoEnabled,
          ajudaCusto: ajudaCustoEnabled,
          vrValue,
          costHelpValue,
        });
      });

      // Ordenar por data
      workDays.sort((a, b) => a.date.localeCompare(b.date));

      if (workDays.length > 0) {
        result.set(employeeId, workDays);
      }
    });

    return result;
  }, [
    punchesData,
    appliedFilters,
    hasFilters,
    isDateRangeValid,
    companiesMap,
    employeesData,
    foodVouchersMap,
  ]);

  // Calcular resumo por funcionário
  const employeeSummaries = useMemo(() => {
    if (!employeesData?.content || !hasFilters) return [];

    // Criar summaries apenas para funcionários que têm pontos no período
    const summaries: EmployeeSummary[] = [];

    groupedPunchesByEmployee.forEach((workDays, employeeId) => {
      const employee = employeesData.content.find((e) => e.id === employeeId);
      if (!employee) return;

      let totalVr = 0;
      let totalCostHelp = 0;

      workDays.forEach((day) => {
        // Somar apenas se estiver ativado (valores são fixos por dia)
        if (day.valeAlimentacao) {
          totalVr += day.vrValue; // Valor fixo da empresa
        }
        if (day.ajudaCusto) {
          totalCostHelp += day.costHelpValue; // Valor fixo da empresa
        }
      });

      summaries.push({
        id: employee.id,
        name: employee.name,
        totalVr,
        totalCostHelp,
      });
    });

    // Ordenar por nome alfabeticamente
    summaries.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    return summaries;
  }, [employeesData, groupedPunchesByEmployee, hasFilters]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSummaries) return [];
    return employeeSummaries.filter((employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employeeSummaries, searchTerm]);

  const handleOpenDetails = (employee: EmployeeSummary) => {
    const fullEmployee = employeesData?.content.find(
      (e) => e.id === employee.id
    );
    if (fullEmployee) {
      setSelectedEmployee(fullEmployee);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleApplyFilters = () => {
    if (startDate && endDate && isInputDateRangeValid) {
      setAppliedFilters({ startDate, endDate });
    }
  };

  const toggleValeAlimentacao = async (
    employeeId: number,
    date: string,
    currentVrState: boolean,
    currentAjudaCustoState: boolean,
    companyId?: string
  ) => {
    try {
      await toggleFoodVoucherMutation.mutateAsync({
        employee_id: employeeId,
        work_date: date,
        vale_alimentacao: !currentVrState,
        ajuda_custo: currentAjudaCustoState, // Manter o estado atual de ajuda de custo
        company_id: companyId,
      });

      toast.success(
        `Vale alimentação ${
          !currentVrState ? "ativado" : "desativado"
        } com sucesso!`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao alterar vale alimentação"
      );
    }
  };

  const toggleAjudaCusto = async (
    employeeId: number,
    date: string,
    currentVrState: boolean,
    currentAjudaCustoState: boolean,
    companyId?: string
  ) => {
    try {
      await toggleFoodVoucherMutation.mutateAsync({
        employee_id: employeeId,
        work_date: date,
        vale_alimentacao: currentVrState, // Manter o estado atual de vale alimentação
        ajuda_custo: !currentAjudaCustoState,
        company_id: companyId,
      });

      toast.success(
        `Ajuda de custo ${
          !currentAjudaCustoState ? "ativada" : "desativada"
        } com sucesso!`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao alterar ajuda de custo"
      );
    }
  };

  const workDays = useMemo(() => {
    if (!selectedEmployee) return [];
    const workDaysArray = groupedPunchesByEmployee.get(selectedEmployee.id);
    return workDaysArray || [];
  }, [selectedEmployee, groupedPunchesByEmployee]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <SidebarProvider>
      <AppSidebar collapsible="icon" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-xl font-semibold">Vale Alimentação</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      type="date"
                      placeholder="Data inicial"
                      className="w-full sm:w-auto"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <Input
                      type="date"
                      placeholder="Data final"
                      className="w-full sm:w-auto"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <Button
                    className="whitespace-nowrap"
                    onClick={handleApplyFilters}
                    disabled={
                      !startDate ||
                      !endDate ||
                      !isInputDateRangeValid ||
                      punchesLoading
                    }
                  >
                    {punchesLoading ? "Carregando..." : "Aplicar Filtros"}
                  </Button>
                </div>
                {startDate && endDate && !isInputDateRangeValid && (
                  <div className="text-sm text-red-500 mt-2">
                    Data final deve ser maior ou igual à data inicial
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="">
              {employeesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-10 w-10 rounded-full border-4 border-muted-foreground/30 border-t-green-700 animate-spin" />
                </div>
              ) : !hasFilters ? (
                <div className="text-center py-8 text-muted-foreground">
                  Selecione um período de datas e clique em "Aplicar Filtros"
                  para visualizar os dados
                </div>
              ) : punchesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-10 w-10 rounded-full border-4 border-muted-foreground/30 border-t-green-700 animate-spin" />
                </div>
              ) : !punchesData ||
                (punchesData.pages.length > 0 &&
                  punchesData.pages.every(
                    (page) => !page.content || page.content.length === 0
                  )) ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum ponto registrado encontrado no período selecionado
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm
                    ? "Nenhum funcionário encontrado com esse nome"
                    : "Nenhum funcionário com pontos registrados no período selecionado"}
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm gap-4">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium">
                          Funcionário
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium">
                          Vale Alimentação
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium">
                          Ajuda de Custo
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee) => (
                        <tr
                          key={employee.id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="p-4 align-middle font-medium">
                            {employee.name}
                          </td>
                          <td className="p-4 align-middle">
                            {formatCurrency(employee.totalVr)}
                          </td>
                          <td className="p-4 align-middle">
                            {formatCurrency(employee.totalCostHelp)}
                          </td>
                          <td className="p-4 align-middle">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetails(employee)}
                            >
                              Ver Detalhes
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="dialog-override flex flex-col p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between text-xl">
                  <span>
                    Detalhes do Funcionário - {selectedEmployee?.name}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Nome</p>
                        <p className="font-medium text-lg">
                          {selectedEmployee?.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Vale Alimentação
                        </p>
                        <p className="font-medium text-lg">
                          {formatCurrency(
                            workDays.reduce(
                              (sum, day) =>
                                sum + (day.valeAlimentacao ? day.vrValue : 0),
                              0
                            )
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Ajuda de Custo
                        </p>
                        <p className="font-medium text-lg">
                          {formatCurrency(
                            workDays.reduce(
                              (sum, day) =>
                                sum + (day.ajudaCusto ? day.costHelpValue : 0),
                              0
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="flex-1 overflow-hidden flex flex-col">
                  <CardContent className="p-0 flex-1 overflow-hidden">
                    <div className="h-full flex flex-col overflow-hidden">
                      <div className="flex-1 overflow-auto relative">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-background z-10 border-b shadow-sm">
                            <tr className="border-b">
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Data
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Empresa
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Entrada 1
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Saída 1
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Entrada 2
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Saída 2
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Total
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Vale Alimentação
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Ajuda de Custo
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {workDays.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={9}
                                  className="p-8 text-center text-muted-foreground"
                                >
                                  Nenhum dia trabalhado encontrado no período
                                  selecionado
                                </td>
                              </tr>
                            ) : (
                              workDays.map((day, index) => (
                                <tr
                                  key={index}
                                  className="border-b hover:bg-muted/50"
                                >
                                  <td className="p-4 align-middle font-medium whitespace-nowrap">
                                    {day.formattedDate}
                                  </td>
                                  <td className="p-4 align-middle whitespace-nowrap">
                                    {day.company}
                                  </td>
                                  <td className="p-4 align-middle whitespace-nowrap">
                                    {day.entry1}
                                  </td>
                                  <td className="p-4 align-middle whitespace-nowrap">
                                    {day.exit1}
                                  </td>
                                  <td className="p-4 align-middle whitespace-nowrap">
                                    {day.entry2 || "-"}
                                  </td>
                                  <td className="p-4 align-middle whitespace-nowrap">
                                    {day.exit2 || "-"}
                                  </td>
                                  <td className="p-4 align-middle font-medium whitespace-nowrap">
                                    {day.totalHours}
                                  </td>
                                  <td className="p-4 align-middle whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                      <Button
                                        variant={
                                          day.valeAlimentacao
                                            ? "default"
                                            : "outline"
                                        }
                                        size="sm"
                                        onClick={() =>
                                          toggleValeAlimentacao(
                                            selectedEmployee!.id,
                                            day.date,
                                            day.valeAlimentacao,
                                            day.ajudaCusto,
                                            day.companyId
                                          )
                                        }
                                        disabled={
                                          toggleFoodVoucherMutation.isPending
                                        }
                                        className="w-28"
                                      >
                                        {day.valeAlimentacao
                                          ? "Ativado"
                                          : "Desativado"}
                                      </Button>
                                      {day.valeAlimentacao &&
                                        day.vrValue > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                            {formatCurrency(day.vrValue)}
                                          </span>
                                        )}
                                    </div>
                                  </td>
                                  <td className="p-4 align-middle whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                      <Button
                                        variant={
                                          day.ajudaCusto ? "default" : "outline"
                                        }
                                        size="sm"
                                        onClick={() =>
                                          toggleAjudaCusto(
                                            selectedEmployee!.id,
                                            day.date,
                                            day.valeAlimentacao,
                                            day.ajudaCusto,
                                            day.companyId
                                          )
                                        }
                                        disabled={
                                          toggleFoodVoucherMutation.isPending
                                        }
                                        className="w-28"
                                      >
                                        {day.ajudaCusto
                                          ? "Ativado"
                                          : "Desativado"}
                                      </Button>
                                      {day.ajudaCusto &&
                                        day.costHelpValue > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                            {formatCurrency(day.costHelpValue)}
                                          </span>
                                        )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
