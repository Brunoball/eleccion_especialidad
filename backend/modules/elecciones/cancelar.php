<?php
// backend/modules/elecciones/cancelar.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/db.php';

try {
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        echo json_encode(['exito' => false, 'mensaje' => 'Sin conexión PDO']); exit;
    }

    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $idAlumno = (int)($body['id_alumno'] ?? 0);
    if ($idAlumno <= 0) {
        echo json_encode(['exito' => false, 'mensaje' => 'ID alumno inválido']); exit;
    }

    $pdo->beginTransaction();

    // Buscar especialidad actual y lockearla
    $qSel = $pdo->prepare("
        SELECT e.id_especialidad, s.especialidad, s.cupo
        FROM eleccion_especialidad.eleccion e
        JOIN eleccion_especialidad.especialidad s ON s.id_especialidad = e.id_especialidad
        WHERE e.id_alumno = :al
        FOR UPDATE
    ");
    $qSel->execute([':al' => $idAlumno]);
    $row = $qSel->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        $pdo->commit();
        echo json_encode(['exito' => true, 'mensaje' => 'No había inscripción']); exit;
    }

    $idEsp   = (int)$row['id_especialidad'];
    $nomEsp  = (string)$row['especialidad'];
    $cupoEsp = (int)$row['cupo'];
    $esAusente = (mb_strtoupper($nomEsp, 'UTF-8') === 'AUSENTE');

    // Borrar inscripción
    $pdo->prepare("DELETE FROM eleccion_especialidad.eleccion WHERE id_alumno = :al")
        ->execute([':al' => $idAlumno]);

    // Ajuste de cupos
    if ($esAusente) {
        // AUSENTE: contador de asignados -> -1 (mínimo 0)
        $pdo->prepare("
            UPDATE eleccion_especialidad.especialidad
            SET cupos_actuales = GREATEST(cupos_actuales - 1, 0)
            WHERE id_especialidad = :id
        ")->execute([':id' => $idEsp]);
    } else {
        // No AUSENTE: al cancelar, vuelve 1 disponible (sin pasar el cupo)
        $pdo->prepare("
            UPDATE eleccion_especialidad.especialidad
            SET cupos_actuales = LEAST(cupos_actuales + 1, cupo)
            WHERE id_especialidad = :id
        ")->execute([':id' => $idEsp]);
    }

    $pdo->commit();
    echo json_encode(['exito' => true, 'mensaje' => 'Inscripción cancelada en ' . $nomEsp], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['exito' => false, 'mensaje' => 'Error: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
