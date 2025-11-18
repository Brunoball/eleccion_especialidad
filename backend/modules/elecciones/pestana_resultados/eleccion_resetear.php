<?php
// backend/modules/elecciones/pestana_resultados/eleccion_resetear.php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

// Preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Solo permitimos POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(200);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Método no permitido. Usar POST.'
    ]);
    exit;
}

// Estamos en backend/modules/elecciones/pestana_resultados
// Para llegar a backend/config/db.php -> ../../../config/db.php
require_once __DIR__ . '/../../../config/db.php';  // acá tenés $pdo

try {
    // Si no tenés FKs a esta tabla, con esto basta:
    // $pdo->exec('TRUNCATE TABLE `eleccion`');

    // Versión segura por si hay claves foráneas
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
    $pdo->exec('TRUNCATE TABLE `eleccion`');
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

    http_response_code(200);
    echo json_encode([
        'exito'   => true,
        'mensaje' => 'Se resetearon todas las inscripciones de especialidad.'
    ]);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'Error al resetear la elección.',
        'detalle' => $e->getMessage(),
    ]);
}
