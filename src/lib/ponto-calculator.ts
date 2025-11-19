import Holidays from "date-holidays";

const hd = new Holidays("BR");

const INICIO_NOTURNO = 22;
const FIM_NOTURNO = 5;

const FATOR_NOTURNO = 1.142857;
const ADICIONAL_NOTURNO_FATOR = 0.142857;
const MINUTOS_POR_HORA = 60;
const MS_POR_MINUTO = 60 * 1000;

function parseDate(dateValue: string | Date | undefined): Date | null {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    return dateValue;
  }

  if (typeof dateValue === "string") {
    const date1 = new Date(dateValue + "T12:00:00Z");
    if (!isNaN(date1.getTime())) {
      return date1;
    }

    const parts = dateValue.split("/");
    if (parts.length === 3) {
      const date2 = new Date(
        parseInt(parts[2]),
        parseInt(parts[1]) - 1,
        parseInt(parts[0])
      );
      if (!isNaN(date2.getTime())) {
        return date2;
      }
    }
  }

  return null;
}

function isNoturno(hora: number): boolean {
  return hora >= INICIO_NOTURNO || hora < FIM_NOTURNO;
}

export function calcularHorasPorPeriodo(
  punches: Array<{ dateIn?: string; dateOut?: string }>,
  dataReferencia?: string | Date
) {
  const periodos: Array<{ inicio: Date; fim: Date }> = [];
  punches.forEach((punch) => {
    if (!punch.dateIn || !punch.dateOut) return;
    const inicio = new Date(punch.dateIn);
    const fim = new Date(punch.dateOut);

    if (!isNaN(inicio.getTime()) && !isNaN(fim.getTime())) {
      periodos.push({ inicio, fim });
    }
  });

  if (periodos.length === 0) {
    return {
      horasNoturnas: 0,
      horasDiurnas: 0,
      totalHoras: 0,
      horasFictas: 0,
      horasNormais: 0,
      adicionalNoturno: 0,
      extra50Diurno: 0,
      extra50Noturno: 0,
      extra100Diurno: 0,
      extra100Noturno: 0,
      heDomEFer: 0,
    };
  }

  let dataPonto: Date;
  if (dataReferencia) {
    const parsed = parseDate(dataReferencia);
    if (parsed) {
      dataPonto = parsed;
      dataPonto.setHours(12, 0, 0, 0);
    } else {
      dataPonto = new Date(periodos[0].inicio);
      dataPonto.setHours(12, 0, 0, 0);
    }
  } else {
    dataPonto = new Date(periodos[0].inicio);
    dataPonto.setHours(12, 0, 0, 0);
  }

  const diaSemana = dataPonto.getDay();
  const ehFeriado = !!hd.isHoliday(dataPonto);
  const ehDomingo = diaSemana === 0;
  const ehSabado = diaSemana === 6;

  const minutosMarcados: Date[] = [];

  periodos.forEach((periodo) => {
    const inicio = new Date(periodo.inicio);
    const fim = new Date(periodo.fim);

    let atual = new Date(inicio);
    while (atual < fim) {
      minutosMarcados.push(new Date(atual));
      atual = new Date(atual.getTime() + MS_POR_MINUTO);
    }
  });

  let horasDiurnasReais = 0;
  let horasNoturnasReais = 0;
  let horasNormais = 0;
  let horasAdicional = 0;
  let extra50Diurno = 0;
  let extra50NoturnoReais = 0;
  let extra100Diurno = 0;
  let extra100Noturno = 0;
  let duracaoDentroDomingo = 0;

  const cargaHorariaNormal = ehSabado
    ? 4 * MINUTOS_POR_HORA
    : 8 * MINUTOS_POR_HORA;

  for (const minuto of minutosMarcados) {
    const hora = minuto.getHours();
    const tipo = isNoturno(hora) ? "noturna" : "diurna";
    const diaRealMinuto = minuto.getDay();

    if (ehDomingo) {
      if (diaRealMinuto === 0) {
        if (tipo === "diurna") {
          extra100Diurno += 1;
          horasDiurnasReais += 1;
        } else {
          extra100Noturno += 1;
          horasNoturnasReais += 1;
        }
        duracaoDentroDomingo += 1;
        continue;
      } else if (diaRealMinuto === 1) {
        if (duracaoDentroDomingo < 8 * MINUTOS_POR_HORA) {
          horasNormais += 1;
          if (tipo === "diurna") {
            horasDiurnasReais += 1;
          } else {
            horasNoturnasReais += 1;
            horasAdicional += 1;
          }
        } else {
          if (tipo === "diurna") {
            extra50Diurno += 1;
            horasDiurnasReais += 1;
          } else {
            extra50NoturnoReais += 1;
            horasNoturnasReais += 1;
          }
        }
        continue;
      }
    }

    if (ehSabado) {
      const dataMinuto = new Date(
        minuto.getFullYear(),
        minuto.getMonth(),
        minuto.getDate()
      );
      const dataPontoDate = new Date(
        dataPonto.getFullYear(),
        dataPonto.getMonth(),
        dataPonto.getDate()
      );
      if (dataMinuto.getTime() > dataPontoDate.getTime()) {
        if (tipo === "diurna") {
          extra100Diurno += 1;
          horasDiurnasReais += 1;
        } else {
          extra100Noturno += 1;
          horasNoturnasReais += 1;
        }
        continue;
      }
    }

    if (horasNormais < cargaHorariaNormal) {
      horasNormais += 1;
      if (tipo === "diurna") {
        horasDiurnasReais += 1;
      } else {
        horasNoturnasReais += 1;
        horasAdicional += 1;
      }
    } else {
      if (tipo === "diurna") {
        extra50Diurno += 1;
        horasDiurnasReais += 1;
      } else {
        extra50NoturnoReais += 1;
        horasNoturnasReais += 1;
      }
    }
  }

  const horasDiurnasReaisHoras = horasDiurnasReais / MINUTOS_POR_HORA;
  const horasNoturnasReaisHoras = horasNoturnasReais / MINUTOS_POR_HORA;
  let horasNormaisHoras = horasNormais / MINUTOS_POR_HORA;
  let horasAdicionalHoras = horasAdicional / MINUTOS_POR_HORA;
  let extra50DiurnoHoras = extra50Diurno / MINUTOS_POR_HORA;
  const extra50NoturnoReaisHoras = extra50NoturnoReais / MINUTOS_POR_HORA;
  const extra100DiurnoHoras = extra100Diurno / MINUTOS_POR_HORA;
  const extra100NoturnoHoras =
    (extra100Noturno / MINUTOS_POR_HORA) * FATOR_NOTURNO;

  const horasFictas = horasNoturnasReaisHoras * ADICIONAL_NOTURNO_FATOR;

  let horasNoturnas = 0;
  let horasTotal = 0;
  let extra50Noturno = 0;

  if (diaSemana >= 1 && diaSemana <= 5 && !ehFeriado) {
    horasNoturnas = horasNoturnasReaisHoras * FATOR_NOTURNO;
    const jornadaTotal = horasDiurnasReaisHoras + horasNoturnas;
    const cargaHorariaDiaria = 8;

    if (jornadaTotal < cargaHorariaDiaria) {
      horasNormaisHoras = jornadaTotal;
    }

    horasTotal = horasDiurnasReaisHoras + horasNoturnas;
    extra50Noturno =
      extra50NoturnoReaisHoras * FATOR_NOTURNO +
      horasAdicionalHoras * ADICIONAL_NOTURNO_FATOR;
  } else if (ehSabado) {
    horasNoturnas = horasNoturnasReaisHoras * FATOR_NOTURNO;
    const jornadaTotal = horasDiurnasReaisHoras + horasNoturnas;
    const cargaHorariaDiaria = 4;

    extra50Noturno = extra50NoturnoReaisHoras * FATOR_NOTURNO;

    if (horasAdicionalHoras > 0) {
      extra50Noturno += horasAdicionalHoras * ADICIONAL_NOTURNO_FATOR;
    }

    if (jornadaTotal < cargaHorariaDiaria) {
      horasNormaisHoras = jornadaTotal;
      horasAdicionalHoras = horasNoturnas;
    } else {
      horasNormaisHoras = cargaHorariaDiaria;
    }

    horasTotal = horasDiurnasReaisHoras + horasNoturnas;
  } else if (ehDomingo || ehFeriado) {
    horasNoturnas = horasNoturnasReaisHoras * FATOR_NOTURNO;

    const jornadaTotal = horasDiurnasReaisHoras + horasNoturnas;
    const cargaHorariaDiaria = 8;

    if (jornadaTotal < cargaHorariaDiaria) {
      horasNormaisHoras = jornadaTotal;
    } else {
      horasNormaisHoras = Math.max(
        0,
        cargaHorariaDiaria - (extra100DiurnoHoras + extra100NoturnoHoras)
      );

      extra50Noturno =
        extra50NoturnoReaisHoras * FATOR_NOTURNO +
        horasAdicionalHoras * ADICIONAL_NOTURNO_FATOR;
    }

    horasTotal = horasDiurnasReaisHoras + horasNoturnas;
  }

  let adicionalNoturno =
    ehDomingo || ehFeriado
      ? horasNormaisHoras
      : horasNoturnasReaisHoras +
        horasFictas -
        (extra50NoturnoReaisHoras + horasFictas);

  if (ehDomingo || ehFeriado) {
    if (extra100NoturnoHoras + extra100DiurnoHoras >= 8) {
      horasNormaisHoras = 0;
      adicionalNoturno = 0;
    }
  }

  const entradaInicial = periodos[0].inicio;
  const saidaFinal = periodos[periodos.length - 1].fim;

  const diaSemanaEntrada = entradaInicial.getDay();
  const ehFeriadoEntrada = !!hd.isHoliday(entradaInicial);
  const entradaEhDomingoOuFeriado = diaSemanaEntrada === 0 || ehFeriadoEntrada;

  const diaSemanaSaida = saidaFinal.getDay();
  const ehFeriadoSaida = !!hd.isHoliday(saidaFinal);
  const saidaEhDiaUtil =
    diaSemanaSaida >= 1 && diaSemanaSaida <= 5 && !ehFeriadoSaida;

  if (entradaEhDomingoOuFeriado && saidaEhDiaUtil) {
    const extra50Total = horasTotal - 8;

    const horaSaidaFinal = saidaFinal.getHours();

    if (horaSaidaFinal >= INICIO_NOTURNO || horaSaidaFinal < FIM_NOTURNO) {
      extra50DiurnoHoras = 0;
      extra50Noturno = extra50Total;
    } else {
      const inicioExtra50 = new Date(
        saidaFinal.getTime() - extra50Total * MINUTOS_POR_HORA * MS_POR_MINUTO
      );

      let extra50DiurnoCalculado = 0;
      let extra50NoturnoCalculado = 0;

      let atual = new Date(inicioExtra50);
      const fim = new Date(saidaFinal);

      while (atual < fim) {
        const hora = atual.getHours();
        if (isNoturno(hora)) {
          extra50NoturnoCalculado += 1 / MINUTOS_POR_HORA;
        } else {
          extra50DiurnoCalculado += 1 / MINUTOS_POR_HORA;
        }
        atual = new Date(atual.getTime() + MS_POR_MINUTO);
      }

      extra50DiurnoHoras = extra50DiurnoCalculado;
      extra50Noturno = extra50NoturnoCalculado;
    }
  }

  const heDomEFer = horasNormaisHoras === 0 ? horasTotal : 0;

  return {
    horasNoturnas: horasNoturnas,
    horasDiurnas: horasDiurnasReaisHoras,
    totalHoras: horasTotal,
    horasFictas: horasFictas,
    horasNormais: horasNormaisHoras,
    adicionalNoturno: adicionalNoturno,
    extra50Diurno: extra50DiurnoHoras,
    extra50Noturno: extra50Noturno,
    extra100Diurno: extra100DiurnoHoras,
    extra100Noturno: extra100NoturnoHoras,
    heDomEFer: heDomEFer,
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
