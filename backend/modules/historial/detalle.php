<?php
// backend/modules/historial/detalle.php
// Detalle de una elección guardada: cabecera, cupos por especialidad y alumnos.
// GET ?action=historial_detalle&id=5
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/historial_lib.php';

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    historial_asegurar_tablas($pdo);

    $id = filter_var($_GET['id'] ?? '', FILTER_VALIDATE_INT);
    if ($id === false || $id <= 0) {
        echo json_encode(['exito' => false, 'mensaje' => 'Parámetro id inválido.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $st = $pdo->prepare("
        SELECT id_historial, fecha, titulo, origen, usuario,
               total_alumnos, total_inscriptos, total_ausentes
        FROM eleccion_historial
        WHERE id_historial = :id
    ");
    $st->execute([':id' => $id]);
    $cab = $st->fetch(PDO::FETCH_ASSOC);
    if (!$cab) {
        echo json_encode(['exito' => false, 'mensaje' => 'La elección no existe en el historial.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $st = $pdo->prepare("
        SELECT orden_ranking, orden_especialidad, dni, alumno, id_especialidad, especialidad, es_ausente
        FROM eleccion_historial_detalle
        WHERE id_historial = :id
        ORDER BY (orden_ranking IS NULL) ASC, orden_ranking ASC, id_detalle ASC
    ");
    $st->execute([':id' => $id]);
    $alumnos = [];
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $alumnos[] = [
            'orden'              => $r['orden_ranking'] === null ? null : (int)$r['orden_ranking'],
            'orden_especialidad' => $r['orden_especialidad'] === null ? null : (int)$r['orden_especialidad'],
            'dni'                => $r['dni'] === null ? '' : (string)$r['dni'],
            'alumno'             => (string)$r['alumno'],
            'id_especialidad'    => $r['id_especialidad'] === null ? null : (int)$r['id_especialidad'],
            'especialidad'       => (string)$r['especialidad'],
            'es_ausente'         => (bool)$r['es_ausente'],
        ];
    }

    $st = $pdo->prepare("
        SELECT id_especialidad, especialidad, cupo, asignados, es_ausente
        FROM eleccion_historial_especialidad
        WHERE id_historial = :id
        ORDER BY id_especialidad ASC
    ");
    $st->execute([':id' => $id]);
    $especialidades = [];
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $especialidades[] = [
            'id'         => $r['id_especialidad'] === null ? null : (int)$r['id_especialidad'],
            'nombre'     => (string)$r['especialidad'],
            'cupo'       => (int)$r['cupo'],
            'asignados'  => (int)$r['asignados'],
            'es_ausente' => (bool)$r['es_ausente'],
        ];
    }

    echo json_encode([
        'exito'    => true,
        'eleccion' => [
            'id'               => (int)$cab['id_historial'],
            'fecha'            => (string)$cab['fecha'],
            'titulo'           => (string)$cab['titulo'],
            'origen'           => (string)$cab['origen'],
            'usuario'          => $cab['usuario'] === null ? null : (string)$cab['usuario'],
            'total_alumnos'    => (int)$cab['total_alumnos'],
            'total_inscriptos' => (int)$cab['total_inscriptos'],
            'total_ausentes'   => (int)$cab['total_ausentes'],
        ],
        'especialidades' => $especialidades,
        'alumnos'        => $alumnos,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'No se pudo obtener el detalle: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
