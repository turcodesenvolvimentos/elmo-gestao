import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { BoletimPDF } from "@/components/boletim-pdf";
import React from "react";
import fs from "fs";
import path from "path";

interface BoletimData {
  employee_name: string;
  position: string;
  department: string;
  date: string;
  day_of_week: string;
  entry1?: string;
  exit1?: string;
  entry2?: string;
  exit2?: string;
  total_hours: string;
  normal_hours: string;
  night_additional?: string;
  extra_50_day: string;
  extra_50_night: string;
  extra_100_day: string;
  extra_100_night: string;
  value: number;
}

// POST - Gerar PDF do boletim
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, startDate, endDate, data } = body;

    // Validação
    if (!companyName || !startDate || !endDate || !data) {
      return NextResponse.json(
        {
          error: "Campos obrigatórios: companyName, startDate, endDate, data",
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
    const pdfDocument = React.createElement(BoletimPDF, {
      companyName,
      startDate,
      endDate,
      data: data as BoletimData[],
      logoBase64,
    });

    const pdfBuffer = await renderToBuffer(pdfDocument);

    // Retornar PDF como resposta
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="boletim-${companyName
          .replace(/\s+/g, "-")
          .toLowerCase()}-${startDate}-${endDate}.pdf"`,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao gerar PDF do boletim:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar PDF do boletim",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
