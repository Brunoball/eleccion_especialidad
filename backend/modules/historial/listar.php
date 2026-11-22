<?php
// backend/modules/historial/listar.php
// Lista las elecciones guardadas en el historial (más reciente primero).
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/historial_lib.php';

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    historial_asegurar_tablas($pdo);

    $st = $pdo->query("
        SELECT id_historial, fecha, titulo, origen, usuario,
               total_alumnos, total_inscriptos, total_ausentes
        FROM eleccion_historial
        ORDER BY fecha DESC, id_historial DESC
    ");

    $items = [];
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $items[] = [
            'id'               => (int)$r['id_historial'],
            'fecha'            => (string)$r['fecha'],
            'titulo'           => (string)$r['titulo'],
            'origen'           => (string)$r['origen'],
            'usuario'          => $r['usuario'] === null ? null : (string)$r['usuario'],
            'total_alumnos'    => (int)$r['total_alumnos'],
            'total_inscriptos' => (int)$r['total_inscriptos'],
            'total_ausentes'   => (int)$r['total_ausentes'],
        ];
    }

    echo json_encode(['exito' => true, 'historial' => $items], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'No se pudo obtener el historial: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
