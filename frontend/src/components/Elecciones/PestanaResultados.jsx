// frontend/src/components/Eleccion/PestanaResultados.jsx
import React, { useCallback, useEffect, useState } from "react";
import "./Eleccion.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function PestanaResultados({
  BASE_URL,
  fetchJSON,
  showToast,
  isAdmin,
}) {
  const [filas, setFilas] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [filtro, setFiltro] = useState("todas");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(
    async () => {
      try {
        setLoading(true);

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
        setLoading(false);
      }
    },
    [BASE_URL, fetchJSON, showToast]
  );

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
      if (!visibles.length) {
        showToast("error", "No hay datos para exportar.");
        return;
      }

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

  return (
    <div className="res-wrapper">
      {/* Barra de filtro + botón exportar */}
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
            <i className="fa-solid fa-file-export" aria-hidden="true" />
            &nbsp;Exportar a Excel
          </button>
        </div>
      </div>

      {/* Tabla estilo grid ocupando todo el alto posible */}
      <div className="res-grid-wrapper res-grid-appear">
        {/* Encabezado */}
        <div className="res-grid-row res-grid-header">
          <div className="res-grid-cell">Orden</div>
          <div className="res-grid-cell">Alumno</div>
          <div className="res-grid-cell">DNI</div>
          <div className="res-grid-cell">Especialidad</div>
        </div>

        {/* Cuerpo con scroll interno */}
        <div className="res-grid-body">
          {loading ? (
            <div className="res-grid-body-fixed">
              <div className="res-empty">
                <span className="res-empty-spinner" />
                <div className="res-empty-text">Cargando resultados…</div>
              </div>
            </div>
          ) : visibles.length === 0 ? (
            <div className="res-grid-body-fixed">
              <div className="res-empty">
                <i
                  className="fa-regular fa-circle-xmark res-empty-icon"
                  aria-hidden="true"
                />
                <div className="res-empty-title">Sin resultados</div>
                <div className="res-empty-sub">
                  No hay registros para mostrar con el filtro actual.
                </div>
              </div>
            </div>
          ) : (
            visibles.map((f, i) => (
              <div
                key={f.id_eleccion ?? `${f.dni}-${i}`}
                className={`res-grid-row ${
                  i % 2 === 0 ? "par" : "impar"
                }`}
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
