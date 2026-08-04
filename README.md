# Camino a tu cumple

App de cuenta regresiva personalizada (**32 días**, del **31 al 0**): del **9 de julio** al **9 de agosto**, con sorpresas diarias (imágenes, carrusel de fotos, canción y regalos). Construida con **Expo / React Native** (PWA web) y **Supabase**.

## Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- (Opcional) [yt-dlp](https://github.com/yt-dlp/yt-dlp) para descargar canciones desde el admin local

## Configuración rápida

```bash
cp .env.example .env
# Completa EXPO_PUBLIC_SUPABASE_*, EXPO_PUBLIC_BIRTHDAY_*, ADMIN_PASSWORD, SUPABASE_SERVICE_ROLE_KEY

npm install
npm run setup:party-bel      # Crea tabla y bucket en Supabase
npm run setup:secure-rls     # Protege sorpresas futuras (RLS + bucket privado)
npm run assign:gifts         # Asigna las 4 sorpresas semanales en la BD
npm run setup:unlocked-days  # Corrige RPC/RLS para ver días pasados
npm run verify:project       # Audita días, imágenes y audios
```

> **Importante:** `setup:secure-rls` requiere `POSTGRES_PASSWORD` y `POSTGRES_PROJECT_REF` en `.env`. Sin este paso, los días futuros serían accesibles vía API.

## Desarrollo

```bash
npm run web              # App en http://localhost:8081
npm run admin:server     # API admin local en http://localhost:8787
```

Panel admin: `http://localhost:8081/#/admin`

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (solo lectura filtrada en la app) |
| `EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET` | Bucket de media (default: `media`) |
| `EXPO_PUBLIC_BIRTHDAY_MONTH` | Mes del cumpleaños / fin del camino (1–12, default: **8**) |
| `EXPO_PUBLIC_BIRTHDAY_DAY` | Día del fin (default: **9**) |
| `EXPO_PUBLIC_SITE_URL` | URL pública (default: producción Vercel) |
| `EXPO_PUBLIC_ADMIN_API_URL` | Solo desarrollo local (`http://localhost:8787`) |
| `EXPO_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID` | Opcional. OAuth Client ID web para “Desde Google Fotos” en admin |
| `ADMIN_PASSWORD` | Contraseña del panel admin |
| `ADMIN_TOKEN_SECRET` | Opcional. Firma tokens de sesión admin (default: `ADMIN_PASSWORD`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor / scripts |
| `POSTGRES_PROJECT_REF` | Ref del proyecto (scripts SQL) |
| `POSTGRES_PASSWORD` | Password de Postgres (scripts SQL) |

## URLs en producción (Vercel)

| Entorno | URL |
|---------|-----|
| **App** | https://camino-a-tu-cumple.vercel.app |
| **Admin** | https://camino-a-tu-cumple.vercel.app/#/admin |
| **API** | https://camino-a-tu-cumple.vercel.app/api/* |
| **Health** | https://camino-a-tu-cumple.vercel.app/api/health |

## Deploy en Vercel

```bash
npm run setup:vercel-env   # Sube variables desde .env (solo production para secretos)
npm run deploy:vercel
```

Variables obligatorias en Vercel: `EXPO_PUBLIC_*`, `EXPO_PUBLIC_BIRTHDAY_MONTH=8`, `EXPO_PUBLIC_BIRTHDAY_DAY=9`, `ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`.

**Nota:** yt-dlp solo funciona con el admin local (`npm run admin:server`).

## Seguridad

- **Sorpresas:** Supabase expone solo días desbloqueados (`get_unlocked_days`) y media con URLs firmadas.
- **Preview:** `#/preview/{día}` requiere sesión admin activa.
- **Admin:** Login devuelve token Bearer (8 h). Rate limit en auth y endpoints admin.
- **Cabeceras:** CSP, HSTS, Referrer-Policy en `vercel.json`.

Tras cambiar cumpleaños en `.env`, actualiza Supabase:

```bash
npm run setup:secure-rls
```

## Estructura

- `App.js` — Pantalla principal
- `screens/AdminScreen.js` — Panel admin web
- `api/` — Endpoints serverless (Vercel)
- `server/admin-server.mjs` — API admin local (+ yt-dlp)
- `services/dataService.js` — Lectura filtrada desde Supabase
- `lib/calendar.js` — Fechas del evento (9 jul → 9 ago)
- `supabase/migrations/` — SQL (schema, RLS seguro)
- `scripts/verify-project.mjs` — Auditoría del proyecto

## Panel admin

En `/#/admin` puedes editar por cada día: mensaje, imagen, fotos extra, audio, regalo y mensaje del regalo.

- **Vista previa** en el panel (con URLs firmadas).
- **Abrir en la app** (`#/preview/31`): requiere login admin; navegas todos los días.

## Scripts útiles

| Script | Uso |
|--------|-----|
| `npm run verify:project` | Comprueba 32 días, imágenes, audios y regalos |
| `npm run setup:secure-rls` | Aplica RLS + bucket privado en Supabase |
| `npm run assign:gifts` | Escribe las 4 sorpresas semanales |
| `npm run setup:unlocked-days` | Incluye días pasados en RPC/RLS |
| `npm run setup:vercel-env` | Sube env a Vercel |
| `npm run generate:icons` | Regenera favicon e iconos PWA |
| `npm run build:web` | Build PWA + service worker |

Guía paso a paso antes del lanzamiento: **`CHECKLIST-LANZAMIENTO.md`**.
