"use client";

import { useState } from "react";
import { Calendar, Edit, MoreVertical, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useCustomHolidays,
  useCreateCustomHoliday,
  useUpdateCustomHoliday,
  useDeleteCustomHoliday,
} from "@/hooks/use-custom-holidays";
import { CustomHoliday } from "@/types/custom-holidays";
import { toast } from "sonner";

function formatDisplayDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function CustomHolidaysTab() {
  const { data, isLoading, error } = useCustomHolidays();
  const createMutation = useCreateCustomHoliday();
  const updateMutation = useUpdateCustomHoliday();
  const deleteMutation = useDeleteCustomHoliday();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<CustomHoliday | null>(null);
  const [deleting, setDeleting] = useState<CustomHoliday | null>(null);

  const [formDate, setFormDate] = useState("");
  const [formName, setFormName] = useState("");
  const [formErrors, setFormErrors] = useState<{
    date?: string;
    name?: string;
  }>({});

  const resetForm = () => {
    setFormDate("");
    setFormName("");
    setFormErrors({});
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (h: CustomHoliday) => {
    setEditing(h);
    setFormDate(h.holiday_date);
    setFormName(h.name);
    setFormErrors({});
    setEditOpen(true);
  };

  const openDelete = (h: CustomHoliday) => {
    setDeleting(h);
    setDeleteOpen(true);
  };

  const validate = () => {
    const errors: { date?: string; name?: string } = {};
    if (!formDate) {
      errors.date = "Informe a data";
    }
    if (!formName.trim()) {
      errors.name = "Informe o nome do feriado";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createMutation.mutateAsync({
        holiday_date: formDate,
        name: formName.trim(),
      });
      toast.success("Feriado cadastrado");
      setCreateOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !validate()) return;
    try {
      await updateMutation.mutateAsync({
        id: editing.id,
        data: {
          holiday_date: formDate,
          name: formName.trim(),
        },
      });
      toast.success("Feriado atualizado");
      setEditOpen(false);
      setEditing(null);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success("Feriado removido");
      setDeleteOpen(false);
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  };

  const holidays = data?.holidays ?? [];

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <p className="text-sm text-muted-foreground max-w-xl">
          Feriados extras (municipais, ponte, ponto facultativo etc.) entram no
          cálculo de ponto e nas regras de vale alimentação, além dos feriados
          nacionais já reconhecidos pelo sistema.
        </p>
        <Button className="w-full sm:w-auto shrink-0" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo feriado
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Erro ao carregar feriados. Tente novamente.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Feriados cadastrados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : holidays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Nenhum feriado adicional</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastre datas para complementar o calendário nacional.
              </p>
            </div>
          ) : (
            <div className="rounded-md border mx-4 sm:mx-0 mb-4 sm:mb-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-[80px] text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatDisplayDate(h.holiday_date)}
                      </TableCell>
                      <TableCell>{h.name}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(h)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => openDelete(h)}
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
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Novo feriado</DialogTitle>
              <DialogDescription>
                A data deve ser única. Use o nome oficial ou interno do
                feriado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Field orientation="vertical">
                <FieldLabel htmlFor="holiday-date">
                  Data <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="holiday-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => {
                      setFormDate(e.target.value);
                      if (formErrors.date)
                        setFormErrors((p) => ({ ...p, date: undefined }));
                    }}
                    aria-invalid={!!formErrors.date}
                  />
                  {formErrors.date && (
                    <FieldError>{formErrors.date}</FieldError>
                  )}
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel htmlFor="holiday-name">
                  Nome <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="holiday-name"
                    placeholder="Ex: Aniversário do município"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (formErrors.name)
                        setFormErrors((p) => ({ ...p, name: undefined }));
                    }}
                    aria-invalid={!!formErrors.name}
                  />
                  {formErrors.name && (
                    <FieldError>{formErrors.name}</FieldError>
                  )}
                </FieldContent>
              </Field>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) {
            setEditing(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Editar feriado</DialogTitle>
              <DialogDescription>Altere a data ou o nome.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Field orientation="vertical">
                <FieldLabel htmlFor="edit-holiday-date">
                  Data <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-holiday-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => {
                      setFormDate(e.target.value);
                      if (formErrors.date)
                        setFormErrors((p) => ({ ...p, date: undefined }));
                    }}
                    aria-invalid={!!formErrors.date}
                  />
                  {formErrors.date && (
                    <FieldError>{formErrors.date}</FieldError>
                  )}
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel htmlFor="edit-holiday-name">
                  Nome <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-holiday-name"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (formErrors.name)
                        setFormErrors((p) => ({ ...p, name: undefined }));
                    }}
                    aria-invalid={!!formErrors.name}
                  />
                  {formErrors.name && (
                    <FieldError>{formErrors.name}</FieldError>
                  )}
                </FieldContent>
              </Field>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir feriado</DialogTitle>
            <DialogDescription>
              {deleting
                ? `Remover "${deleting.name}" (${formatDisplayDate(deleting.holiday_date)})?`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
