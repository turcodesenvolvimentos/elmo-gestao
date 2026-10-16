export const TIPOS_AFASTAMENTO = [
  { value: "atestado_medico", label: "Atestado médico" },
  { value: "declaracao_comparecimento", label: "Declaração de comparecimento" },
  { value: "licenca_nojo", label: "Licença nojo" },
  { value: "licenca_gala", label: "Licença gala" },
  { value: "licenca_paternidade", label: "Licença paternidade" },
  { value: "outro", label: "Outro" },
] as const;

export type TipoAfastamento = (typeof TIPOS_AFASTAMENTO)[number]["value"];

export const TIPO_AFASTAMENTO_PADRAO: TipoAfastamento = "atestado_medico";

export function isTipoAfastamento(value: unknown): value is TipoAfastamento {
  return TIPOS_AFASTAMENTO.some((t) => t.value === value);
}

export function getTipoAfastamentoLabel(value?: string | null): string {
  return (
    TIPOS_AFASTAMENTO.find((t) => t.value === value)?.label ??
    TIPOS_AFASTAMENTO[0].label
  );
}

export interface Atestado {
  id: string;
  employee_id: string;
  employee_name: string;
  start_date: string; // formato "YYYY-MM-DD"
  days: number;
  tipo?: TipoAfastamento;
  considerar_fds_feriado?: boolean;
  nao_cobrar_cliente?: boolean;
  created_at?: string;
}

export interface CreateAtestadoData {
  employee_id: string;
  employee_name: string;
  start_date: string;
  days: number;
  tipo: TipoAfastamento;
  considerar_fds_feriado: boolean;
  nao_cobrar_cliente: boolean;
}

export interface UpdateAtestadoData extends CreateAtestadoData {
  id: string;
}

export interface AtestadosResponse {
  atestados: Atestado[];
}
