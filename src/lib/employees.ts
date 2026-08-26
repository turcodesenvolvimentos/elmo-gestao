export type OrigemFuncionario = "SOLIDES" | "MANUAL";

export function normalizarCpf(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const digitos = valor.replace(/\D/g, "");
  return digitos.length > 0 ? digitos : null;
}

export function cpfValido(cpf: string): boolean {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digitoVerificador = (ateIndice: number): number => {
    let soma = 0;
    let peso = ateIndice + 1;
    for (let i = 0; i < ateIndice; i += 1) {
      soma += Number(cpf[i]) * peso;
      peso -= 1;
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return (
    digitoVerificador(9) === Number(cpf[9]) &&
    digitoVerificador(10) === Number(cpf[10])
  );
}

export function formatarCpf(cpf: string | null | undefined): string {
  const digitos = normalizarCpf(cpf);
  if (!digitos || digitos.length !== 11) return cpf ?? "";
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

/**
 * Situação efetiva do funcionário. A marcação feita no sistema
 * (`ativo_override`) vence o `fired` que veio da Sólides; quando ela é nula,
 * vale o que a Sólides informou.
 */
export function estaDemitido(row: {
  fired?: boolean | null;
  ativo_override?: boolean | null;
}): boolean {
  if (row.ativo_override === true) return false;
  if (row.ativo_override === false) return true;
  return row.fired ?? false;
}

export const FILTRO_ATIVOS =
  "ativo_override.eq.true,and(ativo_override.is.null,fired.eq.false)";

export const FILTRO_DEMITIDOS =
  "ativo_override.eq.false,and(ativo_override.is.null,fired.eq.true)";

export function dataValida(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}
