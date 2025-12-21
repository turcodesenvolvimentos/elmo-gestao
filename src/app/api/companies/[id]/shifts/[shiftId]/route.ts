import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// PUT - Atualizar escala
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shiftId: string }> }
) {
  try {
    const { shiftId } = await params;
    const body = await request.json();
    const { name, entry1, exit1, entry2, exit2 } = body;

    if (!shiftId) {
      return NextResponse.json(
        { error: "ID da escala é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a escala existe
    const { data: existingShift, error: fetchError } = await supabaseAdmin
      .from("shifts")
      .select("id")
      .eq("id", shiftId)
      .single();

    if (fetchError || !existingShift) {
      return NextResponse.json(
        { error: "Escala não encontrada" },
        { status: 404 }
      );
    }

    // Preparar dados para atualização
    const updateData: {
      name?: string;
      entry1?: string;
      exit1?: string;
      entry2?: string | null;
      exit2?: string | null;
    } = {};

    // Função para formatar horário
    const formatTime = (time: string): string => {
      if (time.includes(":")) {
        const parts = time.split(":");
        if (parts.length === 2) {
          return `${parts[0]}:${parts[1]}:00`;
        }
        return time;
      }
      return time;
    };

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: "Nome da escala não pode ser vazio" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (entry1 !== undefined) {
      updateData.entry1 = formatTime(entry1);
    }

    if (exit1 !== undefined) {
      updateData.exit1 = formatTime(exit1);
    }

    // Validar entrada 2 e saída 2 juntos
    if (entry2 !== undefined || exit2 !== undefined) {
      const hasEntry2 =
        entry2 !== undefined && entry2 !== null && entry2 !== "";
      const hasExit2 = exit2 !== undefined && exit2 !== null && exit2 !== "";

      if (hasEntry2 && !hasExit2) {
        return NextResponse.json(
          { error: "Saída 2 é obrigatória quando entrada 2 é preenchida" },
          { status: 400 }
        );
      }

      if (!hasEntry2 && hasExit2) {
        return NextResponse.json(
          { error: "Entrada 2 é obrigatória quando saída 2 é preenchida" },
          { status: 400 }
        );
      }

      if (hasEntry2 && hasExit2) {
        updateData.entry2 = formatTime(entry2);
        updateData.exit2 = formatTime(exit2);
      } else {
        updateData.entry2 = null;
        updateData.exit2 = null;
      }
    }

    // Atualizar escala
    const { data: shift, error: updateError } = await supabaseAdmin
      .from("shifts")
      .update(updateData)
      .eq("id", shiftId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(shift);
  } catch (error: unknown) {
    console.error("Erro ao atualizar escala:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar escala",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - Excluir escala
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shiftId: string }> }
) {
  try {
    const { shiftId } = await params;

    if (!shiftId) {
      return NextResponse.json(
        { error: "ID da escala é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a escala existe
    const { data: existingShift, error: fetchError } = await supabaseAdmin
      .from("shifts")
      .select("id")
      .eq("id", shiftId)
      .single();

    if (fetchError || !existingShift) {
      return NextResponse.json(
        { error: "Escala não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se há escalas aplicadas usando este turno
    const { count, error: countError } = await supabaseAdmin
      .from("escalas")
      .select("*", { count: "exact", head: true })
      .eq("shift_id", shiftId);

    if (countError) {
      throw countError;
    }

    if (count && count > 0) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir esta escala pois ela já foi aplicada a funcionários",
        },
        { status: 400 }
      );
    }

    // Excluir escala
    const { error: deleteError } = await supabaseAdmin
      .from("shifts")
      .delete()
      .eq("id", shiftId);

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
