import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableHead, TableHeader } from "@/components/ui/table";
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

const columns = [
  "Funcionário",
  "Empresa",
  "Data",
  "Dia da semana",
  "Entrada",
  "Saída",
  "Horas diurnas",
  "Horas noturnas",
  "Horas fictas",
  "Total de horas",
  "Horas normais",
  "Adicional noturno",
  "50% diurno",
  "50% noturno",
  "100% diurno",
  "100% noturno",
];

const employees = [
  {
    id: 1,
    name: "João da Silva",
  },
  {
    id: 2,
    name: "Maria Oliveira",
  },
];

const companies = [
  {
    id: 1,
    name: "Empresa 1",
  },
  {
    id: 2,
    name: "Empresa 2",
  },
];

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar collapsible='icon' />
    <div className="min-h-screen w-full p-6">
      <SidebarTrigger className="-ml-1" />
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
          Filtrar horários registrados
        </h2>
        <div className="flex flex-row gap-2">
          <Label>Funcionário: </Label>
          <Select>
            <SelectTrigger>
              <SelectValue
                className="w-full max-w-[180px] px-4 py-2 text-sm"
                placeholder="todos"
              />
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id.toString()}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectTrigger>
          </Select>
          <Label>Empresa: </Label>{" "}
          <Select>
            <SelectTrigger>
              <SelectValue
                className="w-full max-w-[260px] px-6 py-3 text-base"
                placeholder="todos"
              />
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectTrigger>
          </Select>
          <Label>Data inicial</Label>
          <Input type="date" className="max-w-[140px] px-2 py-1 text-sm" />
          <Label>Data final</Label>
          <Input type="date" className="max-w-[140px] px-2 py-1 text-sm" />
        </div>
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Resultado
        </h3>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <tr className="bg-gray-50/50">
                  {columns.map((item, index) => (
                    <TableHead
                      key={item}
                      className={`px-4 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap ${
                        index < columns.length - 1
                          ? "border-r border-gray-200"
                          : ""
                      }`}
                    >
                      {item}
                    </TableHead>
                  ))}
                </tr>
              </TableHeader>
            </Table>
          </div>
        </div>
      </div>
    </div>
    </SidebarProvider>
  );
}
