// frontend/src/components/Eleccion/modales/ModalReset.jsx
import React, { useState } from "react";

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modalStyle = {
  background: "#ffffff",
  borderRadius: 12,
  padding: "24px 28px",
  maxWidth: 420,
  width: "90%",
  boxShadow: "0 12px 30px rgba(0,0,0,.25)",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const titleStyle = {
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 8,
};

const textStyle = {
  fontSize: 14,
  lineHeight: 1.5,
  color: "#444",
  marginBottom: 18,
};

const actionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const btnBase = {
  padding: "8px 14px",
  borderRadius: 999,
  border: "none",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const btnCancel = {
  ...btnBase,
  background: "#e5e7eb",
  color: "#111827",
};

const btnDanger = {
  ...btnBase,
  background: "#dc2626",
  color: "#ffffff",
};

export default function ModalReset({ open, onClose, onConfirm, loading }) {
  const [segundaConfirmacion, setSegundaConfirmacion] = useState(false);

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
      setSegundaConfirmacion(false);
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
    <div style={backdropStyle} onClick={handleBackdropClick}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {!segundaConfirmacion ? (
          <>
            <h2 style={titleStyle}>Resetear elección</h2>
            <p style={textStyle}>
              Esto va a <strong>eliminar todas las inscripciones</strong> de
              especialidad y dejar la tabla vacía.
              <br />
              ¿Seguro que querés continuar?
            </p>

            <div style={actionsStyle}>
              <button
                type="button"
                style={btnCancel}
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={btnDanger}
                onClick={handlePrimerConfirm}
                disabled={loading}
              >
                {loading ? "Reseteando..." : "Sí, resetear todo"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={titleStyle}>Confirmación final</h2>
            <p style={textStyle}>
              Esta acción es <strong>irreversible</strong> y eliminará
              <br />
              <strong>TODAS</strong> las inscripciones de especialidad.
              <br />
              <br />
              ¿Realmente querés borrar todo?
            </p>

            <div style={actionsStyle}>
              <button
                type="button"
                style={btnCancel}
                onClick={handleCancel}
                disabled={loading}
              >
                No, volver
              </button>
              <button
                type="button"
                style={btnDanger}
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
