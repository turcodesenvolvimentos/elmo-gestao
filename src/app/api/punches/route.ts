import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { solidesApiClient } from "@/lib/axios/solides.client";
import { handleSolidesError } from "@/lib/axios/error-handler";
import { AxiosError } from "axios";
import { Permission } from "@/types/permissions";
import { checkPermission } from "@/lib/auth/permissions";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: 401 }
    );
  }

    if (!checkPermission(session, Permission.PONTO)) {
    return NextResponse.json(
      { error: "Sem permissão para gerenciar ponto" },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0");
    const size = parseInt(searchParams.get("size") || "1000");
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const employeeId = searchParams.get("employeeId")
      ? parseInt(searchParams.get("employeeId")!)
      : undefined;
    const status = searchParams.get("status") as
      | "APPROVED"
      | "PENDING"
      | "REPROVED"
      | undefined;

    const queryParams: Record<string, string | number> = {
      page: page.toString(),
      size: size.toString(),
    };

    if (startDate) {
      queryParams.startDate = startDate;
    }
    if (endDate) {
      queryParams.endDate = endDate;
    }
    if (employeeId) {
      queryParams.employeeId = employeeId;
    }
    if (status) {
      queryParams.status = status;
    }

    const response = await solidesApiClient.get("punch", {
      params: queryParams,
    });

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      const solidesError = handleSolidesError(error);
      const errorDetails = solidesError.details || {};

      return NextResponse.json(
        {
          error: solidesError.message,
          details: errorDetails,
          responseData: error.response?.data,
          status: solidesError.status || 500,
        },
        { status: solidesError.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao buscar pontos" },
      { status: 500 }
    );
  }
}
