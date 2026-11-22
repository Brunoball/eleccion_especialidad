<?php
// backend/modules/historial/eliminar.php
// Elimina una elección guardada del historial. Body JSON: { "id": 5 }
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/historial_lib.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(['exito' => false, 'mensaje' => 'Método no permitido.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    historial_asegurar_tablas($pdo);

    $body = historial_leer_body();
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) {
        echo json_encode(['exito' => false, 'mensaje' => 'Registro inválido.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Se borran explícitamente las tablas hijas (por si la base no aplica ON DELETE CASCADE)
    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM eleccion_historial_detalle WHERE id_historial = :id")->execute([':id' => $id]);
    $pdo->prepare("DELETE FROM eleccion_historial_especialidad WHERE id_historial = :id")->execute([':id' => $id]);
    $st = $pdo->prepare("DELETE FROM eleccion_historial WHERE id_historial = :id");
    $st->execute([':id' => $id]);
    $pdo->commit();

    if ($st->rowCount() === 0) {
        echo json_encode(['exito' => false, 'mensaje' => 'El registro ya no existe.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(['exito' => true, 'mensaje' => 'Registro del historial eliminado.'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(200);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'No se pudo eliminar el registro: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
