// src/components/Principal/Panel.jsx
// Panel de inicio (/panel): dashboard con el estado de la elección.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faChair,
  faCircleCheck,
  faClock,
  faFlagCheckered,
  faListOl,
  faRotateRight,
  faTriangleExclamation,
  faUserGraduate,
  faUserSlash,
  faUsers,
  faRepeat,
  faChartColumn,
} from "@fortawesome/free-solid-svg-icons";
import { apiAction } from "../Global/api";
import "./dashboard.css";

const VACIO = {
  fecha: "",
  alumnos: {},
  eleccion: {},
  cupos: {},
  especialidades: [],
  ultimas: [],
  usuarios: {},
};

const n = (v) => Number(v || 0);
const fmt = (v) => n(v).toLocaleString("es-AR");

function MetricCard({ icon, title, value, detail, tone = "default" }) {
  return (
    <article className={`dash-metric is-${tone}`}>
      <div className="dash-metric__icon">
        <FontAwesomeIcon icon={icon} />
      </div>
      <div className="dash-metric__body">
        <span>{title}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  );
}

function Indicator({ icon, label, value, detail, tone = "default" }) {
  return (
    <article className={`dash-indicator is-${tone}`}>
      <div className="dash-indicator__icon">
        <FontAwesomeIcon icon={icon} />
      </div>
      <div className="dash-indicator__body">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  );
}

function OcupacionChart({ items }) {
  if (!items.length) {
    return (
      <div className="mod-empty">
        <span className="mod-empty__icon">
          <FontAwesomeIcon icon={faChartColumn} />
        </span>
        <strong>Sin especialidades</strong>
        <span>Todavía no hay especialidades cargadas.</span>
      </div>
    );
  }

  return (
    <div className="dash-chart" role="img" aria-label="Ocupación de cada especialidad sobre su cupo">
      <div className="dash-chart__grid" aria-hidden="true">
        <i data-label="100%" />
        <i data-label="75%" />
        <i data-label="50%" />
        <i data-label="25%" />
        <i data-label="0%" />
      </div>
      <div className="dash-chart__cols" style={{ "--cols": items.length }}>
        {items.map((e) => {
          const pct = e.cupo > 0 ? Math.min(100, (e.asignados / e.cupo) * 100) : 0;
          const estado = e.cupo > 0 && e.disponibles <= 0 ? "is-full" : pct >= 80 ? "is-high" : "";
          return (
            <div className={`dash-chart__col ${estado}`} key={e.id}>
              <strong className="dash-chart__value">
                {e.asignados}
                <small>/{e.cupo}</small>
              </strong>
              <div className="dash-chart__track" title={`${e.nombre}: ${e.asignados} de ${e.cupo} (${Math.round(pct)}%)`}>
                <i style={{ height: `${pct > 0 ? Math.max(pct, 3) : 0}%` }} />
              </div>
              <span className="dash-chart__name" title={e.nombre}>
                {e.nombre}
              </span>
              <small className="dash-chart__free">
                {e.disponibles > 0 ? `${e.disponibles} libres` : "Completa"}
              </small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const Panel = () => {
  const [resumen, setResumen] = useState(VACIO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  // Limpieza de datos temporales (se mantiene del panel anterior)
  useEffect(() => {
    try {
      localStorage.removeItem("ultimaBusqueda");
      localStorage.removeItem("ultimosResultados");
      localStorage.removeItem("alumnoSeleccionado");
      localStorage.removeItem("ultimaAccion");
    } catch {}
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    apiAction("dashboard_resumen", undefined, { signal: controller.signal })
      .then((r) => setResumen({ ...VACIO, ...(r.resumen || {}) }))
      .catch((e) => {
        if (e?.name !== "AbortError") setError(e.message || "No se pudo cargar el panel.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  const recargar = useCallback(() => setReload((v) => v + 1), []);

  const { alumnos, eleccion, cupos, usuarios } = resumen;
  const especialidades = useMemo(
    () => (resumen.especialidades || []).filter((e) => !e.es_ausente),
    [resumen.especialidades]
  );

  const fechaTexto = useMemo(() => {
    const d = resumen.fecha ? new Date(String(resumen.fecha).replace(" ", "T")) : new Date();
    const valida = !Number.isNaN(d.getTime()) ? d : new Date();
    return valida.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
  }, [resumen.fecha]);

  const avance = Math.max(0, Math.min(100, n(eleccion.avance)));
  const proximo = eleccion.proximo;

  return (
    <section className="dash">
      <header className="dash__header">
        <div>
          <h1>Panel de la elección</h1>
          <p>Resumen actualizado con la información registrada en la base.</p>
        </div>
        <div className="dash__headerActions">
          <div className="dash__date">
            <FontAwesomeIcon icon={faCalendarDays} />
            <span>{fechaTexto}</span>
          </div>
          <button
            type="button"
            className="dash__refresh"
            onClick={recargar}
            disabled={loading}
            title="Actualizar"
            aria-label="Actualizar el panel"
          >
            <FontAwesomeIcon icon={faRotateRight} className={loading ? "spin" : ""} />
          </button>
        </div>
      </header>

      {error ? (
        <div className="dash__error" role="alert">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          <div>
            <strong>No se pudo cargar el panel</strong>
            <span>{error}</span>
          </div>
          <button type="button" onClick={recargar}>
            <FontAwesomeIcon icon={faRotateRight} /> Reintentar
          </button>
        </div>
      ) : null}

      <div className={`dash__body ${loading ? "is-loading" : ""}`}>
        <section className="dash__metrics">
          <MetricCard
            icon={faUserGraduate}
            title="Alumnos cargados"
            value={fmt(alumnos.total)}
            detail={`${fmt(alumnos.con_orden)} con orden de ranking`}
          />
          <MetricCard
            icon={faCircleCheck}
            title="Inscriptos"
            value={fmt(eleccion.inscriptos)}
            detail={`${avance}% del total · ${fmt(eleccion.ausentes)} ausentes`}
            tone="success"
          />
          <MetricCard
            icon={faClock}
            title="Pendientes"
            value={fmt(eleccion.pendientes)}
            detail={
              proximo
                ? `Sigue: #${proximo.orden ?? "—"} ${proximo.alumno}`
                : n(alumnos.total) > 0
                ? "Todos los alumnos eligieron"
                : "Sin alumnos cargados"
            }
            tone={n(eleccion.pendientes) > 0 ? "warning" : "success"}
          />
          <MetricCard
            icon={faChair}
            title="Cupos disponibles"
            value={fmt(cupos.disponibles)}
            detail={`${fmt(cupos.ocupados)} ocupados de ${fmt(cupos.total)}`}
            tone={n(cupos.total) > 0 && n(cupos.disponibles) === 0 ? "danger" : "balance"}
          />
        </section>

        <div className="dash__grid">
          <article className="dash-panel dash-panel--chart">
            <header className="dash-panel__head">
              <div>
                <h2>Ocupación por especialidad</h2>
                <p>Lugares asignados sobre el cupo de cada especialidad.</p>
              </div>
              <span className={`dash-chip ${n(cupos.completas) > 0 ? "is-warn" : "is-ok"}`}>
                <FontAwesomeIcon icon={faFlagCheckered} />
                {n(cupos.completas)} completa{n(cupos.completas) === 1 ? "" : "s"}
              </span>
            </header>
            <OcupacionChart items={especialidades} />
          </article>

          <aside className="dash-panel dash-panel--side">
            <header className="dash-panel__head">
              <div>
                <h2>Indicadores generales</h2>
                <p>Avance de la elección y datos del padrón.</p>
              </div>
            </header>

            <div className="dash-side">
              <article className="dash-progress">
                <div className="dash-progress__top">
                  <span className="dash-progress__icon">
                    <FontAwesomeIcon icon={faListOl} />
                  </span>
                  <div>
                    <span>Avance de la elección</span>
                    <strong>{avance}%</strong>
                  </div>
                </div>
                <div className="dash-progress__track" aria-hidden="true">
                  <i style={{ width: `${avance}%` }} />
                </div>
                <small>
                  {fmt(eleccion.inscriptos)} de {fmt(alumnos.total)} alumnos ya tienen especialidad
                </small>
              </article>

              <div className="dash-indicators">
                <Indicator
                  icon={faUserSlash}
                  label="Ausentes"
                  value={fmt(eleccion.ausentes)}
                  detail="No consumen cupo"
                  tone="muted"
                />
                <Indicator
                  icon={faTriangleExclamation}
                  label="Sin trayectoria"
                  value={fmt(alumnos.sin_trayectoria)}
                  detail="Primer criterio del ranking"
                  tone="warning"
                />
                <Indicator
                  icon={faRepeat}
                  label="Repitentes"
                  value={fmt(alumnos.repitentes)}
                  detail="1° o 2° año"
                  tone="danger"
                />
                <Indicator
                  icon={faUsers}
                  label="Usuarios"
                  value={fmt(usuarios.total)}
                  detail={`${fmt(usuarios.admin)} admin · ${fmt(usuarios.vista)} vista`}
                  tone="people"
                />
              </div>

              <div className="dash-recent">
                <h3>Últimas inscripciones</h3>
                {resumen.ultimas && resumen.ultimas.length ? (
                  <ul>
                    {resumen.ultimas.map((u) => (
                      <li key={u.id}>
                        <span className="dash-recent__order">#{u.orden ?? "—"}</span>
                        <span className="dash-recent__name" title={u.alumno}>
                          {u.alumno}
                        </span>
                        <span
                          className={`dash-recent__esp ${
                            String(u.especialidad).trim().toUpperCase() === "AUSENTE" ? "is-ausente" : ""
                          }`}
                          title={u.especialidad}
                        >
                          {u.especialidad}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dash-recent__empty">Todavía no hay inscripciones registradas.</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        <footer className="dash__footer">
          Desarrollado por{" "}
          <a href="https://3devsnet.com" target="_blank" rel="noopener noreferrer">
            3devs.solutions
          </a>
        </footer>
      </div>
    </section>
  );
};

export default Panel;
