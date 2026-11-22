<?php
// backend/modules/historial/historial_lib.php
// Funciones compartidas del HISTORIAL DE ELECCIONES.
//
// El historial es una "foto" de la elección tomada justo antes de limpiarla:
//   - eleccion_historial                → cabecera (fecha, título, totales, usuario)
//   - eleccion_historial_detalle        → cada alumno que eligió (orden, DNI, especialidad)
//   - eleccion_historial_especialidad   → cupo y asignados de cada especialidad
//
// Los datos se copian como TEXTO (nombre del alumno, especialidad, etc.) y sin
// claves foráneas hacia alumnos/especialidad: así el historial sobrevive aunque
// después se borren los alumnos o se renombren las especialidades.
declare(strict_types=1);

/** Crea las tablas del historial si todavía no existen. */
function historial_asegurar_tablas(PDO $pdo): void
{
    static $listo = false;
    if ($listo) return;

    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

    if ($driver === 'sqlite') {
        // Solo para pruebas locales
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS eleccion_historial (
                id_historial INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha TEXT NOT NULL,
                titulo TEXT NOT NULL,
                origen TEXT NOT NULL DEFAULT 'resultados',
                usuario TEXT NULL,
                total_alumnos INTEGER NOT NULL DEFAULT 0,
                total_inscriptos INTEGER NOT NULL DEFAULT 0,
                total_ausentes INTEGER NOT NULL DEFAULT 0
            )
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS eleccion_historial_detalle (
                id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,
                id_historial INTEGER NOT NULL REFERENCES eleccion_historial(id_historial) ON DELETE CASCADE,
                orden_ranking INTEGER NULL,
                orden_especialidad INTEGER NULL,
                dni TEXT NULL,
                alumno TEXT NOT NULL,
                id_especialidad INTEGER NULL,
                especialidad TEXT NOT NULL,
                es_ausente INTEGER NOT NULL DEFAULT 0
            )
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS eleccion_historial_especialidad (
                id_historial INTEGER NOT NULL REFERENCES eleccion_historial(id_historial) ON DELETE CASCADE,
                id_especialidad INTEGER NULL,
                especialidad TEXT NOT NULL,
                cupo INTEGER NOT NULL DEFAULT 0,
                asignados INTEGER NOT NULL DEFAULT 0,
                es_ausente INTEGER NOT NULL DEFAULT 0
            )
        ");
        $listo = true;
        return;
    }

    // MySQL / MariaDB (mismas definiciones que database/historial_eleccion.sql)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `eleccion_historial` (
          `id_historial` int unsigned NOT NULL AUTO_INCREMENT,
          `fecha` datetime NOT NULL,
          `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
          `origen` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'resultados',
          `usuario` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `total_alumnos` int unsigned NOT NULL DEFAULT '0',
          `total_inscriptos` int unsigned NOT NULL DEFAULT '0',
          `total_ausentes` int unsigned NOT NULL DEFAULT '0',
          PRIMARY KEY (`id_historial`),
          KEY `idx_historial_fecha` (`fecha`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `eleccion_historial_detalle` (
          `id_detalle` int unsigned NOT NULL AUTO_INCREMENT,
          `id_historial` int unsigned NOT NULL,
          `orden_ranking` int unsigned DEFAULT NULL,
          `orden_especialidad` int unsigned DEFAULT NULL,
          `dni` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
          `alumno` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
          `id_especialidad` int unsigned DEFAULT NULL,
          `especialidad` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
          `es_ausente` tinyint(1) NOT NULL DEFAULT '0',
          PRIMARY KEY (`id_detalle`),
          KEY `idx_hd_historial` (`id_historial`),
          CONSTRAINT `fk_hd_historial` FOREIGN KEY (`id_historial`)
            REFERENCES `eleccion_historial` (`id_historial`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `eleccion_historial_especialidad` (
          `id_historial` int unsigned NOT NULL,
          `id_especialidad` int unsigned DEFAULT NULL,
          `especialidad` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
          `cupo` int unsigned NOT NULL DEFAULT '0',
          `asignados` int unsigned NOT NULL DEFAULT '0',
          `es_ausente` tinyint(1) NOT NULL DEFAULT '0',
          KEY `idx_he_historial` (`id_historial`),
          CONSTRAINT `fk_he_historial` FOREIGN KEY (`id_historial`)
            REFERENCES `eleccion_historial` (`id_historial`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $listo = true;
}

/** Lee el cuerpo JSON del pedido (una sola vez) y lo devuelve como array. */
function historial_leer_body(): array
{
    static $body = null;
    if ($body !== null) return $body;

    $raw = (string)file_get_contents('php://input');
    $data = $raw !== '' ? json_decode($raw, true) : null;
    $body = is_array($data) ? $data : ($_POST ?? []);
    return $body;
}

/**
 * Decide si hay que guardar historial.
 * Por defecto SÍ (así un front viejo que no manda la opción nunca pierde datos).
 */
function historial_debe_guardar(array $body): bool
{
    if (!array_key_exists('guardar_historial', $body)) return true;
    $v = $body['guardar_historial'];
    if (is_bool($v)) return $v;
    $v = strtolower(trim((string)$v));
    return !in_array($v, ['0', 'false', 'no', 'off', ''], true);
}

function historial_es_ausente(string $nombre): bool
{
    return mb_strtoupper(trim($nombre), 'UTF-8') === 'AUSENTE';
}

/**
 * Copia la elección actual al historial.
 * Debe llamarse DENTRO de la transacción y ANTES de borrar `eleccion`.
 *
 * @return array{guardado: bool, id: int|null, inscriptos: int}
 */
function historial_guardar(PDO $pdo, array $opciones = []): array
{
    // 1) Inscripciones actuales, en orden de ranking
    $st = $pdo->query("
        SELECT
            a.orden            AS orden_ranking,
            a.dni              AS dni,
            a.alumno           AS alumno,
            s.id_especialidad  AS id_especialidad,
            s.especialidad     AS especialidad
        FROM eleccion e
        INNER JOIN alumnos a      ON a.id_alumno = e.id_alumno
        INNER JOIN especialidad s ON s.id_especialidad = e.id_especialidad
        ORDER BY (a.orden IS NULL) ASC, a.orden ASC, e.id_eleccion ASC
    ");
    $filas = $st->fetchAll(PDO::FETCH_ASSOC);

    if (!$filas) {
        return ['guardado' => false, 'id' => null, 'inscriptos' => 0];
    }

    // 2) Totales
    $totalAlumnos = (int)$pdo->query("SELECT COUNT(*) FROM alumnos")->fetchColumn();
    $ausentes = 0;
    foreach ($filas as $f) {
        if (historial_es_ausente((string)$f['especialidad'])) $ausentes++;
    }

    $fecha = date('Y-m-d H:i:s');
    $titulo = trim((string)($opciones['titulo'] ?? ''));
    if ($titulo === '') {
        $titulo = 'Elección ' . date('d/m/Y');
    }
    $titulo = mb_substr($titulo, 0, 150);

    $usuario = trim((string)($opciones['usuario'] ?? ''));
    $usuario = $usuario === '' ? null : mb_substr($usuario, 0, 100);

    $origen = (string)($opciones['origen'] ?? 'resultados');

    // 3) Cabecera
    $ins = $pdo->prepare("
        INSERT INTO eleccion_historial
            (fecha, titulo, origen, usuario, total_alumnos, total_inscriptos, total_ausentes)
        VALUES
            (:fecha, :titulo, :origen, :usuario, :total_alumnos, :total_inscriptos, :total_ausentes)
    ");
    $ins->execute([
        ':fecha'            => $fecha,
        ':titulo'           => $titulo,
        ':origen'           => $origen,
        ':usuario'          => $usuario,
        ':total_alumnos'    => $totalAlumnos,
        ':total_inscriptos' => count($filas),
        ':total_ausentes'   => $ausentes,
    ]);
    $idHistorial = (int)$pdo->lastInsertId();

    // 4) Detalle (con el número de orden dentro de cada especialidad)
    $insDet = $pdo->prepare("
        INSERT INTO eleccion_historial_detalle
            (id_historial, orden_ranking, orden_especialidad, dni, alumno, id_especialidad, especialidad, es_ausente)
        VALUES
            (:id_historial, :orden_ranking, :orden_especialidad, :dni, :alumno, :id_especialidad, :especialidad, :es_ausente)
    ");

    $contadorPorEsp = [];
    foreach ($filas as $f) {
        $idEsp = (int)$f['id_especialidad'];
        $contadorPorEsp[$idEsp] = ($contadorPorEsp[$idEsp] ?? 0) + 1;

        $insDet->execute([
            ':id_historial'       => $idHistorial,
            ':orden_ranking'      => $f['orden_ranking'] === null ? null : (int)$f['orden_ranking'],
            ':orden_especialidad' => $contadorPorEsp[$idEsp],
            ':dni'                => $f['dni'] === null ? null : (string)$f['dni'],
            ':alumno'             => (string)$f['alumno'],
            ':id_especialidad'    => $idEsp,
            ':especialidad'       => (string)$f['especialidad'],
            ':es_ausente'         => historial_es_ausente((string)$f['especialidad']) ? 1 : 0,
        ]);
    }

    // 5) Foto de cupos por especialidad
    $insEsp = $pdo->prepare("
        INSERT INTO eleccion_historial_especialidad
            (id_historial, id_especialidad, especialidad, cupo, asignados, es_ausente)
        VALUES
            (:id_historial, :id_especialidad, :especialidad, :cupo, :asignados, :es_ausente)
    ");
    $stEsp = $pdo->query("
        SELECT s.id_especialidad, s.especialidad, s.cupo, COUNT(e.id_eleccion) AS asignados
        FROM especialidad s
        LEFT JOIN eleccion e ON e.id_especialidad = s.id_especialidad
        GROUP BY s.id_especialidad, s.especialidad, s.cupo
        ORDER BY s.id_especialidad ASC
    ");
    foreach ($stEsp->fetchAll(PDO::FETCH_ASSOC) as $e) {
        $insEsp->execute([
            ':id_historial'    => $idHistorial,
            ':id_especialidad' => (int)$e['id_especialidad'],
            ':especialidad'    => (string)$e['especialidad'],
            ':cupo'            => (int)$e['cupo'],
            ':asignados'       => (int)$e['asignados'],
            ':es_ausente'      => historial_es_ausente((string)$e['especialidad']) ? 1 : 0,
        ]);
    }

    return ['guardado' => true, 'id' => $idHistorial, 'inscriptos' => count($filas)];
}

/** Arma el texto de respuesta según se haya guardado o no el historial. */
function historial_mensaje(bool $pedido, array $resultado): string
{
    if (!$pedido) {
        return 'No se guardó historial (opción desactivada).';
    }
    if ($resultado['guardado']) {
        return 'Historial guardado con ' . $resultado['inscriptos'] . ' inscripciones.';
    }
    return 'No había inscripciones para guardar en el historial.';
}
