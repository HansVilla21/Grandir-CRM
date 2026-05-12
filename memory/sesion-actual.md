---
name: sesion-actual
description: Punto exacto donde está el proyecto al cierre de la última sesión (2026-05-11)
type: project
---

# Estado al cierre de sesión — 2026-05-11

## TL;DR para próxima sesión

El CRM está **funcionalmente completo**. Falta:
1. Reunión con el cliente (April) para validar firma electrónica y pedir PDFs reales de contratos
2. Configurar Resend en producción (o decidir alternativa)
3. Setear `NEXT_PUBLIC_APP_URL=https://grandircrm.vercel.app` en Vercel
4. Mergear `feat/contract-signing` → `main`

## Lo que se hizo esta sesión (2026-04-04 a 2026-05-11)

### Feature 1: Firma electrónica integrada (Tasks 1-13 del plan contract-signing)
**Plan:** `docs/superpowers/plans/2026-04-04-contract-signing.md`
**Spec:** `docs/superpowers/specs/2026-04-04-contract-signing-design.md`

- Tabla `verification_codes` (códigos de 6 dígitos, expira 10 min, max 3 intentos)
- Tabla `contract_templates` (para futuro, no en uso aún)
- Campos de firma en `contract_investors`: signature_name, signature_cedula, signature_ip, signature_user_agent, signed_at
- 4 templates de email: invitación, código verificación, confirmación firma, notificación admin
- Servicio de verificación: `src/lib/signing/verification.ts`
- API: `POST /api/portal/[token]/request-code`, `POST /api/portal/[token]/sign`
- PDF generation con @react-pdf/renderer (template placeholder hasta tener machotes reales)
- Página de certificado de firma (Ley 8454 CR)
- UI portal: flujo 3 pasos (identidad → código → confirmación)
- Admin: botón copiar link del portal + estado de firma por inversionista
- **Importante:** template de contrato actual es placeholder. Cuando April mande los PDFs reales, reemplazar contenido en `src/lib/pdf/contract-templates/base-template.tsx`

### Feature 2: Formulario externo público (Tasks 1-15 del plan external-application-form)
**Plan:** `docs/superpowers/plans/2026-04-05-external-application-form.md`
**Spec:** `docs/superpowers/specs/2026-04-05-external-application-form-design.md`

- Campo `source` en contracts (enum 'external_form' | 'manual')
- Página pública `/solicitud` (sin auth)
- Calculadora dinámica de inversión (lógica pura en `src/lib/investment/calculator.ts`)
- Componentes reutilizables: InvestmentCalculator, PlanSelector, BeneficiaryForm
- API: `POST /api/applications` con rate limit (5/hora por IP, in-memory)
- API: `GET /api/applications/plans` para mostrar planes activos
- Email al admin con nueva solicitud
- Notificación in-app
- Filtro por origen en dashboard de contratos
- Badge visual (verde "Externa" / zinc "Manual")
- Botón "Link de solicitud" en lista de contratos y settings/planes
- localStorage para guardar progreso del formulario
- Beneficiarios opcionales en esta etapa

### Fixes en esta sesión
- `createServiceClient` separado para portal público (RLS bypass real)
- Verificación de identidad simplificada a solo cédula (sin nombre)
- Storage RLS endurecido para producción
- Todos los emails en try/catch (no bloquean si Resend falla)
- Bug del doble sidebar resuelto (solo renderizar cuando isOpen)
- Bug de formatDate en portal con timestamps ISO completos
- Botón "Copiar link del portal" arreglado (estructura de respuesta API)

## Git

- **Rama activa:** `feat/contract-signing`
- **Commits ahead de main:** 31
- **Estado:** working tree limpio (solo `.claude/settings.local.json` modificado, que NO se commitea)
- **Pendiente:** merge a main

## Variables de entorno en producción (Vercel)

| Variable | Estado | Notas |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Configurada | Proyecto CRM |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Configurada | |
| `SUPABASE_SERVICE_ROLE_KEY` | Configurada | |
| `RESEND_API_KEY` | ⚠️ No configurada | Decisión pendiente con cliente |
| `NEXT_PUBLIC_APP_URL` | ⚠️ Falta setear | Debería ser `https://grandircrm.vercel.app` |

## Próximos pasos (en orden de prioridad)

1. **Reunión con April** para mostrar:
   - Flujo completo del CRM (todo funciona)
   - Sistema de firma electrónica (decidir si va o se cambia por externo)
   - Formulario público `/solicitud` (mostrar el link copiable)
2. **Conseguir los PDFs reales** de contratos (Anual, Mensual, Semestral) y reemplazar el template placeholder
3. **Configurar Resend** o definir alternativa para emails en producción
4. **Mergear a main** y deployar a Vercel
5. **Cosas menores pendientes** (no críticas):
   - Notificaciones con anticipación configurable (sección 15.6 del doc cliente)
   - IA para validación de comprobantes (sección 10.3, V2)
   - Audit log automático con triggers
   - Rate limiting persistente (no in-memory) para producción real
   - Sección de proyección dentro del contrato (sección 17.2 del doc cliente)
   - Calculadora también en formulario interno del dashboard (no urgente, ya funciona sin ella)

## Archivos clave para entender el sistema rápido

- `CLAUDE.md` — Instrucciones del proyecto
- `docs/requerimientos-cliente/Dashboard GrandirCM (5).pdf` — Lo que pidió el cliente originalmente
- `docs/superpowers/specs/2026-03-26-grandir-crm-master-spec.md` — Spec inicial del sistema
- `memory/decisions.md` — Por qué tomamos cada decisión
- `memory/learnings.md` — Patrones técnicos y gotchas resueltos
- `src/types/database.ts` — Schema completo de BD (autogenerado de Supabase)
- `src/lib/supabase/server.ts` — 2 clientes: createAdminClient (cookies) + createServiceClient (bypass RLS)

## Información del usuario (Hans)

- Es freelancer construyendo este CRM para April Mora Araya (Grandir CM)
- Presupuesto: $3,500 USD, plazo 30 días desde 2026-03-26
- Prefiere lenguaje natural, NO slash commands
- Quiere opciones normalizadas/escalables/robustas sin preguntar
- UI: minimalista, moderna, sin exceso de color
- Todo debe ser responsive (mobile-first)
- Idioma: español en UI, inglés en código
