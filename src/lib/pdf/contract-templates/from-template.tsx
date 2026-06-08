import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { Fragment } from 'react'

/**
 * Renderiza un contrato a PDF a partir del `rendered_content` (markdown-light)
 * guardado en la BD del contrato. Esto reemplaza al template hardcoded antiguo.
 *
 * Formato soportado (mismo que el editor de plantillas):
 *   # TÍTULO PRINCIPAL          → centrado, mayúsculas, espaciado
 *   ## SECCIÓN                  → encabezado de cláusula con línea inferior
 *   - bullet                    → lista con viñeta
 *   **texto**                   → negrita
 *   párrafo normal              → justificado
 *   (línea vacía)               → spacer
 */

const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#18181b',
    lineHeight: 1.5,
  },
  h1: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center' as const,
    marginBottom: 4,
    letterSpacing: 1,
  },
  h2: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d4d4d8',
    borderBottomStyle: 'solid' as const,
    paddingBottom: 4,
  },
  paragraph: {
    marginBottom: 6,
    textAlign: 'justify' as const,
  },
  bulletRow: {
    flexDirection: 'row' as const,
    marginBottom: 4,
    paddingLeft: 8,
  },
  bulletMarker: {
    width: 12,
    color: '#52525b',
  },
  bulletText: {
    flex: 1,
    textAlign: 'justify' as const,
  },
  spacer: {
    height: 4,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute' as const,
    bottom: 30,
    left: 60,
    right: 60,
    textAlign: 'center' as const,
    fontSize: 8,
    color: '#a1a1aa',
    borderTopWidth: 1,
    borderTopColor: '#e4e4e7',
    borderTopStyle: 'solid' as const,
    paddingTop: 8,
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

/**
 * Renderiza segmentos de texto con soporte para **negrita**.
 */
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

export function ContractFromTemplatePage({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  // Collapse consecutive spacers
  const cleaned: Block[] = []
  for (const block of blocks) {
    if (block.type === 'spacer' && cleaned[cleaned.length - 1]?.type === 'spacer') continue
    cleaned.push(block)
  }

  return (
    <Page size="LETTER" style={styles.page} wrap>
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
              <View key={i} style={styles.bulletRow}>
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

      <Text style={styles.footer}>
        Grandir CM S.R.L. — Cédula jurídica 3-102-873916 — Costa Rica
      </Text>
    </Page>
  )
}

export function ContractFromTemplateDocument({ content }: { content: string }) {
  return (
    <Document>
      <ContractFromTemplatePage content={content} />
    </Document>
  )
}
