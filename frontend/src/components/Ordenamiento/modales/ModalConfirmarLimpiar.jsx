// src/components/Ordenar/modales/ModalConfirmarLimpiar.jsx
import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import "../../Principal/principal.css"; // asegúrate de importar donde estén las clases modalprincipal-*
import OpcionHistorial from "../../Historial/OpcionHistorial";

const ModalConfirmarLimpiar = ({ open, onClose, onConfirm, loading, error }) => {
  const cancelBtnRef = useRef(null);
  // "Guardar historial" viene marcado por defecto
  const [guardarHistorial, setGuardarHistorial] = useState(true);
  const [tituloHistorial, setTituloHistorial] = useState("");

  useEffect(() => {
    if (open) {
      setGuardarHistorial(true);
      setTituloHistorial("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    cancelBtnRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="modalprincipal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalprincipal-title-limpiar"
      onMouseDown={onClose}
    >
      <div
        className="modalprincipal-container modalprincipal--danger"
        onMouseDown={stop}
      >
        <div className="modalprincipal__icon" aria-hidden="true">
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </div>

        <h3
          id="modalprincipal-title-limpiar"
          className="modalprincipal-title"
        >
          Confirmar limpieza total de datos
        </h3>

        <p className="modalprincipal-text">
          Esta acción{" "}
          <span className="danger-strong">
            eliminará TODOS los registros de <code>eleccion</code> y{" "}
            <code>alumnos</code>
          </span>
          , y además{" "}
          <span className="danger-strong">
            reiniciará los <code>cupos_actuales</code>
          </span>{" "}
          de cada especialidad al valor de <code>cupo</code>.
          <br />
          Una vez realizada, la operación es{" "}
          <strong>irreversible</strong>.
        </p>

        <OpcionHistorial
          checked={guardarHistorial}
          onChange={setGuardarHistorial}
          titulo={tituloHistorial}
          onTituloChange={setTituloHistorial}
          disabled={loading}
        />

        {error && (
          <div
            style={{
              background: "var(--danger-50)",
              border: "1px solid var(--danger-200)",
              color: "var(--danger-700)",
              padding: "10px 12px",
              borderRadius: "12px",
              margin: "0 0 18px",
              fontWeight: 500,
              fontSize: "0.92rem",
            }}
          >
            {error}
          </div>
        )}

        <div className="modalprincipal-buttons">
          <button
            type="button"
            className="modalprincipal-btn modalprincipal-btn--ghost"
            onClick={onClose}
            disabled={loading}
            ref={cancelBtnRef}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="modalprincipal-btn modalprincipal-btn--solid-danger"
            onClick={() =>
              onConfirm({ guardarHistorial, titulo: tituloHistorial.trim() })
            }
            disabled={loading}
          >
            {loading
              ? "Eliminando..."
              : guardarHistorial
              ? "Guardar y limpiar"
              : "Sí, limpiar todo"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmarLimpiar;
