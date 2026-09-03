/**
 * Datei: src/invocation-policy/index.ts
 *
 * Zweck: Invocation Policy / Protection Validator (Feature 4,
 * state/plan-v2-f4-invocation-policy.md + state/tasks/f4-invocation-policy.md).
 * Stellt für eine geplante schreibende Execution fest, ob (a) die
 * Werkzeugkonfiguration gültig ist und jedes referenzierte Schutzskript mit
 * dem in einer extern bezeugten Baseline erwarteten Hash übereinstimmt
 * (E-183), und (b) ein vorliegender Wirksamkeitsnachweis für den aktuellen
 * Gültigkeitsschlüssel noch gilt (E-188, kein Drift) — beide Prüfungen
 * lokal, ohne Werkzeugaufruf (AC8, Gate-Grep). Eigenständiges Modul (D1,
 * §16.2): kein Eingriff in src/authorization-boundary/ außer dem additiven
 * export aus F3, ruft dessen Lesepfad nur von außen auf.
 *
 * Hash-Querkonsistenz (plan-v2 Delta 1, löst Advisor-Finding F11):
 * pruefeStartbedingung2 nimmt keinen unabhängigen
 * istGueltigkeitsschluessel.werkzeug_konfiguration_hash/schutzskript_hashes
 * entgegen. pruefeStartfreigabe misst istZustand genau einmal und übergibt
 * dasselbe Objekt an beide pruefeStartbedingungX-Aufrufe — ein Aufrufer kann
 * die beiden Bedingungen dadurch nicht mit unterschiedlichen,
 * zueinander-aber-nicht-zur-Baseline-passenden Hash-Ständen bestehen lassen.
 */

import { gitattributesPinntZeilenenden, leiteRepoRelativenPfadAb, leseAusCommit } from '../authorization-boundary/index.ts'
import { readFileSync } from 'node:fs'
import { schreibeWirkungsmarke, sha256Hex } from '../checkpoint-store/index.ts'
import type { ProfilReferenz, Schreiber as CheckpointSchreiber } from '../checkpoint-store/types.ts'
import type {
  BaselineEintrag,
  BaselineReferenz,
  BedingungErgebnis,
  Ereignis,
  Gueltigkeitsschluessel,
  IstUebrigeFelder,
  IstZustand,
  Schreiber,
  SchutzskriptEintrag,
  Starturteil,
  WirksamkeitsnachweisEintrag,
} from './types.ts'

export { pruefeAufrufparameter } from './verbotene-aufrufparameter.ts'
export { VERBOTENE_AUFRUFPARAMETER } from './verbotene-aufrufparameter.ts'

// Von Stefan bestätigter externer Pfad (identisch zu F3 — plan-v1 SCOPE.1,
// eigener Unterordner "invocation-policy-baseline/" statt F3s
// "autorisierungen/"). Über optionen.repoWurzel überschreibbar — nötig für
// Tests/Gate-Skript, die gegen ein Wegwerf-Git-Repo prüfen.
const STANDARD_REPO_WURZEL = 'C:\\Users\\stefa\\ai-workforce-autorisierung'

interface PruefOptionen {
  schreiber?: Schreiber
  repoWurzel?: string
}

interface SchreibOptionen {
  schreiber?: CheckpointSchreiber
  basisVerzeichnis?: string
}

export interface StartfreigabeEingaben {
  baselineReferenz: BaselineReferenz
  istZustand: IstZustand
  wirksamkeitsnachweis: unknown
  istUebrigeFelder: IstUebrigeFelder
}

function jetzt(): string {
  return new Date().toISOString()
}

function standardSchreiber(ereignis: Ereignis): void {
  console.log(JSON.stringify(ereignis))
}

function normalisiereHash(hash: string): string {
  return hash.toLowerCase()
}

/**
 * Executor-Entscheidung „Pfadvergleichssemantik" (Advisor F12, plan-v2
 * Offene Punkte): arbeitsverzeichnis_pfad wird trenner- und
 * groß-/kleinschreibungsnormalisiert verglichen, analog F3s B20-Fix für
 * Pfad-Präfixvergleiche — reiner, nicht exportierter Einzeiler dieses
 * Moduls, keine Wiederverwendung von F3s privater normalisierePfad
 * (kein Orchestrierungs-Duplikat, siehe ESCALATE-Grenze des Vertrags).
 * Risikorichtung fail-closed: eine übersehene, tatsächlich abweichende
 * Pfadform bliebe ein ABGELEHNT, nie ein fälschliches FREIGEGEBEN.
 */
function normalisierePfadFuerVergleich(pfad: string): string {
  return pfad.replace(/\\/g, '/').toLowerCase()
}

/**
 * E-188-Vergleich (Gültigkeitsschlüssel, WirksamkeitsnachweisEintrag): bleibt
 * mengenbasiert, weil das Wirksamkeitsnachweis-Schema
 * (gueltigkeitsschluessel.schutzskript_hashes) keine Pfadbindung trägt —
 * Repräsentation des Gültigkeitsschlüssels ist laut feature.md §16.8
 * Punkt 8 ein eigener, noch offener Punkt, NICHT Teil des F-047-Fixes
 * (der betrifft ausschließlich E-183/AC3, siehe schutzskripteStimmenUeberein
 * unten).
 */
function schutzskriptHashSatz(hashes: string[]): string[] {
  return [...hashes].map(normalisiereHash).sort()
}

function schutzskriptHashSaetzeGleich(a: string[], b: string[]): boolean {
  const satzA = schutzskriptHashSatz(a)
  const satzB = schutzskriptHashSatz(b)
  if (satzA.length !== satzB.length) return false
  return satzA.every((wert, index) => wert === satzB[index])
}

/**
 * E-183-Vergleich (F-047-Fix): pfadgebunden statt mengenbasiert. Jeder
 * Baseline-Eintrag muss einen Ist-Eintrag mit demselben normalisierten Pfad
 * UND demselben Hash haben — AC3 verlangt den Hash JEDES einzelnen
 * referenzierten Schutzskripts, nicht nur eine passende Gesamtmenge. Löst
 * die Swap-Lücke: ein Inhalts-Tausch zwischen zwei Schutzskripten (Hash-Menge
 * bleibt gleich, Pfad-Zuordnung ändert sich) galt vorher fälschlich als
 * FREIGEGEBEN-fähig.
 */
function schutzskripteStimmenUeberein(ist: SchutzskriptEintrag[], baseline: { pfad: string; hash: string }[]): boolean {
  if (ist.length !== baseline.length) return false
  const istNachPfad = new Map<string, string>()
  for (const eintrag of ist) {
    istNachPfad.set(normalisierePfadFuerVergleich(eintrag.pfad), normalisiereHash(eintrag.hash))
  }
  if (istNachPfad.size !== ist.length) return false
  return baseline.every((eintrag) => istNachPfad.get(normalisierePfadFuerVergleich(eintrag.pfad)) === normalisiereHash(eintrag.hash))
}

/** Reine Funktion: prüft einen geparsten Baseline-Eintrag gegen schemas/kontrollzustand-invocation-policy-baseline-payload.schema.json. */
export function validiereBaselineEintrag(eintrag: unknown): string[] {
  const verstoesse: string[] = []
  if (typeof eintrag !== 'object' || eintrag === null || Array.isArray(eintrag)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = eintrag as Record<string, unknown>

  const erlaubteFelder = new Set(['werkzeug_konfiguration', 'schutzskripte', 'erzeugt_am'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubteFelder.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ['werkzeug_konfiguration', 'schutzskripte']) {
    if (!(feld in obj)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  const hashMuster = /^[0-9a-fA-F]{64}$/
  if ('werkzeug_konfiguration' in obj) {
    const wk = obj.werkzeug_konfiguration
    if (typeof wk !== 'object' || wk === null || Array.isArray(wk)) {
      verstoesse.push("'werkzeug_konfiguration' muss ein Objekt sein")
    } else {
      const wkObj = wk as Record<string, unknown>
      const wkErlaubt = new Set(['pfad', 'hash'])
      for (const feld of Object.keys(wkObj)) {
        if (!wkErlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'werkzeug_konfiguration.${feld}' (additionalProperties: false)`)
      }
      if (typeof wkObj.pfad !== 'string' || wkObj.pfad.length === 0) verstoesse.push("'werkzeug_konfiguration.pfad' muss ein nicht-leerer String sein")
      if (typeof wkObj.hash !== 'string' || !hashMuster.test(wkObj.hash)) verstoesse.push("'werkzeug_konfiguration.hash' muss ein 64-stelliger Hex-String sein")
    }
  }

  if ('schutzskripte' in obj) {
    if (!Array.isArray(obj.schutzskripte)) {
      verstoesse.push("'schutzskripte' muss ein Array sein")
    } else if (obj.schutzskripte.length < 1) {
      verstoesse.push("'schutzskripte' muss mindestens ein Element enthalten (minItems: 1)")
    } else {
      obj.schutzskripte.forEach((eintrag, index) => {
        if (typeof eintrag !== 'object' || eintrag === null || Array.isArray(eintrag)) {
          verstoesse.push(`'schutzskripte[${index}]' muss ein Objekt sein`)
          return
        }
        const skript = eintrag as Record<string, unknown>
        const skriptErlaubt = new Set(['pfad', 'hash'])
        for (const feld of Object.keys(skript)) {
          if (!skriptErlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'schutzskripte[${index}].${feld}' (additionalProperties: false)`)
        }
        if (typeof skript.pfad !== 'string' || skript.pfad.length === 0) verstoesse.push(`'schutzskripte[${index}].pfad' muss ein nicht-leerer String sein`)
        if (typeof skript.hash !== 'string' || !hashMuster.test(skript.hash)) verstoesse.push(`'schutzskripte[${index}].hash' muss ein 64-stelliger Hex-String sein`)
      })
    }
  }

  if ('erzeugt_am' in obj && typeof obj.erzeugt_am !== 'string') {
    verstoesse.push("'erzeugt_am' muss ein String sein")
  }

  return verstoesse
}

/** Reine Funktion: prüft einen geparsten Wirksamkeitsnachweis-Eintrag gegen schemas/kontrollzustand-invocation-policy-wirksamkeitsnachweis-payload.schema.json. */
export function validiereWirksamkeitsnachweisEintrag(eintrag: unknown): string[] {
  const verstoesse: string[] = []
  if (typeof eintrag !== 'object' || eintrag === null || Array.isArray(eintrag)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = eintrag as Record<string, unknown>

  const erlaubteFelder = new Set(['gueltigkeitsschluessel', 'rot_fall_beleg', 'geprueft_am'])
  for (const feld of Object.keys(obj)) {
    if (!erlaubteFelder.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ['gueltigkeitsschluessel', 'rot_fall_beleg', 'geprueft_am']) {
    if (!(feld in obj)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  const hashMuster = /^[0-9a-fA-F]{64}$/
  if ('gueltigkeitsschluessel' in obj) {
    const gs = obj.gueltigkeitsschluessel
    if (typeof gs !== 'object' || gs === null || Array.isArray(gs)) {
      verstoesse.push("'gueltigkeitsschluessel' muss ein Objekt sein")
    } else {
      const gsObj = gs as Record<string, unknown>
      const gsErlaubt = new Set([
        'werkzeug_konfiguration_hash',
        'schutzskript_hashes',
        'werkzeug_version_deklariert',
        'berechtigungskontext',
        'arbeitsverzeichnis_pfad',
        'startziel_pfad',
      ])
      for (const feld of Object.keys(gsObj)) {
        if (!gsErlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'gueltigkeitsschluessel.${feld}' (additionalProperties: false)`)
      }
      for (const feld of gsErlaubt) {
        if (!(feld in gsObj)) verstoesse.push(`Pflichtfeld 'gueltigkeitsschluessel.${feld}' fehlt`)
      }
      if ('werkzeug_konfiguration_hash' in gsObj && (typeof gsObj.werkzeug_konfiguration_hash !== 'string' || !hashMuster.test(gsObj.werkzeug_konfiguration_hash))) {
        verstoesse.push("'gueltigkeitsschluessel.werkzeug_konfiguration_hash' muss ein 64-stelliger Hex-String sein")
      }
      if ('schutzskript_hashes' in gsObj) {
        if (!Array.isArray(gsObj.schutzskript_hashes) || gsObj.schutzskript_hashes.length < 1) {
          verstoesse.push("'gueltigkeitsschluessel.schutzskript_hashes' muss ein Array mit mindestens einem Element sein")
        } else if (!gsObj.schutzskript_hashes.every((wert) => typeof wert === 'string' && hashMuster.test(wert))) {
          verstoesse.push("'gueltigkeitsschluessel.schutzskript_hashes' muss ausschließlich 64-stellige Hex-Strings enthalten")
        }
      }
      if ('werkzeug_version_deklariert' in gsObj && (typeof gsObj.werkzeug_version_deklariert !== 'string' || gsObj.werkzeug_version_deklariert.length === 0)) {
        verstoesse.push("'gueltigkeitsschluessel.werkzeug_version_deklariert' muss ein nicht-leerer String sein")
      }
      if ('berechtigungskontext' in gsObj && (typeof gsObj.berechtigungskontext !== 'string' || gsObj.berechtigungskontext.length === 0)) {
        verstoesse.push("'gueltigkeitsschluessel.berechtigungskontext' muss ein nicht-leerer String sein")
      }
      if ('arbeitsverzeichnis_pfad' in gsObj && (typeof gsObj.arbeitsverzeichnis_pfad !== 'string' || gsObj.arbeitsverzeichnis_pfad.length === 0)) {
        verstoesse.push("'gueltigkeitsschluessel.arbeitsverzeichnis_pfad' muss ein nicht-leerer String sein")
      }
      if ('startziel_pfad' in gsObj && (typeof gsObj.startziel_pfad !== 'string' || gsObj.startziel_pfad.length === 0)) {
        verstoesse.push("'gueltigkeitsschluessel.startziel_pfad' muss ein nicht-leerer String sein")
      }
    }
  }

  if ('rot_fall_beleg' in obj && (typeof obj.rot_fall_beleg !== 'string' || obj.rot_fall_beleg.length === 0)) {
    verstoesse.push("'rot_fall_beleg' muss ein nicht-leerer String sein")
  }
  if ('geprueft_am' in obj && (typeof obj.geprueft_am !== 'string' || obj.geprueft_am.length === 0)) {
    verstoesse.push("'geprueft_am' muss ein nicht-leerer String sein")
  }

  return verstoesse
}

/**
 * Startbedingung 1 (E-183): liest die Baseline über F3s additiv
 * exportierten Lesepfad, identischer Ablauf wie pruefeAutorisierung
 * (Pfad-Präfix → .gitattributes → Hash-Vergleich → Schema-Validierung),
 * vergleicht danach istZustand gegen die Baseline statt eine
 * Autorisierungsentscheidung zu lesen. Kein Wurf bei erwartetem Rot-Fall
 * (D4-Muster).
 */
export function pruefeStartbedingung1(baselineReferenz: BaselineReferenz, istZustand: IstZustand, optionen: PruefOptionen = {}): BedingungErgebnis {
  const repoWurzel = optionen.repoWurzel ?? STANDARD_REPO_WURZEL

  const relativerPfad = leiteRepoRelativenPfadAb(baselineReferenz.pfad, repoWurzel)
  if (relativerPfad === null) {
    return { ok: false, grund: 'Baseline-Pfad ausserhalb des erwarteten externen Repos' }
  }

  const gitattributesInhalt = leseAusCommit(repoWurzel, baselineReferenz.commit_hash, '.gitattributes')
  if (gitattributesInhalt === null || !gitattributesPinntZeilenenden(gitattributesInhalt)) {
    return {
      ok: false,
      grund: "externes Repo ohne '.gitattributes: * -text' — Zeilenenden nicht gepinnt, Hash-Vergleich nicht zuverlässig",
    }
  }

  let arbeitsbaumInhalt: string
  try {
    arbeitsbaumInhalt = readFileSync(baselineReferenz.pfad, 'utf8')
  } catch {
    return { ok: false, grund: 'Baseline-Datei am referenzierten Pfad nicht lesbar' }
  }

  const commitInhalt = leseAusCommit(repoWurzel, baselineReferenz.commit_hash, relativerPfad)
  if (commitInhalt === null) {
    return { ok: false, grund: 'Commit oder Pfad im externen Repo nicht auffindbar' }
  }

  const arbeitsbaumHash = sha256Hex(arbeitsbaumInhalt)
  const commitInhaltHash = sha256Hex(commitInhalt)
  if (arbeitsbaumHash !== baselineReferenz.datei_hash || commitInhaltHash !== baselineReferenz.datei_hash) {
    return { ok: false, grund: 'Baseline-Inhalt am referenzierten Ort weicht von der Referenz ab' }
  }

  let geparst: unknown
  try {
    geparst = JSON.parse(commitInhalt)
  } catch (fehler) {
    return { ok: false, grund: `Baseline ist kein gueltiges JSON (${(fehler as Error).message})` }
  }

  const verstoesse = validiereBaselineEintrag(geparst)
  if (verstoesse.length > 0) {
    return { ok: false, grund: `Baseline verletzt Schema: ${verstoesse.join('; ')}` }
  }

  const baseline = geparst as BaselineEintrag

  if (normalisiereHash(istZustand.werkzeug_konfiguration_hash) !== normalisiereHash(baseline.werkzeug_konfiguration.hash)) {
    return { ok: false, grund: 'Hash der Werkzeugkonfiguration weicht von der Baseline ab (E-183)' }
  }

  if (!schutzskripteStimmenUeberein(istZustand.schutzskripte, baseline.schutzskripte)) {
    return { ok: false, grund: 'Schutzskript-Hash(es) weichen von der Baseline ab, fehlen, oder sind pfadvertauscht (E-183)' }
  }

  return { ok: true }
}

/**
 * Startbedingung 2 (E-188): baut den zu vergleichenden
 * istGueltigkeitsschluessel aus istZustand (Hash-Felder, dieselbe Quelle
 * wie Bedingung 1 — plan-v2 Delta 1, löst F11) plus istUebrigeFelder
 * zusammen und vergleicht ihn feldweise gegen
 * wirksamkeitsnachweis.gueltigkeitsschluessel. Jede Feldabweichung → Drift
 * (ABGELEHNT), nicht nur ein grober Gesamtvergleich.
 */
export function pruefeStartbedingung2(
  wirksamkeitsnachweis: unknown,
  istZustand: IstZustand,
  istUebrigeFelder: IstUebrigeFelder
): BedingungErgebnis {
  const verstoesse = validiereWirksamkeitsnachweisEintrag(wirksamkeitsnachweis)
  if (verstoesse.length > 0) {
    return { ok: false, grund: `Wirksamkeitsnachweis verletzt Schema: ${verstoesse.join('; ')}` }
  }

  const nachweis = wirksamkeitsnachweis as WirksamkeitsnachweisEintrag
  const nachgewiesen = nachweis.gueltigkeitsschluessel

  const istGueltigkeitsschluessel: Gueltigkeitsschluessel = {
    werkzeug_konfiguration_hash: istZustand.werkzeug_konfiguration_hash,
    schutzskript_hashes: istZustand.schutzskripte.map((eintrag) => eintrag.hash),
    werkzeug_version_deklariert: istUebrigeFelder.werkzeug_version_deklariert,
    berechtigungskontext: istUebrigeFelder.berechtigungskontext,
    arbeitsverzeichnis_pfad: istUebrigeFelder.arbeitsverzeichnis_pfad,
    startziel_pfad: istUebrigeFelder.startziel_pfad,
  }

  if (normalisiereHash(istGueltigkeitsschluessel.werkzeug_konfiguration_hash) !== normalisiereHash(nachgewiesen.werkzeug_konfiguration_hash)) {
    return { ok: false, grund: "Drift im Gültigkeitsschlüssel: 'werkzeug_konfiguration_hash' (E-188)" }
  }
  if (!schutzskriptHashSaetzeGleich(istGueltigkeitsschluessel.schutzskript_hashes, nachgewiesen.schutzskript_hashes)) {
    return { ok: false, grund: "Drift im Gültigkeitsschlüssel: 'schutzskript_hashes' (E-188)" }
  }
  if (istGueltigkeitsschluessel.werkzeug_version_deklariert !== nachgewiesen.werkzeug_version_deklariert) {
    return { ok: false, grund: "Drift im Gültigkeitsschlüssel: 'werkzeug_version_deklariert' (E-188)" }
  }
  if (istGueltigkeitsschluessel.berechtigungskontext !== nachgewiesen.berechtigungskontext) {
    return { ok: false, grund: "Drift im Gültigkeitsschlüssel: 'berechtigungskontext' (E-188)" }
  }
  if (normalisierePfadFuerVergleich(istGueltigkeitsschluessel.arbeitsverzeichnis_pfad) !== normalisierePfadFuerVergleich(nachgewiesen.arbeitsverzeichnis_pfad)) {
    return { ok: false, grund: "Drift im Gültigkeitsschlüssel: 'arbeitsverzeichnis_pfad' (E-188)" }
  }
  if (normalisierePfadFuerVergleich(istGueltigkeitsschluessel.startziel_pfad) !== normalisierePfadFuerVergleich(nachgewiesen.startziel_pfad)) {
    return { ok: false, grund: "Drift im Gültigkeitsschlüssel: 'startziel_pfad' (E-188)" }
  }

  return { ok: true }
}

/**
 * Orchestrator: misst/erhält istZustand einmal (Aufrufer liefert ihn
 * bereits vollständig, F4 misst nicht selbst — Design-Entscheidung 3),
 * ruft pruefeStartbedingung1 dann pruefeStartbedingung2 (Reihenfolge E-183
 * vor E-188, Design-Entscheidung 5), Kurzschluss bei erstem Fehlschlag.
 * werkzeugsatz_begrenzung: "DEKLARIERT" ist fest in jedem Rückgabepfad
 * (AC9/A12 — nie "ERZWUNGEN", E-187 bleibt unbelegt).
 */
export function pruefeStartfreigabe(eingaben: StartfreigabeEingaben, optionen: PruefOptionen = {}): Starturteil {
  const schreiber = optionen.schreiber ?? standardSchreiber

  const bedingung1 = pruefeStartbedingung1(eingaben.baselineReferenz, eingaben.istZustand, optionen)
  if (!bedingung1.ok) {
    schreiber({ ereignis: 'startfreigabe_abgelehnt', zeitstempel: jetzt(), grund: bedingung1.grund })
    return { starturteil: 'ABGELEHNT', grund: bedingung1.grund, werkzeugsatz_begrenzung: 'DEKLARIERT' }
  }

  const bedingung2 = pruefeStartbedingung2(eingaben.wirksamkeitsnachweis, eingaben.istZustand, eingaben.istUebrigeFelder)
  if (!bedingung2.ok) {
    schreiber({ ereignis: 'startfreigabe_abgelehnt', zeitstempel: jetzt(), grund: bedingung2.grund })
    return { starturteil: 'ABGELEHNT', grund: bedingung2.grund, werkzeugsatz_begrenzung: 'DEKLARIERT' }
  }

  schreiber({ ereignis: 'startfreigabe_geprueft', zeitstempel: jetzt() })
  return {
    starturteil: 'FREIGEGEBEN',
    berechtigungskontext: eingaben.istUebrigeFelder.berechtigungskontext,
    werkzeugsatz_begrenzung: 'DEKLARIERT',
  }
}

/**
 * Dünner Aufrufer von F1Bs schreibeWirkungsmarke (AC7: VERWEIGERT wird
 * wiederverwendet, kein neuer Terminalzustand). Identisches Muster wie F3s
 * verweigereAutorisierung.
 */
export function verweigereStart(
  laufId: string,
  profilReferenz: ProfilReferenz,
  grund: string,
  optionen: SchreibOptionen = {}
): { pfad: string; selbstHash: string } {
  return schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis: 'VERWEIGERT', daten: { invocation_policy: { grund } } }, optionen)
}
