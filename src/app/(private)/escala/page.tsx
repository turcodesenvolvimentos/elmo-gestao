"use client";

import { useState, useMemo } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
  Users,
  Building,
  Calendar,
  Settings,
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
import { useBatchCreateEscalas } from "@/hooks/use-escalas";
import { useQuery } from "@tanstack/react-query";
import { fetchAllShifts } from "@/services/shifts.service";

export default function EscalaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );

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

  const companies = useMemo(
    () => companiesData?.companies || [],
    [companiesData?.companies]
  );
  const companyEmployees = employeesData?.employees || [];
  const companyShifts = shiftsData?.shifts || [];
  const allShifts = allShiftsData?.shifts || [];

  // Filtrar empresas por termo de busca
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [companies, searchTerm]);

  const handleOpenDialog = (companyId: string) => {
    setSelectedCompany(companyId);
    setSelectedEmployeeIds(new Set());
    setSelectedShiftId("");
    const today = new Date();
    setStartDate(today.toISOString().split("T")[0]);
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
      });
      toast.success(
        `Escala "${selectedShift?.name}" aplicada para ${
          selectedEmployeeIds.size
        } funcionário(s) a partir de ${formatDate(startDate)}!`
      );
      setIsDialogOpen(false);
      setSelectedEmployeeIds(new Set());
      setSelectedShiftId("");
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
      <div className="min-h-screen w-full p-6">
        <SidebarTrigger className="-ml-1" />
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
                Selecione uma empresa para gerenciar as escalas dos funcionários
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
                          // Contar shifts da empresa
                          const shiftsCount = allShifts.filter(
                            (shift) => shift.company_id === company.id
                          ).length;

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
                                  {shiftsCount} escala
                                  {shiftsCount !== 1 ? "s" : ""}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenDialog(company.id)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Aplicar Escala
                                </Button>
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

        {/* Modal para aplicar escala */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Aplicar Escala</DialogTitle>
              <DialogDescription>
                Selecione os funcionários, escolha uma escala e defina o período
              </DialogDescription>
            </DialogHeader>

            {selectedCompany && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <h3 className="font-semibold mb-3">Data de Início</h3>
                        <div>
                          <Label htmlFor="start-date" className="mb-2 block">
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
                          <span>Data de início:</span>
                          <span className="font-medium">
                            {formatDate(startDate)}
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
    </SidebarProvider>
  );
}
