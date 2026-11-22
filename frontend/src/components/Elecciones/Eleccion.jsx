// frontend/src/components/Eleccion/Eleccion.jsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import BASE_URL from "../../config/config";
import Toast from "../Global/Toast";
import PestanaEleccion from "./PestanaEleccion";
import PestanaResultados from "./PestanaResultados";
import PestanaHistorial from "../Historial/PestanaHistorial";
import "./Eleccion.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default function Eleccion() {
  const [activeTab, setActiveTab] = useState("eleccion");
  const [toast, setToast] = useState(null);
  const toastCtrl = useRef({ timer: null });

  // Funciones estables (useCallback): la pestaña Resultados las usa como
  // dependencias y, si cambiaran en cada render, volvería a pedir los datos
  // cada vez que aparece un aviso.
  const clearToastTimer = useCallback(() => {
    if (toastCtrl.current.timer) {
      clearTimeout(toastCtrl.current.timer);
      toastCtrl.current.timer = null;
    }
  }, []);

  const showToast = useCallback((tipo, mensaje, duracion = 2800) => {
    clearToastTimer();
    setToast(null);
    setTimeout(() => {
      const id = `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      setToast({ tipo, mensaje, duracion, id });
      toastCtrl.current.timer = setTimeout(() => {
        setToast((t) => (t && t.id === id ? null : t));
        toastCtrl.current.timer = null;
      }, Math.max(800, duracion + 100));
    }, 0);
  }, [clearToastTimer]);

  const handleToastClose = (id) => {
    clearToastTimer();
    setToast((t) => (t && t.id === id ? null : t));
  };

  const fetchJSON = useCallback(async (url, opts = {}) => {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {}
    if (!res.ok) {
      const msg = data?.mensaje || data?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    if (data?.exito === false) {
      throw new Error(data?.mensaje || "Error");
    }
    return data;
  }, []);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("usuario")) || null;
    } catch {
      return null;
    }
  }, []);

  const role = (user?.rol || "").toLowerCase();
  const isAdmin = role === "admin";

  const eleccionRef = useRef(null);

  const abrirModoPantallaDesdeInicio = () => {
    eleccionRef.current?.abrirModoPantallaDesde?.(0);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="eleccion-root mod-page">
      {/* ENCABEZADO: título, pestañas y acciones en una sola fila */}
      <header className="mod-head">
        <div className="mod-head__main">
          <span className="mod-head__icon" aria-hidden="true">
            <i className="fa-solid fa-layer-group" />
          </span>
          <div className="mod-head__titles">
            <h1>Elección de especialidad</h1>
            <p>
              {activeTab === "eleccion"
                ? "Asigná la especialidad de cada alumno según el orden del ranking."
                : activeTab === "resultados"
                ? "Consultá, filtrá y exportá las inscripciones confirmadas."
                : "Elecciones anteriores guardadas al limpiar, por fecha."}
            </p>
          </div>
        </div>

        <div className="mod-head__center">
          <div className="mod-tabs" role="tablist" aria-label="Secciones de la elección">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "eleccion"}
              className={`mod-tab ${activeTab === "eleccion" ? "is-active" : ""}`}
              onClick={() => setActiveTab("eleccion")}
            >
              <i className="fa-solid fa-list-check" aria-hidden="true" />
              Elección
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "resultados"}
              className={`mod-tab ${activeTab === "resultados" ? "is-active" : ""}`}
              onClick={() => setActiveTab("resultados")}
            >
              <i className="fa-solid fa-square-poll-vertical" aria-hidden="true" />
              Resultados
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "historial"}
              className={`mod-tab ${activeTab === "historial" ? "is-active" : ""}`}
              onClick={() => setActiveTab("historial")}
            >
              <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
              Historial
            </button>
          </div>
        </div>

        <div className="mod-head__actions">
          <button
            id="btn-modo-pantalla"
            type="button"
            className={`mod-btn mod-btn--primary fade-toggle ${
              activeTab === "eleccion" ? "fade-in" : "fade-out"
            }`}
            onClick={abrirModoPantallaDesdeInicio}
          >
            <i className="fa-solid fa-display" aria-hidden="true" />
            <span>Modo Pantalla</span>
          </button>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className={`eleccion-main mod-body modal-appear ${mounted ? "in" : ""}`}>
        <div className="eleccion-content">
          {activeTab === "eleccion" ? (
            <PestanaEleccion
              ref={eleccionRef}
              BASE_URL={BASE_URL}
              fetchJSON={fetchJSON}
              showToast={showToast}
            />
          ) : activeTab === "resultados" ? (
            <PestanaResultados
              BASE_URL={BASE_URL}
              fetchJSON={fetchJSON}
              showToast={showToast}
              isAdmin={isAdmin}
            />
          ) : (
            <PestanaHistorial
              BASE_URL={BASE_URL}
              fetchJSON={fetchJSON}
              showToast={showToast}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </main>

      {toast && (
        <Toast
          key={toast.id}
          tipo={toast.tipo}
          mensaje={toast.mensaje}
          duracion={toast.duracion}
          onClose={() => handleToastClose(toast.id)}
        />
      )}
    </div>
  );
}
