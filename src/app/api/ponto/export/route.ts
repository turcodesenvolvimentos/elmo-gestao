import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, DocumentProps } from "@react-pdf/renderer";
import { PontoPDF } from "@/components/ponto-pdf";
import React from "react";
import fs from "fs";
import path from "path";

interface PontoData {
  employeeName: string;
  company: string;
  date: string;
  dayOfWeek: string;
  entry1: string;
  exit1: string;
  entry2?: string;
  exit2?: string;
  horasDiurnas: string;
  horasNoturnas: string;
  horasFictas: string;
  totalHoras: string;
  horasNormais: string;
  adicionalNoturno: string;
  extra50Diurno: string;
  extra50Noturno: string;
  extra100Diurno: string;
  extra100Noturno: string;
  employeeCpf?: string;
  employeeAdmissionDate?: string;
}

// POST - Gerar PDF do relatório de ponto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeName, startDate, endDate, data, employeeCpf, employeeAdmissionDate } = body;

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

    // Gerar PDF
    const pdfDocument = React.createElement(PontoPDF, {
      employeeName,
      startDate,
      endDate,
      data: data as PontoData[],
      logoBase64,
      employeeCpf,
      employeeAdmissionDate,
    });

    const pdfBuffer = await renderToBuffer(
      pdfDocument as React.ReactElement<DocumentProps>
    );

    // Retornar PDF como resposta
    const fileName = `relatorio-ponto-${
      employeeName
        ? employeeName.replace(/\s+/g, "-").toLowerCase()
        : "geral"
    }-${startDate}-${endDate}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao gerar PDF do relatório de ponto:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar PDF do relatório de ponto",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
