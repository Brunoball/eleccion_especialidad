<?php
// backend/modules/elecciones/eleccion_resetear.php
declare(strict_types=1);

require_once __DIR__ . '/../../../config/db.php';
require_once __DIR__ . '/../../historial/historial_lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

try {
  // Solo permitimos POST
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
      'exito' => false,
      'mensaje' => 'Solo POST',
    ]);
    exit;
  }

  if (!isset($pdo) || !($pdo instanceof PDO)) {
    throw new RuntimeException('Conexión PDO no disponible.');
  }

  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->exec("SET NAMES utf8mb4");

  // Detectar driver (mysql/sqlite/etc)
  $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

  // ¿Guardar historial antes de borrar? (por defecto SÍ)
  $body = historial_leer_body();
  $guardarHistorial = historial_debe_guardar($body);
  if ($guardarHistorial) {
    // CREATE TABLE hace commit implícito en MySQL: va antes de la transacción
    historial_asegurar_tablas($pdo);
  }
  $historial = ['guardado' => false, 'id' => null, 'inscriptos' => 0];

  // ================== TRANSACCIÓN ==================
  $pdo->beginTransaction();

  // 0) Copiar la elección actual al historial (misma transacción:
  //    si algo falla, no se borra nada)
  if ($guardarHistorial) {
    $historial = historial_guardar($pdo, [
      'titulo'  => (string)($body['titulo_historial'] ?? ''),
      'usuario' => (string)($body['usuario'] ?? ''),
      'origen'  => 'resultados',
    ]);
  }

  // 1) Vaciar SOLO la tabla eleccion
  $pdo->exec("DELETE FROM eleccion");

  // 2) Reiniciar cupos_actuales = cupo en TODAS las especialidades
  $sqlUpdate = "UPDATE especialidad SET cupos_actuales = cupo";
  $filas = $pdo->exec($sqlUpdate);

  if ($filas === false) {
    throw new RuntimeException('Error al actualizar cupos_actuales (exec devolvió false).');
  }

  // Si usamos SQLite y queremos resetear la secuencia de eleccion
  if ($driver === 'sqlite') {
    $pdo->exec("DELETE FROM sqlite_sequence WHERE name = 'eleccion'");
  }

  $pdo->commit();
  // ================== FIN TRANSACCIÓN ==================

  // En MySQL, ALTER TABLE hace commit implícito, por eso lo hacemos FUERA de la transacción
  if ($driver === 'mysql') {
    try {
      $pdo->exec("ALTER TABLE eleccion AUTO_INCREMENT = 1");
    } catch (Throwable $e) {
      // Si falla, no rompemos nada; solo no se resetea el autoincrement
    }
  }

  echo json_encode([
    'exito'   => true,
    'mensaje' => 'Elección reseteada. ' . historial_mensaje($guardarHistorial, $historial),
    'historial' => $historial,
    'filas_especialidad_actualizadas' => $filas,
    'driver'  => $driver,
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  try {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
      $pdo->rollBack();
    }
  } catch (Throwable $ignored) {}

  http_response_code(400);
  echo json_encode([
    'exito'   => false,
    'mensaje' => 'Error al resetear: ' . $e->getMessage(),
  ]);
}
