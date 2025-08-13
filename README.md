# Encuesta en Vivo (Sí/No) · OAuth GitHub + JWT + Socket.IO

Aplicación full-stack con **login vía GitHub (OAuth 2.0)**, **sesión con JWT** (cookie httpOnly), y **tiempo real con Socket.IO** para una **encuesta Sí/No** cuyos porcentajes se actualizan al instante para todos los usuarios conectados.

## 1. Objetivo
Desarrollar y desplegar una aplicación que integre:
1) **OAuth 2.0** con proveedor externo (GitHub),  
2) **gestión de sesiones con JWT** y **rutas protegidas**,  
3) **funcionalidad en tiempo real** con Socket.IO,  
4) control de versiones en GitHub, y  
5) despliegue en un servicio en la nube (Railway).

## 2. Alcance del proyecto
Se implementó **Encuesta en Vivo (Sí/No)**: los usuarios inician sesión con GitHub, emiten un voto (sí o no) y ven **porcentajes actualizados en tiempo real** (broadcast a todos los clientes conectados).

## 3. Desarrollo
_Sin iniciar sesion no te deja Votar_
![Imgur](https://i.imgur.com/phSBOTa.png)


_No existe Uusarios Registrados_
![Imgur](https://i.imgur.com/zZ0C7Xd.png)


_Iniciamos Sesion para poder Votar con GitHub_
![Imgur](https://i.imgur.com/lTXItmD.png)


_Se inicia Sesion Exitosamente_
![Imgur](https://i.imgur.com/1h90SeW.png)



_Se evidencia que ya existe un usuario registrado_
![Imgur](https://i.imgur.com/HlzDVE3.png)


_Se evidencia que ya existe un usuario registrado_
![Imgur](https://i.imgur.com/HlzDVE3.png)


### 3.1. Configuración inicial
- Se creó el repositorio con la estructura:
server/ (Express + Passport + JWT + Socket.IO)
client/ (HTML/JS/CSS)
package.json (raíz, delega a server/)

markdown
Copiar
Editar
- Se añadieron `.gitignore` y `.env.example`.
- Se instalaron dependencias: `express`, `passport`, `passport-github2`, `jsonwebtoken`, `cookie-parser`, `dotenv`, `socket.io`.

### 3.2. OAuth 2.0 con GitHub
- Rutas:
- **`GET /auth/github`** (y alias **`/auth/provider`**) → inicia flujo OAuth.
- **`GET /auth/github/callback`** (y alias **`/auth/provider/callback`**) → procesa callback.
- Estrategia `passport-github2` con `callbackURL` dependiente de `BASE_URL`.
- Se recibió el **perfil de GitHub** y se pasó a emisión de JWT.

### 3.3. JWT y ruta protegida
- Tras el callback exitoso, se generó **JWT** con `{ id, name, username, avatar }`.
- El token se envió en **cookie httpOnly** (con `secure: true` en producción).
- Middleware `authMiddleware` verifica el token en cada petición.
- Ruta protegida **`GET /api/profile`** responde solo si el token es válido.

### 3.4. Tiempo real con Socket.IO
- **Servidor**: al conectarse, se emite `results` con conteos actuales; al recibir `vote` se actualiza el estado en memoria y se hace **broadcast** global `results`.
- **Cliente**: botones **Sí/No** emiten `vote`; escucha `results` para actualizar barras y porcentajes.

### 3.5. Interfaz
- Frontend estático minimalista (`client/index.html`, `app.js`, `styles.css`) con área de login, botones de voto y barras de progreso.

### 3.6. Control de versiones
- Commits significativos recomendados:
- `feat(auth): OAuth GitHub y emisión de JWT`
- `feat(api): ruta protegida /api/profile`
- `feat(realtime): Socket.IO para encuesta sí/no`
- `chore(deploy): ajustes BASE_URL y docs`
- `docs: README inicial`
- `Entrega final del examen`
## 5. Pruebas realizadas
- **Login**: flujo completo GitHub → emisión de JWT → cookie httpOnly.
- **/api/profile**: responde con datos del usuario autenticado (401 si no hay token).
- **Tiempo real**: en dos pestañas, al votar en una se actualizan porcentajes en ambas.
- **Healthcheck** (opcional): `/healthz` retornando `ok` para confirmar servicio vivo.