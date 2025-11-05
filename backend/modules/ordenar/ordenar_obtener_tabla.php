<?php
// backend/modules/ordenar/ordenar_obtener_tabla.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/db.php';

header('Content-Type: application/json; charset=utf-8');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Vary: Origin");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 86400");

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

  // Preferimos ordenar por 'orden' si hay al menos uno no NULL
  $hayOrden = (int)$pdo->query("SELECT COUNT(*) FROM alumnos WHERE orden IS NOT NULL")->fetchColumn() > 0;

  $order = $hayOrden ? "orden ASC" : "alumno ASC";

  $stmt = $pdo->query("
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
    ORDER BY $order, id_alumno ASC
  ");
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  http_response_code(200);
  echo json_encode([
    'exito' => true,
    'data'  => $rows,
    'orden' => $hayOrden ? 'orden' : 'alumno'
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  http_response_code(200);
  echo json_encode([
    'exito'   => false,
    'mensaje' => 'Error en ordenar_obtener_tabla: ' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
