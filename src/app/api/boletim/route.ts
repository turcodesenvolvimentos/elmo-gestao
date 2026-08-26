import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Permission } from "@/types/permissions";
import { checkPermission } from "@/lib/auth/permissions";
import {
  compararBoletins,
  gerarBoletim,
  type FontePunches,
} from "@/lib/boletim-generator";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: 401 }
    );
  }

  if (!checkPermission(session, Permission.BOLETIM)) {
    return NextResponse.json(
      { error: "Sem permissão para gerenciar boletim" },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("company_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!companyId) {
      return NextResponse.json(
        { error: "ID da empresa é obrigatório" },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Data inicial e final são obrigatórias" },
        { status: 400 }
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Datas devem estar no formato YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: "Data final deve ser maior ou igual à data inicial" },
        { status: 400 }
      );
    }

    const fonteParam = searchParams.get("fonte");
    const fonte: FontePunches | "comparar" =
      fonteParam === "solides" || fonteParam === "comparar"
        ? fonteParam
        : "banco";

    if (fonte === "comparar") {
      const viaSolides = await gerarBoletim(
        companyId,
        startDate,
        endDate,
        "solides",
      );
      const viaBanco = await gerarBoletim(
        companyId,
        startDate,
        endDate,
        "banco",
      );
      return NextResponse.json(
        {
          periodo: { companyId, startDate, endDate },
          comparacao: compararBoletins(viaSolides, viaBanco),
        },
        { status: 200 },
      );
    }

    const boletimData = await gerarBoletim(
      companyId,
      startDate,
      endDate,
      fonte,
    );

    return NextResponse.json({ data: boletimData }, { status: 200 });
  } catch (error: unknown) {
    console.error("Erro ao buscar dados do boletim:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar dados do boletim",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
