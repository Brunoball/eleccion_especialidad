<?php
// backend/routes/api.php

// --- CORS mínimo y JSON ---
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Vary: Origin");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  echo json_encode(['ok' => true]);
  exit;
}

date_default_timezone_set('America/Argentina/Cordoba');
mb_internal_encoding('UTF-8');

$action = $_GET['action'] ?? '';

try {
  switch ($action) {
    /* ===========================
       LOGIN / REGISTRO
    ============================ */
    case 'inicio':
      require_once __DIR__ . '/../modules/login/inicio.php';
      exit;

    case 'registro':
      require_once __DIR__ . '/../modules/login/registro.php';
      exit;

    /* ===========================
       GLOBAL
    ============================ */
    case 'obtener_listas':
      require_once __DIR__ . '/../modules/global/obtener_listas.php';
      exit;

    /* ===========================
       CUPOS
    ============================ */
    case 'obtener_cupos':
      require_once __DIR__ . '/../modules/cupos/obtener_cupos.php';
      exit;

    case 'editar_cupos':
      // Body JSON: {id, cupo}  o  [{id, cupo}, ...]
      require_once __DIR__ . '/../modules/cupos/editar_cupos.php';
      exit;

    /* ===========================
       ELECCIONES
    ============================ */
    // 🔹 NUEVO: devuelve alumnos para la tabla
    case 'obtener_alumnos':
      require_once __DIR__ . '/../modules/elecciones/obtener_alumnos.php';
      exit;

    // (Los que ya tenías)
    case 'eleccion_alumnos':
      require_once __DIR__ . '/../modules/elecciones/alumnos_orden.php';
      exit;

    case 'eleccion_confirmar':
      require_once __DIR__ . '/../modules/elecciones/confirmar.php';
      exit;

    case 'eleccion_cancelar':
      require_once __DIR__ . '/../modules/elecciones/cancelar.php';
      exit;

    case 'obtener_cupos_actuales':  // ← NUEVA RUTA
      require_once __DIR__ . '/../modules/elecciones/obtener_cupos_actuales.php';
      exit;


    // ✅ IMPORTAR ALUMNOS DESDE JSON (dos aliases)
    case 'alumnos_import_json':
    case 'importar_alumnos':
      require_once __DIR__ . '/../modules/elecciones/alumnos_import_json.php';
      exit;

    /* ===========================
       DEFAULT
    ============================ */
    default:
      http_response_code(200);
      echo json_encode(['exito' => false, 'mensaje' => 'Acción no válida: ' . $action]);
      break;
  }
} catch (Throwable $e) {
  http_response_code(200);
  echo json_encode(['exito' => false, 'mensaje' => 'Error en router: ' . $e->getMessage() ]);
}
