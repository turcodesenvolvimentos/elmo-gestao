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
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Building,
  Clock,
  Edit,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { useCompanies } from "@/hooks/use-companies";
import {
  useShifts,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
} from "@/hooks/use-shifts";
import { Shift } from "@/types/shifts";
import { useQuery } from "@tanstack/react-query";
import { fetchAllShifts } from "@/services/shifts.service";

export default function CriarEscalaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);

  // Hooks
  const { data: companiesData, isLoading: companiesLoading } = useCompanies();
  // Buscar todos os shifts para mostrar na lista
  const { data: allShiftsData } = useQuery({
    queryKey: ["shifts", "all"],
    queryFn: () => fetchAllShifts(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: shiftsData } = useShifts(selectedCompany || "");
  const createShiftMutation = useCreateShift();
  const updateShiftMutation = useUpdateShift();
  const deleteShiftMutation = useDeleteShift();

  const [formData, setFormData] = useState({
    name: "",
    entry1: "08:00",
    exit1: "12:00",
    entry2: "13:00",
    exit2: "17:00",
  });

  const [formErrors, setFormErrors] = useState({
    name: "",
    entry1: "",
    exit1: "",
    entry2: "",
    exit2: "",
  });

  const companies = companiesData?.companies || [];
  // Usar allShiftsData para a lista, shiftsData para quando uma empresa estiver selecionada no diálogo
  const shifts = allShiftsData?.shifts || [];

  // Filtrar empresas por termo de busca
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [companies, searchTerm]);

  const handleOpenCreateDialog = (companyId: string) => {
    setSelectedCompany(companyId);
    setFormData({
      name: "",
      entry1: "08:00",
      exit1: "12:00",
      entry2: "13:00",
      exit2: "17:00",
    });
    setFormErrors({
      name: "",
      entry1: "",
      exit1: "",
      entry2: "",
      exit2: "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (shift: Shift) => {
    setEditingShift(shift);
    setSelectedCompany(shift.company_id);
    setFormData({
      name: shift.name,
      entry1: shift.entry1.slice(0, 5),
      exit1: shift.exit1.slice(0, 5),
      entry2: shift.entry2 ? shift.entry2.slice(0, 5) : "",
      exit2: shift.exit2 ? shift.exit2.slice(0, 5) : "",
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (shift: Shift) => {
    setDeletingShift(shift);
    setSelectedCompany(shift.company_id);
    setIsDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors = {
      name: "",
      entry1: "",
      exit1: "",
      entry2: "",
      exit2: "",
    };

    let isValid = true;

    if (!formData.name.trim()) {
      errors.name = "Nome da escala é obrigatório";
      isValid = false;
    }

    if (!formData.entry1) {
      errors.entry1 = "Horário de entrada 1 é obrigatório";
      isValid = false;
    }

    if (!formData.exit1) {
      errors.exit1 = "Horário de saída 1 é obrigatório";
      isValid = false;
    }

    // Validar se saída 1 é após entrada 1
    if (formData.entry1 && formData.exit1) {
      const entry1 = new Date(`2000-01-01T${formData.entry1}`);
      const exit1 = new Date(`2000-01-01T${formData.exit1}`);
      if (exit1 <= entry1) {
        errors.exit1 = "Saída 1 deve ser após entrada 1";
        isValid = false;
      }
    }

    // Validar entrada 2 e saída 2 (se preenchidos)
    if (formData.entry2 && !formData.exit2) {
      errors.exit2 = "Saída 2 é obrigatória quando entrada 2 é preenchida";
      isValid = false;
    }

    if (!formData.entry2 && formData.exit2) {
      errors.entry2 = "Entrada 2 é obrigatória quando saída 2 é preenchida";
      isValid = false;
    }

    // Validar se saída 2 é após entrada 2
    if (formData.entry2 && formData.exit2) {
      const entry2 = new Date(`2000-01-01T${formData.entry2}`);
      const exit2 = new Date(`2000-01-01T${formData.exit2}`);
      if (exit2 <= entry2) {
        errors.exit2 = "Saída 2 deve ser após entrada 2";
        isValid = false;
      }

      // Validar se entrada 2 é após saída 1
      const exit1 = new Date(`2000-01-01T${formData.exit1}`);
      if (entry2 <= exit1) {
        errors.entry2 = "Entrada 2 deve ser após saída 1";
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleCreateShift = async () => {
    if (!validateForm() || !selectedCompany) return;

    try {
      await createShiftMutation.mutateAsync({
        companyId: selectedCompany,
        data: {
          name: formData.name.trim(),
          entry1: formData.entry1,
          exit1: formData.exit1,
          entry2: formData.entry2 || null,
          exit2: formData.exit2 || null,
        },
      });
      toast.success("Escala criada com sucesso!");
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar escala"
      );
    }
  };

  const handleUpdateShift = async () => {
    if (!validateForm() || !editingShift || !selectedCompany) return;

    try {
      await updateShiftMutation.mutateAsync({
        companyId: selectedCompany,
        shiftId: editingShift.id,
        data: {
          name: formData.name.trim(),
          entry1: formData.entry1,
          exit1: formData.exit1,
          entry2: formData.entry2 || null,
          exit2: formData.exit2 || null,
        },
      });
      toast.success("Escala atualizada com sucesso!");
      setIsEditDialogOpen(false);
      setEditingShift(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao atualizar escala"
      );
    }
  };

  const handleDeleteShift = async () => {
    if (!deletingShift || !selectedCompany) return;

    try {
      await deleteShiftMutation.mutateAsync({
        companyId: selectedCompany,
        shiftId: deletingShift.id,
      });
      toast.success("Escala excluída com sucesso!");
      setIsDeleteDialogOpen(false);
      setDeletingShift(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir escala"
      );
    }
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
                Criar Escalas
              </h2>
              <p className="text-muted-foreground mt-1">
                Crie e gerencie escalas para cada empresa
              </p>
            </div>

            <Button asChild variant="outline">
              <Link href="/escala">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Aplicar Escala
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Empresas</CardTitle>
              <CardDescription>
                Selecione uma empresa para criar ou gerenciar escalas
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredCompanies.map((company) => {
                      // Buscar shifts desta empresa - vamos usar o hook quando a empresa estiver selecionada
                      // Por enquanto, vamos fazer uma query separada para cada empresa
                      // Isso não é ideal, mas funciona. Em produção, poderíamos otimizar
                      const companyShifts = shifts.filter(
                        (shift) => shift.company_id === company.id
                      );

                      return (
                        <Card key={company.id} className="border">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <Building className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <CardTitle className="text-lg">
                                    {company.name}
                                  </CardTitle>
                                  <CardDescription className="text-sm">
                                    {company.address}
                                  </CardDescription>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleOpenCreateDialog(company.id)
                                }
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Nova Escala
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {companyShifts.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                Nenhuma escala cadastrada para esta empresa
                              </div>
                            ) : (
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/50">
                                      <TableHead>Nome da Escala</TableHead>
                                      <TableHead>Horários</TableHead>
                                      <TableHead>Criado em</TableHead>
                                      <TableHead className="text-right">
                                        Ações
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {companyShifts.map((shift) => (
                                      <TableRow key={shift.id}>
                                        <TableCell className="font-medium">
                                          <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            {shift.name}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex flex-col text-sm">
                                            <span>
                                              {formatTime(shift.entry1)} -{" "}
                                              {formatTime(shift.exit1)}
                                            </span>
                                            {shift.entry2 && shift.exit2 && (
                                              <span className="text-muted-foreground">
                                                {formatTime(shift.entry2)} -{" "}
                                                {formatTime(shift.exit2)}
                                              </span>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                          {formatDate(shift.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() =>
                                                handleOpenEditDialog(shift)
                                              }
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() =>
                                                handleOpenDeleteDialog(shift)
                                              }
                                            >
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal para criar escala */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Escala</DialogTitle>
              <DialogDescription>
                Defina os horários da nova escala para{" "}
                {selectedCompany &&
                  companies.find((c) => c.id === selectedCompany)?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">
                  Nome da Escala <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Turno Matutino"
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entry1">
                    Entrada 1 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="entry1"
                    type="time"
                    value={formData.entry1}
                    onChange={(e) =>
                      setFormData({ ...formData, entry1: e.target.value })
                    }
                  />
                  {formErrors.entry1 && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.entry1}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="exit1">
                    Saída 1 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="exit1"
                    type="time"
                    value={formData.exit1}
                    onChange={(e) =>
                      setFormData({ ...formData, exit1: e.target.value })
                    }
                  />
                  {formErrors.exit1 && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.exit1}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="entry2">Entrada 2 (opcional)</Label>
                  <Input
                    id="entry2"
                    type="time"
                    value={formData.entry2}
                    onChange={(e) =>
                      setFormData({ ...formData, entry2: e.target.value })
                    }
                  />
                  {formErrors.entry2 && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.entry2}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="exit2">Saída 2 (opcional)</Label>
                  <Input
                    id="exit2"
                    type="time"
                    value={formData.exit2}
                    onChange={(e) =>
                      setFormData({ ...formData, exit2: e.target.value })
                    }
                  />
                  {formErrors.exit2 && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.exit2}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={createShiftMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateShift}
                disabled={createShiftMutation.isPending}
              >
                {createShiftMutation.isPending ? "Criando..." : "Criar Escala"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal para editar escala */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Escala</DialogTitle>
              <DialogDescription>
                Altere os horários da escala
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">
                  Nome da Escala <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Turno Matutino"
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-entry1">
                    Entrada 1 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-entry1"
                    type="time"
                    value={formData.entry1}
                    onChange={(e) =>
                      setFormData({ ...formData, entry1: e.target.value })
                    }
                  />
                  {formErrors.entry1 && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.entry1}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-exit1">
                    Saída 1 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-exit1"
                    type="time"
                    value={formData.exit1}
                    onChange={(e) =>
                      setFormData({ ...formData, exit1: e.target.value })
                    }
                  />
                  {formErrors.exit1 && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.exit1}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-entry2">Entrada 2 (opcional)</Label>
                  <Input
                    id="edit-entry2"
                    type="time"
                    value={formData.entry2}
                    onChange={(e) =>
                      setFormData({ ...formData, entry2: e.target.value })
                    }
                  />
                  {formErrors.entry2 && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.entry2}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-exit2">Saída 2 (opcional)</Label>
                  <Input
                    id="edit-exit2"
                    type="time"
                    value={formData.exit2}
                    onChange={(e) =>
                      setFormData({ ...formData, exit2: e.target.value })
                    }
                  />
                  {formErrors.exit2 && (
                    <p className="text-sm text-destructive mt-1">
                      {formErrors.exit2}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateShiftMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateShift}
                disabled={updateShiftMutation.isPending}
              >
                {updateShiftMutation.isPending
                  ? "Salvando..."
                  : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal para confirmar exclusão */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir a escala{" "}
                <strong>{deletingShift?.name}</strong>?
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={deleteShiftMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteShift}
                disabled={deleteShiftMutation.isPending}
              >
                {deleteShiftMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
