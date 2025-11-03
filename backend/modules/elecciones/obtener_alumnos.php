<?php
// backend/modules/elecciones/obtener_alumnos.php
declare(strict_types=1);

ini_set('display_errors','0');
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/db.php'; // Debe exponer $pdo (PDO)
header('Content-Type: application/json; charset=utf-8');

function ok($data=[], $code=200){ http_response_code($code); echo json_encode(['exito'=>true] + $data, JSON_UNESCAPED_UNICODE); exit; }
function fail($msg, $code=200){ http_response_code($code); echo json_encode(['exito'=>false,'mensaje'=>$msg], JSON_UNESCAPED_UNICODE); exit; }

if (!isset($pdo) || !($pdo instanceof PDO)) fail('Sin conexión PDO');

$q      = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
$order  = strtolower(trim((string)($_GET['order'] ?? 'alumno')));
$dir    = strtoupper(trim((string)($_GET['dir'] ?? 'ASC')));
$limit  = (int)($_GET['limit'] ?? 500);
$offset = (int)($_GET['offset'] ?? 0);
if ($limit <= 0) $limit = 500;
if ($limit > 1000) $limit = 1000;
if ($offset < 0) $offset = 0;

$allowedOrder = [
  'alumno'        => 'a.alumno',
  'dni'           => 'a.dni',
  'promedio'      => 'a.promedio',
  'inasistencias' => 'a.inasistencias',
  'matprev'       => 'a.matprev',
  'matpend'       => 'a.matpend',
  'repite'        => 'a.repite',
  'sanciones'     => 'a.sanciones',
  'rendir'        => 'a.rendir',
  'id_alumno'     => 'a.id_alumno',
];
$orderBy = $allowedOrder[$order] ?? 'a.alumno';
$dir = ($dir === 'DESC') ? 'DESC' : 'ASC';

$where = [];
$params = [];
if ($q !== '') {
  if (ctype_digit($q)) {
    $where[] = 'a.dni = :dni';
    $params[':dni'] = (int)$q; // cast a int para bind como PARAM_INT
  } else {
    $where[] = 'a.alumno LIKE :alumno';
    $params[':alumno'] = '%'.$q.'%';
  }
}
$whereSql = $where ? 'WHERE '.implode(' AND ', $where) : '';

try {
  /* total */
  $sqlCount = "SELECT COUNT(*) FROM `alumnos` a $whereSql";
  $st = $pdo->prepare($sqlCount);
  foreach ($params as $k => $v) {
    $st->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
  }
  $st->execute();
  $total = (int)$st->fetchColumn();

  /* datos + JOIN a elección y especialidad (SIN prefijo de base) */
  $sql = "
    SELECT
      a.id_alumno, a.dni, a.alumno, a.promedio, a.matprev, a.matpend, a.repite,
      a.sanciones, a.rendir, a.inasistencias, a.observaciones,
      e.id_especialidad AS elegido_id,
      s.especialidad    AS elegido_nombre
    FROM `alumnos` a
    LEFT JOIN `eleccion` e     ON e.id_alumno = a.id_alumno
    LEFT JOIN `especialidad` s ON s.id_especialidad = e.id_especialidad
    $whereSql
    ORDER BY $orderBy $dir
    LIMIT :limit OFFSET :offset
  ";
  $st = $pdo->prepare($sql);
  foreach($params as $k=>$v){
    $st->bindValue($k, $v, is_int($v)?PDO::PARAM_INT:PDO::PARAM_STR);
  }
  $st->bindValue(':limit', $limit, PDO::PARAM_INT);
  $st->bindValue(':offset', $offset, PDO::PARAM_INT);
  $st->execute();

  $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
} catch (Throwable $e) {
  fail('Error al consultar: '.$e->getMessage());
}

$alumnos = array_map(function($r){
  return [
    'id_alumno'        => (int)$r['id_alumno'],
    'dni'              => (string)$r['dni'],
    'alumno'           => mb_strtoupper((string)$r['alumno'],'UTF-8'),
    'promedio'         => is_null($r['promedio']) ? null : (float)$r['promedio'],
    'matprev'          => (int)$r['matprev'],
    'matpend'          => (int)$r['matpend'],
    'repite'           => (string)$r['repite'],
    'sanciones'        => (int)$r['sanciones'],
    'rendir'           => (int)$r['rendir'],
    'inasistencias'    => (float)$r['inasistencias'],
    'observaciones'    => $r['observaciones'] === null ? null : (string)$r['observaciones'],
    // 🔹 Info de inscripción (si existe)
    'id_especialidad'  => is_null($r['elegido_id']) ? null : (int)$r['elegido_id'],
    'especialidad'     => $r['elegido_nombre'] === null ? null : (string)$r['elegido_nombre'],
  ];
}, $rows);

ok(['total'=>$total,'count'=>count($alumnos),'alumnos'=>$alumnos]);
