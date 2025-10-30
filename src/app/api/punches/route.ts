import { NextRequest, NextResponse } from "next/server";
import { solidesApiClient } from "@/lib/axios/solides.client";
import { handleSolidesError } from "@/lib/axios/error-handler";
import { AxiosError } from "axios";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0");
    const size = parseInt(searchParams.get("size") || "50");
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

    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (employeeId) params.append("employeeId", employeeId.toString());
    if (status) params.append("status", status);

    const response = await solidesApiClient.get(`punch/?${params.toString()}`);
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
      { error: "Erro ao buscar pontos" },
      { status: 500 }
    );
  }
}
