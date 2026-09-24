import { appData, saveData, notify, newId, sortedPlayers, attendanceStats } from '../store.js';
import { escapeHtml, normalize } from '../utils.js';
import { paymentStatusThisMonth, currentMonthName } from './MonthCard.js';

let editingId = null;

export function initPlayerManager() {
  setupPlayerForm();
  document.getElementById('p-search').addEventListener('input', renderPlayers);
  document.getElementById('p-filter-pos').addEventListener('change', renderPlayers);
  document.getElementById('th-payment').textContent = `Pago ${currentMonthName()}`;

  // Pagos y asistencia se cargan en otras pantallas; refrescamos las columnas que los muestran
  document.addEventListener('payments-changed', renderPlayers);
  document.addEventListener('attendance-changed', renderPlayers);

  renderPlayers();
}

function renderPlayers() {
  const tbody = document.getElementById('playersTbody');
  const query = normalize(document.getElementById('p-search').value);
  const pos = document.getElementById('p-filter-pos').value;

  const players = sortedPlayers().filter(p =>
    (!query || normalize(p.name).includes(query) || String(p.number).includes(query)) &&
    (!pos || p.position === pos)
  );

  updatePositionFilter(pos);

  document.getElementById('players-count').textContent =
    `${appData.players.length} jugador${appData.players.length === 1 ? '' : 'es'}`;

  tbody.innerHTML = '';

  if (!players.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">${
      appData.players.length ? 'Ningún jugador coincide con la búsqueda' : 'Todavía no hay jugadores. Agregá el primero arriba.'
    }</td></tr>`;
    return;
  }

  players.forEach(player => {
    const stats = attendanceStats(player.id);
    const pay = paymentStatusThisMonth(player.name);
    const payHtml = {
      paid: '<span class="pill pill-success">Pagó</span>',
      unpaid: '<span class="pill pill-danger">Debe</span>',
      none: '<span class="pill pill-muted">—</span>'
    }[pay];
    const attHtml = stats.pct === null
      ? '<span class="pill pill-muted">Sin datos</span>'
      : `<div class="att-meter" title="${stats.present} presente(s), ${stats.absent} ausente(s)">
           <div class="att-meter-bar"><div style="width:${stats.pct}%" class="${stats.pct >= 75 ? 'good' : stats.pct >= 50 ? 'mid' : 'bad'}"></div></div>
           <span>${stats.pct}%</span>
         </div>`;

    const tr = document.createElement('tr');
    if (player.id === editingId) tr.className = 'is-editing';
    tr.innerHTML = `
      <td><span class="player-number-disp">${player.number === '-' ? '—' : '#' + escapeHtml(player.number)}</span></td>
      <td class="player-name-td">${escapeHtml(player.name)}</td>
      <td><span class="player-position-disp pos-${escapeHtml(normalize(player.position).replace(/\s+/g, '-'))}">${escapeHtml(player.position)}</span></td>
      <td>${attHtml}</td>
      <td>${payHtml}</td>
      <td class="actions-td">
        <button class="btn-icon" data-action="edit" title="Editar" aria-label="Editar ${escapeHtml(player.name)}">✎</button>
        <button class="btn-delete" data-action="delete" title="Eliminar" aria-label="Eliminar ${escapeHtml(player.name)}">&times;</button>
      </td>
    `;
    tr.querySelector('[data-action="edit"]').addEventListener('click', () => startEdit(player));
    tr.querySelector('[data-action="delete"]').addEventListener('click', () => deletePlayer(player));
    tbody.appendChild(tr);
  });
}

function updatePositionFilter(selected) {
  const select = document.getElementById('p-filter-pos');
  const positions = [...new Set(appData.players.map(p => p.position))].sort();
  select.innerHTML = '<option value="">Todas las posiciones</option>' +
    positions.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
  select.value = positions.includes(selected) ? selected : '';
}

function deletePlayer(player) {
  if (!confirm(`¿Eliminar a ${player.name} del plantel? También se borra su historial de asistencia.`)) return;
  appData.players = appData.players.filter(p => p.id !== player.id);
  Object.values(appData.attendance).forEach(day => delete day[player.id]);
  if (editingId === player.id) cancelEdit();
  saveData();
  renderPlayers();
  notify('players-changed');
}

function startEdit(player) {
  editingId = player.id;
  document.getElementById('p-name').value = player.name;
  const posSelect = document.getElementById('p-position');
  // Jugadores cargados antes tenían la posición en texto libre: la sumamos como opción
  if (player.position !== 'Sin posición' && ![...posSelect.options].some(o => o.value === player.position)) {
    posSelect.add(new Option(player.position, player.position));
  }
  posSelect.value = player.position === 'Sin posición' ? '' : player.position;
  document.getElementById('p-number').value = player.number === '-' ? '' : player.number;
  document.getElementById('btn-add-player').textContent = 'Guardar cambios';
  document.getElementById('btn-cancel-edit').hidden = false;
  document.getElementById('p-name').focus();
  renderPlayers();
}

function cancelEdit() {
  editingId = null;
  document.getElementById('p-name').value = '';
  document.getElementById('p-position').value = '';
  document.getElementById('p-number').value = '';
  document.getElementById('btn-add-player').textContent = 'Agregar Jugador';
  document.getElementById('btn-cancel-edit').hidden = true;
  setError('');
  renderPlayers();
}

function setError(text) {
  const el = document.getElementById('player-form-error');
  el.textContent = text;
  el.classList.toggle('visible', !!text);
}

function setupPlayerForm() {
  const btn = document.getElementById('btn-add-player');
  const inputName = document.getElementById('p-name');
  const inputPos = document.getElementById('p-position');
  const inputNum = document.getElementById('p-number');

  const submit = () => {
    const name = inputName.value.trim();
    const position = inputPos.value || 'Sin posición';
    const number = inputNum.value.trim() || '-';

    if (!name) {
      setError('El nombre es obligatorio');
      inputName.focus();
      return;
    }
    const others = appData.players.filter(p => p.id !== editingId);
    if (others.some(p => normalize(p.name) === normalize(name))) {
      setError(`Ya existe un jugador llamado "${name}"`);
      inputName.focus();
      return;
    }
    if (number !== '-' && others.some(p => String(p.number) === number)) {
      const owner = others.find(p => String(p.number) === number);
      setError(`El dorsal #${number} ya lo usa ${owner.name}`);
      inputNum.focus();
      return;
    }
    setError('');

    if (editingId) {
      const player = appData.players.find(p => p.id === editingId);
      Object.assign(player, { name, position, number });
      editingId = null;
      btn.textContent = 'Agregar Jugador';
      document.getElementById('btn-cancel-edit').hidden = true;
    } else {
      appData.players.push({ id: newId(), name, position, number });
    }
    saveData();
    renderPlayers();
    notify('players-changed');

    inputName.value = '';
    inputPos.value = '';
    inputNum.value = '';
    inputName.focus();
  };

  btn.addEventListener('click', submit);
  [inputName, inputNum].forEach(inp => inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape' && editingId) cancelEdit();
  }));
  document.getElementById('btn-cancel-edit').addEventListener('click', cancelEdit);
}
