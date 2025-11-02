// src/components/Elecciones/modales/ModalImportar.jsx
import React, { useMemo, useState } from "react";

// ✅ Vista previa local opcional con SheetJS (si está instalado en el frontend)
let XLSX = null;
try {
  // eslint-disable-next-line global-require
  XLSX = require("xlsx");
} catch {
  XLSX = null;
}

/** Cabeceras que espera el backend (y el orden de vista previa) */
const EXPECTED = [
  "dni",
  "alumno",
  "promedio",
  "matprev",
  "matpend",
  "repite",
  "sanciones",
  "rendir",
  "inasistencias",
  "observaciones",
];

// Alias mínimos para mapear cabeceras “parecidas”
const HEADER_ALIASES = {
  dni: ["dni", "documento", "nro dni", "nro documento"],
  alumno: ["alumno", "apellido y nombre", "nombre y apellido", "estudiante"],
  promedio: ["promedio", "prom."],
  matprev: ["matprev", "materias previas", "previas"],
  matpend: ["matpend", "materias pendientes", "pendientes"],
  repite: ["repite", "repite?"],
  sanciones: ["sanciones", "cant sanciones"],
  rendir: ["rendir", "rendir?", "a rendir"],
  inasistencias: ["inasistencias", "inasist.", "faltas"],
  observaciones: ["observaciones", "obs", "comentarios"],
};

const ModalImportar = ({ onClose, onDone, onError, uploadUrl }) => {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);       // payload normalizado
  const [headers, setHeaders] = useState([]); // encabezados detectados (preview)
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [parsing, setParsing] = useState(false);

  // ────────────── Handlers de selección / drag & drop ──────────────
  const onPick = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setFile(f);
    previewLocal(f).catch(() => {
      setRows([]);
      setHeaders([]);
      setParsing(false);
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    if (!f) return;
    setFile(f);
    previewLocal(f).catch(() => {
      setRows([]);
      setHeaders([]);
      setParsing(false);
    });
  };

  const onDragOver = (e) => e.preventDefault();

  // ────────────── Parseo local (CSV o XLSX) ──────────────
  async function previewLocal(f) {
    setParsing(true);
    const ext = (f.name.split(".").pop() || "").toLowerCase();

    if (ext === "csv") {
      const text = await f.text();
      const { headers: h, rows: r } = parseCSV(text);
      const normalized = normalizeToExpected(h, r);
      setHeaders(h);
      setRows(normalized);
      setParsing(false);
      return;
    }

    if (ext === "xlsx") {
      if (!XLSX) {
        alert("Para leer XLSX en el navegador instalá 'xlsx' (npm i xlsx) o subí CSV.");
        setHeaders([]);
        setRows([]);
        setParsing(false);
        return;
      }
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" }); // array de objetos por cabecera visible
      const h = Object.keys(json[0] || {});
      const normalized = normalizeToExpected(h, json);
      setHeaders(h);
      setRows(normalized);
      setParsing(false);
      return;
    }

    setHeaders([]);
    setRows([]);
    setParsing(false);
  }

  function parseCSV(text) {
    // Detecta separador por la primera línea
    const first = text.split(/\r?\n/, 1)[0] || "";
    const sep = first.split(";").length > first.split(",").length ? ";" : ",";
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = splitCSVLine(lines[0], sep).map((s) => s.trim());
    const rows = lines.slice(1).map((l) => {
      const cols = splitCSVLine(l, sep);
      const o = {};
      headers.forEach((h, i) => (o[h] = (cols[i] ?? "").trim()));
      return o;
    });
    return { headers, rows };
  }

  // Parser de línea CSV con comillas
  function splitCSVLine(line, sep) {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"'; i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === sep && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  // ────────────── Normalización ligera (solo mapeo de claves) ──────────────
  function normalizeToExpected(h, r) {
    const lc = (s) => s.toString().trim().toLowerCase();
    const lowerH = h.map(lc);

    // Intento de mapeo exacto por clave esperada o alias
    const idx = {};
    EXPECTED.forEach((key) => {
      const tries = [key, ...(HEADER_ALIASES[key] || [])].map(lc);
      let found = -1;
      for (const t of tries) {
        const p = lowerH.indexOf(t);
        if (p !== -1) { found = p; break; }
      }
      idx[key] = found; // -1 si no está
    });

    // Construye objetos SOLO con EXPECTED (orden estable)
    return r.map((row) => {
      const o = {};
      EXPECTED.forEach((k) => {
        const i = idx[k];
        if (i === -1) { o[k] = ""; return; }
        const originalKey = h[i];
        o[k] = row[originalKey] ?? "";
      });
      // Limpieza mínima útil (no estricta)
      if (typeof o.repite === "string") {
        const v = o.repite.toString().trim().toLowerCase();
        o.repite = v === "si" || v === "sí" || v === "s" || v === "true" || v === "1" ? "si" : "no";
      }
      return o;
    });
  }

  const canUpload = useMemo(() => rows.length > 0, [rows]);

  // ────────────── Envío JSON por bloques al backend ──────────────
  const subir = async () => {
    if (!rows.length) return;
    try {
      setUploading(true);
      setUploadPct(0);

      const CHUNK = 1000;
      let insertados = 0;
      let actualizados = 0;
      let sin_cambios = 0;
      let errores = [];

      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);

        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: slice }),
        });

        // Intentamos JSON; si falla, mostramos texto crudo para depurar
        let js;
        try {
          js = await res.json();
        } catch {
          const txt = await res.text().catch(() => "");
          console.error("Respuesta no-JSON del servidor:", txt);
          throw new Error(`Respuesta no válida del servidor (HTTP ${res.status}).`);
        }

        // Acepta:
        // 1) { exito:true, data:{ insertados, actualizados, sin_cambios, errores[] } }
        // 2) { insertados, actualizados, sin_cambios, errores[] }
        // 3) { exito:false, mensaje:"..." }
        const okShape =
          js?.exito === true ||
          typeof js?.insertados !== "undefined" ||
          typeof js?.data !== "undefined";

        if (!res.ok || !okShape) {
          const msg = js?.mensaje || `Respuesta inesperada del servidor (HTTP ${res.status}).`;
          throw new Error(msg);
        }

        const d = js?.data ?? js;

        insertados   += Number(d.insertados   || 0);
        actualizados += Number(d.actualizados || 0);
        sin_cambios  += Number(d.sin_cambios  || 0);
        if (Array.isArray(d.errores) && d.errores.length) {
          errores = errores.concat(d.errores);
        }

        setUploadPct(Math.round(((i + slice.length) / rows.length) * 100));
      }

      const resumen =
        `Importación OK — Insertados: ${insertados}, Actualizados: ${actualizados}, ` +
        `Sin cambios: ${sin_cambios}${errores.length ? `, Avisos/errores: ${errores.length}` : ""}.`;

      if (errores.length) console.warn("Importar alumnos — errores:", errores.slice(0, 30));

      onDone?.(resumen);
      onClose?.();
    } catch (e) {
      console.error(e);
      onError?.(e.message || "Error al importar.");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  return (
    <div role="dialog" aria-modal="true" onClick={() => !uploading && onClose?.()} style={backdrop}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Importar alumnos</h2>
        <p style={{ marginTop: 6, color: "#555" }}>
          Subí un <b>.xlsx</b> (con librería <code>xlsx</code> instalada en el front) o un <b>.csv</b> con cabeceras:
          <br />
          <code style={{ userSelect: "text" }}>{EXPECTED.join(", ")}</code>
        </p>

        <div onDrop={onDrop} onDragOver={onDragOver} style={dropzone}>
          <input
            id="file-import-eleccion"
            type="file"
            accept=".xlsx,.csv"
            onChange={onPick}
            style={{ display: "none" }}
            disabled={uploading}
          />
          <label htmlFor="file-import-eleccion" style={{ cursor: uploading ? "not-allowed" : "pointer" }}>
            {file ? <div><b>Seleccionado:</b> {file.name}</div> : <div>Arrastrá aquí o <u>hacé click</u> para elegir</div>}
          </label>
          {uploading && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              Importando… {uploadPct}%{/* progreso simple */}
            </div>
          )}
        </div>

        {(parsing || rows.length > 0) && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {parsing ? "Leyendo archivo…" : `Vista previa (${rows.length} filas)`}
            </div>
            {!parsing && rows.length > 0 && (
              <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead style={{ position: "sticky", top: 0, background: "#faf0df", zIndex: 1 }}>
                    <tr>
                      {EXPECTED.map((h) => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={idx} style={{ background: idx % 2 ? "#fff" : "#fff9ed" }}>
                        {EXPECTED.map((h) => (
                          <td key={h} style={td}>{String(r[h] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!parsing && rows.length === 0 && (
              <div style={{ fontSize: 13, color: "#777" }}>
                (No hay vista previa disponible. Convertí a CSV o instalá <code>xlsx</code> para Excel.)
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btn("neutral")} disabled={uploading}>
            Cerrar
          </button>
          <button
            type="button"
            onClick={subir}
            style={btn("accent")}
            disabled={!canUpload || uploading}
            title={!canUpload ? "Elegí un archivo" : "Importar al servidor"}
          >
            {uploading ? "Importando…" : "Importar"}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
          Tip: para Excel instalá <code>xlsx</code>: <code>npm i xlsx</code>. Para CSV no hace falta nada.
        </div>
      </div>
    </div>
  );
};

// ────────────── estilos inline sencillos ──────────────
const backdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 1000,
};

const modal = {
  width: "100%",
  maxWidth: 900,
  background: "#fff",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
};

const dropzone = {
  marginTop: 8,
  border: "2px dashed #d7872f",
  background: "#fff7e7",
  borderRadius: 12,
  padding: 24,
  textAlign: "center",
  fontWeight: 600,
};

const th = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid #eee",
  position: "sticky",
  top: 0,
};

const td = {
  padding: "8px 10px",
  borderBottom: "1px solid #f3e2cc",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
};

const btn = (variant) => {
  const base = {
    padding: "10px 18px",
    borderRadius: 10,
    fontWeight: 700,
    border: "none",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    cursor: "pointer",
  };
  if (variant === "accent") return { ...base, background: "#d7872f", color: "#fff" };
  return { ...base, background: "#cfcfcf", color: "#222" };
};

export default ModalImportar;
