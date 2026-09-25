/**
 * Datei: src/aenderungsuebersicht/index.ts
 *
 * Zweck: Änderungsübersicht als Kernartefakt (F23 WS-0, features/F23/
 * feature.md). Löst state/findings.md F-378: kein Werkzeugsatz enthält ein
 * lesendes Git oder Bash (`startvorlagen/*.json`, `werkzeugsaetze.lesend`/
 * `schreibend`) — eine Rolle kann das Ergebnis eines Baulaufs also nicht
 * selbst gegen den vorherigen Stand vergleichen. Der KERN ermittelt die
 * Änderungsübersicht deshalb selbst, rein lesend, über einen eigenen
 * `git`-Kindprozess gegen die Repo-Wurzel — dasselbe Muster, mit dem
 * src/authorization-boundary/index.ts (`leseAusCommit`, F3) bereits einen
 * lesenden `git`-Kindprozess aus dem Kern heraus startet. Kein Verstoß
 * gegen src/invocation-policy/ oder src/authorization-boundary/: AC8 dort
 * verbietet ausschließlich DEM INVOCATION-POLICY-MODUL selbst, einen
 * Werkzeugprozess zu starten (F4 stellt nur fest, ob ein Start erlaubt
 * wäre) — dieses Modul ist kein Teil von F3/F4 und startet keinen
 * Ausführungswerkzeug-Prozess, sondern liest read-only mit `git diff`/
 * `git status`, ohne Schreibwirkung auf das Repo.
 *
 * erzeugeAenderungsuebersichtDaten wirft NIE (Bauauftrag Punkt 4): schlägt
 * die Ermittlung fehl (kein Git, kein Repo, kein Commit unter HEAD, ein
 * einzelner git-Aufruf scheitert), liefert die Funktion ein schemagültiges,
 * aber degradiertes Artefakt mit leerem `dateien` und dem Grund in
 * `stat_text` — der auslösende Lauf darf daran nicht scheitern
 * (scripts/leitstand-server.mjs registriert das Artefakt NACH dessen
 * eigenem Terminalzustand, ein Fehlschlag der Registrierung selbst landet
 * dort in der Startfehlerliste, nicht im Laufstatus).
 *
 * Rename-Erkennung (`-M`) ist bewusst über ZWEI git-Aufrufe mit denselben
 * Argumenten aufgeteilt (`--name-status` für Pfad+Status, `--numstat` für
 * Zeilenzahlen) und wird über den Dateiindex zusammengeführt, statt
 * `--numstat`s eigenes `{alt => neu}`-Pfadformat zu parsen — git liefert
 * beide Listen für dieselbe Diff-Anfrage in derselben Dateireihenfolge.
 *
 * ermittlePruefkettenAenderungen/lesePackageScriptsStaende (F-713, Regel 1j) werten dieselbe
 * Übersicht zusätzlich darauf aus, ob ein Lauf die eigene Prüfkette verändert hat.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (nach einem real
 * ERFOLGREICH/ABGESCHLOSSEN beendeten Lauf mit schreibendem Werkzeugsatz; die F-713-Funktionen im
 * Workflow-Nachlauf eines schreibenden 'ausfuehrung'-Schritts).
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AenderungsuebersichtDatei, AenderungsuebersichtDateiStatus, AenderungsuebersichtV0Daten } from './types.ts'

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.length > 0
}

const AENDERUNGSUEBERSICHT_FELDER = new Set([
  'aenderungsuebersicht_schema',
  'lauf_id',
  'erzeugt_am',
  'basis_ref',
  'dateien',
  'stat_text',
  'patch',
  'gekuerzt',
  'budget_bytes',
])

const DATEI_FELDER = new Set(['pfad', 'status', 'plus', 'minus'])
/** F-735: additive, optionale Datei-Felder — erlaubt, aber nicht Pflicht (Alt-Artefakte bleiben gültig). */
const DATEI_FELDER_OPTIONAL = new Set(['alter_pfad'])
const DATEI_STATUS_WERTE: AenderungsuebersichtDateiStatus[] = ['GEAENDERT', 'NEU', 'GELOESCHT', 'UMBENANNT']

function istGanzzahlOderNull(wert: unknown): wert is number | null {
  return wert === null || (typeof wert === 'number' && Number.isInteger(wert) && wert >= 0)
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/kontrollzustand-aenderungsuebersicht-payload.schema.json. Muster
 * validiereRouterErgebnisDaten (src/router/index.ts, D5 — handgeschrieben
 * statt ajv).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereAenderungsuebersichtDaten(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []

  for (const feld of Object.keys(daten)) {
    if (!AENDERUNGSUEBERSICHT_FELDER.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of AENDERUNGSUEBERSICHT_FELDER) {
    if (!(feld in daten)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('aenderungsuebersicht_schema' in daten && daten.aenderungsuebersicht_schema !== 'v0') {
    verstoesse.push("'aenderungsuebersicht_schema' muss 'v0' sein")
  }
  if ('lauf_id' in daten && !istNichtLeererString(daten.lauf_id)) {
    verstoesse.push("'lauf_id' muss ein nicht-leerer String sein")
  }
  if ('erzeugt_am' in daten && !istNichtLeererString(daten.erzeugt_am)) {
    verstoesse.push("'erzeugt_am' muss ein nicht-leerer String sein")
  }
  if ('basis_ref' in daten && daten.basis_ref !== null && !istNichtLeererString(daten.basis_ref)) {
    verstoesse.push("'basis_ref' muss ein nicht-leerer String oder null sein")
  }
  if ('stat_text' in daten && typeof daten.stat_text !== 'string') {
    verstoesse.push("'stat_text' muss ein String sein")
  }
  if ('patch' in daten && typeof daten.patch !== 'string') {
    verstoesse.push("'patch' muss ein String sein")
  }
  if ('gekuerzt' in daten && typeof daten.gekuerzt !== 'boolean') {
    verstoesse.push("'gekuerzt' muss ein boolean sein")
  }
  if ('budget_bytes' in daten && (!Number.isInteger(daten.budget_bytes) || (daten.budget_bytes as number) < 0)) {
    verstoesse.push("'budget_bytes' muss eine ganze Zahl >= 0 sein")
  }

  if ('dateien' in daten) {
    if (!Array.isArray(daten.dateien)) {
      verstoesse.push("'dateien' muss ein Array sein")
    } else {
      daten.dateien.forEach((eintrag, index) => {
        const praefix = `dateien[${index}]`
        if (!istObjekt(eintrag)) {
          verstoesse.push(`'${praefix}' ist kein Objekt`)
          return
        }
        for (const feld of Object.keys(eintrag)) {
          if (!DATEI_FELDER.has(feld) && !DATEI_FELDER_OPTIONAL.has(feld)) verstoesse.push(`unbekanntes Feld '${praefix}.${feld}' (additionalProperties: false)`)
        }
        for (const feld of DATEI_FELDER) {
          if (!(feld in eintrag)) verstoesse.push(`Pflichtfeld '${praefix}.${feld}' fehlt`)
        }
        if ('pfad' in eintrag && !istNichtLeererString(eintrag.pfad)) {
          verstoesse.push(`'${praefix}.pfad' muss ein nicht-leerer String sein`)
        }
        if ('status' in eintrag && (typeof eintrag.status !== 'string' || !DATEI_STATUS_WERTE.includes(eintrag.status as AenderungsuebersichtDateiStatus))) {
          verstoesse.push(`'${praefix}.status' muss einer von ${DATEI_STATUS_WERTE.join(', ')} sein`)
        }
        if ('plus' in eintrag && !istGanzzahlOderNull(eintrag.plus)) {
          verstoesse.push(`'${praefix}.plus' muss eine ganze Zahl >= 0 oder null sein`)
        }
        if ('minus' in eintrag && !istGanzzahlOderNull(eintrag.minus)) {
          verstoesse.push(`'${praefix}.minus' muss eine ganze Zahl >= 0 oder null sein`)
        }
        if ('alter_pfad' in eintrag && !istNichtLeererString(eintrag.alter_pfad)) {
          verstoesse.push(`'${praefix}.alter_pfad' muss, wenn angegeben, ein nicht-leerer String sein`)
        }
      })
    }
  }

  return verstoesse
}

/**
 * Fallback für `standardBudget.maxBytes`, wenn eine Startvorlage das Feld
 * nicht setzt (`src/startvorlage/types.ts`, `Budget.maxBytes` ist optional
 * — `src/startvorlage/startvorlage.test.ts` prüft genau diesen Fall). MUSS
 * eine endliche Ganzzahl sein: `validiereAenderungsuebersichtDaten`
 * verlangt `Number.isInteger(budget_bytes)`, und `Number.isInteger(Infinity)`
 * ist `false` — ein früherer `Number.POSITIVE_INFINITY`-Fallback ließ die
 * Registrierung dadurch für JEDE Startvorlage ohne `maxBytes` scheitern
 * (Reviewer-Pass 14.09.2026, kritischer Befund 1).
 */
export const STANDARD_MAX_BYTES = 200_000

/** Immer gesetzt, an jedem Aufruf: Git quotet/escaped Pfade mit Nicht-ASCII- oder Sonderzeichen sonst als C-String (Oktal-Escapes) statt sie roh als UTF-8 zu liefern — bei den durchgehend deutschen Datei-/Ordnernamen dieses Repos kein Randfall (Reviewer-Pass 14.09.2026, kritischer Befund 2). */
const GIT_BASISARGUMENTE = ['-c', 'core.quotePath=false']

/** Ausreichend für die vier kleinen, listenartigen git-Aufrufe (name-status/numstat/stat/porcelain) — je eine Zeile pro Datei, nie in der Größenordnung eines vollen Patch-Texts. */
const KLEINER_MAX_BUFFER = 20_000_000

/** Führt einen lesenden git-Befehl aus, liefert null statt zu werfen (kein Repo, kein git, ungültige Referenz, Ausgabe größer als maxBuffer — Bauauftrag Punkt 4: die Ermittlung darf den Lauf nicht scheitern lassen). */
function leseGitOderNull(repoWurzel: string, argumente: string[], maxBuffer: number = KLEINER_MAX_BUFFER): string | null {
  try {
    return execFileSync('git', [...GIT_BASISARGUMENTE, ...argumente], { cwd: repoWurzel, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer })
  } catch {
    return null
  }
}

const STATUS_AUS_BUCHSTABE: Record<string, AenderungsuebersichtDateiStatus> = {
  M: 'GEAENDERT',
  T: 'GEAENDERT',
  U: 'GEAENDERT',
  A: 'NEU',
  C: 'NEU',
  D: 'GELOESCHT',
  R: 'UMBENANNT',
}

function ganzzahlOderNull(feld: string | undefined): number | null {
  if (feld === undefined || feld === '-') return null
  const wert = Number(feld)
  return Number.isInteger(wert) && wert >= 0 ? wert : null
}

/**
 * Führt `git diff --name-status -M HEAD` (Pfad+Status) und
 * `git diff --numstat -M HEAD` (Zeilenzahlen) über den Dateiindex zusammen
 * (Kopfkommentar: beide Aufrufe liefern dieselbe Dateireihenfolge für
 * dieselbe Diff-Anfrage).
 */
function parseTrackedDateien(nameStatusRoh: string, numstatRoh: string): AenderungsuebersichtDatei[] {
  const nameStatusZeilen = nameStatusRoh.split('\n').filter((zeile) => zeile.length > 0)
  const numstatZeilen = numstatRoh.split('\n').filter((zeile) => zeile.length > 0)

  return nameStatusZeilen.flatMap((zeile, index): AenderungsuebersichtDatei[] => {
    const felder = zeile.split('\t')
    const buchstabe = felder[0]?.[0] ?? ''
    const status = STATUS_AUS_BUCHSTABE[buchstabe] ?? 'GEAENDERT'
    // Umbenennung/Kopie: 'R100\talt\tneu' — der NEUE Pfad ist der gültige Ort im Arbeitsbaum.
    const pfad = felder.length >= 3 ? felder[2] : felder[1]
    if (pfad === undefined || pfad.length === 0) return []

    const numstatFelder = numstatZeilen[index]?.split('\t') ?? []
    const eintrag: AenderungsuebersichtDatei = { pfad, status, plus: ganzzahlOderNull(numstatFelder[0]), minus: ganzzahlOderNull(numstatFelder[1]) }
    // F-735: bei einer Umbenennung zusätzlich den ALTEN Pfad festhalten — sonst bleibt eine
    // Umbenennung AUS einem Prüfkettenpfad heraus für Regel 1j unsichtbar. Eine Kopie (C) lässt
    // die Quelle unverändert und bekommt das Feld deshalb nicht.
    const alterPfad = felder[1]
    if (status === 'UMBENANNT' && felder.length >= 3 && alterPfad !== undefined && alterPfad.length > 0) eintrag.alter_pfad = alterPfad
    return [eintrag]
  })
}

/** AK2: untracked Dateien fehlen in 'git diff' vollständig — nur 'git status --porcelain' zeigt sie ('?? <pfad>'). */
function parseUntrackedDateien(porcelainRoh: string): AenderungsuebersichtDatei[] {
  return porcelainRoh
    .split('\n')
    .filter((zeile) => zeile.startsWith('?? '))
    .map((zeile) => ({ pfad: zeile.slice(3).trim(), status: 'NEU' as const, plus: null, minus: null }))
    .filter((eintrag) => eintrag.pfad.length > 0)
}

const GRUND_NICHT_MOEGLICH = 'Ermittlung nicht möglich: kein Git-Repository oder kein Commit unter HEAD an der Repo-Wurzel.'
const GRUND_UNVOLLSTAENDIG = 'Ermittlung unvollständig: mindestens einer der git-Befehle (diff/status) ist fehlgeschlagen.'

/**
 * Liefert, ob eine Änderungsübersicht degradiert ist (Ermittlung gescheitert, 'dateien' leer aus
 * Unwissen statt "nichts geändert"). F-689: die Rückfrage-Heuristik darf ein degradiertes Artefakt
 * NICHT als "0 Dateien geändert" lesen — sonst hielte ein Lauf aus Unwissen an.
 * @param daten - eine gültige Änderungsübersicht
 * @returns true, wenn das Artefakt von degradiertesArtefakt stammt
 */
export function istAenderungsuebersichtDegradiert(daten: AenderungsuebersichtV0Daten): boolean {
  return daten.dateien.length === 0 && (daten.stat_text === GRUND_NICHT_MOEGLICH || daten.stat_text === GRUND_UNVOLLSTAENDIG)
}

function degradiertesArtefakt(laufId: string, erzeugtAm: string, basisRef: string | null, grund: string, budgetBytes: number): AenderungsuebersichtV0Daten {
  return {
    aenderungsuebersicht_schema: 'v0',
    lauf_id: laufId,
    erzeugt_am: erzeugtAm,
    basis_ref: basisRef,
    dateien: [],
    stat_text: grund,
    patch: '',
    gekuerzt: false,
    budget_bytes: budgetBytes,
  }
}

/**
 * Ermittelt die Änderungsübersicht eines Laufs rein lesend über `git` gegen
 * `repoWurzel` (Bauauftrag Punkt 4). Wirft nie: ein Fehlschlag von `git
 * rev-parse HEAD` oder einem der vier listenartigen Aufrufe (kein Repo, kein
 * Commit unter HEAD, `git` fehlt) degradiert zu einem schemagültigen
 * Artefakt mit leerem `dateien` und dem Grund in `stat_text`. Scheitert NUR
 * der volle Patch-Text (z. B. weil er die Puffergrenze sprengt), bleiben
 * `dateien`/`stat_text` erhalten — nur `patch` wird leer mit `gekuerzt:true`
 * (Reviewer-Pass 14.09.2026, kritischer Befund 3) — nie ein Wurf, der den
 * auslösenden Lauf mitreißen könnte.
 * @param laufId - lauf_id des Laufs, dessen Ergebnis übersichtet wird
 * @param repoWurzel - absoluter Pfad der zu vergleichenden Repo-Wurzel
 * @param maxBytes - Kappungsgrenze für `patch` (vorlage.standardBudget.maxBytes)
 * @returns ein vollständiges, gegen validiereAenderungsuebersichtDaten gültiges Objekt
 */
export function erzeugeAenderungsuebersichtDaten(laufId: string, repoWurzel: string, maxBytes: number): AenderungsuebersichtV0Daten {
  const erzeugtAm = new Date().toISOString()
  const basisRefRoh = leseGitOderNull(repoWurzel, ['rev-parse', 'HEAD'])
  if (basisRefRoh === null) {
    return degradiertesArtefakt(laufId, erzeugtAm, null, GRUND_NICHT_MOEGLICH, maxBytes)
  }
  const basisRef = basisRefRoh.trim()

  // Die vier listenartigen Aufrufe (eine Zeile pro Datei) bleiben eine Alles-oder-Nichts-Gruppe:
  // scheitert einer, ist das ein Defekt der Ermittlung selbst (kein Git, kaputtes Repo), nicht ein
  // Größenproblem — KLEINER_MAX_BUFFER ist dafür großzügig genug bemessen.
  const nameStatusRoh = leseGitOderNull(repoWurzel, ['diff', '--name-status', '-M', 'HEAD'])
  const numstatRoh = leseGitOderNull(repoWurzel, ['diff', '--numstat', '-M', 'HEAD'])
  const statTextRoh = leseGitOderNull(repoWurzel, ['diff', '--stat', 'HEAD'])
  const porcelainRoh = leseGitOderNull(repoWurzel, ['status', '--porcelain'])

  if (nameStatusRoh === null || numstatRoh === null || statTextRoh === null || porcelainRoh === null) {
    return degradiertesArtefakt(laufId, erzeugtAm, basisRef, GRUND_UNVOLLSTAENDIG, maxBytes)
  }

  const dateien = [...parseTrackedDateien(nameStatusRoh, numstatRoh), ...parseUntrackedDateien(porcelainRoh)]

  // Der volle Patch-Text steht separat von den vier Listen oben (Reviewer-Pass 14.09.2026,
  // kritischer Befund 3): ein sehr großer, aber legitimer Diff darf NUR 'patch' kürzen/leeren,
  // nicht 'dateien'/'stat_text' mitreißen, die aus den kleinen, bereits erfolgreichen Aufrufen
  // oben stammen und vom Umfang des Patch-Texts unabhängig sind. maxBuffer bekommt bewusst
  // Kopfraum über maxBytes hinaus (der volle, ungekappte Text muss erst gelesen werden, BEVOR
  // er auf maxBytes gekappt wird), aber eine feste Obergrenze gegen einen unbegrenzt großen Diff.
  const patchMaxBuffer = Math.min(Math.max(maxBytes * 2, KLEINER_MAX_BUFFER), 100_000_000)
  const patchRoh = leseGitOderNull(repoWurzel, ['diff', 'HEAD'], patchMaxBuffer)

  if (patchRoh === null) {
    return {
      aenderungsuebersicht_schema: 'v0',
      lauf_id: laufId,
      erzeugt_am: erzeugtAm,
      basis_ref: basisRef,
      dateien,
      stat_text: statTextRoh,
      patch: '',
      gekuerzt: true,
      budget_bytes: maxBytes,
    }
  }

  const patchBytes = Buffer.byteLength(patchRoh, 'utf8')
  const gekuerzt = patchBytes > maxBytes
  const patch = gekuerzt ? Buffer.from(patchRoh, 'utf8').subarray(0, maxBytes).toString('utf8') : patchRoh

  return {
    aenderungsuebersicht_schema: 'v0',
    lauf_id: laufId,
    erzeugt_am: erzeugtAm,
    basis_ref: basisRef,
    dateien,
    stat_text: statTextRoh,
    patch,
    gekuerzt,
    budget_bytes: maxBytes,
  }
}

/**
 * Stand des 'scripts'-Objekts einer package.json auf einer Seite des Vergleichs (F-713):
 * 'fehlt' = keine package.json auf dieser Seite; sonst die JSON-Serialisierung des
 * 'scripts'-Objekts mit sortierten Schlüsseln (eine reine Umsortierung ist keine Änderung). Ist die
 * Datei kein gültiges JSON, trägt der Stand 'UNPARSEBAR:' plus den Rohinhalt — zwei verschieden
 * kaputte Seiten weichen damit voneinander ab (fail closed), zwei identische nicht.
 */
export type PackageScriptsStand = { art: 'fehlt' } | { art: 'vorhanden'; scriptsJson: string }

/**
 * Default-Muster der Prüfkette (F-713, erweitert F-735), deren BESTEHENDE Dateien ein
 * 'ausfuehrung'-Lauf nicht unbemerkt ändern darf. Immer aktiv — das Startvorlagenfeld
 * 'pruefketten_pfade' ERGÄNZT diese Liste, ersetzt sie nie. '.github/workflows/**' statt '/*':
 * deckt wie die frühere Regex (Präfix) auch Unterordner ab.
 */
export const STANDARD_PRUEFKETTEN_MUSTER: readonly string[] = [
  'scripts/check-*',
  '.github/workflows/**',
  'biome.json',
  'tsconfig*.json',
  'scripts/_*',
  '.eslintrc*',
  'eslint.config.*',
  'vitest.config.*',
  'jest.config.*',
]

/**
 * Reine Funktion (F-735): übersetzt ein einfaches Glob-Muster (relativ zur Repo-Wurzel) in eine
 * verankerte RegExp. '**' überspannt beliebig viele Ordner ('**' + '/' auch null Ordner), '*'
 * genau ein Pfadsegment-Stück ohne '/', ein Muster mit abschließendem '/' ist ein Präfix (alles
 * darunter). Jedes andere Zeichen gilt wörtlich. Die Zulässigkeit ('..', absolute Pfade) prüft
 * validiereStartvorlageDaten beim Laden, nicht diese Funktion.
 * @param muster - Glob-Muster, z. B. 'scripts/check-*', 'tests/**' + '/conftest.py', 'docs/'
 * @returns verankerte RegExp für einen '/'-getrennten, repo-relativen Pfad
 */
export function globZuRegExp(muster: string): RegExp {
  let quelle = ''
  for (let i = 0; i < muster.length; i++) {
    const zeichen = muster[i]
    if (zeichen === '*' && muster[i + 1] === '*') {
      if (muster[i + 2] === '/') {
        quelle += '(?:.*/)?'
        i += 2
      } else {
        quelle += '.*'
        i += 1
      }
    } else if (zeichen === '*') {
      quelle += '[^/]*'
    } else {
      quelle += (zeichen ?? '').replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  if (muster.endsWith('/')) quelle += '.*'
  return new RegExp(`^${quelle}$`)
}

/**
 * Reine Funktion (F-735): Default-Liste plus projektspezifische Ergänzung, ohne Dubletten.
 * @param zusatz - pruefketten_pfade einer (oder mehrerer) Startvorlage(n); fehlend = nur Default
 * @returns die wirksame Musterliste für ermittlePruefkettenAenderungen
 */
export function wirksamePruefkettenMuster(zusatz: readonly string[] = []): string[] {
  return [...new Set([...STANDARD_PRUEFKETTEN_MUSTER, ...zusatz])]
}

/** Status, die eine BESTEHENDE Datei betreffen — 'NEU' (A/untracked) löst bewusst nichts aus (F-713: neue Gates allein sind keine Veränderung der bestehenden Prüfkette). */
const PRUEFKETTEN_STATUS: AenderungsuebersichtDateiStatus[] = ['GEAENDERT', 'GELOESCHT', 'UMBENANNT']

/**
 * Wandelt den Rohinhalt einer package.json (oder null = Datei fehlt) in einen PackageScriptsStand.
 * @param rohInhalt - Dateiinhalt, oder null, wenn die Datei auf dieser Seite fehlt
 * @returns der Stand des 'scripts'-Objekts
 */
export function leseScriptsStand(rohInhalt: string | null): PackageScriptsStand {
  if (rohInhalt === null) return { art: 'fehlt' }
  // Eine UTF-8-BOM (unter Windows z. B. aus PowerShell 5) ließe JSON.parse auf beiden Seiten
  // scheitern und jede scripts-Änderung unerkannt — deshalb vor dem Parsen entfernen.
  const ohneBom = rohInhalt.charCodeAt(0) === 0xfeff ? rohInhalt.slice(1) : rohInhalt
  try {
    const wurzel: unknown = JSON.parse(ohneBom)
    const scripts = istObjekt(wurzel) ? wurzel.scripts : undefined
    const sortiert = istObjekt(scripts) ? Object.fromEntries(Object.entries(scripts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : (scripts ?? null)
    return { art: 'vorhanden', scriptsJson: JSON.stringify(sortiert) }
  } catch {
    return { art: 'vorhanden', scriptsJson: `UNPARSEBAR:${ohneBom}` }
  }
}

/**
 * Reine Funktion (F-713, Regel 1j): ermittelt, ob ein Lauf die Prüfkette verändert hat, mit der er
 * selbst gemessen wird.
 * (a) Das 'scripts'-Objekt der package.json weicht zwischen HEAD und Arbeitskopie ab — fehlt die
 *     Datei auf beiden Seiten, ist das keine Abweichung; fehlt sie auf genau einer, schon.
 * (b) Eine Datei, deren Pfad auf eines der 'muster' passt (wirksamePruefkettenMuster: Default-Liste
 *     plus pruefketten_pfade der Startvorlage, F-735), trägt Status GEAENDERT, GELOESCHT oder
 *     UMBENANNT. Bei UMBENANNT zählen der neue UND der alte Pfad (alter_pfad, F-735) — eine
 *     Umbenennung AUS der Prüfkette heraus hält also ebenfalls. Neue Dateien allein lösen nichts aus.
 * Bekannte Grenze: *.test.ts und frei benannte Hilfsskripte (z. B. scripts/aufraeumen-nachlauf.mjs)
 * erfasst nur, wer sie in pruefketten_pfade listet.
 * @param head - Stand des 'scripts'-Objekts in HEAD
 * @param arbeitskopie - Stand des 'scripts'-Objekts in der Arbeitskopie
 * @param dateien - 'dateien' der Änderungsübersicht des Laufs
 * @param muster - wirksame Glob-Muster der Prüfkette (wirksamePruefkettenMuster)
 * @returns Liste lesbarer Befunde; leeres Array = Prüfkette unverändert
 */
export function ermittlePruefkettenAenderungen(
  head: PackageScriptsStand,
  arbeitskopie: PackageScriptsStand,
  dateien: AenderungsuebersichtDatei[],
  muster: readonly string[]
): string[] {
  const befunde: string[] = []
  const scriptsAbweichend =
    head.art !== arbeitskopie.art || (head.art === 'vorhanden' && arbeitskopie.art === 'vorhanden' && head.scriptsJson !== arbeitskopie.scriptsJson)
  if (scriptsAbweichend) befunde.push('package.json (scripts)')
  const regexe = muster.map(globZuRegExp)
  const passt = (pfad: string): boolean => regexe.some((regex) => regex.test(pfad))
  for (const datei of dateien) {
    if (!PRUEFKETTEN_STATUS.includes(datei.status)) continue
    if (passt(datei.pfad) || (datei.alter_pfad !== undefined && passt(datei.alter_pfad))) {
      befunde.push(datei.alter_pfad !== undefined ? `${datei.alter_pfad} → ${datei.pfad} (${datei.status})` : `${datei.pfad} (${datei.status})`)
    }
  }
  return befunde
}

/**
 * Liest die beiden package.json-Stände für ermittlePruefkettenAenderungen: HEAD über
 * `git show HEAD:package.json` (rein lesend, Muster leseGitOderNull), die Arbeitskopie direkt vom
 * Dateisystem. Wirft nie: ein fehlgeschlagenes git show (kein Repo, kein Commit, Datei nicht in
 * HEAD) zählt als 'fehlt'.
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel des Laufs
 * @returns { head, arbeitskopie }
 */
export function lesePackageScriptsStaende(repoWurzel: string): { head: PackageScriptsStand; arbeitskopie: PackageScriptsStand } {
  const arbeitskopiePfad = join(repoWurzel, 'package.json')
  let arbeitskopieRoh: string | null = null
  try {
    arbeitskopieRoh = existsSync(arbeitskopiePfad) ? readFileSync(arbeitskopiePfad, 'utf8') : null
  } catch {
    arbeitskopieRoh = '\u0000UNLESBAR' // vorhanden, aber nicht lesbar — kein gültiges JSON, weicht damit von jedem lesbaren Stand ab (fail closed)
  }
  return { head: leseScriptsStand(leseGitOderNull(repoWurzel, ['show', 'HEAD:package.json'])), arbeitskopie: leseScriptsStand(arbeitskopieRoh) }
}
