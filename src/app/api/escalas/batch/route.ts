import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// POST - Aplicar escala em lote para vários funcionários
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_ids, shift_id, start_date, end_date } = body;

    // Validação
    if (
      !employee_ids ||
      !Array.isArray(employee_ids) ||
      employee_ids.length === 0
    ) {
      return NextResponse.json(
        { error: "É necessário fornecer pelo menos um funcionário" },
        { status: 400 }
      );
    }

    if (!shift_id) {
      return NextResponse.json(
        { error: "ID da escala é obrigatório" },
        { status: 400 }
      );
    }

    if (!start_date) {
      return NextResponse.json(
        { error: "Data de início é obrigatória" },
        { status: 400 }
      );
    }

    // Validar formato de data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date)) {
      return NextResponse.json(
        { error: "Data de início deve estar no formato YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Verificar se a escala existe
    const { data: shift, error: shiftError } = await supabaseAdmin
      .from("shifts")
      .select("id")
      .eq("id", shift_id)
      .single();

    if (shiftError || !shift) {
      return NextResponse.json(
        { error: "Escala não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se todos os funcionários existem
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from("employees")
      .select("id")
      .in("id", employee_ids);

    if (employeesError) {
      throw employeesError;
    }

    if (!employees || employees.length !== employee_ids.length) {
      return NextResponse.json(
        { error: "Um ou mais funcionários não foram encontrados" },
        { status: 404 }
      );
    }

    // Validar end_date se fornecido
    if (end_date) {
      if (!dateRegex.test(end_date)) {
        return NextResponse.json(
          { error: "Data final deve estar no formato YYYY-MM-DD" },
          { status: 400 }
        );
      }

      // Validar que end_date é após start_date
      if (new Date(end_date) < new Date(start_date)) {
        return NextResponse.json(
          { error: "Data final deve ser posterior à data inicial" },
          { status: 400 }
        );
      }
    }

    // Preparar dados para inserção
    const escalasData = employee_ids.map((employee_id: string) => ({
      employee_id,
      shift_id,
      start_date,
      end_date: end_date || null,
    }));

    // Verificar quais já existem para evitar duplicatas
    const { data: existingEscalas, error: existingError } = await supabaseAdmin
      .from("escalas")
      .select("employee_id")
      .eq("shift_id", shift_id)
      .eq("start_date", start_date)
      .in("employee_id", employee_ids);

    if (existingError) {
      throw existingError;
    }

    const existingEmployeeIds = new Set(
      (existingEscalas || []).map((e) => e.employee_id)
    );

    // Filtrar apenas os que não existem
    const newEscalasData = escalasData.filter(
      (e) => !existingEmployeeIds.has(e.employee_id)
    );

    if (newEscalasData.length === 0) {
      return NextResponse.json(
        {
          error:
            "Todas as escalas já foram aplicadas para estes funcionários na data especificada",
        },
        { status: 409 }
      );
    }

    // Inserir apenas as novas escalas
    const { data: createdEscalas, error: insertError } = await supabaseAdmin
      .from("escalas")
      .insert(newEscalasData)
      .select();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json(
      {
        success: true,
        created: createdEscalas?.length || 0,
        skipped: existingEmployeeIds.size,
        escalas: createdEscalas,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Erro ao aplicar escalas em lote:", error);
    return NextResponse.json(
      {
        error: "Erro ao aplicar escalas em lote",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
