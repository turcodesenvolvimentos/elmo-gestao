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
  col1: { width: "40%", fontSize: 9 },
  colCpf: { width: "25%", fontSize: 7 },
  col2: { width: "17.5%", fontSize: 9, textAlign: "right" },
  col3: { width: "17.5%", fontSize: 9, textAlign: "right" },
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

interface EmployeeSummary {
  employeeName: string;
  totalVr: number;
  totalCostHelp: number;
  employeeCpf?: string;
  employeeAdmissionDate?: string;
}

interface ValeAlimentacaoSummaryPDFProps {
  startDate: string;
  endDate: string;
  data: EmployeeSummary[];
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

const formatCPF = (cpf?: string | null): string => {
  if (!cpf) return "-";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return cpf;
};

const calculateTotals = (data: EmployeeSummary[]) => {
  return data.reduce(
    (acc, item) => {
      return {
        totalVr: acc.totalVr + item.totalVr,
        totalCostHelp: acc.totalCostHelp + item.totalCostHelp,
      };
    },
    {
      totalVr: 0,
      totalCostHelp: 0,
    }
  );
};

export const ValeAlimentacaoSummaryPDF: React.FC<
  ValeAlimentacaoSummaryPDFProps
> = ({ startDate, endDate, data, logoBase64 }) => {
  const totals = calculateTotals(data);

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {logoBase64 && (
              <View style={styles.logoContainer}>
                <Image style={styles.logo} src={logoBase64} />
              </View>
            )}
            <View style={styles.headerText}>
              <Text style={styles.title}>
                Elmo Gestão - Relatório de Vale Alimentação (Resumo)
              </Text>
              <Text style={[styles.info, { fontWeight: "bold" }]}>CNPJ: 30.386.636/0001-84</Text>
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
            <Text style={styles.colCpf}>CPF</Text>
            <Text style={styles.col2}>Vale Alimentação</Text>
            <Text style={styles.col3}>Ajuda de Custo</Text>
          </View>

          {data.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{row.employeeName}</Text>
              <Text style={styles.colCpf}>{formatCPF(row.employeeCpf)}</Text>
              <Text style={styles.col2}>{formatCurrency(row.totalVr)}</Text>
              <Text style={styles.col3}>
                {formatCurrency(row.totalCostHelp)}
              </Text>
            </View>
          ))}

          <View style={styles.tableTotalRow}>
            <Text style={styles.col1}>TOTAIS</Text>
            <Text style={styles.colCpf}></Text>
            <Text style={styles.col2}>{formatCurrency(totals.totalVr)}</Text>
            <Text style={styles.col3}>
              {formatCurrency(totals.totalCostHelp)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Relatório gerado pelo Sistema Elmo Gestão - {data.length}{" "}
            funcionário(s)
          </Text>
        </View>
      </Page>
    </Document>
  );
};
