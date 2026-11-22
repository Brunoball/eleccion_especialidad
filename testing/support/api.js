// testing/support/api.js
// Cliente del backend (routes/api.php?action=...) usado por todos los tests.
const { ENV, PREFIX, HIST_PREFIX } = require('./env');

class Api {
  /** @param {import('@playwright/test').APIRequestContext} request */
  constructor(request) {
    this.request = request;
    this.sesion = null; // { idUsuario, Nombre_Completo, rol }
  }

  url(action, params = {}) {
    const qs = new URLSearchParams({ action, ...params });
    return `${ENV.apiPhp}?${qs.toString()}`;
  }

  async _parse(res, action) {
    const status = res.status();
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(
        `[${action}] La respuesta no es JSON (HTTP ${status}). Primeros caracteres: ${text.slice(0, 200)}`,
      );
    }
    return { status, data, headers: res.headers() };
  }

  /** GET ?action=... (devuelve {status, data}) */
  async get(action, params = {}) {
    const res = await this.request.get(this.url(action, params), {
      failOnStatusCode: false,
      timeout: ENV.timeoutMs,
    });
    return this._parse(res, action);
  }

  /** POST JSON ?action=... */
  async post(action, body = {}, params = {}) {
    const res = await this.request.post(this.url(action, params), {
      data: body,
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
      timeout: ENV.timeoutMs,
    });
    return this._parse(res, action);
  }

  /** POST con cuerpo crudo (para probar JSON inválido). */
  async postRaw(action, raw) {
    const res = await this.request.post(this.url(action), {
      data: raw,
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
      timeout: ENV.timeoutMs,
    });
    return this._parse(res, action);
  }

  /** Igual que get/post pero exige exito:true y devuelve sólo data. */
  async ok(action, body, params) {
    const r = body === undefined ? await this.get(action, params) : await this.post(action, body, params);
    if (!r.data || r.data.exito !== true) {
      throw new Error(`[${action}] esperaba exito:true y recibí (HTTP ${r.status}): ${JSON.stringify(r.data)?.slice(0, 400)}`);
    }
    return r.data;
  }

  /* ---------------- Sesión ---------------- */

  async login(nombre = ENV.user, contrasena = ENV.password) {
    const data = await this.ok('inicio', { nombre, contrasena });
    this.sesion = data.usuario;
    return data.usuario;
  }

  get idActual() {
    return Number(this.sesion?.idUsuario ?? 0);
  }

  get nombreActual() {
    return String(this.sesion?.Nombre_Completo ?? ENV.user);
  }

  /* ---------------- Lecturas frecuentes ---------------- */

  async cuposActuales() {
    const d = await this.ok('obtener_cupos_actuales');
    return d.especialidades.map((e) => ({
      id: Number(e.id_especialidad),
      nombre: String(e.especialidad),
      cupo: Number(e.cupo),
      disponibles: Number(e.cupos_actuales),
      ausente: String(e.especialidad).toUpperCase() === 'AUSENTE',
    }));
  }

  async elecciones() {
    return (await this.ok('obtener_elecciones')).data || [];
  }

  async alumnosOrden() {
    return (await this.ok('eleccion_alumnos')).data || [];
  }

  async usuarios() {
    return (await this.ok('usuarios_listar')).usuarios || [];
  }

  async historial() {
    return (await this.ok('historial_listar')).historial || [];
  }

  async tablaAlumnos() {
    const d = await this.ok('ordenar_obtener_tabla');
    return { columns: d.columns || [], data: d.data || [] };
  }

  /* ---------------- Usuarios de prueba ---------------- */

  nombrePrueba(sufijo = '') {
    const rnd = Math.random().toString(36).slice(2, 6);
    return `${PREFIX}${Date.now().toString(36)}${rnd}${sufijo}`.slice(0, 40);
  }

  async crearUsuario({ nombre, rol = 'vista', contrasena = 'clave123' } = {}) {
    const n = nombre || this.nombrePrueba();
    const d = await this.ok('usuarios_guardar', { nombre: n, rol, contrasena, id_actual: this.idActual });
    return { ...d.usuario, contrasena };
  }

  async eliminarUsuario(id) {
    return this.post('usuarios_eliminar', { id, id_actual: this.idActual });
  }

  /** Borra todo usuario e2e_* e historial "E2E ..." que haya quedado. */
  async limpiarRestos() {
    let usuarios = 0;
    let historial = 0;
    for (const u of await this.usuarios()) {
      if (String(u.nombre).toLowerCase().startsWith(PREFIX) && Number(u.id) !== this.idActual) {
        const r = await this.eliminarUsuario(u.id);
        if (r.data?.exito) usuarios++;
      }
    }
    for (const h of await this.historial()) {
      if (String(h.titulo || '').startsWith(HIST_PREFIX)) {
        const r = await this.post('historial_eliminar', { id: h.id });
        if (r.data?.exito) historial++;
      }
    }
    return { usuarios, historial };
  }
}

module.exports = { Api };
