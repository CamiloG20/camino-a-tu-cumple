# Checklist de lanzamiento — Camino a tu cumple

Guía práctica para la máquina donde ya tienes un **`.env` válido**.

**Calendario:** 9 julio (día 31, inicio) → 9 agosto (día 0, cumpleaños).  
**Producción:** https://camino-a-tu-cumple.vercel.app  
**Admin:** https://camino-a-tu-cumple.vercel.app/#/admin

---

## Antes de empezar

En la carpeta del proyecto, confirma que existe `.env` con al menos:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET=media
EXPO_PUBLIC_BIRTHDAY_MONTH=8
EXPO_PUBLIC_BIRTHDAY_DAY=9
ADMIN_PASSWORD=...
SUPABASE_SERVICE_ROLE_KEY=...
POSTGRES_PROJECT_REF=...
POSTGRES_PASSWORD=...
```

> En local puedes tener `EXPO_PUBLIC_ADMIN_API_URL=http://localhost:8787`.  
> **No** subas esa variable a Vercel.

Si hace falta: `cp .env.example .env` y completa los valores.

---

## Paso 1 — Supabase: schema y seguridad

### 1a. Columna `gift_message` (si la BD ya existía)

En **Supabase → SQL Editor → Run**:

```sql
alter table public.days add column if not exists gift_message text;
```

O ejecuta `supabase/migrations/001_add_gift_message.sql`.

### 1b. Proteger sorpresas futuras (obligatorio)

Desde terminal (con `POSTGRES_PASSWORD` en `.env`):

```bash
npm run setup:secure-rls
```

Esto aplica `supabase/migrations/002_secure_rls.sql`:

- RPC `get_unlocked_days` (solo días desbloqueados por fecha)
- Bucket `media` privado + URLs firmadas
- Tabla `app_config` con fecha de cumpleaños

Sin este paso, alguien técnico podría ver sorpresas futuras.

---

## Paso 2 — Auditar contenido

```bash
npm install   # si hace falta
npm run verify:project
```

Revisa:

- [ ] 32 días (31 → 0)
- [ ] Imágenes / audios donde correspondan
- [ ] 12 días de regalo

Si faltan regalos:

```bash
npm run assign:gifts
npm run verify:project
```

---

## Paso 3 — Variables en Vercel

| Variable | Valor |
|----------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET` | `media` |
| `EXPO_PUBLIC_BIRTHDAY_MONTH` | **`8`** |
| `EXPO_PUBLIC_BIRTHDAY_DAY` | `9` |
| `EXPO_PUBLIC_SITE_URL` | `https://camino-a-tu-cumple.vercel.app` |
| `ADMIN_PASSWORD` | clave fuerte |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (solo Production) |

**No** configures `EXPO_PUBLIC_ADMIN_API_URL` en Vercel.

### Opción rápida

```bash
npm run setup:vercel-env
```

Los secretos (`ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`) se suben solo a **production**.

Tras cambiar variables → **Redeploy**:

```bash
npm run deploy:vercel
```

---

## Paso 4 — Probar en producción

| URL | Qué debe pasar |
|-----|----------------|
| https://camino-a-tu-cumple.vercel.app | Antes del 9 jul: pantalla de espera. Desde el 9 jul: día correspondiente. |
| /api/health | `{"ok":true}` |
| /#/admin | Login → token de sesión → panel |
| /#/preview/31 **sin login** | Pantalla “Vista previa protegida” |
| /#/preview/31 **con login admin** | Preview completo de todos los días |

Marca:

- [ ] Health OK
- [ ] Fecha / contador correctos
- [ ] Admin login + guardar cambio de prueba
- [ ] Preview bloqueado sin sesión
- [ ] Preview funciona tras login admin
- [ ] Días futuros bloqueados en app normal
- [ ] Icono PWA (corazón) al instalar en móvil

---

## Paso 5 — Contenido (admin)

1. Abre `/#/admin` e inicia sesión.
2. Por cada día (prioridad **31** y **12 regalos**):
   - [ ] Mensaje
   - [ ] Imagen principal (+ fotos extra)
   - [ ] Audio
   - [ ] Regalo + mensaje (si aplica)
3. Vista previa en panel → **Guardar**.
4. **Abrir en la app** (`#/preview/X`) para ver como usuario (requiere sesión).

### Admin local (yt-dlp)

```bash
npm run admin:server
npm run web
```

---

## Checklist final

- [ ] `setup:secure-rls` ejecutado
- [ ] `EXPO_PUBLIC_BIRTHDAY_MONTH=8` en Vercel + redeploy
- [ ] `verify:project` OK
- [ ] Día 31 listo
- [ ] 12 regalos con mensaje
- [ ] Admin en producción OK
- [ ] Preview protegido sin login

---

## Comandos útiles

```bash
npm run verify:project
npm run setup:secure-rls
npm run assign:gifts
npm run setup:vercel-env
npm run deploy:vercel
npm run generate:icons
npm run admin:server
npm run web
```

---

## Si algo falla

| Problema | Qué revisar |
|----------|-------------|
| App sin datos | `EXPO_PUBLIC_SUPABASE_*` en Vercel + redeploy |
| Día / contador mal | `EXPO_PUBLIC_BIRTHDAY_MONTH=8` + `setup:secure-rls` |
| Imágenes no cargan | ¿Ejecutaste `setup:secure-rls`? (bucket privado) |
| Admin no guarda | `ADMIN_PASSWORD` + `SUPABASE_SERVICE_ROLE_KEY` |
| Preview abierto a todos | Redeploy con última versión (preview requiere login) |
| Regalo no guarda mensaje | Paso 1a (`gift_message`) |
| yt-dlp | Solo admin local, no Vercel |

Más detalle: `README.md`.
