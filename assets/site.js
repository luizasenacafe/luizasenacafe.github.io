// Comportamento das duas páginas (boas-vindas e portfólio). Cada bloco só roda
// se os elementos dele existirem, então o mesmo arquivo serve para ambas.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.documentElement.classList.add('js');

// Boas-vindas: quem chega com âncora (ex.: /#projetos) vai direto ao portfólio.
if (document.querySelector('.welcome') && location.hash) {
  location.replace('portfolio.html' + location.hash);
}

// Lanterna do cursor na página de boas-vindas.
const backdrop = document.querySelector('.backdrop');
if (backdrop) {
  let frame = 0;
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      backdrop.style.setProperty('--mx', event.clientX + 'px');
      backdrop.style.setProperty('--my', event.clientY + 'px');
    });
  }, { passive: true });
}

// Menu de celular.
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('nav');
if (menu && nav) {
  const setOpen = (open) => {
    menu.setAttribute('aria-expanded', String(open));
    menu.textContent = open ? 'Fechar −' : 'Menu ＋';
    nav.classList.toggle('open', open);
  };
  menu.addEventListener('click', () => setOpen(menu.getAttribute('aria-expanded') !== 'true'));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
}

// Filtros de projetos.
const filters = document.querySelectorAll('[data-filter]');
filters.forEach((button) => button.addEventListener('click', () => {
  filters.forEach((b) => {
    b.classList.toggle('active', b === button);
    b.setAttribute('aria-pressed', String(b === button));
  });
  let count = 0;
  document.querySelectorAll('[data-category]').forEach((card) => {
    card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;
    if (!card.hidden) count++;
  });
  document.getElementById('filter-status').textContent = `${count} ${count === 1 ? 'projeto exibido' : 'projetos exibidos'}`;
}));

// Modo eclipse total.
const eclipse = document.getElementById('eclipse-toggle');
if (eclipse) {
  eclipse.addEventListener('click', () => {
    const on = document.body.classList.toggle('eclipse');
    eclipse.setAttribute('aria-pressed', String(on));
    eclipse.textContent = on ? '◆ ECLIPSE TOTAL ATIVO · DESATIVAR' : '◇ ATIVAR ECLIPSE TOTAL';
  });
}

// Copiar e-mail.
const copy = document.getElementById('copy-email');
if (copy) {
  copy.addEventListener('click', async () => {
    const status = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText('luiizan12@gmail.com');
      status.textContent = 'E-mail copiado. Próxima missão: sua mensagem.';
    } catch {
      status.textContent = 'Seu navegador não permitiu copiar. E-mail: luiizan12@gmail.com';
    }
  });
}

// Entrada suave das seções ao rolar.
const targets = document.querySelectorAll('.reveal');
if (targets.length) {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => observer.observe(el));
  }
}
