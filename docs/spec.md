# SPEC — universitario-front (`uni-panel`, aplicación UniPanel)

Resumen de la especificación del frontend aprobada por el usuario (fuente de verdad).
Las **imágenes de referencia aprobadas no están en el repositorio**; el diseño sigue la
paleta y las reglas de §2.

## 1. Objetivo

React + Vite + JavaScript + CSS. Dos pantallas: **Mis notas** y **Mis pendientes**.
**Varios estudiantes con registro e inicio de sesión** (§9). Sin notificaciones ni acciones
masivas. Consume las API; no accede a BD ni calcula notas.

| API | Contrato | Prefijo |
|---|---|---|
| `uni-notas-api` | `notas-service/SPEC.md` | `/api/notas` |
| `uni-pendientes-api` | `pendientes-service/SPEC.md` | `/api/pendientes` |
| Autenticación (`uni-notas-api`) | `notas-service/AUTH.md` y `notas-service/SPEC.md` §8 | `/api/auth` |

No se inventan campos ni respuestas. Errores: `{ "error": "mensaje" }`.

## 2. Diseño visual

| Uso | Color |
|---|---|
| Fondo general | `#FAF9F6` |
| Superficies | `#FFFFFF` |
| Lavanda | `#EEE5FA` |
| Botones principales | `#8055C4` (texto blanco, contraste ≈ 5.1:1) |
| Menta | `#DCF3E5` |
| Durazno | `#FFE7D5` |
| Azul pastel (examen; no definido en la paleta) | `#DCEBFA` |
| Texto principal / secundario | `#242331` / `#625F70` |
| Bordes | `#DEDCE5` |
| Error | `#B42318` |

Sans serif, bordes de 12–16 px, sombras suaves, iconos de editar/eliminar/completar,
texto oscuro sobre pastel, foco visible, formularios con etiqueta, nunca solo color.

## 3. Estructura y navegación

Barra lateral con *UniPanel*, *Mis notas* y *Mis pendientes*; la activa resaltada
(`aria-current="page"`). Abre *Mis notas*. Sin librería de rutas (estado en `App.jsx`).
En móvil (≤ 768 px) pasa a barra superior compacta. Las tablas se desplazan en horizontal
dentro de su contenedor.

## 4. Mis notas

- Título *Mis notas*, subtítulo *Organiza tus evaluaciones y calcula tu nota objetivo.*, botón *Nuevo curso*.
- Lista de cursos a la izquierda, detalle a la derecha. Se selecciona el primer curso.
- Curso: crear, editar nombre y nota objetivo (0–20, inicial 11, hasta 2 decimales), eliminar
  con *“¿Eliminar este curso y sus evaluaciones? Esta acción no se puede deshacer.”*
  Al eliminar el seleccionado se selecciona el primero restante, o el estado vacío.
- Límite de longitud del nombre: el de la API de notas (hoy **no tiene**; no se inventa uno).
- Resumen (tal como lo da `GET /resumen`, sin recalcular):
  - `es_promedio_final` false → *Aporte acumulado* + *Todavía no es el promedio final.*; true → *Promedio final*.
  - *Nota necesaria* solo si no es `null` (0 se muestra como 0): es la nota común que la API calcula
    para **todas** las pendientes (`evaluaciones_pendientes_detalle`). Con una pendiente se indica
    *en {nombre}*; con varias, *en cada una de las N evaluaciones pendientes*.
  - En la tabla, cada evaluación con `nota` `null` muestra *Pendiente* y, si la API la da,
    *Sugerida: {nota_sugerida}* con estilo distinto (borde discontinuo). La sugerencia no se
    guarda, no se envía como nota y no se recalcula en el front.
  - `mensaje_objetivo` por tono: `alcanzado` menta, `alcanzable` lavanda,
    `no_alcanzado`/`no_alcanzable` durazno, `sin_calculo` neutro.
  - `mensaje_aprobacion` solo si no es `null` (aprobación separada del objetivo). `avisos[].mensaje`.
  - Nota objetivo editable en el resumen.
- Evaluaciones: tabla Evaluación / Peso / Nota / Acciones; *Pendiente* si `nota` es `null`;
  *Total registrado* con `suma_pesos`; botón *Evaluación*. Peso > 0 y ≤ 100, nota 0–20,
  hasta 2 decimales; nota vacía → `null`; 0 se conserva. Eliminar con confirmación.
- Tras cualquier cambio se recargan los datos afectados y el resumen.

## 5. Mis pendientes

- Título *Mis pendientes*, subtítulo *Tus tareas y exámenes, en un solo lugar.*, botón
  *Nuevo pendiente*, aclaración *Fechas en hora de Perú.*
- Filtros Estado (Todos/Pendiente/Completado) y Tipo (Todos/Tarea/Examen), combinables.
  *Todos* = omitir el parámetro. Sin más filtros.
- Tabla: casilla, Pendiente, Curso, Tipo, Fecha límite, Estado, Acciones. Sin casilla en la
  cabecera. Orden de la API. Tarea lavanda, examen azul, pendiente durazno, completado menta.
  `vencido` true → etiqueta adicional *Vencido* (no se recalcula).
- Casilla: `PATCH { "estado": "completado" | "pendiente" }`, deshabilitada mientras guarda;
  si falla conserva el estado y muestra el error; después vuelve a consultar con los filtros.
- Modal centrado (crear/editar): Título (≤ 120), Curso (≤ 100), Tipo, Fecha y hora límite,
  Descripción (≤ 1000, opcional). Cancelar / Guardar. Textos recortados; descripción vacía
  → `null`; sin `id`, `vencido` ni `estado` (creación usa el predeterminado). En edición solo
  los campos modificados; sin cambios se cierra sin PATCH.
- Fechas en hora de Perú: `datetime-local` (minutos) → `YYYY-MM-DDTHH:MM:00-05:00`. No se
  usa la zona del navegador. Se aceptan fechas pasadas.
- Eliminar: *“¿Eliminar este pendiente? Esta acción no se puede deshacer.”* con
  *Cancelar* / *Eliminar*. 204 → recargar; error → mantener y mostrar.

## 6. Carga y errores

Cargando, datos, sin registros, sin resultados para filtros y error de conexión con
*Reintentar*. Vacíos: *Aún no tienes cursos. Crea el primero.* · *Este curso aún no tiene
evaluaciones.* · *Aún no tienes pendientes.* · *No hay pendientes con estos filtros.*
Al guardar: botón deshabilitado, *Guardando…*, sin duplicados, datos conservados si falla.
Se muestra `error` del backend; si no hay: *No se pudo completar la operación. Inténtalo
nuevamente.* Modales con título, etiquetas, teclado, foco atrapado y devuelto al cerrar.

## 7–8. Código e integración

`fetch` centralizado en `src/api/http.js` (204 sin JSON). Rutas relativas `/api/notas` y
`/api/pendientes`: Vite en desarrollo, Nginx en despliegue, con el prefijo completo.
`/health` no se publica. Sin credenciales ni datos de ejemplo en producción.

## 9. Autenticación (registro, login y cierre de sesión)

Contrato común: `notas-service/AUTH.md`. El front **no** valida firmas ni decide permisos: solo
guarda el token, lo envía y reacciona a los `401`.

### Pantallas

- **Iniciar sesión** (pantalla inicial sin sesión): título *Iniciar sesión*; campos *Email* y
  *Contraseña*; botón *Entrar*; enlace *Crear una cuenta*.
- **Crear cuenta**: título *Crear cuenta*; campos *Nombre*, *Email*, *Contraseña* (8 a 128
  caracteres); botón *Crear cuenta*; enlace *Ya tengo una cuenta*. Si el registro responde
  `201`, hace login con los mismos datos y entra a *Mis notas*.
- Sin sesión no se muestran *Mis notas* ni *Mis pendientes* ni se llama a sus API.
- Con sesión, la barra lateral muestra el **nombre** del usuario y el botón **Cerrar sesión**.
- Mismo estilo, etiquetas, foco, estados *Guardando…* y mensajes de error que el resto (§6).
  Los errores de validación y `CREDENCIALES_INVALIDAS` / `EMAIL_REGISTRADO` se muestran con el
  texto de la API.

### Sesión

| Momento | Comportamiento |
|---|---|
| Login correcto | Guarda `{ token, expira }` en `sessionStorage` (`unipanel.sesion`; `expira` = `exp` del token en ms) y el `usuario` de la respuesta en memoria |
| Abrir o recargar la página | Si hay sesión y no venció: `GET /api/auth/me`; `200` → entra, `401` → login |
| Cada solicitud a `/api/notas`, `/api/pendientes` y `/api/auth/me` | Cabecera `Authorization: Bearer <token>` (centralizado en `src/api/http.js`) |
| Cualquier `401` de una API | Borra la sesión, vuelve a *Iniciar sesión* y muestra el `error` de la API (p. ej. *La sesión venció…*) |
| `expira` ya pasado | Igual que un `401`, sin llamar a la API |
| Cerrar sesión | Borra `sessionStorage` y el estado en memoria (datos de cursos y pendientes incluidos) y muestra el login. No llama a ninguna API (no hay revocación) |

- El token nunca va en la URL ni se muestra en pantalla ni en la consola.
- Cambiar de usuario en la misma pestaña no debe mostrar datos del anterior: al cerrar sesión se
  descarta todo el estado de las pantallas.

### Integración

- Nginx reenvía `/api/auth` y sus subrutas a `uni-notas-api` **con la ruta completa**; el proxy de
  Vite hace lo mismo en desarrollo.
- Nginx añade `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self';
  img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
  (confirmada: el build de Vite no usa scripts ni estilos en línea). También `X-Content-Type-Options:
  nosniff` y `Referrer-Policy: no-referrer`.
- Claves del token (Secrets de K3s y archivos de Compose): ver `docs/architecture.md`.

### Pruebas

- Unitarias (Vitest): envío de `Authorization`, borrado de la sesión ante `401`, sesión vencida,
  cierre de sesión que descarta los datos, formularios de login y registro (errores de la API,
  *Guardando…*, sin envíos duplicados).
- Punta a punta con Docker Compose y **dos usuarios**: cada uno crea cursos, evaluaciones y
  pendientes; ninguno ve, edita ni elimina los del otro (las API responden `404`); cerrar sesión
  y entrar con el otro usuario no muestra datos del primero.

## Por definir

- Imágenes de referencia: no están en el repo; ajustar el diseño cuando se compartan.
- Límite de longitud del nombre en `uni-notas-api` (hoy no existe).
