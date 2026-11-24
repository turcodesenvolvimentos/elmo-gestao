import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";

// DELETE - Restaurar (deixar de ignorar) os avisos de um dia
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID do aviso ignorado é obrigatório" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("avisos_ignorados")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao restaurar aviso:", error);
    return NextResponse.json(
      {
        error: "Erro ao restaurar aviso",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
