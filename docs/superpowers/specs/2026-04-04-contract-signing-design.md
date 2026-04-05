# Sistema de Firma Electrónica de Contratos

**Fecha:** 2026-04-04
**Estado:** Aprobado en brainstorming

---

## Resumen

Sistema integrado de firma electrónica para contratos de inversión de Grandir CM. Permite al inversionista revisar, verificar su identidad y firmar contratos desde un portal web con link único. Incluye generación automática de PDFs personalizados, verificación por código de email, audit trail completo y certificado de firma.

## Flujo completo

```
1. Admin crea contrato → estado Borrador
2. Admin sube documentos si necesita (opcional)
3. Admin click "Enviar a aprobación"
   → Sistema genera portal_token
   → Sistema genera PDF del contrato automáticamente (template por plan + datos del inversionista)
   → Sistema envía email al inversionista con link del portal
   → Admin puede copiar link para compartir por WhatsApp/otro medio
4. Inversionista abre link → Portal muestra resumen + PDF descargable
5. Inversionista click "Firmar contrato"
   → Paso 1: Ingresa nombre completo + cédula
   → Sistema valida que coincidan con datos registrados
   → Paso 2: Sistema envía código de verificación (6 dígitos) por email
   → Inversionista ingresa código
   → Paso 3: Checkbox de aceptación + confirmar firma
6. Sistema registra firma (nombre, cédula, timestamp, IP, user agent)
7. Sistema genera PDF firmado (PDF original + página de certificado al final)
8. PDF firmado disponible en portal para descarga
9. Sistema envía email al inversionista con PDF firmado adjunto
10. Sistema envía notificación al admin: "Inversionista X firmó el contrato Y"
11. Admin revisa y activa el contrato manualmente
```

## Decisiones de diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| Envío del link al portal | Email automático + link copiable para admin | Flexibilidad: email formal + WhatsApp informal |
| Verificación de identidad | Nombre + cédula + código email | Máxima seguridad sin fricción excesiva |
| Canal del código de verificación | Email (Resend) | Ya integrado, costo $0 |
| Activación del contrato | Manual por admin tras firma | Admin mantiene control |
| PDF del contrato | Generado automáticamente desde template por plan | Personalizado con datos del inversionista |
| Templates de contrato | 3 templates (Anual, Mensual, Semestral) en HTML→PDF | Uno por plan de inversión |
| Librería de PDF | @react-pdf/renderer | React nativo, funciona en Vercel serverless |
| Firma en el PDF | Página adicional al final (certificado de firma) | Limpio, no altera el contrato original |
| Acceso al PDF firmado | Portal + email automático | Inversionista tiene acceso por ambas vías |
| Base legal | Ley 8454 de Costa Rica (firma electrónica simple) | Audit trail = validez legal |

## Componentes técnicos

### 1. Base de datos

**Migración: campos de firma en `contract_investors`**
```sql
ALTER TABLE contract_investors ADD COLUMN signature_name text;
ALTER TABLE contract_investors ADD COLUMN signature_cedula text;
ALTER TABLE contract_investors ADD COLUMN signature_ip inet;
ALTER TABLE contract_investors ADD COLUMN signature_user_agent text;
ALTER TABLE contract_investors ADD COLUMN signed_at timestamptz;
```

**Nueva tabla: `verification_codes`**
```sql
CREATE TABLE verification_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_investor_id uuid NOT NULL REFERENCES contract_investors(id) ON DELETE CASCADE,
  code text NOT NULL,           -- 6 dígitos
  expires_at timestamptz NOT NULL, -- 10 minutos desde creación
  attempts int DEFAULT 0,       -- máximo 3 intentos
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**Nueva tabla: `contract_templates`**
```sql
CREATE TABLE contract_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES investment_plans(id),
  name text NOT NULL,            -- ej: "Contrato Plan Anual v1"
  version int DEFAULT 1,
  content text NOT NULL,          -- estructura del template (datos para @react-pdf/renderer)
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

RLS habilitado en todas las tablas nuevas.

### 2. Templates de PDF

- 3 templates iniciales (Anual, Mensual, Semestral)
- April provee los documentos de contrato originales
- Se convierten a componentes de `@react-pdf/renderer`
- Variables dinámicas: `{investor_name}`, `{investor_cedula}`, `{amount}`, `{term_months}`, `{start_date}`, `{end_date}`, `{annual_rate}`, `{plan_name}`
- Ubicación: `src/lib/pdf/contract-templates/`

**Página de certificado de firma (última página):**
- Título: "Certificado de Firma Electrónica"
- Datos: nombre del firmante, cédula, fecha y hora, dirección IP
- Texto legal: "Este documento fue firmado electrónicamente de acuerdo con la Ley 8454 de Costa Rica..."
- Hash de verificación del documento (SHA-256)
- Logo de Grandir CM

### 3. API Routes

**Endpoints nuevos:**

| Ruta | Método | Descripción |
|------|--------|-------------|
| `POST /api/portal/[token]/request-code` | POST | Valida nombre+cédula, genera código de 6 dígitos, envía por email. Max 3 intentos por código. Código expira en 10 min. |
| `POST /api/portal/[token]/sign` | POST | Recibe código + checkbox. Valida código, registra firma (IP, user agent, timestamp), genera PDF firmado, envía emails de confirmación. |

**Endpoints modificados:**

| Ruta | Cambio |
|------|--------|
| `PATCH /api/contracts/[id]` | Al cambiar a `pending_approval`: generar tokens, generar PDF del contrato, enviar email de invitación |
| `GET /api/portal/[token]` | Incluir datos de firma si ya firmó, URL del PDF firmado |

### 4. Emails (4 templates nuevos)

**a) Invitación a firmar** (`contract-invitation-email.ts`)
- From: `contratos@grandir.com`
- Asunto: "Tu contrato de inversión está listo para firmar"
- Contenido: saludo, resumen del contrato (plan, monto, plazo), botón "Revisar y firmar contrato" con link al portal
- Diseño consistente con emails existentes (boletines, reportes)

**b) Código de verificación** (`verification-code-email.ts`)
- From: `seguridad@grandir.com`
- Asunto: "Tu código de verificación: XXXXXX"
- Contenido: código de 6 dígitos, aviso de expiración (10 min), nota de seguridad

**c) Confirmación de firma** (`signing-confirmation-email.ts`)
- From: `contratos@grandir.com`
- Asunto: "Contrato firmado exitosamente"
- Contenido: confirmación, resumen, PDF firmado como adjunto (o link de descarga)
- Destinatario: inversionista

**d) Notificación al admin** (`signing-notification-email.ts`)
- From: `sistema@grandir.com`
- Asunto: "Inversionista X firmó el contrato #Y"
- Contenido: datos del inversionista, contrato, link al detalle del contrato en el dashboard
- Destinatario: admin(s) del sistema

### 5. Portal UI (modificaciones)

**Reemplazar botón "Aprobar" por flujo de firma en 3 pasos:**

**Paso 1 — Verificación de identidad**
- Input: nombre completo
- Input: número de cédula
- Botón: "Verificar identidad"
- Validación: coincide con datos del contrato
- Error: "Los datos no coinciden con los registrados"

**Paso 2 — Código de verificación**
- Mensaje: "Enviamos un código de 6 dígitos a tu email (email@parcial.com)"
- Input: código de 6 dígitos
- Link: "Reenviar código" (con cooldown de 60 segundos)
- Error: "Código incorrecto" / "Código expirado"
- Máximo 3 intentos por código

**Paso 3 — Confirmación**
- Checkbox: "He leído el contrato y acepto todos los términos y condiciones establecidos"
- Texto legal visible
- Botón: "Firmar contrato"
- Loading state mientras se procesa

**Pantalla de éxito:**
- Mensaje de confirmación
- Botón para descargar PDF firmado
- Mensaje: "También enviamos una copia a tu email"

### 6. Dashboard del admin (modificaciones)

**En la página de detalle del contrato:**
- Botón "Copiar link del portal" (visible cuando está en pendiente de aprobación)
- Indicador por inversionista: "Pendiente de firma" / "Firmado el DD/MM/YYYY a las HH:MM"
- Botón "Reenviar invitación" por inversionista
- Al enviar a aprobación: validar que el contrato tenga PDF generado

**Notificaciones:**
- Badge en el ícono de notificaciones cuando un inversionista firma
- Entrada en la lista de notificaciones con link al contrato

## Seguridad

- Código de verificación: 6 dígitos, expira en 10 minutos, máximo 3 intentos
- Token del portal: UUID v4, expira en 1 año
- Validación de nombre + cédula contra datos registrados (normalización de acentos y mayúsculas)
- Rate limiting en endpoint de request-code (máximo 5 solicitudes por hora por token)
- Audit trail completo: IP, user agent, timestamp, hash SHA-256 del PDF
- RLS en todas las tablas nuevas
- Emails en modo test en desarrollo (console.log, no envío real)

## Dependencias nuevas

- `@react-pdf/renderer` — generación de PDFs
- Ninguna otra dependencia nueva requerida (Resend ya está instalado)

## Archivos principales

```
src/
├── lib/
│   ├── pdf/
│   │   ├── contract-templates/
│   │   │   ├── annual-template.tsx      # Template plan Anual
│   │   │   ├── monthly-template.tsx     # Template plan Mensual
│   │   │   ├── semiannual-template.tsx  # Template plan Semestral
│   │   │   └── signature-page.tsx       # Página de certificado de firma
│   │   └── generate-contract-pdf.ts     # Lógica de generación
│   └── email/
│       ├── contract-invitation-email.ts
│       ├── verification-code-email.ts
│       ├── signing-confirmation-email.ts
│       └── signing-notification-email.ts
├── app/
│   ├── api/
│   │   └── portal/
│   │       └── [token]/
│   │           ├── request-code/route.ts
│   │           └── sign/route.ts
│   └── (portal)/
│       └── portal/
│           └── [token]/
│               └── _components/
│                   ├── signing-flow.tsx        # Componente principal del flujo
│                   ├── identity-step.tsx       # Paso 1
│                   ├── verification-step.tsx   # Paso 2
│                   └── confirmation-step.tsx   # Paso 3
└── types/
    └── signing.ts                              # Types del sistema de firma
```

## Fuera de alcance (por ahora)

- Editor WYSIWYG para que April edite templates desde el sistema
- Firma digital certificada (Ley 8454 nivel avanzado)
- Verificación por SMS
- Recordatorios automáticos por email si no firma en X días
- Multi-firma secuencial (co-inversionistas firman en orden específico)
