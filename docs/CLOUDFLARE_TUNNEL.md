# Cloudflare Tunnel (Argo) — Quick setup for JarBees

Resumen rápido para exponer tu backend NestJS local sin abrir puertos ni cambiar router.

1) Requisitos
- Cuenta Cloudflare y un dominio gestionado por Cloudflare (puede ser un subdominio).
- Instalar `cloudflared` en tu máquina (https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/)

2) Comandos básicos (ejecutar en tu PC donde corre NestJS)

```bash
# Inicia sesión si es la primera vez
cloudflared login

# Crear un túnel y asignarle un nombre (una sola vez)
cloudflared tunnel create jarbees-tunnel

# Ejecutar el túnel y exponer localmente el puerto 4000 (ajusta si usás otro puerto)
cloudflared tunnel run --url http://localhost:4000
```

3) Conectar un hostname (opcional, recomendado)

En Cloudflare Dashboard > Zero Trust > Access > Tunnels > Public Hostnames puedes mapear
`jarbees.midominio.com` al túnel. Alternativamente usar `cloudflared` para crear el CNAME.

4) Ejemplo `.env` para el frontend

```
NEXT_PUBLIC_BACKEND_URL=https://jarbees.midominio.com
NEXT_PUBLIC_API_TOKEN=changeme
```

5) Seguridad mínima
- No uses tokens sensibles en el repositorio. Guarda `NEXT_PUBLIC_API_TOKEN` en GitHub Pages secrets si usas Actions.
- En el backend valida el header `Authorization: Bearer <token>` comparándolo con `API_SECRET` en tu `.env` del servidor.

6) Notas
- Cloudflare Tunnel mantiene una conexión saliente desde tu PC a Cloudflare — no hace falta abrir puertos.
- Para producción eventual, considera mover backend a una máquina dedicada o VPS.

---
Guía corta preparada por JarBees dev. Si querés, creo también un pequeño script de `cloudflared` y un ejemplo de verificación HTTP para probar el túnel.
