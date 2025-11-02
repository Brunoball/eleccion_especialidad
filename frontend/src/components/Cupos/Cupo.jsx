// src/components/Cupos/Cupo.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BASE_URL from '../../config/config';
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
        setEspecialidades(Array.isArray(data.especialidades) ? data.especialidades : []);
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
    if ((nombre || '').toUpperCase() === 'AUSENTE') {
      setEdits((p) => ({ ...p, [id]: 0 }));
      return;
    }
    const v = value === '' ? '' : Number(value);
    if (v === '' || (Number.isFinite(v) && v >= 0)) setEdits((p) => ({ ...p, [id]: v }));
  };

  const valorEditado = (id, actual) =>
    Object.prototype.hasOwnProperty.call(edits, id) ? edits[id] : actual ?? 0;

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
      if (cupo === '' || cupo < 0) return alert('Ingresá un cupo válido (≥ 0).');

      setGuardando(true);
      await fetchJSON(`${API}?action=editar_cupos`, {
        method: 'POST',
        body: JSON.stringify({ id, cupo: Number(cupo) }),
      });
      setEspecialidades((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, cupo: e.nombre.toUpperCase() === 'AUSENTE' ? 0 : Number(cupo) } : e
        )
      );
      setEdits(({ [id]: _omit, ...rest }) => rest);
      alert('Cupo actualizado');
    } catch (e) {
      console.error(e);
      alert(e.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const guardarTodos = async () => {
    const payload = especialidades
      .map((e) => {
        const nuevo = Object.prototype.hasOwnProperty.call(edits, e.id) ? edits[e.id] : undefined;
        if (nuevo === undefined || String(nuevo) === String(e.cupo ?? 0)) return null;
        return { id: e.id, cupo: e.nombre.toUpperCase() === 'AUSENTE' ? 0 : Number(nuevo) };
      })
      .filter(Boolean);

    if (payload.length === 0) return alert('No hay cambios para guardar.');

    try {
      setGuardando(true);
      await fetchJSON(`${API}?action=editar_cupos`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setEspecialidades((prev) =>
        prev.map((e) => {
          const item = payload.find((p) => p.id === e.id);
          return item ? { ...e, cupo: e.nombre.toUpperCase() === 'AUSENTE' ? 0 : item.cupo } : e;
        })
      );
      setEdits({});
      alert('Cupos actualizados');
    } catch (e) {
      console.error(e);
      alert(e.message || 'Error al guardar los cupos');
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
        <button className="btn-volver" onClick={volver}>Volver al Dashboard</button>
      </div>

      <div className="especialidades-grid">
        {especialidades.map((e) => {
          const isAusente = (e.nombre || '').toUpperCase() === 'AUSENTE';
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
                  value={isAusente ? 0 : (value === '' ? '' : Number(value))}
                  disabled={isAusente || guardando}
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
              {isAusente && <small className="nota-ausente">AUSENTE no utiliza cupo (siempre 0)</small>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Cupo;
