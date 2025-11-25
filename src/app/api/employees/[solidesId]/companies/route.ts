import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

/**
 * POST /api/employees/[solidesId]/companies
 * Adiciona uma empresa a um funcionário
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ solidesId: string }> }
) {
  try {
    const { solidesId } = await params;
    const body = await request.json();
    const { companyId } = body;

    if (!solidesId) {
      return NextResponse.json(
        { error: "ID do funcionário é obrigatório" },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "ID da empresa é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar o UUID do funcionário no banco local usando o solides_id
    const { data: localEmployee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("solides_id", parseInt(solidesId))
      .single();

    if (employeeError || !localEmployee) {
      return NextResponse.json(
        { error: "Funcionário não encontrado no banco local" },
        { status: 404 }
      );
    }

    // Verificar se a empresa existe
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se o vínculo já existe
    const { data: existingLink } = await supabaseAdmin
      .from("employee_companies")
      .select("id")
      .eq("employee_id", localEmployee.id)
      .eq("company_id", companyId)
      .single();

    if (existingLink) {
      return NextResponse.json(
        { error: "Funcionário já está vinculado a esta empresa" },
        { status: 409 }
      );
    }

    // Criar vínculo
    const { data: newLink, error: insertError } = await supabaseAdmin
      .from("employee_companies")
      .insert({
        employee_id: localEmployee.id,
        company_id: companyId,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, data: newLink }, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao adicionar empresa ao funcionário:", error);
    return NextResponse.json(
      {
        error: "Erro ao adicionar empresa ao funcionário",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/employees/[solidesId]/companies?companyId=xxx
 * Remove uma empresa de um funcionário
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ solidesId: string }> }
) {
  try {
    const { solidesId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");

    if (!solidesId) {
      return NextResponse.json(
        { error: "ID do funcionário é obrigatório" },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { error: "ID da empresa é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar o UUID do funcionário no banco local usando o solides_id
    const { data: localEmployee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("solides_id", parseInt(solidesId))
      .single();

    if (employeeError || !localEmployee) {
      return NextResponse.json(
        { error: "Funcionário não encontrado no banco local" },
        { status: 404 }
      );
    }

    // Remover vínculo
    const { error: deleteError } = await supabaseAdmin
      .from("employee_companies")
      .delete()
      .eq("employee_id", localEmployee.id)
      .eq("company_id", companyId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao remover empresa do funcionário:", error);
    return NextResponse.json(
      {
        error: "Erro ao remover empresa do funcionário",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
