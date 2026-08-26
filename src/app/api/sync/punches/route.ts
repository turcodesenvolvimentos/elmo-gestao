import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Permission } from "@/types/permissions";
import { checkAnyPermission } from "@/lib/auth/permissions";
import {
  DATE_REGEX,
  formatDate,
  getLastSyncDate,
  sincronizarPunches,
} from "@/lib/punches-sync";

export const maxDuration = 60;

function sendSSE(
  controller: ReadableStreamDefaultController<Uint8Array>,
  data: object
) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (
    !checkAnyPermission(session, [
      Permission.PONTO,
      Permission.EMPLOYEES,
      Permission.BOLETIM,
    ])
  ) {
    return NextResponse.json(
      { error: "Sem permissão para sincronizar" },
      { status: 403 }
    );
  }

  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const requestedStart = searchParams.get("startDate");
  const requestedEnd = searchParams.get("endDate");

  if (
    (requestedStart && !DATE_REGEX.test(requestedStart)) ||
    (requestedEnd && !DATE_REGEX.test(requestedEnd))
  ) {
    return NextResponse.json(
      { error: "startDate e endDate devem estar no formato YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const today = formatDate(new Date());
  const endDate = requestedEnd || today;
  const startDate = requestedStart || formatDate(await getLastSyncDate());

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "startDate deve ser menor ou igual a endDate" },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const stats = await sincronizarPunches(
          startDate,
          endDate,
          (passo, total) => {
            sendSSE(controller, {
              type: "progress",
              processed: passo,
              total,
              percent: Math.round((passo / total) * 100),
            });
          }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        sendSSE(controller, {
          type: "done",
          success: true,
          stats: { ...stats, duration: parseFloat(duration) },
        });
        controller.close();
      } catch (error: unknown) {
        console.error("Erro na sincronização:", error);
        sendSSE(controller, {
          type: "error",
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Erro desconhecido na sincronização",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET() {
  try {
    const lastSyncDate = await getLastSyncDate();
    return NextResponse.json(
      {
        lastSyncAt: lastSyncDate.toISOString(),
        lastSyncDate: formatDate(lastSyncDate),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao buscar última sincronização",
      },
      { status: 500 }
    );
  }
}
