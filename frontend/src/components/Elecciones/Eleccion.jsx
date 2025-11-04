import React, { useMemo, useRef, useState } from "react";
import BASE_URL from "../../config/config";
import Toast from "../Global/Toast";
import EleccionTabsHeader from "./EleccionTabsHeader";
import PestanaEleccion from "./PestanaEleccion";
import PestanaResultados from "./PestanaResultados";

const Eleccion = () => {
  // ====== TABS ======
  const [activeTab, setActiveTab] = useState("eleccion"); // 'eleccion' | 'resultados'

  // ====== TOAST ROBUSTO (compartido) ======
  const [toast, setToast] = useState(null); // { tipo, mensaje, duracion, id }
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

  // ====== Helper fetch JSON (compartido) ======
  const fetchJSON = async (url, opts = {}) => {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) {}
    if (!res.ok) {
      const msg = data?.mensaje || data?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    if (data?.exito === false) throw new Error(data?.mensaje || "Error");
    return data;
  };

  // ROL (para Resultados)
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("usuario")) || null; }
    catch { return null; }
  }, []);
  const role = (user?.rol || "").toLowerCase();
  const isAdmin = role === "admin";

  return (
    <div className="eleccion-page" style={{ minHeight: "100vh" }}>
      <h1 className="title" style={{ textAlign: "center", margin: "10px 0 16px" }}>
        Elección de la Especialidad
      </h1>

      {/* Cabecera con pestañas */}
      <EleccionTabsHeader
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Contenido por pestaña */}
      <div style={{ marginTop: 14 }}>
        {activeTab === "eleccion" ? (
          <PestanaEleccion
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

      {/* Toast global */}
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
};

export default Eleccion;
