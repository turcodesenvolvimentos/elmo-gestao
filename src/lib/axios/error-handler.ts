import { AxiosError } from "axios";

export interface SolidesApiError {
  message: string;
  code: string;
  status?: number;
  details?: unknown;
}

export function handleSolidesError(error: AxiosError): SolidesApiError {
  if (error.code && error.message) {
    return error as SolidesApiError;
  }

  if (error instanceof AxiosError) {
    const { response } = error;

    if (!response) {
      return {
        message: "Erro de conexão com a API Sólides. Verifique sua internet.",
        code: "NETWORK_ERROR",
      };
    }

    if (response.status === 401) {
      return {
        message: "Token de autenticação inválido. Contate o suporte.",
        code: "UNAUTHORIZED",
        status: 401,
      };
    }

    if (response.status === 403) {
      return {
        message: "Você não tem permissão para acessar este recurso.",
        code: "FORBIDDEN",
        status: 403,
      };
    }

    if (response.status === 404) {
      return {
        message: "Recurso não encontrado na API Sólides.",
        code: "NOT_FOUND",
        status: 404,
      };
    }

    if (response.status === 400) {
      return {
        message:
          (response.data as { message?: string })?.message ||
          "Dados inválidos enviados para a API.",
        code: "BAD_REQUEST",
        status: 400,
        details: response.data,
      };
    }

    if (response.status >= 500) {
      return {
        message: "Erro no servidor da Sólides. Tente novamente mais tarde.",
        code: "SERVER_ERROR",
        status: response.status,
      };
    }

    return {
      message: `Erro HTTP ${response.status}: ${response.statusText}`,
      code: "HTTP_ERROR",
      status: response.status,
    };
  }

  return {
    message: "Erro desconhecido ao comunicar com a API.",
    code: "UNKNOWN_ERROR",
  };
}
