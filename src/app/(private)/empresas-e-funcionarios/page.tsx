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
import { Label } from "@/components/ui/label";
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
  useRemoveCompanyFromEmployee,
} from "@/hooks/use-employees";
import { Company } from "@/types/companies";
import { Employee } from "@/types/employees";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

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
  const removeCompanyMutation = useRemoveCompanyFromEmployee();

  const [isManageCompaniesDialogOpen, setIsManageCompaniesDialogOpen] =
    useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(
    new Set()
  );

  const handleManageCompaniesClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    // Inicializar com empresas já vinculadas
    const currentCompanyIds = new Set(
      (employee.companies || []).map((c) => c.id)
    );
    setSelectedCompanyIds(currentCompanyIds);
    setIsManageCompaniesDialogOpen(true);
  };

  const handleCompanyToggle = (companyId: string) => {
    const newSelected = new Set(selectedCompanyIds);
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId);
    } else {
      newSelected.add(companyId);
    }
    setSelectedCompanyIds(newSelected);
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

      // Adicionar empresas
      for (const companyId of toAdd) {
        await addCompanyMutation.mutateAsync({
          solidesId: selectedEmployee.id,
          companyId,
        });
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
              Selecione as empresas vinculadas a este funcionário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {companiesData?.companies && companiesData.companies.length > 0 ? (
              <div className="space-y-3">
                {companiesData.companies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
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
              }}
              disabled={
                addCompanyMutation.isPending || removeCompanyMutation.isPending
              }
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveCompanies}
              disabled={
                addCompanyMutation.isPending || removeCompanyMutation.isPending
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
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    address?: string;
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
    const errors: { name?: string; address?: string } = {};

    if (!formData.name.trim()) {
      errors.name = "Nome da empresa é obrigatório";
    }

    if (!formData.address.trim()) {
      errors.address = "Endereço é obrigatório";
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
      });

      toast.success("Empresa cadastrada com sucesso!");
      setIsDialogOpen(false);
      setFormData({ name: "", address: "" });
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
      setFormData({ name: "", address: "" });
      setFormErrors({});
    }
  };

  const handleEditClick = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      address: company.address,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const handleEditDialogOpenChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingCompany(null);
      setFormData({ name: "", address: "" });
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
                                  <FieldError>{formErrors.address}</FieldError>
                                )}
                                <p className="text-sm text-muted-foreground mt-1">
                                  O endereço deve ser único e completo para
                                  identificar a empresa.
                                </p>
                              </FieldContent>
                            </Field>
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
        </div>
      </div>
    </SidebarProvider>
  );
}
