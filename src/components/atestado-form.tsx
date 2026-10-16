"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCreateAtestado, useUpdateAtestado } from "@/hooks/use-atestados";
import {
  AtestadoNoBoletim,
  CARGA_HORARIA_DIA_UTIL,
  distribuirAtestadoBoletim,
  expandAtestadoDates,
  getCargaHorariaDia,
  getTipoDiaAtestado,
} from "@/lib/atestado";
import {
  Atestado,
  TIPOS_AFASTAMENTO,
  TIPO_AFASTAMENTO_PADRAO,
  TipoAfastamento,
} from "@/types/atestados";

interface AtestadoFormProps {
  employeeOptions?: { id: string; name: string }[];
  customHolidaySet: ReadonlySet<string>;
  editing?: Atestado | null;
  lockEmployee?: boolean;
  onSaved?: () => void;
  onCancelEdit?: () => void;
}

function hojeYyyyMmDd(): string {
  return new Date().toISOString().split("T")[0];
}

function formatarData(dateYyyyMmDd: string): string {
  const [y, m, d] = dateYyyyMmDd.split("-");
  return `${d}/${m}/${y}`;
}

function formatarHorasCurtas(horas: number): string {
  return Number.isInteger(horas) ? `${horas}h` : `${horas.toFixed(1)}h`;
}

function descreverCobranca(c: AtestadoNoBoletim): string {
  const partes: string[] = [];
  if (c.normal > 0) partes.push(`${formatarHorasCurtas(c.normal)} normal`);
  if (c.extra50Diurno > 0) {
    partes.push(`${formatarHorasCurtas(c.extra50Diurno)} 50%`);
  }
  if (c.extra100Diurno > 0) {
    partes.push(`${formatarHorasCurtas(c.extra100Diurno)} 100%`);
  }
  return partes.length > 0 ? partes.join(" + ") : "não cobra";
}

function diaDaSemanaCurto(dateYyyyMmDd: string): string {
  return new Date(dateYyyyMmDd + "T12:00:00Z")
    .toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })
    .replace(".", "");
}

export function AtestadoForm({
  employeeOptions = [],
  customHolidaySet,
  editing = null,
  lockEmployee = false,
  onSaved,
  onCancelEdit,
}: AtestadoFormProps) {
  const createMutation = useCreateAtestado();
  const updateMutation = useUpdateAtestado();

  const [employeeId, setEmployeeId] = useState(
    editing ? String(editing.employee_id) : ""
  );
  const [employeeName, setEmployeeName] = useState(
    editing?.employee_name ?? ""
  );
  const [startDate, setStartDate] = useState(
    editing ? editing.start_date.slice(0, 10) : hojeYyyyMmDd()
  );
  const [days, setDays] = useState(editing ? String(editing.days) : "1");
  const [tipo, setTipo] = useState<TipoAfastamento>(
    editing?.tipo ?? TIPO_AFASTAMENTO_PADRAO
  );
  const [considerarFdsFeriado, setConsiderarFdsFeriado] = useState(
    !!editing?.considerar_fds_feriado
  );
  const [naoCobrarCliente, setNaoCobrarCliente] = useState(
    !!editing?.nao_cobrar_cliente
  );
  const [openEmpFilter, setOpenEmpFilter] = useState(false);

  const diasNum = parseInt(days, 10);
  const diasValidos = Number.isInteger(diasNum) && diasNum >= 1;

  const previa = useMemo(() => {
    if (!startDate || !diasValidos) return [];
    return expandAtestadoDates(startDate, diasNum).map((date) => {
      const horas = getCargaHorariaDia(
        date,
        customHolidaySet,
        considerarFdsFeriado
      );
      return {
        date,
        tipoDia: getTipoDiaAtestado(date, customHolidaySet),
        horas,
        boletim: distribuirAtestadoBoletim(date, horas, 0, customHolidaySet, {
          considerarFdsFeriado,
          naoCobrarCliente,
        }),
      };
    });
  }, [
    startDate,
    diasNum,
    diasValidos,
    customHolidaySet,
    considerarFdsFeriado,
    naoCobrarCliente,
  ]);

  const totalHoras = previa.reduce((acc, d) => acc + d.horas, 0);
  const temFdsOuFeriado = previa.some((d) => d.tipoDia !== "util");
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const resetar = () => {
    setEmployeeId("");
    setEmployeeName("");
    setDays("1");
    setTipo(TIPO_AFASTAMENTO_PADRAO);
    setConsiderarFdsFeriado(false);
    setNaoCobrarCliente(false);
  };

  const handleSubmit = async () => {
    if (!employeeId || !startDate) {
      toast.error("Selecione um funcionário e o dia inicial");
      return;
    }
    if (!diasValidos) {
      toast.error("Informe uma quantidade de dias válida");
      return;
    }

    const payload = {
      employee_id: employeeId,
      employee_name: employeeName,
      start_date: startDate,
      days: diasNum,
      tipo,
      considerar_fds_feriado: considerarFdsFeriado,
      nao_cobrar_cliente: naoCobrarCliente,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...payload });
        toast.success("Atestado atualizado com sucesso!");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Atestado adicionado com sucesso!");
        resetar();
      }
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar atestado"
      );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1">
          <Label>Funcionário</Label>
          {lockEmployee ? (
            <div className="flex h-9 w-full sm:w-[240px] items-center rounded-md border bg-muted/40 px-3 text-sm">
              <span className="truncate">{employeeName}</span>
            </div>
          ) : (
            <Popover open={openEmpFilter} onOpenChange={setOpenEmpFilter}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openEmpFilter}
                  className="w-full sm:w-[240px] justify-between font-normal"
                >
                  <span className="truncate">
                    {employeeName || "Selecione um funcionário..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0">
                <Command
                  filter={(value, search) => {
                    const normalize = (s: string) =>
                      s
                        .normalize("NFD")
                        .replace(/[̀-ͯ]/g, "")
                        .toLowerCase();
                    return normalize(value).includes(normalize(search))
                      ? 1
                      : 0;
                  }}
                >
                  <CommandInput placeholder="Pesquisar funcionário..." />
                  <CommandList className="max-h-60 overflow-y-auto">
                    <CommandEmpty>Nenhum funcionário encontrado.</CommandEmpty>
                    <CommandGroup>
                      {employeeOptions.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          value={emp.name}
                          onSelect={() => {
                            setEmployeeId(emp.id);
                            setEmployeeName(emp.name);
                            setOpenEmpFilter(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              employeeId === emp.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {emp.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="atestado-start-date">Dia inicial</Label>
          <Input
            id="atestado-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full sm:w-[160px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="atestado-days">Dias</Label>
          <Input
            id="atestado-days"
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-full sm:w-[90px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label>Tipo</Label>
          <Select
            value={tipo}
            onValueChange={(v) => setTipo(v as TipoAfastamento)}
          >
            <SelectTrigger className="w-full sm:w-[230px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_AFASTAMENTO.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={considerarFdsFeriado}
            onCheckedChange={(v) => setConsiderarFdsFeriado(v === true)}
          />
          Considerar feriados e final de semana
        </label>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={naoCobrarCliente}
            onCheckedChange={(v) => setNaoCobrarCliente(v === true)}
          />
          Não cobrar do cliente
        </label>
      </div>

      {previa.length > 0 && (
        <div className="rounded-md border text-sm">
          <div className="max-h-48 overflow-y-auto">
            {previa.map((d) => {
              const naoConta = d.horas === 0;
              return (
                <div
                  key={d.date}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-1",
                    naoConta && "text-muted-foreground"
                  )}
                >
                  <span>
                    <span className="capitalize">{diaDaSemanaCurto(d.date)}</span>{" "}
                    {formatarData(d.date)}
                    {d.tipoDia === "feriado" && " (feriado)"}
                  </span>
                  <span className="flex items-center gap-3 tabular-nums">
                    {!naoConta && (
                      <span className="text-xs text-muted-foreground">
                        Boletim: {descreverCobranca(d.boletim)}
                      </span>
                    )}
                    <span>{naoConta ? "não conta" : `${d.horas}h`}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-3 py-1.5 font-medium">
            <span>
              Total: {previa.length} dia{previa.length > 1 ? "s" : ""}
            </span>
            <span className="tabular-nums">{totalHoras}h</span>
          </div>
          {naoCobrarCliente && (
            <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              No ponto o atestado aparece normalmente. No boletim o dia fica
              marcado em azul, com 0h e sem valor.
            </p>
          )}
          {temFdsOuFeriado && !considerarFdsFeriado && (
            <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              Sábado, domingo e feriado não geram horas. Marque
              &quot;Considerar feriados e final de semana&quot; para creditar{" "}
              {CARGA_HORARIA_DIA_UTIL}h nesses dias.
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!employeeId || !startDate || !diasValidos || isSaving}
        >
          {editing ? (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar alterações
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </>
          )}
        </Button>
        {editing && onCancelEdit && (
          <Button variant="outline" onClick={onCancelEdit} disabled={isSaving}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
