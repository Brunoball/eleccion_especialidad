import React, { useEffect, useRef } from "react";

const ModalConfirmarLimpiar = ({ open, onClose, onConfirm, loading, error }) => {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    cancelBtnRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const stop = (e) => e.stopPropagation();

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={stop}
        style={{
          width: "min(520px, 92vw)",
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 12px 30px rgba(0,0,0,.35)",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#b42318" }}>
          Confirmar limpieza de tabla
        </h2>
        <p style={{ lineHeight: 1.45 }}>
          Esto <strong>eliminará TODOS los registros</strong> de
          <code> eleccion</code> y además <strong>reiniciará</strong> los{" "}
          <code>cupos_actuales</code> de cada especialidad al valor de{" "}
          <code>cupo</code>.
        </p>
        <p style={{ marginTop: 8 }}>
          La acción es <strong>irreversible</strong>. ¿Deseás continuar?
        </p>

        {error ? (
          <div
            style={{
              background: "#ffe6e3",
              border: "1px solid #ffb4ab",
              color: "#7a271a",
              padding: "8px 10px",
              borderRadius: 8,
              marginTop: 8,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button
            ref={cancelBtnRef}
            disabled={loading}
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Cancelar
          </button>
          <button
            disabled={loading}
            onClick={onConfirm}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#d92d20",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 800,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Eliminando..." : "Sí, limpiar todo"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmarLimpiar;
