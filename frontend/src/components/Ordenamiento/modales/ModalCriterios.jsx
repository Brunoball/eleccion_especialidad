// src/components/Ordenamiento/modales/ModalCriterios.jsx
import React, { useEffect, useRef } from "react";
import "./ModalCriterios.css";
import { CRITERIA, CRITERIA_COLORS } from "../criterios";

export default function ModalCriterios({ open, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => e.key === "Escape" && onClose && onClose();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const onOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose && onClose();
  };

  return (
    <div className="crit-overlay" ref={overlayRef} onMouseDown={onOverlayClick}>
      <div className="crit-modal" role="dialog" aria-modal="true" aria-label="Criterios de ordenamiento">
        <div className="crit-header">
          <h3>CRITERIOS DE ORDENAMIENTO</h3>
          <button className="crit-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="crit-table-wrap">
          <table className="crit-table">
            <tbody>
              {CRITERIA.map((label, i) => {
                const id = i + 1;
                return (
                  <tr key={id} style={{ background: CRITERIA_COLORS[id] }}>
                    <td className="num">{id}</td>
                    <td className="label">{label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="crit-footer">
          <button className="crit-btn" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>
  );
}
