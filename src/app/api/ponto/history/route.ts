import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer, DocumentProps } from "@react-pdf/renderer";
import { PontoPDF } from "@/components/ponto-pdf";
import { ELMO_CNPJ } from "@/lib/pdf-utils";
import React from "react";
import fs from "fs";
import path from "path";
import { supabaseAdmin } from "@/lib/db/client";
import { auth } from "@/auth";

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

interface SavePontoRequest {
  employeeId?: number;
  employeeName?: string;
  startDate: string;
  endDate: string;
  data: PontoData[];
  filtersApplied?: {
    employeeId?: number;
    company?: string;
    status?: string;
  };
}

// POST - Salvar relatório de ponto no histórico (Storage + DB)
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: 401 }
    );
  }

  try {
    const body: SavePontoRequest = await request.json();
    const {
      employeeId,
      employeeName,
      startDate,
      endDate,
      data,
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

    // Gerar PDF
    let pdfBuffer: Buffer;
    try {
      const pdfDocument = React.createElement(PontoPDF, {
        employeeName,
        startDate,
        endDate,
        data: data as PontoData[],
        logoBase64,
        companyCnpj: ELMO_CNPJ,
        employeeCpf,
        employeeAdmissionDate,
      });

      pdfBuffer = await renderToBuffer(
        pdfDocument as React.ReactElement<DocumentProps>
      );
    } catch (pdfError) {
      console.error("Erro ao gerar PDF:", pdfError);
      throw new Error(
        `Erro ao gerar PDF: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`
      );
    }

    // Criar nome do arquivo
    const timestamp = new Date().getTime();
    const fileName = `relatorio-ponto-${
      employeeName
        ? employeeName.replace(/\s+/g, "-").toLowerCase()
        : "geral"
    }-${startDate}-${endDate}-${timestamp}.pdf`;
    const storagePath = employeeId ? `${employeeId}/${fileName}` : `geral/${fileName}`;

    // Upload para Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("ponto-exports")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Erro ao fazer upload do PDF:", uploadError);
      // Verificar se o erro é porque o bucket não existe
      if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("not found")) {
        throw new Error(
          `Bucket 'ponto-exports' não encontrado no Supabase Storage. ` +
          `Por favor, crie o bucket 'ponto-exports' no Dashboard do Supabase (Storage > Create bucket). ` +
          `Erro original: ${uploadError.message}`
        );
      }
      throw new Error(`Erro ao salvar PDF no storage: ${uploadError.message}`);
    }

    // Obter URL pública (assinada por 1 ano)
    const { data: urlData } = await supabaseAdmin.storage
      .from("ponto-exports")
      .createSignedUrl(storagePath, 31536000); // 1 ano em segundos

    if (!urlData?.signedUrl) {
      throw new Error("Erro ao gerar URL do PDF");
    }

    // Calcular metadados
    const parseTime = (time: string): number => {
      if (!time || time === "-" || time.trim() === "") return 0;
      try {
        const [hours, minutes] = time.split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes)) return 0;
        return hours + minutes / 60;
      } catch {
        return 0;
      }
    };

    const totalHours = data.reduce(
      (sum, item) => sum + parseTime(item.totalHoras || "00:00"),
      0
    );
    const totalNormalHours = data.reduce(
      (sum, item) => sum + parseTime(item.horasNormais || "00:00"),
      0
    );
    const totalNightAdditional = data.reduce(
      (sum, item) => sum + parseTime(item.adicionalNoturno || "00:00"),
      0
    );
    const totalExtra50 = data.reduce(
      (sum, item) =>
        sum +
        parseTime(item.extra50Diurno || "00:00") +
        parseTime(item.extra50Noturno || "00:00"),
      0
    );
    const totalExtra100 = data.reduce(
      (sum, item) =>
        sum +
        parseTime(item.extra100Diurno || "00:00") +
        parseTime(item.extra100Noturno || "00:00"),
      0
    );

    // Salvar registro no banco de dados
    const { data: dbRecord, error: dbError } = await supabaseAdmin
      .from("ponto_exports")
      .insert({
        employee_id: employeeId || null,
        employee_name: employeeName || null,
        start_date: startDate,
        end_date: endDate,
        pdf_storage_path: storagePath,
        pdf_url: urlData.signedUrl,
        file_size_bytes: pdfBuffer.length,
        total_hours: totalHours.toFixed(2),
        total_normal_hours: totalNormalHours.toFixed(2),
        total_night_additional: totalNightAdditional.toFixed(2),
        total_extra_50: totalExtra50.toFixed(2),
        total_extra_100: totalExtra100.toFixed(2),
        total_records: data.length,
        filters_applied: filtersApplied,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Erro ao salvar registro no banco:", dbError);
      // Verificar se o erro é porque a tabela não existe
      if (
        dbError.message?.includes("does not exist") ||
        dbError.message?.includes("relation") ||
        dbError.code === "42P01"
      ) {
        // Tentar deletar o arquivo do storage se falhar ao salvar no DB
        try {
          await supabaseAdmin.storage.from("ponto-exports").remove([storagePath]);
        } catch (storageError) {
          console.error("Erro ao remover arquivo do storage:", storageError);
        }
        throw new Error(
          `Tabela 'ponto_exports' não encontrada no banco de dados. ` +
          `Por favor, execute a migração: yarn migrations ` +
          `ou execute manualmente o arquivo: src/lib/db/migrations/create_ponto_exports_table.sql. ` +
          `Erro original: ${dbError.message}`
        );
      }
      // Tentar deletar o arquivo do storage se falhar ao salvar no DB
      try {
        await supabaseAdmin.storage.from("ponto-exports").remove([storagePath]);
      } catch (storageError) {
        console.error("Erro ao remover arquivo do storage:", storageError);
      }
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
    console.error("Erro ao salvar relatório de ponto no histórico:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.stack : undefined;
    
    // Log detalhado para debug
    console.error("Detalhes do erro:", {
      message: errorMessage,
      stack: errorDetails,
    });
    
    return NextResponse.json(
      {
        error: "Erro ao salvar relatório de ponto no histórico",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// GET - Listar histórico de relatórios de ponto
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: 401 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get("employee_id");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "10");

    // Calcular offset
    const offset = (page - 1) * pageSize;

    // Construir query
    let query = supabaseAdmin
      .from("ponto_exports")
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
    console.error("Erro ao listar histórico de relatórios de ponto:", error);
    return NextResponse.json(
      {
        error: "Erro ao listar histórico de relatórios de ponto",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
