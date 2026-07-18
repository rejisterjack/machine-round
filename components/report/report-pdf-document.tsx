import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { EvaluateResponse } from "@/lib/session/interview-store";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#111111",
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 12,
    color: "#555555",
    marginBottom: 20,
  },
  score: {
    fontSize: 36,
    color: "#E58C33",
    marginBottom: 12,
    fontWeight: 700,
  },
  section: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 700,
  },
  paragraph: {
    lineHeight: 1.5,
    marginBottom: 8,
    color: "#333333",
  },
  chip: {
    marginBottom: 4,
    color: "#E58C33",
  },
  answerCard: {
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 4,
  },
});

type ReportPdfDocumentProps = {
  report: EvaluateResponse;
  roleTitle?: string;
};

export function ReportPdfDocument({
  report,
  roleTitle,
}: ReportPdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Namaste Machine Round Readiness Report</Text>
        {roleTitle ? <Text style={styles.subtitle}>{roleTitle}</Text> : null}
        <Text style={styles.score}>{report.overallScore}/100</Text>
        <Text style={styles.paragraph}>{report.summary}</Text>

        {report.weakTopics && report.weakTopics.length > 0 ? (
          <View>
            <Text style={styles.section}>Weak topic signals</Text>
            {report.weakTopics.map((topic) => (
              <Text key={topic.label} style={styles.chip}>
                • {topic.label}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={styles.section}>Per-answer breakdown</Text>
        {report.answers.map((answer, index) => (
          <View key={index} style={styles.answerCard}>
            <Text style={{ fontWeight: 700, marginBottom: 4 }}>
              Q{index + 1}: {answer.question}
            </Text>
            <Text style={styles.paragraph}>{answer.answer}</Text>
            <Text>
              Clarity {answer.clarity} · Structure {answer.structure} ·
              Technical {answer.technicalSignal}
            </Text>
            {answer.redFlags.length > 0 ? (
              <Text style={{ color: "#b45309", marginTop: 4 }}>
                Flags: {answer.redFlags.join(", ")}
              </Text>
            ) : null}
          </View>
        ))}

        <Text style={styles.section}>Improvement actions</Text>
        {report.improvements.map((item, index) => (
          <Text key={item} style={styles.paragraph}>
            {index + 1}. {item}
          </Text>
        ))}
      </Page>
    </Document>
  );
}
