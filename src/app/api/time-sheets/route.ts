import { NextRequest, NextResponse } from "next/server";
import { solidesApiClient } from "@/lib/axios/solides.client";
import { handleSolidesError } from "@/lib/axios/error-handler";
import { AxiosError } from "axios";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate e endDate são obrigatórios" },
        { status: 400 }
      );
    }

    const employeeId = searchParams.get("employeeId")
      ? parseInt(searchParams.get("employeeId")!)
      : undefined;
    const companyId = searchParams.get("companyId")
      ? parseInt(searchParams.get("companyId")!)
      : undefined;
    const format = (searchParams.get("format") || "PDF") as
      | "PDF"
      | "XLS"
      | "JPG";

    const params = new URLSearchParams({
      startDate,
      endDate,
      format,
    });

    if (employeeId) params.append("employeeId", employeeId.toString());
    if (companyId) params.append("companyId", companyId.toString());

    const response = await solidesApiClient.get(
      `/report/time-sheet?${params.toString()}`
    );
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      const solidesError = handleSolidesError(error);
      return NextResponse.json(
        { error: solidesError.message },
        { status: solidesError.status || 500 }
      );
    }
    return NextResponse.json(
      { error: "Erro ao gerar relatório" },
      { status: 500 }
    );
  }
}
