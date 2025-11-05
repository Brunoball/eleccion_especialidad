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

  // 1) OBTENER TODAS LAS COLUMNAS DE LA TABLA
  $colsStmt = $pdo->query("SHOW COLUMNS FROM alumnos");
  $colsRaw = $colsStmt->fetchAll(PDO::FETCH_ASSOC);
  
  if (!$colsRaw) {
    throw new RuntimeException("No se pudieron obtener las columnas de 'alumnos'.");
  }
  
  $columns = array_map(static fn($r) => $r['Field'], $colsRaw);

  // 2) OBTENER TODOS LOS DATOS CON TODAS LAS COLUMNAS
  $hayOrden = (int)$pdo->query("SELECT COUNT(*) FROM alumnos WHERE orden IS NOT NULL AND orden != 0")->fetchColumn() > 0;

  $order = $hayOrden ? "orden ASC" : "alumno ASC";

  // Usar SELECT * para obtener TODAS las columnas
  $stmt = $pdo->query("SELECT * FROM alumnos ORDER BY $order, id_alumno ASC");
  $rowsRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // 3) CONVERTIR TODOS LOS VALORES A STRING para evitar problemas de serialización
  $rows = array_map(function($row) {
    $converted = [];
    foreach ($row as $key => $value) {
      if ($value === null) {
        $converted[$key] = '';
      } else {
        // Convertir a string manteniendo los valores exactos
        $converted[$key] = (string)$value;
      }
    }
    return $converted;
  }, $rowsRaw);

  // 4) RESPUESTA CON TODAS LAS COLUMNAS Y DATOS
  http_response_code(200);
  echo json_encode([
    'exito' => true,
    'columns' => $columns, // ← ENVIAR LAS COLUMNAS AL FRONTEND
    'data' => $rows,
    'cantidad' => count($rows),
    'orden' => $hayOrden ? 'orden' : 'alumno'
  ], JSON_UNESCAPED_UNICODE | JSON_NUMERIC_CHECK);

} catch (Throwable $e) {
  http_response_code(200);
  echo json_encode([
    'exito'   => false,
    'mensaje' => 'Error en ordenar_obtener_tabla: ' . $e->getMessage()
  ], JSON_UNESCAPED_UNICODE);
}