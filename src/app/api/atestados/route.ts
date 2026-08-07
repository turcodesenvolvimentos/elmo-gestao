import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// GET - Listar todos os atestados
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("atestados")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ atestados: data || [] });
  } catch (error: unknown) {
    console.error("Erro ao buscar atestados:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar atestados",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Adicionar atestado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, employee_name, start_date, days } = body;

    if (!employee_id || !employee_name || !start_date) {
      return NextResponse.json(
        { error: "Campos obrigatórios: employee_id, employee_name, start_date" },
        { status: 400 }
      );
    }

    const parsedDays = Number(days);
    if (!Number.isInteger(parsedDays) || parsedDays < 1) {
      return NextResponse.json(
        { error: "Quantidade de dias deve ser um número inteiro maior que zero" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("atestados")
      .upsert(
        {
          employee_id: String(employee_id),
          employee_name: String(employee_name),
          start_date,
          days: parsedDays,
        },
        { onConflict: "employee_id,start_date" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao adicionar atestado:", error);
    return NextResponse.json(
      {
        error: "Erro ao adicionar atestado",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
