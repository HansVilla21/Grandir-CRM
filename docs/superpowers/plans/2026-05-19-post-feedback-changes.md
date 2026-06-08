# Cambios Post-Feedback Mayo 19 — Última Ronda del Proyecto

> **Estado:** Plan formal acordado en reunión con Andrés Alvarado (rep April) el 19 de mayo 2026.
> **Alcance:** Esta es la ÚLTIMA ronda formal de cambios del proyecto. Cualquier feature adicional después de esta entrega será trabajo separado con presupuesto aparte.

**Fecha:** 2026-05-19
**Feedback fuente:** `memory/feedback-mayo-19.md` (y transcripción en `Feedback Mayo 19.md`)

---

## Goal

Aplicar la última ronda de cambios definida en la reunión del 19/5 para cerrar formalmente el proyecto. Después de esto, April prueba con grupo reducido de inversionistas reales, reporta bugs, se arreglan → cierre.

## Tech Stack

Sin cambios: Next.js 16 + Supabase + @react-pdf/renderer + Resend + Vercel.

---

## Tareas

### Task 1 — Sistema de plantillas de contratos (CRUD)

**Por qué:** El contrato actual le falta cláusulas vs el machote real. Además los contratos cambian por temporada (ej: diciembre +10%). April necesita poder mantener múltiples plantillas activas.

**Archivos:**

- DB: usar tabla `contract_templates` (ya existe — id, plan_id, name, version, content, active)
- Create: `src/app/(dashboard)/dashboard/settings/_components/contract-templates-section.tsx`
- Create: `src/app/api/settings/contract-templates/route.ts` (GET, POST)
- Create: `src/app/api/settings/contract-templates/[id]/route.ts` (PATCH, DELETE)
- Modify: `src/app/(dashboard)/dashboard/settings/page.tsx` (agregar sección)

**Estructura del `content`:** JSON con secciones del contrato como bloques. Algo así:

```json
{
  "sections": [
    { "id": "header", "type": "header", "text": "CONTRATO DE INVERSIÓN" },
    { "id": "intro", "type": "paragraph", "text": "Entre {{investor_name}}..." },
    { "id": "terms", "type": "paragraph", "text": "El inversionista deposita {{amount}}..." }
  ]
}
```

Las variables `{{investor_name}}`, `{{amount}}`, etc. se sustituyen al generar el PDF.

**Variables disponibles:**

- `{{investor_name}}`, `{{investor_cedula}}`, `{{investor_email}}`, `{{investor_phone}}`
- `{{amount}}`, `{{term_months}}`, `{{annual_rate}}`, `{{plan_name}}`
- `{{start_date}}`, `{{end_date}}`
- `{{contract_id}}`, `{{contract_short_id}}`

**Pasos:**

1. Endpoint GET `/api/settings/contract-templates` que lista templates con `plan` joined
2. Endpoint POST para crear template nuevo (campos: plan_id, name, content)
3. Endpoint PATCH para editar (name, content, active)
4. Endpoint DELETE solo si no está en uso por contratos activos
5. Sección en página de configuración (`/dashboard/settings`) con lista + editor
6. Editor del `content` con tabs por sección o textarea grande (depende de la UX que se elija)
7. Cuando un template esté marcado como `active: false` pero existan contratos creados con él, mantener histórico

### Task 2 — Selector de plantilla al crear contrato + editor inline

**Por qué:** April necesita elegir cuál plantilla aplicar al contrato Y poder modificar el contenido para ESE contrato específico antes de enviarlo a aprobación (override del template).

**Archivos:**

- Modify: `src/app/(dashboard)/dashboard/contracts/_components/new-contract-form.tsx`
- Modify: `src/app/api/contracts/route.ts` (POST) — guardar el contenido renderizado en el contract
- Modify: `src/types/contracts.ts` — agregar `rendered_content` (JSON) y `template_id` al ContractDetail
- DB: agregar columnas a `contracts`:
  - `template_id uuid REFERENCES contract_templates(id)`
  - `rendered_content text` o `jsonb` (el contenido específico de ESE contrato — puede diferir del template si se editó)
- Modify: `src/lib/pdf/contract-templates/base-template.tsx` — generar PDF desde `rendered_content` en vez de hardcoded

**Pasos:**

1. Migración SQL: agregar `template_id` y `rendered_content` a `contracts`
2. En el form de nuevo contrato, agregar dropdown "Plantilla" (filtrado por plan)
3. Mostrar preview del contenido renderizado con las variables sustituidas
4. Botón "Editar contenido de este contrato" → modal con editor para modificar el `rendered_content`
5. Al guardar, persistir `rendered_content` final en el contrato
6. Modificar `generate-contract-pdf.ts` para usar `rendered_content` del contract en vez del template hardcoded

**Decisión arquitectónica:** El `rendered_content` queda guardado EN el contrato (no se vuelve a renderizar desde el template). Esto significa que si el template cambia después, los contratos viejos NO se actualizan automáticamente. Esto es deseable — los contratos firmados no deben cambiar.

### Task 3 — Comprobantes en pagos de comisiones de referidos

**Por qué:** Si un referidor reclama "nunca me pagaste", April debe tener evidencia del pago (igual que para pagos normales).

**Archivos:**

- Modify: `src/app/(dashboard)/dashboard/referrals/_components/commission-pay-button.tsx`
- Modify: `src/app/api/referrals/[id]/route.ts` — aceptar `receipt_path` en el PATCH
- DB: el campo `receipt_path` ya existe en `referral_commissions`. ✅

**Pasos:**

1. Modificar el botón "Marcar pagada" — al hacer click, abrir un modal con:
   - Confirmación
   - Campo de upload de comprobante (PDF/imagen, max 20MB)
2. Subir el comprobante a Supabase Storage (bucket `contracts/commissions/`)
3. Pasar el `storage_path` al PATCH
4. En la tabla de referidos, mostrar un ícono "Ver comprobante" al lado de las comisiones pagadas que tengan receipt_path

### Task 4 — Decisión y ajuste del método de firma

**Bloqueado por:** Respuesta de April vía Andrés.

**Opción A — Firma de admin dentro del CRM:**

- Agregar UI en `/dashboard/contracts/[id]` para que April vea la firma del inversionista y firme dentro del sistema
- Capturar nombre, IP, timestamp, hash del PDF
- Agregar segunda página de certificado de firma con DOS firmas (admin + inversionista)
- Modificar `generateSignedContractPdf` para incluir ambas firmas

**Opción B — Quitar firma electrónica integrada:**

- Eliminar `signing-flow.tsx` del portal del inversionista
- Reemplazar con un componente simple: "Descargá el contrato, fírmalo y subílo de vuelta"
- Mantener `portal-document-upload.tsx` que ya existe
- Limpiar tablas: `verification_codes`, campos `signature_*` en `contract_investors` (mantener por histórico de contratos ya firmados)
- Actualizar email de invitación con instrucciones claras

### Task 5 — Compra del dominio + configuración

**Bloqueado por:** April/Andrés compran el dominio en Cloudflare.

**Pasos cuando esté comprado:**

1. April/Andrés comparten acceso temporal a la cuenta Cloudflare con Hans
2. Configurar registro DNS:
   - CNAME `crm.grandircm.com` → `cname.vercel-dns.com`
   - (O usar el dominio raíz `grandircm.com`)
3. En Vercel, agregar el dominio custom al proyecto
4. En Resend, agregar `grandircm.com` como dominio y verificar (3 TXT records en DNS)
5. Cambiar `src/lib/email/config.ts`:

   ```typescript
   const USE_VERIFIED_DOMAIN = true
   const EMAIL_DOMAIN = 'grandircm.com'
   ```

6. Push a main → deploy → probar que emails llegan a cualquier destinatario (ya no solo al de la cuenta de Resend)

### Task 6 — Comunicación al cliente sobre migración paulatina

**No técnico — preparar documento o email para April con:**

- Recomendación de migrar 10-20 inversionistas primero
- Probar reportes, pagos, firmas con datos reales
- Cuando estén cómodos con el sistema, escalar al resto
- Importancia: evitar errores masivos en primer uso, dar tiempo de aprendizaje

---

## Orden de ejecución sugerido

1. **Arrancar inmediatamente (no bloqueado):**
   - Task 3 (comprobantes en comisiones) — más rápido, gana momentum
   - Task 1 (sistema de plantillas) — el más grande, sentar las bases primero
2. **Después de Task 1:**
   - Task 2 (selector + editor inline) — depende del CRUD de plantillas
3. **Cuando llegue decisión de April:**
   - Task 4 (firma según opción A o B)
4. **Cuando esté comprado el dominio:**
   - Task 5 (DNS + Resend)
5. **Antes de entregar al cliente:**
   - Task 6 (comunicación de migración paulatina)

## Criterio de cierre

El proyecto se considera **cerrado** cuando:

1. Tasks 1-5 estén implementadas y desplegadas
2. April haya hecho pruebas reales con el grupo inicial (10-20 inversionistas)
3. Cualquier bug reportado durante esas pruebas haya sido arreglado
4. April confirme conformidad
5. Hans envíe handoff escrito con: link del CRM, credenciales, documentación de uso, alcance acordado para futuros cambios

## Notas de scope

**SÍ está incluido en esta ronda:**

- Las 5 tasks técnicas + comunicación al cliente
- Arreglo de bugs descubiertos durante las pruebas reales

**NO está incluido (= trabajo extra con presupuesto aparte):**

- Audit log con triggers SQL
- Rate limiting persistente para `/solicitud`
- Validación automática de comprobantes con IA (sec 10.3 del doc cliente, marcado como V2)
- Recordatorios automatizados con cron (notificaciones programadas)
- Multi-firma secuencial de co-inversionistas
- Editor WYSIWYG complejo para plantillas (el actual será un editor simple suficiente)
- Cualquier feature no listada en este plan o en `memory/feedback-mayo-19.md`
