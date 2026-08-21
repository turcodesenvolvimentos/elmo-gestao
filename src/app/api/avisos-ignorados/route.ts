import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// GET - Listar todos os avisos ignorados
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("avisos_ignorados")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ avisos: data || [] });
  } catch (error: unknown) {
    console.error("Erro ao buscar avisos ignorados:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar avisos ignorados",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Ignorar os avisos de um dia
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, employee_name, date } = body;

    if (!employee_id || !employee_name || !date) {
      return NextResponse.json(
        { error: "Campos obrigatórios: employee_id, employee_name, date" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("avisos_ignorados")
      .upsert(
        {
          employee_id: String(employee_id),
          employee_name: String(employee_name),
          date,
        },
        { onConflict: "employee_id,date" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao ignorar aviso:", error);
    return NextResponse.json(
      {
        error: "Erro ao ignorar aviso",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
