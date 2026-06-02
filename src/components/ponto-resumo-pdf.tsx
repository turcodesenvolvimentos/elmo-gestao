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

// PDF de resumo de ponto: uma linha por funcionario, com totais acumulados
// no periodo filtrado. Colunas: Funcionario | Adicional Noturno |
// Gratificacao | HE 50% D | HE 100% D | HE 50% N | HE 100% N |
// Adiantamento | Hora Normal.

export interface PontoResumoRow {
  employeeName: string;
  adicionalNoturno: string;
  extra50Diurno: string;
  extra100Diurno: string;
  extra50Noturno: string;
  extra100Noturno: string;
  horasNormais: string;
}

interface PontoResumoPDFProps {
  startDate: string;
  endDate: string;
  data: PontoResumoRow[];
  logoBase64?: string;
}

const NUM_FONT = 8;
const HEADER_FONT = 8;
const NAME_FONT = 9;

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
  logoContainer: { marginRight: 10 },
  logo: { width: 40, height: 40 },
  headerText: { flex: 1 },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#065F46",
    marginBottom: 1,
  },
  info: {
    fontSize: 7,
    color: "#4b5563",
    marginBottom: 1,
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
    paddingVertical: 5,
    paddingHorizontal: 0,
    fontWeight: "bold",
    fontSize: HEADER_FONT,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5px solid #e5e7eb",
    paddingVertical: 4,
    paddingHorizontal: 0,
    minHeight: 16,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  cellName: {
    width: "22%",
    paddingHorizontal: 6,
    fontSize: NAME_FONT,
    borderRight: "0.5px solid #e5e7eb",
  },
  cellNum: {
    paddingHorizontal: 2,
    fontSize: NUM_FONT,
    textAlign: "center",
    borderRight: "0.5px solid #e5e7eb",
  },
  cellLast: {
    paddingHorizontal: 2,
    fontSize: NUM_FONT,
    textAlign: "center",
  },
  col_adn: { width: "10%" },
  col_grat: { width: "9%" },
  col_50d: { width: "10%" },
  col_100d: { width: "10%" },
  col_50n: { width: "10%" },
  col_100n: { width: "10%" },
  col_adi: { width: "9%" },
  col_normal: { width: "10%" },
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("pt-BR");
}

// "00:00" / undefined / "" viram "-" para ficar visualmente mais limpo
function dashIfZero(value?: string): string {
  if (!value) return "-";
  const v = value.trim();
  if (v === "" || v === "00:00") return "-";
  return v;
}

export const PontoResumoPDF: React.FC<PontoResumoPDFProps> = ({
  startDate,
  endDate,
  data,
  logoBase64,
}) => {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        {/* Header da pagina (logo + titulo + periodo) — SOMENTE NA 1a PAGINA */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {logoBase64 ? (
              <View style={styles.logoContainer}>
                <Image src={logoBase64} style={styles.logo} />
              </View>
            ) : null}
            <View style={styles.headerText}>
              <Text style={styles.title}>
                Elmo Gestão - Resumo de Ponto
              </Text>
              <Text style={styles.info}>CNPJ: 30.386.636/0001-84</Text>
              <Text style={styles.info}>
                Período: {formatDate(startDate)} até {formatDate(endDate)}
              </Text>
              <Text style={styles.info}>
                Gerado em: {new Date().toLocaleString("pt-BR")}
              </Text>
            </View>
          </View>
        </View>

        {/* Cabecalho das colunas da tabela — REPETE EM TODA PAGINA */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.cellName, { color: "#ffffff" }]}>
              Funcionário
            </Text>
            <Text style={[styles.cellNum, styles.col_adn]}>Ad. Noturno</Text>
            <Text style={[styles.cellNum, styles.col_grat]}>Gratificação</Text>
            <Text style={[styles.cellNum, styles.col_50d]}>HE 50% D</Text>
            <Text style={[styles.cellNum, styles.col_100d]}>HE 100% D</Text>
            <Text style={[styles.cellNum, styles.col_50n]}>HE 50% N</Text>
            <Text style={[styles.cellNum, styles.col_100n]}>HE 100% N</Text>
            <Text style={[styles.cellNum, styles.col_adi]}>Adiantamento</Text>
            <Text style={[styles.cellLast, styles.col_normal]}>
              Hora Normal
            </Text>
          </View>

          {/* Linhas */}
          {data.map((row, idx) => (
            <View
              key={`${row.employeeName}-${idx}`}
              style={[
                styles.tableRow,
                idx % 2 === 1 ? styles.tableRowAlt : {},
              ]}
              wrap={false}
            >
              <Text style={styles.cellName}>{row.employeeName}</Text>
              <Text style={[styles.cellNum, styles.col_adn]}>
                {dashIfZero(row.adicionalNoturno)}
              </Text>
              {/* Gratificacao: coluna vazia para preenchimento manual */}
              <Text style={[styles.cellNum, styles.col_grat]}> </Text>
              <Text style={[styles.cellNum, styles.col_50d]}>
                {dashIfZero(row.extra50Diurno)}
              </Text>
              <Text style={[styles.cellNum, styles.col_100d]}>
                {dashIfZero(row.extra100Diurno)}
              </Text>
              <Text style={[styles.cellNum, styles.col_50n]}>
                {dashIfZero(row.extra50Noturno)}
              </Text>
              <Text style={[styles.cellNum, styles.col_100n]}>
                {dashIfZero(row.extra100Noturno)}
              </Text>
              {/* Adiantamento: coluna vazia para preenchimento manual */}
              <Text style={[styles.cellNum, styles.col_adi]}> </Text>
              <Text style={[styles.cellLast, styles.col_normal]}>
                {dashIfZero(row.horasNormais)}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Relatório gerado pelo Sistema Elmo Gestão - {data.length}{" "}
            funcionário(s)
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
