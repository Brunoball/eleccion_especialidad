<?php
// backend/modules/ordenar/obtener_tabla.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/db.php';

// ---- CORS y JSON ----
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Vary: Origin");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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

  // Traer TODAS las columnas de la tabla alumnos
  $sql = "
    SELECT
      id_alumno,
      dni,
      alumno,
      promedio_1a,
      coloquios_1a,
      adeudadas_1et,
      previas_1et,
      repite_2a,
      inasistencias_1et,
      amonestaciones_1et,
      observaciones_1et,
      promedio_final,
      fecha_referencia,
      repite_1a,
      amonestaciones_1a,
      tercera_materia,
      inasistencias_1a,
      observaciones_1a,
      promedio_1et
    FROM alumnos
    ORDER BY alumno ASC, id_alumno ASC
  ";

  $stmt = $pdo->query($sql);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  http_response_code(200);
  echo json_encode([
    'exito'   => true,
    'cantidad'=> count($rows),
    'data'    => $rows
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  http_response_code(200);
  echo json_encode([
    'exito'   => false,
    'mensaje' => 'Error al obtener la tabla de alumnos: ' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}
