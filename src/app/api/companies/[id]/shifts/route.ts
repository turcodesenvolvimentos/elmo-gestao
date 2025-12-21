import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// GET - Listar escalas de uma empresa
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

    // Buscar escalas da empresa
    const { data: shifts, error: shiftsError } = await supabaseAdmin
      .from("shifts")
      .select("*")
      .eq("company_id", id)
      .order("name", { ascending: true });

    if (shiftsError) {
      throw shiftsError;
    }

    return NextResponse.json({
      shifts: shifts || [],
      total: shifts?.length || 0,
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar escalas:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar escalas",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Criar escala para uma empresa
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, entry1, exit1, entry2, exit2 } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID da empresa é obrigatório" },
        { status: 400 }
      );
    }

    // Validação
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nome da escala é obrigatório" },
        { status: 400 }
      );
    }

    if (!entry1) {
      return NextResponse.json(
        { error: "Horário de entrada 1 é obrigatório" },
        { status: 400 }
      );
    }

    if (!exit1) {
      return NextResponse.json(
        { error: "Horário de saída 1 é obrigatório" },
        { status: 400 }
      );
    }

    // Validar formato de horário (aceita "HH:MM" ou "HH:MM:SS")
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

    // Validar se entrada 2 e saída 2 são ambos fornecidos ou ambos vazios
    if ((entry2 && !exit2) || (!entry2 && exit2)) {
      return NextResponse.json(
        {
          error:
            "Entrada 2 e saída 2 devem ser ambos preenchidos ou ambos vazios",
        },
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

    // Criar escala
    const insertData: {
      name: string;
      company_id: string;
      entry1: string;
      exit1: string;
      entry2?: string | null;
      exit2?: string | null;
    } = {
      name: name.trim(),
      company_id: id,
      entry1: formatTime(entry1),
      exit1: formatTime(exit1),
    };

    if (entry2 && exit2) {
      insertData.entry2 = formatTime(entry2);
      insertData.exit2 = formatTime(exit2);
    } else {
      insertData.entry2 = null;
      insertData.exit2 = null;
    }

    const { data: shift, error: createError } = await supabaseAdmin
      .from("shifts")
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return NextResponse.json(shift, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar escala:", error);
    return NextResponse.json(
      {
        error: "Erro ao criar escala",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
