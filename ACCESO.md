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
| Config pública (hora aviso, fondo) | https://camino-a-tu-cumple.vercel.app/api/app-config |

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
- La app de ella **no lleva** login; solo el admin está protegido.
- Si cambias variables en Vercel, haz **redeploy** para que surtan efecto en producción.
