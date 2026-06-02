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
    borderBottom: "2px solid #065F46", // verde escuro
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
    color: "#065F46", // verde
    marginBottom: 1,
  },
  info: {
    fontSize: 7,
    color: "#4b5563", // cinza
    marginBottom: 1,
  },
  employeeInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  table: {
    width: "100%",
    marginTop: 8,
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
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5px solid #e5e7eb",
    paddingVertical: 3,
    paddingHorizontal: 0,
    minHeight: 14,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb", // cinza claro
  },
  tableTotalRow: {
    flexDirection: "row",
    backgroundColor: "#e5e7eb", // cinza médio
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
  col2: { width: "9%", fontSize: NUM_FONT },
  col2Content: { width: "9%", paddingHorizontal: 3 },
  companyBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 1,
    paddingVertical: 1,
    alignSelf: "flex-start",
    borderRadius: 2,
  },
  companyBadgeText: {
    fontSize: 5,
    color: "#92400E",
    fontWeight: "bold",
  },
  companyText: {
    fontSize: NUM_FONT,
  },
  col3: { width: "8%", fontSize: NUM_FONT },
  col4: { width: "9%", fontSize: NUM_FONT },
  col5: { width: "6.5%", fontSize: NUM_FONT },
  col6: { width: "6.5%", fontSize: NUM_FONT },
  col7: { width: "6.5%", fontSize: NUM_FONT },
  col8: { width: "6.5%", fontSize: NUM_FONT },
  col12: { width: "7%", fontSize: NUM_FONT },
  col13: { width: "7%", fontSize: NUM_FONT },
  col14: { width: "6.5%", fontSize: NUM_FONT },
  col15: { width: "6.5%", fontSize: NUM_FONT },
  col16: { width: "6.5%", fontSize: NUM_FONT },
  col17: { width: "6.5%", fontSize: NUM_FONT },
  col18: { width: "8%", fontSize: NUM_FONT },
  missingCell: {
    backgroundColor: "#ff3f3d",   
    color: "#991B1B",            
    fontWeight: "bold",
  },
  signatureSection: {
    marginTop: 14,
    paddingTop: 8,
  },
  signatureDeclaration: {
    textAlign: "center",
    fontSize: 8,
    marginBottom: 18,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 30,
  },
  signatureBlock: {
    flex: 1,
    maxWidth: "45%",
  },
  signatureLine: {
    borderBottom: "1px solid #333",
    marginBottom: 6,
    minHeight: 40,
  },
  signatureName: {
    fontSize: 7,
    color: "#333",
    textAlign: "center",
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

    if (typeof date === "number") {
      d = new Date(date);
    } else if (typeof date === "string") {
      d = date.includes("T") ? new Date(date) : new Date(date + "T12:00:00Z");
    } else {
      return "-";
    }

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

const isNoCompany = (value?: string | null): boolean =>
  (value || "").trim().toLowerCase() === "não escalado";

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
      <Page size="A4" orientation="portrait" style={styles.page}>
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
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.col2, styles.cellLeft]}>Empresa</Text>
            <Text style={[styles.col3, styles.cellCenter]}>Data</Text>
            <Text style={[styles.col4, styles.cellCenter]}>Dia Sem.</Text>
            <Text style={[styles.col5, styles.cellCenter]}>Ent. 1</Text>
            <Text style={[styles.col6, styles.cellCenter]}>Saí. 1</Text>
            <Text style={[styles.col7, styles.cellCenter]}>Ent. 2</Text>
            <Text style={[styles.col8, styles.cellCenter]}>Saí. 2</Text>
            <Text style={[styles.col12, styles.cellCenter]}>Total</Text>
            <Text style={[styles.col13, styles.cellCenter]}>Normal</Text>
            <Text style={[styles.col14, styles.cellCenter]}>Ad. N.</Text>
            <Text style={[styles.col15, styles.cellCenter]}>50% D.</Text>
            <Text style={[styles.col16, styles.cellCenter]}>50% N.</Text>
            <Text style={[styles.col17, styles.cellCenter]}>100% D.</Text>
            <Text style={[styles.col18, styles.cellLast]}>100% N.</Text>
          </View>

          {data.map((row, index) => {
            const isEmptyTime = (t?: string) => !t || t === "-";
            const hasNoPunch =
              isEmptyTime(row.entry1) &&
              isEmptyTime(row.exit1) &&
              isEmptyTime(row.entry2) &&
              isEmptyTime(row.exit2);
            const shouldHighlight =
              hasNoPunch && !isNoCompany(row.company);
            const rowStyle =
              index % 2 === 1
                ? [styles.tableRow, styles.tableRowAlt]
                : styles.tableRow;
            return (
            <View key={index} style={rowStyle} wrap={false}>
              <View style={[styles.col2Content, { borderRight: "0.5px solid #e5e7eb" }]}>
                {isNoCompany(row.company) ? (
                  <View style={styles.companyBadge}>
                    <Text style={styles.companyBadgeText}>{row.company}</Text>
                  </View>
                ) : (
                  <Text style={styles.companyText}>{row.company}</Text>
                )}
              </View>
              <Text style={[styles.col3, styles.cellCenter]}>{formatDate(row.date)}</Text>
              <Text style={[styles.col4, styles.cellCenter]}>{row.dayOfWeek}</Text>
              <Text style={shouldHighlight ? [styles.col5, styles.cellCenter, styles.missingCell] : [styles.col5, styles.cellCenter]}>
                {row.entry1 || "-"}
              </Text>
              <Text style={shouldHighlight ? [styles.col6, styles.cellCenter, styles.missingCell] : [styles.col6, styles.cellCenter]}>
                {row.exit1 || "-"}
              </Text>
              <Text style={shouldHighlight ? [styles.col7, styles.cellCenter, styles.missingCell] : [styles.col7, styles.cellCenter]}>
                {row.entry2 || "-"}
              </Text>
              <Text style={shouldHighlight ? [styles.col8, styles.cellCenter, styles.missingCell] : [styles.col8, styles.cellCenter]}>
                {row.exit2 || "-"}
              </Text>
              <Text style={[styles.col12, styles.cellCenter]}>{row.totalHoras}</Text>
              <Text style={[styles.col13, styles.cellCenter]}>{row.horasNormais}</Text>
              <Text style={[styles.col14, styles.cellCenter]}>{row.adicionalNoturno}</Text>
              <Text style={[styles.col15, styles.cellCenter]}>{row.extra50Diurno}</Text>
              <Text style={[styles.col16, styles.cellCenter]}>{row.extra50Noturno}</Text>
              <Text style={[styles.col17, styles.cellCenter]}>{row.extra100Diurno}</Text>
              <Text style={[styles.col18, styles.cellLast]}>{row.extra100Noturno}</Text>
            </View>
            );
          })}

          <View style={styles.tableTotalRow} wrap={false}>
            <Text style={[styles.col2, styles.cellLeft]}>TOTAIS</Text>
            <Text style={[styles.col3, styles.cellCenter]}></Text>
            <Text style={[styles.col4, styles.cellCenter]}></Text>
            <Text style={[styles.col5, styles.cellCenter]}></Text>
            <Text style={[styles.col6, styles.cellCenter]}></Text>
            <Text style={[styles.col7, styles.cellCenter]}></Text>
            <Text style={[styles.col8, styles.cellCenter]}></Text>
            <Text style={[styles.col12, styles.cellCenter]}>{totals.totalHoras}</Text>
            <Text style={[styles.col13, styles.cellCenter]}>{totals.horasNormais}</Text>
            <Text style={[styles.col14, styles.cellCenter]}>{totals.adicionalNoturno}</Text>
            <Text style={[styles.col15, styles.cellCenter]}>{totals.extra50Diurno}</Text>
            <Text style={[styles.col16, styles.cellCenter]}>{totals.extra50Noturno}</Text>
            <Text style={[styles.col17, styles.cellCenter]}>{totals.extra100Diurno}</Text>
            <Text style={[styles.col18, styles.cellLast]}>{totals.extra100Noturno}</Text>
          </View>
        </View>

        <View style={styles.signatureSection} wrap={false}>
          <Text style={styles.signatureDeclaration}>
            Reconheço a exatidão e confirmo a frequência constante deste cartão.
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
        </View>

        <View style={styles.footer} fixed>
          <Text>
            Relatório gerado pelo Sistema Elmo Gestão - {data.length}{" "}
            registro(s)
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
