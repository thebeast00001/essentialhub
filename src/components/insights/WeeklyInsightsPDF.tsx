import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts if needed
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #6366f1',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 5,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  card: {
    width: '45%',
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginBottom: 15,
  },
  cardLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  insight: {
    padding: 15,
    backgroundColor: '#f0f9ff',
    borderLeft: '4px solid #3b82f6',
    marginBottom: 10,
  },
  insightText: {
    fontSize: 11,
    color: '#1e40af',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#94a3b8',
    borderTop: '1px solid #e2e8f0',
    paddingTop: 10,
  }
});

interface InsightData {
  userEmail: string;
  userName: string;
  weekRange: string;
  metrics: {
    focusMinutes: number;
    tasksCompleted: number;
    tasksMissed: number;
    productivityScore: number;
    improvement: number;
  };
  insights: string[];
  recommendations: string[];
}

export const WeeklyInsightsPDF = ({ data }: { data: InsightData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Zenith Weekly Insights</Text>
        <Text style={styles.subtitle}>Prepared for {data.userName} · {data.weekRange}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Productivity Performance</Text>
        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Focus Time</Text>
            <Text style={styles.cardValue}>{data.metrics.focusMinutes}m</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Tasks Completed</Text>
            <Text style={styles.cardValue}>{data.metrics.tasksCompleted}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Productivity Score</Text>
            <Text style={styles.cardValue}>{data.metrics.productivityScore}%</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Weekly Improvement</Text>
            <Text style={styles.cardValue}>{data.metrics.improvement >= 0 ? '+' : ''}{data.metrics.improvement}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Smart Observations</Text>
        {data.insights.map((insight, i) => (
          <View key={i} style={styles.insight}>
            <Text style={styles.insightText}>• {insight}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Recommendations</Text>
        {data.recommendations.map((rec, i) => (
          <View key={i} style={[styles.insight, { backgroundColor: '#fdf2f8', borderLeftColor: '#ec4899' }]}>
            <Text style={[styles.insightText, { color: '#9d174d' }]}>💡 {rec}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.footer}>
        Zenith Productivity Engine · Personalized AI Coaching · Generated on {new Date().toLocaleDateString()}
      </Text>
    </Page>
  </Document>
);
