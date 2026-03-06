import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { solidesEmployerClient } from "@/lib/axios/solides.client";
import { handleSolidesError } from "@/lib/axios/error-handler";
import { AxiosError } from "axios";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkPermission } from "@/lib/auth/permissions";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: 401 }
    );
  }

    if (!checkPermission(session, Permission.EMPLOYEES)) {
    return NextResponse.json(
      { error: "Sem permissão para gerenciar funcionários" },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "10");
    const showFired = searchParams.get("showFired")
      ? parseInt(searchParams.get("showFired")!)
      : undefined;
    const includeFired = searchParams.get("includeFired") === "1" || searchParams.get("includeFired") === "true";

    type EmployeeRow = { id: number; name?: string; [key: string]: unknown };
    let allEmployees: EmployeeRow[] = [];
    let solidesResponse: { data: { totalElements?: number; totalPages?: number; last?: boolean } } | null = null;

    if (includeFired) {
      // Buscar ativos e inativos (mesma lógica do sync): todas as páginas de cada e mesclar
      const seenIds = new Set<number>();
      const fetchAllPages = async (fired: number) => {
        const list: EmployeeRow[] = [];
        let p = 1;
        let hasMore = true;
        while (hasMore) {
          const res = await solidesEmployerClient.get("/employee/find-all", {
            params: { page: p, size: 100, showFired: fired },
          });
          const content = (res.data.content || []) as EmployeeRow[];
          if (content.length === 0) break;
          for (const emp of content) {
            if (!seenIds.has(emp.id)) {
              seenIds.add(emp.id);
              list.push(emp);
            }
          }
          p++;
          hasMore = !res.data.last && p <= (res.data.totalPages ?? Infinity);
        }
        return list;
      };
      const [ativos, inativos] = await Promise.all([
        fetchAllPages(0),
        fetchAllPages(1),
      ]);
      allEmployees = [...ativos, ...inativos].sort(
        (a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase(), "pt-BR")
      );
    } else {
      const response = await solidesEmployerClient.get("/employee/find-all", {
        params: { page, size, showFired },
      });
      solidesResponse = response;
      allEmployees = (response.data.content || []) as EmployeeRow[];
    }

    const totalElements = includeFired ? allEmployees.length : (solidesResponse?.data?.totalElements ?? 0);
    const totalPages = includeFired ? Math.ceil(totalElements / size) : (solidesResponse?.data?.totalPages ?? 1);
    const start = includeFired ? (page - 1) * size : 0;
    const slice = includeFired ? allEmployees.slice(start, start + size) : allEmployees;

    // Buscar empresas associadas para cada funcionário da página
    const employeesWithCompanies = await Promise.all(
      slice.map(async (employee: EmployeeRow) => {
        const { data: localEmployee } = await supabaseAdmin
          .from("employees")
          .select("id")
          .eq("solides_id", employee.id)
          .single();

        if (!localEmployee) {
          return { ...employee, companies: [] };
        }

        const { data: employeeCompanies } = await supabaseAdmin
          .from("employee_companies")
          .select(
            `
            company_id,
            position_id,
            companies (
              id,
              name,
              address
            ),
            positions (
              id,
              name,
              hour_value
            )
          `
          )
          .eq("employee_id", localEmployee.id);

        type CompanyRow = { id?: string; name?: string; [key: string]: unknown };
        const companies =
          employeeCompanies
            ?.map((ec) => {
              const row = ec as unknown as {
                companies?: CompanyRow;
                position_id?: string;
                positions?: unknown;
              };
              return {
                ...row.companies,
                position_id: row.position_id,
                position: row.positions || null,
              };
            })
            .filter((c: CompanyRow | null): c is CompanyRow => c !== null && !!c.id)
            .sort((a, b) =>
              (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase(), "pt-BR")
            ) || [];

        return { ...employee, companies };
      })
    );

    if (!includeFired) {
      employeesWithCompanies.sort((a, b) =>
        (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase(), "pt-BR")
      );
    }

    return NextResponse.json({
      content: employeesWithCompanies,
      totalElements: totalElements,
      totalPages: totalPages,
      size,
      number: page,
      first: page === 1,
      last: includeFired ? page >= totalPages : (solidesResponse?.data?.last ?? true),
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
