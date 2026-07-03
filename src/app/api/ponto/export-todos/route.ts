import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, DocumentProps } from "@react-pdf/renderer";
import { PontoPDFTodos } from "@/components/ponto-pdf";
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

interface PontoTodosEmployee {
  employeeName?: string;
  employeeCpf?: string;
  employeeAdmissionDate?: string;
  data: PontoData[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, employees } = body;

    if (!startDate || !endDate || !employees) {
      return NextResponse.json(
        { error: "Campos obrigatórios: startDate, endDate, employees" },
        { status: 400 }
      );
    }

    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json(
        { error: "Campo 'employees' deve ser um array não vazio" },
        { status: 400 }
      );
    }

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

    const pdfDocument = React.createElement(PontoPDFTodos, {
      startDate,
      endDate,
      logoBase64,
      employees: employees as PontoTodosEmployee[],
    });

    const pdfBuffer = await renderToBuffer(
      pdfDocument as React.ReactElement<DocumentProps>
    );

    const fileName = `relatorio-ponto-todos-${startDate}-${endDate}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao gerar PDF de todos os funcionários:", error);
    return NextResponse.json(
      {
        error: "Erro ao gerar PDF de todos os funcionários",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
