# Golazo ⚽

App de quiniela del Mundial 2026 con ligas privadas, comodines y bracket challenge.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19 + Tailwind v4
- Supabase (Auth + Postgres + Realtime)
- API-Football (datos del torneo)
- DiceBear (avatares + escudos generados)
- Vercel (hosting + cron)

## Setup local

```bash
npm install
cp .env.local.example .env.local
# completar las variables
npm run dev
```

### Variables de entorno

| Variable | Dónde se obtiene |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.com → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | supabase.com → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | supabase.com → Project Settings → API (secreto) |
| `API_FOOTBALL_KEY` | rapidapi.com → API-Football by api-sports |
| `API_FOOTBALL_LEAGUE_ID` | `1` para el Mundial |
| `API_FOOTBALL_SEASON` | `2026` |
| `CRON_SECRET` | Vercel lo genera al deployar |

## Setup de Supabase

1. Crear proyecto en supabase.com
2. **SQL Editor** → ejecutar en orden:
   - `supabase/schema.sql`
   - `supabase/migrations/001_points_engine.sql`
   - `supabase/migrations/002_badges_activity_notifications.sql`
3. **Authentication → Providers → Google** → activar con Client ID/Secret de Google Cloud Console
4. **Authentication → URL Configuration** → agregar:
   - Site URL: `http://localhost:3000` (dev) o el dominio de Vercel (prod)
   - Redirect URL: `https://<dominio>/auth/callback`
5. **Database → Replication** → habilitar realtime para: `notifications`, `league_members`, `reactions`

## Deploy a Vercel

1. Push del código a GitHub (sin `.env.local`)
2. vercel.com → New Project → Import desde GitHub
3. Root Directory: `golazo` (si está en subdirectorio del repo)
4. Environment Variables: pegar todas las del `.env.local`
   - **No** definir `CRON_SECRET`, Vercel lo genera
5. Deploy
6. Volver a Supabase y agregar el dominio de Vercel a URL Configuration
7. Listo — los crons arrancan automáticamente

### Crons configurados

| Cron | Frecuencia | Qué hace |
|---|---|---|
| `/api/cron/sync-matches` | cada 6h | Sync completo del fixture |
| `/api/cron/sync-live` | cada 2 min | Solo cuando hay partidos en vivo o próximos |
| `/api/cron/prediction-reminders` | cada 5 min | Recordatorio 15 min antes de cada partido |

## Estructura

```
src/
├── app/
│   ├── (app)/              # rutas autenticadas con layout compartido
│   ├── api/                # endpoints (sync, crons)
│   ├── auth/callback/      # OAuth callback
│   ├── login/
│   ├── onboarding/
│   └── page.tsx            # landing
├── components/             # UI components reutilizables
├── lib/                    # helpers (supabase, avatar, badges, etc.)
├── proxy.ts                # auth guard (Next 16: era middleware antes)
└── types/database.ts

supabase/
├── schema.sql              # tablas base + RLS
└── migrations/
    ├── 001_points_engine.sql               # motor de puntos
    └── 002_badges_activity_notifications.sql  # badges + feed + notif
```

## Roadmap

- [ ] Bracket Challenge (a desbloquear tras el sorteo de dic 2025)
- [ ] Predicciones avanzadas: scoring de córners, tarjetas, goleador (UI ya está)
- [ ] App mobile nativa con Expo
- [ ] Compartir liga via deep link / QR
