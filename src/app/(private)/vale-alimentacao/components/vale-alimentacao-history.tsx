"use client";

import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useValeAlimentacaoHistory,
  useDownloadValeAlimentacaoFromHistory,
  useDeleteValeAlimentacaoFromHistory,
} from "@/hooks/use-vale-alimentacao";
import {
  Download,
  Trash2,
  FileText,
  User,
  Calendar,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function ValeAlimentacaoHistory() {
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 10;

  // Buscar histórico de relatórios de vale alimentação
  const { data: historyData, isLoading } = useValeAlimentacaoHistory({
    page: currentPage,
    page_size: pageSize,
  });

  const downloadMutation = useDownloadValeAlimentacaoFromHistory();
  const deleteMutation = useDeleteValeAlimentacaoFromHistory();

  const handleDownload = (id: string) => {
    downloadMutation.mutate(id);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    try {
      await deleteMutation.mutateAsync(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const history = historyData?.data || [];
  const pagination = historyData?.pagination;

  return (
    <>
      <div className="space-y-6">
        {/* Tabela de Histórico */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Exportações</CardTitle>
            <CardDescription>
              Visualize e faça download dos relatórios de vale alimentação exportados anteriormente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Nenhum relatório exportado
                </h3>
                <p className="text-muted-foreground">
                  Nenhum relatório de vale alimentação foi exportado ainda.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-center">
                          Funcionários
                        </TableHead>
                        <TableHead className="text-center">Registros</TableHead>
                        <TableHead className="text-right">Total VR</TableHead>
                        <TableHead className="text-right">Total Ajuda Custo</TableHead>
                        <TableHead>Exportado em</TableHead>
                        <TableHead className="text-center">Tamanho</TableHead>
                        <TableHead className="text-center w-[120px]">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {item.employee_name || "Geral"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {formatDate(item.start_date)} até{" "}
                                {formatDate(item.end_date)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="gap-1">
                              <Users className="h-3 w-3" />
                              {item.total_employees}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {item.total_records}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <div className="flex items-center justify-end gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              {formatCurrency(item.total_vr)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <div className="flex items-center justify-end gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              {formatCurrency(item.total_cost_help)}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDateTime(item.exported_at)}
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {formatFileSize(item.file_size_bytes)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownload(item.id)}
                                disabled={downloadMutation.isPending}
                              >
                                <Download className="h-4 w-4" />
                                <span className="sr-only">Baixar PDF</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClick(item.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Deletar</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {history.length} de {pagination.total} registros
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      <span className="text-sm">
                        Página {currentPage} de {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) =>
                            Math.min(pagination.totalPages, p + 1)
                          )
                        }
                        disabled={currentPage === pagination.totalPages}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este relatório do histórico? Esta
              ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeletingId(null);
              }}
              disabled={deleteMutation.isPending}
            >
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
