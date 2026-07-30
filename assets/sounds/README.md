# Audios locales (no versionados)

Los MP3 de canciones **no deben vivir en el repo** (peso + copyright).

En producción el audio está en **Supabase Storage** (bucket privado + URLs firmadas).

Si tienes copias locales en esta carpeta para pruebas, quédate con ellas en tu máquina; `.gitignore` evita subir `*.mp3`.
