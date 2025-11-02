// src/components/Elecciones/Eleccion.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import ModalImportar from "./modales/ModalImportar";

const Eleccion = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [especialidades, setEspecialidades] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [seleccion, setSeleccion] = useState({});

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
    setErr(""); setOk("");
    try {
      const { especialidades: esp } = await fetchJSON(
        `${BASE_URL}/api.php?action=obtener_cupos_actuales`
      );
      const normalizado = (esp || []).map((e) => ({
        id: Number(e.id_especialidad),
        nombre: String(e.especialidad),
        // cupo total (referencial)
        cupo: e.cupo === null ? 0 : Number(e.cupo),
        // 👇 DISPONIBLES (lo que mostrás en la UI)
        cupos_actuales: Number(e.cupos_actuales || 0),
      }));
      setEspecialidades(normalizado);
    } catch (e) {
      console.error(e);
      setErr(e.message || "No se pudieron cargar los cupos.");
      setEspecialidades([]);
    }
  };

  const cargarAlumnos = async () => {
    setLoadingAlumnos(true);
    setErr("");
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
      setErr(e.message || "No se pudieron cargar los alumnos.");
      setAlumnos([]);
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
      const idEspecialidad = Number(seleccion[row.id_alumno] ?? row.id_especialidad ?? 0);
      if (!idEspecialidad) {
        setErr("Seleccioná una especialidad antes de confirmar.");
        return;
      }

      const espElegida = especialidades.find(esp => esp.id === idEspecialidad);
      if (espElegida && !esAusente(espElegida.nombre)) {
        // 👇 BLOQUEAR SI DISPONIBLES LLEGÓ A 0
        const disponibles = Number(espElegida.cupos_actuales || 0);
        if (disponibles <= 0) {
          setErr(`No hay cupo disponible en ${espElegida.nombre}.`);
          return;
        }
      }

      await fetchJSON(`${BASE_URL}/api.php?action=eleccion_confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_alumno: row.id_alumno, id_especialidad: idEspecialidad }),
      });
      setOk(`Registrado: ${row.alumno} en ${espElegida?.nombre || "especialidad"}.`);
      setErr("");
      await cargarAlumnos();
      await cargarCupos();
    } catch (e) {
      console.error(e);
      setErr(e.message || "No se pudo registrar la elección.");
      setOk("");
    }
  };

  const onCancelar = async (row) => {
    try {
      await fetchJSON(`${BASE_URL}/api.php?action=eleccion_cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_alumno: row.id_alumno }),
      });
      setOk(`Se canceló la inscripción de ${row.alumno}.`);
      setErr("");
      await cargarAlumnos();
      await cargarCupos();
    } catch (e) {
      console.error(e);
      setErr(e.message || "No se pudo cancelar la inscripción.");
      setOk("");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Elección de la Especialidad</h2>
        <p>Cargando…</p>
      </div>
    );
  }

  return (
    <div className="eleccion-page" style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 16 }}>Elección de la Especialidad</h1>

      {(err || ok) && (
        <div style={{ margin: "8px 0 16px" }}>
          {err && <div style={{ color: "#b71c1c", fontWeight: 600 }}>{err}</div>}
          {ok && <div style={{ color: "#1b5e20", fontWeight: 600 }}>{ok}</div>}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={async () => { await cargarCupos(); await cargarAlumnos(); setOk("Actualizado."); }}
          style={btn("primary")}
          title="Refrescar cupos y alumnos"
        >
          Refrescar
        </button>

        <button type="button" onClick={() => setOpenModal(true)} style={btn("accent")}>
          Importar alumnos
        </button>

        <button type="button" onClick={() => navigate("/panel")} style={btn("neutral")}>
          Volver al Dashboard
        </button>
      </div>

      {/* Tarjetas de CUPOS */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {especialidades.map((e) => {
          // e.cupos_actuales == DISPONIBLES
          const disponibles = Number(e.cupos_actuales || 0);
          const aus = esAusente(e.nombre);

          return (
            <div
              key={e.id}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                background: "#fff",
                minWidth: 170,
                textAlign: "center",
                border: disponibles <= 0 && !aus ? "2px solid #f44336" : "none",
              }}
            >
              <div style={{ fontWeight: 700 }}>{e.nombre}</div>
              <div style={{ opacity: 0.9, fontSize: "0.95em", marginTop: 4 }}>
                <strong
                  style={{
                    color: disponibles > 0 || aus ? "#2e7d32" : "#f44336",
                    fontSize: "1.1em",
                  }}
                >
                  Disponibles: {disponibles}
                </strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla de alumnos */}
      <div style={{ overflow: "auto", borderTop: "2px solid #d7a15d" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#d7872f", color: "#fff" }}>
              <th style={{ padding: "12px 8px", textAlign: "left", width: 80 }}>Orden</th>
              <th style={{ padding: "12px 8px", textAlign: "left" }}>Alumno</th>
              <th style={{ padding: "12px 8px", textAlign: "center", width: 280 }}>Especialidad</th>
              <th style={{ padding: "12px 8px", textAlign: "center", width: 220 }}>Acción</th>
            </tr>
          </thead>

          <tbody>
            {loadingAlumnos ? (
              <tr>
                <td colSpan={4} style={{ padding: 14, textAlign: "center" }}>
                  Cargando alumnos…
                </td>
              </tr>
            ) : alumnos.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 14, textAlign: "center" }}>
                  No hay alumnos cargados.
                </td>
              </tr>
            ) : (
              alumnos.map((row, idx) => {
                const inscripto = row.id_especialidad !== null;
                const value = seleccion[row.id_alumno] ?? (row.id_especialidad ?? "");

                const espSel = especialidades.find(
                  (esp) => esp.id === Number(value)
                );
                // 👇 SIN CUPO si DISPONIBLES (cupos_actuales) == 0
                const sinCupo =
                  espSel &&
                  !esAusente(espSel.nombre) &&
                  Number(espSel.cupos_actuales || 0) <= 0;

                return (
                  <tr
                    key={row.id_alumno}
                    style={{
                      borderBottom: "1px solid #eee",
                      background: sinCupo && !inscripto ? "#ffebee" : "transparent",
                    }}
                  >
                    <td style={{ padding: "10px 8px" }}>{idx + 1}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <div style={{ fontWeight: 700 }}>{row.alumno}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>DNI: {row.dni}</div>
                      {inscripto && (
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "#e8f5e9",
                              border: "1px solid #c8e6c9",
                            }}
                          >
                            Inscripto: {row.especialidad}
                          </span>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <select
                        value={value}
                        onChange={(e) => onChangeSelect(row.id_alumno, e.target.value)}
                        disabled={inscripto}
                        style={{
                          padding: "8px 10px",
                          minWidth: 220,
                          borderRadius: 8,
                          border: sinCupo ? "2px solid #f44336" : "1px solid #ccc",
                          background: sinCupo ? "#ffebee" : "#fff",
                        }}
                      >
                        <option value="">— Seleccionar —</option>
                        {especialidades.map((esp) => {
                          const disp = Number(esp.cupos_actuales || 0); // 👈 Disponibles reales
                          const bloqueada = disp <= 0 && !esAusente(esp.nombre);

                          return (
                            <option
                              key={esp.id}
                              value={esp.id}
                              disabled={bloqueada && !inscripto}
                              style={{
                                color: bloqueada ? "#999" : "#000",
                                background: bloqueada ? "#f5f5f5" : "#fff",
                              }}
                            >
                              {esp.nombre}
                              {!esAusente(esp.nombre) && ` (Disp: ${Math.max(disp, 0)})`}
                            </option>
                          );
                        })}
                      </select>
                      {sinCupo && !inscripto && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#f44336",
                            marginTop: 4,
                            fontWeight: 600,
                          }}
                        >
                          ⚠ Sin cupo disponible
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        {!inscripto && (
                          <button
                            type="button"
                            style={btn(sinCupo ? "disabled" : "accent")}
                            onClick={() => onConfirmar(row)}
                            disabled={sinCupo}
                          >
                            Confirmar
                          </button>
                        )}
                        {inscripto && (
                          <button
                            type="button"
                            style={btn("neutral")}
                            onClick={() => onCancelar(row)}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {openModal && (
        <ModalImportar
          onClose={() => setOpenModal(false)}
          onDone={async (msg) => {
            setOpenModal(false);
            setOk(msg || "Importación finalizada.");
            setErr("");
            await cargarAlumnos();
            await cargarCupos();
          }}
          onError={(m) => {
            setErr(m || "Error al importar.");
            setOk("");
          }}
          uploadUrl={`${BASE_URL}/api.php?action=alumnos_import_json`}
        />
      )}
    </div>
  );
};

const btn = (variant) => {
  const base = {
    padding: "10px 18px",
    borderRadius: 10,
    fontWeight: 700,
    border: "none",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    cursor: "pointer",
  };
  if (variant === "primary") return { ...base, background: "#e0a86a", color: "#222" };
  if (variant === "accent") return { ...base, background: "#d7872f", color: "#fff" };
  if (variant === "disabled") return { ...base, background: "#bdbdbd", color: "#757575", cursor: "not-allowed" };
  return { ...base, background: "#cfcfcf", color: "#222" };
};

export default Eleccion;
