import { appData, saveData } from '../store.js';

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril',
  'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

let currentPage = 0;
const cardsPerPage = 3;

export function initMonths() {
  const grid = document.getElementById('monthsGrid');
  grid.innerHTML = '';

  MONTHS.forEach((month, i) => {
    const card = document.createElement('article');
    card.className = 'month-card';
    card.id = `month-card-${i}`;
    card.innerHTML = `
      <div class="month-header">
        <span class="month-name">${month}</span>
        <div class="month-badges">
          <span class="month-paid-count" id="paid-${i}"></span>
          <span class="month-count" id="count-${i}"></span>
        </div>
      </div>
      <div class="input-row">
        <input type="text" id="input-${i}" placeholder="Nombre..." aria-label="Nombre para ${month}">
        <button class="btn-add" id="btn-${i}">Agregar</button>
      </div>
      <div class="search-row" id="search-row-${i}">
        <input type="text" class="search-input" id="search-${i}" placeholder="Buscar..." aria-label="Buscar en ${month}">
      </div>
      <div class="list-wrapper">
        <ul class="names-list" id="list-${i}"></ul>
        <div class="no-results" id="no-results-${i}">Sin coincidencias</div>
      </div>
    `;
    grid.appendChild(card);

    document.getElementById(`btn-${i}`).addEventListener('click', () => addName(i));
    document.getElementById(`input-${i}`).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addName(i);
    });
    document.getElementById(`search-${i}`).addEventListener('input', () => filterList(i));

    renderList(i);
  });

  // Create pagination controls
  let pagination = document.getElementById('pagination-controls');
  if (!pagination) {
    pagination = document.createElement('div');
    pagination.id = 'pagination-controls';
    pagination.className = 'pagination-controls';
    pagination.innerHTML = `
      <button id="btn-prev" class="btn-page" disabled>&#8592; Anterior</button>
      <span id="page-indicator">1 / 4</span>
      <button id="btn-next" class="btn-page">Siguiente &#8594;</button>
    `;
    grid.parentNode.insertBefore(pagination, grid.nextSibling);

    document.getElementById('btn-prev').addEventListener('click', () => {
      if (currentPage > 0) {
        currentPage--;
        updatePagination();
      }
    });

    document.getElementById('btn-next').addEventListener('click', () => {
      if (currentPage < 3) {
        currentPage++;
        updatePagination();
      }
    });
  }

  updatePagination();
}

function updatePagination() {
  for (let i = 0; i < 12; i++) {
    const card = document.getElementById(`month-card-${i}`);
    if (card) {
      if (i >= currentPage * cardsPerPage && i < (currentPage + 1) * cardsPerPage) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    }
  }

  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const indicator = document.getElementById('page-indicator');
  
  if (btnPrev) {
    btnPrev.disabled = currentPage === 0;
    btnPrev.style.opacity = currentPage === 0 ? '0.5' : '1';
    btnPrev.style.cursor = currentPage === 0 ? 'not-allowed' : 'pointer';
  }
  if (btnNext) {
    btnNext.disabled = currentPage === Math.ceil(12 / cardsPerPage) - 1;
    btnNext.style.opacity = currentPage === Math.ceil(12 / cardsPerPage) - 1 ? '0.5' : '1';
    btnNext.style.cursor = currentPage === Math.ceil(12 / cardsPerPage) - 1 ? 'not-allowed' : 'pointer';
  }
  if (indicator) {
    indicator.textContent = `${currentPage + 1} / ${Math.ceil(12 / cardsPerPage)}`;
  }
}

function updateCount(monthIndex) {
  const key = MONTHS[monthIndex];
  const items = appData[key] || [];
  const countEl = document.getElementById(`count-${monthIndex}`);
  const paidEl = document.getElementById(`paid-${monthIndex}`);
  const total = items.length;
  const paidCount = items.filter(e => e.paid).length;

  countEl.textContent = total === 0 ? '' : total;
  paidEl.textContent = paidCount > 0 ? `${paidCount}/${total}` : '';
}

function createNameElement(name, paid, monthIndex, itemIndex) {
  const li = document.createElement('li');
  li.className = 'name-item';

  const dot = document.createElement('button');
  dot.className = `status-dot ${paid ? 'paid' : 'unpaid'}`;
  dot.title = paid ? 'Marcar como no pagado' : 'Marcar como pagado';

  const span = document.createElement('span');
  span.className = 'person-name';
  span.textContent = name;

  const label = document.createElement('span');
  label.className = `paid-label ${paid ? 'visible' : ''}`;
  label.textContent = 'Pago';

  const btnDel = document.createElement('button');
  btnDel.className = 'btn-delete';
  btnDel.innerHTML = '&times;';
  btnDel.title = 'Eliminar';

  dot.addEventListener('click', () => {
    const key = MONTHS[monthIndex];
    const entry = appData[key][itemIndex];
    entry.paid = !entry.paid;
    saveData();
    dot.className = `status-dot ${entry.paid ? 'paid' : 'unpaid'}`;
    dot.title = entry.paid ? 'Marcar como no pagado' : 'Marcar como pagado';
    label.className = `paid-label ${entry.paid ? 'visible' : ''}`;
    updateCount(monthIndex);
  });

  btnDel.addEventListener('click', () => {
    const key = MONTHS[monthIndex];
    appData[key].splice(itemIndex, 1);
    saveData();
    renderList(monthIndex);
  });

  li.append(dot, span, label, btnDel);
  return li;
}

export function renderList(monthIndex) {
  const key = MONTHS[monthIndex];
  const list = document.getElementById(`list-${monthIndex}`);
  const items = appData[key] || [];

  list.innerHTML = '';
  items.forEach((entry, i) => {
    list.appendChild(createNameElement(entry.name, entry.paid, monthIndex, i));
  });

  updateCount(monthIndex);
  toggleSearchVisibility(monthIndex);

  const searchInput = document.getElementById(`search-${monthIndex}`);
  if (searchInput && searchInput.value.trim()) {
    filterList(monthIndex);
  }
}

function toggleSearchVisibility(monthIndex) {
  const key = MONTHS[monthIndex];
  const items = appData[key] || [];
  const searchRow = document.getElementById(`search-row-${monthIndex}`);
  if (items.length >= 4) {
    searchRow.classList.add('visible');
  } else {
    searchRow.classList.remove('visible');
    const searchInput = document.getElementById(`search-${monthIndex}`);
    if (searchInput) searchInput.value = '';
  }
}

function filterList(monthIndex) {
  const searchInput = document.getElementById(`search-${monthIndex}`);
  const query = searchInput.value.trim().toLowerCase();
  const list = document.getElementById(`list-${monthIndex}`);
  const items = list.querySelectorAll('.name-item');
  const noResults = document.getElementById(`no-results-${monthIndex}`);
  let matchCount = 0;

  items.forEach(item => {
    const name = item.querySelector('.person-name').textContent.toLowerCase();
    if (!query || name.includes(query)) {
      item.style.display = '';
      matchCount++;
    } else {
      item.style.display = 'none';
    }
  });

  noResults.classList.toggle('visible', query && matchCount === 0);
}

function addName(monthIndex) {
  const input = document.getElementById(`input-${monthIndex}`);
  const name = input.value.trim();
  if (!name) return;

  const key = MONTHS[monthIndex];
  if (!appData[key]) appData[key] = [];

  appData[key].push({ name, paid: false });
  saveData();
  renderList(monthIndex);

  input.value = '';
  input.focus();
}
