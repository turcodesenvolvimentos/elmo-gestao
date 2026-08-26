import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkAnyPermission } from "@/lib/auth/permissions";
import {
  cpfValido,
  dataValida,
  estaDemitido,
  normalizarCpf,
} from "@/lib/employees";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ solidesId: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!checkAnyPermission(session, [Permission.EMPLOYEES])) {
    return NextResponse.json(
      { error: "Sem permissão para editar funcionários" },
      { status: 403 }
    );
  }

  try {
    const { solidesId } = await params;
    const matricula = parseInt(solidesId, 10);

    if (Number.isNaN(matricula)) {
      return NextResponse.json(
        { error: "Matrícula inválida" },
        { status: 400 }
      );
    }

    const { data: atual, error: buscaError } = await supabaseAdmin
      .from("employees")
      .select("id, solides_id, name, cpf, admission_date, fired, ativo_override, origem")
      .eq("solides_id", matricula)
      .maybeSingle();

    if (buscaError) throw buscaError;
    if (!atual) {
      return NextResponse.json(
        { error: "Funcionário não encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const alteracoes: Record<string, unknown> = {};

    if (body.ativo !== undefined) {
      if (typeof body.ativo !== "boolean") {
        return NextResponse.json(
          { error: "O campo 'ativo' deve ser true ou false" },
          { status: 400 }
        );
      }
      alteracoes.ativo_override = body.ativo;
    }

    const querMudarCadastro =
      body.name !== undefined ||
      body.cpf !== undefined ||
      body.admission_date !== undefined;

    if (querMudarCadastro) {
      // Nome, CPF e admissão de quem veio da Sólides são reescritos pela
      // próxima sincronização, então editar aqui daria a falsa impressão de
      // ter salvado. Só o ativo/inativo tem coluna própria que o sync respeita.
      if (atual.origem !== "MANUAL") {
        return NextResponse.json(
          {
            error:
              "Este funcionário vem da Sólides: altere os dados cadastrais por lá. Aqui só é possível ativar ou inativar.",
          },
          { status: 409 }
        );
      }

      if (body.name !== undefined) {
        const nome = typeof body.name === "string" ? body.name.trim() : "";
        if (nome.length < 3) {
          return NextResponse.json(
            { error: "Informe o nome completo do funcionário" },
            { status: 400 }
          );
        }
        alteracoes.name = nome;
      }

      if (body.cpf !== undefined) {
        const cpf = normalizarCpf(body.cpf);
        if (!cpf || !cpfValido(cpf)) {
          return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
        }

        const { data: outro } = await supabaseAdmin
          .from("employees")
          .select("solides_id, name")
          .eq("cpf", cpf)
          .neq("solides_id", matricula)
          .maybeSingle();

        if (outro) {
          return NextResponse.json(
            { error: `Já existe funcionário com este CPF: ${outro.name}` },
            { status: 409 }
          );
        }

        alteracoes.cpf = cpf;
      }

      if (body.admission_date !== undefined) {
        const admissao = body.admission_date;
        if (admissao === null || admissao === "") {
          alteracoes.admission_date = null;
        } else if (dataValida(admissao)) {
          alteracoes.admission_date = admissao;
        } else {
          return NextResponse.json(
            { error: "Data de admissão deve estar no formato YYYY-MM-DD" },
            { status: 400 }
          );
        }
      }
    }

    if (Object.keys(alteracoes).length === 0) {
      return NextResponse.json(
        { error: "Nada para alterar" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("employees")
      .update(alteracoes)
      .eq("solides_id", matricula)
      .select("id, solides_id, name, cpf, admission_date, fired, ativo_override, origem")
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: data.solides_id,
      uuid: data.id,
      name: data.name,
      cpf: data.cpf,
      admissionDate: data.admission_date,
      origem: data.origem,
      fired: estaDemitido(data),
    });
  } catch (error: unknown) {
    console.error("Erro ao editar funcionário:", error);
    return NextResponse.json(
      {
        error: "Erro ao editar funcionário",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
