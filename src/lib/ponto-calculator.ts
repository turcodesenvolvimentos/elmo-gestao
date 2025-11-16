import Holidays from "date-holidays";

const hd = new Holidays("BR");

function calcularHorasEntreDatas(inicio: Date, fim: Date): number {
  const diferencaMs = fim.getTime() - inicio.getTime();
  return diferencaMs / (1000 * 60 * 60);
}

function ehHorarioNoturno(hora: number): boolean {
  return hora >= 22 || hora < 5;
}

export function calcularHorasPorPeriodo(
  punches: Array<{ dateIn?: string; dateOut?: string }>
) {
  const horasReaisTrabalhadasPorDia = new Map<string, number>();

  const periodos: Array<{ inicio: Date; fim: Date }> = [];
  punches.forEach((punch) => {
    if (!punch.dateIn || !punch.dateOut) return;
    periodos.push({
      inicio: new Date(punch.dateIn),
      fim: new Date(punch.dateOut),
    });
  });

  periodos.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  let totalHorasNoturnas = 0;
  let totalHorasDiurnas = 0;
  let horasNormaisNoturnas = 0;
  let horasNormaisDiurnas = 0;
  let horasExtrasNoturnas50 = 0;
  let horasExtrasDiurnas50 = 0;
  let horasExtrasNoturnas100 = 0;
  let horasExtrasDiurnas100 = 0;

  periodos.forEach((periodo) => {
    let horaAtual = new Date(periodo.inicio);

    while (horaAtual < periodo.fim) {
      const proximaHora = new Date(horaAtual);
      proximaHora.setHours(horaAtual.getHours() + 1, 0, 0, 0);

      const fimPeriodo = proximaHora > periodo.fim ? periodo.fim : proximaHora;
      const horasNoPeriodo = calcularHorasEntreDatas(horaAtual, fimPeriodo);

      const diaAtual = horaAtual.getDay();
      const currentDateStr = new Date(
        Date.UTC(
          horaAtual.getFullYear(),
          horaAtual.getMonth(),
          horaAtual.getDate()
        )
      )
        .toISOString()
        .slice(0, 10);

      const horaAtualNum = horaAtual.getHours();
      const ehFeriadoHora = !!hd.isHoliday(horaAtual);
      const eh100 = diaAtual === 0 || ehFeriadoHora;
      const ehNoturno = ehHorarioNoturno(horaAtualNum);

      let cargaHorariaDoDia = 0;
      if (ehFeriadoHora || diaAtual === 0) {
        cargaHorariaDoDia = 0;
      } else if (diaAtual >= 1 && diaAtual <= 5) {
        cargaHorariaDoDia = 8;
      } else if (diaAtual === 6) {
        cargaHorariaDoDia = 4;
      }

      const horasTrabalhadasAcumuladasNoDia =
        horasReaisTrabalhadasPorDia.get(currentDateStr) ?? 0;
      const horasRestantesParaCargaHoraria = Math.max(
        0,
        cargaHorariaDoDia - horasTrabalhadasAcumuladasNoDia
      );

      let horasNormaisNestePeriodo = 0;
      let horasExtrasNestePeriodo = 0;

      if (horasRestantesParaCargaHoraria > 0) {
        horasNormaisNestePeriodo = Math.min(
          horasNoPeriodo,
          horasRestantesParaCargaHoraria
        );
        horasExtrasNestePeriodo = horasNoPeriodo - horasNormaisNestePeriodo;
      } else {
        horasExtrasNestePeriodo = horasNoPeriodo;
      }

      const horasNormaisReais = horasNormaisNestePeriodo;
      const horasExtrasReais = horasExtrasNestePeriodo;

      if (ehNoturno) {
        totalHorasNoturnas += horasNoPeriodo;
        horasNormaisNoturnas += horasNormaisReais;
        if (horasExtrasReais > 0) {
          if (eh100) {
            horasExtrasNoturnas100 += horasExtrasReais;
          } else {
            horasExtrasNoturnas50 += horasExtrasReais;
          }
        }
      } else {
        totalHorasDiurnas += horasNoPeriodo;
        horasNormaisDiurnas += horasNormaisReais;
        if (horasExtrasReais > 0) {
          if (eh100) {
            horasExtrasDiurnas100 += horasExtrasReais;
          } else {
            horasExtrasDiurnas50 += horasExtrasReais;
          }
        }
      }

      horasReaisTrabalhadasPorDia.set(
        currentDateStr,
        (horasReaisTrabalhadasPorDia.get(currentDateStr) ?? 0) + horasNoPeriodo
      );

      horaAtual = fimPeriodo;
    }
  });

  const totalHoras = totalHorasNoturnas * 1.142857 + totalHorasDiurnas;
  const horasFictas = totalHorasNoturnas * 0.142857;
  const horasNormais = horasNormaisDiurnas + horasNormaisNoturnas;

  const extra50Diurno = horasExtrasDiurnas50;
  const extra50Noturno = horasExtrasNoturnas50 * 1.142857;

  return {
    horasNoturnas: totalHorasNoturnas * 1.142857,
    horasDiurnas: totalHorasDiurnas,
    totalHoras: totalHoras,
    horasFictas: horasFictas,
    horasNormais: horasNormais,
    adicionalNoturno: horasNormaisNoturnas * 1.142857,
    extra50Diurno: extra50Diurno,
    extra50Noturno: extra50Noturno,
    extra100Diurno: horasExtrasDiurnas100,
    extra100Noturno: horasExtrasNoturnas100 * 1.142857,
  };
}

export function formatarHoras(horas: number): string {
  let horasInteiras = Math.floor(horas);
  let minutos = Math.round((horas - horasInteiras) * 60);
  if (minutos >= 60) {
    horasInteiras += Math.floor(minutos / 60);
    minutos = minutos % 60;
  }
  return `${String(horasInteiras).padStart(2, "0")}:${String(minutos).padStart(
    2,
    "0"
  )}`;
}
