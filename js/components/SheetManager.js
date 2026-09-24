import { appData, saveData, newId } from '../store.js?v=4';
import { toISODate } from '../utils.js?v=4';

// Columnas de la planilla de observaciones (sin la firma, que se dibuja aparte)
const FIELDS = [
  { key: 'fecha', label: 'Fecha', type: 'date' },
  { key: 'club', label: 'Club', type: 'text' },
  { key: 'actividad', label: 'Actividad', type: 'text' },
  { key: 'horario', label: 'Día y horario', type: 'text', placeholder: 'Lun 18 a 19 hs' },
  { key: 'profesor', label: 'Profesor', type: 'text' }
];

let signingRowId = null;

export function initSheet() {
  if (!appData.sheet) appData.sheet = { practicante: '', rows: [] };
  const sheet = appData.sheet;

  const practicante = document.getElementById('sheet-practicante');
  practicante.value = sheet.practicante;
  practicante.addEventListener('input', () => {
    sheet.practicante = practicante.value;
    saveData();
  });

  document.getElementById('sheet-add-row').addEventListener('click', addRow);
  document.getElementById('sheet-print').addEventListener('click', () => {
    // La clase limita los estilos de impresión a la planilla (Ctrl+P en otras pestañas no cambia)
    document.body.classList.add('printing-sheet');
    window.print();
    document.body.classList.remove('printing-sheet');
  });
  document.getElementById('sheet-clear').addEventListener('click', clearSheet);

  setupSignaturePad();
  renderRows();
}

function addRow() {
  const rows = appData.sheet.rows;
  const last = rows[rows.length - 1];
  // Club, actividad, horario y profesor suelen repetirse: se copian de la fila anterior
  rows.push({
    id: newId(),
    fecha: toISODate(new Date()),
    club: last && last.club || '',
    actividad: last && last.actividad || '',
    horario: last && last.horario || '',
    profesor: last && last.profesor || '',
    firma: '',
    suspendida: ''
  });
  saveData();
  renderRows();
  const inputs = document.querySelectorAll(`#sheet-tbody tr:last-child input`);
  if (inputs[1]) inputs[1].focus();
}

function clearSheet() {
  if (!appData.sheet.rows.length) return;
  if (!confirm('¿Borrar todas las filas de la planilla? Esta acción no se puede deshacer.')) return;
  appData.sheet.rows = [];
  saveData();
  renderRows();
}

function renderRows() {
  const tbody = document.getElementById('sheet-tbody');
  const rows = appData.sheet.rows;
  tbody.innerHTML = '';

  document.getElementById('sheet-count').textContent =
    `${rows.length} registro${rows.length === 1 ? '' : 's'}`;

  if (!rows.length) {
    // Todo el recuadro es un botón: en el celular es lo primero que se toca
    tbody.innerHTML = `<tr class="sheet-empty"><td colspan="8">
      <button type="button" class="sheet-empty-btn">
        <span class="sheet-empty-plus" aria-hidden="true">+</span>
        <span>Todavía no hay registros</span>
        <strong>Tocá acá para agregar la primera fila</strong>
      </button>
    </td></tr>`;
    tbody.querySelector('.sheet-empty-btn').addEventListener('click', addRow);
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');

    FIELDS.forEach(f => {
      const td = document.createElement('td');
      td.dataset.label = f.label;
      const input = document.createElement('input');
      input.type = f.type;
      input.value = row[f.key] || '';
      input.placeholder = f.placeholder || '';
      input.setAttribute('aria-label', f.label);
      input.addEventListener('input', () => {
        row[f.key] = input.value;
        saveData();
      });
      td.appendChild(input);
      tr.appendChild(td);
    });

    const tdFirma = document.createElement('td');
    tdFirma.className = 'sheet-firma';
    tdFirma.dataset.label = 'Firma';
    if (row.firma) {
      const img = document.createElement('img');
      img.src = row.firma;
      img.alt = 'Firma';
      img.title = 'Tocá para volver a firmar';
      img.addEventListener('click', () => openSignaturePad(row.id));
      tdFirma.appendChild(img);
    } else {
      const btn = document.createElement('button');
      btn.className = 'btn-link';
      btn.textContent = 'Firmar';
      btn.addEventListener('click', () => openSignaturePad(row.id));
      tdFirma.appendChild(btn);
    }
    tr.appendChild(tdFirma);

    const tdSusp = document.createElement('td');
    tdSusp.dataset.label = 'Suspendida por';
    const susp = document.createElement('input');
    susp.type = 'text';
    susp.value = row.suspendida || '';
    susp.setAttribute('aria-label', 'Suspendida por');
    susp.addEventListener('input', () => {
      row.suspendida = susp.value;
      saveData();
    });
    tdSusp.appendChild(susp);
    tr.appendChild(tdSusp);

    const tdDel = document.createElement('td');
    tdDel.className = 'sheet-actions';
    const del = document.createElement('button');
    del.className = 'btn-delete';
    del.innerHTML = '&times;';
    del.title = 'Eliminar fila';
    del.setAttribute('aria-label', 'Eliminar fila');
    del.addEventListener('click', () => {
      const hasData = FIELDS.some(f => f.key !== 'fecha' && row[f.key]) || row.firma || row.suspendida;
      if (hasData && !confirm('¿Eliminar esta fila?')) return;
      appData.sheet.rows = appData.sheet.rows.filter(r => r.id !== row.id);
      saveData();
      renderRows();
    });
    tdDel.appendChild(del);
    tr.appendChild(tdDel);

    tbody.appendChild(tr);
  });
}

/* ── Firma dibujada ── */

function setupSignaturePad() {
  const dialog = document.getElementById('sign-dialog');
  const canvas = document.getElementById('sign-canvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;

  const point = (e) => {
    // El canvas se muestra escalado por CSS: convertimos a coordenadas internas
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height)];
  };

  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    ctx.beginPath();
    ctx.moveTo(...point(e));
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    ctx.lineTo(...point(e));
    ctx.stroke();
    canvas.dataset.dirty = '1';
  });
  const stop = () => { drawing = false; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  document.getElementById('sign-clear').addEventListener('click', () => clearCanvas());
  document.getElementById('sign-cancel').addEventListener('click', () => dialog.close());
  document.getElementById('sign-save').addEventListener('click', () => {
    const row = appData.sheet.rows.find(r => r.id === signingRowId);
    if (row) {
      row.firma = canvas.dataset.dirty ? canvas.toDataURL('image/png') : '';
      saveData();
      renderRows();
    }
    dialog.close();
  });
}

function clearCanvas() {
  const canvas = document.getElementById('sign-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0f172a';
  delete canvas.dataset.dirty;
}

function openSignaturePad(rowId) {
  signingRowId = rowId;
  clearCanvas();
  document.getElementById('sign-dialog').showModal();
}
