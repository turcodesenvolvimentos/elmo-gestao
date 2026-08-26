import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkPermission } from "@/lib/auth/permissions";
import { compararBoletins, gerarBoletim } from "@/lib/boletim-generator";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!checkPermission(session, Permission.BOLETIM)) {
    return NextResponse.json(
      { error: "Sem permissão para gerenciar boletim" },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (
      !startDate ||
      !endDate ||
      !dateRegex.test(startDate) ||
      !dateRegex.test(endDate)
    ) {
      return NextResponse.json(
        { error: "start_date e end_date são obrigatórios (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const { data: companies, error } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .order("name");

    if (error) throw error;

    const resultados = [];

    for (const company of companies || []) {
      const viaSolides = await gerarBoletim(
        company.id,
        startDate,
        endDate,
        "solides"
      );
      const viaBanco = await gerarBoletim(
        company.id,
        startDate,
        endDate,
        "banco"
      );
      const comparacao = compararBoletins(viaSolides, viaBanco);

      resultados.push({
        empresa: company.name,
        identico: comparacao.identico,
        linhasSolides: comparacao.linhasSolides,
        linhasBanco: comparacao.linhasBanco,
        valorSolides: comparacao.valorSolides,
        valorBanco: comparacao.valorBanco,
        totalDiferencas: comparacao.totalDiferencas,
        soNoSolides: comparacao.soNoSolides,
        soNoBanco: comparacao.soNoBanco,
        diferentes: comparacao.diferentes.slice(0, 20),
      });
    }

    const divergentes = resultados.filter((r) => !r.identico);

    return NextResponse.json(
      {
        periodo: { startDate, endDate },
        empresasComparadas: resultados.length,
        empresasDivergentes: divergentes.length,
        veredito:
          divergentes.length === 0
            ? "IDENTICO — o banco produz exatamente o mesmo boletim que a Solides"
            : "DIVERGENTE — ver as empresas abaixo",
        resultados,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Erro ao comparar boletins:", error);
    return NextResponse.json(
      {
        error: "Erro ao comparar boletins",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
