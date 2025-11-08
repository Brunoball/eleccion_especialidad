// src/components/Ordenamiento/modales/ModalCriterios.jsx
import React, { useEffect, useRef } from "react";
import "./ModalCriterios.css";
import { CRITERIA, CRITERIA_COLORS } from "../criterios";

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
              const bg = CRITERIA_COLORS?.[id]; // mantiene los colores indicadores
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
