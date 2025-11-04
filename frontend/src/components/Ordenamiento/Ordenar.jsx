// src/components/Ordenamiento/Ordenar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";

// Modales
import ModalImportar from "./modales/ModalImportar";
import ModalOrdenar from "./modales/ModalOrdenar";
import ModalConfirmarLimpiar from "./modales/ModalConfirmarLimpiar";

const API = `${BASE_URL.replace(/\/$/, "")}/api.php`;

export default function Ordenar() {
  const navigate = useNavigate();

  // tabla + ordenamiento
  const [rows, setRows] = useState([]);
  const [sort, setSort] = useState({ key: null, dir: "asc" });

  // modales
  const [openImport, setOpenImport] = useState(false);
  const [openOrdenar, setOpenOrdenar] = useState(false);
  const [openClear, setOpenClear] = useState(false);

  // estado de limpieza
  const [clearLoading, setClearLoading] = useState(false);
  const [clearError, setClearError] = useState("");

  // avisos simples
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
      setRows(arr);
    } catch (e) {
      setErr(e.message || "No se pudo obtener la tabla de alumnos.");
      setRows([]);
    }
  };

  useEffect(() => {
    cargarTabla();
  }, []);

  const columns = useMemo(
    () => (rows.length ? Object.keys(rows[0]) : []),
    [rows]
  );

  const sortedRows = useMemo(() => {
    if (!sort.key) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const A = (a?.[sort.key] ?? "").toString().toLowerCase();
      const B = (b?.[sort.key] ?? "").toString().toLowerCase();
      if (A < B) return -1 * dir;
      if (A > B) return 1 * dir;
      return 0;
    });
  }, [rows, sort]);

  const onHeaderClick = (key) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  // Confirmar limpieza total (eleccion + alumnos + reset cupos_actuales)
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
      setRows([]); // vista local
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
          maxWidth: 1200,
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

        <h2 style={{ margin: 0, fontWeight: 700 }}>Ordenamiento</h2>

        <div style={{ display: "flex", gap: 8 }}>
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
      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%" }}>
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

      {/* Tabla centrada */}
      <main style={{ display: "grid", placeItems: "center", padding: 8 }}>
        <div
          style={{
            width: "100%",
            maxWidth: 1200,
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
            }}
          >
            {rows.length
              ? `Registros: ${rows.length}`
              : "Sin datos. Importá un CSV o XLSX para ver la tabla."}
          </div>

          <div style={{ overflow: "auto", maxHeight: "70vh" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "#fafafa", zIndex: 2 }}>
                <tr>
                  {columns.length ? (
                    columns.map((col) => (
                      <th
                        key={col}
                        onClick={() => onHeaderClick(col)}
                        style={{
                          textAlign: "left",
                          padding: "12px 14px",
                          borderBottom: "1px solid #eee",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          userSelect: "none",
                          fontWeight: 700,
                        }}
                        title="Ordenar"
                      >
                        {col}
                        {sort.key === col ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
                      </th>
                    ))
                  ) : (
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 14px",
                        borderBottom: "1px solid #eee",
                        fontWeight: 700,
                      }}
                    >
                      (Esperando datos…)
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {sortedRows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f1f1" }}>
                    {columns.map((c) => (
                      <td key={c} style={{ padding: "10px 14px", fontSize: 14 }}>
                        {String(row?.[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}

                {!rows.length && (
                  <tr>
                    <td style={{ padding: 18, color: "#6b7280", fontSize: 14 }}>
                      Importá un archivo para comenzar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer style={{ textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
        Ordenamiento • IPET 50
      </footer>

      {/* === Modales === */}
      {openImport && (
        <ModalImportar
          onClose={() => setOpenImport(false)}
          uploadUrl={`${API}?action=alumnos_import_json`}
          onDone={(msg) => {
            setOk(msg || "Importación completa.");
            setErr("");
            cargarTabla(); // ← refrescar
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
          cargarTabla(); // ← refrescar
        }}
      />

      <ModalConfirmarLimpiar
        open={openClear}
        onClose={() => setOpenClear(false)}
        onConfirm={async () => {
          await handleClearConfirm();
          cargarTabla(); // ← refrescar
        }}
        loading={clearLoading}
        error={clearError}
      />
    </div>
  );
}
