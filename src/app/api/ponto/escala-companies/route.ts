import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkAnyPermission } from "@/lib/auth/permissions";
import { fetchEscalaCompanyEntries } from "@/lib/punch-company-resolution";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (
    !checkAnyPermission(session, [
      Permission.PONTO,
      Permission.VALE_ALIMENTACAO,
      Permission.BOLETIM,
    ])
  ) {
    return NextResponse.json(
      { error: "Sem permissão para consultar dados de ponto" },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const employeeSolidesIdRaw = searchParams.get("employee_solides_id");

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "start_date e end_date são obrigatórios (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: "end_date deve ser maior ou igual a start_date" },
        { status: 400 }
      );
    }

    let employeeIds: string[] = [];

    if (employeeSolidesIdRaw) {
      const solidesId = parseInt(employeeSolidesIdRaw, 10);
      if (Number.isNaN(solidesId)) {
        return NextResponse.json(
          { error: "employee_solides_id inválido" },
          { status: 400 }
        );
      }
      const { data: emp, error: empErr } = await supabaseAdmin
        .from("employees")
        .select("id")
        .eq("solides_id", solidesId)
        .maybeSingle();

      if (empErr) throw empErr;
      if (!emp?.id) {
        return NextResponse.json({ entries: [] }, { status: 200 });
      }
      employeeIds = [emp.id];
    } else {
      const { data: employees, error: listErr } = await supabaseAdmin
        .from("employees")
        .select("id");

      if (listErr) throw listErr;
      employeeIds = (employees || [])
        .map((e: { id: string }) => e.id)
        .filter(Boolean);
    }

    const entries = await fetchEscalaCompanyEntries(supabaseAdmin, {
      startDate,
      endDate,
      employeeIds,
    });

    return NextResponse.json({ entries }, { status: 200 });
  } catch (error: unknown) {
    console.error("Erro ao buscar empresas por escala:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar empresas por escala",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
