// src/components/TablaEleccion/TablaEleccion.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../config/config";
import ModalConfirmarEliminar from "./modales/ModalConfirmarEliminar";
import Toast from "../Global/Toast";

/**
 * TablaEleccion:
 * - Lista ELECCIONES (JOIN: eleccion + alumnos + especialidad)
 * - Filtro por especialidad
 * - Exporta a CSV (lo filtrado)
 * - Eliminar TODO + reset de cupos_actuales (solo ADMIN)
 * - Volver al panel
 */

const TablaEleccion = () => {
  const navigate = useNavigate();

  const [filas, setFilas] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [filtro, setFiltro] = useState("todas");

  const [openDel, setOpenDel] = useState(false);
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState("");

  // ====== ROL (admin / vista) ======
  const [usuario, setUsuario] = useState(null);
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("usuario"));
      setUsuario(u || null);
    } catch {
      setUsuario(null);
    }
  }, []);
  const role = (usuario?.rol || "").toLowerCase();
  const isAdmin = role === "admin";

  /* ====== TOAST ROBUSTO ====== */
  const [toast, setToast] = useState(null); // {tipo, mensaje, duracion, id}
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
  useEffect(() => () => clearToastTimer(), []);
  /* =========================== */

  const fetchAll = useCallback(async () => {
    try {
      // 1) Elecciones
      const rElec = await fetch(`${BASE_URL}/api.php?action=obtener_elecciones`);
      const jElec = await rElec.json();
      if (jElec?.exito) setFilas(jElec.data || []);
      else throw new Error(jElec?.mensaje || "No se pudieron cargar las elecciones.");

      // 2) Listas (especialidades para el filtro)
      const rList = await fetch(`${BASE_URL}/api.php?action=obtener_listas`);
      const jList = await rList.json();
      if (jList?.exito && Array.isArray(jList.especialidad)) {
        setEspecialidades(jList.especialidad);
      } else {
        throw new Error(jList?.mensaje || "No se pudieron cargar las especialidades.");
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
      showToast("error", err.message || "No se pudo cargar la tabla.");
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const visibles =
    filtro === "todas"
      ? filas
      : filas.filter(
          (f) => (f.especialidad || "").toLowerCase() === filtro.toLowerCase()
        );

  const exportarExcel = () => {
    try {
      const SEP = ";";
      const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const header = ["Orden", "Alumno", "DNI", "Especialidad"];
      const rows = visibles.map((f) => [
        f.orden,
        (f.nombre || "").toUpperCase(),
        f.dni || "",
        f.especialidad || "",
      ]);
      const csv =
        "\uFEFF" + [header, ...rows].map((row) => row.map(quote).join(SEP)).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "eleccion_especialidad.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("exito", "Exportación generada correctamente.");
    } catch (e) {
      console.error(e);
      showToast("error", "No se pudo exportar el archivo.");
    }
  };

  const confirmarEliminar = async () => {
    setDelError("");
    setDelLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api.php?action=reset_elecciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmar: true }),
      });
      const j = await res.json();
      if (!res.ok || !j?.exito) {
        throw new Error(j?.mensaje || "No se pudo eliminar.");
      }
      setOpenDel(false);
      showToast("exito", j?.mensaje || "Se eliminó todo y se reiniciaron los cupos.");
      await fetchAll(); // refrescar
    } catch (e) {
      setDelError(e.message);
      showToast("error", e.message || "Error al eliminar.");
    } finally {
      setDelLoading(false);
    }
  };

  return (
    <div className="tabla-eleccion" style={{ padding: 20, backgroundColor: "#fff8c6", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", marginBottom: 20 }}>
        Elección de la Especialidad - Tablas
      </h1>

      {/* Filtros + Acciones */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 15,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          style={{
            padding: "10px 15px",
            borderRadius: 8,
            fontWeight: 600,
            background: "#fff3d2",
            border: "1px solid #d7872f",
            minWidth: 260,
          }}
        >
          <option value="todas">Todas las especialidades</option>
          {especialidades.map((esp) => (
            <option key={esp.id} value={esp.nombre}>
              {esp.nombre}
            </option>
          ))}
        </select>


        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={exportarExcel}
            style={{
              padding: "10px 20px",
              background: "#e5891d",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Exportar a Excel
          </button>

          {/* 🔒 Solo ADMIN ve este botón */}
          {isAdmin && (
            <button
              onClick={() => { setDelError(""); setOpenDel(true); }}
              style={{
                padding: "10px 20px",
                background: "#d92d20",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Eliminar todo
            </button>
          )}

          <button
            onClick={() => navigate("/panel")}
            style={{
              padding: "10px 20px",
              background: "#c26f16",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Volver
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr style={{ background: "#d7872f", color: "#fff" }}>
              <th style={th}>Orden</th>
              <th style={th}>Alumno</th>
              <th style={th}>DNI</th>
              <th style={th}>Especialidad</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((f, i) => (
              <tr key={f.id_eleccion ?? i} style={{ background: i % 2 === 0 ? "#fceea3" : "#f4a742" }}>
                <td style={td}>{f.orden}</td>
                <td style={td}>{(f.nombre || "").toUpperCase()}</td>
                <td style={td}>{f.dni}</td>
                <td style={td}>{f.especialidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmación (solo se abre si isAdmin y apretó el botón) */}
      <ModalConfirmarEliminar
        open={openDel}
        onClose={() => setOpenDel(false)}
        onConfirm={confirmarEliminar}
        loading={delLoading}
        error={delError}
      />

      {/* Toast */}
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

const th = {
  padding: "12px 8px",
  textAlign: "left",
  fontWeight: 700,
  borderBottom: "2px solid #e4a74d",
};

const td = {
  padding: "10px 8px",
  borderBottom: "1px solid #e4a74d",
  fontWeight: 600,
};

export default TablaEleccion;
