import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkAnyPermission } from "@/lib/auth/permissions";

interface EmployeeRow {
  id: string;
  solides_id: number;
  external_id: string | null;
  name: string | null;
  social_name: string | null;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  pis: string | null;
  gender: string | null;
  admission_date: string | null;
  resignation_date: string | null;
  fired: boolean | null;
  status: number | null;
}

interface CompanyRef {
  id?: string;
  name?: string;
  address?: string;
}

interface PositionRef {
  id?: string;
  name?: string;
  hour_value?: number;
}

function comparaNome(a: string | null, b: string | null): number {
  return (a || "").toLowerCase().localeCompare((b || "").toLowerCase(), "pt-BR");
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Leitura da lista de funcionários é liberada para as telas de visualização
  // (Ponto, Vale-alimentação, Escala) além da tela de edição (Funcionários).
  if (
    !checkAnyPermission(session, [
      Permission.EMPLOYEES,
      Permission.PONTO,
      Permission.VALE_ALIMENTACAO,
      Permission.ESCALAS,
    ])
  ) {
    return NextResponse.json(
      { error: "Sem permissão para visualizar funcionários" },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const size = Math.max(1, parseInt(searchParams.get("size") || "10", 10) || 10);
    const showFired = searchParams.get("showFired")
      ? parseInt(searchParams.get("showFired")!, 10)
      : undefined;
    const includeFired =
      searchParams.get("includeFired") === "1" ||
      searchParams.get("includeFired") === "true";

    const colunas = `id, solides_id, external_id, name, social_name, cpf, email,
      phone, pis, gender, admission_date, resignation_date, fired, status`;

    const montaQuery = () => {
      let query = supabaseAdmin
        .from("employees")
        .select(colunas, { count: "exact" })
        .order("name", { ascending: true })
        .order("solides_id", { ascending: true });

      if (!includeFired) {
        query = query.eq("fired", showFired === 1);
      }

      return query;
    };

    let rows: EmployeeRow[] = [];
    let count: number | null = null;

    if (includeFired) {
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await montaQuery().range(from, from + PAGE - 1);
        if (error) throw error;
        const lote = (data || []) as unknown as EmployeeRow[];
        if (lote.length === 0) break;
        rows.push(...lote);
        if (lote.length < PAGE) break;
        from += PAGE;
      }
    } else {
      const from = (page - 1) * size;
      const {
        data,
        error,
        count: total,
      } = await montaQuery().range(from, from + size - 1);
      if (error) throw error;
      rows = (data || []) as unknown as EmployeeRow[];
      count = total;
    }

    rows = rows.sort((a, b) => comparaNome(a.name, b.name));

    const employeeUuids = rows.map((r) => r.id);
    const vinculosPorEmployee = new Map<
      string,
      Array<CompanyRef & { position_id?: string; position: PositionRef | null; department?: string }>
    >();

    if (employeeUuids.length > 0) {
      const { data: vinculos, error: vinculosError } = await supabaseAdmin
        .from("employee_companies")
        .select(
          `
          employee_id,
          company_id,
          position_id,
          department,
          companies ( id, name, address ),
          positions ( id, name, hour_value )
        `
        )
        .in("employee_id", employeeUuids);

      if (vinculosError) throw vinculosError;

      for (const vinculo of vinculos || []) {
        const row = vinculo as unknown as {
          employee_id: string;
          position_id?: string;
          department?: string;
          companies?: CompanyRef | CompanyRef[] | null;
          positions?: PositionRef | PositionRef[] | null;
        };

        const empresa = Array.isArray(row.companies)
          ? row.companies[0]
          : row.companies;
        if (!empresa?.id) continue;

        const cargo = Array.isArray(row.positions)
          ? row.positions[0]
          : row.positions;

        if (!vinculosPorEmployee.has(row.employee_id)) {
          vinculosPorEmployee.set(row.employee_id, []);
        }

        vinculosPorEmployee.get(row.employee_id)!.push({
          ...empresa,
          position_id: row.position_id,
          position: cargo || null,
          department: row.department ?? undefined,
        });
      }

      for (const lista of vinculosPorEmployee.values()) {
        lista.sort((a, b) => comparaNome(a.name ?? null, b.name ?? null));
      }
    }

    const content = rows.map((row) => ({
      id: row.solides_id,
      externalId: row.external_id,
      name: row.name,
      socialName: row.social_name,
      cpf: row.cpf,
      email: row.email,
      phone: row.phone,
      pis: row.pis,
      gender: row.gender,
      admissionDate: row.admission_date,
      resignationDate: row.resignation_date,
      fired: row.fired ?? false,
      status: row.status,
      companies: vinculosPorEmployee.get(row.id) ?? [],
    }));

    const totalElements = includeFired ? content.length : count ?? content.length;
    const totalPages = includeFired
      ? 1
      : Math.max(1, Math.ceil(totalElements / size));

    return NextResponse.json({
      content,
      totalElements,
      totalPages,
      size,
      number: page,
      first: page === 1,
      last: includeFired ? true : page >= totalPages,
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar funcionários:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar funcionários",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
