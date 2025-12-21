import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// GET - Listar todas as escalas (com filtro opcional por company_id)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const company_id = searchParams.get("company_id");

    let query = supabaseAdmin
      .from("shifts")
      .select("*")
      .order("name", { ascending: true });

    // Aplicar filtro se fornecido
    if (company_id) {
      query = query.eq("company_id", company_id);
    }

    const { data: shifts, error: shiftsError } = await query;

    if (shiftsError) {
      throw shiftsError;
    }

    return NextResponse.json({
      shifts: shifts || [],
      total: shifts?.length || 0,
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
