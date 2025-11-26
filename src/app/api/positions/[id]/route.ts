import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// PUT - Atualizar cargo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, hour_value } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID do cargo é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o cargo existe
    const { data: existingPosition, error: fetchError } = await supabaseAdmin
      .from("positions")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existingPosition) {
      return NextResponse.json(
        { error: "Cargo não encontrado" },
        { status: 404 }
      );
    }

    // Preparar dados para atualização
    const updateData: {
      name?: string;
      hour_value?: number;
    } = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: "Nome do cargo não pode ser vazio" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (hour_value !== undefined) {
      if (typeof hour_value !== "number" || hour_value < 0) {
        return NextResponse.json(
          { error: "Valor hora deve ser um número positivo" },
          { status: 400 }
        );
      }
      updateData.hour_value = hour_value;
    }

    // Atualizar cargo
    const { data: position, error: updateError } = await supabaseAdmin
      .from("positions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(position);
  } catch (error: unknown) {
    console.error("Erro ao atualizar cargo:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar cargo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - Excluir cargo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID do cargo é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o cargo existe
    const { data: existingPosition, error: fetchError } = await supabaseAdmin
      .from("positions")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existingPosition) {
      return NextResponse.json(
        { error: "Cargo não encontrado" },
        { status: 404 }
      );
    }

    // Excluir cargo
    const { error: deleteError } = await supabaseAdmin
      .from("positions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao excluir cargo:", error);
    return NextResponse.json(
      {
        error: "Erro ao excluir cargo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
