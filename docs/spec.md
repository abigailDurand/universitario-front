# SPEC — universitario-front (`uni-panel`, aplicación UniPanel)

Resumen de la especificación del frontend aprobada por el usuario (fuente de verdad).
Las **imágenes de referencia aprobadas no están en el repositorio**; el diseño sigue la
paleta y las reglas de §2.

## 1. Objetivo

React + Vite + JavaScript + CSS. Dos pantallas: **Mis notas** y **Mis pendientes**.
Sin login, usuarios, notificaciones ni acciones masivas. Consume las API; no accede a BD
ni calcula notas.

| API | Contrato | Prefijo |
|---|---|---|
| `uni-notas-api` | `notas-service/SPEC.md` | `/api/notas` |
| `uni-pendientes-api` | `pendientes-service/SPEC.md` | `/api/pendientes` |

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
  - *Nota necesaria* solo si no es `null` (0 se muestra como 0).
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

## Por definir

- Imágenes de referencia: no están en el repo; ajustar el diseño cuando se compartan.
- Límite de longitud del nombre en `uni-notas-api` (hoy no existe).
