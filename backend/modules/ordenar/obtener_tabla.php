<?php
// backend/modules/ordenar/obtener_tabla.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/db.php';

// ---- CORS + JSON ----
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

  // 1) Columnas REALES de la tabla en el orden correcto
  $colsStmt = $pdo->query("SHOW COLUMNS FROM alumnos");
  $colsRaw = $colsStmt->fetchAll(PDO::FETCH_ASSOC);
  if (!$colsRaw) {
    throw new RuntimeException("No se pudieron obtener las columnas de 'alumnos'.");
  }
  $columns = array_map(static fn($r) => $r['Field'], $colsRaw); // ['id_alumno','dni',...]

  // 2) Filas tal cual (sin formateo, sin casts)
  $sql = "
    SELECT *
    FROM alumnos
    ORDER BY (orden IS NULL OR orden = 0) ASC, orden ASC, id_alumno ASC
  ";
  $stmt = $pdo->query($sql);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // 3) Respuesta
  // JSON_PRESERVE_ZERO_FRACTION mantiene 0.00/7.50, etc.
  http_response_code(200);
  echo json_encode([
    'exito'    => true,
    'columns'  => $columns,
    'cantidad' => is_array($rows) ? count($rows) : 0,
    'data'     => $rows,
  ], JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);

} catch (Throwable $e) {
  http_response_code(200);
  echo json_encode([
    'exito'   => false,
    'mensaje' => 'Error al obtener la tabla de alumnos: ' . $e->getMessage(),
  ], JSON_UNESCAPED_UNICODE);
}
