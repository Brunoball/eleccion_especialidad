<?php
// backend/modules/cupos/editar_cupos.php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/db.php';

try {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    if ($json === null) { echo json_encode(['exito'=>false,'mensaje'=>'Body JSON inválido']); exit; }

    $updates = [];
    if (isset($json['id'])) $updates[] = $json;
    elseif (is_array($json)) $updates = $json;
    if (!$updates) { echo json_encode(['exito'=>false,'mensaje'=>'Sin datos']); exit; }

    $qInfo = $pdo->prepare("SELECT especialidad FROM eleccion_especialidad.especialidad WHERE id_especialidad = :id LIMIT 1");
    $qUpd  = $pdo->prepare("
        UPDATE eleccion_especialidad.especialidad
        SET cupo = :cupo, cupos_actuales = :disp
        WHERE id_especialidad = :id
    ");
    $qUpdAusente = $pdo->prepare("
        UPDATE eleccion_especialidad.especialidad
        SET cupo = 0
        WHERE id_especialidad = :id
    ");

    $pdo->beginTransaction();
    $af = 0;

    foreach ($updates as $u) {
        if (!isset($u['id'])) continue;
        $id = (int)$u['id'];
        $cupo = isset($u['cupo']) ? max(0,(int)$u['cupo']) : 0;

        $qInfo->execute([':id'=>$id]);
        $nom = (string)($qInfo->fetchColumn() ?: '');
        $esAusente = (mb_strtoupper($nom,'UTF-8') === 'AUSENTE');

        if ($esAusente) {
            // AUSENTE: sólo forzamos cupo=0; dejamos su contador tal cual
            $qUpdAusente->execute([':id'=>$id]);
            $af += $qUpdAusente->rowCount();
        } else {
            // Reseteo: disponibles = nuevo cupo
            $qUpd->execute([':cupo'=>$cupo, ':disp'=>$cupo, ':id'=>$id]);
            $af += $qUpd->rowCount();
        }
    }

    $pdo->commit();
    echo json_encode(['exito'=>true,'mensaje'=>'Cupos actualizados','afectadas'=>$af], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['exito'=>false,'mensaje'=>'Error al editar cupos: '.$e->getMessage()], JSON_UNESCAPED_UNICODE);
}
