<?php
// backend/modules/ordenar/ordenar_ranking.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/db.php';

// ---- CORS y JSON ----
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Vary: Origin");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 86400");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  echo json_encode(['ok' => true]);
  exit;
}

try {
  if (!isset($pdo) || !($pdo instanceof PDO)) {
    throw new RuntimeException('Conexión PDO no disponible.');
  }

  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->exec("SET NAMES utf8mb4");

  // =========================
  // Utilidades
  // =========================

  // Obtener columnas reales de la tabla alumnos
  $cols = [];
  $rs = $pdo->query("SHOW COLUMNS FROM alumnos");
  foreach ($rs as $r) {
    $cols[] = $r['Field'];
  }
  $has = fn(string $c) => in_array($c, $cols, true);

  // ----
  // Armado dinámico del ORDER BY
  // (Seguí el orden de la imagen. Para cada criterio que exista,
  // ordenamos de 'menor a mayor' (menos problemas primero),
  // y el último criterio es Promedio Final DESC.)
  //
  // Notas:
  // - Textos de observaciones: ordenamos por "tiene observaciones (0/1)" asc
  //   (sin observaciones primero), y opcionalmente por LENGTH asc.
  // - repite_1a es ENUM('si','no'): lo convertimos a 0/1 con CASE.
  // - Tercera materia, amonestaciones, previas, adeudadas, faltas, coloquios:
  //   ascendente (menor a mayor).
  // ----
  $orderParts = [];

  // 2) Amonestaciones 2° Año (no existe en tu esquema → se ignora)
  if ($has('amonestaciones_2a')) {
    $orderParts[] = "amonestaciones_2a ASC";
  }

  // 3) Amonestaciones 1° Año
  if ($has('amonestaciones_1a')) {
    $orderParts[] = "amonestaciones_1a ASC";
  }

  // 4) Observaciones 2° Año (no existe → se ignora)
  if ($has('observaciones_2a')) {
    // si existiera tipo TEXT/NULL
    $orderParts[] = "(CASE WHEN TRIM(COALESCE(observaciones_2a,''))='' THEN 0 ELSE 1 END) ASC";
    $orderParts[] = "LENGTH(COALESCE(observaciones_2a,'')) ASC";
  }

  // 5) Observaciones 1° Año
  if ($has('observaciones_1a')) {
    $orderParts[] = "(CASE WHEN TRIM(COALESCE(observaciones_1a,''))='' THEN 0 ELSE 1 END) ASC";
    $orderParts[] = "LENGTH(COALESCE(observaciones_1a,'')) ASC";
  }

  // 6) Repitente de 2° Año (0/1)
  if ($has('repite_2a')) {
    $orderParts[] = "repite_2a ASC";
  }

  // 7) Repitente de 1° Año (enum 'si'/'no') → 'no' (0) primero
  if ($has('repite_1a')) {
    $orderParts[] = "(CASE WHEN repite_1a='si' THEN 1 ELSE 0 END) ASC";
  }

  // 8) Tercera Materia (0/1) – menor primero
  if ($has('tercera_materia')) {
    $orderParts[] = "tercera_materia ASC";
  }

  // 9) Previas 1° Etapa 2025
  if ($has('previas_1et')) {
    $orderParts[] = "previas_1et ASC";
  }

  // 10) Materias adeudadas 1° Etapa 2025
  if ($has('adeudadas_1et')) {
    $orderParts[] = "adeudadas_1et ASC";
  }

  // 11) Materias a coloquio 1° Año
  if ($has('coloquios_1a')) {
    $orderParts[] = "coloquios_1a ASC";
  }

  // 12) Faltas Injustificadas 1° Etapa 2025
  if ($has('inasistencias_1et')) {
    $orderParts[] = "inasistencias_1et ASC";
  }

  // 13) Faltas Injustificadas 1° Año
  if ($has('inasistencias_1a')) {
    $orderParts[] = "inasistencias_1a ASC";
  }

  // 14) Promedio Final (mayor a menor)
  if ($has('promedio_final')) {
    $orderParts[] = "promedio_final DESC";
  }

  // Tie-breaker estable: por nombre
  if ($has('alumno')) {
    $orderParts[] = "alumno ASC";
  } else {
    $orderParts[] = "id_alumno ASC";
  }

  // Si por algún motivo no hay partes, caemos a nombre/id
  if (empty($orderParts)) {
    $orderParts = [$has('alumno') ? "alumno ASC" : "id_alumno ASC"];
  }

  $ORDER_BY = implode(",\n        ", $orderParts);

  // =========================
  // Vista previa
  // =========================
  if (isset($_GET['preview'])) {
    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;

    $stmt = $pdo->prepare("
      SELECT
        id_alumno, dni, alumno,
        promedio_final, promedio_1et,
        adeudadas_1et, previas_1et,
        repite_2a, repite_1a,
        inasistencias_1et, inasistencias_1a,
        amonestaciones_1a, tercera_materia,
        observaciones_1a,
        orden
      FROM alumnos
      ORDER BY
        $ORDER_BY
      LIMIT :lim
    ");
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // agregar posición simulada
    foreach ($rows as $i => &$r) {
      $r['_posicion_preview'] = $i + 1;
    }

    http_response_code(200);
    echo json_encode([
      'exito'   => true,
      'preview' => $rows,
      'cantidad'=> count($rows),
      'order_by'=> $ORDER_BY,
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }

  // =========================
  // Aplicar ranking (persistir en alumnos.orden)
  // =========================
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input   = json_decode(file_get_contents('php://input') ?: '[]', true);
    $aplicar = !empty($input['aplicar']) || !empty($_GET['aplicar']);

    if (!$aplicar) {
      http_response_code(200);
      echo json_encode(['exito' => false, 'mensaje' => 'Parámetro aplicar=1 requerido.']);
      exit;
    }

    // Traer ids en el orden calculado
    $ids = $pdo->query("
      SELECT id_alumno
      FROM alumnos
      ORDER BY
        $ORDER_BY
    ")->fetchAll(PDO::FETCH_COLUMN);

    // Persistir posiciones
    $pdo->beginTransaction();
    // (opcional) limpiar primero
    $pdo->exec("UPDATE alumnos SET orden = NULL");

    $upd = $pdo->prepare("UPDATE alumnos SET orden = :pos WHERE id_alumno = :id");
    foreach ($ids as $i => $id) {
      $pos = $i + 1;
      $upd->execute([':pos' => $pos, ':id' => (int)$id]);
    }
    $pdo->commit();

    http_response_code(200);
    echo json_encode([
      'exito'   => true,
      'mensaje' => 'Ranking aplicado y guardado en la columna orden.',
      'total'   => count($ids)
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }

  // Método no soportado
  http_response_code(200);
  echo json_encode(['exito' => false, 'mensaje' => 'Método no soportado.'], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  if ($pdo && $pdo->inTransaction()) {
    $pdo->rollBack();
  }
  http_response_code(200);
  echo json_encode([
    'exito'   => false,
    'mensaje' => 'Error en ordenar_ranking: ' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
