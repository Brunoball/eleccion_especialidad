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

  // --- Vista previa ---
  if (isset($_GET['preview'])) {
    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;

    // Orden sugerido (ajustá a tu regla exacta si cambia)
    $sql = "
      SELECT
        id_alumno, dni, alumno,
        promedio_final, promedio_1et,
        adeudadas_1et, previas_1et,
        repite_2a, repite_1a,
        inasistencias_1et, amonestaciones_1et
      FROM alumnos
      ORDER BY
        repite_2a ASC,
        (repite_1a = 'no') DESC,
        adeudadas_1et ASC,
        previas_1et ASC,
        amonestaciones_1et ASC,
        inasistencias_1et ASC,
        promedio_final DESC,
        alumno ASC
      LIMIT :lim
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
      'exito'   => true,
      'preview' => $rows,
      'cantidad'=> count($rows)
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }

  // --- Aplicar ranking (persistencia opcional) ---
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input') ?: '[]', true);
    $aplicar = !empty($input['aplicar']) || !empty($_GET['aplicar']);

    if (!$aplicar) {
      http_response_code(200);
      echo json_encode(['exito' => false, 'mensaje' => 'Parámetro aplicar=1 requerido.']);
      exit;
    }

    // Si más adelante querés persistir el orden, acá podés:
    // - crear una tabla auxiliar alumnos_orden (id_alumno, posicion, fecha)
    // - o agregar una columna "orden" a alumnos.
    //
    // Por ahora solo computamos y devolvemos la lista ordenada.
    $sql = "
      SELECT id_alumno
      FROM alumnos
      ORDER BY
        repite_2a ASC,
        (repite_1a = 'no') DESC,
        adeudadas_1et ASC,
        previas_1et ASC,
        amonestaciones_1et ASC,
        inasistencias_1et ASC,
        promedio_final DESC,
        alumno ASC
    ";
    $ids = $pdo->query($sql)->fetchAll(PDO::FETCH_COLUMN);

    // Ejemplo de “persistencia” opcional (comentado):
    // $pdo->beginTransaction();
    // $pdo->exec("TRUNCATE TABLE alumnos_orden");
    // $ins = $pdo->prepare("INSERT INTO alumnos_orden (id_alumno, posicion, fecha) VALUES (?, ?, NOW())");
    // foreach ($ids as $i => $id) { $ins->execute([$id, $i+1]); }
    // $pdo->commit();

    http_response_code(200);
    echo json_encode([
      'exito' => true,
      'mensaje' => 'Ranking calculado correctamente.',
      'total' => count($ids)
    ], JSON_UNESCAPED_UNICODE);
    exit;
  }

  // Si llega acá, método no soportado
  http_response_code(200);
  echo json_encode(['exito' => false, 'mensaje' => 'Método no soportado.'], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  http_response_code(200);
  echo json_encode([
    'exito'   => false,
    'mensaje' => 'Error en ordenar_ranking: ' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
