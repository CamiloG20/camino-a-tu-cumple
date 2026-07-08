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
```

> En local puedes tener también `EXPO_PUBLIC_ADMIN_API_URL=http://localhost:8787`.  
> **No** subas esa variable a Vercel.

Si hace falta: `cp .env.example .env` y completa los valores.

---

## Paso 1 — Supabase: columna `gift_message`

Una sola vez en **Supabase → SQL Editor → Run**:

```sql
alter table public.days add column if not exists gift_message text;
```

Sin esto, los mensajes de regalo personalizados del admin no se guardan.

También puedes ejecutar el archivo: `supabase/migrations/001_add_gift_message.sql`.

---

## Paso 2 — Auditar contenido (con tu `.env`)

```bash
cd /ruta/a/camino-a-tu-cumple
npm install   # si hace falta
npm run verify:project
```

Revisa que haya:

- [ ] 32 días (31 → 0)
- [ ] Imágenes / audios donde correspondan
- [ ] 12 días de regalo

Si los regalos no están asignados:

```bash
npm run assign:gifts
```

Luego vuelve a `npm run verify:project`.

---

## Paso 3 — Variables en Vercel

En [Vercel](https://vercel.com) → proyecto → **Settings → Environment Variables** (Production + Preview):

| Variable | Valor |
|----------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | tu Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET` | `media` |
| `EXPO_PUBLIC_BIRTHDAY_MONTH` | **`8`** (agosto) |
| `EXPO_PUBLIC_BIRTHDAY_DAY` | `9` |
| `ADMIN_PASSWORD` | la misma del `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | service role |

**No** configures `EXPO_PUBLIC_ADMIN_API_URL` en Vercel.

### Opción rápida desde terminal (con `.env` y `vercel login`)

```bash
npm run setup:vercel-env
```

Eso sube URL, anon, bucket, password y service role.  
**Añade a mano** (si no están) `EXPO_PUBLIC_BIRTHDAY_MONTH=8` y `EXPO_PUBLIC_BIRTHDAY_DAY=9`.

Tras cambiar variables → **Redeploy** del último deployment.

O desde la máquina con `.env`:

```bash
npm run deploy:vercel
```

---

## Paso 4 — Probar en producción

| URL | Qué debe pasar |
|-----|----------------|
| https://camino-a-tu-cumple.vercel.app | **Antes del 9 jul:** pantalla “el camino aún no ha empezado”. **Desde el 9 jul:** día 31 (y luego el día correspondiente). |
| https://camino-a-tu-cumple.vercel.app/api/health | `{"ok":true}` |
| https://camino-a-tu-cumple.vercel.app/#/admin | Login y panel |
| https://camino-a-tu-cumple.vercel.app/#/preview/31 | Vista previa del día 31 (tú); puedes navegar todos los días |

Marca:

- [ ] Health OK
- [ ] Pantalla correcta según la fecha (antes vs el 9 julio)
- [ ] Admin login + guardar un cambio de prueba
- [ ] Preview de un día con foto / audio / regalo
- [ ] Días futuros en galería: bloqueados (en la app real, no en preview)
- [ ] PWA: “Añadir a pantalla de inicio” en el móvil

---

## Paso 5 — Rellenar el contenido (admin)

1. Abre `/#/admin` e inicia sesión.
2. Por cada día (prioridad **31** y los **12 regalos**):
   - [ ] Mensaje
   - [ ] Imagen principal (+ fotos extra si hay carrusel)
   - [ ] Audio (si aplica)
   - [ ] Si es regalo: número + mensaje del regalo
3. Mira la **vista previa** del panel.
4. **Guardar cambios**.
5. Opcional: **Abrir en la app →** (`#/preview/X`) para verlo como app real.

### Admin local (solo si usas yt-dlp)

```bash
npm run admin:server   # API en :8787
npm run web            # app en :8081
```

Panel: `http://localhost:8081/#/admin`

---

## Checklist final (2 minutos)

- [ ] SQL `gift_message` hecho
- [ ] `EXPO_PUBLIC_BIRTHDAY_MONTH=8` en Vercel
- [ ] `verify:project` OK
- [ ] Día 31 listo (mensaje + imagen)
- [ ] Regalos con mensaje personalizado (o al menos número)
- [ ] App hoy / en fechas pre-inicio: espera bonita, no día 31
- [ ] Admin funciona en producción
- [ ] Redeploy hecho tras tocar env

---

## Comandos útiles

```bash
npm run verify:project      # auditoría Supabase
npm run assign:gifts        # asignar 12 regalos en BD
npm run setup:vercel-env    # subir env a Vercel desde .env
npm run deploy:vercel       # build + deploy prod
npm run admin:server        # API admin local
npm run web                 # app local
```

---

## Si algo falla

| Problema | Qué revisar |
|----------|-------------|
| App carga “modo demo” / sin datos | `EXPO_PUBLIC_SUPABASE_*` en Vercel + redeploy |
| Contador / día malo | `EXPO_PUBLIC_BIRTHDAY_MONTH=8` y redeploy |
| Admin no guarda / error al login | `ADMIN_PASSWORD` y `SUPABASE_SERVICE_ROLE_KEY` en Vercel |
| Mensaje de regalo no se guarda | Paso 1 (columna `gift_message`) |
| yt-dlp no aparece | Solo en admin local (`npm run admin:server`), no en Vercel |

Más detalle del proyecto: `README.md`.
