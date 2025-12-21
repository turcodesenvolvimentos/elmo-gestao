// app/(private)/boletim/page.tsx
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
import { Search, Building, Calendar, FileText, Users, Filter, Download, X, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Dados mockados
const mockCompanies = [
  {
    id: "1",
    name: "Empresa ABC Ltda",
    address: "Rua das Flores, 123 - São Paulo/SP",
    employee_count: 15,
  },
  {
    id: "2",
    name: "Comércio XYZ S.A.",
    address: "Av. Principal, 456 - Rio de Janeiro/RJ",
    employee_count: 8,
  },
  {
    id: "3",
    name: "Indústria 123 ME",
    address: "Rua Industrial, 789 - Belo Horizonte/MG",
    employee_count: 22,
  },
];

// Dados mockados para o boletim
const mockBulletinData = [
  {
    id: 1,
    employee_name: "João Silva",
    position: "Operador de Máquinas",
    department: "Produção",
    date: "2024-01-01",
    day_of_week: "Segunda-feira",
    entry1: "08:00",
    exit1: "12:00",
    entry2: "13:00",
    exit2: "17:00",
    total_hours: "08:00",
    normal_hours: "08:00",
    extra_50_day: "00:00",
    extra_50_night: "00:00",
    extra_100_day: "00:00",
    extra_100_night: "00:00",
    value: 320.00,
  },
  {
    id: 2,
    employee_name: "Maria Santos",
    position: "Supervisora",
    department: "Administrativo",
    date: "2024-01-01",
    day_of_week: "Segunda-feira",
    entry1: "09:00",
    exit1: "18:00",
    entry2: undefined,
    exit2: undefined,
    total_hours: "09:00",
    normal_hours: "08:00",
    extra_50_day: "01:00",
    extra_50_night: "00:00",
    extra_100_day: "00:00",
    extra_100_night: "00:00",
    value: 450.00,
  },
  {
    id: 3,
    employee_name: "Pedro Oliveira",
    position: "Auxiliar de Limpeza",
    department: "Manutenção",
    date: "2024-01-01",
    day_of_week: "Segunda-feira",
    entry1: "22:00",
    exit1: "06:00",
    entry2: undefined,
    exit2: undefined,
    total_hours: "08:00",
    normal_hours: "07:00",
    extra_50_day: "00:00",
    extra_50_night: "01:00",
    extra_100_day: "00:00",
    extra_100_night: "00:00",
    value: 280.00,
  },
  {
    id: 4,
    employee_name: "Ana Costa",
    position: "Analista de RH",
    department: "Recursos Humanos",
    date: "2024-01-01",
    day_of_week: "Segunda-feira",
    entry1: "08:30",
    exit1: "12:30",
    entry2: "14:00",
    exit2: "18:00",
    total_hours: "08:00",
    normal_hours: "08:00",
    extra_50_day: "00:00",
    extra_50_night: "00:00",
    extra_100_day: "00:00",
    extra_100_night: "00:00",
    value: 400.00,
  },
  {
    id: 5,
    employee_name: "Carlos Souza",
    position: "Técnico em Eletrônica",
    department: "Manutenção",
    date: "2024-01-01",
    day_of_week: "Segunda-feira",
    entry1: "07:00",
    exit1: "17:00",
    entry2: undefined,
    exit2: undefined,
    total_hours: "10:00",
    normal_hours: "08:00",
    extra_50_day: "02:00",
    extra_50_night: "00:00",
    extra_100_day: "00:00",
    extra_100_night: "00:00",
    value: 520.00,
  },
  {
    id: 6,
    employee_name: "Juliana Lima",
    position: "Auxiliar Administrativo",
    department: "Administrativo",
    date: "2024-01-02",
    day_of_week: "Terça-feira",
    entry1: "08:00",
    exit1: "12:00",
    entry2: "13:00",
    exit2: "19:00",
    total_hours: "10:00",
    normal_hours: "08:00",
    extra_50_day: "02:00",
    extra_50_night: "00:00",
    extra_100_day: "00:00",
    extra_100_night: "00:00",
    value: 380.00,
  },
  {
    id: 7,
    employee_name: "Roberto Alves",
    position: "Motorista",
    department: "Logística",
    date: "2024-01-02",
    day_of_week: "Terça-feira",
    entry1: "06:00",
    exit1: "14:00",
    entry2: undefined,
    exit2: undefined,
    total_hours: "08:00",
    normal_hours: "08:00",
    extra_50_day: "00:00",
    extra_50_night: "00:00",
    extra_100_day: "00:00",
    extra_100_night: "00:00",
    value: 350.00,
  },
  {
    id: 8,
    employee_name: "Fernanda Costa",
    position: "Enfermeira",
    department: "Saúde Ocupacional",
    date: "2024-01-02",
    day_of_week: "Terça-feira",
    entry1: "12:00",
    exit1: "21:00",
    entry2: undefined,
    exit2: undefined,
    total_hours: "09:00",
    normal_hours: "08:00",
    extra_50_day: "01:00",
    extra_50_night: "00:00",
    extra_100_day: "00:00",
    extra_100_night: "00:00",
    value: 420.00,
  },
];

// Dados mockados para funções e setores
const mockPositions = [
  "Operador de Máquinas",
  "Supervisora",
  "Auxiliar de Limpeza",
  "Analista de RH",
  "Técnico em Eletrônica",
  "Auxiliar Administrativo",
  "Motorista",
  "Enfermeira",
];

const mockDepartments = [
  "Produção",
  "Administrativo",
  "Manutenção",
  "Recursos Humanos",
  "Logística",
  "Saúde Ocupacional",
];

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
  const [isBulletinDialogOpen, setIsBulletinDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  
  // Filtros do modal
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState(ALL_VALUES.POSITION);
  const [departmentFilter, setDepartmentFilter] = useState(ALL_VALUES.DEPARTMENT);
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
    extra_50_day: "",
    extra_50_night: "",
    extra_100_day: "",
    extra_100_night: "",
    value: "",
  });

  // Filtrar empresas por termo de busca
  const filteredCompanies = useMemo(() => {
    return mockCompanies.filter((company) =>
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Filtrar dados do boletim
  const filteredBulletinData = useMemo(() => {
    let filtered = [...mockBulletinData];

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
      filtered = filtered.filter((item) => item.department === departmentFilter);
    }

    // Filtrar por data
    if (dateFilter !== ALL_VALUES.DATE) {
      filtered = filtered.filter((item) => item.date === dateFilter);
    }

    return filtered;
  }, [employeeFilter, positionFilter, departmentFilter, dateFilter]);

  // Calcular totais
  const totals = useMemo(() => {
    const totalValue = filteredBulletinData.reduce((sum, item) => sum + item.value, 0);
    const totalHours = filteredBulletinData.reduce((sum, item) => {
      const [hours, minutes] = item.total_hours.split(":").map(Number);
      return sum + hours + minutes / 60;
    }, 0);
    
    const totalNormalHours = filteredBulletinData.reduce((sum, item) => {
      const [hours, minutes] = item.normal_hours.split(":").map(Number);
      return sum + hours + minutes / 60;
    }, 0);
    
    const totalExtra50Day = filteredBulletinData.reduce((sum, item) => {
      const [hours, minutes] = item.extra_50_day.split(":").map(Number);
      return sum + hours + minutes / 60;
    }, 0);
    
    const totalExtra50Night = filteredBulletinData.reduce((sum, item) => {
      const [hours, minutes] = item.extra_50_night.split(":").map(Number);
      return sum + hours + minutes / 60;
    }, 0);
    
    const totalExtra100Day = filteredBulletinData.reduce((sum, item) => {
      const [hours, minutes] = item.extra_100_day.split(":").map(Number);
      return sum + hours + minutes / 60;
    }, 0);
    
    const totalExtra100Night = filteredBulletinData.reduce((sum, item) => {
      const [hours, minutes] = item.extra_100_night.split(":").map(Number);
      return sum + hours + minutes / 60;
    }, 0);

    return {
      totalValue,
      totalHours,
      totalNormalHours,
      totalExtra50Day,
      totalExtra50Night,
      totalExtra100Day,
      totalExtra100Night,
    };
  }, [filteredBulletinData]);

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

  const handleGenerateBulletin = (companyId: string) => {
    if (!startDate || !endDate) {
      toast.error("Informe a data inicial e final");
      return;
    }

    if (!isDateRangeValid) {
      toast.error("Data final deve ser maior ou igual à data inicial");
      return;
    }

    setSelectedCompany(companyId);
    setIsLoading(true);
    
    // Simular carregamento de dados
    setTimeout(() => {
      const company = mockCompanies.find((c) => c.id === companyId);
      toast.success(
        `Boletim gerado para ${company?.name} de ${formatDate(startDate)} até ${formatDate(endDate)}`
      );
      setIsBulletinDialogOpen(true);
      setIsLoading(false);
    }, 1000);
  };

  const handleExportBulletin = () => {
    setIsLoading(true);
    
    // Simular exportação
    setTimeout(() => {
      toast.success("Boletim exportado com sucesso!");
      setIsLoading(false);
    }, 1500);
  };

  // Funções de edição
  const handleEditRow = (index: number) => {
    const rowData = filteredBulletinData[index];
    setEditingRow(index);
    setEditFormData({
      position: rowData.position,
      department: rowData.department,
      entry1: rowData.entry1,
      exit1: rowData.exit1,
      entry2: rowData.entry2 || "",
      exit2: rowData.exit2 || "",
      total_hours: rowData.total_hours,
      normal_hours: rowData.normal_hours,
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
      toast.success("Valores atualizados com sucesso!");
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
    return `${wholeHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  // Obter datas únicas para filtro
  const uniqueDates = useMemo(() => {
    const dates = [...new Set(mockBulletinData.map(item => item.date))];
    return dates.sort();
  }, []);

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
                        onChange={(e) => handleDateChange("start", e.target.value)}
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
                        onChange={(e) => handleDateChange("end", e.target.value)}
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
                              {company.address}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                <Users className="h-3 w-3 mr-1" />
                                {company.employee_count}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => handleGenerateBulletin(company.id)}
                                disabled={!startDate || !endDate || !isDateRangeValid || isLoading}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Gerar Boletim
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
        <Dialog open={isBulletinDialogOpen} onOpenChange={setIsBulletinDialogOpen}>
          <DialogContent className="dialog-override overflow-hidden flex flex-col">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl">
                    Boletim de Ponto
                  </DialogTitle>
                  <DialogDescription>
                    {selectedCompany && mockCompanies.find((c) => c.id === selectedCompany)?.name}
                    {" - "}
                    Período: {formatDate(startDate)} até {formatDate(endDate)}
                  </DialogDescription>
                </div>
                <Button
                  onClick={handleExportBulletin}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex flex-col gap-4">
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
                          <SelectItem value={ALL_VALUES.POSITION}>Todas funções</SelectItem>
                          {mockPositions.map((position) => (
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
                          <SelectItem value={ALL_VALUES.DEPARTMENT}>Todos setores</SelectItem>
                          {mockDepartments.map((department) => (
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
                          <SelectItem value={ALL_VALUES.DATE}>Todos os dias</SelectItem>
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
                            <td colSpan={16} className="p-8 text-center text-muted-foreground">
                              Nenhum registro encontrado com os filtros selecionados
                            </td>
                          </tr>
                        ) : (
                          <>
                            {filteredBulletinData.map((item, index) => (
                              <tr key={item.id} className="border-b hover:bg-muted/50">
                                <td className="p-3 align-middle font-medium whitespace-nowrap sticky left-0 bg-background">
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
                                <td className="p-3 align-middle whitespace-nowrap sticky right-0 bg-background">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditRow(index)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                            
                            {/* Linha de totais */}
                            <tr className="border-t bg-muted/50 font-semibold">
                              <td colSpan={8} className="p-3 align-middle text-right">
                                Totais:
                              </td>
                              <td className="p-3 align-middle whitespace-nowrap">
                                {formatHours(totals.totalHours)}
                              </td>
                              <td className="p-3 align-middle whitespace-nowrap">
                                {formatHours(totals.totalNormalHours)}
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
                        <p className="text-sm text-muted-foreground">Total de Horas</p>
                        <p className="text-2xl font-bold">{formatHours(totals.totalHours)}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Horas Extras 50%</p>
                        <p className="text-2xl font-bold">{formatHours(totals.totalExtra50Day + totals.totalExtra50Night)}</p>
                      </div>
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Horas Extras 100%</p>
                        <p className="text-2xl font-bold">{formatHours(totals.totalExtra100Day + totals.totalExtra100Night)}</p>
                      </div>
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Total</p>
                        <p className="text-2xl font-bold">{formatCurrency(totals.totalValue)}</p>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsBulletinDialogOpen(false)}
              >
                Fechar
              </Button>
              <Button
                onClick={handleExportBulletin}
                disabled={isLoading}
              >
                {isLoading ? "Exportando..." : "Exportar para Excel"}
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
                Edite os valores para {editingRow !== null && filteredBulletinData[editingRow]?.employee_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
              <div>
                <Label htmlFor="edit-employee-position">Função</Label>
                <Input
                  id="edit-employee-position"
                  type="text"
                  value={editFormData.position}
                  onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                  placeholder="Digite a função"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-employee-department">Setor</Label>
                <Input
                  id="edit-employee-department"
                  type="text"
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  placeholder="Digite o setor"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-entry1">Entrada 1</Label>
                <Input
                  id="edit-entry1"
                  type="time"
                  value={editFormData.entry1}
                  onChange={(e) => setEditFormData({...editFormData, entry1: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-exit1">Saída 1</Label>
                <Input
                  id="edit-exit1"
                  type="time"
                  value={editFormData.exit1}
                  onChange={(e) => setEditFormData({...editFormData, exit1: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-entry2">Entrada 2 (opcional)</Label>
                <Input
                  id="edit-entry2"
                  type="time"
                  value={editFormData.entry2}
                  onChange={(e) => setEditFormData({...editFormData, entry2: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-exit2">Saída 2 (opcional)</Label>
                <Input
                  id="edit-exit2"
                  type="time"
                  value={editFormData.exit2}
                  onChange={(e) => setEditFormData({...editFormData, exit2: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-total-hours">Total Horas</Label>
                <Input
                  id="edit-total-hours"
                  type="time"
                  value={editFormData.total_hours}
                  onChange={(e) => setEditFormData({...editFormData, total_hours: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-normal-hours">Hora Normal</Label>
                <Input
                  id="edit-normal-hours"
                  type="time"
                  value={editFormData.normal_hours}
                  onChange={(e) => setEditFormData({...editFormData, normal_hours: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-extra50-day">50% Diurna</Label>
                <Input
                  id="edit-extra50-day"
                  type="time"
                  value={editFormData.extra_50_day}
                  onChange={(e) => setEditFormData({...editFormData, extra_50_day: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-extra50-night">50% Noturna</Label>
                <Input
                  id="edit-extra50-night"
                  type="time"
                  value={editFormData.extra_50_night}
                  onChange={(e) => setEditFormData({...editFormData, extra_50_night: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-extra100-day">100% Diurna</Label>
                <Input
                  id="edit-extra100-day"
                  type="time"
                  value={editFormData.extra_100_day}
                  onChange={(e) => setEditFormData({...editFormData, extra_100_day: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-extra100-night">100% Noturna</Label>
                <Input
                  id="edit-extra100-night"
                  type="time"
                  value={editFormData.extra_100_night}
                  onChange={(e) => setEditFormData({...editFormData, extra_100_night: e.target.value})}
                />
              </div>
              
              <div className="md:col-span-3">
                <Label htmlFor="edit-value">Valor (R$)</Label>
                <Input
                  id="edit-value"
                  type="number"
                  step="0.01"
                  value={editFormData.value}
                  onChange={(e) => setEditFormData({...editFormData, value: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}