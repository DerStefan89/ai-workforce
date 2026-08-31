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
 * WS2: starteGateway orchestriert den tatsächlichen Prozessstart —
 * pruefeUndVerweigereBeiTreffer (unverändert, kein zweiter Aufruf von
 * pruefeAufrufparameter) → bei ok:true eine RUN_PREPARED-Wirkungsmarke
 * (F1B) → starteProzess (prozessstart.ts, Argv-Array, F-057) → Ergebnis
 * OHNE Klassifikation auswerten (kein ergebnis-Feld, keine Auswertung der
 * gemeldeten Genehmigungsverweigerungen, F7-Grenze, AK12) →
 * Rohereignisstrom nach kontrollzustand-roh/ schreiben
 * → Laufakte über F2s registriereKernArtefakt registrieren. Schreibt
 * bewusst NIE eine Terminal-Wirkungsmarke für den Prozessausgang selbst
 * (weder bei validem noch bei fehlendem Ergebnisobjekt) — das bliebe eine
 * Klassifikation und ist F7 vorbehalten (AK5); der Lauf bleibt bis dahin
 * KLAERUNG_ERFORDERLICH (F1B), das ist der vorgesehene Zustand, kein
 * Fehler. Kein F3-, kein volles F4-Startfreigabe-Gate (Option B, Stefans
 * Entscheidung 31.08.2026, siehe state/tasks/f6a-ws2-prozessstart.md).
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pruefeAufrufparameter, verweigereStart } from '../invocation-policy/index.ts'
import { schreibeWirkungsmarke, sha256Hex } from '../checkpoint-store/index.ts'
import type { ProfilReferenz, Schreiber as CheckpointSchreiber } from '../checkpoint-store/types.ts'
import { registriereKernArtefakt } from '../lineage-registry/index.ts'
import { starteProzess } from './prozessstart.ts'
import type { AufrufEingaben, AufrufTokens, GatewayEingaben, GatewayErgebnis, LaufakteV0Daten, Starter } from './types.ts'

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
}

const STANDARD_ROH_BASISVERZEICHNIS = 'kontrollzustand-roh'

function jetzt(): string {
  return new Date().toISOString()
}

function laufakteArtefaktId(laufId: string): string {
  return `laufakte-${laufId}`
}

/** Liefert das geparste Ergebnisobjekt nur bei validem "type":"result"-JSON, sonst null — nur zur Unterscheidung Erfolg/Fehllauf, keine inhaltliche Auswertung des Ergebnisses (F7-Grenze, AK12). */
function leseErgebnisobjekt(stdout: string): Record<string, unknown> | null {
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
 * Wirft synchron (D4-Ausnahme wie F1Bs schreibeWirkungsmarke bei
 * ungültigem art/ergebnis), wenn eingaben.modell leer oder fehlt — E-185
 * ist eine Aufrufer-Vertragsverletzung, kein externer Rot-Fall.
 */
export function baueAufruf(eingaben: AufrufEingaben): AufrufTokens {
  if (!eingaben.modell) {
    throw new Error('AufrufEingaben.modell ist Pflichtfeld (E-185) — leer oder fehlend')
  }
  return [
    '--model',
    eingaben.modell,
    '--output-format',
    'json',
    '--setting-sources',
    'project',
    '--tools',
    eingaben.werkzeugsatz.erlaubte_werkzeuge.join(','),
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

  schreibeWirkungsmarke(eingaben.laufId, eingaben.profilReferenz, 'run_prepared', {}, optionen)

  const prozessErgebnis = await starteProzess(eingaben.tokens, { starter: optionen.starter })
  const beobachtungsbasisVollstaendig = leseErgebnisobjekt(prozessErgebnis.stdout) !== null

  const rohBasisVerzeichnis = optionen.rohBasisVerzeichnis ?? STANDARD_ROH_BASISVERZEICHNIS
  const rohVerzeichnis = join(rohBasisVerzeichnis, eingaben.laufId)
  mkdirSync(rohVerzeichnis, { recursive: true })
  const rohInhalt = JSON.stringify({ stdout: prozessErgebnis.stdout, stderr: prozessErgebnis.stderr, exitCode: prozessErgebnis.exitCode })
  const rohPfad = join(rohVerzeichnis, 'rohstrom.json')
  writeFileSync(rohPfad, rohInhalt, 'utf8')

  const laufakte: LaufakteV0Daten = {
    laufakte_schema: 'v0',
    lauf_id: eingaben.laufId,
    werkzeug_version_deklariert: eingaben.werkzeugVersionDeklariert,
    berechtigungskontext: eingaben.berechtigungskontext,
    arbeitsverzeichnis_pfad: process.cwd(),
    modell_beobachtet: null,
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
