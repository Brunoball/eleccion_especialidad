<?php
// backend/modules/usuarios/eliminar.php
// Elimina un usuario. Body JSON: { "id": 3, "id_actual": 1 }
// No permite eliminar la propia sesión ni al último administrador.
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../../config/db.php';

function usr_del_responder(bool $exito, string $mensaje): void
{
    echo json_encode(['exito' => $exito, 'mensaje' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        usr_del_responder(false, 'Método no permitido.');
    }

    $data = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($data)) $data = $_POST ?? [];

    $id       = (int)($data['id'] ?? 0);
    $idActual = (int)($data['id_actual'] ?? 0);

    if ($id <= 0) {
        usr_del_responder(false, 'Usuario inválido.');
    }
    if ($idActual > 0 && $idActual === $id) {
        usr_del_responder(false, 'No podés eliminar tu propio usuario.');
    }

    $st = $pdo->prepare("SELECT rol FROM usuarios WHERE idUsuario = :id");
    $st->execute([':id' => $id]);
    $rol = $st->fetchColumn();
    if ($rol === false) {
        usr_del_responder(false, 'El usuario no existe.');
    }

    if (strtolower((string)$rol) === 'admin') {
        $admins = (int)$pdo->query("SELECT COUNT(*) FROM usuarios WHERE LOWER(rol) = 'admin'")->fetchColumn();
        if ($admins <= 1) {
            usr_del_responder(false, 'El sistema debe conservar al menos un administrador.');
        }
    }

    $st = $pdo->prepare("DELETE FROM usuarios WHERE idUsuario = :id");
    $st->execute([':id' => $id]);

    usr_del_responder(true, 'Usuario eliminado correctamente.');
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'No se pudo eliminar el usuario: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
