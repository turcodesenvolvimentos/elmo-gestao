import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { solidesApiClient } from "@/lib/axios/solides.client";
import { handleSolidesError } from "@/lib/axios/error-handler";
import { AxiosError } from "axios";
import { Permission } from "@/types/permissions";
import { checkAnyPermission } from "@/lib/auth/permissions";

interface SolidesPunchRaw {
  id?: number;
  date?: string | number | null;
  dateIn?: string | number | null;
  dateOut?: string | number | null;
  employee?: { id?: number } | null;
}

function dateToTimestamp(dateStr: string, offsetDays = 0): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d + offsetDays, 12, 0, 0, 0).getTime();
}

function formatLocalDate(d: Date): string {
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, "0")}-` +
    `${String(d.getDate()).padStart(2, "0")}`
  );
}

/**
 * Datas candidatas de uma batida. Alguns campos vem como string ISO em UTC e
 * outros como timestamp; perto da meia-noite as duas leituras divergem, entao
 * consideramos ambas ao decidir se a batida e do dia procurado.
 */
function candidateDates(value: string | number | null | undefined): string[] {
  if (value === null || value === undefined || value === "") return [];

  const out: string[] = [];

  if (typeof value === "string") {
    out.push(value.includes("T") ? value.split("T")[0] : value.substring(0, 10));
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) out.push(formatLocalDate(parsed));
  } else {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      out.push(formatLocalDate(d));
      out.push(d.toISOString().split("T")[0]);
    }
  }

  return out;
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (
    !checkAnyPermission(session, [
      Permission.ESCALAS,
      Permission.PONTO,
      Permission.VALE_ALIMENTACAO,
    ])
  ) {
    return NextResponse.json(
      { error: "Sem permissão para visualizar as batidas" },
      { status: 403 }
    );
  }

  try {
    const date =
      request.nextUrl.searchParams.get("date") || formatLocalDate(new Date());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Parâmetro 'date' inválido (use YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // A API do Solides filtra por instante, nao por dia. Consultar o dia
    // inteiro com o mesmo timestamp (meio-dia) descartava as batidas da
    // manha. Buscamos uma janela folgada de +-1 dia e filtramos localmente
    // pela data canonica da batida.
    const startTs = dateToTimestamp(date, -1).toString();
    const endTs = dateToTimestamp(date, 1).toString();
    const PAGE_SIZE = 1000;
    const employeeIds = new Set<number>();

    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await solidesApiClient.get("punch", {
          params: {
            page,
            size: PAGE_SIZE,
            startDate: startTs,
            endDate: endTs,
            showFired: true,
          },
        });

        const data = response.data;
        const content: SolidesPunchRaw[] = data?.content || [];

        for (const raw of content) {
          const employeeId = raw.employee?.id;
          if (typeof employeeId !== "number") continue;

          const datas = [
            ...candidateDates(raw.date),
            ...candidateDates(raw.dateIn),
            ...candidateDates(raw.dateOut),
          ];

          if (datas.includes(date)) employeeIds.add(employeeId);
        }

        page++;
        hasMore =
          content.length > 0 &&
          !data?.last &&
          page <= (data?.totalPages ?? Infinity);
      } catch (err: unknown) {
        const status =
          err instanceof AxiosError
            ? err.response?.status
            : typeof err === "object" && err !== null && "status" in err
            ? (err as { status?: number }).status
            : undefined;
        if (status === 404) {
          hasMore = false;
          break;
        }
        throw err;
      }
    }

    return NextResponse.json({ date, employeeIds: [...employeeIds] });
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      const solidesError = handleSolidesError(error);
      return NextResponse.json(
        { error: solidesError.message },
        { status: solidesError.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao buscar batidas do dia" },
      { status: 500 }
    );
  }
}
