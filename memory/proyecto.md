---
name: proyecto-grandir-crm
description: Estado y contexto general del proyecto Grandir CRM — actualizado 2026-05-19 (post-reunión Andrés)
type: project
---

# Grandir CRM — Estado del Proyecto

## Contexto del cliente

- **Cliente:** April Mora Araya — Grandir CM Sociedad de Responsabilidad Limitada (cédula jurídica 3-102-873916)
- **Contacto principal en el día a día:** Andrés Alvarado
- **Negocio:** Fondo de inversión costarricense
- **Presupuesto base:** $3,500 USD
- **Inicio:** 2026-03-26
- **Dominio actual:** `https://grandircrm.vercel.app` (Vercel free)
- **Dominio futuro:** `grandircm.com` (a comprar por April/Andrés en Cloudflare)

## Estado actual (2026-05-19)

**Fase:** Sistema en producción funcional, esperando ÚLTIMA ronda de cambios + período de uso real → cierre del proyecto.

**Rama activa:** `main` (todo mergeado)
**Próxima ronda definida en:** `memory/feedback-mayo-19.md` y `docs/superpowers/plans/2026-05-19-post-feedback-changes.md`

## Acuerdo de cierre formal

Andrés (rep de April) acordó en la reunión del 19/5 que:
1. Esta es la ÚLTIMA ronda formal de cambios
2. Después de aplicar estos cambios, April prueba con 10-20 inversionistas reales
3. Si encuentra bugs, se arreglan como cierre
4. Cualquier feature adicional = trabajo separado con presupuesto aparte

## Módulos del sistema — Estado

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth + roles (Admin/Asistente) | ✅ Completo | Supabase Auth, sin auto-registro |
| Inversionistas | ✅ Completo | CRUD + edición de email + delete |
| Planes de inversión | ✅ Completo | CRUD desde settings |
| Contratos | 🟡 Funcional | **PENDIENTE: sistema de plantillas + editor inline** |
| Portal del inversionista | ✅ Completo | Acceso por token |
| **Firma electrónica** | 🟡 Funcional | **PENDIENTE: definir opción A o B (validación Ley 8454 OK)** |
| Formulario externo `/solicitud` | ✅ Completo | Con calculadora dinámica |
| Pagos y depósitos | ✅ Completo | Con próximos pagos auto-calculados |
| Reportes periódicos | ✅ Completo | Auto-PDF + generación batch + alerta vencidos |
| Boletines | ✅ Completo | Segmentación + contador real |
| Notificaciones | ✅ Completo | Scan auto + bell dropdown + triggers en todo |
| Referidos | 🟡 Casi completo | **PENDIENTE: subir comprobante al pagar comisión** |
| Dashboard métricas | ✅ Completo | Widget próximos pagos |
| Documentos adjuntos | ✅ Completo | Storage RLS endurecido |
| Audit log | ❌ Solo estructura | Tabla existe, no se rellena (fuera de scope de cierre) |

## Pendiente para cierre (próxima ronda)

### Bloqueados — esperando al cliente

1. **Decisión sobre firma** (opción A o B) — April vía Andrés
2. **Compra del dominio** en Cloudflare — April/Andrés con cuenta nueva

### Para arrancar ya (no bloqueados)

3. **Sistema de plantillas de contratos** (CRUD en Configuración)
4. **Editor inline de contrato específico** (override de plantilla antes de enviar a aprobación)
5. **Comprobantes en pagos de comisiones de referidos**

### Para hacer cuando llegue lo bloqueado

6. **Implementar firma según opción A o B**
7. **Configurar DNS + Resend con dominio nuevo**

### Comunicación al cliente (no técnico)

8. **Plan de migración paulatina** — explicarle a April que arranque con 10-20 inversionistas, no todos de golpe

## Stack técnico

- **Frontend/Backend:** Next.js 16 (App Router) + TypeScript + Turbopack
- **DB:** Supabase (PostgreSQL) — proyecto `cnptjdtmvoxqxdxmzsbe`
- **Storage:** Supabase Storage (bucket `contracts`)
- **Auth:** Supabase Auth
- **Email:** Resend (`onboarding@resend.dev` hoy → `grandircm.com` cuando se compre)
- **PDF:** @react-pdf/renderer
- **UI:** shadcn/ui + Tailwind CSS v4
- **Deploy:** Vercel (auto desde `main`)

## Documentos de referencia

- `memory/feedback-mayo-19.md` — Feedback estructurado de la reunión
- `memory/decisions.md` — Todas las decisiones técnicas
- `memory/learnings.md` — Patrones y gotchas
- `docs/superpowers/plans/2026-05-19-post-feedback-changes.md` — Plan formal de la próxima ronda
- `docs/requerimientos-cliente/` — Documentos originales del cliente (Dashboard PDF + 3 machotes de contratos)
- `Feedback Mayo 19.md` — Transcripción cruda de la reunión
