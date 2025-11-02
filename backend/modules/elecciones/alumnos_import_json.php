<?php
// backend/modules/elecciones/alumnos_import_json.php
declare(strict_types=1);

ini_set('display_errors','0');          // no mezclar HTML con la salida JSON
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/db.php'; // Debe definir $pdo (PDO conectado a tu DB)

header('Content-Type: application/json; charset=utf-8');

if (!isset($pdo) || !($pdo instanceof PDO)) {
  http_response_code(500);
  echo json_encode(['exito'=>false,'mensaje'=>'Sin conexión PDO (config/db.php)']);
  exit;
}

/* ---------- Helpers JSON ---------- */
function ok($data = [], int $code = 200): void {
  http_response_code($code);
  echo json_encode(['exito'=>true,'data'=>$data], JSON_UNESCAPED_UNICODE);
  exit;
}
function fail(string $msg, int $code = 400): void {
  http_response_code($code);
  echo json_encode(['exito'=>false,'mensaje'=>$msg], JSON_UNESCAPED_UNICODE);
  exit;
}

/* ---------- Normalizadores ---------- */
function toUnsignedTiny($v): int {
  if ($v === '' || $v === null) return 0;
  $n = (int)preg_replace('/[^\d\-]/','',(string)$v);
  if ($n < 0) $n = 0;
  if ($n > 255) $n = 255;
  return $n;
}
function toUnsignedSmall($v): int {
  if ($v === '' || $v === null) return 0;
  $n = (int)preg_replace('/[^\d\-]/','',(string)$v);
  if ($n < 0) $n = 0;
  if ($n > 65535) $n = 65535;
  return $n;
}
function toDecimal($v, int $decimals): string {
  $s = trim((string)$v);
  if ($s==='') return number_format(0, $decimals, '.', '');
  $s = str_replace(',', '.', $s); // admite coma
  if (!is_numeric($s)) $s = '0';
  return number_format((float)$s, $decimals, '.', '');
}
function toEnumSiNo($v): string {
  $s = mb_strtolower(trim((string)$v), 'UTF-8');
  $s = strtr($s, ['sí'=>'si','si.'=>'si','sí.'=>'si']);
  return $s === 'si' ? 'si' : 'no';
}

/* ---------- Leer body JSON ---------- */
$raw = file_get_contents('php://input');
$js  = json_decode($raw, true);

if (!is_array($js))                 fail('JSON inválido', 400);
$rows = $js['rows'] ?? null;
if (!is_array($rows) || !$rows)     fail('Falta "rows" (array)', 400);

/*
Tabla: eleccion_especialidad.alumnos
UNIQUE(dni)
Campos esperados por fila:
  dni, alumno, promedio, matprev, matpend, repite, sanciones, rendir, inasistencias, observaciones
*/
$sql = "INSERT INTO alumnos
  (dni, alumno, promedio, matprev, matpend, repite, sanciones, rendir, inasistencias, observaciones)
VALUES
  (:dni, :alumno, :promedio, :matprev, :matpend, :repite, :sanciones, :rendir, :inasistencias, :observaciones)
ON DUPLICATE KEY UPDATE
  alumno = VALUES(alumno),
  promedio = VALUES(promedio),
  matprev = VALUES(matprev),
  matpend = VALUES(matpend),
  repite = VALUES(repite),
  sanciones = VALUES(sanciones),
  rendir = VALUES(rendir),
  inasistencias = VALUES(inasistencias),
  observaciones = VALUES(observaciones)";

$st = $pdo->prepare($sql);

$insertados   = 0;
$actualizados = 0;
$sinCambios   = 0;
$errores      = [];

/* ---------- Transacción para performance ---------- */
try {
  $pdo->beginTransaction();

  foreach ($rows as $i => $r) {
    // Normalizaciones + defaults
    $dni           = preg_replace('/\D+/', '', (string)($r['dni'] ?? ''));   // BIGINT UNSIGNED (UNIQUE)
    $alumno        = trim((string)($r['alumno'] ?? ''));
    $promedio      = toDecimal($r['promedio'] ?? '', 2);     // DECIMAL(4,2)
    $matprev       = toUnsignedTiny($r['matprev'] ?? 0);     // TINYINT UNSIGNED
    $matpend       = toUnsignedTiny($r['matpend'] ?? 0);     // TINYINT UNSIGNED
    $repite        = toEnumSiNo($r['repite'] ?? 'no');       // ENUM('si','no')
    $sanciones     = toUnsignedSmall($r['sanciones'] ?? 0);  // SMALLINT UNSIGNED
    $rendir        = toUnsignedSmall($r['rendir'] ?? 0);     // SMALLINT UNSIGNED
    $inasistencias = toDecimal($r['inasistencias'] ?? 0, 1); // DECIMAL(4,1)
    $observaciones = (string)($r['observaciones'] ?? '');

    if ($dni === '') {
      $errores[] = "Fila ".($i+1).": DNI vacío/invalid.";
      continue;
    }
    if ($alumno === '') {
      $errores[] = "Fila ".($i+1).": 'alumno' obligatorio vacío.";
      continue;
    }

    try {
      $st->execute([
        ':dni'           => $dni,
        ':alumno'        => $alumno,
        ':promedio'      => $promedio,
        ':matprev'       => $matprev,
        ':matpend'       => $matpend,
        ':repite'        => $repite,
        ':sanciones'     => $sanciones,
        ':rendir'        => $rendir,
        ':inasistencias' => $inasistencias,
        ':observaciones' => $observaciones,
      ]);

      // rowCount(): 1 = insert; 2 = update por ON DUPLICATE
      $rc = (int)$st->rowCount();
      if     ($rc === 1) $insertados++;
      elseif ($rc === 2) $actualizados++;
      else               $sinCambios++;
    } catch (\PDOException $e) {
      if ((int)($e->errorInfo[1] ?? 0) === 1062) {
        // UNIQUE(dni) sin cambios efectivos
        $sinCambios++;
      } else {
        $errores[] = "Fila ".($i+1).": ".$e->getMessage();
      }
    } catch (\Throwable $e) {
      $errores[] = "Fila ".($i+1).": ".$e->getMessage();
    }
  }

  $pdo->commit();
} catch (\Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  fail('Error en importación: '.$e->getMessage(), 500);
}

ok([
  'insertados'   => $insertados,
  'actualizados' => $actualizados,
  'sin_cambios'  => $sinCambios,
  'errores'      => $errores,
]);
