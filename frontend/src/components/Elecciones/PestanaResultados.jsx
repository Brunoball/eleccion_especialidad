import React, { useCallback, useEffect, useState } from "react";

export default function PestanaResultados({ BASE_URL, fetchJSON, showToast }) {
  const [filas, setFilas] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [filtro, setFiltro] = useState("todas");

  const fetchAll = useCallback(async () => {
    try {
      const jElec = await fetchJSON(`${BASE_URL}/api.php?action=obtener_elecciones`);
      setFilas(jElec?.data || []);

      const jList = await fetchJSON(`${BASE_URL}/api.php?action=obtener_listas`);
      if (Array.isArray(jList?.especialidad)) {
        setEspecialidades(jList.especialidad);
      } else {
        throw new Error(jList?.mensaje || "No se pudieron cargar las especialidades.");
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
      showToast("error", err.message || "No se pudo cargar la tabla.");
    }
  }, [BASE_URL, fetchJSON, showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const visibles =
    filtro === "todas"
      ? filas
      : filas.filter(
          (f) => (f.especialidad || "").toLowerCase() === filtro.toLowerCase()
        );

  const exportarExcel = () => {
    try {
      const SEP = ";";
      const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const header = ["Orden", "Alumno", "DNI", "Especialidad"];
      const rows = visibles.map((f) => [
        f.orden,
        (f.nombre || "").toUpperCase(),
        f.dni || "",
        f.especialidad || "",
      ]);
      const csv =
        "\uFEFF" + [header, ...rows].map((row) => row.map(quote).join(SEP)).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "eleccion_especialidad.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("exito", "Exportación generada correctamente.");
    } catch (e) {
      console.error(e);
      showToast("error", "No se pudo exportar el archivo.");
    }
  };

  const th = {
    padding: "12px 8px",
    textAlign: "left",
    fontWeight: 700,
    borderBottom: "2px solid #e4a74d",
  };
  const td = {
    padding: "10px 8px",
    borderBottom: "1px solid #e4a74d",
    fontWeight: 600,
  };

  return (
    <div style={{ padding: 12, backgroundColor: "#fff8c6", borderRadius: 12 }}>
      {/* Filtros + Acciones */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{
            padding: "10px 15px",
            borderRadius: 8,
            fontWeight: 600,
            background: "#fff3d2",
            border: "1px solid #d7872f",
            minWidth: 260,
          }}
        >
          <option value="todas">Todas las especialidades</option>
          {especialidades.map((esp) => (
            <option key={esp.id} value={esp.nombre}>
              {esp.nombre}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={exportarExcel}
            style={{
              padding: "10px 20px",
              background: "#e5891d",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Exportar a Excel
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr style={{ background: "#d7872f", color: "#fff" }}>
              <th style={th}>Orden</th>
              <th style={th}>Alumno</th>
              <th style={th}>DNI</th>
              <th style={th}>Especialidad</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => (
              <tr key={f.id_eleccion ?? i} style={{ background: i % 2 === 0 ? "#fceea3" : "#f4a742" }}>
                <td style={td}>{f.orden}</td>
                <td style={td}>{(f.nombre || "").toUpperCase()}</td>
                <td style={td}>{f.dni}</td>
                <td style={td}>{f.especialidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
