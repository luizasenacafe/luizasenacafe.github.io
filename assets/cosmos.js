// Portfólio de Luiza Sena: fundo de partículas e efeitos ligados à rolagem.
//
// A ideia central: um único conjunto de pontos em WebGL (sem bibliotecas) que
// assume uma forma por capítulo da página. Ao rolar, os pontos migram de uma
// forma para a seguinte; o cursor gira a cena, empurra os pontos próximos e um
// clique dispara uma onda. Tudo o mais (cor de destaque, leitura no rodapé,
// trilho lateral) acompanha o mesmo "índice de capítulo".
(() => {
  'use strict';

  const root = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('js');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Um capítulo por <section class="chapter">, na mesma ordem do HTML.
  // color: cor de destaque, seguindo a sequência de temperatura das estrelas
  //        (de uma supergigante vermelha até o azul das mais quentes).
  // tilt:  inclinação da forma (0 = vista de perfil, 1.57 = vista de cima).
  // rip:   intensidade da ondulação animada. off: deslocamento lateral em telas largas.
  const CHAPTERS = [
    { shape: 'star',   color: [255, 107, 61],  tilt: 0.15, rip: 0,    scale: 1.0,  off: 0.42 },
    { shape: 'galaxy', color: [255, 168, 96],  tilt: 0.95, rip: 0,    scale: 1.0,  off: -0.44 },
    { shape: 'well',   color: [255, 226, 160], tilt: 0.62, rip: 0.3,  scale: 0.98, off: 0 },
    { shape: 'knot',   color: [244, 240, 255], tilt: 0.3,  rip: 0,    scale: 0.95, off: 0.3 },
    { shape: 'helix',  color: [178, 204, 255], tilt: 0.1,  rip: 0,    scale: 1.0,  off: 0.56 },
    { shape: 'wave',   color: [132, 164, 255], tilt: 0.42, rip: 1,    scale: 1.2,  off: 0 },
    { shape: 'hole',   color: [150, 140, 255], tilt: 0.3,  rip: 0,    scale: 1.05, off: 0.4 },
  ];
  const chapters = $$('.chapter');
  const LAST = CHAPTERS.length - 1;

  // ------------------------------------------------------------------ formas
  // Gerador determinístico: a mesma nuvem a cada visita.
  let seed = 20261115;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;
  const onSphere = (r) => {
    const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    return [r * s * Math.cos(a), r * u, r * s * Math.sin(a)];
  };

  const SHAPES = {
    // nuvem dispersa de onde tudo parte na abertura
    cloud: () => onSphere(2.2 + rnd() * 2.6),
    // estrela: superfície granulada e uma coroa rarefeita
    star: () => {
      const k = rnd();
      if (k < 0.3) return onSphere(Math.pow(rnd(), 0.6) * 0.86);          // interior denso: o brilho do núcleo
      if (k < 0.74) return onSphere(0.9 + gauss() * 0.02);               // superfície
      return onSphere(0.92 - Math.log(1 - rnd() * 0.97) * 0.17);         // coroa
    },
    // galáxia espiral de três braços com núcleo
    galaxy: () => {
      if (rnd() < 0.16) { const p = onSphere(rnd() * rnd() * 0.3); p[1] *= 0.6; return p; }
      const r = Math.pow(rnd(), 0.65) * 1.6;
      const a = Math.floor(rnd() * 3) * (Math.PI * 2 / 3) + r * 2.7 + gauss() * 0.34;
      return [r * Math.cos(a), gauss() * 0.07 * (1.3 - r / 1.6), r * Math.sin(a)];
    },
    // malha do espaço-tempo afundada por uma massa no centro
    well: (i, n) => {
      const g = Math.floor(Math.sqrt(n));
      const k = i < g * g ? i : Math.floor(rnd() * g * g);
      const x = ((k % g) / (g - 1)) * 3.6 - 1.8, z = (Math.floor(k / g) / (g - 1)) * 3.6 - 1.8;
      return [x, 0.4 - 0.95 / (1 + (x * x + z * z) * 3.2), z];
    },
    // nó de trevo: um único laço que se cruza três vezes
    knot: () => {
      const t = rnd() * Math.PI * 2, r = 0.4 * (2 + Math.cos(3 * t));
      return [r * Math.cos(2 * t) + gauss() * 0.07, r * Math.sin(2 * t) + gauss() * 0.07, -0.52 * Math.sin(3 * t) + gauss() * 0.07];
    },
    // dupla hélice vertical com degraus
    helix: (i) => {
      const t = rnd(), a = t * Math.PI * 5.5, y = (t - 0.5) * 3.4;
      if (rnd() < 0.22) { const k = rnd() * 2 - 1; return [Math.cos(a) * 0.55 * k, Math.round(y * 9) / 9, Math.sin(a) * 0.55 * k]; }
      const s = i % 2 ? Math.PI : 0;
      return [Math.cos(a + s) * 0.55 + gauss() * 0.02, y, Math.sin(a + s) * 0.55 + gauss() * 0.02];
    },
    // disco plano: a ondulação vem do shader
    wave: () => {
      const r = Math.sqrt(rnd()) * 1.8, a = rnd() * Math.PI * 2;
      return [r * Math.cos(a), 0, r * Math.sin(a)];
    },
    // buraco negro: disco de acreção e uma esfera de fótons ao redor do vazio
    hole: () => {
      if (rnd() < 0.3) return onSphere(0.46 + gauss() * 0.006);
      const r = 0.7 + Math.pow(rnd(), 1.8) * 1.1, a = rnd() * Math.PI * 2;
      return [r * Math.cos(a), gauss() * 0.012, r * Math.sin(a)];
    },
  };

  // ------------------------------------------------------------------ WebGL
  const canvas = $('#cosmos');
  const small = Math.min(innerWidth, innerHeight) < 700;
  const COUNT = small ? 7000 : 17000;
  let gl = null, uniforms = {}, buffers = {}, attribs = {};

  const VERT = `
    attribute vec3 aA; attribute vec3 aB; attribute vec4 aR;
    uniform float uMix, uTime, uAspect, uPx, uScale, uRip, uVel, uPulseT, uDim;
    uniform vec2 uRot, uMouse, uOff, uPulse;
    uniform vec3 uColA, uColB;
    varying vec3 vCol; varying float vA;
    void main() {
      // cada ponto parte num instante ligeiramente diferente: a transição "escorre"
      float m = smoothstep(0., 1., clamp(uMix * 1.6 - aR.x * .6, 0., 1.));
      vec3 dir = normalize(aR.yzw - .5 + 1e-4);
      vec3 p = mix(aA, aB, m);
      p += dir * sin(m * 3.14159) * (.3 + aR.x * .6);            // explode no meio do caminho
      p.y += sin(length(p.xz) * 7. - uTime * 1.6) * .07 * uRip;  // ondulação
      p += dir * sin(uTime * .7 + aR.x * 40.) * .012;            // respiração
      float cy = cos(uRot.x), sy = sin(uRot.x), cx = cos(uRot.y), sx = sin(uRot.y);
      p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
      p = vec3(p.x, cx * p.y - sx * p.z, sx * p.y + cx * p.z);
      p *= uScale;
      float z = 3.4 - p.z;
      vec2 s = p.xy * (2.2 / z);
      s.x /= uAspect;
      s += uOff;
      vec2 asp = vec2(uAspect, 1.);
      vec2 d = (s - uMouse) * asp;                                 // o cursor afasta os pontos
      s += normalize(d + 1e-5) / asp * .15 * exp(-dot(d, d) * 13.);
      vec2 dp = (s - uPulse) * asp;                                // onda de choque do clique
      float w = exp(-pow((length(dp) - uPulseT * 1.5) * 7., 2.)) * max(0., 1. - uPulseT);
      s += normalize(dp + 1e-5) / asp * .1 * w;
      gl_Position = vec4(s, 0., 1.);
      gl_PointSize = uPx * (1.5 + aR.w * 3.) * (2.7 / z) * (1. + uVel * 1.4 + w * 2.5);
      float tw = .62 + .38 * sin(uTime * (1. + aR.y * 2.) + aR.z * 50.);
      vCol = mix(mix(uColA, uColB, m), vec3(1.), aR.z * aR.z * .5);
      vA = tw * (.7 + .6 * smoothstep(4.8, 2.4, z)) * uDim;
    }`;
  const FRAG = `
    precision mediump float;
    varying vec3 vCol; varying float vA;
    void main() {
      float a = smoothstep(.5, 0., length(gl_PointCoord - .5));
      gl_FragColor = vec4(vCol * a * a * vA, 1.);
    }`;

  function initGL() {
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
    } catch { gl = null; }
    if (!gl) { root.classList.add('no-gl'); return; }

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    let program;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    } catch (err) {
      console.warn('Fundo animado indisponível:', err);
      gl = null;
      root.classList.add('no-gl');
      return;
    }
    gl.useProgram(program);

    const makeBuffer = (data) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return b;
    };
    for (const name of Object.keys(SHAPES)) {
      const data = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) data.set(SHAPES[name](i, COUNT), i * 3);
      buffers[name] = makeBuffer(data);
    }
    const random = new Float32Array(COUNT * 4);
    for (let i = 0; i < random.length; i++) random[i] = rnd();
    buffers.random = makeBuffer(random);

    for (const a of ['aA', 'aB', 'aR']) { attribs[a] = gl.getAttribLocation(program, a); gl.enableVertexAttribArray(attribs[a]); }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.random);
    gl.vertexAttribPointer(attribs.aR, 4, gl.FLOAT, false, 0, 0);
    for (const u of ['uMix', 'uTime', 'uAspect', 'uPx', 'uScale', 'uRip', 'uVel', 'uPulseT', 'uDim', 'uRot', 'uMouse', 'uOff', 'uPulse', 'uColA', 'uColB']) {
      uniforms[u] = gl.getUniformLocation(program, u);
    }
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(4 / 255, 5 / 255, 10 / 255, 1);
  }

  let dpr = 1, vw = innerWidth, vh = innerHeight;
  function resizeGL() {
    vw = innerWidth; vh = innerHeight;
    if (!gl) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // ------------------------------------------------------------------ estado
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };       // de -1 a 1, y para cima
  const pulse = { x: 0, y: 0, t0: -10 };
  let scrollSmooth = scrollY, velocity = 0;
  let introStart = null;
  let tops = [];                                      // topo de cada capítulo, em px
  let active = -1, lastAccent = '';

  function measure() {
    tops = chapters.map((c) => c.getBoundingClientRect().top + scrollY);
    sizeHScroll();
  }

  // Índice contínuo de capítulo: 0 no primeiro, 1 no segundo... A passagem
  // acontece numa faixa em torno de cada fronteira, não ao longo da seção inteira.
  function chapterIndex(y) {
    let f = 0;
    const centre = y + vh / 2;
    for (let i = 1; i < tops.length; i++) f += ease(clamp((centre - (tops[i] - vh * 0.45)) / (vh * 0.75)));
    return clamp(f, 0, LAST);
  }

  // ------------------------------------------------------------------ interface
  const hudN = $('#hud-n'), hudName = $('#hud-name'), hudData = $('#hud-data');
  const rail = $('.rail');
  chapters.forEach((c) => {
    const a = document.createElement('a');
    a.href = '#' + c.id;
    a.innerHTML = `<span>${c.dataset.name}</span>`;
    a.setAttribute('aria-label', c.dataset.name);
    rail.append(a);
  });
  const railLinks = $$('a', rail);

  // letras embaralhadas que se assentam no nome do capítulo
  let scrambleTimer = 0;
  function scramble(el, text) {
    if (still) { el.textContent = text; return; }
    const glyphs = '∆∇∫∑πλψΩ01<>/';
    let step = 0;
    clearInterval(scrambleTimer);
    scrambleTimer = setInterval(() => {
      step++;
      el.textContent = [...text].map((ch, i) => (i < step / 2 ? ch : glyphs[Math.floor(Math.random() * glyphs.length)])).join('');
      if (step / 2 >= text.length) { clearInterval(scrambleTimer); el.textContent = text; }
    }, 28);
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    hudN.textContent = i + 1;
    scramble(hudName, chapters[i].dataset.name);
    railLinks.forEach((a, k) => a.classList.toggle('active', k === i));
  }

  // parágrafo que se acende palavra a palavra com a rolagem
  const wordBlocks = $$('[data-words]').map((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    return { el, spans: $$('.w', el), shown: -1 };
  });

  const timeline = $('.timeline');
  const timelineItems = timeline ? $$('li', timeline) : [];
  const hero = $('.hero');

  // seção de projetos: rolagem vertical convertida em movimento lateral
  const hscroll = $('.hscroll'), track = $('.hscroll-track');
  let hsDistance = 0, hsX = 0;
  function sizeHScroll() {
    if (!hscroll) return;
    const pin = !still && innerWidth > 760 && innerHeight > 640;
    hscroll.classList.toggle('hs-pin', pin);
    const hint = $('.panel-hint');
    if (hint) hint.textContent = pin ? 'Continue rolando: as missões passam de lado.' : 'Deslize para o lado para ver as missões.';
    if (!pin) { hscroll.style.height = ''; track.style.transform = ''; hsDistance = 0; return; }
    hsDistance = Math.max(0, track.scrollWidth - innerWidth);
    hscroll.style.height = innerHeight + hsDistance + 'px';
  }

  function scrollEffects() {
    root.style.setProperty('--prog', clamp(scrollY / Math.max(1, root.scrollHeight - vh)).toFixed(4));
    hero.style.setProperty('--hp', clamp(scrollSmooth / vh).toFixed(4));

    for (const block of wordBlocks) {
      const r = block.el.getBoundingClientRect();
      const p = clamp((vh * 0.88 - r.top) / (vh * 0.5 + r.height));
      const n = Math.round(p * block.spans.length);
      if (n !== block.shown) { block.shown = n; block.spans.forEach((s, i) => s.classList.toggle('on', i < n)); }
    }

    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const p = clamp((vh * 0.62 - r.top) / r.height);
      timeline.style.setProperty('--tp', p.toFixed(4));
      const lineY = r.top + r.height * p;
      timelineItems.forEach((li) => li.classList.toggle('lit', li.getBoundingClientRect().top <= lineY + 4));
    }

    if (hsDistance > 0) {
      const p = clamp(-hscroll.getBoundingClientRect().top / hsDistance);
      hsX = lerp(hsX, -p * hsDistance, 0.16);
      track.style.transform = `translate3d(${hsX.toFixed(1)}px,0,0)`;
    }
  }

  // ------------------------------------------------------------------ quadro a quadro
  function frame(ms) {
    const time = still ? 0 : ms / 1000;
    const target = scrollY;
    const before = scrollSmooth;
    scrollSmooth = still ? target : lerp(scrollSmooth, target, 0.13);
    if (Math.abs(target - scrollSmooth) < 0.05) scrollSmooth = target;
    velocity = lerp(velocity, clamp(Math.abs(scrollSmooth - before) / 70), 0.18);
    mouse.x = lerp(mouse.x, mouse.tx, still ? 1 : 0.07);
    mouse.y = lerp(mouse.y, mouse.ty, still ? 1 : 0.07);

    const f = chapterIndex(scrollSmooth);
    const i = Math.min(Math.floor(f), LAST - 1);
    const mix = f - i;
    const A = CHAPTERS[i], B = CHAPTERS[i + 1];
    const col = A.color.map((c, k) => Math.round(lerp(c, B.color[k], mix)));
    const accent = `rgb(${col[0]} ${col[1]} ${col[2]})`;
    if (accent !== lastAccent) { lastAccent = accent; root.style.setProperty('--accent', accent); }
    setActive(Math.round(f));

    root.style.setProperty('--mx', mouse.x.toFixed(3));
    root.style.setProperty('--my', (-mouse.y).toFixed(3));
    hudData.textContent = `x ${mouse.x >= 0 ? '+' : ''}${mouse.x.toFixed(2)}  y ${mouse.y >= 0 ? '+' : ''}${mouse.y.toFixed(2)}`;
    scrollEffects();

    if (gl) {
      // abertura: os pontos convergem de uma nuvem dispersa para a estrela
      if (introStart === null) introStart = ms;
      const intro = still ? 1 : clamp((ms - introStart) / 2600);
      let from = A.shape, to = B.shape, m = mix;
      if (intro < 1 && f < 0.5) { from = 'cloud'; to = A.shape; m = ease(intro); }

      gl.bindBuffer(gl.ARRAY_BUFFER, buffers[from]);
      gl.vertexAttribPointer(attribs.aA, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers[to]);
      gl.vertexAttribPointer(attribs.aB, 3, gl.FLOAT, false, 0, 0);

      const wide = vw > 900;
      gl.uniform1f(uniforms.uMix, m);
      gl.uniform1f(uniforms.uTime, time);
      gl.uniform1f(uniforms.uAspect, vw / vh);
      gl.uniform1f(uniforms.uPx, dpr * (vw < 700 ? 0.8 : 1));
      gl.uniform1f(uniforms.uScale, lerp(A.scale, B.scale, mix) * (wide ? 1 : 0.78));
      gl.uniform1f(uniforms.uRip, lerp(A.rip, B.rip, mix));
      gl.uniform1f(uniforms.uVel, velocity);
      gl.uniform1f(uniforms.uPulseT, clamp((ms - pulse.t0) / 1400));
      gl.uniform1f(uniforms.uDim, wide ? 1 : 0.9);
      gl.uniform2f(uniforms.uRot, time * 0.06 + scrollSmooth * 0.0007 + mouse.x * 0.55, lerp(A.tilt, B.tilt, mix) - mouse.y * 0.28);
      gl.uniform2f(uniforms.uMouse, mouse.x, mouse.y);
      gl.uniform2f(uniforms.uOff, wide ? lerp(A.off, B.off, mix) : 0, wide ? 0 : 0.12);
      gl.uniform2f(uniforms.uPulse, pulse.x, pulse.y);
      gl.uniform3f(uniforms.uColA, A.color[0] / 255, A.color[1] / 255, A.color[2] / 255);
      gl.uniform3f(uniforms.uColB, B.color[0] / 255, B.color[1] / 255, B.color[2] / 255);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, COUNT);
    }
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ entradas
  addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / vw) * 2 - 1;
    mouse.ty = -((e.clientY / vh) * 2 - 1);
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    if (still) return;
    pulse.x = (e.clientX / vw) * 2 - 1;
    pulse.y = -((e.clientY / vh) * 2 - 1);
    pulse.t0 = performance.now();
  }, { passive: true });

  if (finePointer && !still) {
    root.classList.add('has-cursor');
    const cursor = $('.cursor'), dot = $('i', cursor), ring = $('b', cursor);
    let cx = vw / 2, cy = vh / 2, rx = cx, ry = cy;
    addEventListener('pointermove', (e) => {
      cx = e.clientX; cy = e.clientY;
      dot.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      cursor.classList.toggle('on-link', !!e.target.closest('a, button'));
    }, { passive: true });
    (function follow() {
      rx = lerp(rx, cx, 0.18); ry = lerp(ry, cy, 0.18);
      ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`;
      requestAnimationFrame(follow);
    })();

    // cartões que se inclinam na direção do cursor
    $$('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--rx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        el.style.setProperty('--ry', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', 0); el.style.setProperty('--ry', 0); });
    });
  }

  // entrada dos blocos ao aparecerem na tela
  const revealables = $$('.rv');
  if ('IntersectionObserver' in window && !still) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    }, { rootMargin: '0px 0px -10% 0px' });
    revealables.forEach((el) => io.observe(el));
    $$('.panel-intro .display').forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add('in'));
    $$('.display').forEach((el) => el.classList.add('in'));
  }

  // menu no celular
  const menuButton = $('.menu-toggle'), menu = $('#menu');
  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.textContent = open ? 'Fechar' : 'Menu';
  };
  menuButton.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // copiar e-mail
  $('#copy-email').addEventListener('click', async () => {
    const status = $('#copy-status');
    try {
      await navigator.clipboard.writeText('luiizan12@gmail.com');
      status.textContent = 'E-mail copiado. Próxima missão: sua mensagem.';
    } catch {
      status.textContent = 'Seu navegador não permitiu copiar. E-mail: luiizan12@gmail.com';
    }
  });

  // ------------------------------------------------------------------ partida
  initGL();
  resizeGL();
  measure();
  addEventListener('resize', () => { resizeGL(); measure(); });
  addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  requestAnimationFrame(frame);
})();
