<?php
// backend/modules/usuarios/guardar.php
// Crea o edita un usuario.
// Body JSON:
//   { "nombre": "...", "rol": "admin|vista", "contrasena": "..." }            -> crea
//   { "id": 3, "nombre": "...", "rol": "...", "contrasena": "", "id_actual": 1 } -> edita
// En la edición la contraseña es opcional: si viene vacía se conserva la actual.
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../../config/db.php';

function usr_responder(bool $exito, string $mensaje, array $extra = []): void
{
    echo json_encode(array_merge(['exito' => $exito, 'mensaje' => $mensaje], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        usr_responder(false, 'Método no permitido.');
    }

    $data = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($data)) $data = $_POST ?? [];

    $id         = (int)($data['id'] ?? 0);
    $idActual   = (int)($data['id_actual'] ?? 0);
    $nombre     = trim((string)($data['nombre'] ?? ''));
    $rol        = strtolower(trim((string)($data['rol'] ?? '')));
    $contrasena = (string)($data['contrasena'] ?? '');

    // Validaciones (mismas reglas que el registro original)
    if ($nombre === '' || $rol === '') {
        usr_responder(false, 'Completá el usuario y el rol.');
    }
    if (mb_strlen($nombre) < 4 || mb_strlen($nombre) > 100) {
        usr_responder(false, 'El usuario debe tener entre 4 y 100 caracteres.');
    }
    if (!in_array($rol, ['vista', 'admin'], true)) {
        usr_responder(false, 'Rol inválido (use "vista" o "admin").');
    }
    if ($id <= 0 && $contrasena === '') {
        usr_responder(false, 'La contraseña es obligatoria para un usuario nuevo.');
    }
    if ($contrasena !== '' && strlen($contrasena) < 6) {
        usr_responder(false, 'La contraseña debe tener al menos 6 caracteres.');
    }

    // Unicidad del nombre (sin distinguir mayúsculas)
    $st = $pdo->prepare("
        SELECT COUNT(*) FROM usuarios
        WHERE UPPER(Nombre_Completo) = UPPER(:n) AND idUsuario <> :id
    ");
    $st->execute([':n' => $nombre, ':id' => $id]);
    if ((int)$st->fetchColumn() > 0) {
        usr_responder(false, 'Ya existe un usuario con ese nombre.');
    }

    /* ---------- Alta ---------- */
    if ($id <= 0) {
        $st = $pdo->prepare("
            INSERT INTO usuarios (Nombre_Completo, Hash_Contrasena, rol)
            VALUES (:nombre, :hash, :rol)
        ");
        $st->execute([
            ':nombre' => $nombre,
            ':hash'   => password_hash($contrasena, PASSWORD_BCRYPT),
            ':rol'    => $rol,
        ]);

        usr_responder(true, 'Usuario creado correctamente.', [
            'usuario' => ['id' => (int)$pdo->lastInsertId(), 'nombre' => $nombre, 'rol' => $rol],
        ]);
    }

    /* ---------- Edición ---------- */
    $st = $pdo->prepare("SELECT idUsuario, rol FROM usuarios WHERE idUsuario = :id");
    $st->execute([':id' => $id]);
    $actual = $st->fetch(PDO::FETCH_ASSOC);
    if (!$actual) {
        usr_responder(false, 'El usuario no existe.');
    }

    $rolAnterior = strtolower((string)$actual['rol']);

    if ($rolAnterior !== $rol) {
        // No se puede cambiar el rol de la propia sesión
        if ($idActual > 0 && $idActual === $id) {
            usr_responder(false, 'No podés cambiar el rol de tu propia sesión.');
        }
        // Siempre tiene que quedar al menos un administrador
        if ($rolAnterior === 'admin') {
            $admins = (int)$pdo->query("SELECT COUNT(*) FROM usuarios WHERE LOWER(rol) = 'admin'")->fetchColumn();
            if ($admins <= 1) {
                usr_responder(false, 'El sistema debe conservar al menos un administrador.');
            }
        }
    }

    if ($contrasena !== '') {
        $st = $pdo->prepare("
            UPDATE usuarios
            SET Nombre_Completo = :nombre, rol = :rol, Hash_Contrasena = :hash
            WHERE idUsuario = :id
        ");
        $st->execute([
            ':nombre' => $nombre,
            ':rol'    => $rol,
            ':hash'   => password_hash($contrasena, PASSWORD_BCRYPT),
            ':id'     => $id,
        ]);
    } else {
        $st = $pdo->prepare("
            UPDATE usuarios
            SET Nombre_Completo = :nombre, rol = :rol
            WHERE idUsuario = :id
        ");
        $st->execute([':nombre' => $nombre, ':rol' => $rol, ':id' => $id]);
    }

    usr_responder(true, 'Usuario actualizado correctamente.', [
        'usuario' => ['id' => $id, 'nombre' => $nombre, 'rol' => $rol],
    ]);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'No se pudo guardar el usuario: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
