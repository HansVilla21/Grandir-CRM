-- ============================================================
-- SEED: Usuario administrador inicial
-- Ejecutar este script en Supabase SQL Editor
-- ============================================================
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard → Authentication → Users
-- 2. Haz clic en "Add user" → "Create new user"
-- 3. Ingresa el email y contraseña del administrador
-- 4. Activa "Auto Confirm User" para no requerir verificación
-- 5. Copia el UUID del usuario recién creado (columna "UID")
-- 6. Reemplaza 'REEMPLAZAR-CON-UUID-DEL-USUARIO' con ese UUID
-- 7. Ejecuta este script en SQL Editor
-- ============================================================

INSERT INTO public.user_profiles (id, full_name, role, active)
VALUES (
  'REEMPLAZAR-CON-UUID-DEL-USUARIO',
  'Administrador',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE
SET
  role   = 'admin',
  active = true;
