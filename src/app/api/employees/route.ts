import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkAnyPermission } from "@/lib/auth/permissions";
import {
  FILTRO_ATIVOS,
  FILTRO_DEMITIDOS,
  cpfValido,
  dataValida,
  estaDemitido,
  normalizarCpf,
  type OrigemFuncionario,
} from "@/lib/employees";

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
  origem: OrigemFuncionario;
  ativo_override: boolean | null;
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
      phone, pis, gender, admission_date, resignation_date, fired, status,
      origem, ativo_override`;

    const montaQuery = () => {
      let query = supabaseAdmin
        .from("employees")
        .select(colunas, { count: "exact" })
        .order("name", { ascending: true })
        .order("solides_id", { ascending: true });

      if (!includeFired) {
        query = query.or(showFired === 1 ? FILTRO_DEMITIDOS : FILTRO_ATIVOS);
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
      cpf: row.cpf ?? undefined,
      email: row.email,
      phone: row.phone,
      pis: row.pis,
      gender: row.gender,
      admissionDate: row.admission_date ?? undefined,
      resignationDate: row.resignation_date,
      fired: estaDemitido(row),
      status: row.status,
      origem: row.origem,
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

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!checkAnyPermission(session, [Permission.EMPLOYEES])) {
    return NextResponse.json(
      { error: "Sem permissão para cadastrar funcionários" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const nome = typeof body.name === "string" ? body.name.trim() : "";
    const cpf = normalizarCpf(body.cpf);
    const admissao = body.admission_date;

    if (nome.length < 3) {
      return NextResponse.json(
        { error: "Informe o nome completo do funcionário" },
        { status: 400 }
      );
    }

    if (!cpf) {
      return NextResponse.json({ error: "CPF é obrigatório" }, { status: 400 });
    }

    if (!cpfValido(cpf)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    if (admissao !== undefined && admissao !== null && admissao !== "") {
      if (!dataValida(admissao)) {
        return NextResponse.json(
          { error: "Data de admissão deve estar no formato YYYY-MM-DD" },
          { status: 400 }
        );
      }
    }

    const { data: jaExiste } = await supabaseAdmin
      .from("employees")
      .select("solides_id, name")
      .eq("cpf", cpf)
      .maybeSingle();

    if (jaExiste) {
      return NextResponse.json(
        { error: `Já existe funcionário com este CPF: ${jaExiste.name}` },
        { status: 409 }
      );
    }

    const { data: matricula, error: matriculaError } = await supabaseAdmin.rpc(
      "proxima_matricula_manual"
    );

    if (matriculaError || typeof matricula !== "number") {
      throw matriculaError ?? new Error("Não foi possível gerar a matrícula");
    }

    const { data, error } = await supabaseAdmin
      .from("employees")
      .insert({
        solides_id: matricula,
        name: nome,
        cpf,
        admission_date: dataValida(admissao) ? admissao : null,
        fired: false,
        ativo_override: true,
        origem: "MANUAL",
      })
      .select("id, solides_id, name, cpf, admission_date, origem")
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        id: data.solides_id,
        uuid: data.id,
        name: data.name,
        cpf: data.cpf,
        admissionDate: data.admission_date,
        origem: data.origem,
        fired: false,
        companies: [],
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Erro ao cadastrar funcionário:", error);
    return NextResponse.json(
      {
        error: "Erro ao cadastrar funcionário",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
