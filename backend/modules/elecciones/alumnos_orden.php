<?php
// backend/modules/elecciones/alumnos_orden.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/db.php';

try {
    // Trae alumnos ordenados + elección si existe
    $sql = "
        SELECT 
            a.id_alumno     AS id,
            a.orden         AS orden,
            CONCAT(a.apellido, ', ', a.nombre) AS nombre,
            e.id_especialidad,
            e.confirmado
        FROM alumnos a
        LEFT JOIN eleccion e ON e.id_alumno = a.id_alumno
        ORDER BY a.orden ASC, a.apellido ASC, a.nombre ASC
    ";
    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['orden'] = (int)($r['orden'] ?? 0);
        $r['nombre'] = (string)$r['nombre'];
        $r['id_especialidad'] = isset($r['id_especialidad']) ? (int)$r['id_especialidad'] : null;
        $r['confirmado'] = (bool)$r['confirmado'];
    }
    unset($r);

    echo json_encode(['exito' => true, 'data' => $rows], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    echo json_encode(['exito' => false, 'mensaje' => $e->getMessage()]);
}
