<?php
// backend/modules/elecciones/resetear_elecciones.php
declare(strict_types=1);

require_once __DIR__ . '/../../../config/db.php'; 

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

try {
  if (!isset($pdo) || !($pdo instanceof PDO)) {
    throw new RuntimeException('Conexión PDO no disponible.');
  }

  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->exec("SET NAMES utf8mb4");

  // Validación mínima (opcional)
  $input = json_decode(file_get_contents('php://input') ?: '[]', true);
  if (!is_array($input) || empty($input['confirmar'])) {
    throw new InvalidArgumentException('Falta confirmación.');
  }

  $pdo->beginTransaction();

  // 1) Vaciar tabla eleccion
  $pdo->exec("DELETE FROM eleccion");

  // 2) Resetear cupos_actuales = cupo en todas las especialidades
  $pdo->exec("UPDATE especialidad SET cupos_actuales = cupo");

  $pdo->commit();

  echo json_encode(['exito' => true, 'mensaje' => 'Registros eliminados y cupos reiniciados.']);
} catch (Throwable $e) {
  if ($pdo?->inTransaction()) { $pdo->rollBack(); }
  http_response_code(400);
  echo json_encode(['exito' => false, 'mensaje' => $e->getMessage()]);
}
