// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

/* Páginas */
import Inicio from './components/Login/Inicio';
import Principal from './components/Principal/Principal';
import Registro from './components/Login/Registro';
import Eleccion from './components/Elecciones/Eleccion';
import Cupo from './components/Cupos/Cupo';
import Ordenar from './components/Ordenamiento/Ordenar'; // 👈 sigue disponible

/* =========================================================
   🔒 Cierre de sesión por inactividad (SIN hooks del router)
========================================================= */
const INACTIVITY_MINUTES = 60;
const INACTIVITY_MS = INACTIVITY_MINUTES * 60 * 1000;

function InactivityLogout() {
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    const hasSession = () => {
      try {
        return !!localStorage.getItem('token') || !!localStorage.getItem('usuario');
      } catch {
        return false;
      }
    };

    const goLogin = () => {
      try { sessionStorage.clear(); } catch {}
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
      } catch {}
      window.location.replace('/'); // redirección sin useNavigate
    };

    const resetTimer = () => {
      if (!hasSession()) return;
      if (window.location.pathname === '/') return; // en login no corre

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(goLogin, INACTIVITY_MS);
    };

    const onActivity = () => resetTimer();
    const onVisibility = () => { if (document.visibilityState === 'visible') resetTimer(); };
    const onStorage = (e) => {
      if (e.key === 'token' || e.key === 'usuario') {
        const hasAny = !!localStorage.getItem('token') || !!localStorage.getItem('usuario');
        if (!hasAny) goLogin();
      }
    };
    const onHistory = () => resetTimer();

    const events = ['pointermove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    window.addEventListener('popstate', onHistory);

    const browserHistory = window.history;
    const _push = browserHistory.pushState;
    const _replace = browserHistory.replaceState;

    browserHistory.pushState = function (...args) { const r = _push.apply(this, args); onHistory(); return r; };
    browserHistory.replaceState = function (...args) { const r = _replace.apply(this, args); onHistory(); return r; };

    resetTimer();

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('popstate', onHistory);
      browserHistory.pushState = _push;
      browserHistory.replaceState = _replace;
    };
  }, []);

  return null;
}

/* =========================================================
   ✅ Ruta protegida
========================================================= */
function isAuthenticated() {
  try {
    const token = localStorage.getItem('token');
    const rawUser = localStorage.getItem('usuario');
    let usuarioOk = false;
    if (rawUser) { try { JSON.parse(rawUser); usuarioOk = true; } catch { usuarioOk = false; } }
    return !!token || usuarioOk;
  } catch { return false; }
}

function RutaProtegida({ children }) {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
}

/* =========================================================
   🚏 Ruteo principal
========================================================= */
export default function App() {
  return (
    <Router>
      <InactivityLogout />

      <Routes>
        {/* Login público */}
        <Route path="/" element={<Inicio />} />

        {/* Panel principal (protegido) */}
        <Route
          path="/panel"
          element={
            <RutaProtegida>
              <Principal />
            </RutaProtegida>
          }
        />

        {/* Elección de Especialidad (protegido) */}
        <Route
          path="/eleccion-especialidad"
          element={
            <RutaProtegida>
              <Eleccion />
            </RutaProtegida>
          }
        />

        {/* Cupos (protegido) */}
        <Route
          path="/cupos"
          element={
            <RutaProtegida>
              <Cupo />
            </RutaProtegida>
          }
        />

        {/* Ordenar (protegido) */}
        <Route
          path="/ordenar"
          element={
            <RutaProtegida>
              <Ordenar />
            </RutaProtegida>
          }
        />

        {/* Registro (si lo querés público, sacá RutaProtegida) */}
        <Route
          path="/registro"
          element={
            <RutaProtegida>
              <Registro />
            </RutaProtegida>
          }
        />

        {/* Cualquier otra ruta → login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
