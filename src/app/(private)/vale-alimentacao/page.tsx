"use client";

import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Search, X } from "lucide-react";

export default function ValeAlimentacaoPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const employees = [
    { id: 1, name: "João Silva", department: "TI", value: "R$ 150,00", status: "APPROVED" },
    { id: 2, name: "Maria Santos", department: "RH", value: "R$ 180,00", status: "PENDING" },
    { id: 3, name: "Pedro Costa", department: "Vendas", value: "R$ 200,00", status: "APPROVED" },
    { id: 4, name: "Ana Oliveira", department: "Marketing", value: "R$ 170,00", status: "REPROVED" },
  ];

  const workDaysData = {
    1: [
      {
        date: "15/03/2024",
        company: "Empresa A",
        entry1: "08:00",
        exit1: "12:00",
        entry2: "13:00",
        exit2: "17:00",
        totalHours: "8h",
        valeAlimentacao: true,
        ajudaCusto: false
      },
      {
        date: "16/03/2024",
        company: "Empresa B",
        entry1: "07:30",
        exit1: "11:30",
        entry2: "12:30",
        exit2: "16:30",
        totalHours: "8h",
        valeAlimentacao: true,
        ajudaCusto: true
      },
      {
        date: "17/03/2024",
        company: "Empresa A",
        entry1: "09:00",
        exit1: "13:00",
        entry2: "14:00",
        exit2: "18:00",
        totalHours: "8h",
        valeAlimentacao: false,
        ajudaCusto: true
      },
    ],
    2: [
      {
        date: "15/03/2024",
        company: "Empresa C",
        entry1: "08:30",
        exit1: "12:30",
        entry2: "13:30",
        exit2: "17:30",
        totalHours: "8h",
        valeAlimentacao: true,
        ajudaCusto: false
      },
      {
        date: "16/03/2024",
        company: "Empresa A",
        entry1: "07:00",
        exit1: "11:00",
        entry2: "12:00",
        exit2: "16:00",
        totalHours: "8h",
        valeAlimentacao: true,
        ajudaCusto: true
      },
    ],
    3: [
      {
        date: "15/03/2024",
        company: "Empresa B",
        entry1: "08:00",
        exit1: "12:00",
        entry2: "13:00",
        exit2: "17:00",
        totalHours: "8h",
        valeAlimentacao: true,
        ajudaCusto: false
      },
    ],
    4: [
      {
        date: "15/03/2024",
        company: "Empresa A",
        entry1: "08:00",
        exit1: "12:00",
        entry2: "13:00",
        exit2: "17:00",
        totalHours: "8h",
        valeAlimentacao: false,
        ajudaCusto: false
      },
    ],
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDetails = (employee: any) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const toggleValeAlimentacao = (employeeId: number, date: string) => {
    console.log(`Alternar vale alimentação para ${employeeId} na data ${date}`);
  };

  const toggleAjudaCusto = (employeeId: number, date: string) => {
    console.log(`Alternar ajuda de custo para ${employeeId} na data ${date}`);
  };

  const workDays = selectedEmployee ? workDaysData[selectedEmployee.id as keyof typeof workDaysData] || [] : [];

  return (
    <SidebarProvider>
      <AppSidebar collapsible="icon" />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-xl font-semibold">Vale Alimentação</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      type="date"
                      placeholder="Data inicial"
                      className="w-full sm:w-auto"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <Input
                      type="date"
                      placeholder="Data final"
                      className="w-full sm:w-auto"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <Button className="whitespace-nowrap">
                    Aplicar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="">
              <div className="rounded-md border">
                <table className="w-full text-sm gap-4">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium">Funcionário</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Vale Alimentação</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Ajuda de Custo</th>
                      <th className="h-12 px-4 text-left align-middle font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr key={employee.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 align-middle font-medium">{employee.name}</td>
                        <td className="p-4 align-middle">{employee.value}</td>
                        <td className="p-4 align-middle">{employee.value}</td>
                        <td className="p-4 align-middle">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetails(employee)}
                          >
                            Ver Detalhes
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="dialog-override flex flex-col p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between text-xl">
                  <span>Detalhes do Funcionário - {selectedEmployee?.name}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Nome</p>
                        <p className="font-medium text-lg">{selectedEmployee?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Total</p>
                        <p className="font-medium text-lg">{selectedEmployee?.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="flex-1 overflow-hidden">
                  <CardContent className="p-0 h-full">
                    <div className="h-full flex flex-col">
                      <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-muted/50">
                            <tr className="border-b">
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap">Data</th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap">Empresa</th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap">Entrada 1</th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap">Saída 1</th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap">Entrada 2</th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap">Saída 2</th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap">Total</th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap">Vale Alimentação</th>
                              <th className="h-12 px-4 text-left align-middle font-medium whitespace-nowrap">Ajuda de Custo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {workDays.map((day, index) => (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="p-4 align-middle font-medium whitespace-nowrap">{day.date}</td>
                                <td className="p-4 align-middle whitespace-nowrap">{day.company}</td>
                                <td className="p-4 align-middle whitespace-nowrap">{day.entry1}</td>
                                <td className="p-4 align-middle whitespace-nowrap">{day.exit1}</td>
                                <td className="p-4 align-middle whitespace-nowrap">{day.entry2}</td>
                                <td className="p-4 align-middle whitespace-nowrap">{day.exit2}</td>
                                <td className="p-4 align-middle font-medium whitespace-nowrap">{day.totalHours}</td>
                                <td className="p-4 align-middle whitespace-nowrap">
                                  <Button
                                    variant={day.valeAlimentacao ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleValeAlimentacao(selectedEmployee.id, day.date)}
                                    className="w-28"
                                  >
                                    {day.valeAlimentacao ? "Ativado" : "Desativado"}
                                  </Button>
                                </td>
                                <td className="p-4 align-middle whitespace-nowrap">
                                  <Button
                                    variant={day.ajudaCusto ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleAjudaCusto(selectedEmployee.id, day.date)}
                                    className="w-28"
                                  >
                                    {day.ajudaCusto ? "Ativado" : "Desativado"}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}