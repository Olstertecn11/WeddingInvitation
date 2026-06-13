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

1. Coloca las credenciales reales en `.env.local`.
2. Ejecuta `npm run db:migrate` para crear o actualizar las tablas.
3. Administra las invitaciones desde `http://localhost:3000/admin`.

El panel permite crear invitaciones individuales o familiares, clasificar a
cada integrante como dama o caballero para personalizar el saludo, buscar o
eliminar invitaciones y copiar su enlace personal con el formato:

```text
https://tu-dominio.com/codigo-personal
```

Al registrar una respuesta, el código se desactiva dentro de la misma
transacción y no puede utilizarse nuevamente. La aplicación no almacena IPs en
claro: guarda un hash SHA-256 con la sal privada `RSVP_HASH_SALT`.

## Administración

Configura estas variables únicamente en `.env.local` o en el proveedor de
despliegue:

```text
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

La sesión administrativa utiliza una cookie `httpOnly` firmada y expira
después de 12 horas.

## Estilos

El proyecto utiliza Tailwind CSS para utilidades de layout y responsividad, y
CSS personalizado para el sobre, el sello, el parallax y las animaciones.

## Verificación

```bash
npm run lint
npm run build
npm run test:smoke
```

La prueba integral crea una invitación temporal, valida el flujo completo y la
elimina al finalizar.

## Música

El mini reproductor busca la pista en:

```text
public/audio/iris.mp3
```

Por derechos de autor, el archivo de audio no está incluido en el proyecto.
Utiliza una copia de “Iris” de Goo Goo Dolls que tengas derecho a publicar. El
archivo MP3 está excluido de Git para evitar subirlo accidentalmente.
