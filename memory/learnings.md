---
name: learnings
description: Aprendizajes técnicos y patrones acumulados del proyecto Grandir CRM
type: project
---

# Aprendizajes del Proyecto

## Decisiones de Arquitectura
- El portal del inversionista usa tokens únicos por contrato (no Supabase Auth)
- Los planes de inversión se almacenan en BD para ser configurables
- RLS de Supabase como primera línea de defensa para datos de inversionistas
- Cliente Supabase tiene 2 variantes: `createAdminClient` (SSR con cookies) y `createServiceClient` (directo, bypass RLS, para portal público)

## Gotchas técnicos resueltos

### 1. RLS en Supabase Storage
Cuando creás un bucket en Supabase, RLS está habilitado por defecto en `storage.objects` pero sin policies. Hay que crear policies explícitas. Ejemplo del proyecto:
```sql
CREATE POLICY "Service role can manage contracts storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'contracts' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'contracts' AND auth.role() = 'service_role');
```

### 2. `@supabase/ssr` vs `@supabase/supabase-js`
- `createServerClient` de `@supabase/ssr` lee cookies del navegador. Si el usuario está logueado, usa SU JWT (auth.role = 'authenticated') en vez del service_role.
- Para endpoints públicos del portal donde NO hay cookies, usar `createClient` directo de `@supabase/supabase-js` con service_role key.

### 3. Tailwind v4 + tailwind-merge
Bug del doble sidebar: combinar `flex` + `lg:hidden` con `cn()` causaba que tailwind-merge dropeara una de las clases. Solución: NO renderizar el sidebar móvil cuando `isOpen === false` (en vez de ocultarlo con CSS).

### 4. Resend en dev mode
Todos los emails check `NEXT_PUBLIC_APP_URL?.includes('localhost')` y skip envío real (solo log a consola). Esto funciona en dev pero requiere que la variable esté correctamente seteada en producción.

### 5. Rate limiting in-memory no funciona en Vercel
El `Map` en memoria del rate limiter (`POST /api/applications`) NO persiste entre invocaciones serverless. Para producción real habría que migrar a Redis o tabla de Supabase con `expires_at`.

### 6. `@react-pdf/renderer` tipos
La librería tiene tipos estrictos. Para componer Documents requiere cast: `as unknown as ReactElement<DocumentProps>`.

### 7. formatDate con timestamps ISO
El formatDate del portal originalmente hacía `new Date(dateStr + 'T12:00:00')` asumiendo formato `YYYY-MM-DD`. Pero `created_at` ya viene como ISO completo. Si se concatena, da fecha inválida. Solución: detectar formato y validar con `isNaN(date.getTime())`.

## Patrones Establecidos

### Emails (Resend)
Todos los emails siguen el mismo patrón en `src/lib/email/*.ts`:
1. Check `isLocalhost` → log a consola, return success
2. Generar HTML inline (sin librería de templates)
3. Llamar `resend.emails.send()`
4. Todos los envíos en try/catch desde donde se invocan (no bloqueantes)

### PDF generation
- Lógica de cálculo pura en `src/lib/investment/calculator.ts`
- Componentes PDF en `src/lib/pdf/contract-templates/`
- Generación en `src/lib/pdf/generate-contract-pdf.ts`
- Hash SHA-256 del documento para audit trail de firma

### API routes
- `createAdminClient()` para dashboard (con cookies de admin)
- `createServiceClient()` para portal público (sin cookies, bypass RLS)
- Validación de inputs ANTES de tocar BD
- Try/catch global con log + 500 response

### Firma electrónica
- 3 pasos: identidad (cédula) → código de verificación email → confirmación
- Audit trail: nombre, cédula, IP, user agent, timestamp en `contract_investors`
- Código de verificación: 6 dígitos, expira en 10 min, max 3 intentos
- PDF firmado = PDF contrato + página de certificado al final
- Validez legal: Ley 8454 de Costa Rica (firma electrónica simple)

### Frontend
- Mobile first (sm/md/lg/xl breakpoints)
- shadcn/ui + Tailwind v4
- Cédula auto-format: X-XXXX-XXXX
- Teléfono con selector de país (16 países, default +506)
- localStorage para drafts de formularios largos

## Errores comunes que evitar
- NO concatenar `'T12:00:00'` a fechas que pueden ser ISO completas
- NO depender de cookies en endpoints del portal público
- NO commitear `.claude/settings.local.json` (es local)
- NO instalar dependencias globales sin confirmación
- NO inventar features de planes que el cliente no especificó
- NO commitear secrets en `.env` (siempre `.env.example` con placeholders)
- NO hacer commits en `main` directamente
