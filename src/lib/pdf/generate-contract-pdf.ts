import { renderToBuffer, Document } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import { createHash } from 'crypto'
import type { ContractPdfData, SignatureCertificateData } from '@/types/signing'
import { ContractDocument, ContractPage } from './contract-templates/base-template'
import { ContractFromTemplateDocument, ContractFromTemplatePage } from './contract-templates/from-template'
import { SignatureCertificatePage } from './contract-templates/signature-page'

// ---------------------------------------------------------------------------
// Combined Document (contract pages + signature certificate)
// ---------------------------------------------------------------------------

function CombinedDocument({
  contractData,
  signatureData,
  renderedContent,
}: {
  contractData: ContractPdfData
  signatureData: SignatureCertificateData
  renderedContent?: string | null
}) {
  const contractPage = renderedContent
    ? createElement(ContractFromTemplatePage, { content: renderedContent })
    : createElement(ContractPage, { data: contractData })

  return createElement(
    Document,
    null,
    contractPage,
    createElement(SignatureCertificatePage, { data: signatureData }),
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Genera el PDF del contrato sin firma.
 * Si se proporciona `renderedContent` (markdown-light), lo usa para renderizar.
 * Si no, cae al template hardcoded antiguo (compatibilidad con contratos viejos).
 */
export async function generateContractPdf(
  data: ContractPdfData,
  renderedContent?: string | null,
): Promise<Buffer> {
  const element = renderedContent
    ? (createElement(ContractFromTemplateDocument, { content: renderedContent }) as unknown as ReactElement<DocumentProps>)
    : (createElement(ContractDocument, { data }) as unknown as ReactElement<DocumentProps>)
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}

/**
 * Genera el PDF del contrato firmado (contrato + certificado de firma).
 */
export async function generateSignedContractPdf(
  contractData: ContractPdfData,
  signatureData: SignatureCertificateData,
  renderedContent?: string | null,
): Promise<Buffer> {
  const element = createElement(CombinedDocument, {
    contractData,
    signatureData,
    renderedContent,
  }) as unknown as ReactElement<DocumentProps>
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}

/**
 * Calcula el hash SHA-256 de un buffer.
 */
export function computeDocumentHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}
