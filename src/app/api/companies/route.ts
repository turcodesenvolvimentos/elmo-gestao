import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, address, vr_per_hour, cost_help_per_hour } = body;

    // Validação
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nome da empresa é obrigatório" },
        { status: 400 }
      );
    }

    if (!address || !address.trim()) {
      return NextResponse.json(
        { error: "Endereço é obrigatório" },
        { status: 400 }
      );
    }

    // Validação de valores numéricos (opcionais, com default 0)
    const vrValue = vr_per_hour !== undefined ? Number(vr_per_hour) : 0;
    const costValue = cost_help_per_hour !== undefined ? Number(cost_help_per_hour) : 0;

    if (isNaN(vrValue) || vrValue < 0) {
      return NextResponse.json(
        { error: "Valor do VR por hora deve ser um número positivo" },
        { status: 400 }
      );
    }

    if (isNaN(costValue) || costValue < 0) {
      return NextResponse.json(
        { error: "Ajuda de Custo por hora deve ser um número positivo" },
        { status: 400 }
      );
    }

    // Criar empresa
    const { data: company, error: createError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: name.trim(),
        address: address.trim(),
        vr_per_hour: vrValue,
        cost_help_per_hour: costValue,
      })
      .select()
      .single();

    if (createError) {
      // Verificar se é erro de duplicata (endereço único)
      if (createError.code === "23505") {
        return NextResponse.json(
          { error: "Já existe uma empresa cadastrada com este endereço" },
          { status: 409 }
        );
      }

      throw createError;
    }

    // Retornar empresa criada com contagem de funcionários (0 inicialmente)
    return NextResponse.json(
      {
        ...company,
        employee_count: 0,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Erro ao criar empresa:", error);
    return NextResponse.json(
      {
        error: "Erro ao criar empresa",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Buscar todas as empresas
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from("companies")
      .select(
        `
        id,
        name,
        address,
        vr_per_hour,
        cost_help_per_hour,
        created_at,
        updated_at
      `
      )
      .order("name", { ascending: true });

    if (companiesError) {
      throw companiesError;
    }

    // Buscar contagem de funcionários para cada empresa
    const companiesWithCount = await Promise.all(
      (companies || []).map(async (company) => {
        const { count, error: countError } = await supabaseAdmin
          .from("employee_companies")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.id);

        if (countError) {
          console.error(
            `Erro ao contar funcionários da empresa ${company.id}:`,
            countError
          );
        }

        return {
          ...company,
          employee_count: count || 0,
        };
      })
    );

    // Buscar total de funcionários únicos (na tabela employees)
    const { count: totalEmployees, error: employeesCountError } =
      await supabaseAdmin
        .from("employees")
        .select("*", { count: "exact", head: true });

    if (employeesCountError) {
      console.error(
        "Erro ao contar total de funcionários:",
        employeesCountError
      );
    }

    return NextResponse.json({
      companies: companiesWithCount,
      total: companiesWithCount.length,
      totalEmployees: totalEmployees || 0,
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar empresas:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar empresas",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
