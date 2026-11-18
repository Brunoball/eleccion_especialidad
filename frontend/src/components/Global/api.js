// src/components/Global/api.js
// Llamadas al backend (routes/api.php) con manejo de errores uniforme.
import BASE_URL from "../../config/config";

const API = `${String(BASE_URL).replace(/\/$/, "")}/api.php`;

/**
 * Ejecuta una acción del backend.
 * - Sin body: GET ?action=...
 * - Con body: POST JSON
 * Lanza Error con el mensaje del servidor si la respuesta no es exitosa.
 */
export async function apiAction(action, body, { signal } = {}) {
  const opts = { signal };
  if (body !== undefined) {
    opts.method = "POST";
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API}?action=${encodeURIComponent(action)}`, opts);
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    throw new Error("No se pudo conectar con el servidor.");
  }

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // respuesta no JSON
  }

  if (!res.ok || data?.exito === false) {
    throw new Error(data?.mensaje || `Error del servidor (HTTP ${res.status}).`);
  }
  return data;
}
