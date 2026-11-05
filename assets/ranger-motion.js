const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const background = document.body;
const spotlight = background.classList.contains('welcome-page');
let frame = 0;

function resetBackground() {
  cancelAnimationFrame(frame);
  background.style.removeProperty('--ranger-x');
  background.style.removeProperty('--ranger-y');
}

window.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse' || reducedMotion.matches) return;

  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const x = spotlight ? event.clientX : (event.clientX / innerWidth - 0.5) * 48;
    const y = spotlight ? event.clientY : (event.clientY / innerHeight - 0.5) * 36;
    background.style.setProperty('--ranger-x', x + 'px');
    background.style.setProperty('--ranger-y', y + 'px');
  });
}, { passive: true });

document.documentElement.addEventListener('pointerleave', resetBackground);
window.addEventListener('blur', resetBackground);
reducedMotion.addEventListener('change', resetBackground);

if (document.querySelector('.welcome') && location.hash) {
  location.replace('portfolio.html' + location.hash);
}
