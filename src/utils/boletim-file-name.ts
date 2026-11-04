// "2026-10-01" ou "01/10/2026" -> "01-10-2026"
function formatFileDate(date: string): string {
  const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  return date.replace(/\//g, "-");
}

export interface BoletimFileNameParams {
  companyName: string;
  startDate: string;
  endDate: string;
  // Dia do filtro "Dia" do boletim, quando aplicado
  date?: string;
}

// Ex.: "Boletim - Elmo (Matriz) - 01-10-2026 a 21-10-2026.pdf"
export function buildBoletimFileName({
  companyName,
  startDate,
  endDate,
  date,
}: BoletimFileNameParams): string {
  const period = date
    ? formatFileDate(date)
    : startDate === endDate
      ? formatFileDate(startDate)
      : `${formatFileDate(startDate)} a ${formatFileDate(endDate)}`;

  // Nome da empresa exatamente como está cadastrado no sistema
  const parts = ["Boletim", companyName.trim().replace(/\s+/g, " "), period];

  // Remove caracteres que o Windows não aceita em nomes de arquivo
  return `${parts.join(" - ").replace(/[\\/:*?"<>|]/g, "-")}.pdf`;
}

// Header Content-Disposition com nome em ASCII (fallback) e em UTF-8
export function contentDispositionAttachment(fileName: string): string {
  const ascii = fileName.normalize("NFD").replace(/[^\x20-\x7E]/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
