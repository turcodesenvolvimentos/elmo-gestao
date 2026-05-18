/* eslint-disable jsx-a11y/alt-text */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { formatEmployeeName } from "@/utils/employee-name-format";

// Mesma paleta usada no PDF do Ponto, adaptada para o layout horizontal do
// boletim. Ver `ponto-pdf.tsx` para a referência de cores.
const NUM_FONT = 7;
const HEADER_FONT = 7;
const NAME_FONT = 8;

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 40,
    paddingHorizontal: 18,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 8,
    borderBottom: "2px solid #065F46",
    paddingBottom: 6,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  logoContainer: {
    marginRight: 10,
  },
  logo: {
    width: 40,
    height: 40,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#065F46",
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 9,
    color: "#065F46",
    marginBottom: 2,
  },
  info: {
    fontSize: 7,
    color: "#4b5563",
    marginBottom: 1,
  },
  // ---------------------------------------------------------------------
  // Resumo do período (cards no topo)
  // ---------------------------------------------------------------------
  summarySection: {
    marginTop: 4,
    marginBottom: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 6,
  },
  summaryItem: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    border: "1px solid #d1d5db",
    borderRadius: 2,
    backgroundColor: "#f9fafb",
  },
  summaryLabel: {
    fontSize: 6.5,
    color: "#4b5563",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#065F46",
  },
  // ---------------------------------------------------------------------
  // Tabela
  // ---------------------------------------------------------------------
  table: {
    width: "100%",
    marginTop: 4,
    border: "1px solid #d1d5db",
    borderRadius: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#065F46",
    color: "#ffffff",
    paddingVertical: 4,
    paddingHorizontal: 0,
    fontWeight: "bold",
    fontSize: HEADER_FONT,
    alignItems: "center",
  },
  // Barra que separa os dias dentro da tabela — funciona como um cabeçalho
  // por dia: o lado esquerdo (Colaborador/Função/Setor/Empresa) é fundido
  // num único rótulo com a data, e à direita repetimos os títulos das
  // colunas de horas e valor pra ficar claro o que cada coluna representa.
  dayBar: {
    flexDirection: "row",
    backgroundColor: "#16a34a",
    color: "#ffffff",
    paddingVertical: 2,
    paddingHorizontal: 0,
    alignItems: "center",
    fontSize: HEADER_FONT,
    fontWeight: "bold",
  },
  // Largura combinada de col_emp(13) + col_fn(8) + col_setor(7) + col_emp_dia(10).
  dayBarLabel: {
    width: "42%",
    paddingHorizontal: 6,
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dayBarCell: {
    paddingHorizontal: 2,
    textAlign: "center",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5px solid #e5e7eb",
    paddingVertical: 3,
    paddingHorizontal: 0,
    minHeight: 14,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  tableTotalRow: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb",
    borderTop: "1.5px solid #1f2937",
    paddingVertical: 6,
    paddingHorizontal: 0,
    fontWeight: "bold",
    fontSize: NUM_FONT,
  },
  cellLeft: {
    paddingHorizontal: 4,
    borderRight: "0.5px solid #e5e7eb",
    overflow: "hidden",
  },
  cellCenter: {
    paddingHorizontal: 2,
    textAlign: "center",
    borderRight: "0.5px solid #e5e7eb",
  },
  cellLast: {
    paddingHorizontal: 2,
    textAlign: "center",
  },
  // ---------------------------------------------------------------------
  // Larguras das colunas (soma = 100%)
  // ---------------------------------------------------------------------
  // Colaborador, Função, Setor, Empresa (dia) -- bloco de identificação
  col_emp: { width: "13%", fontSize: NAME_FONT, textOverflow: "ellipsis" },
  col_fn: { width: "8%", fontSize: NUM_FONT },
  col_setor: { width: "7%", fontSize: NUM_FONT },
  col_emp_dia: { width: "8%", fontSize: NUM_FONT },
  col_emp_dia_content: { width: "8%", paddingHorizontal: 3, alignItems: "center", justifyContent: "center" },
  // Dia (numérico) — sem coluna de dia da semana porque "Segunda-feira"
  // quebrava a linha. O dia da semana segue aparecendo na barra do dia.
  col_data: { width: "6%", fontSize: NUM_FONT },
  // Marcações — col_e1 e col_s2 ganham padding extra + borda mais visível
  // pra criar um respiro entre o bloco de Ent./Saí. e as colunas vizinhas.
  col_e1: { width: "4.5%", fontSize: NUM_FONT },
  col_s1: { width: "4.5%", fontSize: NUM_FONT },
  col_e2: { width: "4.5%", fontSize: NUM_FONT },
  col_s2: { width: "4.5%", fontSize: NUM_FONT },
  punchEdgeLeft: {
    paddingLeft: 8,
    borderLeft: "1px solid #94a3b8",
  },
  punchEdgeRight: {
    paddingRight: 8,
    borderRight: "1px solid #94a3b8",
  },
  // Horas
  col_total: { width: "4.5%", fontSize: NUM_FONT },
  col_normal: { width: "4.5%", fontSize: NUM_FONT },
  col_adn: { width: "4%", fontSize: NUM_FONT },
  col_50d: { width: "4%", fontSize: NUM_FONT },
  col_50n: { width: "4%", fontSize: NUM_FONT },
  col_100d: { width: "4%", fontSize: NUM_FONT },
  col_100n: { width: "4%", fontSize: NUM_FONT },
  // Valor
  col_valor: { width: "13%", fontSize: NUM_FONT, textAlign: "right" },
  missingCell: {
    backgroundColor: "#ff3f3d",
    color: "#991B1B",
    fontWeight: "bold",
  },
  companyBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 2,
    paddingVertical: 1,
    alignSelf: "center",
    borderRadius: 2,
  },
  companyBadgeText: {
    fontSize: 5.5,
    color: "#92400E",
    fontWeight: "bold",
  },
  companyText: {
    fontSize: NUM_FONT,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 18,
    right: 18,
    textAlign: "center",
    fontSize: 7,
    color: "#666",
    borderTop: "1px solid #ddd",
    paddingTop: 6,
  },
});

interface BoletimData {
  employee_name: string;
  work_company?: string;
  position: string;
  department: string;
  date: string;
  day_of_week: string;
  entry1?: string;
  exit1?: string;
  entry2?: string;
  exit2?: string;
  total_hours: string;
  normal_hours: string;
  night_additional?: string;
  extra_50_day: string;
  extra_50_night: string;
  extra_100_day: string;
  extra_100_night: string;
  value: number;
}

interface BoletimPDFProps {
  companyName: string;
  startDate: string;
  endDate: string;
  data: BoletimData[];
  logoBase64?: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString + "T12:00:00Z");
  return date.toLocaleDateString("pt-BR");
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const isNoCompany = (value?: string | null): boolean =>
  (value || "").trim().toLowerCase() === "não escalado";

/**
 * Trunca o nome do colaborador para caber em uma linha na coluna.
 * Em ~32 caracteres já não cabe na largura de 13% da página landscape com
 * fonte 8 — o `maxLines: 1` + `textOverflow: "ellipsis"` cuidam do corte
 * visual, mas este corte por JS é fallback caso o ellipsis falhe.
 */
const truncateName = (name: string, max = 32): string => {
  if (!name) return "";
  return name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name;
};

/** Pega os primeiros `count` nomes de uma string já formatada. */
const takeFirstNames = (formatted: string, count: number): string => {
  if (!formatted) return "";
  return formatted.trim().split(/\s+/).filter(Boolean).slice(0, count).join(" ");
};

/**
 * Constrói um mapa `nomeOriginal -> nomeExibido` para a tabela.
 *
 * Regra:
 *  1. Por padrão exibe os 2 primeiros nomes.
 *  2. Se 2+ funcionários compartilham a mesma versão de 2 nomes, todos
 *     ganham o 3º nome para diferenciar.
 *  3. Se ainda assim houver empate (mesma versão de 3 nomes), caímos para
 *     o nome completo formatado — fica longo mas pelo menos correto.
 */
const buildDisplayNameMap = (
  rows: { employee_name: string }[],
): Map<string, string> => {
  const map = new Map<string, string>();
  if (rows.length === 0) return map;

  const uniqueFormatted = new Map<string, string>(); // original -> formatted
  for (const r of rows) {
    const formatted = formatEmployeeName(r.employee_name);
    if (!uniqueFormatted.has(r.employee_name)) {
      uniqueFormatted.set(r.employee_name, formatted);
    }
  }

  const twoNameCounts = new Map<string, number>();
  for (const formatted of uniqueFormatted.values()) {
    const two = takeFirstNames(formatted, 2);
    twoNameCounts.set(two, (twoNameCounts.get(two) ?? 0) + 1);
  }

  // Apenas para os nomes em colisão, conta quantos compartilham a versão
  // de 3 nomes — se mais de um, cai para o nome completo.
  const threeNameCounts = new Map<string, number>();
  for (const formatted of uniqueFormatted.values()) {
    const two = takeFirstNames(formatted, 2);
    if ((twoNameCounts.get(two) ?? 0) > 1) {
      const three = takeFirstNames(formatted, 3);
      threeNameCounts.set(three, (threeNameCounts.get(three) ?? 0) + 1);
    }
  }

  for (const [original, formatted] of uniqueFormatted) {
    const two = takeFirstNames(formatted, 2);
    if ((twoNameCounts.get(two) ?? 0) <= 1) {
      map.set(original, two);
      continue;
    }
    const three = takeFirstNames(formatted, 3);
    if ((threeNameCounts.get(three) ?? 0) <= 1) {
      map.set(original, three);
      continue;
    }
    map.set(original, formatted);
  }

  return map;
};

const calculateTotals = (data: BoletimData[]) => {
  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours + minutes / 60;
  };

  const formatHours = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  const totals = data.reduce(
    (acc, item) => {
      return {
        totalHours: acc.totalHours + parseTime(item.total_hours),
        normalHours: acc.normalHours + parseTime(item.normal_hours),
        nightAdditional:
          acc.nightAdditional + parseTime(item.night_additional || "00:00"),
        extra50Day: acc.extra50Day + parseTime(item.extra_50_day),
        extra50Night: acc.extra50Night + parseTime(item.extra_50_night),
        extra100Day: acc.extra100Day + parseTime(item.extra_100_day),
        extra100Night: acc.extra100Night + parseTime(item.extra_100_night),
        totalValue: acc.totalValue + item.value,
      };
    },
    {
      totalHours: 0,
      normalHours: 0,
      nightAdditional: 0,
      extra50Day: 0,
      extra50Night: 0,
      extra100Day: 0,
      extra100Night: 0,
      totalValue: 0,
    }
  );

  return {
    totalHours: formatHours(totals.totalHours),
    normalHours: formatHours(totals.normalHours),
    nightAdditional: formatHours(totals.nightAdditional),
    extra50Day: formatHours(totals.extra50Day),
    extra50Night: formatHours(totals.extra50Night),
    extra100Day: formatHours(totals.extra100Day),
    extra100Night: formatHours(totals.extra100Night),
    totalValue: totals.totalValue,
    extra50Total: formatHours(totals.extra50Day + totals.extra50Night),
    extra100Total: formatHours(totals.extra100Day + totals.extra100Night),
  };
};

export const BoletimPDF: React.FC<BoletimPDFProps> = ({
  companyName,
  startDate,
  endDate,
  data,
  logoBase64,
}) => {
  const totals = calculateTotals(data);
  const displayNameByEmployee = buildDisplayNameMap(data);

  // Render flat list of rows, inserting a "day bar" each time the date
  // changes. Index parity is tracked separately so alternating row stripes
  // restart on each day group.
  const renderedRows: React.ReactNode[] = [];
  let currentDate: string | null = null;
  let rowParity = 0;

  data.forEach((row, index) => {
    if (row.date !== currentDate) {
      currentDate = row.date;
      rowParity = 0;
      renderedRows.push(
        <View
          key={`day-${row.date}-${index}`}
          style={styles.dayBar}
          wrap={false}
        >
          <Text style={styles.dayBarLabel}>
            {formatDate(row.date)} — {row.day_of_week}
          </Text>
          <Text style={[styles.col_e1, styles.dayBarCell, styles.punchEdgeLeft]}>Ent. 1</Text>
          <Text style={[styles.col_s1, styles.dayBarCell]}>Saí. 1</Text>
          <Text style={[styles.col_e2, styles.dayBarCell]}>Ent. 2</Text>
          <Text style={[styles.col_s2, styles.dayBarCell, styles.punchEdgeRight]}>Saí. 2</Text>
          <Text style={[styles.col_total, styles.dayBarCell]}>Total</Text>
          <Text style={[styles.col_normal, styles.dayBarCell]}>Normal</Text>
          <Text style={[styles.col_adn, styles.dayBarCell]}>Ad. N.</Text>
          <Text style={[styles.col_50d, styles.dayBarCell]}>50% D.</Text>
          <Text style={[styles.col_50n, styles.dayBarCell]}>50% N.</Text>
          <Text style={[styles.col_100d, styles.dayBarCell]}>100% D.</Text>
          <Text style={[styles.col_100n, styles.dayBarCell]}>100% N.</Text>
          <Text style={[styles.col_valor, styles.dayBarCell]}>Valor</Text>
        </View>,
      );
    }

    const hasNoPunch =
      !row.entry1 && !row.exit1 && !row.entry2 && !row.exit2;
    const shouldHighlight = hasNoPunch && !isNoCompany(row.work_company);
    const rowStyle =
      rowParity % 2 === 1
        ? [styles.tableRow, styles.tableRowAlt]
        : styles.tableRow;
    rowParity++;

    renderedRows.push(
      <View key={`row-${index}`} style={rowStyle} wrap={false}>
        <Text
          style={[styles.col_emp, styles.cellLeft]}
          wrap={false}
        >
          {truncateName(
            displayNameByEmployee.get(row.employee_name) ??
              formatEmployeeName(row.employee_name),
          )}
        </Text>
        <Text style={[styles.col_fn, styles.cellCenter]}>{row.position}</Text>
        <Text style={[styles.col_setor, styles.cellCenter]}>
          {row.department}
        </Text>
        <View
          style={[
            styles.col_emp_dia_content,
            { borderRight: "0.5px solid #e5e7eb" },
          ]}
        >
          {isNoCompany(row.work_company) ? (
            <View style={styles.companyBadge}>
              <Text style={styles.companyBadgeText}>
                {row.work_company ?? "—"}
              </Text>
            </View>
          ) : (
            <Text style={styles.companyText}>{row.work_company ?? "—"}</Text>
          )}
        </View>
        <Text style={[styles.col_data, styles.cellCenter]}>
          {formatDate(row.date)}
        </Text>
        <Text
          style={
            shouldHighlight
              ? [styles.col_e1, styles.cellCenter, styles.punchEdgeLeft, styles.missingCell]
              : [styles.col_e1, styles.cellCenter, styles.punchEdgeLeft]
          }
        >
          {row.entry1 || "-"}
        </Text>
        <Text
          style={
            shouldHighlight
              ? [styles.col_s1, styles.cellCenter, styles.missingCell]
              : [styles.col_s1, styles.cellCenter]
          }
        >
          {row.exit1 || "-"}
        </Text>
        <Text
          style={
            shouldHighlight
              ? [styles.col_e2, styles.cellCenter, styles.missingCell]
              : [styles.col_e2, styles.cellCenter]
          }
        >
          {row.entry2 || "-"}
        </Text>
        <Text
          style={
            shouldHighlight
              ? [styles.col_s2, styles.cellCenter, styles.punchEdgeRight, styles.missingCell]
              : [styles.col_s2, styles.cellCenter, styles.punchEdgeRight]
          }
        >
          {row.exit2 || "-"}
        </Text>
        <Text style={[styles.col_total, styles.cellCenter]}>
          {row.total_hours}
        </Text>
        <Text style={[styles.col_normal, styles.cellCenter]}>
          {row.normal_hours}
        </Text>
        <Text style={[styles.col_adn, styles.cellCenter]}>
          {row.night_additional || "00:00"}
        </Text>
        <Text style={[styles.col_50d, styles.cellCenter]}>
          {row.extra_50_day}
        </Text>
        <Text style={[styles.col_50n, styles.cellCenter]}>
          {row.extra_50_night}
        </Text>
        <Text style={[styles.col_100d, styles.cellCenter]}>
          {row.extra_100_day}
        </Text>
        <Text style={[styles.col_100n, styles.cellCenter]}>
          {row.extra_100_night}
        </Text>
        <Text style={[styles.col_valor, styles.cellLast]}>
          {formatCurrency(row.value)}
        </Text>
      </View>,
    );
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {logoBase64 && (
              <View style={styles.logoContainer}>
                <Image style={styles.logo} src={logoBase64} />
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={styles.title}>
                Elmo Gestão - Boletim de Ponto
              </Text>
              <Text style={styles.subtitle}>{companyName}</Text>
              <Text style={styles.info}>
                Período: {formatDate(startDate)} até {formatDate(endDate)}
              </Text>
              <Text style={styles.info}>
                Gerado em: {new Date().toLocaleString("pt-BR")}
              </Text>
            </View>
          </View>
        </View>

        {/* Resumo do período */}
        <View style={styles.summarySection}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total de Horas</Text>
              <Text style={styles.summaryValue}>{totals.totalHours}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Horas Normais</Text>
              <Text style={styles.summaryValue}>{totals.normalHours}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Extras 50%</Text>
              <Text style={styles.summaryValue}>{totals.extra50Total}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Extras 100%</Text>
              <Text style={styles.summaryValue}>{totals.extra100Total}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Valor Total</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(totals.totalValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabela */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.col_emp, styles.cellLeft]}>Colaborador</Text>
            <Text style={[styles.col_fn, styles.cellCenter]}>Função</Text>
            <Text style={[styles.col_setor, styles.cellCenter]}>Setor</Text>
            <Text style={[styles.col_emp_dia, styles.cellCenter]}>
              Empresa
            </Text>
            <Text style={[styles.col_data, styles.cellCenter]}>Dia</Text>
            <Text style={[styles.col_e1, styles.cellCenter, styles.punchEdgeLeft]}>Ent. 1</Text>
            <Text style={[styles.col_s1, styles.cellCenter]}>Saí. 1</Text>
            <Text style={[styles.col_e2, styles.cellCenter]}>Ent. 2</Text>
            <Text style={[styles.col_s2, styles.cellCenter, styles.punchEdgeRight]}>Saí. 2</Text>
            <Text style={[styles.col_total, styles.cellCenter]}>Total</Text>
            <Text style={[styles.col_normal, styles.cellCenter]}>Normal</Text>
            <Text style={[styles.col_adn, styles.cellCenter]}>Ad. N.</Text>
            <Text style={[styles.col_50d, styles.cellCenter]}>50% D.</Text>
            <Text style={[styles.col_50n, styles.cellCenter]}>50% N.</Text>
            <Text style={[styles.col_100d, styles.cellCenter]}>100% D.</Text>
            <Text style={[styles.col_100n, styles.cellCenter]}>100% N.</Text>
            <Text style={[styles.col_valor, styles.cellLast]}>Valor</Text>
          </View>

          {renderedRows}

          <View style={styles.tableTotalRow} wrap={false}>
            <Text style={[styles.col_emp, styles.cellLeft]}>TOTAIS</Text>
            <Text style={[styles.col_fn, styles.cellCenter]}></Text>
            <Text style={[styles.col_setor, styles.cellCenter]}></Text>
            <Text style={[styles.col_emp_dia, styles.cellCenter]}></Text>
            <Text style={[styles.col_data, styles.cellCenter]}></Text>
            <Text style={[styles.col_e1, styles.cellCenter, styles.punchEdgeLeft]}></Text>
            <Text style={[styles.col_s1, styles.cellCenter]}></Text>
            <Text style={[styles.col_e2, styles.cellCenter]}></Text>
            <Text style={[styles.col_s2, styles.cellCenter, styles.punchEdgeRight]}></Text>
            <Text style={[styles.col_total, styles.cellCenter]}>
              {totals.totalHours}
            </Text>
            <Text style={[styles.col_normal, styles.cellCenter]}>
              {totals.normalHours}
            </Text>
            <Text style={[styles.col_adn, styles.cellCenter]}>
              {totals.nightAdditional}
            </Text>
            <Text style={[styles.col_50d, styles.cellCenter]}>
              {totals.extra50Day}
            </Text>
            <Text style={[styles.col_50n, styles.cellCenter]}>
              {totals.extra50Night}
            </Text>
            <Text style={[styles.col_100d, styles.cellCenter]}>
              {totals.extra100Day}
            </Text>
            <Text style={[styles.col_100n, styles.cellCenter]}>
              {totals.extra100Night}
            </Text>
            <Text style={[styles.col_valor, styles.cellLast]}>
              {formatCurrency(totals.totalValue)}
            </Text>
          </View>
        </View>

        {/* Rodapé */}
        <View style={styles.footer} fixed>
          <Text>
            Boletim gerado pelo Sistema Elmo Gestão - {data.length} registro(s)
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};
