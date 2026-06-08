---
name: sesion-actual
description: Checkpoint al 19 de mayo 2026 después de reunión con Andrés — última ronda formal de cambios definida.
type: project
---

# Checkpoint — 2026-05-19

## TL;DR para próxima sesión

El sistema está en producción (`grandircrm.vercel.app`) con Resend funcionando vía `onboarding@resend.dev`. Hoy hubo reunión con Andrés Alvarado (April no asistió). Se definieron los cambios de **la última ronda formal del proyecto**. Después de aplicar estos cambios y un período de uso real con grupo reducido, se cierra formalmente el proyecto.

**Estado de la rama:** `main` (todo mergeado, sin commits pendientes)
**Último commit:** `43c418e fix: contador real de destinatarios del boletín antes de enviar`

## Lo que se hizo en esta sesión (12 → 19 mayo)

### Features implementadas
- **Próximos Pagos** con cálculo automático del cronograma, widget en dashboard y filtros
- **Reportes con auto-PDF** y generación en lote (batch) con UX mejorada (tasa de crecimiento bien explicada, monto auto-calculado, período prellenado)
- **Sistema completo de notificaciones**: scan automático de eventos basados en tiempo (vencimientos, desembolsos, reportes pendientes, procesos demorados), bell con dropdown interactivo, triggers en TODOS los eventos importantes (creación, transiciones, verificaciones, envíos), filtros por estado y tipo
- **Calculadora reutilizable** en 3 lugares (`/solicitud`, formulario interno de contrato, detalle del contrato)
- **UX professional**: reemplazo de `window.confirm`/`alert` nativos por `ConfirmDialog` + `Toast`
- **Edición de email del inversionista** (antes era create-only)
- **Centralización de remitentes de email** en `src/lib/email/config.ts` (preparado para cambiar a dominio propio en 1 línea)

### Fixes críticos
- RLS en Storage para PDFs (createServiceClient en uploads)
- Bucket unificado: todos los PDFs en `contracts/` (antes había referencias a `reports/` bucket inexistente)
- `/solicitud` con `dynamic = 'force-dynamic'` para evitar prerender error en Vercel
- Contador real de destinatarios en boletines (antes mostraba 0)
- Refresh instantáneo en columnas de pagos al verificar
- Layout del formulario "Nuevo contrato" — aprovecha mejor el espacio

### Deploy
- Producción funcionando en `https://grandircrm.vercel.app`
- Resend configurado con `RESEND_API_KEY` en Vercel
- Emails funcionan a TU EMAIL solamente (limitación de `onboarding@resend.dev` hasta verificar dominio)

## Feedback de la reunión del 19/5

Ver detalle completo en `memory/feedback-mayo-19.md`. Resumen:

| # | Cambio | Estado | Bloqueado por |
|---|--------|--------|---------------|
| 1 | Decisión sobre método de firma (A o B) | Esperando | April vía Andrés |
| 2 | Sistema de plantillas de contratos (CRUD) | Para hacer | — |
| 3 | Editor inline de contrato específico | Para hacer | #2 |
| 4 | Comprobante al pagar comisión de referido | Para hacer | — |
| 5 | Compra del dominio + configuración DNS y Resend | Esperando | April/Andrés compran |
| 6 | Implementación de firma según opción A o B | Para hacer | #1 |
| 7 | Comunicar plan de migración paulatina | Para hacer | — |

## Plan de trabajo

**Plan formal en `docs/superpowers/plans/2026-05-19-post-feedback-changes.md`**

Orden sugerido:
1. **Arrancar:** Sistema de plantillas + editor inline de contratos (P1, P2 del feedback)
2. **En paralelo:** Comprobantes en comisiones de referidos (P3, rápido)
3. **Cuando April decida:** Firma (opción A o B)
4. **Cuando compren dominio:** DNS + Resend en prod

## Próxima acción al abrir nueva sesión

1. Leer `memory/sesion-actual.md` y `memory/feedback-mayo-19.md` primero
2. Verificar si April ya respondió sobre la firma (P1)
3. Arrancar con plantillas de contratos según el plan en `docs/superpowers/plans/2026-05-19-post-feedback-changes.md`

## Archivos clave que se modificaron en esta sesión

```
src/lib/email/config.ts                                 # NEW — centraliza remitentes
src/app/api/notifications/scan/route.ts                 # NEW — scan de eventos basados en tiempo
src/components/layout/notifications-bell.tsx            # bell con dropdown
src/lib/notifications/notify-admins.ts                  # helper con exclude_user_id
src/lib/investment/upcoming-payments.ts                 # NEW — lógica próximos pagos
src/app/api/payments/upcoming/route.ts                  # NEW
src/lib/pdf/report-templates/                           # NEW — template de PDF de reportes
src/lib/pdf/generate-report-pdf.ts                      # NEW
src/app/api/reports/batch/route.ts                      # NEW — generación en lote
src/app/(dashboard)/dashboard/notifications/...         # filtros y mark-as-read
src/components/ui/confirm-dialog.tsx                    # NEW — modal custom
src/components/ui/toast.tsx                             # NEW — sistema de toasts
```

## Notas operativas

- **Vercel deploy:** automático al push a `main`
- **Limitación actual de emails:** solo llegan al email registrado en Resend (`onboarding@resend.dev`)
- **Cuando se compre dominio:** cambiar `USE_VERIFIED_DOMAIN = true` y `EMAIL_DOMAIN = '...'` en `src/lib/email/config.ts`
- **Cuenta de Vercel:** repo `HansVilla21/Grandir-CRM`, dominio actual `grandircrm.vercel.app`
- **Repo público:** sí (para que Vercel Hobby pueda deployar sin restricciones de team)
