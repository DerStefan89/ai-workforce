/**
 * Datei: scripts/leitstand/routen-faehigkeit-vorschlag.mjs
 *
 * Zweck: F45 „Fähigkeit bauen“ (F-1069). FB-1a (features/F45/plan-fb1-v2.md): die Projektion der Fähigkeit-Vorschläge für
 * GET /api/workflows/<id>/abnahme (Feld faehigkeitVorschlaege, additiv) — Erkennung aus src/faehigkeiten/vorschlag.ts plus
 * ziel_ignoriert (git check-ignore) und, seit FB-1b, der Stand gegenüber dem Basis-Commit (q1: unverändert getrackte Vorschläge
 * zählen nicht), mit kurzem Cache je Arbeitsordner (Abnahme alle 2 s, Advisor B8).
 * FB-1b (features/F45/plan-fb1b-v2.md, Advisor advisor-fb1b.md + -delta.md): POST …/workflows/<id>/faehigkeit-vorschlag/
 * uebernehmen|verwerfen { typ, name, hash } — Zwischenmuster bis W2 (E-FB1-2, F-1131): dieses Modul erkennt den Pfad
 * (erkenneVorschlagRoute) und führt den Ablauf, der Server prüft die Methode hinter dem zentralen CSRF-Haken und reicht Lage und
 * Rückrufe herein. Übernehmen verschiebt den Vorschlag nach .claude/skills/<name>/ bzw. .claude/agents/<name>.md im selben
 * Arbeitsordner und setzt die Freigabe nach Inhalt (Rückruf aendere ⇒ aendereLokaleDatei ⇒ setzeInhaltsfreigabe) — nie
 * eingeschaltet (E-F45-6). Verwerfen entfernt nur den Vorschlag.
 * FB-2 (features/F45/plan-fb2.md/plan-fb2-v2.md, Advisor advisor-fb2.md): baueVorschlagFelder liefert der Abnahme die Felder
 * faehigkeitVorschlaege (je Vorschlag adressierbar) und faehigkeitUngesichert (ungesicherte Änderungen unter .claude/ des
 * Arbeitsordners, dieselbe Sicht wie der Laufdiff, F-1169) — mit Cache je Wurzel (cr1), den jede Aktion verwirft.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (GET …/abnahme; Regelzeile im Auftrag der Ausführung; Routen übernehmen/verwerfen)
 * - scripts/leitstand/routen-faehigkeit-vorschlag.test.mjs, scripts/check-f45-fb1-faehigkeit-vorschlag.mjs,
 *   scripts/check-f45-fb1b-faehigkeit-uebernehmen.mjs, scripts/check-f45-fb2-faehigkeit-anzeige.mjs
 *
 * Wichtig:
 * - Schreiben (B10, docs/architektur/wachstumsbremse.md): Dateien bewegt bzw. löscht dieses Modul nur im Arbeitsordner
 *   (vorschlaege/faehigkeiten/ ⇒ .claude/skills|agents/); die lokale Datei schreibt nur der Rückruf des Servers. Im Projektordner
 *   gibt es keine Übernahme (ARCHITECTURE.md §2) — die Wurzel kommt aus der Lage des Servers.
 * - Reihenfolge (Advisor FB-1b 1, Delta 1): Phase A (asynchron, schreibt nichts: Basis-Baum, check-ignore) und Phase B
 *   (fuehreSynchronDurch, bewusst NICHT async — ein await darin wäre ein Syntaxfehler): Lage frisch, Erkennung frisch, Hash, q1,
 *   B3, Pfadprüfung, Bewegen, Probe, Freigabe. Zwischen Prüfen und Schreiben kann so weder ein Laufstart noch das Aufräumen fallen.
 * - Pfadprüfung (B6): lstat-Kette ohne Verknüpfung, Ordner einzeln und nicht rekursiv angelegt, Enthaltensein über relative()
 *   auf realpathSync.native. Nie überschreiben (B9): Skill als Ordner-Rename (ersetzt höchstens einen leeren Ordner), Agent mit
 *   COPYFILE_EXCL. DEKLARIERT: ein fremder Prozess (ein Lauf ist gesperrt) kann zwischen lstat und Bewegen eine Verknüpfung
 *   setzen — die Probe am Ziel prüft danach den Hash; .gitignore kann sich zwischen Phase A und B ändern.
 * - Statuscodes: Bedienfälle 4xx; 500 nur, wenn eine Rücknahme scheitert (beide Orte im Grund, B9), und bei einem unerwarteten
 *   Wurf (Programmfehler, geloggt). Eine Ablehnung von aendere (auch dessen 500 beim Schreiben) ⇒ 409 „nichts übernommen“.
 * - Beide Caches der Projektion halten höchstens einen Eintrag je Arbeitsordner, der je angezeigt wurde, auch nach dem Aufräumen.
 * - DEKLARIERT (plan-fb2-v2 V3/V4): git status startet wie im Laufdiff und in routen-code einen Clean-Filter auf getrackten Dateien
 *   mit geändertem Stat; eine Änderung gleicher Größe im selben mtime-Takt übersieht die Signatur höchstens 30 s (die Route prüft den
 *   Hash ohnehin frisch, 409).
 */

import { constants, copyFileSync, lstatSync, mkdirSync, readdirSync, realpathSync, renameSync, rmdirSync, rmSync, unlinkSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import { claudePfadeAusStatus } from '../../src/execution-controller/index.ts'
import { ermittleProjektFaehigkeiten, hashLokaleDatei, ladeFaehigkeitenLokal, leseEingebautReferenz, projektEinstellungen, SHA256_MUSTER } from '../../src/faehigkeiten/index.ts'
import { fuehreGitAsync } from '../../src/git-starter/index.ts'
import {
  erkenneFaehigkeitVorschlaege,
  FAEHIGKEIT_VORSCHLAG_REGEL,
  istSchreibbarerName,
  leseBasisBaum,
  pruefeZielIgnoriert,
  VORSCHLAG_ORDNER,
  vergleicheMitBasis,
  zielPfad,
} from '../../src/faehigkeiten/vorschlag.ts'
import { ABLAUF_KENNUNG_MAX, LAUFID_UNZULAESSIGE_ZEICHEN } from './kennung.mjs'
import { FREMD_UNBESTAETIGT } from './routen-faehigkeiten.mjs'

export { FAEHIGKEIT_VORSCHLAG_REGEL }

/** Cache der git-Ergebnisse der Projektion: Schlüssel Wurzel + Basis + Ziele/Hashes → { zeit, versprechen }. */
const STANDARD_CACHE = new Map()

/** Grund, wenn der Basis-Commit nicht lesbar ist (q1 fail-closed). */
export const BASIS_UNBESTIMMT = 'Stand gegenüber dem Basis-Commit nicht bestimmbar — nicht übernehmbar'

/** B13 (Entscheidung Challenger 23.10.2026): Wortlaut bei ignoriertem Ziel. */
export const ZIEL_IGNORIERT = 'Ziel ist gitignoriert — würde beim Sichern nicht mitgenommen'

/**
 * Vorschläge eines Arbeitsordners für die Abnahme: Erkennung je Aufruf (begrenzt, ein lstat ohne Vorschläge), ziel_ignoriert
 * und der Basis-Baum aus je einem git-Aufruf, die für dieselbe Wurzel, Basis und dieselben Ziele/Hashes höchstens cacheMs alt
 * sind (laufende Aufrufe werden geteilt). Unverändert getrackte Vorschläge fallen weg (q1); ist der Basis-Baum nicht lesbar,
 * bleibt der Eintrag mit Grund. Wirft nie.
 * @param wurzel - absoluter Pfad des Arbeitsordners
 * @param optionen - { basisCommit, jetzt, cacheMs, cache } (basisCommit aus dem Arbeitsordner-Artefakt; die übrigen für Tests)
 * @returns Vorschläge mit ziel_ignoriert; [] ohne Vorschläge (der Server lässt das Feld dann weg)
 */
export async function baueVorschlagProjektion(wurzel, { basisCommit = null, jetzt = Date.now, cacheMs = 10000, cache = STANDARD_CACHE } = {}) {
  const vorschlaege = erkenneFaehigkeitVorschlaege(wurzel)
  if (vorschlaege.length === 0) return []
  const praefix = `${wurzel}\0`
  const schluessel = `${praefix}${basisCommit}\0${vorschlaege.map((v) => `${zielPfad(v) ?? v.pfad}:${v.hash}`).join('|')}`
  let eintrag = cache.get(schluessel)
  if (eintrag === undefined || jetzt() - eintrag.zeit >= cacheMs) {
    // Ältere Einträge derselben Wurzel verfallen mit (der Cache wächst nicht über einen Eintrag je Arbeitsordner).
    for (const k of cache.keys()) if (k.startsWith(praefix)) cache.delete(k)
    eintrag = { zeit: jetzt(), versprechen: Promise.all([pruefeZielIgnoriert(wurzel, vorschlaege), leseBasisBaum(wurzel, basisCommit)]) }
    cache.set(schluessel, eintrag)
  }
  const [ignoriert, basis] = await eintrag.versprechen
  const ergebnis = []
  for (const v of vorschlaege) {
    const stand = v.typ === null || v.name === null ? 'neu' : basis.ok ? vergleicheMitBasis(wurzel, v, basis.baum) : null
    if (stand === 'unveraendert') continue
    ergebnis.push({ ...v, grund: v.grund ?? (stand === null ? BASIS_UNBESTIMMT : null), ziel_ignoriert: ignoriert.get(v.pfad) ?? null })
  }
  return ergebnis
}

/** FB-2 (plan-fb2-v2 V4): Stand je Wurzel → { signatur, basisCommit, vZeit, vorschlaege, uZeit, uFrist, ungesichert } (Promises). */
const STAND_CACHE = new Map()

/** Höchstzahl der Einträge der Stat-Signatur; darüber gilt sie als unbestimmt (wie ein Durchlauf der Erkennung, nie unbegrenzt). */
const SIGNATUR_MAX = 4000

/** Signatur, wenn der Stand nicht billig bestimmbar ist (zu viele Einträge) — dann gilt für die Vorschläge die kurze Frist. */
const SIGNATUR_UNBESTIMMT = '?'

/** Frist für „ungesichert“ nach einer Zeitgrenze von git status (code-reviewer 5: unter Windows läuft git danach weiter). */
const ZEITGRENZE_FRIST_MS = 60000

/** Höchstzahl der gezeigten Pfade im Hinweis „ungesichert“ (die Anzahl steht daneben). */
const UNGESICHERT_MAX = 20

/**
 * Art eines Eintrags für die Signatur (lstat, nie gefolgt). @param abs - Pfad @returns Text ('-' fehlt)
 */
function statText(abs) {
  const info = lstatOderFehlt(abs)
  return info === 'fehlt' ? '-' : `${info.isSymbolicLink() ? 'l' : info.isDirectory() ? 'd' : 'f'}:${info.size}:${info.mtimeMs}`
}

/**
 * Stat-Signatur des Stands, von dem die Vorschläge abhängen (V4, Advisor 5c): lstat-Durchlauf unter vorschlaege/faehigkeiten (Pfad,
 * Art, Größe, mtimeMs; nie einer Verknüpfung gefolgt), die Namen in .claude/skills, .claude/agents, .claude/commands (ziel_existiert,
 * Mehrdeutigkeit mit Commands; kein Ordner ⇒ seine Art) und die oberste .gitignore (ziel_ignoriert). Liest keinen Inhalt. Wirft nie.
 * Grenze (DEKLARIERT, code-reviewer 7): verschachtelte .gitignore-Dateien, Unterordner von .claude/commands und die Referenz der
 * eingebauten Namen gehen nicht ein — sie wirken höchstens bis zum Ablauf der Frist (die Route prüft frisch, 409).
 * @param wurzel - Arbeitsordner
 * @returns Signatur, SIGNATUR_UNBESTIMMT (zu viele Einträge) oder null (nicht lesbar ⇒ kein Cache)
 */
export function vorschlagSignatur(wurzel) {
  try {
    const teile = [`.gitignore:${statText(join(wurzel, '.gitignore'))}`]
    const offen = [VORSCHLAG_ORDNER]
    while (offen.length > 0) {
      const rel = offen.pop()
      const abs = join(wurzel, ...rel.split('/'))
      const art = statText(abs)
      teile.push(`${rel}:${art}`)
      if (teile.length > SIGNATUR_MAX) return SIGNATUR_UNBESTIMMT
      if (art.startsWith('d:')) for (const name of readdirSync(abs)) offen.push(`${rel}/${name}`)
    }
    for (const ordner of ['skills', 'agents', 'commands']) {
      const abs = join(wurzel, '.claude', ordner)
      const art = statText(abs)
      teile.push(`.claude/${ordner}:${art.startsWith('d:') ? readdirSync(abs).sort().join('/') : art}`)
    }
    return teile.sort().join('\n')
  } catch (fehler) {
    console.error(`[faehigkeiten] Signatur der Vorschläge in '${wurzel}' nicht bestimmbar:`, fehler)
    return null
  }
}

/**
 * Ungesicherte Änderungen unter .claude/ (F-1169, plan-fb2-v2 V1/V3): dieselbe Sicht wie der Laufdiff (leseClaudeAenderungen —
 * git status ohne Pathspec, Filter claudePfadeAusStatus), asynchron über den Git-Starter, fsmonitor aus. Wirft nie.
 * @param wurzel - Arbeitsordner
 * @param git - Ausführer (Tests), Standard fuehreGitAsync
 * @returns null (nichts ungesichert) | { status: 'ok', pfade, anzahl } | { status: 'nicht_bestimmbar', grund }
 */
export async function leseClaudeUngesichert(wurzel, git = fuehreGitAsync) {
  try {
    const e = await git(['--no-optional-locks', '-c', 'core.fsmonitor=false', 'status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: wurzel, zeitgrenzeMs: 5000, maxBuffer: 50_000_000 })
    if (e.abbruch !== undefined || e.code !== 0) {
      console.error(`[faehigkeiten] git status in '${wurzel}' nicht auswertbar (code ${e.code}${e.abbruch !== undefined ? `, ${e.abbruch}` : ''}):`, e.stderr)
      return { status: 'nicht_bestimmbar', grund: e.abbruch ?? `git status code ${e.code}` }
    }
    const pfade = claudePfadeAusStatus(e.stdout).sort()
    return pfade.length === 0 ? null : { status: 'ok', pfade: pfade.slice(0, UNGESICHERT_MAX), anzahl: pfade.length }
  } catch (fehler) {
    console.error(`[faehigkeiten] Stand von .claude/ in '${wurzel}' nicht bestimmbar:`, fehler)
    return { status: 'nicht_bestimmbar', grund: String(fehler?.message ?? fehler) }
  }
}

/**
 * Ob ein Vorschlag als Körper der Routen adressierbar ist (V5) — mit den Prüfungen der Route, kein Zwilling im Client.
 * @param v - Vorschlag
 * @returns adressierbar?
 */
const adressierbar = (v) => (v.typ === 'skill' || v.typ === 'agent') && typeof v.name === 'string' && istSchreibbarerName(v.name) && typeof v.hash === 'string' && SHA256_MUSTER.test(v.hash)

/**
 * Felder der Fähigkeit-Vorschläge für GET …/abnahme (FB-2, plan-fb2-v2): faehigkeitVorschlaege (mit adressierbar und ziel) und
 * faehigkeitUngesichert, jedes nur, wenn nicht leer — ohne beide {} (Antwort bitgleich). Cache je Wurzel (cr1, V4): Vorschläge bei
 * gleicher Signatur und Basis höchstens vorschlagCacheMs alt (Signatur unbestimmt: ungesichertCacheMs), ungesichert höchstens
 * ungesichertCacheMs (nach einer Zeitgrenze ZEITGRENZE_FRIST_MS); laufende Aufrufe werden geteilt; eine andere Signatur ersetzt den
 * ganzen Eintrag, eine nicht lesbare (null) cacht nichts. Einträge entstehen nur synchron vor dem ersten await — vergissVorschlagStand
 * löscht, ein älterer Aufruf schreibt nichts zurück. Wirft nie (V2): jeder Teil fängt seine Fehler (Vorschläge ⇒ [], ungesichert ⇒
 * „nicht bestimmbar“), ein Wurf außerhalb ⇒ ungesichert „nicht bestimmbar“.
 * @param wurzel - Arbeitsordner
 * @param optionen - { basisCommit, jetzt, cache, vorschlagCacheMs, ungesichertCacheMs, projektion, ungesichert } (die letzten für Tests)
 * @returns Felder zum Einmischen in die Antwort
 */
export async function baueVorschlagFelder(wurzel, { basisCommit = null, jetzt = Date.now, cache = STAND_CACHE, vorschlagCacheMs = 30000, ungesichertCacheMs = 10000, projektion = baueVorschlagProjektion, ungesichert = leseClaudeUngesichert } = {}) {
  try {
    const signatur = vorschlagSignatur(wurzel)
    let eintrag = cache.get(wurzel)
    if (eintrag === undefined || signatur === null || eintrag.signatur !== signatur || eintrag.basisCommit !== basisCommit) {
      eintrag = { signatur, basisCommit, vZeit: 0, vorschlaege: null, uZeit: 0, uFrist: ungesichertCacheMs, ungesichert: null }
      if (signatur === null) cache.delete(wurzel)
      else cache.set(wurzel, eintrag)
    }
    const zeit = jetzt()
    const vFrist = signatur === SIGNATUR_UNBESTIMMT ? ungesichertCacheMs : vorschlagCacheMs
    if (eintrag.vorschlaege === null || zeit - eintrag.vZeit >= vFrist) {
      eintrag.vZeit = zeit
      eintrag.vorschlaege = Promise.resolve()
        .then(() => projektion(wurzel, { basisCommit }))
        .catch((fehler) => {
          console.error(`[faehigkeiten] Vorschläge in '${wurzel}' nicht bestimmbar:`, fehler)
          return []
        })
    }
    if (eintrag.ungesichert === null || zeit - eintrag.uZeit >= eintrag.uFrist) {
      const neu = eintrag
      neu.uZeit = zeit
      neu.uFrist = ungesichertCacheMs
      neu.ungesichert = Promise.resolve()
        .then(() => ungesichert(wurzel))
        .catch((fehler) => {
          // code-reviewer 6: ein Fehler hier nimmt die Vorschläge nicht mit.
          console.error(`[faehigkeiten] Stand von .claude/ in '${wurzel}' nicht bestimmbar:`, fehler)
          return { status: 'nicht_bestimmbar', grund: String(fehler?.message ?? fehler) }
        })
        .then((stand) => {
          if (stand?.status === 'nicht_bestimmbar' && stand.grund === 'zeitgrenze') neu.uFrist = ZEITGRENZE_FRIST_MS
          return stand
        })
    }
    const [vorschlaege, stand] = await Promise.all([eintrag.vorschlaege, eintrag.ungesichert])
    return {
      ...(vorschlaege.length > 0 ? { faehigkeitVorschlaege: vorschlaege.map((v) => ({ ...v, ziel: zielPfad(v), adressierbar: adressierbar(v) })) } : {}),
      ...(stand !== null ? { faehigkeitUngesichert: stand } : {}),
    }
  } catch (fehler) {
    console.error(`[faehigkeiten] Felder der Vorschläge in '${wurzel}' nicht bestimmbar:`, fehler)
    return { faehigkeitUngesichert: { status: 'nicht_bestimmbar', grund: String(fehler?.message ?? fehler) } }
  }
}

/**
 * Verwirft den Stand einer Wurzel samt git-Cache der Projektion (nach jeder Aktion übernehmen/verwerfen, V4 5d; code-reviewer 7) —
 * die Abnahme liest danach frisch.
 * @param wurzel - Arbeitsordner
 * @param cache - Cache (Tests)
 */
export function vergissVorschlagStand(wurzel, cache = STAND_CACHE) {
  cache.delete(wurzel)
  for (const k of STANDARD_CACHE.keys()) if (k.startsWith(`${wurzel}\0`)) STANDARD_CACHE.delete(k)
}

/** Pfad der Routen (Zwischenmuster: hier erkannt, die Methode prüft der Server). */
const ROUTE = /^\/api\/workflows\/([^/]+)\/faehigkeit-vorschlag\/(uebernehmen|verwerfen)$/

/**
 * Erkennt POST-Pfade …/faehigkeit-vorschlag/uebernehmen|verwerfen (ohne Methode — die prüft der Server hinter dem CSRF-Haken).
 * @param pfad - pathname
 * @returns { rohId, aktion } oder null
 */
export function erkenneVorschlagRoute(pfad) {
  const treffer = ROUTE.exec(pfad)
  return treffer === null ? null : { rohId: treffer[1], aktion: treffer[2] }
}

/**
 * Prüft den Körper: ein Objekt mit genau typ ('skill'|'agent'), name (anlegbar, q9) und hash (sha256).
 * @param daten - geparster Körper
 * @returns { ok: true, typ, name, hash } oder { ok: false, status: 400, grund }
 */
export function pruefeVorschlagKoerper(daten) {
  const fehler = (grund) => ({ ok: false, status: 400, grund })
  if (daten === null || typeof daten !== 'object' || Array.isArray(daten)) return fehler('Body muss ein JSON-Objekt { typ, name, hash } sein')
  const fremd = Object.keys(daten).filter((k) => k !== 'typ' && k !== 'name' && k !== 'hash')
  if (fremd.length > 0) return fehler(`unbekannte Felder: ${fremd.slice(0, 5).join(', ')} — erlaubt sind typ, name, hash`)
  if (daten.typ !== 'skill' && daten.typ !== 'agent') return fehler("typ muss 'skill' oder 'agent' sein")
  if (typeof daten.name !== 'string' || !istSchreibbarerName(daten.name)) return fehler('name fehlt oder ist nicht anlegbar (nur Buchstaben, Ziffern, Punkt, _ und -; kein Punkt am Ende, kein Gerätename wie con)')
  if (typeof daten.hash !== 'string' || !SHA256_MUSTER.test(daten.hash)) return fehler('hash muss ein sha256 (64 Hex-Zeichen, klein) sein')
  return { ok: true, typ: daten.typ, name: daten.name, hash: daten.hash }
}

/** Antwort. @param status - HTTP-Status @param grund - Grund @param felder - weitere Felder @returns { status, koerper } */
const antwort = (status, grund, felder = {}) => ({ status, koerper: { grund, ...felder } })

/**
 * Sperrgrund aus einer Lage des Servers (streng: jede unerwartete Form sperrt — Delta 1).
 * @param lage - Rückgabe von kontext.lage
 * @param aktion - 'uebernehmen' | 'verwerfen'
 * @returns { status, koerper } oder null
 */
function lageSperre(lage, aktion) {
  if (lage === null || typeof lage !== 'object') return antwort(404, 'Ablauf nicht gefunden')
  if (lage.laufGesperrt !== null) return antwort(409, typeof lage.laufGesperrt === 'string' ? lage.laufGesperrt : 'Laufsperre nicht bestimmbar')
  if (typeof lage.wurzel !== 'string') return antwort(409, 'Der Ablauf hat keinen bereiten Arbeitsordner (fehlt, wird vorbereitet oder aufgeräumt, ist aufgeräumt oder liegt nicht auf der Platte)')
  if (aktion === 'uebernehmen') {
    const a = lage.abnahme
    const erlaubt = a?.faellig === true && (a.offen === true || (a.entscheidungStatus === 'ok' && a.ergebnis === 'ANGENOMMEN'))
    if (!erlaubt) return antwort(409, 'Übernehmen geht nur bei offener Abnahme oder nach ANGENOMMEN (E-FB1-3) — Verwerfen geht immer')
  }
  return null
}

/** Eintrag mit genau typ und name. @param liste - Erkennung @param k - Körper @returns Eintrag oder undefined */
const finde = (liste, k) => liste.find((v) => v.typ === k.typ && v.name === k.name)

/** Art per lstat ('fehlt' bei ENOENT). @param abs - Pfad @returns lstat-Ergebnis oder 'fehlt' @throws andere Fehler */
function lstatOderFehlt(abs) {
  try {
    return lstatSync(abs)
  } catch (fehler) {
    if (fehler?.code === 'ENOENT') return 'fehlt'
    throw fehler
  }
}

/**
 * Liegt abs (nach realpathSync.native) genau an rel unter realWurzel? Vergleich je Segment ohne Unterschied der Schreibweise
 * (realpath liefert unter Windows die echte Schreibweise), nie '..', nie absolut.
 * @param realWurzel - realpathSync.native der Wurzel
 * @param abs - zu prüfender Pfad
 * @param rel - erwarteter Pfad relativ zur Wurzel ('/')
 * @returns enthalten?
 */
function liegtAn(realWurzel, abs, rel) {
  let echt
  try {
    echt = realpathSync.native(abs)
  } catch {
    // Zwischen lstat und realpath verschwunden (code-reviewer FB-1b 3) — nicht an seinem Ort, Bedienfall statt 500.
    return false
  }
  const r = relative(realWurzel, echt)
  if (r === '' || isAbsolute(r)) return false
  const ist = r.split(sep)
  const soll = rel.split('/')
  return ist[0] !== '..' && ist.length === soll.length && ist.every((s, i) => s.toLowerCase() === soll[i].toLowerCase())
}

/**
 * B6 Quelle: Behälter und Vorschlag ohne Verknüpfung, an ihrem Ort unter der Wurzel.
 * @param wurzel - Arbeitsordner
 * @param realWurzel - realpathSync.native(wurzel)
 * @param eintrag - Vorschlag
 * @returns { ok: true, abs } oder { ok: false, grund }
 */
function pruefeQuelle(wurzel, realWurzel, eintrag) {
  const behaelter = eintrag.typ === 'skill' ? 'skills' : 'agents'
  for (const rel of ['vorschlaege', VORSCHLAG_ORDNER, `${VORSCHLAG_ORDNER}/${behaelter}`, eintrag.pfad]) {
    const abs = join(wurzel, ...rel.split('/'))
    const info = lstatOderFehlt(abs)
    const istVorschlag = rel === eintrag.pfad
    const artOk = info !== 'fehlt' && !info.isSymbolicLink() && (istVorschlag && eintrag.typ === 'agent' ? info.isFile() : info.isDirectory())
    if (!artOk || !liegtAn(realWurzel, abs, rel)) return { ok: false, grund: `'${rel}' ist nicht an seinem Ort oder eine Verknüpfung — nichts geändert` }
  }
  return { ok: true, abs: join(wurzel, ...eintrag.pfad.split('/')) }
}

/**
 * B6 Ziel: .claude und .claude/<skills|agents> einzeln prüfen bzw. nicht rekursiv anlegen, danach erneut lstat und Ort.
 * @param wurzel - Arbeitsordner
 * @param realWurzel - realpathSync.native(wurzel)
 * @param typ - skill | agent
 * @returns { ok: true, ordner, angelegt } oder { ok: false, grund, angelegt }
 */
function bereiteZielVor(wurzel, realWurzel, typ) {
  const angelegt = []
  for (const rel of ['.claude', `.claude/${typ === 'skill' ? 'skills' : 'agents'}`]) {
    const abs = join(wurzel, ...rel.split('/'))
    try {
      if (lstatOderFehlt(abs) === 'fehlt') {
        mkdirSync(abs)
        angelegt.push(abs)
      }
      const info = lstatSync(abs)
      if (info.isSymbolicLink() || !info.isDirectory() || !liegtAn(realWurzel, abs, rel)) return { ok: false, grund: `'${rel}' ist kein Ordner an seinem Ort (Verknüpfung?) — nichts übernommen`, angelegt }
    } catch (fehler) {
      // code-reviewer FB-1b 2: EPERM, EEXIST im Wettlauf o. Ä. — Bedienfall, angelegte Ordner räumt der Aufrufer weg.
      return { ok: false, grund: `'${rel}' nicht anlegbar (${fehler.message}) — nichts übernommen`, angelegt }
    }
  }
  return { ok: true, ordner: join(wurzel, '.claude', typ === 'skill' ? 'skills' : 'agents'), angelegt }
}

/** Entfernt leere Ordner, den innersten zuerst (best effort, rmdir löscht nur leere). @param ordner - Pfade von außen nach innen */
function entferneLeere(ordner) {
  for (const o of [...ordner].reverse()) {
    try {
      rmdirSync(o)
    } catch {
      // nicht leer oder schon weg — bleibt
    }
  }
}

/**
 * Projekt-Einträge mit Hash im Arbeitsordner — als Grundlage der Probe (alle aktiv, je eigener Hash; Advisor-Delta 7).
 * @param wurzel - Arbeitsordner
 * @param kontextBasis - { werkzeugNamen, referenz }
 * @returns { an, inhalt_freigaben }
 */
function alleAktiv(wurzel, kontextBasis) {
  const vorlauf = ermittleProjektFaehigkeiten(wurzel, { ...kontextBasis, katalog: new Map(), einstellungen: { an: [], aus: [], inhalt_freigaben: {} } })
  const mitHash = vorlauf.eintraege.filter((e) => e.hash !== null)
  return { an: mitHash.map((e) => e.schluessel), inhalt_freigaben: Object.fromEntries(mitHash.map((e) => [e.schluessel, e.hash])) }
}

/** Relativer Pfad mit '/'. @param wurzel - Wurzel @param abs - Pfad @returns relativer Pfad */
const rel = (wurzel, abs) => relative(wurzel, abs).split(sep).join('/')

/**
 * Führt eine Dateioperation bis zu dreimal aus, mit kurzer synchroner Pause (qa FB-1b 5: unter Windows hält ein Virenscanner,
 * Indexer oder OneDrive einen gerade bewegten Ordner kurz fest — EPERM/EBUSY). Phase B bleibt synchron.
 * @param operation - Operation
 * @throws den letzten Fehler
 */
function mitWiederholung(operation) {
  for (let versuch = 1; ; versuch++) {
    try {
      operation()
      return
    } catch (fehler) {
      if (versuch >= 3 || (fehler?.code !== 'EPERM' && fehler?.code !== 'EBUSY' && fehler?.code !== 'EACCES')) throw fehler
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100)
    }
  }
}

/**
 * Rücknahme einer Bewegung (B9). Skill: Ordner zurück; Agent: nur die Kopie entfernen (die Quelle liegt noch).
 * @param typ - skill | agent
 * @param quelle - absoluter Pfad des Vorschlags
 * @param ziel - absoluter Zielpfad
 * @param wurzel - Arbeitsordner (für relative Orte im Grund)
 * @returns null oder 500-Antwort mit beiden Orten
 */
function nimmZurueck(typ, quelle, ziel, wurzel) {
  try {
    mitWiederholung(() => (typ === 'skill' ? renameSync(ziel, quelle) : unlinkSync(ziel)))
    return null
  } catch (fehler) {
    const orte = { quelle: rel(wurzel, quelle), ziel: rel(wurzel, ziel) }
    console.error(`[faehigkeiten] Rücknahme gescheitert (${orte.quelle} ⇐ ${orte.ziel}):`, fehler)
    return antwort(500, `Rücknahme gescheitert (${fehler.message}) — Vorschlag: ${orte.quelle}, Ziel: ${orte.ziel}; ohne Freigabe ist der Inhalt nicht aktiv, bitte von Hand aufräumen`, orte)
  }
}

/** B4 (DEKLARIERT, plan-fb1b §3) und E-FB1-3 („Review veraltet“). @param offen - Abnahme offen @returns Hinweis */
const hinweisText = (offen) =>
  `Die Fähigkeit liegt jetzt ungesichert unter .claude/ des Arbeitsordners — vor einem weiteren Lauf in diesem Ablauf sichern (Bereit zum Sichern), sonst wird ein Lauf mit Fähigkeiten, Ort-B-Skill oder Plugin rot.${offen ? ' Das Review gilt danach als veraltet (geänderter Inhalt).' : ''}`

/**
 * Phase B (bewusst NICHT async, Advisor-Delta 1): prüft alles frisch und schreibt im selben synchronen Abschnitt.
 * @param aktion - 'uebernehmen' | 'verwerfen'
 * @param workflowId - Kennung
 * @param k - geprüfter Körper { typ, name, hash }
 * @param vorab - Ergebnis von Phase A { wurzel, basisCommit, basis, ignoriert }
 * @param kontext - { lage, projektId, lokalPfad, waechter, aendere, referenz? }
 * @returns { status, koerper } (nie ein Promise)
 */
export function fuehreSynchronDurch(aktion, workflowId, k, vorab, kontext) {
  const lage = kontext.lage(workflowId)
  const sperre = lageSperre(lage, aktion)
  if (sperre !== null) return sperre
  if (lage.wurzel !== vorab.wurzel || lage.basisCommit !== vorab.basisCommit) return antwort(409, 'Der Arbeitsordner hat sich während der Prüfung geändert — neu laden, nichts geändert')
  const wurzel = lage.wurzel
  const eintrag = finde(erkenneFaehigkeitVorschlaege(wurzel), k)
  if (eintrag === undefined) return antwort(404, `Vorschlag ${k.typ}:${k.name} nicht gefunden`)
  if (eintrag.hash === null) return antwort(409, `Vorschlag nicht vollständig gelesen (${eintrag.grund ?? 'unbekannt'}) — '${eintrag.pfad}' im Arbeitsordner von Hand entfernen`)
  if (eintrag.hash !== k.hash) return antwort(409, `Inhalt des Vorschlags hat sich seit der Anzeige geändert (jetzt ${eintrag.hash.slice(0, 12)}…) — neu laden, nichts geändert`)
  const stand = vorab.basis.ok ? vergleicheMitBasis(wurzel, eintrag, vorab.basis.baum) : null
  if (stand === 'unveraendert') return antwort(404, 'Vorschlag liegt unverändert im Basis-Commit — zählt nicht (q1)')
  // Nicht bestimmbar sperrt nur das Übernehmen (fail-closed); Verwerfen bleibt möglich (qa FB-1b 3, code-reviewer 6, E-FB1-3).
  if (stand === null && aktion === 'uebernehmen') return antwort(409, BASIS_UNBESTIMMT)
  const schluessel = `${k.typ}:${k.name}`
  if (aktion === 'uebernehmen') {
    if (eintrag.grund !== null) return antwort(409, eintrag.grund)
    if (eintrag.ziel_existiert !== false) return antwort(409, `Ziel ${zielPfad(eintrag)} existiert schon (auch in anderer Schreibweise) — nie überschreiben; eine bestehende Fähigkeit aktualisiert nur Stefan von Hand, den Vorschlag verwerfen`)
    if (vorab.ignoriert !== false) return antwort(409, vorab.ignoriert === true ? ZIEL_IGNORIERT : 'Ob das Ziel gitignoriert ist, ist nicht bestimmbar — nichts übernommen')
    if (kontext.lokalPfad === null) return antwort(409, 'Diese Instanz hat keine faehigkeiten.lokal.json (nur der reale Leitstand gibt frei)')
    const lokal = ladeFaehigkeitenLokal(kontext.lokalPfad)
    if (lokal.zustand === 'ungueltig') return antwort(409, `${lokal.grund} — erst reparieren, nichts übernommen`)
    if (kontext.waechter !== null && kontext.waechter.pruefe(hashLokaleDatei(kontext.lokalPfad)) !== null) return antwort(409, `${FREMD_UNBESTAETIGT} — nichts übernommen`)
    const e = projektEinstellungen(lokal.daten, kontext.projektId)
    const klein = schluessel.toLowerCase()
    if (e.an.some((x) => x.toLowerCase() === klein)) return antwort(409, `${schluessel} ist im Projekt eingeschaltet — nach der Übernahme wäre der neue Inhalt sofort aktiv (E-F45-6); erst ausschalten`)
    const freigabe = Object.entries(e.inhalt_freigaben).find(([x]) => x.toLowerCase() === klein)
    if (freigabe !== undefined && freigabe[1] !== k.hash) return antwort(409, `${freigabe[0]} hat schon eine Freigabe nach Inhalt (${freigabe[1].slice(0, 12)}…) — die Übernahme würde sie überschreiben; den Vorschlag unter anderem Namen bauen lassen oder die alte Freigabe in faehigkeiten.lokal.json von Hand entfernen (dann „Datei geprüft – Stand übernehmen“)`)
    if (!Array.isArray(lage.werkzeugNamen)) return antwort(409, 'Werkzeugsatz der Ausführung nicht bestimmbar — Probe nicht möglich')
  }
  const realWurzel = realpathSync.native(wurzel)
  const quelle = pruefeQuelle(wurzel, realWurzel, eintrag)
  if (!quelle.ok) return antwort(409, quelle.grund)
  // Behälter von außen nach innen (entferneLeere löscht den innersten zuerst).
  const behaelter = [join(wurzel, 'vorschlaege'), join(wurzel, ...VORSCHLAG_ORDNER.split('/')), join(wurzel, ...VORSCHLAG_ORDNER.split('/'), k.typ === 'skill' ? 'skills' : 'agents')]

  if (aktion === 'verwerfen') {
    try {
      if (k.typ === 'skill') rmSync(quelle.abs, { recursive: true, maxRetries: 3 })
      else unlinkSync(quelle.abs)
    } catch (fehler) {
      console.error(`[faehigkeiten] Verwerfen von '${eintrag.pfad}' gescheitert:`, fehler)
      return antwort(409, `Vorschlag nicht (vollständig) entfernt (${fehler.message}) — neu laden und erneut verwerfen oder '${eintrag.pfad}' von Hand entfernen`)
    }
    entferneLeere(behaelter)
    return { status: 200, koerper: { typ: k.typ, name: k.name, verworfen: true } }
  }

  const referenz = kontext.referenz ?? leseEingebautReferenz()
  if (!referenz.ok) return antwort(409, `${referenz.grund} — Probe nicht möglich, nichts übernommen`)
  const kontextBasis = { werkzeugNamen: lage.werkzeugNamen, referenz: referenz.referenz }
  const vorher = alleAktiv(wurzel, kontextBasis)
  const hindernisseVorher = ermittleProjektFaehigkeiten(wurzel, { ...kontextBasis, katalog: new Map(), einstellungen: { an: vorher.an, aus: [], inhalt_freigaben: vorher.inhalt_freigaben } }).hindernisse
  const ziel = bereiteZielVor(wurzel, realWurzel, k.typ)
  if (!ziel.ok) {
    entferneLeere(ziel.angelegt)
    return antwort(409, ziel.grund)
  }
  const zielAbs = join(ziel.ordner, k.typ === 'skill' ? k.name : `${k.name}.md`)
  if (lstatOderFehlt(zielAbs) !== 'fehlt') {
    entferneLeere(ziel.angelegt)
    return antwort(409, `Ziel ${zielPfad(eintrag)} existiert schon — nie überschreiben`)
  }
  try {
    if (k.typ === 'skill') renameSync(quelle.abs, zielAbs)
    else copyFileSync(quelle.abs, zielAbs, constants.COPYFILE_EXCL)
  } catch (fehler) {
    entferneLeere(ziel.angelegt)
    return antwort(409, `Bewegen gescheitert (${fehler.message}) — nichts übernommen`)
  }
  // Ab dem Bewegen bis zur geschriebenen Freigabe: jeder Wurf nimmt zurück (code-reviewer FB-1b 1), statt als 500 ohne
  // Rücknahme zu enden.
  let ablehnung
  try {
    // Probe am Ziel (q4, Advisor-Delta 7): alle vorhandenen Einträge aktiv, s mit dem angezeigten Hash.
    const nachher = ermittleProjektFaehigkeiten(wurzel, { ...kontextBasis, katalog: new Map(), einstellungen: { an: [...vorher.an, schluessel], aus: [], inhalt_freigaben: { ...vorher.inhalt_freigaben, [schluessel]: k.hash } } })
    const neu = nachher.eintraege.find((x) => x.schluessel === schluessel)
    const neueHindernisse = nachher.hindernisse.filter((h) => !hindernisseVorher.includes(h))
    const probeGrund = neu?.aktiv !== true ? (neu?.grund ?? 'am Ziel nicht gefunden') : neueHindernisse.length > 0 ? neueHindernisse.join('; ') : null
    if (probeGrund !== null) ablehnung = `würde am Start gesperrt: ${probeGrund} — nichts übernommen`
    else {
      const freigegeben = kontext.aendere({ art: 'freigabe', eintrag: schluessel, hash: k.hash })
      if (!freigegeben.ok) ablehnung = `${freigegeben.grund} — nichts übernommen`
    }
  } catch (fehler) {
    console.error(`[faehigkeiten] Übernahme von '${eintrag.pfad}' nach dem Bewegen abgebrochen:`, fehler)
    ablehnung = `unerwartet abgebrochen (${fehler.message}) — nichts übernommen`
  }
  if (ablehnung !== undefined) {
    const gescheitert = nimmZurueck(k.typ, quelle.abs, zielAbs, wurzel)
    if (gescheitert !== null) return gescheitert
    entferneLeere(ziel.angelegt)
    return antwort(409, ablehnung)
  }
  let zusatz = {}
  if (k.typ === 'agent') {
    try {
      unlinkSync(quelle.abs)
    } catch (fehler) {
      console.error(`[faehigkeiten] Vorschlag '${eintrag.pfad}' nach der Übernahme nicht entfernt:`, fehler)
      zusatz = { vorschlag_geblieben: `Vorschlag blieb liegen (${fehler.message}) — verwerfen` }
    }
  }
  entferneLeere(behaelter)
  return { status: 200, koerper: { typ: k.typ, name: k.name, hash: k.hash, ziel: zielPfad(eintrag), eingeschaltet: false, hinweis: hinweisText(lage.abnahme?.offen === true), ...zusatz } }
}

/**
 * Ablauf der Routen übernehmen/verwerfen. Phase A asynchron (schreibt nichts), dann Phase B synchron (fuehreSynchronDurch).
 * Wirft nie.
 * @param route - erkenneVorschlagRoute(pfad)
 * @param gelesen - leseJsonBegrenzt des Servers: { ok: true, daten } | { ok: false, status, grund }
 * @param kontext - { lage(workflowId) ⇒ null | { wurzel, basisCommit, laufGesperrt, abnahme: { faellig, offen, entscheidungStatus,
 *   ergebnis }, werkzeugNamen }, projektId, lokalPfad, waechter, aendere(aenderung) ⇒ { ok, grund? }, referenz? }
 * @returns { status, koerper }
 */
export async function fuehreVorschlagAktionDurch(route, gelesen, kontext) {
  // FB-2 (V4 5d): der Stand der Wurzel verfällt nach jeder Aktion mit bekannter Wurzel, gleich mit welchem Ausgang.
  let wurzelFuerStand = null
  try {
    let workflowId
    try {
      workflowId = decodeURIComponent(route.rohId)
    } catch {
      workflowId = null
    }
    if (workflowId === null || workflowId === '' || workflowId.length > ABLAUF_KENNUNG_MAX || LAUFID_UNZULAESSIGE_ZEICHEN.test(workflowId)) return antwort(400, 'Ablaufkennung fehlt, ist nicht dekodierbar, zu lang oder enthält unzulässige Zeichen')
    if (!gelesen.ok) return antwort(gelesen.status, gelesen.grund)
    const k = pruefeVorschlagKoerper(gelesen.daten)
    if (!k.ok) return antwort(k.status, k.grund)
    const lage = kontext.lage(workflowId)
    if (typeof lage?.wurzel === 'string') wurzelFuerStand = lage.wurzel
    const sperre = lageSperre(lage, route.aktion)
    if (sperre !== null) return sperre
    const eintrag = finde(erkenneFaehigkeitVorschlaege(lage.wurzel), k)
    if (eintrag === undefined) return antwort(404, `Vorschlag ${k.typ}:${k.name} nicht gefunden`)
    if (route.aktion === 'uebernehmen' && eintrag.grund !== null) return antwort(409, eintrag.grund)
    const [basis, ignoriert] = await Promise.all([leseBasisBaum(lage.wurzel, lage.basisCommit), route.aktion === 'uebernehmen' ? pruefeZielIgnoriert(lage.wurzel, [eintrag]) : Promise.resolve(new Map())])
    // Ab hier kein await (Phase B, Advisor-Delta 1).
    return fuehreSynchronDurch(route.aktion, workflowId, k, { wurzel: lage.wurzel, basisCommit: lage.basisCommit, basis, ignoriert: ignoriert.get(eintrag.pfad) }, kontext)
  } catch (fehler) {
    console.error(`[faehigkeiten] ${route.aktion} unerwartet abgebrochen:`, fehler)
    return antwort(500, `unerwartet abgebrochen: ${fehler?.message ?? fehler}`)
  } finally {
    if (wurzelFuerStand !== null) vergissVorschlagStand(wurzelFuerStand)
  }
}
