/**
 * Configuración centralizada de remitentes de email.
 *
 * Mientras Grandir CM no tenga dominio propio verificado en Resend,
 * todos los emails salen desde `onboarding@resend.dev` (dominio sandbox de Resend).
 *
 * Cuando se compre el dominio (ej: grandircm.com) y se verifique en Resend:
 * 1. Cambiar EMAIL_DOMAIN a 'grandircm.com'
 * 2. Cambiar USE_VERIFIED_DOMAIN a true
 * Los emails empezarán a salir desde direcciones reales como `contratos@grandircm.com`.
 */

const USE_VERIFIED_DOMAIN = false
const EMAIL_DOMAIN = 'grandircm.com' // cuando se compre

function buildFrom(localPart: string): string {
  if (USE_VERIFIED_DOMAIN) {
    return `Grandir CM <${localPart}@${EMAIL_DOMAIN}>`
  }
  return `Grandir CM <onboarding@resend.dev>`
}

export const EMAIL_FROM = {
  contratos: buildFrom('contratos'),
  comunicados: buildFrom('comunicados'),
  reportes: buildFrom('reportes'),
  seguridad: buildFrom('seguridad'),
  sistema: buildFrom('sistema'),
} as const
