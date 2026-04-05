import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ContractPdfData } from '@/types/signing'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'long' }).format(
    new Date(dateStr),
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#18181b',
    lineHeight: 1.5,
  },

  // Header
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    letterSpacing: 1,
  },
  headerCompany: {
    fontSize: 12,
    marginBottom: 2,
  },
  headerCedula: {
    fontSize: 10,
    color: '#52525b',
  },

  // Sections
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginTop: 24,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d4d4d8',
    borderBottomStyle: 'solid' as const,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 160,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#52525b',
  },
  value: {
    flex: 1,
    fontSize: 11,
  },

  // Terms
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify' as const,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 60,
    right: 60,
    textAlign: 'center',
    fontSize: 8,
    color: '#a1a1aa',
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    borderTopStyle: 'solid' as const,
    paddingTop: 8,
  },
})

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function LabelRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// ContractPage  (just the <Page>, composable)
// ---------------------------------------------------------------------------

export function ContractPage({ data }: { data: ContractPdfData }) {
  const contractNumber = data.contract_id.slice(0, 8).toUpperCase()

  return (
    <Page size="LETTER" style={styles.page}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>{`CONTRATO DE INVERSI\u00D3N`}</Text>
        <Text style={styles.headerCompany}>
          Grandir CM Sociedad de Responsabilidad Limitada
        </Text>
        <Text style={styles.headerCedula}>
          {`C\u00E9dula jur\u00EDdica: 3-102-873916`}
        </Text>
      </View>

      {/* Datos del Inversionista */}
      <Text style={styles.sectionTitle}>Datos del Inversionista</Text>
      <LabelRow label="Nombre completo:" value={data.investor_name} />
      <LabelRow label={`C\u00E9dula / ID:`} value={data.investor_cedula} />

      {/* Datos del Contrato */}
      <Text style={styles.sectionTitle}>Datos del Contrato</Text>
      <LabelRow label={`N\u00FAmero de contrato:`} value={contractNumber} />
      <LabelRow
        label="Plan:"
        value={`${data.plan_name} (${data.plan_type})`}
      />
      <LabelRow label={`Monto de inversi\u00F3n:`} value={formatCurrency(data.amount)} />
      <LabelRow
        label="Rendimiento anual:"
        value={`${data.annual_rate}%`}
      />
      <LabelRow label="Plazo:" value={`${data.term_months} meses`} />
      <LabelRow label="Fecha de inicio:" value={formatDate(data.start_date)} />
      <LabelRow label="Fecha de vencimiento:" value={formatDate(data.end_date)} />

      {/* Términos y Condiciones */}
      <Text style={styles.sectionTitle}>{`T\u00E9rminos y Condiciones`}</Text>
      <Text style={styles.paragraph}>
        {`El inversionista ${data.investor_name}, identificado con c\u00E9dula ${data.investor_cedula}, acepta invertir la suma de ${formatCurrency(data.amount)} en el plan ${data.plan_name} (${data.plan_type}) ofrecido por Grandir CM Sociedad de Responsabilidad Limitada, con un rendimiento anual del ${data.annual_rate}% por un plazo de ${data.term_months} meses a partir de la fecha de inicio indicada.`}
      </Text>
      <Text style={styles.paragraph}>
        {`Grandir CM S.R.L. se compromete a administrar los fondos de acuerdo con las pol\u00EDticas internas del fondo de inversi\u00F3n y la legislaci\u00F3n vigente en Costa Rica. Los rendimientos se calcular\u00E1n seg\u00FAn las condiciones establecidas para el plan seleccionado y se pagar\u00E1n de conformidad con el calendario de pagos correspondiente.`}
      </Text>
      <Text style={styles.paragraph}>
        {`Este contrato podr\u00E1 ser resuelto anticipadamente por cualquiera de las partes, sujeto a las condiciones de penalidad descritas en el reglamento interno del fondo. La firma electr\u00F3nica de este documento tiene plena validez legal de conformidad con la Ley N\u00B0 8454 de Certificados, Firmas Digitales y Documentos Electr\u00F3nicos de Costa Rica.`}
      </Text>

      {/* Footer */}
      <Text style={styles.footer}>
        {`Grandir CM S.R.L. \u2014 C\u00E9dula jur\u00EDdica 3-102-873916 \u2014 Costa Rica`}
      </Text>
    </Page>
  )
}

// ---------------------------------------------------------------------------
// ContractDocument  (full Document wrapper)
// ---------------------------------------------------------------------------

export function ContractDocument({ data }: { data: ContractPdfData }) {
  return (
    <Document>
      <ContractPage data={data} />
    </Document>
  )
}
