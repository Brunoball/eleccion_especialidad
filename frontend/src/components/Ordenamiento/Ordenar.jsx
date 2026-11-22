// frontend/src/components/Ordenar/Ordenar.jsx
import React, { useEffect, useMemo, useState } from "react";
import BASE_URL from "../../config/config";

// Modales
import ModalImportar from "./modales/ModalImportar";
import ModalOrdenar from "./modales/ModalOrdenar";
import ModalConfirmarLimpiar from "./modales/ModalConfirmarLimpiar";
import ModalCriterios from "./modales/ModalCriterios";

import "./Ordenar.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import Toast from "../Global/Toast";
import { resolverCriterio } from "./criterios";
import { leerUsuario, nombreUsuario } from "../Principal/menu";

const API = `${BASE_URL.replace(/\/$/, "")}/api.php`;

export default function Ordenar() {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);

  // modales
  const [openImport, setOpenImport] = useState(false);
  const [openOrdenar, setOpenOrdenar] = useState(false);
  const [openClear, setOpenClear] = useState(false);
  const [openCriterios, setOpenCriterios] = useState(false);

  // limpieza
  const [clearLoading, setClearLoading] = useState(false);
  const [clearError, setClearError] = useState("");

  // toast
  const [toast, setToast] = useState(null); // { tipo, mensaje, duracion }

  const showToast = (tipo, mensaje, duracion = 3000) => {
    setToast({ tipo, mensaje, duracion });
  };

  const fetchJSON = async (url, opts) => {
    const res = await fetch(url, opts);
    const txt = await res.text();
    let data = {};
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {
      // JSON inválido
    }

    if (!res.ok || data?.exito === false) {
      throw new Error(data?.mensaje || `HTTP ${res.status}`);
    }
    return data;
  };

  // === CARGA INICIAL / REFRESH ===
  const cargarTabla = async () => {
    try {
      const j = await fetchJSON(`${API}?action=ordenar_obtener_tabla`);
      const arr = Array.isArray(j?.data) ? j.data : [];

      const cols =
        Array.isArray(j?.columns) && j.columns.length
          ? j.columns
          : arr[0]
          ? Object.keys(arr[0])
          : [];

      setColumns(cols);
      setRows(arr);
    } catch (e) {
      console.error("Error cargando tabla:", e);
      setColumns([]);
      setRows([]);
      showToast(
        "error",
        e.message || "No se pudo obtener la tabla de alumnos."
      );
    }
  };

  useEffect(() => {
    cargarTabla();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Etiquetas de cabecera
  const columnLabels = useMemo(() => {
    const o = {};
    for (const c of columns) o[c] = c;
    return o;
  }, [columns]);

  const raw = (v) => {
    if (v === null || v === undefined || v === "") return "";
    return String(v);
  };

  // Template columnas grid
  const gridTemplate = useMemo(() => {
    if (!columns.length) return "1fr";
    // La columna del nombre del alumno es más ancha para que no se corte
    return columns
      .map((c) =>
        c === "alumno" ? "minmax(240px, 2.6fr)" : "minmax(110px, 1fr)"
      )
      .join(" ");
  }, [columns]);

  // ====== EXPORTACIÓN ======
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toCSV = (headers, rowsAOA) => {
    const esc = (s) => {
      const str = String(s ?? "");
      if (/[",\n;]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [headers.map(esc).join(",")];
    for (let i = 1; i < rowsAOA.length; i++) {
      lines.push(rowsAOA[i].map(esc).join(","));
    }
    return lines.join("\n");
  };

  const buildAOAFromView = () => {
    const headers = columns.map((c) => columnLabels[c] || c);
    const body = rows.map((r) => columns.map((c) => raw(r?.[c])));
    return [headers, ...body];
  };

  const autoColWidths = (aoa) => {
    const colCount = aoa[0]?.length || 0;
    const widths = Array(colCount).fill(10);

    for (let c = 0; c < colCount; c++) {
      let max = 10;
      for (let r = 0; r < aoa.length; r++) {
        const len = String(aoa[r][c] ?? "").length;
        if (len > max) max = len;
      }
      widths[c] = { wch: Math.min(Math.max(max + 2, 10), 80) };
    }
    return widths;
  };

  const handleExportExcel = async () => {
    try {
      if (!columns.length || !rows.length) {
        showToast("advertencia", "No hay datos para exportar.");
        return;
      }

      const aoa = buildAOAFromView();

      try {
        const mod = await import("xlsx");
        const XLSX = mod.default || mod;

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = autoColWidths(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Alumnos");

        const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        downloadBlob(
          new Blob([out], { type: "application/octet-stream" }),
          `alumnos_ordenamiento_${new Date()
            .toISOString()
            .slice(0, 10)}.xlsx`
        );
        showToast("exito", "Archivo Excel exportado correctamente.");
        return;
      } catch (e) {
        console.warn("No se pudo exportar XLSX, se usa CSV. Detalle:", e);
      }

      const csv = toCSV(aoa[0], aoa);
      downloadBlob(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
        `alumnos_ordenamiento_${new Date().toISOString().slice(0, 10)}.csv`
      );
      showToast(
        "exito",
        "Archivo CSV exportado correctamente (exportación alternativa)."
      );
    } catch (e) {
      console.error(e);
      showToast("error", "No se pudo exportar el archivo.");
    }
  };

  // ====== LIMPIAR TODO ======
  const handleClearConfirm = async ({ guardarHistorial = true, titulo = "" } = {}) => {
    try {
      setClearError("");
      setClearLoading(true);

      const resp = await fetchJSON(`${API}?action=reset_elecciones&confirmar=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmar: 1,
          guardar_historial: guardarHistorial,
          titulo_historial: titulo,
          usuario: nombreUsuario(leerUsuario()),
        }),
      });

      setClearLoading(false);
      setOpenClear(false);
      setRows([]);
      showToast(
        "exito",
        resp?.mensaje || "Se limpiaron los datos y se reiniciaron los cupos."
      );
    } catch (e) {
      setClearLoading(false);
      const msg = e.message || "No se pudo limpiar.";
      setClearError(msg);
      showToast("error", msg);
    }
  };

  return (
    <div className="org-ordenar-page mod-page">
      <div className="org-ordenar-container">
        {/* ENCABEZADO: título y acciones en una sola fila */}
        <header className="mod-head">
          <div className="mod-head__main">
            <span className="mod-head__icon" aria-hidden="true">
              <i className="fa-solid fa-arrow-down-a-z" />
            </span>
            <div className="mod-head__titles">
              <h1>Ordenamiento de alumnos</h1>
              <p>
                Ranking según los criterios definidos por el equipo directivo.
              </p>
            </div>
          </div>

          {/* Acciones principales */}
          <div className="mod-head__actions org-ordenar-actions">
            <button
              type="button"
              onClick={() => setOpenCriterios(true)}
              className="mod-btn mod-btn--ghost org-btn-secondary"
            >
              <i className="fa-solid fa-list-check" aria-hidden="true" />
              <span>Criterios</span>
            </button>

            <button
              type="button"
              onClick={() => setOpenImport(true)}
              className="mod-btn"
            >
              <i className="fa-solid fa-file-import" aria-hidden="true" />
              <span>Importar datos</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="mod-btn mod-btn--excel"
            >
              <i className="fa-regular fa-file-excel" aria-hidden="true" />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setClearError("");
                setOpenClear(true);
              }}
              className="mod-btn mod-btn--danger"
            >
              <i className="fa-solid fa-trash-can" aria-hidden="true" />
              <span>Limpiar todo</span>
            </button>

            <button
              type="button"
              onClick={() => setOpenOrdenar(true)}
              className="mod-btn mod-btn--primary"
            >
              <i
                className="fa-solid fa-arrow-down-short-wide"
                aria-hidden="true"
              />
              <span>Ordenar ranking</span>
            </button>
          </div>
        </header>

        {/* MAIN */}
        <main className="org-ordenar-main mod-body">
          <div className="org-ordenar-table-wrapper">
            <div className="org-ordenar-table-header">
              <span>
                {rows.length
                  ? `Registros: ${rows.length} • Columnas: ${columns.length}`
                  : "Sin datos. Importá un CSV/XLSX para comenzar."}
              </span>
              <span className="org-ordenar-table-hint">
                Desplazá para ver todos los datos →
              </span>
            </div>

            <div className="org-ordenar-table-scroll">
              <div className="org-ordenar-grid">
                {/* Cabecera */}
                {columns.length > 0 && (
                  <div
                    className="org-ordenar-grid-header"
                    style={{ gridTemplateColumns: gridTemplate }}
                  >
                    {columns.map((col) => (
                      <div
                        key={col}
                        className="org-ordenar-grid-header-cell"
                      >
                        {columnLabels[col] || col}
                      </div>
                    ))}
                  </div>
                )}

                {/* Filas o estado vacío */}
                {rows.length > 0 ? (
                  rows.map((row, idx) => {
                    const crit = resolverCriterio(row) || {};
                    return (
                      <div
                        key={idx}
                        className="org-ordenar-grid-row"
                        title={
                          crit.label
                            ? `Criterio: ${crit.label} (#${crit.id})`
                            : ""
                        }
                        style={{
                          gridTemplateColumns: gridTemplate,
                          ...(crit.color ? { "--row-bg": crit.color } : {}),
                        }}
                      >
                        {columns.map((col) => {
                          const val = raw(row?.[col]);
                          const display =
                            val || (col === "fecha_ingreso" ? "-" : "");
                          return (
                            <div
                              key={col}
                              className={`org-ordenar-grid-cell${
                                col === "alumno" ? " is-name" : ""
                              }`}
                              title={display}
                            >
                              {display}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                ) : (
                  <div className="org-ordenar-empty-grid">
                    <i
                      className="fa-regular fa-circle-xmark org-empty-icon"
                      aria-hidden="true"
                    />
                    <h2>Sin datos</h2>
                    <p>
                      No hay registros para mostrar. Importá un archivo
                      para ver la tabla de alumnos.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

      </div>

      {/* === MODALES === */}
      {openImport && (
        <ModalImportar
          onClose={() => setOpenImport(false)}
          uploadUrl={`${API}?action=alumnos_import_json`}
          onDone={(msg) => {
            showToast("exito", msg || "Importación completa.");
            cargarTabla();
          }}
          onError={(message) => {
            showToast("error", message || "No se pudo importar.");
          }}
        />
      )}

      <ModalOrdenar
        open={openOrdenar}
        onClose={() => setOpenOrdenar(false)}
        onApplied={() => {
          showToast("exito", "Ranking aplicado correctamente.");
          cargarTabla();
        }}
      />

      <ModalConfirmarLimpiar
        open={openClear}
        onClose={() => setOpenClear(false)}
        onConfirm={async (opciones) => {
          await handleClearConfirm(opciones);
          cargarTabla();
        }}
        loading={clearLoading}
        error={clearError}
      />

      <ModalCriterios
        open={openCriterios}
        onClose={() => setOpenCriterios(false)}
      />

      {/* TOAST GLOBAL */}
      {toast && (
        <Toast
          tipo={toast.tipo}
          mensaje={toast.mensaje}
          duracion={toast.duracion}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
