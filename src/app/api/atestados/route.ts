import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";
import {
  ATESTADO_DUPLICADO_MSG,
  isUniqueViolation,
  parseAtestadoPayload,
} from "@/lib/atestado-payload";

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
    const parsed = parseAtestadoPayload(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("atestados")
      .insert(parsed.payload)
      .select()
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json(
          { error: ATESTADO_DUPLICADO_MSG },
          { status: 409 }
        );
      }
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
