/**
 * Utilitários para relatórios PDF (formatação em pt-BR, CPF, CNPJ).
 */

export const ELMO_CNPJ = "00.000.000/0001-00";

export function formatCPF(cpf?: string | null): string {
  if (!cpf) return "-";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return cpf;
}

export function formatAdmissionDate(date?: string | null): string {
  if (!date) return "-";
  try {
    const d = date.includes("T") ? new Date(date) : new Date(date + "T12:00:00Z");
    return d.toLocaleDateString("pt-BR");
  } catch {
    return date;
  }
}
