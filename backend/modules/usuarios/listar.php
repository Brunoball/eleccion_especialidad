<?php
// backend/modules/usuarios/listar.php
// Lista los usuarios del sistema (sin contraseñas).
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../../config/db.php';

try {
    $sql = "
        SELECT idUsuario, Nombre_Completo, rol, Fecha_Creacion
        FROM usuarios
        ORDER BY Nombre_Completo ASC
    ";

    $usuarios = [];
    foreach ($pdo->query($sql, PDO::FETCH_ASSOC) as $row) {
        $rol = strtolower((string)$row['rol']);
        $usuarios[] = [
            'id'             => (int)$row['idUsuario'],
            'nombre'         => (string)$row['Nombre_Completo'],
            'rol'            => $rol === 'admin' ? 'admin' : 'vista',
            'fecha_creacion' => $row['Fecha_Creacion'] === null ? null : (string)$row['Fecha_Creacion'],
        ];
    }

    echo json_encode(['exito' => true, 'usuarios' => $usuarios], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'No se pudieron obtener los usuarios: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
