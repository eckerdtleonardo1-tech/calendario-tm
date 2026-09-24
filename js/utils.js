// Evita que un nombre con "<" o "&" rompa el HTML (o inyecte código) al usar innerHTML
export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Fecha local en formato YYYY-MM-DD (toISOString usa UTC y puede correr el día)
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatLongDate(iso) {
  const text = parseISODate(iso).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatShortDate(iso) {
  return parseISODate(iso).toLocaleDateString('es-AR', {
    weekday: 'short', day: '2-digit', month: '2-digit'
  });
}

export function normalize(str) {
  return String(str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}
