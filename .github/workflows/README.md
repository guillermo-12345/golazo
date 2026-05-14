# GitHub Actions — Cron Jobs

Alternativa gratuita a Vercel Pro Cron (que cuesta $20/mes).
GitHub Actions ofrece minutos ilimitados en repos públicos y 2000 min/mes en privados — más que suficiente para esto.

## Workflows

| Archivo | Frecuencia | Qué hace |
|---|---|---|
| `sync-matches.yml` | Cada 6h | Sync completo del fixture desde API-Football |
| `sync-live.yml` | Cada 5min | Actualiza scores en vivo (solo cuando hay partidos en curso) |
| `prediction-reminders.yml` | Cada 5min | Notifica a quienes no predijeron un partido por arrancar |

## Setup (3 minutos, una sola vez)

1. Anda al repo en GitHub: https://github.com/guillermo-12345/golazo
2. Click en **Settings → Secrets and variables → Actions**
3. Click en **New repository secret** y agregá estos dos:

| Nombre | Valor |
|---|---|
| `APP_URL` | La URL de Vercel (ej: `https://golazo-jade.vercel.app`) |
| `SUPABASE_SERVICE_KEY` | Tu `SUPABASE_SERVICE_ROLE_KEY` (mismo valor que tenés en Vercel) |

4. Listo. Los workflows se ejecutan automáticamente.

## Cómo monitorearlos

- En GitHub: pestaña **Actions** del repo → ahí ves cada ejecución
- Si alguna falla aparece marcada en rojo

## Cómo ejecutar manualmente

- Actions → seleccionar el workflow → **Run workflow** → Run

## Cuándo activarlos

- **Sync matches**: activalo ya. Aunque no hay partidos vivos todavía, prepara la base.
- **Sync live**: activalo desde ~1 semana antes del Mundial.
- **Prediction reminders**: activalo cuando arranque el Mundial.

Mientras los workflows estén en el repo y los secrets configurados, corren solos.
Si querés pausarlos, andá a Actions → seleccioná el workflow → "..." → Disable workflow.
