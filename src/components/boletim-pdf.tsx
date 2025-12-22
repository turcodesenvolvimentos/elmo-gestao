import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 15,
    borderBottom: "2px solid #333",
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  logoContainer: {
    marginRight: 15,
  },
  logo: {
    width: 60,
    height: 60,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 0,
    marginTop: 0,
  },
  subtitle: {
    fontSize: 10,
    marginBottom: 6,
  },
  info: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },
  table: {
    width: "100%",
    marginTop: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottom: "1px solid #ddd",
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5px solid #eee",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableTotalRow: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderTop: "1.5px solid #333",
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: "bold",
  },
  // Colunas
  col1: { width: "12%", fontSize: 8 }, // Nome
  col2: { width: "9%", fontSize: 7 }, // Função
  col3: { width: "8%", fontSize: 7 }, // Setor
  col4: { width: "6%", fontSize: 7 }, // Dia
  col5: { width: "7%", fontSize: 7 }, // Dia Semana
  col6: { width: "4.5%", fontSize: 7 }, // Entrada 1
  col7: { width: "4.5%", fontSize: 7 }, // Saída 1
  col8: { width: "4.5%", fontSize: 7 }, // Entrada 2
  col9: { width: "4.5%", fontSize: 7 }, // Saída 2
  col10: { width: "4.5%", fontSize: 7 }, // Total
  col11: { width: "4.5%", fontSize: 7 }, // Normal
  col12: { width: "4.5%", fontSize: 7 }, // 50% Dia
  col13: { width: "4.5%", fontSize: 7 }, // 50% Noite
  col14: { width: "4.5%", fontSize: 7 }, // 100% Dia
  col15: { width: "4.5%", fontSize: 7 }, // 100% Noite
  col16: { width: "8%", fontSize: 7, textAlign: "right" }, // Valor
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#666",
    borderTop: "1px solid #ddd",
    paddingTop: 10,
  },
  summarySection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 3,
    border: "1px solid #ddd",
  },
  summaryLabel: {
    fontSize: 8,
    color: "#666",
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: "bold",
  },
});

interface BoletimData {
  employee_name: string;
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

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* Logo no canto superior esquerdo */}
            {logoBase64 && (
              <View style={styles.logoContainer}>
                <Image style={styles.logo} src={logoBase64} />
              </View>
            )}

            {/* Texto do header */}
            <View style={styles.headerText}>
              <Text style={styles.title}>Elmo Gestão - Boletim de Ponto</Text>
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

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Resumo do Período</Text>
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

        {/* Table */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Colaborador</Text>
            <Text style={styles.col2}>Função</Text>
            <Text style={styles.col3}>Setor</Text>
            <Text style={styles.col4}>Dia</Text>
            <Text style={styles.col5}>Dia Sem.</Text>
            <Text style={styles.col6}>Ent. 1</Text>
            <Text style={styles.col7}>Saí. 1</Text>
            <Text style={styles.col8}>Ent. 2</Text>
            <Text style={styles.col9}>Saí. 2</Text>
            <Text style={styles.col10}>Total</Text>
            <Text style={styles.col11}>Normal</Text>
            <Text style={styles.col12}>50%D</Text>
            <Text style={styles.col13}>50%N</Text>
            <Text style={styles.col14}>100%D</Text>
            <Text style={styles.col15}>100%N</Text>
            <Text style={styles.col16}>Valor</Text>
          </View>

          {/* Rows */}
          {data.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{row.employee_name}</Text>
              <Text style={styles.col2}>{row.position}</Text>
              <Text style={styles.col3}>{row.department}</Text>
              <Text style={styles.col4}>{formatDate(row.date)}</Text>
              <Text style={styles.col5}>{row.day_of_week}</Text>
              <Text style={styles.col6}>{row.entry1 || "-"}</Text>
              <Text style={styles.col7}>{row.exit1 || "-"}</Text>
              <Text style={styles.col8}>{row.entry2 || "-"}</Text>
              <Text style={styles.col9}>{row.exit2 || "-"}</Text>
              <Text style={styles.col10}>{row.total_hours}</Text>
              <Text style={styles.col11}>{row.normal_hours}</Text>
              <Text style={styles.col12}>{row.extra_50_day}</Text>
              <Text style={styles.col13}>{row.extra_50_night}</Text>
              <Text style={styles.col14}>{row.extra_100_day}</Text>
              <Text style={styles.col15}>{row.extra_100_night}</Text>
              <Text style={styles.col16}>{formatCurrency(row.value)}</Text>
            </View>
          ))}

          {/* Total Row */}
          <View style={styles.tableTotalRow}>
            <Text style={{ width: "58%" }}>TOTAIS</Text>
            <Text style={styles.col10}>{totals.totalHours}</Text>
            <Text style={styles.col11}>{totals.normalHours}</Text>
            <Text style={styles.col12}>{totals.extra50Day}</Text>
            <Text style={styles.col13}>{totals.extra50Night}</Text>
            <Text style={styles.col14}>{totals.extra100Day}</Text>
            <Text style={styles.col15}>{totals.extra100Night}</Text>
            <Text style={styles.col16}>
              {formatCurrency(totals.totalValue)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Boletim gerado pelo Sistema Elmo Gestão - {data.length} registro(s)
          </Text>
        </View>
      </Page>
    </Document>
  );
};
