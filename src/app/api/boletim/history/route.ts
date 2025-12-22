import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, DocumentProps } from "@react-pdf/renderer";
import { BoletimPDF } from "@/components/boletim-pdf";
import React from "react";
import fs from "fs";
import path from "path";
import { supabaseAdmin } from "@/lib/db/client";

interface BoletimData {
  employee_id: string;
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

interface SaveBoletimRequest {
  companyId: string;
  companyName: string;
  startDate: string;
  endDate: string;
  data: BoletimData[];
  manualEdits?: Record<string, any>;
  filtersApplied?: {
    employee?: string;
    position?: string;
    department?: string;
    date?: string;
  };
}

// POST - Salvar boletim no histórico (Storage + DB)
export async function POST(request: NextRequest) {
  try {
    const body: SaveBoletimRequest = await request.json();
    const {
      companyId,
      companyName,
      startDate,
      endDate,
      data,
      manualEdits = {},
      filtersApplied = {},
    } = body;

    // Validação
    if (!companyId || !companyName || !startDate || !endDate || !data) {
      return NextResponse.json(
        {
          error:
            "Campos obrigatórios: companyId, companyName, startDate, endDate, data",
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

    const pdfBuffer = await renderToBuffer(
      pdfDocument as React.ReactElement<DocumentProps>
    );

    // Criar nome do arquivo
    const timestamp = new Date().getTime();
    const fileName = `boletim-${companyName
      .replace(/\s+/g, "-")
      .toLowerCase()}-${startDate}-${endDate}-${timestamp}.pdf`;
    const storagePath = `${companyId}/${fileName}`;

    // Upload para Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("boletim-exports")
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
      .from("boletim-exports")
      .createSignedUrl(storagePath, 31536000); // 1 ano em segundos

    if (!urlData?.signedUrl) {
      throw new Error("Erro ao gerar URL do PDF");
    }

    // Calcular metadados
    const parseTime = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours + minutes / 60;
    };

    const totalHours = data.reduce(
      (sum, item) => sum + parseTime(item.total_hours),
      0
    );
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    const uniqueEmployees = new Set(data.map((item) => item.employee_id));

    // Salvar registro no banco de dados
    const { data: dbRecord, error: dbError } = await supabaseAdmin
      .from("boletim_exports")
      .insert({
        company_id: companyId,
        company_name: companyName,
        start_date: startDate,
        end_date: endDate,
        pdf_storage_path: storagePath,
        pdf_url: urlData.signedUrl,
        file_size_bytes: pdfBuffer.length,
        total_hours: totalHours.toFixed(2),
        total_value: totalValue.toFixed(2),
        total_employees: uniqueEmployees.size,
        total_records: data.length,
        manual_edits: manualEdits,
        filters_applied: filtersApplied,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Erro ao salvar registro no banco:", dbError);
      // Tentar deletar o arquivo do storage se falhar ao salvar no DB
      await supabaseAdmin.storage.from("boletim-exports").remove([storagePath]);
      throw new Error(`Erro ao salvar registro: ${dbError.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Boletim salvo no histórico com sucesso",
        data: dbRecord,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Erro ao salvar boletim no histórico:", error);
    return NextResponse.json(
      {
        error: "Erro ao salvar boletim no histórico",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET - Listar histórico de boletins
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("company_id");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "10");

    // Calcular offset
    const offset = (page - 1) * pageSize;

    // Construir query
    let query = supabaseAdmin
      .from("boletim_exports")
      .select("*", { count: "exact" })
      .order("exported_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Filtrar por empresa se fornecido
    if (companyId) {
      query = query.eq("company_id", companyId);
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
    console.error("Erro ao listar histórico de boletins:", error);
    return NextResponse.json(
      {
        error: "Erro ao listar histórico de boletins",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
