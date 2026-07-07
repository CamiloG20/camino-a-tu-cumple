# Camino a tu cumple

App de cuenta regresiva personalizada (32 días, del 31 al 0) con sorpresas diarias: imágenes, carrusel de fotos, canción y regalos. Construida con **Expo / React Native** (PWA web) y **Supabase**.

## Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- (Opcional) [yt-dlp](https://github.com/yt-dlp/yt-dlp) para descargar canciones desde el admin local

## Configuración rápida

```bash
cp .env.example .env
# Completa EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, ADMIN_PASSWORD, SUPABASE_SERVICE_ROLE_KEY

npm install
npm run setup:party-bel   # Crea tabla y bucket en Supabase
npm run assign:gifts      # Asigna los 12 días de regalo en la BD
npm run verify:project    # Audita días, imágenes y audios
```

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
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (solo lectura en la app) |
| `EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET` | Bucket de media (default: `media`) |
| `EXPO_PUBLIC_BIRTHDAY_MONTH` | Mes del cumpleaños en formato humano (1–12, default: 7 = julio) |
| `EXPO_PUBLIC_BIRTHDAY_DAY` | Día del cumpleaños (default: 9) |
| `EXPO_PUBLIC_ADMIN_API_URL` | Solo para desarrollo local (`http://localhost:8787`). En Vercel no hace falta: usa el mismo dominio |
| `ADMIN_PASSWORD` | Contraseña del panel admin (solo servidor) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role (solo servidor, nunca en el cliente) |
| `ADMIN_ALLOWED_ORIGIN` | Opcional. En Vercel app y API comparten dominio; se detecta solo con `VERCEL_URL` |

## URLs en producción (Vercel)

| Entorno | URL |
|---------|-----|
| **App** | https://camino-a-tu-cumple.vercel.app |
| **Admin** | https://camino-a-tu-cumple.vercel.app/#/admin |
| **API** | https://camino-a-tu-cumple.vercel.app/api/* |
| **Preview** | `camino-a-tu-cumple-*-camilos-projects-*.vercel.app` (también funciona) |

La app y la API comparten el mismo dominio. No configures `EXPO_PUBLIC_ADMIN_API_URL` en Vercel.

## Deploy en Vercel

```bash
npm run build:web
npm run deploy:vercel
```

Configura en Vercel las variables `EXPO_PUBLIC_*`, `ADMIN_PASSWORD` y `SUPABASE_SERVICE_ROLE_KEY`.

**No necesitas** `EXPO_PUBLIC_ADMIN_API_URL` ni `ADMIN_ALLOWED_ORIGIN`: todo va por `https://camino-a-tu-cumple.vercel.app`.

**Nota:** La descarga con yt-dlp solo funciona con el servidor admin local (`npm run admin:server`). En Vercel sube los MP3 manualmente.

## Estructura

- `App.js` — Pantalla principal (cuenta regresiva, galería, audio)
- `screens/AdminScreen.js` — Panel admin web
- `api/` — Endpoints serverless (Vercel)
- `server/admin-server.mjs` — API admin local (+ yt-dlp)
- `services/dataService.js` — Lectura de días desde Supabase
- `lib/giftSchedule.js` — Mensajes de regalo (los días de regalo vienen de la BD)
- `scripts/verify-project.mjs` — Auditoría del proyecto

## Regalos

Los días de regalo se leen desde Supabase (`has_gift`, `gift_number`). Para generarlos según el calendario fijo:

```bash
npm run assign:gifts
```

También puedes editarlos manualmente en el panel admin.

## Scripts útiles

| Script | Uso |
|--------|-----|
| `npm run verify:project` | Comprueba 32 días, imágenes, audios y regalos |
| `npm run assign:gifts` | Escribe los 12 días de regalo en la BD |
| `npm run migrate:supabase` | Copia datos entre proyectos Supabase |
| `npm run build:web` | Build PWA + service worker |
