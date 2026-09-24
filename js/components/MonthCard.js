import { appData, saveData, notify, sortedPlayers } from '../store.js';
import { escapeHtml, normalize } from '../utils.js';

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril',
  'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const cardsPerPage = 3;
const totalPages = Math.ceil(MONTHS.length / cardsPerPage);
const currentMonth = new Date().getMonth();
// Arranca en la página que contiene el mes actual
let currentPage = Math.floor(currentMonth / cardsPerPage);

export function initMonths() {
  const grid = document.getElementById('monthsGrid');
  grid.innerHTML = '';

  MONTHS.forEach((month, i) => {
    const card = document.createElement('article');
    card.className = 'month-card' + (i === currentMonth ? ' is-current' : '');
    card.id = `month-card-${i}`;
    card.innerHTML = `
      <div class="month-header">
        <span class="month-name">${month}${i === currentMonth ? '<span class="current-tag">Actual</span>' : ''}</span>
        <div class="month-badges">
          <span class="month-paid-count" id="paid-${i}"></span>
          <span class="month-count" id="count-${i}"></span>
        </div>
      </div>
      <div class="month-progress"><div class="month-progress-bar" id="progress-${i}"></div></div>
      <div class="input-row">
        <input type="text" id="input-${i}" list="players-datalist" placeholder="Nombre..." aria-label="Nombre para ${month}" autocomplete="off">
        <button class="btn-add" id="btn-${i}">Agregar</button>
      </div>
      <div class="card-tools">
        <button class="btn-link" id="roster-${i}" title="Agrega a todos los jugadores del plantel que falten en este mes">+ Cargar plantel</button>
        <button class="btn-link" id="copy-${i}" title="Copia la lista del mes anterior (sin marcar pagos)">Copiar mes anterior</button>
      </div>
      <div class="search-row" id="search-row-${i}">
        <input type="text" class="search-input" id="search-${i}" placeholder="Buscar..." aria-label="Buscar en ${month}">
      </div>
      <div class="list-wrapper">
        <ul class="names-list" id="list-${i}"></ul>
        <div class="no-results" id="no-results-${i}">Sin coincidencias</div>
      </div>
      <p class="card-msg" id="msg-${i}" aria-live="polite"></p>
    `;
    grid.appendChild(card);

    document.getElementById(`btn-${i}`).addEventListener('click', () => addName(i));
    document.getElementById(`input-${i}`).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addName(i);
    });
    document.getElementById(`search-${i}`).addEventListener('input', () => filterList(i));
    document.getElementById(`roster-${i}`).addEventListener('click', () => loadRoster(i));
    document.getElementById(`copy-${i}`).addEventListener('click', () => copyPrevMonth(i));
    if (i === 0) document.getElementById(`copy-${i}`).hidden = true;

    renderList(i);
  });

  setupPagination(grid);
  updatePagination();
  updatePlayersDatalist();
  updateYearSummary();

  document.addEventListener('players-changed', updatePlayersDatalist);
}

function setupPagination(grid) {
  if (document.getElementById('pagination-controls')) return;

  const pagination = document.createElement('div');
  pagination.id = 'pagination-controls';
  pagination.className = 'pagination-controls';
  pagination.innerHTML = `
    <button id="btn-prev" class="btn-page">&#8592; Anterior</button>
    <div class="page-dots" id="page-dots"></div>
    <button id="btn-next" class="btn-page">Siguiente &#8594;</button>
  `;
  grid.parentNode.insertBefore(pagination, grid);

  const dots = pagination.querySelector('#page-dots');
  for (let p = 0; p < totalPages; p++) {
    const dot = document.createElement('button');
    dot.className = 'page-dot';
    const from = MONTHS[p * cardsPerPage].slice(0, 3);
    const to = MONTHS[Math.min((p + 1) * cardsPerPage, MONTHS.length) - 1].slice(0, 3);
    dot.textContent = `${from}–${to}`;
    dot.addEventListener('click', () => { currentPage = p; updatePagination(); });
    dots.appendChild(dot);
  }

  document.getElementById('btn-prev').addEventListener('click', () => {
    if (currentPage > 0) { currentPage--; updatePagination(); }
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    if (currentPage < totalPages - 1) { currentPage++; updatePagination(); }
  });
}

function updatePagination() {
  MONTHS.forEach((_, i) => {
    const card = document.getElementById(`month-card-${i}`);
    const visible = i >= currentPage * cardsPerPage && i < (currentPage + 1) * cardsPerPage;
    card.style.display = visible ? 'flex' : 'none';
  });

  document.getElementById('btn-prev').disabled = currentPage === 0;
  document.getElementById('btn-next').disabled = currentPage === totalPages - 1;
  document.querySelectorAll('.page-dot').forEach((dot, p) => {
    dot.classList.toggle('active', p === currentPage);
  });
}

function updatePlayersDatalist() {
  let dl = document.getElementById('players-datalist');
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = 'players-datalist';
    document.body.appendChild(dl);
  }
  dl.innerHTML = sortedPlayers()
    .map(p => `<option value="${escapeHtml(p.name)}"></option>`)
    .join('');
}

function updateYearSummary() {
  const el = document.getElementById('yearSummary');
  if (!el) return;

  let total = 0, paid = 0;
  MONTHS.forEach(m => {
    const items = appData[m] || [];
    total += items.length;
    paid += items.filter(e => e.paid).length;
  });
  const cur = appData[MONTHS[currentMonth]] || [];
  const curPaid = cur.filter(e => e.paid).length;
  const pct = total ? Math.round((paid / total) * 100) : 0;

  el.innerHTML = `
    <div class="stat"><span class="stat-value">${curPaid}/${cur.length}</span><span class="stat-label">Pagaron en ${MONTHS[currentMonth]}</span></div>
    <div class="stat"><span class="stat-value stat-danger">${cur.length - curPaid}</span><span class="stat-label">Deben este mes</span></div>
    <div class="stat"><span class="stat-value">${pct}%</span><span class="stat-label">Cobrado en el año (${paid}/${total})</span></div>
  `;
}

function updateCount(monthIndex) {
  const items = appData[MONTHS[monthIndex]] || [];
  const total = items.length;
  const paidCount = items.filter(e => e.paid).length;

  document.getElementById(`count-${monthIndex}`).textContent = total === 0 ? '' : total;
  document.getElementById(`paid-${monthIndex}`).textContent = paidCount > 0 ? `${paidCount}/${total}` : '';
  const bar = document.getElementById(`progress-${monthIndex}`);
  bar.style.width = total ? `${(paidCount / total) * 100}%` : '0%';
  bar.classList.toggle('complete', total > 0 && paidCount === total);

  updateYearSummary();
}

function createNameElement(entry, monthIndex, itemIndex) {
  const li = document.createElement('li');
  li.className = 'name-item' + (entry.paid ? ' is-paid' : '');

  const dot = document.createElement('button');
  dot.className = `status-dot ${entry.paid ? 'paid' : 'unpaid'}`;
  dot.title = entry.paid ? 'Marcar como no pagado' : 'Marcar como pagado';
  dot.setAttribute('aria-label', `${dot.title}: ${entry.name}`);

  const span = document.createElement('span');
  span.className = 'person-name';
  span.textContent = entry.name;
  span.title = 'Click para marcar pago';

  const label = document.createElement('span');
  label.className = `paid-label ${entry.paid ? 'visible' : ''}`;
  label.textContent = 'Pago';

  const btnDel = document.createElement('button');
  btnDel.className = 'btn-delete';
  btnDel.innerHTML = '&times;';
  btnDel.title = 'Eliminar';
  btnDel.setAttribute('aria-label', `Eliminar ${entry.name}`);

  const toggle = () => {
    entry.paid = !entry.paid;
    saveData();
    li.classList.toggle('is-paid', entry.paid);
    dot.className = `status-dot ${entry.paid ? 'paid' : 'unpaid'}`;
    dot.title = entry.paid ? 'Marcar como no pagado' : 'Marcar como pagado';
    label.className = `paid-label ${entry.paid ? 'visible' : ''}`;
    updateCount(monthIndex);
    notify('payments-changed');
  };
  dot.addEventListener('click', toggle);
  span.addEventListener('click', toggle);

  btnDel.addEventListener('click', () => {
    if (entry.paid && !confirm(`${entry.name} figura como pagado. ¿Eliminar igual?`)) return;
    appData[MONTHS[monthIndex]].splice(itemIndex, 1);
    saveData();
    renderList(monthIndex);
    notify('payments-changed');
  });

  li.append(dot, span, label, btnDel);
  return li;
}

export function renderList(monthIndex) {
  const list = document.getElementById(`list-${monthIndex}`);
  const items = appData[MONTHS[monthIndex]] || [];

  list.innerHTML = '';
  items.forEach((entry, i) => {
    list.appendChild(createNameElement(entry, monthIndex, i));
  });

  updateCount(monthIndex);
  toggleSearchVisibility(monthIndex);

  const searchInput = document.getElementById(`search-${monthIndex}`);
  if (searchInput.value.trim()) filterList(monthIndex);
}

function toggleSearchVisibility(monthIndex) {
  const items = appData[MONTHS[monthIndex]] || [];
  const searchRow = document.getElementById(`search-row-${monthIndex}`);
  if (items.length >= 4) {
    searchRow.classList.add('visible');
  } else {
    searchRow.classList.remove('visible');
    document.getElementById(`search-${monthIndex}`).value = '';
    document.getElementById(`no-results-${monthIndex}`).classList.remove('visible');
  }
}

function filterList(monthIndex) {
  const query = normalize(document.getElementById(`search-${monthIndex}`).value);
  const items = document.getElementById(`list-${monthIndex}`).querySelectorAll('.name-item');
  let matchCount = 0;

  items.forEach(item => {
    const match = !query || normalize(item.querySelector('.person-name').textContent).includes(query);
    item.style.display = match ? '' : 'none';
    if (match) matchCount++;
  });

  document.getElementById(`no-results-${monthIndex}`).classList.toggle('visible', !!query && matchCount === 0);
}

function showMsg(monthIndex, text) {
  const msg = document.getElementById(`msg-${monthIndex}`);
  msg.textContent = text;
  msg.classList.add('visible');
  clearTimeout(msg._t);
  msg._t = setTimeout(() => msg.classList.remove('visible'), 2500);
}

function hasName(monthIndex, name) {
  const n = normalize(name);
  return (appData[MONTHS[monthIndex]] || []).some(e => normalize(e.name) === n);
}

function addEntries(monthIndex, names) {
  const key = MONTHS[monthIndex];
  if (!appData[key]) appData[key] = [];
  let added = 0;
  names.forEach(name => {
    if (!hasName(monthIndex, name)) {
      appData[key].push({ name, paid: false });
      added++;
    }
  });
  if (added) {
    saveData();
    renderList(monthIndex);
    notify('payments-changed');
  }
  return added;
}

function addName(monthIndex) {
  const input = document.getElementById(`input-${monthIndex}`);
  const name = input.value.trim();
  if (!name) return;

  if (hasName(monthIndex, name)) {
    showMsg(monthIndex, `"${name}" ya está en ${MONTHS[monthIndex]}`);
    input.select();
    return;
  }

  addEntries(monthIndex, [name]);
  input.value = '';
  input.focus();
}

function loadRoster(monthIndex) {
  if (!appData.players.length) {
    showMsg(monthIndex, 'No hay jugadores cargados en el plantel');
    return;
  }
  const added = addEntries(monthIndex, sortedPlayers().map(p => p.name));
  showMsg(monthIndex, added ? `Se agregaron ${added} jugador(es)` : 'Todo el plantel ya está en la lista');
}

function copyPrevMonth(monthIndex) {
  const prev = appData[MONTHS[monthIndex - 1]] || [];
  if (!prev.length) {
    showMsg(monthIndex, `${MONTHS[monthIndex - 1]} está vacío`);
    return;
  }
  const added = addEntries(monthIndex, prev.map(e => e.name));
  showMsg(monthIndex, added ? `Se copiaron ${added} nombre(s)` : 'No hay nombres nuevos para copiar');
}

// Usado por la ficha de jugadores para mostrar si pagó el mes actual
export function paymentStatusThisMonth(name) {
  const n = normalize(name);
  const entry = (appData[MONTHS[currentMonth]] || []).find(e => normalize(e.name) === n);
  return entry ? (entry.paid ? 'paid' : 'unpaid') : 'none';
}

export function currentMonthName() {
  return MONTHS[currentMonth];
}
