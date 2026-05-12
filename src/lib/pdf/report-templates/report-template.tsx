import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'

export interface ReportPdfData {
  report_id: string
  contract_id: string
  investor_name: string
  investor_cedula: string
  plan_name: string
  plan_type: string
  capital_invertido: number
  period_start: string
  period_end: string
  growth_rate: number
  calculated_amount: number | null
  description: string | null
  generated_at: string
}

const styles = StyleSheet.create({
  page: { padding: 60, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.6 },
  header: { textAlign: 'center', marginBottom: 30 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  subtitle: { fontSize: 11, color: '#71717a' },
  badge: {
    marginTop: 10,
    alignSelf: 'center',
    backgroundColor: '#18181b',
    color: '#ffffff',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 4,
    fontSize: 10,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottom: '1 solid #e4e4e7',
    paddingBottom: 4,
    color: '#18181b',
  },
  row: { flexDirection: 'row', marginBottom: 6 },
  label: { width: '40%', fontSize: 10, color: '#71717a' },
  value: { width: '60%', fontSize: 11, color: '#18181b', fontWeight: 'bold' },
  highlightCard: {
    backgroundColor: '#f4f4f5',
    borderRadius: 6,
    padding: 16,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  highlightItem: { flex: 1, paddingHorizontal: 8 },
  highlightLabel: { fontSize: 9, color: '#71717a', marginBottom: 4 },
  highlightValue: { fontSize: 14, fontWeight: 'bold', color: '#18181b' },
  highlightValueGreen: { fontSize: 14, fontWeight: 'bold', color: '#15803d' },
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify',
    fontSize: 11,
    color: '#3f3f46',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 60,
    right: 60,
    textAlign: 'center',
    fontSize: 9,
    color: '#a1a1aa',
    borderTop: '1 solid #e4e4e7',
    paddingTop: 8,
  },
})

const PLAN_LABELS: Record<string, string> = {
  annual: 'Anual',
  monthly: 'Mensual',
  semestral: 'Semestral',
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '—'
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'long' }).format(new Date(dateStr))
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

export function ReportDocument({ data }: { data: ReportPdfData }) {
  const periodLabel = `${formatDate(data.period_start)} — ${formatDate(data.period_end)}`

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>REPORTE DE INVERSIÓN</Text>
          <Text style={styles.subtitle}>Grandir CM S.R.L.</Text>
          <View style={styles.badge}>
            <Text>{periodLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inversionista</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{data.investor_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cédula:</Text>
            <Text style={styles.value}>{data.investor_cedula}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contrato N°:</Text>
            <Text style={styles.value}>
              #{data.contract_id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Plan:</Text>
            <Text style={styles.value}>
              {data.plan_name} ({PLAN_LABELS[data.plan_type] ?? data.plan_type})
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen del período</Text>
          <View style={styles.highlightCard}>
            <View style={styles.highlightItem}>
              <Text style={styles.highlightLabel}>CAPITAL INVERTIDO</Text>
              <Text style={styles.highlightValue}>
                {formatCurrency(data.capital_invertido)}
              </Text>
            </View>
            <View style={styles.highlightItem}>
              <Text style={styles.highlightLabel}>CRECIMIENTO</Text>
              <Text style={styles.highlightValueGreen}>
                {data.growth_rate.toFixed(2)}%
              </Text>
            </View>
            {data.calculated_amount !== null && (
              <View style={styles.highlightItem}>
                <Text style={styles.highlightLabel}>RENDIMIENTO</Text>
                <Text style={styles.highlightValueGreen}>
                  {formatCurrency(data.calculated_amount)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {data.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observaciones del período</Text>
            <Text style={styles.paragraph}>{data.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metodología</Text>
          <Text style={styles.paragraph}>
            El crecimiento del período se calcula sobre el capital invertido del
            inversionista. La tasa porcentual aplicada corresponde al rendimiento del
            fondo Grandir CM durante el período reportado, generado a partir de las
            actividades de inversión de la empresa.
          </Text>
          {data.calculated_amount !== null && (
            <Text style={styles.paragraph}>
              Para esta inversión de {formatCurrency(data.capital_invertido)} con un
              crecimiento de {data.growth_rate.toFixed(2)}% en el período, el
              rendimiento generado es de{' '}
              {formatCurrency(data.calculated_amount)}.
            </Text>
          )}
        </View>

        <Text style={styles.footer}>
          Reporte generado el {formatDateTime(data.generated_at)} · Grandir CM S.R.L.
          · Cédula jurídica 3-102-873916
        </Text>
      </Page>
    </Document>
  )
}

export function reportDocumentElement(data: ReportPdfData): ReactElement<DocumentProps> {
  return ReportDocument({ data }) as ReactElement<DocumentProps>
}
