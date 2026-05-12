import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import { ReportDocument, type ReportPdfData } from './report-templates/report-template'

export async function generateReportPdf(data: ReportPdfData): Promise<Buffer> {
  const element = createElement(ReportDocument, { data }) as unknown as ReactElement<DocumentProps>
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}

export type { ReportPdfData }
