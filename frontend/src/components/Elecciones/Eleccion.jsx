import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import ModalImportar from "./modales/ModalImportar";
import ModalConfirmarLimpiar from "./modales/ModalConfirmarLimpiar";
import ModalPantalla from "./modales/ModalPantalla";                // 👈 NUEVO
import Toast from "../Global/Toast";
import "./Eleccion.css";

const Eleccion = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [especialidades, setEspecialidades] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [seleccion, setSeleccion] = useState({});

  // limpiar tabla
  const [openClear, setOpenClear] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearError, setClearError] = useState("");

  // ======= TOAST ROBUSTO =======
  const [toast, setToast] = useState(null); // { tipo, mensaje, duracion, id }
  const toastCtrl = useRef({ timer: null });

  const clearToastTimer = () => {
    if (toastCtrl.current.timer) {
      clearTimeout(toastCtrl.current.timer);
      toastCtrl.current.timer = null;
    }
  };

  const showToast = (tipo, mensaje, duracion = 2800) => {
    clearToastTimer();
    setToast(null);
    setTimeout(() => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setToast({ tipo, mensaje, duracion, id });
      toastCtrl.current.timer = setTimeout(() => {
        setToast((t) => (t && t.id === id ? null : t));
        toastCtrl.current.timer = null;
      }, Math.max(800, duracion + 100));
    }, 0);
  };

  const handleToastClose = (id) => {
    clearToastTimer();
    setToast((t) => (t && t.id === id ? null : t));
  };

  useEffect(() => {
    return () => clearToastTimer();
  }, []);

  const esAusente = (nombre) =>
    typeof nombre === "string" && nombre.trim().toUpperCase() === "AUSENTE";

  const fetchJSON = async (url, opts) => {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.exito === false) throw new Error(data?.mensaje || "Error");
    return data;
  };

  const cargarCupos = async () => {
    try {
      const { especialidades: esp } = await fetchJSON(
        `${BASE_URL}/api.php?action=obtener_cupos_actuales`
      );
      const normalizado = (esp || []).map((e) => ({
        id: Number(e.id_especialidad),
        nombre: String(e.especialidad),
        cupo: e.cupo === null ? 0 : Number(e.cupo),
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
        `${BASE_URL}/api.php?action=obtener_alumnos&order=alumno&dir=ASC&limit=500`
      );
      const norm = (rows || []).map((r) => ({
        id_alumno: Number(r.id_alumno),
        dni: String(r.dni ?? ""),
        alumno: String(r.alumno ?? "").toUpperCase(),
        promedio: r.promedio == null ? null : Number(r.promedio),
        matprev: Number(r.matprev ?? 0),
        matpend: Number(r.matpend ?? 0),
        repite: String(r.repite ?? "no"),
        sanciones: Number(r.sanciones ?? 0),
        rendir: Number(r.rendir ?? 0),
        inasistencias: Number(r.inasistencias ?? 0),
        observaciones: r.observaciones ?? null,
        id_especialidad: r.id_especialidad === null ? null : Number(r.id_especialidad),
        especialidad: r.especialidad ?? null,
      }));
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

  const onChangeSelect = (idAlumno, value) => {
    setSeleccion((prev) => ({ ...prev, [idAlumno]: value }));
  };

  const onConfirmar = async (row) => {
    try {
      const idEspecialidad = Number(
        seleccion[row.id_alumno] ?? row.id_especialidad ?? 0
      );
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

  const onLimpiarTabla = async () => {
    setClearError("");
    setClearLoading(true);
    try {
      const j = await fetchJSON(`${BASE_URL}/api.php?action=reset_elecciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmar: true }),
      });
      setOpenClear(false);
      showToast("exito", j?.mensaje || "Tabla limpiada y cupos reiniciados.");
      await cargarAlumnos();
      await cargarCupos();
    } catch (e) {
      setClearError(e.message || "No se pudo limpiar la tabla.");
      showToast("error", e.message || "No se pudo limpiar la tabla.");
    } finally {
      setClearLoading(false);
    }
  };

  // ====== Estado y handlers del Modo Pantalla ======
  const [openPresent, setOpenPresent] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const abrirModoPantalla = (desde = 0) => {
    setStartIndex(desde);
    setOpenPresent(true);
  };

  if (loading) {
    return (
      <div className="eleccion-page">
        <h2>Elección de la Especialidad</h2>
        <p className="loading-text">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="eleccion-page">
      <h1 className="title">Elección de la Especialidad</h1>

      <div className="actions">
        <button type="button" onClick={() => setOpenModal(true)} className="btn btn-accent">
          Importar alumnos
        </button>

        <button
          type="button"
          onClick={() => { setClearError(""); setOpenClear(true); }}
          className="btn btn-danger"
        >
          Limpiar tabla
        </button>

        <button
          type="button"
          onClick={() => abrirModoPantalla(0)}                      // 👈 NUEVO
          className="btn btn-primary"
          title="Mostrar en pantalla 1 alumno por vez (Enter confirma, ← → navegan)"
        >
          Modo Pantalla
        </button>

        <button type="button" onClick={() => navigate("/panel")} className="btn btn-neutral">
          Volver al Dashboard
        </button>
      </div>

      {/* Tarjetas de CUPOS */}
      <div className="cupos-grid">
        {especialidades.map((e) => {
          const disponibles = Number(e.cupos_actuales || 0);
          const aus = esAusente(e.nombre);
          const agotado = disponibles <= 0 && !aus;

          return (
            <div
              key={e.id}
              className={`cupo-card ${agotado ? "cupo-agotado" : ""}`}
            >
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

      {/* Tabla de alumnos */}
      <div className="table-wrapper">
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
                const value = seleccion[row.id_alumno] ?? (row.id_especialidad ?? "");

                const espSel = especialidades.find((esp) => esp.id === Number(value));
                const sinCupo =
                  espSel && !esAusente(espSel.nombre) && Number(espSel.cupos_actuales || 0) <= 0;

                return (
                  <tr
                    key={row.id_alumno}
                    className={sinCupo && !inscripto ? "tr-sin-cupo" : ""}
                  >
                    <td>{idx + 1}</td>

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
                              value={esp.id}
                              disabled={bloqueada && !inscripto}
                            >
                              {esp.nombre}
                            </option>
                          );
                        })}
                      </select>

                      {sinCupo && !inscripto && (
                        <div className="sin-cupo-warning">
                          ⚠ Sin cupo disponible
                        </div>
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

                        {/* Atajo: abrir Modo Pantalla desde este alumno */}
                        <button
                          type="button"
                          className="btn btn-primary-outline"
                          onClick={() => abrirModoPantalla(idx)}
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

      {/* Modal de importación */}
      {openModal && (
        <ModalImportar
          onClose={() => setOpenModal(false)}
          onDone={async (msg) => {
            setOpenModal(false);
            showToast("exito", msg || "Importación finalizada.");
            await cargarAlumnos();
            await cargarCupos();
          }}
          onError={(m) => {
            showToast("error", m || "Error al importar.");
          }}
          uploadUrl={`${BASE_URL}/api.php?action=alumnos_import_json`}
        />
      )}

      {/* Modal de limpiar tabla */}
      <ModalConfirmarLimpiar
        open={openClear}
        onClose={() => setOpenClear(false)}
        onConfirm={onLimpiarTabla}
        loading={clearLoading}
        error={clearError}
      />

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

      {/* Toast */}
      {toast && (
        <Toast
          key={toast.id}
          tipo={toast.tipo}
          mensaje={toast.mensaje}
          duracion={toast.duracion}
          onClose={() => handleToastClose(toast.id)}
        />
      )}
    </div>
  );
};

export default Eleccion;
