# Acceso y URLs — Camino a tu cumple

Referencia rápida para abrir la app, el panel admin y los enlaces útiles.

---

## Producción (para ella)

| Qué | URL |
|-----|-----|
| **App principal** | https://camino-a-tu-cumple.vercel.app |
| **Instalar en iPhone** | Abrir el link en **Safari** → Compartir → **Añadir a pantalla de inicio** |

---

## Panel admin (solo tú)

| Qué | URL |
|-----|-----|
| **Admin** | https://camino-a-tu-cumple.vercel.app/#/admin |
| **Vista previa de un día** | https://camino-a-tu-cumple.vercel.app/#/preview/31 *(cambia `31` por el día 0–31)* |

### Cómo entrar

1. Abre **Admin** en el navegador (Chrome, Safari o Edge).
2. Escribe la **contraseña admin** (la de `ADMIN_PASSWORD` en Vercel / tu `.env` local).
3. Pulsa **Entrar**.
4. La sesión dura **8 horas** (token en el navegador).

### Qué puedes editar en admin

- **Fondo general** de la app (subir / quitar imagen).
- **Por cada día (31 → 0):** mensaje, imagen, fotos extra, audio, fondo del día, regalo.
- **Hora del aviso** diario (hora Ecuador / Quito).
- **Vista previa** de cada día antes de publicar.

### Salir del admin

- Botón **Salir** en el panel, o
- **Ver app →** para volver a la experiencia normal.

---

## API (comprobaciones)

| Endpoint | URL |
|----------|-----|
| Health check | https://camino-a-tu-cumple.vercel.app/api/health |
| Health + ping Supabase | https://camino-a-tu-cumple.vercel.app/api/health?ping=1 |
| Config pública (hora aviso, fondo) | https://camino-a-tu-cumple.vercel.app/api/app-config |

---

## Supabase (evitar pausa por inactividad)

El proyecto free **Party-Bel_Amour** (`tivquhixdeutjlndafcm`) puede pausarse si no hay actividad ~7 días.

Para mantenerlo despierto:

1. Workflow de GitHub **Keep Supabase awake** (cada hora) → pega `health?ping=1`.
2. Cron diario de Vercel → `/api/cron/keep-alive`.
3. Opcional: añade el secret `CRON_SECRET` en GitHub (mismo valor que en Vercel) para que el workflow también dispare el push diario a la hora configurada en admin.

Si ya te llegó el aviso de pausa: abre el dashboard de Supabase y confirma que el proyecto sigue **Active**, o pulsa Unpause si ya se pausó. Luego haz push de estos cambios para que el keep-alive quede activo.

---

## Desarrollo local

| Qué | URL |
|-----|-----|
| App web (Expo) | http://localhost:8081 |
| Admin local | http://localhost:8081/#/admin |
| API admin local | http://localhost:8787 *(si corres `npm run admin`)* |

Contraseña local: `ADMIN_PASSWORD` en tu archivo `.env`.

---

## Repositorio y despliegue

| Qué | Dónde |
|-----|--------|
| **GitHub** | https://github.com/CamiloEscudero/camino-a-tu-cumple |
| **Vercel** | Proyecto `camino-a-tu-cumple` (deploy automático al hacer push a `main`) |
| **Supabase** | Proyecto **Party-Bel_Amour** (`tivquhixdeutjlndafcm`) |

---

## Calendario del evento

- **Inicio (día 31):** 9 de julio  
- **Cumpleaños (día 0):** 9 de agosto  
- **Zona horaria:** Ecuador (Quito) — `America/Guayaquil`  
- **Aviso diario por defecto:** 10:00 hora Ecuador *(configurable en admin)*

---

## Notas

- **No compartas** la contraseña admin ni el archivo `.env`.
- La **anon key** de Supabase va en `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Vercel + local). Es pública en el cliente, pero no la pegues en chats ni issues.
- La app de ella **no lleva** login; solo el admin está protegido.
- Si cambias variables en Vercel, haz **redeploy** para que surtan efecto en producción.
