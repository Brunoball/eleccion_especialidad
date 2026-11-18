// src/components/Configuracion/Configuracion.jsx
// Inicio de Configuración: accesos a cada área administrable.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faUsers,
  faChair,
  faFileImport,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { apiAction } from "../Global/api";
import "./configuracion.css";

function AccessCard({ icon, title, status, description, area, detail, onClick }) {
  return (
    <button type="button" className="cfg-card" onClick={onClick}>
      <span className="cfg-card__icon" aria-hidden="true">
        <FontAwesomeIcon icon={icon} />
      </span>
      <strong className="cfg-card__title">{title}</strong>
      <span className="cfg-card__status">{status}</span>
      <span className="cfg-card__description">{description}</span>
      <span className="cfg-card__meta">
        <span>
          <small>ÁREA</small>
          {area}
        </span>
        <span>
          <small>DETALLE</small>
          {detail}
        </span>
      </span>
      <span className="cfg-card__arrow" aria-hidden="true">
        <FontAwesomeIcon icon={faChevronRight} />
      </span>
    </button>
  );
}

export default function Configuracion() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    apiAction("usuarios_listar", undefined, { signal: controller.signal })
      .then((r) => setUsuarios(Array.isArray(r.usuarios) ? r.usuarios : []))
      .catch(() => setUsuarios(null));
    return () => controller.abort();
  }, []);

  const totalUsuarios = usuarios ? usuarios.length : null;
  const admins = usuarios ? usuarios.filter((u) => u.rol === "admin").length : 0;

  const cards = [
    {
      id: "usuarios",
      icon: faUsers,
      title: "Usuarios y roles",
      status:
        totalUsuarios === null
          ? "Seguridad"
          : `${totalUsuarios} usuario${totalUsuarios === 1 ? "" : "s"}`,
      description:
        "Agregá personas al sistema, editá su rol o su contraseña y quitá los accesos que ya no se usan.",
      area: "Usuarios",
      detail:
        totalUsuarios === null
          ? "Administradores y vista"
          : `${admins} administrador${admins === 1 ? "" : "es"} · ${totalUsuarios - admins} vista`,
      path: "/configuracion/usuarios",
    },
    {
      id: "cupos",
      icon: faChair,
      title: "Cupos por especialidad",
      status: "Elección",
      description:
        "Definí cuántos lugares tiene cada especialidad antes de empezar la elección.",
      area: "Especialidades",
      detail: "Cupo total por especialidad",
      path: "/cupos",
    },
    {
      id: "ordenar",
      icon: faFileImport,
      title: "Carga y ranking de alumnos",
      status: "Alumnos",
      description:
        "Importá el listado de alumnos, revisá los criterios y aplicá el orden del ranking.",
      area: "Alumnos",
      detail: "Importación, criterios y orden",
      path: "/ordenar",
    },
  ];

  return (
    <div className="mod-page cfg-page">
      <header className="mod-head">
        <div className="mod-head__main">
          <span className="mod-head__icon" aria-hidden="true">
            <FontAwesomeIcon icon={faGear} />
          </span>
          <div className="mod-head__titles">
            <h1>Configuración</h1>
            <p>Administración general del sistema de elección.</p>
          </div>
        </div>
      </header>

      <div className="mod-body cfg-body">
        <section className="cfg-intro">
          <span className="cfg-intro__icon" aria-hidden="true">
            <FontAwesomeIcon icon={faGear} />
          </span>
          <div>
            <small>CONFIGURACIÓN DEL SISTEMA</small>
            <strong>Administración y configuración general</strong>
            <p>
              Gestioná quién puede entrar al sistema y con qué permisos, y
              accedé rápido a los parámetros de la elección.
            </p>
          </div>
        </section>

        <nav className="cfg-grid" aria-label="Secciones de configuración">
          {cards.map((card) => (
            <AccessCard key={card.id} {...card} onClick={() => navigate(card.path)} />
          ))}
        </nav>
      </div>
    </div>
  );
}
