import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// PUT - Atualizar setor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID do setor é obrigatório" },
        { status: 400 }
      );
    }

    const { data: existingDepartment, error: fetchError } = await supabaseAdmin
      .from("departments")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existingDepartment) {
      return NextResponse.json(
        { error: "Setor não encontrado" },
        { status: 404 }
      );
    }

    const updateData: { name?: string } = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: "Nome do setor não pode ser vazio" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    const { data: department, error: updateError } = await supabaseAdmin
      .from("departments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "Já existe um setor com esse nome nesta empresa" },
          { status: 409 }
        );
      }
      throw updateError;
    }

    return NextResponse.json(department);
  } catch (error: unknown) {
    console.error("Erro ao atualizar setor:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar setor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - Excluir setor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID do setor é obrigatório" },
        { status: 400 }
      );
    }

    const { data: existingDepartment, error: fetchError } = await supabaseAdmin
      .from("departments")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existingDepartment) {
      return NextResponse.json(
        { error: "Setor não encontrado" },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("departments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao excluir setor:", error);
    return NextResponse.json(
      {
        error: "Erro ao excluir setor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
