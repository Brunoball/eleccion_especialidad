// src/components/Principal/Principal.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faLayerGroup,
  faSignOutAlt,
  faUserPlus,
  faArrowDownAZ, // icono para "Cargar y ordenar"
} from "@fortawesome/free-solid-svg-icons";
import "./principal.css";
import "../Global/roots.css";
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

  return (
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
    </div>
  );
};

const Principal = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("usuario"));
      setUsuario(u || null);
    } catch {
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem("ultimaBusqueda");
      localStorage.removeItem("ultimosResultados");
      localStorage.removeItem("alumnoSeleccionado");
      localStorage.removeItem("ultimaAccion");
    } catch {}
  }, []);

  const role = (usuario?.rol || "").toLowerCase();
  const isAdmin = role === "admin";

  // Menú completo para ADMIN
  const menuAdmin = [
    { icon: faLayerGroup, text: "Elección de Especialidad", ruta: "/eleccion-especialidad" },
    { icon: faUsers,      text: "Cupos",                   ruta: "/cupos" },
    { icon: faArrowDownAZ,text: "Cargar y ordenar",        ruta: "/ordenar" }, // renombrado
    { icon: faUserPlus,   text: "Registro",                ruta: "/registro" },
  ];

  // Menú para VISTA (antes era Tabla Elección, ahora solo “Cargar y ordenar”)
  const menuVista = [
    { icon: faArrowDownAZ, text: "Cargar y ordenar", ruta: "/ordenar" },
  ];

  // Items visibles según rol
  const visibleItems = isAdmin ? menuAdmin : menuVista;

  const handleItemClick = (item) => {
    navigate(item.ruta);
    document.activeElement?.blur?.();
  };

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
    <div className={`pagina-principal-container ${isExiting ? "slide-fade-out" : ""}`}>
      <div className="pagina-principal-card">
        <div className="pagina-principal-header header--row">
          <div className="header-text">
            <h1 className="title">
              Sistema de <span className="title-accent">Elección de Especialidad IPET 50</span>
            </h1>
            <p className="subtitle">
              {isAdmin ? "Panel de elección de especialidad" : "Gestión de carga y orden"}
            </p>
          </div>
          <div className="logo-container logo-container--right">
            <img src={logoRH} alt="Logo IPET 50" className="logo" />
          </div>
        </div>

        <div className="menu-container">
          <div className="menu-grid flex--compact">
            {visibleItems.map((item, index) => (
              <button
                key={index}
                className="menu-button card--compact"
                onClick={() => handleItemClick(item)}
              >
                <div className="button-icon icon--sm">
                  <FontAwesomeIcon icon={item.icon} size="lg" />
                </div>
                <span className="button-text text--sm">{item.text}</span>
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="logout-button" onClick={() => setShowModal(true)}>
          <FontAwesomeIcon icon={faSignOutAlt} className="logout-icon" />
          <span className="logout-text-full">Cerrar Sesión</span>
          <span className="logout-text-short">Salir</span>
        </button>

        <footer className="pagina-principal-footer">
          Desarrollado por{" "}
          <a href="https://3devsnet.com" target="_blank" rel="noopener noreferrer">
            3devs.solutions
          </a>
        </footer>
      </div>

      <ConfirmLogoutModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={confirmarCierreSesion}
      />
    </div>
  );
};

export default Principal;
