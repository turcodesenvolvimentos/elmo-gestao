import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, address } = body;

    console.log("PUT /api/companies/[id] - ID recebido:", id);

    // Validação
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nome da empresa é obrigatório" },
        { status: 400 }
      );
    }

    if (!address || !address.trim()) {
      return NextResponse.json(
        { error: "Endereço é obrigatório" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "ID da empresa é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a empresa existe
    const { data: existingCompany, error: fetchError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Erro ao buscar empresa:", fetchError);
      // Se o erro for PGRST116 (nenhum resultado encontrado), retornar 404
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Empresa não encontrada", details: fetchError.message },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    if (!existingCompany) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    // Atualizar empresa
    const { data: company, error: updateError } = await supabaseAdmin
      .from("companies")
      .update({
        name: name.trim(),
        address: address.trim(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      // Verificar se é erro de duplicata (endereço único)
      if (updateError.code === "23505") {
        return NextResponse.json(
          { error: "Já existe uma empresa cadastrada com este endereço" },
          { status: 409 }
        );
      }

      throw updateError;
    }

    // Buscar contagem de funcionários
    const { count } = await supabaseAdmin
      .from("employee_companies")
      .select("*", { count: "exact", head: true })
      .eq("company_id", id);

    return NextResponse.json({
      ...company,
      employee_count: count || 0,
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar empresa:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar empresa",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID da empresa é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a empresa existe
    const { data: existingCompany, error: fetchError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Erro ao buscar empresa:", fetchError);
      // Se o erro for PGRST116 (nenhum resultado encontrado), retornar 404
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Empresa não encontrada", details: fetchError.message },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    if (!existingCompany) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se há funcionários vinculados
    const { count, error: countError } = await supabaseAdmin
      .from("employee_companies")
      .select("*", { count: "exact", head: true })
      .eq("company_id", id);

    if (countError) {
      console.error(
        `Erro ao contar funcionários da empresa ${id}:`,
        countError
      );
    }

    if (count && count > 0) {
      return NextResponse.json(
        {
          error: "Não é possível excluir empresa com funcionários vinculados",
          employee_count: count,
        },
        { status: 409 }
      );
    }

    // Excluir empresa
    const { error: deleteError } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao excluir empresa:", error);
    return NextResponse.json(
      {
        error: "Erro ao excluir empresa",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
