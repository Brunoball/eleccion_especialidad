<?php
// backend/modules/tabla_eleccion/obtener_elecciones.php
declare(strict_types=1);

require_once __DIR__ . '/../../config/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

  // ✅ SIN prefijo de base: solo nombres de tabla
  $sql = "
    SELECT
      e.id_eleccion      AS id_eleccion,
      e.id_alumno        AS id_alumno,
      e.id_especialidad  AS id_especialidad,
      a.alumno           AS alumno,
      a.dni              AS dni,
      s.especialidad     AS especialidad
    FROM `eleccion` e
      INNER JOIN `alumnos` a
        ON a.id_alumno = e.id_alumno
      INNER JOIN `especialidad` s
        ON s.id_especialidad = e.id_especialidad
    ORDER BY e.id_eleccion ASC
  ";

  $stmt = $pdo->query($sql);

  $data = [];
  $orden = 1;
  while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $data[] = [
      'orden'           => $orden++,
      'id_eleccion'     => (int)$row['id_eleccion'],
      'id_alumno'       => (int)$row['id_alumno'],
      'id_especialidad' => (int)$row['id_especialidad'],
      'nombre'          => (string)$row['alumno'],
      'dni'             => (string)$row['dni'],
      'especialidad'    => (string)$row['especialidad'],
    ];
  }

  echo json_encode(['exito' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'exito'   => false,
    'mensaje' => 'Error: ' . $e->getMessage(),
  ], JSON_UNESCAPED_UNICODE);
}
