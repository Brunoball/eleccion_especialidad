<?php
// backend/modules/tabla_eleccion/obtener_elecciones.php
declare(strict_types=1);

require_once __DIR__ . '/../../../config/db.php';

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

  // Filtro opcional por id_eleccion
  $idEleccion = null;
  if (isset($_GET['id_eleccion']) && $_GET['id_eleccion'] !== '') {
    $idTmp = filter_var($_GET['id_eleccion'], FILTER_VALIDATE_INT);
    if ($idTmp === false || $idTmp <= 0) {
      throw new InvalidArgumentException('Parámetro id_eleccion inválido.');
    }
    $idEleccion = $idTmp;
  }

  // SELECT
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
  ";

  if ($idEleccion !== null) {
    $sql .= " WHERE e.id_eleccion = :id_eleccion ";
  }

  // ORDENAR POR EL id_eleccion
  $sql .= " ORDER BY e.id_eleccion ASC ";

  $stmt = $pdo->prepare($sql);

  if ($idEleccion !== null) {
    $stmt->bindValue(':id_eleccion', $idEleccion, PDO::PARAM_INT);
  }

  $stmt->execute();

  $data = [];
  while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    // 👉 ORDEN = id_eleccion (lo que querías)
    $data[] = [
      'orden'           => (int)$row['id_eleccion'],
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
