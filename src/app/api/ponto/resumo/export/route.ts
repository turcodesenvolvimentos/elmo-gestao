import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, DocumentProps } from "@react-pdf/renderer";
import { PontoResumoPDF } from "@/components/ponto-resumo-pdf";
import type { PontoResumoRow } from "@/components/ponto-resumo-pdf";
import React from "react";
import fs from "fs";
import path from "path";

interface ResumoRequest {
  startDate: string;
  endDate: string;
  data: PontoResumoRow[];
}

// POST - Gera PDF do resumo de ponto (totais por funcionario no periodo)
export async function POST(request: NextRequest) {
  try {
    const body: ResumoRequest = await request.json();
    const { startDate, endDate, data } = body;

    if (!startDate || !endDate || !data) {
      return NextResponse.json(
        { error: "Campos obrigatórios: startDate, endDate, data" },
        { status: 400 },
      );
    }
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "Campo 'data' deve ser um array" },
        { status: 400 },
      );
    }

    // Carregar logo como base64 (mesmo fluxo das outras rotas de export)
    const logoPath = path.join(process.cwd(), "public", "assets", "logo.png");
    let logoBase64 = "";
    try {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      }
    } catch (err) {
      console.warn("Erro ao carregar logo:", err);
    }

    const pdfDocument = React.createElement(PontoResumoPDF, {
      startDate,
      endDate,
      data,
      logoBase64,
    });

    const pdfBuffer = await renderToBuffer(
      pdfDocument as React.ReactElement<DocumentProps>,
    );

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resumo-ponto-${startDate}-${endDate}.pdf"`,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao gerar resumo de ponto:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar resumo de ponto",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
