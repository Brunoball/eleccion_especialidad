// src/components/Historial/PestanaHistorial.jsx
// Pestaña "Historial" de Elección de especialidad: elecciones anteriores
// guardadas al limpiar. Se elige la fecha en un selector y se ve quién
// eligió qué especialidad y en qué orden.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faClockRotateLeft,
  faFileExport,
  faMagnifyingGlass,
  faRotateRight,
  faTrashCan,
  faUser,
  faUserGraduate,
  faUserSlash,
} from "@fortawesome/free-solid-svg-icons";
import "../Principal/principal.css";
import "./historial.css";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const aFecha = (valor) => {
  const d = new Date(String(valor || "").replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
};

const dosDig = (n) => String(n).padStart(2, "0");

const fechaCorta = (valor) => {
  const d = aFecha(valor);
  if (!d) return String(valor || "");
  return `${dosDig(d.getDate())}/${dosDig(d.getMonth() + 1)}/${d.getFullYear()} ${dosDig(
    d.getHours()
  )}:${dosDig(d.getMinutes())}`;
};

const fechaLarga = (valor) => {
  const d = aFecha(valor);
  if (!d) return String(valor || "");
  return `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()} · ${dosDig(
    d.getHours()
  )}:${dosDig(d.getMinutes())} hs`;
};

const mesAnio = (valor) => {
  const d = aFecha(valor);
  return d ? `${MESES[d.getMonth()]} ${d.getFullYear()}` : "Sin fecha";
};

const ORIGEN_LABEL = {
  resultados: "Resetear elección",
  limpiar_todo: "Limpiar todo",
};

export default function PestanaHistorial({ BASE_URL, fetchJSON, showToast, isAdmin }) {
  const [lista, setLista] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState("");

  const [seleccion, setSeleccion] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEsp, setFiltroEsp] = useState("todas");

  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  /* ---------- Lista de elecciones guardadas ---------- */
  const cargarLista = useCallback(
    async (mantener) => {
      setCargandoLista(true);
      setErrorLista("");
      try {
        const r = await fetchJSON(`${BASE_URL}/api.php?action=historial_listar`);
        const items = Array.isArray(r?.historial) ? r.historial : [];
        setLista(items);
        setSeleccion((actual) => {
          const sigue = mantener && items.some((i) => String(i.id) === String(actual));
          return sigue ? actual : items[0] ? String(items[0].id) : "";
        });
      } catch (e) {
        setErrorLista(e.message || "No se pudo cargar el historial.");
      } finally {
        setCargandoLista(false);
      }
    },
    [BASE_URL, fetchJSON]
  );

  useEffect(() => {
    cargarLista(false);
  }, [cargarLista]);

  /* ---------- Detalle de la elección elegida ---------- */
  useEffect(() => {
    if (!seleccion) {
      setDetalle(null);
      return undefined;
    }
    let cancelado = false;
    setCargandoDetalle(true);
    setBusqueda("");
    setFiltroEsp("todas");
    fetchJSON(`${BASE_URL}/api.php?action=historial_detalle&id=${encodeURIComponent(seleccion)}`)
      .then((r) => {
        if (!cancelado) setDetalle(r);
      })
      .catch((e) => {
        if (!cancelado) {
          setDetalle(null);
          showToast("error", e.message || "No se pudo cargar la elección.");
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoDetalle(false);
      });
    return () => {
      cancelado = true;
    };
  }, [seleccion, BASE_URL, fetchJSON, showToast]);

  /* ---------- Agrupar opciones por mes y año ---------- */
  const grupos = useMemo(() => {
    const out = [];
    lista.forEach((item) => {
      const etiqueta = mesAnio(item.fecha);
      let g = out.find((x) => x.etiqueta === etiqueta);
      if (!g) {
        g = { etiqueta, items: [] };
        out.push(g);
      }
      g.items.push(item);
    });
    return out;
  }, [lista]);

  const alumnos = useMemo(() => detalle?.alumnos || [], [detalle]);
  const especialidades = useMemo(
    () => (detalle?.especialidades || []).filter((e) => !e.es_ausente),
    [detalle]
  );
  const cab = detalle?.eleccion || null;

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return alumnos.filter((a) => {
      if (filtroEsp !== "todas" && a.especialidad !== filtroEsp) return false;
      if (!q) return true;
      return (
        a.alumno.toLowerCase().includes(q) ||
        String(a.dni || "").includes(q) ||
        String(a.orden ?? "") === q
      );
    });
  }, [alumnos, busqueda, filtroEsp]);

  const opcionesEsp = useMemo(
    () => Array.from(new Set(alumnos.map((a) => a.especialidad))).sort((a, b) => a.localeCompare(b)),
    [alumnos]
  );

  /* ---------- Exportar ---------- */
  const exportar = () => {
    if (!cab || !visibles.length) {
      showToast("error", "No hay datos para exportar.");
      return;
    }
    try {
      const SEP = ";";
      const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const header = ["Orden", "Alumno", "DNI", "Especialidad", "N° en la especialidad"];
      const rows = visibles.map((a) => [
        a.orden ?? "",
        a.alumno,
        a.dni,
        a.especialidad,
        a.orden_especialidad ?? "",
      ]);
      const titulo = [`${cab.titulo} - ${fechaCorta(cab.fecha)}`];
      const csv =
        "﻿" + [titulo, [], header, ...rows].map((r) => r.map(q).join(SEP)).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = aFecha(cab.fecha);
      const sufijo = d ? `${d.getFullYear()}-${dosDig(d.getMonth() + 1)}-${dosDig(d.getDate())}` : cab.id;
      a.href = url;
      a.download = `historial_eleccion_${sufijo}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("exito", "Exportación generada correctamente.");
    } catch (e) {
      showToast("error", "No se pudo exportar el archivo.");
    }
  };

  /* ---------- Eliminar registro ---------- */
  const eliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      const r = await fetchJSON(`${BASE_URL}/api.php?action=historial_eliminar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: aEliminar.id }),
      });
      setAEliminar(null);
      showToast("exito", r?.mensaje || "Registro eliminado.");
      await cargarLista(false);
    } catch (e) {
      showToast("error", e.message || "No se pudo eliminar el registro.");
    } finally {
      setEliminando(false);
    }
  };

  /* ================= Render ================= */
  if (cargandoLista && !lista.length) {
    return (
      <div className="hist-wrapper">
        <div className="mod-empty">
          <span className="mod-spinner" />
          <strong>Cargando historial</strong>
        </div>
      </div>
    );
  }

  if (errorLista) {
    return (
      <div className="hist-wrapper">
        <div className="mod-empty">
          <span className="mod-empty__icon">
            <FontAwesomeIcon icon={faClockRotateLeft} />
          </span>
          <strong>No se pudo cargar el historial</strong>
          <span>{errorLista}</span>
          <button type="button" className="mod-btn" onClick={() => cargarLista(true)}>
            <FontAwesomeIcon icon={faRotateRight} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!lista.length) {
    return (
      <div className="hist-wrapper">
        <div className="mod-empty hist-empty">
          <span className="mod-empty__icon">
            <FontAwesomeIcon icon={faClockRotateLeft} />
          </span>
          <strong>Todavía no hay elecciones guardadas</strong>
          <span>
            Cuando limpies la elección con la opción <b>“Guardar historial de la elección”</b>{" "}
            activada, va a aparecer acá con todos los alumnos y la especialidad que eligieron.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="hist-wrapper">
      {/* Barra: selector de elección, búsqueda y acciones */}
      <div className="mod-toolbar">
        <div className="mod-toolbar__group">
          <label className="hist-picker">
            <FontAwesomeIcon icon={faCalendarDays} />
            <select
              className="mod-select hist-picker__select"
              value={seleccion}
              onChange={(e) => setSeleccion(e.target.value)}
              aria-label="Elegir una elección del historial"
            >
              {grupos.map((g) => (
                <optgroup key={g.etiqueta} label={g.etiqueta}>
                  {g.items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {fechaCorta(i.fecha)} — {i.titulo} ({i.total_inscriptos} inscriptos)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <select
            className="mod-select hist-filter"
            value={filtroEsp}
            onChange={(e) => setFiltroEsp(e.target.value)}
            aria-label="Filtrar por especialidad"
            disabled={!alumnos.length}
          >
            <option value="todas">Todas las especialidades</option>
            {opcionesEsp.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          <label className="mod-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              className="mod-input hist-search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar alumno, DNI u orden"
              aria-label="Buscar alumno, DNI u orden"
            />
          </label>
        </div>

        <div className="mod-toolbar__group">
          <button type="button" className="mod-btn mod-btn--excel" onClick={exportar}>
            <FontAwesomeIcon icon={faFileExport} />
            Exportar
          </button>
          {isAdmin && cab ? (
            <button
              type="button"
              className="mod-btn mod-btn--danger"
              onClick={() => setAEliminar(cab)}
              title="Eliminar este registro del historial"
            >
              <FontAwesomeIcon icon={faTrashCan} />
              Eliminar
            </button>
          ) : null}
        </div>
      </div>

      {/* Resumen de la elección elegida */}
      {cab ? (
        <div className="hist-summary">
          <div className="hist-summary__main">
            <span className="hist-summary__icon" aria-hidden="true">
              <FontAwesomeIcon icon={faClockRotateLeft} />
            </span>
            <div className="hist-summary__titles">
              <strong>{cab.titulo}</strong>
              <span>{fechaLarga(cab.fecha)}</span>
            </div>
          </div>

          <div className="hist-summary__meta">
            <span className="hist-meta">
              <FontAwesomeIcon icon={faUserGraduate} />
              <b>{cab.total_inscriptos}</b> de {cab.total_alumnos} alumnos eligieron
            </span>
            <span className="hist-meta">
              <FontAwesomeIcon icon={faUserSlash} />
              <b>{cab.total_ausentes}</b> ausentes
            </span>
            {cab.usuario ? (
              <span className="hist-meta">
                <FontAwesomeIcon icon={faUser} />
                Guardado por <b>{cab.usuario}</b>
              </span>
            ) : null}
            <span className="hist-meta hist-meta--soft">
              Desde: {ORIGEN_LABEL[cab.origen] || cab.origen}
            </span>
          </div>
        </div>
      ) : null}

      {/* Especialidades: asignados / cupo de ese momento */}
      {especialidades.length ? (
        <div className="cupos-strip" aria-label="Especialidades en esa elección">
          <span className="cupos-strip__label">
            <i className="fa-solid fa-chair" aria-hidden="true" />
            Asignados
          </span>
          <div className="cupos-strip__list">
            {especialidades.map((e) => {
              const lleno = e.cupo > 0 && e.asignados >= e.cupo;
              return (
                <button
                  type="button"
                  key={`${e.id}-${e.nombre}`}
                  className={`cupo-chip hist-chip ${lleno ? "is-out" : "is-ok"} ${
                    filtroEsp === e.nombre ? "is-selected" : ""
                  }`}
                  onClick={() => setFiltroEsp((f) => (f === e.nombre ? "todas" : e.nombre))}
                  title={`${e.nombre}: ${e.asignados} de ${e.cupo} lugares (clic para filtrar)`}
                >
                  <span className="cupo-chip__dot" aria-hidden="true" />
                  <span className="cupo-chip__name">{e.nombre}</span>
                  <strong className="cupo-chip__value">
                    {e.asignados}
                    <small>/{e.cupo}</small>
                  </strong>
                </button>
              );
            })}
          </div>
          <span className="cupos-strip__meta">
            Mostrando <strong>{visibles.length}</strong> de <strong>{alumnos.length}</strong>
          </span>
        </div>
      ) : null}

      {/* Tabla */}
      <div className="res-grid-wrapper">
        <div className="res-grid-row res-grid-header hist-row">
          <div className="res-grid-cell">Orden</div>
          <div className="res-grid-cell">Alumno</div>
          <div className="res-grid-cell">DNI</div>
          <div className="res-grid-cell">Especialidad</div>
          <div className="res-grid-cell hist-center">N° en esp.</div>
        </div>

        <div className="res-grid-body">
          {cargandoDetalle ? (
            <div className="res-grid-body-fixed">
              <div className="res-empty">
                <div className="res-empty-spinner" />
                <div className="res-empty-text">Cargando elección…</div>
              </div>
            </div>
          ) : visibles.length === 0 ? (
            <div className="res-grid-body-fixed">
              <div className="res-empty">
                <i className="fa-solid fa-magnifying-glass res-empty-icon" aria-hidden="true" />
                <div className="res-empty-title">Sin resultados</div>
                <div className="res-empty-sub">No hay alumnos que coincidan con el filtro.</div>
              </div>
            </div>
          ) : (
            visibles.map((a, i) => (
              <div
                key={`${a.orden}-${a.dni}-${i}`}
                className={`res-grid-row hist-row ${i % 2 === 0 ? "par" : "impar"}`}
              >
                <div className="res-grid-cell">{a.orden ?? "—"}</div>
                <div className="res-grid-cell" title={a.alumno}>
                  {a.alumno}
                </div>
                <div className="res-grid-cell">{a.dni || "—"}</div>
                <div className="res-grid-cell">
                  <span className={`tag-insc ${a.es_ausente ? "tag-ausente" : "tag-ok"}`}>
                    {a.especialidad}
                  </span>
                </div>
                <div className="res-grid-cell hist-center">{a.orden_especialidad ?? "—"}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmar eliminación */}
      {aEliminar
        ? createPortal(
            <div
              className="modalprincipal-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="hist-del-title"
              onMouseDown={() => !eliminando && setAEliminar(null)}
            >
              <div
                className="modalprincipal-container modalprincipal--danger"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="modalprincipal__icon" aria-hidden="true">
                  <FontAwesomeIcon icon={faTrashCan} />
                </div>
                <h3 id="hist-del-title" className="modalprincipal-title">
                  Eliminar del historial
                </h3>
                <p className="modalprincipal-text">
                  Se eliminará el registro{" "}
                  <span className="danger-strong">{aEliminar.titulo}</span> del{" "}
                  {fechaCorta(aEliminar.fecha)} con {aEliminar.total_inscriptos} inscripciones.
                  Esta acción no se puede deshacer.
                </p>
                <div className="modalprincipal-buttons">
                  <button
                    type="button"
                    className="modalprincipal-btn modalprincipal-btn--ghost"
                    onClick={() => setAEliminar(null)}
                    disabled={eliminando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="modalprincipal-btn modalprincipal-btn--solid-danger"
                    onClick={eliminar}
                    disabled={eliminando}
                  >
                    {eliminando ? "Eliminando…" : "Eliminar"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
