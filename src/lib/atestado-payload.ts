import {
  TIPO_AFASTAMENTO_PADRAO,
  TipoAfastamento,
  isTipoAfastamento,
} from "@/types/atestados";

export interface AtestadoPayload {
  employee_id: string;
  employee_name: string;
  start_date: string;
  days: number;
  tipo: TipoAfastamento;
  considerar_fds_feriado: boolean;
  nao_cobrar_cliente: boolean;
}

export type AtestadoPayloadResult =
  | { ok: true; payload: AtestadoPayload }
  | { ok: false; error: string };

export function parseAtestadoPayload(body: unknown): AtestadoPayloadResult {
  const {
    employee_id,
    employee_name,
    start_date,
    days,
    tipo,
    considerar_fds_feriado,
    nao_cobrar_cliente,
  } = (body ?? {}) as Record<string, unknown>;

  if (!employee_id || !employee_name || !start_date) {
    return {
      ok: false,
      error: "Campos obrigatórios: employee_id, employee_name, start_date",
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(start_date))) {
    return { ok: false, error: "Dia inicial inválido" };
  }

  const parsedDays = Number(days);
  if (!Number.isInteger(parsedDays) || parsedDays < 1) {
    return {
      ok: false,
      error: "Quantidade de dias deve ser um número inteiro maior que zero",
    };
  }

  if (tipo !== undefined && tipo !== null && !isTipoAfastamento(tipo)) {
    return { ok: false, error: "Tipo de afastamento inválido" };
  }

  return {
    ok: true,
    payload: {
      employee_id: String(employee_id),
      employee_name: String(employee_name),
      start_date: String(start_date),
      days: parsedDays,
      tipo: isTipoAfastamento(tipo) ? tipo : TIPO_AFASTAMENTO_PADRAO,
      considerar_fds_feriado: considerar_fds_feriado === true,
      nao_cobrar_cliente: nao_cobrar_cliente === true,
    },
  };
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23505"
  );
}

export const ATESTADO_DUPLICADO_MSG =
  "Já existe um atestado desse funcionário começando nesse dia";
