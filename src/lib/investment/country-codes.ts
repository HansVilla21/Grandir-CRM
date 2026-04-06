export interface CountryCode {
  code: string
  country: string
  label: string
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+506', country: 'CR', label: 'Costa Rica' },
  { code: '+1', country: 'US', label: 'Estados Unidos' },
  { code: '+52', country: 'MX', label: 'México' },
  { code: '+57', country: 'CO', label: 'Colombia' },
  { code: '+507', country: 'PA', label: 'Panamá' },
  { code: '+503', country: 'SV', label: 'El Salvador' },
  { code: '+502', country: 'GT', label: 'Guatemala' },
  { code: '+504', country: 'HN', label: 'Honduras' },
  { code: '+505', country: 'NI', label: 'Nicaragua' },
  { code: '+34', country: 'ES', label: 'España' },
  { code: '+44', country: 'GB', label: 'Reino Unido' },
  { code: '+55', country: 'BR', label: 'Brasil' },
  { code: '+54', country: 'AR', label: 'Argentina' },
  { code: '+56', country: 'CL', label: 'Chile' },
  { code: '+51', country: 'PE', label: 'Perú' },
  { code: '+593', country: 'EC', label: 'Ecuador' },
]
