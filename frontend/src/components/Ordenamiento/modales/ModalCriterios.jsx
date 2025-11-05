// src/components/Ordenamiento/modales/ModalCriterios.jsx
import React, { useEffect, useRef } from "react";
import "./ModalCriterios.css";

const DATA = [
  "Sin Trayectoria en el Establecimiento",
  "Amonestaciones 2° Año",
  "Amonestaciones 1° Año",
  "Observaciones 2° Año",
  "Observaciones 1° Año",
  "Repitente de 2° Año",
  "Repitente de 1° Año",
  "Tercera Materia",
  "Previas 1° Etapa 2025",
  "Materias adeudadas 1° Etapa 2025",
  "Materias a coloquio 1° Año",
  "Faltas Injustificadas 1° Etapa 2025",
  "Faltas Injustificadas 1° Año",
  "Promedio Final",
];

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
              {DATA.map((label, i) => (
                <tr key={i} className={`row-${i + 1}`}>
                  <td className="num">{i + 1}</td>
                  <td className="label">{label}</td>
                </tr>
              ))}
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
