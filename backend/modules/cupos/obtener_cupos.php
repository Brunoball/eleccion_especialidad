<?php
// backend/modules/cupos/obtener_cupos.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/db.php'; // crea $pdo o muere con JSON

try {
    // Trae todas las especialidades
    $sql = "
        SELECT 
            id_especialidad AS id,
            especialidad    AS nombre,
            COALESCE(cupo, 0) AS cupo
        FROM especialidad
        ORDER BY id_especialidad ASC
    ";
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Forzar AUSENTE = 0 por si quedó algo raro en DB
    foreach ($rows as &$r) {
        if (mb_strtoupper((string)$r['nombre']) === 'AUSENTE') {
            $r['cupo'] = 0;
        }
    }
    unset($r);

    echo json_encode([
        'exito'          => true,
        'especialidades' => $rows,
        'total'          => count($rows),
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Error al obtener cupos: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
