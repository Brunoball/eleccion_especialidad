// src/components/Ordenamiento/modales/ModalCriterios.jsx
import React, { useEffect, useRef } from "react";
import "./ModalCriterios.css";

// ======== NUEVOS CRITERIOS (agregado #15) ========
export const CRITERIA = [
  "Apellido y Nombre",
  "DNI",
  "Promedio 1° Año",
  "Coloquios 1° Año",
  "Repite 1° Año",
  "Inasistencias 1° Año",
  "Amonestaciones 1° Año",
  "Observaciones 1° Año",
  "Promedio 1° ET",
  "Adeudadas 1° ET",
  "Tercera Materia",
  "Previas 1° ET",
  "Repite 2° Año",
  "Inasistencias 1° ET",
  // === NUEVO CRITERIO ===
  "Promedios de 1° Año."
];

// ======== COLORES (agregado color 15) ========
export const CRITERIA_COLORS = {
  1: "#f6d5d5",
  2: "#ffe4c4",
  3: "#fff7b0",
  4: "#e2f7c5",
  5: "#c8f7e4",
  6: "#cbe9ff",
  7: "#d5d0ff",
  8: "#f6d5fa",
  9: "#ffd9ec",
  10: "#ffefcf",
  11: "#e2ffc7",
  12: "#c7ffe8",
  13: "#c7ebff",
  14: "#e4d7ff",

  // === NUEVO COLOR PARA EL CRITERIO 15 ===
  15: "#ffe2f0"
};

export default function ModalCriterios({ open, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current && onClose) onClose();
  };

  return (
    <div
      className="crit-overlay"
      ref={overlayRef}
      onMouseDown={handleOverlayClick}
    >
      <div
        className="crit-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Criterios de ordenamiento"
      >
        <div className="crit-header">
          <h3>CRITERIOS DE ORDENAMIENTO</h3>
          <button
            className="crit-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="crit-table-wrap">
          <div className="crit-list">
            {CRITERIA.map((label, i) => {
              const id = i + 1;
              const bg = CRITERIA_COLORS?.[id];
              return (
                <div
                  key={id}
                  className={`crit-row row-${id}`}
                  style={bg ? { background: bg } : {}}
                >
                  <div className="num">{id}</div>
                  <div className="label">{label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="crit-footer">
          <button className="crit-btn" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
