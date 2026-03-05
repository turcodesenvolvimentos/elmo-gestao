"use client";

import { useState, useMemo } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Eye,
  Users,
  Building,
  Calendar,
  Settings,
  Trash2,
  Copy,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import { useCompanies, useCompanyEmployees } from "@/hooks/use-companies";
import { useShifts } from "@/hooks/use-shifts";
import {
  useBatchCreateEscalas,
  useEscalas,
  useDeleteEscala,
} from "@/hooks/use-escalas";
import { useQuery } from "@tanstack/react-query";
import { fetchAllShifts } from "@/services/shifts.service";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function EscalaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<
    "all" | string
  >("all");
  const [funcionariosExpandido, setFuncionariosExpandido] = useState<
    Set<string>
  >(new Set());
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState("");

  // Hooks
  const { data: companiesData } = useCompanies();
  const { data: employeesData } = useCompanyEmployees(selectedCompany || "");
  const { data: shiftsData } = useShifts(selectedCompany || "");
  const { data: allShiftsData } = useQuery({
    queryKey: ["shifts", "all"],
    queryFn: () => fetchAllShifts(),
    staleTime: 5 * 60 * 1000,
  });
  const batchCreateEscalasMutation = useBatchCreateEscalas();
  const deleteEscalaMutation = useDeleteEscala();
  // Buscar todas as escalas aplicadas e filtrar por empresa no cliente
  const { data: escalasData, isLoading: escalasLoading } = useEscalas();

  const companies = useMemo(
    () => companiesData?.companies || [],
    [companiesData?.companies]
  );
  const companyEmployees = employeesData?.employees || [];
  const companyShifts = shiftsData?.shifts || [];
  const allShifts = allShiftsData?.shifts || [];
  const escalas = escalasData?.escalas || [];

  // Escalas apenas da empresa selecionada (com base no company_id do turno)
  const escalasByCompany = useMemo(
    () =>
      escalas.filter(
        (escala) =>
          !!selectedCompany && escala.shift?.company_id === selectedCompany
      ),
    [escalas, selectedCompany]
  );

  // Agrupar por escala (turno) + período: cada item = uma escala aplicada com lista de funcionários
  type EscalaAgrupada = {
    shiftId: string;
    shiftName: string;
    entry1: string;
    exit1: string;
    entry2: string | null;
    exit2: string | null;
    startDate: string;
    endDate: string | null;
    funcionarios: { nome: string; escalaId: string }[];
  };
  const escalasAgrupadas = useMemo((): EscalaAgrupada[] => {
    const map = new Map<
      string,
      {
        shiftId: string;
        shiftName: string;
        entry1: string;
        exit1: string;
        entry2: string | null;
        exit2: string | null;
        startDate: string;
        endDate: string | null;
        funcionarios: { nome: string; escalaId: string }[];
      }
    >();
    escalasByCompany.forEach((e) => {
      const key = `${e.shift_id}-${e.start_date}-${e.end_date ?? "indefinido"}`;
      if (!map.has(key)) {
        map.set(key, {
          shiftId: e.shift_id,
          shiftName: e.shift?.name ?? "Escala",
          entry1: e.shift?.entry1 ?? "",
          exit1: e.shift?.exit1 ?? "",
          entry2: e.shift?.entry2 ?? null,
          exit2: e.shift?.exit2 ?? null,
          startDate: e.start_date,
          endDate: e.end_date ?? null,
          funcionarios: [],
        });
      }
      const g = map.get(key)!;
      g.funcionarios.push({
        nome: e.employee?.name ?? "Funcionário não encontrado",
        escalaId: e.id,
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.shiftName.localeCompare(b.shiftName, "pt-BR")
    );
  }, [escalasByCompany]);

  // Por empresa: quantas escalas (turnos) distintas estão aplicadas e para quantos funcionários
  const escalasBadgeByCompanyId = useMemo(() => {
    const distinctShifts: Record<string, Set<string>> = {};
    const funcionariosCount: Record<string, number> = {};
    escalas.forEach((e) => {
      const cid = e.shift?.company_id;
      if (!cid) return;
      if (!distinctShifts[cid]) distinctShifts[cid] = new Set();
      distinctShifts[cid].add(e.shift_id);
      funcionariosCount[cid] = (funcionariosCount[cid] ?? 0) + 1;
    });
    return Object.keys(distinctShifts).reduce((acc, cid) => {
      acc[cid] = {
        escalas: distinctShifts[cid].size,
        funcionarios: funcionariosCount[cid] ?? 0,
      };
      return acc;
    }, {} as Record<string, { escalas: number; funcionarios: number }>);
  }, [escalas]);

  // Filtrar empresas por termo de busca
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [companies, searchTerm]);

  const handleDeleteEscala = async (id: string) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja remover esta aplicação de escala?"
    );
    if (!confirmed) return;

    try {
      await deleteEscalaMutation.mutateAsync(id);
      toast.success("Escala removida com sucesso!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao remover escala"
      );
    }
  };

  const handleCopyEscalaAgrupada = async (grupo: EscalaAgrupada) => {
    const empresa =
      companies.find((c) => c.id === selectedCompany)?.name || "Não informada";
    const inicio = formatDate(grupo.startDate);
    const fim = grupo.endDate ? formatDate(grupo.endDate) : "indefinido";
    const horariosPrincipal = `${formatTime(grupo.entry1)} - ${formatTime(
      grupo.exit1
    )}`;
    const horariosExtra =
      grupo.entry2 && grupo.exit2
        ? ` | ${formatTime(grupo.entry2)} - ${formatTime(grupo.exit2)}`
        : "";
    const listaFuncionarios = grupo.funcionarios
      .map((f) => f.nome)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .join("\n  - ");

    const mensagem = [
      `Empresa: ${empresa}`,
      `Período: ${inicio} até ${fim}`,
      `Horários: ${horariosPrincipal}${horariosExtra}`,
      "",
      "Funcionários:",
      `  - ${listaFuncionarios}`,
    ].join("\n");

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(mensagem);
        toast.success(
          "Informações da escala copiadas para a área de transferência!"
        );
      } else {
        throw new Error("Clipboard API não disponível");
      }
    } catch {
      toast.error("Não foi possível copiar para a área de transferência.");
    }
  };

  const handleOpenDialog = (companyId: string) => {
    setSelectedCompany(companyId);
    setSelectedEmployeeIds(new Set());
    setSelectedShiftId("");
    const today = new Date();
    setStartDate(today.toISOString().split("T")[0]);
    setEndDate("");
    setIsDialogOpen(true);
  };

  const handleEmployeeToggle = (employeeId: string) => {
    const newSelected = new Set(selectedEmployeeIds);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployeeIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedEmployeeIds.size === companyEmployees.length) {
      setSelectedEmployeeIds(new Set());
    } else {
      const allIds = new Set(companyEmployees.map((emp) => emp.id));
      setSelectedEmployeeIds(allIds);
    }
  };

  const handleAssignShifts = async () => {
    if (
      !selectedCompany ||
      selectedEmployeeIds.size === 0 ||
      !selectedShiftId ||
      !startDate
    ) {
      toast.error(
        "Selecione pelo menos um funcionário, uma escala e uma data inicial"
      );
      return;
    }

    try {
      const selectedShift = companyShifts.find((s) => s.id === selectedShiftId);
      await batchCreateEscalasMutation.mutateAsync({
        employee_ids: Array.from(selectedEmployeeIds),
        shift_id: selectedShiftId,
        start_date: startDate,
        end_date: endDate || undefined,
      });
      const periodText = endDate
        ? `de ${formatDate(startDate)} até ${formatDate(endDate)}`
        : `a partir de ${formatDate(startDate)}`;
      toast.success(
        `Escala "${selectedShift?.name}" aplicada para ${selectedEmployeeIds.size} funcionário(s) ${periodText}!`
      );
      setIsDialogOpen(false);
      setSelectedEmployeeIds(new Set());
      setSelectedShiftId("");
      setEndDate("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao aplicar escalas"
      );
    }
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <SidebarProvider>
      <AppSidebar collapsible="icon" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-xl font-semibold">Escalas</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
                  Gerenciar Escalas
                </h2>
                <p className="text-muted-foreground mt-1">
                  Aplique escalas aos funcionários das empresas
                </p>
              </div>

              <Button asChild variant="outline">
                <Link href="/escala/criar">
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar Escalas
                </Link>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Empresas</CardTitle>
                <CardDescription>
                  Selecione uma empresa para gerenciar as escalas dos
                  funcionários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar empresa..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {filteredCompanies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma empresa encontrada
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Empresa</TableHead>
                            <TableHead>Endereço</TableHead>
                            <TableHead>Funcionários</TableHead>
                            <TableHead>Escalas</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCompanies.map((company) => {
                            const badge = escalasBadgeByCompanyId[
                              company.id
                            ] ?? {
                              escalas: 0,
                              funcionarios: 0,
                            };

                            return (
                              <TableRow key={company.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4 text-muted-foreground" />
                                    {company.name}
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {company.address}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    <Users className="h-3 w-3 mr-1" />
                                    {company.employee_count}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {badge.escalas} escala
                                    {badge.escalas !== 1 ? "s" : ""} aplicada
                                    {badge.escalas !== 1 ? "s" : ""}
                                    {badge.funcionarios > 0 && (
                                      <>
                                        {" "}
                                        · {badge.funcionarios} funcionário
                                        {badge.funcionarios !== 1 ? "s" : ""}
                                      </>
                                    )}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedCompany(company.id);
                                        setSelectedEmployeeFilter("all");
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver Escalas
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleOpenDialog(company.id)
                                      }
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Aplicar Escala
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Lista de escalas aplicadas */}
            <Card>
              <CardHeader>
                <CardTitle>Escalas aplicadas</CardTitle>
                <CardDescription>
                  Veja as escalas já aplicadas para os funcionários da empresa
                  selecionada
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedCompany ? (
                  <p className="text-muted-foreground">
                    Selecione uma empresa na tabela acima (botão{" "}
                    <span className="font-medium">&quot;Ver Escalas&quot;</span>
                    ) para visualizar as escalas aplicadas.
                  </p>
                ) : escalasLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Carregando escalas...
                  </div>
                ) : escalasAgrupadas.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhuma escala aplicada encontrada para esta empresa.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Empresa selecionada:{" "}
                      <span className="font-medium text-foreground">
                        {companies.find((c) => c.id === selectedCompany)?.name}
                      </span>
                    </p>

                    <div className="space-y-4">
                      {escalasAgrupadas.map((grupo) => (
                        <div
                          key={`${grupo.shiftId}-${grupo.startDate}-${
                            grupo.endDate ?? "indefinido"
                          }`}
                          className="rounded-lg border p-4 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="grid gap-1 text-sm">
                              <p>
                                <span className="text-muted-foreground">
                                  Empresa:
                                </span>{" "}
                                {
                                  companies.find(
                                    (c) => c.id === selectedCompany
                                  )?.name
                                }
                              </p>
                              <p>
                                <span className="text-muted-foreground">
                                  Escala:
                                </span>{" "}
                                {grupo.shiftName}
                              </p>
                              <p>
                                <span className="text-muted-foreground">
                                  Período:
                                </span>{" "}
                                {formatDate(grupo.startDate)} até{" "}
                                {grupo.endDate
                                  ? formatDate(grupo.endDate)
                                  : "Indefinido"}
                              </p>
                              <p>
                                <span className="text-muted-foreground">
                                  Horários:
                                </span>{" "}
                                {formatTime(grupo.entry1)} -{" "}
                                {formatTime(grupo.exit1)}
                                {grupo.entry2 &&
                                  grupo.exit2 &&
                                  ` | ${formatTime(
                                    grupo.entry2
                                  )} - ${formatTime(grupo.exit2)}`}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyEscalaAgrupada(grupo)}
                              className="shrink-0"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar
                            </Button>
                          </div>
                          <Collapsible
                            open={funcionariosExpandido.has(
                              `${grupo.shiftId}-${grupo.startDate}-${
                                grupo.endDate ?? "indefinido"
                              }`
                            )}
                            onOpenChange={(open) => {
                              const key = `${grupo.shiftId}-${
                                grupo.startDate
                              }-${grupo.endDate ?? "indefinido"}`;
                              setFuncionariosExpandido((prev) => {
                                const next = new Set(prev);
                                if (open) next.add(key);
                                else next.delete(key);
                                return next;
                              });
                            }}
                          >
                            <div className="border-t pt-3">
                              <CollapsibleTrigger asChild>
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between gap-2 py-1 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
                                >
                                  <span>
                                    Funcionários ({grupo.funcionarios.length})
                                  </span>
                                  <ChevronDown
                                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                                      funcionariosExpandido.has(
                                        `${grupo.shiftId}-${grupo.startDate}-${
                                          grupo.endDate ?? "indefinido"
                                        }`
                                      )
                                        ? "rotate-180"
                                        : ""
                                    }`}
                                  />
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <ul className="list-disc list-inside text-sm space-y-1 pt-2">
                                  {grupo.funcionarios
                                    .slice()
                                    .sort((a, b) =>
                                      a.nome.localeCompare(b.nome, "pt-BR")
                                    )
                                    .map((f) => (
                                      <li
                                        key={f.escalaId}
                                        className="flex items-center justify-between gap-2"
                                      >
                                        <span>{f.nome}</span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-destructive"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleDeleteEscala(f.escalaId);
                                          }}
                                          disabled={
                                            deleteEscalaMutation.isPending
                                          }
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </li>
                                    ))}
                                </ul>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Modal para aplicar escala */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="!max-w-6xl sm:!max-w-6xl md:!max-w-6xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Aplicar Escala</DialogTitle>
                <DialogDescription>
                  Selecione os funcionários, escolha uma escala e defina o
                  período
                </DialogDescription>
              </DialogHeader>

              {selectedCompany && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Lista de funcionários */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Funcionários</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAll}
                        >
                          {selectedEmployeeIds.size === companyEmployees.length
                            ? "Desmarcar Todos"
                            : "Selecionar Todos"}
                        </Button>
                      </div>
                      <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                        {companyEmployees.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Nenhum funcionário encontrado para esta empresa
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {companyEmployees.map((employee) => (
                              <div
                                key={employee.id}
                                className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded"
                              >
                                <Checkbox
                                  checked={selectedEmployeeIds.has(employee.id)}
                                  onCheckedChange={() =>
                                    handleEmployeeToggle(employee.id)
                                  }
                                />
                                <Label className="flex-1 cursor-pointer">
                                  <div className="font-medium">
                                    {employee.name}
                                  </div>
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seleção de escala e datas */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-3">Escala</h3>
                        <Select
                          value={selectedShiftId}
                          onValueChange={setSelectedShiftId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma escala" />
                          </SelectTrigger>
                          <SelectContent>
                            {companyShifts.map((shift) => (
                              <SelectItem key={shift.id} value={shift.id}>
                                <div className="flex flex-col">
                                  <span>{shift.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(shift.entry1)} -{" "}
                                    {formatTime(shift.exit1)}
                                    {shift.entry2 &&
                                      shift.exit2 &&
                                      ` | ${formatTime(
                                        shift.entry2
                                      )} - ${formatTime(shift.exit2)}`}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold mb-3">Período</h3>
                          <div className="space-y-3">
                            <div>
                              <Label
                                htmlFor="start-date"
                                className="mb-2 block"
                              >
                                Data Inicial{" "}
                                <span className="text-destructive">*</span>
                              </Label>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="start-date"
                                  type="date"
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                                  className="flex-1"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="end-date" className="mb-2 block">
                                Data Final{" "}
                                <span className="text-muted-foreground text-xs">
                                  (opcional)
                                </span>
                              </Label>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="end-date"
                                  type="date"
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
                                  className="flex-1"
                                  min={startDate}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Deixe em branco para aplicar indefinidamente
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-2">Resumo</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Empresa:</span>
                            <span className="font-medium">
                              {
                                companies.find((c) => c.id === selectedCompany)
                                  ?.name
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Funcionários selecionados:</span>
                            <span className="font-medium">
                              {selectedEmployeeIds.size}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Escala:</span>
                            <span className="font-medium">
                              {selectedShiftId
                                ? companyShifts.find(
                                    (s) => s.id === selectedShiftId
                                  )?.name
                                : "Não selecionada"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Período:</span>
                            <span className="font-medium">
                              {formatDate(startDate)}
                              {endDate && ` até ${formatDate(endDate)}`}
                              {!endDate && " (indefinido)"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAssignShifts}
                      disabled={
                        selectedEmployeeIds.size === 0 ||
                        !selectedShiftId ||
                        !startDate ||
                        batchCreateEscalasMutation.isPending
                      }
                    >
                      {batchCreateEscalasMutation.isPending
                        ? "Aplicando..."
                        : "Aplicar Escala"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
