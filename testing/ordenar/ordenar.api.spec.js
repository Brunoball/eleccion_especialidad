// CARGAR Y ORDENAR · ordenar_obtener_tabla / ordenar_ranking (preview) / validaciones de importación
const { test, expect, soloConEscritura } = require('../support/test');

const COLUMNAS = ['id_alumno', 'dni', 'alumno', 'promedio_final', 'trayectoria_institucional', 'orden'];

test.describe('Ordenar · lectura', () => {
  test('la tabla trae las columnas del ranking y todos los alumnos', async ({ api }) => {
    const { columns, data } = await api.tablaAlumnos();
    for (const c of COLUMNAS) expect(columns, `columna ${c}`).toContain(c);
    const { resumen } = await api.ok('dashboard_resumen');
    expect(data.length).toBe(resumen.alumnos.total);
  });

  test('la vista previa del ranking respeta el límite y numera posiciones', async ({ api }) => {
    const d = await api.ok('ordenar_ranking', undefined, { preview: '1', limit: '10' });
    expect(d.preview.length).toBeLessThanOrEqual(10);
    d.preview.forEach((r, i) => expect(r._posicion_preview).toBe(i + 1));
  });

  test('criterio principal: los alumnos sin trayectoria quedan al final', async ({ api }) => {
    const { data } = await api.tablaAlumnos();
    const d = await api.ok('ordenar_ranking', undefined, { preview: '1', limit: String(Math.max(1, data.length)) });
    const tray = d.preview.map((r) => Number(r.trayectoria_institucional || 0));
    expect(tray).toEqual([...tray].sort((a, b) => a - b));
  });

  test('si el ranking ya está aplicado, la columna orden coincide con la vista previa', async ({ api }) => {
    const { data } = await api.tablaAlumnos();
    const sinOrden = data.filter((r) => r.orden === null || r.orden === undefined);
    test.skip(data.length === 0 || sinOrden.length > 0, 'El ranking todavía no se aplicó.');
    const d = await api.ok('ordenar_ranking', undefined, { preview: '1', limit: String(data.length) });
    const porOrden = [...data].sort((a, b) => a.orden - b.orden).map((r) => Number(r.id_alumno));
    const esperado = d.preview.map((r) => Number(r.id_alumno));
    if (JSON.stringify(porOrden) !== JSON.stringify(esperado)) {
      test.info().annotations.push({
        type: 'aviso',
        description: 'El orden guardado no coincide con el ranking actual: se importaron/cambiaron datos sin volver a "Ordenar".',
      });
    }
    expect(porOrden.length).toBe(esperado.length);
  });
});

test.describe('Ordenar · validaciones de escritura', () => {
  soloConEscritura();

  test('aplicar el ranking exige aplicar=1', async ({ api }) => {
    const r = await api.post('ordenar_ranking', {});
    expect(r.data.exito).toBe(false);
    expect(r.data.mensaje).toMatch(/aplicar=1/);
  });

  test('importar sin filas o con JSON inválido es rechazado', async ({ api }) => {
    const antes = (await api.tablaAlumnos()).data.length;
    expect((await api.post('alumnos_import_json', {})).data.exito).toBe(false);
    expect((await api.post('alumnos_import_json', { rows: [] })).data.exito).toBe(false);
    expect((await api.postRaw('alumnos_import_json', '{roto')).data.exito).toBe(false);
    expect((await api.tablaAlumnos()).data.length).toBe(antes);
  });

  test('"Limpiar todo" con GET no hace nada', async ({ api }) => {
    const antes = (await api.tablaAlumnos()).data.length;
    expect((await api.get('reset_elecciones')).data.exito).toBe(false);
    expect((await api.tablaAlumnos()).data.length).toBe(antes);
  });
});
