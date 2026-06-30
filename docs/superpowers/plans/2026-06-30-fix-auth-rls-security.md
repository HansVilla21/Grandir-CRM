# Fix de Autenticación, RLS y Seguridad de /api — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cualquier usuario interno válido (admin o asistente) pueda operar el CRM sin depender de quirks de RLS, y cerrar la fuga de PII de inversionistas accesible sin autenticación en `/api/*`.

**Architecture:** La autorización se mueve de "RLS evaluada como el usuario" (frágil, dependiente de `createAdminClient`) a un modelo explícito de dos capas: (1) **edge guard** en `proxy.ts` que exige sesión para `/dashboard/*` y `/api/*` salvo allowlist público; (2) **app-layer authz** con helpers `requireInternalUser()` / `requireAdmin()` por ruta, que tras autorizar usan `createServiceClient()` (service-role real) para las operaciones de datos. RLS permanece habilitada como defensa en profundidad. El cliente footgun `createAdminClient` se elimina.

**Tech Stack:** Next.js 16 (App Router) · `@supabase/ssr` · `@supabase/supabase-js` · Supabase (PostgreSQL + RLS) · Vercel.

---

## Contexto de causa raíz (por qué existe este plan)

- El 500 al crear inversionista = la cuenta logueada (`april@grandircm.com`) **no tiene fila en `user_profiles`** → `is_admin()` devuelve `false` → la política `Admin full access` (`WITH CHECK is_admin()`) rechaza el INSERT. Verificado: un admin activo con perfil (`grandir@test.com`) sí pasa (`is_admin()=true`).
- `createAdminClient()` (en `src/lib/supabase/server.ts`) usa `@supabase/ssr` con la service-role key **pero leyendo las cookies del usuario**, así que corre como el usuario (rol `authenticated`), NO como `service_role`. Por eso RLS se evalúa en absoluto.
- **Fuga de PII (crítico):** `proxy.ts` solo protege `/dashboard`. Sin cookie, `createAdminClient` cae a `service_role` y bypasea RLS. Probado en prod: `GET https://crm.grandircm.com/api/investors` sin login devuelve HTTP 200 con cédula, teléfono y email de inversionistas.

**Decisiones acordadas con el cliente:**
1. `april@grandircm.com` → **admin** (crear perfil admin/activo).
2. Inversionistas los gestionan **admins y asistentes** → se enforce en la capa de ruta (`requireInternalUser`); RLS sigue estricta como defensa en profundidad (no se relaja).
3. Arreglo **robusto completo**.

## Pre-requisitos

- Rama de trabajo: `fix/auth-rls-security` (NUNCA commitear en `main` directamente).
- No hay framework de tests en el repo (`package.json` solo tiene dev/build/start/lint). La verificación es: `npm run build`, `npm run lint`, y un **script de sondas curl** (Task 8) que valida la matriz público/protegido. Verificación funcional final: prueba manual en navegador por un admin.
- Credenciales: leer del `.env` del proyecto. Operaciones de datos en prod vía Supabase Management API con `SUPABASE_ACCESS_TOKEN` del `.env` (NO el MCP).

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `src/lib/auth/guard.ts` | Helpers `requireInternalUser()` / `requireAdmin()` | **Crear** |
| `src/proxy.ts` | Edge guard: sesión requerida para `/dashboard` y `/api` salvo allowlist | **Modificar** |
| `src/app/(dashboard)/layout.tsx` | Rechazar (signOut + redirect) usuarios sin perfil/inactivos | **Modificar** |
| `src/lib/supabase/server.ts` | Eliminar `createAdminClient` (footgun) | **Modificar** |
| `src/app/api/**/route.ts` (rutas internas) | Swap `createAdminClient` → `createServiceClient` + guard | **Modificar** |
| `src/app/(dashboard)/**/page.tsx` (server components) | Swap `createAdminClient` → `createServiceClient` (gateado por layout) | **Modificar** |
| `src/app/api/settings/users/[id]/route.ts` | Safeguard anti auto/last-admin deactivation | **Modificar** |
| `scripts/security-probe.sh` | Sonda curl de la matriz público/protegido | **Crear** |

---

## Task 1: Fix de datos en producción (desbloqueo inmediato)

Crea el perfil admin de April y activa el de Hans. Es la corrección de los datos faltantes; no es un parche por-usuario (el modelo correcto exige que un admin EXISTA en `user_profiles`). Aplicar apenas se apruebe el plan; desbloquea a April aun antes del deploy de código.

**Files:** ninguno (operación de datos en prod vía Management API).

- [ ] **Step 1: Crear perfil admin de April (idempotente) y activar Hans**

```bash
cd "d:/Antigravity/0. Clientes/Grandir CRM"
export SB_PAT=$(grep '^SUPABASE_ACCESS_TOKEN=' .env | cut -d= -f2- | tr -d '\r')
export REF="cnptjdtmvoxqxdxmzsbe"
curl -s "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SB_PAT" -H "Content-Type: application/json" \
  -d '{"query":"insert into public.user_profiles (id, full_name, role, active) values ('"'"'31f498d0-5137-4d50-b72e-a2a751358505'"'"', '"'"'April Mora Araya'"'"', '"'"'admin'"'"', true) on conflict (id) do update set role='"'"'admin'"'"', active=true, full_name=excluded.full_name; update public.user_profiles set active=true where id='"'"'a40bbb91-6375-4494-bd5d-d69c26624e11'"'"';"}'
```

- [ ] **Step 2: Verificar que ambos admins quedan activos con perfil**

```bash
curl -s "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SB_PAT" -H "Content-Type: application/json" \
  -d '{"query":"select au.email, up.role, up.active from auth.users au join public.user_profiles up on up.id=au.id order by au.email;"}'
```
Expected: `april@grandircm.com` admin/true, `grandir@test.com` admin/true, `hvillalobos98@gmail.com` admin/true. Cero cuentas `sin_perfil` entre los usuarios internos.

- [ ] **Step 3: Confirmación funcional manual** — April recarga `crm.grandircm.com`, abre "Nuevo inversionista", crea uno con una cédula nueva (no `3-0512-0587`, que ya existe). Debe responder 201, no 500.

---

## Task 2: Helper de autorización

**Files:**
- Create: `src/lib/auth/guard.ts`

- [ ] **Step 1: Crear el helper**

```ts
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export type InternalProfile = {
  id: string
  full_name: string
  role: 'admin' | 'assistant'
  active: boolean
}

export type GuardResult =
  | { profile: InternalProfile; response: null }
  | { profile: null; response: NextResponse }

/** Lee la sesión (cookies) y el perfil interno vía service-role (evita depender de RLS para autorizar). */
async function loadProfile(): Promise<InternalProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createServiceClient()
  const { data } = await admin
    .from('user_profiles')
    .select('id, full_name, role, active')
    .eq('id', user.id)
    .single()

  return (data as InternalProfile | null) ?? null
}

/** 401 si no hay sesión/perfil; 403 si está inactivo. Devuelve el perfil si es usuario interno activo. */
export async function requireInternalUser(): Promise<GuardResult> {
  const profile = await loadProfile()
  if (!profile) {
    return { profile: null, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  if (!profile.active) {
    return { profile: null, response: NextResponse.json({ error: 'Cuenta inactiva' }, { status: 403 }) }
  }
  return { profile, response: null }
}

/** Como requireInternalUser pero exige rol admin (403 si no). */
export async function requireAdmin(): Promise<GuardResult> {
  const result = await requireInternalUser()
  if (result.response) return result
  if (result.profile.role !== 'admin') {
    return { profile: null, response: NextResponse.json({ error: 'Requiere rol de administrador' }, { status: 403 }) }
  }
  return result
}
```

- [ ] **Step 2: Compila** — `npx tsc --noEmit` no debe reportar errores en `src/lib/auth/guard.ts`.

- [ ] **Step 3: Commit** — `git add src/lib/auth/guard.ts && git commit -m "feat: helpers requireInternalUser/requireAdmin para authz por ruta"`

---

## Task 3: Edge guard en proxy.ts

Cierra el acceso anónimo a `/api/*` (la fuga de PII) en una sola capa, dejando público solo el portal por token y el formulario externo.

**Files:**
- Modify: `src/proxy.ts:42-58`

- [ ] **Step 1: Añadir allowlist y guard de API** — Reemplazar el bloque desde `const { pathname } = request.nextUrl` hasta `return supabaseResponse` por:

```ts
  const { pathname } = request.nextUrl

  // Rutas /api públicas (no requieren sesión): portal por token y formulario externo.
  const PUBLIC_API_PREFIXES = ['/api/portal/', '/api/applications']
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))

  // Proteger TODAS las rutas /api salvo las públicas: sin sesión => 401 (no fuga de datos).
  if (pathname.startsWith('/api/') && !isPublicApi && !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Proteger rutas del dashboard
  if (pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirigir usuarios autenticados fuera del login
  if (pathname.startsWith('/login') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
```

- [ ] **Step 2: Verificar localmente** — `npm run dev`, luego:

```bash
curl -s -o /dev/null -w "investors(protegida)=%{http_code}\n" http://localhost:3000/api/investors
curl -s -o /dev/null -w "applications/plans(publica)=%{http_code}\n" http://localhost:3000/api/applications/plans
```
Expected: `investors=401`, `applications/plans=200`.

- [ ] **Step 3: Commit** — `git add src/proxy.ts && git commit -m "fix: proteger /api/* en proxy (cierra fuga de PII sin login)"`

---

## Task 4: Gate del layout del dashboard

Un usuario autenticado pero sin perfil o inactivo NO debe ver el dashboard. Como las páginas pasarán a usar service-role (Task 5), este gate es lo que impide que una cuenta fantasma vea datos.

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx:13-31`

- [ ] **Step 1: Cargar perfil vía service-role y rechazar inactivos/sin perfil** — Reemplazar desde `const supabase = await createClient()` hasta la línea que define `userRole` por:

```ts
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Perfil leído con service-role para no depender de RLS al autorizar.
  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('full_name, role, active')
    .eq('id', user.id)
    .single()

  // Cuenta fantasma (sin perfil) o desactivada: cerrar sesión y mandar a login.
  // signOut limpia la cookie => el proxy permite /login en el siguiente request (sin loop).
  if (!profile || !profile.active) {
    await supabase.auth.signOut()
    redirect('/login?error=cuenta-no-habilitada')
  }

  const userName = profile.full_name ?? user.email ?? 'Usuario'
  const userRole = profile.role ?? 'assistant'
```

- [ ] **Step 2: Actualizar imports** — En la línea 2, asegurar:

```ts
import { createClient, createServiceClient } from '@/lib/supabase/server'
```

- [ ] **Step 3: Mostrar el mensaje en login (opcional pero recomendado)** — En `src/app/(auth)/login/page.tsx`, si `searchParams.error === 'cuenta-no-habilitada'`, renderizar un aviso: "Tu cuenta no está habilitada. Contactá a un administrador." (leer el archivo primero para encajar con su patrón de UI).

- [ ] **Step 4: Verificar** — `npm run build` pasa. Manual: loguear con una cuenta sin perfil (o crear una de prueba inactiva) → debe expulsar a `/login` con el aviso, sin loop de redirección.

- [ ] **Step 5: Commit** — `git add src/app/(dashboard)/layout.tsx src/app/(auth)/login/page.tsx && git commit -m "fix: gate del dashboard rechaza cuentas sin perfil o inactivas"`

---

## Task 5: Eliminar createAdminClient — swap a service client + guards por ruta

Patrón uniforme. Hay dos casos:

**Caso A — Páginas server-component del dashboard** (gateadas por el layout de Task 4): solo cambiar el cliente.
- En cada archivo, reemplazar `import { createAdminClient } from '@/lib/supabase/server'` por `import { createServiceClient } from '@/lib/supabase/server'` y cada `await createAdminClient()` por `createServiceClient()` (ojo: `createServiceClient` NO es async).

**Caso B — Rutas de API internas**: cambiar el cliente Y añadir guard al inicio de cada handler.
- Reemplazar imports: añadir `import { requireInternalUser } from '@/lib/auth/guard'` (o `requireAdmin`).
- Reemplazar `import { createAdminClient } ...` por `import { createServiceClient } ...`.
- Al inicio de CADA handler exportado (`GET`/`POST`/`PATCH`/`PUT`/`DELETE`):

```ts
  const { profile, response } = await requireInternalUser() // o requireAdmin()
  if (response) return response
```
- Reemplazar `const supabase = await createAdminClient()` por `const supabase = createServiceClient()`.
- Donde el código volvía a leer el actor vía `createClient().auth.getUser()` (p.ej. en `investors/route.ts` POST), usar `profile.id` en su lugar y borrar esa relectura.

### Step 1: Páginas (Caso A) — swap de cliente

- [ ] Aplicar el swap del Caso A en:
  - `src/app/(dashboard)/dashboard/page.tsx`
  - `src/app/(dashboard)/dashboard/investors/page.tsx`
  - `src/app/(dashboard)/dashboard/investors/[id]/page.tsx`
  - `src/app/(dashboard)/dashboard/contracts/page.tsx`
  - `src/app/(dashboard)/dashboard/contracts/new/page.tsx`
  - `src/app/(dashboard)/dashboard/contracts/[id]/page.tsx`
  - `src/app/(dashboard)/dashboard/payments/page.tsx`
  - `src/app/(dashboard)/dashboard/reports/page.tsx`
  - `src/app/(dashboard)/dashboard/reports/[id]/page.tsx`
  - `src/app/(dashboard)/dashboard/notifications/page.tsx`
  - `src/app/(dashboard)/dashboard/bulletins/page.tsx`
  - `src/app/(dashboard)/dashboard/bulletins/new/page.tsx`
  - `src/app/(dashboard)/dashboard/bulletins/[id]/page.tsx`
  - `src/app/(dashboard)/dashboard/settings/page.tsx`

### Step 2: Rutas de API (Caso B) — swap + guard según nivel

Nivel de guard por ruta (mapea la intención de negocio; `requireInternalUser` = admin+asistente, `requireAdmin` = solo admin):

| Ruta | Handlers | Guard |
|---|---|---|
| `api/investors/route.ts` | GET, POST | requireInternalUser |
| `api/investors/[id]/route.ts` | GET, PATCH | requireInternalUser · **DELETE → requireAdmin** |
| `api/contracts/route.ts` | GET, POST | requireInternalUser |
| `api/contracts/[id]/route.ts` | GET, PATCH | requireInternalUser · **DELETE → requireAdmin** |
| `api/contracts/templates/route.ts` | GET | requireInternalUser |
| `api/contracts/[id]/documents/route.ts` | * | requireInternalUser |
| `api/contracts/[id]/reject-signature/route.ts` | * | requireInternalUser |
| `api/contracts/[id]/admin-sign/route.ts` | * | requireAdmin |
| `api/contracts/document-url/route.ts` | * | requireInternalUser |
| `api/payments/route.ts` | * | requireInternalUser |
| `api/payments/[id]/route.ts` | * | requireInternalUser |
| `api/payments/upcoming/route.ts` | GET | requireInternalUser |
| `api/payments/receipt-url/route.ts` | * | requireInternalUser |
| `api/reports/route.ts` | * | requireInternalUser |
| `api/reports/[id]/route.ts` | * | requireInternalUser |
| `api/reports/[id]/upload/route.ts` | * | requireInternalUser |
| `api/reports/[id]/send/route.ts` | * | requireInternalUser |
| `api/reports/batch/route.ts` | * | requireInternalUser |
| `api/reports/due/route.ts` | GET | requireInternalUser |
| `api/notifications/route.ts` | GET, POST | requireInternalUser |
| `api/notifications/[id]/route.ts` | * | requireInternalUser |
| `api/referrals/route.ts` | GET, POST | requireInternalUser |
| `api/referrals/[id]/route.ts` | * | requireInternalUser · **pago de comisión → requireAdmin** |
| `api/referrals/receipt-url/route.ts` | * | requireInternalUser |
| `api/bulletins/route.ts` | * | requireInternalUser |
| `api/bulletins/[id]/route.ts` | * | requireInternalUser |
| `api/bulletins/[id]/send/route.ts` | POST | requireAdmin |
| `api/settings/users/route.ts` | GET, POST | requireAdmin |
| `api/settings/users/[id]/route.ts` | * | requireAdmin |
| `api/settings/plans/route.ts` | GET, POST | GET requireInternalUser · POST requireAdmin |
| `api/settings/plans/[id]/route.ts` | * | requireAdmin |
| `api/settings/contract-templates/route.ts` | * | GET requireInternalUser · escritura requireAdmin |
| `api/settings/contract-templates/[id]/route.ts` | * | escritura requireAdmin |

- [ ] Aplicar Caso B a cada ruta de la tabla con el guard indicado.

- [ ] **Caso especial `api/notifications/scan/route.ts`:** confirmar quién la invoca. Si es un cron (Vercel Cron) → proteger con header secreto `CRON_SECRET` (leer de `process.env`, comparar contra `request.headers.get('authorization')`) en vez de `requireInternalUser`, y agregar `CRON_SECRET` a `.env`/`.env.example`/Vercel. Si la llama el cliente autenticado → `requireInternalUser`. Verificar buscando `notifications/scan` en el código del cliente y en `vercel.json`.

### Step 3: Eliminar createAdminClient del server helper

- [ ] En `src/lib/supabase/server.ts`, borrar la función `createAdminClient` (líneas 48-71). Verificar que no quedan referencias: `grep -rn "createAdminClient" src` debe devolver 0 resultados.

### Step 4: Verificar compilación y lint

- [ ] `npm run build` pasa sin errores.
- [ ] `npm run lint` sin warnings nuevos.

### Step 5: Commit

- [ ] `git add -A && git commit -m "refactor: eliminar createAdminClient; service-role + authz por ruta en todas las rutas internas"`

---

## Task 6: Safeguard contra auto-desactivación / último admin

April quedó rota probablemente por desactivarse a sí misma. Evitarlo.

**Files:**
- Modify: `src/app/api/settings/users/[id]/route.ts` (handler de update — leer primero para ubicar dónde se cambia `active`/`role`)

- [ ] **Step 1: Bloquear desactivar la propia cuenta y el último admin activo** — Antes de aplicar un update que ponga `active=false` o cambie `role` fuera de `admin`:

```ts
  // profile viene de requireAdmin()
  if (id === profile.id && (body.active === false || (body.role && body.role !== 'admin'))) {
    return NextResponse.json(
      { error: 'No podés desactivar ni cambiar el rol de tu propia cuenta.' },
      { status: 400 }
    )
  }
  if (body.active === false || (body.role && body.role !== 'admin')) {
    const admin = createServiceClient()
    const { count } = await admin
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('active', true)
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Debe quedar al menos un administrador activo.' },
        { status: 400 }
      )
    }
  }
```

- [ ] **Step 2: Verificar** — `npm run build` pasa. Manual tras deploy: intentar auto-desactivarse → 400 con el mensaje.

- [ ] **Step 3: Commit** — `git add src/app/api/settings/users/[id]/route.ts && git commit -m "fix: impedir auto-desactivacion y desactivar el ultimo admin"`

---

## Task 7: Script de sondas de seguridad (sirve de test de regresión)

**Files:**
- Create: `scripts/security-probe.sh`

- [ ] **Step 1: Crear el script**

```bash
#!/usr/bin/env bash
# Uso: bash scripts/security-probe.sh https://crm.grandircm.com
# Verifica que las rutas internas exigen auth (401/redirect) y las públicas siguen abiertas.
set -u
BASE="${1:-http://localhost:3000}"
fail=0

check() { # nombre  url  esperado_regex
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$2")
  if [[ "$code" =~ $3 ]]; then echo "PASS  $1  ($code)  $2";
  else echo "FAIL  $1  esperaba $3, obtuvo $code  $2"; fail=1; fi
}

echo "== Protegidas SIN login (esperado 401/redirect) =="
for p in /api/investors /api/contracts /api/payments /api/reports \
         /api/notifications /api/referrals /api/bulletins \
         /api/settings/users /api/settings/plans; do
  check "protegida" "$p" '^(401|307|302|308)$'
done

echo "== Públicas SIN login (esperado 200) =="
check "applications/plans" "/api/applications/plans" '^200$'

echo "== Portal con token inválido (NO debe filtrar datos: 401/404/400) =="
check "portal-token-malo" "/api/portal/token-invalido-xyz" '^(400|401|404)$'

exit $fail
```

- [ ] **Step 2: Correr contra local** — `npm run dev` y luego `bash scripts/security-probe.sh http://localhost:3000`. Todo PASS.

- [ ] **Step 3: Commit** — `git add scripts/security-probe.sh && git commit -m "test: script de sondas de seguridad para /api"`

---

## Task 8: Verificación final, deploy y post-deploy

- [ ] **Step 1: Build + lint limpios** — `npm run build && npm run lint`.

- [ ] **Step 2: Sondas locales verdes** — `bash scripts/security-probe.sh http://localhost:3000` → exit 0.

- [ ] **Step 3: Verificación funcional local (admin)** — Loguear como admin en local, listar inversionistas (ve datos), crear uno nuevo (201), abrir un contrato. Loguear como asistente: puede crear inversionista; NO puede entrar a Configuración → Usuarios (403/UI oculta).

- [ ] **Step 4: PR y merge a main** — Abrir PR `fix/auth-rls-security` → `main`. **CONFIRMAR con el founder antes del deploy a producción** (Vercel deploya auto al merge en `main`).

- [ ] **Step 5: Post-deploy en producción** — Tras el deploy:

```bash
bash scripts/security-probe.sh https://crm.grandircm.com
```
Expected: exit 0. En particular `GET /api/investors` sin login → **401** (antes 200 con PII).

- [ ] **Step 6: Verificación funcional en prod** — April crea un inversionista real → 201. El formulario público `/solicitud` sigue enviando solicitudes (probar una). El portal de un inversionista existente sigue abriendo por su link.

---

## Self-Review (cobertura del spec)

- ✅ 500 al crear inversionista → Task 1 (perfil de April) + Task 5 (investors con `requireInternalUser`).
- ✅ "cualquier admin debe poder hacerlo" → modelo de authz por rol en ruta (Task 2/5), no dependiente de quirks de RLS.
- ✅ Asistentes gestionan inversionistas → `requireInternalUser` en rutas de investors (Task 5).
- ✅ Fuga de PII sin login → Task 3 (proxy) + Task 5 (guards por ruta, defensa redundante) + Task 7/8 (sondas que lo prueban).
- ✅ Cuenta fantasma "a medias" → Task 4 (gate del layout).
- ✅ Causa del incidente original (auto-desactivación) → Task 6.
- ✅ Públicas intactas → allowlist `portal`/`applications` (Task 3) + sondas (Task 7).
- ✅ Sin framework de tests → verificación por build/lint + sondas curl + prueba manual (documentado).
- ⚠️ Prevención de futuros orphans (trigger auto-perfil) → fuera de scope; mitigado porque (a) el único alta soportada es Configuración→Usuarios que crea perfil, y (b) Task 4 rechaza explícitamente cuentas sin perfil. Anotar como mejora futura.
