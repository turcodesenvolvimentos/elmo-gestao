import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

// GET - Download de boletim do histórico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar registro do boletim
    const { data: boletim, error: boletimError } = await supabaseAdmin
      .from("boletim_exports")
      .select("*")
      .eq("id", id)
      .single();

    if (boletimError || !boletim) {
      return NextResponse.json(
        { error: "Boletim não encontrado" },
        { status: 404 }
      );
    }

    // Download do PDF do Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("boletim-exports")
      .download(boletim.pdf_storage_path);

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
    const fileName = `boletim-${boletim.company_name
      .replace(/\s+/g, "-")
      .toLowerCase()}-${boletim.start_date}-${boletim.end_date}.pdf`;

    // Retornar PDF
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao fazer download do boletim:", error);
    return NextResponse.json(
      {
        error: "Erro ao fazer download do boletim",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - Deletar boletim do histórico
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Buscar registro do boletim
    const { data: boletim, error: boletimError } = await supabaseAdmin
      .from("boletim_exports")
      .select("*")
      .eq("id", id)
      .single();

    if (boletimError || !boletim) {
      return NextResponse.json(
        { error: "Boletim não encontrado" },
        { status: 404 }
      );
    }

    // Deletar arquivo do Supabase Storage
    const { error: deleteStorageError } = await supabaseAdmin.storage
      .from("boletim-exports")
      .remove([boletim.pdf_storage_path]);

    if (deleteStorageError) {
      console.error(
        "Erro ao deletar arquivo do storage:",
        deleteStorageError
      );
      // Continuar mesmo com erro, pois o importante é limpar o registro do DB
    }

    // Deletar registro do banco
    const { error: deleteDbError } = await supabaseAdmin
      .from("boletim_exports")
      .delete()
      .eq("id", id);

    if (deleteDbError) {
      throw deleteDbError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Boletim deletado com sucesso",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Erro ao deletar boletim:", error);
    return NextResponse.json(
      {
        error: "Erro ao deletar boletim",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
