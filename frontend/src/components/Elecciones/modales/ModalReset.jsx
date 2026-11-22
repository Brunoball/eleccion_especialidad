// frontend/src/components/Eleccion/modales/ModalReset.jsx
import React, { useState, useEffect } from "react";
import OpcionHistorial from "../../Historial/OpcionHistorial";
import "./ModalReset.css";

export default function ModalReset({ open, onClose, onConfirm, loading, cantidad = null }) {
  const [segundaConfirmacion, setSegundaConfirmacion] = useState(false);
  // "Guardar historial" viene marcado por defecto
  const [guardarHistorial, setGuardarHistorial] = useState(true);
  const [tituloHistorial, setTituloHistorial] = useState("");

  // Cada vez que se abre/cierra desde afuera, reseteamos el paso y la opción
  useEffect(() => {
    if (!open) {
      setSegundaConfirmacion(false);
      setGuardarHistorial(true);
      setTituloHistorial("");
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
    onConfirm({ guardarHistorial, titulo: tituloHistorial.trim() });
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
            </p>

            <OpcionHistorial
              checked={guardarHistorial}
              onChange={setGuardarHistorial}
              titulo={tituloHistorial}
              onTituloChange={setTituloHistorial}
              disabled={loading}
              cantidad={cantidad}
            />

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
            {guardarHistorial ? (
              <p className="modal-reset-text">
                Primero se va a <strong>guardar la elección en el historial</strong>{" "}
                y después se eliminarán <strong>TODAS</strong> las inscripciones
                de especialidad.
                <br />
                <br />
                ¿Confirmás el reseteo?
              </p>
            ) : (
              <p className="modal-reset-text">
                <strong>No se guardará historial.</strong> Esta acción es{" "}
                <strong>irreversible</strong> y eliminará{" "}
                <strong>TODAS</strong> las inscripciones de especialidad.
                <br />
                <br />
                ¿Realmente querés borrar todo?
              </p>
            )}

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
