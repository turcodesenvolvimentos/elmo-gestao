import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkAnyPermission } from "@/lib/auth/permissions";

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

interface PunchRow {
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

    let query = supabaseAdmin
      .from("punches")
      .select(
        `solides_id, employee_id, employee_name, employer_name, date,
         date_in, date_out, location_in_address, location_out_address,
         status, adjust, adjustment_reason_description`,
        { count: "exact" }
      );

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);
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

    const rows = (data || []) as PunchRow[];
    const totalElements = count ?? rows.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));

    const content = rows.map((row) => ({
      id: row.solides_id,
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
    }));

    return NextResponse.json({
      content,
      totalElements,
      totalPages,
      size,
      number: page,
      first: page === 0,
      last: from + rows.length >= totalElements,
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
