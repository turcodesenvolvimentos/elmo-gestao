import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkPermission } from "@/lib/auth/permissions";

// GET - Listar escalas aplicadas (com filtros opcionais)
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: 401 }
    );
  }

    if (!checkPermission(session, Permission.ESCALAS)) {
    return NextResponse.json(
      { error: "Sem permissão para gerenciar escalas" },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const employee_id = searchParams.get("employee_id");
    const shift_id = searchParams.get("shift_id");
    const company_id = searchParams.get("company_id");

    let query = supabaseAdmin
      .from("escalas")
      .select(
        `
        *,
        employee:employees(id, name, solides_id),
        shift:shifts(id, name, entry1, exit1, entry2, exit2, company_id)
      `
      )
      .order("start_date", { ascending: false });

    // Aplicar filtros
    if (employee_id) {
      query = query.eq("employee_id", employee_id);
    }

    if (shift_id) {
      query = query.eq("shift_id", shift_id);
    }

    // Se company_id for fornecido, filtrar por shift.company_id
    if (company_id) {
      // Primeiro buscar os shifts da empresa
      const { data: shifts, error: shiftsError } = await supabaseAdmin
        .from("shifts")
        .select("id")
        .eq("company_id", company_id);

      if (shiftsError) {
        throw shiftsError;
      }

      if (!shifts || shifts.length === 0) {
        return NextResponse.json({
          escalas: [],
          total: 0,
        });
      }

      const shiftIds = shifts.map((s) => s.id);
      query = query.in("shift_id", shiftIds);
    }

    const { data: escalas, error: escalasError } = await query;

    if (escalasError) {
      throw escalasError;
    }

    return NextResponse.json({
      escalas: escalas || [],
      total: escalas?.length || 0,
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar escalas:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar escalas",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
