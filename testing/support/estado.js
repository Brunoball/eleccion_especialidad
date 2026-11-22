// testing/support/estado.js
// Respaldo y restauración del estado de la elección para las pruebas
// destructivas (resetear elección / limpiar todo / importar / ranking).
const { HIST_PREFIX } = require('./env');

const clave = (dni, nombre) =>
  dni && String(dni) !== '0' ? `dni:${String(dni)}` : `nom:${String(nombre || '').trim().toUpperCase()}`;

/** Foto completa: cupos, inscripciones (en orden), alumnos y si había ranking aplicado. */
async function respaldar(api) {
  const cupos = await api.cuposActuales();
  const elecciones = (await api.elecciones())
    .slice()
    .sort((a, b) => Number(a.id_eleccion ?? a.orden) - Number(b.id_eleccion ?? b.orden))
    .map((e) => ({
      id_alumno: Number(e.id_alumno),
      id_especialidad: Number(e.id_especialidad),
      clave: clave(e.dni, e.nombre),
    }));
  const tabla = await api.tablaAlumnos();
  const conOrden = tabla.data.filter((r) => r.orden !== null && r.orden !== undefined && r.orden !== '');
  return {
    cupos,
    elecciones,
    alumnos: tabla.data,
    rankingAplicado: tabla.data.length > 0 && conOrden.length === tabla.data.length,
    historialIds: new Set((await api.historial()).map((h) => Number(h.id))),
  };
}

/** Reimporta los alumnos del respaldo (cuando "Limpiar todo" los borró). */
async function restaurarAlumnos(api, foto) {
  const actuales = (await api.tablaAlumnos()).data;
  const existentes = new Set(actuales.map((r) => clave(r.dni, r.alumno)));
  const faltan = foto.alumnos.filter((r) => !existentes.has(clave(r.dni, r.alumno)));
  if (faltan.length) {
    const rows = faltan.map(({ id_alumno, orden, ...resto }) => resto);
    await api.ok('alumnos_import_json', { rows });
  }
  if (foto.rankingAplicado) {
    await api.ok('ordenar_ranking', { aplicar: 1 }, { aplicar: 1 });
  }
}

/** Deja inscripciones y cupos exactamente como estaban en el respaldo. */
async function restaurarEleccion(api, foto) {
  // 1) Cancelar todas las inscripciones actuales (devuelve cupos).
  for (const e of await api.elecciones()) {
    await api.ok('eleccion_cancelar', { id_alumno: Number(e.id_alumno) });
  }
  // 2) Cupos totales originales (editar_cupos deja disponibles = cupo).
  await api.ok(
    'editar_cupos',
    foto.cupos.map((c) => ({ id: c.id, cupo: c.cupo })),
  );
  // 3) Volver a inscribir en el mismo orden. Los ids de alumno pueden haber
  //    cambiado si se reimportaron: se buscan por DNI (o nombre si no hay DNI).
  const alumnos = (await api.tablaAlumnos()).data;
  const idPorClave = new Map(alumnos.map((r) => [clave(r.dni, r.alumno), Number(r.id_alumno)]));
  const sinRestaurar = [];
  for (const e of foto.elecciones) {
    const id = idPorClave.get(e.clave) ?? e.id_alumno;
    const r = await api.post('eleccion_confirmar', { id_alumno: id, id_especialidad: e.id_especialidad });
    if (!r.data?.exito) sinRestaurar.push(`${e.clave} → ${r.data?.mensaje}`);
  }
  return sinRestaurar;
}

/** Borra los registros de historial creados durante la prueba. */
async function borrarHistorialNuevo(api, foto) {
  for (const h of await api.historial()) {
    if (!foto.historialIds.has(Number(h.id)) && String(h.titulo || '').startsWith(HIST_PREFIX)) {
      await api.post('historial_eliminar', { id: h.id });
    }
  }
}

/** Compara cupos actuales con el respaldo. Devuelve lista de diferencias. */
async function diferenciasCupos(api, foto) {
  const ahora = await api.cuposActuales();
  const dif = [];
  for (const c of foto.cupos) {
    const x = ahora.find((a) => a.id === c.id);
    if (!x) dif.push(`${c.nombre}: no existe`);
    else if (x.cupo !== c.cupo || x.disponibles !== c.disponibles) {
      dif.push(`${c.nombre}: cupo ${x.cupo}/${c.cupo}, disponibles ${x.disponibles}/${c.disponibles}`);
    }
  }
  return dif;
}

module.exports = { respaldar, restaurarAlumnos, restaurarEleccion, borrarHistorialNuevo, diferenciasCupos, clave };
