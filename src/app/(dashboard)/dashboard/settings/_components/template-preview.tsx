'use client'

/**
 * Renderiza el markdown-light del template como HTML (preview de cómo se verá en el PDF).
 * Mantiene paridad visual con `from-template.tsx` que genera el PDF real.
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
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-zinc-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function splitBrandHeader(blocks: Block[]): {
  brand: string | null
  subtitle: string | null
  rest: Block[]
} {
  let i = 0
  while (i < blocks.length && blocks[i].type === 'spacer') i++

  const first = blocks[i]
  const second = blocks[i + 1]
  if (first?.type === 'h1' && second?.type === 'h1') {
    return { brand: first.text, subtitle: second.text, rest: blocks.slice(i + 2) }
  }
  if (first?.type === 'h1') {
    return { brand: first.text, subtitle: null, rest: blocks.slice(i + 1) }
  }
  return { brand: null, subtitle: null, rest: blocks.slice(i) }
}

interface TemplatePreviewProps {
  content: string
  signatures?: string[]
}

export function TemplatePreview({ content, signatures }: TemplatePreviewProps) {
  const blocks = parseBlocks(content)
  const { brand, subtitle, rest } = splitBrandHeader(blocks)

  const cleaned: Block[] = []
  for (const block of rest) {
    if (block.type === 'spacer' && cleaned[cleaned.length - 1]?.type === 'spacer') continue
    cleaned.push(block)
  }

  const sigList = signatures && signatures.length > 0 ? signatures : []

  return (
    <div
      className="bg-white border border-zinc-200 rounded-lg px-8 py-10 sm:px-16 sm:py-14 max-w-3xl mx-auto shadow-sm text-zinc-800"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      {brand && (
        <h1 className="text-center text-xl font-bold tracking-[0.15em] text-zinc-900 mb-1.5">
          {renderInline(brand)}
        </h1>
      )}
      {subtitle && (
        <h2 className="text-center text-[15px] font-bold tracking-wide text-zinc-900 mb-8">
          {renderInline(subtitle)}
        </h2>
      )}

      <div className="text-[14px] leading-[1.65]">
        {cleaned.map((block, i) => {
          switch (block.type) {
            case 'h1':
              return (
                <h1
                  key={i}
                  className="text-center text-[15px] font-bold tracking-wide text-zinc-900 mt-5 mb-2"
                >
                  {renderInline(block.text)}
                </h1>
              )
            case 'h2':
              return (
                <h2
                  key={i}
                  className="text-[14px] font-bold text-zinc-900 mt-5 mb-2"
                >
                  {renderInline(block.text)}
                </h2>
              )
            case 'bullet':
              return (
                <div key={i} className="flex gap-2 mb-1.5 pl-4">
                  <span className="text-zinc-500 shrink-0">•</span>
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

      {sigList.length > 0 && (
        <div className="mt-14 space-y-9">
          {sigList.map((name, idx) => (
            <div key={idx}>
              <div className="border-b border-zinc-800 w-[70%] mb-1.5" />
              <p className="text-[13px] font-bold text-zinc-900">(F) {name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
