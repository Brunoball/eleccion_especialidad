import React, { useEffect, useState } from "react";
import BASE_URL from "../../config/config";

/**
 * TablaEleccion:
 * - Muestra listado de alumnos con su orden, nombre, DNI y especialidad.
 * - Filtra por especialidad y permite exportar a Excel.
 * - Colores y estilo iguales a la tabla del ejemplo.
 */

const TablaEleccion = () => {
  const [alumnos, setAlumnos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [filtro, setFiltro] = useState("todas");

  // ======= Carga inicial =======
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar alumnos
        const resAlu = await fetch(`${BASE_URL}/api.php?action=eleccion_tabla`);
        const dataAlu = await resAlu.json();

        // Cargar especialidades desde obtener_listas
        const resEsp = await fetch(`${BASE_URL}/api.php?action=obtener_listas`);
        const dataEsp = await resEsp.json();

        if (dataAlu.exito && dataEsp.exito) {
          setAlumnos(dataAlu.data || []);
          // Asumiendo que obtener_listas devuelve las especialidades en dataEsp.especialidades
          setEspecialidades(dataEsp.especialidades || []);
        }
      } catch (error) {
        console.error("Error al cargar los datos:", error);
      }
    };

    fetchData();
  }, []);

  // ======= Exportar a Excel =======
  const exportarExcel = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        ["Orden", "Alumno", "DNI", "Especialidad"].join(","),
        ...alumnos.map((a) =>
          [a.orden, `"${a.nombre}"`, a.dni, a.especialidad].join(",")
        ),
      ].join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "eleccion_especialidad.csv";
    link.click();
  };

  // ======= Filtro por especialidad =======
  const alumnosFiltrados =
    filtro === "todas"
      ? alumnos
      : alumnos.filter(
          (a) =>
            a.especialidad?.toLowerCase() === filtro.toLowerCase()
        );

  return (
    <div
      className="tabla-eleccion"
      style={{
        padding: "20px",
        backgroundColor: "#fff8c6",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
        Elección de la Especialidad - Tablas
      </h1>

      {/* Filtros */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
        }}
      >
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{
            padding: "10px 15px",
            borderRadius: "8px",
            fontWeight: "600",
            background: "#fff3d2",
            border: "1px solid #d7872f",
          }}
        >
          <option value="todas">Todas las especialidades</option>
          {especialidades.map((e) => (
            <option key={e.id} value={e.nombre}>
              {e.nombre}
            </option>
          ))}
        </select>

        <button
          onClick={exportarExcel}
          style={{
            padding: "10px 20px",
            background: "#e5891d",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "700",
          }}
        >
          Exportar a Excel
        </button>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "#fff",
          }}
        >
          <thead>
            <tr style={{ background: "#d7872f", color: "#fff" }}>
              <th style={estiloTh}>Orden</th>
              <th style={estiloTh}>Alumno</th>
              <th style={estiloTh}>DNI</th>
              <th style={estiloTh}>Especialidad</th>
            </tr>
          </thead>
          <tbody>
            {alumnosFiltrados.map((a, index) => (
              <tr
                key={a.id || index}
                style={{
                  background: index % 2 === 0 ? "#fceea3" : "#f4a742",
                }}
              >
                <td style={estiloTd}>{a.orden}</td>
                <td style={estiloTd}>{a.nombre?.toUpperCase?.()}</td>
                <td style={estiloTd}>{a.dni}</td>
                <td style={estiloTd}>{a.especialidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ======= Estilos reutilizables =======
const estiloTh = {
  padding: "12px 8px",
  textAlign: "left",
  fontWeight: "700",
  borderBottom: "2px solid #e4a74d",
};

const estiloTd = {
  padding: "10px 8px",
  borderBottom: "1px solid #e4a74d",
  fontWeight: "600",
};

export default TablaEleccion;