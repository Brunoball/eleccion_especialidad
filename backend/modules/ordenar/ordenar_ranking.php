<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/db.php';

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

  // columnas existentes
  $cols = [];
  foreach ($pdo->query("SHOW COLUMNS FROM alumnos") as $r) $cols[] = $r['Field'];
  $has = fn(string $c) => in_array($c, $cols, true);

  // === Helpers NUMÉRICOS para observaciones (acepta TEXT con '0','1','2' o 'no') ===
  // *_1et ≡ 2° año ; *_1a ≡ 1° año
  $obsNum1ET = $has('observaciones_1et')
    ? "(CASE
         WHEN TRIM(COALESCE(observaciones_1et,'')) IN ('','no','No','NO') THEN 0
         ELSE CAST(COALESCE(observaciones_1et,'0') AS UNSIGNED)
       END)"
    : null;

  $obsNum1A = $has('observaciones_1a')
    ? "(CASE
         WHEN TRIM(COALESCE(observaciones_1a,'')) IN ('','no','No','NO') THEN 0
         ELSE CAST(COALESCE(observaciones_1a,'0') AS UNSIGNED)
       END)"
    : null;

  // ============================================================
  // ORDEN — menos problemas primero (trayectoria separa grupos)
  // ============================================================
  $order = [];

  // 1) Trayectoria: 0 (con) arriba, 1 (sin) al final
  if ($has('trayectoria_institucional')) {
    $order[] = "COALESCE(trayectoria_institucional,0) ASC";
  }

  // 2) Amonestaciones 2° (1et)
  if ($has('amonestaciones_1et')) $order[] = "COALESCE(amonestaciones_1et,0) ASC";

  // 3) Amonestaciones 1°
  if ($has('amonestaciones_1a')) $order[] = "COALESCE(amonestaciones_1a,0) ASC";

  // 4) Observaciones 2° (1et): por CANTIDAD ASC
  if ($obsNum1ET) $order[] = "$obsNum1ET ASC";

  // 5) Observaciones 1°: por CANTIDAD ASC
  if ($obsNum1A)  $order[] = "$obsNum1A ASC";

  // 6) Repitente 2°
  if ($has('repite_2a')) $order[] = "COALESCE(repite_2a,0) ASC";

  // 7) Repitente 1° (ENUM 'si'/'no')
  if ($has('repite_1a')) $order[] = "(CASE WHEN repite_1a='si' THEN 1 ELSE 0 END) ASC";

  // 8) Tercera Materia
  if ($has('tercera_materia')) $order[] = "COALESCE(tercera_materia,0) ASC";

  // 9) Previas 1° Etapa (2°)
  if ($has('previas_1et')) $order[] = "COALESCE(previas_1et,0) ASC";

  // 10) Adeudadas 1° Etapa (2°)
  if ($has('adeudadas_1et')) $order[] = "COALESCE(adeudadas_1et,0) ASC";

  // 11) Coloquios 1°
  if ($has('coloquios_1a')) $order[] = "COALESCE(coloquios_1a,0) ASC";

  // 12) Faltas Injustificadas 2° (1et)
  if ($has('inasistencias_1et')) $order[] = "COALESCE(inasistencias_1et,0) ASC";

  // 13) Faltas Injustificadas 1°
  if ($has('inasistencias_1a')) $order[] = "COALESCE(inasistencias_1a,0) ASC";

  // 14) Promedios (mérito)
  if ($has('promedio_final')) $order[] = "COALESCE(promedio_final,0) DESC";
  if ($has('promedio_1et'))  $order[] = "COALESCE(promedio_1et,0) DESC";

  // desempates
  $order[] = $has('alumno') ? "alumno ASC" : "id_alumno ASC";

  $ORDER_BY = implode(",\n        ", $order);

  // ================= PREVIEW =================
  if (isset($_GET['preview'])) {
    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;

    $stmt = $pdo->prepare("
      SELECT
        id_alumno, dni, alumno,
        trayectoria_institucional,
        promedio_final, promedio_1et,
        adeudadas_1et, previas_1et,
        repite_2a, repite_1a,
        inasistencias_1et, inasistencias_1a,
        amonestaciones_1a, amonestaciones_1et,
        tercera_materia,
        observaciones_1a, observaciones_1et,
        orden
      FROM alumnos
      ORDER BY
        $ORDER_BY
      LIMIT :lim
    ");
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as $i => &$r) $r['_posicion_preview'] = $i + 1;

    http_response_code(200);
    echo json_encode([
      'exito' => true,
      'preview' => $rows,
      'cantidad' => count($rows),
      'order_by' => $ORDER_BY,
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }

  // ================= APLICAR =================
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input   = json_decode(file_get_contents('php://input') ?: '[]', true);
    $aplicar = !empty($input['aplicar']) || !empty($_GET['aplicar']);
    if (!$aplicar) {
      http_response_code(200);
      echo json_encode(['exito' => false, 'mensaje' => 'Parámetro aplicar=1 requerido.']);
      exit;
    }

    $ids = $pdo->query("
      SELECT id_alumno
      FROM alumnos
      ORDER BY
        $ORDER_BY
    ")->fetchAll(PDO::FETCH_COLUMN);

    $pdo->beginTransaction();
    $pdo->exec("UPDATE alumnos SET orden = NULL");
    $upd = $pdo->prepare("UPDATE alumnos SET orden = :pos WHERE id_alumno = :id");
    foreach ($ids as $i => $id) {
      $upd->execute([':pos' => $i + 1, ':id' => (int)$id]);
    }
    $pdo->commit();

    http_response_code(200);
    echo json_encode([
      'exito' => true,
      'mensaje' => 'Ranking aplicado y guardado en la columna orden.',
      'total' => count($ids)
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }

  http_response_code(200);
  echo json_encode(['exito' => false, 'mensaje' => 'Método no soportado.'], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  http_response_code(200);
  echo json_encode([
    'exito' => false,
    'mensaje' => 'Error en ordenar_ranking: ' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
