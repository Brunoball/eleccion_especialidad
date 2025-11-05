// src/components/Ordenamiento/Ordenar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";

// Modales
import ModalImportar from "./modales/ModalImportar";
import ModalOrdenar from "./modales/ModalOrdenar";
import ModalConfirmarLimpiar from "./modales/ModalConfirmarLimpiar";
import ModalCriterios from "./modales/ModalCriterios";
import "./Ordenar.css";

// >>> NUEVO: criterios compartidos
import { CRITERIA_COLORS, resolverCriterio } from "./criterios";

const API = `${BASE_URL.replace(/\/$/, "")}/api.php`;

export default function Ordenar() {
  const navigate = useNavigate();

  // tabla + ordenamiento
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [sort, setSort] = useState({ key: null, dir: "asc" });

  // modales
  const [openImport, setOpenImport] = useState(false);
  const [openOrdenar, setOpenOrdenar] = useState(false);
  const [openClear, setOpenClear] = useState(false);
  const [openCriterios, setOpenCriterios] = useState(false);

  // limpieza
  const [clearLoading, setClearLoading] = useState(false);
  const [clearError, setClearError] = useState("");

  // avisos
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const fetchJSON = async (url, opts) => {
    const res = await fetch(url, opts);
    const txt = await res.text();
    let data = {};
    try { data = txt ? JSON.parse(txt) : {}; } catch {}
    if (!res.ok || data?.exito === false) {
      throw new Error(data?.mensaje || `HTTP ${res.status}`);
    }
    return data;
  };

  // === CARGA INICIAL / REFRESH ===
  const cargarTabla = async () => {
    try {
      setErr("");
      const j = await fetchJSON(`${API}?action=ordenar_obtener_tabla`);
      const arr = Array.isArray(j?.data) ? j.data : [];
      const cols = Array.isArray(j?.columns) && j.columns.length
        ? j.columns
        : (arr[0] ? Object.keys(arr[0]) : []);
      setColumns(cols);
      setRows(arr);
    } catch (e) {
      console.error("Error cargando tabla:", e);
      setErr(e.message || "No se pudo obtener la tabla de alumnos.");
      setColumns([]);
      setRows([]);
    }
  };

  useEffect(() => { cargarTabla(); }, []);

  // Etiquetas de cabecera
  const columnLabels = useMemo(() => {
    const o = {};
    for (const c of columns) o[c] = c;
    return o;
  }, [columns]);

  // Comparador para ordenar
  const smartCompare = (aRaw, bRaw) => {
    const A = aRaw ?? "";
    const B = bRaw ?? "";

    const aNum = Number(A);
    const bNum = Number(B);
    const aNumOk = A !== "" && Number.isFinite(aNum);
    const bNumOk = B !== "" && Number.isFinite(bNum);
    if (aNumOk && bNumOk) return aNum - bNum;

    const aTime = Date.parse(String(A));
    const bTime = Date.parse(String(B));
    const aDateOk = !Number.isNaN(aTime);
    const bDateOk = !Number.isNaN(bTime);
    if (aDateOk && bDateOk) return aTime - bTime;

    const aStr = String(A).toLowerCase();
    const bStr = String(B).toLowerCase();
    if (aStr < bStr) return -1;
    if (aStr > bStr) return 1;
    return 0;
  };

  const sortedRows = useMemo(() => {
    if (!sort.key) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    const k = sort.key;
    return [...rows].sort((a, b) => {
      const comp = smartCompare(a?.[k], b?.[k]);
      return comp * dir;
    });
  }, [rows, sort]);

  const onHeaderClick = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  // Mostrar valores exactos - preservar "0", "1", etc.
  const raw = (v) => {
    if (v === null || v === undefined) return "";
    if (v === "") return "";
    return String(v);
  };

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
    const body = sortedRows.map((r) => columns.map((c) => raw(r?.[c])));
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
      if (!columns.length || !sortedRows.length) {
        setErr("No hay datos para exportar.");
        return;
      }
      const aoa = buildAOAFromView();
      try {
        const XLSX = (await import(/* webpackChunkName: "xlsx" */ "xlsx")).default || (await import("xlsx"));
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws["!cols"] = autoColWidths(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Alumnos");
        const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        downloadBlob(new Blob([out], { type: "application/octet-stream" }), `alumnos_ordenamiento_${new Date().toISOString().slice(0,10)}.xlsx`);
        setOk("Archivo Excel exportado correctamente.");
        setErr("");
        return;
      } catch (e) {
        console.warn("No se pudo exportar XLSX, se usa CSV. Detalle:", e);
      }
      const csv = toCSV(aoa[0], aoa);
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `alumnos_ordenamiento_${new Date().toISOString().slice(0,10)}.csv`);
      setOk("Archivo CSV exportado correctamente (fallback).");
      setErr("");
    } catch (e) {
      console.error(e);
      setErr("No se pudo exportar el archivo.");
    }
  };

  // Limpiar todo
  const handleClearConfirm = async () => {
    try {
      setClearError("");
      setClearLoading(true);
      await fetchJSON(`${API}?action=reset_elecciones&confirmar=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmar: 1 }),
      });
      setClearLoading(false);
      setOpenClear(false);
      setRows([]);
      setOk("Se limpiaron los datos y se reiniciaron los cupos.");
      setErr("");
    } catch (e) {
      setClearLoading(false);
      setClearError(e.message || "No se pudo limpiar.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 16,
        background: "var(--bg, #f6f7fb)",
        padding: 16,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          maxWidth: 1400,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <button
          onClick={() => navigate("/panel")}
          className="modalprincipal-btn modalprincipal-btn--ghost"
          style={{ padding: "10px 14px" }}
        >
          ← Volver
        </button>

        <h2 style={{ margin: 0, fontWeight: 700 }}>Ordenamiento - Tabla Alumnos</h2>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={() => setOpenCriterios(true)}
            className="modalprincipal-btn modalprincipal-btn--solid"
            style={{ padding: "10px 14px", background: "#6b7280", color: "#fff" }}
            title="Ver criterios de ordenamiento"
          >
            Ver criterios
          </button>

          <button
            onClick={() => setOpenImport(true)}
            className="modalprincipal-btn modalprincipal-btn--solid"
            style={{ padding: "10px 14px" }}
            title="Importar XLSX/CSV"
          >
            Importar datos
          </button>

          <button
            onClick={() => setOpenOrdenar(true)}
            className="modalprincipal-btn modalprincipal-btn--solid"
            style={{ padding: "10px 14px", background: "#2563eb", color: "#fff" }}
            title="Vista previa y aplicar ranking"
          >
            Ordenar Ranking
          </button>

          <button
            onClick={handleExportExcel}
            className="modalprincipal-btn modalprincipal-btn--solid"
            style={{ padding: "10px 14px", background: "#059669", color: "#fff" }}
            title="Exportar lo visible a Excel"
          >
            Exportar Excel
          </button>

          <button
            onClick={() => { setClearError(""); setOpenClear(true); }}
            className="modalprincipal-btn modalprincipal-btn--solid"
            style={{ padding: "10px 14px", background: "#d92d20", color: "#fff" }}
            title="Eliminar todo y reiniciar cupos"
          >
            Limpiar todo
          </button>
        </div>
      </header>

      {/* Mensajes */}
      <div style={{ maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        {ok && (
          <div style={{
            padding: "10px 12px", borderRadius: 10, background: "#e7f8ec",
            border: "1px solid #93e5b1", color: "#0a6b2b", fontWeight: 600, marginBottom: 8,
          }}>
            {ok}
          </div>
        )}
        {err && (
          <div style={{
            padding: "10px 12px", borderRadius: 10, background: "#ffe6e3",
            border: "1px solid #ffb4ab", color: "#7a271a", fontWeight: 600, marginBottom: 8,
          }}>
            {err}
          </div>
        )}
      </div>

      {/* Tabla */}
      <main style={{ display: "grid", placeItems: "center", padding: 8 }}>
        <div
          style={{
            width: "100%",
            maxWidth: 1400,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 6px 20px rgba(0,0,0,.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #eee",
              fontSize: 14,
              color: "#6b7280",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              {rows.length
                ? `Registros: ${rows.length} • Columnas: ${columns.length}`
                : "Sin datos. Importá un CSV o XLSX para ver la tabla."}
            </span>
            <span style={{ fontSize: 12 }}>
              Desplazá horizontalmente para ver todas las columnas →
            </span>
          </div>

          <div style={{ overflow: "auto", maxHeight: "70vh" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px" }}>
              <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 2 }}>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      onClick={() => onHeaderClick(col)}
                      style={{
                        textAlign: "left",
                        padding: "12px 10px",
                        borderBottom: "1px solid #e2e8f0",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                        fontWeight: 600,
                        fontSize: "13px",
                        background: "#f1f5f9",
                        borderRight: "1px solid #e2e8f0",
                        minWidth: "120px",
                      }}
                      title={`Ordenar por ${columnLabels[col] || col}`}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>{columnLabels[col] || col}</span>
                        {sort.key === col && (
                          <span style={{ fontSize: "10px" }}>
                            {sort.dir === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {sortedRows.map((row, idx) => {
                  const crit = resolverCriterio(row);
                  return (
                    <tr
                      key={idx}
                      title={`Criterio: ${crit.label} (#${crit.id})`}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: crit.color,
                        boxShadow: "inset 4px 0 0 rgba(0,0,0,.08)",
                      }}
                    >
                      {columns.map((col) => (
                        <td
                          key={col}
                          style={{
                            padding: "10px 10px",
                            fontSize: "13px",
                            borderRight: "1px solid #f1f5f9",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "200px"
                          }}
                          title={raw(row?.[col])}
                        >
                          {raw(row?.[col])}
                        </td>
                      ))}
                    </tr>
                  );
                })}

                {!rows.length && (
                  <tr>
                    <td
                      colSpan={columns.length || 1}
                      style={{
                        padding: 40,
                        color: "#64748b",
                        fontSize: 14,
                        textAlign: "center",
                        fontStyle: "italic"
                      }}
                    >
                      No hay datos disponibles. Importá un archivo CSV o XLSX para comenzar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer style={{ textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
        Ordenamiento • IPET 50 • {columns.length} columnas mostradas
      </footer>

      {/* === Modales === */}
      {openImport && (
        <ModalImportar
          onClose={() => setOpenImport(false)}
          uploadUrl={`${API}?action=alumnos_import_json`}
          onDone={(msg) => {
            setOk(msg || "Importación completa.");
            setErr("");
            cargarTabla();
          }}
          onError={(message) => {
            setErr(message || "No se pudo importar.");
            setOk("");
          }}
        />
      )}

      <ModalOrdenar
        open={openOrdenar}
        onClose={() => setOpenOrdenar(false)}
        onApplied={() => {
          setOk("Ranking aplicado correctamente.");
          setErr("");
          cargarTabla();
        }}
      />

      <ModalConfirmarLimpiar
        open={openClear}
        onClose={() => setOpenClear(false)}
        onConfirm={async () => {
          await handleClearConfirm();
          cargarTabla();
        }}
        loading={clearLoading}
        error={clearError}
      />

      <ModalCriterios
        open={openCriterios}
        onClose={() => setOpenCriterios(false)}
      />
    </div>
  );
}
