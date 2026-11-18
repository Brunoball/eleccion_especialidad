// src/components/Principal/menu.js
// Menú, rol y datos de sesión compartidos por el layout y las pantallas.
import {
  faChartLine,
  faUsers,
  faLayerGroup,
  faArrowDownAZ,
  faGear,
} from "@fortawesome/free-solid-svg-icons";

export function normalizeRol(value) {
  if (value == null) return "vista";
  const v = String(value).trim().toLowerCase();
  if (
    v === "1" ||
    v === "admin" ||
    v === "administrator" ||
    v === "administrador" ||
    v === "superadmin"
  )
    return "admin";
  return "vista";
}

export function leerUsuario() {
  try {
    const u = JSON.parse(localStorage.getItem("usuario"));
    // normalizar rol por si quedó guardado de otra versión
    if (u) u.rol = normalizeRol(u.rol);
    return u || null;
  } catch {
    return null;
  }
}

/** Nombre visible del usuario (el backend lo envía como Nombre_Completo). */
export const nombreUsuario = (u) =>
  String(u?.Nombre_Completo ?? u?.nombre ?? u?.usuario ?? "").trim();

/** Id del usuario logueado (para no permitir borrarse a sí mismo). */
export const idUsuario = (u) => Number(u?.idUsuario ?? u?.id ?? 0) || 0;

export const ROL_LABEL = { admin: "Administrador", vista: "Vista" };

export const INICIO_ITEM = {
  key: "inicio",
  icon: faChartLine,
  text: "Inicio",
  ruta: "/panel",
};

export const CONFIG_ITEM = {
  key: "configuracion",
  icon: faGear,
  text: "Configuración",
  ruta: "/configuracion",
};

export const MENU_ADMIN = [
  {
    key: "eleccion",
    icon: faLayerGroup,
    text: "Elección de Especialidad",
    ruta: "/eleccion-especialidad",
  },
  {
    key: "cupos",
    icon: faUsers,
    text: "Cupos",
    ruta: "/cupos",
  },
  {
    key: "ordenar",
    icon: faArrowDownAZ,
    text: "Cargar y ordenar",
    ruta: "/ordenar",
  },
];

export const MENU_VISTA = [
  {
    key: "ordenar",
    icon: faArrowDownAZ,
    text: "Cargar y ordenar",
    ruta: "/ordenar",
  },
];

export const getMenu = (isAdmin) => (isAdmin ? MENU_ADMIN : MENU_VISTA);
