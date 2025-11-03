import React, { useEffect, useMemo, useState } from "react";
import "./ModalPantalla.css";

/**
 * ModalPantalla (Modo Presentación) SIN desplegable:
 * - Se elige la especialidad clickeando una tarjeta de CUPOS.
 * - Confirmar usa la tarjeta seleccionada.
 * - Toggle de tema (☀️/🌙) en el header.
 */
const ModalPantalla = ({
  open,
  onClose,
  alumnos,
  especialidades,
  seleccion,
  onChangeSelect,
  onConfirmar,
  onCancelar,
  esAusente,
  startIndex = 0,
}) => {
  const [idx, setIdx] = useState(startIndex);
  const [theme, setTheme] = useState("dark"); // "dark" | "light"

  const row = alumnos[idx] || null;
  const total = alumnos.length;

  // valor actual (lo elegido en esta sesión o lo que viene de DB)
  const value = row ? (seleccion[row.id_alumno] ?? (row.id_especialidad ?? "")) : "";

  // estado local para la selección de tarjeta (string|number|"")
  const [selectedId, setSelectedId] = useState(value);

  // bloquear scroll del body mientras está abierto
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // cuando cambie alumno inicial, reseteo selección al valor actual
  useEffect(() => {
    if (open) setIdx(startIndex);
  }, [open, startIndex]);

  // sincronizo selectedId cuando cambia el alumno visible
  useEffect(() => {
    setSelectedId(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, row?.id_alumno, value]);

  // helpers
  const next = () => setIdx((i) => Math.min(i + 1, total - 1));
  const prev = () => setIdx((i) => Math.max(i - 1, 0));

  const espSel = useMemo(
    () => especialidades.find((e) => e.id === Number(selectedId)),
    [especialidades, selectedId]
  );

  const sinCupo =
    espSel &&
    !esAusente(espSel.nombre) &&
    Number(espSel.cupos_actuales || 0) <= 0;

  // atajos de teclado: Esc cierra, ← → navegan, Enter confirma si corresponde
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (!row) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Enter") {
        if (!row.id_especialidad && selectedId && !sinCupo) {
          handleConfirm();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row, selectedId, sinCupo]);

  if (!open) return null;

  const handleCardClick = (esp) => {
    if (!row || row.id_especialidad !== null) return; // ya inscripto, solo cancelar
    const disp = Number(esp.cupos_actuales || 0);
    const bloqueada = disp <= 0 && !esAusente(esp.nombre);
    if (bloqueada) return; // no seleccionable si no hay cupo (excepto AUSENTE)

    setSelectedId(esp.id);
    // además sincronizo con el estado global "seleccion" que usa la tabla
    onChangeSelect(row.id_alumno, String(esp.id));
  };

  const handleConfirm = async () => {
    if (!row) return;
    if (!selectedId || sinCupo) return;

    // garantizo que el estado global tenga el valor elegido
    onChangeSelect(row.id_alumno, String(selectedId));

    await onConfirmar(row); // refresca alumnos + cupos en el padre
    next();
  };

  const handleCancel = async () => {
    if (!row) return;
    await onCancelar(row);
    next();
  };

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <div className="present-overlay" role="dialog" aria-modal="true">
      <div
        className={[
          "present-container",
          theme === "light" ? "theme-light" : "theme-dark",
        ].join(" ")}
      >
        {/* Header */}
        <div className="present-header">
          <h2>Elección de la Especialidad</h2>

          <div className="present-header-actions">
            {/* Botón de tema: sol/luna */}
            <button
              className="present-theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
              title={theme === "light" ? "Modo oscuro" : "Modo claro"}
            >
              {theme === "light" ? (
                /* Luna */
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path
                    d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79Z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                /* Sol */
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path
                    d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.8 1.42-1.42zm10.48 0l1.79-1.8-1.41-1.41-1.8 1.79 1.42 1.42zM12 4V1h-0v3h0zm0 19v-3h0v3h0zM4 12H1v0h3v0zm19 0h-3v0h3v0zM6.76 19.16l-1.42 1.42-1.79-1.8 1.41-1.41 1.8 1.79zm11.48-1.79l1.8 1.79 1.41-1.41-1.79-1.8-1.42 1.42zM12 8a4 4 0 100 8 4 4 0 000-8z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>

            <button className="present-close" onClick={onClose} aria-label="Cerrar">×</button>
          </div>
        </div>

        {/* Cupos arriba (tarjetas clickeables) */}
        <div className="present-cupos">
          {especialidades.map((e) => {
            const disp = Number(e.cupos_actuales || 0);
            const aus = esAusente(e.nombre);
            const low = disp > 0 && disp <= 5 && !aus;     // <= 5 → amarillo
            const agotado = disp === 0 && !aus;            // 0 → rojo
            const selected = Number(selectedId) === e.id;

            // bloqueo de click si está agotado (y no es AUSENTE) o si alumno ya inscripto
            const bloqueada = (agotado && !aus) || (row?.id_especialidad !== null);

            const countClass = agotado ? "no" : (low ? "low" : "ok");

            return (
              <button
                key={e.id}
                type="button"
                className={[
                  "present-cupo-card",
                  low ? "low" : "",
                  agotado ? "agotado" : "",
                  selected ? "selected" : "",
                  bloqueada ? "disabled" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => handleCardClick(e)}
                disabled={bloqueada}
                title={bloqueada ? "Sin cupo o alumno ya inscripto" : "Seleccionar"}
              >
                <div className="present-cupo-nombre">{e.nombre}</div>
                <div className="present-cupo-disp">
                  Disponibles: <strong className={countClass}>{disp}</strong>
                </div>
              </button>
            );
          })}
        </div>

        {/* Cuerpo principal */}
        <div className="present-body">
          {!row ? (
            <div className="present-empty">Sin alumnos disponibles.</div>
          ) : (
            <>
              <div className="present-alumno">
                <div className="present-order">
                  Alumno {idx + 1} de {total}
                </div>
                <div className="present-name">{row.alumno}</div>
                {row.id_especialidad !== null && (
                  <div className="present-inscripto">Inscripto: {row.especialidad}</div>
                )}
              </div>

              {/* Acciones */}
              <div className="present-actions">
                <button
                  type="button"
                  className="present-nav"
                  onClick={prev}
                  disabled={idx === 0}
                >
                  ← Anterior
                </button>

                {row.id_especialidad === null ? (
                  <button
                    type="button"
                    className={`present-confirm ${(!selectedId || sinCupo) ? "disabled" : ""}`}
                    onClick={handleConfirm}
                    disabled={!selectedId || sinCupo}
                    title={!selectedId ? "Elegí una especialidad" : "Enter"}
                  >
                    Confirmar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="present-cancel"
                    onClick={handleCancel}
                    title="Enter"
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="button"
                  className="present-nav"
                  onClick={next}
                  disabled={idx >= total - 1}
                >
                  Siguiente →
                </button>
              </div>

              {/* Mensajito de sin cupo */}
              {sinCupo && row.id_especialidad === null && (
                <div className="present-warning">⚠ Sin cupo disponible en la especialidad elegida</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalPantalla;
