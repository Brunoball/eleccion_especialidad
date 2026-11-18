// frontend/src/components/Eleccion/modales/ModalReset.jsx
import React, { useState, useEffect } from "react";
import "./ModalReset.css";

export default function ModalReset({ open, onClose, onConfirm, loading }) {
  const [segundaConfirmacion, setSegundaConfirmacion] = useState(false);

  // Cada vez que se abre/cierra desde afuera, reseteamos el paso
  useEffect(() => {
    if (!open) {
      setSegundaConfirmacion(false);
    }
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      setSegundaConfirmacion(false);
      onClose();
    }
  };

  const handlePrimerConfirm = () => {
    setSegundaConfirmacion(true);
  };

  const handleSegundaConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (segundaConfirmacion) {
      setSegundaConfirmacion(false); // vuelve al primer paso
    } else {
      onClose(); // cierra modal
    }
  };

  return (
    <div className="modal-reset-backdrop" onClick={handleBackdropClick}>
      <div
        className="modal-reset-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-reset-icon-wrapper">
          <div className="modal-reset-icon-circle">!</div>
        </div>

        {!segundaConfirmacion ? (
          <>
            <h2 className="modal-reset-title modal-reset-title-danger">
              Resetear elección
            </h2>
            <p className="modal-reset-text">
              Esto va a{" "}
              <strong>eliminar todas las inscripciones</strong> de
              especialidad y dejar la tabla vacía.
              <br />
              <br />
              ¿Seguro que querés continuar?
            </p>

            <div className="modal-reset-actions">
              <button
                type="button"
                className="modal-reset-btn modal-reset-btn-cancel"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="modal-reset-btn modal-reset-btn-danger"
                onClick={handlePrimerConfirm}
                disabled={loading}
              >
                {loading ? "Reseteando..." : "Sí, resetear todo"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="modal-reset-title modal-reset-title-danger">
              Confirmación final
            </h2>
            <p className="modal-reset-text">
              Esta acción es <strong>irreversible</strong> y eliminará
              <br />
              <strong>TODAS</strong> las inscripciones de especialidad.
              <br />
              <br />
              ¿Realmente querés borrar todo?
            </p>

            <div className="modal-reset-actions">
              <button
                type="button"
                className="modal-reset-btn modal-reset-btn-cancel"
                onClick={handleCancel}
                disabled={loading}
              >
                No, volver
              </button>
              <button
                type="button"
                className="modal-reset-btn modal-reset-btn-danger"
                onClick={handleSegundaConfirm}
                disabled={loading}
              >
                {loading ? "Reseteando..." : "Sí, eliminar TODO"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
