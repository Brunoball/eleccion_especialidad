<?php
// backend/modules/elecciones/obtener_alumnos.php
declare(strict_types=1);

require_once __DIR__ . '/../../../config/db.php'; 

header('Content-Type: application/json; charset=utf-8');

try {
  if (!isset($pdo) || !($pdo instanceof PDO)) {
    throw new RuntimeException('Conexión PDO no disponible.');
  }

  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->exec("SET NAMES utf8mb4");

  // —— Filtros que puede mandar el frontend (whitelist) ——
  $order = $_GET['order'] ?? 'alumno';
  $dir   = strtoupper($_GET['dir'] ?? 'ASC');
  $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 500;

  $orderWhitelist = [
    'alumno'   => 'a.alumno',
    'dni'      => 'a.dni',
    'id_alumno'=> 'a.id_alumno'
  ];
  $orderBy = $orderWhitelist[$order] ?? 'a.alumno';
  $dir = ($dir === 'DESC') ? 'DESC' : 'ASC';
  if ($limit <= 0 || $limit > 5000) $limit = 500;

  // —— Traer alumnos + (si existe) su elección actual ——
  // Importante: NO usar COALESCE/IFNULL hacia 0; debe quedar NULL si no hay elección.
  $sql = "
    SELECT
      a.id_alumno,
      a.dni,
      a.alumno,
      e.id_especialidad            AS id_especialidad,
      s.especialidad               AS especialidad
    FROM alumnos a
    LEFT JOIN eleccion e
      ON e.id_alumno = a.id_alumno
    LEFT JOIN especialidad s
      ON s.id_especialidad = e.id_especialidad
    ORDER BY {$orderBy} {$dir}
    LIMIT :lim
  ";

  $st = $pdo->prepare($sql);
  $st->bindValue(':lim', $limit, PDO::PARAM_INT);
  $st->execute();
  $rows = $st->fetchAll(PDO::FETCH_ASSOC);

  // Tipado y normalización: conservar NULL cuando no hay elección
  foreach ($rows as &$r) {
    $r['id_alumno'] = (int)$r['id_alumno'];
    $r['dni'] = isset($r['dni']) ? (string)$r['dni'] : '';
    $r['alumno'] = (string)($r['alumno'] ?? '');

    // si no hay elección, DEJAR null
    if ($r['id_especialidad'] === null) {
      $r['id_especialidad'] = null;
      $r['especialidad'] = null;
    } else {
      $r['id_especialidad'] = (int)$r['id_especialidad'];
      $r['especialidad'] = (string)$r['especialidad'];
    }

    // Estos campos los espera tu front; si no existen en tu esquema los dejamos neutros
    $r['promedio'] = null;
    $r['matprev'] = 0;
    $r['matpend'] = 0;
    $r['repite'] = 'no';
    $r['sanciones'] = 0;
    $r['rendir'] = 0;
    $r['inasistencias'] = 0;
    $r['observaciones'] = null;
  }
  unset($r);

  echo json_encode([
    'exito'   => true,
    'alumnos' => $rows,
    'total'   => count($rows),
  ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'exito'   => false,
    'mensaje' => 'Error al obtener alumnos: ' . $e->getMessage(),
  ], JSON_UNESCAPED_UNICODE);
}
