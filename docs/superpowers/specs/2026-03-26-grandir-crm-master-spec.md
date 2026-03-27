# Grandir CRM — Especificación Maestra

> **Documento de referencia** para todo el equipo de desarrollo. No es un plan de implementación — es el contrato funcional del sistema.

---

## 0. Definiciones

| Término | Definición |
|---------|-----------|
| **Usuario del sistema** | Persona del equipo interno (admin o asistente) que opera el CRM |
| **Inversionista** | Cliente externo que invierte en el fondo |
| **Portal del inversionista** | Página web accesible por link único (por contrato) donde el inversionista aprueba y sube documentos |
| **Contrato** | Acuerdo de inversión entre el fondo y uno o más inversionistas |
| **Plan** | Tipo de inversión con sus reglas de rendimiento y pago |

---

## 1. Autenticación y Roles

### 1.1 Usuarios Internos
- Login con email/password vía Supabase Auth
- Roles:
  - **Admin:** Acceso total al sistema
  - **Asistente:** Acceso restringido (no puede eliminar, no ve datos financieros sensibles)

### 1.2 Portal del Inversionista
- Sin cuenta de usuario — acceso por **token único por contrato**
- Token se envía por email cuando el contrato pasa a "Pendiente de aprobación"
- Token válido mientras el proceso del contrato lo requiera
- Al cerrarse el proceso, el token expira

---

## 2. Inversionistas

### 2.1 Datos del Inversionista
- Nombre completo
- Cédula de identidad (único en el sistema)
- Teléfono
- Email(s) — uno o varios
- Estado: `Activo` (tiene contratos en proceso) / `Inactivo`
- Referidor (otro inversionista del sistema, opcional)

### 2.2 Creación
- **Formulario externo:** Link público que crea automáticamente el perfil + borrador de contrato
- **Manual desde dashboard:** Misma lógica que el formulario externo

### 2.3 Validaciones
- Cédula única — el sistema rechaza duplicados
- Teléfono y email editables en cualquier momento

---

## 3. Planes de Inversión

### 3.1 Planes 2026
| Plan | Mínimo | Rendimiento | Estructura de Pagos |
|------|--------|-------------|---------------------|
| **Anual** | $1,000 | 120% anual | Pago único al vencimiento |
| **Mensual** | $10,000 | 125% anual | 10% mensual desde mes 3; resto al final |
| **Semestral** | $10,000 | 135% anual | 40% semestral; resto al final |

### 3.2 Administración de Planes
- Modificables desde el dashboard (porcentaje, monto mínimo, descripción)
- Los cambios aplican a nuevos contratos, no a contratos existentes
- Pueden tener vigencia anual o por promoción/temporada

---

## 4. Contratos

### 4.1 Datos del Contrato
- Monto a invertir
- Plazo (máx 4 años)
- Plan seleccionado
- Periodicidad de pagos (según plan)
- Periodicidad de reportes (actualmente: cada 2 meses)
- Estado
- Versión e historial

### 4.2 Estados del Contrato
```
Borrador
  → [usuario envía] → Pendiente de aprobación
    → [inversionista solicita cambios] → Revisión solicitada
    → [todos aprueban] → [se firma externamente] → Activo
      → [llega fecha fin] → Vencido
      → [se cancela] → Cancelado antes de tiempo
```

### 4.3 Beneficiarios
- 1 a 4 beneficiarios por contrato
- Datos: nombre, cédula, teléfono
- Un beneficiario puede estar en múltiples contratos
- Uso: referencia de contacto para recibir fondos si el inversionista no puede

### 4.4 Relaciones
- Un contrato puede tener 1 o más inversionistas
- Un inversionista puede tener 0 o más contratos

### 4.5 Versiones
- Se guarda la versión original del contrato
- Addendums y modificaciones crean nuevas versiones
- Si un contrato firmado tiene error, se reinicia el proceso sobre nueva versión

---

## 5. Portal del Inversionista

### 5.1 Acceso
- URL única: `/portal/[token]`
- Se activa cuando el contrato pasa a "Pendiente de aprobación"
- Se desactiva cuando el proceso del contrato se cierra

### 5.2 Funciones
- Ver el contrato (borrador o versión actual)
- Aprobar el borrador
- Solicitar revisión con comentario
- Subir contrato firmado (PDF)
- Subir comprobantes de depósito
- Enviar respuesta

---

## 6. Flujo Completo del Contrato

1. Formulario llenado (externo o manual)
2. Sistema crea: perfil de inversionista + borrador de contrato
3. Usuario del sistema revisa y ajusta el borrador
4. Usuario envía a "Pendiente de aprobación"
5. Se habilita portal y se envía link por email
6. Inversionista: aprueba O solicita revisión
7. Si revisión: loop hasta aprobación de todos
8. Cuando todos aprueban + usuario del sistema aprueba: se procede a firma
9. Firma digital externa
10. Contrato firmado se sube al portal o dashboard
11. Comprobantes de depósito se suben
12. Contrato se activa

---

## 7. Pagos y Depósitos

### 7.1 Registro de Pagos
Cada pago incluye: nombre del inversionista, email, fecha, monto, comprobante PDF

### 7.2 Verificación
- Campo "depósito verificado" por pago
- IA evalúa comprobante vs monto esperado (opcional, V2)
- Si detección automática falla: notificación para revisión manual

### 7.3 Lógica por Plan
- **Anual:** Pago único al final
- **Mensual:** Pagos mensuales desde mes 3
- **Semestral:** Pagos semestrales (50% prometido cada 6 meses)

---

## 8. Reportes Periódicos

### 8.1 Periodicidad
- Configurable por contrato (actualmente: cada 2 meses)
- El sistema notifica cuando toca generar reporte

### 8.2 Generación
1. Usuario ingresa % de crecimiento del período
2. Usuario redacta descripción del período
3. Sistema calcula: % aplicado al capital de cada inversionista
4. Sistema genera PDF del reporte
5. Se envía por email

### 8.3 Historial
- Cada reporte guardado como PDF en storage
- Historial de reportes por contrato
- Se pueden reenviar

---

## 9. Comunicación

### 9.1 Boletines
- Envío a grupos: todos los activos, todos los inactivos, por tipo de plan, etc.
- Historial de correos enviados

### 9.2 Notificaciones del Sistema
| Evento | Canal |
|--------|-------|
| Inversionista aprueba borrador | Interno + email |
| Inversionista solicita revisión | Interno + email |
| Nueva solicitud por formulario externo | Interno |
| Momento de generar reporte | Interno |
| Contrato próximo a vencer | Interno + email |
| Desembolso próximo | Interno + email |
| Proceso demorado (fecha inicio llegó, faltan firmas/depósitos) | Interno + email |

---

## 10. Referidos

- Cada inversionista puede tener un único referidor
- Un inversionista puede referir a múltiples personas
- El sistema registra comisiones: monto, fecha, comprobante
- Reportes de referidos: cuántos, cuánto ha generado en comisiones

---

## 11. Métricas del Dashboard

- Capital total en trabajo
- Rendimiento total registrado
- Cantidad de inversiones activas
- Cantidad de inversionistas activos / inactivos
- (Próximos desembolsos y vencimientos: V1.1)

---

## 12. Documentos Adjuntos

Por contrato:
- Contrato firmado (PDF)
- Comprobantes de depósito
- Comprobantes de desembolso (cancelación)
- Reportes en PDF

---

## 13. Historial de Acciones

- Audit log por usuario del sistema
- Registro de qué usuario hizo qué acción y cuándo

---

## Fuera del Scope V1

- Firma digital integrada (se hace externamente; solo se sube el PDF)
- Validación automática de comprobantes con IA
- Portal móvil nativo
- Módulo para liquidadora cripto
- Chatbot
