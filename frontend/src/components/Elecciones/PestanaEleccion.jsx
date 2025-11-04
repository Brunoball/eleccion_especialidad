import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModalPantalla from "./modales/ModalPantalla";
import "./Eleccion.css";

export default function PestanaEleccion({ BASE_URL, fetchJSON, showToast }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [especialidades, setEspecialidades] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);

  const [seleccion, setSeleccion] = useState({}); // { [id_alumno]: "id_especialidad" }

  const esAusente = (nombre) =>
    typeof nombre === "string" && nombre.trim().toUpperCase() === "AUSENTE";

  const cargarCupos = async () => {
    try {
      const { especialidades: esp } = await fetchJSON(
        `${BASE_URL}/api.php?action=obtener_cupos_actuales`
      );
      const normalizado = (esp || []).map((e) => ({
        id: Number(e.id_especialidad),
        nombre: String(e.especialidad),
        cupo: e.cupo == null ? 0 : Number(e.cupo),
        cupos_actuales: Number(e.cupos_actuales || 0),
      }));
      setEspecialidades(normalizado);
    } catch (e) {
      console.error(e);
      setEspecialidades([]);
      showToast("error", e.message || "No se pudieron cargar los cupos.");
    }
  };

  const cargarAlumnos = async () => {
    setLoadingAlumnos(true);
    try {
      const { alumnos: rows } = await fetchJSON(
        `${BASE_URL}/api.php?action=obtener_alumnos&order=alumno&dir=ASC&limit=10000`
      );
      const norm = (rows || []).map((r) => ({
        id_alumno: Number(r.id_alumno),
        dni: String(r.dni ?? ""),
        alumno: String(r.alumno ?? "").toUpperCase(),
        promedio_final: r.promedio_final == null ? null : Number(r.promedio_final),
        previas_1et: Number(r.previas_1et ?? 0),
        adeudadas_1et: Number(r.adeudadas_1et ?? 0),
        coloquios_1a: Number(r.coloquios_1a ?? 0),
        repite_1a: String(r.repite_1a ?? "no"),
        repite_2a: Number(r.repite_2a ?? 0),
        amonestaciones_1a: Number(r.amonestaciones_1a ?? 0),
        amonestaciones_2a: Number(r.amonestaciones_2a ?? 0),
        inasistencias_1et: Number(r.inasistencias_1et ?? 0),
        inasistencias_1a: Number(r.inasistencias_1a ?? 0),
        observaciones_1a: r.observaciones_1a ?? null,
        observaciones_2a: r.observaciones_2a ?? null,
        sin_trayectoria: Number(r.sin_trayectoria ?? 0),
        tercera_materia: Number(r.tercera_materia ?? 0),
        id_especialidad: r.id_especialidad === null ? null : Number(r.id_especialidad),
        especialidad: r.especialidad ?? null,
        orden: r.orden == null ? null : Number(r.orden),
      }));

      norm.sort((a, b) => {
        const ao = a.orden ?? Number.POSITIVE_INFINITY;
        const bo = b.orden ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        return a.alumno.localeCompare(b.alumno);
      });

      setAlumnos(norm);
      setSeleccion({});
    } catch (e) {
      console.error(e);
      setAlumnos([]);
      showToast("error", e.message || "No se pudieron cargar los alumnos.");
    } finally {
      setLoadingAlumnos(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await cargarCupos();
      await cargarAlumnos();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // value SIEMPRE string
  const onChangeSelect = (idAlumno, valueStr) => {
    setSeleccion((prev) => ({ ...prev, [idAlumno]: String(valueStr || "") }));
  };

  const onConfirmar = async (row) => {
    try {
      const selectedStr =
        seleccion[row.id_alumno] ??
        (row.id_especialidad != null ? String(row.id_especialidad) : "");
      const idEspecialidad = Number(selectedStr || 0);

      if (!idEspecialidad) {
        showToast("advertencia", "Seleccioná una especialidad antes de confirmar.");
        return;
      }

      const espElegida = especialidades.find((esp) => esp.id === idEspecialidad);
      if (espElegida && !esAusente(espElegida.nombre)) {
        const disponibles = Number(espElegida.cupos_actuales || 0);
        if (disponibles <= 0) {
          showToast("error", `No hay cupo disponible en ${espElegida.nombre}.`);
          return;
        }
      }

      await fetchJSON(`${BASE_URL}/api.php?action=eleccion_confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_alumno: row.id_alumno,
          id_especialidad: idEspecialidad,
        }),
      });

      showToast(
        "exito",
        `Registrado: ${row.alumno} en ${espElegida?.nombre || "especialidad"}.`
      );
      await cargarAlumnos();
      await cargarCupos();
    } catch (e) {
      console.error(e);
      showToast("error", e.message || "No se pudo registrar la elección.");
    }
  };

  const onCancelar = async (row) => {
    try {
      await fetchJSON(`${BASE_URL}/api.php?action=eleccion_cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_alumno: row.id_alumno }),
      });
      showToast("exito", `Se canceló la inscripción de ${row.alumno}.`);
      await cargarAlumnos();
      await cargarCupos();
    } catch (e) {
      console.error(e);
      showToast("error", e.message || "No se pudo cancelar la inscripción.");
    }
  };

  // ====== Modo Pantalla ======
  const [openPresent, setOpenPresent] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const abrirModoPantalla = (desde = 0) => {
    setStartIndex(desde);
    setOpenPresent(true);
  };

  if (loading) {
    return (
      <div>
        <p className="loading-text">Cargando…</p>
      </div>
    );
  }

  return (
    <>
      {/* Tarjetas de CUPOS */}
      <div className="cupos-grid">
        {especialidades.map((e) => {
          const disponibles = Number(e.cupos_actuales || 0);
          const aus = esAusente(e.nombre);
          const agotado = disponibles <= 0 && !aus;

          return (
            <div key={e.id} className={`cupo-card ${agotado ? "cupo-agotado" : ""}`}>
              <div className="cupo-nombre">{e.nombre}</div>
              <div className="cupo-disponibles">
                <strong className={disponibles > 0 || aus ? "ok" : "no"}>
                  Disponibles: {disponibles}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Acciones arriba de la tabla */}
      <div className="actions" style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={() => abrirModoPantalla(0)}
          className="btn btn-primary"
          title="Mostrar 1 alumno por vez (Enter confirma, ← → navegan)"
        >
          Modo Pantalla
        </button>

        <button type="button" onClick={() => navigate("/panel")} className="btn btn-neutral">
          Volver al Dashboard
        </button>
      </div>

      {/* Tabla de alumnos */}
      <div className="table-wrapper" style={{ marginTop: 12 }}>
        <table className="tabla">
          <thead>
            <tr>
              <th className="th-orden">Orden</th>
              <th>Alumno</th>
              <th className="th-esp">Especialidad</th>
              <th className="th-acc">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loadingAlumnos ? (
              <tr>
                <td colSpan={4} className="td-loading">Cargando alumnos…</td>
              </tr>
            ) : alumnos.length === 0 ? (
              <tr>
                <td colSpan={4} className="td-loading">No hay alumnos cargados.</td>
              </tr>
            ) : (
              alumnos.map((row, idx) => {
                const inscripto = row.id_especialidad !== null;

                const rawSel = seleccion[row.id_alumno];
                const rawDb = row.id_especialidad != null ? String(row.id_especialidad) : "";
                const value = String(rawSel ?? rawDb ?? "");

                const espSel = especialidades.find(
                  (esp) => String(esp.id) === (value || "")
                );
                const sinCupo =
                  espSel && !esAusente(espSel.nombre) && Number(espSel.cupos_actuales || 0) <= 0;

                return (
                  <tr
                    key={row.id_alumno}
                    className={sinCupo && !inscripto ? "tr-sin-cupo" : ""}
                  >
                    <td>{row.orden ?? (idx + 1)}</td>
                    <td>
                      <div className="alumno-nombre">{row.alumno}</div>
                      <div className="alumno-dni">DNI: {row.dni}</div>
                      {inscripto && (
                        <div className="chip-inscripto">
                          Inscripto: {row.especialidad}
                        </div>
                      )}
                    </td>

                    <td className="td-center">
                      <select
                        value={value}
                        onChange={(e) => onChangeSelect(row.id_alumno, e.target.value)}
                        disabled={inscripto}
                        className={`select ${sinCupo ? "select-sin-cupo" : ""}`}
                      >
                        <option value="">— Seleccionar —</option>
                        {especialidades.map((esp) => {
                          const disp = Number(esp.cupos_actuales || 0);
                          const bloqueada = disp <= 0 && !esAusente(esp.nombre);
                          return (
                            <option
                              key={esp.id}
                              value={String(esp.id)}
                              disabled={bloqueada && !inscripto}
                            >
                              {esp.nombre}
                            </option>
                          );
                        })}
                      </select>

                      {sinCupo && !inscripto && (
                        <div className="sin-cupo-warning">⚠ Sin cupo disponible</div>
                      )}
                    </td>

                    <td className="td-center">
                      <div className="acciones">
                        {!inscripto && (
                          <button
                            type="button"
                            className={`btn ${sinCupo ? "btn-disabled" : "btn-accent"}`}
                            onClick={() => onConfirmar(row)}
                            disabled={sinCupo}
                          >
                            Confirmar
                          </button>
                        )}
                        {inscripto && (
                          <button
                            type="button"
                            className="btn btn-neutral"
                            onClick={() => onCancelar(row)}
                          >
                            Cancelar
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-primary-outline"
                          onClick={() => { setStartIndex(idx); setOpenPresent(true); }}
                          title="Abrir Modo Pantalla desde este alumno"
                        >
                          Pantalla
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Modo Pantalla */}
      <ModalPantalla
        open={openPresent}
        onClose={() => setOpenPresent(false)}
        alumnos={alumnos}
        especialidades={especialidades}
        seleccion={seleccion}
        onChangeSelect={onChangeSelect}
        onConfirmar={onConfirmar}
        onCancelar={onCancelar}
        esAusente={esAusente}
        startIndex={startIndex}
      />
    </>
  );
}
