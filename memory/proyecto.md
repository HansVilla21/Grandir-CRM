---
name: proyecto-grandir-crm
description: Estado y contexto general del proyecto Grandir CRM — actualizado 2026-05-11
type: project
---

# Grandir CRM — Estado del Proyecto

## Contexto del cliente
- **Cliente:** April Mora Araya — Grandir CM Sociedad de Responsabilidad Limitada (cédula jurídica 3-102-873916)
- **Negocio:** Fondo de inversión costarricense
- **Presupuesto:** $3,500 USD
- **Inicio:** 2026-03-26
- **Dominio actual (Vercel):** https://grandircrm.vercel.app

## Estado actual (2026-05-11)
**Fase:** Sistema completo, esperando reunión con cliente para validar firma electrónica y conseguir PDFs reales de contratos.

**Rama activa:** `feat/contract-signing` — pendiente de merge a `main`
**Commits ahead de main:** 31 commits, 61 archivos modificados, ~10,500 líneas

## Módulos del sistema — Estado

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth + roles (Admin/Asistente) | ✅ Completo | Supabase Auth |
| Inversionistas | ✅ Completo | CRUD, cédula única, multi-email, referidor, formato CR |
| Planes de inversión | ✅ Completo | CRUD desde settings, Anual/Mensual/Semestral |
| Contratos | ✅ Completo | Estados, multi-inversionista, beneficiarios, versiones |
| Portal del inversionista | ✅ Completo | Acceso por token, ver/aprobar/revisar/subir docs |
| **Firma electrónica** | ✅ Completo | Sistema propio integrado (Ley 8454 CR) |
| **Formulario externo público** | ✅ Completo | `/solicitud` con calculadora dinámica |
| Pagos y depósitos | ✅ Completo | Verificación manual, comprobantes |
| Reportes periódicos | ✅ Completo | Generación PDF, envío por email |
| Boletines | ✅ Completo | Segmentados por grupo, historial |
| Notificaciones | ✅ Completo | 7 tipos, in-app + email |
| Referidos | ✅ Completo | Comisiones, pagos, reportes |
| Dashboard métricas | ✅ Completo | Capital, contratos, inversionistas |
| Documentos adjuntos | ✅ Completo | Por contrato, Supabase Storage |
| Audit log | ✅ Estructura lista | Tabla existe, no se rellenan todavía |

## Lo que falta antes de producción

1. **Configurar Resend** — Verificar dominio `grandir.com` o usar dominio gratis de Resend
2. **Variable `NEXT_PUBLIC_APP_URL`** en Vercel → `https://grandircrm.vercel.app`
3. **PDFs reales de contratos** — April debe enviar los machotes finales (templates actuales son placeholder)
4. **Validar firma electrónica con April** — el cliente originalmente pidió firma externa, nosotros hicimos integrada (decisión tomada en brainstorming)
5. **Rate limiting persistente** — Actual es in-memory (no funciona bien en serverless)
6. **Merge `feat/contract-signing` → `main`** — pendiente

## Stack técnico
- **Frontend/Backend:** Next.js 16 (App Router) + TypeScript + Turbopack
- **DB:** Supabase (PostgreSQL) — proyecto ID `cnptjdtmvoxqxdxmzsbe`, nombre "CRM"
- **Storage:** Supabase Storage (bucket `contracts`)
- **Auth:** Supabase Auth
- **Email:** Resend
- **PDF:** @react-pdf/renderer (no Puppeteer)
- **UI:** shadcn/ui + Tailwind CSS v4
- **Deploy:** Vercel

## Documentos de referencia
- `docs/requerimientos-cliente/` — PDFs originales del cliente (Dashboard + 3 machotes de contratos)
- `docs/superpowers/specs/` — Diseños aprobados (master spec, contract signing, external form)
- `docs/superpowers/plans/` — Planes de implementación
- `docs/registro-desarrollo-completo.html` — Registro visual del desarrollo
- `docs/guia-inicio-proyecto-ia.html` — Guía de cómo arrancamos el proyecto con IA
