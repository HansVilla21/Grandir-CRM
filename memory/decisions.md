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

## 2026-05-11 — Adopción curada del template `claude-saas-template`
**Decisión:** Copiar al proyecto solo el subset relevante del template madre (`HansVilla21/claude-saas-template`), no instalación completa.
**Razón:** El template es para construir SaaS desde cero; Grandir es un CRM cliente casi terminado. Adoptar todo (17 agentes + 41 skills) hubiera contaminado el contexto con marketing/CRO/branding/SaaS-strategy irrelevantes.
**Qué se copió:**
- 11 skills de seguridad Supabase (`supabase-detect`, `supabase-help`, `supabase-pentest`, `supabase-evidence`, `supabase-report`, audits de auth-config/auth-signup/authenticated/buckets-public/functions/rls)
- `owasp-security` (OWASP Top 10:2025 + ASVS 5.0)
- `ui-styling`, `design-system`, `ui-ux-pro-max` (shadcn + Tailwind + tokens)
- `creador-de-skills` en `.agent/skills/` (meta-skill)
- 3 agentes: `security-auditor`, `penetration-tester`, `debugger`
- `memory/reference/orquestacion-template.md` (patrón de routing como referencia)
**Qué se descartó conscientemente:** agentes `hormozi-strategist`/`saas-strategist`/`pain-discovery`/`billing-engineer`, skills `.agent/` de marketing (avatar/icp/dolor/oferta), suite completa de marketing/CRO (copywriting, page-cro, signup-flow-cro, paywall-upgrade-cro, pricing-strategy, marketing-psychology, email-sequence, social-content, slides, launch-strategy, meta-pixel-capi, product-marketing-context), `onvo-*`, branding (brand/brandkit/banner-design/design), suite GSAP (proyecto usa `motion`), repos de referencia.
**Aplicación inmediata:** correr suite `supabase-pentest` antes de entregar al cliente.

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

## 2026-05-19 — Plantillas de contrato editables + editor inline (post-reunión Andrés)
**Decisión:** Construir CRUD de plantillas múltiples + editor inline del contrato específico antes de enviarlo a aprobación.
**Contexto:** Andrés reportó en la reunión del 19/5 que el contrato actual le faltan cláusulas vs el machote real. Además, los contratos cambian por temporada (ej: diciembre +10%) y a veces hay condiciones personalizadas por contrato.
**Razón:** Que April pueda mantener múltiples plantillas (anual normal, anual promo, etc.) y ajustar contratos específicos sin necesidad de modificar la plantilla global. Evita depender de Hans para cada cambio menor.
**How to apply:** Página en `/dashboard/settings/contract-templates` para CRUD. Selector de plantilla al crear contrato. Modal/editor de "modificar este contrato" antes de cambiar a `pending_approval`. La tabla `contract_templates` ya existe en BD.

## 2026-05-19 — Validación legal de firma electrónica (Ley 8454) confirmada por abogada de April
**Decisión:** La firma electrónica integrada del sistema ES legalmente válida en Costa Rica según Ley 8454, pero AMBAS partes deben firmar con el mismo método.
**Contexto:** Hasta hoy April firma con firma digital del BCCR (la oficial) y los inversionistas firman con el sistema integrado del CRM → métodos distintos → potencialmente inválido legalmente.
**Razón:** La abogada lo confirmó; cumple con la ley si se unifica el método de firma de ambos.
**How to apply:** Pendiente decisión de April entre:
- Opción A: April también firma dentro del CRM (sistema integrado en ambos lados)
- Opción B: Quitar firma integrada del portal del inversionista; volver al flujo upload/download manual (April firma con BCCR, inversionista descarga, firma físicamente o con BCCR, sube)
**Pendiente:** Validar con April qué opción prefiere antes de implementar.

## 2026-05-19 — Dominio se compra con cuenta nueva del cliente, NO de Hans
**Decisión:** El dominio `grandircm.com` (o el que elija April) se compra en Cloudflare desde una cuenta NUEVA con un correo de Grandir, no la cuenta personal de Hans.
**Contexto:** Ya está decidido que se compra el dominio. Andrés preguntó cómo manejar quién lo compra.
**Razón:** El control del dominio debe quedar con el cliente (April) para independencia operativa cuando termine la relación con Hans. Si Hans lo compra con su cuenta, después tendría que transferirlo o el cliente queda atado.
**How to apply:** Andrés/April crean cuenta en Cloudflare con correo de Grandir → compran dominio → comparten acceso con Hans temporalmente para que Hans configure DNS y verifique en Resend → cambian `USE_VERIFIED_DOMAIN = true` en `src/lib/email/config.ts`.

## 2026-05-19 — Migración paulatina de inversionistas (no técnico)
**Decisión:** No migrar a todos los inversionistas de April de golpe al sistema. Empezar con 10-20 y escalar progresivamente.
**Contexto:** Acordado con Andrés en la reunión del 19/5.
**Razón:** Reducir riesgo de errores masivos (ej: emails mal enviados a todos), permitir período de aprendizaje, evitar que el cliente se frustre con bugs iniciales y abandone el sistema.
**How to apply:** Comunicárselo explícitamente a April al entregar el sistema. Va en el handoff escrito.

## 2026-05-19 — Comprobantes obligatorios en pagos de comisiones de referidos
**Decisión:** Al marcar una comisión de referido como pagada, debe poder subirse un comprobante (PDF/imagen), igual que en pagos normales.
**Contexto:** Andrés pidió esto en la reunión — si un referidor reclama "nunca me pagaron", April debe tener evidencia.
**Razón:** Respaldo legal y trazabilidad. El campo `receipt_path` ya existe en `referral_commissions`, solo falta la UI.

## 2026-05-19 — Última ronda formal de cambios antes del cierre del proyecto
**Decisión:** Los cambios definidos en la reunión del 19/5 son la última ronda formal del proyecto. Después, cliente prueba con grupo reducido, reporta bugs, se arreglan → cierre. Nuevas features = trabajo separado con presupuesto aparte.
**Contexto:** Acordado con Andrés. Necesario para evitar scope creep indefinido.
**How to apply:** Comunicar formalmente al cliente (por escrito) cuando se entregue esta versión.
