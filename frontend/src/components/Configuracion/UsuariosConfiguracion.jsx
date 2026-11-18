// src/components/Configuracion/UsuariosConfiguracion.jsx
// Configuración → Usuarios y roles: listado, alta, edición y eliminación.
// Reemplaza a la antigua pantalla de Registro.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCheck,
  faEye,
  faEyeSlash,
  faKey,
  faLock,
  faMagnifyingGlass,
  faPen,
  faPlus,
  faRotateRight,
  faTrashCan,
  faUser,
  faUserShield,
  faUsers,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import Toast from "../Global/Toast";
import { apiAction } from "../Global/api";
import { idUsuario, leerUsuario, nombreUsuario, ROL_LABEL } from "../Principal/menu";
import "../Principal/principal.css";
import "./configuracion.css";

const ROLES = [
  {
    value: "admin",
    label: "Administrador",
    description: "Acceso completo, incluida la configuración.",
    icon: faUserShield,
  },
  {
    value: "vista",
    label: "Vista",
    description: "Solo carga y ordenamiento de alumnos.",
    icon: faUser,
  },
];

const FORM_VACIO = { id: 0, nombre: "", rol: "vista", contrasena: "", confirmar: "" };

const formatearFecha = (valor) => {
  if (!valor) return "—";
  const d = new Date(String(valor).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(valor).slice(0, 10);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

/* ================= Modal alta / edición ================= */
function UsuarioModal({ open, form, setForm, onClose, onSubmit, saving, esSesionActual }) {
  const [verClave, setVerClave] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setVerClave(false);
    const t = setTimeout(() => firstInputRef.current?.focus(), 40);
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, saving]);

  if (!open) return null;

  const editando = Boolean(form.id);
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  return createPortal(
    <div
      className="cfg-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cfg-modal-title"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <form
        className="cfg-modal"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <header className="cfg-modal__head">
          <span className="cfg-modal__icon" aria-hidden="true">
            <FontAwesomeIcon icon={editando ? faPen : faPlus} />
          </span>
          <div>
            <h2 id="cfg-modal-title">{editando ? "Editar usuario" : "Nuevo usuario"}</h2>
            <p>
              {editando
                ? "Modificá el nombre, el rol o la contraseña del acceso."
                : "Creá un acceso nuevo al sistema de elección."}
            </p>
          </div>
          <button
            type="button"
            className="cfg-modal__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>

        <div className="cfg-modal__body">
          <label className="cfg-field">
            <span className="cfg-field__label">
              <FontAwesomeIcon icon={faUser} /> Usuario *
            </span>
            <input
              ref={firstInputRef}
              className="cfg-field__input"
              value={form.nombre}
              onChange={set("nombre")}
              maxLength={100}
              autoComplete="off"
              placeholder="Ej.: preceptoria"
            />
            <small className="cfg-field__hint">Entre 4 y 100 caracteres.</small>
          </label>

          <fieldset className="cfg-roles">
            <legend className="cfg-field__label">Rol *</legend>
            <div className="cfg-roles__grid">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`cfg-role ${form.rol === r.value ? "is-selected" : ""} ${
                    esSesionActual ? "is-locked" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={r.value}
                    checked={form.rol === r.value}
                    onChange={set("rol")}
                    disabled={esSesionActual}
                  />
                  <span className="cfg-role__icon" aria-hidden="true">
                    <FontAwesomeIcon icon={r.icon} />
                  </span>
                  <span className="cfg-role__copy">
                    <strong>{r.label}</strong>
                    <small>{r.description}</small>
                  </span>
                  <span className="cfg-role__check" aria-hidden="true">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                </label>
              ))}
            </div>
            {esSesionActual ? (
              <small className="cfg-field__hint">No podés cambiar el rol de tu propia sesión.</small>
            ) : null}
          </fieldset>

          <div className="cfg-modal__row">
            <label className="cfg-field">
              <span className="cfg-field__label">
                <FontAwesomeIcon icon={faLock} /> {editando ? "Nueva contraseña" : "Contraseña *"}
              </span>
              <span className="cfg-field__pass">
                <input
                  className="cfg-field__input"
                  type={verClave ? "text" : "password"}
                  value={form.contrasena}
                  onChange={set("contrasena")}
                  maxLength={128}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="cfg-field__eye"
                  onClick={() => setVerClave((v) => !v)}
                  aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <FontAwesomeIcon icon={verClave ? faEyeSlash : faEye} />
                </button>
              </span>
            </label>

            <label className="cfg-field">
              <span className="cfg-field__label">
                <FontAwesomeIcon icon={faKey} /> {editando ? "Confirmar nueva" : "Confirmar *"}
              </span>
              <input
                className="cfg-field__input"
                type={verClave ? "text" : "password"}
                value={form.confirmar}
                onChange={set("confirmar")}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
          </div>

          <p className="cfg-modal__help">
            <FontAwesomeIcon icon={faLock} />
            {editando
              ? "Dejá ambos campos vacíos para conservar la contraseña actual."
              : "Usá al menos 6 caracteres."}
          </p>
        </div>

        <footer className="cfg-modal__foot">
          <button type="button" className="mod-btn" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="mod-btn mod-btn--primary" disabled={saving}>
            <FontAwesomeIcon icon={faCheck} />
            {saving ? "Guardando…" : editando ? "Guardar cambios" : "Crear usuario"}
          </button>
        </footer>
      </form>
    </div>,
    document.body
  );
}

/* ================= Modal eliminar ================= */
function EliminarModal({ usuario, onClose, onConfirm, saving }) {
  useEffect(() => {
    if (!usuario) return undefined;
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [usuario, onClose, saving]);

  if (!usuario) return null;

  return createPortal(
    <div
      className="modalprincipal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cfg-del-title"
      onMouseDown={() => !saving && onClose()}
    >
      <div className="modalprincipal-container modalprincipal--danger" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalprincipal__icon" aria-hidden="true">
          <FontAwesomeIcon icon={faTrashCan} />
        </div>
        <h3 id="cfg-del-title" className="modalprincipal-title">
          Eliminar usuario
        </h3>
        <p className="modalprincipal-text">
          Se eliminará definitivamente el acceso de{" "}
          <span className="danger-strong">{usuario.nombre}</span> (
          {ROL_LABEL[usuario.rol] || usuario.rol}). Esta acción no se puede deshacer.
        </p>
        <div className="modalprincipal-buttons">
          <button
            type="button"
            className="modalprincipal-btn modalprincipal-btn--ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="modalprincipal-btn modalprincipal-btn--solid-danger"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ================= Pantalla ================= */
export default function UsuariosConfiguracion() {
  const navigate = useNavigate();
  const sesion = useMemo(() => leerUsuario(), []);
  const idSesion = idUsuario(sesion);

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [aEliminar, setAEliminar] = useState(null);
  const [toast, setToast] = useState(null);

  const mostrarToast = (tipo, mensaje, duracion = 3000) =>
    setToast({ tipo, mensaje, duracion, id: Date.now() });

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await apiAction("usuarios_listar");
      setUsuarios(Array.isArray(r.usuarios) ? r.usuarios : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        (ROL_LABEL[u.rol] || "").toLowerCase().includes(q)
    );
  }, [usuarios, busqueda]);

  const totalAdmins = usuarios.filter((u) => u.rol === "admin").length;

  const abrirNuevo = () => {
    setForm(FORM_VACIO);
    setModalOpen(true);
  };

  const abrirEditar = (u) => {
    setForm({ id: u.id, nombre: u.nombre, rol: u.rol, contrasena: "", confirmar: "" });
    setModalOpen(true);
  };

  const cerrarModal = useCallback(() => setModalOpen(false), []);
  const cerrarToast = useCallback(() => setToast(null), []);
  const cerrarEliminar = useCallback(() => setAEliminar(null), []);

  const guardar = async () => {
    const nombre = form.nombre.trim();
    if (nombre.length < 4) {
      mostrarToast("advertencia", "El usuario debe tener al menos 4 caracteres.");
      return;
    }
    if (!form.id && !form.contrasena) {
      mostrarToast("advertencia", "Ingresá una contraseña para el usuario nuevo.");
      return;
    }
    if (form.contrasena && form.contrasena.length < 6) {
      mostrarToast("advertencia", "La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (form.contrasena !== form.confirmar) {
      mostrarToast("advertencia", "Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      const r = await apiAction("usuarios_guardar", {
        id: form.id || 0,
        nombre,
        rol: form.rol,
        contrasena: form.contrasena,
        id_actual: idSesion,
      });

      // Si se editó el propio usuario, actualizamos el nombre de la sesión
      if (form.id && form.id === idSesion && sesion) {
        try {
          const nueva = { ...sesion, Nombre_Completo: nombre };
          if ("nombre" in sesion) nueva.nombre = nombre;
          localStorage.setItem("usuario", JSON.stringify(nueva));
        } catch {}
      }

      setModalOpen(false);
      mostrarToast("exito", r.mensaje || "Usuario guardado.");
      await cargar();
    } catch (e) {
      mostrarToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    if (!aEliminar) return;
    setSaving(true);
    try {
      const r = await apiAction("usuarios_eliminar", { id: aEliminar.id, id_actual: idSesion });
      setAEliminar(null);
      mostrarToast("exito", r.mensaje || "Usuario eliminado.");
      await cargar();
    } catch (e) {
      mostrarToast("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mod-page cfg-page">
      <header className="mod-head">
        <div className="mod-head__main">
          <button
            type="button"
            className="mod-back"
            onClick={() => navigate("/configuracion")}
            aria-label="Volver a Configuración"
            title="Volver a Configuración"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <span className="mod-head__icon" aria-hidden="true">
            <FontAwesomeIcon icon={faUsers} />
          </span>
          <div className="mod-head__titles">
            <h1>Usuarios y roles</h1>
            <p>Personas con acceso al sistema y su nivel de permisos.</p>
          </div>
        </div>

        <div className="mod-head__actions">
          <label className="mod-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              className="mod-input"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar usuario o rol"
              aria-label="Buscar usuario o rol"
            />
          </label>
          <button type="button" className="mod-btn mod-btn--primary" onClick={abrirNuevo}>
            <FontAwesomeIcon icon={faPlus} />
            Nuevo usuario
          </button>
        </div>
      </header>

      <div className="mod-body">
        <div className="cfg-stats">
          <article className="cfg-stat">
            <span className="cfg-stat__icon" aria-hidden="true">
              <FontAwesomeIcon icon={faUsers} />
            </span>
            <div>
              <small>Usuarios</small>
              <strong>{usuarios.length}</strong>
            </div>
          </article>
          <article className="cfg-stat is-admin">
            <span className="cfg-stat__icon" aria-hidden="true">
              <FontAwesomeIcon icon={faUserShield} />
            </span>
            <div>
              <small>Administradores</small>
              <strong>{totalAdmins}</strong>
            </div>
          </article>
          <article className="cfg-stat is-vista">
            <span className="cfg-stat__icon" aria-hidden="true">
              <FontAwesomeIcon icon={faUser} />
            </span>
            <div>
              <small>Vista</small>
              <strong>{usuarios.length - totalAdmins}</strong>
            </div>
          </article>
        </div>

        <div className="cfg-table" role="table" aria-label="Usuarios del sistema" aria-busy={loading}>
          <div className="cfg-table__row cfg-table__head" role="row">
            <span role="columnheader">Usuario</span>
            <span role="columnheader">Rol</span>
            <span role="columnheader">Alta</span>
            <span role="columnheader" className="is-right">
              Acciones
            </span>
          </div>

          <div className="cfg-table__body">
            {loading ? (
              <div className="mod-empty">
                <span className="mod-spinner" />
                <strong>Cargando usuarios</strong>
              </div>
            ) : error ? (
              <div className="mod-empty">
                <span className="mod-empty__icon">
                  <FontAwesomeIcon icon={faXmark} />
                </span>
                <strong>No se pudieron cargar los usuarios</strong>
                <span>{error}</span>
                <button type="button" className="mod-btn" onClick={cargar}>
                  <FontAwesomeIcon icon={faRotateRight} /> Reintentar
                </button>
              </div>
            ) : visibles.length === 0 ? (
              <div className="mod-empty">
                <span className="mod-empty__icon">
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                </span>
                <strong>Sin resultados</strong>
                <span>No hay usuarios que coincidan con la búsqueda.</span>
              </div>
            ) : (
              visibles.map((u) => {
                const propio = u.id === idSesion;
                return (
                  <div className="cfg-table__row" role="row" key={u.id}>
                    <span className="cfg-user" role="cell">
                      <span className={`cfg-user__avatar is-${u.rol}`} aria-hidden="true">
                        {u.nombre.charAt(0).toUpperCase()}
                      </span>
                      <span className="cfg-user__name">{u.nombre}</span>
                      {propio ? <span className="mod-chip">Tu sesión</span> : null}
                    </span>
                    <span role="cell">
                      <span className={`mod-chip ${u.rol === "admin" ? "" : "mod-chip--neutral"}`}>
                        <FontAwesomeIcon icon={u.rol === "admin" ? faUserShield : faUser} />
                        {ROL_LABEL[u.rol] || u.rol}
                      </span>
                    </span>
                    <span role="cell" className="cfg-table__date">
                      {formatearFecha(u.fecha_creacion)}
                    </span>
                    <span role="cell" className="cfg-table__actions">
                      <button
                        type="button"
                        className="cfg-iconBtn"
                        onClick={() => abrirEditar(u)}
                        title="Editar usuario"
                        aria-label={`Editar ${u.nombre}`}
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        type="button"
                        className="cfg-iconBtn cfg-iconBtn--danger"
                        onClick={() => setAEliminar(u)}
                        disabled={propio}
                        title={propio ? "No podés eliminar tu propio usuario" : "Eliminar usuario"}
                        aria-label={`Eliminar ${u.nombre}`}
                      >
                        <FontAwesomeIcon icon={faTrashCan} />
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {sesion && nombreUsuario(sesion) ? (
          <p className="cfg-note">
            <FontAwesomeIcon icon={faUserShield} />
            El sistema siempre conserva al menos un administrador. Tu propio usuario no
            se puede eliminar ni cambiar de rol.
          </p>
        ) : null}
      </div>

      <UsuarioModal
        open={modalOpen}
        form={form}
        setForm={setForm}
        onClose={cerrarModal}
        onSubmit={guardar}
        saving={saving}
        esSesionActual={Boolean(form.id) && form.id === idSesion}
      />

      <EliminarModal usuario={aEliminar} onClose={cerrarEliminar} onConfirm={eliminar} saving={saving} />

      {toast ? (
        <Toast
          key={toast.id}
          tipo={toast.tipo}
          mensaje={toast.mensaje}
          duracion={toast.duracion}
          onClose={cerrarToast}
        />
      ) : null}
    </div>
  );
}
