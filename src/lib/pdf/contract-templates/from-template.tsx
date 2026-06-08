import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { Fragment } from 'react'

/**
 * Renderiza un contrato a PDF a partir del `rendered_content` (markdown-light).
 *
 * Formato soportado:
 *   # TÍTULO PRINCIPAL          → encabezado tipo "GRANDIR CM"
 *   ## SECCIÓN                  → cláusula (PRIMERA, SEGUNDA, ...)
 *   - bullet                    → viñeta
 *   **texto**                   → negrita
 *   párrafo normal              → justificado
 *   (línea vacía)               → spacer
 *
 * El bloque de firmas se agrega automáticamente al final con los nombres
 * pasados en `signatures` (típicamente: contratante, representante 1, representante 2).
 */

const PALETTE = {
  text: '#1c1c1c',
  textMuted: '#52525b',
  separator: '#d4d4d8',
  footerGrey: '#a1a1aa',
} as const

const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingHorizontal: 70,
    paddingBottom: 80,
    fontFamily: 'Times-Roman',
    fontSize: 11,
    color: PALETTE.text,
    lineHeight: 1.55,
  },

  // Header block — "GRANDIR CM" + "CONTRATO POR SERVICIOS PROFESIONALES"
  brand: {
    fontFamily: 'Times-Bold',
    fontSize: 18,
    textAlign: 'center' as const,
    letterSpacing: 2,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    textAlign: 'center' as const,
    letterSpacing: 0.5,
    marginBottom: 24,
  },

  // Other (rare) h1 lines after the brand block
  h1: {
    fontFamily: 'Times-Bold',
    fontSize: 13,
    textAlign: 'center' as const,
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },

  // Clauses
  h2: {
    fontFamily: 'Times-Bold',
    fontSize: 11.5,
    marginTop: 14,
    marginBottom: 6,
  },

  // Body paragraphs
  paragraph: {
    marginBottom: 6,
    textAlign: 'justify' as const,
  },

  // Bullets
  bulletRow: {
    flexDirection: 'row' as const,
    marginBottom: 4,
    paddingLeft: 14,
  },
  bulletMarker: {
    width: 12,
    color: PALETTE.textMuted,
  },
  bulletText: {
    flex: 1,
    textAlign: 'justify' as const,
  },

  spacer: {
    height: 6,
  },

  bold: {
    fontFamily: 'Times-Bold',
  },

  // Signature block
  signaturesContainer: {
    marginTop: 50,
  },
  signatureItem: {
    marginBottom: 36,
  },
  signatureLine: {
    borderBottomWidth: 0.8,
    borderBottomColor: PALETTE.text,
    borderBottomStyle: 'solid' as const,
    width: '70%',
    marginBottom: 6,
  },
  signatureLabel: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
  },

  // Page number footer
  pageNumber: {
    position: 'absolute' as const,
    bottom: 40,
    left: 70,
    right: 70,
    fontSize: 9,
    color: PALETTE.footerGrey,
    textAlign: 'center' as const,
  },
  pageFooterLeft: {
    position: 'absolute' as const,
    bottom: 40,
    left: 70,
    fontSize: 9,
    color: PALETTE.footerGrey,
  },
})

interface Block {
  type: 'h1' | 'h2' | 'bullet' | 'paragraph' | 'spacer'
  text: string
}

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  let paragraphBuffer: string[] = []

  function flushParagraph() {
    if (paragraphBuffer.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphBuffer.join(' ') })
      paragraphBuffer = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line === '') {
      flushParagraph()
      blocks.push({ type: 'spacer', text: '' })
      continue
    }
    if (line.startsWith('# ')) {
      flushParagraph()
      blocks.push({ type: 'h1', text: line.slice(2).trim() })
      continue
    }
    if (line.startsWith('## ')) {
      flushParagraph()
      blocks.push({ type: 'h2', text: line.slice(3).trim() })
      continue
    }
    if (line.startsWith('- ')) {
      flushParagraph()
      blocks.push({ type: 'bullet', text: line.slice(2).trim() })
      continue
    }
    paragraphBuffer.push(line)
  }
  flushParagraph()

  return blocks
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={i} style={styles.bold}>
          {part.slice(2, -2)}
        </Text>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

/**
 * Heuristic: detect the first two consecutive h1 blocks at the top and treat
 * them as brand + subtitle. Reduces visual noise of having 2 big headers.
 */
function splitBrandHeader(blocks: Block[]): {
  brand: string | null
  subtitle: string | null
  rest: Block[]
} {
  // Skip leading spacers
  let i = 0
  while (i < blocks.length && blocks[i].type === 'spacer') i++

  const first = blocks[i]
  const second = blocks[i + 1]
  if (first?.type === 'h1' && second?.type === 'h1') {
    return {
      brand: first.text,
      subtitle: second.text,
      rest: blocks.slice(i + 2),
    }
  }
  if (first?.type === 'h1') {
    return {
      brand: first.text,
      subtitle: null,
      rest: blocks.slice(i + 1),
    }
  }
  return { brand: null, subtitle: null, rest: blocks.slice(i) }
}

interface ContractFromTemplateProps {
  content: string
  signatures?: string[]
}

export function ContractFromTemplatePage({ content, signatures }: ContractFromTemplateProps) {
  const blocks = parseBlocks(content)
  const { brand, subtitle, rest } = splitBrandHeader(blocks)

  // Collapse consecutive spacers in body
  const cleaned: Block[] = []
  for (const block of rest) {
    if (block.type === 'spacer' && cleaned[cleaned.length - 1]?.type === 'spacer') continue
    cleaned.push(block)
  }

  const sigList = signatures && signatures.length > 0 ? signatures : []

  return (
    <Page size="LETTER" style={styles.page} wrap>
      {brand && <Text style={styles.brand}>{renderInline(brand)}</Text>}
      {subtitle && <Text style={styles.brandSubtitle}>{renderInline(subtitle)}</Text>}

      {cleaned.map((block, i) => {
        switch (block.type) {
          case 'h1':
            return (
              <Text key={i} style={styles.h1}>
                {renderInline(block.text)}
              </Text>
            )
          case 'h2':
            return (
              <Text key={i} style={styles.h2}>
                {renderInline(block.text)}
              </Text>
            )
          case 'bullet':
            return (
              <View key={i} style={styles.bulletRow} wrap={false}>
                <Text style={styles.bulletMarker}>•</Text>
                <Text style={styles.bulletText}>{renderInline(block.text)}</Text>
              </View>
            )
          case 'spacer':
            return <View key={i} style={styles.spacer} />
          case 'paragraph':
          default:
            return (
              <Text key={i} style={styles.paragraph}>
                {renderInline(block.text)}
              </Text>
            )
        }
      })}

      {sigList.length > 0 && (
        <View style={styles.signaturesContainer} wrap={false}>
          {sigList.map((name, idx) => (
            <View key={idx} style={styles.signatureItem} wrap={false}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>(F) {name}</Text>
            </View>
          ))}
        </View>
      )}

      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `Grandir CM S.R.L. — Cédula jurídica 3-102-873916 · Página ${pageNumber} de ${totalPages}`
        }
        fixed
      />
    </Page>
  )
}

export function ContractFromTemplateDocument({ content, signatures }: ContractFromTemplateProps) {
  return (
    <Document>
      <ContractFromTemplatePage content={content} signatures={signatures} />
    </Document>
  )
}
