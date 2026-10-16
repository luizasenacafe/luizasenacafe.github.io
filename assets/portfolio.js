const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); }
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); });
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
const filters = document.querySelectorAll('[data-filter]');
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  let count = 0;
  document.querySelectorAll('[data-category]').forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; if (!card.hidden) count++; });
  document.querySelector('#filter-status').textContent = `${count} ${count === 1 ? 'projeto exibido' : 'projetos exibidos'}`;
}));
const motionButton = document.querySelector('#motion-toggle');
const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
function setMotion(paused) { document.body.classList.toggle('motion-paused', paused); motionButton.setAttribute('aria-pressed', String(paused)); motionButton.setAttribute('aria-label', paused ? 'Ativar animações' : 'Pausar animações'); motionButton.textContent = paused ? '▷ Ativar animações' : 'Ⅱ Pausar animações'; }
setMotion(preference.matches);
motionButton.addEventListener('click', () => setMotion(!document.body.classList.contains('motion-paused')));
preference.addEventListener('change', event => setMotion(event.matches));
document.querySelector('#copy-email').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText('luiizan12@gmail.com'); status.textContent = 'E-mail copiado. Vamos conversar!'; }
  catch { status.textContent = 'Você pode copiar este endereço: luiizan12@gmail.com'; }
});
