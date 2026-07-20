import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// GET - Listar todas as dispensas
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("dispensas")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ dispensas: data || [] });
  } catch (error: unknown) {
    console.error("Erro ao buscar dispensas:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar dispensas",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Adicionar dispensa
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
      .from("dispensas")
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
    console.error("Erro ao adicionar dispensa:", error);
    return NextResponse.json(
      {
        error: "Erro ao adicionar dispensa",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
