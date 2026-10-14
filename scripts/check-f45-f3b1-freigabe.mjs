/**
 * Datei: scripts/check-f45-f3b1-freigabe.mjs
 *
 * Zweck: Gate F45 F-3b-1a (Plugins aus Stefans Claude Code: gefilterte Kopie, Prüfbericht, Freigabe, Zuordnung je Rolle;
 * Plan features/F45/plan-f3b.md v2.1, Tabelle „Nachverfolgung“). Grün + kalibrierter Rotfall je Prüfung:
 * (a) Kopie enthält keine Hooks/MCP/LSP und keine Commands mit allowed-tools — je Art ein Rotfall (hooks/hooks.json, Hook und
 *     mcpServers in plugin.json, .lsp.json, Hooks im Frontmatter eines Skills und eines Agents, allowed-tools in Skill und
 *     Command, BOM/'--- '/Leerzeile vor dem Frontmatter, Sperrname, weitere SKILL.md, Link, binär, zu groß, > 3000 Dateien);
 * (b) Freigabe ohne Prüfbericht → 409; Bericht zu anderem Hash → 409; NICHT_GEEIGNET → 409; angezeigter ≠ geltender Bericht →
 *     409; mit Bericht → 200 und Kopie unter der Kopie-Wurzel; (b2) Reihenfolge N1: Ziel mit anderem Inhalt → 409, Bericht mit
 *     anderer Dateiliste → 409, stand nach dem Schreiben der Kopie geändert → 409 (Freigabe nicht geschrieben);
 * (c) Drift: übernommene Datei der Quelle geändert → veraltet + Freigabe 409; nicht übernommene geändert → bleibt freigegeben;
 *     Kopie geändert → kopie_veraendert; (c2) Vorrang bei zwei zutreffenden Zuständen;
 * (d) Zuordnung Standard leer, ohne Freigabe 409, mit Freigabe 200; (d2) Aktivierung nach Plugin-Freigabe erhält beide Felder;
 *     (d3) nur 'ausfuehrung' zuordenbar, Commands nicht;
 * (e) nichts unter dem simulierten ~/.claude geschrieben und das echte ~/.ai-workforce unverändert (lstat vorher/nachher);
 *     (e2) Kopie-Wurzel überlebt den Prüflauf, Prüfordner neutralisiert (`_.claude-plugin`), --add-dir ≠ Kopie-Wurzel;
 * (f) Lauf unverändert (seit F-3b-2: ohne Plugin-Zuordnung; der Lauf mit Plugins hat Gate f45-f3b2): baueAufruf ohne pluginDirs
 *     ohne --plugin-dir; pruefeInitZeile ohne Plugin-Soll weist init.plugins ≠ [] ab; der Server baut kein '--plugin-dir'-Literal; loeseAusfuehrungsEingabenAuf
 *     mit und ohne Plugin-Felder in der lokalen Datei bitgleich; kein Import von src/plugin-kopie bzw. src/claude-plugins in
 *     Gateway, Fähigkeiten-Start, Execution-Controller, Ort-B-Start; plugin_zuordnung/plugin_freigaben nur in erlaubten Dateien;
 *     setzePluginFreigabe nur aus routen-faehigkeiten.mjs aufgerufen;
 * (g) starteWorkflowSchritt( genau 6-mal im Server;
 * (j) Auftrag des Prüflaufs ohne Hook-Befehl, MCP-URL, args;
 * (k) Laufsperre nach dem asynchronen Abruf erneut geprüft (der Lauf beginnt in der Attrappe erst während des Abrufs);
 * (l) neuerer NICHT_GEEIGNET-Bericht zum freigegebenen Stand → „bericht_ueberholt“; Rücknahme ohne Freigabe 404;
 * (m) Plugin nicht mehr installiert: Freigabe und Zuordnung als „verwaist“ sichtbar und entfernbar;
 * (n) Fremdänderung der lokalen Datei (Einträge bleiben, nur Leerraum von außen) gemeldet; Rücknahme und Abwählen 409 mit dem Grund
 *     des Wächters, Datei unverändert;
 * (o) Werkzeugsatz null gilt als unbekannt (F-1094 (9)): Fakt sichtbar, keine Bewertung „im Werkzeugsatz“, kein Rückfall per ??
 *     (eigentlicher Nachweis ist der Laufzeitteil über einen Handler mit pluginWerkzeugsatz null; die Quelltext-Prüfung kennt nur
 *     die heutige Schreibweise);
 * (i) Rot-Selbsttest: jede Prüfung schlägt bei verfälschtem Eingang an.
 * (h) XSS (Teil 1b): Nutzlast in Prüfbericht (Befund, Auflage, Zusammenfassung, Urteil), Risiko-/Grund-Text, Namen, Abweichung,
 *     Aktionsfehler und verwaisten Einträgen (renderVerwaist) erscheint nur escaped.
 *
 * Wird aufgerufen von: npm run check
 *
 * Wichtig: Kein Netz, kein CLI-Start, kein Modell (Prüflauf mit Attrappe des Laufstarts). Fixtures unter tmpdir; lokale Datei,
 * Kopie-Wurzel und CLAUDE-Ordner sind Wegwerf-Ordner.
 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { sha256Hex, schreibeWirkungsmarke } from '../src/checkpoint-store/index.ts'
import { lesePluginOrdner } from '../src/claude-plugins/index.ts'
import { baueAufruf, pruefeInitZeile } from '../src/claude-code-gateway/index.ts'
import { aenderePluginZuordnung, ladeFaehigkeitenLokal, PLUGIN_ROLLEN, setzePluginFreigabe, validiereFaehigkeitenLokal } from '../src/faehigkeiten/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { bestimmeFreigabeZustand, leseKopieQuelle, projiziereKopie } from '../src/plugin-kopie/index.ts'
import { GRENZEN } from '../src/sammlung/inhalt.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { KRAFT_NICHT_UEBERNOMMEN, KRAFT_UEBERNOMMEN, legeKraftPluginAn, schreibeFixtureDatei } from './_plugin-kopie-fixture.ts'
import { renderPluginDetail, renderPluginWorkforce, renderVerwaist } from '../public/leitstand/plugins-anzeige.js'
import { erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'
import { aendereLokaleDatei, FREMD_UNBESTAETIGT } from './leitstand/routen-faehigkeiten.mjs'
import { fuehrePluginFreigabeDurch, pruefePluginKoerper } from './leitstand/routen-plugin-freigabe.mjs'

const befunde = []
console.log('\n=== F45-F-3b-1-Freigabe-Check ===\n')
const STILL = () => {}
const aufraeumen = []
process.on('exit', () => {
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
})
const ordner = (praefix) => {
  const pfad = mkdtempSync(join(tmpdir(), praefix))
  aufraeumen.push(pfad)
  return pfad
}
const warte = (ms) => new Promise((r) => setTimeout(r, ms))
/** Nutzlast für (h). */
const XSS = '<script>alert(1)</script>"><img src=x onerror=alert(2)>'
const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
const SATZ = vorlage.werkzeugsaetze.schreibend.erlaubte_werkzeuge
/** Ein Katalog-MCP für (d2): abschalten über die bestehende Aktivierungs-Route. */
const KATALOG_MCP = JSON.parse(readFileSync('ressourcen.json', 'utf8')).ressourcen.find((r) => r.typ === 'extern' && r.unterart === 'mcp')?.id

/**
 * lstat-Momentaufnahme eines Baums (Art, Größe, mtime) — Ordner und Dateien.
 * @param wurzel - Ordner (fehlt → '')
 * @returns Text
 */
function momentaufnahme(wurzel) {
  if (!existsSync(wurzel)) return ''
  const zeilen = []
  const gehe = (p, rel) => {
    for (const n of readdirSync(p).sort()) {
      const st = lstatSync(join(p, n))
      zeilen.push(`${rel}/${n}|${st.isDirectory() ? 'd' : st.isSymbolicLink() ? 'l' : 'f'}|${st.size}|${st.mtimeMs}`)
      if (st.isDirectory()) gehe(join(p, n), `${rel}/${n}`)
    }
  }
  gehe(wurzel, '')
  return zeilen.join('\n')
}

/**
 * Projektion eines Plugin-Ordners wie der Server.
 * @param pfad - Plugin-Ordner
 * @param satz - Werkzeugsatz
 * @returns Projektion
 */
async function projiziere(pfad, satz = SATZ) {
  const q = await leseKopieQuelle(pfad)
  if (!q.ok) return { ok: false, grund: q.grund, nicht_uebernommen: [] }
  return projiziereKopie({
    pluginId: 'kraft@markt',
    quelle: q.quelle,
    bestandteile: (await lesePluginOrdner(pfad)).bestandteile,
    werkzeugsatz: satz,
  })
}

// ─── (a) Kopie-Regeln (rein, mit Rotfällen) ───────────────────────────────────

/**
 * Prüft eine Projektion: keine Hook/MCP/LSP-Datei, kein Command/Skill mit allowed-tools, keine Sperrnamen; die erwarteten
 * Teile übernommen; jeder erwartete Ausschluss mit Grund.
 * @param p - Projektion
 * @param erwartet - { uebernommen, nicht }
 * @returns Befunde
 */
function pruefeKopie(p, erwartet) {
  const b = []
  if (!p.ok) return [`(a) Projektion nicht ok: ${p.grund}`]
  for (const d of p.dateien) {
    const n = d.pfad.toLowerCase()
    const text = d.bytes.toString('utf8')
    if (/(^|\/)hooks\/hooks\.json$|(^|\/)\.mcp\.json$|(^|\/)\.lsp\.json$|(^|\/)settings[^/]*\.json$/.test(n)) b.push(`(a) Kopie enthält ${d.pfad}`)
    if (n === '.claude-plugin/plugin.json') {
      const m = JSON.parse(text)
      for (const feld of Object.keys(m)) if (!['name', 'version', 'description', 'license'].includes(feld)) b.push(`(a) Manifest der Kopie trägt '${feld}'`)
    }
    if (/^(skills|agents|commands)\//.test(n)) {
      const kopf = text.replace(/^\uFEFF/, '').startsWith('---') ? text.split(/\r?\n---/)[0] : ''
      if (/allowed-tools\s*:/.test(kopf)) b.push(`(a) ${d.pfad} mit allowed-tools in der Kopie`)
      if (/^\s*hooks\s*:/m.test(kopf)) b.push(`(a) ${d.pfad} mit hooks im Frontmatter in der Kopie`)
      if (text.startsWith('\uFEFF')) b.push(`(a) ${d.pfad} mit BOM in der Kopie`)
    }
  }
  const ist = p.uebernommen.map((t) => `${t.typ}:${t.name}`)
  for (const u of erwartet.uebernommen) if (!ist.includes(u)) b.push(`(a) ${u} nicht übernommen`)
  for (const u of ist) if (!erwartet.uebernommen.includes(u)) b.push(`(a) ${u} unerwartet übernommen`)
  const nicht = p.nicht_uebernommen.map((t) => `${t.typ}:${t.name}:${t.grund}`)
  for (const n of erwartet.nicht) if (!nicht.includes(n)) b.push(`(a) Ausschluss ${n} fehlt`)
  return b
}

const FIXTURE = ordner('f45-f3b1-fixture-')
const KRAFT = legeKraftPluginAn(FIXTURE)
const ERWARTET_A = {
  uebernommen: [...KRAFT_UEBERNOMMEN],
  nicht: [...KRAFT_NICHT_UEBERNOMMEN],
}
let P_A = null
let P_VARIANTEN = null
let P_GRENZE = null
/** Dateien, die plugin_zuordnung/plugin_freigaben nennen dürfen (Lauf-Pfade gehören nicht dazu). */
const FELD_ERLAUBT = [
  'src/faehigkeiten/index.ts',
  'scripts/leitstand/routen-faehigkeiten.mjs',
  'src/faehigkeiten/types.ts',
  'scripts/leitstand/routen-plugin-freigabe.mjs',
  'scripts/leitstand-server.mjs',
  'src/plugin-kopie/index.ts',
  'src/plugin-kopie/types.ts',
  'public/leitstand/plugins-anzeige.js',
  'public/leitstand/views/plugins.js',
  'public/leitstand/api.js',
  // F45 F-3b-2: der Weg in den Lauf (Zuordnung der Rolle, Kennungen), Gate f45-f3b2.
  'src/plugin-lauf/index.ts',
]
/** Ergebnisse (l), (m), (n) für den Rot-Selbsttest. */
let L = null
let M = null
let NF = null
/** Ergebnis (o) Werkzeugsatz null. */
let O = null
/** Ergebnisse der Reihenfolge N1 (b2/k), für den Rot-Selbsttest. */
let N1 = null
/** Stand des echten ~/.ai-workforce (gesetzt in der Umgebung). */
let aiwStand = () => ''
try {
  P_A = await projiziere(KRAFT)
  const vorA = befunde.length
  befunde.push(...pruefeKopie(P_A, ERWARTET_A))
  // Varianten in einer eigenen Kopie: Frontmatter-Formen, Hooks im Frontmatter, Sperrnamen, Link, binär, zu groß.
  const v = legeKraftPluginAn(ordner('f45-f3b1-var-'))
  schreibeFixtureDatei(v, 'commands/leer.md', '--- \nallowed-tools: Bash(gh:*)\n---\n')
  schreibeFixtureDatei(v, 'commands/zeile.md', '\n---\nallowed-tools: Bash(gh:*)\n---\n')
  schreibeFixtureDatei(v, 'agents/haken.md', '---\nname: haken\ndescription: x\ntools: Read\nhooks:\n  PreToolUse: []\n---\n')
  schreibeFixtureDatei(v, 'skills/sperr/SKILL.md', '---\nname: sperr\ndescription: x\n---\n')
  schreibeFixtureDatei(v, 'skills/sperr/hooks/hooks.json', '{"hooks":{}}')
  schreibeFixtureDatei(v, 'skills/mcp/SKILL.md', '---\nname: mcp\ndescription: x\n---\n')
  schreibeFixtureDatei(v, 'skills/mcp/.mcp.json', '{}')
  schreibeFixtureDatei(v, 'skills/doppelt/SKILL.md', '---\nname: doppelt\ndescription: x\n---\n')
  schreibeFixtureDatei(v, 'skills/doppelt/x/SKILL.md', '---\nname: x\ndescription: x\n---\n')
  schreibeFixtureDatei(v, 'skills/bin/SKILL.md', '---\nname: bin\ndescription: x\n---\n')
  schreibeFixtureDatei(v, 'skills/bin/a.dat', Buffer.from([1, 0, 2]))
  schreibeFixtureDatei(v, 'skills/gross/SKILL.md', '---\nname: gross\ndescription: x\n---\n')
  schreibeFixtureDatei(v, 'skills/gross/a.txt', Buffer.alloc(GRENZEN.maxDateiBytes + 1, 0x61))
  schreibeFixtureDatei(v, 'skills/link/SKILL.md', '---\nname: link\ndescription: x\n---\n')
  let link = true
  try {
    symlinkSync(join(v, 'skills', 'debuggen'), join(v, 'skills', 'link', 'ziel'), 'junction')
  } catch {
    link = false
  }
  P_VARIANTEN = { p: await projiziere(v), link }
  const ERWARTET_V = {
    uebernommen: [...KRAFT_UEBERNOMMEN],
    nicht: [...KRAFT_NICHT_UEBERNOMMEN, 'command:leer:frontmatter_unklar', 'command:zeile:frontmatter_unklar', 'agent:haken:frontmatter_feld', 'skill:sperr:sperrname', 'skill:mcp:sperrname', 'skill:doppelt:weitere_skill_md', 'skill:bin:binaer', 'skill:gross:zu_gross', ...(link ? ['skill:link:link'] : [])],
  }
  befunde.push(...pruefeKopie(P_VARIANTEN.p, ERWARTET_V))
  const g = legeKraftPluginAn(ordner('f45-f3b1-grenze-'))
  for (let i = 0; i <= GRENZEN.maxDateien; i++) schreibeFixtureDatei(g, `skills/debuggen/t/d${i}.md`, 'x')
  P_GRENZE = await projiziere(g)
  if (P_GRENZE.ok) befunde.push('(a) mehr als 3000 übernommene Dateien gelten als kopierbar')
  if (befunde.length === vorA) console.log(`✓ (a) Kopie ohne Hooks/MCP/LSP/allowed-tools/BOM; ${KRAFT_UEBERNOMMEN.length} Teile übernommen, ${ERWARTET_V.nicht.length} Ausschlüsse mit Grund; > ${GRENZEN.maxDateien} Dateien nicht kopierbar.`)

  // ─── HTTP-Umgebung (Workforce-Instanz, Attrappen) ──────────────────────────
  const claudeOrdner = join(ordner('f45-f3b1-claude-'), 'claude')
  const pluginOrdner = join(claudeOrdner, 'plugins', 'cache', 'markt', 'kraft', '2.0.0')
  mkdirSync(join(pluginOrdner, '..'), { recursive: true })
  const quelleRoh = legeKraftPluginAn(ordner('f45-f3b1-q-'))
  const { cpSync } = await import('node:fs')
  cpSync(quelleRoh, pluginOrdner, { recursive: true })
  let listeJson = JSON.stringify([
    {
      id: 'kraft@markt',
      version: '2.0.0',
      scope: 'user',
      enabled: false,
      installPath: pluginOrdner,
    },
  ])
  const kopienWurzel = join(ordner('f45-f3b1-kopien-'), 'plugin-kopien')
  const lokalPfad = join(ordner('f45-f3b1-lokal-'), 'faehigkeiten.lokal.json')
  const basisVerzeichnis = `kontrollzustand-test-f45-f3b1-${randomUUID()}`
  aufraeumen.push(basisVerzeichnis)
  const install = ordner('f45-f3b1-install-')
  writeFileSync(join(install, 'ressourcen.json'), readFileSync('ressourcen.json'))
  const startvorlagePfad = join(install, 'startvorlage.json')
  writeFileSync(startvorlagePfad, readFileSync('startvorlagen/ai-workforce.json'))
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  const gesehen = {
    addDirs: null,
    ordnerInhalt: null,
    auftragstext: null,
    urteil: 'MIT_AUFLAGEN',
  }
  const fuehreAufgabeDurchFn = async (laufId, _p, eingaben) => {
    gesehen.addDirs = eingaben.aufrufEingaben.ortB?.addDirs ?? null
    const pruefOrdner = gesehen.addDirs?.[0]
    gesehen.ordnerInhalt = pruefOrdner === undefined ? null : readdirSync(pruefOrdner, { recursive: true }).map((p) => String(p).replaceAll('\\', '/'))
    gesehen.auftragstext = eingaben.auftragstext
    const version = /"gepinnte_version": "([^"]+)"/.exec(eingaben.auftragstext)?.[1]
    const e = {
      urteil: gesehen.urteil,
      typ: 'plugin',
      gepinnte_version: version,
      befunde: [
        {
          bereich: 'modell_anweisungen',
          schwere: 'mittel',
          beleg: 'skills/abschluss/SKILL.md: git merge',
        },
      ],
      auflagen: gesehen.urteil === 'MIT_AUFLAGEN' ? ['Nur Ausführung.'] : [],
      zusammenfassung: 'Gate.',
    }
    schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, { basisVerzeichnis, schreiber: STILL })
    const roh = join(basisVerzeichnis, `roh-${laufId}`)
    mkdirSync(roh, { recursive: true })
    const rohInhalt = JSON.stringify({
      stdout: JSON.stringify({ type: 'result', result: JSON.stringify(e) }),
    })
    writeFileSync(join(roh, 'rohstrom.json'), rohInhalt)
    registriereKernArtefakt(
      `laufakte-${laufId}`,
      profilReferenz,
      { erzeuger: 'kern', schritt: 'gate' },
      {
        laufakte_schema: 'v0',
        lauf_id: laufId,
        werkzeug_version_deklariert: 'gate',
        berechtigungskontext: 'gate',
        arbeitsverzeichnis_pfad: process.cwd(),
        modell_beobachtet: null,
        worker: 'claude-code',
        beobachtungsbasis_vollstaendig: true,
        rohstrom_referenz: {
          pfad: join(roh, 'rohstrom.json'),
          inhalts_hash: sha256Hex(rohInhalt),
        },
        erstellt_am: new Date().toISOString(),
      },
      [],
      { basisVerzeichnis, schreiber: STILL }
    )
    return {
      ok: true,
      klassifikation: { ergebnis: 'ERFOLGREICH' },
      laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' },
    }
  }
  const globalerLaufZustand = {
    aktiv: false,
    laufId: null,
    abortController: null,
  }
  const echtesAiw = join(homedir(), '.ai-workforce')
  // Advisor N2: nur, was unser Code dort schreiben könnte (andere Teile ändert ein laufender echter Leitstand legitim).
  aiwStand = () => `${momentaufnahme(join(echtesAiw, 'plugin-kopien'))}#${existsSync(join(echtesAiw, 'faehigkeiten.lokal.json')) ? lstatSync(join(echtesAiw, 'faehigkeiten.lokal.json')).mtimeMs : '-'}`
  const aiwVorher = aiwStand()
  const claudeVorher = momentaufnahme(claudeOrdner)
  const handler = erzeugeRequestHandler({
    basisVerzeichnis,
    fuehreAufgabeDurchFn,
    repoWurzel: install,
    installWurzel: install,
    startvorlagePfad,
    capWurzel: join(ordner('f45-f3b1-cap-'), 'cap'),
    laufausgabeWurzel: join(ordner('f45-f3b1-lauf-'), 'aus'),
    istWorkforceInstanz: true,
    globalerLaufZustand,
    faehigkeitenLokalPfad: lokalPfad,
    pluginListe: async () => ({ ok: true, stdout: listeJson }),
    faehigkeitenLokalWaechter: undefined,
    pluginClaudeOrdner: claudeOrdner,
    pluginKopienWurzel: kopienWurzel,
  })
  const server = createServer(handler)
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  const anfrage = async (methode, pfad, body) => {
    const a = await fetch(`${basisUrl}${pfad}`, {
      method: methode,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    return { status: a.status, inhalt: await a.json().catch(() => ({})) }
  }
  const stand = async () => {
    const g = await anfrage('GET', '/api/plugins')
    return {
      antwort: g.inhalt,
      plugin: g.inhalt.plugins?.find((p) => p.id === 'kraft@markt'),
    }
  }
  const pruefe = async () => {
    const s = await stand()
    const start = await anfrage('POST', '/api/plugins/pruefung', {
      plugin_id: 'kraft@markt',
      kopie_hash: s.plugin.workforce.kopie.kopie_hash,
    })
    if (start.status !== 202)
      return {
        fehler: `Prüfstart ${start.status} ${start.inhalt.grund ?? ''}`,
      }
    for (let i = 0; i < 200; i++) {
      const z = await anfrage('GET', `/api/sammlung/pruefung/${start.inhalt.laufId}`)
      if (z.inhalt.phase === 'fertig' || z.inhalt.phase === 'fehler') return z.inhalt
      await warte(30)
    }
    return { fehler: 'Zeitüberschreitung' }
  }
  try {
    // (b) ohne Bericht → 409
    const vorB = befunde.length
    const s0 = await stand()
    const w0 = s0.plugin?.workforce
    if (w0?.freigabe?.zustand !== 'keine' || w0?.kopie?.ok !== true) befunde.push(`(b) Ausgangsstand ${JSON.stringify(w0?.freigabe)}`)
    if (JSON.stringify(s0.antwort.workforce?.rollen) !== '["ausfuehrung"]') befunde.push('(d3) zuordenbare Rollen ≠ [ausfuehrung]')
    if (s0.antwort.workforce?.pruefen_hier !== true) befunde.push('(b) Workforce-Instanz meldet pruefen_hier ≠ true')
    const ohne = await anfrage('POST', '/api/plugins/freigabe', {
      plugin_id: 'kraft@markt',
      kopie_hash: w0.kopie.kopie_hash,
      pruefbericht: 'pruefbericht-p-x@1',
      stand: 'fehlt',
    })
    if (ohne.status !== 409) befunde.push(`(b) Freigabe ohne Bericht → ${ohne.status}`)
    if (existsSync(kopienWurzel)) befunde.push('(b) ohne Bericht wurde eine Kopie geschrieben')
    // Prüflauf (Attrappe) → Bericht
    const lauf = await pruefe()
    if (lauf.phase !== 'fertig') befunde.push(`(b) Prüflauf ${JSON.stringify(lauf)}`)
    // (e2) Prüfordner neutralisiert, nicht die Kopie-Wurzel; (j) ohne Befehle/URLs
    const vorE2 = befunde.length
    if (gesehen.addDirs === null || gesehen.addDirs.some((d) => d.startsWith(kopienWurzel))) befunde.push(`(e2) --add-dir des Prüflaufs = ${JSON.stringify(gesehen.addDirs)}`)
    if (!gesehen.ordnerInhalt?.includes('_.claude-plugin/plugin.json') || gesehen.ordnerInhalt.includes('.claude-plugin/plugin.json')) befunde.push(`(e2) Prüfordner nicht neutralisiert: ${JSON.stringify(gesehen.ordnerInhalt?.slice(0, 5))}`)
    if (existsSync(kopienWurzel)) befunde.push('(e2) der Prüflauf hat unter der Kopie-Wurzel geschrieben')
    if (gesehen.addDirs?.[0] !== undefined && existsSync(gesehen.addDirs[0])) befunde.push('(e2) Prüfordner nach dem Lauf nicht entfernt')
    if (befunde.length === vorE2) console.log('✓ (e2) Prüflauf auf neutralisierter Temp-Kopie (_.claude-plugin), --add-dir ≠ Kopie-Wurzel, Prüfordner danach entfernt.')
    const vorJ = befunde.length
    befunde.push(...pruefeAuftrag(gesehen.auftragstext))
    if (befunde.length === vorJ) console.log('✓ (j) Auftrag des Prüflaufs nennt nicht übernommene Teile ohne Befehl, URL und args.')
    const s1 = await stand()
    const bericht = s1.plugin.workforce.pruefbericht
    if (bericht?.passt !== true || bericht.urteil !== 'MIT_AUFLAGEN') befunde.push(`(b) Bericht in GET ${JSON.stringify(bericht)}`)
    // angezeigter ≠ geltender Bericht → 409
    const falsch = await anfrage('POST', '/api/plugins/freigabe', {
      plugin_id: 'kraft@markt',
      kopie_hash: w0.kopie.kopie_hash,
      pruefbericht: `${bericht.kennung.split('@')[0]}@99`,
      stand: 'fehlt',
    })
    if (falsch.status !== 409) befunde.push(`(b) anderer angezeigter Bericht → ${falsch.status}`)
    // falscher Hash → 409 (angezeigter Stand passt nicht)
    const andererHash = await anfrage('POST', '/api/plugins/freigabe', {
      plugin_id: 'kraft@markt',
      kopie_hash: 'f'.repeat(64),
      pruefbericht: bericht.kennung,
      stand: 'fehlt',
    })
    if (andererHash.status !== 409) befunde.push(`(b) anderer Hash → ${andererHash.status}`)
    // (k) Laufsperre aktiv → 409 schon vorab
    globalerLaufZustand.aktiv = true
    globalerLaufZustand.laufId = 'gate-sperre'
    const gesperrt = await anfrage('POST', '/api/plugins/freigabe', {
      plugin_id: 'kraft@markt',
      kopie_hash: w0.kopie.kopie_hash,
      pruefbericht: bericht.kennung,
      stand: 'fehlt',
    })
    globalerLaufZustand.aktiv = false
    globalerLaufZustand.laufId = null
    if (gesperrt.status !== 409) befunde.push(`(k) Freigabe während eines Laufs → ${gesperrt.status}`)
    // Freigabe → 200, Kopie geschrieben
    const frei = await anfrage('POST', '/api/plugins/freigabe', {
      plugin_id: 'kraft@markt',
      kopie_hash: w0.kopie.kopie_hash,
      pruefbericht: bericht.kennung,
      stand: 'fehlt',
    })
    if (frei.status !== 200) befunde.push(`(b) Freigabe mit Bericht → ${frei.status} ${frei.inhalt.grund ?? ''}`)
    const kopieOrdner = join(kopienWurzel, 'kraft@markt', w0.kopie.kopie_hash)
    if (!existsSync(join(kopieOrdner, '.claude-plugin', 'plugin.json'))) befunde.push('(b) Kopie nach der Freigabe fehlt')
    const lokal = ladeFaehigkeitenLokal(lokalPfad)
    if (lokal.zustand !== 'gueltig' || lokal.daten.plugin_freigaben?.['kraft@markt']?.pruefbericht !== bericht.kennung) befunde.push(`(b) Freigabe nicht in der lokalen Datei: ${JSON.stringify(lokal)}`)
    if (befunde.length === vorB) console.log('✓ (b) Freigabe ohne Bericht/mit anderem Bericht/Hash/während eines Laufs → 409; mit Bericht 200, Kopie unter der Kopie-Wurzel, Freigabe an Hash und Bericht gebunden.')

    // (d) Zuordnung
    const vorD = befunde.length
    const s2 = await stand()
    if (s2.plugin.workforce.freigabe.zustand !== 'freigegeben') befunde.push(`(c) nach Freigabe Zustand ${s2.plugin.workforce.freigabe.zustand}`)
    if (s2.plugin.workforce.zuordnung.length !== 0) befunde.push('(d) Zuordnung nach Freigabe nicht leer')
    const hashLokal = () => createHash('sha256').update(readFileSync(lokalPfad)).digest('hex')
    const zu = await anfrage('POST', '/api/plugins/zuordnung', {
      plugin_id: 'kraft@markt',
      rolle: 'ausfuehrung',
      typ: 'skill',
      name: 'debuggen',
      an: true,
      stand: hashLokal(),
    })
    if (zu.status !== 200) befunde.push(`(d) Zuordnung mit Freigabe → ${zu.status} ${zu.inhalt.grund ?? ''}`)
    const qa = await anfrage('POST', '/api/plugins/zuordnung', {
      plugin_id: 'kraft@markt',
      rolle: 'qa',
      typ: 'skill',
      name: 'debuggen',
      an: true,
    })
    if (qa.status !== 400) befunde.push(`(d3) Rolle qa → ${qa.status}`)
    const cmd = await anfrage('POST', '/api/plugins/zuordnung', {
      plugin_id: 'kraft@markt',
      rolle: 'ausfuehrung',
      typ: 'command',
      name: 'plan',
      an: true,
    })
    if (cmd.status !== 400) befunde.push(`(d3) Command zuordnen → ${cmd.status}`)
    const nichtUeb = await anfrage('POST', '/api/plugins/zuordnung', {
      plugin_id: 'kraft@markt',
      rolle: 'ausfuehrung',
      typ: 'skill',
      name: 'mit-hooks',
      an: true,
    })
    if (nichtUeb.status !== 409) befunde.push(`(d) nicht übernommener Skill zuordnen → ${nichtUeb.status}`)
    // (d2) Aktivierung über die bestehende Route erhält beide Felder
    const akt = await anfrage('POST', '/api/faehigkeiten/aktivierung', {
      eintrag: KATALOG_MCP,
      aktiv: false,
    })
    const nachAkt = ladeFaehigkeitenLokal(lokalPfad)
    if (akt.status !== 200) befunde.push(`(d2) Aktivierung → ${akt.status}`)
    if (nachAkt.daten?.plugin_freigaben?.['kraft@markt'] === undefined || JSON.stringify(nachAkt.daten?.projekte?.['ai-workforce']?.plugin_zuordnung ?? nachAkt.daten?.projekte?.[Object.keys(nachAkt.daten.projekte)[0]]?.plugin_zuordnung) !== JSON.stringify({ [PLUGIN_ROLLEN[0]]: ['skill:kraft@markt:debuggen'] }))
      befunde.push(`(d2) Felder nach Aktivierung: ${JSON.stringify(nachAkt.daten)}`)
    {
      const d2 = join(ordner('f45-f3b1-d2-'), 'faehigkeiten.lokal.json')
      writeFileSync(d2, readFileSync(lokalPfad))
      const e = aendereLokaleDatei(d2, 'ai-workforce', { art: 'freigabe', eintrag: 'agent:qa', hash: 'a'.repeat(64) }, undefined, null)
      const nach = ladeFaehigkeitenLokal(d2)
      if (!e.ok || nach.daten?.plugin_freigaben?.['kraft@markt'] === undefined || nach.daten?.projekte?.['ai-workforce']?.plugin_zuordnung === undefined) befunde.push(`(d2) Inhaltsfreigabe verliert Plugin-Felder: ${JSON.stringify(nach.daten ?? nach)}`)
    }
    if (befunde.length === vorD) console.log('✓ (d) Zuordnung Standard leer, mit Freigabe 200, nicht übernommener Skill 409; (d2) Aktivierung und Inhaltsfreigabe erhalten Freigabe und Zuordnung; (d3) Rolle qa und Commands 400.')

    // (c) Drift
    const vorC = befunde.length
    writeFileSync(join(pluginOrdner, 'README.md'), '# anders\n')
    writeFileSync(join(pluginOrdner, 'hooks', 'hooks.json'), '{"hooks":{}}')
    if ((await stand()).plugin.workforce.freigabe.zustand !== 'freigegeben') befunde.push('(c) Änderung nicht übernommener Dateien macht die Freigabe ungültig')
    writeFileSync(join(kopieOrdner, 'skills', 'debuggen', 'SKILL.md'), 'manipuliert')
    if ((await stand()).plugin.workforce.freigabe.zustand !== 'kopie_veraendert') befunde.push('(c) veränderte Kopie nicht erkannt')
    writeFileSync(join(kopieOrdner, 'skills', 'debuggen', 'SKILL.md'), readFileSync(join(quelleRoh, 'skills', 'debuggen', 'SKILL.md')))
    writeFileSync(join(pluginOrdner, 'skills', 'debuggen', 'SKILL.md'), '---\nname: debuggen\ndescription: geändert\n---\n')
    const s3 = await stand()
    if (s3.plugin.workforce.freigabe.zustand !== 'veraltet') befunde.push(`(c) geänderte Quelle → ${s3.plugin.workforce.freigabe.zustand}`)
    const zuVeraltet = await anfrage('POST', '/api/plugins/zuordnung', {
      plugin_id: 'kraft@markt',
      rolle: 'ausfuehrung',
      typ: 'agent',
      name: 'pruefer',
      an: true,
    })
    if (zuVeraltet.status !== 409) befunde.push(`(c) Zuordnung bei veralteter Freigabe → ${zuVeraltet.status}`)
    const freiVeraltet = await anfrage('POST', '/api/plugins/freigabe', {
      plugin_id: 'kraft@markt',
      kopie_hash: s3.plugin.workforce.kopie.kopie_hash,
      pruefbericht: bericht.kennung,
      stand: hashLokal(),
    })
    if (freiVeraltet.status !== 409) befunde.push(`(c) Freigabe der geänderten Quelle mit altem Bericht → ${freiVeraltet.status}`)
    // (c2) Vorrang: veraltet UND Kopie verändert → kopie_veraendert; quelle_fehlt vor allem
    writeFileSync(join(kopieOrdner, 'LICENSE'), 'anders')
    if ((await stand()).plugin.workforce.freigabe.zustand !== 'kopie_veraendert') befunde.push('(c2) Vorrang kopie_veraendert vor veraltet verletzt')
    if (
      bestimmeFreigabeZustand({
        aufloesung: 'fehlt',
        freigabe: undefined,
        aktuellerHash: null,
        berichtGefunden: false,
        kopieAbweichung: 'x',
      }) !== 'quelle_fehlt'
    )
      befunde.push('(c2) Vorrang quelle_fehlt verletzt')
    if (befunde.length === vorC) console.log('✓ (c) Drift: nicht übernommene Änderung bleibt freigegeben, Kopie verändert erkannt, geänderte Quelle → veraltet (Freigabe/Zuordnung 409); (c2) Vorrang.')
    // Rücknahme
    const zurueck = await anfrage('POST', '/api/plugins/freigabe/ruecknahme', {
      plugin_id: 'kraft@markt',
    })
    if (zurueck.status !== 200 || ladeFaehigkeitenLokal(lokalPfad).daten.plugin_freigaben !== undefined) befunde.push(`(b) Rücknahme → ${zurueck.status}`)
    const nochmal = await anfrage('POST', '/api/plugins/freigabe/ruecknahme', {
      plugin_id: 'kraft@markt',
    })
    if (nochmal.status !== 404) befunde.push(`(b) Rücknahme ohne Freigabe → ${nochmal.status} (erwartet 404, nichts geschrieben)`)
    // (l) Überholter Bericht: Quelle zurück, neue Freigabe (Mit Auflagen), danach NICHT_GEEIGNET zum selben Hash → bericht_ueberholt.
    writeFileSync(join(pluginOrdner, 'skills', 'debuggen', 'SKILL.md'), readFileSync(join(quelleRoh, 'skills', 'debuggen', 'SKILL.md')))
    writeFileSync(join(kopieOrdner, 'LICENSE'), readFileSync(join(quelleRoh, 'LICENSE')))
    gesehen.urteil = 'MIT_AUFLAGEN'
    await pruefe()
    const sNeu = await stand()
    const neu = await anfrage('POST', '/api/plugins/freigabe', {
      plugin_id: 'kraft@markt',
      kopie_hash: sNeu.plugin.workforce.kopie.kopie_hash,
      pruefbericht: sNeu.plugin.workforce.pruefbericht.kennung,
      stand: hashLokal(),
    })
    gesehen.urteil = 'NICHT_GEEIGNET'
    await pruefe()
    const sNg = await stand()
    const ng = await anfrage('POST', '/api/plugins/freigabe', {
      plugin_id: 'kraft@markt',
      kopie_hash: sNg.plugin.workforce.kopie.kopie_hash,
      pruefbericht: sNg.plugin.workforce.pruefbericht.kennung,
      stand: hashLokal(),
    })
    L = {
      neu: neu.status,
      zustand: sNg.plugin.workforce.freigabe.zustand,
      ng: ng.status,
      nochmal: nochmal.status,
    }
    const vorL = befunde.length
    befunde.push(...pruefeL(L))
    if (befunde.length === vorL) console.log('✓ (l) Neuerer NICHT_GEEIGNET-Bericht zum freigegebenen Stand → „Bericht überholt“, Freigabe 409; Rücknahme ohne Freigabe 404.')
    // (n) Fremdänderung: Freigabe und Zuordnung bleiben in der Datei, nur Leerraum kommt von außen dazu → der Wächter sperrt die
    // Schreibwege (QA-Nachpass N1: vorher scheiterten die Anfragen schon an fehlenden Einträgen, der Wächter wurde nie erreicht).
    const vorher = readFileSync(lokalPfad, 'utf8')
    writeFileSync(lokalPfad, `${vorher}\n`)
    const sF = await stand()
    const fz = await anfrage('POST', '/api/plugins/freigabe/ruecknahme', {
      plugin_id: 'kraft@markt',
    })
    const fa = await anfrage('POST', '/api/plugins/zuordnung', {
      plugin_id: 'kraft@markt',
      rolle: 'ausfuehrung',
      typ: 'skill',
      name: 'debuggen',
      an: false,
    })
    NF = {
      gemeldet: sF.antwort.workforce?.lokale_datei?.fremd === true,
      eintragDa: Object.hasOwn(ladeFaehigkeitenLokal(lokalPfad).daten?.plugin_freigaben ?? {}, 'kraft@markt'),
      ruecknahme: fz,
      zuordnung: fa,
      unveraendert: readFileSync(lokalPfad, 'utf8') === `${vorher}\n`,
    }
    const vorN = befunde.length
    befunde.push(...pruefeN(NF))
    if (befunde.length === vorN) console.log('✓ (n) Fremdänderung gemeldet; Rücknahme und Abwählen bestehender Einträge 409 mit dem Grund des Wächters, Datei unverändert.')
    // Stand bestätigen (Route der Fähigkeiten), damit (m) wieder schreiben kann.
    const best = await anfrage('POST', '/api/faehigkeiten/bestaetigung', {
      stand: hashLokal(),
    })
    if (best.status !== 200) befunde.push(`(n) Bestätigung der lokalen Datei → ${best.status} ${best.inhalt.grund ?? ''}`)
    // (m) Verwaist: Plugin nicht mehr in der Liste → Freigabe und Zuordnung sichtbar und entfernbar.
    listeJson = '[]'
    const sV = (await anfrage('GET', '/api/plugins')).inhalt
    const v = sV.workforce?.verwaist?.find((x) => x.plugin_id === 'kraft@markt')
    const vz = await anfrage('POST', '/api/plugins/zuordnung', {
      plugin_id: 'kraft@markt',
      rolle: 'ausfuehrung',
      typ: 'skill',
      name: 'debuggen',
      an: false,
      stand: hashLokal(),
    })
    const vr = await anfrage('POST', '/api/plugins/freigabe/ruecknahme', {
      plugin_id: 'kraft@markt',
      stand: hashLokal(),
    })
    M = {
      verwaist: v ?? null,
      zuordnung: vz.status,
      ruecknahme: vr.status,
      danach: (await anfrage('GET', '/api/plugins')).inhalt.workforce?.verwaist ?? null,
    }
    listeJson = JSON.stringify([
      {
        id: 'kraft@markt',
        version: '2.0.0',
        scope: 'user',
        enabled: false,
        installPath: pluginOrdner,
      },
    ])
    const vorM = befunde.length
    befunde.push(...pruefeM(M))
    if (befunde.length === vorM) console.log('✓ (m) Plugin nicht mehr installiert: Freigabe und Zuordnung sichtbar (verwaist) und entfernbar.')
  } finally {
    await new Promise((r) => server.close(r))
  }

  // ─── (b2) Reihenfolge N1 und (k) Laufsperre nach dem Abruf (Ablauf direkt, Attrappen) ──────────
  {
    const vor = befunde.length
    const q = legeKraftPluginAn(ordner('f45-f3b1-n1-'))
    const plugin = {
      id: 'kraft@markt',
      pfad: q,
      bestandteile: (await lesePluginOrdner(q)).bestandteile,
      risiken: [],
    }
    const p = await projiziere(q)
    const kennung = 'pruefbericht-p-kraft-markt-00000000@1'
    const dateien = p.dateien.map((d) => ({
      pfad: d.pfad,
      sha256: createHash('sha256').update(d.bytes).digest('hex'),
    }))
    const berichtMit = (liste) => [
      {
        artefakt_id: 'pruefbericht-p-kraft-markt-00000000',
        version: 1,
        daten: {
          quelle: {
            art: 'plugin',
            plugin_id: 'kraft@markt',
            kopie_hash: p.kopie_hash,
            plugin_version: null,
            commit: null,
          },
          ergebnis: { urteil: 'GEEIGNET' },
          erstellt_am: 'x',
          fakten: { uebersprungen: { je_grund: {}, liste: [] } },
          inhalt: { dateien: liste },
        },
      },
    ]
    let geschrieben = 0
    const ctx = (o) => ({
      leseBestand: async () => ({ status: 'ok', plugins: [plugin] }),
      werkzeugsatz: SATZ,
      berichte: () => berichtMit(dateien),
      kopienWurzel: join(ordner('f45-f3b1-n1k-'), 'k'),
      laufGesperrt: () => null,
      aendere: () => ++geschrieben && { ok: true, hash: 'x' },
      ...o,
    })
    const koerper = pruefePluginKoerper(
      {
        plugin_id: 'kraft@markt',
        kopie_hash: p.kopie_hash,
        pruefbericht: kennung,
      },
      'freigabe'
    )
    N1 = {}
    N1.gut = await fuehrePluginFreigabeDurch(koerper, ctx({}))
    N1.dateiliste = await fuehrePluginFreigabeDurch(koerper, ctx({ berichte: () => berichtMit(dateien.slice(1)) }))
    const zielWurzel = join(ordner('f45-f3b1-n1z-'), 'k')
    mkdirSync(join(zielWurzel, 'kraft@markt', p.kopie_hash), {
      recursive: true,
    })
    writeFileSync(join(zielWurzel, 'kraft@markt', p.kopie_hash, 'fremd.txt'), 'x')
    N1.ziel = await fuehrePluginFreigabeDurch(koerper, ctx({ kopienWurzel: zielWurzel }))
    // (k) Code-Review 2: der Lauf beginnt erst WÄHREND des asynchronen Abrufs — nur eine Prüfung nach dem await kann ihn sehen.
    let abgerufen = false
    N1.sperre = await fuehrePluginFreigabeDurch(
      koerper,
      ctx({
        leseBestand: async () => ((abgerufen = true), { status: 'ok', plugins: [plugin] }),
        laufGesperrt: () => (abgerufen ? 'ein Lauf ist aktiv' : null),
      })
    )
    // (b2) Code-Review 2: echte lokale Datei; sie ändert sich während des Abrufs → aendereLokaleDatei vergleicht den angezeigten
    // stand und schreibt nichts, die Kopie liegt (harmlos) da.
    const lokalN1 = join(ordner('f45-f3b1-n1l-'), 'faehigkeiten.lokal.json')
    writeFileSync(lokalN1, `${JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: {} }, null, 2)}\n`)
    const angezeigt = createHash('sha256').update(readFileSync(lokalN1)).digest('hex')
    const wurzelN1 = join(ordner('f45-f3b1-n1s-'), 'k')
    N1.stand = await fuehrePluginFreigabeDurch(
      { ...koerper, stand: angezeigt },
      ctx({
        kopienWurzel: wurzelN1,
        leseBestand: async () => {
          writeFileSync(lokalN1, `${JSON.stringify({ faehigkeiten_lokal_schema: 'v0', projekte: { x: { aus: ['a'] } } }, null, 2)}\n`)
          return { status: 'ok', plugins: [plugin] }
        },
        aendere: (aenderung, stand) => aendereLokaleDatei(lokalN1, 'gate', aenderung, stand, null),
      })
    )
    N1.standKopie = existsSync(join(wurzelN1, 'kraft@markt', p.kopie_hash))
    N1.standDatei = ladeFaehigkeitenLokal(lokalN1).daten?.plugin_freigaben === undefined
    N1.geschrieben = geschrieben
    befunde.push(...pruefeN1(N1))
    if (befunde.length === vor) console.log('✓ (b2) Reihenfolge N1: Bericht mit anderer Dateiliste, Ziel mit anderem Inhalt, stand nach dem Schreiben der Kopie → 409 ohne Freigabe; (k) Laufsperre nach dem Abruf erneut geprüft.')
  }

  // ─── (o) Werkzeugsatz null = unbekannt (F-1094 (9)) ───
  {
    const vor = befunde.length
    const claudeO = join(ordner('f45-f3b1-o-'), 'claude')
    const pluginO = join(claudeO, 'plugins', 'cache', 'markt', 'kraft', '2.0.0')
    mkdirSync(join(pluginO, '..'), { recursive: true })
    const { cpSync } = await import('node:fs')
    cpSync(legeKraftPluginAn(ordner('f45-f3b1-oq-')), pluginO, { recursive: true })
    const installO = ordner('f45-f3b1-oi-')
    writeFileSync(join(installO, 'ressourcen.json'), readFileSync('ressourcen.json'))
    const svO = join(installO, 'startvorlage.json')
    writeFileSync(svO, readFileSync('startvorlagen/ai-workforce.json'))
    const basisO = `kontrollzustand-test-f45-f3b1-o-${randomUUID()}`
    aufraeumen.push(basisO)
    const handlerO = erzeugeRequestHandler({ basisVerzeichnis: basisO, repoWurzel: installO, installWurzel: installO, startvorlagePfad: svO, capWurzel: join(ordner('f45-f3b1-oc-'), 'cap'), laufausgabeWurzel: join(ordner('f45-f3b1-ol-'), 'aus'), globalerLaufZustand: { aktiv: false, laufId: null, abortController: null }, pluginListe: async () => ({ ok: true, stdout: JSON.stringify([{ id: 'kraft@markt', version: '2.0.0', scope: 'user', enabled: false, installPath: pluginO }]) }), pluginClaudeOrdner: claudeO, pluginWerkzeugsatz: null })
    const serverO = createServer(handlerO)
    await new Promise((res) => serverO.listen(0, '127.0.0.1', res))
    try {
      const antwort = await (await fetch(`http://127.0.0.1:${serverO.address().port}/api/plugins`)).json()
      const k = antwort.plugins?.find((x) => x.id === 'kraft@markt')
      O = { risiken: k?.risiken ?? [], uebernommen: k?.workforce?.kopie?.uebernommen ?? [], nicht: k?.workforce?.kopie?.nicht_uebernommen ?? [], quelle: leseQuellen()['scripts/leitstand-server.mjs'] }
    } finally {
      await new Promise((res) => serverO.close(res))
    }
    befunde.push(...pruefeO(O))
    if (befunde.length === vor) console.log('✓ (o) Werkzeugsatz null gilt als unbekannt: Risiko-Fakt sichtbar, keine Bewertung „im Werkzeugsatz“, Agents nicht übernommen, kein Rückfall per ?? auf die eigene Startvorlage.')
  }

  // ─── (e) Schreibwirkung ───
  {
    const vor = befunde.length
    if (!nurQuellAenderungen(claudeVorher, momentaufnahme(claudeOrdner))) befunde.push('(e) unter dem simulierten ~/.claude hat sich mehr geändert als die vom Gate selbst geänderten Quelldateien')
    if (aiwStand() !== aiwVorher) befunde.push('(e) im echten ~/.ai-workforce haben sich plugin-kopien oder faehigkeiten.lokal.json während des Gates geändert')
    if (befunde.length === vor) console.log('✓ (e) unter dem simulierten ~/.claude nur die vom Gate geänderten Quelldateien, echtes ~/.ai-workforce unverändert.')
  }

  // ─── (f) Lauf unverändert ───
  {
    const vor = befunde.length
    befunde.push(...pruefeLaufUnveraendert(leseQuellen()))
    befunde.push(...pruefeArgvBitgleich())
    if (befunde.length === vor) console.log('✓ (f) baueAufruf ohne --plugin-dir, init.plugins ≠ [] abgewiesen, Start mit/ohne Plugin-Felder bitgleich, kein Import im Lauf, Felder nur in erlaubten Dateien.')
  }
  // ─── (h) XSS des Workforce-Abschnitts ───
  {
    const vor = befunde.length
    befunde.push(...pruefeXss(xssHtml()))
    if (befunde.length === vor) console.log('✓ (h) XSS: Prüfbericht, Risiko-/Grund-Texte, Namen, Abweichung und Aktionsfehler im Workforce-Abschnitt nur escaped.')
  }
  // ─── (g) ───
  {
    const n = leseQuellen()['scripts/leitstand-server.mjs'].split('starteWorkflowSchritt(').length - 1
    if (n !== 6) befunde.push(`(g) starteWorkflowSchritt( steht ${n}-mal im Server statt 6-mal`)
    else console.log('✓ (g) starteWorkflowSchritt( genau 6-mal im Server.')
  }
} catch (fehler) {
  befunde.push(`Gate abgebrochen: ${fehler.stack ?? fehler.message}`)
}

/**
 * Änderungen unter dem simulierten ~/.claude, die das Gate selbst an der Quelle vorgenommen hat (README, hooks.json, SKILL.md).
 * @param vorher - Momentaufnahme
 * @param nachher - Momentaufnahme
 * @returns true, wenn nur diese Pfade abweichen
 */
function nurQuellAenderungen(vorher, nachher) {
  const a = new Map(vorher.split('\n').map((z) => [z.split('|')[0], z]))
  const b = new Map(nachher.split('\n').map((z) => [z.split('|')[0], z]))
  const erlaubt = /\/kraft\/2\.0\.0(\/README\.md|\/hooks\/hooks\.json|\/skills\/debuggen\/SKILL\.md|\/hooks|\/skills\/debuggen|\/skills|)$/
  for (const k of new Set([...a.keys(), ...b.keys()])) if (a.get(k) !== b.get(k) && !erlaubt.test(k)) return false
  return true
}

/**
 * Auftrag des Prüflaufs: keine Hook-Befehle, MCP-URLs oder args aus nicht übernommenen Teilen.
 * @param text - Auftragstext
 * @returns Befunde
 */
function pruefeAuftrag(text) {
  if (typeof text !== 'string') return ['(j) Auftragstext fehlt']
  const b = []
  for (const verboten of ['run-hook', 'hooks/run', 'mcp.example.invalid', 'node nach.js', 'typescript-language-server', '--stdio']) if (text.includes(verboten)) b.push(`(j) Auftrag enthält '${verboten}'`)
  if (!/hook SessionStart \(hook_nie\)/.test(text)) b.push('(j) Auftrag nennt den nicht übernommenen Hook nicht mit Art/Name/Grund')
  return b
}

/**
 * (l) Bericht überholt.
 * @param l - { neu, zustand, ng, nochmal }
 * @returns Befunde
 */
function pruefeL(l) {
  const b = []
  if (l.neu !== 200) b.push(`(l) erneute Freigabe → ${l.neu}`)
  if (l.zustand !== 'bericht_ueberholt') b.push(`(l) neuerer NICHT_GEEIGNET zum selben Hash → ${l.zustand}`)
  if (l.ng !== 409) b.push(`(l) Freigabe mit NICHT_GEEIGNET → ${l.ng}`)
  if (l.nochmal !== 404) b.push(`(l) Rücknahme ohne Freigabe → ${l.nochmal} (erwartet 404)`)
  return b
}

/**
 * (m) Verwaiste Einträge.
 * @param m - { verwaist, zuordnung, ruecknahme, danach }
 * @returns Befunde
 */
function pruefeM(m) {
  const b = []
  if (m.verwaist === null || m.verwaist.freigabe === null || !m.verwaist.zuordnung.some((z) => z.name === 'debuggen')) b.push(`(m) verwaiste Einträge fehlen: ${JSON.stringify(m.verwaist)}`)
  if (m.zuordnung !== 200 || m.ruecknahme !== 200) b.push(`(m) Entfernen verwaister Einträge → ${m.zuordnung}/${m.ruecknahme}`)
  if (!Array.isArray(m.danach) || m.danach.length !== 0) b.push('(m) nach dem Entfernen noch verwaiste Einträge')
  return b
}

/**
 * (n) Fremdänderung: gemeldet, beide Schreibwege 409 mit dem Grund des Wächters, Datei unverändert, Einträge noch da.
 * @param n - { gemeldet, eintragDa, ruecknahme, zuordnung, unveraendert }
 * @returns Befunde
 */
function pruefeN(n) {
  const b = []
  if (!n.gemeldet) b.push('(n) Fremdänderung nicht gemeldet')
  if (!n.eintragDa) b.push('(n) Freigabe fehlt vor dem Schreibversuch (Test wirkungslos)')
  for (const [name, a] of [
    ['Rücknahme', n.ruecknahme],
    ['Abwählen', n.zuordnung],
  ]) {
    if (a?.status !== 409 || !String(a?.inhalt?.grund ?? '').includes(FREMD_UNBESTAETIGT)) b.push(`(n) ${name} bei Fremdänderung → ${a?.status} ${a?.inhalt?.grund ?? ''}`)
  }
  if (!n.unveraendert) b.push('(n) lokale Datei trotz Fremdänderung geschrieben')
  return b
}

/**
 * (o) Werkzeugsatz null (F-1094 (9)): Fakt „unbekannt“ sichtbar, keine Bewertung gegen einen Werkzeugsatz, Agents nicht
 * übernommen (werkzeugsatz_unbestimmt), im Server kein Rückfall per ?? auf die eigene Startvorlage.
 * @param o - { risiken, uebernommen, nicht, quelle }
 * @returns Befunde
 */
function pruefeO(o) {
  const b = []
  if (!o.risiken.some((x) => x.art === 'rechte_nicht_bestimmbar' && x.bestandteil === 'plugin' && /unbekannt/.test(x.text))) b.push('(o) Werkzeugsatz unbekannt nicht als Risiko-Fakt sichtbar')
  if (o.risiken.some((x) => x.art === 'rechte_ausserhalb' || (x.art === 'agent_werkzeuge' && /nicht im Werkzeugsatz/.test(x.text)))) b.push('(o) Bewertung gegen einen Werkzeugsatz trotz unbekanntem Werkzeugsatz')
  if (o.uebernommen.some((t) => t.typ === 'agent')) b.push('(o) Agent trotz unbekanntem Werkzeugsatz übernommen')
  if (!o.nicht.some((n) => n.typ === 'agent' && n.grund === 'werkzeugsatz_unbestimmt')) b.push('(o) Agent ohne Grund „Werkzeugsatz nicht bestimmbar“')
  if (/pluginWerkzeugsatz\s*\?\?/.test(o.quelle) || !/pluginWerkzeugsatz !== undefined \? pluginWerkzeugsatz :/.test(o.quelle)) b.push('(o) Server fällt bei Werkzeugsatz null auf die eigene Startvorlage zurück (??)')
  return b
}

/**
 * Ergebnisse der Reihenfolge N1.
 * @param n - { gut, dateiliste, ziel, sperre, stand, geschrieben }
 * @returns Befunde
 */
function pruefeN1(n) {
  const b = []
  if (n.gut?.ok !== true) b.push(`(b2) Grünfall nicht ok: ${JSON.stringify(n.gut)}`)
  if (n.dateiliste?.status !== 409) b.push(`(b2) Bericht mit anderer Dateiliste → ${JSON.stringify(n.dateiliste)}`)
  if (n.ziel?.status !== 409) b.push(`(b2) Ziel mit anderem Inhalt → ${JSON.stringify(n.ziel)}`)
  if (n.sperre?.status !== 409) b.push(`(k) Laufsperre nach dem Abruf → ${JSON.stringify(n.sperre)}`)
  if (n.stand?.status !== 409) b.push(`(b2) stand geändert → ${JSON.stringify(n.stand)}`)
  if (n.standKopie !== true || n.standDatei !== true) b.push('(b2) bei geändertem stand: Kopie fehlt oder Freigabe doch geschrieben')
  if (n.geschrieben !== 1) b.push(`(b2) Freigabe ${n.geschrieben}-mal geschrieben statt nur im Grünfall`)
  return b
}

/**
 * Quelltexte für (f)/(g).
 * @returns Pfad → Text
 */
function leseQuellen() {
  const pfade = ['scripts/leitstand-server.mjs', 'src/claude-code-gateway/index.ts', 'src/faehigkeiten/start.ts', 'src/execution-controller/index.ts', 'src/ressourcen/ort-b-start.ts']
  const q = Object.fromEntries(pfade.map((p) => [p, readFileSync(p, 'utf8')]))
  const alle = []
  const gehe = (dir) => {
    for (const n of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${n.name}`
      if (n.isDirectory()) gehe(p)
      else if (/\.(ts|mjs|js)$/.test(n.name) && !/\.test\./.test(n.name)) alle.push(p)
    }
  }
  for (const d of ['src', 'scripts/leitstand', 'public/leitstand']) gehe(d)
  alle.push('scripts/leitstand-server.mjs')
  q.__alle = Object.fromEntries(alle.map((p) => [p, readFileSync(p, 'utf8')]))
  return q
}

/**
 * Invarianten des Laufs (F-3b-1 ändert keinen Lauf).
 * @param q - Quelltexte
 * @returns Befunde
 */
function pruefeLaufUnveraendert(q) {
  const b = []
  const t = baueAufruf({
    modell: 'm',
    werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: SATZ },
    prompt: 'p',
  })
  if (t.includes('--plugin-dir')) b.push('(f) baueAufruf erzeugt --plugin-dir')
  const grund = pruefeInitZeile(
    {
      type: 'system',
      subtype: 'init',
      tools: [],
      mcp_servers: [],
      slash_commands: [],
      skills: [],
      agents: [],
      plugins: [{ name: 'kraft', path: '/x', source: 'kraft@inline' }],
    },
    {
      skills: [],
      mcpServer: [],
      slashCommandsReferenz: new URL('../src/claude-code-gateway/slash-commands-referenz.json', import.meta.url),
    }
  )
  if (grund === null || !/plugins/.test(grund)) b.push('(f) pruefeInitZeile lässt init.plugins ≠ [] zu')
  for (const p of ['src/claude-code-gateway/index.ts', 'src/faehigkeiten/start.ts', 'src/execution-controller/index.ts', 'src/ressourcen/ort-b-start.ts']) {
    if (/from ['"][^'"]*(plugin-kopie|claude-plugins)[^'"]*['"]/.test(q[p])) b.push(`(f) ${p} importiert plugin-kopie/claude-plugins`)
  }
  // F45 F-3b-2: der Server reicht nur pluginDirs weiter; ein eigenes '--plugin-dir'-Literal wäre ein zweiter Argv-Bau.
  if (/['"`]--plugin-dir['"`]/.test(q['scripts/leitstand-server.mjs'])) b.push('(f) Server baut --plugin-dir selbst')
  for (const [p, text] of Object.entries(q.__alle)) {
    if (/plugin_zuordnung|plugin_freigaben/.test(text) && !FELD_ERLAUBT.includes(p)) b.push(`(f) ${p} nennt plugin_zuordnung/plugin_freigaben`)
    if (/setzePluginFreigabe\(/.test(text) && p !== 'scripts/leitstand/routen-faehigkeiten.mjs' && p !== 'src/faehigkeiten/index.ts') b.push(`(f) setzePluginFreigabe( in ${p}`)
  }
  // In loeseAusfuehrungsEingabenAuf (Lauf-Start) kein Bezug auf Plugin-Felder.
  const start = q['scripts/leitstand-server.mjs'].indexOf('export function loeseAusfuehrungsEingabenAuf(')
  const ende = q['scripts/leitstand-server.mjs'].indexOf('\nexport function', start + 10)
  if (/plugin_zuordnung|plugin_freigaben|plugin-kopie/.test(q['scripts/leitstand-server.mjs'].slice(start, ende))) b.push('(f) loeseAusfuehrungsEingabenAuf liest Plugin-Felder')
  return b
}

/**
 * Start der Ausführung mit und ohne Plugin-Felder in der lokalen Datei → bitgleiche Tokens (Muster check-f45-f1 (a)).
 * @param mitDatei - optional verfälschte zweite Datei (Rotfall)
 * @returns Befunde
 */
function pruefeArgvBitgleich(mitDatei) {
  const wurzel = ordner('f45-f3b1-argv-')
  mkdirSync(join(wurzel, '.claude', 'agents'), { recursive: true })
  writeFileSync(join(wurzel, '.claude', 'agents', 'qa.md'), '---\nname: qa\ndescription: QA\ntools: Read, Grep\n---\nText\n')
  const qaHash = createHash('sha256')
    .update(readFileSync(join(wurzel, '.claude', 'agents', 'qa.md')))
    .digest('hex')
  const basis = {
    faehigkeiten_lokal_schema: 'v0',
    projekte: {
      gate: { an: ['agent:qa'], inhalt_freigaben: { 'agent:qa': qaHash } },
    },
  }
  const mit =
    mitDatei ??
    aenderePluginZuordnung(
      setzePluginFreigabe(basis, 'kraft@markt', {
        kopie_hash: 'a'.repeat(64),
        pruefbericht: 'pruefbericht-p-kraft-markt-00000000@1',
        freigegeben_am: 'x',
      }),
      'gate',
      'ausfuehrung',
      'skill:kraft@markt:debuggen',
      true
    )
  if (mitDatei === undefined && validiereFaehigkeitenLokal(mit).length > 0) return [`(f) Plugin-Datei ungültig: ${validiereFaehigkeitenLokal(mit).join('; ')}`]
  const starte = (inhalt) => {
    const pfad = join(ordner('f45-f3b1-argvl-'), 'faehigkeiten.lokal.json')
    writeFileSync(pfad, JSON.stringify(inhalt))
    const lokal = ladeFaehigkeitenLokal(pfad)
    const roh = {
      rolle: 'ausfuehrung',
      anfragen: [],
      budget: vorlage.standardBudget,
      aufrufEingaben: { modell: 'claude-sonnet-5' },
      auftragId: 'gate',
    }
    const kennungen = lokal.zustand === 'gueltig' ? [`agent:qa@${qaHash}`] : []
    return loeseAusfuehrungsEingabenAuf(roh, 'schreibend', 'AUFTRAG', vorlage, wurzel, {
      leseAusfuehrungsVorbedingung: () => ({ ok: true }),
      faehigkeitenKontext: {
        lokal,
        lokalPfad: pfad,
        projektId: 'gate',
        katalog: new Map(),
        deaktiviert: [],
        angezeigteProjektKennungen: kennungen,
      },
    })
  }
  const a = starte(basis)
  const b = starte(mit)
  if (!a.ok || !b.ok) return [`(f) Start abgelehnt: ${a.grund ?? b.grund}`]
  const tokens = (e) =>
    JSON.stringify(
      baueAufruf({
        ...e.eingaben.aufrufEingaben,
        prompt: e.eingaben.auftragstext,
      })
    )
  if (tokens(a) !== tokens(b)) return ['(f) Start mit Plugin-Feldern nicht bitgleich']
  if (JSON.stringify(a.eingaben.faehigkeitenImLauf) !== JSON.stringify(b.eingaben.faehigkeitenImLauf)) return ['(f) Fähigkeiten im Lauf mit Plugin-Feldern anders']
  return []
}

/**
 * Workforce-Abschnitt und Detail mit Nutzlast in jedem Routenwert.
 * @returns HTML
 */
function xssHtml() {
  const plugin = {
    id: XSS,
    name: XSS,
    risiken: [{ art: 'text_veroeffentlichen', bestandteil: XSS, text: XSS }],
    bestandteile: {
      skills: [],
      agents: [],
      commands: [],
      hooks: [],
      mcp: [],
      lsp: [],
    },
    fehler: [],
    workforce: {
      kopie: {
        ok: true,
        kopie_hash: XSS,
        grund: null,
        uebernommen: [{ typ: 'skill', name: XSS, pfad: XSS }],
        nicht_uebernommen: [{ typ: XSS, name: XSS, grund: XSS, detail: XSS }],
      },
      freigabe: {
        zustand: XSS,
        kopie_hash: XSS,
        pruefbericht: XSS,
        freigegeben_am: XSS,
        abweichung: XSS,
      },
      pruefbericht: {
        kennung: XSS,
        kopie_hash: XSS,
        urteil: XSS,
        befunde: [{ bereich: XSS, schwere: XSS, beleg: XSS }],
        auflagen: [XSS],
        zusammenfassung: XSS,
        erstellt_am: XSS,
        passt: false,
      },
      freigabe_sperre: XSS,
      zuordnung: [{ rolle: XSS, typ: 'skill', name: XSS }],
    },
  }
  const antwort = {
    status: 'ok',
    plugins: [plugin],
    eingebaut: [],
    instanz_pfad: XSS,
    quelle: { befehl: XSS },
    workforce: {
      rollen: [XSS],
      lokale_datei: { zustand: 'gueltig', grund: null, stand: XSS },
      lauf_sperre: { aktiv: false },
    },
  }
  const ohneKopie = {
    ...plugin,
    workforce: {
      ...plugin.workforce,
      kopie: { ok: false, grund: XSS, uebernommen: [], nicht_uebernommen: [] },
    },
  }
  const verwaist = {
    ...antwort,
    workforce: {
      ...antwort.workforce,
      verwaist: [
        {
          plugin_id: XSS,
          freigabe: { kopie_hash: XSS, freigegeben_am: XSS },
          zuordnung: [{ rolle: XSS, typ: XSS, name: XSS }],
        },
      ],
    },
  }
  return [
    renderPluginDetail(antwort, 0, {
      [XSS]: { art: 'x', phase: 'fehler', grund: XSS },
    }),
    renderPluginWorkforce(antwort, ohneKopie, 0, null),
    renderVerwaist(verwaist, {
      [XSS]: { art: 'x', phase: 'fehler', grund: XSS },
    }),
  ].join('\n')
}

/**
 * Kein rohes <script/<img und kein Attribut-Einbruch.
 * @param html - gerendertes HTML
 * @returns Befunde
 */
function pruefeXss(html) {
  const b = []
  if (/<script|<img/i.test(html)) b.push('(h) Nutzlast erscheint roh im Workforce-Abschnitt')
  if (/"><img|" onerror=/i.test(html)) b.push('(h) Attribut-Einbruch im Workforce-Abschnitt')
  if (!/&lt;script&gt;/.test(html)) b.push('(h) Nutzlast fehlt ganz (Test wirkungslos)')
  return b
}

// ─── (i) Rot-Selbsttest ──────────────────────────────────────────────────────
{
  const rot = []
  const kurz = (b) => b.length > 0
  if (P_A !== null && P_A.ok) {
    const mitDatei = (pfad, inhalt) => ({
      ...P_A,
      dateien: [...P_A.dateien, { pfad, bytes: Buffer.from(inhalt) }],
    })
    rot.push(['hooks/hooks.json in der Kopie', kurz(pruefeKopie(mitDatei('hooks/hooks.json', '{}'), ERWARTET_A))])
    rot.push(['.mcp.json in der Kopie', kurz(pruefeKopie(mitDatei('.mcp.json', '{}'), ERWARTET_A))])
    rot.push(['.lsp.json in der Kopie', kurz(pruefeKopie(mitDatei('.lsp.json', '{}'), ERWARTET_A))])
    rot.push(['Command mit allowed-tools', kurz(pruefeKopie(mitDatei('commands/x.md', '---\nallowed-tools: Bash(gh:*)\n---\n'), ERWARTET_A))])
    rot.push(['Skill mit allowed-tools', kurz(pruefeKopie(mitDatei('skills/x/SKILL.md', '---\nname: x\nallowed-tools: Read\n---\n'), ERWARTET_A))])
    rot.push(['Hooks im Agent-Frontmatter', kurz(pruefeKopie(mitDatei('agents/x.md', '---\nname: x\nhooks:\n  a: 1\n---\n'), ERWARTET_A))])
    rot.push(['BOM in der Kopie', kurz(pruefeKopie(mitDatei('commands/b.md', '\uFEFF---\n---\n'), ERWARTET_A))])
    rot.push([
      'Hook in plugin.json der Kopie',
      kurz(
        pruefeKopie(
          {
            ...P_A,
            dateien: P_A.dateien.map((d) => (d.pfad === '.claude-plugin/plugin.json' ? { ...d, bytes: Buffer.from('{"name":"kraft","hooks":{}}') } : d)),
          },
          ERWARTET_A
        )
      ),
    ])
    rot.push([
      'mcpServers in plugin.json der Kopie',
      kurz(
        pruefeKopie(
          {
            ...P_A,
            dateien: P_A.dateien.map((d) =>
              d.pfad === '.claude-plugin/plugin.json'
                ? {
                    ...d,
                    bytes: Buffer.from('{"name":"kraft","mcpServers":{}}'),
                  }
                : d
            ),
          },
          ERWARTET_A
        )
      ),
    ])
    rot.push([
      'Ausschluss fehlt',
      kurz(
        pruefeKopie(
          {
            ...P_A,
            nicht_uebernommen: P_A.nicht_uebernommen.filter((n) => n.grund !== 'hook_nie'),
          },
          ERWARTET_A
        )
      ),
    ])
    rot.push([
      'Teil unerwartet übernommen',
      kurz(
        pruefeKopie(
          {
            ...P_A,
            uebernommen: [...P_A.uebernommen, { typ: 'command', name: 'review', pfad: 'commands/review.md' }],
          },
          ERWARTET_A
        )
      ),
    ])
  } else rot.push(['(a) Grundlage fehlt', false])
  rot.push(['Auftrag mit Hook-Befehl', kurz(pruefeAuftrag('hook SessionStart (hook_nie) "${CLAUDE_PLUGIN_ROOT}/hooks/run" start'))])
  rot.push(['Auftrag mit MCP-URL', kurz(pruefeAuftrag('hook SessionStart (hook_nie) https://mcp.example.invalid/mcp'))])
  rot.push(['Auftrag ohne Ausschluss', kurz(pruefeAuftrag('nichts'))])
  if (N1 !== null) {
    rot.push(['N1 Dateiliste ok', kurz(pruefeN1({ ...N1, dateiliste: { ok: true } }))])
    rot.push(['N1 Ziel ok', kurz(pruefeN1({ ...N1, ziel: { ok: true } }))])
    rot.push(['Laufsperre übergangen', kurz(pruefeN1({ ...N1, sperre: { ok: true } }))])
    rot.push(['Freigabe doppelt geschrieben', kurz(pruefeN1({ ...N1, geschrieben: 2 }))])
    if (L !== null) {
      rot.push(['(l) Zustand nicht überholt', kurz(pruefeL({ ...L, zustand: 'freigegeben' }))])
      rot.push(['(l) Rücknahme ohne Freigabe schreibt', kurz(pruefeL({ ...L, nochmal: 200 }))])
    }
    if (M !== null) {
      rot.push(['(m) verwaist unsichtbar', kurz(pruefeM({ ...M, verwaist: null }))])
      rot.push(['(m) Entfernen scheitert', kurz(pruefeM({ ...M, ruecknahme: 409 }))])
    }
    if (NF !== null) {
      rot.push([
        '(n) Sperre aus anderem Grund',
        kurz(
          pruefeN({
            ...NF,
            zuordnung: {
              status: 409,
              inhalt: { grund: 'keine gültige Freigabe' },
            },
          })
        ),
      ])
      rot.push(['(n) Einträge fehlten', kurz(pruefeN({ ...NF, eintragDa: false }))])
      rot.push(['(n) Datei geschrieben', kurz(pruefeN({ ...NF, unveraendert: false }))])
    }
    if (O !== null) {
      rot.push(['(o) Rückfall per ??', kurz(pruefeO({ ...O, quelle: O.quelle.replace('pluginWerkzeugsatz !== undefined ? pluginWerkzeugsatz :', 'pluginWerkzeugsatz ??') }))])
      rot.push(['(o) Fakt fehlt', kurz(pruefeO({ ...O, risiken: O.risiken.filter((x) => x.bestandteil !== 'plugin') }))])
      rot.push(['(o) Bewertung im Satz', kurz(pruefeO({ ...O, risiken: [...O.risiken, { art: 'rechte_ausserhalb', bestandteil: 'skill:x', text: 'x' }] }))])
      rot.push(['(o) Grund werkzeugsatz_unbestimmt fehlt', kurz(pruefeO({ ...O, nicht: O.nicht.filter((n) => n.grund !== 'werkzeugsatz_unbestimmt') }))])
      rot.push(['(o) Agent-Werkzeuge gegen einen Satz bewertet', kurz(pruefeO({ ...O, risiken: [...O.risiken, { art: 'agent_werkzeuge', bestandteil: 'agent:pruefer', text: "tools Grep nicht im Werkzeugsatz 'schreibend'" }] }))])
      rot.push(['(o) Agent übernommen', kurz(pruefeO({ ...O, uebernommen: [...O.uebernommen, { typ: 'agent', name: 'pruefer', pfad: 'agents/pruefer.md' }] }))])
    }
    rot.push(['Freigabe trotz geändertem stand', kurz(pruefeN1({ ...N1, standDatei: false }))])
  }
  const q = leseQuellen()
  rot.push([
    'Import im Gateway',
    kurz(
      pruefeLaufUnveraendert({
        ...q,
        'src/claude-code-gateway/index.ts': `${q['src/claude-code-gateway/index.ts']}\nimport { x } from '../plugin-kopie/index.ts'`,
      })
    ),
  ])
  rot.push([
    '--plugin-dir im Server',
    kurz(
      pruefeLaufUnveraendert({
        ...q,
        'scripts/leitstand-server.mjs': `${q['scripts/leitstand-server.mjs']}\nargs.push('--plugin-dir', x)`,
      })
    ),
  ])
  rot.push([
    'plugin_zuordnung im Fähigkeiten-Start',
    kurz(
      pruefeLaufUnveraendert({
        ...q,
        __alle: {
          ...q.__alle,
          'src/faehigkeiten/start.ts': 'plugin_zuordnung',
        },
      })
    ),
  ])
  rot.push([
    'setzePluginFreigabe außerhalb',
    kurz(
      pruefeLaufUnveraendert({
        ...q,
        __alle: {
          ...q.__alle,
          'scripts/leitstand-server.mjs': `${q.__alle['scripts/leitstand-server.mjs']}\nsetzePluginFreigabe(`,
        },
      })
    ),
  ])
  rot.push(['XSS roh', kurz(pruefeXss(`${xssHtml()}<script>x</script>`))])
  rot.push(['XSS Attribut-Einbruch', kurz(pruefeXss(`${xssHtml()}<a title="" onerror=x>`))])
  rot.push(['XSS-Nutzlast fehlt', kurz(pruefeXss('<p>leer</p>'))])
  rot.push([
    'Argv-Datei ungültig wirkt',
    kurz(
      pruefeArgvBitgleich({
        faehigkeiten_lokal_schema: 'v0',
        projekte: { gate: { an: [] } },
      })
    ),
  ])
  const verfehlt = rot.filter(([, erkannt]) => !erkannt).map(([name]) => name)
  if (verfehlt.length > 0) befunde.push(`(i) Rot-Selbsttest nicht erkannt: ${verfehlt.join(', ')}`)
  else console.log(`✓ (i) Rot-Selbsttest: ${rot.length} verfälschte Eingänge erkannt.`)
}

if (befunde.length > 0) {
  console.error('\n✗ Befunde:')
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
