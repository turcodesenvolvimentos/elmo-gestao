import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkAnyPermission } from "@/lib/auth/permissions";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (
    !checkAnyPermission(session, [
      Permission.COMPANIES,
      Permission.EMPLOYEES,
      Permission.FERIADOS,
    ])
  ) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const body = await request.json();
    const { holiday_date, name } = body;

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("custom_holidays")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Feriado não encontrado" }, { status: 404 });
    }

    const updateData: { holiday_date?: string; name?: string } = {};

    if (holiday_date !== undefined) {
      if (typeof holiday_date !== "string" || !DATE_REGEX.test(holiday_date)) {
        return NextResponse.json(
          { error: "Data deve estar no formato YYYY-MM-DD" },
          { status: 400 }
        );
      }
      updateData.holiday_date = holiday_date;
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { error: "Nome do feriado não pode ser vazio" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 }
      );
    }

    const { data: row, error: updateError } = await supabaseAdmin
      .from("custom_holidays")
      .update(updateData)
      .eq("id", id)
      .select("id, holiday_date, name, created_at, updated_at")
      .single();

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "Já existe um feriado cadastrado nesta data" },
          { status: 409 }
        );
      }
      throw updateError;
    }

    return NextResponse.json(row);
  } catch (error: unknown) {
    console.error("Erro ao atualizar feriado:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar feriado",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (
    !checkAnyPermission(session, [
      Permission.COMPANIES,
      Permission.EMPLOYEES,
      Permission.FERIADOS,
    ])
  ) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("custom_holidays")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Feriado não encontrado" }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("custom_holidays")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao excluir feriado:", error);
    return NextResponse.json(
      {
        error: "Erro ao excluir feriado",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
