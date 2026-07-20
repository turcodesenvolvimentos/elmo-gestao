import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// DELETE - Remover dispensa
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID da dispensa é obrigatório" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("dispensas")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao remover dispensa:", error);
    return NextResponse.json(
      {
        error: "Erro ao remover dispensa",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
