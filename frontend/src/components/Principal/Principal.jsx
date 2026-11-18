// src/components/Principal/Principal.jsx
// Layout principal: barra superior + barra lateral + contenido (Outlet).
import React, { useEffect, useMemo, useState, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faXmark,
  faGear,
  faSignOutAlt,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import {
  CONFIG_ITEM,
  INICIO_ITEM,
  ROL_LABEL,
  getMenu,
  leerUsuario,
  nombreUsuario,
} from "./menu";
import "./principal.css";
import logoRH from "../../imagenes/Escudo.png";

/* =========== Modal cierre de sesión ============= */
const ConfirmLogoutModal = ({ open, onClose, onConfirm }) => {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    cancelBtnRef.current?.focus();
    const onKeyDown = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  const stop = (e) => e.stopPropagation();

  return createPortal(
    <div
      className="modalprincipal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalprincipal-title"
      onMouseDown={onClose}
    >
      <div className="modalprincipal-container modalprincipal--danger" onMouseDown={stop}>
        <div className="modalprincipal__icon" aria-hidden="true">
          <FontAwesomeIcon icon={faSignOutAlt} />
        </div>

        <h3 id="modalprincipal-title" className="modalprincipal-title">
          Confirmar cierre de sesión
        </h3>
        <p className="modalprincipal-text">¿Estás seguro de que deseas cerrar la sesión?</p>

        <div className="modalprincipal-buttons">
          <button
            type="button"
            className="modalprincipal-btn modalprincipal-btn--ghost"
            onClick={onClose}
            ref={cancelBtnRef}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="modalprincipal-btn modalprincipal-btn--solid-danger"
            onClick={onConfirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

function EscudoMark() {
  return <img className="pp-escudo" src={logoRH} alt="" aria-hidden="true" />;
}

const Principal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Se relee en cada cambio de ruta (por ejemplo, si se editó el propio usuario).
  const usuario = useMemo(
    () => leerUsuario(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.pathname]
  );
  const isAdmin = usuario?.rol === "admin";
  const nombre = nombreUsuario(usuario);
  const navItems = [INICIO_ITEM, ...getMenu(isAdmin)];
  const enConfiguracion = location.pathname.startsWith(CONFIG_ITEM.ruta);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const activeLabel = useMemo(() => {
    const all = [INICIO_ITEM, ...getMenu(true), CONFIG_ITEM];
    const found = all.find(
      (item) =>
        location.pathname === item.ruta || location.pathname.startsWith(`${item.ruta}/`)
    );
    return found ? found.text : "IPET 50";
  }, [location.pathname]);

  const confirmarCierreSesion = () => {
    setIsExiting(true);
    setTimeout(() => {
      sessionStorage.clear();
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      setShowModal(false);
      navigate("/", { replace: true });
    }, 400);
  };

  return (
    <div className={`pp-shell ${isExiting ? "pp-shell--exiting" : ""}`}>
      {/* ===== Barra superior ===== */}
      <header className="pp-topbar">
        <div className="pp-topbar__left">
          <button
            className="pp-iconBtn pp-burger"
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
          >
            <FontAwesomeIcon icon={faBars} />
          </button>

          <div className="pp-topbar__brand">
            <span className="pp-topbar__mark">
              <EscudoMark />
            </span>
            <span className="pp-topbar__brandText">
              <strong>IPET 50</strong>
              <small>Elección de Especialidad</small>
            </span>
          </div>
        </div>

        <div className="pp-topbar__right">
          <div className="pp-topbar__section">{activeLabel}</div>

          {isAdmin ? (
            <button
              className={`pp-iconBtn pp-topbarConfig ${enConfiguracion ? "is-active" : ""}`}
              type="button"
              onClick={() => navigate(CONFIG_ITEM.ruta)}
              title="Configuración"
              aria-label="Abrir configuración"
            >
              <FontAwesomeIcon icon={faGear} />
            </button>
          ) : null}

          {nombre ? (
            <div className="pp-topbar__user" title={nombre}>
              <span className="pp-topbar__avatar" aria-hidden="true">
                {nombre.charAt(0).toUpperCase()}
              </span>
              <span className="pp-topbar__userText">
                <strong>{nombre}</strong>
                <small>{ROL_LABEL[usuario?.rol] || "Vista"}</small>
              </span>
            </div>
          ) : null}

          <button
            className="pp-iconBtn pp-topbarLogout"
            type="button"
            onClick={() => setShowModal(true)}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <FontAwesomeIcon icon={faRightFromBracket} />
          </button>
        </div>
      </header>

      {/* ===== Fondo del menú móvil ===== */}
      <div
        className={`pp-drawerOverlay ${drawerOpen ? "is-open" : ""}`}
        onMouseDown={() => setDrawerOpen(false)}
      />

      {/* ===== Barra lateral ===== */}
      <aside className={`pp-sidebar ${drawerOpen ? "is-drawerOpen" : ""}`}>
        <div className="pp-drawerHeader">
          <div className="pp-brand">
            <div className="pp-brand__mark">
              <EscudoMark />
            </div>
            <div className="pp-brand__text">
              <div className="pp-brand__title">IPET 50</div>
              <div className="pp-brand__subtitle">Elección de Especialidad</div>
            </div>
          </div>
          <button
            className="pp-drawerClose"
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div
          className="pp-brand pp-brand--side"
          onClick={() => navigate("/panel")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/panel")}
          role="button"
          tabIndex={0}
          title="Ir al inicio"
        >
          <div className="pp-brand__mark">
            <EscudoMark />
          </div>
          <div className="pp-brand__text">
            <div className="pp-brand__title">IPET 50</div>
            <div className="pp-brand__subtitle">Elección de Especialidad</div>
          </div>
        </div>

        <nav className="pp-nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.ruta}
              end={item.ruta === "/panel"}
              className={({ isActive }) => `pp-nav__item ${isActive ? "is-active" : ""}`}
              title={item.text}
              onClick={() => document.activeElement?.blur?.()}
            >
              <span className="pp-nav__icon">
                <FontAwesomeIcon icon={item.icon} />
              </span>
              <span className="pp-nav__label">{item.text}</span>
            </NavLink>
          ))}

          {isAdmin ? (
            <NavLink
              to={CONFIG_ITEM.ruta}
              className={({ isActive }) =>
                `pp-nav__item pp-nav__item--mobileOnly ${isActive ? "is-active" : ""}`
              }
              title={CONFIG_ITEM.text}
            >
              <span className="pp-nav__icon">
                <FontAwesomeIcon icon={CONFIG_ITEM.icon} />
              </span>
              <span className="pp-nav__label">{CONFIG_ITEM.text}</span>
            </NavLink>
          ) : null}
        </nav>
      </aside>

      {/* ===== Contenido ===== */}
      <main className="pp-content">
        <div className="pp-content__inner">
          <Outlet />
        </div>
      </main>

      <ConfirmLogoutModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={confirmarCierreSesion}
      />
    </div>
  );
};

export default Principal;
