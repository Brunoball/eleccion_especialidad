<?php
// backend/modules/elecciones/confirmar.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/db.php';

try {
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        echo json_encode(['exito' => false, 'mensaje' => 'Sin conexión PDO']);
        exit;
    }

    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $idAlumno = (int)($body['id_alumno'] ?? 0);
    $idNueva  = (int)($body['id_especialidad'] ?? 0);

    if ($idAlumno <= 0 || $idNueva <= 0) {
        echo json_encode(['exito' => false, 'mensaje' => 'Datos inválidos']);
        exit;
    }

    // 🔹 Verificar si el alumno existe
    $stmt = $pdo->prepare("SELECT 1 FROM `alumnos` WHERE id_alumno = :id LIMIT 1");
    $stmt->execute([':id' => $idAlumno]);
    if (!$stmt->fetchColumn()) {
        echo json_encode(['exito' => false, 'mensaje' => 'Alumno inexistente']);
        exit;
    }

    // 🔹 Obtener info de la nueva especialidad (bloqueo de fila)
    $pdo->beginTransaction();
    $qEspNueva = $pdo->prepare("
        SELECT id_especialidad, especialidad, cupo, cupos_actuales
        FROM `especialidad`
        WHERE id_especialidad = :id
        FOR UPDATE
    ");
    $qEspNueva->execute([':id' => $idNueva]);
    $espNueva = $qEspNueva->fetch(PDO::FETCH_ASSOC);

    if (!$espNueva) {
        $pdo->rollBack();
        echo json_encode(['exito' => false, 'mensaje' => 'Especialidad inexistente']);
        exit;
    }

    $nomNueva  = (string)$espNueva['especialidad'];
    $cupo      = (int)$espNueva['cupo'];
    $dispNueva = (int)$espNueva['cupos_actuales'];
    $esAusente = (mb_strtoupper($nomNueva, 'UTF-8') === 'AUSENTE');

    // 🔹 Si no es AUSENTE, verificar que haya cupos disponibles
    if (!$esAusente && $dispNueva <= 0) {
        $pdo->rollBack();
        echo json_encode(['exito' => false, 'mensaje' => 'Sin cupo disponible en ' . $nomNueva]);
        exit;
    }

    // 🔹 Obtener la especialidad actual del alumno (si tiene) y bloquearla
    $qActual = $pdo->prepare("
        SELECT e.id_especialidad, s.especialidad, s.cupo, s.cupos_actuales
        FROM `eleccion` e
        JOIN `especialidad` s ON s.id_especialidad = e.id_especialidad
        WHERE e.id_alumno = :al
        FOR UPDATE
    ");
    $qActual->execute([':al' => $idAlumno]);
    $rowActual = $qActual->fetch(PDO::FETCH_ASSOC);

    // 1️⃣ Si ya tenía una inscripción, liberamos cupo en la anterior
    if ($rowActual) {
        $idVieja   = (int)$rowActual['id_especialidad'];
        $nomVieja  = (string)$rowActual['especialidad'];
        $cupoVieja = (int)$rowActual['cupo'];
        $dispVieja = (int)$rowActual['cupos_actuales'];
        $esAusenteVieja = (mb_strtoupper($nomVieja, 'UTF-8') === 'AUSENTE');

        if ($esAusenteVieja) {
            // AUSENTE: restar 1 al contador, mínimo 0
            $pdo->prepare("
                UPDATE `especialidad`
                SET cupos_actuales = GREATEST(cupos_actuales - 1, 0)
                WHERE id_especialidad = :id
            ")->execute([':id' => $idVieja]);
        } else {
            // No AUSENTE: liberar un cupo disponible (sin exceder el máximo)
            $pdo->prepare("
                UPDATE `especialidad`
                SET cupos_actuales = LEAST(cupos_actuales + 1, cupo)
                WHERE id_especialidad = :id
            ")->execute([':id' => $idVieja]);
        }

        // Eliminar inscripción anterior
        $pdo->prepare("DELETE FROM `eleccion` WHERE id_alumno = :al")
            ->execute([':al' => $idAlumno]);
    }

    // 2️⃣ Ajustar cupos en la nueva especialidad
    if ($esAusente) {
        // AUSENTE: sumar al contador de asignados
        $pdo->prepare("
            UPDATE `especialidad`
            SET cupos_actuales = cupos_actuales + 1
            WHERE id_especialidad = :id
        ")->execute([':id' => $idNueva]);
    } else {
        // No AUSENTE: consumir un cupo disponible
        $upd = $pdo->prepare("
            UPDATE `especialidad`
            SET cupos_actuales = cupos_actuales - 1
            WHERE id_especialidad = :id AND cupos_actuales > 0
        ");
        $upd->execute([':id' => $idNueva]);
        if ($upd->rowCount() === 0) {
            // Carrera: otro tomó el último cupo
            $pdo->rollBack();
            echo json_encode(['exito' => false, 'mensaje' => 'Sin cupo disponible en ' . $nomNueva]);
            exit;
        }
    }

    // 3️⃣ Registrar la nueva elección
    $pdo->prepare("
        INSERT INTO `eleccion` (id_alumno, id_especialidad)
        VALUES (:al, :es)
    ")->execute([':al' => $idAlumno, ':es' => $idNueva]);

    $pdo->commit();

    echo json_encode([
        'exito'   => true,
        'mensaje' => 'Elección registrada en ' . $nomNueva
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
