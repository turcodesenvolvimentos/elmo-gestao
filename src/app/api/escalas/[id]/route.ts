import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// GET - Obter uma escala específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID da escala é obrigatório" },
        { status: 400 }
      );
    }

    const { data: escala, error: escalaError } = await supabaseAdmin
      .from("escalas")
      .select(
        `
        *,
        employee:employees(id, name, solides_id),
        shift:shifts(id, name, entry1, exit1, entry2, exit2, company_id)
      `
      )
      .eq("id", id)
      .single();

    if (escalaError || !escala) {
      return NextResponse.json(
        { error: "Escala não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(escala);
  } catch (error: unknown) {
    console.error("Erro ao buscar escala:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar escala",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - Remover uma escala aplicada
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID da escala é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a escala existe
    const { data: existingEscala, error: fetchError } = await supabaseAdmin
      .from("escalas")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existingEscala) {
      return NextResponse.json(
        { error: "Escala não encontrada" },
        { status: 404 }
      );
    }

    // Excluir escala
    const { error: deleteError } = await supabaseAdmin
      .from("escalas")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao excluir escala:", error);
    return NextResponse.json(
      {
        error: "Erro ao excluir escala",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
