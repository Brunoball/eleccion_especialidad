// frontend/src/components/Eleccion/PestanaEleccion.jsx
import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useNavigate } from "react-router-dom";
import ModalPantalla from "./modales/ModalPantalla";
import "./Eleccion.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

function PestanaEleccionInner({ BASE_URL, fetchJSON, showToast }, ref) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [especialidades, setEspecialidades] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);
  const [seleccion, setSeleccion] = useState({}); // { [id_alumno]: "id_especialidad" }

  const [openPresent, setOpenPresent] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const esAusente = (nombre) =>
    typeof nombre === "string" &&
    nombre.trim().toUpperCase() === "AUSENTE";

  const getNombreEspecialidad = (id) => {
    if (id == null) return null;
    const esp = especialidades.find((e) => e.id === Number(id));
    return esp ? esp.nombre : null;
  };

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
      const { data: rows } = await fetchJSON(
        `${BASE_URL}/api.php?action=eleccion_alumnos`
      );

      const norm = (rows || []).map((r) => {
        const idEsp =
          r.id_especialidad == null ? null : Number(r.id_especialidad);
        return {
          id_alumno: Number(r.id_alumno),
          alumno: String(r.alumno ?? "").toUpperCase(),
          orden: r.orden == null ? null : Number(r.orden),
          id_especialidad: idEsp,
          especialidad: getNombreEspecialidad(idEsp),
          confirmado: Boolean(r.confirmado ?? false),

          // Campos legacy reservados
          dni: "",
          promedio_final: null,
          previas_1et: 0,
          adeudadas_1et: 0,
          coloquios_1a: 0,
          repite_1a: "no",
          repite_2a: 0,
          amonestaciones_1a: 0,
          amonestaciones_2a: 0,
          inasistencias_1et: 0,
          inasistencias_1a: 0,
          observaciones_1a: null,
          observaciones_2a: null,
          sin_trayectoria: 0,
          tercera_materia: 0,
        };
      });

      // Fallback local
      norm.sort((a, b) => {
        const ao = a.orden ?? Number.POSITIVE_INFINITY;
        const bo = b.orden ?? Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        return a.id_alumno - b.id_alumno;
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

  const onChangeSelect = (idAlumno, valueStr) => {
    setSeleccion((prev) => ({
      ...prev,
      [idAlumno]: String(valueStr || ""),
    }));
  };

  const onConfirmar = async (row) => {
    try {
      const selectedStr =
        seleccion[row.id_alumno] ??
        (row.id_especialidad != null ? String(row.id_especialidad) : "");
      const idEspecialidad = Number(selectedStr || 0);

      if (!idEspecialidad) {
        showToast(
          "advertencia",
          "Seleccioná una especialidad antes de confirmar."
        );
        return;
      }

      const espElegida = especialidades.find(
        (esp) => esp.id === idEspecialidad
      );

      if (espElegida && !esAusente(espElegida.nombre)) {
        const disponibles = Number(espElegida.cupos_actuales || 0);
        if (disponibles <= 0) {
          showToast(
            "error",
            `No hay cupo disponible en ${espElegida.nombre}.`
          );
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
        `Registrado: ${row.alumno} en ${
          espElegida?.nombre || "especialidad"
        }.`
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

  // ===== Modo Pantalla =====
  const abrirModoPantalla = (desde = 0) => {
    setStartIndex(desde);
    setOpenPresent(true);
  };

  useImperativeHandle(ref, () => ({
    abrirModoPantallaDesde: (indice = 0) => abrirModoPantalla(indice),
    irDashboard: () => navigate("/panel"),
  }));

  const materiasNormales = especialidades.filter((e) => !esAusente(e.nombre));
  const ausenteObj = especialidades.find((e) => esAusente(e.nombre));
  const ausenteCount = Number(ausenteObj?.cupos_actuales || 0);

  const tablaLoading = loading || loadingAlumnos;
  const sinAlumnos = !tablaLoading && alumnos.length === 0;

  return (
    <>
      {/* Mini grilla de materias */}
      <h3 className="cupos-titulo" style={{ marginTop: 0 }}>
        Materias
      </h3>

      <div className="materias-grid-6">
        {materiasNormales.map((m) => {
          const disp = Number(m.cupos_actuales || 0);
          return (
            <button
              key={m.id}
              type="button"
              className="materia-card-mini"
              title={m.nombre}
            >
              <div className="materia-title">{m.nombre}</div>
              <div className="materia-meta">
                <span className={`dot ${disp > 0 ? "ok" : "no"}`} />
                <span className="count">
                  Disponibles: <b>{disp}</b>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* AUSENTE mini pill */}
      <div className="ausente-row">
        <div
          className="ausente-pill"
          title="Registro de AUSENTES (no consume cupo)"
        >
          <span className="pill-label">AUSENTES</span>
          <span className="pill-count">{ausenteCount}</span>
        </div>
      </div>

      {/* GRID de alumnos */}
      <div className="grid-wrapper grid-appear">
        {/* Header fijo */}
        <div className="grid-header grid-row">
          <div className="cell col-orden">ORDEN</div>
          <div className="cell col-alumno">ALUMNO</div>
          <div className="cell col-insc">INSCRIPCIÓN</div>
          <div className="cell col-esp">ESPECIALIDAD</div>
          <div className="cell col-acc">ACCIÓN</div>
        </div>

        {/* Body con mensaje centrado tipo "sin resultados" */}
        <div
          className={
            "grid-body" +
            ((tablaLoading || sinAlumnos) ? " grid-body-fixed" : "")
          }
        >
          {tablaLoading ? (
            <div className="grid-empty">
              <div className="grid-empty-icon grid-empty-spinner" />
              <div className="grid-empty-title">Cargando alumnos</div>
              <div className="grid-empty-sub">
                Obteniendo el listado, por favor esperá…
              </div>
            </div>
          ) : sinAlumnos ? (
            <div className="grid-empty">
              <i className="fa-regular fa-circle-xmark res-empty-icon" />
              <div className="grid-empty-title">Sin alumnos cargados</div>
              <div className="grid-empty-sub">
                No hay registros para mostrar con la configuración actual.
              </div>
            </div>
          ) : (
            alumnos.map((row, idx) => {
              const inscripto = row.id_especialidad !== null;

              const rawSel = seleccion[row.id_alumno];
              const rawDb =
                row.id_especialidad != null
                  ? String(row.id_especialidad)
                  : "";
              const value = String(rawSel ?? rawDb ?? "");

              const espSel = especialidades.find(
                (esp) => String(esp.id) === (value || "")
              );

              const sinCupo =
                espSel &&
                !esAusente(espSel.nombre) &&
                Number(espSel.cupos_actuales || 0) <= 0;

              const stripeClass = idx % 2 === 0 ? "row-impar" : "row-par";

              const nombreInscripcion = inscripto
                ? getNombreEspecialidad(row.id_especialidad) || "Inscripto"
                : null;

              const esAusenteTag =
                nombreInscripcion && esAusente(nombreInscripcion);

              return (
                <div
                  key={row.id_alumno}
                  className={
                    "grid-row " +
                    stripeClass +
                    (sinCupo && !inscripto ? " row-sin-cupo" : "")
                  }
                >
                  {/* Orden */}
                  <div className="cell col-orden">
                    {row.orden ?? idx + 1}
                  </div>

                  {/* Alumno */}
                  <div className="cell col-alumno">
                    <div className="alumno-nombre">{row.alumno}</div>
                  </div>

                  {/* Inscripción */}
                  <div className="cell col-insc">
                    {inscripto ? (
                      <span
                        className={
                          "tag-insc " +
                          (esAusenteTag ? "tag-ausente" : "tag-ok")
                        }
                      >
                        {nombreInscripcion}
                      </span>
                    ) : (
                      <span className="tag-insc tag-pendiente">
                        Sin inscripción
                      </span>
                    )}
                  </div>

                  {/* Select Especialidad */}
                  <div className="cell col-esp">
                    <div className="select-wrap">
                      <select
                        value={value}
                        onChange={(e) =>
                          onChangeSelect(row.id_alumno, e.target.value)
                        }
                        disabled={inscripto}
                        className={
                          "select " +
                          (sinCupo && !inscripto ? "select-sin-cupo" : "")
                        }
                      >
                        <option value="">— Seleccionar —</option>
                        {especialidades.map((esp) => {
                          const disp = Number(esp.cupos_actuales || 0);
                          const bloqueada =
                            disp <= 0 && !esAusente(esp.nombre);

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
                        <div className="sin-cupo-warning">
                          ⚠ Sin cupo disponible
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="cell col-acc">
                    <div className="acciones">
                      {!inscripto && (
                        <button
                          type="button"
                          className={
                            "btns " +
                            (sinCupo ? "btn-disabled" : "btn-accent")
                          }
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
                        onClick={() => {
                          setStartIndex(idx);
                          setOpenPresent(true);
                        }}
                        title="Abrir Modo Pantalla desde este alumno"
                      >
                        Pantalla
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
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

export default forwardRef(PestanaEleccionInner);
