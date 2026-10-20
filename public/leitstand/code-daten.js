/**
 * Datei: public/leitstand/code-daten.js
 *
 * Zweck: Reine Regeln für Entwicklung › Code (#/code) und die rechte Spalte von „Auftrag anlegen“
 * (#/projekt), F46 D4 (docs/design/abgleich-f46.md §4.11, §4.12). Alles hier arbeitet nur auf der
 * Antwort der Leseroute GET …/code (scripts/leitstand/routen-code.mjs) und auf Formular- bzw.
 * Poll-Werten — kein DOM, kein Netz, in Node testbar.
 *
 * - gruppiereNachOrdner: Dateien nach Ordner (Reihenfolge der Route bleibt).
 * - sicherBefehle: die Befehlsblöcke „Sichern“ mit echten Dateien, Commit-Vorschlag aus dem
 *   Branchnamen und Push — PowerShell-tauglich gequotet, keine Platzhalter (F-958, F-959). Gibt es
 *   nichts Sicheres zu zeigen (keine Änderungen, Liste gekappt, kein Branch, kein Pfad), kommt ein
 *   Grund statt eines halben Befehls.
 * - Regel „direkt ausführbar“ (F-959, F45 B2a-3b; Blockform F45 B2b-4a-2a, F-1088 (5)): JEDER Befehlsblock des
 *   Leitstands hat die Form „& {“ / Set-Location -LiteralPath <Pfad> -ErrorAction Stop / Befehle / „}“ ohne Einzug
 *   (befehlsBlock — die eine Regel). Fehlt der Ordner, bricht der Block nach Set-Location ab und kein git-Befehl
 *   läuft (features/F45/nachweise/b2b4a2a/powershell-versuch.md); der Ort bleibt nach dem Block gesetzt. Eine
 *   Folge, die nach außen wirkt (push), steht in einem eigenen Block (befehlsBloecke).
 * - cdZeile: nur noch die cd-Zeile der Jarvis-Regel des Servers (Chat) — kein Leitstand-Block; Jarvis folgt in B2b-4b.
 * - pruefstandBefehle: der Prüfbefehl der Startvorlage als Block.
 * - istNodeModulesPfad (F45 B2b-4a-2b-1, O2): die eine Regel für node_modules — neue, ungetrackte Dateien darunter
 *   zählt die Route nicht (scripts/leitstand/routen-code.mjs leseDateien, Feld dateien.nodeModules) und kein Block stagt
 *   sie; sichtbar bleibt der Hinweis „node_modules ausgelassen – fehlt in .gitignore“. Getrackte bzw. gestagte Änderungen
 *   unter node_modules bleiben in der Liste (echte Änderungen des Repos). Grenze: die Vorbereitung des Arbeitsordners
 *   (src/arbeitsordner/index.ts zaehleUnsauber) hat eine andere Regel (nur node_modules auf oberster Ebene, dafür jede Art).
 * - sichernQuelle, sichernSchluessel, ablaufSicherBefehle (F45 B2b-4a-2b-1, F-1157 (2)(3)(7), V1/V2): woher der Stand
 *   eines Ablaufs kommt, wann er neu zu laden ist und die Befehle „Bereit zum Sichern“ aus GET …/code?workflow=<id>.
 * - verlaufArt/filtereVerlauf: Verlauf auf main nach Alle · Feature · Fixes · Doku.
 * - freigabeZustand: Commit-Freigabe aus den Metadaten (Dateizeit, 10 Minuten).
 * - bereitschaft: die Prüfliste „Bereit zum Start?“.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/code.js, public/leitstand/views/workboard.js, public/leitstand/views/auftrag-umgebung.js
 * - public/leitstand/views/workflows.js, public/leitstand/views/ablauf-sichern-anzeige.js (sichernQuelle, sichernSchluessel,
 *   ablaufSicherBefehle, nodeModulesAnzahl: Abschnitt „Bereit zum Sichern“, F45 B2b-4a-2b-2)
 * - public/leitstand/befehlsblock.js (istBlockform: Zählung und Enter-Hinweis)
 * - scripts/leitstand/routen-code.mjs (istNodeModulesPfad: Dateiliste ohne neue node_modules-Dateien, F45 B2b-4a-2b-1)
 * - scripts/leitstand-server.mjs (cdZeile: cd-Zeile der Jarvis-Regel, F45 B2a-3a/B2a-3b — dieselbe Quoting-Quelle
 *   (psArgument) wie die Befehlsblöcke, aber nicht deren Blockform (folgt in B2b-4b); deshalb importiert der Server hier aus
 *   public/; das Modul ist import-sicher, ohne DOM)
 * - scripts/check-f45-b2a3-codex-review.mjs, scripts/check-f45-b2a3b-review-stand.mjs, scripts/check-f45-b2b4a2a-blockform.mjs,
 *   scripts/check-f45-b2b4a2b1-regeln.mjs
 * - public/leitstand/code-daten.test.mjs, public/leitstand/code-daten-ablauf.test.mjs (node:test)
 *
 * Wichtig: Die Befehle werden nur angezeigt und auf Klick kopiert — der Leitstand führt nichts aus.
 * Pfade und Branch kommen aus Git und werden für PowerShell in einfache Anführungszeichen gesetzt,
 * sobald sie nicht mit einem Buchstaben beginnen oder etwas anderes als [A-Za-z0-9._/-] enthalten (jedes
 * einfache Anführungszeichen, auch ’ ‘ ‚ ‛, verdoppelt); der Commit-Vorschlag enthält nur Zeichen, die in
 * doppelten Anführungszeichen nichts auslösen.
 */

/** Gültigkeit der Commit-Freigabe laut Hook commit-guard (.claude/hooks/commit-guard.cjs). */
export const FREIGABE_MINUTEN = 10

/**
 * Argumente, die in PowerShell ohne Anführungszeichen sicher sind: beginnen mit einem Buchstaben (nie
 * mit einer Ziffer — „1kb“ oder „1e3“ läse PowerShell als Zahl, Prüfpass cr 1) und enthalten nur
 * Buchstaben, Ziffern und . _ / -.
 */
const PS_SICHER = /^[A-Za-z][A-Za-z0-9._/-]*$/

/** Einfache Anführungszeichen, die PowerShell gleich behandelt: ' und die typografischen ‘ ’ ‚ ‛ (Prüfpass cr 1). */
const PS_EINFACH = /['‘’‚‛]/g

/** Ein abgekürzter oder voller Commit-Hash. */
const HASH = /^[0-9a-f]{7,64}$/

/** Höchstzahl Pfade und Zeichen je Zeile „git add“ (Windows begrenzt eine Kommandozeile auf 32 767 Zeichen, Prüfpass qa 4). */
const ADD_PFADE_JE_ZEILE = 50
const ADD_ZEICHEN_JE_ZEILE = 8000

/** Zeichen, die Git in einem Pfad als Muster liest (Glob) — solche Pfade bekommen „:(literal)“ (Prüfpass qa 12). */
const GLOB_ZEICHEN = /[*?[\]]/

/** Platzhalterzeichen von Set-Location -Path ([ ] * ? und das Escape-Zeichen `) — dann -LiteralPath (Code-Review 5). */
const PS_PLATZHALTER = /[*?[\]`]/

/** Absoluter Pfad: Windows-Laufwerk (C:\ oder C:/), UNC (\\server) oder POSIX (/). */
const ABSOLUTER_PFAD = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/

/**
 * Setzt ein Argument für PowerShell sicher: unverändert, wenn es nur harmlose Zeichen enthält, sonst
 * in einfache Anführungszeichen (darin ist nichts aktiv; jedes einfache Anführungszeichen, auch ein
 * typografisches, wird verdoppelt).
 * @param text - Pfad oder Branch
 * @returns Argument
 */
export function psArgument(text) {
  const s = String(text)
  if (PS_SICHER.test(s)) return s
  return `'${s.replace(PS_EINFACH, '$&$&')}'`
}

/**
 * Pfad als git-add-Argument: wörtlich (Glob-Zeichen oder führendes „-“ → „:(literal)“ davor, dann ist
 * er weder Muster noch Schalter), dann PowerShell-gequotet.
 * @param pfad - repo-relativer Pfad
 * @returns Argument
 */
export function gitPfadArgument(pfad) {
  return psArgument(GLOB_ZEICHEN.test(pfad) || pfad.startsWith('-') ? `:(literal)${pfad}` : pfad)
}

/**
 * Ordner eines repo-relativen Pfads ('' für die Repo-Wurzel).
 * @param pfad - Pfad mit '/'
 * @returns Ordner
 */
export function ordnerVon(pfad) {
  const i = pfad.lastIndexOf('/')
  return i === -1 ? '' : pfad.slice(0, i)
}

/**
 * Dateiname eines Pfads.
 * @param pfad - Pfad mit '/'
 * @returns Name
 */
export function nameVon(pfad) {
  return pfad.slice(pfad.lastIndexOf('/') + 1)
}

/**
 * Gruppiert Dateien nach Ordner, in der Reihenfolge des ersten Auftretens.
 * @param eintraege - dateien.eintraege der Route
 * @returns [{ ordner, dateien }]
 */
export function gruppiereNachOrdner(eintraege) {
  const gruppen = new Map()
  for (const datei of Array.isArray(eintraege) ? eintraege : []) {
    const ordner = ordnerVon(datei.pfad)
    if (!gruppen.has(ordner)) gruppen.set(ordner, [])
    gruppen.get(ordner).push(datei)
  }
  return [...gruppen].map(([ordner, dateien]) => ({ ordner, dateien }))
}

/**
 * Summe der Zeilen (+/−) über alle Dateien mit bekannter Zahl.
 * @param eintraege - dateien.eintraege
 * @returns { plus, minus }
 */
export function summeZeilen(eintraege) {
  let plus = 0
  let minus = 0
  for (const e of Array.isArray(eintraege) ? eintraege : []) {
    if (typeof e.plus === 'number') plus += e.plus
    if (typeof e.minus === 'number') minus += e.minus
  }
  return { plus, minus }
}

/**
 * Commit-Vorschlag aus dem Branchnamen: 'feat/f46-d4-entwicklung-code' → 'F46 D4: entwicklung code',
 * sonst der Name ohne Präfix mit Leerzeichen. Nur Buchstaben, Ziffern, Leerzeichen und . , : # ( ) -
 * bleiben — nichts, was in doppelten Anführungszeichen etwas auslöst ($, `, ").
 * @param branch - Branchname oder null
 * @returns Vorschlag oder null
 */
export function commitVorschlag(branch) {
  if (typeof branch !== 'string' || branch.trim() === '') return null
  const ohnePraefix = branch.replace(/^(?:feat|feature|fix|bugfix|docs|chore|refactor|test|ws)\//i, '')
  const muster = ohnePraefix.match(/^f(\d+[a-z]?)-((?:ws-?)?[a-z]{0,2}\d+[a-z]?)-(.+)$/i)
  let roh = ohnePraefix.replace(/[-_/]+/g, ' ')
  if (muster !== null) {
    const teil = muster[2].toLowerCase()
    const ws = teil.startsWith('ws') ? `WS-${teil.replace(/^ws-?/, '')}` : `${teil.charAt(0).toUpperCase()}${teil.slice(1)}`
    roh = `F${muster[1].toLowerCase()} ${ws}: ${muster[3].replace(/[-_/]+/g, ' ')}`
  }
  const sauber = roh
    .replace(/[^\p{L}\p{N} .,:#()-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  return sauber === '' ? null : sauber
}

/**
 * cd-Zeile der Jarvis-Regel (Chat): cd auf den absoluten Pfad, PowerShell-gequotet (psArgument); bei einem Platzhalterzeichen
 * von PowerShell ([ ] * ? `) mit -LiteralPath. Nicht für Leitstand-Blöcke (die haben die Blockform, befehlsBlock) — nur
 * scripts/leitstand-server.mjs baueProjektCdZeile nutzt sie; die Jarvis-Regel bekommt die Blockform in B2b-4b.
 * @param pfad - absoluter Pfad
 * @returns z. B. „cd 'C:\Projekte\mein projekt'“
 */
export function cdZeile(pfad) {
  return PS_PLATZHALTER.test(pfad) ? `cd -LiteralPath ${psArgument(pfad)}` : `cd ${psArgument(pfad)}`
}

/** Erste und letzte Zeile eines Befehlsblocks (Blockform, F45 B2b-4a-2a) — eine Quelle für Erzeuger, Zählung und Enter-Hinweis. */
export const BLOCK_KOPF = '& {'
export const BLOCK_FUSS = '}'

/**
 * Ortszeile eines Befehlsblocks: Set-Location immer mit -LiteralPath (Platzhalterzeichen sind dann gleichgültig) und
 * -ErrorAction Stop — fehlt der Ordner, bricht der umschließende Block ab, statt die Folge im aktuellen Ordner auszuführen
 * (F-1088 (5)).
 * @param pfad - absoluter Pfad
 * @returns z. B. „Set-Location -LiteralPath 'C:\Projekte\mein projekt' -ErrorAction Stop“
 */
export function ortZeile(pfad) {
  return `Set-Location -LiteralPath ${psArgument(pfad)} -ErrorAction Stop`
}

/**
 * Ein Befehlsblock in Blockform: [„& {“, Ortszeile, …folge, „}“], ohne Einzug (sonst wäre der hängende Einzug der Anzeige,
 * style.css .befehlsblock-zeile, nicht mehr eindeutig). Mit leerer Folge ein reiner Orts-Block — der Ort bleibt nach dem
 * Block gesetzt.
 * @param pfad - absoluter Pfad (sonst kein Block)
 * @param folge - Befehlszeilen ohne Ortszeile
 * @returns Zeilen oder null ohne absoluten Pfad
 */
export function befehlsBlock(pfad, folge) {
  if (typeof pfad !== 'string' || !ABSOLUTER_PFAD.test(pfad)) return null
  return [BLOCK_KOPF, ortZeile(pfad), ...folge, BLOCK_FUSS]
}

/**
 * true, wenn Zeilen die Blockform haben (erste Zeile „& {“, letzte „}“, je getrimmt).
 * @param zeilen - Zeilen eines Blocks
 * @returns boolean
 */
export function istBlockform(zeilen) {
  return Array.isArray(zeilen) && zeilen.length >= 2 && String(zeilen[0]).trim() === BLOCK_KOPF && String(zeilen[zeilen.length - 1]).trim() === BLOCK_FUSS
}

/**
 * Befehlsblöcke nach der Regel „direkt ausführbar“: je nicht leerer Folge ein Block in Blockform (befehlsBlock).
 * @param pfad - absoluter Projektpfad (sonst kein Befehl)
 * @param folgen - Befehlsfolgen (je Folge die Zeilen ohne Ortszeile)
 * @returns { bloecke: string[][] } oder { grund: 'keinPfad' }
 */
export function befehlsBloecke(pfad, folgen) {
  if (typeof pfad !== 'string' || !ABSOLUTER_PFAD.test(pfad)) return { grund: 'keinPfad' }
  return { bloecke: folgen.filter((folge) => folge.length > 0).map((folge) => befehlsBlock(pfad, folge)) }
}

/** Pfad mit einem Segment „node_modules“ — am Anfang oder als Pfadteil, auch als letztes Segment (Verknüpfung ohne „/“). */
const NODE_MODULES = /(?:^|\/)node_modules(?:\/|$)/

/**
 * Die eine node_modules-Regel (F45 B2b-4a-2b-1, O2): true für einen repo-relativen Pfad mit einem Segment node_modules (am
 * Anfang oder als Pfadteil; auch „node_modules“ selbst — git meldet eine Verknüpfung (mklink /D) als „?? node_modules“ ohne
 * Schrägstrich, qa 1). Die Regel prüft keine Art; angewandt wird sie nur auf neue, ungetrackte Dateien (art '??') — wer sie
 * nutzt, prüft die Art. Grenze: auch eine gewollte neue Datei unter einem Ordner node_modules (z. B. eine Testvorlage
 * test/fixtures/node_modules/…) fällt heraus; dann trifft der Hinweis „fehlt in .gitignore“ nicht zu (qa 7).
 * @param pfad - repo-relativer Pfad mit '/'
 * @returns boolean
 */
export function istNodeModulesPfad(pfad) {
  return typeof pfad === 'string' && NODE_MODULES.test(pfad)
}

/**
 * Anzahl der ausgelassenen neuen node_modules-Dateien (Feld dateien.nodeModules der Route); ein älterer Server ohne das
 * Feld zählt als 0.
 * @param daten - Antwort der Route
 * @returns Zahl ≥ 0
 */
export function nodeModulesAnzahl(daten) {
  const n = daten?.dateien?.nodeModules
  return Number.isInteger(n) && n > 0 ? n : 0
}

/**
 * Die commit-Folge „Sichern“ [git add mit den echten Dateien, git commit mit dem Vorschlag] — eine Quelle für
 * sicherBefehle (#/code, Workboard) und ablaufSicherBefehle (F45 B2b-4a-2b-1).
 * Welche Pfade in „git add“ gehören (Prüfpass qa 1): jede Datei mit Änderung im Arbeitsbaum oder neu;
 * NICHT eine schon gestagte Löschung (X = D) und nicht der alte Pfad einer gestagten Umbenennung — beide
 * stehen weder im Index noch im Arbeitsbaum, „git add“ bräche sonst mit „pathspec did not match“ ab und
 * stagte gar nichts — und nie eine neue Datei unter node_modules (istNodeModulesPfad; Gegenwehr, falls ein älterer
 * Server sie noch liefert). Die Zeile wird bei vielen Pfaden aufgeteilt.
 * @param daten - Antwort der Route
 * @returns { zeilen: string[], branch: string } oder { grund: 'keineAenderungen' | 'nurNodeModules' | 'gekappt' |
 *   'keinBranch' | 'aufMain' | 'dateienFehler' | 'branchFehler' | 'keinVorschlag' }
 */
function commitFolge(daten) {
  const dateien = daten?.dateien
  if (dateien?.status !== 'ok') return { grund: 'dateienFehler' }
  const eintraege = dateien.eintraege.filter((e) => !(e.art === '??' && istNodeModulesPfad(e.pfad)))
  // Kappung vor „nur node_modules“: ein älterer Server kann 500 node_modules-Einträge zeigen und echte Änderungen dahinter
  // kappen (cr 1) — dann gilt gekappt, nie „nichts zu sichern“.
  if (dateien.gekappt && dateien.eintraege.length > 0) return { grund: 'gekappt' }
  if (eintraege.length === 0) return { grund: nodeModulesAnzahl(daten) > 0 || eintraege.length < dateien.eintraege.length ? 'nurNodeModules' : 'keineAenderungen' }
  const branch = daten?.branch
  if (branch?.status !== 'ok') return { grund: 'branchFehler' }
  if (branch.losgeloest || typeof branch.name !== 'string') return { grund: 'keinBranch' }
  // Auf main wird nicht gesichert — erst ein Feature-Branch (Prüfpass qa 3).
  if (branch.name === 'main' || branch.name === 'master') return { grund: 'aufMain' }
  const nachricht = commitVorschlag(branch.name)
  if (nachricht === null) return { grund: 'keinVorschlag' }
  const pfade = []
  for (const e of eintraege) {
    if (typeof e.xy === 'string' && e.xy[0] === 'D') continue
    pfade.push(e.pfad)
  }
  const zeilen = []
  let teil = []
  let laenge = 0
  for (const argument of [...new Set(pfade)].map(gitPfadArgument)) {
    if (teil.length >= ADD_PFADE_JE_ZEILE || (teil.length > 0 && laenge + argument.length + 1 > ADD_ZEICHEN_JE_ZEILE)) {
      zeilen.push(`git add ${teil.join(' ')}`)
      teil = []
      laenge = 0
    }
    teil.push(argument)
    laenge += argument.length + 1
  }
  if (teil.length > 0) zeilen.push(`git add ${teil.join(' ')}`)
  zeilen.push(`git commit -m "${nachricht}"`)
  return { zeilen, branch: branch.name }
}

/**
 * Befehlsblöcke „Sichern“ in Blockform: [git add …, git commit …] (commitFolge) und — getrennt, weil er nach außen wirkt —
 * [git push] (F-959, F45 B2a-3b; Blockform F45 B2b-4a-2a); ohne „origin“ entfällt der Push-Block. Wurden neue
 * node_modules-Dateien ausgelassen, steht unabhängig vom Ergebnis der Hinweis 'nodeModules' (F45 B2b-4a-2b-1) — außer
 * beim Grund 'nurNodeModules', der es schon sagt.
 * @param daten - Antwort der Route (status ok)
 * @param optionen - { veraltet: true, wenn das letzte Aktualisieren scheiterte (kein Befehl aus altem Stand) }
 * @returns { bloecke: string[][], hinweise: string[] } oder { grund: 'veraltet' | 'keineAenderungen' | 'nurNodeModules' |
 *   'gekappt' | 'keinBranch' | 'aufMain' | 'dateienFehler' | 'branchFehler' | 'keinVorschlag' | 'keinPfad', hinweise? }
 */
export function sicherBefehle(daten, { veraltet = false } = {}) {
  if (veraltet) return { grund: 'veraltet' }
  const ergebnis = sicherBefehleOhneHinweis(daten)
  if (nodeModulesAnzahl(daten) === 0 || ergebnis.grund === 'nurNodeModules') return ergebnis
  return { ...ergebnis, hinweise: [...(ergebnis.hinweise ?? []), 'nodeModules'] }
}

/**
 * sicherBefehle ohne den node_modules-Hinweis.
 * @param daten - Antwort der Route
 * @returns wie sicherBefehle
 */
function sicherBefehleOhneHinweis(daten) {
  const folge = commitFolge(daten)
  if (folge.grund !== undefined) return { grund: folge.grund }
  const hinweise = []
  const folgen = [folge.zeilen]
  if (daten.remoteWebUrl?.status === 'ok' && daten.remoteWebUrl.origin === false) hinweise.push('keinOrigin')
  else folgen.push([`git push -u origin ${psArgument(folge.branch)}`])
  const bloecke = befehlsBloecke(daten.absoluterPfad, folgen)
  return bloecke.grund !== undefined ? bloecke : { bloecke: bloecke.bloecke, hinweise }
}

/**
 * Quelle des Sichern-Stands eines Ablaufs aus dessen Feld arbeitsordner (GET /api/workflows/<id>; F-1157 (7), Befund 6):
 * 'keinBedarf' (der Ablauf schreibt nicht — nichts zu sichern), 'projekt' (Bestand: im Projektordner gearbeitet, Stand über
 * GET …/code ohne Parameter), 'ablauf' (jeder andere Status — immer GET …/code?workflow=<id>, nie still der Projektordner),
 * 'unbekannt' (Feld fehlt, älterer Server — kein Rückfall auf den Projektordner, O3).
 * @param ao - Feld arbeitsordner oder null/undefined
 * @returns 'keinBedarf' | 'projekt' | 'ablauf' | 'unbekannt'
 */
export function sichernQuelle(ao) {
  if (ao === null || typeof ao !== 'object') return 'unbekannt'
  if (ao.status === 'kein_bedarf') return 'keinBedarf'
  if (ao.status === 'bestand') return 'projekt'
  return 'ablauf'
}

/**
 * Schlüssel, bei dessen Wechsel der Sichern-Stand eines Ablaufs neu geladen wird (V1, advisor-b2b4a2.md): Ablauf-Status,
 * Ordner-Status, laufende Vorbereitung (auch Aufräumen) und Fassung — nicht der Ablauf-Status allein (nach dem Aufräumen
 * bleibt der Ablauf ABGESCHLOSSEN und der Ordner wird ENTFERNT; eine Anpassungsrunde legt eine neue Fassung an).
 * @param detail - { daten: { status }, arbeitsordner, versionSequenz } (Antwort von GET /api/workflows/<id>)
 * @returns Text
 */
export function sichernSchluessel(detail) {
  const ao = detail?.arbeitsordner
  return [detail?.daten?.status ?? '-', ao?.status ?? '-', ao?.vorbereitungLaeuft === true ? 'laeuft' : '-', detail?.versionSequenz ?? '-'].join('|')
}

/**
 * Befehle „Bereit zum Sichern“ eines Ablaufs aus der Antwort von GET …/code?workflow=<id> (F45 B2b-4a-2b-1; F-1157 (2)(3)):
 * - nur bei ablauf.sichern.bereit, sonst Grund 'nichtBereit';
 * - Ort und Soll-Branch nur aus ablauf.arbeitsordner.pfad/branch (nie aus workflowId oder absoluterPfad), sonst 'keinOrt';
 * - vor jedem Block die Branch-Prüfung: lesbar ('branchFehler'), nicht losgelöst ('losgeloest'), nicht main/master
 *   ('aufMain'), gleich dem Branch des Arbeitsordners ('fremderBranch');
 * - commit-Block nur bei art 'commit' über commitFolge; scheitert sie (z. B. gekappt), steht commitGrund im Ergebnis;
 * - push-Block (V2) nur bei origin und (Commits noch nicht auf main oder ein commit-Block davor) — nie an Dateiliste oder
 *   Kappung gebunden; stünde ein push an, gibt es ohne origin den Hinweis 'keinOrigin', ist origin nicht lesbar den Hinweis
 *   'originUnbekannt' (nie still);
 * - Hinweis 'nodeModules' unabhängig vom Ergebnis, sobald neue node_modules-Dateien ausgelassen wurden.
 * @param antwort - Antwort von GET …/code?workflow=<id> (HTTP 200)
 * @returns { bloecke: [{ art: 'commit' | 'push', zeilen }], hinweise, commitGrund: Grund | null, voraus: Zahl | null,
 *   nodeModules } oder { grund: 'nichtBereit' | 'keinOrt' | 'branchFehler' | 'losgeloest' | 'aufMain' | 'fremderBranch',
 *   hinweise, nodeModules }
 */
export function ablaufSicherBefehle(antwort) {
  const nodeModules = nodeModulesAnzahl(antwort)
  const nmHinweis = nodeModules > 0 ? ['nodeModules'] : []
  const nicht = (grund) => ({ grund, hinweise: nmHinweis, nodeModules })
  const sichern = antwort?.ablauf?.sichern
  if (sichern?.bereit !== true) return nicht('nichtBereit')
  const ao = antwort.ablauf.arbeitsordner
  if (typeof ao?.pfad !== 'string' || typeof ao.branch !== 'string' || ao.branch === '' || befehlsBlock(ao.pfad, []) === null) return nicht('keinOrt')
  const branch = antwort.branch
  if (branch?.status !== 'ok') return nicht('branchFehler')
  if (branch.losgeloest || typeof branch.name !== 'string') return nicht('losgeloest')
  if (branch.name === 'main' || branch.name === 'master') return nicht('aufMain')
  if (branch.name !== ao.branch) return nicht('fremderBranch')
  const voraus = typeof sichern.voraus === 'number' ? sichern.voraus : null
  const bloecke = []
  let commitGrund = null
  if (sichern.art === 'commit') {
    const folge = commitFolge(antwort)
    if (folge.grund !== undefined) commitGrund = folge.grund
    else bloecke.push({ art: 'commit', zeilen: befehlsBlock(ao.pfad, folge.zeilen) })
  }
  const hinweise = []
  const remote = antwort.remoteWebUrl
  // Nur wenn etwas zu pushen wäre — sonst führte „deshalb ohne git push“ in die Irre (cr 3).
  if ((voraus !== null && voraus > 0) || bloecke.length > 0) {
    if (remote?.status !== 'ok' || typeof remote.origin !== 'boolean') hinweise.push('originUnbekannt')
    else if (remote.origin === false) hinweise.push('keinOrigin')
    else bloecke.push({ art: 'push', zeilen: befehlsBlock(ao.pfad, [`git push -u origin ${psArgument(ao.branch)}`]) })
  }
  return { bloecke, hinweise: [...hinweise, ...nmHinweis], commitGrund, voraus, nodeModules }
}

/**
 * Befehlsblock „Prüfstand“: der Prüfbefehl der Startvorlage in Blockform (F-959, F45 B2a-3b; Blockform B2b-4a-2a).
 * @param daten - Antwort der Route oder null
 * @returns { bloecke: string[][] } oder { grund: 'keinBefehl' | 'keinPfad' }
 */
export function pruefstandBefehle(daten) {
  const befehl = daten?.startvorlage?.status === 'ok' && typeof daten.startvorlage.pruefbefehl === 'string' && daten.startvorlage.pruefbefehl.trim() !== '' ? daten.startvorlage.pruefbefehl : null
  if (befehl === null) return { grund: 'keinBefehl' }
  return befehlsBloecke(daten.absoluterPfad, [[befehl]])
}

/**
 * Art eines Commits auf main für den Filter.
 * @param eintrag - verlauf.eintraege[i]
 * @returns 'fix' | 'doku' | 'feature' | 'sonstiges'
 */
export function verlaufArt(eintrag) {
  const betreff = String(eintrag?.betreff ?? '')
  if (/^(?:fix|hotfix|bugfix)\b/i.test(betreff) || /^F\d+[a-z]?\s+Fix(?:paket)?\b/i.test(betreff)) return 'fix'
  if (/^(?:docs?|doku)\b/i.test(betreff) || /\bDoku(?:mentation)?\b/.test(betreff.split(':')[0] ?? '')) return 'doku'
  if (eintrag?.zuordnung?.feature) return 'feature'
  return 'sonstiges'
}

/**
 * Filtert den Verlauf.
 * @param eintraege - verlauf.eintraege
 * @param filter - 'alle' | 'feature' | 'fix' | 'doku'
 * @returns Liste
 */
export function filtereVerlauf(eintraege, filter) {
  const liste = Array.isArray(eintraege) ? eintraege : []
  return filter === 'alle' ? liste : liste.filter((e) => verlaufArt(e) === filter)
}

/**
 * Abstand in Stunden und Minuten.
 * @param minuten - abstandMinuten oder null
 * @returns { stunden, minuten } oder null
 */
export function zerlegeAbstand(minuten) {
  if (typeof minuten !== 'number' || !Number.isFinite(minuten) || minuten < 0) return null
  return { stunden: Math.floor(minuten / 60), minuten: minuten % 60 }
}

/**
 * Link auf einen Commit bei GitHub.
 * @param remoteWebUrl - geprüfte Repo-Adresse oder null
 * @param hash - Commit-Hash
 * @returns URL oder null
 */
export function commitUrl(remoteWebUrl, hash) {
  if (typeof remoteWebUrl !== 'string' || typeof hash !== 'string' || !HASH.test(hash)) return null
  return `${remoteWebUrl}/commit/${hash}`
}

/**
 * Zustand der Commit-Freigabe — mit der seit dem Laden vergangenen Zeit, damit die Anzeige ohne neuen
 * Git-Abruf abläuft (Prüfpass qa 6).
 * @param feld - freigabeCommit der Route
 * @param vergangeneMinuten - Minuten seit dem Laden des Stands
 * @returns { art: 'gueltig' | 'abgelaufen' | 'keine' | 'fehler' | 'unbekannt', restMinuten?, alterMinuten? }
 */
export function freigabeZustand(feld, vergangeneMinuten = 0) {
  if (feld === undefined || feld === null) return { art: 'unbekannt' }
  if (feld.status !== 'ok') return { art: 'fehler' }
  if (!feld.vorhanden) return { art: 'keine' }
  const alter = typeof feld.alterMinuten === 'number' ? feld.alterMinuten + Math.max(0, Math.floor(vergangeneMinuten)) : null
  if (typeof alter !== 'number') return { art: 'fehler' }
  return alter < FREIGABE_MINUTEN ? { art: 'gueltig', restMinuten: FREIGABE_MINUTEN - alter, alterMinuten: alter } : { art: 'abgelaufen', alterMinuten: alter }
}

/**
 * Prüfliste „Bereit zum Start?“ (§4.11). Jede Zeile: { id, zustand: 'ok' | 'offen' | 'warnung' |
 * 'laedt' | 'fehler' | 'kommt', pflicht }. Ergebnis 'bereit' nur, wenn alle Pflichtzeilen ok sind.
 * @param eingabe - { titel, ergebnis, kontext, aktiverLauf (aus dem Poll, undefined = unbekannt),
 *   codeStand ({ zustand, daten } aus code-stand.js) }
 * @returns { zeilen, bereit, mainWarnung }
 */
export function bereitschaft({ titel, ergebnis, kontext, aktiverLauf, codeStand }) {
  const daten = codeStand?.daten ?? null
  const laedt = codeStand?.zustand === 'laedt' && daten === null
  const ausRoute = (pruefe) => (laedt ? 'laedt' : daten === null ? 'fehler' : pruefe(daten))
  const textOk = (wert) => typeof wert === 'string' && wert.trim() !== ''
  const zeilen = [
    { id: 'titel', pflicht: true, zustand: textOk(titel) ? 'ok' : 'offen' },
    { id: 'ergebnis', pflicht: true, zustand: textOk(ergebnis) ? 'ok' : 'offen' },
    { id: 'kontext', pflicht: false, zustand: textOk(kontext) ? 'ok' : 'offen' },
    { id: 'projektkarte', pflicht: false, zustand: 'kommt' },
    // Gefunden heißt: der Ordner existiert (Feld arbeitsverzeichnis) und Git antwortet dort; ohne Git „prüfen“.
    { id: 'arbeitsverzeichnis', pflicht: true, zustand: ausRoute((d) => (d.arbeitsverzeichnis?.vorhanden !== true ? 'fehler' : d.status === 'ok' ? 'ok' : 'warnung')) },
    {
      id: 'git',
      pflicht: false,
      zustand: ausRoute((d) => {
        if (d.status !== 'ok' || d.branch?.status !== 'ok') return 'fehler'
        if (d.branch.losgeloest || d.branch.name === 'main' || d.branch.name === 'master') return 'warnung'
        return d.dateien?.status === 'ok' && d.dateien.anzahl > 0 ? 'warnung' : 'ok'
      }),
    },
    { id: 'pruefbefehl', pflicht: true, zustand: ausRoute((d) => (d.startvorlage?.status === 'ok' && textOk(d.startvorlage.pruefbefehl) ? 'ok' : 'offen')) },
    { id: 'harness', pflicht: false, zustand: ausRoute((d) => (d.harness?.status !== 'ok' ? 'fehler' : d.harness.claudeMd ? 'ok' : 'warnung')) },
    { id: 'lauf', pflicht: true, zustand: typeof aktiverLauf?.aktiv !== 'boolean' ? 'laedt' : aktiverLauf.aktiv ? 'warnung' : 'ok' },
  ]
  const mainWarnung = daten?.branch?.status === 'ok' && !daten.branch.losgeloest && (daten.branch.name === 'main' || daten.branch.name === 'master')
  return { zeilen, bereit: zeilen.filter((z) => z.pflicht).every((z) => z.zustand === 'ok'), mainWarnung }
}
