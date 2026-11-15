// Portfólio de Luiza Sena: céu, figuras de partículas e efeitos de rolagem.
//
// Um único canvas WebGL (sem bibliotecas) desenha três camadas, de trás para a frente:
//   1. nebulosa: nuvens de gás e a faixa da Via Láctea, geradas uma vez numa textura;
//   2. estrelas de fundo: milhares de pontos em profundidades diferentes;
//   3. a figura: uma nuvem de partículas que assume uma forma da ciência por capítulo.
// Ao rolar, a figura migra de uma forma para a seguinte e o céu desliza em paralaxe.
// O cursor gira a figura, afasta as partículas e desloca o céu; um clique dispara uma onda.
// O mesmo arquivo serve a página inicial (uma figura só) e o portfólio (sete capítulos).
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

  // Uma figura por <section class="chapter">, na mesma ordem do HTML.
  // color: cor de destaque. No portfólio segue a sequência de temperatura das
  //        estrelas, de uma supergigante vermelha até o azul das mais quentes.
  // tilt:  inclinação (0 = de perfil, 1.57 = de cima). rip: ondulação animada.
  // off:   deslocamento lateral em telas largas (fração da largura).
  const FIGURES = {
    planet: { color: [255, 198, 140], tilt: 0.36, rip: 0,    scale: 1.0,  off: 0.4 },
    star:   { color: [255, 107, 61],  tilt: 0.15, rip: 0,    scale: 1.0,  off: 0.42 },
    galaxy: { color: [255, 168, 96],  tilt: 0.95, rip: 0,    scale: 1.0,  off: -0.44 },
    well:   { color: [255, 226, 160], tilt: 0.6,  rip: 0.12, scale: 0.98, off: 0 },
    atom:   { color: [244, 240, 255], tilt: 0.3,  rip: 0,    scale: 0.95, off: 0.3 },
    helix:  { color: [178, 204, 255], tilt: 0.1,  rip: 0,    scale: 1.0,  off: 0.56 },
    wave:   { color: [132, 164, 255], tilt: 0.5,  rip: 1,    scale: 1.2,  off: 0 },
    hole:   { color: [150, 140, 255], tilt: 0.3,  rip: 0,    scale: 1.0,  off: 0.4 },
  };
  const ORDER = page === 'welcome' ? ['planet'] : ['star', 'galaxy', 'well', 'atom', 'helix', 'wave', 'hole'];
  const CHAPTERS = ORDER.map((shape) => ({ shape, ...FIGURES[shape] }));
  const chapters = $$('.chapter');
  const LAST = CHAPTERS.length - 1;

  // ------------------------------------------------------------------ formas
  // Gerador determinístico: o mesmo céu e as mesmas figuras a cada visita.
  let seed = 20261115;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;
  const TAU = Math.PI * 2;
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

  // ------------------------------------------------------------------ WebGL
  const canvas = $('#cosmos');
  const small = Math.min(innerWidth, innerHeight) < 700;
  const COUNT = small ? 10000 : 28000;       // partículas da figura
  const STARS = small ? 1600 : 3200;         // estrelas de fundo
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
    varying vec2 vUv; uniform sampler2D uTex; uniform vec2 uShift; uniform vec3 uCol; uniform float uFade;
    void main() {
      vec3 t = texture2D(uTex, .15 + vUv * .7 + uShift).rgb;
      float a = smoothstep(.42, .86, t.r), b = smoothstep(.5, .92, t.g);
      vec3 col = vec3(.012, .014, .03);
      col += uCol * a * a * .2;                                        // gás na cor do capítulo
      col += vec3(.18, .3, .95) * b * b * .16;                         // gás azul frio
      col += vec3(.95, .35, .6) * a * b * .1;                          // onde os dois se cruzam
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
      p *= 1. + uWarp * uWarp * (1. + depth * 7.);                     // salto: as estrelas voam para fora
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
      p += dir * sin(m * 3.14159) * (.3 + aR.x * .6);                  // explode no meio do caminho
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
      gl_PointSize = uPx * (1.2 + aR.w * aR.w * 3.4) * (2.7 / max(z, .35)) * (1. + uVel * 1.4 + w * 2.5);
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
      prog.show = build(QUAD_VERT, NEBULA_SHOW, ['aQ'], ['uTex', 'uShift', 'uCol', 'uFade']);
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
    for (const name of ['cloud', ...ORDER]) {
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
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    paintNebula();
  }

  // ------------------------------------------------------------------ estado
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };       // de -1 a 1, y para cima
  const pulse = { x: 0, y: 0, t0: -1e5 };
  const warp = { t0: null, href: '' };                // salto da página inicial para o portfólio
  let scrollSmooth = scrollY, velocity = 0;
  let introStart = null;
  let tops = [];
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
  const hudN = $('#hud-n'), hudName = $('#hud-name'), hudFig = $('#hud-fig'), hudData = $('#hud-data');
  const rail = $('.rail');
  if (rail) chapters.forEach((c) => {
    const a = document.createElement('a');
    a.href = '#' + c.id;
    a.innerHTML = `<span>${c.dataset.name}</span>`;
    a.setAttribute('aria-label', c.dataset.name);
    rail.append(a);
  });
  const railLinks = rail ? $$('a', rail) : [];

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
    if (i === active || !chapters[i]) return;
    active = i;
    if (hudN) hudN.textContent = i + 1;
    if (hudName) scramble(hudName, chapters[i].dataset.name);
    if (hudFig) hudFig.textContent = chapters[i].dataset.fig || '';
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
    if (hero) hero.style.setProperty('--hp', clamp(scrollSmooth / vh).toFixed(4));

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
    const i = Math.max(0, Math.min(Math.floor(f), LAST - 1));
    const mix = f - i;
    const A = CHAPTERS[i], B = CHAPTERS[Math.min(i + 1, LAST)];
    const col = A.color.map((c, k) => Math.round(lerp(c, B.color[k], mix)));
    const accent = `rgb(${col[0]} ${col[1]} ${col[2]})`;
    if (accent !== lastAccent) { lastAccent = accent; root.style.setProperty('--accent', accent); }
    setActive(Math.round(f));
    if (hudData) hudData.textContent = `x ${mouse.x >= 0 ? '+' : ''}${mouse.x.toFixed(2)}  y ${mouse.y >= 0 ? '+' : ''}${mouse.y.toFixed(2)}`;
    scrollEffects();

    // salto para o portfólio: 0 parado, 1 no fim (quando a página troca)
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

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // 1. nebulosa
      gl.disable(gl.BLEND);
      gl.useProgram(prog.show.p);
      attributes([[buffers.quad, 2]]);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, nebulaTexture);
      gl.uniform1i(prog.show.u.uTex, 0);
      gl.uniform2f(prog.show.u.uShift, mouse.x * 0.012, mouse.y * 0.012 - Math.min(0.13, scrollUnits * 0.1 * 0.35));
      gl.uniform3f(prog.show.u.uCol, col[0] / 255, col[1] / 255, col[2] / 255);
      gl.uniform1f(prog.show.u.uFade, ease(clamp(intro * 2)) * (1 - jump * jump * jump));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // 2. estrelas de fundo
      gl.enable(gl.BLEND);
      gl.useProgram(prog.stars.p);
      attributes([[buffers.starPos, 3], [buffers.starLook, 3]]);
      gl.uniform2f(prog.stars.u.uMouse, mouse.x, mouse.y);
      gl.uniform1f(prog.stars.u.uScroll, scrollUnits);
      gl.uniform1f(prog.stars.u.uTime, time);
      gl.uniform1f(prog.stars.u.uPx, dpr);
      gl.uniform1f(prog.stars.u.uWarp, jump);
      gl.drawArrays(gl.POINTS, 0, STARS);

      // 3. figura
      let from = A.shape, to = B.shape, m = mix, zoom = 1;
      if (jump > 0) { from = A.shape; to = 'cloud'; m = ease(jump); zoom = 1 + jump * jump * 2.2; }   // desfaz-se no salto
      else if (intro < 1 && f < 0.5) { from = 'cloud'; to = A.shape; m = ease(intro); }               // forma-se na abertura
      const u = prog.fig.u;
      gl.useProgram(prog.fig.p);
      attributes([[buffers[from], 3], [buffers[to], 3], [buffers.random, 4]]);
      gl.uniform1f(u.uMix, m);
      gl.uniform1f(u.uTime, time);
      gl.uniform1f(u.uAspect, vw / vh);
      gl.uniform1f(u.uPx, dpr * (vw < 700 ? 0.8 : 1));
      gl.uniform1f(u.uScale, lerp(A.scale, B.scale, mix) * (wide ? 1 : 0.78) * zoom);
      gl.uniform1f(u.uRip, lerp(A.rip, B.rip, mix));
      gl.uniform1f(u.uVel, velocity);
      gl.uniform1f(u.uPulseT, clamp((ms - pulse.t0) / 1400));
      gl.uniform1f(u.uDim, (wide ? 1 : 0.9) * (1 - jump * 0.6));
      gl.uniform2f(u.uRot, time * 0.06 + scrollSmooth * 0.0007 + mouse.x * 0.55, lerp(A.tilt, B.tilt, mix) - mouse.y * 0.28);
      gl.uniform2f(u.uMouse, mouse.x, mouse.y);
      gl.uniform2f(u.uOff, wide ? lerp(A.off, B.off, mix) * (1 - jump) : 0, wide ? 0 : 0.12);
      gl.uniform2f(u.uPulse, pulse.x, pulse.y);
      gl.uniform3f(u.uColA, A.color[0] / 255, A.color[1] / 255, A.color[2] / 255);
      gl.uniform3f(u.uColB, B.color[0] / 255, B.color[1] / 255, B.color[2] / 255);
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
      setTimeout(meteor, 5000 + Math.random() * 9000);
    };
    setTimeout(meteor, 3500);
  }

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
  if (menuButton && menu) {
    const setMenu = (open) => {
      menu.classList.toggle('open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.textContent = open ? 'Fechar' : 'Menu';
    };
    menuButton.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  }

  // copiar e-mail
  const copy = $('#copy-email');
  if (copy) copy.addEventListener('click', async () => {
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
