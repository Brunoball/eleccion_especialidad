<?php
// backend/modules/cupos/editar_cupos.php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config/db.php'; // debe definir $pdo (PDO)

try {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);

    if (!is_array($json)) {
        echo json_encode(['exito' => false, 'mensaje' => 'Body JSON inválido']);
        exit;
    }

    // Acepta objeto único o array de objetos
    $updates = isset($json['id']) ? [$json] : $json;
    if (empty($updates)) {
        echo json_encode(['exito' => false, 'mensaje' => 'Sin datos']);
        exit;
    }

    // ✅ SOLO nombres de tabla (sin prefijo de base)
    $qInfo = $pdo->prepare("
        SELECT especialidad
        FROM `especialidad`
        WHERE id_especialidad = :id
        LIMIT 1
    ");

    $qUpd = $pdo->prepare("
        UPDATE `especialidad`
        SET cupo = :cupo,
            cupos_actuales = :disp
        WHERE id_especialidad = :id
    ");

    $qUpdAusente = $pdo->prepare("
        UPDATE `especialidad`
        SET cupo = 0
        WHERE id_especialidad = :id
    ");

    $pdo->beginTransaction();
    $af = 0;

    foreach ($updates as $u) {
        if (!isset($u['id'])) continue;

        $id   = (int)$u['id'];
        $cupo = isset($u['cupo']) ? max(0, (int)$u['cupo']) : 0;

        // Traer nombre para detectar "AUSENTE"
        $qInfo->execute([':id' => $id]);
        $nom = (string)($qInfo->fetchColumn() ?: '');
        $esAusente = (mb_strtoupper($nom, 'UTF-8') === 'AUSENTE');

        if ($esAusente) {
            // AUSENTE: forzar cupo=0, no tocamos cupos_actuales
            $qUpdAusente->execute([':id' => $id]);
            $af += $qUpdAusente->rowCount();
        } else {
            // Para las demás: cupo y disponibles se resetean al mismo valor
            $qUpd->execute([
                ':cupo' => $cupo,
                ':disp' => $cupo,
                ':id'   => $id,
            ]);
            $af += $qUpd->rowCount();
        }
    }

    $pdo->commit();

    echo json_encode([
        'exito'     => true,
        'mensaje'   => 'Cupos actualizados',
        'afectadas' => $af
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Error al editar cupos: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
