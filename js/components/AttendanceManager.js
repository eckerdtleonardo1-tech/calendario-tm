import { appData, saveData, notify, sortedPlayers } from '../store.js';
import { escapeHtml, toISODate, parseISODate, formatLongDate, formatShortDate } from '../utils.js';

// P = presente, A = ausente
const STATES = [
  { code: 'P', label: 'Presente', short: 'P', cls: 'present' },
  { code: 'A', label: 'Ausente', short: 'A', cls: 'absent' }
];

let currentDate = toISODate(new Date());

export function initAttendance() {
  const dateInput = document.getElementById('att-date');
  dateInput.value = currentDate;
  dateInput.addEventListener('change', () => {
    if (dateInput.value) setDate(dateInput.value);
  });

  document.getElementById('att-prev').addEventListener('click', () => shiftDay(-1));
  document.getElementById('att-next').addEventListener('click', () => shiftDay(1));
  document.getElementById('att-today').addEventListener('click', () => setDate(toISODate(new Date())));
  document.getElementById('att-all-present').addEventListener('click', markAllPresent);
  document.getElementById('att-clear').addEventListener('click', clearDay);

  document.addEventListener('players-changed', renderAll);
  renderAll();
}

function renderAll() {
  renderDay();
  renderHistory();
}

function setDate(iso) {
  currentDate = iso;
  document.getElementById('att-date').value = iso;
  renderAll();
}

function shiftDay(delta) {
  const d = parseISODate(currentDate);
  d.setDate(d.getDate() + delta);
  setDate(toISODate(d));
}

function dayRecord() {
  return appData.attendance[currentDate] || {};
}

function setStatus(playerId, code) {
  if (!appData.attendance[currentDate]) appData.attendance[currentDate] = {};
  const day = appData.attendance[currentDate];

  // Tocar el estado ya marcado lo desmarca
  if (day[playerId] === code) delete day[playerId];
  else day[playerId] = code;

  if (!Object.keys(day).length) delete appData.attendance[currentDate];
  saveData();
  renderAll();
  notify('attendance-changed');
}

function markAllPresent() {
  if (!appData.players.length) return;
  const day = appData.attendance[currentDate] || (appData.attendance[currentDate] = {});
  // Sólo completa a los que no tienen marca, para no pisar tardes/ausencias ya cargadas
  appData.players.forEach(p => { if (!day[p.id]) day[p.id] = 'P'; });
  saveData();
  renderAll();
  notify('attendance-changed');
}

function clearDay() {
  if (!appData.attendance[currentDate]) return;
  if (!confirm(`¿Borrar la asistencia del ${formatLongDate(currentDate)}?`)) return;
  delete appData.attendance[currentDate];
  saveData();
  renderAll();
  notify('attendance-changed');
}

function countDay(record) {
  const counts = { P: 0, A: 0 };
  appData.players.forEach(p => {
    const s = record[p.id];
    if (s) counts[s]++;
  });
  return counts;
}

function renderDay() {
  document.getElementById('att-date-label').textContent = formatLongDate(currentDate);
  const record = dayRecord();
  const players = sortedPlayers();
  const counts = countDay(record);
  const unmarked = players.length - counts.P - counts.A;

  document.getElementById('att-summary').innerHTML = `
    <div class="stat"><span class="stat-value stat-success">${counts.P}</span><span class="stat-label">Presentes</span></div>
    <div class="stat"><span class="stat-value stat-danger">${counts.A}</span><span class="stat-label">Ausentes</span></div>
    <div class="stat"><span class="stat-value stat-muted">${unmarked}</span><span class="stat-label">Sin marcar</span></div>
  `;

  const list = document.getElementById('att-list');
  list.innerHTML = '';

  if (!players.length) {
    list.innerHTML = '<li class="att-empty">No hay jugadores en el plantel. Cargalos en la pestaña <strong>Jugadores</strong>.</li>';
    return;
  }

  players.forEach(player => {
    const status = record[player.id];
    const li = document.createElement('li');
    li.className = 'att-item' + (status ? ` is-${STATES.find(s => s.code === status).cls}` : '');
    li.innerHTML = `
      <span class="player-number-disp">${player.number === '-' ? '—' : '#' + escapeHtml(player.number)}</span>
      <div class="att-player">
        <span class="att-name">${escapeHtml(player.name)}</span>
        <span class="att-pos">${escapeHtml(player.position)}</span>
      </div>
      <div class="att-toggle" role="group" aria-label="Asistencia de ${escapeHtml(player.name)}"></div>
    `;
    const group = li.querySelector('.att-toggle');
    STATES.forEach(s => {
      const b = document.createElement('button');
      b.className = `att-btn ${s.cls}` + (status === s.code ? ' active' : '');
      b.innerHTML = `<span class="att-btn-short">${s.short}</span><span class="att-btn-long">${s.label}</span>`;
      b.title = s.label;
      b.setAttribute('aria-pressed', status === s.code);
      b.addEventListener('click', () => setStatus(player.id, s.code));
      group.appendChild(b);
    });
    list.appendChild(li);
  });
}

function renderHistory() {
  const container = document.getElementById('att-history');
  const dates = Object.keys(appData.attendance).sort().reverse();

  if (!dates.length) {
    container.innerHTML = '<p class="att-history-empty">Todavía no hay sesiones registradas</p>';
    return;
  }

  container.innerHTML = '';
  dates.forEach(iso => {
    const counts = countDay(appData.attendance[iso]);
    const marked = counts.P + counts.A;
    const pct = marked ? Math.round((counts.P / marked) * 100) : 0;

    const btn = document.createElement('button');
    btn.className = 'history-item' + (iso === currentDate ? ' active' : '');
    btn.innerHTML = `
      <span class="history-date">${formatShortDate(iso)}</span>
      <span class="history-counts">
        <span class="c-present">${counts.P}</span>·<span class="c-absent">${counts.A}</span>
      </span>
      <span class="history-pct">${pct}%</span>
    `;
    btn.title = formatLongDate(iso);
    btn.addEventListener('click', () => setDate(iso));
    container.appendChild(btn);
  });
}
