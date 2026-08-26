import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkAnyPermission } from "@/lib/auth/permissions";
import {
  dataValida,
  diasComBatidaManual,
  horaValida,
  montarPeriodo,
} from "@/lib/punches";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function toDateKey(value: string | null): string | undefined {
  if (!value) return undefined;
  if (DATE_REGEX.test(value)) return value;

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) {
    const ms = asNumber > 1e12 ? asNumber : asNumber * 1000;
    const date = new Date(ms);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? undefined
    : parsed.toISOString().slice(0, 10);
}

function formatarDia(date: Date): string {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function intervaloOuMesCorrente(
  startDate: string | undefined,
  endDate: string | undefined
): { inicio: string; fim: string } {
  if (startDate && endDate) return { inicio: startDate, fim: endDate };

  const hoje = new Date();
  const primeiroDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  return {
    inicio: startDate ?? formatarDia(primeiroDoMes),
    fim: endDate ?? formatarDia(hoje),
  };
}

interface PunchRow {
  id: string;
  solides_id: number | null;
  employee_id: number;
  employee_name: string | null;
  employer_name: string | null;
  date: string;
  date_in: string | null;
  date_out: string | null;
  location_in_address: string | null;
  location_out_address: string | null;
  status: string;
  adjust: boolean | null;
  adjustment_reason_description: string | null;
  origem: string | null;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // As batidas alimentam tanto a tela de Ponto quanto a de Vale-alimentação.
  if (
    !checkAnyPermission(session, [
      Permission.PONTO,
      Permission.VALE_ALIMENTACAO,
    ])
  ) {
    return NextResponse.json(
      { error: "Sem permissão para visualizar as batidas" },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10) || 0);
    const size = Math.min(
      5000,
      Math.max(1, parseInt(searchParams.get("size") || "1000", 10) || 1000)
    );
    const startDate = toDateKey(searchParams.get("startDate"));
    const endDate = toDateKey(searchParams.get("endDate"));
    const employeeId = searchParams.get("employeeId")
      ? parseInt(searchParams.get("employeeId")!, 10)
      : undefined;
    const status = searchParams.get("status") || undefined;

    // Sem período escolhido, assume o mês corrente (dia 1 até hoje). A API do
    // Solides devolvia zero registros nesse caso e a tela ficava só com as
    // faltas do mês; ler do banco sem limite traria todos os dias desde a
    // admissão da pessoa. Nenhum dos dois é o que se espera ver.
    const periodo = intervaloOuMesCorrente(startDate, endDate);

    let query = supabaseAdmin
      .from("punches")
      .select(
        `id, solides_id, employee_id, employee_name, employer_name, date,
         date_in, date_out, location_in_address, location_out_address,
         status, adjust, adjustment_reason_description, origem`,
        { count: "exact" }
      );

    query = query.gte("date", periodo.inicio).lte("date", periodo.fim);
    if (employeeId !== undefined && !Number.isNaN(employeeId)) {
      query = query.eq("employee_id", employeeId);
    }
    if (status) query = query.eq("status", status);

    const from = page * size;
    const { data, error, count } = await query
      .order("date", { ascending: false })
      .order("date_in", { ascending: false, nullsFirst: false })
      .order("solides_id", { ascending: false, nullsFirst: false })
      .range(from, from + size - 1);

    if (error) throw error;

    const rowsBrutas = (data || []) as PunchRow[];
    const totalElements = count ?? rowsBrutas.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));

    // Os dias com lançamento manual são consultados sobre o período inteiro,
    // não sobre a página: uma batida manual na página 2 precisa esconder a da
    // Sólides que caiu na página 1.
    let consultaManuais = supabaseAdmin
      .from("punches")
      .select("employee_id, date")
      .eq("origem", "MANUAL")
      .gte("date", periodo.inicio)
      .lte("date", periodo.fim);

    if (employeeId !== undefined && !Number.isNaN(employeeId)) {
      consultaManuais = consultaManuais.eq("employee_id", employeeId);
    }

    const { data: manuais, error: manuaisError } = await consultaManuais;
    if (manuaisError) throw manuaisError;

    const diasManuais = diasComBatidaManual(
      (manuais || []).map((m) => ({ ...m, origem: "MANUAL" }))
    );

    const rows = rowsBrutas.filter(
      (row) =>
        row.origem === "MANUAL" ||
        !diasManuais.has(`${row.employee_id ?? ""}|${(row.date ?? "").slice(0, 10)}`)
    );

    const content = rows.map((row) => ({
      id: row.solides_id,
      uuid: row.id,
      date: row.date,
      dateIn: row.date_in,
      dateOut: row.date_out,
      locationIn: row.location_in_address
        ? { address: row.location_in_address }
        : null,
      locationOut: row.location_out_address
        ? { address: row.location_out_address }
        : null,
      employee: { id: row.employee_id, name: row.employee_name },
      employer: row.employer_name ? { name: row.employer_name } : null,
      status: row.status,
      adjust: row.adjust ?? false,
      adjustmentReason: row.adjustment_reason_description
        ? { description: row.adjustment_reason_description }
        : undefined,
      origem: row.origem ?? "SOLIDES",
    }));

    return NextResponse.json({
      content,
      totalElements,
      totalPages,
      size,
      number: page,
      first: page === 0,
      last: from + rowsBrutas.length >= totalElements,
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar pontos:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar pontos",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

interface CorpoBatida {
  employeeId?: unknown;
  date?: unknown;
  entrada?: unknown;
  saida?: unknown;
}

async function validarCorpo(body: CorpoBatida) {
  const employeeId =
    typeof body.employeeId === "number"
      ? body.employeeId
      : parseInt(String(body.employeeId ?? ""), 10);

  if (Number.isNaN(employeeId)) {
    return { erro: "Funcionário é obrigatório" };
  }

  if (!dataValida(body.date)) {
    return { erro: "Data deve estar no formato YYYY-MM-DD" };
  }

  if (!horaValida(body.entrada)) {
    return { erro: "Entrada deve estar no formato HH:MM" };
  }

  const saida =
    body.saida === null || body.saida === undefined || body.saida === ""
      ? null
      : body.saida;

  if (saida !== null && !horaValida(saida)) {
    return { erro: "Saída deve estar no formato HH:MM" };
  }

  const { data: funcionario } = await supabaseAdmin
    .from("employees")
    .select("id, name")
    .eq("solides_id", employeeId)
    .maybeSingle();

  if (!funcionario) {
    return { erro: "Funcionário não encontrado" };
  }

  const periodo = montarPeriodo(body.date, body.entrada, saida);

  return {
    linha: {
      solides_id: null,
      date: body.date,
      date_in: periodo.dateIn,
      date_out: periodo.dateOut,
      employee_id: employeeId,
      employee_uuid: funcionario.id,
      employee_name: funcionario.name,
      status: "APPROVED",
      adjust: false,
      origem: "MANUAL",
    },
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!checkAnyPermission(session, [Permission.PONTO])) {
    return NextResponse.json(
      { error: "Sem permissão para lançar batidas" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as CorpoBatida;
    const validado = await validarCorpo(body);

    if ("erro" in validado) {
      return NextResponse.json({ error: validado.erro }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("punches")
      .insert(validado.linha)
      .select("id, date, date_in, date_out, employee_id, employee_name, origem")
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao lançar batida:", error);
    return NextResponse.json(
      {
        error: "Erro ao lançar batida",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
