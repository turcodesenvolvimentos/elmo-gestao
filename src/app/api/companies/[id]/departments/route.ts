import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// GET - Listar setores de uma empresa
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

    const { data: departments, error: departmentsError } = await supabaseAdmin
      .from("departments")
      .select("*")
      .eq("company_id", id)
      .order("name", { ascending: true });

    if (departmentsError) {
      throw departmentsError;
    }

    return NextResponse.json({
      departments: departments || [],
      total: departments?.length || 0,
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar setores:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar setores",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Criar setor para uma empresa
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID da empresa é obrigatório" },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nome do setor é obrigatório" },
        { status: 400 }
      );
    }

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

    const { data: department, error: createError } = await supabaseAdmin
      .from("departments")
      .insert({ name: name.trim(), company_id: id })
      .select()
      .single();

    if (createError) {
      if (createError.code === "23505") {
        return NextResponse.json(
          { error: "Já existe um setor com esse nome nesta empresa" },
          { status: 409 }
        );
      }
      throw createError;
    }

    return NextResponse.json(department, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar setor:", error);
    return NextResponse.json(
      {
        error: "Erro ao criar setor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
