import { NextRequest, NextResponse } from "next/server";
import { solidesEmployerClient } from "@/lib/axios/solides.client";
import { handleSolidesError } from "@/lib/axios/error-handler";
import { AxiosError } from "axios";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "10");
    const showFired = searchParams.get("showFired")
      ? parseInt(searchParams.get("showFired")!)
      : undefined;

    const response = await solidesEmployerClient.get("/employee/find-all", {
      params: { page, size, showFired },
    });

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
      { error: "Erro ao buscar funcionários" },
      { status: 500 }
    );
  }
}
