import { Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { SignatureCertificateData } from '@/types/signing'

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
  container: {
    borderWidth: 2,
    borderColor: '#18181b',
    borderStyle: 'solid',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 24,
    letterSpacing: 1,
    textAlign: 'center',
  },
  fieldsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
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
  legalText: {
    marginTop: 20,
    fontSize: 9,
    color: '#71717a',
    textAlign: 'justify' as const,
    lineHeight: 1.4,
  },
  hashContainer: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  hashLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#a1a1aa',
    marginBottom: 4,
  },
  hashValue: {
    fontSize: 7,
    fontFamily: 'Courier',
    color: '#52525b',
    letterSpacing: 0.5,
  },
})

// ---------------------------------------------------------------------------
// SignatureCertificatePage (just a <Page>, composable inside a <Document>)
// ---------------------------------------------------------------------------

export function SignatureCertificatePage({
  data,
}: {
  data: SignatureCertificateData
}) {
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.container}>
        <Text style={styles.title}>
          {`CERTIFICADO DE FIRMA ELECTR\u00D3NICA`}
        </Text>

        <View style={styles.fieldsContainer}>
          <View style={styles.row}>
            <Text style={styles.label}>FIRMANTE:</Text>
            <Text style={styles.value}>{data.signer_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{`C\u00C9DULA:`}</Text>
            <Text style={styles.value}>{data.signer_cedula}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>FECHA Y HORA:</Text>
            <Text style={styles.value}>{data.signed_at}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{`DIRECCI\u00D3N IP:`}</Text>
            <Text style={styles.value}>{data.ip_address}</Text>
          </View>
        </View>

        <Text style={styles.legalText}>
          {`Este certificado acredita que el firmante indicado suscribi\u00F3 electr\u00F3nicamente el documento asociado en la fecha y hora se\u00F1aladas. La firma electr\u00F3nica tiene plena validez legal de conformidad con la Ley N\u00B0 8454 de Certificados, Firmas Digitales y Documentos Electr\u00F3nicos de Costa Rica.`}
        </Text>

        <View style={styles.hashContainer}>
          <Text style={styles.hashLabel}>
            {`Hash de verificaci\u00F3n (SHA-256):`}
          </Text>
          <Text style={styles.hashValue}>{data.document_hash}</Text>
        </View>
      </View>
    </Page>
  )
}
