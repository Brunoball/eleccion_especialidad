// src/components/Cupos/Cupo.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BASE_URL from '../../config/config';
import Toast from '../Global/Toast';
import './Cupo.css';

// Arma la URL final como en tu otro sistema:
const API = `${BASE_URL.replace(/\/$/, '')}/api.php`;

const Cupo = () => {
  const navigate = useNavigate();
  const [especialidades, setEspecialidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [edits, setEdits] = useState({});

  // ======= TOAST ROBUSTO =======
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

  const fetchJSON = async (url, opts = {}) => {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.exito !== true) throw new Error(data?.mensaje || 'Error desconocido');
    return data;
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        setError('');
        const data = await fetchJSON(`${API}?action=obtener_cupos`);
        // Excluir AUSENTE del render
        const lista = Array.isArray(data.especialidades) ? data.especialidades : [];
        setEspecialidades(lista.filter(e => (e.nombre || '').toUpperCase() !== 'AUSENTE'));
        setEdits({});
      } catch (e) {
        console.error(e);
        setError(
          e.message.includes('Failed to fetch') || e.message.includes('HTTP')
            ? `No se pudo conectar con el backend. Verificá que esté corriendo en ${API}`
            : e.message
        );
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const handleChange = (id, nombre, value) => {
    // por seguridad, si llegara AUSENTE, lo fuerza a 0 y listo (aunque no se renderiza)
    if ((nombre || '').toUpperCase() === 'AUSENTE') {
      setEdits((p) => ({ ...p, [id]: 0 }));
      return;
    }
    const v = value === '' ? '' : Number(value);
    if (v === '' || (Number.isFinite(v) && v >= 0)) setEdits((p) => ({ ...p, [id]: v }));
  };

  const valorEditado = (id, actual) =>
    Object.prototype.hasOwnProperty.call(edits, id) ? edits[id] : (actual ?? 0);

  const hayCambios = useMemo(
    () =>
      especialidades.some((e) => {
        const nuevo = Object.prototype.hasOwnProperty.call(edits, e.id) ? edits[e.id] : undefined;
        return nuevo !== undefined && String(nuevo) !== String(e.cupo ?? 0);
      }),
    [especialidades, edits]
  );

  const guardarUno = async (id) => {
    try {
      const esp = especialidades.find((x) => x.id === id);
      if (!esp) return;
      const cupo = valorEditado(id, esp.cupo);
      if (cupo === '' || cupo < 0) {
        showToast('advertencia', 'Ingresá un cupo válido (≥ 0).');
        return;
      }

      setGuardando(true);
      await fetchJSON(`${API}?action=editar_cupos`, {
        method: 'POST',
        body: JSON.stringify({ id, cupo: Number(cupo) }),
      });
      setEspecialidades((prev) =>
        prev.map((e) => (e.id === id ? { ...e, cupo: Number(cupo) } : e))
      );
      setEdits(({ [id]: _omit, ...rest }) => rest);
      showToast('exito', `Cupo de "${esp.nombre}" actualizado.`);
    } catch (e) {
      console.error(e);
      showToast('error', e.message || 'Error al guardar el cupo');
    } finally {
      setGuardando(false);
    }
  };

  const guardarTodos = async () => {
    const payload = especialidades
      .map((e) => {
        const nuevo = Object.prototype.hasOwnProperty.call(edits, e.id) ? edits[e.id] : undefined;
        if (nuevo === undefined || String(nuevo) === String(e.cupo ?? 0)) return null;
        return { id: e.id, cupo: Number(nuevo), nombre: e.nombre };
      })
      .filter(Boolean);

    if (payload.length === 0) {
      showToast('advertencia', 'No hay cambios para guardar.');
      return;
    }

    try {
      setGuardando(true);
      // Al backend no le interesa el nombre; lo dejamos por si querés loguearlo arriba
      await fetchJSON(`${API}?action=editar_cupos`, {
        method: 'POST',
        body: JSON.stringify(payload.map(({ id, cupo }) => ({ id, cupo }))),
      });
      setEspecialidades((prev) =>
        prev.map((e) => {
          const item = payload.find((p) => p.id === e.id);
          return item ? { ...e, cupo: item.cupo } : e;
        })
      );
      setEdits({});
      showToast('exito', `Cupos actualizados (${payload.length} especialidad/es).`);
    } catch (e) {
      console.error(e);
      showToast('error', e.message || 'Error al guardar los cupos');
    } finally {
      setGuardando(false);
    }
  };

  const volver = () => navigate('/panel');

  if (cargando) return <div className="cupo-container"><div className="cargando">Cargando…</div></div>;
  if (error)
    return (
      <div className="cupo-container">
        <div className="error">Error: {error}</div>
        <button className="btn-volver" onClick={volver}>Volver</button>
      </div>
    );

  return (
    <div className="cupo-container">
      <h1 className="titulo-principal">Elección de la Especialidad - Gestión de Cupos</h1>

      <div className="acciones-top">
        <button className="btn-primario" disabled={guardando || !hayCambios} onClick={guardarTodos}>
          {guardando ? 'Guardando…' : 'Guardar todos'}
        </button>
        <button className="btn-volver" onClick={volver}>Volver</button>
      </div>

      <div className="especialidades-grid">
        {especialidades.map((e) => {
          const value = valorEditado(e.id, e.cupo);
          return (
            <div key={e.id} className="especialidad-card">
              <div className="especialidad-nombre">{e.nombre}</div>
              <div className="cupo-section">
                <label className="cupo-label" htmlFor={`cupo-${e.id}`}>Cupo</label>
                <input
                  id={`cupo-${e.id}`}
                  className="cupo-input"
                  type="number"
                  min={0}
                  value={value === '' ? '' : Number(value)}
                  disabled={guardando}
                  onChange={(ev) => handleChange(e.id, e.nombre, ev.target.value)}
                />
              </div>
              <button
                className="btn-guardar"
                disabled={guardando || (String(value) === String(e.cupo ?? 0))}
                onClick={() => guardarUno(e.id)}
              >
                Guardar
              </button>
            </div>
          );
        })}
      </div>

      {/* Toast único y robusto */}
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

export default Cupo;
