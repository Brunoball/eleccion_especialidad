// src/components/Ordenamiento/modales/ModalOrdenar.jsx
import React, { useEffect, useState } from "react";
import BASE_URL from "../../../config/config";
import "./ModalOrdenar.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

// Convierte '0' / '' / 'no' -> 0 ; si es número en texto -> ese número
const obsToNumber = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "" || s === "no") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

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
    try {
      data = txt ? JSON.parse(txt) : {};
    } catch {
      // respuesta no JSON
    }
    if (!res.ok || data?.exito === false) {
      throw new Error(data?.mensaje || `HTTP ${res.status}`);
    }
    return data;
  };

  // Cargar vista previa cuando se abre
  useEffect(() => {
    if (!open) return;

    let cancel = false;

    const load = async () => {
      try {
        setError("");
        setLoadingPrev(true);
        const j = await fetchJSON(
          `${API}?action=ordenar_ranking&preview=1&limit=50`
        );
        if (cancel) return;
        setPreview(Array.isArray(j.preview) ? j.preview : []);
      } catch (e) {
        if (cancel) return;
        setError(e.message || "No se pudo cargar la vista previa.");
        setPreview([]);
      } finally {
        if (!cancel) setLoadingPrev(false);
      }
    };

    load();

    // Escape + bloquear scroll como en los otros modales
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !loadingApply) {
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancel = true;
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow || "";
    };
  }, [open, API, onClose, loadingApply]);

  if (!open) return null;

  const handleOverlayMouseDown = (e) => {
    if (loadingApply) return;
    if (e.target === e.currentTarget) onClose?.();
  };

  const aplicarRanking = async () => {
    try {
      setError("");
      setLoadingApply(true);
      await fetchJSON(`${API}?action=ordenar_ranking&aplicar=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aplicar: 1 }),
      });
      setLoadingApply(false);
      onApplied?.();
      onClose?.();
    } catch (e) {
      setLoadingApply(false);
      setError(e.message || "No se pudo aplicar el ranking.");
    }
  };

  return (
    <div
      className="ord-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        className="ord-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="ord-header">
          <div className="ord-header-title">
            <i className="fa-solid fa-ranking-star ord-header-icon" />
            <div>
              <h3>Ordenar Ranking</h3>
              <p>Vista previa del orden según los criterios configurados.</p>
            </div>
          </div>
          <button
            className="ord-close"
            type="button"
            onClick={() => !loadingApply && onClose?.()}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="ord-body">
          {error && (
            <div className="ord-error">
              <i className="fa-solid fa-triangle-exclamation" /> {error}
            </div>
          )}

          {loadingPrev ? (
            <div className="ord-loading">
              <i className="fa-solid fa-spinner ord-spin" />
              Cargando vista previa…
            </div>
          ) : (
            <div className="ord-table-wrap">
              <table className="ord-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Alumno</th>
                    <th>DNI</th>
                    <th>Trayectoria</th>
                    <th>Prom. Final</th>
                    <th>Prom. 1° Etapa</th>
                    <th>Adeud. 1° Etapa</th>
                    <th>Previas 1° Etapa</th>
                    <th>Rep. 2°</th>
                    <th>Rep. 1°</th>
                    <th>Inasist. 1° Etapa</th>
                    <th>Inasist. 1° Año</th>
                    <th>Amon. 1° Año</th>
                    <th>Amon. 1° Etapa</th>
                    <th>Obs. 1° Año</th>
                    <th>Obs. 1° Etapa</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={r.id_alumno ?? `${r.dni}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{r.alumno}</td>
                      <td>{r.dni}</td>
                      <td>
                        {Number(r.trayectoria_institucional) === 1
                          ? "Sin tray."
                          : "Con tray."}
                      </td>
                      <td>{Number(r.promedio_final ?? 0).toFixed(2)}</td>
                      <td>{Number(r.promedio_1et ?? 0).toFixed(2)}</td>
                      <td>{r.adeudadas_1et}</td>
                      <td>{r.previas_1et}</td>
                      <td>{Number(r.repite_2a) ? "Sí" : "No"}</td>
                      <td>
                        {String(r.repite_1a ?? "").toLowerCase() === "si"
                          ? "Sí"
                          : "No"}
                      </td>
                      <td>{Number(r.inasistencias_1et ?? 0).toFixed(1)}</td>
                      <td>{Number(r.inasistencias_1a ?? 0).toFixed(1)}</td>
                      <td>{r.amonestaciones_1a}</td>
                      <td>{r.amonestaciones_1et ?? 0}</td>
                      <td>{obsToNumber(r.observaciones_1a)}</td>
                      <td>{obsToNumber(r.observaciones_1et)}</td>
                    </tr>
                  ))}

                  {preview.length === 0 && !error && (
                    <tr>
                      <td colSpan={16} className="ord-empty">
                        Sin datos para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="ord-footer">
          <button
            type="button"
            className="ord-btn ord-btn-neutral"
            onClick={() => !loadingApply && onClose?.()}
            disabled={loadingApply}
          >
            <i className="fa-solid fa-xmark" />
            Cerrar
          </button>
          <button
            type="button"
            className="ord-btn ord-btn-primary"
            onClick={aplicarRanking}
            disabled={loadingApply || preview.length === 0}
            title={
              preview.length === 0
                ? "No hay datos para aplicar."
                : "Aplicar el orden de ranking en la base"
            }
          >
            <i className="fa-solid fa-arrow-down-wide-short" />
            {loadingApply ? "Aplicando…" : "Aplicar y Guardar (orden)"}
          </button>
        </div>

        <div className="ord-tip">
          <i className="fa-regular fa-lightbulb" />
          Esta operación actualiza el orden en la base según los criterios configurados.
        </div>
      </div>
    </div>
  );
};

export default ModalOrdenar;
