# Testing · IPET 50 Elección de Especialidad

Todo el testing del sistema vive en esta carpeta (`testing/`), con sus propias
dependencias. No toca `frontend/` ni `backend/`. Está armado como el de BALTO:
**Playwright**, ejecución por módulo con `ejecutar.cjs`, perfiles en
`perfiles.json` y un único `.env` como fuente de verdad.

```
eleccion_especialidad/
├── backend/
├── frontend/
└── testing/            ← esta carpeta
    ├── .env            ← destino, usuario y permisos (no se sube al repo)
    ├── ejecutar.cjs    ← node ejecutar.cjs global | <modulo> | completo
    ├── perfiles.json   ← qué tests corre cada módulo
    ├── playwright.config.js
    ├── support/        ← env, cliente de la API, respaldo/restauración, helpers de pantalla
    ├── setup/          ← login por pantalla (guarda la sesión)
    ├── global/  login/  panel/  eleccion/  historial/  cupos/  ordenar/  usuarios/
    └── COMANDOS_TESTING.txt
```

## Instalación

```powershell
cd testing
npm install
npx playwright install chromium
```

El `.env` ya viene armado apuntando a tu backend local (si lo perdés, copiá
`.env.example` como `.env`). Completá `TEST_USER` y `TEST_PASSWORD` con un usuario **administrador** de la base
contra la que vas a probar.

## Local u Hostinger: lo decide `TEST_API_URL`

| `.env` | Qué pasa |
|---|---|
| `TEST_API_URL=http://localhost:3001` | Prueba tu backend local. Con `TEST_START_BACKEND=1` el test levanta solo `php -S localhost:3001 -t ../backend/routes -c <TEST_PHP_INI>`; si ya lo tenés corriendo, usa el tuyo. |
| `TEST_API_URL=https://eleccion.ipet50.edu.ar/api/routes` | Prueba el backend publicado en Hostinger. No se levanta nada local salvo el frontend (si `TEST_UI=1`), que se compila apuntando a Hostinger. |

Con `TEST_UI=1` se levanta `npm start` de `../frontend` en el puerto `3100`
(no choca con tu `npm start` normal del 3000) con `REACT_APP_API_URL` = la URL
elegida, así las pantallas también hablan con ese backend.

## Niveles de permiso

| Variable | Qué habilita | ¿Hostinger? |
|---|---|---|
| (nada) | Solo lectura: router, login, dashboard, listados, historial, ranking (vista previa), pantallas | ✅ seguro |
| `TEST_ALLOW_MUTATIONS=1` | Cambios **reversibles**: usuarios `e2e_…` (alta/edición/baja/rol vista), inscribir y cancelar un alumno sin inscripción, editar cupos (solo si no hay inscriptos), validaciones de escritura | ✅ deja todo igual |
| `TEST_ALLOW_DESTRUCTIVE=1` | Resetear elección (con y sin historial), Limpiar todo, importar alumnos, aplicar ranking. **Respaldan y restauran** alumnos, ranking, inscripciones (en el mismo orden) y cupos | ❌ bloqueado salvo `TEST_ALLOW_REMOTE_DESTRUCTIVE=1` |

> Después de "Limpiar todo" los alumnos se reimportan, así que reciben **ids nuevos**
> (las inscripciones se restauran buscando por DNI). Si la base local tiene datos que
> te importan, hacé un backup antes de habilitar las destructivas.

## Qué se prueba (96 casos)

- **global**: acción inválida, preflight CORS, las 11 lecturas responden `exito:true`, los endpoints que borran rechazan GET; navegación por el menú, engranaje → Configuración → Usuarios, `/registro` redirige, recarga en cada ruta, cerrar sesión (cancelar / confirmar).
- **login**: credenciales correctas/incorrectas/faltantes, GET no permitido, registro heredado; pantalla: rutas protegidas sin sesión, error visible, mostrar contraseña.
- **panel**: estructura del `dashboard_resumen` y que sus números cierren con alumnos, cupos, inscripciones y usuarios; el "próximo" es el primer pendiente.
- **eleccion**: orden del ranking, filtros de `obtener_alumnos`, agrupación de resultados; confirmar → cambiar → AUSENTE → cancelar con los cupos de vuelta al inicio; desde la grilla; modal de reseteo con "Guardar historial" marcado; Modo Pantalla.
- **historial**: listado ordenado, detalle coherente (alumnos, especialidades, ausentes, orden dentro de cada especialidad), ids inválidos; pantalla con selector, búsqueda y cambio de elección; reseteo con historial / sin historial / sin inscriptos / por defecto, y eliminar.
- **cupos**: coherencia entre las 3 lecturas, AUSENTE en 0, disponibles = cupo − inscriptos, edición individual y en lote, negativos y AUSENTE, cuerpos inválidos; pantalla con "Guardar todos".
- **ordenar**: columnas, vista previa del ranking, trayectoria al final, orden guardado vs ranking; importar (alta y actualización por DNI, filas vacías descartadas), aplicar ranking, Limpiar todo con y sin historial; modal con la casilla marcada.
- **usuarios**: no expone contraseñas, validaciones, alta, nombre repetido sin importar mayúsculas, edición sin cambiar contraseña, cambio de contraseña, protecciones de la propia sesión, baja; pantalla alta/baja; usuario **vista** solo ve Inicio y Cargar y ordenar.

Los tests que necesitan datos que no hay (por ejemplo, una especialidad sin cupo)
se saltean con el motivo, no fallan.

## Limpieza

Todo lo que crean los tests se llama `e2e_…` (usuarios) o `E2E …` (historial) y
`global-teardown` lo borra aunque una prueba se corte a la mitad.

## Hostinger

Si Hostinger responde con una página HTML (desafío anti-bot / 403) en vez de
JSON, el `global-setup` lo avisa antes de empezar. En ese caso probá desde otra
red o bajá la cantidad de corridas seguidas.
