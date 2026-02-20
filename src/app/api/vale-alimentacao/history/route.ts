import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, DocumentProps } from "@react-pdf/renderer";
import { ValeAlimentacaoPDF } from "@/components/vale-alimentacao-pdf";
import { ValeAlimentacaoSummaryPDF } from "@/components/vale-alimentacao-summary-pdf";
import { ELMO_CNPJ } from "@/lib/pdf-utils";
import React from "react";
import fs from "fs";
import path from "path";
import { supabaseAdmin } from "@/lib/db/client";

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

interface SaveValeAlimentacaoRequest {
  employeeId?: number;
  employeeName?: string;
  startDate: string;
  endDate: string;
  data: ValeAlimentacaoData[] | EmployeeSummary[];
  reportType?: "summary" | "detailed";
  filtersApplied?: {
    employeeId?: number;
  };
}

// POST - Salvar relatório de vale alimentação no histórico (Storage + DB)
export async function POST(request: NextRequest) {
  try {
    const body: SaveValeAlimentacaoRequest = await request.json();
    const {
      employeeId,
      employeeName,
      startDate,
      endDate,
      data,
      reportType = "detailed",
      employeeCpf,
      employeeAdmissionDate,
      filtersApplied = {},
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

    // Gerar PDF baseado no tipo
    let pdfDocument: React.ReactElement;
    if (reportType === "summary") {
      // Relatório resumo (1 linha por funcionário)
      pdfDocument = React.createElement(ValeAlimentacaoSummaryPDF, {
        startDate,
        endDate,
        data: data as EmployeeSummary[],
        logoBase64,
        companyCnpj: ELMO_CNPJ,
      });
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
    }

    const pdfBuffer = await renderToBuffer(
      pdfDocument as React.ReactElement<DocumentProps>
    );

    // Criar nome do arquivo
    const timestamp = new Date().getTime();
    const reportTypeLabel = reportType === "summary" ? "resumo" : "detalhado";
    const fileName = `relatorio-vale-alimentacao-${reportTypeLabel}-${
      employeeName
        ? employeeName.replace(/\s+/g, "-").toLowerCase()
        : "geral"
    }-${startDate}-${endDate}-${timestamp}.pdf`;
    const storagePath = employeeId
      ? `${employeeId}/${fileName}`
      : `geral/${fileName}`;

    // Upload para Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("vale-alimentacao-exports")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Erro ao fazer upload do PDF:", uploadError);
      throw new Error(`Erro ao salvar PDF no storage: ${uploadError.message}`);
    }

    // Obter URL pública (assinada por 1 ano)
    const { data: urlData } = await supabaseAdmin.storage
      .from("vale-alimentacao-exports")
      .createSignedUrl(storagePath, 31536000); // 1 ano em segundos

    if (!urlData?.signedUrl) {
      throw new Error("Erro ao gerar URL do PDF");
    }

    // Calcular metadados
    let totalVr = 0;
    let totalCostHelp = 0;
    let uniqueEmployees: Set<string>;

    if (reportType === "summary") {
      // Para resumo, os dados já são totais por funcionário
      const summaryData = data as EmployeeSummary[];
      totalVr = summaryData.reduce((sum, item) => sum + item.totalVr, 0);
      totalCostHelp = summaryData.reduce(
        (sum, item) => sum + item.totalCostHelp,
        0
      );
      uniqueEmployees = new Set(summaryData.map((item) => item.employeeName));
    } else {
      // Para detalhado, calcular dos dias
      const detailedData = data as ValeAlimentacaoData[];
      totalVr = detailedData.reduce(
        (sum, item) => sum + (item.valeAlimentacao ? item.vrValue : 0),
        0
      );
      totalCostHelp = detailedData.reduce(
        (sum, item) => sum + (item.ajudaCusto ? item.costHelpValue : 0),
        0
      );
      uniqueEmployees = new Set(detailedData.map((item) => item.employeeName));
    }

    // Salvar registro no banco de dados
    const { data: dbRecord, error: dbError } = await supabaseAdmin
      .from("vale_alimentacao_exports")
      .insert({
        employee_id: employeeId || null,
        employee_name: employeeName || null,
        start_date: startDate,
        end_date: endDate,
        pdf_storage_path: storagePath,
        pdf_url: urlData.signedUrl,
        file_size_bytes: pdfBuffer.length,
        total_vr: totalVr.toFixed(2),
        total_cost_help: totalCostHelp.toFixed(2),
        total_employees: uniqueEmployees.size,
        total_records: data.length,
        filters_applied: filtersApplied,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Erro ao salvar registro no banco:", dbError);
      // Tentar deletar o arquivo do storage se falhar ao salvar no DB
      await supabaseAdmin.storage
        .from("vale-alimentacao-exports")
        .remove([storagePath]);
      throw new Error(`Erro ao salvar registro: ${dbError.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Relatório salvo no histórico com sucesso",
        data: dbRecord,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(
      "Erro ao salvar relatório de vale alimentação no histórico:",
      error
    );
    return NextResponse.json(
      {
        error: "Erro ao salvar relatório de vale alimentação no histórico",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET - Listar histórico de relatórios de vale alimentação
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get("employee_id");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "10");

    // Calcular offset
    const offset = (page - 1) * pageSize;

    // Construir query
    let query = supabaseAdmin
      .from("vale_alimentacao_exports")
      .select("*", { count: "exact" })
      .order("exported_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Filtrar por funcionário se fornecido
    if (employeeId) {
      query = query.eq("employee_id", parseInt(employeeId, 10));
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        data: data || [],
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      "Erro ao listar histórico de relatórios de vale alimentação:",
      error
    );
    return NextResponse.json(
      {
        error: "Erro ao listar histórico de relatórios de vale alimentação",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
