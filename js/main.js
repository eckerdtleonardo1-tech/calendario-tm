import { initMonths } from './components/MonthCard.js?v=4';
import { initPlayerManager } from './components/PlayerManager.js?v=4';
import { initAttendance } from './components/AttendanceManager.js?v=4';
import { initSheet } from './components/SheetManager.js?v=4';

const VIEW_KEY = 'pagos_mensuales_vista';

function showView(name) {
  document.querySelectorAll('.tab').forEach(tab => {
    const active = tab.dataset.view === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active);
  });
  document.querySelectorAll('.view').forEach(view => {
    view.hidden = view.id !== `view-${name}`;
  });
  try { localStorage.setItem(VIEW_KEY, name); } catch {}
}

function start() {
  // Las pestañas se conectan primero: si una pantalla falla, las demás siguen andando
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => showView(tab.dataset.view));
  });

  [
    ['Pagos', initMonths],
    ['Jugadores', initPlayerManager],
    ['Asistencia', initAttendance],
    ['Planilla', initSheet]
  ].forEach(([name, init]) => {
    try {
      init();
    } catch (err) {
      console.error(err);
      if (window.showAppError) window.showAppError(`${name}: ${err.message}`);
    }
  });

  let saved = 'pagos';
  try { saved = localStorage.getItem(VIEW_KEY) || 'pagos'; } catch {}
  showView(document.getElementById(`view-${saved}`) ? saved : 'pagos');
}

// Los módulos corren diferidos; por las dudas contemplamos que el DOM ya esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
