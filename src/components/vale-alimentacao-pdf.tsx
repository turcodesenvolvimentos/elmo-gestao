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
  info: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },
  employeeInfoRow: {
    flexDirection: "row",
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
  col1: { width: "15%", fontSize: 8 },
  col2: { width: "12%", fontSize: 7 },
  col3: { width: "8%", fontSize: 7 },
  col4: { width: "8%", fontSize: 7 },
  col5: { width: "8%", fontSize: 7 },
  col6: { width: "8%", fontSize: 7 },
  col7: { width: "8%", fontSize: 7 },
  col8: { width: "11%", fontSize: 7, textAlign: "right" },
  col9: { width: "11%", fontSize: 7, textAlign: "right" },
  col10: { width: "11%", fontSize: 7, textAlign: "right" },
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
});

interface ValeAlimentacaoData {
  employeeName: string;
  date: string;
  company: string;
  entry1: string;
  exit1: string;
  entry2?: string;
  exit2?: string;
  totalHours: string;
  valeAlimentacao: boolean;
  ajudaCusto: boolean;
  vrValue: number;
  costHelpValue: number;
  employeeCpf?: string;
}

interface ValeAlimentacaoPDFProps {
  employeeName?: string;
  startDate: string;
  endDate: string;
  data: ValeAlimentacaoData[];
  logoBase64?: string;
  employeeCpf?: string;
  employeeAdmissionDate?: string | number;
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

const formatCPF = (cpf?: string | null): string => {
  if (!cpf) return "-";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return cpf;
};

const formatAdmissionDate = (date?: string | number | null): string => {
  if (!date) return "-";
  try {
    let d: Date;

    // Se for um número (timestamp), criar Date diretamente
    if (typeof date === "number") {
      d = new Date(date);
    } else if (typeof date === "string") {
      // Se for string, verificar se contém "T" (ISO format) ou é apenas data
      d = date.includes("T") ? new Date(date) : new Date(date + "T12:00:00Z");
    } else {
      return "-";
    }

    // Verificar se a data é válida
    if (isNaN(d.getTime())) {
      return "-";
    }

    return d.toLocaleDateString("pt-BR");
  } catch {
    return "-";
  }
};

const calculateTotals = (data: ValeAlimentacaoData[]) => {
  const totals = data.reduce(
    (acc, item) => {
      return {
        totalVr: acc.totalVr + (item.valeAlimentacao ? item.vrValue : 0),
        totalCostHelp:
          acc.totalCostHelp + (item.ajudaCusto ? item.costHelpValue : 0),
      };
    },
    {
      totalVr: 0,
      totalCostHelp: 0,
    }
  );

  return {
    totalVr: totals.totalVr,
    totalCostHelp: totals.totalCostHelp,
  };
};

export const ValeAlimentacaoPDF: React.FC<ValeAlimentacaoPDFProps> = ({
  employeeName,
  startDate,
  endDate,
  data,
  logoBase64,
  employeeCpf,
  employeeAdmissionDate,
}) => {
  const totals = calculateTotals(data);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {logoBase64 && (
              <View style={styles.logoContainer}>
                <Image style={styles.logo} src={logoBase64} />
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={styles.title}>
                Elmo Gestão - Relatório de Vale Alimentação
              </Text>
              <Text style={styles.info}>CNPJ: 30.386.636/0001-84</Text>
              {(employeeName || employeeCpf) && (
                <View style={styles.employeeInfoRow}>
                  {employeeName && (
                    <Text style={styles.info}>Funcionário: {employeeName}</Text>
                  )}
                  {employeeCpf && (
                    <Text style={[styles.info, { marginLeft: 10 }]}>
                      CPF: {formatCPF(employeeCpf)}
                    </Text>
                  )}
                </View>
              )}
              {employeeAdmissionDate && (
                <Text style={styles.info}>
                  Data de Admissão: {formatAdmissionDate(employeeAdmissionDate)}
                </Text>
              )}
              <Text style={styles.info}>
                Período: {formatDate(startDate)} até {formatDate(endDate)}
              </Text>
              <Text style={styles.info}>
                Gerado em: {new Date().toLocaleString("pt-BR")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Funcionário</Text>
            <Text style={styles.col2}>Data</Text>
            <Text style={styles.col3}>Empresa</Text>
            <Text style={styles.col4}>Ent. 1</Text>
            <Text style={styles.col5}>Saí. 1</Text>
            <Text style={styles.col6}>Ent. 2</Text>
            <Text style={styles.col7}>Saí. 2</Text>
            <Text style={styles.col8}>Total Horas</Text>
            <Text style={styles.col9}>Vale Alimentação</Text>
            <Text style={styles.col10}>Ajuda de Custo</Text>
          </View>

          {data.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{row.employeeName}</Text>
              <Text style={styles.col2}>{formatDate(row.date)}</Text>
              <Text style={styles.col3}>{row.company}</Text>
              <Text style={styles.col4}>{row.entry1 || "-"}</Text>
              <Text style={styles.col5}>{row.exit1 || "-"}</Text>
              <Text style={styles.col6}>{row.entry2 || "-"}</Text>
              <Text style={styles.col7}>{row.exit2 || "-"}</Text>
              <Text style={styles.col8}>{row.totalHours}</Text>
              <Text style={styles.col9}>
                {row.valeAlimentacao ? formatCurrency(row.vrValue) : "-"}
              </Text>
              <Text style={styles.col10}>
                {row.ajudaCusto ? formatCurrency(row.costHelpValue) : "-"}
              </Text>
            </View>
          ))}

          <View style={styles.tableTotalRow}>
            <Text style={{ width: "70%" }}>TOTAIS</Text>
            <Text style={styles.col9}>{formatCurrency(totals.totalVr)}</Text>
            <Text style={styles.col10}>
              {formatCurrency(totals.totalCostHelp)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Relatório gerado pelo Sistema Elmo Gestão - {data.length}{" "}
            registro(s)
          </Text>
        </View>
      </Page>
    </Document>
  );
};
