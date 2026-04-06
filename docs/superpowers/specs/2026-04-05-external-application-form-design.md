# Formulario Externo de Solicitud + Calculadora Dinámica

**Fecha:** 2026-04-05
**Estado:** Aprobado en brainstorming
**Cliente:** Grandir CM — Requerimiento explícito en sección 1.1 y 17.2 del documento del cliente

---

## Resumen

Formulario público accesible sin login que permite a potenciales inversionistas solicitar un contrato. Incluye selección de plan, calculadora dinámica de rendimiento, datos personales y beneficiarios opcionales. Al enviar, crea automáticamente el perfil del inversionista y un contrato en estado borrador, notificando al admin.

## Justificación

Requerimiento explícito del cliente en el documento **"Lista de requerimientos del dashboard"**:

> **Sección 1.1** — "El sistema debe permitir la creación de inversionistas mediante un link externo que dirija a un formulario."
>
> "El formulario debe incluir una calculadora dinámica que, según el monto y el plan elegido: calcule el rendimiento, calcule los plazos, muestre la lógica de depósitos o desembolsos correspondiente al plan seleccionado."
>
> "Al enviar el formulario: el sistema debe crear automáticamente el perfil del inversionista en el dashboard. El sistema debe generar automáticamente un contrato en estado borrador, según el plan elegido y la plantilla correspondiente."

Además, sección 17.2:
> "Dentro de cada contrato puede existir una sección descriptiva de cálculo de rendimiento. Esta sección puede reutilizar la lógica de cálculo ya mostrada en el formulario inicial."

## Flujo completo

```
1. Usuario abre /solicitud (sin login)
   → Ve cards de planes disponibles (datos reales de BD)
2. Usuario selecciona un plan
   → Se muestra la calculadora dinámica
3. Usuario ingresa monto
   → Calculadora actualiza en vivo: rendimiento, fechas, cronograma
4. Usuario llena datos personales (nombre, cédula, teléfono, email)
5. Usuario agrega beneficiarios (opcional, hasta 4)
6. Usuario acepta consentimiento y envía
   → Sistema crea/reusa investor
   → Sistema crea contract con status='draft', source='external_form'
   → Sistema crea contract_investor (holder)
   → Sistema crea contract_beneficiaries si aplica
   → Sistema notifica al admin (interno + email)
7. Usuario ve pantalla de confirmación
8. Admin revisa el borrador en el dashboard y procede normalmente
```

## Decisiones de diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| URL | `/solicitud` | Todo el proyecto está en español |
| Persistencia | BD al enviar + localStorage mientras llena | Métricas para el cliente + UX fluida |
| Marketing de planes | Solo datos reales de BD (nombre, monto, %, descripción) | No inventar features que el cliente no ofrece |
| Landing previa | No | Fuera de scope; posible upsell futuro |
| Beneficiarios | Opcional en esta etapa | Reducir fricción inicial; admin los completa después |
| Campo `source` | Agregar a `contracts` (`external_form` \| `manual`) | Métricas de conversión para April |
| Cédula duplicada | Reusar investor existente | Un inversionista puede aplicar múltiples contratos |
| Calculadora | Componente reutilizable | Se usará en: formulario externo, formulario interno, sección proyección del contrato |
| Autenticación | No (público) | Requerimiento del cliente |

## Componentes técnicos

### 1. Base de datos

**Migración: campo `source` en `contracts`**
```sql
CREATE TYPE contract_source AS ENUM ('external_form', 'manual');

ALTER TABLE contracts
  ADD COLUMN source contract_source NOT NULL DEFAULT 'manual';

-- Actualizar contratos existentes
UPDATE contracts SET source = 'manual' WHERE source IS NULL;
```

### 2. Calculadora (componente reutilizable)

**Archivo:** `src/lib/investment/calculator.ts`

Funciones puras para cálculos. Sin dependencias de React. Testeables.

```typescript
export interface CalculatorInput {
  planType: 'annual' | 'monthly' | 'semestral'
  annualRate: number // ej: 120 para 120%
  amount: number
  termMonths: number
  startDate?: Date // default: hoy
}

export interface PaymentScheduleItem {
  date: Date
  type: 'deposit' | 'return'
  amount: number
  description: string
}

export interface CalculatorResult {
  totalReturn: number // monto total de rendimiento en $
  totalPayout: number // capital + rendimiento
  endDate: Date
  schedule: PaymentScheduleItem[]
}

export function calculateInvestment(input: CalculatorInput): CalculatorResult
```

**Lógica por plan (según documento del cliente sección 4.2):**

- **Anual (120%):** Pago único al final. Total = monto × (1 + 120/100)
- **Mensual (125%):** 10% del capital mensual desde mes 3. Resto al final del año.
- **Semestral (135%):** Desembolsos semestrales del 40% del capital + rendimiento.

### 3. Componente UI de calculadora

**Archivo:** `src/components/investment/investment-calculator.tsx`

Componente React que usa `calculateInvestment()` y muestra:
- Resumen (capital, rendimiento, total)
- Fecha de vencimiento
- Tabla de cronograma de pagos

Props:
```typescript
interface InvestmentCalculatorProps {
  planType: 'annual' | 'monthly' | 'semestral'
  annualRate: number
  amount: number
  termMonths: number
  startDate?: Date
}
```

### 4. API Route

**Archivo:** `src/app/api/applications/route.ts`

**POST /api/applications** (público, sin auth):

Body:
```typescript
{
  full_name: string
  cedula: string
  phone: string
  email: string
  plan_id: string
  amount: number
  term_months: number
  beneficiaries?: Array<{
    full_name: string
    cedula: string
    phone: string
  }>
}
```

Lógica:
1. Validar datos de entrada
2. Buscar investor por cédula → si existe, reusar; si no, crear
3. Crear contract (status='draft', source='external_form')
4. Crear contract_investor (role='holder', approval_status='pending')
5. Crear beneficiarios si se enviaron
6. Crear notificación interna para admin
7. Enviar email al admin (usando Resend en modo test en dev)
8. Retornar `{ success: true, application_id: contract.id }`

**GET /api/applications/plans** (público):
Retorna los planes activos (`investment_plans` donde `active = true`) para el formulario público.

### 5. Página del formulario público

**Archivo:** `src/app/(portal)/solicitud/page.tsx`

Server component que:
1. Fetch de planes activos desde BD
2. Renderiza el `<ApplicationForm>` (client component) con los planes

**Archivo:** `src/app/(portal)/solicitud/_components/application-form.tsx`

Client component con las 5 secciones en una sola página (scroll vertical):

**Layout:**
- Header simple con logo "Grandir CM" (sin navegación)
- Título: "Solicitá tu inversión"
- Secciones en orden
- Footer mínimo

**Sección 1 — Plan** (cards)
- Grid de cards (1 col mobile, 2 md, 3 lg)
- Cada card: nombre, monto mínimo, %, descripción
- Click = selecciona ese plan
- Visual claro del seleccionado (border verde + checkmark)

**Sección 2 — Calculadora** (aparece al seleccionar plan)
- Input de monto con validación contra monto mínimo del plan
- `<InvestmentCalculator>` componente
- Se actualiza en vivo con debounce (300ms)

**Sección 3 — Datos personales**
- Nombre completo (texto)
- Cédula (con formato automático X-XXXX-XXXX como en investor-form existente)
- Teléfono (con selector de país, reusar el de `investor-form.tsx`)
- Email (con validación)

**Sección 4 — Beneficiarios** (opcional, colapsable)
- Botón "Agregar beneficiario" (hasta 4)
- Por cada beneficiario: nombre, cédula, teléfono, botón eliminar
- Texto informativo: "Opcional. Puedes agregarlos después."

**Sección 5 — Enviar**
- Checkbox: "Entiendo que esta es una solicitud y Grandir CM se contactará conmigo"
- Botón "Enviar solicitud" (primary, large)
- Loading state
- Error state

**Pantalla de éxito** (reemplaza el form):
- Checkmark verde
- Título: "¡Solicitud recibida!"
- Mensaje: "Hemos recibido tu solicitud. El equipo de Grandir CM se pondrá en contacto contigo pronto para continuar el proceso."
- Botón: "Volver al inicio" (va a /)

### 6. Persistencia local (draft)

**Archivo:** `src/app/(portal)/solicitud/_components/use-form-draft.ts`

Hook que guarda/restaura el estado del formulario en localStorage:
- Key: `grandir_application_draft`
- Guarda al cambiar cualquier campo (debounced 500ms)
- Restaura al montar el componente
- Limpia al enviar exitosamente

### 7. Layout de ruta pública

El formulario va en `src/app/(portal)/solicitud/` que ya tiene layout público mínimo (sin sidebar del dashboard, sin auth).

Si el layout actual de `(portal)` no sirve, crear uno nuevo simple con solo el header de Grandir CM.

### 8. Notificación al admin

Al enviar una solicitud, crear una entrada en la tabla `notifications`:
```typescript
{
  type: 'new_application',
  title: 'Nueva solicitud externa',
  message: `${investor.full_name} solicitó un contrato del plan ${plan.name} por ${formatCurrency(amount)}`,
  link: `/dashboard/contracts/${contract.id}`,
  channel: 'both',
  read: false
}
```

Y enviar email a los admins usando un nuevo template `new-application-email.ts`.

### 9. Dashboard: filtro por source

En la lista de contratos (`/dashboard/contracts`), agregar un filtro de "Origen" con opciones: Todos, Formulario externo, Manual. Esto le da a April métricas visibles de conversión.

## Archivos principales

### Nuevos
```
src/
├── lib/
│   └── investment/
│       └── calculator.ts                  # Lógica pura de cálculo
├── components/
│   └── investment/
│       └── investment-calculator.tsx       # UI de calculadora
├── app/
│   ├── (portal)/
│   │   └── solicitud/
│   │       ├── page.tsx                   # Página pública
│   │       └── _components/
│   │           ├── application-form.tsx   # Formulario completo
│   │           ├── plan-selector.tsx      # Cards de planes
│   │           ├── beneficiary-form.tsx   # Sub-form de beneficiarios
│   │           └── use-form-draft.ts      # Hook localStorage
│   └── api/
│       └── applications/
│           ├── route.ts                   # POST /api/applications
│           └── plans/
│               └── route.ts               # GET /api/applications/plans
└── lib/
    └── email/
        └── new-application-email.ts       # Email al admin
```

### Modificados
```
supabase/migrations/20260405120000_contract_source.sql   # migración source
src/app/(dashboard)/dashboard/contracts/page.tsx          # filtro origen
src/types/database.ts                                     # tipo source
src/types/contracts.ts                                    # ContractSource type
```

## Validaciones

**Frontend:**
- Nombre: requerido, mín 3 caracteres
- Cédula: requerido, 9 dígitos (formato CR)
- Teléfono: requerido, mín 7 dígitos
- Email: requerido, formato válido
- Plan: requerido
- Monto: requerido, ≥ monto mínimo del plan
- Plazo: número de meses (depende del plan, default según plan)
- Beneficiarios (si hay): todos los campos requeridos para cada uno
- Checkbox consentimiento: requerido

**Backend:**
- Misma validación que frontend
- Validar que el plan exista y esté activo
- Validar que amount ≥ min_amount del plan
- Rate limiting: máx 5 solicitudes por IP por hora (prevenir spam)

## Seguridad

- Ruta pública sin auth
- Rate limiting por IP (5 solicitudes/hora)
- Validación estricta de inputs
- Usar `createServiceClient` (no depende de cookies de auth)
- No exponer datos sensibles en la respuesta
- Cédula duplicada: reusar investor silenciosamente (no revelar si existe o no)

## Responsive

- Mobile first
- Cards de planes: 1 columna en móvil, 2 en tablet, 3 en desktop
- Formulario: ancho máximo 640px, centrado
- Calculadora: fila horizontal en desktop, apilada en móvil
- Botones: ancho completo en móvil, auto en desktop

## Fuera de alcance

- Landing page previa (upsell futuro)
- Envío de email al inversionista confirmando recepción (por ahora solo al admin)
- Multi-idioma
- Progress save en BD (solo localStorage)
- Recuperación de draft cross-device
- Captcha anti-bot (si se necesita, V2)
