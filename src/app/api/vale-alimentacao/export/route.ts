import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, DocumentProps } from "@react-pdf/renderer";
import { ValeAlimentacaoPDF } from "@/components/vale-alimentacao-pdf";
import { ValeAlimentacaoSummaryPDF } from "@/components/vale-alimentacao-summary-pdf";
import { ELMO_CNPJ } from "@/lib/pdf-utils";
import React from "react";
import fs from "fs";
import path from "path";

interface ValeAlimentacaoData {
  employeeName: string;
  date: string;
  company: string;
  entry1: string;
  exit1: string;
  entry2?: string;
  exit2?: string;
  totalHours: string;
  valeAlimentacao: boolean;
  ajudaCusto: boolean;
  vrValue: number;
  costHelpValue: number;
}

interface EmployeeSummary {
  employeeName: string;
  totalVr: number;
  totalCostHelp: number;
}

// POST - Gerar PDF do relatório de vale alimentação
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeName,
      startDate,
      endDate,
      data,
      reportType = "detailed", // "summary" ou "detailed"
      employeeCpf,
      employeeAdmissionDate,
    } = body;

    // Validação
    if (!startDate || !endDate || !data) {
      return NextResponse.json(
        {
          error: "Campos obrigatórios: startDate, endDate, data",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "Campo 'data' deve ser um array" },
        { status: 400 }
      );
    }

    // Carregar logo como base64
    const logoPath = path.join(process.cwd(), "public", "assets", "logo.png");
    let logoBase64 = "";

    try {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      }
    } catch (error) {
      console.warn("Erro ao carregar logo:", error);
    }

    let pdfDocument: React.ReactElement;
    let fileName: string;

    // Gerar PDF baseado no tipo
    if (reportType === "summary") {
      // Relatório resumo (1 linha por funcionário)
      pdfDocument = React.createElement(ValeAlimentacaoSummaryPDF, {
        startDate,
        endDate,
        data: data as EmployeeSummary[],
        logoBase64,
        companyCnpj: ELMO_CNPJ,
      });
      fileName = `relatorio-vale-alimentacao-resumo-${startDate}-${endDate}.pdf`;
    } else {
      // Relatório detalhado (todos os dias)
      pdfDocument = React.createElement(ValeAlimentacaoPDF, {
        employeeName,
        startDate,
        endDate,
        data: data as ValeAlimentacaoData[],
        logoBase64,
        companyCnpj: ELMO_CNPJ,
        employeeCpf,
        employeeAdmissionDate,
      });
      fileName = `relatorio-vale-alimentacao-${
        employeeName
          ? employeeName.replace(/\s+/g, "-").toLowerCase()
          : "geral"
      }-${startDate}-${endDate}.pdf`;
    }

    const pdfBuffer = await renderToBuffer(
      pdfDocument as React.ReactElement<DocumentProps>
    );

    // Retornar PDF como resposta
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao gerar PDF do relatório de vale alimentação:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar PDF do relatório de vale alimentação",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
