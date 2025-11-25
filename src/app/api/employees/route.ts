import { NextRequest, NextResponse } from "next/server";
import { solidesEmployerClient } from "@/lib/axios/solides.client";
import { handleSolidesError } from "@/lib/axios/error-handler";
import { AxiosError } from "axios";
import { supabaseAdmin } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "10");
    const showFired = searchParams.get("showFired")
      ? parseInt(searchParams.get("showFired")!)
      : undefined;

    const response = await solidesEmployerClient.get("/employee/find-all", {
      params: { page, size, showFired },
    });

    // Buscar empresas associadas para cada funcionário
    const employeesWithCompanies = await Promise.all(
      (response.data.content || []).map(async (employee: any) => {
        // Buscar o UUID do funcionário no banco local usando o solides_id
        const { data: localEmployee } = await supabaseAdmin
          .from("employees")
          .select("id")
          .eq("solides_id", employee.id)
          .single();

        if (!localEmployee) {
          return {
            ...employee,
            companies: [],
          };
        }

        // Buscar as empresas associadas através da tabela employee_companies
        const { data: employeeCompanies } = await supabaseAdmin
          .from("employee_companies")
          .select(
            `
            company_id,
            companies (
              id,
              name,
              address
            )
          `
          )
          .eq("employee_id", localEmployee.id);

        // Extrair as empresas do resultado e ordenar por nome
        const companies =
          employeeCompanies
            ?.map((ec: any) => ec.companies)
            .filter((company: any) => company !== null)
            .sort((a: any, b: any) => {
              const nameA = (a.name || "").toLowerCase();
              const nameB = (b.name || "").toLowerCase();
              return nameA.localeCompare(nameB, "pt-BR");
            }) || [];

        return {
          ...employee,
          companies: companies,
        };
      })
    );

    // Ordenar funcionários por nome (alfabeticamente)
    employeesWithCompanies.sort((a: any, b: any) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return nameA.localeCompare(nameB, "pt-BR");
    });

    return NextResponse.json({
      ...response.data,
      content: employeesWithCompanies,
    });
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      const solidesError = handleSolidesError(error);
      return NextResponse.json(
        { error: solidesError.message },
        { status: solidesError.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao buscar funcionários" },
      { status: 500 }
    );
  }
}
