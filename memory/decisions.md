---
name: decisions
description: Decisiones técnicas importantes tomadas en el proyecto Grandir CRM
type: project
---

# Decisiones Técnicas

## 2026-03-26 — Stack tecnológico
**Decisión:** Next.js 14+ + Supabase + shadcn/ui + Resend + Vercel
**Razón:** Stack moderno con MCP tools disponibles (Supabase y Vercel MCPs conectados), reducción de infraestructura, fácil deploy.

## 2026-03-26 — Portal del inversionista
**Decisión:** Acceso por token único por URL, sin cuenta de usuario
**Razón:** El inversionista no necesita recordar credenciales; accede por link enviado por email cuando hay una acción requerida.

## 2026-03-26 — Metodología de desarrollo
**Decisión:** superpowers (brainstorming → writing-plans → subagent-driven-development)
**Razón:** Proyecto con 30 días de plazo y alta complejidad; necesita diseño sólido antes de codear.

## 2026-04-04 — Sistema propio de firma electrónica
**Decisión:** Construir sistema propio de firma electrónica integrado al portal, NO usar plataforma externa como DocuSign.
**Contexto:** El cliente originalmente pidió "firmas externas mediante firma digital" (sección 9.1 del documento del cliente). Cambiamos a sistema integrado.
**Razón:**
- Costo $0 (DocuSign cobra ~$1-3 por firma)
- Sin dependencia de terceros
- Control total del flujo
- Legal en CR según Ley 8454 (firma electrónica simple con audit trail)
**Pendiente:** Validar con April en próxima reunión que el sistema propio le sirve.

## 2026-04-04 — Verificación de identidad solo por cédula
**Decisión:** En el portal de firma, solo se valida la cédula (no nombre + cédula).
**Razón:** El usuario reportó fricción al validar nombre — apellidos, acentos, espacios causan errores. Cédula es suficiente y único.

## 2026-04-04 — PDF con @react-pdf/renderer (no Puppeteer)
**Decisión:** Usar `@react-pdf/renderer` para generar PDFs.
**Razón:** Funciona en Vercel serverless sin instalar Chrome. Componentes en React. Suficiente para contratos (texto + tablas).

## 2026-04-04 — Cliente Supabase service_role separado
**Decisión:** Crear `createServiceClient()` en `src/lib/supabase/server.ts` separado del `createAdminClient()` existente.
**Contexto:** `createAdminClient` usa `@supabase/ssr` que lee cookies del navegador. En endpoints del portal (sin cookies de usuario logueado), RLS bloqueaba operaciones.
**Razón:** `createServiceClient` usa `@supabase/supabase-js` directo con service_role key, bypassea RLS completamente. Se usa SOLO en endpoints públicos del portal y operaciones que NO deben depender de cookies del usuario.

## 2026-04-04 — Página de certificado de firma (no sello en cada página)
**Decisión:** El PDF firmado tiene una página adicional al final con el certificado de firma (datos, hash, IP, timestamp).
**Razón:** Más limpio que sellar cada página, mantiene el contrato original intacto, fácil de leer legalmente.

## 2026-04-05 — Sin landing page previa al formulario público
**Decisión:** `/solicitud` arranca directo en el formulario, sin landing.
**Razón:** El cliente no pagó por una landing page, evitamos sobreentregar. Posible upsell futuro.

## 2026-04-05 — Sin features/benefits inventados en planes
**Decisión:** En el formulario público, las cards de planes muestran SOLO los datos reales de BD (nombre, monto mínimo, %, descripción).
**Razón:** No inventar features que el cliente no ofrece. No conocemos el negocio profundamente; no comprometer al cliente con cosas que no dijo.

## 2026-04-05 — Beneficiarios opcionales en formulario externo
**Decisión:** El formulario público permite agregar beneficiarios pero no los exige.
**Razón:** Reducir fricción inicial. El admin puede pedirlos después en el dashboard.

## 2026-04-05 — Campo `source` en contracts
**Decisión:** Agregar enum `contract_source` ('external_form' | 'manual') a la tabla `contracts`.
**Razón:** Métricas de conversión para April — saber cuántas solicitudes vienen del formulario público vs manuales.

## 2026-05-11 — Emails en try/catch (no bloqueantes)
**Decisión:** Todos los envíos de email envueltos en try/catch — si Resend falla, se loguea pero la operación continúa.
**Razón:** El cliente aún no ha definido cómo manejar emails en producción. Sin `RESEND_API_KEY` configurada, todo el flujo se rompía al "Enviar a aprobación". Ahora funciona aunque los emails no se envíen.

## 2026-05-11 — Storage RLS restringido
**Decisión:** Storage policy de bucket `contracts` requiere `auth.role() = 'service_role'` para INSERT/UPDATE/DELETE y `auth.role() = 'authenticated'` para SELECT.
**Contexto:** Anteriormente la policy era abierta (cualquiera podía acceder al bucket). Se cerró antes de producción.
**Razón:** Seguridad — solo el servidor (vía service_role) puede subir/modificar archivos, y solo usuarios logueados pueden leer.
