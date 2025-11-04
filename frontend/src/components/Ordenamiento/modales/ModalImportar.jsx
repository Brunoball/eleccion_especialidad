// src/components/Elecciones/modales/ModalImportar.jsx
import React, { useMemo, useState } from "react";

/** Claves internas que se envían al backend (1:1 con columnas de la DB) */
const EXPECTED = [
  "dni",
  "alumno",
  "promedio_1a",
  "coloquios_1a",
  "repite_1a",
  "inasistencias_1a",
  "amonestaciones_1a",
  "observaciones_1a",
  "promedio_1et",
  "adeudadas_1et",
  "tercera_materia",
  "previas_1et",
  "repite_2a",
  "inasistencias_1et",
  "amonestaciones_1et",
  "observaciones_1et",
  "promedio_final",
  "fecha_referencia",
];

/** Nombre “bonito” tal como aparece en el Excel (para UI) */
const DISPLAY_HEADERS = {
  dni: "DNI",
  alumno: "Apellido y Nombre",

  promedio_1a: "Promedio 1° Año",
  coloquios_1a: "Materias a coloquio 1° Año",
  repite_1a: "Repitente 1° Año",
  inasistencias_1a: "Faltas Injustificadas 1° Año",
  amonestaciones_1a: "Amonestaciones 1° Año",
  observaciones_1a: "Observaciones 1° Año",

  promedio_1et: "Promedio 1° Etapa 2025",
  adeudadas_1et: "Materias adeudadas 1° Etapa 2025",
  tercera_materia: "Tercera materia",
  previas_1et: "Previas 1° Etapa 2025",
  repite_2a: "Repitente 2° Año",
  inasistencias_1et: "Faltas Injustificadas 1° Etapa 2025",
  amonestaciones_1et: "Amonestaciones 1° Etapa 2025",
  observaciones_1et: "Observaciones 1° Etapa 2025",

  promedio_final: "Promedio Final",
  fecha_referencia: "Fecha",
};

/** Alias para mapear cabeceras del Excel a las claves EXPECTED */
const HEADER_ALIASES = {
  dni: ["dni", "documento", "nro dni", "n° dni", "nro documento", "document number"],
  alumno: ["alumno", "apellido y nombre", "nombre y apellido", "estudiante", "apellidos y nombres"],

  promedio_1a: ["promedio 1° año", "promedio 1 año", "promedio 1er año", "prom 1° año", "promedio primero"],
  coloquios_1a: ["materias a coloquio 1° año", "coloquios 1° año", "materias coloquio 1a"],
  repite_1a: ["repitente 1° año", "repite 1° año", "repitente 1er año", "repite 1a"],
  inasistencias_1a: ["faltas injustificadas 1° año", "faltas 1° año", "inasistencias 1° año"],
  amonestaciones_1a: ["amonestaciones 1° año", "amonest 1° año", "sanciones 1° año"],
  observaciones_1a: ["observaciones 1° año", "obs 1° año", "comentarios 1° año"],

  promedio_1et: ["promedio 1° etapa 2025", "promedio 1 etapa 2025", "prom 1et 2025"],
  adeudadas_1et: ["materias adeudadas 1° etapa 2025", "adeudadas 1° etapa 2025", "adeudadas 1et"],
  tercera_materia: ["tercera materia", "3ra materia", "tercer materia"],
  previas_1et: ["previas 1° etapa 2025", "previas 1 etapa 2025", "previas 1et"],
  repite_2a: ["repitente 2° año", "repite 2° año", "repitente 2do año", "repite 2a"],
  inasistencias_1et: ["faltas injustificadas 1° etapa 2025", "faltas 1° etapa", "inasistencias 1et"],
  amonestaciones_1et: ["amonestaciones 1° etapa 2025", "amonest 1° etapa", "sanciones 1et"],
  observaciones_1et: ["observaciones 1° etapa 2025", "obs 1° etapa 2025", "comentarios 1et"],

  promedio_final: ["promedio final", "prom final", "promedio definitivo"],
  fecha_referencia: ["fecha", "fecha referencia", "actualizado", "fecha carga"],
};

/** Helpers de normalización (front) */
function toEnumSiNo(val) {
  const s = String(val ?? "").trim().toLowerCase();
  return s === "si" || s === "sí" || s === "s" || s === "1" || s === "true" ? "si" : "no";
}
function toTiny(val) {
  const n = parseInt(String(val ?? "").replace(/[^\d-]/g, ""), 10);
  if (Number.isNaN(n)) return 0;
  return Math.min(Math.max(n, 0), 255);
}
function toSmall(val) {
  const n = parseInt(String(val ?? "").replace(/[^\d-]/g, ""), 10);
  if (Number.isNaN(n)) return 0;
  return Math.min(Math.max(n, 0), 65535);
}
function toDec(val, decimals = 2) {
  let s = String(val ?? "").trim();
  if (!s) return (0).toFixed(decimals);
  s = s.replace(",", ".");
  const n = Number(s);
  if (Number.isNaN(n)) return (0).toFixed(decimals);
  return n.toFixed(decimals);
}
function toDateYMD(v) {
  if (v === null || v === undefined) return "";
  // Excel serial (1900-based)
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const s = String(v).trim();
  const m1 = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/); // dd/mm/yyyy
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
  const m2 = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/); // yyyy-mm-dd
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return "";
}

/** --------- Utilidades de parsing XLSX/CSV --------- **/
function normalizeHeadersToIndices(headers, aliasesMap) {
  // Devuelve un mapa EXPECTED -> índice en headers (o -1 si no está)
  const lc = (s) => s.toString().trim().toLowerCase();
  const lowerH = headers.map(lc);
  const idx = {};
  for (const key of EXPECTED) {
    const tries = [key, ...(aliasesMap[key] || [])].map(lc);
    let found = -1;
    for (const t of tries) {
      const p = lowerH.indexOf(t);
      if (p !== -1) { found = p; break; }
    }
    idx[key] = found;
  }
  return idx;
}

function buildRowsFromObjects(h, objects, idxMap) {
  // `objects` es array de objetos (sheet_to_json normal)
  return objects.map((row) => {
    const out = {};
    for (const key of EXPECTED) {
      const i = idxMap[key];
      if (i === -1) { out[key] = ""; continue; }
      const originalKey = h[i];
      out[key] = row[originalKey] ?? "";
    }
    // Limpieza
    out.dni = String(out.dni ?? "").replace(/\D+/g, "");
    out.alumno = String(out.alumno ?? "").trim();

    out.promedio_1a       = toDec(out.promedio_1a, 2);
    out.coloquios_1a      = toTiny(out.coloquios_1a);
    out.repite_1a         = toEnumSiNo(out.repite_1a);
    out.inasistencias_1a  = toDec(out.inasistencias_1a, 1);
    out.amonestaciones_1a = toSmall(out.amonestaciones_1a);
    out.observaciones_1a  = String(out.observaciones_1a ?? "").trim();

    out.promedio_1et       = toDec(out.promedio_1et, 2);
    out.adeudadas_1et      = toSmall(out.adeudadas_1et);
    out.tercera_materia    = toTiny(out.tercera_materia) ? 1 : 0;
    out.previas_1et        = toSmall(out.previas_1et);
    out.repite_2a          = toTiny(out.repite_2a) ? 1 : 0;
    out.inasistencias_1et  = toDec(out.inasistencias_1et, 1);
    out.amonestaciones_1et = toSmall(out.amonestaciones_1et);
    out.observaciones_1et  = String(out.observaciones_1et ?? "").trim();

    out.promedio_final   = toDec(out.promedio_final, 2);
    out.fecha_referencia = toDateYMD(out.fecha_referencia);
    return out;
  }).filter((o) => o.alumno || o.dni);
}

function buildRowsFromMatrix(matrix, headerRowIndex, aliasesMap) {
  // `matrix` es array de arrays (header:1)
  const headers = (matrix[headerRowIndex] || []).map((v) => String(v ?? "").trim());
  const idxMap = normalizeHeadersToIndices(headers, aliasesMap);

  // Filas de datos = desde la siguiente a la de encabezados
  const dataRows = matrix.slice(headerRowIndex + 1);
  const objects = dataRows.map((arr) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = arr[i]; });
    return obj;
  });
  return { rows: buildRowsFromObjects(headers, objects, idxMap), headers, idxMap };
}

function autoDetectHeaderRow(matrix, aliasesMap) {
  // Busca en las primeras ~15 filas una que contenga varios alias “reconocibles”
  const maxScan = Math.min(matrix.length, 15);
  const scoreRow = (row) => {
    const cells = row.map((c) => String(c ?? "").toLowerCase().trim());
    let score = 0;
    for (const key of EXPECTED) {
      const candidates = [key, ...(aliasesMap[key] || [])];
      for (const cand of candidates) {
        if (cells.includes(cand.toLowerCase())) { score++; break; }
      }
    }
    return score;
  };
  let bestIdx = -1, bestScore = -1;
  for (let i = 0; i < maxScan; i++) {
    const sc = scoreRow(matrix[i] || []);
    if (sc > bestScore) { bestScore = sc; bestIdx = i; }
  }
  return bestScore >= 2 ? bestIdx : -1; // al menos 2 coincidencias
}

/** -------------------- Componente -------------------- **/
const ModalImportar = ({ onClose, onDone, onError, uploadUrl }) => {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [diag, setDiag] = useState(""); // diagnóstico visible

  // Lista de nombres de ejemplo para mostrar en la UI (siempre en orden EXPECTED)
  const displaySample = useMemo(
    () => EXPECTED.map((k) => DISPLAY_HEADERS[k]).join(", "),
    []
  );

  const onPick = (e) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setFile(f);
    previewLocal(f).catch((err) => {
      console.error(err);
      setDiag(err?.message || "No se pudo leer el archivo.");
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
    previewLocal(f).catch((err) => {
      console.error(err);
      setDiag(err?.message || "No se pudo leer el archivo.");
      setRows([]);
      setHeaders([]);
      setParsing(false);
    });
  };
  const onDragOver = (e) => e.preventDefault();

  async function getXLSX() {
    // Import dinámico (funciona en ESM)
    const mod = await import(/* webpackChunkName: "xlsx" */ "xlsx");
    return mod;
  }

  async function previewLocal(f) {
    setParsing(true);
    setDiag("");
    const ext = (f.name.split(".").pop() || "").toLowerCase();

    if (ext === "csv") {
      const text = await f.text();
      const { headers: h, rows: r } = parseCSV(text);
      const idxMap = normalizeHeadersToIndices(h, HEADER_ALIASES);
      const normalized = buildRowsFromObjects(h, r, idxMap);
      setHeaders(h);
      setRows(normalized);
      setParsing(false);
      if (!normalized.length) setDiag("No se reconocieron filas válidas en el CSV.");
      return;
    }

    if (ext === "xlsx") {
      const XLSX = await getXLSX().catch(() => null);
      if (!XLSX) {
        setParsing(false);
        setDiag("Falta librería 'xlsx' en el front. Instalá: npm i xlsx");
        return;
      }
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      // 1) Elegir hoja “FINAL” o la primera
      const finalSheetName = wb.SheetNames.find((n) => String(n).toLowerCase().includes("final")) || wb.SheetNames[0];
      const ws = wb.Sheets[finalSheetName];
      if (!ws) {
        setParsing(false);
        setDiag("No se encontró ninguna hoja en el archivo.");
        return;
      }

      // 2) Intento 1: como objetos (cabeceras desde la fila “visible”)
      let json = XLSX.utils.sheet_to_json(ws, { defval: "" }); // array de objetos
      if (json && json.length) {
        const h = Object.keys(json[0] || {});
        if (h.length) {
          const idxMap = normalizeHeadersToIndices(h, HEADER_ALIASES);
          const normalized = buildRowsFromObjects(h, json, idxMap);
          setHeaders(h);
          setRows(normalized);
          setParsing(false);
          if (!normalized.length) {
            setDiag("Se leyeron datos, pero no se reconocieron cabeceras mapeables. Probá exportar a CSV.");
          }
          return;
        }
      }

      // 3) Intento 2 (fallback): como matriz (header:1) y detección automática de fila de encabezados
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (!Array.isArray(matrix) || matrix.length === 0) {
        setParsing(false);
        setDiag("La hoja está vacía o no tiene datos legibles.");
        return;
      }
      const headerRow = autoDetectHeaderRow(matrix, HEADER_ALIASES);
      if (headerRow === -1) {
        setParsing(false);
        setDiag("No pude detectar la fila de encabezados. Verificá que la hoja 'FINAL' tenga títulos claros.");
        return;
      }
      const { rows: normalized, headers: detHeaders } = buildRowsFromMatrix(matrix, headerRow, HEADER_ALIASES);
      setHeaders(detHeaders);
      setRows(normalized);
      setParsing(false);
      if (!normalized.length) setDiag("Leí la planilla, pero no encontré filas con datos debajo de los encabezados.");
      return;
    }

    setHeaders([]);
    setRows([]);
    setParsing(false);
    setDiag("Formato no soportado. Subí .xlsx o .csv");
  }

  function parseCSV(text) {
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

  const canUpload = useMemo(() => rows.length > 0, [rows]);

  const subir = async () => {
    if (!rows.length) {
      setDiag("No hay filas para importar. Verificá el archivo y los encabezados.");
      return;
    }
    try {
      setUploading(true);
      setUploadPct(0);

      const CHUNK = 1000;
      let insertados = 0, actualizados = 0, sin_cambios = 0;
      let errores = [];

      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);

        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: slice }),
        });

        let js;
        try { js = await res.json(); }
        catch {
          const txt = await res.text().catch(() => "");
          console.error("Respuesta no-JSON del servidor:", txt);
          throw new Error(`Respuesta no válida del servidor (HTTP ${res.status}).`);
        }

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
        if (Array.isArray(d.errores) && d.errores.length) errores = errores.concat(d.errores);

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
      setDiag(e.message || "Error al importar.");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  return (
    <div role="dialog" aria-modal="true" onClick={() => !uploading && onClose?.()} style={backdrop}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Importar alumnos</h2>

        {/* Explicación usando exactamente los nombres como en el Excel */}
        <p style={{ marginTop: 6, color: "#555" }}>
          Subí un <b>.xlsx</b> (hoja <b>FINAL</b>) o un <b>.csv</b> con estas cabeceras:
          <br />
          <code style={{ userSelect: "text" }}>{displaySample}</code>
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

        {(parsing || rows.length > 0 || diag) && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {parsing ? "Leyendo archivo…" : `Vista previa (${rows.length} filas)`}
            </div>

            {/* Diagnóstico */}
            {diag && (
              <div style={{ padding: 10, borderRadius: 8, background: "#fff3f3", color: "#a33", marginBottom: 10, fontSize: 13 }}>
                {diag}
              </div>
            )}

            {/* Encabezados detectados (tal cual vienen del archivo) */}
            {!parsing && headers.length > 0 && (
              <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                <b>Encabezados detectados:</b> {headers.join(" | ")}
              </div>
            )}

            {/* Tabla preview con encabezados “bonitos” (DISPLAY_HEADERS) */}
            {!parsing && rows.length > 0 && (
              <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead style={{ position: "sticky", top: 0, background: "#faf0df", zIndex: 1 }}>
                    <tr>
                      {EXPECTED.map((k) => (
                        <th key={k} style={th}>{DISPLAY_HEADERS[k]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={idx} style={{ background: idx % 2 ? "#fff" : "#fff9ed" }}>
                        {EXPECTED.map((k) => (
                          <td key={k} style={td}>{String(r[k] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!parsing && rows.length === 0 && !diag && (
              <div style={{ fontSize: 13, color: "#777" }}>
                (No hay vista previa disponible. Convertí a CSV o asegurate de que la hoja se llame <b>FINAL</b>.)
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
          Tip: si el XLSX no se lee, instalá <code>xlsx</code> (<code>npm i xlsx</code>) o exportá a CSV.
        </div>
      </div>
    </div>
  );
};

/* ───────── estilos inline ───────── */
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
  borderBottom: "1px solid " + "#eee",
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
