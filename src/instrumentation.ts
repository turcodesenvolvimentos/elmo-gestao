// Garante que o servidor use sempre o fuso de Brasilia, independentemente do
// fuso do host. A Vercel roda em UTC, e sem isso TODOS os calculos de ponto
// (horarios exibidos, turno noturno, agrupamento por dia, 50%/100%, adicional
// noturno) ficam deslocados +3h em producao.
//
// A Vercel reserva o nome de variavel "TZ", entao configuramos uma variavel
// personalizada (APP_TIMEZONE) no painel e a aplicamos em process.env.TZ aqui,
// na inicializacao do servidor (roda uma vez, antes de qualquer requisicao).
// O fallback garante o comportamento correto mesmo se a variavel faltar.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";
  }
}
