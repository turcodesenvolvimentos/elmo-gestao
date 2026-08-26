import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/db/client";
import { Permission } from "@/types/permissions";
import { checkAnyPermission } from "@/lib/auth/permissions";
import { dataValida, horaValida, montarPeriodo } from "@/lib/punches";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function carregarBatida(id: string) {
  const { data, error } = await supabaseAdmin
    .from("punches")
    .select("id, date, date_in, date_out, employee_id, employee_name, origem")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!checkAnyPermission(session, [Permission.PONTO])) {
    return NextResponse.json(
      { error: "Sem permissão para editar batidas" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Batida inválida" }, { status: 400 });
    }

    const atual = await carregarBatida(id);

    if (!atual) {
      return NextResponse.json(
        { error: "Batida não encontrada" },
        { status: 404 }
      );
    }

    // Editar uma batida da Sólides não adianta: a próxima sincronização
    // reescreve a linha inteira a partir da API.
    if (atual.origem !== "MANUAL") {
      return NextResponse.json(
        {
          error:
            "Esta batida veio da Sólides e seria reescrita na próxima sincronização. Lance uma batida manual no dia para substituí-la.",
        },
        { status: 409 }
      );
    }

    const body = await request.json();
    const data = dataValida(body.date) ? body.date : atual.date;

    if (body.date !== undefined && !dataValida(body.date)) {
      return NextResponse.json(
        { error: "Data deve estar no formato YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (!horaValida(body.entrada)) {
      return NextResponse.json(
        { error: "Entrada deve estar no formato HH:MM" },
        { status: 400 }
      );
    }

    const saida =
      body.saida === null || body.saida === undefined || body.saida === ""
        ? null
        : body.saida;

    if (saida !== null && !horaValida(saida)) {
      return NextResponse.json(
        { error: "Saída deve estar no formato HH:MM" },
        { status: 400 }
      );
    }

    const periodo = montarPeriodo(data, body.entrada, saida);

    const { data: atualizada, error } = await supabaseAdmin
      .from("punches")
      .update({
        date: data,
        date_in: periodo.dateIn,
        date_out: periodo.dateOut,
      })
      .eq("id", id)
      .select("id, date, date_in, date_out, employee_id, employee_name, origem")
      .single();

    if (error) throw error;

    return NextResponse.json(atualizada);
  } catch (error: unknown) {
    console.error("Erro ao editar batida:", error);
    return NextResponse.json(
      {
        error: "Erro ao editar batida",
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
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!checkAnyPermission(session, [Permission.PONTO])) {
    return NextResponse.json(
      { error: "Sem permissão para apagar batidas" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Batida inválida" }, { status: 400 });
    }

    const atual = await carregarBatida(id);

    if (!atual) {
      return NextResponse.json(
        { error: "Batida não encontrada" },
        { status: 404 }
      );
    }

    // Apagar uma batida da Sólides seria inútil: a próxima sincronização a
    // traria de volta.
    if (atual.origem !== "MANUAL") {
      return NextResponse.json(
        {
          error:
            "Esta batida veio da Sólides e voltaria na próxima sincronização. Apague-a na Sólides.",
        },
        { status: 409 }
      );
    }

    const { error } = await supabaseAdmin.from("punches").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Erro ao apagar batida:", error);
    return NextResponse.json(
      {
        error: "Erro ao apagar batida",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
