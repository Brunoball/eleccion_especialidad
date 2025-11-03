<?php
// backend/routes/registro.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../config/db.php'; // Debe definir $pdo (PDO conectado)

// ✅ SOLO nombres de tabla (sin prefijo de base/esquema)
define('T_USUARIOS', '`usuarios`');
define('T_ROL',      '`rol`');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['exito' => false, 'mensaje' => 'Método no permitido.']);
        exit;
    }

    // Acepta JSON o x-www-form-urlencoded
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        $data = $_POST ?? [];
    }

    // El front puede enviar "nombre"/"usuario" y "contrasena"/"password"
    $nombre     = trim((string)($data['nombre'] ?? $data['usuario'] ?? ''));
    $contrasena = (string)($data['contrasena'] ?? $data['password'] ?? '');
    $rolInput   = trim((string)($data['rol'] ?? ''));

    // Validaciones básicas
    if ($nombre === '' || $contrasena === '' || $rolInput === '') {
        echo json_encode(['exito' => false, 'mensaje' => 'Faltan datos.']);
        exit;
    }
    if (mb_strlen($nombre) < 4 || mb_strlen($nombre) > 100) {
        echo json_encode(['exito' => false, 'mensaje' => 'El usuario debe tener entre 4 y 100 caracteres.']);
        exit;
    }
    if (strlen($contrasena) < 6) {
        echo json_encode(['exito' => false, 'mensaje' => 'La contraseña debe tener al menos 6 caracteres.']);
        exit;
    }

    // Normaliza rol: acepta "admin"/"vista" (cualquier case) o id numérico
    $idRol = null;
    $rolNombre = null;

    if (ctype_digit($rolInput)) {
        $idRol = (int)$rolInput;
        $stmt = $pdo->prepare("SELECT rol FROM " . T_ROL . " WHERE id_rol = :id LIMIT 1");
        $stmt->execute([':id' => $idRol]);
        $filaRol = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$filaRol) {
            echo json_encode(['exito' => false, 'mensaje' => 'Rol inválido (id inexistente).']);
            exit;
        }
        $rolNombre = strtolower($filaRol['rol']);
    } else {
        $stmt = $pdo->prepare("
            SELECT id_rol, rol 
            FROM " . T_ROL . "
            WHERE UPPER(rol) = UPPER(:rol)
            LIMIT 1
        ");
        $stmt->execute([':rol' => $rolInput]);
        $filaRol = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$filaRol) {
            echo json_encode(['exito' => false, 'mensaje' => 'Rol inválido. Use ADMIN o VISTA.']);
            exit;
        }
        $idRol     = (int)$filaRol['id_rol'];
        $rolNombre = strtolower($filaRol['rol']);
    }

    // Verifica existencia del usuario (case-insensitive)
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM " . T_USUARIOS . " WHERE UPPER(usuario) = UPPER(:u)");
    $stmt->execute([':u' => $nombre]);
    if ((int)$stmt->fetchColumn() > 0) {
        echo json_encode(['exito' => false, 'mensaje' => 'El usuario ya existe.']);
        exit;
    }

    // Hash de contraseña (recomendado)
    $hash = password_hash($contrasena, PASSWORD_BCRYPT);

    // Inserta usuario
    $stmt = $pdo->prepare("
        INSERT INTO " . T_USUARIOS . " (usuario, contrasena, id_rol)
        VALUES (:usuario, :contrasena, :id_rol)
    ");
    $ok = $stmt->execute([
        ':usuario'    => $nombre,
        ':contrasena' => $hash,
        ':id_rol'     => $idRol,
    ]);

    if (!$ok) {
        echo json_encode(['exito' => false, 'mensaje' => 'Error al registrar usuario.']);
        exit;
    }

    $id = (int)$pdo->lastInsertId();

    echo json_encode([
        'exito'   => true,
        'usuario' => [
            'idUsuario'       => $id,
            'Nombre_Completo' => $nombre,   // compat con front
            'rol'             => $rolNombre // "admin"/"vista"
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Error del servidor.'
        // 'detalle' => $e->getMessage(), // descomentar solo para depurar
    ], JSON_UNESCAPED_UNICODE);
}
