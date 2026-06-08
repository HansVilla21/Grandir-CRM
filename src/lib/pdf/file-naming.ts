/**
 * Helpers para nombrar archivos PDF de contratos de forma consistente y legible.
 *
 * Formato deseado:
 *   contrato-{nombre-cliente}-{shortid}.pdf            ← Borrador (sin firmas)
 *   contrato-{nombre-cliente}-{shortid}-firmado-cliente.pdf  ← Cliente firmó, falta Grandir
 *   contrato-{nombre-cliente}-{shortid}-firmado.pdf    ← Firmado por ambas partes
 *
 * Ejemplo: contrato-hans-villalobos-A1B2C3D4-firmado.pdf
 */

/**
 * Normaliza un nombre para usar como parte de un filename:
 * - Quita acentos (María → maria)
 * - Pasa a minúsculas
 * - Reemplaza espacios y símbolos por guiones
 * - Limita longitud para evitar paths gigantes
 */
function slugifyName(name: string, maxLen = 40): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLen) || 'cliente'
  )
}

function shortIdOf(contractId: string): string {
  return contractId.slice(0, 8).toUpperCase()
}

export type ContractFileStage =
  | 'draft' // sin firmas
  | 'signed-by-investor' // cliente firmó, falta Grandir
  | 'fully-signed' // ambas firmas presentes

const STAGE_SUFFIX: Record<ContractFileStage, string> = {
  draft: '',
  'signed-by-investor': '-firmado-cliente',
  'fully-signed': '-firmado',
}

interface BuildOpts {
  contractId: string
  investorName: string
  stage: ContractFileStage
}

/**
 * Genera el nombre amigable del archivo (lo que ve el admin en la UI).
 */
export function buildContractFileName({
  contractId,
  investorName,
  stage,
}: BuildOpts): string {
  const slug = slugifyName(investorName)
  const short = shortIdOf(contractId)
  return `contrato-${slug}-${short}${STAGE_SUFFIX[stage]}.pdf`
}

/**
 * Genera el storage_path único (con timestamp para evitar colisiones cuando
 * se regenera el PDF en la misma etapa).
 */
export function buildContractStoragePath({
  contractId,
  investorName,
  stage,
}: BuildOpts): string {
  const slug = slugifyName(investorName)
  const short = shortIdOf(contractId)
  const timestamp = Date.now()
  return `${contractId}/${slug}-${short}${STAGE_SUFFIX[stage]}-${timestamp}.pdf`
}
