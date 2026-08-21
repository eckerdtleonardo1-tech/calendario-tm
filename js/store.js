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

export function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}
