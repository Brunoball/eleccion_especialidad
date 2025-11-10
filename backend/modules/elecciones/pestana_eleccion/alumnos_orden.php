<?php
// backend/modules/elecciones/pestana_eleccion/alumnos_orden.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../config/db.php';

try {
    $sql = "
        SELECT
            a.id_alumno,
            a.orden,
            a.alumno,
            e.id_especialidad,
            (e.id_especialidad IS NOT NULL) AS confirmado  -- ← calculado
        FROM alumnos a
        LEFT JOIN eleccion e ON e.id_alumno = a.id_alumno
        ORDER BY
            (a.orden IS NULL) ASC,  -- con orden primero
            a.orden ASC,
            a.id_alumno ASC
    ";

    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['id_alumno']       = (int)$r['id_alumno'];
        $r['orden']           = isset($r['orden']) ? (int)$r['orden'] : null;   // puede ser NULL
        $r['alumno']          = (string)$r['alumno'];
        $r['id_especialidad'] = isset($r['id_especialidad']) ? (int)$r['id_especialidad'] : null;
        $r['confirmado']      = (bool)$r['confirmado']; // 0/1 -> bool
    }
    unset($r);

    echo json_encode(['exito' => true, 'data' => $rows], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Error: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
