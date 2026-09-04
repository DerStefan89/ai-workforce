/**
 * Datei: src/claude-code-gateway/index.ts
 *
 * Zweck: Claude-Code-Gateway (F6a WS1 + WS2,
 * state/tasks/f6a-claude-code-gateway-ws1.md,
 * state/tasks/f6a-ws2-prozessstart.md). WS1: Aufrufkonstruktion und
 * Startfreigabe für den Lesepfad, ohne jeden Prozessstart. baueAufruf
 * konstruiert den Aufruf ausschließlich als Tokens-Array (AK1).
 * pruefeUndVerweigereBeiTreffer führt jeden Aufruf vor jeder Weitergabe
 * durch F4s pruefeAufrufparameter (E-182, AK2/AK4) — ruft bei Treffer F4s
 * verweigereStart auf, startet selbst nie einen Prozess (D5-Muster: kein
 * Nachbau von F4).
 *
 * WS2 + WS4: starteGateway orchestriert den tatsächlichen Prozessstart —
 * pruefeUndVerweigereBeiTreffer (tokens gegen F4s pruefeAufrufparameter,
 * E-182) → zweiter pruefeAufrufparameter-Aufruf gegen
 * werkzeugStartziel.slice(1) (F-119: werkzeugStartziel[1..n] landet
 * unverändert in execFiles argv, siehe prozessstart.ts' echterStarter,
 * passierte bisher weder diesen Guard noch F4s E-188-Gültigkeitsschlüssel
 * — additive Prüfung, kein Schemabruch, werkzeugStartziel bleibt bewusst
 * außerhalb des F4-Gültigkeitsschlüssels, state/findings.md F-119) →
 * prozessstart.ts' pruefeStartziel (AK15, Hygiene-Guard, keine
 * Vertrauensgrenze — die Vertrauensfrage liegt per E2 beim Aufrufer) →
 * bei allen dreien ok:true eine RUN_PREPARED-Wirkungsmarke
 * (F1B) → starteProzess (prozessstart.ts, Argv-Array, F-057) → Ergebnis
 * OHNE Klassifikation auswerten (kein ergebnis-Feld, keine Auswertung der
 * gemeldeten Genehmigungsverweigerungen, F7-Grenze, AK12) →
 * Rohereignisstrom (inkl. werkzeugStartziel + startfehler, F-071) nach
 * kontrollzustand-roh/ schreiben
 * → Laufakte über F2s registriereKernArtefakt registrieren. Schreibt
 * bewusst NIE eine Terminal-Wirkungsmarke für den Prozessausgang selbst
 * (weder bei validem noch bei fehlendem Ergebnisobjekt) — das bliebe eine
 * Klassifikation und ist F7 vorbehalten (AK5); der Lauf bleibt bis dahin
 * KLAERUNG_ERFORDERLICH (F1B), das ist der vorgesehene Zustand, kein
 * Fehler.
 *
 * F4-Startfreigabe (F6b WS-G, hebt Option B auf, Stefan 03.09.2026 —
 * vorher Option B, Stefans Entscheidung 31.08.2026): zwischen dem
 * AK15-Hygiene-Guard und der RUN_PREPARED-Wirkungsmarke ruft starteGateway
 * real F4s pruefeStartfreigabe auf (E-183/E-188, voller
 * Gültigkeitsschlüssel-Vergleich) — nicht mehr nur WS1s
 * pruefeAufrufparameter (E-182). baselineReferenz/wirksamkeitsnachweisReferenz
 * kommen NICHT vom Aufrufer (der könnte sonst selbst bestimmen, gegen
 * welche Autorisierung geprüft wird): starteGateway liest sie aus
 * STANDARD_AKTUELLE_AUTORISIERUNG_PFAD (state/aktuelle-autorisierung.json,
 * überschreibbar über optionen.aktuelleAutorisierungPfad, u.a. für Tests).
 * istZustand misst starteGateway selbst über F4s ermittleIstZustand
 * (dasselbe .claude/settings.json wie im echten Repo, Pfad überschreibbar
 * über optionen.settingsPfad); istUebrigeFelder baut es aus bereits
 * vorhandenen GatewayEingaben ab (kein Doppel-Input). Fehlt die
 * Referenzdatei oder liefert pruefeStartfreigabe ABGELEHNT: verweigereStart
 * (Muster wie der E-182-Zweig), kein Prozessstart, keine
 * RUN_PREPARED-Wirkungsmarke.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ermittleIstZustand, pruefeAufrufparameter, pruefeStartfreigabe, verweigereStart } from '../invocation-policy/index.ts'
import type { BaselineReferenz, IstUebrigeFelder, IstZustand, WirksamkeitsnachweisReferenz } from '../invocation-policy/types.ts'
import { schreibeWirkungsmarke, sha256Hex } from '../checkpoint-store/index.ts'
import type { ProfilReferenz, Schreiber as CheckpointSchreiber } from '../checkpoint-store/types.ts'
import { registriereKernArtefakt } from '../lineage-registry/index.ts'
import { pruefeStartziel, starteProzess } from './prozessstart.ts'
import type { AufrufEingaben, AufrufTokens, GatewayEingaben, GatewayErgebnis, LaufakteV0Daten, Starter } from './types.ts'

/**
 * Von Stefan bestätigter Pfad zur aktuell gültigen Autorisierungsreferenz
 * (state/aktuelle-autorisierung.json, dieses Repo) — absolut, damit er auch
 * nach einem process.chdir() in eine Wegwerf-Kopie (E6-Muster,
 * scripts/verify-f6b-ws-f-rotfall.mjs) noch auf die reale Datei zeigt.
 * Überschreibbar über optionen.aktuelleAutorisierungPfad, u.a. für Tests.
 */
const STANDARD_AKTUELLE_AUTORISIERUNG_PFAD = 'C:\\Users\\stefa\\Projekte\\ai-workforce\\state\\aktuelle-autorisierung.json'

interface AktuelleAutorisierung {
  baselineReferenz: BaselineReferenz
  wirksamkeitsnachweisReferenz: WirksamkeitsnachweisReferenz
}

/** pfad/commit_hash/datei_hash sind bei BaselineReferenz und WirksamkeitsnachweisReferenz identisch geformt (beide non-leere Strings) — eine gemeinsame Formprüfung statt zwei fast gleicher. */
function istGueltigeCommitGepinnteReferenz(wert: unknown): wert is { pfad: string; commit_hash: string; datei_hash: string } {
  if (typeof wert !== 'object' || wert === null) return false
  const obj = wert as Record<string, unknown>
  return typeof obj.pfad === 'string' && obj.pfad.length > 0 && typeof obj.commit_hash === 'string' && obj.commit_hash.length > 0 && typeof obj.datei_hash === 'string' && obj.datei_hash.length > 0
}

/**
 * Liefert null statt zu werfen, wenn die Referenzdatei fehlt, kein gültiges
 * JSON ist, oder nicht die erwartete Form { baselineReferenz,
 * wirksamkeitsnachweisReferenz } trägt — kein Absturz, ABGELEHNT-artiges
 * Verhalten (siehe CONTEXT des Auftrags; die Formprüfung verhindert eine
 * ungefangene TypeError weiter unten in pruefeStartbedingung1/2 bei
 * valide-JSON-aber-falsch-geformtem Inhalt). Ein führendes UTF-8-BOM
 * (übliches Artefakt von Windows-Editoren) wird toleriert, JSON.parse
 * selbst tut das nicht.
 */
function leseAktuelleAutorisierung(pfad: string): AktuelleAutorisierung | null {
  let geparst: unknown
  try {
    let inhalt = readFileSync(pfad, 'utf8')
    if (inhalt.charCodeAt(0) === 0xfeff) inhalt = inhalt.slice(1)
    geparst = JSON.parse(inhalt)
  } catch {
    return null
  }
  if (typeof geparst !== 'object' || geparst === null) return null
  const obj = geparst as Record<string, unknown>
  if (!istGueltigeCommitGepinnteReferenz(obj.baselineReferenz) || !istGueltigeCommitGepinnteReferenz(obj.wirksamkeitsnachweisReferenz)) return null
  return obj as unknown as AktuelleAutorisierung
}

interface Optionen {
  schreiber?: CheckpointSchreiber
  basisVerzeichnis?: string
}

/**
 * Eigene, breitere Optionen für starteGateway (WS2): schreiber ist bewusst
 * nullstellig typisiert (Muster F9, src/human-transport/index.ts) — der
 * Wert wird unverändert an F1Bs schreibeWirkungsmarke UND F2s
 * registriereKernArtefakt durchgereicht, die je eine eigene, nicht
 * kompatible Ereignis-Form erwarten. Ein nullstelliger Aufrufer (Tests,
 * Gate-Skript: `() => {}`) ist in beide Richtungen zuweisungskompatibel,
 * ohne WS1s eigene Optionen oben anzufassen.
 */
interface GatewayOptionen {
  schreiber?: () => void
  basisVerzeichnis?: string
  rohBasisVerzeichnis?: string
  starter?: Starter
  /** Überschreibt den Pfad zu .claude/settings.json für F4s ermittleIstZustand (Standard: process.cwd()-relativ) — u.a. für Tests und für Aufrufer, die nach einem process.chdir() (E6) noch das reale Repo messen müssen. */
  settingsPfad?: string
  /** Überschreibt STANDARD_AKTUELLE_AUTORISIERUNG_PFAD — u.a. für Tests gegen eine Attrappen-Referenzdatei. */
  aktuelleAutorisierungPfad?: string
  /** Überschreibt F4s STANDARD_REPO_WURZEL (externes Autorisierungs-Repo) — u.a. für Tests gegen ein Wegwerf-Git-Repo. */
  startfreigabeRepoWurzel?: string
}

const STANDARD_ROH_BASISVERZEICHNIS = 'kontrollzustand-roh'

function jetzt(): string {
  return new Date().toISOString()
}

function laufakteArtefaktId(laufId: string): string {
  return `laufakte-${laufId}`
}

/** Liefert das geparste Ergebnisobjekt nur bei validem "type":"result"-JSON, sonst null — nur zur Unterscheidung Erfolg/Fehllauf, keine inhaltliche Auswertung des Ergebnisses (F7-Grenze, AK12). Exportiert (F-062), damit F7 dieselbe Parsing-Logik wiederverwendet statt sie nachzubauen (D5). */
export function leseErgebnisobjekt(stdout: string): Record<string, unknown> | null {
  let geparst: unknown
  try {
    geparst = JSON.parse(stdout)
  } catch {
    return null
  }
  if (typeof geparst !== 'object' || geparst === null || Array.isArray(geparst)) return null
  const obj = geparst as Record<string, unknown>
  return obj.type === 'result' ? obj : null
}

/**
 * Liefert den Modellnamen aus dem "type":"result"-Objekt (F6a AK8/F-059),
 * real gemessen in SCOPE 7 (state/tasks/f6a-ws4-windows-prozessstart.md,
 * FOLGT-Klausel): das Ergebnisobjekt trägt ein `modelUsage`-Objekt, dessen
 * Schlüssel der Modellname ist. Nur bei GENAU EINEM Schlüssel eindeutig —
 * kein Schlüssel oder mehr als einer bleibt null, es wird nicht geraten
 * (Muster F-059/F-061).
 */
export function leseModellBeobachtet(ergebnisObjekt: Record<string, unknown> | null): string | null {
  if (ergebnisObjekt === null) return null
  const modelUsage = ergebnisObjekt.modelUsage
  if (typeof modelUsage !== 'object' || modelUsage === null || Array.isArray(modelUsage)) return null
  const schluessel = Object.keys(modelUsage)
  return schluessel.length === 1 ? schluessel[0] : null
}

/**
 * Wirft synchron (D4-Ausnahme wie F1Bs schreibeWirkungsmarke bei
 * ungültigem art/ergebnis), wenn eingaben.modell leer oder fehlt — E-185
 * ist eine Aufrufer-Vertragsverletzung, kein externer Rot-Fall.
 */
export function baueAufruf(eingaben: AufrufEingaben): AufrufTokens {
  if (!eingaben.modell) {
    throw new Error('AufrufEingaben.modell ist Pflichtfeld (E-185) — leer oder fehlend')
  }
  const werkzeugListe = eingaben.werkzeugsatz.erlaubte_werkzeuge.join(',')
  return [
    '--model',
    eingaben.modell,
    '--output-format',
    'json',
    '--setting-sources',
    'project',
    '--tools',
    werkzeugListe,
    '--allowedTools',
    werkzeugListe,
  ]
}

export function pruefeUndVerweigereBeiTreffer(
  tokens: AufrufTokens,
  laufId: string,
  profilReferenz: ProfilReferenz,
  optionen: Optionen = {}
): { ok: true } | { ok: false; grund: string } {
  const ergebnis = pruefeAufrufparameter(tokens)
  if (!ergebnis.ok) {
    const grund = ergebnis.grund ?? 'verbotener Aufrufparameter (E-182)'
    verweigereStart(laufId, profilReferenz, grund, optionen)
    return { ok: false, grund }
  }
  return { ok: true }
}

/**
 * WS2: startet einen Prozess aus einem bereits konstruierten Tokens-Array
 * (WS1s baueAufruf, vom Aufrufer vorher aufgerufen — starteGateway baut
 * keinen zweiten Aufruf, D5). Ablauf siehe Kopfkommentar. Bei Verweigerung
 * durch WS1s Check: kein Prozessstart, keine Wirkungsmarke, keine
 * Laufakte — identisch zum bereits getesteten WS1-Verhalten.
 */
export async function starteGateway(eingaben: GatewayEingaben, optionen: GatewayOptionen = {}): Promise<GatewayErgebnis> {
  const pruefung = pruefeUndVerweigereBeiTreffer(eingaben.tokens, eingaben.laufId, eingaben.profilReferenz, optionen)
  if (!pruefung.ok) {
    return { ok: false, grund: pruefung.grund }
  }

  const startzielArgvPruefung = pruefeAufrufparameter(eingaben.werkzeugStartziel.slice(1))
  if (!startzielArgvPruefung.ok) {
    const grund = startzielArgvPruefung.grund ?? 'verbotener Aufrufparameter (E-182)'
    verweigereStart(eingaben.laufId, eingaben.profilReferenz, grund, optionen)
    return { ok: false, grund }
  }

  const startzielPruefung = pruefeStartziel(eingaben.werkzeugStartziel)
  if (!startzielPruefung.ok) {
    return { ok: false, grund: startzielPruefung.grund }
  }

  const aktuelleAutorisierungPfad = optionen.aktuelleAutorisierungPfad ?? STANDARD_AKTUELLE_AUTORISIERUNG_PFAD
  const aktuelleAutorisierung = leseAktuelleAutorisierung(aktuelleAutorisierungPfad)
  if (aktuelleAutorisierung === null) {
    const grund = existsSync(aktuelleAutorisierungPfad)
      ? 'Referenzdatei ist kein gültiges JSON oder hat nicht die erwartete Form, siehe state/aktuelle-autorisierung.json'
      : 'Referenzdatei fehlt, siehe state/aktuelle-autorisierung.json'
    verweigereStart(eingaben.laufId, eingaben.profilReferenz, grund, optionen)
    return { ok: false, grund }
  }

  const settingsPfad = optionen.settingsPfad ?? join(process.cwd(), '.claude', 'settings.json')
  let istZustand: IstZustand
  try {
    istZustand = ermittleIstZustand(settingsPfad)
  } catch (fehler) {
    const grund = `Ist-Zustand (.claude/settings.json + Schutzskripte) nicht messbar: ${(fehler as Error).message}`
    verweigereStart(eingaben.laufId, eingaben.profilReferenz, grund, optionen)
    return { ok: false, grund }
  }
  const istUebrigeFelder: IstUebrigeFelder = {
    werkzeug_version_deklariert: eingaben.werkzeugVersionDeklariert,
    berechtigungskontext: eingaben.berechtigungskontext,
    arbeitsverzeichnis_pfad: process.cwd(),
    startziel_pfad: eingaben.werkzeugStartziel[0],
  }

  const starturteil = pruefeStartfreigabe(
    {
      baselineReferenz: aktuelleAutorisierung.baselineReferenz,
      istZustand,
      wirksamkeitsnachweisReferenz: aktuelleAutorisierung.wirksamkeitsnachweisReferenz,
      istUebrigeFelder,
    },
    { repoWurzel: optionen.startfreigabeRepoWurzel, schreiber: optionen.schreiber }
  )
  if (starturteil.starturteil === 'ABGELEHNT') {
    verweigereStart(eingaben.laufId, eingaben.profilReferenz, starturteil.grund, optionen)
    return { ok: false, grund: starturteil.grund }
  }

  schreibeWirkungsmarke(eingaben.laufId, eingaben.profilReferenz, 'run_prepared', {}, optionen)

  const prozessErgebnis = await starteProzess(eingaben.werkzeugStartziel, eingaben.tokens, { starter: optionen.starter })
  const ergebnisObjekt = leseErgebnisobjekt(prozessErgebnis.stdout)
  const beobachtungsbasisVollstaendig = ergebnisObjekt !== null
  const modellBeobachtet = leseModellBeobachtet(ergebnisObjekt)

  const rohBasisVerzeichnis = optionen.rohBasisVerzeichnis ?? STANDARD_ROH_BASISVERZEICHNIS
  const rohVerzeichnis = join(rohBasisVerzeichnis, eingaben.laufId)
  mkdirSync(rohVerzeichnis, { recursive: true })
  const rohInhalt = JSON.stringify({
    werkzeugStartziel: eingaben.werkzeugStartziel,
    stdout: prozessErgebnis.stdout,
    stderr: prozessErgebnis.stderr,
    exitCode: prozessErgebnis.exitCode,
    startfehler: prozessErgebnis.startfehler,
  })
  const rohPfad = join(rohVerzeichnis, 'rohstrom.json')
  writeFileSync(rohPfad, rohInhalt, 'utf8')

  const laufakte: LaufakteV0Daten = {
    laufakte_schema: 'v0',
    lauf_id: eingaben.laufId,
    werkzeug_version_deklariert: eingaben.werkzeugVersionDeklariert,
    berechtigungskontext: eingaben.berechtigungskontext,
    arbeitsverzeichnis_pfad: process.cwd(),
    modell_beobachtet: modellBeobachtet,
    beobachtungsbasis_vollstaendig: beobachtungsbasisVollstaendig,
    rohstrom_referenz: { pfad: rohPfad, inhalts_hash: sha256Hex(rohInhalt) },
    erstellt_am: jetzt(),
  }

  const { pfad, versionSequenz } = registriereKernArtefakt(
    laufakteArtefaktId(eingaben.laufId),
    eingaben.profilReferenz,
    { erzeuger: 'kern', schritt: 'claude-code-gateway-lauf' },
    laufakte,
    [],
    optionen
  )

  return { ok: true, laufakte, pfad, versionSequenz }
}

/** Reine Funktion: prüft ein geparstes Objekt gegen schemas/kontrollzustand-laufakte-payload.schema.json. */
export function validiereLaufakteDaten(daten: unknown): string[] {
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = daten as Record<string, unknown>
  const verstoesse: string[] = []
  const erlaubt = new Set([
    'laufakte_schema',
    'lauf_id',
    'werkzeug_version_deklariert',
    'berechtigungskontext',
    'arbeitsverzeichnis_pfad',
    'modell_beobachtet',
    'beobachtungsbasis_vollstaendig',
    'rohstrom_referenz',
    'erstellt_am',
  ])
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  if (obj.laufakte_schema !== 'v0') verstoesse.push("'laufakte_schema' muss 'v0' sein")
  if (typeof obj.lauf_id !== 'string' || obj.lauf_id.length === 0) verstoesse.push("'lauf_id' muss ein nicht-leerer String sein")
  if (typeof obj.werkzeug_version_deklariert !== 'string' || obj.werkzeug_version_deklariert.length === 0) {
    verstoesse.push("'werkzeug_version_deklariert' muss ein nicht-leerer String sein")
  }
  if (typeof obj.berechtigungskontext !== 'string' || obj.berechtigungskontext.length === 0) {
    verstoesse.push("'berechtigungskontext' muss ein nicht-leerer String sein")
  }
  if (typeof obj.arbeitsverzeichnis_pfad !== 'string' || obj.arbeitsverzeichnis_pfad.length === 0) {
    verstoesse.push("'arbeitsverzeichnis_pfad' muss ein nicht-leerer String sein")
  }
  if (!('modell_beobachtet' in obj)) {
    verstoesse.push("Pflichtfeld 'modell_beobachtet' fehlt")
  } else if (obj.modell_beobachtet !== null && (typeof obj.modell_beobachtet !== 'string' || obj.modell_beobachtet.length === 0)) {
    verstoesse.push("'modell_beobachtet' muss null oder ein nicht-leerer String sein")
  }
  if (typeof obj.beobachtungsbasis_vollstaendig !== 'boolean') {
    verstoesse.push("'beobachtungsbasis_vollstaendig' muss ein Boolean sein")
  }
  const rohstromReferenz = obj.rohstrom_referenz
  if (typeof rohstromReferenz !== 'object' || rohstromReferenz === null || Array.isArray(rohstromReferenz)) {
    verstoesse.push("'rohstrom_referenz' muss ein Objekt sein")
  } else {
    const rr = rohstromReferenz as Record<string, unknown>
    const rrErlaubt = new Set(['pfad', 'inhalts_hash'])
    for (const feld of Object.keys(rr)) {
      if (!rrErlaubt.has(feld)) verstoesse.push(`unbekanntes Feld 'rohstrom_referenz.${feld}' (additionalProperties: false)`)
    }
    if (typeof rr.pfad !== 'string' || rr.pfad.length === 0) verstoesse.push("'rohstrom_referenz.pfad' muss ein nicht-leerer String sein")
    if (typeof rr.inhalts_hash !== 'string' || rr.inhalts_hash.length < 64) {
      verstoesse.push("'rohstrom_referenz.inhalts_hash' muss ein String mit mindestens 64 Zeichen sein")
    }
  }
  if (typeof obj.erstellt_am !== 'string' || obj.erstellt_am.length === 0) {
    verstoesse.push("'erstellt_am' muss ein nicht-leerer String sein")
  }
  return verstoesse
}
