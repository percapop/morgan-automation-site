/* =========================================================
   Riso-style halftone background (WebGL, no libraries)

   Two ink screens (red + coral by default) are multiplied through
   the paper colour, like real risograph print. Colours are read
   from the CSS variables in style.css, so the palette lives in one place.

   Usage:  <canvas data-halftone data-preset="riso" data-calm="#selector">
           data-calm: an element whose area (plus padding) is printed
           almost ink-free so text on top stays readable.

   Tweak live in the console:  MAHalftone.set({ speed: 0.3 })
                               MAHalftone.preset('lilac')
   ========================================================= */

(function () {
  'use strict';

  /* ---------- Settings ---------- */
  var DEFAULTS = {
    bg: '--paper',          // paper stock (CSS variable)
    bgAlpha: 1,
    colors: ['--red', '--coral', '--lilac'],   // main ink, duotone ink, light third ink
    speed: 0.15,
    dotScale: 1.1,
    screenAngle: 15,        // degrees, first ink
    duoAngle: 75,           // degrees, second ink
    duotone: 0.35,          // how much of the second ink prints
    triAngle: 45,           // degrees, third ink
    tritone: 0.18,          // how much of the third ink (lilac) prints; 0 = off
    contrast: 0.9,
    scale: 1.2,             // size of the flowing shapes (higher = smaller)
    flowAngle: 30,          // degrees, drift direction
    glow: 0.35,             // soft ink bleed around dots
    grain: 0.3,             // paper grain + ink dropout
    mouse: 0.4,             // how much the cursor darkens the print
    cell: 9,                // halftone cell size in CSS px
    calmPad: 56,            // CSS px of soft fade around the calm area
    calmFloor: 0            // ink left inside the calm area (0 = none)
  };

  var PRESETS = {
    riso: {},                                   // default: red + coral
    lilac: { colors: ['--red', '--lilac', '--coral'] },   // lilac as the main duotone ink
    duo: { tritone: 0 }                                  // red + coral only
  };

  /* ---------- Shaders ---------- */
  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 uRes, uMouse;',
    'uniform float uDpr, uTime, uMouseAmt, uAlpha;',
    'uniform vec3 uPaper, uInk1, uInk2, uInk3;',
    'uniform float uDotScale, uScreenAngle, uDuoAngle, uDuotone, uContrast, uScale, uFlowAngle, uGlow, uGrain, uMouseStr, uCell;',
    'uniform float uTriAngle, uTritone;',
    'uniform vec4 uCalm;',
    'uniform float uCalmPad, uCalmFloor;',

    'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    '  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}return v;}',
    'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',

    // Continuous tone image: slow, domain-warped noise drifting along flowAngle
    'float tone(vec2 p, float seed){',
    '  vec2 dir=vec2(cos(radians(uFlowAngle)),sin(radians(uFlowAngle)));',
    '  vec2 q=p/(uDpr*480.)*uScale+seed;',
    '  vec2 drift=dir*uTime;',
    '  vec2 w=vec2(fbm(q*.8-drift*.5),fbm(q*.8+vec2(5.2,1.3)+drift*.3));',
    '  float n=fbm(q+1.4*w-drift);',
    '  vec2 m=(p-uMouse)/(uDpr*200.);',
    '  n+=uMouseStr*uMouseAmt*.5*exp(-dot(m,m));',
    '  float t=clamp((n-.5)*uContrast*2.1+.14,0.,.72);',          // mostly paper, with patches
    // Calm area: fade ink out behind text
    '  vec2 c=(uCalm.xy+uCalm.zw)*.5, h=abs(uCalm.zw-uCalm.xy)*.5;',
    '  vec2 dd=abs(p-c)-h;',
    '  float d=length(max(dd,0.))+min(max(dd.x,dd.y),0.);',
    '  t*=mix(uCalmFloor,1.,smoothstep(0.,uCalmPad*uDpr,d));',
    '  return t;',
    '}',

    // One ink screen at a given angle; tone is sampled at each cell centre
    'float screen(vec2 p, float angle, float seed, float amount){',
    '  float cell=uCell*uDpr;',
    '  mat2 r=rot(radians(angle));',
    '  vec2 rp=r*p;',
    '  vec2 center=(floor(rp/cell)+.5)*cell;',
    '  float t=clamp(tone(center*r,seed)*amount,0.,1.);',
    '  float rad=sqrt(t)*.5*cell*uDotScale*1.2;',
    '  float aa=(.75+uGlow*1.5)*uDpr;',
    '  float cov=1.-smoothstep(rad-aa,rad+aa,length(rp-center));',
    '  cov=max(cov,t*uGlow*.18);',
    '  cov*=smoothstep(.0,.04,t);',                                 // no ink at all where tone is ~0
    '  return clamp(cov,0.,1.);',
    '}',

    'void main(){',
    '  vec2 p=gl_FragCoord.xy;',
    '  float g=hash(floor(p/uDpr));',
    '  float c1=screen(p,uScreenAngle,0.,1.);',
    '  float c2=screen(p,uDuoAngle,7.3,uDuotone*1.8);',
    '  c1*=1.-uGrain*.5*step(.85,g);',
    '  c2*=1.-uGrain*.5*step(.85,fract(g*7.13));',
    '  float c3=uTritone>0.?screen(p,uTriAngle,3.7,uTritone*1.8):0.;',
    '  vec3 col=uPaper*mix(vec3(1.),uInk1,c1)*mix(vec3(1.),uInk2,c2)*mix(vec3(1.),uInk3,c3);',
    '  col+=(g-.5)*uGrain*.06;',
    '  gl_FragColor=vec4(col*uAlpha,uAlpha);',
    '}'
  ].join('\n');

  /* ---------- Helpers ---------- */
  function cssColor(name) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var m = /^#?([0-9a-f]{6})$/i.exec(v);
    if (!m) return [1, 1, 1];
    var n = parseInt(m[1], 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  /* ---------- Instance ---------- */
  function Halftone(canvas) {
    var gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
    if (!gl) return null;   // no WebGL: the plain paper background shows instead

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ['uRes', 'uMouse', 'uDpr', 'uTime', 'uMouseAmt', 'uAlpha', 'uPaper', 'uInk1', 'uInk2', 'uInk3', 'uTriAngle', 'uTritone', 'uDotScale',
      'uScreenAngle', 'uDuoAngle', 'uDuotone', 'uContrast', 'uScale', 'uFlowAngle', 'uGlow', 'uGrain',
      'uMouseStr', 'uCell', 'uCalm', 'uCalmPad', 'uCalmFloor'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var opts = {};
    var dpr = 1, time = 0, last = 0, raf = 0, visible = true;
    var mouse = [-9999, -9999], target = [-9999, -9999], mouseAmt = 0, mouseTarget = 0;
    var calmEl = canvas.dataset.calm ? document.querySelector(canvas.dataset.calm) : null;
    var host = canvas.parentElement;

    function apply(o) {
      opts = Object.assign({}, DEFAULTS, PRESETS[canvas.dataset.preset] || {}, o || {});
      gl.uniform3fv(U.uPaper, cssColor(opts.bg));
      gl.uniform3fv(U.uInk1, cssColor(opts.colors[0]));
      gl.uniform3fv(U.uInk2, cssColor(opts.colors[1]));
      gl.uniform3fv(U.uInk3, cssColor(opts.colors[2] || opts.colors[1]));
      gl.uniform1f(U.uTriAngle, opts.triAngle);
      gl.uniform1f(U.uTritone, opts.tritone);
      gl.uniform1f(U.uAlpha, opts.bgAlpha);
      gl.uniform1f(U.uDotScale, opts.dotScale);
      gl.uniform1f(U.uScreenAngle, opts.screenAngle);
      gl.uniform1f(U.uDuoAngle, opts.duoAngle);
      gl.uniform1f(U.uDuotone, opts.duotone);
      gl.uniform1f(U.uContrast, opts.contrast);
      gl.uniform1f(U.uScale, opts.scale);
      gl.uniform1f(U.uFlowAngle, opts.flowAngle);
      gl.uniform1f(U.uGlow, opts.glow);
      gl.uniform1f(U.uGrain, opts.grain);
      gl.uniform1f(U.uMouseStr, reduce.matches ? 0 : opts.mouse);
      gl.uniform1f(U.uCell, opts.cell);
      gl.uniform1f(U.uCalmPad, opts.calmPad);
      gl.uniform1f(U.uCalmFloor, opts.calmFloor);
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uDpr, dpr);
      // Calm rectangle in canvas pixels (y from the bottom, as in GLSL)
      if (calmEl) {
        var c = calmEl.getBoundingClientRect();
        gl.uniform4f(U.uCalm, (c.left - r.left) * dpr, (r.bottom - c.bottom) * dpr, (c.right - r.left) * dpr, (r.bottom - c.top) * dpr);
      } else {
        gl.uniform4f(U.uCalm, -1e5, -1e5, -1e5 + 1, -1e5 + 1);
      }
      draw();
    }

    function draw() {
      gl.uniform1f(U.uTime, time);
      gl.uniform2f(U.uMouse, mouse[0], mouse[1]);
      gl.uniform1f(U.uMouseAmt, mouseAmt);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function frame(now) {
      raf = 0;
      var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      time += dt * opts.speed;
      mouse[0] += (target[0] - mouse[0]) * 0.08;
      mouse[1] += (target[1] - mouse[1]) * 0.08;
      mouseAmt += (mouseTarget - mouseAmt) * 0.05;
      draw();
      loop();
    }
    function loop() {
      if (raf || !visible || document.hidden || reduce.matches) { last = 0; return; }
      raf = requestAnimationFrame(frame);
    }

    // Mouse (fine pointers only)
    host.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = canvas.getBoundingClientRect();
      target = [(e.clientX - r.left) * dpr, (r.bottom - e.clientY) * dpr];
      if (mouseTarget === 0) mouse = target.slice();
      mouseTarget = 1;
    });
    host.addEventListener('pointerleave', function () { mouseTarget = 0; });

    // Only animate while on screen and the tab is visible (saves battery)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; loop(); }).observe(canvas);
    }
    document.addEventListener('visibilitychange', loop);
    reduce.addEventListener && reduce.addEventListener('change', function () { apply(); draw(); loop(); });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);

    apply();
    resize();
    loop();
    canvas.classList.add('is-ready');

    return {
      set: function (o) { apply(Object.assign({}, opts, o)); draw(); },
      preset: function (name) { canvas.dataset.preset = name; apply(); draw(); }
    };
  }

  var instances = [];
  document.querySelectorAll('canvas[data-halftone]').forEach(function (c) {
    try { var h = Halftone(c); if (h) instances.push(h); } catch (e) { /* leave the paper background */ }
  });

  window.MAHalftone = {
    defaults: DEFAULTS,
    presets: PRESETS,
    set: function (o) { instances.forEach(function (h) { h.set(o); }); },
    preset: function (n) { instances.forEach(function (h) { h.preset(n); }); }
  };
})();
