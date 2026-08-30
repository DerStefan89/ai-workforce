/**
 * Datei: src/authorization-boundary/index.ts
 *
 * Zweck: Authorization Boundary (Feature 3, state/plan-v2-f3-authorization-
 * boundary.md + state/tasks/f3-authorization-boundary.md). Prüft eine
 * Freigabe-/Verweigerungsentscheidung, die in einem lokalen Git-Repository
 * außerhalb dieses Produkt-Repos liegt (D16, zielfassung.md §16.3), gegen
 * den echten Inhalt am referenzierten Commit — nie gegen die im
 * Kontrollzustand mitgeführte Referenz allein (E-189). Eigenständiges
 * Modul (D1): kein Eingriff in src/checkpoint-store/, ruft dessen
 * schreibeWirkungsmarke nur von außen auf.
 *
 * Zwei Bedrohungen aus E-189 ("Erzeugung und Veränderung durch das
 * Ausführungswerkzeug"): pruefeAutorisierung schließt nachweislich nur die
 * Veränderungs-Hälfte (Commit-Pinning + Vergleich gegen den echten
 * Objektinhalt via `git show`) — die Erzeugungs-Hälfte (wurde der Commit
 * tatsächlich von einem Menschen erstellt) bleibt bewusst ungeprüft,
 * bereits entschiedene Scope-Grenze (plan-v2 Delta 1, feature.md
 * Nicht-Ziele).
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { schreibeWirkungsmarke, sha256Hex } from '../checkpoint-store/index.ts'
import type { ProfilReferenz, Schreiber as CheckpointSchreiber } from '../checkpoint-store/types.ts'
import type { AutorisierungsEintrag, AutorisierungsErgebnis, AutorisierungsReferenz, Ereignis, Schreiber } from './types.ts'

// Von Stefan bestätigter externer Pfad (plan-v1 Abschnitt 10, Punkt 1).
// Über optionen.repoWurzel überschreibbar — nötig für Tests/Gate-Skript,
// die gegen ein Wegwerf-Git-Repo prüfen, nicht gegen den produktiven Ort.
const STANDARD_REPO_WURZEL = 'C:\\Users\\stefa\\ai-workforce-autorisierung'

const ENTSCHEIDUNG_WERTE = new Set(['FREIGEGEBEN', 'VERWEIGERT'])

interface PruefOptionen {
  schreiber?: Schreiber
  repoWurzel?: string
}

interface SchreibOptionen {
  schreiber?: CheckpointSchreiber
  basisVerzeichnis?: string
}

function jetzt(): string {
  return new Date().toISOString()
}

function standardSchreiber(ereignis: Ereignis): void {
  console.log(JSON.stringify(ereignis))
}

function normalisierePfad(pfad: string): string {
  return pfad.replace(/\\/g, '/').toLowerCase()
}

/**
 * Löst B20 (zweiter Advisor-Pass): Vergleich case-insensitive und
 * trennernormalisiert, damit ein abweichend geschriebener, aber
 * inhaltlich identischer Windows-Pfad nicht fälschlich als "außerhalb des
 * Repos" abgelehnt wird. Der zurückgegebene Pfad ist trennernormalisiert,
 * aber NICHT kleingeschrieben — die Kleinschreibung dient nur dem
 * Vergleich, `git show` braucht den im Repo tatsächlich committeten Pfad.
 */
function leiteRepoRelativenPfadAb(pfad: string, repoWurzel: string): string | null {
  const wurzelTrennerNormalisiert = repoWurzel.replace(/\\/g, '/').replace(/\/$/, '')
  const wurzelMitSlash = `${wurzelTrennerNormalisiert}/`
  if (!normalisierePfad(pfad).startsWith(normalisierePfad(wurzelMitSlash))) {
    return null
  }
  const pfadTrennerNormalisiert = pfad.replace(/\\/g, '/')
  return pfadTrennerNormalisiert.slice(wurzelMitSlash.length)
}

/** Liest einen Pfad aus einem konkreten Commit des externen Repos. null bei jedem Fehlschlag (Commit/Pfad nicht auffindbar) — fail-closed, kein Wurf nach außen. */
function leseAusCommit(repoWurzel: string, commitHash: string, relativerPfad: string): string | null {
  try {
    return execFileSync('git', ['show', `${commitHash}:${relativerPfad}`], {
      cwd: repoWurzel,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return null
  }
}

/** Löst B18 (zweiter Advisor-Pass, D3/CRLF-Startbedingung): erkennt eine Zeile, die die Zeilenenden-Behandlung für jede Datei im Repo abschaltet. */
function gitattributesPinntZeilenenden(inhalt: string): boolean {
  return inhalt.split(/\r?\n/).some((zeile) => zeile.trim() === '* -text')
}

/** Reine Funktion: prüft einen geparsten externen Autorisierungseintrag gegen schemas/kontrollzustand-autorisierung-payload.schema.json. */
export function validiereAutorisierungEintrag(eintrag: unknown): string[] {
  const verstoesse: string[] = []
  if (typeof eintrag !== 'object' || eintrag === null || Array.isArray(eintrag)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = eintrag as Record<string, unknown>

  const erlaubteFelder = new Set(['lauf_id', 'entscheidung', 'zeitstempel', 'begruendung'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubteFelder.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ['lauf_id', 'entscheidung', 'zeitstempel']) {
    if (!(feld in obj)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }
  if ('lauf_id' in obj && (typeof obj.lauf_id !== 'string' || obj.lauf_id.length === 0)) {
    verstoesse.push("'lauf_id' muss ein nicht-leerer String sein")
  }
  if ('entscheidung' in obj && (typeof obj.entscheidung !== 'string' || !ENTSCHEIDUNG_WERTE.has(obj.entscheidung))) {
    verstoesse.push("'entscheidung' muss 'FREIGEGEBEN' oder 'VERWEIGERT' sein")
  }
  if ('zeitstempel' in obj && (typeof obj.zeitstempel !== 'string' || obj.zeitstempel.length === 0)) {
    verstoesse.push("'zeitstempel' muss ein nicht-leerer String sein")
  }
  if ('begruendung' in obj && typeof obj.begruendung !== 'string') {
    verstoesse.push("'begruendung' muss ein String sein")
  }
  if (obj.entscheidung === 'VERWEIGERT' && (typeof obj.begruendung !== 'string' || obj.begruendung.length === 0)) {
    verstoesse.push("'begruendung' ist bei entscheidung 'VERWEIGERT' Pflicht")
  }

  return verstoesse
}

function melde(schreiber: Schreiber, ergebnis: AutorisierungsErgebnis): AutorisierungsErgebnis {
  if (ergebnis.ok) {
    schreiber({
      ereignis: 'autorisierung_geprueft',
      lauf_id: ergebnis.eintrag.lauf_id,
      zeitstempel: jetzt(),
      entscheidung: ergebnis.entscheidung,
    })
  } else {
    schreiber({ ereignis: 'autorisierung_abgelehnt', zeitstempel: jetzt(), grund: ergebnis.grund })
  }
  return ergebnis
}

/**
 * Prüft eine Autorisierungsreferenz gegen den echten Inhalt am
 * referenzierten Ort. Ablauf (D3/D4, plan-v2 + Handoff-Vertrag):
 * 1. Pfad-Präfixprüfung (löst B20) — fail-closed bei Pfad außerhalb.
 * 2. .gitattributes-Startbedingung aktiv geprüft (löst B18) — fail-closed
 *    ohne eigene, generische Divergenz-Meldung, damit eine vergessene
 *    Regel nicht als Manipulation missgedeutet wird.
 * 3. Arbeitsbaum- und Commit-Inhalt roh hashen (sha256Hex, keine
 *    Kanonisierung — Muster: registriereWerkzeugReferenz) und gegen
 *    referenz.datei_hash vergleichen.
 * 4. Schema-Validierung des geparsten Inhalts.
 * Kein Wurf bei einem der vier Rot-Fälle — regulärer, benannter Ausgang
 * (D4-Muster wie F1Bs stelleLaufstatusFest).
 */
export function pruefeAutorisierung(referenz: AutorisierungsReferenz, optionen: PruefOptionen = {}): AutorisierungsErgebnis {
  const schreiber = optionen.schreiber ?? standardSchreiber
  const repoWurzel = optionen.repoWurzel ?? STANDARD_REPO_WURZEL

  const relativerPfad = leiteRepoRelativenPfadAb(referenz.pfad, repoWurzel)
  if (relativerPfad === null) {
    return melde(schreiber, { ok: false, grund: 'pfad ausserhalb des erwarteten externen Repos' })
  }

  const gitattributesInhalt = leseAusCommit(repoWurzel, referenz.commit_hash, '.gitattributes')
  if (gitattributesInhalt === null || !gitattributesPinntZeilenenden(gitattributesInhalt)) {
    return melde(schreiber, {
      ok: false,
      grund: "externes Repo ohne '.gitattributes: * -text' — Zeilenenden nicht gepinnt, Hash-Vergleich nicht zuverlässig",
    })
  }

  let arbeitsbaumInhalt: string
  try {
    arbeitsbaumInhalt = readFileSync(referenz.pfad, 'utf8')
  } catch {
    return melde(schreiber, { ok: false, grund: 'Datei am referenzierten Pfad nicht lesbar' })
  }

  const commitInhalt = leseAusCommit(repoWurzel, referenz.commit_hash, relativerPfad)
  if (commitInhalt === null) {
    return melde(schreiber, { ok: false, grund: 'Commit oder Pfad im externen Repo nicht auffindbar' })
  }

  const arbeitsbaumHash = sha256Hex(arbeitsbaumInhalt)
  const commitInhaltHash = sha256Hex(commitInhalt)
  if (arbeitsbaumHash !== referenz.datei_hash || commitInhaltHash !== referenz.datei_hash) {
    return melde(schreiber, { ok: false, grund: 'Inhalt am referenzierten Ort weicht von der Referenz ab' })
  }

  let geparst: unknown
  try {
    geparst = JSON.parse(commitInhalt)
  } catch (fehler) {
    return melde(schreiber, { ok: false, grund: `kein gueltiges JSON (${(fehler as Error).message})` })
  }

  const verstoesse = validiereAutorisierungEintrag(geparst)
  if (verstoesse.length > 0) {
    return melde(schreiber, { ok: false, grund: `Autorisierungsdatei verletzt Schema: ${verstoesse.join('; ')}` })
  }

  const eintrag = geparst as AutorisierungsEintrag
  return melde(schreiber, { ok: true, entscheidung: eintrag.entscheidung, eintrag })
}

/**
 * Dünner Aufrufer von F1Bs schreibeWirkungsmarke (AC6: VERWEIGERT wird
 * wiederverwendet, kein neuer Terminalzustand). Kein F1B-Touch, keine
 * eigene Logik über den einen Aufruf hinaus.
 */
export function verweigereAutorisierung(
  laufId: string,
  profilReferenz: ProfilReferenz,
  referenz: AutorisierungsReferenz,
  begruendung: string,
  optionen: SchreibOptionen = {}
): { pfad: string; selbstHash: string } {
  return schreibeWirkungsmarke(
    laufId,
    profilReferenz,
    'terminal',
    { ergebnis: 'VERWEIGERT', daten: { autorisierung: referenz, begruendung } },
    optionen
  )
}
