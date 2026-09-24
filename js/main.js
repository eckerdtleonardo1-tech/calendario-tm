import { initMonths } from './components/MonthCard.js';
import { initPlayerManager } from './components/PlayerManager.js';
import { initAttendance } from './components/AttendanceManager.js';

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

document.addEventListener('DOMContentLoaded', () => {
  initMonths();
  initPlayerManager();
  initAttendance();

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => showView(tab.dataset.view));
  });

  let saved = 'pagos';
  try { saved = localStorage.getItem(VIEW_KEY) || 'pagos'; } catch {}
  showView(document.getElementById(`view-${saved}`) ? saved : 'pagos');
});
