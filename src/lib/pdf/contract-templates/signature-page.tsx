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
    marginBottom: 20,
    letterSpacing: 1,
    textAlign: 'center',
  },
  signerBlock: {
    width: '100%',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#d4d4d8',
    borderBottomStyle: 'solid' as const,
  },
  signerBlockLast: {
    width: '100%',
    marginBottom: 16,
  },
  signerLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#52525b',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  fieldLabel: {
    width: 110,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#71717a',
  },
  fieldValue: {
    flex: 1,
    fontSize: 10,
  },
  legalText: {
    marginTop: 12,
    fontSize: 9,
    color: '#71717a',
    textAlign: 'justify' as const,
    lineHeight: 1.4,
  },
  hashContainer: {
    marginTop: 16,
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

function formatDateTimeES(isoOrDate: string): string {
  try {
    const d = new Date(isoOrDate)
    if (isNaN(d.getTime())) return isoOrDate
    return new Intl.DateTimeFormat('es-CR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Costa_Rica',
    }).format(d)
  } catch {
    return isoOrDate
  }
}

export function SignatureCertificatePage({
  data,
}: {
  data: SignatureCertificateData
}) {
  const hasAdmin = !!data.admin_signer

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.container}>
        <Text style={styles.title}>CERTIFICADO DE FIRMA ELECTRÓNICA</Text>

        {/* Firma del inversionista (contratante) */}
        <View style={hasAdmin ? styles.signerBlock : styles.signerBlockLast}>
          <Text style={styles.signerLabel}>EL CONTRATANTE (INVERSIONISTA)</Text>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Firmante:</Text>
            <Text style={styles.fieldValue}>{data.signer_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Cédula:</Text>
            <Text style={styles.fieldValue}>{data.signer_cedula}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Fecha y hora:</Text>
            <Text style={styles.fieldValue}>{formatDateTimeES(data.signed_at)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Dirección IP:</Text>
            <Text style={styles.fieldValue}>{data.ip_address}</Text>
          </View>
        </View>

        {/* Firma del admin (Grandir CM) — solo si está presente */}
        {hasAdmin && data.admin_signer && (
          <View style={styles.signerBlockLast}>
            <Text style={styles.signerLabel}>LA CONTRATISTA (GRANDIR CM)</Text>
            <View style={styles.row}>
              <Text style={styles.fieldLabel}>Firmante:</Text>
              <Text style={styles.fieldValue}>{data.admin_signer.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.fieldLabel}>En representación de:</Text>
              <Text style={styles.fieldValue}>
                Grandir CM S.R.L. — Cédula jurídica 3-102-873916
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.fieldLabel}>Fecha y hora:</Text>
              <Text style={styles.fieldValue}>
                {formatDateTimeES(data.admin_signer.signed_at)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.fieldLabel}>Dirección IP:</Text>
              <Text style={styles.fieldValue}>{data.admin_signer.ip_address}</Text>
            </View>
          </View>
        )}

        <Text style={styles.legalText}>
          Este certificado acredita que {hasAdmin ? 'ambas partes suscribieron' : 'el firmante indicado suscribió'} electrónicamente el documento asociado en la fecha y hora señaladas. La firma electrónica tiene plena validez legal de conformidad con la Ley N° 8454 de Certificados, Firmas Digitales y Documentos Electrónicos de Costa Rica.
        </Text>

        <View style={styles.hashContainer}>
          <Text style={styles.hashLabel}>Hash de verificación (SHA-256):</Text>
          <Text style={styles.hashValue}>{data.document_hash}</Text>
        </View>
      </View>
    </Page>
  )
}
