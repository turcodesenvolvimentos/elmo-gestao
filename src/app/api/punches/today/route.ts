import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkAnyPermission } from "@/lib/auth/permissions";

interface PunchRow {
  employee_id: number | null;
  date: string | null;
  date_in: string | null;
  date_out: string | null;
}

function formatLocalDate(d: Date): string {
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, "0")}-` +
    `${String(d.getDate()).padStart(2, "0")}`
  );
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return formatLocalDate(new Date(y, m - 1, d + days, 12, 0, 0, 0));
}

/**
 * Datas candidatas de uma batida. Alguns campos vem como string ISO em UTC e
 * outros como timestamp; perto da meia-noite as duas leituras divergem, entao
 * consideramos ambas ao decidir se a batida e do dia procurado.
 */
function candidateDates(value: string | null | undefined): string[] {
  if (value === null || value === undefined || value === "") return [];

  const out: string[] = [];
  out.push(value.includes("T") ? value.split("T")[0] : value.substring(0, 10));

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) out.push(formatLocalDate(parsed));

  return out;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (
    !checkAnyPermission(session, [
      Permission.ESCALAS,
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
    const date =
      request.nextUrl.searchParams.get("date") || formatLocalDate(new Date());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Parâmetro 'date' inválido (use YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const employeeIds = new Set<number>();
    const PAGE = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabaseAdmin
        .from("punches")
        .select("employee_id, date, date_in, date_out")
        .gte("date", shiftDate(date, -1))
        .lte("date", shiftDate(date, 1))
        .order("date", { ascending: true })
        .order("date_in", { ascending: true, nullsFirst: true })
        .order("solides_id", { ascending: true, nullsFirst: true })
        .range(from, from + PAGE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const row of data as PunchRow[]) {
        if (typeof row.employee_id !== "number") continue;

        const datas = [
          ...candidateDates(row.date),
          ...candidateDates(row.date_in),
          ...candidateDates(row.date_out),
        ];

        if (datas.includes(date)) employeeIds.add(row.employee_id);
      }

      if (data.length < PAGE) break;
      from += PAGE;
    }

    return NextResponse.json({ date, employeeIds: [...employeeIds] });
  } catch (error: unknown) {
    console.error("Erro ao buscar batidas do dia:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar batidas do dia",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
