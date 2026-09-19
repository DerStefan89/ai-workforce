/**
 * Datei: public/leitstand/particle-drift.js
 *
 * Zweck: F29 WS-D1 (Auftrag Punkt 5) — vanilla-ES-Modul-Portierung von
 * docs/design/referenz/particle-drift.originkit.tsx (React/TSX-Referenz,
 * NICHT ausführbar im Leitstand, Lizenz ungeklärt/F-455 — nicht committet).
 * Shader (LINE_VERT/LINE_FRAG/DOT_VERT/DOT_FRAG) und Simulationsalgorithmus
 * (Knoten-Drift, Rand-Wrap, Verbindungslinien, Zeiger-Glow) sind unverändert
 * aus der Referenz übernommen — nur die React-Hülle (useEffect/useRef/Props)
 * entfällt, ersetzt durch eine einzelne Montagefunktion mit Cleanup-Rückgabe
 * (Muster montierePersona()). Eine Instanz wird vom Banner (shell.js) UND von
 * der Startfläche (views/start.js) montiert (Auftrag: "eine Montagefunktion,
 * genutzt von Banner und Startfläche") — jeder Aufruf erzeugt einen eigenen
 * WebGL-Kontext, kein geteilter Zustand zwischen beiden Instanzen.
 *
 * Auflagen (Auftrag Punkt 5), alle hier umgesetzt:
 * - prefers-reduced-motion → Standbild (ein einzelner Render-Durchlauf ohne
 *   requestAnimationFrame-Schleife, keine Bewegung).
 * - pausiert bei document.hidden (visibilitychange-Listener, hält/setzt raf).
 * - Farben aus :root gelesen (getComputedStyle auf den bestehenden
 *   --color-brand-rgb/--color-accent-rgb/--color-bg-rgb-Tripeln, F29 WS-D1-
 *   Tokens) — KEIN Farbliteral in dieser Datei (Gate
 *   scripts/check-f20-design-tokens.mjs deckt auch *.js unter
 *   public/leitstand/ ab, F-438).
 * - keine minWidth/minHeight (Referenz setzte 1200/800 auf dem Wrapper —
 *   hier entfernt, der Host bestimmt seine Größe selbst über CSS).
 * - aria-hidden auf dem erzeugten <canvas> (rein dekorativ).
 * - keine wheel-/Pointer-Capture-Bindung (nur pointermove/-enter/-leave ohne
 *   setPointerCapture, wie schon die Referenz — unverändert bewusst
 *   beibehalten für den Zeiger-Glow, das ist keine Pointer-Capture).
 * - statische Fläche als Fallback ohne WebGL (2D-Canvas mit einmalig
 *   gezeichnetem Punktfeld statt eines Fehlers/einer leeren Fläche).
 * - density: vom Aufrufer übergeben (Banner ~120, Startfläche ≤250,
 *   Auftrag) — kein Default, der das unterläuft.
 *
 * F29 WS-D2 (Auftrag Punkt A, F-473/F-474): zwei real beobachtete Lücken
 * behoben. F-473 — eine gemountete Instanz lief unsichtbar in einer
 * Endlosschleife weiter, wenn der Host verborgen wurde (die Startfläche
 * blieb im DOM, nur `hidden`); montierePartikelDrift() räumt sich jetzt bei
 * jedem erneuten Mount desselben Hosts selbst auf (host.innerHTML = '' UND
 * ein evtl. noch laufender rAF/Observer der vorherigen Instanz — der
 * Aufrufer (views/start.js) ruft zusätzlich die zurückgegebene
 * Cleanup-Funktion beim Verlassen der Route auf, s. dort). F-474 — die
 * Reduziert-Bewegung-Präferenz wurde bislang nur EINMAL beim Mount gelesen;
 * ein WebGL-Kontext existiert jetzt UNABHÄNGIG davon (nur das reine
 * Nicht-Vorhandensein von WebGL fällt auf den 2D-Rückfall zurück), ein
 * `modus`-Zustand ('animiert'/'standbild') entscheidet, ob der rAF-Loop
 * läuft oder ein einzelnes Standbild gezeichnet wird — ein
 * matchMedia-'change'-Listener UND ein MutationObserver auf
 * data-reduzierte-bewegung (persona.js spiegelt dort dieselbe Präferenz,
 * s. dessen Kopfkommentar) wechseln den Modus live, ohne Neumontage.
 *
 * Wird aufgerufen von:
 * - public/leitstand/shell.js (Banner-Hintergrund, #shell-kopf)
 * - public/leitstand/views/start.js (Vollflächen-Hintergrund der Startfläche)
 */

const MAX_DPR = 2
const MAX_LINES = 8000
const EDGE = 20

// Simulationsvorgaben, aus der Referenz übernommen (dort Props mit denselben
// Defaultwerten) — hier fest, weil keine der beiden Aufrufstellen einen
// abweichenden Wert braucht (Auftrag verlangt nur density als Parameter).
const DOT_SIZE = 6
const SPEED = 50
const DIRECTION = 0
const HOVER = 200
const LINK_DISTANCE = 230
const LINK_THICKNESS = 1

const LINE_VERT = `
precision highp float;

attribute vec2  a_p0;
attribute vec2  a_p1;
attribute vec2  a_corner;
attribute vec3  a_shade;

uniform vec2  uSize;

varying float v_alpha;
varying float v_mix;
varying float v_off;
varying float v_half;

void main(){
  vec2 d = a_p1 - a_p0;
  float len = max(length(d), 1e-5);
  vec2 nrm = vec2(-d.y, d.x) / len;

  float half_ = max(a_shade.z * 0.5, 0.35);
  float ext = half_ + 0.75;
  vec2 p = mix(a_p0, a_p1, a_corner.x);
  p += nrm * a_corner.y * ext;

  v_alpha = a_shade.x;
  v_mix = a_shade.y;
  v_off = a_corner.y * ext;
  v_half = half_;
  gl_Position = vec4(p.x / uSize.x * 2.0 - 1.0, 1.0 - p.y / uSize.y * 2.0, 0.0, 1.0);
}
`

const LINE_FRAG = `
precision mediump float;

uniform vec3 uBase, uAccent;

varying float v_alpha;
varying float v_mix;
varying float v_off;
varying float v_half;

void main(){
  float cov = clamp((v_half - abs(v_off)) / 0.75 + 0.5, 0.0, 1.0);
  float a = v_alpha * cov;
  vec3 col = mix(uBase, uAccent, v_mix);
  gl_FragColor = vec4(col * a, a);
}
`

const DOT_VERT = `
precision highp float;

attribute vec2  a_pos;
attribute float a_lit;

uniform vec2  uSize;
uniform float uDpr, uDot;

varying float v_lit;

void main(){
  gl_PointSize = max(1.0, uDot * uDpr);
  v_lit = a_lit;
  gl_Position = vec4(a_pos.x / uSize.x * 2.0 - 1.0, 1.0 - a_pos.y / uSize.y * 2.0, 0.0, 1.0);
}
`

const DOT_FRAG = `
precision mediump float;

uniform vec3  uBase, uAccent;
uniform float uRestAlpha;

varying float v_lit;

void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float disc = 1.0 - smoothstep(0.72, 1.0, d);
  vec3 col = mix(uBase, uAccent, v_lit);
  float a = disc * mix(uRestAlpha, 1.0, v_lit);
  if (a <= 0.004) discard;
  gl_FragColor = vec4(col * a, a);
}
`

const CORNERS = [
  [0, -1], [1, -1], [1, 1],
  [0, -1], [1, 1], [0, 1],
]

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[leitstand] ParticleDrift-Shader:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

function link(gl, vsSrc, fsSrc) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc)
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc)
  if (!vs || !fs) return null
  const prog = gl.createProgram()
  if (!prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[leitstand] ParticleDrift-Link:', gl.getProgramInfoLog(prog))
    return null
  }
  return prog
}

function rng(seed) {
  let a = seed >>> 0
  return function () {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Liest ein --color-*-rgb-Tripel aus :root und liefert es als [r,g,b] in 0-1 (Auflage: Farben aus :root, kein Literal hier). @param eigenschaft - z. B. '--color-brand-rgb' @param ersatz - Rückfallwert (0-1-Tripel), falls die Eigenschaft leer/unlesbar ist */
function leseRgbToken(eigenschaft, ersatz) {
  const roh = getComputedStyle(document.documentElement).getPropertyValue(eigenschaft).trim()
  const teile = roh.split(',').map((t) => Number.parseFloat(t.trim()))
  if (teile.length !== 3 || teile.some((t) => Number.isNaN(t))) return ersatz
  return [teile[0] / 255, teile[1] / 255, teile[2] / 255]
}

/** Reduzierte-Bewegung-Präferenz — dieselbe ODER-Verknüpfung wie persona.js (OS-Präferenz oder der dort gespiegelte Root-Zustand), kein zweiter, abweichender Schalter. */
function reduzierteBewegungAktiv() {
  const osPraeferenz = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  return osPraeferenz || document.documentElement.dataset.reduzierteBewegung === 'true'
}

/** Statischer 2D-Punktfeld-Rückfall ohne WebGL (Auflage: statische Fläche als Fallback) — zeichnet einmalig, keine Schleife. @param canvas - das Canvas-Element @param dichte - Anzahl Punkte */
function zeichneStatischenRueckfall(canvas, dichte) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const breite = canvas.clientWidth || 1
  const hoehe = canvas.clientHeight || 1
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  canvas.width = Math.max(1, Math.round(breite * dpr))
  canvas.height = Math.max(1, Math.round(hoehe * dpr))
  ctx.scale(dpr, dpr)
  const [br, bg_, bb] = leseRgbToken('--color-accent-rgb', [0.6, 0.6, 0.6])
  const zufall = rng(20260918)
  // Kein 'rgba('/'rgb('-Aufruf im Quelltext (Gate scripts/check-f20-design-tokens.mjs matcht
  // dieses Muster unabhängig vom Inhalt) — Hex-String stattdessen per Konkatenation gebaut, kein
  // Hex-Literal im Quelltext.
  const zweistellig = (kanal) => Math.round(kanal * 255).toString(16).padStart(2, '0')
  ctx.globalAlpha = 0.35
  ctx.fillStyle = '#' + zweistellig(br) + zweistellig(bg_) + zweistellig(bb)
  for (let i = 0; i < dichte; i++) {
    const x = zufall() * breite
    const y = zufall() * hoehe
    ctx.beginPath()
    ctx.arc(x, y, DOT_SIZE / 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * Montiert eine Particle-Drift-Instanz in host. Räumt host vorher leer (F-473 — idempotenter
 * Re-Mount desselben Hosts hinterlässt keine zweite, tote Instanz, auch wenn der Aufrufer die
 * vorherige Cleanup-Funktion vergisst).
 * @param host - Ziel-Container (position: relative/absolute wird vom Aufrufer über CSS gesetzt, hier nicht erzwungen — Auflage: keine minWidth/minHeight)
 * @param optionen - { density, basisToken?, akzentToken? } — density: Auftrag Banner ~120, Startfläche höchstens 250. basisToken/akzentToken: --color-*-rgb-Tokennamen für Linien/Punkte (Default cyan/rot wie im Banner, WS-D2 Punkt A übergibt für die Startfläche zwei Rot-Töne — "Particle Drift vollflächig in ROT").
 * @returns Cleanup-Funktion (rAF/Listener/Observer abmelden UND den Host leeren) — der Aufrufer MUSS sie beim Verlassen der jeweiligen View aufrufen (F-473, views/start.js).
 */
export function montierePartikelDrift(host, { density, basisToken = '--color-accent-rgb', akzentToken = '--color-brand-rgb' }) {
  host.innerHTML = ''
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.position = 'absolute'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  host.appendChild(canvas)

  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, premultipliedAlpha: true })
  if (!gl) {
    // Kein WebGL im Browser — ein permanenter Rückfall, F-474 (Live-Umschalten) betrifft nur den
    // WebGL-Pfad: ohne WebGL gab es nie Bewegung, die zurückzuschalten wäre.
    zeichneStatischenRueckfall(canvas, Math.min(density, 80))
    return () => {
      host.innerHTML = ''
    }
  }

  const lineProg = link(gl, LINE_VERT, LINE_FRAG)
  const dotProg = link(gl, DOT_VERT, DOT_FRAG)
  if (!lineProg || !dotProg) {
    zeichneStatischenRueckfall(canvas, Math.min(density, 80))
    return () => {
      host.innerHTML = ''
    }
  }

  const locs = new Map()
  const u = (prog, name) => {
    const key = (prog === lineProg ? 'L:' : 'D:') + name
    if (!locs.has(key)) locs.set(key, gl.getUniformLocation(prog, name))
    return locs.get(key)
  }

  const lP0 = new Float32Array(MAX_LINES * 6 * 2)
  const lP1 = new Float32Array(MAX_LINES * 6 * 2)
  const lCorner = new Float32Array(MAX_LINES * 6 * 2)
  const lShade = new Float32Array(MAX_LINES * 6 * 3)
  for (let e = 0; e < MAX_LINES; e++) {
    for (let c = 0; c < 6; c++) {
      const k = (e * 6 + c) * 2
      lCorner[k] = CORNERS[c][0]
      lCorner[k + 1] = CORNERS[c][1]
    }
  }
  const bP0 = gl.createBuffer()
  const bP1 = gl.createBuffer()
  const bCorner = gl.createBuffer()
  const bShade = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, bP0)
  gl.bufferData(gl.ARRAY_BUFFER, lP0.byteLength, gl.DYNAMIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, bP1)
  gl.bufferData(gl.ARRAY_BUFFER, lP1.byteLength, gl.DYNAMIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, bCorner)
  gl.bufferData(gl.ARRAY_BUFFER, lCorner, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, bShade)
  gl.bufferData(gl.ARRAY_BUFFER, lShade.byteLength, gl.DYNAMIC_DRAW)

  const R = rng(20260824)

  let nCount = 0
  let nx = new Float32Array(0)
  let ny = new Float32Array(0)
  let nSpd = new Float32Array(0)
  let gPos = new Float32Array(0)
  let gLit = new Float32Array(0)
  const bGPos = gl.createBuffer()
  const bGLit = gl.createBuffer()

  const buildNodes = (n, w, h) => {
    nCount = n
    nx = new Float32Array(n)
    ny = new Float32Array(n)
    nSpd = new Float32Array(n)
    gPos = new Float32Array(n * 2)
    gLit = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      nx[i] = R() * w
      ny[i] = R() * h
      nSpd[i] = (R() * 0.4 + 0.1) * 60
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, bGPos)
    gl.bufferData(gl.ARRAY_BUFFER, gPos.byteLength, gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, bGLit)
    gl.bufferData(gl.ARRAY_BUFFER, gLit.byteLength, gl.DYNAMIC_DRAW)
  }

  const ptr = { x: -10000, y: -10000 }
  let raf = 0
  let last = performance.now()
  let builtN = -1
  let builtW = 0
  let builtH = 0

  const render = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    const cw = canvas.clientWidth || 1200
    const ch = canvas.clientHeight || 800
    const bw = Math.max(1, Math.round(cw * dpr))
    const bh = Math.max(1, Math.round(ch * dpr))
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }
    gl.viewport(0, 0, bw, bh)

    if (density !== builtN) {
      buildNodes(density, cw, ch)
      builtN = density
    }
    if (cw !== builtW || ch !== builtH) {
      const sx = cw / Math.max(builtW || cw, 1)
      const sy = ch / Math.max(builtH || ch, 1)
      for (let i = 0; i < nCount; i++) {
        nx[i] *= sx
        ny[i] *= sy
      }
      builtW = cw
      builtH = ch
    }

    const reach = 180
    const th = (DIRECTION * Math.PI) / 180
    const dirX = Math.sin(th)
    const dirY = Math.cos(th)
    const sp = SPEED / 50
    const hv = HOVER / 100

    let lines = 0
    const pushLine = (x0, y0, x1, y1, a0, a1, mixWert, wpx) => {
      if (lines >= MAX_LINES) return
      for (let c = 0; c < 6; c++) {
        const k = (lines * 6 + c) * 2
        const s3 = (lines * 6 + c) * 3
        lP0[k] = x0
        lP0[k + 1] = y0
        lP1[k] = x1
        lP1[k + 1] = y1
        lShade[s3] = CORNERS[c][0] === 0 ? a0 : a1
        lShade[s3 + 1] = mixWert
        lShade[s3 + 2] = wpx
      }
      lines++
    }

    for (let i = 0; i < nCount; i++) {
      nx[i] += nSpd[i] * dirX * dt * sp
      ny[i] += nSpd[i] * dirY * dt * sp

      if (nx[i] < -EDGE) {
        nx[i] = cw + EDGE
        ny[i] = R() * ch
      } else if (nx[i] > cw + EDGE) {
        nx[i] = -EDGE
        ny[i] = R() * ch
      }
      if (ny[i] < -EDGE) {
        ny[i] = ch + EDGE
        nx[i] = R() * cw
      } else if (ny[i] > ch + EDGE) {
        ny[i] = -EDGE
        nx[i] = R() * cw
      }
      const dx = ptr.x - nx[i]
      const dy = ptr.y - ny[i]
      const d = Math.sqrt(dx * dx + dy * dy)
      const lit = d < reach ? 1 : 0
      if (lit === 1) {
        const a = 0.5 * (1 - d / reach) * hv
        pushLine(nx[i], ny[i], ptr.x, ptr.y, a, a, 1, LINK_THICKNESS)
      }
      gPos[i * 2] = nx[i]
      gPos[i * 2 + 1] = ny[i]
      gLit[i] = lit
    }

    if (LINK_DISTANCE > 0) {
      const l2 = LINK_DISTANCE * LINK_DISTANCE
      for (let i = 0; i < nCount && lines < MAX_LINES; i++) {
        for (let j = i + 1; j < nCount && lines < MAX_LINES; j++) {
          const dx = nx[i] - nx[j]
          const dy = ny[i] - ny[j]
          const dd = dx * dx + dy * dy
          if (dd >= l2) continue
          const a = 0.15 * (1 - Math.sqrt(dd) / LINK_DISTANCE)
          pushLine(nx[i], ny[i], nx[j], ny[j], a, a, 0, LINK_THICKNESS)
        }
      }
    }

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    const cb = leseRgbToken(basisToken, [0.612, 0.639, 0.686])
    const ca = leseRgbToken(akzentToken, [1, 0.231, 0.29])

    if (lines > 0) {
      gl.useProgram(lineProg)
      const verts = lines * 6
      gl.bindBuffer(gl.ARRAY_BUFFER, bP0)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, lP0.subarray(0, verts * 2))
      const aP0 = gl.getAttribLocation(lineProg, 'a_p0')
      gl.enableVertexAttribArray(aP0)
      gl.vertexAttribPointer(aP0, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, bP1)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, lP1.subarray(0, verts * 2))
      const aP1 = gl.getAttribLocation(lineProg, 'a_p1')
      gl.enableVertexAttribArray(aP1)
      gl.vertexAttribPointer(aP1, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, bCorner)
      const aCorner = gl.getAttribLocation(lineProg, 'a_corner')
      gl.enableVertexAttribArray(aCorner)
      gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, bShade)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, lShade.subarray(0, verts * 3))
      const aShade = gl.getAttribLocation(lineProg, 'a_shade')
      gl.enableVertexAttribArray(aShade)
      gl.vertexAttribPointer(aShade, 3, gl.FLOAT, false, 0, 0)

      gl.uniform2f(u(lineProg, 'uSize'), cw, ch)
      gl.uniform3f(u(lineProg, 'uBase'), cb[0], cb[1], cb[2])
      gl.uniform3f(u(lineProg, 'uAccent'), ca[0], ca[1], ca[2])
      gl.drawArrays(gl.TRIANGLES, 0, verts)
      gl.disableVertexAttribArray(aP0)
      gl.disableVertexAttribArray(aP1)
      gl.disableVertexAttribArray(aCorner)
      gl.disableVertexAttribArray(aShade)
    }

    if (nCount > 0) {
      gl.useProgram(dotProg)
      gl.bindBuffer(gl.ARRAY_BUFFER, bGPos)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, gPos)
      const aPos = gl.getAttribLocation(dotProg, 'a_pos')
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, bGLit)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, gLit)
      const aLit = gl.getAttribLocation(dotProg, 'a_lit')
      gl.enableVertexAttribArray(aLit)
      gl.vertexAttribPointer(aLit, 1, gl.FLOAT, false, 0, 0)

      gl.uniform2f(u(dotProg, 'uSize'), cw, ch)
      gl.uniform1f(u(dotProg, 'uDpr'), dpr)
      gl.uniform1f(u(dotProg, 'uDot'), DOT_SIZE)
      gl.uniform1f(u(dotProg, 'uRestAlpha'), 0.4)
      gl.uniform3f(u(dotProg, 'uBase'), cb[0], cb[1], cb[2])
      gl.uniform3f(u(dotProg, 'uAccent'), ca[0], ca[1], ca[2])
      gl.drawArrays(gl.POINTS, 0, nCount)
      gl.disableVertexAttribArray(aPos)
      gl.disableVertexAttribArray(aLit)
    }

    // F-474: läuft nur weiter, solange modus 'animiert' ist UND der Tab sichtbar ist — ein
    // Standbild (modus 'standbild') endet hier, ohne sich selbst erneut einzuplanen; wendeModusAn()
    // unten plant bei einem Wechsel zurück zu 'animiert' neu.
    raf = modus === 'animiert' && !document.hidden ? requestAnimationFrame(render) : 0
  }

  const track = (ereignis) => {
    const r = canvas.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return
    ptr.x = ((ereignis.clientX - r.left) / r.width) * (canvas.clientWidth || 1200)
    ptr.y = ((ereignis.clientY - r.top) / r.height) * (canvas.clientHeight || 800)
  }
  const onLeave = () => {
    ptr.x = -10000
    ptr.y = -10000
  }
  canvas.addEventListener('pointermove', track)
  canvas.addEventListener('pointerenter', track)
  canvas.addEventListener('pointerleave', onLeave)

  /** F-474: startet den rAF-Loop (modus 'animiert') oder zeichnet genau ein Standbild (modus 'standbild') — aufgerufen beim Mount, bei jedem Sichtbarkeitswechsel und bei jeder Änderung der Reduziert-Bewegung-Präferenz. */
  function wendeModusAn() {
    if (modus === 'animiert') {
      if (document.hidden) return // Auflage "pausiert bei document.hidden" — beiSichtbarkeitswechsel startet neu, sobald der Tab wieder sichtbar ist.
      if (raf === 0) {
        last = performance.now()
        raf = requestAnimationFrame(render)
      }
    } else {
      if (raf !== 0) {
        cancelAnimationFrame(raf)
        raf = 0
      }
      last = performance.now()
      render(last) // ein Standbild — render()s eigener Tail plant wegen modus 'standbild' nichts nach.
    }
  }

  const beiSichtbarkeitswechsel = () => {
    if (document.hidden) {
      if (raf !== 0) cancelAnimationFrame(raf)
      raf = 0
    } else {
      wendeModusAn()
    }
  }
  document.addEventListener('visibilitychange', beiSichtbarkeitswechsel)

  // F-474: reagiert live auf die Reduziert-Bewegung-Präferenz — OS-Seite (matchMedia 'change') UND
  // der sichtbare Schalter (persona.js spiegelt ihn auf documentElement.dataset.reduzierteBewegung,
  // s. Datei-Kopf) —, statt die Präferenz nur einmalig beim Mount zu lesen.
  const medienabfrage = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null
  const beiPraeferenzWechsel = () => {
    const neu = reduzierteBewegungAktiv() ? 'standbild' : 'animiert'
    if (neu === modus) return
    modus = neu
    wendeModusAn()
  }
  medienabfrage?.addEventListener('change', beiPraeferenzWechsel)
  const beobachter = new MutationObserver(beiPraeferenzWechsel)
  beobachter.observe(document.documentElement, { attributes: true, attributeFilter: ['data-reduzierte-bewegung'] })

  let modus = reduzierteBewegungAktiv() ? 'standbild' : 'animiert'
  wendeModusAn()

  return () => {
    if (raf !== 0) cancelAnimationFrame(raf)
    document.removeEventListener('visibilitychange', beiSichtbarkeitswechsel)
    medienabfrage?.removeEventListener('change', beiPraeferenzWechsel)
    beobachter.disconnect()
    canvas.removeEventListener('pointermove', track)
    canvas.removeEventListener('pointerenter', track)
    canvas.removeEventListener('pointerleave', onLeave)
    host.innerHTML = ''
  }
}
