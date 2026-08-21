import { appData, saveData } from '../store.js';

export function initPlayerManager() {
  setupPlayerForm();
  renderPlayers();
}

function renderPlayers() {
  const tbody = document.getElementById('playersTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  appData.players.forEach((player, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="player-number-disp">#${player.number}</span></td>
      <td class="player-name-td">${player.name}</td>
      <td><span class="player-position-disp">${player.position}</span></td>
      <td style="text-align: right;">
        <button class="btn-delete" id="del-player-${i}" title="Eliminar" aria-label="Eliminar ${player.name}">&times;</button>
      </td>
    `;
    tbody.appendChild(tr);
    
    document.getElementById(`del-player-${i}`).addEventListener('click', () => {
      appData.players.splice(i, 1);
      saveData();
      renderPlayers();
    });
  });
}

function setupPlayerForm() {
  const btn = document.getElementById('btn-add-player');
  const inputName = document.getElementById('p-name');
  const inputPos = document.getElementById('p-position');
  const inputNum = document.getElementById('p-number');

  if (!btn || !inputName) return;

  btn.addEventListener('click', () => {
    const name = inputName.value.trim();
    const position = inputPos.value.trim();
    const number = inputNum.value.trim();
    
    if (!name) return;

    appData.players.push({ name, position: position || 'Sin posición', number: number || '-' });
    saveData();
    renderPlayers();

    inputName.value = '';
    inputPos.value = '';
    inputNum.value = '';
    inputName.focus();
  });
}
