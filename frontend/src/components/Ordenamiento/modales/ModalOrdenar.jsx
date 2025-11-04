// src/components/Ordenamiento/modales/ModalOrdenar.jsx
import React, { useEffect, useState } from "react";
import BASE_URL from "../../../config/config";
import "./ModalOrdenar.css";

const ModalOrdenar = ({ open, onClose, onApplied }) => {
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [loadingApply, setLoadingApply] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState([]);

  const API = `${BASE_URL.replace(/\/$/, "")}/api.php`;

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

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setError(""); setLoadingPrev(true);
        const j = await fetchJSON(`${API}?action=ordenar_ranking&preview=1&limit=50`);
        setPreview(Array.isArray(j.preview) ? j.preview : []);
      } catch (e) {
        setError(e.message || "No se pudo cargar la vista previa.");
        setPreview([]);
      } finally {
        setLoadingPrev(false);
      }
    })();
  }, [open]); // eslint-disable-line

  if (!open) return null;

  return (
    <div className="modal-ordenar-backdrop" onClick={onClose}>
      <div className="modal-ordenar" onClick={(e) => e.stopPropagation()}>
        <div className="hdr">
          <h3>Ordenar Ranking (vista previa)</h3>
        </div>

        {error && <div className="err">{error}</div>}

        {loadingPrev ? (
          <div className="loading">Cargando vista previa…</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Alumno</th>
                  <th>DNI</th>
                  <th>Promedio Final</th>
                  <th>Promedio 1° Etapa</th>
                  <th>Adeud. 1° Etapa</th>
                  <th>Previas 1° Etapa</th>
                  <th>Rep. 2°</th>
                  <th>Rep. 1°</th>
                  <th>Inasist. 1° Etapa</th>
                  <th>Amon. 1° Etapa</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={r.id_alumno}>
                    <td>{i + 1}</td>
                    <td>{r.alumno}</td>
                    <td>{r.dni}</td>
                    <td>{Number(r.promedio_final ?? 0).toFixed(2)}</td>
                    <td>{Number(r.promedio_1et ?? 0).toFixed(2)}</td>
                    <td>{r.adeudadas_1et}</td>
                    <td>{r.previas_1et}</td>
                    <td>{Number(r.repite_2a) ? "Sí" : "No"}</td>
                    <td>{String(r.repite_1a ?? "").toLowerCase() === "si" ? "Sí" : "No"}</td>
                    <td>{Number(r.inasistencias_1et ?? 0).toFixed(1)}</td>
                    <td>{r.amonestaciones_1et}</td>
                  </tr>
                ))}
                {preview.length === 0 && (
                  <tr><td colSpan={11} className="empty">Sin datos para mostrar.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="ftr">
          <button className="btn btn-neutral" onClick={onClose}>Cerrar</button>
          <button
            className="btn btn-primary"
            disabled={loadingApply}
            onClick={async () => {
              try {
                setError(""); setLoadingApply(true);
                await fetchJSON(`${API}?action=ordenar_ranking&aplicar=1`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ aplicar: 1 })
                });
                setLoadingApply(false);
                onApplied?.();
                onClose();
              } catch (e) {
                setLoadingApply(false);
                setError(e.message || "No se pudo aplicar el ranking.");
              }
            }}
          >
            {loadingApply ? "Aplicando…" : "Aplicar y Guardar (orden)"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalOrdenar;
