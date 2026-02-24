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
    interface EmpRow {
      id?: string;
      name?: string;
      solides_id?: number;
    }
    const employees = (employeeCompanies || [])
      .map((ec) => {
        const employee = (ec as { employees?: { id?: string; name?: string; solides_id?: number } }).employees;
        return {
          id: employee?.id,
          name: employee?.name,
          solides_id: employee?.solides_id,
        };
      })
      .filter((emp: EmpRow): emp is EmpRow & { id: string } => !!emp.id)
      .sort((a: EmpRow, b: EmpRow) => {
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
