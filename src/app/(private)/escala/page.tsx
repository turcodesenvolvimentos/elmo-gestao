"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
  Pencil,
  Check,
  ChevronsUpDown,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
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
import { useEmployees } from "@/hooks/use-employees";
import { useShifts } from "@/hooks/use-shifts";
import {
  useBatchCreateEscalas,
  useEscalas,
  useDeleteEscala,
} from "@/hooks/use-escalas";
import { useQuery } from "@tanstack/react-query";
import { fetchAllShifts } from "@/services/shifts.service";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatEmployeeName } from "@/utils/employee-name-format";

// Tipo para grupo de escala (agrupado por shift + período)
interface EscalaAgrupada {
  shiftId: string;
  shiftName: string;
  entry1: string;
  exit1: string;
  entry2: string | null;
  exit2: string | null;
  startDate: string;
  endDate: string | null;
  funcionarios: {
    nome: string;
    escalaId: string;
    employeeId: string;
    cargo: string | null;
  }[];
}

// Função auxiliar para formatar data sem fuso horário (mantém o dia exato)
function formatDateLocal(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

// Converte nome para Title Case (ex: "SAMUEL MERCI" → "Samuel Merci")
function toTitleCase(name: string): string {
  const minusculas = new Set(["de", "da", "do", "das", "dos", "e"]);
  return name
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i === 0 || !minusculas.has(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word
    )
    .join(" ");
}

// Função para formatar hora (hh:mm)
function formatTime(time: string): string {
  return time.slice(0, 5);
}

export default function EscalaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmployeeCompany, setFilterEmployeeCompany] = useState(""); // filtro de empresas por funcionário
  const [openCompanyEmployeeFilter, setOpenCompanyEmployeeFilter] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isAvailableDialogOpen, setIsAvailableDialogOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState("");

  // Estados para o modal de visualização/edição
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewCompanyId, setViewCompanyId] = useState<string | null>(null);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<EscalaAgrupada | null>(null);
  const [filterDate, setFilterDate] = useState(""); // filtro único
  const [filterEmployeeName, setFilterEmployeeName] = useState(""); // filtro por nome
  const [openEmployeeFilter, setOpenEmployeeFilter] = useState(false);
  const [editingGroup, setEditingGroup] = useState<EscalaAgrupada | null>(null);
  const viewDialogContentRef = useRef<HTMLDivElement>(null);

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
  const { data: escalasData, isLoading: escalasLoading } = useEscalas();
  const { data: allEmployeesData, isLoading: allEmployeesLoading } =
    useEmployees({ page: 1, size: 1000, includeFired: false });

  const companies = useMemo(
    () => companiesData?.companies || [],
    [companiesData?.companies]
  );
  const companyEmployees = employeesData?.employees || [];
  const companyShifts = shiftsData?.shifts || [];
  const allShifts = allShiftsData?.shifts || [];
  const escalas = escalasData?.escalas || [];

  // Nomes únicos dos funcionários da empresa sendo visualizada (para o filtro)
  const employeeNamesForFilter = useMemo(() => {
    if (!viewCompanyId) return [];
    const names = new Set<string>();
    escalas.forEach((e: any) => {
      if (e.shift?.company_id === viewCompanyId && e.employee?.name) {
        names.add(toTitleCase(e.employee.name));
      }
    });
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [escalas, viewCompanyId]);

 
  const escalasBadgeByCompanyId = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const distinctShifts: Record<string, Set<string>> = {};
    const distinctEmployees: Record<string, Set<string>> = {};
    escalas.forEach((e: any) => {
      const cid = e.shift?.company_id;
      if (!cid) return;
      const starts = e.start_date <= today;
      const open = !e.end_date || e.end_date >= today;
      if (!starts || !open) return;
      if (!distinctShifts[cid]) distinctShifts[cid] = new Set();
      if (!distinctEmployees[cid]) distinctEmployees[cid] = new Set();
      distinctShifts[cid].add(e.shift_id);
      distinctEmployees[cid].add(e.employee_id);
    });
    return Object.keys(distinctShifts).reduce((acc, cid) => {
      acc[cid] = {
        escalas: distinctShifts[cid].size,
        funcionarios: distinctEmployees[cid]?.size ?? 0,
      };
      return acc;
    }, {} as Record<string, { escalas: number; funcionarios: number }>);
  }, [escalas]);

  // Funcionários ativos que hoje NÃO estão escalados em nenhuma empresa (ordem alfabética)
  const funcionariosDisponiveis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    // solides_id de todos que têm escala vigente hoje (em qualquer empresa)
    const escaladosHoje = new Set<number>();
    escalas.forEach((e: any) => {
      const starts = e.start_date <= today;
      const open = !e.end_date || e.end_date >= today;
      if (starts && open && e.employee?.solides_id != null) {
        escaladosHoje.add(e.employee.solides_id);
      }
    });

    const ativos = allEmployeesData?.content ?? [];
    return ativos
      .filter((emp: any) => !emp.fired && !escaladosHoje.has(emp.id))
      .map((emp: any) => formatEmployeeName(emp.name))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [escalas, allEmployeesData]);

  // Nomes únicos de todos os funcionários já escalados (para o filtro global de empresas)
  const allEmployeeNamesForFilter = useMemo(() => {
    const names = new Set<string>();
    escalas.forEach((e: any) => {
      if (e.employee?.name) names.add(toTitleCase(e.employee.name));
    });
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [escalas]);

  // Mapa: nome normalizado do funcionário -> conjunto de empresas onde já foi escalado (histórico completo)
  const companyIdsByEmployeeName = useMemo(() => {
    const normalize = (s: string) =>
      s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const map = new Map<string, Set<string>>();
    escalas.forEach((e: any) => {
      const cid = e.shift?.company_id;
      const name = e.employee?.name;
      if (!cid || !name) return;
      const key = normalize(toTitleCase(name));
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(cid);
    });
    return map;
  }, [escalas]);

  // Filtrar empresas por termo de busca e por funcionário (AND)
  const filteredCompanies = useMemo(() => {
    const normalize = (s: string) =>
      s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    let result = companies.filter((company: any) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filterEmployeeCompany) {
      const cids = companyIdsByEmployeeName.get(normalize(filterEmployeeCompany));
      result = result.filter((company: any) => cids?.has(company.id));
    }
    return result;
  }, [companies, searchTerm, filterEmployeeCompany, companyIdsByEmployeeName]);

  // Efeito para pré-preencher dados ao editar uma escala
  useEffect(() => {
    if (editingGroup && isDialogOpen && selectedCompany) {
      setSelectedShiftId(editingGroup.shiftId);
      setStartDate(editingGroup.startDate);
      setEndDate(editingGroup.endDate || "");
      const ids = new Set(editingGroup.funcionarios.map((f) => f.employeeId));
      setSelectedEmployeeIds(ids);
    }
  }, [editingGroup, isDialogOpen, selectedCompany]);

  const handleDeleteEscala = async (id: string) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja remover este funcionário da escala?"
    );
    if (!confirmed) return;

    try {
      await deleteEscalaMutation.mutateAsync(id);
      toast.success("Funcionário removido da escala com sucesso!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao remover funcionário da escala"
      );
    }
  };

  const handleDeleteEscalaGrupo = async (grupo: EscalaAgrupada) => {
    try {
      await Promise.all(
        grupo.funcionarios.map((f) => deleteEscalaMutation.mutateAsync(f.escalaId))
      );
      toast.success("Escala removida com sucesso!");
      setDeleteConfirmGroup(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao remover escala"
      );
    }
  };

  const handleCopyEscalaAgrupada = async (grupo: EscalaAgrupada) => {
    const empresa =
      companies.find((c: any) => c.id === viewCompanyId)?.name || "Não informada";
    const inicio = formatDateLocal(grupo.startDate);
    const fim = grupo.endDate ? formatDateLocal(grupo.endDate) : "indefinido";
    const horariosPrincipal = `${formatTime(grupo.entry1)} - ${formatTime(
      grupo.exit1
    )}`;
    const horariosExtra =
      grupo.entry2 && grupo.exit2
        ? ` | ${formatTime(grupo.entry2)} - ${formatTime(grupo.exit2)}`
        : "";

    // Agrupar funcionários por cargo, ordenados pelo nome dentro de cada cargo
    const porCargo = new Map<string, string[]>();
    const funcionariosOrdenados = [...grupo.funcionarios].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR")
    );
    funcionariosOrdenados.forEach((f) => {
      const cargo = f.cargo || "Sem cargo";
      if (!porCargo.has(cargo)) porCargo.set(cargo, []);
      porCargo.get(cargo)!.push(f.nome);
    });

    // Ordenar os cargos alfabeticamente
    const cargosOrdenados = [...porCargo.keys()].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );

    // Montar lista com numeração sequencial contínua
    let contador = 1;
    const linhasFuncionarios: string[] = [];
    cargosOrdenados.forEach((cargo) => {
      linhasFuncionarios.push(`${cargo}`);
      porCargo.get(cargo)!.forEach((nome) => {
        linhasFuncionarios.push(` ${contador} - ${toTitleCase(nome)}`);
        contador++;
      });
      linhasFuncionarios.push("");
    });

    const mensagem = [
      `Empresa: ${empresa}`,
      `Período: ${inicio} até ${fim}`,
      `Horários: ${horariosPrincipal}${horariosExtra}`,
      "",
      ...linhasFuncionarios,
    ].join("\n").trimEnd();

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

  const handleCopyDisponiveis = async () => {
    const dataDoDia = formatDateLocal(new Date().toISOString().slice(0, 10));
    const linhas = funcionariosDisponiveis.map(
      (nome, i) => `${i + 1} - ${nome}`
    );
    const mensagem = [
      `Funcionários disponíveis (${dataDoDia}):`,
      "",
      ...linhas,
    ].join("\n");

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(mensagem);
        toast.success(
          "Lista de funcionários disponíveis copiada para a área de transferência!"
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
    setEditingGroup(null);
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
      const allIds = new Set(companyEmployees.map((emp: any) => emp.id));
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
      // Se estiver editando, primeiro remove as escalas antigas do grupo
      if (editingGroup) {
        const deletePromises = editingGroup.funcionarios.map((f) =>
          deleteEscalaMutation.mutateAsync(f.escalaId)
        );
        await Promise.all(deletePromises);
      }

      const selectedShift = companyShifts.find((s: any) => s.id === selectedShiftId);
      await batchCreateEscalasMutation.mutateAsync({
        employee_ids: Array.from(selectedEmployeeIds),
        shift_id: selectedShiftId,
        start_date: startDate,
        end_date: endDate || undefined,
      });

      const periodText = endDate
        ? `de ${formatDateLocal(startDate)} até ${formatDateLocal(endDate)}`
        : `a partir de ${formatDateLocal(startDate)}`;
      toast.success(
        editingGroup
          ? `Escala "${selectedShift?.name}" atualizada para ${selectedEmployeeIds.size} funcionário(s) ${periodText}!`
          : `Escala "${selectedShift?.name}" aplicada para ${selectedEmployeeIds.size} funcionário(s) ${periodText}!`
      );

      setIsDialogOpen(false);
      setEditingGroup(null);
      setSelectedEmployeeIds(new Set());
      setSelectedShiftId("");
      setEndDate("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao processar escalas"
      );
    }
  };

  return (
    <>
  <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
    <div className="flex items-center gap-2">
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Filtro por funcionário: mostra só as empresas onde ele já foi escalado */}
              <Popover
                open={openCompanyEmployeeFilter}
                onOpenChange={setOpenCompanyEmployeeFilter}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCompanyEmployeeFilter}
                    className="w-full sm:w-[280px] justify-between font-normal"
                  >
                    <span className="truncate">
                      {filterEmployeeCompany || "Filtrar por funcionário..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0">
                  <Command
                    filter={(value, search) => {
                      const normalize = (s: string) =>
                        s
                          .normalize("NFD")
                          .replace(/[̀-ͯ]/g, "")
                          .toLowerCase();
                      return normalize(value).includes(normalize(search))
                        ? 1
                        : 0;
                    }}
                  >
                    <CommandInput placeholder="Pesquisar funcionário..." />
                    <CommandList className="max-h-60 overflow-y-auto">
                      <CommandEmpty>Nenhum funcionário encontrado.</CommandEmpty>
                      <CommandGroup>
                        {allEmployeeNamesForFilter.map((name) => (
                          <CommandItem
                            key={name}
                            value={name}
                            onSelect={(val) => {
                              setFilterEmployeeCompany(
                                val === filterEmployeeCompany ? "" : val
                              );
                              setOpenCompanyEmployeeFilter(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterEmployeeCompany === name
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Busca por empresa */}
              <div className="relative w-full sm:w-[280px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar empresa..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {(searchTerm || filterEmployeeCompany) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterEmployeeCompany("");
                  }}
                >
                  Remover filtros
                </Button>
              )}

              <Button
                variant="outline"
                className="sm:ml-auto"
                onClick={() => setIsAvailableDialogOpen(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Funcionários disponíveis
              </Button>
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
                    {filteredCompanies.map((company: any) => {
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
                                  setViewCompanyId(company.id);
                                  setIsViewDialogOpen(true);
                                  setFilterDate("");
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
    </div>

    {/* Modal de Visualização/Edição de Escalas */}
    <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
      <DialogContent
        ref={viewDialogContentRef}
        onScroll={() => {
          if (openEmployeeFilter) setOpenEmployeeFilter(false);
        }}
        className="!max-w-6xl sm:!max-w-6xl md:!max-w-6xl max-h-[80vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Escalas Aplicadas</DialogTitle>
          <DialogDescription>
            Visualize e edite as escalas da empresa{" "}
            {viewCompanyId &&
              companies.find((c: any) => c.id === viewCompanyId)?.name}
          </DialogDescription>
        </DialogHeader>

        {viewCompanyId && (
          <div className="space-y-6">
            {/* Filtros */}
            <div className="flex flex-wrap items-end gap-4">
              {/* Filtro por funcionário */}
              <div className="flex flex-col gap-1">
                <Label>Filtrar por funcionário</Label>
                <Popover open={openEmployeeFilter} onOpenChange={setOpenEmployeeFilter}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openEmployeeFilter}
                      className="w-[260px] justify-between font-normal"
                    >
                      <span className="truncate">
                        {filterEmployeeName || "Selecione um funcionário..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent portal={false} className="w-[260px] p-0">
                    <Command
                      filter={(value, search) => {
                        const normalize = (s: string) =>
                          s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                        return normalize(value).includes(normalize(search)) ? 1 : 0;
                      }}
                    >
                      <CommandInput placeholder="Pesquisar funcionário..." />
                      <CommandList className="max-h-60 overflow-y-auto">
                        <CommandEmpty>Nenhum funcionário encontrado.</CommandEmpty>
                        <CommandGroup>
                          {employeeNamesForFilter.map((name) => (
                            <CommandItem
                              key={name}
                              value={name}
                              onSelect={(val) => {
                                setFilterEmployeeName(val === filterEmployeeName ? "" : val);
                                setOpenEmployeeFilter(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filterEmployeeName === name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro por data */}
              <div className="flex flex-col gap-1">
                <Label>Filtrar por dia</Label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full max-w-xs"
                />
              </div>

              <Button
                variant="outline"
                onClick={() => { setFilterDate(""); setFilterEmployeeName(""); }}
              >
                Limpar filtros
              </Button>
            </div>

            {/* Lista de escalas filtradas */}
            {escalasLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Carregando escalas...
              </div>
            ) : (
              <EscalasList
                companyId={viewCompanyId}
                filterDate={filterDate}
                filterEmployeeName={filterEmployeeName}
                escalas={escalas}
                onEdit={(grupo) => {
                  setIsViewDialogOpen(false);
                  setEditingGroup(grupo);
                  setSelectedCompany(viewCompanyId);
                  setIsDialogOpen(true);
                }}
                onDelete={handleDeleteEscala}
                onDeleteGroup={(grupo) => setDeleteConfirmGroup(grupo)}
                onCopy={handleCopyEscalaAgrupada}
                companies={companies}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Modal de Funcionários Disponíveis (ativos, não escalados hoje) */}
    <Dialog open={isAvailableDialogOpen} onOpenChange={setIsAvailableDialogOpen}>
      <DialogContent className="!max-w-2xl sm:!max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Funcionários disponíveis</DialogTitle>
          <DialogDescription>
            Funcionários ativos que hoje não estão escalados em nenhuma empresa
          </DialogDescription>
        </DialogHeader>

        {allEmployeesLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando funcionários...
          </div>
        ) : funcionariosDisponiveis.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Todos os funcionários ativos já estão escalados hoje.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {funcionariosDisponiveis.length} funcionário
                {funcionariosDisponiveis.length !== 1 ? "s" : ""} disponível
                {funcionariosDisponiveis.length !== 1 ? "is" : ""}
              </p>
              <Button variant="outline" size="sm" onClick={handleCopyDisponiveis}>
                <Copy className="h-4 w-4 mr-1" />
                Copiar
              </Button>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm list-decimal pl-6">
              {funcionariosDisponiveis.map((nome, i) => (
                <li key={`${nome}-${i}`}>{nome}</li>
              ))}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Modal para aplicar/editar escala */}
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="!max-w-6xl sm:!max-w-6xl md:!max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingGroup ? "Editar Escala" : "Aplicar Escala"}
          </DialogTitle>
          <DialogDescription>
            {editingGroup
              ? "Altere os funcionários, escala ou período"
              : "Selecione os funcionários, escolha uma escala e defina o período"}
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
                      {companyEmployees.map((employee: any) => (
                        <div
                          key={employee.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded"
                        >
                          <Checkbox
                            id={`employee-${employee.id}`}
                            checked={selectedEmployeeIds.has(employee.id)}
                            onCheckedChange={() =>
                              handleEmployeeToggle(employee.id)
                            }
                          />
                          <Label
                            htmlFor={`employee-${employee.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium">
                              {formatEmployeeName(employee.name)}
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
                      {companyShifts.map((shift: any) => (
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
                          companies.find((c: any) => c.id === selectedCompany)
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
                              (s: any) => s.id === selectedShiftId
                            )?.name
                          : "Não selecionada"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Período:</span>
                      <span className="font-medium">
                        {formatDateLocal(startDate)}
                        {endDate && ` até ${formatDateLocal(endDate)}`}
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
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingGroup(null);
                }}
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
                  ? editingGroup
                    ? "Atualizando..."
                    : "Aplicando..."
                  : editingGroup
                  ? "Salvar Alterações"
                  : "Aplicar Escala"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  </div>

    {/* Modal de confirmação de remoção de escala */}
    <Dialog open={!!deleteConfirmGroup} onOpenChange={(open) => { if (!open) setDeleteConfirmGroup(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remover escala</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover a escala{" "}
            <strong>{deleteConfirmGroup?.shiftName}</strong>?{" "}
            {deleteConfirmGroup && deleteConfirmGroup.funcionarios.length > 0 && (
              <>
                Isso removerá{" "}
                {deleteConfirmGroup.funcionarios.length === 1
                  ? "1 funcionário"
                  : `${deleteConfirmGroup.funcionarios.length} funcionários`}{" "}
                desta escala.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setDeleteConfirmGroup(null)}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteConfirmGroup && handleDeleteEscalaGrupo(deleteConfirmGroup)}
            disabled={deleteEscalaMutation.isPending}
          >
            {deleteEscalaMutation.isPending ? "Removendo..." : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// Componente auxiliar para listar escalas dentro do modal de visualização
interface EscalasListProps {
  companyId: string;
  filterDate: string;
  filterEmployeeName: string;
  escalas: any[];
  onEdit: (grupo: EscalaAgrupada) => void;
  onDelete: (id: string) => void;
  onDeleteGroup: (grupo: EscalaAgrupada) => void;
  onCopy: (grupo: EscalaAgrupada) => void;
  companies: any[];
}

function EscalasList({
  companyId,
  filterDate,
  filterEmployeeName,
  escalas,
  onEdit,
  onDelete,
  onDeleteGroup,
  onCopy,
  companies,
}: EscalasListProps) {
  const [funcionariosExpandido, setFuncionariosExpandido] = useState<
    Set<string>
  >(new Set());

  const escalasByCompany = useMemo(
    () => escalas.filter((e) => e.shift?.company_id === companyId),
    [escalas, companyId]
  );

  const grupos = useMemo((): EscalaAgrupada[] => {
    const map = new Map<string, EscalaAgrupada>();
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
      map.get(key)!.funcionarios.push({
        nome: e.employee?.name ?? "Funcionário não encontrado",
        escalaId: e.id,
        employeeId: e.employee_id,
        cargo: e.employee?.position_name ?? null,
      });
    });
    return Array.from(map.values()).sort((a, b) => {
      const startDiff = b.startDate.localeCompare(a.startDate);
      if (startDiff !== 0) return startDiff;
      return a.shiftName.localeCompare(b.shiftName, "pt-BR");
    });
  }, [escalasByCompany]);

  // Filtrar por data e por nome de funcionário
  const gruposFiltrados = useMemo(() => {
    const normalize = (s: string) =>
      s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    return grupos.filter((g) => {
      // Filtro por data
      if (filterDate) {
        const start = g.startDate;
        const end = g.endDate || "9999-12-31";
        if (!(filterDate >= start && filterDate <= end)) return false;
      }

      // Filtro por nome (inclui o grupo se algum funcionário bate)
      if (filterEmployeeName) {
        const query = normalize(filterEmployeeName);
        const match = g.funcionarios.some((f) =>
          normalize(toTitleCase(f.nome)).includes(query)
        );
        if (!match) return false;
      }

      return true;
    });
  }, [grupos, filterDate, filterEmployeeName]);

  if (gruposFiltrados.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Nenhuma escala aplicada encontrada para os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {gruposFiltrados.map((grupo) => {
        const groupKey = `${grupo.shiftId}-${grupo.startDate}-${
          grupo.endDate ?? "indefinido"
        }`;
        return (
          <div key={groupKey} className="rounded-lg border p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="grid gap-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Empresa:</span>{" "}
                  {companies.find((c: any) => c.id === companyId)?.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Escala:</span>{" "}
                  {grupo.shiftName}
                </p>
                <p>
                  <span className="text-muted-foreground">Período:</span>{" "}
                  {formatDateLocal(grupo.startDate)} até{" "}
                  {grupo.endDate
                    ? formatDateLocal(grupo.endDate)
                    : "indefinido"}
                </p>
                <p>
                  <span className="text-muted-foreground">Horários:</span>{" "}
                  {formatTime(grupo.entry1)} - {formatTime(grupo.exit1)}
                  {grupo.entry2 && grupo.exit2 && (
                    <>
                      {" "}
                      | {formatTime(grupo.entry2)} - {formatTime(grupo.exit2)}
                    </>
                  )}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCopy(grupo)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(grupo)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDeleteGroup(grupo)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              </div>
            </div>
            <Collapsible
              open={funcionariosExpandido.has(groupKey)}
              onOpenChange={(open) => {
                setFuncionariosExpandido((prev) => {
                  const next = new Set(prev);
                  if (open) next.add(groupKey);
                  else next.delete(groupKey);
                  return next;
                });
              }}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-auto text-muted-foreground hover:text-foreground"
                >
                  <span>Funcionários ({grupo.funcionarios.length})</span>
                  <ChevronDown
                    className={`h-4 w-4 ml-1 transition-transform ${
                      funcionariosExpandido.has(groupKey) ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 space-y-1 text-sm">
                  {grupo.funcionarios
                    .slice()
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((f) => (
                      <li
                        key={f.employeeId}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{f.nome}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(f.escalaId)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
}
