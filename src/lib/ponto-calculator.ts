import Holidays from "date-holidays";

const hd = new Holidays("BR");

function calcularHorasEntreDatas(inicio: Date, fim: Date): number {
  const diferencaMs = fim.getTime() - inicio.getTime();
  return diferencaMs / (1000 * 60 * 60);
}

export function calcularHorasPorPeriodo(
  punches: Array<{ dateIn?: string; dateOut?: string }>,
  dataReferencia?: string | Date
) {
  const periodos: Array<{ inicio: Date; fim: Date }> = [];
  punches.forEach((punch) => {
    if (!punch.dateIn || !punch.dateOut) return;
    periodos.push({
      inicio: new Date(punch.dateIn),
      fim: new Date(punch.dateOut),
    });
  });

  periodos.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const CARGA_HORARIA_DIA_NORMAL = 8;
  const CARGA_HORARIA_SABADO = 4;

  let dataPonto: Date;
  if (dataReferencia) {
    dataPonto =
      typeof dataReferencia === "string"
        ? new Date(dataReferencia + "T12:00:00Z")
        : dataReferencia;
  } else if (periodos.length > 0) {
    dataPonto = new Date(periodos[0].inicio);
    dataPonto.setHours(12, 0, 0, 0);
  } else {
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

  const diaSemana = dataPonto.getDay();
  const ehFeriado = !!hd.isHoliday(dataPonto);
  const ehDomingo = diaSemana === 0;
  const ehSabado = diaSemana === 6;

  let horasTrabalhadasTotais = 0;
  periodos.forEach((periodo) => {
    const horasPeriodo = calcularHorasEntreDatas(periodo.inicio, periodo.fim);
    horasTrabalhadasTotais += horasPeriodo;
  });

  let horasNoturnasTrabalhadas = 0;

  periodos.forEach((periodo) => {
    const inicio = new Date(periodo.inicio);
    const fim = new Date(periodo.fim);

    let horaAtual = new Date(inicio);

    while (horaAtual < fim) {
      const horaAtualNum = horaAtual.getHours();
      let horasNoturnasNesteSegmento = 0;

      if (horaAtualNum >= 22) {
        const fimNoturno = new Date(horaAtual);
        fimNoturno.setDate(fimNoturno.getDate() + 1);
        fimNoturno.setHours(5, 0, 0, 0);

        const fimSegmento = fim < fimNoturno ? fim : fimNoturno;
        horasNoturnasNesteSegmento = calcularHorasEntreDatas(
          horaAtual,
          fimSegmento
        );
        horasNoturnasTrabalhadas += horasNoturnasNesteSegmento;

        horaAtual = fimSegmento;
      } else if (horaAtualNum < 5) {
        const fimNoturno = new Date(horaAtual);
        fimNoturno.setHours(5, 0, 0, 0);

        if (fimNoturno <= horaAtual) {
          const proximaHoraCheia = new Date(horaAtual);
          proximaHoraCheia.setHours(horaAtualNum + 1, 0, 0, 0);
          horaAtual = proximaHoraCheia > fim ? fim : proximaHoraCheia;
        } else {
          const fimSegmento = fim < fimNoturno ? fim : fimNoturno;
          horasNoturnasNesteSegmento = calcularHorasEntreDatas(
            horaAtual,
            fimSegmento
          );
          horasNoturnasTrabalhadas += horasNoturnasNesteSegmento;
          horaAtual = fimSegmento;
        }
      } else {
        const proximaHoraCheia = new Date(horaAtual);
        proximaHoraCheia.setHours(horaAtualNum + 1, 0, 0, 0);
        horaAtual = proximaHoraCheia > fim ? fim : proximaHoraCheia;
      }
    }
  });

  const horasFictas = horasNoturnasTrabalhadas / 7;

  horasTrabalhadasTotais = horasTrabalhadasTotais + horasFictas;

  const horasNoturnasTotais = horasNoturnasTrabalhadas + horasFictas;

  const horasDiurnas = horasTrabalhadasTotais - horasNoturnasTotais;

  let horasNormais = 0;
  if (ehFeriado || ehDomingo) {
    horasNormais = 0;
  } else if (ehSabado) {
    horasNormais = Math.min(CARGA_HORARIA_SABADO, horasTrabalhadasTotais);
  } else {
    horasNormais = Math.min(CARGA_HORARIA_DIA_NORMAL, horasTrabalhadasTotais);
  }

  let horasExtras = 0;
  if (ehDomingo || ehFeriado) {
    horasExtras = horasTrabalhadasTotais;
  } else if (horasNormais === 0) {
    horasExtras = 0;
  } else {
    if (ehSabado) {
      horasExtras = Math.max(0, horasTrabalhadasTotais - CARGA_HORARIA_SABADO);
    } else {
      horasExtras = Math.max(
        0,
        horasTrabalhadasTotais - CARGA_HORARIA_DIA_NORMAL
      );
    }
  }

  let horasNormaisDiurnas = 0;
  let horasNormaisNoturnas = 0;
  let horasExtrasDiurnas = 0;
  let horasExtrasNoturnas = 0;

  if (horasTrabalhadasTotais > 0) {
    const proporcaoNoturnas = horasNoturnasTotais / horasTrabalhadasTotais;
    const proporcaoDiurnas = horasDiurnas / horasTrabalhadasTotais;

    horasNormaisNoturnas = horasNormais * proporcaoNoturnas;
    horasNormaisDiurnas = horasNormais * proporcaoDiurnas;

    horasExtrasNoturnas = horasExtras * proporcaoNoturnas;
    horasExtrasDiurnas = horasExtras * proporcaoDiurnas;
  }

  let horasExtrasDiurnas50 = horasExtrasDiurnas;
  let horasExtrasDiurnas100 = 0;
  let horasExtrasNoturnas50 = horasExtrasNoturnas;
  let horasExtrasNoturnas100 = 0;

  if (ehDomingo || ehFeriado) {
    horasExtrasDiurnas100 = horasExtrasDiurnas;
    horasExtrasDiurnas50 = 0;
    horasExtrasNoturnas100 = horasExtrasNoturnas;
    horasExtrasNoturnas50 = 0;
  }

  const fatorNoturno = 1.142857;
  const adicionalNoturnoFator = 0.142857;
  const adicionalNoturno = horasNormaisNoturnas * adicionalNoturnoFator;

  const horasNoturnasComFator =
    horasNormaisNoturnas * fatorNoturno +
    horasExtrasNoturnas50 +
    horasExtrasNoturnas100;

  const totalHoras =
    horasNormaisDiurnas +
    horasNormaisNoturnas * fatorNoturno +
    horasExtrasDiurnas50 +
    horasExtrasDiurnas100 +
    horasExtrasNoturnas50 +
    horasExtrasNoturnas100;

  const heDomEFer = horasNormais === 0 ? horasTrabalhadasTotais : 0;

  return {
    horasNoturnas: horasNoturnasComFator,
    horasDiurnas: horasDiurnas,
    totalHoras: totalHoras,
    horasFictas: horasFictas,
    horasNormais: horasNormais,
    adicionalNoturno: adicionalNoturno,
    extra50Diurno: horasExtrasDiurnas50,
    extra50Noturno: horasExtrasNoturnas50,
    extra100Diurno: horasExtrasDiurnas100,
    extra100Noturno: horasExtrasNoturnas100,
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
