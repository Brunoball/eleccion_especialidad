<?php
// backend/modules/elecciones/obtener_cupos_actuales.php
// (si lo tenés en backend/modules/cupos/obtener_cupos_actuales.php, pegalo ahí mismo)

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/db.php';

try {
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new Exception('Sin conexión PDO');
    }

    // ✅ Tomar directamente la columna cupos_actuales de la tabla especialidad
    $sql = "
        SELECT 
            e.id_especialidad,
            e.especialidad,
            e.cupo,
            e.cupos_actuales
        FROM eleccion_especialidad.especialidad e
        ORDER BY e.id_especialidad
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $especialidades = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'exito' => true,
        'especialidades' => $especialidades
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    echo json_encode([
        'exito' => false,
        'mensaje' => 'Error al obtener cupos: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
