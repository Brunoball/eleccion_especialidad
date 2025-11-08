// frontend/src/components/Eleccion/Eleccion.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import Toast from "../Global/Toast";
import PestanaEleccion from "./PestanaEleccion";
import PestanaResultados from "./PestanaResultados";
import "./Eleccion.css";

export default function Eleccion() {
  const navigate = useNavigate();

  // ===== Tabs =====
  const [activeTab, setActiveTab] = useState("eleccion");

  // ===== Toast =====
  const [toast, setToast] = useState(null);
  const toastCtrl = useRef({ timer: null });

  const clearToastTimer = () => {
    if (toastCtrl.current.timer) {
      clearTimeout(toastCtrl.current.timer);
      toastCtrl.current.timer = null;
    }
  };

  const showToast = (tipo, mensaje, duracion = 2800) => {
    clearToastTimer();
    setToast(null);
    setTimeout(() => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setToast({ tipo, mensaje, duracion, id });
      toastCtrl.current.timer = setTimeout(() => {
        setToast((t) => (t && t.id === id ? null : t));
        toastCtrl.current.timer = null;
      }, Math.max(800, duracion + 100));
    }, 0);
  };

  const handleToastClose = (id) => {
    clearToastTimer();
    setToast((t) => (t && t.id === id ? null : t));
  };

  // ===== fetch helper =====
  const fetchJSON = async (url, opts = {}) => {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {
      // si no es JSON válido, data queda como {}
    }
    if (!res.ok) {
      const msg = data?.mensaje || data?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    if (data?.exito === false) {
      throw new Error(data?.mensaje || "Error");
    }
    return data;
  };

  // ===== Rol del usuario =====
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("usuario")) || null;
    } catch {
      return null;
    }
  }, []);

  const role = (user?.rol || "").toLowerCase();
  const isAdmin = role === "admin";

  // ===== Ref al componente hijo (solo Elección) =====
  const eleccionRef = useRef(null);

  // ===== Botones superiores =====
  const abrirModoPantallaDesdeInicio = () => {
    eleccionRef.current?.abrirModoPantallaDesde?.(0);
  };

  const volverDashboardIgual = () => {
    // Si la pestaña Elección está montada y expone irDashboard, usalo
    if (eleccionRef.current?.irDashboard) {
      eleccionRef.current.irDashboard();
      return;
    }

    // Si no hay ref (por ejemplo estás en Resultados),
    // volvés a la pantalla anterior en lugar de forzar /dashboard
    navigate(-1);
  };

  // ===== Animación de entrada tipo modal =====
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // ===== Render =====
  return (
    <div className="app-bg">
      <main className="content centered">
        <div className={`content-card fixed modal-appear ${mounted ? "in" : ""}`}>
          {/* Encabezado con tabs y acciones */}
          <div className="card-head">
            <div className="tabs">
              <button
                className={`tab ${activeTab === "eleccion" ? "active" : ""}`}
                onClick={() => setActiveTab("eleccion")}
              >
                Elección
              </button>
              <button
                className={`tab ${activeTab === "resultados" ? "active" : ""}`}
                onClick={() => setActiveTab("resultados")}
              >
                Resultados
              </button>
            </div>

            <div className="card-actions">
              {activeTab === "eleccion" && (
                <button
                  id="btn-modo-pantalla"
                  className="btn btn-ghost"
                  onClick={abrirModoPantallaDesdeInicio}
                >
                  Modo Pantalla
                </button>
              )}

              <button
                id="btn-volver-dashboard"
                className="btn btn-primary"
                onClick={volverDashboardIgual}
              >
                Volver
              </button>
            </div>
          </div>

          <h1 className="page-title">Elección de la Especialidad</h1>

          {/* Cuerpo con scroll interno */}
          <div className="card-body scroll-y">
            {activeTab === "eleccion" ? (
              <PestanaEleccion
                ref={eleccionRef}
                BASE_URL={BASE_URL}
                fetchJSON={fetchJSON}
                showToast={showToast}
              />
            ) : (
              <PestanaResultados
                BASE_URL={BASE_URL}
                fetchJSON={fetchJSON}
                showToast={showToast}
                isAdmin={isAdmin}
              />
            )}
          </div>
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
