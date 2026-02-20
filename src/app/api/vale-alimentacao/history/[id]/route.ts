import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// GET - Download de relatório de vale alimentação do histórico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar registro do relatório
    const { data: valeAlimentacao, error: valeAlimentacaoError } =
      await supabaseAdmin
        .from("vale_alimentacao_exports")
        .select("*")
        .eq("id", id)
        .single();

    if (valeAlimentacaoError || !valeAlimentacao) {
      return NextResponse.json(
        { error: "Relatório não encontrado" },
        { status: 404 }
      );
    }

    // Download do PDF do Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("vale-alimentacao-exports")
      .download(valeAlimentacao.pdf_storage_path);

    if (downloadError || !fileData) {
      console.error("Erro ao fazer download do PDF:", downloadError);
      return NextResponse.json(
        { error: "Erro ao fazer download do PDF" },
        { status: 500 }
      );
    }

    // Converter Blob para Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Criar nome do arquivo para download
    const fileName = `relatorio-vale-alimentacao-${
      valeAlimentacao.employee_name
        ? valeAlimentacao.employee_name.replace(/\s+/g, "-").toLowerCase()
        : "geral"
    }-${valeAlimentacao.start_date}-${valeAlimentacao.end_date}.pdf`;

    // Retornar PDF
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao fazer download do relatório:", error);
    return NextResponse.json(
      {
        error: "Erro ao fazer download do relatório",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - Deletar relatório de vale alimentação do histórico
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar registro do relatório
    const { data: valeAlimentacao, error: valeAlimentacaoError } =
      await supabaseAdmin
        .from("vale_alimentacao_exports")
        .select("*")
        .eq("id", id)
        .single();

    if (valeAlimentacaoError || !valeAlimentacao) {
      return NextResponse.json(
        { error: "Relatório não encontrado" },
        { status: 404 }
      );
    }

    // Deletar arquivo do Supabase Storage
    const { error: deleteStorageError } = await supabaseAdmin.storage
      .from("vale-alimentacao-exports")
      .remove([valeAlimentacao.pdf_storage_path]);

    if (deleteStorageError) {
      console.error(
        "Erro ao deletar arquivo do storage:",
        deleteStorageError
      );
      // Continuar mesmo com erro, pois o importante é limpar o registro do DB
    }

    // Deletar registro do banco
    const { error: deleteDbError } = await supabaseAdmin
      .from("vale_alimentacao_exports")
      .delete()
      .eq("id", id);

    if (deleteDbError) {
      throw deleteDbError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Relatório deletado com sucesso",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Erro ao deletar relatório:", error);
    return NextResponse.json(
      {
        error: "Erro ao deletar relatório",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
