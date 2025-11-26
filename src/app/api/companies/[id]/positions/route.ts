import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// GET - Listar cargos de uma empresa
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID da empresa é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a empresa existe
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    // Buscar cargos da empresa
    const { data: positions, error: positionsError } = await supabaseAdmin
      .from("positions")
      .select("*")
      .eq("company_id", id)
      .order("name", { ascending: true });

    if (positionsError) {
      throw positionsError;
    }

    return NextResponse.json({
      positions: positions || [],
      total: positions?.length || 0,
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar cargos:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar cargos",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Criar cargo para uma empresa
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, hour_value } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID da empresa é obrigatório" },
        { status: 400 }
      );
    }

    // Validação
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nome do cargo é obrigatório" },
        { status: 400 }
      );
    }

    // Valor hora é opcional, mas se fornecido deve ser válido
    if (hour_value !== undefined && hour_value !== null) {
      if (typeof hour_value !== "number" || hour_value < 0) {
        return NextResponse.json(
          { error: "Valor hora deve ser um número positivo" },
          { status: 400 }
        );
      }
    }

    // Verificar se a empresa existe
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    // Criar cargo
    const insertData: {
      name: string;
      hour_value?: number;
      company_id: string;
    } = {
      name: name.trim(),
      company_id: id,
    };

    if (hour_value !== undefined && hour_value !== null) {
      insertData.hour_value = Number(hour_value);
    }

    const { data: position, error: createError } = await supabaseAdmin
      .from("positions")
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return NextResponse.json(position, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar cargo:", error);
    return NextResponse.json(
      {
        error: "Erro ao criar cargo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
