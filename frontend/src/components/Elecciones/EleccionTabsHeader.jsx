import React from "react";

const btnBase = {
  padding: "10px 16px",
  border: "1px solid #e4a74d",
  background: "#fff7da",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
  transition: "all .2s",
};

export default function EleccionTabsHeader({ activeTab, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={() => onChange("eleccion")}
        style={{
          ...btnBase,
          background: activeTab === "eleccion" ? "#f7cf6d" : "#fff7da",
          boxShadow: activeTab === "eleccion" ? "0 2px 0 #e4a74d inset" : "none",
        }}
        title="Asignar especialidades"
      >
        Elección
      </button>

      <button
        onClick={() => onChange("resultados")}
        style={{
          ...btnBase,
          background: activeTab === "resultados" ? "#f7cf6d" : "#fff7da",
          boxShadow: activeTab === "resultados" ? "0 2px 0 #e4a74d inset" : "none",
        }}
        title="Ver resultados / exportar"
      >
        Resultados
      </button>
    </div>
  );
}
