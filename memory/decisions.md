---
name: decisions
description: Decisiones técnicas importantes tomadas en el proyecto
type: project
---

# Decisiones Técnicas

## 2026-03-26 — Stack tecnológico
**Decisión:** Next.js 14 + Supabase + shadcn/ui + Resend + Vercel
**Razón:** Stack moderno con MCP tools disponibles (Supabase y Vercel MCPs conectados), reducción de infraestructura, fácil deploy

## 2026-03-26 — Portal del inversionista
**Decisión:** Acceso por token único por URL, sin cuenta de usuario
**Razón:** El inversionista no necesita recordar credenciales; accede por link enviado por email cuando hay una acción requerida

## 2026-03-26 — Metodología de desarrollo
**Decisión:** superpowers (brainstorming → writing-plans → subagent-driven-development)
**Razón:** Proyecto con 30 días de plazo y alta complejidad; necesita diseño sólido antes de codear
