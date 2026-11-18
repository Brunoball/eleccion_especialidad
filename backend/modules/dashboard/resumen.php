<?php
// backend/modules/dashboard/resumen.php
// Resumen para el panel de inicio (dashboard).
// Devuelve totales de alumnos, avance de la elección, ocupación por
// especialidad, usuarios y últimas inscripciones.
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../../config/db.php';

/** Devuelve true si el nombre corresponde a la especialidad "AUSENTE". */
function dash_es_ausente(string $nombre): bool
{
    return mb_strtoupper(trim($nombre), 'UTF-8') === 'AUSENTE';
}

/** Entero seguro desde una consulta de un solo valor. */
function dash_int(PDO $pdo, string $sql): int
{
    $valor = $pdo->query($sql)->fetchColumn();
    return $valor === false || $valor === null ? 0 : (int)$valor;
}

try {
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new RuntimeException('Conexión PDO no disponible.');
    }

    /* ---------- Alumnos ---------- */
    $alumnosTotal     = dash_int($pdo, "SELECT COUNT(*) FROM alumnos");
    $alumnosConOrden  = dash_int($pdo, "SELECT COUNT(*) FROM alumnos WHERE orden IS NOT NULL AND orden > 0");
    $sinTrayectoria   = dash_int($pdo, "SELECT COUNT(*) FROM alumnos WHERE trayectoria_institucional = 1");
    $repitentes       = dash_int($pdo, "SELECT COUNT(*) FROM alumnos WHERE repite_1a = 'si' OR repite_2a > 0");
    $conAmonestacion  = dash_int($pdo, "SELECT COUNT(*) FROM alumnos WHERE amonestaciones_1a > 0 OR amonestaciones_1et > 0");

    /* ---------- Especialidades con asignados reales ---------- */
    $sqlEsp = "
        SELECT
            s.id_especialidad,
            s.especialidad,
            s.cupo,
            s.cupos_actuales,
            COUNT(e.id_eleccion) AS asignados
        FROM especialidad s
        LEFT JOIN eleccion e ON e.id_especialidad = s.id_especialidad
        GROUP BY s.id_especialidad, s.especialidad, s.cupo, s.cupos_actuales
        ORDER BY s.id_especialidad ASC
    ";

    $especialidades = [];
    $cupoTotal = 0;
    $ocupados = 0;
    $disponibles = 0;
    $completas = 0;
    $ausentes = 0;

    foreach ($pdo->query($sqlEsp, PDO::FETCH_ASSOC) as $row) {
        $nombre     = (string)$row['especialidad'];
        $cupo       = (int)$row['cupo'];
        $actuales   = (int)$row['cupos_actuales'];
        $asignados  = (int)$row['asignados'];
        $esAusente  = dash_es_ausente($nombre);

        if ($esAusente) {
            $ausentes = $asignados;
        } else {
            $cupoTotal   += $cupo;
            $ocupados    += $asignados;
            $disponibles += max($actuales, 0);
            if ($cupo > 0 && $actuales <= 0) {
                $completas++;
            }
        }

        $especialidades[] = [
            'id'          => (int)$row['id_especialidad'],
            'nombre'      => $nombre,
            'cupo'        => $cupo,
            'disponibles' => max($actuales, 0),
            'asignados'   => $asignados,
            'ocupacion'   => (!$esAusente && $cupo > 0)
                ? (int)round(min(100, ($asignados * 100) / $cupo))
                : 0,
            'es_ausente'  => $esAusente,
        ];
    }

    /* ---------- Elección ---------- */
    $inscriptos = dash_int($pdo, "
        SELECT COUNT(DISTINCT e.id_alumno)
        FROM eleccion e
        INNER JOIN alumnos a ON a.id_alumno = e.id_alumno
    ");
    $pendientes = max($alumnosTotal - $inscriptos, 0);
    $avance = $alumnosTotal > 0 ? (int)round(($inscriptos * 100) / $alumnosTotal) : 0;

    // Próximo alumno por elegir (según el orden del ranking)
    $stProx = $pdo->query("
        SELECT a.alumno, a.orden
        FROM alumnos a
        LEFT JOIN eleccion e ON e.id_alumno = a.id_alumno
        WHERE e.id_eleccion IS NULL
        ORDER BY (a.orden IS NULL) ASC, a.orden ASC, a.id_alumno ASC
        LIMIT 1
    ");
    $prox = $stProx->fetch(PDO::FETCH_ASSOC) ?: null;

    // Últimas inscripciones registradas
    $ultimas = [];
    $stUlt = $pdo->query("
        SELECT e.id_eleccion, a.alumno, a.orden, s.especialidad
        FROM eleccion e
        INNER JOIN alumnos a ON a.id_alumno = e.id_alumno
        INNER JOIN especialidad s ON s.id_especialidad = e.id_especialidad
        ORDER BY e.id_eleccion DESC
        LIMIT 6
    ");
    foreach ($stUlt->fetchAll(PDO::FETCH_ASSOC) as $u) {
        $ultimas[] = [
            'id'           => (int)$u['id_eleccion'],
            'alumno'       => (string)$u['alumno'],
            'orden'        => $u['orden'] === null ? null : (int)$u['orden'],
            'especialidad' => (string)$u['especialidad'],
        ];
    }

    /* ---------- Usuarios ---------- */
    $usuariosTotal = dash_int($pdo, "SELECT COUNT(*) FROM usuarios");
    $usuariosAdmin = dash_int($pdo, "SELECT COUNT(*) FROM usuarios WHERE LOWER(rol) = 'admin'");

    echo json_encode([
        'exito'   => true,
        'resumen' => [
            'fecha'   => date('Y-m-d H:i'),
            'alumnos' => [
                'total'            => $alumnosTotal,
                'con_orden'        => $alumnosConOrden,
                'sin_trayectoria'  => $sinTrayectoria,
                'repitentes'       => $repitentes,
                'con_amonestacion' => $conAmonestacion,
            ],
            'eleccion' => [
                'inscriptos' => $inscriptos,
                'pendientes' => $pendientes,
                'ausentes'   => $ausentes,
                'avance'     => $avance,
                'proximo'    => $prox ? [
                    'alumno' => (string)$prox['alumno'],
                    'orden'  => $prox['orden'] === null ? null : (int)$prox['orden'],
                ] : null,
            ],
            'cupos' => [
                'total'       => $cupoTotal,
                'ocupados'    => $ocupados,
                'disponibles' => $disponibles,
                'completas'   => $completas,
            ],
            'especialidades' => $especialidades,
            'ultimas'        => $ultimas,
            'usuarios'       => [
                'total' => $usuariosTotal,
                'admin' => $usuariosAdmin,
                'vista' => max($usuariosTotal - $usuariosAdmin, 0),
            ],
        ],
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'exito'   => false,
        'mensaje' => 'No se pudo obtener el resumen: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
