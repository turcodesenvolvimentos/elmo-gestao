import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// GET - Listar funcionários de uma empresa
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

    // Buscar funcionários vinculados à empresa
    const { data: employeeCompanies, error: employeeCompaniesError } =
      await supabaseAdmin
        .from("employee_companies")
        .select(
          `
        employee_id,
        employees (
          id,
          name,
          solides_id
        )
      `
        )
        .eq("company_id", id);

    if (employeeCompaniesError) {
      throw employeeCompaniesError;
    }

    // Mapear os resultados para o formato esperado
    const employees = (employeeCompanies || [])
      .map((ec: any) => ({
        id: ec.employees?.id,
        name: ec.employees?.name,
        solides_id: ec.employees?.solides_id,
      }))
      .filter((emp: any) => emp.id) // Filtrar nulos
      .sort((a: any, b: any) => {
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        return nameA.localeCompare(nameB, "pt-BR");
      });

    return NextResponse.json({
      employees,
      total: employees.length,
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar funcionários da empresa:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar funcionários da empresa",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
