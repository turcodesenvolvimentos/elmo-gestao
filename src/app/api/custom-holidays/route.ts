import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkAnyPermission } from "@/lib/auth/permissions";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (
    !checkAnyPermission(session, [Permission.COMPANIES, Permission.EMPLOYEES])
  ) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const { data: holidays, error } = await supabaseAdmin
      .from("custom_holidays")
      .select("id, holiday_date, name, created_at, updated_at")
      .order("holiday_date", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ holidays: holidays ?? [] });
  } catch (error: unknown) {
    console.error("Erro ao buscar feriados:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar feriados",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (
    !checkAnyPermission(session, [Permission.COMPANIES, Permission.EMPLOYEES])
  ) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { holiday_date, name } = body;

    if (!holiday_date || typeof holiday_date !== "string") {
      return NextResponse.json(
        { error: "Data do feriado é obrigatória" },
        { status: 400 }
      );
    }

    if (!DATE_REGEX.test(holiday_date)) {
      return NextResponse.json(
        { error: "Data deve estar no formato YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Nome do feriado é obrigatório" },
        { status: 400 }
      );
    }

    const { data: row, error } = await supabaseAdmin
      .from("custom_holidays")
      .insert({
        holiday_date,
        name: name.trim(),
      })
      .select("id, holiday_date, name, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Já existe um feriado cadastrado nesta data" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(row, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar feriado:", error);
    return NextResponse.json(
      {
        error: "Erro ao criar feriado",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
