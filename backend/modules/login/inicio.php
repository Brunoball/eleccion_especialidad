<?php
// backend/routes/inicio.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../config/db.php'; // Debe definir $pdo (PDO conectado)

define('DEBUG_LOGIN', false);

// ✅ SOLO nombres de tabla (sin prefijo de base de datos)
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

    // Front puede enviar "nombre" o "usuario"
    $nombre     = trim((string)($data['nombre'] ?? $data['usuario'] ?? ''));
    $contrasena = (string)($data['contrasena'] ?? $data['password'] ?? '');

    // Mantiene 200 para errores de credenciales
    if ($nombre === '' || $contrasena === '') {
        echo json_encode(['exito' => false, 'mensaje' => 'Faltan datos.']);
        exit;
    }

    // Busca por usuario y trae el nombre del rol (sin schema)
    $sql = "
        SELECT u.id_usuario, u.usuario, u.contrasena, u.id_rol, r.rol AS rol_nombre
        FROM " . T_USUARIOS . " u
        LEFT JOIN " . T_ROL . " r ON r.id_rol = u.id_rol
        WHERE u.usuario = :usuario
        LIMIT 1
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':usuario' => $nombre]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$u) {
        echo json_encode(['exito' => false, 'mensaje' => 'Credenciales incorrectas.']);
        exit;
    }

    // Verificación de password (hash o texto plano como fallback)
    $guardado = (string)($u['contrasena'] ?? '');
    $ok = false;
    if ($guardado !== '') {
        // Si es bcrypt/argon, password_verify lo maneja
        $ok = password_verify($contrasena, $guardado);
        if (!$ok) {
            // Fallback para DB con texto plano (p.ej. "1")
            $ok = hash_equals($guardado, $contrasena);
        }
    }

    if (!$ok) {
        echo json_encode(['exito' => false, 'mensaje' => 'Credenciales incorrectas.']);
        exit;
    }

    $rolNombre = strtolower((string)($u['rol_nombre'] ?? 'vista')); // "admin" / "vista"

    echo json_encode([
        'exito'   => true,
        'usuario' => [
            'idUsuario'       => (int)$u['id_usuario'],
            'Nombre_Completo' => (string)$u['usuario'], // compat con front
            'rol'             => $rolNombre
        ],
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Error del servidor.',
        'detalle' => DEBUG_LOGIN ? $e->getMessage() : null,
    ], JSON_UNESCAPED_UNICODE);
}
