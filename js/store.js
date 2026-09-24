const STORAGE_KEY = 'pagos_mensuales_data';

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const appData = loadData();
if (!appData.players) appData.players = [];
if (!appData.attendance) appData.attendance = {};

// Los jugadores guardados antes de esta versión no tenían id; la asistencia los referencia por id
let migrated = false;
appData.players.forEach(p => {
  if (!p.id) {
    p.id = newId();
    migrated = true;
  }
});
// El estado "tarde" (T) se quitó: las marcas viejas pasan a presente
Object.values(appData.attendance).forEach(day => {
  Object.keys(day).forEach(id => {
    if (day[id] === 'T') {
      day[id] = 'P';
      migrated = true;
    }
  });
});
if (migrated) saveData();

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

// Aviso global para que las otras pantallas se refresquen cuando cambian los datos
export function notify(eventName) {
  document.dispatchEvent(new CustomEvent(eventName));
}

export function sortedPlayers() {
  return [...appData.players].sort((a, b) => {
    const na = parseInt(a.number, 10);
    const nb = parseInt(b.number, 10);
    if (isNaN(na) && isNaN(nb)) return a.name.localeCompare(b.name);
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    return na - nb;
  });
}

// Porcentaje de asistencia sobre las sesiones en que el jugador fue marcado
export function attendanceStats(playerId) {
  let present = 0, absent = 0;
  Object.values(appData.attendance).forEach(day => {
    const s = day[playerId];
    if (s === 'P') present++;
    else if (s === 'A') absent++;
  });
  const total = present + absent;
  return {
    present, absent, total,
    pct: total ? Math.round((present / total) * 100) : null
  };
}
