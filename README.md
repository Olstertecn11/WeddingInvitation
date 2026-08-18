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

La invitación solo se puede consultar cuando su estado es `active`. Al registrar
una respuesta, se guarda un RSVP por invitación y las respuestas de cada
integrante se insertan o actualizan dentro de la misma transacción. La
aplicación no almacena IPs en claro: guarda un hash SHA-256 con la sal privada
`RSVP_HASH_SALT`.

## Administración

Configura estas variables únicamente en `.env.local` o en el proveedor de
despliegue:

```text
ADMIN_JWT_SECRET=
```

Los administradores se guardan en MySQL con contraseña hasheada mediante
`scrypt`. Después de ejecutar `npm run db:migrate`, crea o actualiza el usuario
admin con:

```bash
npm run admin:create
```

Ese comando usa temporalmente estas variables de tu `.env.local`:

```text
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_DISPLAY_NAME=
```

La aplicación no usa `ADMIN_PASSWORD` en runtime. En producción puedes quitarla
de Vercel después de crear el usuario. La sesión administrativa utiliza un JWT
en cookie `httpOnly`, se valida contra `admin_sessions`, se revoca al cerrar
sesión y expira después de 12 horas.

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

El archivo de audio `public/audio/iris.mp3` está incluido en Git. Asegúrate de
tener derechos para publicarlo antes de desplegar el sitio.
