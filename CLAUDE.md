# Grandir CRM

## Qué es este proyecto

CRM interno para **Grandir CM** — un fondo de inversión costarricense. Centraliza la gestión de inversionistas, contratos, reportes periódicos y control operativo, reemplazando el flujo manual de Excel + carpetas + seguimiento por correo.

## El Negocio

- **Cliente:** April Mora Araya / Grandir CM Sociedad de Responsabilidad Limitada (cédula jurídica 3-102-873916)
- **Operación:** Fondo de inversión con planes Anual, Mensual y Semestral
- **Usuarios del sistema:** Equipo interno (administradores y asistentes)
- **Inversionistas:** Clientes externos que invierten en el fondo

### Planes de inversión (2026)
| Plan | Mínimo | Rendimiento | Pago |
|------|--------|-------------|------|
| Anual | $1,000 | 120% anual | Al vencimiento |
| Mensual | $10,000 | 125% anual | 10% mensual desde mes 3 |
| Semestral | $10,000 | 135% anual | 40% semestral |

### Estados del contrato
`Borrador` → `Pendiente de aprobación` → `Activo` → `Vencido`
Con bifurcaciones a: `Revisión solicitada` / `Cancelado antes de tiempo`

## Stack Tecnológico

- **Frontend/Backend:** Next.js 14+ (App Router) con TypeScript
- **Base de datos:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage (documentos, PDFs)
- **Email:** Resend
- **UI:** shadcn/ui + Tailwind CSS
- **PDF:** React-PDF o similar
- **Deploy:** Vercel

## Módulos del sistema

1. **Inversionistas** — Gestión de perfiles con estado Activo/Inactivo
2. **Contratos** — Ciclo completo desde borrador hasta vencimiento
3. **Portal del inversionista** — Acceso por link único por contrato
4. **Planes** — Administración de planes configurable
5. **Pagos y depósitos** — Control por plan con comprobantes
6. **Reportes periódicos** — Generación y envío cada 2 meses
7. **Comunicación / Boletines** — Envíos segmentados por grupos
8. **Notificaciones** — Alertas internas y por correo
9. **Referidos** — Sistema de comisiones por referidos
10. **Dashboard / Métricas** — Capital total, rendimientos, conteos

## Cómo Trabajamos

### Ejecutar directamente (sin preguntar)
- Leer archivos, explorar código, buscar patrones
- Instalar dependencias nuevas del stack acordado
- Escribir tests antes de implementar (TDD)
- Crear migraciones de Supabase

### Requiere confirmación
- Deploy a producción
- Cambios al schema de base de datos en producción
- Enviar correos a inversionistas reales
- Modificar permisos de roles

## Flujo de Desarrollo (superpowers)

```
brainstorming → writing-plans → subagent-driven-development → finishing-a-development-branch
```

**Skills disponibles en `.claude/skills/`:**
- `brainstorming` — Diseño de features antes de codear
- `writing-plans` — Plan detallado de implementación
- `executing-plans` — Ejecución del plan paso a paso
- `subagent-driven-development` — Desarrollo paralelo con subagentes
- `test-driven-development` — TDD obligatorio
- `systematic-debugging` — Debugging con root cause
- `verification-before-completion` — Validación antes de cerrar
- `using-git-worktrees` — Ramas aisladas
- `finishing-a-development-branch` — Merge/PR

## Convenciones

- **Idioma:** Español en UI y comentarios de negocio, inglés en código
- **Ramas:** `feat/<nombre>`, `fix/<nombre>`, `chore/<nombre>`
- **Commits:** `feat: descripción breve` (español)
- **Tests:** Obligatorios — no se hace PR sin tests
- **Archivos:** Máx 300 líneas; dividir si crece

## Reglas Específicas del Proyecto

1. NUNCA hardcodear montos de planes — vienen de la base de datos
2. NUNCA enviar emails reales en desarrollo — usar modo test de Resend
3. Los portales de inversionista son de solo lectura excepto las acciones explícitas (aprobar, subir docs)
4. Los contratos activos NO se pueden editar — crear addendum/nueva versión
5. Toda acción del usuario del sistema queda en audit log
6. RLS de Supabase habilitado en todas las tablas

## Estructura del Proyecto

```
grandir-crm/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Rutas del dashboard interno
│   │   ├── (portal)/           # Portal del inversionista (público)
│   │   ├── api/                # API Routes
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── investors/          # Componentes de inversionistas
│   │   ├── contracts/          # Componentes de contratos
│   │   └── shared/             # Componentes reutilizables
│   ├── lib/
│   │   ├── supabase/           # Cliente y helpers de Supabase
│   │   ├── email/              # Templates y envío (Resend)
│   │   ├── pdf/                # Generación de PDFs
│   │   └── utils/              # Utilidades generales
│   └── types/                  # TypeScript types globales
├── supabase/
│   ├── migrations/             # Migraciones SQL
│   └── seed.sql                # Datos iniciales (planes, usuarios)
├── docs/
│   └── superpowers/
│       ├── specs/              # Diseños aprobados
│       └── plans/              # Planes de implementación
├── memory/                     # Contexto del proyecto para Claude
└── .claude/
    ├── agents/                 # Agentes especializados
    └── skills/                 # Skills de superpowers
```
