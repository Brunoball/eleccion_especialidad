<?php
// backend/modules/elecciones/resetear_elecciones.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['exito' => false, 'mensaje' => 'Solo POST']);
    exit;
  }

  if (!isset($pdo) || !($pdo instanceof PDO)) {
    throw new RuntimeException('Conexión PDO no disponible.');
  }

  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->exec("SET NAMES utf8mb4");

  $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME); // 'mysql' | 'sqlite' | ...

  // --- 1) Bloque transaccional: DELETEs + UPDATE ---
  $pdo->beginTransaction();

  // Vaciar primero la tabla hija (eleccion), luego alumnos
  $pdo->exec("DELETE FROM eleccion");
  $pdo->exec("DELETE FROM alumnos");

  // Reiniciar cupos_actuales = cupo en especialidad
  $pdo->exec("UPDATE especialidad SET cupos_actuales = cupo");

  if ($driver === 'sqlite') {
    // En SQLite, el autoincrement se mantiene en sqlite_sequence; puede ir dentro de la transacción
    $pdo->exec("DELETE FROM sqlite_sequence WHERE name IN ('eleccion','alumnos')");
  }

  $pdo->commit();

  // --- 2) Operaciones NO transaccionales específicas del motor ---
  if ($driver === 'mysql') {
    // IMPORTANTE: fuera de transacción, porque ALTER TABLE hace implicit commit
    $pdo->exec("ALTER TABLE eleccion AUTO_INCREMENT = 1");
    $pdo->exec("ALTER TABLE alumnos AUTO_INCREMENT = 1");
  }

  echo json_encode([
    'exito'   => true,
    'mensaje' => 'Elección y alumnos vaciados; cupos_actuales reiniciados; autoincrement reseteado.',
  ]);
} catch (Throwable $e) {
  // Intentar rollback solo si hay transacción activa
  try {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
      $pdo->rollBack();
    }
  } catch (Throwable $ignored) {
    // Si no hay transacción activa, ignoramos el error de rollback
  }

  http_response_code(400);
  echo json_encode([
    'exito'   => false,
    'mensaje' => $e->getMessage(),
  ]);
}
