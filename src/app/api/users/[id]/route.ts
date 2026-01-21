import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { updateUserSchema } from "@/lib/validations/users";
import { Permission } from "@/types/permissions";
import { checkPermission } from "@/lib/auth/permissions";
import bcrypt from "bcryptjs";

// GET - Buscar usuário específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Verificar permissão
    if (!checkPermission(session, Permission.USERS)) {
      return NextResponse.json(
        { error: "Sem permissão para gerenciar usuários" },
        { status: 403 }
      );
    }

    // Buscar usuário
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email, name, permissions, created_at, updated_at")
      .eq("id", id)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Usuário não encontrado" },
          { status: 404 }
        );
      }
      throw userError;
    }

    return NextResponse.json(user);
  } catch (error: unknown) {
    console.error("Erro ao buscar usuário:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar usuário",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT - Atualizar usuário
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Verificar permissão
    if (!checkPermission(session, Permission.USERS)) {
      return NextResponse.json(
        { error: "Sem permissão para gerenciar usuários" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validar dados
    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, email, password, permissions } = validationResult.data;

    // Verificar se usuário existe
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("id", id)
      .single();

    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Usuário não encontrado" },
          { status: 404 }
        );
      }
      throw checkError;
    }

    // Se email foi alterado, verificar se já existe outro usuário com esse email
    if (email && email !== existingUser.email) {
      const { data: emailUser, error: emailError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (emailError && emailError.code !== "PGRST116") {
        throw emailError;
      }

      if (emailUser) {
        return NextResponse.json(
          { error: "Já existe um usuário com este email" },
          { status: 409 }
        );
      }
    }

    // Preparar dados para atualização
    const updateData: {
      name?: string;
      email?: string;
      password_hash?: string;
      permissions?: string[];
    } = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      updateData.email = email.trim().toLowerCase();
    }

    if (password !== undefined) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    if (permissions !== undefined) {
      updateData.permissions = permissions;
    }

    // Atualizar usuário
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select("id, email, name, permissions, created_at, updated_at")
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(updatedUser);
  } catch (error: unknown) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar usuário",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - Deletar usuário
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Verificar permissão
    if (!checkPermission(session, Permission.USERS)) {
      return NextResponse.json(
        { error: "Sem permissão para gerenciar usuários" },
        { status: 403 }
      );
    }

    // Não permitir que usuário delete a si mesmo
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "Não é possível deletar seu próprio usuário" },
        { status: 400 }
      );
    }

    // Verificar se usuário existe
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", id)
      .single();

    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Usuário não encontrado" },
          { status: 404 }
        );
      }
      throw checkError;
    }

    // Deletar usuário
    const { error: deleteError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ message: "Usuário deletado com sucesso" });
  } catch (error: unknown) {
    console.error("Erro ao deletar usuário:", error);
    return NextResponse.json(
      {
        error: "Erro ao deletar usuário",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
