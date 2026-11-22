// HISTORIAL · historial_listar / historial_detalle / historial_eliminar
const { test, expect, soloConEscritura } = require('../support/test');

test.describe('Historial · lectura', () => {
  test('el listado viene del más nuevo al más viejo y con totales', async ({ api }) => {
    const lista = await api.historial();
    const fechas = lista.map((h) => h.fecha);
    expect(fechas).toEqual([...fechas].sort().reverse());
    for (const h of lista) {
      expect(Number(h.id)).toBeGreaterThan(0);
      expect(['resultados', 'limpiar_todo']).toContain(h.origen);
      expect(h.total_inscriptos).toBeLessThanOrEqual(h.total_alumnos);
      expect(h.total_ausentes).toBeLessThanOrEqual(h.total_inscriptos);
    }
  });

  test('el detalle de cada elección guardada es coherente', async ({ api }) => {
    const lista = (await api.historial()).slice(0, 5);
    test.skip(lista.length === 0, 'Todavía no hay elecciones guardadas en el historial.');
    for (const h of lista) {
      const d = await api.ok('historial_detalle', undefined, { id: String(h.id) });
      expect(Number(d.eleccion.id)).toBe(Number(h.id));
      // se guardan los alumnos que eligieron (total_alumnos = alumnos que había ese día)
      expect(d.alumnos.length, `alumnos de "${h.titulo}"`).toBe(h.total_inscriptos);

      const asignados = d.especialidades.reduce((s, e) => s + Number(e.asignados), 0);
      expect(asignados).toBe(h.total_inscriptos);
      const conEsp = d.alumnos.filter((a) => a.especialidad);
      expect(conEsp.length).toBe(h.total_inscriptos);
      expect(d.alumnos.filter((a) => a.es_ausente).length).toBe(h.total_ausentes);

      // ordenados por orden de ranking
      const ordenes = d.alumnos.map((a) => a.orden).filter((o) => o !== null);
      expect(ordenes).toEqual([...ordenes].sort((x, y) => x - y));
      // orden_especialidad = 1..N dentro de cada especialidad
      const porEsp = new Map();
      for (const a of conEsp) {
        if (!porEsp.has(a.especialidad)) porEsp.set(a.especialidad, []);
        porEsp.get(a.especialidad).push(Number(a.orden_especialidad));
      }
      for (const [esp, nums] of porEsp) {
        const ord = [...nums].sort((x, y) => x - y);
        expect(ord, `orden dentro de ${esp}`).toEqual(ord.map((_, i) => i + 1));
      }
    }
  });

  test('detalle con id inválido o inexistente', async ({ api }) => {
    expect((await api.get('historial_detalle', { id: '0' })).data.mensaje).toMatch(/inválido/);
    expect((await api.get('historial_detalle', { id: 'abc' })).data.exito).toBe(false);
    expect((await api.get('historial_detalle', { id: '99999999' })).data.mensaje).toMatch(/no existe/);
  });
});

test.describe('Historial · eliminar (validaciones)', () => {
  soloConEscritura();

  test('rechaza ids inválidos o inexistentes sin borrar nada', async ({ api }) => {
    const antes = await api.historial();
    expect((await api.post('historial_eliminar', { id: 0 })).data.mensaje).toMatch(/inválido/);
    expect((await api.post('historial_eliminar', { id: 99999999 })).data.mensaje).toMatch(/ya no existe/);
    expect(await api.historial()).toEqual(antes);
  });
});
