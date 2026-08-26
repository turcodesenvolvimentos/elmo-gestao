export type OrigemBatida = "SOLIDES" | "MANUAL";

interface LinhaComOrigem {
  employee_id?: number | null;
  date?: string | null;
  origem?: string | null;
}

function chaveDia(row: LinhaComOrigem): string {
  return `${row.employee_id ?? ""}|${(row.date ?? "").slice(0, 10)}`;
}

/**
 * Dias (funcionário + data) que têm pelo menos uma batida lançada à mão.
 */
export function diasComBatidaManual(linhas: LinhaComOrigem[]): Set<string> {
  const dias = new Set<string>();
  for (const linha of linhas) {
    if (linha.origem === "MANUAL") dias.add(chaveDia(linha));
  }
  return dias;
}

/**
 * Batida manual vence a da Sólides: num dia em que alguém lançou ponto à mão,
 * as batidas que vieram da API são descartadas. Sem isso as duas somariam e o
 * boletim pagaria a jornada duas vezes.
 */
export function aplicarPrioridadeManual<T extends LinhaComOrigem>(
  linhas: T[]
): T[] {
  const diasManuais = diasComBatidaManual(linhas);
  if (diasManuais.size === 0) return linhas;

  return linhas.filter(
    (linha) =>
      linha.origem === "MANUAL" || !diasManuais.has(chaveDia(linha))
  );
}

/**
 * Quantas batidas da Sólides estão sendo ocultadas por lançamento manual,
 * por dia. Serve para avisar na tela que existe registro sendo ignorado.
 */
export function batidasOcultadasPorDia(
  linhas: LinhaComOrigem[]
): Map<string, number> {
  const diasManuais = diasComBatidaManual(linhas);
  const ocultadas = new Map<string, number>();

  for (const linha of linhas) {
    if (linha.origem === "MANUAL") continue;
    const chave = chaveDia(linha);
    if (!diasManuais.has(chave)) continue;
    ocultadas.set(chave, (ocultadas.get(chave) ?? 0) + 1);
  }

  return ocultadas;
}

export function horaValida(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{2}:\d{2}$/.test(valor);
}

export function dataValida(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

/**
 * Monta o instante a partir de data e hora locais. Quando a saída é menor que
 * a entrada, entende-se que o turno cruzou a meia-noite e a saída cai no dia
 * seguinte.
 */
export function montarPeriodo(
  data: string,
  entrada: string,
  saida: string | null
): { dateIn: string; dateOut: string | null } {
  const [ano, mes, dia] = data.split("-").map(Number);
  const [hEntrada, mEntrada] = entrada.split(":").map(Number);

  const inicio = new Date(ano, mes - 1, dia, hEntrada, mEntrada, 0, 0);

  if (!saida) {
    return { dateIn: inicio.toISOString(), dateOut: null };
  }

  const [hSaida, mSaida] = saida.split(":").map(Number);
  const fim = new Date(ano, mes - 1, dia, hSaida, mSaida, 0, 0);

  if (fim.getTime() <= inicio.getTime()) {
    fim.setDate(fim.getDate() + 1);
  }

  return { dateIn: inicio.toISOString(), dateOut: fim.toISOString() };
}
