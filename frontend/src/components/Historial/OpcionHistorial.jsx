// src/components/Historial/OpcionHistorial.jsx
// Casilla "Guardar historial de la elección" que se muestra en los modales
// que limpian la elección (Resultados → Resetear y Ordenar → Limpiar todo).
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faClockRotateLeft,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import "./historial.css";

const hoy = () =>
  new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function OpcionHistorial({
  checked,
  onChange,
  titulo,
  onTituloChange,
  disabled = false,
  cantidad = null,
}) {
  const sinDatos = cantidad === 0;

  return (
    <div className={`hist-opt ${checked ? "is-on" : "is-off"} ${disabled ? "is-disabled" : ""}`}>
      <label className="hist-opt__check">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="hist-opt__box" aria-hidden="true">
          <FontAwesomeIcon icon={faCheck} />
        </span>
        <span className="hist-opt__copy">
          <strong>
            <FontAwesomeIcon icon={faClockRotateLeft} />
            Guardar historial de la elección
          </strong>
          <small>
            {checked
              ? "Se guarda una copia con cada alumno, su orden y la especialidad que eligió."
              : "La elección se borrará sin dejar ningún registro."}
          </small>
        </span>
      </label>

      {checked && !disabled ? (
        <input
          className="hist-opt__title"
          value={titulo}
          onChange={(e) => onTituloChange(e.target.value)}
          maxLength={150}
          placeholder={`Nombre (opcional) · por defecto "Elección ${hoy()}"`}
          aria-label="Nombre para el historial (opcional)"
        />
      ) : null}

      {!checked ? (
        <p className="hist-opt__warn">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          Sin historial, los datos de esta elección no se podrán recuperar.
        </p>
      ) : sinDatos ? (
        <p className="hist-opt__note">No hay inscripciones cargadas: no se guardará nada.</p>
      ) : null}
    </div>
  );
}
