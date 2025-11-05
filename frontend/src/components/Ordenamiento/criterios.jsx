// src/components/Ordenamiento/criterios.js

// Orden y etiquetas (1..14) tal como tu modal
export const CRITERIA = [
  "Sin Trayectoria en el Establecimiento", // 1
  "Amonestaciones 2° Año",                 // 2
  "Amonestaciones 1° Año",                 // 3
  "Observaciones 2° Año",                  // 4
  "Observaciones 1° Año",                  // 5
  "Repitente de 2° Año",                   // 6
  "Repitente de 1° Año",                   // 7
  "Tercera Materia",                       // 8
  "Previas 1° Etapa 2025",                 // 9
  "Materias adeudadas 1° Etapa 2025",      //10
  "Materias a coloquio 1° Año",            //11
  "Faltas Injustificadas 1° Etapa 2025",   //12
  "Faltas Injustificadas 1° Año",          //13
  "Promedio Final",                        //14 (fallback)
];

// Paleta única (MISMO HEX para modal y tabla)
export const CRITERIA_COLORS = {
  1:  "#fbe4d5",
  2:  "#fde9d9",
  3:  "#fff2cc",
  4:  "#fff2cc",
  5:  "#e2f0d9",
  6:  "#e2f0d9",
  7:  "#d9ead3",
  8:  "#d9e1f2",
  9:  "#cfe2f3",
  10: "#c9daf8",
  11: "#d9d2e9",
  12: "#ead1dc",
  13: "#f4cccc",
  14: "#fce5cd",
};

// Helpers internos
const str = (v) => (v === null || v === undefined) ? "" : String(v).trim();
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const isYes = (v) => {
  const s = str(v).toLowerCase();
  if (s === "si" || s === "sí" || s === "true" || s === "1") return true;
  if (s === "no" || s === "false" || s === "0") return false;
  const n = num(v);
  if (!Number.isNaN(n)) return n > 0;
  return !!s;
};
const gt0 = (v) => {
  const n = num(v);
  return !Number.isNaN(n) && n > 0;
};

// Evaluador ÚNICO de criterio (misma prioridad que el modal)
export const resolverCriterio = (row) => {
  if (!row) return { id: 14, label: CRITERIA[13], color: CRITERIA_COLORS[14] };

  // 1) Sin Trayectoria en el Establecimiento (en Excel/DB: 1 = Sí)
  if (Number(row?.trayectoria_institucional) === 1) {
    return { id: 1, label: CRITERIA[0], color: CRITERIA_COLORS[1] };
  }

  // 2) Amonestaciones 2° Año -> amonestaciones_1et
  if (gt0(row?.amonestaciones_1et)) {
    return { id: 2, label: CRITERIA[1], color: CRITERIA_COLORS[2] };
  }

  // 3) Amonestaciones 1° Año -> amonestaciones_1a
  if (gt0(row?.amonestaciones_1a)) {
    return { id: 3, label: CRITERIA[2], color: CRITERIA_COLORS[3] };
  }

  // 4) Observaciones 2° Año -> observaciones_1et (numérico)
  if (gt0(row?.observaciones_1et)) {
    return { id: 4, label: CRITERIA[3], color: CRITERIA_COLORS[4] };
  }

  // 5) Observaciones 1° Año -> observaciones_1a (numérico)
  if (gt0(row?.observaciones_1a)) {
    return { id: 5, label: CRITERIA[4], color: CRITERIA_COLORS[5] };
  }

  // 6) Repitente de 2° Año -> repite_2a
  if (isYes(row?.repite_2a)) {
    return { id: 6, label: CRITERIA[5], color: CRITERIA_COLORS[6] };
  }

  // 7) Repitente de 1° Año -> repite_1a
  if (isYes(row?.repite_1a)) {
    return { id: 7, label: CRITERIA[6], color: CRITERIA_COLORS[7] };
  }

  // 8) Tercera Materia -> tercera_materia
  if (isYes(row?.tercera_materia)) {
    return { id: 8, label: CRITERIA[7], color: CRITERIA_COLORS[8] };
  }

  // 9) Previas 1° Etapa 2025 -> previas_1et
  if (gt0(row?.previas_1et)) {
    return { id: 9, label: CRITERIA[8], color: CRITERIA_COLORS[9] };
  }

  // 10) Materias adeudadas 1° Etapa 2025 -> adeudadas_1et
  if (gt0(row?.adeudadas_1et)) {
    return { id: 10, label: CRITERIA[9], color: CRITERIA_COLORS[10] };
  }

  // 11) Materias a coloquio 1° Año -> coloquios_1a
  if (gt0(row?.coloquios_1a)) {
    return { id: 11, label: CRITERIA[10], color: CRITERIA_COLORS[11] };
  }

  // 12) Faltas Injustificadas 1° Etapa 2025 -> inasistencias_1et
  if (gt0(row?.inasistencias_1et)) {
    return { id: 12, label: CRITERIA[11], color: CRITERIA_COLORS[12] };
  }

  // 13) Faltas Injustificadas 1° Año -> inasistencias_1a
  if (gt0(row?.inasistencias_1a)) {
    return { id: 13, label: CRITERIA[12], color: CRITERIA_COLORS[13] };
  }

  // 14) Promedio Final (fallback)
  return { id: 14, label: CRITERIA[13], color: CRITERIA_COLORS[14] };
};
