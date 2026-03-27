# Grandir CRM — Database Schema Design

> **Spec de diseño** para el schema PostgreSQL en Supabase. Aprobado en brainstorming antes de implementación.

---

## Principios de Diseño

- **Normalizado y escalable** — tablas intermedias para relaciones N:M, entidades propias en vez de datos inline
- **Audit trail con diff** — toda acción queda registrada con estado anterior/nuevo en JSONB
- **Token por relación** — portal del inversionista con token único por par inversionista-contrato
- **RLS en todas las tablas** — Row Level Security como primera línea de defensa
- **Inmutabilidad financiera** — montos calculados se guardan pre-calculados para consistencia histórica

---

## Diagrama de Relaciones

```
user_profiles (auth.users)
    │
    ├── audit_logs (user_id)
    ├── notifications (recipient_user_id)
    ├── bulletins (sent_by)
    └── payments (verified_by)

investors
    ├── investor_emails (1:N)
    ├── contract_investors (N:M → contracts)
    │   └── portal_token + approval_status
    ├── referral_commissions (as referrer or referred)
    ├── bulletin_recipients
    └── referrer_id → investors (self-ref)

contracts
    ├── contract_investors (N:M → investors)
    ├── contract_beneficiaries (N:M → beneficiaries)
    ├── payments (1:N)
    ├── contract_documents (1:N)
    ├── reports (1:N)
    ├── notifications (1:N)
    ├── referral_commissions (1:N)
    ├── plan_id → investment_plans
    └── parent_contract_id → contracts (self-ref, versiones)

beneficiaries
    └── contract_beneficiaries (N:M → contracts)

investment_plans
    ├── contracts (1:N)
    └── bulletins (target by plan)

bulletins
    └── bulletin_recipients (1:N)
```

---

## Tablas

### 1. `user_profiles`

Extiende `auth.users` de Supabase para datos del equipo interno.

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK, FK → auth.users | |
| full_name | text | NOT NULL | |
| role | enum('admin','assistant') | NOT NULL | |
| active | boolean | DEFAULT true | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

---

### 2. `investors`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| full_name | text | NOT NULL | |
| cedula | text | UNIQUE, NOT NULL | Cédula de identidad |
| phone | text | | |
| status | enum('active','inactive') | DEFAULT 'inactive' | |
| referrer_id | uuid | FK → investors, NULLABLE | Quien lo refirió |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

---

### 3. `investor_emails`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| investor_id | uuid | FK → investors, ON DELETE CASCADE | |
| email | text | NOT NULL | |
| is_primary | boolean | DEFAULT false | Solo 1 true por investor |
| verified | boolean | DEFAULT false | |
| created_at | timestamptz | DEFAULT now() | |

**Constraints:** UNIQUE(investor_id, email)
**Validación app-level:** Exactamente un email con `is_primary = true` por investor.

---

### 4. `investment_plans`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| name | text | NOT NULL | "Anual", "Mensual", "Semestral" |
| type | enum('annual','monthly','semestral') | NOT NULL | |
| min_amount | numeric(12,2) | NOT NULL | |
| annual_rate | numeric(5,2) | NOT NULL | Ej: 120.00 = 120% |
| payment_structure | jsonb | NOT NULL | Reglas de cuándo y cuánto se paga |
| description | text | | |
| active | boolean | DEFAULT true | |
| valid_from | date | | |
| valid_to | date | NULLABLE | NULL = vigente indefinidamente |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

**`payment_structure` ejemplos:**

Plan Anual:
```json
{
  "type": "single_payment",
  "pay_at": "on_maturity"
}
```

Plan Mensual:
```json
{
  "type": "monthly",
  "starts_at_month": 3,
  "monthly_rate": 10.0,
  "remainder": "on_maturity"
}
```

Plan Semestral:
```json
{
  "type": "semestral",
  "semestral_rate": 40.0,
  "remainder": "on_maturity"
}
```

---

### 5. `contracts`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| plan_id | uuid | FK → investment_plans, NOT NULL | Plan vigente al crear |
| amount | numeric(12,2) | NOT NULL | Monto a invertir |
| status | enum('draft','pending_approval','revision_requested','active','expired','cancelled') | DEFAULT 'draft' | |
| start_date | date | | Fecha de inicio |
| end_date | date | | Fecha de vencimiento |
| term_months | integer | NOT NULL, CHECK (term_months <= 48) | Plazo máx 4 años |
| report_frequency_months | integer | DEFAULT 2 | |
| version | integer | DEFAULT 1 | |
| parent_contract_id | uuid | FK → contracts, NULLABLE | Para addendums |
| notes | text | | Notas internas |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

---

### 6. `contract_investors`

Tabla intermedia N:M. Cada fila = un inversionista vinculado a un contrato con su propio token de portal.

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| contract_id | uuid | FK → contracts, ON DELETE CASCADE | |
| investor_id | uuid | FK → investors | |
| role | enum('holder','co_investor') | DEFAULT 'holder' | |
| portal_token | text | UNIQUE | Token único para portal |
| token_expires_at | timestamptz | | Expira al cerrarse proceso |
| approval_status | enum('pending','approved','revision_requested') | DEFAULT 'pending' | |
| approved_at | timestamptz | | |
| revision_comment | text | | Si solicita revisión |
| created_at | timestamptz | DEFAULT now() | |

**Constraints:** UNIQUE(contract_id, investor_id)

---

### 7. `beneficiaries`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| full_name | text | NOT NULL | |
| cedula | text | UNIQUE, NOT NULL | |
| phone | text | | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

---

### 8. `contract_beneficiaries`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| contract_id | uuid | FK → contracts, ON DELETE CASCADE | |
| beneficiary_id | uuid | FK → beneficiaries | |
| percentage | numeric(5,2) | | Porcentaje asignado |
| created_at | timestamptz | DEFAULT now() | |

**Constraints:** UNIQUE(contract_id, beneficiary_id)
**Validación app-level:** Máximo 4 beneficiarios por contrato. Suma de porcentajes ≤ 100%.

---

### 9. `payments`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| contract_id | uuid | FK → contracts, NOT NULL | |
| type | enum('deposit','withdrawal','commission') | NOT NULL | |
| amount | numeric(12,2) | NOT NULL | |
| payment_date | date | NOT NULL | |
| verified | boolean | DEFAULT false | |
| verified_by | uuid | FK → auth.users, NULLABLE | |
| verified_at | timestamptz | | |
| receipt_path | text | | Ruta en Supabase Storage |
| notes | text | | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

---

### 10. `contract_documents`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| contract_id | uuid | FK → contracts, NOT NULL | |
| type | enum('draft','signed_contract','deposit_receipt','disbursement_receipt','report','addendum') | NOT NULL | |
| storage_path | text | NOT NULL | Ruta en Supabase Storage |
| file_name | text | NOT NULL | Nombre original |
| file_size | integer | | Bytes |
| mime_type | text | | |
| version | integer | DEFAULT 1 | |
| uploaded_by | uuid | FK → auth.users, NULLABLE | Usuario interno |
| uploaded_by_portal | uuid | FK → contract_investors, NULLABLE | Inversionista vía portal |
| created_at | timestamptz | DEFAULT now() | |

---

### 11. `reports`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| contract_id | uuid | FK → contracts, NOT NULL | |
| period_start | date | NOT NULL | |
| period_end | date | NOT NULL | |
| growth_rate | numeric(5,2) | NOT NULL | % de crecimiento del período |
| description | text | | Redactada por usuario |
| calculated_amount | numeric(12,2) | | % aplicado al capital (pre-calculado) |
| pdf_path | text | | Ruta del PDF generado |
| status | enum('pending','generated','sent') | DEFAULT 'pending' | |
| sent_at | timestamptz | | |
| sent_to | text[] | | Emails destinatarios |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

---

### 12. `notifications`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| type | enum('approval','revision_request','new_application','report_due','contract_expiring','disbursement_due','process_delayed') | NOT NULL | |
| title | text | NOT NULL | |
| body | text | | |
| channel | enum('internal','email','both') | NOT NULL | |
| contract_id | uuid | FK → contracts, NULLABLE | |
| investor_id | uuid | FK → investors, NULLABLE | |
| recipient_user_id | uuid | FK → auth.users, NOT NULL | Usuario interno destinatario |
| read | boolean | DEFAULT false | |
| read_at | timestamptz | | |
| email_sent | boolean | DEFAULT false | |
| email_sent_at | timestamptz | | |
| created_at | timestamptz | DEFAULT now() | |

---

### 13. `bulletins`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| subject | text | NOT NULL | |
| body | text | NOT NULL | Contenido HTML/texto |
| target_group | enum('all_active','all_inactive','by_plan','custom') | NOT NULL | |
| target_plan_id | uuid | FK → investment_plans, NULLABLE | Si target_group = 'by_plan' |
| status | enum('draft','sent') | DEFAULT 'draft' | |
| sent_at | timestamptz | | |
| sent_by | uuid | FK → auth.users | |
| created_at | timestamptz | DEFAULT now() | |

### `bulletin_recipients`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| bulletin_id | uuid | FK → bulletins, ON DELETE CASCADE | |
| investor_id | uuid | FK → investors | |
| email | text | NOT NULL | Email al que se envió |
| delivered | boolean | DEFAULT false | |
| opened | boolean | DEFAULT false | Tracking opcional |
| created_at | timestamptz | DEFAULT now() | |

---

### 14. `referral_commissions`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| referrer_id | uuid | FK → investors, NOT NULL | Quien refirió |
| referred_id | uuid | FK → investors, NOT NULL | El referido |
| contract_id | uuid | FK → contracts, NOT NULL | Contrato que generó la comisión |
| amount | numeric(12,2) | NOT NULL | |
| paid | boolean | DEFAULT false | |
| paid_at | date | | |
| receipt_path | text | | Comprobante |
| created_at | timestamptz | DEFAULT now() | |

---

### 15. `audit_logs`

| Columna | Tipo | Constraints | Notas |
|---------|------|-------------|-------|
| id | uuid | PK | |
| user_id | uuid | FK → auth.users, NOT NULL | Quien ejecutó |
| action | text | NOT NULL | 'create', 'update', 'delete', 'status_change' |
| entity_type | text | NOT NULL | 'contract', 'investor', 'payment', etc. |
| entity_id | uuid | NOT NULL | ID del registro afectado |
| old_data | jsonb | | Estado anterior |
| new_data | jsonb | | Estado nuevo |
| ip_address | inet | | |
| user_agent | text | | |
| created_at | timestamptz | DEFAULT now() | **Inmutable — sin updated_at** |

**Índices:**
- `idx_audit_logs_entity` ON (entity_type, entity_id)
- `idx_audit_logs_user` ON (user_id, created_at)

---

## Enums de PostgreSQL

```sql
CREATE TYPE investor_status AS ENUM ('active', 'inactive');
CREATE TYPE plan_type AS ENUM ('annual', 'monthly', 'semestral');
CREATE TYPE contract_status AS ENUM ('draft', 'pending_approval', 'revision_requested', 'active', 'expired', 'cancelled');
CREATE TYPE contract_investor_role AS ENUM ('holder', 'co_investor');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'revision_requested');
CREATE TYPE payment_type AS ENUM ('deposit', 'withdrawal', 'commission');
CREATE TYPE document_type AS ENUM ('draft', 'signed_contract', 'deposit_receipt', 'disbursement_receipt', 'report', 'addendum');
CREATE TYPE report_status AS ENUM ('pending', 'generated', 'sent');
CREATE TYPE notification_type AS ENUM ('approval', 'revision_request', 'new_application', 'report_due', 'contract_expiring', 'disbursement_due', 'process_delayed');
CREATE TYPE notification_channel AS ENUM ('internal', 'email', 'both');
CREATE TYPE bulletin_target AS ENUM ('all_active', 'all_inactive', 'by_plan', 'custom');
CREATE TYPE bulletin_status AS ENUM ('draft', 'sent');
CREATE TYPE user_role AS ENUM ('admin', 'assistant');
```

---

## Supabase Storage Buckets

| Bucket | Contenido | Acceso |
|--------|-----------|--------|
| `contracts` | PDFs firmados, borradores | Auth + RLS |
| `receipts` | Comprobantes de depósito/desembolso | Auth + RLS |
| `reports` | PDFs de reportes periódicos | Auth + RLS |
| `commissions` | Comprobantes de comisiones | Auth + RLS |

---

## Row Level Security (estrategia)

| Tabla | Admin | Asistente | Portal (token) |
|-------|-------|-----------|----------------|
| investors | CRUD | Read + Update (limitado) | Solo su perfil |
| contracts | CRUD | Read + Create draft | Solo sus contratos |
| payments | CRUD | Read | No acceso |
| reports | CRUD | Read + Create | Solo sus reportes |
| audit_logs | Read | No acceso | No acceso |
| notifications | CRUD | Read propias | No acceso |

---

## Índices Adicionales Recomendados

```sql
-- Búsquedas frecuentes
CREATE INDEX idx_investors_cedula ON investors(cedula);
CREATE INDEX idx_investors_status ON investors(status);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
CREATE INDEX idx_contract_investors_token ON contract_investors(portal_token);
CREATE INDEX idx_payments_contract ON payments(contract_id, payment_date);
CREATE INDEX idx_reports_contract ON reports(contract_id, period_end);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id, read, created_at);
```

---

## Conteo Final

- **16 tablas**
- **12 enums** de PostgreSQL
- **4 storage buckets**
- **9 índices** adicionales
- Cubre los **10 módulos** del sistema
