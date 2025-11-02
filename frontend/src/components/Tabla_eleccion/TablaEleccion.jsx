import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";

/**
 * TablaEleccion:
 * - Lista ELECCIONES (JOIN: eleccion + alumnos + especialidad)
 * - Filtro por especialidad (de `obtener_listas` -> clave `especialidad`)
 * - Exporta a CSV (solo lo que se VE filtrado)
 * - Botón Volver a la principal (/panel)
 */

const TablaEleccion = () => {
  const navigate = useNavigate();

  const [filas, setFilas] = useState([]);                   // obtener_elecciones
  const [especialidades, setEspecialidades] = useState([]); // obtener_listas -> especialidad
  const [filtro, setFiltro] = useState("todas");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1) Elecciones (JOIN de las 3 tablas)
        const rElec = await fetch(`${BASE_URL}/api.php?action=obtener_elecciones`);
        const jElec = await rElec.json();
        if (jElec?.exito) setFilas(jElec.data || []);

        // 2) Listas globales (para el select de especialidades)
        const rList = await fetch(`${BASE_URL}/api.php?action=obtener_listas`);
        const jList = await rList.json();
        if (jList?.exito && Array.isArray(jList.especialidad)) {
          setEspecialidades(jList.especialidad);
        }
      } catch (err) {
        console.error("Error al cargar datos:", err);
      }
    };

    fetchData();
  }, []);

  // ======= Filtro por especialidad =======
  const visibles =
    filtro === "todas"
      ? filas
      : filas.filter(
          (f) => (f.especialidad || "").toLowerCase() === filtro.toLowerCase()
        );

  // ======= Exportar a CSV (solo lo visible) =======
  const exportarExcel = () => {
    const SEP = ";"; // separador amigable para Excel ES/AR
    const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const header = ["Orden", "Alumno", "DNI", "Especialidad"];
    const rows = visibles.map((f) => [
      f.orden,
      (f.nombre || "").toUpperCase(),
      f.dni || "",
      f.especialidad || "",
    ]);

    const csv =
      "\uFEFF" +
      [header, ...rows]
        .map((row) => row.map(quote).join(SEP))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eleccion_especialidad.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="tabla-eleccion"
      style={{ padding: 20, backgroundColor: "#fff8c6", minHeight: "100vh" }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 20 }}>
        Elección de la Especialidad - Tablas
      </h1>

      {/* Filtros + Acciones */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 15,
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

        <div style={{ display: "flex", gap: 10 }}>
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

          {/* Volver a la principal */}
          <button
            onClick={() => navigate("/panel")} // principal definida en App.js
            style={{
              padding: "10px 20px",
              background: "#c26f16",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Volver
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}
        >
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
              <tr
                key={f.id_eleccion ?? i}
                style={{ background: i % 2 === 0 ? "#fceea3" : "#f4a742" }}
              >
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

export default TablaEleccion;
