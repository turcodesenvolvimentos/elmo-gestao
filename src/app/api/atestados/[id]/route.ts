import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";
import {
  ATESTADO_DUPLICADO_MSG,
  isUniqueViolation,
  parseAtestadoPayload,
} from "@/lib/atestado-payload";

// PUT - Editar atestado
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID do atestado é obrigatório" },
        { status: 400 }
      );
    }

    const parsed = parseAtestadoPayload(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("atestados")
      .update(parsed.payload)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json(
          { error: ATESTADO_DUPLICADO_MSG },
          { status: 409 }
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: "Atestado não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Erro ao editar atestado:", error);
    return NextResponse.json(
      {
        error: "Erro ao editar atestado",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - Remover atestado
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID do atestado é obrigatório" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("atestados")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao remover atestado:", error);
    return NextResponse.json(
      {
        error: "Erro ao remover atestado",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
