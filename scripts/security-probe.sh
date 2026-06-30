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
