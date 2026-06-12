# Invitación de Oliver & Analucía

Invitación web en Next.js (JavaScript) con confirmaciones almacenadas en MySQL.

## Desarrollo

```bash
npm install
cp .env.example .env.local
npm run dev
```

La invitación se abre con un código en la URL:

```text
http://localhost:3000/?i=FAMILIA-TZUNUN-2026
```

## Base de datos

1. Ejecuta `database/schema.sql` en la base de datos remota.
2. Crea una fila en `invitations` por cada invitación enviada.
3. Coloca las credenciales reales en `.env.local`.

`allowed_guests` puede ser `NULL` para validar únicamente el código y el número
de cupos, o un arreglo JSON con los nombres exactos autorizados.

La aplicación no almacena IPs en claro. Guarda un hash SHA-256 con la sal
privada `RSVP_HASH_SALT`. La garantía contra doble confirmación proviene de la
restricción única sobre `rsvps.invitation_id`, no de la IP.

## Música

El mini reproductor busca la pista en:

```text
public/audio/iris.mp3
```

Por derechos de autor, el archivo de audio no está incluido en el proyecto.
Utiliza una copia de “Iris” de Goo Goo Dolls que tengas derecho a publicar. El
archivo MP3 está excluido de Git para evitar subirlo accidentalmente.
