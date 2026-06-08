'use client'

/**
 * Renderiza el markdown-light del template como HTML (preview de cómo se verá en el PDF).
 * Soporta:
 *   # TÍTULO
 *   ## SECCIÓN
 *   - bullet
 *   **negrita**
 *   párrafo normal
 */

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

function renderInline(text: string): React.ReactNode {
  // **bold** → <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-zinc-900">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export function TemplatePreview({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  // Collapse consecutive spacers
  const cleaned: Block[] = []
  for (const block of blocks) {
    if (block.type === 'spacer' && cleaned[cleaned.length - 1]?.type === 'spacer') continue
    cleaned.push(block)
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-6 sm:p-10 max-w-3xl mx-auto text-sm leading-relaxed text-zinc-700 shadow-sm">
      {cleaned.map((block, i) => {
        switch (block.type) {
          case 'h1':
            return (
              <h1
                key={i}
                className="text-center text-base font-bold tracking-wider text-zinc-900 mb-1 mt-0 first:mt-0"
              >
                {renderInline(block.text)}
              </h1>
            )
          case 'h2':
            return (
              <h2
                key={i}
                className="text-[13px] font-bold text-zinc-900 mt-5 mb-2 border-b border-zinc-200 pb-1"
              >
                {renderInline(block.text)}
              </h2>
            )
          case 'bullet':
            return (
              <div key={i} className="flex gap-2 mb-1.5 pl-2">
                <span className="text-zinc-400 shrink-0">•</span>
                <p className="flex-1 text-justify">{renderInline(block.text)}</p>
              </div>
            )
          case 'spacer':
            return <div key={i} className="h-2" />
          case 'paragraph':
          default:
            return (
              <p key={i} className="text-justify mb-2">
                {renderInline(block.text)}
              </p>
            )
        }
      })}
    </div>
  )
}
