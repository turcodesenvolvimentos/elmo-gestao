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
  col1: { width: "9%", fontSize: 7 },
  col2: { width: "7%", fontSize: 7 },
  col3: { width: "5.5%", fontSize: 6 },
  col4: { width: "4.5%", fontSize: 6 },
  col5: { width: "4%", fontSize: 6 },
  col6: { width: "4%", fontSize: 6 },
  col7: { width: "4%", fontSize: 6 },
  col8: { width: "4%", fontSize: 6 },
  col9: { width: "5%", fontSize: 6 },
  col10: { width: "5%", fontSize: 6 },
  col11: { width: "5%", fontSize: 6 },
  col12: { width: "5%", fontSize: 6 },
  col13: { width: "5%", fontSize: 6 },
  col14: { width: "5%", fontSize: 6 },
  col15: { width: "5.5%", fontSize: 6 },
  col16: { width: "5.5%", fontSize: 6 },
  col17: { width: "5.5%", fontSize: 6 },
  col18: { width: "5.5%", fontSize: 6 },
  signatureSection: {
    marginTop: 24,
    paddingTop: 16,
  },
  signatureDeclaration: {
    textAlign: "center",
    fontSize: 9,
    marginBottom: 32,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 40,
  },
  signatureBlock: {
    flex: 1,
    maxWidth: "45%",
  },
  signatureLine: {
    borderBottom: "1px solid #333",
    marginBottom: 12,
    minHeight: 28,
  },
  signatureName: {
    fontSize: 8,
    color: "#333",
  },
  notesSection: {
    marginTop: 16,
    fontSize: 7,
    color: "#666",
    paddingLeft: 4,
  },
  noteLine: {
    marginBottom: 2,
  },
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

interface PontoData {
  employeeName: string;
  company: string;
  date: string;
  dayOfWeek: string;
  entry1: string;
  exit1: string;
  entry2?: string;
  exit2?: string;
  horasDiurnas: string;
  horasNoturnas: string;
  horasFictas: string;
  totalHoras: string;
  horasNormais: string;
  adicionalNoturno: string;
  extra50Diurno: string;
  extra50Noturno: string;
  extra100Diurno: string;
  extra100Noturno: string;
  employeeCpf?: string;
  employeeAdmissionDate?: string;
}

interface PontoPDFProps {
  employeeName?: string;
  startDate: string;
  endDate: string;
  data: PontoData[];
  logoBase64?: string;
  employeeCpf?: string;
  employeeAdmissionDate?: string | number;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString + "T12:00:00Z");
  return date.toLocaleDateString("pt-BR");
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

const calculateTotals = (data: PontoData[]) => {
  const totals = data.reduce(
    (acc, item) => {
      return {
        horasDiurnas: acc.horasDiurnas + parseTime(item.horasDiurnas),
        horasNoturnas: acc.horasNoturnas + parseTime(item.horasNoturnas),
        horasFictas: acc.horasFictas + parseTime(item.horasFictas),
        totalHoras: acc.totalHoras + parseTime(item.totalHoras),
        horasNormais: acc.horasNormais + parseTime(item.horasNormais),
        adicionalNoturno:
          acc.adicionalNoturno + parseTime(item.adicionalNoturno),
        extra50Diurno: acc.extra50Diurno + parseTime(item.extra50Diurno),
        extra50Noturno: acc.extra50Noturno + parseTime(item.extra50Noturno),
        extra100Diurno: acc.extra100Diurno + parseTime(item.extra100Diurno),
        extra100Noturno: acc.extra100Noturno + parseTime(item.extra100Noturno),
      };
    },
    {
      horasDiurnas: 0,
      horasNoturnas: 0,
      horasFictas: 0,
      totalHoras: 0,
      horasNormais: 0,
      adicionalNoturno: 0,
      extra50Diurno: 0,
      extra50Noturno: 0,
      extra100Diurno: 0,
      extra100Noturno: 0,
    }
  );

  return {
    horasDiurnas: formatHours(totals.horasDiurnas),
    horasNoturnas: formatHours(totals.horasNoturnas),
    horasFictas: formatHours(totals.horasFictas),
    totalHoras: formatHours(totals.totalHoras),
    horasNormais: formatHours(totals.horasNormais),
    adicionalNoturno: formatHours(totals.adicionalNoturno),
    extra50Diurno: formatHours(totals.extra50Diurno),
    extra50Noturno: formatHours(totals.extra50Noturno),
    extra100Diurno: formatHours(totals.extra100Diurno),
    extra100Noturno: formatHours(totals.extra100Noturno),
  };
};

export const PontoPDF: React.FC<PontoPDFProps> = ({
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
              <Text style={styles.title}>Elmo Gestão - Relatório de Ponto</Text>
              <Text style={[styles.info, { fontWeight: "bold" }]}>
                CNPJ: 30.386.636/0001-84
              </Text>
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
            <Text style={styles.col2}>Empresa</Text>
            <Text style={styles.col3}>Data</Text>
            <Text style={styles.col4}>Dia Sem.</Text>
            <Text style={styles.col5}>Ent. 1</Text>
            <Text style={styles.col6}>Saí. 1</Text>
            <Text style={styles.col7}>Ent. 2</Text>
            <Text style={styles.col8}>Saí. 2</Text>
            <Text style={styles.col9}>H. Diurnas</Text>
            <Text style={styles.col10}>H. Noturnas</Text>
            <Text style={styles.col11}>H. Fictas</Text>
            <Text style={styles.col12}>Total</Text>
            <Text style={styles.col13}>Normal</Text>
            <Text style={styles.col14}>Ad. Not.</Text>
            <Text style={styles.col15}>50% Diurno</Text>
            <Text style={styles.col16}>50% Noturno</Text>
            <Text style={styles.col17}>100% Diurno</Text>
            <Text style={styles.col18}>100% Noturno</Text>
          </View>

          {data.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.col1}>{row.employeeName}</Text>
              <Text style={styles.col2}>{row.company}</Text>
              <Text style={styles.col3}>{formatDate(row.date)}</Text>
              <Text style={styles.col4}>{row.dayOfWeek}</Text>
              <Text style={styles.col5}>{row.entry1 || "-"}</Text>
              <Text style={styles.col6}>{row.exit1 || "-"}</Text>
              <Text style={styles.col7}>{row.entry2 || "-"}</Text>
              <Text style={styles.col8}>{row.exit2 || "-"}</Text>
              <Text style={styles.col9}>{row.horasDiurnas}</Text>
              <Text style={styles.col10}>{row.horasNoturnas}</Text>
              <Text style={styles.col11}>{row.horasFictas}</Text>
              <Text style={styles.col12}>{row.totalHoras}</Text>
              <Text style={styles.col13}>{row.horasNormais}</Text>
              <Text style={styles.col14}>{row.adicionalNoturno}</Text>
              <Text style={styles.col15}>{row.extra50Diurno}</Text>
              <Text style={styles.col16}>{row.extra50Noturno}</Text>
              <Text style={styles.col17}>{row.extra100Diurno}</Text>
              <Text style={styles.col18}>{row.extra100Noturno}</Text>
            </View>
          ))}

          <View style={styles.tableTotalRow}>
            <Text style={styles.col1}>TOTAIS</Text>
            <Text style={styles.col2}></Text>
            <Text style={styles.col3}></Text>
            <Text style={styles.col4}></Text>
            <Text style={styles.col5}></Text>
            <Text style={styles.col6}></Text>
            <Text style={styles.col7}></Text>
            <Text style={styles.col8}></Text>
            <Text style={styles.col9}>{totals.horasDiurnas}</Text>
            <Text style={styles.col10}>{totals.horasNoturnas}</Text>
            <Text style={styles.col11}>{totals.horasFictas}</Text>
            <Text style={styles.col12}>{totals.totalHoras}</Text>
            <Text style={styles.col13}>{totals.horasNormais}</Text>
            <Text style={styles.col14}>{totals.adicionalNoturno}</Text>
            <Text style={styles.col15}>{totals.extra50Diurno}</Text>
            <Text style={styles.col16}>{totals.extra50Noturno}</Text>
            <Text style={styles.col17}>{totals.extra100Diurno}</Text>
            <Text style={styles.col18}>{totals.extra100Noturno}</Text>
          </View>
        </View>

        <View style={styles.signatureSection}>
          <Text style={styles.signatureDeclaration}>
            Reconheço a exatidão e confirmo a frequência constante deste
            cartão.
          </Text>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>
                {employeeName || data[0]?.employeeName || ""}
              </Text>
            </View>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureName}>
                Elmo Gestao de Servicos Elmo Prestadora de Servicos LTDA
              </Text>
            </View>
          </View>
          <View style={styles.notesSection}>
            <Text style={styles.noteLine}>
              * (m) significa que o ponto foi alterado manualmente.
            </Text>
            <Text style={styles.noteLine}>
              * Atrasos/Faltas reprovados(as) serão descontados(as) em folha.
            </Text>
            <Text style={styles.noteLine}>
              * Ad. Noturna: Horas com adicional noturno.
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
