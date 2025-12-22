// app/(private)/boletim/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
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
  Building,
  Calendar,
  FileText,
  Users,
  Filter,
  Download,
  X,
  Edit,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCompanies } from "@/hooks/use-companies";
import { useBoletim, useExportBoletimPDF } from "@/hooks/use-boletim";
import type { BoletimData } from "@/services/boletim.service";

// Importação dinâmica do PDFViewer (só funciona no client-side)
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

// Importar o componente BoletimPDF
import { BoletimPDF } from "@/components/boletim-pdf";

// Valores para "Todos"
const ALL_VALUES = {
  POSITION: "all-positions",
  DEPARTMENT: "all-departments",
  DATE: "all-dates",
};

export default function BoletimPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isDateRangeValid, setIsDateRangeValid] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [isBulletinDialogOpen, setIsBulletinDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>("");

  // Carregar logo como base64
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await fetch("/assets/logo.png");
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.warn("Erro ao carregar logo:", error);
      }
    };
    loadLogo();
  }, []);

  // Filtros do modal
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState(ALL_VALUES.POSITION);
  const [departmentFilter, setDepartmentFilter] = useState(
    ALL_VALUES.DEPARTMENT
  );
  const [dateFilter, setDateFilter] = useState(ALL_VALUES.DATE);

  // Estado para edição
  const [editFormData, setEditFormData] = useState({
    position: "",
    department: "",
    entry1: "",
    exit1: "",
    entry2: "",
    exit2: "",
    total_hours: "",
    normal_hours: "",
    night_additional: "",
    extra_50_day: "",
    extra_50_night: "",
    extra_100_day: "",
    extra_100_night: "",
    value: "",
  });

  // Buscar empresas
  const { data: companiesResponse, isLoading: isLoadingCompanies } =
    useCompanies();
  const companies = useMemo(
    () => companiesResponse?.companies || [],
    [companiesResponse]
  );

  // Buscar boletim
  const {
    data: boletimData,
    isLoading: isLoadingBoletim,
    refetch: refetchBoletim,
  } = useBoletim(
    {
      company_id: selectedCompany || "",
      start_date: startDate,
      end_date: endDate,
    },
    false // Não buscar automaticamente
  );

  // Mutation para exportar PDF
  const { mutate: exportPDF, isPending: isExportingPDF } =
    useExportBoletimPDF();

  // Estado local para armazenar edições temporárias (key: employee_id-date)
  const [editedData, setEditedData] = useState<
    Record<string, Partial<typeof editFormData>>
  >({});

  // Filtrar empresas por termo de busca
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [companies, searchTerm]);

  // Filtrar dados do boletim e aplicar edições locais
  const filteredBulletinData = useMemo((): BoletimData[] => {
    if (!boletimData) return [];

    // Aplicar edições locais primeiro
    const dataWithEdits = boletimData.map((item) => {
      const key = `${item.employee_id}-${item.date}`;
      const edits = editedData[key];

      if (edits) {
        return {
          ...item,
          ...edits,
          value: edits.value ? parseFloat(edits.value) : item.value,
        };
      }

      return item;
    });

    let filtered = [...dataWithEdits];

    // Filtrar por funcionário
    if (employeeFilter) {
      filtered = filtered.filter((item) =>
        item.employee_name.toLowerCase().includes(employeeFilter.toLowerCase())
      );
    }

    // Filtrar por função
    if (positionFilter !== ALL_VALUES.POSITION) {
      filtered = filtered.filter((item) => item.position === positionFilter);
    }

    // Filtrar por setor
    if (departmentFilter !== ALL_VALUES.DEPARTMENT) {
      filtered = filtered.filter(
        (item) => item.department === departmentFilter
      );
    }

    // Filtrar por data
    if (dateFilter !== ALL_VALUES.DATE) {
      filtered = filtered.filter((item) => item.date === dateFilter);
    }

    // Ordenar por data e depois por horário de entrada (mais cedo para mais tarde)
    filtered.sort((a, b) => {
      // Primeiro ordenar por data
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;

      // Se a data for igual, ordenar por horário de entrada
      const parseTime = (time?: string): number => {
        if (!time || time === "-") return Infinity; // Sem horário vai para o final
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const timeA = parseTime(a.entry1);
      const timeB = parseTime(b.entry1);

      if (timeA !== timeB) return timeA - timeB;

      // Se o horário for igual, ordenar por nome do funcionário como critério de desempate
      return a.employee_name.localeCompare(b.employee_name);
    });

    return filtered;
  }, [
    boletimData,
    editedData,
    employeeFilter,
    positionFilter,
    departmentFilter,
    dateFilter,
  ]);

  // Calcular totais
  const totals = useMemo(() => {
    const parseTime = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours + minutes / 60;
    };

    const totalValue = filteredBulletinData.reduce(
      (sum, item) => sum + item.value,
      0
    );
    const totalHours = filteredBulletinData.reduce(
      (sum, item) => sum + parseTime(item.total_hours),
      0
    );
    const totalNormalHours = filteredBulletinData.reduce(
      (sum, item) => sum + parseTime(item.normal_hours),
      0
    );
    const totalNightAdditional = filteredBulletinData.reduce(
      (sum, item) => sum + parseTime(item.night_additional || "00:00"),
      0
    );
    const totalExtra50Day = filteredBulletinData.reduce(
      (sum, item) => sum + parseTime(item.extra_50_day),
      0
    );
    const totalExtra50Night = filteredBulletinData.reduce(
      (sum, item) => sum + parseTime(item.extra_50_night),
      0
    );
    const totalExtra100Day = filteredBulletinData.reduce(
      (sum, item) => sum + parseTime(item.extra_100_day),
      0
    );
    const totalExtra100Night = filteredBulletinData.reduce(
      (sum, item) => sum + parseTime(item.extra_100_night),
      0
    );

    return {
      totalValue,
      totalHours,
      totalNormalHours,
      totalNightAdditional,
      totalExtra50Day,
      totalExtra50Night,
      totalExtra100Day,
      totalExtra100Night,
    };
  }, [filteredBulletinData]);

  // Obter funções únicas
  const uniquePositions = useMemo(() => {
    if (!boletimData) return [];
    return [...new Set(boletimData.map((item) => item.position))].sort();
  }, [boletimData]);

  // Obter setores únicos
  const uniqueDepartments = useMemo(() => {
    if (!boletimData) return [];
    return [...new Set(boletimData.map((item) => item.department))].sort();
  }, [boletimData]);

  // Obter datas únicas para filtro
  const uniqueDates = useMemo(() => {
    if (!boletimData) return [];
    const dates = [...new Set(boletimData.map((item) => item.date))];
    return dates.sort();
  }, [boletimData]);

  // Obter dias da semana únicos para filtro

  // Validar data final
  const validateDateRange = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const isValid = end >= start;
      setIsDateRangeValid(isValid);
      return isValid;
    }
    setIsDateRangeValid(true);
    return true;
  };

  const handleDateChange = (type: "start" | "end", value: string) => {
    if (type === "start") {
      setStartDate(value);
    } else {
      setEndDate(value);
    }

    // Validar após um pequeno delay
    setTimeout(validateDateRange, 10);
  };

  const handleGenerateBulletin = async (companyId: string) => {
    if (!startDate || !endDate) {
      toast.error("Informe a data inicial e final");
      return;
    }

    if (!isDateRangeValid) {
      toast.error("Data final deve ser maior ou igual à data inicial");
      return;
    }

    const company = companies.find((c) => c.id === companyId);
    if (!company) return;

    setSelectedCompany(companyId);
    setSelectedCompanyName(company.name);

    // Limpar edições anteriores
    setEditedData({});

    // Buscar dados do boletim
    const result = await refetchBoletim();

    if (result.isSuccess && result.data) {
      if (result.data.length === 0) {
        toast.warning(
          "Nenhum registro de ponto encontrado para o período selecionado"
        );
      } else {
        toast.success(`Boletim gerado com ${result.data.length} registro(s)`);
      }
      setIsBulletinDialogOpen(true);
      setShowPDFPreview(false);
    } else if (result.isError) {
      toast.error("Erro ao gerar boletim");
    }
  };

  const handleExportBulletin = () => {
    if (!selectedCompanyName || !boletimData) return;

    exportPDF({
      companyName: selectedCompanyName,
      startDate,
      endDate,
      data: filteredBulletinData,
    });
  };

  // Funções de edição
  const handleEditRow = (index: number) => {
    const rowData = filteredBulletinData[index];
    setEditingRow(index);
    setEditFormData({
      position: rowData.position,
      department: rowData.department,
      entry1: rowData.entry1 || "",
      exit1: rowData.exit1 || "",
      entry2: rowData.entry2 || "",
      exit2: rowData.exit2 || "",
      total_hours: rowData.total_hours,
      normal_hours: rowData.normal_hours,
      night_additional: rowData.night_additional || "",
      extra_50_day: rowData.extra_50_day,
      extra_50_night: rowData.extra_50_night,
      extra_100_day: rowData.extra_100_day,
      extra_100_night: rowData.extra_100_night,
      value: rowData.value.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingRow !== null) {
      const rowData = filteredBulletinData[editingRow];
      const key = `${rowData.employee_id}-${rowData.date}`;

      // Salvar edições no estado local
      setEditedData((prev) => ({
        ...prev,
        [key]: {
          position: editFormData.position,
          department: editFormData.department,
          entry1: editFormData.entry1,
          exit1: editFormData.exit1,
          entry2: editFormData.entry2,
          exit2: editFormData.exit2,
          total_hours: editFormData.total_hours,
          normal_hours: editFormData.normal_hours,
          night_additional: editFormData.night_additional,
          extra_50_day: editFormData.extra_50_day,
          extra_50_night: editFormData.extra_50_night,
          extra_100_day: editFormData.extra_100_day,
          extra_100_night: editFormData.extra_100_night,
          value: editFormData.value,
        },
      }));

      toast.success(
        "Valores atualizados! Lembre-se: as edições são temporárias e serão perdidas ao fechar o boletim."
      );
      setIsEditDialogOpen(false);
      setEditingRow(null);
      setEditFormData({
        position: "",
        department: "",
        entry1: "",
        exit1: "",
        entry2: "",
        exit2: "",
        total_hours: "",
        normal_hours: "",
        night_additional: "",
        extra_50_day: "",
        extra_50_night: "",
        extra_100_day: "",
        extra_100_night: "",
        value: "",
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingRow(null);
    setEditFormData({
      position: "",
      department: "",
      entry1: "",
      exit1: "",
      entry2: "",
      exit2: "",
      total_hours: "",
      normal_hours: "",
      night_additional: "",
      extra_50_day: "",
      extra_50_night: "",
      extra_100_day: "",
      extra_100_night: "",
      value: "",
    });
  };

  const clearAllFilters = () => {
    setEmployeeFilter("");
    setPositionFilter(ALL_VALUES.POSITION);
    setDepartmentFilter(ALL_VALUES.DEPARTMENT);
    setDateFilter(ALL_VALUES.DATE);
  };

  const clearAllEdits = () => {
    setEditedData({});
    toast.success("Todas as edições foram descartadas");
  };

  const hasEdits = Object.keys(editedData).length > 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00Z");
    return date.toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <SidebarProvider>
      <AppSidebar collapsible="icon" />
      <div className="min-h-screen w-full p-6">
        <SidebarTrigger className="-ml-1" />
        <div className="space-y-6">
          <div>
            <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
              Boletim de Ponto
            </h2>
            <p className="text-muted-foreground mt-1">
              Gere boletins de ponto por empresa e período
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filtros do Boletim</CardTitle>
              <CardDescription>
                Defina o período para geração do boletim
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div>
                    <Label htmlFor="start-date" className="mb-2 block">
                      Data Inicial <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) =>
                          handleDateChange("start", e.target.value)
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="end-date" className="mb-2 block">
                      Data Final <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) =>
                          handleDateChange("end", e.target.value)
                        }
                        min={startDate}
                        className={`flex-1 ${
                          !isDateRangeValid ? "border-destructive" : ""
                        }`}
                      />
                    </div>
                    {!isDateRangeValid && (
                      <p className="text-sm text-destructive mt-1">
                        Data final deve ser maior ou igual à data inicial
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Empresas</CardTitle>
              <CardDescription>
                Selecione uma empresa para gerar o boletim
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

                {isLoadingCompanies ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="mt-2">Carregando empresas...</p>
                  </div>
                ) : filteredCompanies.length === 0 ? (
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
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCompanies.map((company) => (
                          <TableRow key={company.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                {company.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {company.address || "Sem endereço"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleGenerateBulletin(company.id)
                                }
                                disabled={
                                  !startDate ||
                                  !endDate ||
                                  !isDateRangeValid ||
                                  isLoadingBoletim
                                }
                              >
                                {isLoadingBoletim &&
                                selectedCompany === company.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Gerando...
                                  </>
                                ) : (
                                  <>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Gerar Boletim
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal principal do Boletim */}
        <Dialog
          open={isBulletinDialogOpen}
          onOpenChange={setIsBulletinDialogOpen}
        >
          <DialogContent className="dialog-override overflow-hidden flex flex-col">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl">
                    Boletim de Ponto
                  </DialogTitle>
                  <DialogDescription>
                    {selectedCompanyName}
                    {" - "}
                    Período: {formatDate(startDate)} até {formatDate(endDate)}
                  </DialogDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={showPDFPreview ? "default" : "outline"}
                    onClick={() => setShowPDFPreview(!showPDFPreview)}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {showPDFPreview ? "Ver Tabela" : "Preview PDF"}
                  </Button>
                  <Button
                    onClick={handleExportBulletin}
                    disabled={
                      isExportingPDF || filteredBulletinData.length === 0
                    }
                    className="gap-2"
                  >
                    {isExportingPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Exportar PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              {showPDFPreview ? (
                <div className="flex-1 overflow-hidden border rounded-lg">
                  <PDFViewer width="100%" height="100%">
                    <BoletimPDF
                      companyName={selectedCompanyName}
                      startDate={startDate}
                      endDate={endDate}
                      data={filteredBulletinData}
                      logoBase64={logoBase64}
                    />
                  </PDFViewer>
                </div>
              ) : (
                <>
                  {/* Filtros do modal */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium mb-2 block">
                            <Filter className="h-3 w-3 inline mr-1" />
                            Colaborador
                          </Label>
                          <Input
                            placeholder="Filtrar por nome..."
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            className="text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            <Filter className="h-3 w-3 inline mr-1" />
                            Função
                          </Label>
                          <Select
                            value={positionFilter}
                            onValueChange={setPositionFilter}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Todas funções" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ALL_VALUES.POSITION}>
                                Todas funções
                              </SelectItem>
                              {uniquePositions.map((position) => (
                                <SelectItem key={position} value={position}>
                                  {position}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            <Filter className="h-3 w-3 inline mr-1" />
                            Setor
                          </Label>
                          <Select
                            value={departmentFilter}
                            onValueChange={setDepartmentFilter}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Todos setores" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ALL_VALUES.DEPARTMENT}>
                                Todos setores
                              </SelectItem>
                              {uniqueDepartments.map((department) => (
                                <SelectItem key={department} value={department}>
                                  {department}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            <Filter className="h-3 w-3 inline mr-1" />
                            Dia
                          </Label>
                          <Select
                            value={dateFilter}
                            onValueChange={setDateFilter}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Todos os dias" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ALL_VALUES.DATE}>
                                Todos os dias
                              </SelectItem>
                              {uniqueDates.map((date) => (
                                <SelectItem key={date} value={date}>
                                  {formatDate(date)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="text-sm gap-2 w-full h-10"
                          >
                            <X className="h-3 w-3" />
                            Limpar Filtros
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tabela do boletim */}
                  <Card className="flex-1 overflow-hidden flex flex-col">
                    <CardContent className="p-0 flex-1 overflow-hidden">
                      <div className="h-full overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-background z-10 border-b">
                            <tr className="border-b">
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background sticky left-0 z-20">
                                Colaborador
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Função
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Setor
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Dia
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
                                Total Horas
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Hora Normal
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Adicional Noturno
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                50% Diurna
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                50% Noturna
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                100% Diurna
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                100% Noturna
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background">
                                Valor
                              </th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap bg-background sticky right-0 z-20">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredBulletinData.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={16}
                                  className="p-8 text-center text-muted-foreground"
                                >
                                  Nenhum registro encontrado com os filtros
                                  selecionados
                                </td>
                              </tr>
                            ) : (
                              <>
                                {filteredBulletinData.map((item, index) => {
                                  const key = `${item.employee_id}-${item.date}`;
                                  const isEdited = !!editedData[key];

                                  return (
                                    <tr
                                      key={`${item.employee_id}-${item.date}-${index}`}
                                      className={`border-b hover:bg-muted/50 ${
                                        isEdited
                                          ? "bg-yellow-50 dark:bg-yellow-950/20"
                                          : ""
                                      }`}
                                    >
                                      <td
                                        className={`p-3 align-middle font-medium whitespace-nowrap sticky left-0 ${
                                          isEdited
                                            ? "bg-yellow-50 dark:bg-yellow-950/20"
                                            : "bg-background"
                                        }`}
                                      >
                                        {item.employee_name}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {item.position}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {item.department}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {formatDate(item.date)}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {item.entry1}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {item.exit1}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {item.entry2 || "-"}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {item.exit2 || "-"}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap font-medium">
                                        {item.total_hours}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {item.normal_hours}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {item.night_additional || "00:00"}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {item.extra_50_day}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {item.extra_50_night}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {item.extra_100_day}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap">
                                        {item.extra_100_night}
                                      </td>
                                      <td className="p-3 align-middle whitespace-nowrap font-medium">
                                        {formatCurrency(item.value)}
                                      </td>
                                      <td
                                        className={`p-3 align-middle whitespace-nowrap sticky right-0 ${
                                          isEdited
                                            ? "bg-yellow-50 dark:bg-yellow-950/20"
                                            : "bg-background"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {isEdited && (
                                            <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                              Editado
                                            </span>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditRow(index)}
                                            className="h-8 w-8 p-0"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}

                                {/* Linha de totais */}
                                <tr className="border-t bg-muted/50 font-semibold">
                                  <td
                                    colSpan={8}
                                    className="p-3 align-middle text-right"
                                  >
                                    Totais:
                                  </td>
                                  <td className="p-3 align-middle whitespace-nowrap">
                                    {formatHours(totals.totalHours)}
                                  </td>
                                  <td className="p-3 align-middle whitespace-nowrap">
                                    {formatHours(totals.totalNormalHours)}
                                  </td>
                                  <td className="p-3 align-middle whitespace-nowrap">
                                    {formatHours(totals.totalNightAdditional)}
                                  </td>
                                  <td className="p-3 align-middle whitespace-nowrap">
                                    {formatHours(totals.totalExtra50Day)}
                                  </td>
                                  <td className="p-3 align-middle whitespace-nowrap">
                                    {formatHours(totals.totalExtra50Night)}
                                  </td>
                                  <td className="p-3 align-middle whitespace-nowrap">
                                    {formatHours(totals.totalExtra100Day)}
                                  </td>
                                  <td className="p-3 align-middle whitespace-nowrap">
                                    {formatHours(totals.totalExtra100Night)}
                                  </td>
                                  <td className="p-3 align-middle whitespace-nowrap">
                                    {formatCurrency(totals.totalValue)}
                                  </td>
                                  <td className="p-3 align-middle whitespace-nowrap sticky right-0 bg-background"></td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resumo rápido */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Total de Horas
                            </p>
                            <p className="text-2xl font-bold">
                              {formatHours(totals.totalHours)}
                            </p>
                          </div>
                          <Calendar className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Horas Extras 50%
                            </p>
                            <p className="text-2xl font-bold">
                              {formatHours(
                                totals.totalExtra50Day +
                                  totals.totalExtra50Night
                              )}
                            </p>
                          </div>
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Horas Extras 100%
                            </p>
                            <p className="text-2xl font-bold">
                              {formatHours(
                                totals.totalExtra100Day +
                                  totals.totalExtra100Night
                              )}
                            </p>
                          </div>
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Valor Total
                            </p>
                            <p className="text-2xl font-bold">
                              {formatCurrency(totals.totalValue)}
                            </p>
                          </div>
                          <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              {hasEdits && (
                <Button
                  variant="destructive"
                  onClick={clearAllEdits}
                  className="mr-auto"
                >
                  Descartar Edições ({Object.keys(editedData).length})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setIsBulletinDialogOpen(false);
                  setShowPDFPreview(false);
                }}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição (separado do modal principal) */}
        <Dialog open={isEditDialogOpen} onOpenChange={handleCancelEdit}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Valores</DialogTitle>
              <DialogDescription>
                Edite os valores para{" "}
                {editingRow !== null &&
                  filteredBulletinData[editingRow]?.employee_name}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
              <div>
                <Label htmlFor="edit-employee-position">Função</Label>
                <Input
                  id="edit-employee-position"
                  type="text"
                  value={editFormData.position}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      position: e.target.value,
                    })
                  }
                  placeholder="Digite a função"
                />
              </div>

              <div>
                <Label htmlFor="edit-employee-department">Setor</Label>
                <Input
                  id="edit-employee-department"
                  type="text"
                  value={editFormData.department}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      department: e.target.value,
                    })
                  }
                  placeholder="Digite o setor"
                />
              </div>

              <div>
                <Label htmlFor="edit-entry1">Entrada 1</Label>
                <Input
                  id="edit-entry1"
                  type="time"
                  value={editFormData.entry1}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, entry1: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-exit1">Saída 1</Label>
                <Input
                  id="edit-exit1"
                  type="time"
                  value={editFormData.exit1}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, exit1: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-entry2">Entrada 2 (opcional)</Label>
                <Input
                  id="edit-entry2"
                  type="time"
                  value={editFormData.entry2}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, entry2: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-exit2">Saída 2 (opcional)</Label>
                <Input
                  id="edit-exit2"
                  type="time"
                  value={editFormData.exit2}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, exit2: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-total-hours">Total Horas</Label>
                <Input
                  id="edit-total-hours"
                  type="time"
                  value={editFormData.total_hours}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      total_hours: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-normal-hours">Hora Normal</Label>
                <Input
                  id="edit-normal-hours"
                  type="time"
                  value={editFormData.normal_hours}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      normal_hours: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-night-additional">Adicional Noturno</Label>
                <Input
                  id="edit-night-additional"
                  type="time"
                  value={editFormData.night_additional}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      night_additional: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-extra50-day">50% Diurna</Label>
                <Input
                  id="edit-extra50-day"
                  type="time"
                  value={editFormData.extra_50_day}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      extra_50_day: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-extra50-night">50% Noturna</Label>
                <Input
                  id="edit-extra50-night"
                  type="time"
                  value={editFormData.extra_50_night}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      extra_50_night: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-extra100-day">100% Diurna</Label>
                <Input
                  id="edit-extra100-day"
                  type="time"
                  value={editFormData.extra_100_day}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      extra_100_day: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="edit-extra100-night">100% Noturna</Label>
                <Input
                  id="edit-extra100-night"
                  type="time"
                  value={editFormData.extra_100_night}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      extra_100_night: e.target.value,
                    })
                  }
                />
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="edit-value">Valor (R$)</Label>
                <Input
                  id="edit-value"
                  type="number"
                  step="0.01"
                  value={editFormData.value}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, value: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
