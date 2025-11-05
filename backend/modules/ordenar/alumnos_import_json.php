<?php
// backend/modules/elecciones/alumnos_import_json.php
declare(strict_types=1);

ini_set('display_errors','0');
error_reporting(E_ALL);

require_once __DIR__ . '/../../config/db.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($pdo) || !($pdo instanceof PDO)) {
  http_response_code(500);
  echo json_encode(['exito'=>false,'mensaje'=>'Sin conexión PDO (config/db.php)'], JSON_UNESCAPED_UNICODE);
  exit;
}

try { $pdo->exec("SET NAMES utf8mb4"); } catch (\Throwable $e) {}

const DB_SCHEMA = 'eleccion_especialidad';

/* ---------- Helpers ---------- */
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
  $s = str_replace(',', '.', $s);
  if (!is_numeric($s)) $s = '0';
  return number_format((float)$s, $decimals, '.', '');
}
function toEnumSiNo($v): string {
  $s = mb_strtolower(trim((string)$v), 'UTF-8');
  $s = strtr($s, ['sí'=>'si','si.'=>'si','sí.'=>'si']);
  return ($s==='si' || $s==='s' || $s==='true' || $s==='1') ? 'si' : 'no';
}
function toDateYMD($v): ?string {
  if ($v === '' || $v === null) return null;
  if (preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$v)) return (string)$v;        // yyyy-mm-dd
  if (preg_match('/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/', (string)$v, $m)) {     // dd/mm/yyyy
    return "{$m[3]}-{$m[2]}-{$m[1]}";
  }
  $s = (string)$v;
  if (is_numeric($s)) { // Excel serial
    $n = (float)$s;
    $ts = (int)round(($n - 25569) * 86400);
    $date = gmdate('Y-m-d', $ts);
    return $date ?: null;
  }
  return null;
}
/** 0 = con trayectoria, 1 = sin trayectoria */
function toTrayectoria($v): int {
  $s = mb_strtolower(trim((string)$v), 'UTF-8');
  $con = ['si','sí','s','1','true','con','con trayectoria','posee','tiene'];
  $sin = ['no','n','0','false','sin','sin trayectoria','no posee','no tiene'];
  if (in_array($s, $con, true)) return 0;
  if (in_array($s, $sin, true)) return 1;
  if ($s !== '') {
    $n = (int)preg_replace('/[^\d\-]/','',$s);
    if ($n !== 0) return $n > 0 ? 1 : 0;
  }
  return 0;
}

/* ---------- Leer body ---------- */
$raw = file_get_contents('php://input');
$js  = json_decode($raw, true);
if (!is_array($js))             fail('JSON inválido', 400);
$rows = $js['rows'] ?? null;
if (!is_array($rows) || !$rows) fail('Falta "rows" (array)', 400);

/*
Tabla: eleccion_especialidad.alumnos
- dni BIGINT UNSIGNED NULL UNIQUE (permite múltiples NULL).
- Requisito: ALUMNO no vacío.
*/

$sql = "INSERT INTO `".DB_SCHEMA."`.`alumnos`
  (dni, alumno,
   promedio_1a, coloquios_1a, repite_1a, inasistencias_1a, amonestaciones_1a, observaciones_1a,
   promedio_1et, adeudadas_1et, tercera_materia, previas_1et, repite_2a, inasistencias_1et, amonestaciones_1et, observaciones_1et,
   promedio_final, fecha_ingreso, trayectoria_institucional)
VALUES
  (:dni, :alumno,
   :promedio_1a, :coloquios_1a, :repite_1a, :inasistencias_1a, :amonestaciones_1a, :observaciones_1a,
   :promedio_1et, :adeudadas_1et, :tercera_materia, :previas_1et, :repite_2a, :inasistencias_1et, :amonestaciones_1et, :observaciones_1et,
   :promedio_final, :fecha_ingreso, :trayectoria_institucional)
ON DUPLICATE KEY UPDATE
  alumno = VALUES(alumno),
  promedio_1a = VALUES(promedio_1a),
  coloquios_1a = VALUES(coloquios_1a),
  repite_1a = VALUES(repite_1a),
  inasistencias_1a = VALUES(inasistencias_1a),
  amonestaciones_1a = VALUES(amonestaciones_1a),
  observaciones_1a = VALUES(observaciones_1a),
  promedio_1et = VALUES(promedio_1et),
  adeudadas_1et = VALUES(adeudadas_1et),
  tercera_materia = VALUES(tercera_materia),
  previas_1et = VALUES(previas_1et),
  repite_2a = VALUES(repite_2a),
  inasistencias_1et = VALUES(inasistencias_1et),
  amonestaciones_1et = VALUES(amonestaciones_1et),
  observaciones_1et = VALUES(observaciones_1et),
  promedio_final = VALUES(promedio_final),
  fecha_ingreso = VALUES(fecha_ingreso),
  trayectoria_institucional = VALUES(trayectoria_institucional)";

$st = $pdo->prepare($sql);

$insertados   = 0;
$actualizados = 0;
$sinCambios   = 0;
$errores      = [];
$descartados  = 0;

try {
  $pdo->beginTransaction();

  foreach ($rows as $i => $r) {
    // DNI: si viene vacío o "0", guardamos como NULL
    $dniRaw = preg_replace('/\D+/', '', (string)($r['dni'] ?? ''));
    $dni    = ($dniRaw === '' || $dniRaw === '0') ? null : $dniRaw;

    // ALUMNO es obligatorio
    $alumno = trim((string)($r['alumno'] ?? ''));
    if ($alumno === '') {
      $descartados++;
      $errores[] = "Fila ".($i+1).": ALUMNO vacío -> descartada.";
      continue;
    }

    $params = [
      ':dni'                        => $dni,
      ':alumno'                     => $alumno,

      ':promedio_1a'                => toDecimal($r['promedio_1a'] ?? '', 2),
      ':coloquios_1a'               => toUnsignedTiny($r['coloquios_1a'] ?? 0),
      ':repite_1a'                  => toEnumSiNo($r['repite_1a'] ?? 'no'),
      ':inasistencias_1a'           => toDecimal($r['inasistencias_1a'] ?? 0, 1),
      ':amonestaciones_1a'          => toUnsignedSmall($r['amonestaciones_1a'] ?? 0),
      ':observaciones_1a'           => (string)($r['observaciones_1a'] ?? ''),

      ':promedio_1et'               => toDecimal($r['promedio_1et'] ?? '', 2),
      ':adeudadas_1et'              => toUnsignedSmall($r['adeudadas_1et'] ?? 0),
      ':tercera_materia'            => toUnsignedTiny($r['tercera_materia'] ?? 0) ? 1 : 0,
      ':previas_1et'                => toUnsignedSmall($r['previas_1et'] ?? 0),
      ':repite_2a'                  => toUnsignedTiny($r['repite_2a'] ?? 0) ? 1 : 0,
      ':inasistencias_1et'          => toDecimal($r['inasistencias_1et'] ?? 0, 1),
      ':amonestaciones_1et'         => toUnsignedSmall($r['amonestaciones_1et'] ?? 0),
      ':observaciones_1et'          => (string)($r['observaciones_1et'] ?? ''),

      ':promedio_final'             => toDecimal($r['promedio_final'] ?? '', 2),
      ':fecha_ingreso'              => toDateYMD($r['fecha_ingreso'] ?? null),
      ':trayectoria_institucional'  => toTrayectoria($r['trayectoria_institucional'] ?? 0),
    ];

    try {
      $st->execute($params);
      $rc = (int)$st->rowCount(); // 1 insert, 2 update, 0 sin cambios
      if     ($rc === 1) $insertados++;
      elseif ($rc === 2) $actualizados++;
      else               $sinCambios++;
    } catch (\PDOException $e) {
      if ((int)($e->errorInfo[1] ?? 0) === 1062) {
        $sinCambios++; // UNIQUE(dni) sin cambios
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

// Métrica de control
try {
  $totalTabla = (int)$pdo->query("SELECT COUNT(*) FROM `".DB_SCHEMA."`.`alumnos`")->fetchColumn();
} catch (\Throwable $e) {
  $totalTabla = null;
}

ok([
  'insertados'     => $insertados,
  'actualizados'   => $actualizados,
  'sin_cambios'    => $sinCambios,
  'descartados'    => $descartados,
  'errores'        => $errores,
  'total_en_tabla' => $totalTabla,
]);
