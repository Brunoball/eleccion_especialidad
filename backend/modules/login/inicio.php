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

/* ----------------- Helpers ----------------- */
function ok($arr) {
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}
function fail($msg, $code200 = true) {
    if (!$code200) http_response_code(400);
    echo json_encode(['exito'=>false,'mensaje'=>$msg], JSON_UNESCAPED_UNICODE);
    exit;
}
function colExists(PDO $pdo, string $table, string $column): bool {
    $sql = "SELECT 1
              FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME   = :t
               AND COLUMN_NAME  = :c
             LIMIT 1";
    $st = $pdo->prepare($sql);
    $st->execute([':t'=>$table, ':c'=>$column]);
    return (bool)$st->fetchColumn();
}
function tableExists(PDO $pdo, string $table): bool {
    $sql = "SELECT 1
              FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME   = :t
             LIMIT 1";
    $st = $pdo->prepare($sql);
    $st->execute([':t'=>$table]);
    return (bool)$st->fetchColumn();
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['exito'=>false,'mensaje'=>'Método no permitido.']);
        exit;
    }

    // Acepta JSON o x-www-form-urlencoded
    $raw  = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) $data = $_POST ?? [];

    $nombre     = trim((string)($data['nombre'] ?? $data['usuario'] ?? ''));
    $contrasena = (string)($data['contrasena'] ?? $data['password'] ?? '');

    if ($nombre === '' || $contrasena === '') {
        fail('Faltan datos.');
    }

    /* ---------- Descubrimiento de esquema ---------- */
    $hasIdUsuario     = colExists($pdo, 'usuarios', 'idUsuario');
    $hasNombreComp    = colExists($pdo, 'usuarios', 'Nombre_Completo');
    $hasHashPassword  = colExists($pdo, 'usuarios', 'Hash_Contrasena');
    $hasRolEnum       = colExists($pdo, 'usuarios', 'rol');

    $hasId_usuario    = colExists($pdo, 'usuarios', 'id_usuario');
    $hasUsuario       = colExists($pdo, 'usuarios', 'usuario');
    $hasContrasena    = colExists($pdo, 'usuarios', 'contrasena');
    $hasIdRol         = colExists($pdo, 'usuarios', 'id_rol');
    $hasRolTable      = tableExists($pdo, 'rol');

    // Construcción flexible: soporta ambos esquemas
    if ($hasNombreComp || $hasUsuario) {
        // Armar WHERE que funcione en ambos: si falta una col, se ignora con OR preparado
        $where = [];
        $params = [':nombre'=>$nombre];

        if ($hasUsuario)    $where[] = 'u.usuario = :nombre';
        if ($hasNombreComp) $where[] = 'u.Nombre_Completo = :nombre';
        if (!$where) fail('Esquema de usuarios inválido.', false);

        $whereSql = implode(' OR ', $where);

        // SELECT universal por alias
        // Elegimos las columnas disponibles y las aliamos al formato final esperado.
        $selectId   = $hasIdUsuario  ? 'u.idUsuario'        : 'u.id_usuario';
        $selectNom  = $hasNombreComp ? 'u.Nombre_Completo'  : 'u.usuario';
        $selectPass = $hasHashPassword? 'u.Hash_Contrasena' : 'u.contrasena';

        // Rol: si hay enum directo, lo usamos; si no, intentamos join con rol.id_rol
        if ($hasRolEnum) {
            $sql = "
                SELECT
                    {$selectId}         AS idUsuario,
                    {$selectNom}        AS Nombre_Completo,
                    {$selectPass}       AS Hash_Contrasena,
                    LOWER(u.rol)        AS rol_final
                FROM usuarios u
                WHERE {$whereSql}
                LIMIT 1
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        } else {
            // Esquema viejo (con id_rol) o sin rol: mapeamos vista/admin
            $join = ($hasIdRol && $hasRolTable)
                ? "LEFT JOIN rol r ON r.id_rol = u.id_rol"
                : "";
            $rolExpr = ($hasIdRol && $hasRolTable)
                ? "LOWER(r.rol)"
                : "NULL";

            $sql = "
                SELECT
                    {$selectId}         AS idUsuario,
                    {$selectNom}        AS Nombre_Completo,
                    {$selectPass}       AS Hash_Contrasena,
                    {$rolExpr}          AS rol_nombre,
                    ".($hasIdRol ? "u.id_rol" : "NULL")." AS id_rol
                FROM usuarios u
                {$join}
                WHERE {$whereSql}
                LIMIT 1
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }
    } else {
        fail('La tabla usuarios no contiene columnas de nombre válidas.', false);
    }

    $u = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$u) {
        fail('Credenciales incorrectas.');
    }

    // Verificación de password (hash o texto plano fallback)
    $guardado = (string)($u['Hash_Contrasena'] ?? '');
    if ($guardado === '' && isset($u['Hash_Contrasena']) === false && isset($u['contrasena'])) {
        $guardado = (string)$u['contrasena'];
    }

    $ok = false;
    if ($guardado !== '') {
        $ok = password_verify($contrasena, $guardado);
        if (!$ok) $ok = hash_equals($guardado, $contrasena); // fallback texto plano
    }
    if (!$ok) {
        fail('Credenciales incorrectas.');
    }

    // Resolver rol final
    $rol = null;
    if (isset($u['rol_final']) && $u['rol_final'] !== null && $u['rol_final'] !== '') {
        $rol = strtolower($u['rol_final']);                 // enum directo (nuevo)
    } elseif (!empty($u['rol_nombre'])) {
        $rol = strtolower($u['rol_nombre']);                // nombre desde tabla rol (viejo)
    } elseif (!empty($u['id_rol'])) {
        // Mapa numérico clásico si no hay tabla rol
        // Ajustá si tu mapeo era distinto
        $rol = ((int)$u['id_rol'] === 1) ? 'admin' : 'vista';
    }
    if ($rol !== 'admin' && $rol !== 'vista') $rol = 'vista';

    // Armar payload compatible con tu front
    $respUsuario = [
        'idUsuario'       => (int)$u['idUsuario'],
        'Nombre_Completo' => (string)$u['Nombre_Completo'],
        'rol'             => $rol,
    ];

    ok(['exito'=>true, 'usuario'=>$respUsuario]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Error del servidor.',
        'detalle' => DEBUG_LOGIN ? $e->getMessage() : null,
    ], JSON_UNESCAPED_UNICODE);
}
