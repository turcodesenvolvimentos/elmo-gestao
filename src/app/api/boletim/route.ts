import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";
import { calcularHorasPorPeriodo, formatarHoras } from "@/lib/ponto-calculator";

const DAYS_OF_WEEK = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

interface Punch {
  date: string;
  date_in: string;
  date_out: string;
}

interface EmployeeWithPunches {
  employee_id: string;
  employee_name: string;
  position_name: string;
  department: string;
  hour_value: number;
  punches: Punch[];
}

// GET - Buscar dados do boletim por empresa e período
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("company_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Validação
    if (!companyId) {
      return NextResponse.json(
        { error: "ID da empresa é obrigatório" },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Data inicial e final são obrigatórias" },
        { status: 400 }
      );
    }

    // Validar formato de data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Datas devem estar no formato YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validar que end_date >= start_date
    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: "Data final deve ser maior ou igual à data inicial" },
        { status: 400 }
      );
    }

    // Buscar funcionários da empresa com seus cargos
    const { data: employeeCompanies, error: employeeError } =
      await supabaseAdmin
        .from("employee_companies")
        .select(
          `
          employee_id,
          department,
          position_id,
          employees!inner (
            id,
            name,
            solides_id
          ),
          positions (
            id,
            name,
            hour_value
          )
        `
        )
        .eq("company_id", companyId);

    if (employeeError) {
      throw employeeError;
    }

    if (!employeeCompanies || employeeCompanies.length === 0) {
      return NextResponse.json(
        { error: "Nenhum funcionário encontrado para esta empresa" },
        { status: 404 }
      );
    }

    // Extrair IDs dos funcionários (solides_id para buscar punches)
    const employeeSolidesIds = employeeCompanies
      .map((ec: any) => ec.employees?.solides_id)
      .filter((id: any) => id !== null && id !== undefined);

    if (employeeSolidesIds.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // Buscar pontos aprovados no período
    const { data: punches, error: punchesError } = await supabaseAdmin
      .from("punches")
      .select("employee_id, employee_name, date, date_in, date_out")
      .in("employee_id", employeeSolidesIds)
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("status", "APPROVED")
      .order("date", { ascending: true })
      .order("date_in", { ascending: true });

    if (punchesError) {
      throw punchesError;
    }

    // Agrupar punches por funcionário
    const punchesByEmployee = new Map<number, Punch[]>();

    if (punches) {
      punches.forEach((punch: any) => {
        if (!punchesByEmployee.has(punch.employee_id)) {
          punchesByEmployee.set(punch.employee_id, []);
        }
        punchesByEmployee.get(punch.employee_id)!.push({
          date: punch.date,
          date_in: punch.date_in,
          date_out: punch.date_out,
        });
      });
    }

    // Processar dados para o boletim
    const boletimData: any[] = [];

    for (const ec of employeeCompanies) {
      const employee = ec.employees as any;
      const position = ec.positions as any;
      const employeeSolidesId = employee?.solides_id;

      if (!employeeSolidesId) continue;

      const employeePunches = punchesByEmployee.get(employeeSolidesId) || [];

      // Agrupar punches por data
      const punchesByDate = new Map<string, Punch[]>();

      employeePunches.forEach((punch) => {
        if (!punchesByDate.has(punch.date)) {
          punchesByDate.set(punch.date, []);
        }
        punchesByDate.get(punch.date)!.push(punch);
      });

      // Processar cada dia
      punchesByDate.forEach((dayPunches, date) => {
        // Ordenar punches do dia por horário de entrada
        const sortedPunches = dayPunches.sort((a, b) =>
          new Date(a.date_in).getTime() - new Date(b.date_in).getTime()
        );

        // Pegar os dois primeiros períodos (entry1/exit1, entry2/exit2)
        const entry1 = sortedPunches[0]
          ? new Date(sortedPunches[0].date_in).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined;

        const exit1 = sortedPunches[0]
          ? new Date(sortedPunches[0].date_out).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined;

        const entry2 = sortedPunches[1]
          ? new Date(sortedPunches[1].date_in).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined;

        const exit2 = sortedPunches[1]
          ? new Date(sortedPunches[1].date_out).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined;

        // Calcular horas usando o ponto-calculator
        const punchesForCalculation = sortedPunches.map((p) => ({
          dateIn: p.date_in,
          dateOut: p.date_out,
        }));

        const horasCalculadas = calcularHorasPorPeriodo(
          punchesForCalculation,
          date
        );

        // Calcular valor monetário
        const hourValue = position?.hour_value || 0;

        const valorNormal = horasCalculadas.horasNormais * hourValue;
        const valorExtra50 =
          (horasCalculadas.extra50Diurno + horasCalculadas.extra50Noturno) *
          hourValue *
          1.5;
        const valorExtra100 =
          (horasCalculadas.extra100Diurno + horasCalculadas.extra100Noturno) *
          hourValue *
          2;

        const valorTotal = valorNormal + valorExtra50 + valorExtra100;

        // Obter dia da semana
        const dateObj = new Date(date + "T12:00:00Z");
        const dayOfWeek = DAYS_OF_WEEK[dateObj.getDay()];

        boletimData.push({
          employee_id: employee.id,
          employee_name: employee.name,
          position: position?.name || "Sem cargo",
          department: ec.department || "Sem setor",
          date,
          day_of_week: dayOfWeek,
          entry1,
          exit1,
          entry2,
          exit2,
          total_hours: formatarHoras(horasCalculadas.totalHoras),
          normal_hours: formatarHoras(horasCalculadas.horasNormais),
          extra_50_day: formatarHoras(horasCalculadas.extra50Diurno),
          extra_50_night: formatarHoras(horasCalculadas.extra50Noturno),
          extra_100_day: formatarHoras(horasCalculadas.extra100Diurno),
          extra_100_night: formatarHoras(horasCalculadas.extra100Noturno),
          value: valorTotal,
        });
      });
    }

    // Ordenar por data e nome do funcionário
    boletimData.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.employee_name.localeCompare(b.employee_name);
    });

    return NextResponse.json({ data: boletimData }, { status: 200 });
  } catch (error: unknown) {
    console.error("Erro ao buscar dados do boletim:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar dados do boletim",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
