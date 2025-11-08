// frontend/src/components/Eleccion/PestanaResultados.jsx
import React, { useCallback, useEffect, useState } from "react";
import "./Eleccion.css";

export default function PestanaResultados({ BASE_URL, fetchJSON, showToast }) {
  const [filas, setFilas] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [filtro, setFiltro] = useState("todas");
  const [loading, setLoading] = useState(true); // 👈 loading general de la tabla

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); // 👈 arranca ocupando el alto fijo
      const jElec = await fetchJSON(
        `${BASE_URL}/api.php?action=obtener_elecciones`
      );
      setFilas(jElec?.data || []);

      const jList = await fetchJSON(
        `${BASE_URL}/api.php?action=obtener_listas`
      );

      if (Array.isArray(jList?.especialidad)) {
        setEspecialidades(jList.especialidad);
      } else {
        throw new Error(
          jList?.mensaje || "No se pudieron cargar las especialidades."
        );
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
      showToast("error", err.message || "No se pudo cargar la tabla.");
    } finally {
      setLoading(false); // 👈 suelta cuando ya tengo datos (o error)
    }
  }, [BASE_URL, fetchJSON, showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const visibles =
    filtro === "todas"
      ? filas
      : filas.filter(
          (f) =>
            (f.especialidad || "").toLowerCase() === filtro.toLowerCase()
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
        "\uFEFF" +
        [header, ...rows]
          .map((row) => row.map(quote).join(SEP))
          .join("\n");

      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });
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

  const isEmpty = !loading && visibles.length === 0;

  return (
    <div className="res-wrapper">
      {/* Filtros + Acciones */}
      <div className="res-toolbar">
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="res-select"
        >
          <option value="todas">Todas las especialidades</option>
          {especialidades.map((esp) => (
            <option key={esp.id} value={esp.nombre}>
              {esp.nombre}
            </option>
          ))}
        </select>

        <div className="res-actions">
          <button onClick={exportarExcel} className="res-btn-export">
            Exportar a Excel
          </button>
        </div>
      </div>

      {/* Tabla estilo grid con header fijo y cuerpo scrolleable */}
      <div className="res-grid-wrapper">
        {/* Encabezados */}
        <div className="res-grid-row res-grid-header">
          <div className="res-grid-cell">Orden</div>
          <div className="res-grid-cell">Alumno</div>
          <div className="res-grid-cell">DNI</div>
          <div className="res-grid-cell">Especialidad</div>
        </div>

        {/* Cuerpo con alto fijo cuando carga / vacío */}
        <div
          className={
            "res-grid-body" +
            ((loading || isEmpty) ? " res-grid-body-fixed" : "")
          }
        >
          {loading ? (
            <div className="res-grid-row grid-row-full">
              <div className="res-grid-cell cell-full">
                Cargando resultados…
              </div>
            </div>
          ) : isEmpty ? (
            <div className="res-grid-row grid-row-full">
              <div className="res-grid-cell cell-full">
                No hay registros para mostrar.
              </div>
            </div>
          ) : (
            visibles.map((f, i) => (
              <div
                key={f.id_eleccion ?? `${f.dni}-${i}`}
                className={`res-grid-row ${i % 2 === 0 ? "par" : "impar"}`}
              >
                <div className="res-grid-cell">{f.orden}</div>
                <div className="res-grid-cell">
                  {(f.nombre || "").toUpperCase()}
                </div>
                <div className="res-grid-cell">{f.dni}</div>
                <div className="res-grid-cell">{f.especialidad}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
