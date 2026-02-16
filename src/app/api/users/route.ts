import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { createUserSchema } from "@/lib/validations/users";
import { Permission } from "@/types/permissions";
import { checkPermission } from "@/lib/auth/permissions";
import bcrypt from "bcryptjs";

// GET - Listar usuários
export async function GET() {
  try {
    const session = await auth();

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

    // Buscar todos os usuários (sem senha)
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, email, name, permissions, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (usersError) {
      throw usersError;
    }

    return NextResponse.json({
      users: users || [],
      total: users?.length || 0,
    });
  } catch (error: unknown) {
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar usuários",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// POST - Criar usuário
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

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
    const validationResult = createUserSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Erro de validação:", validationResult.error.errors);
      console.error("Dados recebidos:", JSON.stringify(body, null, 2));
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, email, password, permissions } = validationResult.data;

    // Verificar se email já existe
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = nenhum resultado encontrado (esperado)
      throw checkError;
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe um usuário com este email" },
        { status: 409 }
      );
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Criar usuário
    const { data: newUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        permissions: permissions || [],
      })
      .select("id, email, name, permissions, created_at, updated_at")
      .single();

    if (createError) {
      throw createError;
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      {
        error: "Erro ao criar usuário",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
