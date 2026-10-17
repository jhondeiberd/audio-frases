// ---- Tema claro / oscuro ----
// Sin elección guardada se sigue el tema del sistema (prefers-color-scheme). El script del <head> lo aplica antes de pintar.
const themeNow = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function paintTheme() {
  const dark = themeNow() === 'dark', b = $('themeBtn');
  b.setAttribute('aria-pressed', dark); b.title = t(dark ? 'theme.dark' : 'theme.light'); b.setAttribute('aria-label', t('ui.theme') + ': ' + b.title);
  b.querySelector('.sun').toggleAttribute('hidden', !dark); b.querySelector('.moon').toggleAttribute('hidden', dark);   // el icono muestra a qué tema se pasa
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#0E151B' : '#F2F5F7';
}
$('themeBtn').addEventListener('click', () => { const n = themeNow() === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; store.set('theme', n); paintTheme(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!store.get('theme', '')) paintTheme(); });
