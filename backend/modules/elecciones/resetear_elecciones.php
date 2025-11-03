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
  if (!isset($pdo) || !($pdo instanceof PDO)) {
    throw new RuntimeException('Conexión PDO no disponible.');
  }

  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->exec("SET NAMES utf8mb4");

  // Confirmación simple para evitar ejecuciones accidentales
  $input = json_decode(file_get_contents('php://input') ?: '[]', true);
  if (!is_array($input) || empty($input['confirmar'])) {
    throw new InvalidArgumentException('Falta confirmación.');
  }

  $pdo->beginTransaction();

  // --- IMPORTANTE ---
  // Si existen FKs (por ejemplo desde `eleccion` hacia `alumnos`), desactivamos
  // restricciones mientras vaciamos la tabla de alumnos para evitar errores.
  $pdo->exec("SET FOREIGN_KEY_CHECKS=0");

  // 1) Limpiar tabla ALUMNOS (en lugar de ELECCION)
  $pdo->exec("DELETE FROM alumnos");

  // Restauramos las verificaciones de clave foránea
  $pdo->exec("SET FOREIGN_KEY_CHECKS=1");

  // 2) Resetear cupos_actuales = cupo en ESPECIALIDAD
  $pdo->exec("UPDATE especialidad SET cupos_actuales = cupo");

  $pdo->commit();

  echo json_encode(['exito' => true, 'mensaje' => 'Alumnos eliminados y cupos reiniciados.']);
} catch (Throwable $e) {
  if ($pdo?->inTransaction()) { $pdo->rollBack(); }
  http_response_code(400);
  echo json_encode(['exito' => false, 'mensaje' => $e->getMessage()]);
}
