import { renderToBuffer, Document } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import { createHash } from 'crypto'
import type { ContractPdfData, SignatureCertificateData } from '@/types/signing'
import { ContractDocument, ContractPage } from './contract-templates/base-template'
import { SignatureCertificatePage } from './contract-templates/signature-page'

// ---------------------------------------------------------------------------
// Combined Document (contract pages + signature certificate)
// ---------------------------------------------------------------------------

function CombinedDocument({
  contractData,
  signatureData,
}: {
  contractData: ContractPdfData
  signatureData: SignatureCertificateData
}) {
  return createElement(
    Document,
    null,
    createElement(ContractPage, { data: contractData }),
    createElement(SignatureCertificatePage, { data: signatureData }),
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Genera el PDF del contrato sin firma.
 */
export async function generateContractPdf(
  data: ContractPdfData,
): Promise<Buffer> {
  const element = createElement(ContractDocument, { data }) as unknown as ReactElement<DocumentProps>
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}

/**
 * Genera el PDF del contrato firmado (contrato + certificado de firma).
 */
export async function generateSignedContractPdf(
  contractData: ContractPdfData,
  signatureData: SignatureCertificateData,
): Promise<Buffer> {
  const element = createElement(CombinedDocument, {
    contractData,
    signatureData,
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
