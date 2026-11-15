// Portfólio de Luiza Sena: céu, figuras de partículas, seleção de fase, efeitos e jogo.
//
// Um canvas WebGL fixo (sem bibliotecas) desenha três camadas, de trás para a frente:
//   1. nebulosa: nuvens de gás e a faixa da Via Láctea, geradas uma vez numa textura;
//   2. estrelas de fundo: milhares de pontos em profundidades diferentes;
//   3. a figura: uma nuvem de partículas que assume uma forma da ciência por fase.
// Por cima, o HTML: o sistema solar que serve de seleção de fase, as seções e, no fim,
// um jogo de corrida desenhado num segundo canvas (2D).
//
// Quase tudo acompanha um mesmo número, o "índice de fase" (0 na primeira, 1 na
// segunda...), calculado a partir da rolagem suavizada. Ele escolhe as duas figuras
// entre as quais as partículas estão, a cor de destaque e a leitura do rodapé.
//
// O mesmo arquivo serve a página inicial (uma figura só) e o portfólio.
(() => {
  'use strict';

  const root = document.documentElement;
  const page = document.body.dataset.page || 'portfolio';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('js');

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const TAU = Math.PI * 2;

  // Uma entrada por <section class="chapter">, na mesma ordem do HTML.
  // shape:  figura de partículas.  color: cor de destaque (a do planeta da fase).
  // color2: segunda cor da nebulosa.  tilt: inclinação (0 de perfil, 1.57 de cima).
  // rip: ondulação animada.  off / y: posição na tela (frações; off só em telas largas).
  // dim: brilho da figura (menor onde o texto passa por cima dela).
  const CHAPTERS = page === 'welcome'
    ? [{ shape: 'planet', color: [255, 198, 140], color2: [46, 76, 242], tilt: 0.36, rip: 0, scale: 1.0, off: 0.4 }]
    : [
      { shape: 'star',      color: [255, 176, 72],  color2: [255, 70, 40],   tilt: 0.2,  rip: 0,    scale: 0.26, off: 0, y: 0, ySmall: -0.12 },   // Sol: seleção
      { shape: 'galaxy',    color: [226, 200, 172], color2: [120, 80, 210],  tilt: 0.95, rip: 0,    scale: 1.0,  off: -0.44 },                    // Mercúrio: Sobre
      { shape: 'well',      color: [255, 206, 112], color2: [210, 70, 50],   tilt: 0.6,  rip: 0.12, scale: 0.98, off: 0, dim: 0.5 },              // Vênus: Habilidades
      { shape: 'atom',      color: [96, 190, 255],  color2: [30, 200, 140],  tilt: 0.3,  rip: 0,    scale: 0.95, off: 0.3, dim: 0.7 },            // Terra: Projetos
      { shape: 'helix',     color: [255, 112, 72],  color2: [170, 40, 100],  tilt: 0.1,  rip: 0,    scale: 1.0,  off: 0.52 },                     // Marte: Experiência
      { shape: 'lorenz',    color: [255, 170, 110], color2: [90, 60, 220],   tilt: 0.25, rip: 0,    scale: 1.05, off: -0.46 },                    // Júpiter: Cursos
      { shape: 'tesseract', color: [240, 214, 150], color2: [50, 130, 210],  tilt: 0.3,  rip: 0,    scale: 1.0,  off: 0.5 },                      // Saturno: Certificados
      { shape: 'wave',      color: [120, 235, 225], color2: [40, 80, 230],   tilt: 0.5,  rip: 1,    scale: 1.2,  off: 0, dim: 0.55 },             // Urano: YouTube
      { shape: 'hole',      color: [124, 140, 255], color2: [180, 60, 230],  tilt: 0.3,  rip: 0,    scale: 1.0,  off: 0.42 },                     // Netuno: Contato
      { shape: 'hole',      color: [255, 84, 196],  color2: [70, 40, 240],   tilt: 0.22, rip: 0,    scale: 0.3,  off: 0, y: 0.1, game: true },    // Plutão: o jogo, com o buraco negro no horizonte
    ];
  const chapters = $$('.chapter');
  const LAST = CHAPTERS.length - 1;
  const GAME = CHAPTERS.findIndex((c) => c.game);

  // ================================================================== formas
  // Gerador determinístico: o mesmo céu e as mesmas figuras a cada visita.
  let seed = 20261115;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;
  const onSphere = (r) => {
    const u = rnd() * 2 - 1, a = rnd() * TAU, s = Math.sqrt(1 - u * u);
    return [r * s * Math.cos(a), r * u, r * s * Math.sin(a)];
  };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
  const jitter = (p, k) => [p[0] + gauss() * k, p[1] + gauss() * k, p[2] + gauss() * k];

  // Cada fábrica prepara os detalhes fixos da figura e devolve a função que sorteia um ponto.
  const SHAPES = {
    // nuvem dispersa de onde tudo parte na abertura
    cloud: () => () => onSphere(2.2 + rnd() * 2.6),

    // planeta gasoso: faixas de nuvens, anéis com divisões e duas luas
    planet: () => () => {
      const k = rnd();
      if (k < 0.36) {
        let u;
        do { u = rnd() * 2 - 1; } while (rnd() > 0.5 + 0.5 * Math.sin(u * 17));   // faixas por latitude
        const a = rnd() * TAU, s = Math.sqrt(1 - u * u);
        return [0.62 * s * Math.cos(a), 0.57 * u, 0.62 * s * Math.sin(a)];
      }
      if (k < 0.93) {
        let r, d;
        do {
          r = 0.82 + rnd() * 0.78;
          d = r < 0.94 ? 0.3 : r < 1.16 ? 1 : r < 1.22 ? 0.03 : r < 1.46 ? 0.75 : r < 1.49 ? 0.05 : 0.35;   // anéis C, B, divisão de Cassini, A, Encke, F
          d *= 0.7 + 0.3 * Math.sin(r * 90);                                                                 // sulcos finos
        } while (rnd() > d);
        const a = rnd() * TAU;
        return [r * Math.cos(a), gauss() * 0.004, r * Math.sin(a)];
      }
      return k < 0.975 ? add(onSphere(0.07), [1.86, 0.1, 0.42]) : add(onSphere(0.045), [-1.25, 0.3, -1.4]);
    },

    // estrela: núcleo denso, superfície granulada, proeminências em arco e jatos da coroa
    star: () => {
      const loops = Array.from({ length: 7 }, () => {
        const a = onSphere(1);
        return { a, t: unit(cross(a, onSphere(1))), h: 0.1 + rnd() * 0.16, w: 0.09 + rnd() * 0.11 };
      });
      const streamers = Array.from({ length: 12 }, () => onSphere(1));
      return () => {
        const k = rnd();
        if (k < 0.2) return onSphere(Math.pow(rnd(), 0.6) * 0.84);
        if (k < 0.6) {
          const p = onSphere(1);
          return mul(p, 0.9 + 0.035 * Math.sin(p[0] * 13) * Math.sin(p[1] * 11 + 1) * Math.sin(p[2] * 12 + 2));
        }
        if (k < 0.76) {
          const l = loops[Math.floor(rnd() * loops.length)], u = rnd() * Math.PI;
          return jitter(add(mul(l.a, 0.89 + l.h * Math.sin(u)), mul(l.t, l.w * Math.cos(u))), 0.012);
        }
        if (k < 0.9) return unit(jitter(streamers[Math.floor(rnd() * streamers.length)], 0.16)).map((v) => v * (0.92 + Math.pow(rnd(), 1.7) * 0.6));
        return onSphere(0.92 - Math.log(1 - rnd() * 0.97) * 0.17);
      };
    },

    // galáxia espiral barrada: bojo, barra, dois braços com ramificações e halo
    galaxy: () => () => {
      const k = rnd();
      if (k < 0.12) { const p = onSphere(rnd() * rnd() * 0.32); p[1] *= 0.7; return p; }
      if (k < 0.2) return [gauss() * 0.36, gauss() * 0.035, gauss() * 0.07];
      if (k < 0.93) {
        const r = 0.32 + Math.pow(rnd(), 0.8) * 1.35;
        const spread = rnd() < 0.2 ? 0.9 : 0.2 * (0.6 + r * 0.4);
        const a = Math.floor(rnd() * 2) * Math.PI + (r - 0.32) * 2.7 + gauss() * spread;
        return [r * Math.cos(a), gauss() * 0.05 * (1.25 - r / 1.7), r * Math.sin(a)];
      }
      return onSphere(0.5 + rnd() * 1.5);
    },

    // espaço-tempo: malha em linhas afundada por uma massa, com um corpo em órbita
    well: () => {
      const dip = (x, z) => 0.4 - 0.95 / (1 + (x * x + z * z) * 3.2);
      const LINES = 25;
      return () => {
        const k = rnd();
        if (k < 0.07) return add(onSphere(0.13), [0, -0.44, 0]);                       // a massa no fundo do poço
        if (k < 0.12) { const a = rnd() * TAU; return [Math.cos(a) * 1.02, dip(1.02, 0) + 0.02, Math.sin(a) * 1.02]; }   // órbita
        if (k < 0.145) return add(onSphere(0.045), [1.02 * Math.cos(0.9), dip(1.02, 0) + 0.05, 1.02 * Math.sin(0.9)]);
        const fixed = (Math.floor(rnd() * LINES) / (LINES - 1)) * 3.6 - 1.8, free = rnd() * 3.6 - 1.8;
        const [x, z] = rnd() < 0.5 ? [fixed, free] : [free, fixed];
        return [x, dip(x, z), z];
      };
    },

    // átomo: núcleo de prótons e nêutrons, três órbitas inclinadas e um elétron em cada
    atom: () => {
      const nucleons = Array.from({ length: 14 }, () => onSphere(Math.cbrt(rnd()) * 0.13));
      const orbits = [[0, 0], [1.05, 0.5], [-1.05, 0.5]].map(([rx, rz], i) => ({ rx, rz, e: 0.6 + i * 2.1 }));
      const place = (o, a, r) => {
        let p = [Math.cos(a) * r, 0, Math.sin(a) * r];
        p = [p[0], p[1] * Math.cos(o.rx) - p[2] * Math.sin(o.rx), p[1] * Math.sin(o.rx) + p[2] * Math.cos(o.rx)];
        return [p[0] * Math.cos(o.rz) - p[1] * Math.sin(o.rz), p[0] * Math.sin(o.rz) + p[1] * Math.cos(o.rz), p[2]];
      };
      return () => {
        const k = rnd();
        if (k < 0.2) return add(nucleons[Math.floor(rnd() * nucleons.length)], onSphere(0.06));
        const o = orbits[Math.floor(rnd() * 3)];
        if (k < 0.36) return add(place(o, o.e, 1.18), onSphere(Math.cbrt(rnd()) * 0.055));   // elétron
        if (k < 0.5) return jitter(place(o, o.e - rnd() * rnd() * 1.6, 1.18), 0.012);       // rastro do elétron
        return jitter(place(o, rnd() * TAU, 1.18), 0.007);
      };
    },

    // DNA: duas fitas com sulco maior e menor, e pares de bases com o vão das pontes de hidrogênio
    helix: () => () => {
      const TURNS = 2.8, R = 0.56, GROOVE = 2.25;
      const t = rnd(), y = (t - 0.5) * 3.5;
      if (rnd() < 0.42) {
        const step = Math.round(t * TURNS * 10) / (TURNS * 10), a = step * TURNS * TAU;   // dez pares por volta
        const A = [Math.cos(a) * R, 0, Math.sin(a) * R], B = [Math.cos(a + GROOVE) * R, 0, Math.sin(a + GROOVE) * R];
        let u = rnd();
        if (u > 0.46 && u < 0.54) u = u < 0.5 ? 0.46 : 0.54;
        return [lerp(A[0], B[0], u), (step - 0.5) * 3.5 + gauss() * 0.006, lerp(A[2], B[2], u)];
      }
      const a = t * TURNS * TAU + (rnd() < 0.5 ? 0 : GROOVE);
      return [Math.cos(a) * R + gauss() * 0.022, y + gauss() * 0.022, Math.sin(a) * R + gauss() * 0.022];
    },

    // atrator de Lorenz: a trajetória de um sistema caótico (as equações aparecem na seção)
    lorenz: () => {
      const path = [];
      let x = 0.1, y = 0, z = 0;
      const dt = 0.006;
      for (let i = 0; i < 9400; i++) {
        const dx = 10 * (y - x), dy = x * (28 - z) - y, dz = x * y - (8 / 3) * z;
        x += dx * dt; y += dy * dt; z += dz * dt;
        if (i > 400) path.push([x / 19, (z - 25) / 19, y / 23]);
      }
      return () => jitter(path[Math.floor(rnd() * path.length)], 0.005);
    },

    // tesserato: as 32 arestas de um cubo de quatro dimensões, projetadas em três
    tesseract: () => {
      const V = Array.from({ length: 16 }, (_, i) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
      const E = [];
      for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) { const j = i ^ (1 << b); if (j > i) E.push([i, j]); }
      const ca = Math.cos(0.5), sa = Math.sin(0.5), cb = Math.cos(0.35), sb = Math.sin(0.35);
      const project = ([x, y, z, w]) => {
        [x, w] = [x * ca - w * sa, x * sa + w * ca];      // giro num plano que só existe em 4D
        [y, z] = [y * cb - z * sb, y * sb + z * cb];
        const k = 0.62 / (1.75 - w * 0.6);                // perspectiva na quarta dimensão
        return [x * k, y * k, z * k];
      };
      return () => {
        if (rnd() < 0.2) return add(project(V[Math.floor(rnd() * 16)]), onSphere(Math.cbrt(rnd()) * 0.04));
        const [a, b] = E[Math.floor(rnd() * E.length)], t = rnd();
        return jitter(project(V[a].map((v, i) => lerp(v, V[b][i], t))), 0.004);
      };
    },

    // duas fontes numa superfície plana: a interferência é desenhada pelo shader
    wave: () => () => {
      const k = rnd();
      if (k < 0.05) return add(onSphere(0.05), [k < 0.025 ? -0.45 : 0.45, 0.05, 0]);
      const r = Math.sqrt(rnd()) * 1.8, a = rnd() * TAU;
      return [r * Math.cos(a), 0, r * Math.sin(a)];
    },

    // buraco negro: esfera de fótons, anel interno quente, disco de acreção em espiral e dois jatos
    hole: () => () => {
      const k = rnd();
      if (k < 0.2) return onSphere(0.46 + gauss() * 0.006);
      if (k < 0.27) { const a = rnd() * TAU, r = 0.6 + gauss() * 0.012; return [r * Math.cos(a), gauss() * 0.006, r * Math.sin(a)]; }
      if (k < 0.82) {
        const r = 0.68 + Math.pow(rnd(), 1.6) * 1.15;
        const a = Math.floor(rnd() * 2) * Math.PI + r * 3.3 + gauss() * 0.6;
        return [r * Math.cos(a), gauss() * 0.01 * (1 + r), r * Math.sin(a)];
      }
      const h = 0.5 + Math.pow(rnd(), 0.75) * 2.0, r = (0.02 + h * 0.06) * Math.sqrt(rnd()), a = rnd() * TAU;
      return [r * Math.cos(a), (k < 0.91 ? 1 : -1) * h, r * Math.sin(a)];
    },
  };

  // ================================================================== WebGL
  const canvas = $('#cosmos');
  const small = Math.min(innerWidth, innerHeight) < 700;
  const COUNT = small ? 10000 : 26000;       // partículas da figura
  const STARS = small ? 1600 : 3400;         // estrelas de fundo
  let gl = null;
  const prog = {}, buffers = {};
  let nebulaTexture = null, nebulaFbo = null;

  // nebulosa: gerada uma única vez (ruído fractal é caro para repetir a cada quadro)
  const QUAD_VERT = `attribute vec2 aQ; varying vec2 vUv; void main() { vUv = aQ * .5 + .5; gl_Position = vec4(aQ, 0., 1.); }`;
  const HIGHP = `#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n`;
  const NEBULA_GEN = HIGHP + `
    varying vec2 vUv; uniform float uAspect;
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
    }
    float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + 17.; a *= .5; } return v; }
    void main() {
      vec2 p = vUv * vec2(uAspect, 1.) * 2.6;
      vec2 q = vec2(fbm(p + 1.7), fbm(p + vec2(5.2, 1.3)));          // dobra o domínio: dá filamentos
      float gasA = fbm(p * 1.1 + q * 1.7);
      float gasB = fbm(p * 1.9 - q * 1.3 + 7.);
      float d = vUv.y - (.25 + vUv.x * .55);                          // faixa diagonal da Via Láctea
      float band = exp(-d * d * 30.) * (.4 + .6 * fbm(p * 3. + 3.));
      float dust = smoothstep(.45, .7, fbm(p * 4.6 + 11.));           // faixas escuras de poeira
      gl_FragColor = vec4(gasA, gasB, band * (1. - dust * .8), 1.);
    }`;
  const NEBULA_SHOW = `
    precision mediump float;
    varying vec2 vUv; uniform sampler2D uTex; uniform vec2 uShift; uniform vec3 uCol, uCol2; uniform float uFade;
    void main() {
      vec3 t = texture2D(uTex, .15 + vUv * .7 + uShift).rgb;
      float a = smoothstep(.4, .84, t.r), b = smoothstep(.46, .9, t.g);
      vec3 col = vec3(.012, .014, .03);
      col += uCol * a * a * .27;                                       // gás na cor do planeta
      col += uCol2 * b * b * .3;                                       // segunda cor da fase
      col += mix(uCol, uCol2, .5) * a * b * .16;                       // onde os dois se cruzam
      col += vec3(.72, .8, 1.) * t.b * .13;                            // brilho difuso da Via Láctea
      vec2 v = vUv - .5;
      col *= 1. - dot(v, v) * .9;
      gl_FragColor = vec4(col * uFade, 1.);
    }`;

  const STAR_VERT = `
    attribute vec3 aP; attribute vec3 aS;
    uniform vec2 uMouse; uniform float uScroll, uTime, uPx, uWarp;
    varying vec3 vC; varying float vBig;
    void main() {
      float depth = aP.z;
      vec2 p = aP.xy;
      p.y = mod(p.y + uScroll * (.1 + depth * .6) + 1.3, 2.6) - 1.3;   // quanto mais perto, mais rápido passa
      p -= uMouse * (.02 + depth * .08);
      p *= 1. + uWarp * uWarp * (1. + depth * 7.);                     // dobra: as estrelas voam para fora
      gl_Position = vec4(p, 0., 1.);
      gl_PointSize = uPx * aS.x * (1. + uWarp * 3.);
      float tw = .7 + .3 * sin(uTime * (.6 + aS.y * 2.) + aS.y * 90.);
      vC = mix(mix(vec3(.6, .73, 1.), vec3(1., .7, .48), aS.z), vec3(1.), .45) * tw * (.35 + depth * .65);
      vBig = step(5., aS.x);
    }`;
  const STAR_FRAG = `
    precision mediump float;
    varying vec3 vC; varying float vBig;
    void main() {
      vec2 d = gl_PointCoord - .5;
      float r = length(d), a = smoothstep(.5, 0., r);
      float spikes = vBig * (exp(-abs(d.x) * 40.) + exp(-abs(d.y) * 40.)) * smoothstep(.5, .1, r) * .7;   // raios de difração
      gl_FragColor = vec4(vC * (a * a + spikes), 1.);
    }`;

  const FIG_VERT = `
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
      p += dir * sin(m * 3.14159) * (.35 + aR.x * .75);                // explode no meio do caminho
      // ondas de duas fontes que se somam e se cancelam
      p.y += (sin(length(p.xz - vec2(.45, 0.)) * 9. - uTime * 1.8) + sin(length(p.xz + vec2(.45, 0.)) * 9. - uTime * 1.8)) * .045 * uRip;
      p += dir * sin(uTime * .7 + aR.x * 40.) * .008;                  // respiração
      float cy = cos(uRot.x), sy = sin(uRot.x), cx = cos(uRot.y), sx = sin(uRot.y);
      p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
      p = vec3(p.x, cx * p.y - sx * p.z, sx * p.y + cx * p.z);
      p *= uScale;
      float z = 3.4 - p.z;
      vec2 s = p.xy * (2.2 / max(z, .35));
      s.x /= uAspect;
      s += uOff;
      vec2 asp = vec2(uAspect, 1.);
      vec2 d = (s - uMouse) * asp;                                     // o cursor afasta os pontos
      s += normalize(d + 1e-5) / asp * .13 * exp(-dot(d, d) * 14.);
      vec2 dp = (s - uPulse) * asp;                                    // onda de choque do clique
      float w = exp(-pow((length(dp) - uPulseT * 1.5) * 7., 2.)) * max(0., 1. - uPulseT);
      s += normalize(dp + 1e-5) / asp * .1 * w;
      gl_Position = vec4(s, 0., 1.);
      // o teto no tamanho evita pontos enormes (e caros) quando a câmera atravessa a figura
      gl_PointSize = min(uPx * 26., uPx * (1.2 + aR.w * aR.w * 3.4) * (2.7 / max(z, .35)) * (1. + uVel * 1.8 + w * 2.5));
      float tw = .62 + .38 * sin(uTime * (1. + aR.y * 2.) + aR.z * 50.);
      vCol = mix(mix(uColA, uColB, m), vec3(1.), aR.z * aR.z * .5);
      vA = tw * (.6 + .6 * smoothstep(4.8, 2.4, z)) * uDim;
    }`;
  const FIG_FRAG = `
    precision mediump float;
    varying vec3 vCol; varying float vA;
    void main() {
      float a = smoothstep(.5, 0., length(gl_PointCoord - .5));
      gl_FragColor = vec4(vCol * a * a * vA, 1.);
    }`;

  function build(vert, frag, attribNames, uniformNames) {
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    attribNames.forEach((name, i) => gl.bindAttribLocation(p, i, name));   // índices fixos: 0, 1, 2
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    for (const name of uniformNames) u[name] = gl.getUniformLocation(p, name);
    return { p, u };
  }
  const makeBuffer = (data) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  };
  // liga os buffers aos atributos 0..n e desliga os que sobram
  function attributes(list) {
    for (let i = 0; i < 3; i++) {
      if (i < list.length) {
        gl.enableVertexAttribArray(i);
        gl.bindBuffer(gl.ARRAY_BUFFER, list[i][0]);
        gl.vertexAttribPointer(i, list[i][1], gl.FLOAT, false, 0, 0);
      } else gl.disableVertexAttribArray(i);
    }
  }

  function initGL() {
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' });
      if (!gl) throw new Error('WebGL indisponível');
      prog.gen = build(QUAD_VERT, NEBULA_GEN, ['aQ'], ['uAspect']);
      prog.show = build(QUAD_VERT, NEBULA_SHOW, ['aQ'], ['uTex', 'uShift', 'uCol', 'uCol2', 'uFade']);
      prog.stars = build(STAR_VERT, STAR_FRAG, ['aP', 'aS'], ['uMouse', 'uScroll', 'uTime', 'uPx', 'uWarp']);
      prog.fig = build(FIG_VERT, FIG_FRAG, ['aA', 'aB', 'aR'], ['uMix', 'uTime', 'uAspect', 'uPx', 'uScale', 'uRip', 'uVel', 'uPulseT', 'uDim', 'uRot', 'uMouse', 'uOff', 'uPulse', 'uColA', 'uColB']);
    } catch (err) {
      console.warn('Fundo animado indisponível:', err);
      gl = null;
      root.classList.add('no-gl');
      return;
    }

    buffers.quad = makeBuffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));

    // figuras: só as desta página, mais a nuvem de abertura
    for (const name of new Set(['cloud', ...CHAPTERS.map((c) => c.shape)])) {
      const sample = SHAPES[name]();
      const data = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) data.set(sample(), i * 3);
      buffers[name] = makeBuffer(data);
    }
    const random = new Float32Array(COUNT * 4);
    for (let i = 0; i < random.length; i++) random[i] = rnd();
    buffers.random = makeBuffer(random);

    // estrelas de fundo: parte delas concentrada ao longo da faixa da Via Láctea
    const pos = new Float32Array(STARS * 3), look = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      const inBand = rnd() < 0.42;
      const x = rnd() * 2.4 - 1.2;
      pos[i * 3] = x;
      pos[i * 3 + 1] = inBand ? 0.07 + 0.55 * x + gauss() * 0.32 : rnd() * 2.6 - 1.3;
      pos[i * 3 + 2] = inBand ? rnd() * 0.08 : Math.pow(rnd(), 1.6);
      const bright = !inBand && rnd() < 0.022;
      look[i * 3] = bright ? 7 + rnd() * 6 : inBand ? 1 + rnd() * 0.9 : 1.1 + rnd() * rnd() * 2.4;
      look[i * 3 + 1] = rnd();
      look[i * 3 + 2] = rnd() * rnd();
    }
    buffers.starPos = makeBuffer(pos);
    buffers.starLook = makeBuffer(look);

    nebulaTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, nebulaTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    nebulaFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, nebulaFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nebulaTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.clearColor(0, 0, 0, 1);
  }

  function paintNebula() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, nebulaFbo);
    gl.viewport(0, 0, 1024, 1024);
    gl.disable(gl.BLEND);
    gl.useProgram(prog.gen.p);
    attributes([[buffers.quad, 2]]);
    gl.uniform1f(prog.gen.u.uAspect, vw / vh);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  let dpr = 1, vw = innerWidth, vh = innerHeight;
  function resizeGL() {
    vw = innerWidth; vh = innerHeight;
    if (!gl) return;
    // telas muito grandes não precisam do dobro de pixels: o céu é difuso
    dpr = Math.min(devicePixelRatio || 1, vw > 1600 ? 1.5 : 2);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    paintNebula();
  }

  // ================================================================== estado
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };       // de -1 a 1, y para cima
  const pulse = { x: 0, y: 0, t0: -1e5 };
  const warp = { t0: null, href: '' };                // salto da página inicial para o portfólio
  let scrollSmooth = scrollY, velocity = 0, velSigned = 0, lastVel = 0;
  let introStart = null, lastMs = 0;
  let tops = [];
  let active = -1, lastAccent = '', lastXp = -1, lastReadout = '';
  let col = CHAPTERS[0].color.slice();                // cor de destaque atual (interpolada)

  // Índice contínuo de fase. A passagem acontece numa faixa em torno de cada
  // fronteira, não ao longo da seção inteira.
  function chapterIndex(y) {
    let f = 0;
    const centre = y + vh / 2;
    for (let i = 1; i < tops.length; i++) f += ease(clamp((centre - (tops[i] - vh * 0.45)) / (vh * 0.75)));
    return clamp(f, 0, LAST);
  }

  // ================================================================== leitura, trilho e anúncio de fase
  const hudStage = $('#hud-stage'), hudName = $('#hud-name'), hudFig = $('#hud-fig'), hudData = $('#hud-data'), hudXp = $('#hud-xp');
  const toast = $('.stage-toast');
  const rail = $('.rail');
  if (rail) chapters.forEach((c) => {
    const a = document.createElement('a');
    a.href = '#' + c.id;
    a.innerHTML = `<span>${c.dataset.name}</span>`;
    a.setAttribute('aria-label', c.dataset.name);
    rail.append(a);
  });
  const railLinks = rail ? $$('a', rail) : [];

  // letras embaralhadas que se assentam no nome da fase
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
    if (i === active || !chapters[i]) return;
    const first = active === -1;
    active = i;
    const data = chapters[i].dataset;
    if (hudStage) hudStage.textContent = data.stage || '';
    if (hudName) scramble(hudName, data.name);
    if (hudFig) hudFig.textContent = data.fig || '';
    railLinks.forEach((a, k) => a.classList.toggle('active', k === i));
    // anúncio grande no meio da tela, como o início de uma fase (não na chegada à página nem durante uma viagem)
    if (toast && !first && !still && !travelling) {
      toast.firstElementChild.textContent = data.stage || '';
      toast.lastElementChild.textContent = data.name;
      toast.classList.remove('show');
      void toast.offsetWidth;
      toast.classList.add('show');
    }
  }

  // ================================================================== sistema solar (seleção de fase)
  const system = $('.system');
  const orbitsSvg = $('.orbits');
  // f: raio da órbita (fração do maior).  a: ângulo inicial.  w: velocidade angular,
  // que cai com o raio como manda a terceira lei de Kepler (T² ∝ a³, logo ω ∝ a^-1,5).
  const planets = $$('.planet').map((el, i, all) => {
    const f = 0.34 + 0.66 * Math.pow(i / Math.max(1, all.length - 1), 0.9);
    return { el, f, a: 0.6 + i * 2.4, w: 0.07 * Math.pow(f, -1.5) };
  });
  // spin: giro dado pelo arrasto (com inércia).  tiltK: achatamento das órbitas (arrasto vertical).
  let orbitTime = 0, orbitPaused = false, RX = 0, RY = 0, spin = 0, spinVel = 0, tiltK = 1, drawnTilt = 0;
  let drag = null, dragged = false;
  function layoutSystem() {
    if (!system) return;
    const W = system.clientWidth, H = system.clientHeight;
    const landscape = W > H * 0.9;
    RX = landscape ? Math.min(W * 0.47, 720) : W * 0.38;
    RY = landscape ? Math.min(RX * 0.5, H * 0.37) : Math.min(H * 0.3, RX * 1.9);
    orbitsSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    orbitsSvg.innerHTML = planets.map(() => `<ellipse cx="${W / 2}" cy="${H / 2}"/>`).join('');
    drawnTilt = 0;
  }
  function updateSystem(dt) {
    if (!orbitPaused && !still && !drag) orbitTime += dt;
    if (!drag) { spin += spinVel; spinVel *= 0.94; }
    if (Math.abs(tiltK - drawnTilt) > 0.002) {       // só redesenha as órbitas quando o achatamento muda
      drawnTilt = tiltK;
      $$('ellipse', orbitsSvg).forEach((el, i) => {
        el.setAttribute('rx', (RX * planets[i].f).toFixed(1));
        el.setAttribute('ry', (RY * tiltK * planets[i].f).toFixed(1));
      });
    }
    for (const p of planets) {
      const th = p.a + orbitTime * p.w + spin, depth = Math.sin(th);
      p.el.style.transform = `translate(-50%,-50%) translate3d(${(Math.cos(th) * RX * p.f).toFixed(1)}px,${(depth * RY * tiltK * p.f).toFixed(1)}px,0) scale(${(0.84 + 0.16 * depth).toFixed(3)})`;
      p.el.style.zIndex = depth > 0 ? 3 : 1;
    }
  }
  planets.forEach((p) => {
    for (const on of ['pointerenter', 'focus']) p.el.addEventListener(on, () => { orbitPaused = true; });
    for (const off of ['pointerleave', 'blur']) p.el.addEventListener(off, () => { orbitPaused = false; });
    p.el.addEventListener('dragstart', (e) => e.preventDefault());
  });
  // arrastar gira o sistema (horizontal) e inclina o plano das órbitas (vertical)
  if (system) {
    system.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      dragged = false;
      spinVel = 0;
    });
    addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!dragged) {
        if (Math.hypot(dx, dy) < 6) return;          // abaixo disso ainda é um clique
        dragged = true;
        system.classList.add('dragging');
        try { system.setPointerCapture(drag.id); } catch { /* sem captura, o arrasto segue pelo window */ }
      }
      spinVel = -dx * 0.006;
      spin += spinVel;
      tiltK = clamp(tiltK + dy * 0.004, 0.2, 1.4);
      drag.x = e.clientX; drag.y = e.clientY;
    });
    const release = () => { drag = null; system.classList.remove('dragging'); };
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
    // o clique que encerra um arrasto não deve abrir o planeta que estava por baixo
    system.addEventListener('click', (e) => {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);
  }

  // emblema de cada fase: uma cópia do planeta que a representa na seleção
  $$('.emblem').forEach((el) => {
    const source = $(`.planet[data-planet="${el.dataset.planet}"] .orb`);
    el.innerHTML = source ? source.outerHTML : '<span class="orb"><i class="ball"></i></span>';
  });

  // viagem até uma fase: um círculo na cor do planeta cobre a tela, a página salta e ele se dissolve
  const wipe = $('.wipe');
  let travelling = false;
  function travel(index, x, y) {
    const target = chapters[index];
    if (!target || travelling) return;
    const land = () => {
      measure();
      scrollTo(0, tops[index] + (index === 0 ? 0 : 1));
      scrollSmooth = scrollY;
      history.replaceState(null, '', '#' + target.id);
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    if (still || !wipe) { land(); return; }
    travelling = true;
    wipe.style.setProperty('--x', x + 'px');
    wipe.style.setProperty('--y', y + 'px');
    wipe.style.setProperty('--wipe', `rgb(${CHAPTERS[index].color.join(' ')})`);
    $('b', wipe).textContent = target.dataset.stage || '';
    $('span', wipe).textContent = target.dataset.name;
    wipe.classList.remove('out');
    wipe.classList.add('in');
    setTimeout(() => { land(); wipe.classList.add('out'); wipe.classList.remove('in'); }, 760);
    setTimeout(() => { wipe.classList.remove('out'); travelling = false; }, 1500);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const index = chapters.findIndex((c) => c.id === a.getAttribute('href').slice(1));
    if (index < 0) return;
    e.preventDefault();
    const r = a.getBoundingClientRect();
    travel(index, e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
  });

  // ================================================================== efeitos de rolagem
  // títulos: uma letra por <span>, para cada uma entrar no seu tempo
  $$('.title').forEach((el) => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map((ch, i) => `<span class="ch" aria-hidden="true" style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  });

  // parágrafo que se acende palavra a palavra
  const wordBlocks = $$('[data-words]').map((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    return { el, spans: $$('.w', el), shown: -1 };
  });

  // Blocos que entram (.fx, .head) e fórmulas (.fm): as posições são medidas uma vez,
  // sem os efeitos aplicados, e a cada quadro só se faz conta com a rolagem.
  let fxItems = [], fmItems = [], fmFixed = [], lineBox = { top: 0, h: 1 };
  function measureFx() {
    root.classList.add('measuring');
    fxItems = $$('.fx, .head').filter((el) => !el.closest('.hscroll-track')).map((el) => ({ el, top: el.getBoundingClientRect().top + scrollY, last: -1 }));
    fmItems = $$('.fm:not([data-h])').map((el) => {
      const r = el.getBoundingClientRect();
      return { el, mid: r.top + scrollY + r.height / 2, s: parseFloat(el.dataset.s || '0.2'), shown: true };
    });
    fmFixed = $$('.fm[data-h]').map((el) => ({ el, s: parseFloat(el.dataset.s || '0.2') }));
    for (const b of wordBlocks) { const r = b.el.getBoundingClientRect(); b.top = r.top + scrollY; b.h = r.height; }
    if (timeline) { const r = timeline.getBoundingClientRect(); lineBox = { top: r.top + scrollY, h: r.height }; }
    root.classList.remove('measuring');
  }

  const timeline = $('.timeline');
  const timelineItems = timeline ? $$('li', timeline) : [];
  const hub = $('.hub');
  const tickers = $$('.ticker-track').map((el) => ({ el, dir: parseFloat(el.dataset.dir || '1'), half: 0, top: 0 }));

  // projetos: rolagem vertical convertida em movimento lateral
  const hscroll = $('.hscroll'), track = $('.hscroll-track');
  let hsDistance = 0, hsX = 0, hsTop = 0, hsH = 0, panels = [];
  function sizeHScroll() {
    if (!hscroll) return;
    const pin = !still && innerWidth > 760 && innerHeight > 640;
    hscroll.classList.toggle('hs-pin', pin);
    const hint = $('.panel-hint');
    if (hint) hint.textContent = pin ? 'Continue rolando: os projetos passam de lado.' : 'Deslize para o lado para ver os projetos.';
    panels = $$('.panel', track).map((el) => ({ el, x: el.offsetLeft + el.offsetWidth / 2 }));
    if (!pin) {
      hscroll.style.height = ''; track.style.transform = ''; hsDistance = 0;
      panels.forEach((p) => { p.el.style.transform = ''; p.el.style.opacity = ''; });
      return;
    }
    hsDistance = Math.max(0, track.scrollWidth - innerWidth);
    hscroll.style.height = innerHeight + hsDistance + 'px';
  }

  // onda do YouTube
  const waveA = $('#wave-a'), waveB = $('#wave-b');
  const waveBox = waveA ? waveA.closest('.wave') : null;
  let waveTop = 0;
  function drawWave(time, phase, amp) {
    let a = '', b = '';
    for (let i = 0; i <= 80; i++) {
      const x = i / 80, env = Math.sin(x * Math.PI);
      const ya = 60 + Math.sin(x * 22 - time * 3 + phase) * amp * env + Math.sin(x * 53 + time * 2) * amp * 0.25 * env;
      const yb = 60 + Math.sin(x * 14 + time * 1.6 - phase * 0.6) * amp * 0.7 * env;
      a += `${i ? 'L' : 'M'}${(x * 1000).toFixed(0)} ${ya.toFixed(1)}`;
      b += `${i ? 'L' : 'M'}${(x * 1000).toFixed(0)} ${yb.toFixed(1)}`;
    }
    waveA.setAttribute('d', a);
    waveB.setAttribute('d', b);
  }

  function measure() {
    sizeHScroll();
    layoutSystem();
    tops = chapters.map((c) => c.getBoundingClientRect().top + scrollY);
    measureFx();
    tickers.forEach((t) => { t.half = t.el.scrollWidth / 2; t.top = t.el.getBoundingClientRect().top + scrollY; });
    if (hscroll) { hsTop = hscroll.getBoundingClientRect().top + scrollY; hsH = hscroll.offsetHeight; }
    if (waveBox) waveTop = waveBox.getBoundingClientRect().top + scrollY;
    sizeGame();
  }

  const near = (top, margin = 1.2) => Math.abs(scrollSmooth + vh / 2 - top) < vh * margin;

  function scrollEffects(time) {
    const xp = clamp(scrollY / Math.max(1, root.scrollHeight - vh));
    root.style.setProperty('--prog', xp.toFixed(4));
    const xpInt = Math.round(xp * 100);
    if (hudXp && xpInt !== lastXp) { lastXp = xpInt; hudXp.textContent = 'XP ' + String(xpInt).padStart(3, '0') + '%'; }

    // velocidade com sinal: inclina os blocos e separa as cores dos títulos
    const v = Math.abs(velSigned) < 0.01 ? 0 : Math.round(clamp(velSigned, -1, 1) * 50) / 50;
    if (v !== lastVel) { lastVel = v; root.style.setProperty('--vel', v); }

    // seleção: a câmera mergulha no sistema solar conforme se rola
    if (hub && scrollSmooth < vh * 1.3) {
      hub.style.setProperty('--hp', clamp(scrollSmooth / (vh * 0.62)).toFixed(4));
      hub.style.setProperty('--mx', mouse.x.toFixed(3));
      hub.style.setProperty('--my', mouse.y.toFixed(3));
    }

    for (const it of fxItems) {
      const e = still ? 1 : ease(clamp((scrollSmooth + vh * 0.98 - it.top) / (vh * 0.42)));
      if (Math.abs(e - it.last) > 0.002) { it.last = e; it.el.style.setProperty('--e', e.toFixed(3)); }
    }

    // fórmulas: cada uma desliza numa velocidade própria e some ao se afastar do centro
    for (const it of fmItems) {
      const d = scrollSmooth + vh / 2 - it.mid;
      if (Math.abs(d) > vh * 1.3) { if (it.shown) { it.shown = false; it.el.style.opacity = 0; } continue; }
      it.shown = true;
      it.el.style.transform = still ? '' : `translate3d(${(mouse.x * it.s * 60).toFixed(1)}px,${(d * it.s).toFixed(1)}px,0) rotate(${(d * it.s * 0.012).toFixed(2)}deg)`;
      it.el.style.opacity = (clamp(1 - Math.abs(d) / (vh * 0.9)) * 0.55).toFixed(3);
    }
    if (!still && (scrollSmooth < vh * 1.3 || (hscroll && near(hsTop + hsH / 2, 0.5 + hsH / vh / 2)))) {
      for (const it of fmFixed) it.el.style.transform = `translate3d(${(hsX * it.s + mouse.x * it.s * 70).toFixed(1)}px,${(-mouse.y * it.s * 50).toFixed(1)}px,0)`;
    }

    for (const t of tickers) if (t.half && near(t.top)) t.el.style.transform = `translate3d(${(-(((scrollSmooth * 0.7 * t.dir) % t.half) + t.half) % t.half).toFixed(1)}px,0,0)`;

    for (const block of wordBlocks) {
      const p = clamp((vh * 0.88 - (block.top - scrollSmooth)) / (vh * 0.5 + block.h));
      const n = Math.round(p * block.spans.length);
      if (n !== block.shown) { block.shown = n; block.spans.forEach((s, i) => s.classList.toggle('on', i < n)); }
    }

    if (timeline) {
      const top = lineBox.top - scrollSmooth;
      if (top + lineBox.h > -vh && top < vh * 2) {
        const p = clamp((vh * 0.62 - top) / lineBox.h);
        timeline.style.setProperty('--tp', p.toFixed(4));
        timelineItems.forEach((li, i) => li.classList.toggle('lit', i / timelineItems.length <= p - 0.02));
      }
    }

    if (hsDistance > 0 && near(hsTop + hsH / 2, 0.6 + hsH / vh / 2)) {
      const p = clamp((scrollY - hsTop) / hsDistance);
      hsX = lerp(hsX, -p * hsDistance, 0.16);
      track.style.transform = `translate3d(${hsX.toFixed(1)}px,0,0)`;
      // cada painel gira conforme a distância do centro da tela
      for (const pn of panels) {
        const d = clamp((pn.x + hsX - vw / 2) / vw, -1.2, 1.2);
        pn.el.style.transform = `perspective(1300px) rotateY(${(d * -34).toFixed(2)}deg) translateZ(${(-Math.abs(d) * 220).toFixed(1)}px)`;
        pn.el.style.opacity = clamp(1.25 - Math.abs(d) * 0.9).toFixed(3);
      }
    }

    if (waveBox && near(waveTop, 0.7)) drawWave(time, scrollSmooth * 0.012, 16 + velocity * 34);
  }

  // ================================================================== jogo
  // Corrida de três faixas num canvas 2D transparente (o céu aparece atrás).
  // Tudo é desenhado em perspectiva a partir de coordenadas de mundo (x lateral,
  // y altura, z distância). Para ficar leve: resolução limitada, sem sombras do
  // canvas, traços agrupados num único caminho e placas pré-desenhadas.
  const game = $('.game'), gameStage = $('.game-stage'), gameCanvas = $('#game-canvas');
  const gctx = gameCanvas ? gameCanvas.getContext('2d', { desynchronized: true }) : null;
  const car = $('.car');
  const gui = { score: $('#g-score'), best: $('#g-best'), speed: $('#g-speed'), title: $('#g-title'), text: $('#g-text'), start: $('#g-start') };
  const ROAD_W = 1.8, LANE = 1.2, Z_NEAR = 1.55, Z_CAR = 2.35, Z_FAR = 150, MAX_SPEED = 2.6;
  const SIGNS = ['v = v₀ + at', 'Δs = v₀t + ½at²', 'F = ma', 'E = ½mv²', 'p = γmv', 'E = γmc²', 'γ = 1/√(1 − v²/c²)', "t' = γt", "L' = L/γ"];
  const BEST_KEY = 'luiza-portfolio-recorde';
  const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const streaks = Array.from({ length: 70 }, () => ({ a: Math.random() * TAU, r: Math.random(), s: 0.4 + Math.random() }));
  const G = {
    state: 'idle',           // idle (vitrine) | playing | over
    t: 0, speed: 0, dist: 0, bonus: 0, best: 0,
    carX: 0, targetX: 0,     // posição lateral do carro e para onde ele vai (mundo)
    ents: [], nextRow: 0,    // obstáculos e cristais; distância em que nasce a próxima fileira
    W: 0, H: 0, k: 1, top: 0, f: 1, cam: 1, y0: 0, x0: 0, hudTick: 0, surface: null, sprites: [],
  };
  try { G.best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch { /* sem armazenamento: o recorde vale só nesta visita */ }
  if (gui.best) gui.best.textContent = nf.format(G.best);

  function sizeGame() {
    if (!game) return;
    G.top = game.getBoundingClientRect().top + scrollY;
    const cw = gameCanvas.clientWidth, ch = gameCanvas.clientHeight;
    G.k = Math.min(devicePixelRatio || 1, cw > 1100 ? 1 : 1.5);          // pixels do canvas por pixel de tela
    G.W = gameCanvas.width = Math.round(cw * G.k);
    G.H = gameCanvas.height = Math.round(ch * G.k);
    G.y0 = G.H * 0.46; G.x0 = G.W / 2;
    // f: pixels por unidade de mundo a um de distância. Em telas em pé ele é limitado pela
    // largura (para as três faixas caberem) e a câmera sobe (cam) para o carro ficar embaixo.
    G.f = Math.min(G.H * 0.9, G.W * 0.64);
    G.cam = Math.max(1, (0.41 * G.H * Z_CAR) / G.f);
    G.surface = gctx.createLinearGradient(0, G.y0, 0, G.H);
    G.surface.addColorStop(0, 'rgba(6,6,14,0)');
    G.surface.addColorStop(0.2, 'rgba(6,6,14,.84)');
    G.surface.addColorStop(1, 'rgba(12,12,24,.95)');
    // o carro (SVG) ocupa 0,9 de faixa e pousa na pista na distância Z_CAR
    const w = (0.9 * G.f) / Z_CAR / G.k;
    car.style.width = w.toFixed(1) + 'px';
    car.style.marginLeft = (-w / 2).toFixed(1) + 'px';
    car.style.top = ((G.y0 + (G.cam * G.f) / Z_CAR) / G.k - (w / 2) * 0.89).toFixed(1) + 'px';
    // placas: cada fórmula é desenhada uma vez numa imagem e depois só redimensionada
    if (!G.sprites.length) G.sprites = SIGNS.map((text) => {
      const c = document.createElement('canvas'), x = c.getContext('2d');
      x.font = "italic 46px Georgia, 'Times New Roman', serif";
      c.width = Math.ceil(x.measureText(text).width + 60); c.height = 88;
      x.fillStyle = 'rgba(6,7,16,.88)'; x.fillRect(0, 0, c.width, c.height);
      x.strokeStyle = '#fff'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, c.width - 3, c.height - 3);
      x.font = "italic 46px Georgia, 'Times New Roman', serif";
      x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(text, c.width / 2, c.height / 2 + 2);
      return c;
    });
  }

  function startGame() {
    Object.assign(G, { state: 'playing', t: 0, dist: 0, bonus: 0, ents: [], nextRow: 60, speed: 0.8 });
    gui.score.textContent = '0';
    game.classList.add('playing');
    game.classList.remove('hit', 'got');
    gui.start.blur();
  }
  function endGame() {
    const score = Math.floor(G.dist / 3) + G.bonus;
    const record = score > G.best;
    if (record) { G.best = score; try { localStorage.setItem(BEST_KEY, String(score)); } catch { /* idem */ } }
    G.state = 'over';
    game.classList.remove('playing', 'got');
    game.classList.add('hit');
    gui.title.textContent = record ? 'Novo recorde' : 'Fim de jogo';
    gui.text.textContent = `Você fez ${nf.format(score)} pontos. Recorde: ${nf.format(G.best)}.`;
    gui.start.textContent = 'Jogar de novo';
    gui.best.textContent = nf.format(G.best);
    gui.score.textContent = nf.format(score);
    // onda de choque nas partículas, a partir do carro
    pulse.x = (G.carX * G.f) / Z_CAR / (G.W / 2);
    pulse.y = -0.75;
    pulse.t0 = performance.now();
  }
  function spawnRow() {
    const lanes = [-1, 0, 1];
    const blocked = Math.random() < clamp(0.2 + G.t / 90, 0, 0.62) ? 2 : 1;
    for (let i = 0; i < blocked; i++) {
      const lane = lanes.splice(Math.floor(Math.random() * lanes.length), 1)[0];
      G.ents.push({ z: Z_FAR, lane, type: Math.random() < 0.5 ? 'wall' : 'rock', spin: Math.random() * TAU });
    }
    // um cristal numa faixa livre, a meio caminho da próxima fileira
    if (Math.random() < 0.45) G.ents.push({ z: Z_FAR + 13, lane: lanes[Math.floor(Math.random() * lanes.length)], type: 'gem', spin: 0 });
  }

  if (game) {
    gui.start.addEventListener('click', startGame);
    game.addEventListener('animationend', (e) => { if (e.target === gameStage) game.classList.remove('hit'); });
    // mouse e toque: o carro vai para onde o ponteiro está
    const aim = (e) => {
      const r = gameStage.getBoundingClientRect();
      G.targetX = clamp(((e.clientX - r.left - r.width / 2) * G.k * Z_CAR) / G.f, -LANE, LANE);
    };
    gameStage.addEventListener('pointermove', aim, { passive: true });
    gameStage.addEventListener('pointerdown', aim, { passive: true });
    // teclado: uma faixa por toque
    addEventListener('keydown', (e) => {
      if (G.state !== 'playing') return;
      const dir = e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ? -1 : e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ? 1 : 0;
      if (!dir) return;
      e.preventDefault();
      G.targetX = clamp((Math.round(G.targetX / LANE) + dir) * LANE, -LANE, LANE);
    });
  }

  function updateGame(dt, time) {
    if (!game || scrollSmooth < G.top - vh || scrollSmooth > G.top + vh) return;      // fora da tela: nada roda

    // --- simulação
    if (G.state === 'playing') { G.t += dt; G.speed = Math.min(MAX_SPEED, 0.8 + G.t * 0.045); }
    else G.speed = lerp(G.speed, G.state === 'idle' && !still ? 0.35 : 0, 0.05);
    const step = G.speed * dt * 60;
    G.dist += step;
    G.carX = lerp(G.carX, G.targetX, 0.2);
    if (G.state === 'playing') {
      while (G.dist >= G.nextRow) { spawnRow(); G.nextRow += lerp(36, 23, clamp(G.t / 70)); }
      for (const e of G.ents) {
        e.z -= step;
        if (e.hit || e.z > Z_CAR + 0.7 || e.z < Z_CAR - 0.8) continue;
        if (Math.abs(e.lane * LANE - G.carX) > (e.type === 'gem' ? 0.7 : 0.8)) continue;
        if (e.type === 'gem') {
          e.hit = true; G.bonus += 50;
          game.classList.remove('got'); void game.offsetWidth; game.classList.add('got');
        } else { endGame(); break; }
      }
      G.ents = G.ents.filter((e) => e.z > Z_CAR - 0.4 && !e.hit);
    } else if (G.state === 'over') {
      for (const e of G.ents) e.z -= step;
      G.ents = G.ents.filter((e) => e.z > Z_CAR - 0.4);      // o que já passou do carro some
    }

    // --- desenho
    const ctx = gctx, { W, H, f, y0, cam } = G;
    const x0 = G.x0 - mouse.x * W * 0.02;
    const P = (x, y, z) => [x0 + (x * f) / z, y0 + ((cam - y) * f) / z];
    const rgb = col.join(',');
    const speedN = G.speed / MAX_SPEED;
    ctx.clearRect(0, 0, W, H);

    // riscos de velocidade saindo do ponto de fuga (um único caminho)
    if (speedN > 0.3) {
      const k = (speedN - 0.3) / 0.7, R = Math.hypot(W, H) * 0.6;
      ctx.beginPath();
      for (const s of streaks) {
        s.r += s.s * k * k * dt * 1.6;
        if (s.r > 1) { s.r = 0.02; s.a = Math.random() * TAU; }
        const r1 = s.r * R, r2 = r1 + (20 + k * k * 220) * s.r * G.k, c = Math.cos(s.a), sn = Math.sin(s.a);
        ctx.moveTo(x0 + c * r1, y0 + sn * r1);
        ctx.lineTo(x0 + c * r2, y0 + sn * r2);
      }
      ctx.strokeStyle = `rgba(255,255,255,${(k * 0.4).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // pista
    const nL = P(-ROAD_W, 0, Z_NEAR), nR = P(ROAD_W, 0, Z_NEAR), fL = P(-ROAD_W, 0, Z_FAR), fR = P(ROAD_W, 0, Z_FAR);
    ctx.fillStyle = G.surface;
    ctx.beginPath(); ctx.moveTo(nL[0], nL[1]); ctx.lineTo(nR[0], nR[1]); ctx.lineTo(fR[0], fR[1]); ctx.lineTo(fL[0], fL[1]); ctx.fill();

    // travessas: dão a sensação de velocidade
    ctx.beginPath();
    for (let z = 3 - (G.dist % 3); z < 66; z += 3) {
      if (z < Z_NEAR) continue;
      const a = P(-ROAD_W, 0, z), b = P(ROAD_W, 0, z);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.strokeStyle = `rgba(${rgb},.2)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // tracejado entre as três faixas
    ctx.beginPath();
    for (const x of [-LANE / 2, LANE / 2]) {
      for (let z = -(G.dist % 6); z < 110; z += 6) {
        const z1 = Math.max(z, Z_NEAR), z2 = z + 2.6;
        if (z2 <= Z_NEAR) continue;
        const a = P(x - 0.035, 0, z1), b = P(x + 0.035, 0, z1), c = P(x + 0.035, 0, z2), d = P(x - 0.035, 0, z2);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fill();

    // bordas: um traço largo e fraco por baixo de um fino e forte faz o papel do brilho
    ctx.beginPath();
    ctx.moveTo(nL[0], nL[1]); ctx.lineTo(fL[0], fL[1]);
    ctx.moveTo(nR[0], nR[1]); ctx.lineTo(fR[0], fR[1]);
    ctx.strokeStyle = `rgba(${rgb},.22)`; ctx.lineWidth = 9 * G.k; ctx.stroke();
    ctx.strokeStyle = `rgb(${rgb})`; ctx.lineWidth = 2 * G.k; ctx.stroke();

    // postes de luz
    ctx.beginPath();
    for (let z = 12 - (G.dist % 12); z < 100; z += 12) {
      if (z < Z_NEAR) continue;
      for (const side of [-1, 1]) {
        const a = P(side * (ROAD_W + 0.4), 0, z), b = P(side * (ROAD_W + 0.4), 0.6, z);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.rect(b[0] - 1.5 * G.k, b[1] - 1.5 * G.k, 3 * G.k, 3 * G.k);
      }
    }
    ctx.strokeStyle = `rgba(${rgb},.75)`; ctx.lineWidth = 1.5 * G.k; ctx.stroke();

    // placas com as fórmulas do movimento, de um lado e do outro
    const SPACING = 80;
    for (let n = Math.ceil((G.dist + 130) / SPACING); n * SPACING - G.dist > Z_NEAR + 0.4; n--) {
      const z = n * SPACING - G.dist, side = n % 2 ? 1 : -1, h = (0.62 * f) / z;
      if (h < 9) continue;
      const img = G.sprites[((n % SIGNS.length) + SIGNS.length) % SIGNS.length], w = (h * img.width) / img.height;
      const foot = P(side * (ROAD_W + 1.3), 0, z), head = P(side * (ROAD_W + 1.3), 1.05, z);
      ctx.globalAlpha = clamp(1.3 - z / 110);
      ctx.beginPath(); ctx.moveTo(foot[0], foot[1]); ctx.lineTo(head[0], head[1]);
      ctx.strokeStyle = `rgb(${rgb})`; ctx.lineWidth = Math.max(1, h * 0.05); ctx.stroke();
      ctx.drawImage(img, head[0] - w / 2, head[1] - h, w, h);
    }
    ctx.globalAlpha = 1;

    // obstáculos e cristais, do mais distante ao mais próximo
    for (let i = G.ents.length - 1; i >= 0; i--) {
      const e = G.ents[i];
      if (e.z > Z_FAR || e.z < Z_CAR - 0.4) continue;
      const x = e.lane * LANE, s = f / e.z;                      // s: pixels por unidade de mundo nessa distância
      const [cx, gy] = P(x, 0, e.z);
      ctx.globalAlpha = clamp(1.6 - e.z / 95);
      if (e.type === 'wall') {                                    // barreira: bloco escuro com faixa de alerta
        const w = 1.02 * s, h = 0.78 * s;
        ctx.fillStyle = '#0a0b16'; ctx.fillRect(cx - w / 2, gy - h, w, h);
        ctx.strokeStyle = '#ff3355'; ctx.lineWidth = Math.max(1, 0.05 * s); ctx.strokeRect(cx - w / 2, gy - h, w, h);
        ctx.fillStyle = '#ff3355'; ctx.fillRect(cx - w / 2, gy - h * 0.62, w, h * 0.2);
        ctx.fillStyle = '#fff'; ctx.fillRect(cx - w * 0.06, gy - h * 0.62, w * 0.12, h * 0.2);
      } else if (e.type === 'rock') {                             // asteroide: polígono irregular
        const r = 0.46 * s;
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
          const a = (j / 8) * TAU + e.spin, rr = r * (0.78 + 0.22 * Math.sin(j * 2.7 + e.spin * 3));
          ctx.lineTo(cx + Math.cos(a) * rr, gy - r + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = '#3a3542'; ctx.fill();
        ctx.strokeStyle = '#ff3355'; ctx.lineWidth = Math.max(1, 0.04 * s); ctx.stroke();
      } else {                                                    // cristal: losango que pulsa
        const r = (0.24 + 0.03 * Math.sin(time * 6)) * s, cy = gy - 0.5 * s;
        ctx.beginPath(); ctx.moveTo(cx, cy - r * 1.4); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r * 1.4); ctx.lineTo(cx - r, cy); ctx.closePath();
        ctx.fillStyle = '#7dfcff'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, 0.03 * s); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // luz sob o carro e chamas do escapamento, desenhadas aqui para o SVG do carro ficar parado
    const sc = f / Z_CAR, [carPx, carGy] = P(G.carX, 0, Z_CAR);
    ctx.fillStyle = `rgba(${rgb},.3)`;
    ctx.beginPath(); ctx.ellipse(carPx, carGy - 0.02 * sc, 0.5 * sc, 0.06 * sc, 0, 0, TAU); ctx.fill();
    if (speedN > 0.2) {
      const len = (0.08 + speedN * 0.22 * (0.7 + Math.random() * 0.6)) * sc;
      ctx.fillStyle = `rgba(${rgb},.9)`;
      for (const dx of [-0.18, 0.18]) {
        const fx = carPx + dx * sc;
        ctx.beginPath(); ctx.moveTo(fx - 0.03 * sc, carGy - 0.07 * sc); ctx.lineTo(fx + 0.03 * sc, carGy - 0.07 * sc); ctx.lineTo(fx, carGy - 0.07 * sc + len); ctx.fill();
      }
    }

    // carro: só transformações, que o navegador resolve sem redesenhar
    const lean = clamp((G.targetX - G.carX) * 9, -8, 8);
    const shake = still ? 0 : Math.sin(time * 40) * speedN * 1.6;
    car.style.transform = `translate3d(${(((G.carX * f) / Z_CAR - mouse.x * W * 0.02) / G.k).toFixed(1)}px,${shake.toFixed(1)}px,0) rotate(${lean.toFixed(2)}deg)`;

    // painel: atualizado poucas vezes por segundo, para não refazer o layout a cada quadro
    if (++G.hudTick % 6 === 0) {
      const beta = Math.min(0.9999, speedN * 0.9999);
      if (G.state === 'playing') gui.score.textContent = nf.format(Math.floor(G.dist / 3) + G.bonus);
      gui.speed.textContent = beta.toFixed(2).replace('.', ',') + ' c';
    }
  }

  // ================================================================== quadro a quadro
  function frame(ms) {
    const time = still ? 0 : ms / 1000;
    const dt = Math.min(0.05, (ms - lastMs) / 1000 || 0.016);
    lastMs = ms;
    const target = scrollY;
    const before = scrollSmooth;
    scrollSmooth = still ? target : lerp(scrollSmooth, target, 0.13);
    if (Math.abs(target - scrollSmooth) < 0.05) scrollSmooth = target;
    velSigned = lerp(velSigned, clamp((scrollSmooth - before) / 60, -1, 1), 0.2);
    velocity = Math.abs(velSigned);
    mouse.x = lerp(mouse.x, mouse.tx, still ? 1 : 0.07);
    mouse.y = lerp(mouse.y, mouse.ty, still ? 1 : 0.07);

    const f = chapterIndex(scrollSmooth);
    const i = Math.max(0, Math.min(Math.floor(f), LAST - 1));
    const mix = f - i;
    const A = CHAPTERS[i], B = CHAPTERS[Math.min(i + 1, LAST)];
    col = A.color.map((c, k) => Math.round(lerp(c, B.color[k], mix)));
    const col2 = A.color2.map((c, k) => lerp(c, B.color2[k], mix) / 255);
    const accent = `rgb(${col[0]} ${col[1]} ${col[2]})`;
    if (accent !== lastAccent) { lastAccent = accent; root.style.setProperty('--accent', accent); }
    setActive(Math.round(f));
    if (hudData) {
      const readout = `x ${mouse.x >= 0 ? '+' : ''}${mouse.x.toFixed(2)}  y ${mouse.y >= 0 ? '+' : ''}${mouse.y.toFixed(2)}`;
      if (readout !== lastReadout) { lastReadout = readout; hudData.textContent = readout; }
    }

    scrollEffects(time);
    if (system && scrollSmooth < vh * 1.3) updateSystem(dt);
    updateGame(dt, time);

    // salto da página inicial para o portfólio: 0 parado, 1 no fim (quando a página troca)
    let jump = 0;
    if (warp.t0 !== null) {
      jump = clamp((ms - warp.t0) / 950);
      if (jump >= 1 && warp.href) { const href = warp.href; warp.href = ''; location.href = href; }
    }

    if (gl) {
      if (introStart === null) introStart = ms;
      const intro = still ? 1 : clamp((ms - introStart) / 2600);
      const wide = vw > 900;
      const scrollUnits = (scrollSmooth / vh) * 0.25;
      const onGame = GAME < 0 ? 0 : clamp(1 - Math.abs(f - GAME));       // quanto o jogo pesa neste instante
      const gameSpeed = G.speed / MAX_SPEED;
      const hp = hub ? clamp(scrollSmooth / (vh * 0.62)) : 0;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // 1. nebulosa
      gl.disable(gl.BLEND);
      gl.useProgram(prog.show.p);
      attributes([[buffers.quad, 2]]);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, nebulaTexture);
      gl.uniform1i(prog.show.u.uTex, 0);
      gl.uniform2f(prog.show.u.uShift, mouse.x * 0.014, mouse.y * 0.014 - Math.min(0.13, scrollUnits * 0.1 * 0.35));
      gl.uniform3f(prog.show.u.uCol, col[0] / 255, col[1] / 255, col[2] / 255);
      gl.uniform3f(prog.show.u.uCol2, col2[0], col2[1], col2[2]);
      gl.uniform1f(prog.show.u.uFade, ease(clamp(intro * 2)) * (1 - jump * jump * jump));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // 2. estrelas de fundo: afastam-se com a velocidade da rolagem e do carro
      gl.enable(gl.BLEND);
      gl.useProgram(prog.stars.p);
      attributes([[buffers.starPos, 3], [buffers.starLook, 3]]);
      gl.uniform2f(prog.stars.u.uMouse, mouse.x, mouse.y);
      gl.uniform1f(prog.stars.u.uScroll, scrollUnits);
      gl.uniform1f(prog.stars.u.uTime, time);
      gl.uniform1f(prog.stars.u.uPx, dpr);
      gl.uniform1f(prog.stars.u.uWarp, Math.max(jump, velocity * 0.3 + onGame * gameSpeed * gameSpeed * 0.35));
      gl.drawArrays(gl.POINTS, 0, STARS);

      // 3. figura
      const same = A.shape === B.shape;
      let from = A.shape, to = B.shape, m = same ? 0 : mix, zoom = 1;
      if (jump > 0) { from = A.shape; to = 'cloud'; m = ease(jump); zoom = 1 + jump * jump * 2.2; }   // desfaz-se no salto
      else if (intro < 1 && f < 0.5) { from = 'cloud'; to = A.shape; m = ease(intro); }               // forma-se na abertura
      else if (!same) zoom = 1 + Math.sin(mix * Math.PI) * 0.3;                                        // atravessa a figura ao trocar
      // na seleção, o Sol cresce conforme a câmera mergulha; no jogo, o buraco negro cresce com a velocidade
      const scaleOf = (c) => (c.game ? lerp(0.26, 0.5, gameSpeed) : c === CHAPTERS[0] && hub ? c.scale * (1 + hp * 1.6) : c.scale);
      const yOf = (c) => (!wide && c.ySmall !== undefined ? c.ySmall : c.y !== undefined ? c.y : wide ? 0 : 0.12);
      const dimOf = (c) => (c.dim === undefined ? 1 : c.dim);
      // entre duas fases com a mesma figura não há troca de forma: a cor muda por igual
      const cA = same ? col : A.color, cB = same ? col : B.color;
      const u = prog.fig.u;
      gl.useProgram(prog.fig.p);
      attributes([[buffers[from], 3], [buffers[to], 3], [buffers.random, 4]]);
      gl.uniform1f(u.uMix, m);
      gl.uniform1f(u.uTime, time);
      gl.uniform1f(u.uAspect, vw / vh);
      gl.uniform1f(u.uPx, dpr * (vw < 700 ? 0.8 : 1));
      gl.uniform1f(u.uScale, lerp(scaleOf(A), scaleOf(B), mix) * (wide ? 1 : 0.78) * zoom);
      gl.uniform1f(u.uRip, lerp(A.rip, B.rip, mix));
      gl.uniform1f(u.uVel, velocity);
      gl.uniform1f(u.uPulseT, clamp((ms - pulse.t0) / 1400));
      gl.uniform1f(u.uDim, lerp(dimOf(A), dimOf(B), mix) * (wide ? 1 : 0.9) * (1 - jump * 0.6));
      gl.uniform2f(u.uRot, time * 0.06 + scrollSmooth * 0.0009 + mouse.x * 0.55, lerp(A.tilt, B.tilt, mix) - mouse.y * 0.28);
      gl.uniform2f(u.uMouse, mouse.x, mouse.y);
      gl.uniform2f(u.uOff, wide ? lerp(A.off, B.off, mix) * (1 - jump) : 0, lerp(yOf(A), yOf(B), mix));
      gl.uniform2f(u.uPulse, pulse.x, pulse.y);
      gl.uniform3f(u.uColA, cA[0] / 255, cA[1] / 255, cA[2] / 255);
      gl.uniform3f(u.uColB, cB[0] / 255, cB[1] / 255, cB[2] / 255);
      gl.drawArrays(gl.POINTS, 0, COUNT);
    }
    requestAnimationFrame(frame);
  }

  // ================================================================== entradas
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

  // página inicial: o botão de entrada dispara o salto antes de trocar de página
  const enter = $('#enter');
  if (enter && !still) {
    enter.addEventListener('click', (e) => {
      if (!gl || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      if (warp.t0 !== null) return;
      warp.t0 = performance.now();
      warp.href = enter.href;
      root.classList.add('leaving');
    });
    // ao voltar pelo histórico, a página reaparece como estava antes do salto
    addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      warp.t0 = null;
      warp.href = '';
      root.classList.remove('leaving');
    });
  }

  // estrelas cadentes ocasionais
  if (!still) {
    const meteor = () => {
      if (!document.hidden) {
        const el = document.createElement('i');
        el.className = 'meteor';
        el.style.left = 20 + Math.random() * 75 + 'vw';
        el.style.top = Math.random() * 45 + 'vh';
        el.addEventListener('animationend', () => el.remove());
        document.body.append(el);
      }
      setTimeout(meteor, 3000 + Math.random() * 6000);
    };
    setTimeout(meteor, 2500);
  }

  if (finePointer && !still) {
    root.classList.add('has-cursor');
    const cursor = $('.cursor'), dot = $('i', cursor), ring = $('b', cursor), glow = $('.cursor-glow');
    let cx = vw / 2, cy = vh / 2, rx = cx, ry = cy, gx = cx, gy = cy;
    addEventListener('pointermove', (e) => {
      cx = e.clientX; cy = e.clientY;
      dot.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      cursor.classList.toggle('on-link', !!e.target.closest('a, button'));
    }, { passive: true });
    (function follow() {
      rx = lerp(rx, cx, 0.22); ry = lerp(ry, cy, 0.22);
      gx = lerp(gx, cx, 0.06); gy = lerp(gy, cy, 0.06);
      ring.style.transform = `translate3d(${rx.toFixed(1)}px,${ry.toFixed(1)}px,0)`;
      if (glow) glow.style.transform = `translate3d(${gx.toFixed(1)}px,${gy.toFixed(1)}px,0)`;
      requestAnimationFrame(follow);
    })();

    // miniaturas que se inclinam na direção do cursor
    $$('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--rx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        el.style.setProperty('--ry', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', 0); el.style.setProperty('--ry', 0); });
    });
  }

  // copiar e-mail
  const copy = $('#copy-email');
  if (copy) copy.addEventListener('click', async () => {
    const status = $('#copy-status');
    try {
      await navigator.clipboard.writeText('luiizan12@gmail.com');
      status.textContent = 'E-mail copiado';
    } catch {
      status.textContent = 'Não deu para copiar: luiizan12@gmail.com';
    }
  });

  // ================================================================== partida
  initGL();
  resizeGL();
  measure();
  let remeasure = 0;
  const scheduleMeasure = () => { cancelAnimationFrame(remeasure); remeasure = requestAnimationFrame(measure); };
  addEventListener('resize', () => { resizeGL(); scheduleMeasure(); });
  addEventListener('load', scheduleMeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleMeasure);
  // imagens que carregam depois mudam a altura da página: mede de novo
  if ('ResizeObserver' in window) {
    let lastHeight = 0;
    new ResizeObserver(() => {
      const h = root.scrollHeight;
      if (Math.abs(h - lastHeight) > 2) { lastHeight = h; scheduleMeasure(); }
    }).observe(document.body);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  requestAnimationFrame(frame);
})();
