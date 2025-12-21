// app/escala/criar/page.tsx
"use client";

import { useState } from "react";
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
import { Search, Plus, Building, Clock, Edit, Trash2 } from "lucide-react";
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

// Dados mockados
const mockCompanies = [
  {
    id: "1",
    name: "Empresa ABC Ltda",
    address: "Rua das Flores, 123 - São Paulo/SP",
  },
  {
    id: "2",
    name: "Comércio XYZ S.A.",
    address: "Av. Principal, 456 - Rio de Janeiro/RJ",
  },
  {
    id: "3",
    name: "Indústria 123 ME",
    address: "Rua Industrial, 789 - Belo Horizonte/MG",
  },
];

// Dados iniciais de escalas
let mockShifts = [
  {
    id: "1",
    name: "Turno Matutino",
    company_id: "1",
    entry1: "08:00:00",
    exit1: "12:00:00",
    entry2: "13:00:00",
    exit2: "17:00:00",
    created_at: "2024-01-15T10:30:00Z",
  },
  {
    id: "2",
    name: "Turno Noturno",
    company_id: "1",
    entry1: "22:00:00",
    exit1: "06:00:00",
    entry2: undefined,
    exit2: undefined,
    created_at: "2024-01-16T14:20:00Z",
  },
  {
    id: "3",
    name: "Escala 6x1",
    company_id: "2",
    entry1: "07:00:00",
    exit1: "13:00:00",
    entry2: "14:00:00",
    exit2: "18:00:00",
    created_at: "2024-01-17T09:15:00Z",
  },
];

export default function CriarEscalaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);
  const [deletingShift, setDeletingShift] = useState<any>(null);
  const [shifts, setShifts] = useState(mockShifts);
  const [isLoading, setIsLoading] = useState(false);

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

  // Filtrar empresas por termo de busca
  const filteredCompanies = mockCompanies.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleOpenEditDialog = (shift: any) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      entry1: shift.entry1.slice(0, 5),
      exit1: shift.exit1.slice(0, 5),
      entry2: shift.entry2 ? shift.entry2.slice(0, 5) : "13:00",
      exit2: shift.exit2 ? shift.exit2.slice(0, 5) : "17:00",
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (shift: any) => {
    setDeletingShift(shift);
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

    setIsLoading(true);

    // Simular chamada à API
    setTimeout(() => {
      const newShift = {
        id: (shifts.length + 1).toString(),
        name: formData.name.trim(),
        company_id: selectedCompany,
        entry1: `${formData.entry1}:00`,
        exit1: `${formData.exit1}:00`,
        entry2: formData.entry2 ? `${formData.entry2}:00` : undefined,
        exit2: formData.exit2 ? `${formData.exit2}:00` : undefined,
        created_at: new Date().toISOString(),
      };

      setShifts([...shifts, newShift]);
      toast.success("Escala criada com sucesso!");
      setIsDialogOpen(false);
      setIsLoading(false);
    }, 1000);
  };

  const handleUpdateShift = async () => {
    if (!validateForm() || !editingShift) return;

    setIsLoading(true);

    // Simular chamada à API
    setTimeout(() => {
      const updatedShifts = shifts.map((shift) =>
        shift.id === editingShift.id
          ? {
              ...shift,
              name: formData.name.trim(),
              entry1: `${formData.entry1}:00`,
              exit1: `${formData.exit1}:00`,
              entry2: formData.entry2 ? `${formData.entry2}:00` : undefined,
              exit2: formData.exit2 ? `${formData.exit2}:00` : undefined,
            }
          : shift
      );

      setShifts(updatedShifts);
      toast.success("Escala atualizada com sucesso!");
      setIsEditDialogOpen(false);
      setEditingShift(null);
      setIsLoading(false);
    }, 1000);
  };

  const handleDeleteShift = async () => {
    if (!deletingShift) return;

    setIsLoading(true);

    // Simular chamada à API
    setTimeout(() => {
      const updatedShifts = shifts.filter(
        (shift) => shift.id !== deletingShift.id
      );

      setShifts(updatedShifts);
      toast.success("Escala excluída com sucesso!");
      setIsDeleteDialogOpen(false);
      setDeletingShift(null);
      setIsLoading(false);
    }, 1000);
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
          <div>
            <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
              Criar Escalas
            </h2>
            <p className="text-muted-foreground mt-1">
              Crie e gerencie escalas para cada empresa
            </p>
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
                  <div className="space-y-6">
                    {filteredCompanies.map((company) => {
                      const companyShifts = shifts.filter(
                        (shift) => shift.company_id === company.id
                      );

                      return (
                        <Card key={company.id} className="border">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
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
                  mockCompanies.find((c) => c.id === selectedCompany)?.name}
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
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateShift} disabled={isLoading}>
                {isLoading ? "Criando..." : "Criar Escala"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal para editar escala */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Escala</DialogTitle>
              <DialogDescription>Altere os horários da escala</DialogDescription>
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
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateShift} disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar Alterações"}
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
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteShift}
                disabled={isLoading}
              >
                {isLoading ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}