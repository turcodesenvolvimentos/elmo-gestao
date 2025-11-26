"use client";

import { useState } from "react";
import {
  Building,
  MapPin,
  Users,
  Calendar,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  User,
  Link2,
  Briefcase,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from "@/hooks/use-companies";
import {
  useEmployees,
  useAddCompanyToEmployee,
  useUpdateEmployeeCompanyPosition,
  useRemoveCompanyFromEmployee,
} from "@/hooks/use-employees";
import {
  usePositions,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
} from "@/hooks/use-positions";
import { Company } from "@/types/companies";
import { Employee } from "@/types/employees";
import { Position, CreatePositionData } from "@/types/positions";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function PositionsManager({ companyId }: { companyId: string }) {
  const { data: positionsData, isLoading } = usePositions(companyId);
  const createPositionMutation = useCreatePosition();
  const updatePositionMutation = useUpdatePosition();
  const deletePositionMutation = useDeletePosition();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deletingPosition, setDeletingPosition] = useState<Position | null>(
    null
  );

  const [positionFormData, setPositionFormData] = useState({
    name: "",
    hour_value: "",
  });
  const [positionFormErrors, setPositionFormErrors] = useState<{
    name?: string;
    hour_value?: string;
  }>({});

  const handlePositionInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setPositionFormData((prev) => ({ ...prev, [name]: value }));
    if (positionFormErrors[name as keyof typeof positionFormErrors]) {
      setPositionFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validatePositionForm = () => {
    const errors: {
      name?: string;
      hour_value?: string;
    } = {};

    if (!positionFormData.name.trim()) {
      errors.name = "Nome do cargo é obrigatório";
    }

    // Valor hora é opcional, mas se preenchido deve ser válido
    if (positionFormData.hour_value.trim()) {
      const hourValue = parseFloat(positionFormData.hour_value);
      if (isNaN(hourValue) || hourValue < 0) {
        errors.hour_value = "Valor hora deve ser um número positivo";
      }
    }

    setPositionFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePositionForm()) {
      return;
    }

    try {
      const positionData: CreatePositionData = {
        name: positionFormData.name.trim(),
        company_id: companyId,
      };

      if (positionFormData.hour_value.trim()) {
        positionData.hour_value = parseFloat(positionFormData.hour_value);
      }

      await createPositionMutation.mutateAsync({
        companyId,
        data: positionData,
      });

      toast.success("Cargo criado com sucesso!");
      setIsCreateDialogOpen(false);
      setPositionFormData({
        name: "",
        hour_value: "",
      });
      setPositionFormErrors({});
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar cargo"
      );
    }
  };

  const handleEditClick = (position: Position) => {
    setEditingPosition(position);
    setPositionFormData({
      name: position.name,
      hour_value: position.hour_value.toString(),
    });
    setPositionFormErrors({});
    setIsEditDialogOpen(true);
  };

  const handleEditPosition = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePositionForm() || !editingPosition) {
      return;
    }

    try {
      await updatePositionMutation.mutateAsync({
        id: editingPosition.id,
        companyId,
        data: {
          name: positionFormData.name.trim(),
          hour_value: positionFormData.hour_value.trim()
            ? parseFloat(positionFormData.hour_value)
            : undefined,
        },
      });

      toast.success("Cargo atualizado com sucesso!");
      setIsEditDialogOpen(false);
      setEditingPosition(null);
      setPositionFormData({
        name: "",
        hour_value: "",
      });
      setPositionFormErrors({});
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar cargo"
      );
    }
  };

  const handleDeleteClick = (position: Position) => {
    setDeletingPosition(position);
    setIsDeleteDialogOpen(true);
  };

  const handleDeletePosition = async () => {
    if (!deletingPosition) return;

    try {
      await deletePositionMutation.mutateAsync({
        id: deletingPosition.id,
        companyId,
      });

      toast.success("Cargo excluído com sucesso!");
      setIsDeleteDialogOpen(false);
      setDeletingPosition(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir cargo"
      );
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Cargos</h3>
          <Button
            onClick={() => {
              setPositionFormData({
                name: "",
                hour_value: "",
              });
              setPositionFormErrors({});
              setIsCreateDialogOpen(true);
            }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Cargo
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : positionsData?.positions && positionsData.positions.length > 0 ? (
          <div className="space-y-2">
            {positionsData.positions.map((position) => (
              <Card key={position.id} className="border">
                <CardContent className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <Briefcase className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base truncate">
                          {position.name}
                        </h4>
                        {position.hour_value > 0 && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Valor Hora:</span>{" "}
                            {formatCurrency(position.hour_value)}
                          </div>
                        )}
                        {position.hour_value === 0 && (
                          <div className="text-sm text-muted-foreground italic">
                            Valor hora não definido
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleEditClick(position)}
                      >
                        <Edit className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleDeleteClick(position)}
                      >
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cargo cadastrado. Clique no botão acima para adicionar.
          </div>
        )}
      </div>

      {/* Dialog de Criar Cargo */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreatePosition}>
            <DialogHeader>
              <DialogTitle>Criar Novo Cargo</DialogTitle>
              <DialogDescription>
                Preencha os dados abaixo para criar um novo cargo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Field orientation="vertical">
                <FieldLabel htmlFor="position-name">
                  Nome do Cargo <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="position-name"
                    name="name"
                    placeholder="Ex: Desenvolvedor"
                    value={positionFormData.name}
                    onChange={handlePositionInputChange}
                    aria-invalid={!!positionFormErrors.name}
                  />
                  {positionFormErrors.name && (
                    <FieldError>{positionFormErrors.name}</FieldError>
                  )}
                </FieldContent>
              </Field>

              <Field orientation="vertical">
                <FieldLabel htmlFor="hour-value">
                  Valor Hora (R$){" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="hour-value"
                    name="hour_value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={positionFormData.hour_value}
                    onChange={handlePositionInputChange}
                    aria-invalid={!!positionFormErrors.hour_value}
                  />
                  {positionFormErrors.hour_value && (
                    <FieldError>{positionFormErrors.hour_value}</FieldError>
                  )}
                </FieldContent>
              </Field>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={createPositionMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createPositionMutation.isPending}>
                {createPositionMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Editar Cargo */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEditPosition}>
            <DialogHeader>
              <DialogTitle>Editar Cargo</DialogTitle>
              <DialogDescription>
                Altere os dados do cargo abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Field orientation="vertical">
                <FieldLabel htmlFor="edit-position-name">
                  Nome do Cargo <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-position-name"
                    name="name"
                    placeholder="Ex: Desenvolvedor"
                    value={positionFormData.name}
                    onChange={handlePositionInputChange}
                    aria-invalid={!!positionFormErrors.name}
                  />
                  {positionFormErrors.name && (
                    <FieldError>{positionFormErrors.name}</FieldError>
                  )}
                </FieldContent>
              </Field>

              <Field orientation="vertical">
                <FieldLabel htmlFor="edit-hour-value">
                  Valor Hora (R$){" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-hour-value"
                    name="hour_value"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={positionFormData.hour_value}
                    onChange={handlePositionInputChange}
                    aria-invalid={!!positionFormErrors.hour_value}
                  />
                  {positionFormErrors.hour_value && (
                    <FieldError>{positionFormErrors.hour_value}</FieldError>
                  )}
                </FieldContent>
              </Field>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingPosition(null);
                  setPositionFormData({
                    name: "",
                    hour_value: "",
                  });
                  setPositionFormErrors({});
                }}
                disabled={updatePositionMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updatePositionMutation.isPending}>
                {updatePositionMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmar Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cargo{" "}
              <strong>{deletingPosition?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingPosition(null);
              }}
              disabled={deletePositionMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeletePosition}
              disabled={deletePositionMutation.isPending}
            >
              {deletePositionMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CompanyPositionSelect({
  companyId,
  selectedPositionId,
  onPositionChange,
}: {
  companyId: string;
  selectedPositionId: string;
  onPositionChange: (positionId: string) => void;
}) {
  const { data: positionsData, isLoading } = usePositions(companyId);

  // Normalizar o valor para o Select (string vazia vira undefined)
  const selectValue =
    selectedPositionId && selectedPositionId !== ""
      ? selectedPositionId
      : undefined;

  const hasPositions =
    positionsData?.positions && positionsData.positions.length > 0;

  // Se não há cargos e não está carregando, mostrar apenas a mensagem
  if (!isLoading && !hasPositions) {
    return (
      <div className="pl-8 space-y-2">
        <Field orientation="vertical">
          <FieldLabel htmlFor={`position-${companyId}`}>
            Cargo (opcional)
          </FieldLabel>
          <FieldContent>
            <p className="text-sm text-muted-foreground">
              Nenhum cargo cadastrado para esta empresa.
            </p>
          </FieldContent>
        </Field>
      </div>
    );
  }

  return (
    <div className="pl-8 space-y-2">
      <Field orientation="vertical">
        <FieldLabel htmlFor={`position-${companyId}`}>
          Cargo (opcional)
        </FieldLabel>
        <FieldContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Carregando cargos...
            </p>
          ) : (
            <>
              <Select
                value={selectValue}
                onValueChange={(value) => onPositionChange(value || "")}
                disabled={isLoading}
              >
                <SelectTrigger id={`position-${companyId}`}>
                  <SelectValue placeholder="Selecione um cargo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {positionsData?.positions &&
                    positionsData.positions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectValue && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => onPositionChange("")}
                >
                  Remover cargo
                </Button>
              )}
            </>
          )}
        </FieldContent>
      </Field>
    </div>
  );
}

function CompaniesEmployeesTab() {
  const {
    data: employeesData,
    isLoading: employeesLoading,
    error: employeesError,
  } = useEmployees({
    page: 1,
    size: 100,
  });

  const { data: companiesData } = useCompanies();
  const addCompanyMutation = useAddCompanyToEmployee();
  const updatePositionMutation = useUpdateEmployeeCompanyPosition();
  const removeCompanyMutation = useRemoveCompanyFromEmployee();

  const [isManageCompaniesDialogOpen, setIsManageCompaniesDialogOpen] =
    useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedPositions, setSelectedPositions] = useState<
    Map<string, string>
  >(new Map());

  const handleManageCompaniesClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    // Inicializar com empresas já vinculadas
    const currentCompanyIds = new Set(
      (employee.companies || []).map((c) => c.id)
    );
    setSelectedCompanyIds(currentCompanyIds);

    // Inicializar com cargos já vinculados
    const positionsMap = new Map<string, string>();
    (employee.companies || []).forEach((c) => {
      if (c.position_id) {
        positionsMap.set(c.id, c.position_id);
      }
    });
    setSelectedPositions(positionsMap);

    setIsManageCompaniesDialogOpen(true);
  };

  const handleCompanyToggle = (companyId: string) => {
    const newSelected = new Set(selectedCompanyIds);
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId);
      // Remover cargo quando desmarcar empresa
      const newPositions = new Map(selectedPositions);
      newPositions.delete(companyId);
      setSelectedPositions(newPositions);
    } else {
      newSelected.add(companyId);
    }
    setSelectedCompanyIds(newSelected);
  };

  const handlePositionChange = (companyId: string, positionId: string) => {
    const newPositions = new Map(selectedPositions);
    if (positionId === "") {
      newPositions.delete(companyId);
    } else {
      newPositions.set(companyId, positionId);
    }
    setSelectedPositions(newPositions);
  };

  const handleSaveCompanies = async () => {
    if (!selectedEmployee) return;

    try {
      const currentCompanyIds = new Set(
        (selectedEmployee.companies || []).map((c) => c.id)
      );
      const toAdd = Array.from(selectedCompanyIds).filter(
        (id) => !currentCompanyIds.has(id)
      );
      const toRemove = Array.from(currentCompanyIds).filter(
        (id) => !selectedCompanyIds.has(id)
      );
      const toUpdate = Array.from(selectedCompanyIds).filter((id) =>
        selectedCompanyIds.has(id)
      );

      // Adicionar empresas
      for (const companyId of toAdd) {
        const positionId = selectedPositions.get(companyId);
        await addCompanyMutation.mutateAsync({
          solidesId: selectedEmployee.id,
          companyId,
          positionId,
        });
      }

      // Atualizar cargos de empresas já vinculadas
      for (const companyId of toUpdate) {
        const currentCompany = selectedEmployee.companies?.find(
          (c) => c.id === companyId
        );
        const currentPositionId = currentCompany?.position_id || undefined;
        const newPositionId = selectedPositions.get(companyId) || undefined;

        // Normalizar para comparação (null/undefined/string vazia são tratados como sem cargo)
        const normalizedCurrent =
          currentPositionId && currentPositionId !== ""
            ? currentPositionId
            : undefined;
        const normalizedNew =
          newPositionId && newPositionId !== "" ? newPositionId : undefined;

        // Só atualizar se o cargo mudou
        if (normalizedCurrent !== normalizedNew) {
          await updatePositionMutation.mutateAsync({
            solidesId: selectedEmployee.id,
            companyId,
            positionId: normalizedNew,
          });
        }
      }

      // Remover empresas
      for (const companyId of toRemove) {
        await removeCompanyMutation.mutateAsync({
          solidesId: selectedEmployee.id,
          companyId,
        });
      }

      toast.success("Empresas atualizadas com sucesso!");
      setIsManageCompaniesDialogOpen(false);
      setSelectedEmployee(null);
      setSelectedCompanyIds(new Set());
      setSelectedPositions(new Map());
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar empresas do funcionário"
      );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCPF = (cpf?: string) => {
    if (!cpf) return "-";
    // Remove todos os caracteres não numéricos
    const cleanCPF = cpf.replace(/\D/g, "");
    // Aplica a máscara XXX.XXX.XXX-XX
    if (cleanCPF.length === 11) {
      return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    // Se não tiver 11 dígitos, retorna sem formatação
    return cpf;
  };

  return (
    <>
      {employeesError && (
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar funcionários. Tente recarregar a página.
          </AlertDescription>
        </Alert>
      )}

      {employeesLoading ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Funcionários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                  <div className="space-y-2 flex-1 min-w-0">
                    <Skeleton className="h-4 w-full max-w-[250px]" />
                    <Skeleton className="h-4 w-full max-w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : employeesData?.content && employeesData.content.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              Lista de Funcionários
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* Visualização Desktop: Tabela */}
            <div className="hidden lg:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Empresas</TableHead>
                    <TableHead>Data de Admissão</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center w-[100px]">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesData.content.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {employee.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCPF(employee.cpf)}
                      </TableCell>
                      <TableCell>
                        {employee.companies && employee.companies.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {employee.companies.map((company) => (
                              <Badge
                                key={company.id}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                <Building className="h-3 w-3" />
                                {company.name}
                                {company.position && (
                                  <span className="ml-1 text-xs">
                                    ({company.position.name})
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(employee.admissionDate)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={employee.fired ? "destructive" : "default"}
                        >
                          {employee.fired ? "Demitido" : "Ativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Abrir menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleManageCompaniesClick(employee)
                              }
                            >
                              <Link2 className="h-4 w-4 mr-2" />
                              Gerenciar Empresas
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Visualização Mobile: Cards */}
            <div className="md:hidden space-y-3 p-4">
              {employeesData.content.map((employee) => (
                <Card key={employee.id} className="border">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h3 className="font-semibold text-base truncate">
                          {employee.name}
                        </h3>
                      </div>
                      <div className="space-y-2 text-sm">
                        {employee.cpf && (
                          <div className="text-muted-foreground">
                            <span className="font-medium">CPF:</span>{" "}
                            {formatCPF(employee.cpf)}
                          </div>
                        )}
                        {employee.admissionDate && (
                          <div className="text-muted-foreground">
                            <span className="font-medium">Admissão:</span>{" "}
                            {formatDate(employee.admissionDate)}
                          </div>
                        )}
                        {employee.companies &&
                          employee.companies.length > 0 && (
                            <div>
                              <span className="font-medium text-muted-foreground">
                                Empresas:
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {employee.companies.map((company) => (
                                  <Badge
                                    key={company.id}
                                    variant="secondary"
                                    className="flex items-center gap-1 text-xs"
                                  >
                                    <Building className="h-3 w-3" />
                                    {company.name}
                                    {company.position && (
                                      <span className="ml-1">
                                        ({company.position.name})
                                      </span>
                                    )}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                      <div className="pt-2 border-t flex items-center justify-between">
                        <Badge
                          variant={employee.fired ? "destructive" : "default"}
                        >
                          {employee.fired ? "Demitido" : "Ativo"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageCompaniesClick(employee)}
                        >
                          <Link2 className="h-3 w-3 mr-2" />
                          Gerenciar Empresas
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Visualização Tablet: Tabela compacta */}
            <div className="hidden md:block lg:hidden rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="min-w-[200px]">Nome</TableHead>
                      <TableHead className="min-w-[120px]">CPF</TableHead>
                      <TableHead className="min-w-[250px]">Empresas</TableHead>
                      <TableHead className="text-center min-w-[100px]">
                        Status
                      </TableHead>
                      <TableHead className="text-center min-w-[80px]">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeesData.content.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {employee.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatCPF(employee.cpf)}
                        </TableCell>
                        <TableCell>
                          {employee.companies &&
                          employee.companies.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {employee.companies.map((company) => (
                                <Badge
                                  key={company.id}
                                  variant="secondary"
                                  className="flex items-center gap-1 text-xs"
                                >
                                  <Building className="h-3 w-3" />
                                  {company.name}
                                  {company.position && (
                                    <span className="ml-1">
                                      ({company.position.name})
                                    </span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={employee.fired ? "destructive" : "default"}
                            className="text-xs"
                          >
                            {employee.fired ? "Demitido" : "Ativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleManageCompaniesClick(employee)}
                          >
                            <Link2 className="h-4 w-4" />
                            <span className="sr-only">Gerenciar Empresas</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">
              Nenhum funcionário encontrado
            </h3>
            <p className="text-muted-foreground text-center text-sm sm:text-base px-4">
              Não há funcionários cadastrados no sistema ainda.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog para Gerenciar Empresas */}
      <Dialog
        open={isManageCompaniesDialogOpen}
        onOpenChange={setIsManageCompaniesDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gerenciar Empresas - {selectedEmployee?.name}
            </DialogTitle>
            <DialogDescription>
              Selecione as empresas vinculadas a este funcionário e
              opcionalmente escolha um cargo para cada uma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {companiesData?.companies && companiesData.companies.length > 0 ? (
              <div className="space-y-3">
                {companiesData.companies.map((company) => (
                  <div
                    key={company.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors space-y-3"
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`company-${company.id}`}
                        checked={selectedCompanyIds.has(company.id)}
                        onCheckedChange={() => handleCompanyToggle(company.id)}
                      />
                      <label
                        htmlFor={`company-${company.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{company.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {company.address}
                        </div>
                      </label>
                    </div>
                    {selectedCompanyIds.has(company.id) && (
                      <CompanyPositionSelect
                        companyId={company.id}
                        selectedPositionId={
                          selectedPositions.get(company.id) || ""
                        }
                        onPositionChange={(positionId: string) =>
                          handlePositionChange(company.id, positionId)
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma empresa cadastrada.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsManageCompaniesDialogOpen(false);
                setSelectedEmployee(null);
                setSelectedCompanyIds(new Set());
                setSelectedPositions(new Map());
              }}
              disabled={
                addCompanyMutation.isPending ||
                updatePositionMutation.isPending ||
                removeCompanyMutation.isPending
              }
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveCompanies}
              disabled={
                addCompanyMutation.isPending ||
                updatePositionMutation.isPending ||
                removeCompanyMutation.isPending
              }
            >
              {addCompanyMutation.isPending || removeCompanyMutation.isPending
                ? "Salvando..."
                : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function EmpresasPage() {
  const { data: companiesData, isLoading, error } = useCompanies();
  const createCompanyMutation = useCreateCompany();
  const updateCompanyMutation = useUpdateCompany();
  const deleteCompanyMutation = useDeleteCompany();

  const [activeTab, setActiveTab] = useState("empresas");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPositionsDialogOpen, setIsPositionsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [managingPositionsCompany, setManagingPositionsCompany] =
    useState<Company | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    vr_per_hour: "",
    cost_help_per_hour: "",
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    address?: string;
    vr_per_hour?: string;
    cost_help_per_hour?: string;
  }>({});

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const errors: {
      name?: string;
      address?: string;
      vr_per_hour?: string;
      cost_help_per_hour?: string;
    } = {};

    if (!formData.name.trim()) {
      errors.name = "Nome da empresa é obrigatório";
    }

    if (!formData.address.trim()) {
      errors.address = "Endereço é obrigatório";
    }

    // Validação de VR (opcional, mas se preenchido deve ser válido)
    if (formData.vr_per_hour.trim()) {
      const vrValue = parseFloat(formData.vr_per_hour);
      if (isNaN(vrValue) || vrValue < 0) {
        errors.vr_per_hour = "Valor do VR por hora deve ser um número positivo";
      }
    }

    // Validação de Ajuda de Custo (opcional, mas se preenchido deve ser válido)
    if (formData.cost_help_per_hour.trim()) {
      const costValue = parseFloat(formData.cost_help_per_hour);
      if (isNaN(costValue) || costValue < 0) {
        errors.cost_help_per_hour =
          "Ajuda de Custo por hora deve ser um número positivo";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await createCompanyMutation.mutateAsync({
        name: formData.name.trim(),
        address: formData.address.trim(),
        vr_per_hour: formData.vr_per_hour.trim()
          ? parseFloat(formData.vr_per_hour)
          : undefined,
        cost_help_per_hour: formData.cost_help_per_hour.trim()
          ? parseFloat(formData.cost_help_per_hour)
          : undefined,
      });

      toast.success("Empresa cadastrada com sucesso!");
      setIsDialogOpen(false);
      setFormData({
        name: "",
        address: "",
        vr_per_hour: "",
        cost_help_per_hour: "",
      });
      setFormErrors({});
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao cadastrar empresa"
      );
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Limpar formulário quando fechar
      setFormData({
        name: "",
        address: "",
        vr_per_hour: "",
        cost_help_per_hour: "",
      });
      setFormErrors({});
    }
  };

  const handleEditClick = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      address: company.address,
      vr_per_hour: company.vr_per_hour?.toString() || "",
      cost_help_per_hour: company.cost_help_per_hour?.toString() || "",
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingCompany(null);
      setFormData({
        name: "",
        address: "",
        vr_per_hour: "",
        cost_help_per_hour: "",
      });
      setFormErrors({});
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !editingCompany) {
      return;
    }

    try {
      await updateCompanyMutation.mutateAsync({
        id: editingCompany.id,
        data: {
          name: formData.name.trim(),
          address: formData.address.trim(),
          vr_per_hour: formData.vr_per_hour.trim()
            ? parseFloat(formData.vr_per_hour)
            : undefined,
          cost_help_per_hour: formData.cost_help_per_hour.trim()
            ? parseFloat(formData.cost_help_per_hour)
            : undefined,
        },
      });

      toast.success("Empresa atualizada com sucesso!");
      handleEditDialogOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar empresa"
      );
    }
  };

  const handleDeleteClick = (company: Company) => {
    setDeletingCompany(company);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setDeletingCompany(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCompany) return;

    try {
      await deleteCompanyMutation.mutateAsync(deletingCompany.id);
      toast.success("Empresa excluída com sucesso!");
      handleDeleteDialogOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir empresa"
      );
    }
  };

  const handleManagePositionsClick = (company: Company) => {
    setManagingPositionsCompany(company);
    setIsPositionsDialogOpen(true);
  };

  const handlePositionsDialogOpenChange = (open: boolean) => {
    setIsPositionsDialogOpen(open);
    if (!open) {
      setManagingPositionsCompany(null);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar collapsible="icon" />
      <div className="min-h-screen w-full p-3 sm:p-6">
        <SidebarTrigger className="-ml-1" />
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="scroll-m-20 text-2xl sm:text-3xl font-semibold tracking-tight">
                Empresas e Funcionários
              </h2>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Visualize e gerencie empresas e funcionários
              </p>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Erro ao carregar empresas. Tente recarregar a página.
                </AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Empresas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                        <div className="space-y-2 flex-1 min-w-0">
                          <Skeleton className="h-4 w-full max-w-[250px]" />
                          <Skeleton className="h-4 w-full max-w-[200px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {companiesData?.companies &&
                companiesData.companies.length > 0 ? (
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 mb-4 sm:mb-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total de Empresas
                        </CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {companiesData.total}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total de Funcionários
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {companiesData.totalEmployees ?? 0}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}

                <div className="flex justify-end mb-4">
                  <Dialog
                    open={isDialogOpen}
                    onOpenChange={handleDialogOpenChange}
                  >
                    <DialogTrigger asChild>
                      <Button className="w-full sm:w-auto">
                        <Plus className="h-4 w-4" />
                        {activeTab === "empresas" ? (
                          <>
                            <span className="hidden sm:inline">
                              Nova Empresa
                            </span>
                            <span className="sm:hidden">Nova</span>
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline">
                              Novo Funcionário
                            </span>
                            <span className="sm:hidden">Novo</span>
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleSubmit}>
                        <DialogHeader>
                          <DialogTitle>
                            {activeTab === "empresas"
                              ? "Cadastrar Nova Empresa"
                              : "Cadastrar Novo Funcionário"}
                          </DialogTitle>
                          <DialogDescription>
                            {activeTab === "empresas"
                              ? "Preencha os dados abaixo para cadastrar uma nova empresa."
                              : "Preencha os dados abaixo para cadastrar um novo funcionário."}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <Field orientation="vertical">
                            <FieldLabel htmlFor="name">
                              {activeTab === "empresas"
                                ? "Nome da Empresa"
                                : "Nome do Funcionário"}{" "}
                              <span className="text-destructive">*</span>
                            </FieldLabel>
                            <FieldContent>
                              <Input
                                id="name"
                                name="name"
                                placeholder={
                                  activeTab === "empresas"
                                    ? "Ex: Empresa ABC Ltda"
                                    : "Ex: João da Silva"
                                }
                                value={formData.name}
                                onChange={handleInputChange}
                                aria-invalid={!!formErrors.name}
                              />
                              {formErrors.name && (
                                <FieldError>{formErrors.name}</FieldError>
                              )}
                            </FieldContent>
                          </Field>

                          {activeTab === "empresas" && (
                            <>
                              <Field orientation="vertical">
                                <FieldLabel htmlFor="address">
                                  Endereço{" "}
                                  <span className="text-destructive">*</span>
                                </FieldLabel>
                                <FieldContent>
                                  <Input
                                    id="address"
                                    name="address"
                                    placeholder="Ex: Rua Exemplo, 123 - Centro - São Paulo/SP"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    aria-invalid={!!formErrors.address}
                                  />
                                  {formErrors.address && (
                                    <FieldError>
                                      {formErrors.address}
                                    </FieldError>
                                  )}
                                  <p className="text-sm text-muted-foreground mt-1">
                                    O endereço deve ser único e completo para
                                    identificar a empresa.
                                  </p>
                                </FieldContent>
                              </Field>

                              <Field orientation="vertical">
                                <FieldLabel htmlFor="vr-per-hour">
                                  VR (R$){" "}
                                  <span className="text-muted-foreground">
                                    (opcional)
                                  </span>
                                </FieldLabel>
                                <FieldContent>
                                  <Input
                                    id="vr-per-hour"
                                    name="vr_per_hour"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={formData.vr_per_hour}
                                    onChange={handleInputChange}
                                    aria-invalid={!!formErrors.vr_per_hour}
                                  />
                                  {formErrors.vr_per_hour && (
                                    <FieldError>
                                      {formErrors.vr_per_hour}
                                    </FieldError>
                                  )}
                                </FieldContent>
                              </Field>

                              <Field orientation="vertical">
                                <FieldLabel htmlFor="cost-help-per-hour">
                                  Ajuda de Custo (R$){" "}
                                  <span className="text-muted-foreground">
                                    (opcional)
                                  </span>
                                </FieldLabel>
                                <FieldContent>
                                  <Input
                                    id="cost-help-per-hour"
                                    name="cost_help_per_hour"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={formData.cost_help_per_hour}
                                    onChange={handleInputChange}
                                    aria-invalid={
                                      !!formErrors.cost_help_per_hour
                                    }
                                  />
                                  {formErrors.cost_help_per_hour && (
                                    <FieldError>
                                      {formErrors.cost_help_per_hour}
                                    </FieldError>
                                  )}
                                </FieldContent>
                              </Field>
                            </>
                          )}
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDialogOpenChange(false)}
                            disabled={createCompanyMutation.isPending}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              createCompanyMutation.isPending ||
                              activeTab !== "empresas"
                            }
                          >
                            {createCompanyMutation.isPending
                              ? activeTab === "empresas"
                                ? "Cadastrando..."
                                : "Processando..."
                              : "Cadastrar"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="empresas" className="gap-2">
                    <Building className="h-4 w-4" />
                    Empresas
                  </TabsTrigger>
                  <TabsTrigger value="funcionarios" className="gap-2">
                    <Users className="h-4 w-4" />
                    Funcionários
                  </TabsTrigger>
                </TabsList>

                {companiesData?.companies &&
                companiesData.companies.length > 0 ? (
                  <TabsContent
                    value="empresas"
                    className="space-y-4 sm:space-y-6"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg sm:text-xl">
                          Lista de Empresas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 sm:p-6">
                        {/* Visualização Desktop: Tabela */}
                        <div className="hidden lg:block rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="w-[300px]">
                                  Nome da Empresa
                                </TableHead>
                                <TableHead>Endereço</TableHead>
                                <TableHead className="text-center w-[150px]">
                                  Funcionários
                                </TableHead>
                                <TableHead className="text-center w-[150px]">
                                  Data de Criação
                                </TableHead>
                                <TableHead className="text-center w-[100px]">
                                  Ações
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {companiesData.companies.map((company) => (
                                <TableRow key={company.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <Building className="h-4 w-4 text-muted-foreground" />
                                      {company.name}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <MapPin className="h-4 w-4" />
                                      <span className="max-w-md truncate">
                                        {company.address}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge
                                      variant={
                                        company.employee_count > 0
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="flex items-center gap-1 justify-center w-fit mx-auto"
                                    >
                                      <Users className="h-3 w-3" />
                                      {company.employee_count}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center text-muted-foreground">
                                    <div className="flex items-center gap-2 justify-center">
                                      <Calendar className="h-4 w-4" />
                                      {formatDate(company.created_at)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                          <span className="sr-only">
                                            Abrir menu
                                          </span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleEditClick(company)
                                          }
                                        >
                                          <Edit className="h-4 w-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleManagePositionsClick(company)
                                          }
                                        >
                                          <Briefcase className="h-4 w-4 mr-2" />
                                          Gerenciar Cargos
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={() =>
                                            handleDeleteClick(company)
                                          }
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Visualização Mobile: Cards */}
                        <div className="md:hidden space-y-3 p-4">
                          {companiesData.companies.map((company) => (
                            <Card key={company.id} className="border">
                              <CardContent className="p-4">
                                <div className="space-y-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <h3 className="font-semibold text-base truncate">
                                          {company.name}
                                        </h3>
                                      </div>
                                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                        <p className="line-clamp-2 break-words">
                                          {company.address}
                                        </p>
                                      </div>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 flex-shrink-0"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                          <span className="sr-only">
                                            Abrir menu
                                          </span>
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleEditClick(company)
                                          }
                                        >
                                          <Edit className="h-4 w-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleManagePositionsClick(company)
                                          }
                                        >
                                          <Briefcase className="h-4 w-4 mr-2" />
                                          Gerenciar Cargos
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={() =>
                                            handleDeleteClick(company)
                                          }
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={
                                          company.employee_count > 0
                                            ? "default"
                                            : "secondary"
                                        }
                                        className="flex items-center gap-1"
                                      >
                                        <Users className="h-3 w-3" />
                                        <span className="text-xs">
                                          {company.employee_count} funcionário
                                          {company.employee_count !== 1
                                            ? "s"
                                            : ""}
                                        </span>
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      {formatDate(company.created_at)}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Visualização Tablet: Tabela compacta com scroll */}
                        <div className="hidden md:block lg:hidden rounded-md border">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="min-w-[200px]">
                                    Nome
                                  </TableHead>
                                  <TableHead className="min-w-[250px]">
                                    Endereço
                                  </TableHead>
                                  <TableHead className="text-center min-w-[120px]">
                                    Funcionários
                                  </TableHead>
                                  <TableHead className="text-center min-w-[120px]">
                                    Data
                                  </TableHead>
                                  <TableHead className="text-center min-w-[80px]">
                                    Ações
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {companiesData.companies.map((company) => (
                                  <TableRow key={company.id}>
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="truncate max-w-[180px]">
                                          {company.name}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate max-w-[230px]">
                                          {company.address}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge
                                        variant={
                                          company.employee_count > 0
                                            ? "default"
                                            : "secondary"
                                        }
                                        className="flex items-center gap-1 justify-center w-fit mx-auto text-xs"
                                      >
                                        <Users className="h-3 w-3" />
                                        {company.employee_count}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-center text-muted-foreground text-sm">
                                      {formatDate(company.created_at)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                          >
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">
                                              Abrir menu
                                            </span>
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleEditClick(company)
                                            }
                                          >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleManagePositionsClick(
                                                company
                                              )
                                            }
                                          >
                                            <Briefcase className="h-4 w-4 mr-2" />
                                            Gerenciar Cargos
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            variant="destructive"
                                            onClick={() =>
                                              handleDeleteClick(company)
                                            }
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Excluir
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                ) : (
                  <TabsContent
                    value="empresas"
                    className="space-y-4 sm:space-y-6"
                  >
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                        <Building className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                        <h3 className="text-base sm:text-lg font-semibold mb-2">
                          Nenhuma empresa encontrada
                        </h3>
                        <p className="text-muted-foreground text-center text-sm sm:text-base px-4">
                          Não há empresas cadastradas no sistema ainda.
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </>
            )}

            <TabsContent
              value="funcionarios"
              className="space-y-4 sm:space-y-6"
            >
              <CompaniesEmployeesTab />
            </TabsContent>
          </Tabs>

          {/* Modal de Edição */}
          <Dialog
            open={isEditDialogOpen}
            onOpenChange={handleEditDialogOpenChange}
          >
            <DialogContent>
              <form onSubmit={handleEditSubmit}>
                <DialogHeader>
                  <DialogTitle>Editar Empresa</DialogTitle>
                  <DialogDescription>
                    Altere os dados da empresa abaixo.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Field orientation="vertical">
                    <FieldLabel htmlFor="edit-name">
                      Nome da Empresa{" "}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="edit-name"
                        name="name"
                        placeholder="Ex: Empresa ABC Ltda"
                        value={formData.name}
                        onChange={handleInputChange}
                        aria-invalid={!!formErrors.name}
                      />
                      {formErrors.name && (
                        <FieldError>{formErrors.name}</FieldError>
                      )}
                    </FieldContent>
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel htmlFor="edit-address">
                      Endereço <span className="text-destructive">*</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="edit-address"
                        name="address"
                        placeholder="Ex: Rua Exemplo, 123 - Centro - São Paulo/SP"
                        value={formData.address}
                        onChange={handleInputChange}
                        aria-invalid={!!formErrors.address}
                      />
                      {formErrors.address && (
                        <FieldError>{formErrors.address}</FieldError>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        O endereço deve ser único e completo para identificar a
                        empresa.
                      </p>
                    </FieldContent>
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel htmlFor="edit-vr-per-hour">
                      VR por Hora (R$){" "}
                      <span className="text-muted-foreground">(opcional)</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="edit-vr-per-hour"
                        name="vr_per_hour"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.vr_per_hour}
                        onChange={handleInputChange}
                        aria-invalid={!!formErrors.vr_per_hour}
                      />
                      {formErrors.vr_per_hour && (
                        <FieldError>{formErrors.vr_per_hour}</FieldError>
                      )}
                    </FieldContent>
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel htmlFor="edit-cost-help-per-hour">
                      Ajuda de Custo por Hora (R$){" "}
                      <span className="text-muted-foreground">(opcional)</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="edit-cost-help-per-hour"
                        name="cost_help_per_hour"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.cost_help_per_hour}
                        onChange={handleInputChange}
                        aria-invalid={!!formErrors.cost_help_per_hour}
                      />
                      {formErrors.cost_help_per_hour && (
                        <FieldError>{formErrors.cost_help_per_hour}</FieldError>
                      )}
                    </FieldContent>
                  </Field>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleEditDialogOpenChange(false)}
                    disabled={updateCompanyMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateCompanyMutation.isPending}
                  >
                    {updateCompanyMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Modal de Confirmação de Exclusão */}
          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={handleDeleteDialogOpenChange}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir a empresa{" "}
                  <strong>{deletingCompany?.name}</strong>?
                </DialogDescription>
              </DialogHeader>
              {deletingCompany && deletingCompany.employee_count > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Esta empresa possui {deletingCompany.employee_count}{" "}
                    funcionário(s) vinculado(s). Não é possível excluir empresas
                    com funcionários.
                  </AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDeleteDialogOpenChange(false)}
                  disabled={deleteCompanyMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={
                    deleteCompanyMutation.isPending ||
                    (deletingCompany?.employee_count || 0) > 0
                  }
                >
                  {deleteCompanyMutation.isPending ? "Excluindo..." : "Excluir"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de Gerenciar Cargos */}
          <Dialog
            open={isPositionsDialogOpen}
            onOpenChange={handlePositionsDialogOpenChange}
          >
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Gerenciar Cargos - {managingPositionsCompany?.name}
                </DialogTitle>
                <DialogDescription>
                  Crie e gerencie os cargos desta empresa.
                </DialogDescription>
              </DialogHeader>
              {managingPositionsCompany && (
                <PositionsManager companyId={managingPositionsCompany.id} />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SidebarProvider>
  );
}
