/**
 * Datei: scripts/check-f45-b2a3b-review-stand.mjs
 *
 * Zweck: Gate F45 B2a-3b (geprüfter Stand und „Review veraltet“, Befehlsblöcke im Leitstand, Restpunkte F-1085 (6)/(11);
 * Plan features/F45/plan-b2a3b.md v2, Codex-Review-Spec §9.6). Grün
 * (a) Wegwerf-Repo, beide Hüllen von src/review-stand (dazu CRLF in HEAD bei text=auto und autocrlf=true, und der
 *     Ausschluss im Fingerabdruck selbst): gleicher Stand → nicht veraltet; Datei geändert, neue unverfolgte
 *     Datei, Datei gelöscht → veraltet; Änderung nur in kontrollzustand/, nur berührt (mtime), Commit derselben Inhalte
 *     (anderer commit) → nicht veraltet; sync = async; je Aufruf .git/index (Bytes + mtime) und .git/objects unverändert.
 * (b) Über den echten HTTP-Pfad (Attrappe für fuehreAufgabeDurch wie f45-b2a3, spiegelt eingaben.review in die Laufakte):
 *     der Review-Schritt bekommt review.geprueft_stand = Fingerabdruck des Repos zum Start; eine Laufakte mit diesem review
 *     ist gültig.
 * (c) GET …/abnahme, Projektion urteil: offene Abnahme, Ordner unverändert → veraltet false; Datei danach geändert → true;
 *     kein Repo mehr an der Wurzel → null mit stand_grund; Laufakte ohne geprueft_stand (alter Lauf) → null mit Grund;
 *     Abnahme entschieden → nicht berechnet (null ohne Grund).
 * (d) sicherBefehle/pruefstandBefehle: jeder Block in Blockform („& {“, Set-Location -LiteralPath auf den Projektpfad mit
 *     -ErrorAction Stop, …, „}“ — F45 B2b-4a-2a), push in eigenem Block, ohne origin ein Block, ohne Pfad ein Grund.
 * (e) F-1085 (11): Befund mit leerer fundstelle/zusammenfassung/beleg → drei Hinweise, kein Halt; F-1085 (6): nach
 *     ANPASSUNG_ANGEFORDERT und zweitem Bau folgt die Projektion dem neuesten Review-Lauf (laufId, Befund, geprueft_stand).
 * (f) Quelltext: starteWorkflowSchritt( genau 6-mal im Server; leseGeprueftenStandSync( genau einmal; der Vergleich in
 *     GET …/abnahme nimmt den Laufort über ermittleLaufort (fail-closed), nicht laufwurzelFuer (Advisor N2).
 * Rot (Selbsttest, kalibriert)
 * (g) Jede Prüfung aus (a)–(f) schlägt bei einem verfälschten Eingang an.
 *
 * Wird aufgerufen von: npm run check
 *
 * Wichtig: Kein Netz, kein CLI-Start. Wegwerf-Repos und Kontrollzustand unter tmpdir. Die Prüffunktionen sind rein und
 * nehmen ihre Eingänge als Werte — so kann (g) jede mit einem verfälschten Eingang aufrufen.
 */

import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pruefstandBefehle, sicherBefehle } from '../public/leitstand/code-daten.js'
import { validiereLaufakteDaten } from '../src/claude-code-gateway/index.ts'
import { fuehreGitSync } from '../src/git-starter/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { pruefeReviewErgebnis, REVIEW_POLICY_VERSION } from '../src/review-policy/index.ts'
import { fingerabdruckAusTeilen, leseGeprueftenStandAsync, leseGeprueftenStandSync, standIstVeraltet } from '../src/review-stand/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B2a-3b-Review-Stand-Check ===\n')

// ─── Reine Prüffunktionen ─────────────────────────────────────────────────────

/**
 * (a) Prüft die Fälle des Fingerabdrucks gegen ihre Erwartung.
 * @param faelle - [{ name, erwartet, geprueft, aktuell }]
 * @param vergleich - Vergleichsfunktion (Standard standIstVeraltet)
 * @returns Befunde
 */
function pruefeFaelle(faelle, vergleich = standIstVeraltet) {
  const b = []
  for (const f of faelle) {
    const ist = vergleich(f.geprueft, f.aktuell)
    if (ist !== f.erwartet) b.push(`(a) ${f.name}: veraltet ${ist}, erwartet ${f.erwartet}`)
  }
  return b
}

/**
 * (a) Der Fingerabdruck selbst nimmt kontrollzustand/ heraus (verfolgt geändert und neu) — echte Teile, nachgerechnet.
 * @param istAusnahme - Ausnahmeregel (Standard die des Moduls; der Rotfall gibt () => false)
 * @returns Befunde
 */
function pruefeAusschluss(istAusnahme = undefined) {
  const baum = new Map([
    ['src/a.ts', 'a'.repeat(40)],
    ['kontrollzustand/alt.json', 'b'.repeat(40)],
  ])
  const vorher = fingerabdruckAusTeilen({ commit: 'c'.repeat(40), baum, geloescht: [], gehasht: new Map() }, istAusnahme)
  const nachher = fingerabdruckAusTeilen(
    {
      commit: 'c'.repeat(40),
      baum,
      geloescht: [],
      gehasht: new Map([
        ['kontrollzustand/alt.json', 'd'.repeat(40)],
        ['kontrollzustand/neu.json', 'e'.repeat(40)],
      ]),
    },
    istAusnahme
  )
  return standIstVeraltet(vorher, nachher) === false ? [] : ['(a) Fingerabdruck zählt Änderungen unter kontrollzustand/']
}

/**
 * Misst .git/index (sha256 der Bytes, mtime) und die Liste unter .git/objects.
 * @param wurzel - Repo
 * @returns Messung
 */
function messe(wurzel) {
  const index = join(wurzel, '.git', 'index')
  const objekte = []
  const lauf = (ordner) => {
    for (const e of readdirSync(ordner, { withFileTypes: true })) e.isDirectory() ? lauf(join(ordner, e.name)) : objekte.push(join(ordner, e.name))
  }
  lauf(join(wurzel, '.git', 'objects'))
  return { index: createHash('sha256').update(readFileSync(index)).digest('hex'), mtime: statSync(index).mtimeMs, objekte: objekte.sort().join('\n') }
}

/**
 * (a) Prüft, dass ein Fingerabdruck-Aufruf nichts geschrieben hat.
 * @param name - Fall
 * @param vorher - Messung
 * @param nachher - Messung
 * @returns Befunde
 */
function pruefeLesend(name, vorher, nachher) {
  const b = []
  if (vorher.index !== nachher.index || vorher.mtime !== nachher.mtime) b.push(`(a) ${name}: .git/index verändert`)
  if (vorher.objekte !== nachher.objekte) b.push(`(a) ${name}: neue Datei unter .git/objects`)
  return b
}

/**
 * (c) Prüft die Stand-Felder einer Projektion.
 * @param name - Fall
 * @param urteil - abnahme.urteil
 * @param erwartet - { veraltet, grund: true (Text erwartet) | false (null erwartet) }
 * @returns Befunde
 */
function pruefeProjektion(name, urteil, erwartet) {
  const b = []
  if (urteil?.status !== 'ok') return [`(c) ${name}: urteil.status ${urteil?.status}`]
  for (const feld of ['geprueft_stand', 'aktueller_stand', 'veraltet', 'stand_grund']) if (!(feld in urteil)) b.push(`(c) ${name}: Feld ${feld} fehlt`)
  if (urteil.veraltet !== erwartet.veraltet) b.push(`(c) ${name}: veraltet ${urteil.veraltet}, erwartet ${erwartet.veraltet}`)
  const hatGrund = typeof urteil.stand_grund === 'string' && urteil.stand_grund !== ''
  if (hatGrund !== erwartet.grund) b.push(`(c) ${name}: stand_grund ${JSON.stringify(urteil.stand_grund)}`)
  return b
}

/**
 * (d) Prüft Befehlsblöcke in Blockform (F45 B2b-4a-2a): Kopf „& {“, Ortszeile auf den Pfad, Fuß „}“; push nur in einem
 * eigenen Block (genau [Kopf, Ort, push, Fuß]).
 * @param name - Fall
 * @param befehle - Ergebnis mit bloecke
 * @param ort - erwartete Ortszeile
 * @param anzahl - erwartete Blockzahl
 * @returns Befunde
 */
function pruefeBloecke(name, befehle, ort, anzahl) {
  const b = []
  if (!Array.isArray(befehle?.bloecke)) return [`(d) ${name}: keine Blöcke (${JSON.stringify(befehle)})`]
  if (befehle.bloecke.length !== anzahl) b.push(`(d) ${name}: ${befehle.bloecke.length} Blöcke, erwartet ${anzahl}`)
  for (const [i, block] of befehle.bloecke.entries()) {
    if (block[0] !== '& {' || block[1] !== ort || block.at(-1) !== '}') b.push(`(d) ${name}: Block ${i + 1} nicht in Blockform mit ${ort}`)
    if (block.some((z) => z.startsWith('git push')) && block.length !== 4) b.push(`(d) ${name}: push nicht in einem eigenen Block`)
  }
  return b
}

/**
 * (e) F-1085 (11): leere Pflichtwerte aus v1 werden Hinweise, kein Halt.
 * @param pruefe - Prüffunktion (Standard pruefeReviewErgebnis)
 * @returns Befunde
 */
function pruefeElf(pruefe = pruefeReviewErgebnis) {
  const r = pruefe({ befunde: [{ id: 'B1', dimension: 'bugs', evidenz: 'confirmed', korrekturrichtung: 'x', schwere: 'MITTEL', fundstelle: '', zusammenfassung: '', beleg: '' }], empfehlung: 'Korrektur' })
  const b = []
  if (r.halt.length > 0) b.push('(e) (11) leere Pflichtwerte halten an')
  for (const feld of ['fundstelle', 'zusammenfassung', 'beleg']) if (!r.hinweise.some((h) => h.includes(`'${feld}' fehlt`))) b.push(`(e) (11) kein Hinweis für leere ${feld}`)
  return b
}

/**
 * (f) Quelltext des Servers.
 * @param server - Text von scripts/leitstand-server.mjs
 * @returns Befunde
 */
function pruefeServerQuelltext(server) {
  const b = []
  const zaehle = (muster) => server.split(muster).length - 1
  // Zählweise wie f45-b2a3 (g): jedes Vorkommen im Quelltext, Definition eingeschlossen.
  if (zaehle('starteWorkflowSchritt(') !== 6) b.push(`(f) starteWorkflowSchritt( ${zaehle('starteWorkflowSchritt(')}-mal im Server (erwartet 6, wie f45-b2a3)`)
  if (zaehle('leseGeprueftenStandSync(') !== 1) b.push(`(f) leseGeprueftenStandSync( ${zaehle('leseGeprueftenStandSync(')}-mal im Server statt einmal`)
  const start = server.indexOf('async function vergleicheReviewStand(')
  const koerper = start < 0 ? '' : server.slice(start, server.indexOf('\n  }\n', start))
  if (!koerper.includes('ermittleLaufort(') || koerper.includes('laufwurzelFuer(')) b.push('(f) GET …/abnahme vergleicht nicht über ermittleLaufort (fail-closed)')
  return b
}

// ─── (d), (e) (11), (f) — rein ───────────────────────────────────────────────

const PFAD = String.raw`C:\Users\stefa\Projekte\mein projekt`
const ORT = String.raw`Set-Location -LiteralPath 'C:\Users\stefa\Projekte\mein projekt' -ErrorAction Stop`
const ROUTE = {
  status: 'ok',
  absoluterPfad: PFAD,
  branch: { status: 'ok', name: 'feat/f45-b2a3b-review-stand', losgeloest: false },
  remoteWebUrl: { status: 'ok', url: null, origin: true },
  dateien: { status: 'ok', eintraege: [{ pfad: 'src/a.ts', art: 'M', xy: ' M' }], anzahl: 1, gekappt: false },
  startvorlage: { status: 'ok', pruefbefehl: 'npm run check' },
}
const SERVER = readFileSync('scripts/leitstand-server.mjs', 'utf8')
{
  const vor = befunde.length
  befunde.push(...pruefeBloecke('Sichern', sicherBefehle(ROUTE), ORT, 2))
  befunde.push(...pruefeBloecke('Sichern ohne origin', sicherBefehle({ ...ROUTE, remoteWebUrl: { status: 'ok', url: null, origin: false } }), ORT, 1))
  befunde.push(...pruefeBloecke('Prüfstand', pruefstandBefehle(ROUTE), ORT, 1))
  if (sicherBefehle({ ...ROUTE, absoluterPfad: undefined }).grund !== 'keinPfad' || pruefstandBefehle({ ...ROUTE, absoluterPfad: 'relativ' }).grund !== 'keinPfad') befunde.push('(d) ohne absoluten Pfad kein Grund')
  if (befunde.length === vor) console.log('✓ (d) Befehlsblöcke in Blockform (& { Set-Location … }), push getrennt, ohne origin ein Block, ohne Pfad ein Grund (Sichern und Prüfstand).')
}
{
  const vor = befunde.length
  befunde.push(...pruefeElf())
  befunde.push(...pruefeServerQuelltext(SERVER))
  if (befunde.length === vor) console.log('✓ (e11/f) leere fundstelle/zusammenfassung/beleg → Hinweise ohne Halt; starteWorkflowSchritt( 6-mal, leseGeprueftenStandSync( einmal, GET über ermittleLaufort.')
}

// ─── (a) Wegwerf-Repo ─────────────────────────────────────────────────────────

const basis = mkdtempSync(join(tmpdir(), 'b2a3b-stand-'))
/** Fälle aus (a) — auch Eingang der Rotfälle. */
const FAELLE = []
let MESSUNG = null
try {
  const git = (wurzel, ...argumente) => fuehreGitSync(argumente, { cwd: wurzel, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  /**
   * Legt ein Wegwerf-Git-Repo an (Branch gate, ein Commit).
   * @param name - Ordnername
   * @returns Pfad
   */
  function legeRepoAn(name, autocrlf = 'false') {
    const wurzel = join(basis, name)
    mkdirSync(join(wurzel, 'src'), { recursive: true })
    mkdirSync(join(wurzel, 'kontrollzustand'), { recursive: true })
    for (const argumente of [['init', '--quiet'], ['config', 'user.email', 'gate@example.invalid'], ['config', 'user.name', 'Gate'], ['config', 'core.autocrlf', autocrlf], ['checkout', '--quiet', '-b', 'gate']]) git(wurzel, ...argumente)
    writeFileSync(join(wurzel, 'src', 'a.ts'), 'export const a = 1\n')
    writeFileSync(join(wurzel, 'README.md'), '# Gate\n')
    writeFileSync(join(wurzel, 'CLAUDE.md'), readFileSync('CLAUDE.md', 'utf8'))
    // Eine verfolgte Datei unter kontrollzustand/ (wie im echten Repo): ihre Änderung darf nicht zählen.
    writeFileSync(join(wurzel, 'kontrollzustand', 'alt.json'), '{"v":1}\n')
    git(wurzel, 'add', '--', 'src/a.ts', 'README.md', 'CLAUDE.md', 'kontrollzustand/alt.json')
    git(wurzel, 'commit', '--quiet', '-m', 'init')
    return wurzel
  }

  const repo = legeRepoAn('a-faelle')
  /**
   * Fingerabdruck beider Hüllen, je Aufruf gemessen.
   * @param name - Fall
   * @param wurzel - Repo (Standard das Fall-Repo)
   * @returns Stand (sync), Befund bei Abweichung
   */
  async function standVon(name, wurzel = repo) {
    const vorher = messe(wurzel)
    const sync = leseGeprueftenStandSync(wurzel)
    const mitte = messe(wurzel)
    const asynchron = await leseGeprueftenStandAsync(wurzel)
    const nachher = messe(wurzel)
    befunde.push(...pruefeLesend(`${name} (sync)`, vorher, mitte), ...pruefeLesend(`${name} (async)`, mitte, nachher))
    if (MESSUNG === null) MESSUNG = { vorher, nachher }
    if (JSON.stringify(sync) !== JSON.stringify(asynchron)) befunde.push(`(a) ${name}: sync ${JSON.stringify(sync)} ≠ async ${JSON.stringify(asynchron)}`)
    if (sync.stand === null) befunde.push(`(a) ${name}: Stand nicht bestimmbar (${sync.grund})`)
    return sync.stand
  }
  const s0 = await standVon('Ausgang')
  FAELLE.push({ name: 'gleicher Stand', erwartet: false, geprueft: s0, aktuell: await standVon('gleicher Stand') })
  const t = new Date(Date.now() + 10_000)
  utimesSync(join(repo, 'src', 'a.ts'), t, t)
  FAELLE.push({ name: 'nur berührt', erwartet: false, geprueft: s0, aktuell: await standVon('nur berührt') })
  mkdirSync(join(repo, 'kontrollzustand', 'lauf-x'), { recursive: true })
  writeFileSync(join(repo, 'kontrollzustand', 'lauf-x', 'laufakte.json'), '{}')
  writeFileSync(join(repo, 'kontrollzustand', 'alt.json'), '{"v":2}\n')
  FAELLE.push({ name: 'nur kontrollzustand/', erwartet: false, geprueft: s0, aktuell: await standVon('nur kontrollzustand/') })
  writeFileSync(join(repo, 'src', 'a.ts'), 'export const a = 2\n')
  const sGeaendert = await standVon('Datei geändert')
  FAELLE.push({ name: 'Datei geändert', erwartet: true, geprueft: s0, aktuell: sGeaendert })
  writeFileSync(join(repo, 'src', 'neu.ts'), 'export const n = 1\n')
  const sNeu = await standVon('neue Datei')
  FAELLE.push({ name: 'neue unverfolgte Datei', erwartet: true, geprueft: sGeaendert, aktuell: sNeu })
  git(repo, 'add', '--', 'src/a.ts', 'src/neu.ts')
  git(repo, 'commit', '--quiet', '-m', 'sichern')
  const sCommit = await standVon('nach Commit')
  if (sCommit?.commit === sNeu?.commit) befunde.push('(a) Commit ohne neuen commit-Wert — Fall ohne Aussage')
  FAELLE.push({ name: 'nur Commit derselben Inhalte', erwartet: false, geprueft: sNeu, aktuell: sCommit })
  rmSync(join(repo, 'README.md'))
  FAELLE.push({ name: 'Datei gelöscht', erwartet: true, geprueft: sCommit, aktuell: await standVon('Datei gelöscht') })
  // Advisor N3 / Code-Review 3: beide CRLF-Lagen — CRLF-Blob in HEAD bei text=auto, und autocrlf=true mit LF in HEAD.
  const crlf = legeRepoAn('a-crlf-head')
  writeFileSync(join(crlf, 'c.txt'), 'a\r\nb\r\n')
  git(crlf, 'add', '--', 'c.txt')
  git(crlf, 'commit', '--quiet', '-m', 'crlf')
  writeFileSync(join(crlf, '.gitattributes'), '* text=auto eol=lf\n')
  git(crlf, 'add', '--', '.gitattributes')
  git(crlf, 'commit', '--quiet', '-m', 'attr')
  const sCrlf = await standVon('CRLF in HEAD', crlf)
  utimesSync(join(crlf, 'c.txt'), t, t)
  FAELLE.push({ name: 'CRLF in HEAD, nur berührt', erwartet: false, geprueft: sCrlf, aktuell: await standVon('CRLF in HEAD, berührt', crlf) })
  const lf = legeRepoAn('a-autocrlf', 'true')
  const sLf = await standVon('autocrlf, LF in HEAD', lf)
  writeFileSync(join(lf, 'README.md'), '# Gate\r\n')
  utimesSync(join(lf, 'README.md'), t, t)
  FAELLE.push({ name: 'autocrlf, CRLF im Arbeitsbaum', erwartet: false, geprueft: sLf, aktuell: await standVon('autocrlf, CRLF im Arbeitsbaum', lf) })
  const vor = befunde.length
  befunde.push(...pruefeFaelle(FAELLE), ...pruefeAusschluss())
  if (befunde.length === vor) console.log(`✓ (a) Fingerabdruck: ${FAELLE.length} Fälle wie erwartet (veraltet nur bei echtem Inhalt), sync = async, .git/index und .git/objects je Aufruf unverändert.`)

  // ─── (b), (c), (e6) über den HTTP-Pfad ─────────────────────────────────────
  const basisVerzeichnis = join(basis, 'kontrollzustand')
  const vorlageRoh = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const startvorlagePfad = join(basis, 'startvorlage.json')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlageRoh, worker: { codex: { startziel: [String.raw`C:\b2a3b-dummy\codex.exe`], versionDeklariert: 'codex-cli-fixture', sandbox: 'read-only' } } }))
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }

  /**
   * Attrappe für fuehreAufgabeDurch (Muster f45-b2a3): merkt sich die Review-Eingaben je Aufruf, legt eine Laufakte an
   * und spiegelt eingaben.review; `ohneStand` lässt geprueft_stand weg (alter Lauf).
   * @param ergebnisse - Review-Ergebnis je Review-Aufruf (das letzte gilt weiter)
   * @param ohneStand - geprueft_stand nicht spiegeln
   * @returns { fn, reviews }
   */
  function baueAttrappe(ergebnisse, ohneStand = false) {
    const reviews = []
    const fn = async (laufId, _profil, eingaben) => {
      if (eingaben.rolle === 'code-reviewer') reviews.push({ laufId, review: eingaben.review })
      const rohstromPfad = join(basis, `rohstrom-${laufId}.json`)
      const ergebnis = eingaben.rolle === 'code-reviewer' ? JSON.stringify(ergebnisse[Math.min(reviews.length, ergebnisse.length) - 1]) : 'Fertig.'
      writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnis }) }))
      let review = eingaben.review
      if (review !== undefined && ohneStand) review = { policy_version: review.policy_version }
      const daten = {
        worker: 'claude-code',
        rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' },
        ...(eingaben.rolle === 'ausfuehrung' ? { beobachtung: { init_tools: [], init_agents: [], init_skills: [], init_mcp_server: [], skill_aufrufe: [], subagent_aufrufe: [], mcp_aufrufe: [] } } : {}),
        ...(review !== undefined ? { review } : {}),
      }
      registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'gate' }, daten, [], ladeOptionen)
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    }
    return { fn, reviews }
  }

  const schritt = (id, rolle, werkzeugsatz, worker, outputSchema, nachfolger, freigabe) => ({
    schritt_id: id,
    rolle,
    werkzeugsatz,
    worker,
    modell: worker === 'codex' ? 'gpt-6-astra' : 'claude-sonnet-5',
    eingaben: [],
    output_schema: outputSchema,
    freigabe,
    ...(freigabe === 'ZWINGEND' ? { freigabe_erteilt: true } : {}),
    risiko: 'Gate-Fixture.',
    zeitgrenze_ms: 600000,
    nachfolger,
    status: 'OFFEN',
    lauf_id: null,
  })

  /**
   * Startet einen Server, legt einen Ablauf Bau → Review (Codex mit Ausgabeschema) an und wartet, bis er steht.
   * @param repoWurzel - Wegwerf-Repo
   * @param attrappe - baueAttrappe(...)
   * @returns { basisUrl, workflowId, warte, schliessen }
   */
  async function starte(repoWurzel, attrappe) {
    const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, repoWurzel, installWurzel: process.cwd(), startvorlagePfad, fuehreAufgabeDurchFn: attrappe.fn, standCacheMs: 0 }))
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const basisUrl = `http://127.0.0.1:${server.address().port}`
    const auftrag = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'B2a-3b-Gate', auftragstext: 'Füge einen CSV-Export hinzu.' }) })
    const { auftragId } = await auftrag.json()
    const workflowId = `wf-b2a3b-${randomUUID()}`
    const schritte = [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', 'claude-code', null, 'schritt-2-review', 'ZWINGEND'), schritt('schritt-2-review', 'code-reviewer', 'lesend', 'codex', 'ergebnis-code-reviewer', null, 'AUTOMATISCH')]
    registriereWorkflow({ workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: 'B2a-3b-Gate-Ziel.', status: 'OFFEN', aktiver_schritt_id: schritte[0].schritt_id, grenzen: { max_schritte: 8, max_replans: 1 }, schritte }, profilReferenz, ladeOptionen)
    /**
     * Wartet, bis der Workflow nicht mehr läuft und n Reviews gelaufen sind.
     * @param n - Zahl der Review-Aufrufe
     * @returns Workflow-Daten
     */
    const warte = async (n) => {
      const ende = Date.now() + 20000
      let workflow = null
      while (Date.now() < ende) {
        workflow = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten ?? null
        if (attrappe.reviews.length >= n && workflow !== null && workflow.status !== 'LAEUFT' && workflow.schritte.every((s) => s.status !== 'LAEUFT')) break
        await new Promise((r) => setTimeout(r, 50))
      }
      return workflow
    }
    const start = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
    if (start.status !== 200 && start.status !== 202) throw new Error(`starten: ${start.status} ${await start.text()}`)
    return { basisUrl, workflowId, warte, schliessen: () => new Promise((r) => server.close(r)) }
  }
  const abnahme = async (lauf) => (await (await fetch(`${lauf.basisUrl}/api/workflows/${lauf.workflowId}/abnahme`)).json()).urteil
  const BEFUND = (id) => ({ id, dimension: 'bugs', schwere: 'MITTEL', fundstelle: 'src/a.ts:1', zusammenfassung: `Befund ${id}`, beleg: 'Test x', korrekturrichtung: 'Grenze prüfen', evidenz: 'confirmed' })
  const ERGEBNIS = (id) => ({ urteil: 'BEREIT_NACH_KORREKTUR', befunde: [BEFUND(id)], empfehlung: 'Korrektur empfohlen.', ak_urteile: [] })

  // (b) + (c) + (e6)
  const repoB = legeRepoAn('b-http')
  const erwartetB = leseGeprueftenStandSync(repoB).stand
  const attrappe = baueAttrappe([ERGEBNIS('B1'), ERGEBNIS('B2')])
  const lauf = await starte(repoB, attrappe)
  try {
    const vorB = befunde.length
    const workflow = await lauf.warte(1)
    if (workflow?.status !== 'ABGESCHLOSSEN') befunde.push(`(b) Ablauf endet ${workflow?.status}: ${workflow?.grund}`)
    const review1 = attrappe.reviews[0]?.review
    if (review1?.policy_version !== REVIEW_POLICY_VERSION || JSON.stringify(review1?.geprueft_stand) !== JSON.stringify(erwartetB)) befunde.push(`(b) eingaben.review ${JSON.stringify(review1)} statt Stand ${JSON.stringify(erwartetB)}`)
    const laufakte = ladeArtefaktVersion(`laufakte-${attrappe.reviews[0]?.laufId}`, undefined, ladeOptionen)?.daten
    if (JSON.stringify(laufakte?.review?.geprueft_stand) !== JSON.stringify(erwartetB)) befunde.push(`(b) Laufakte ohne geprueft_stand: ${JSON.stringify(laufakte?.review)}`)
    const beispiel = JSON.parse(readFileSync('schemas/examples/kontrollzustand-laufakte-vollstaendig.valid.json', 'utf8'))
    const verstoesse = validiereLaufakteDaten({ ...beispiel, review: review1 })
    if (verstoesse.length > 0) befunde.push(`(b) Laufakte mit diesem review ungültig: ${verstoesse.join('; ')}`)
    if (befunde.length === vorB) console.log('✓ (b) HTTP-Pfad: review.geprueft_stand = Fingerabdruck des Repos zum Start des Reviews, in der Laufakte, gültig.')

    const vorC = befunde.length
    befunde.push(...pruefeProjektion('unverändert', await abnahme(lauf), { veraltet: false, grund: false }))
    writeFileSync(join(repoB, 'src', 'a.ts'), 'export const a = 3\n')
    const geaendert = await abnahme(lauf)
    befunde.push(...pruefeProjektion('Datei geändert', geaendert, { veraltet: true, grund: false }))
    if (JSON.stringify(geaendert?.geprueft_stand) !== JSON.stringify(erwartetB)) befunde.push('(c) Projektion: geprueft_stand nicht aus der Laufakte')
    renameSync(join(repoB, '.git'), join(repoB, '.git-weg'))
    befunde.push(...pruefeProjektion('kein Repo an der Wurzel', await abnahme(lauf), { veraltet: null, grund: true }))
    renameSync(join(repoB, '.git-weg'), join(repoB, '.git'))
    if (befunde.length === vorC) console.log('✓ (c) Projektion: unverändert → false; Datei geändert → true; kein Repo → null mit Grund.')

    // (e6) F-1085 (6): ANPASSUNG → zweiter Bau → Projektion folgt dem neuesten Review-Lauf
    const vorE = befunde.length
    fuehreGitSync(['add', '--', 'src/a.ts'], { cwd: repoB, encoding: 'utf8' })
    fuehreGitSync(['commit', '--quiet', '-m', 'zwischenstand'], { cwd: repoB, encoding: 'utf8' })
    const erwartetZwei = leseGeprueftenStandSync(repoB).stand
    const anpassung = await fetch(`${lauf.basisUrl}/api/workflows/${lauf.workflowId}/abnahme`, { method: 'POST', body: JSON.stringify({ ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: 'Gate: bitte B1 beheben.' }) })
    if (anpassung.status !== 200 && anpassung.status !== 201) befunde.push(`(e6) POST …/abnahme ANPASSUNG: ${anpassung.status} ${await anpassung.text()}`)
    const freigabe = await fetch(`${lauf.basisUrl}/api/workflows/${lauf.workflowId}/freigabe`, { method: 'POST', body: JSON.stringify({ schrittId: 'schritt-1-ausfuehrung', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate: zweiter Bau.' }) })
    if (freigabe.status !== 200 && freigabe.status !== 202) befunde.push(`(e6) POST …/freigabe: ${freigabe.status} ${await freigabe.text()}`)
    const nachher = await lauf.warte(2)
    const zweite = await abnahme(lauf)
    const laufIdZwei = attrappe.reviews[1]?.laufId
    if (nachher?.status !== 'ABGESCHLOSSEN' || laufIdZwei === undefined) befunde.push(`(e6) zweiter Bau endet ${nachher?.status} (${nachher?.grund}), Reviews ${attrappe.reviews.length}`)
    else if (zweite?.laufId !== laufIdZwei || zweite?.befunde?.[0]?.id !== 'B2') befunde.push(`(e6) Projektion folgt nicht dem neuesten Review-Lauf: ${zweite?.laufId}/${zweite?.befunde?.[0]?.id} statt ${laufIdZwei}/B2`)
    if (JSON.stringify(zweite?.geprueft_stand) !== JSON.stringify(erwartetZwei) || JSON.stringify(erwartetZwei) === JSON.stringify(erwartetB)) befunde.push(`(e6) geprueft_stand nicht der des zweiten Reviews: ${JSON.stringify(zweite?.geprueft_stand)}`)
    befunde.push(...pruefeProjektion('nach zweitem Review', zweite, { veraltet: false, grund: false }))
    const angenommen = await fetch(`${lauf.basisUrl}/api/workflows/${lauf.workflowId}/abnahme`, { method: 'POST', body: JSON.stringify({ ergebnis: 'ANGENOMMEN', begruendung: 'Gate: passt.' }) })
    if (angenommen.status !== 200 && angenommen.status !== 201) befunde.push(`(c) POST …/abnahme ANGENOMMEN: ${angenommen.status}`)
    writeFileSync(join(repoB, 'src', 'a.ts'), 'export const a = 4\n')
    befunde.push(...pruefeProjektion('Abnahme entschieden', await abnahme(lauf), { veraltet: null, grund: false }))
    if (befunde.length === vorE) console.log('✓ (e6) nach ANPASSUNG und zweitem Bau: Projektion mit laufId, Befund und geprueft_stand des neuesten Review-Laufs; (c) entschiedene Abnahme → nicht berechnet.')
  } finally {
    await lauf.schliessen()
  }

  // (c) alter Lauf ohne geprueft_stand
  {
    const repoAlt = legeRepoAn('c-alt')
    const alt = baueAttrappe([ERGEBNIS('B1')], true)
    const laufAlt = await starte(repoAlt, alt)
    try {
      await laufAlt.warte(1)
      const vor2 = befunde.length
      befunde.push(...pruefeProjektion('alter Lauf ohne geprueft_stand', await abnahme(laufAlt), { veraltet: null, grund: true }))
      if (befunde.length === vor2) console.log('✓ (c) Laufakte ohne geprueft_stand (alter Lauf) bei offener Abnahme → nicht bestimmbar mit Grund.')
    } finally {
      await laufAlt.schliessen()
    }
  }
} finally {
  raeumeVerzeichnis(basis)
}

// ─── (g) Rot-Selbsttest ───────────────────────────────────────────────────────
{
  const vor = befunde.length
  const urteilOk = { status: 'ok', geprueft_stand: null, aktueller_stand: null, veraltet: false, stand_grund: null }
  const rot = [
    ['Vergleich über commit statt inhalt', pruefeFaelle(FAELLE, (g, a) => g?.commit !== a?.commit)],
    ['Vergleich immer „nicht veraltet“', pruefeFaelle(FAELLE, () => false)],
    ['Fingerabdruck ohne Ausschluss (kontrollzustand/ zählt)', pruefeAusschluss(() => false)],
    ['.git/index verändert', MESSUNG === null ? [] : pruefeLesend('rot', MESSUNG.vorher, { ...MESSUNG.vorher, mtime: MESSUNG.vorher.mtime + 1 })],
    ['neues Objekt', MESSUNG === null ? [] : pruefeLesend('rot', MESSUNG.vorher, { ...MESSUNG.vorher, objekte: `${MESSUNG.vorher.objekte}\nx` })],
    ['Projektion ohne veraltet', pruefeProjektion('rot', { status: 'ok', geprueft_stand: null, aktueller_stand: null, stand_grund: null }, { veraltet: false, grund: false })],
    ['Projektion null ohne Grund', pruefeProjektion('rot', { ...urteilOk, veraltet: null }, { veraltet: null, grund: true })],
    ['Block ohne Ortszeile', pruefeBloecke('rot', { bloecke: [['& {', 'git add a', '}'], ['& {', ORT, 'git push', '}']] }, ORT, 2)],
    ['Block mit cd statt Blockform', pruefeBloecke('rot', { bloecke: [[String.raw`cd 'C:\Users\stefa\Projekte\mein projekt'`, 'git add a'], ['& {', ORT, 'git push', '}']] }, ORT, 2)],
    ['push im ersten Block', pruefeBloecke('rot', { bloecke: [['& {', ORT, 'git add a', 'git commit -m "x"', 'git push -u origin b', '}']] }, ORT, 1)],
    ['zweiter Block fehlt', pruefeBloecke('rot', { bloecke: [['& {', ORT, 'git add a', '}']] }, ORT, 2)],
    ['(11) ohne Hinweise', pruefeElf(() => ({ halt: [], hinweise: [] }))],
    ['starteWorkflowSchritt( siebenmal', pruefeServerQuelltext(`${SERVER}\nstarteWorkflowSchritt(`)],
    ['leseGeprueftenStandSync( zweimal', pruefeServerQuelltext(`${SERVER}\nleseGeprueftenStandSync(`)],
    ['GET über laufwurzelFuer', pruefeServerQuelltext(SERVER.replace('const laufort = ermittleLaufort(workflowId, workflowDaten)\n    if (!laufort.ok) {\n      // qa 6', 'const laufort = { ok: true, wurzel: laufwurzelFuer(workflowId, workflowDaten) }\n    if (!laufort.ok) {\n      // qa 6'))],
  ]
  for (const [name, ergebnis] of rot) if (ergebnis.length === 0) befunde.push(`(g) Rotfall '${name}' wird nicht erkannt`)
  if (befunde.length === vor) console.log(`✓ (g) Rot-Selbsttest: ${rot.length} verfälschte Eingänge erkannt.`)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const befund of befunde) console.error(`  - ${befund}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
