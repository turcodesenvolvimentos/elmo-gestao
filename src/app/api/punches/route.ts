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

    const queryParams: Record<string, string | number> = {
      page: page.toString(),
      size: size.toString(),
    };

    if (startDate) {
      queryParams.initialDate = startDate;
    }
    if (endDate) {
      queryParams.finalDate = endDate;
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

    let content = response.data?.content || [];

    if (startDate || endDate) {
      const startDateObj = startDate ? new Date(startDate + "T00:00:00") : null;
      const endDateObj = endDate ? new Date(endDate + "T23:59:59") : null;

      content = content.filter(
        (punch: { date?: string; dateIn?: string; dateOut?: string }) => {
          const punchDateStr =
            punch.date || punch.dateIn || punch.dateOut || "";
          if (!punchDateStr) return false;

          const punchDate = new Date(punchDateStr);

          if (startDateObj && punchDate < startDateObj) return false;
          if (endDateObj && punchDate > endDateObj) return false;

          return true;
        }
      );
    }

    return NextResponse.json({
      ...response.data,
      content,
    });
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      const solidesError = handleSolidesError(error);
      const errorDetails = solidesError.details || {};

      console.error("Erro Sólides:", {
        message: solidesError.message,
        status: solidesError.status,
        details: errorDetails,
        url: error.config?.url,
        params: error.config?.params,
        responseData: error.response?.data,
        headers: error.config?.headers,
      });

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
