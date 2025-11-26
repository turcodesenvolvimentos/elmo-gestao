import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      work_date,
      vale_alimentacao,
      ajuda_custo,
      company_id,
    } = body;

    // Validações
    if (!employee_id || !work_date) {
      return NextResponse.json(
        { error: "employee_id e work_date são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar formato da data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(work_date)) {
      return NextResponse.json(
        { error: "Formato de data inválido. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validar valores booleanos
    const vrValue = vale_alimentacao === true || vale_alimentacao === "true";
    const costValue = ajuda_custo === true || ajuda_custo === "true";

    // Upsert (inserir ou atualizar)
    const { data, error } = await supabaseAdmin
      .from("food_vouchers")
      .upsert(
        {
          employee_id,
          work_date,
          vale_alimentacao: vrValue,
          ajuda_custo: costValue,
          company_id: company_id || null,
        },
        {
          onConflict: "employee_id,work_date",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Erro ao salvar vale alimentação:", error);
      return NextResponse.json(
        { error: "Erro ao salvar configuração", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Erro ao processar requisição:", error);
    return NextResponse.json(
      {
        error: "Erro ao processar requisição",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const employee_id = searchParams.get("employee_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    let query = supabaseAdmin.from("food_vouchers").select("*");

    if (employee_id) {
      query = query.eq("employee_id", parseInt(employee_id));
    }

    if (start_date) {
      query = query.gte("work_date", start_date);
    }

    if (end_date) {
      query = query.lte("work_date", end_date);
    }

    const { data, error } = await query.order("work_date", { ascending: true });

    if (error) {
      console.error("Erro ao buscar vale alimentação:", error);
      return NextResponse.json(
        { error: "Erro ao buscar configurações", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error: unknown) {
    console.error("Erro ao processar requisição:", error);
    return NextResponse.json(
      {
        error: "Erro ao processar requisição",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
