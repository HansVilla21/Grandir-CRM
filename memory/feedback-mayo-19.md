---
name: feedback-mayo-19
description: Feedback de la reunión del 19 de mayo 2026 con Andrés Alvarado (April no asistió). Define la última ronda de cambios antes del cierre formal del proyecto.
type: project
---

# Feedback Reunión 19 Mayo 2026

**Participantes:** Hans Villalobos, Andrés Alvarado (April canceló por imprevistos)
**Duración:** 19 min
**Recording:** https://fathom.video/share/VNdzYe6Y_FmpN87F6EBvFdMtgSV8WG4Y
**Archivo fuente:** `Feedback Mayo 19.md` (en la raíz del proyecto)

## Acuerdo clave sobre alcance

**Esta es la última ronda de cambios formal del proyecto.** Después de aplicar estos cambios, el cliente prueba el sistema en uso real con un grupo reducido, reporta cualquier bug → se arregla → cierre. Cambios adicionales son trabajo separado (presupuesto aparte).

## Puntos accionables

### P1 — Sistema de firma: validación legal y decisión
- **Resultado:** La abogada de April confirmó que la firma electrónica integrada (Ley 8454) ES válida en CR.
- **Condición:** Ambas partes (April + inversionista) deben firmar con el mismo método.
- **Estado actual:** April firma con firma digital del BCCR (oficial), inversionista firma con nuestro sistema integrado → métodos DIFERENTES.
- **Opciones a definir:**
  - **A.** April también firma dentro del CRM (sistema integrado para ambos lados).
  - **B.** Quitar la firma electrónica del portal del inversionista; el portal solo sirve para descargar el PDF que April firmó con su firma digital y subir el firmado por el inversionista.
- **Bloqueante:** Requiere decisión de April (Andrés se la transmitirá).

### P2 — Sistema de plantillas de contratos + editor en vivo
- **Problema:** El contrato actual "se ve bonito" pero le faltan cláusulas vs el machote real de April. Además, los contratos cambian por temporada (ej: diciembre +10%).
- **Solución pedida:**
  1. Repositorio de plantillas múltiples (ej: "Anual normal", "Anual promo diciembre")
  2. April elige la plantilla al crear el contrato
  3. Editor inline para modificar ese contrato específico (sin alterar la plantilla)
- **Estado actual:** Tabla `contract_templates` existe en BD, sin UI ni integración con la generación de PDFs.
- **No bloqueante:** Se puede arrancar desarrollo en paralelo.

### P3 — Comprobantes en comisiones de referidos
- **Problema:** Al marcar comisión como pagada, NO se puede subir comprobante. Sirve como respaldo legal si alguien reclama "nunca me pagaron".
- **Solución:** Agregar upload de comprobante (PDF/imagen) en el flujo "Marcar comisión pagada", igual que pagos normales.
- **Estado actual:** El campo `receipt_path` ya existe en `referral_commissions`, falta la UI de upload.
- **No bloqueante.**

### P4 — Dominio nuevo
- **Confirmado:** Compran dominio. Detalles acordados en la llamada:
  - **Plataforma:** Cloudflare (recomendado por Hans, mejor que GoDaddy a nivel infraestructura)
  - **Dominio sugerido:** `grandircm.com` (~$10/año)
  - **Quién compra:** April o Andrés desde una cuenta NUEVA de Cloudflare con un correo de Grandir (no la cuenta de Hans) — para que el control quede con el cliente
- **Tareas post-compra (Hans):**
  - Configurar DNS apuntando al deploy de Vercel
  - Verificar dominio en Resend
  - Cambiar `USE_VERIFIED_DOMAIN = true` en `src/lib/email/config.ts` y `EMAIL_DOMAIN` al dominio correcto
- **Bloqueante para producción real:** los emails solo funcionan con destinatario = email registrado de Resend hasta que el dominio esté verificado.

### P5 — Estrategia de migración (NO técnico, comunicación al cliente)
- **Acuerdo:** No migrar a todos los inversionistas de golpe.
- **Plan:** Empezar con 10-20, probar reportes/pagos/firmas con datos reales. Cuando funcione bien, escalar.
- **Razón:** evitar frustración por errores en primer uso + tiempo de aprendizaje del sistema.
- **Acción:** Comunicárselo a April en la entrega.

### P6 — Auto-registro de usuarios del sistema
- **Confirmado:** Solo Hans crea usuarios admin/asistente manualmente. NO permitir auto-registro.
- **Estado:** Ya está así. ✅

## Decisiones técnicas tomadas

1. Cloudflare > GoDaddy para gestión de dominio (decisión del equipo dev).
2. Cuenta de dominio queda con el cliente, no con Hans.
3. Plantillas serán múltiples + editor inline del contrato específico (NO solo edición global del template).
4. Comprobantes de comisiones replicarán el patrón de Pagos.

## Próximas acciones

| # | Acción | Responsable | Bloqueado por |
|---|--------|-------------|---------------|
| 1 | April decide sobre firma (opción A o B) | April vía Andrés | — |
| 2 | April/Andrés compran dominio en Cloudflare | April/Andrés | — |
| 3 | Construir sistema de plantillas de contratos | Hans | — |
| 4 | Construir editor inline de contrato | Hans | depende de #3 |
| 5 | Agregar comprobantes a comisiones | Hans | — |
| 6 | Implementar opción A o B de firma | Hans | #1 |
| 7 | Configurar dominio + Resend en prod | Hans | #2 |
| 8 | Comunicar plan de migración paulatina a April | Hans | — |
