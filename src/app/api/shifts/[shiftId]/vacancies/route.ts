import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

interface VacancyRow {
  position_id: string;
  vacancies: number;
  position: { name: string } | { name: string }[] | null;
}

function positionName(
  position: VacancyRow["position"]
): string | null {
  if (!position) return null;
  if (Array.isArray(position)) return position[0]?.name ?? null;
  return position.name ?? null;
}

// GET - Listar vagas configuradas de uma escala/turno
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params;

    if (!shiftId) {
      return NextResponse.json(
        { error: "ID da escala é obrigatório" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("shift_vacancies")
      .select("position_id, vacancies, position:positions(name)")
      .eq("shift_id", shiftId);

    if (error) {
      throw error;
    }

    const vacancies = ((data as unknown as VacancyRow[] | null) || []).map(
      (v) => ({
        position_id: v.position_id,
        position_name: positionName(v.position),
        vacancies: v.vacancies,
      })
    );

    return NextResponse.json({ vacancies });
  } catch (error: unknown) {
    console.error("Erro ao buscar vagas da escala:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar vagas da escala",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT - Salvar vagas de uma escala/turno (upsert/remoção por função)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params;
    const body = await request.json();
    const items = body?.items;

    if (!shiftId) {
      return NextResponse.json(
        { error: "ID da escala é obrigatório" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "items deve ser uma lista" },
        { status: 400 }
      );
    }

    // Verificar se a escala existe
    const { data: existingShift, error: shiftError } = await supabaseAdmin
      .from("shifts")
      .select("id")
      .eq("id", shiftId)
      .single();

    if (shiftError || !existingShift) {
      return NextResponse.json(
        { error: "Escala não encontrada" },
        { status: 404 }
      );
    }

    const toUpsert: {
      shift_id: string;
      position_id: string;
      vacancies: number;
    }[] = [];
    const toDelete: string[] = [];

    for (const item of items) {
      const positionId = item?.position_id;
      const vacancies = item?.vacancies;

      if (!positionId || typeof positionId !== "string") {
        return NextResponse.json(
          { error: "position_id inválido" },
          { status: 400 }
        );
      }

      if (vacancies === null || vacancies === undefined) {
        toDelete.push(positionId);
        continue;
      }

      if (
        typeof vacancies !== "number" ||
        !Number.isInteger(vacancies) ||
        vacancies < 0
      ) {
        return NextResponse.json(
          { error: "vacancies deve ser um número inteiro positivo" },
          { status: 400 }
        );
      }

      toUpsert.push({
        shift_id: shiftId,
        position_id: positionId,
        vacancies,
      });
    }

    if (toUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from("shift_vacancies")
        .upsert(toUpsert, { onConflict: "shift_id,position_id" });

      if (upsertError) {
        throw upsertError;
      }
    }

    if (toDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("shift_vacancies")
        .delete()
        .eq("shift_id", shiftId)
        .in("position_id", toDelete);

      if (deleteError) {
        throw deleteError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao salvar vagas da escala:", error);
    return NextResponse.json(
      {
        error: "Erro ao salvar vagas da escala",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
