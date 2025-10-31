import { NextRequest, NextResponse } from "next/server";
import { solidesApiClient } from "@/lib/axios/solides.client";
import { handleSolidesError } from "@/lib/axios/error-handler";
import { AxiosError } from "axios";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0");
    const size = parseInt(searchParams.get("size") || "50");
    const employeeId = searchParams.get("employeeId")
      ? parseInt(searchParams.get("employeeId")!)
      : undefined;
    const status = searchParams.get("status") as
      | "APPROVED"
      | "PENDING"
      | "REPROVED"
      | undefined;

    const queryParams: Record<string, string> = {
      page: page.toString(),
      size: size.toString(),
    };

    if (employeeId) queryParams.employeeId = employeeId.toString();
    if (status) queryParams.status = status;

    const response = await solidesApiClient.get("punch/", {
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
