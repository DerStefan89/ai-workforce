/**
 * Datei: src/workflow/index.ts
 *
 * Zweck: Workflow-Modul (F15 WS-1, Meilenstein 3, docs/projekt/
 * zielfassung.md §13.4 E-M3-1). Enthält in WS-1 ausschließlich die reine
 * Schemaprüfung validiereWorkflowDaten — die Form von daten.daten, wenn
 * workflow_schema === "v0" (WORKFLOW_V0). Maschinelles Gegenstück:
 * schemas/kontrollzustand-workflow-payload.schema.json.
 *
 * Muster: src/auftrag/index.ts (F11 WS-1, AUFTRAG_V0). Handgeschrieben,
 * kein ajv und keine generische JSON-Schema-Runtime (D5) — dieselbe
 * Entscheidung wie bei AUFTRAG_V0: das Schema ist die lesbare Beschreibung,
 * die Funktion hier ist die ausgeführte Regel, und das Gate hält beide über
 * dieselben Fixtures aneinander.
 *
 * F15 WS-2a ergänzt zwei Dinge: registriereWorkflow (Muster
 * registriereAuftrag aus src/auftrag/index.ts — das Modul registriert
 * seither sehr wohl ein Artefakt, anders als der WS-1-Stand hier behauptete)
 * und ermittleNaechstenSchritt, die reine Entscheidungsregel des
 * Schritt-Automaten. Der Automat SELBST — wer sie aufruft, wann, und was er
 * mit einem 'starte' anfängt — ist WS-2b und steht bewusst nicht hier.
 * Ebenso wenig die Leitstand-Ansicht (WS-3).
 *
 * Ohne Wirkung in WS-2a: grenzen.max_replans wird validiert, aber von keiner
 * Funktion gelesen — es greift erst mit dem Replan-Pfad. Wer das Feld liest,
 * soll nicht annehmen, hier werde bereits etwas dagegen geprüft (QA-Pass
 * 10.09.2026).
 *
 * F15 WS-2c (b1) ergänzt zwei Regeländerungen und ein optionales Schrittfeld:
 * GESTOPPT verlässt Regel 0 über den EIGENEN Ausgang 'haltGestoppt' (damit
 * kein Automaten-Schreibpfad einen menschlichen Stopp überschreibt), und ein
 * Schritt mit freigabe 'ZWINGEND' UND freigabe_erteilt true gilt als startbar
 * (löst F-207/F-195 — WARTET_FREIGABE hatte bis dahin keinen Ausweg). Beides
 * bleibt reine Entscheidung: wer freigabe_erteilt setzt und wer auf ein
 * haltGestoppt hin was schreibt, steht in scripts/leitstand-server.mjs.
 *
 * Abhängigkeitsarm wie src/auftrag (D1): dieses Modul importiert
 * ausschließlich F2s registriereKernArtefakt, NIE etwas aus
 * src/execution-controller. ermittleNaechstenSchritt nimmt deshalb ein
 * normalisiertes SchrittErgebnis entgegen statt eines AusfuehrungsErgebnis —
 * der Aufrufer normalisiert.
 *
 * Wird aufgerufen von:
 * - scripts/check-f15-workflow.mjs
 * - scripts/leitstand-server.mjs (POST/GET /api/workflows, F15 WS-2a)
 *
 * Wichtig: Fünf Regeln lassen sich in JSON Schema nicht ausdrücken und leben
 * nur hier — Eindeutigkeit der schritt_id, die Querverweise nachfolger und
 * aktiver_schritt_id INNERHALB derselben schritte-Liste, die Zyklenfreiheit
 * der nachfolger-Kette und (F15 WS-2b) die Zusammenführungsfreiheit: zwei
 * Schritte dürfen nicht denselben nachfolger tragen. Wer das Schema ändert,
 * muss diese Funktion mitändern; das Gate hält beide über dieselben Fixtures
 * aneinander.
 *
 * aktiver_schritt_id ist ein CURSOR ([EMPFEHLUNG] Technical Challenger,
 * 09.09.2026, F15 WS-1 — reversibel, solange keine realen
 * WORKFLOW_V0-Artefakte existieren; zu verwerfen, wenn WS-2 zeigt, dass der
 * Wiederaufnahmepunkt ohnehin aus der Schrittliste abgeleitet werden muss):
 * der Schritt, auf dem der Automat steht — der laufende, sonst der als
 * Nächstes fällige; null nur bei ABGESCHLOSSEN oder GESTOPPT. Die Lesart
 * „läuft gerade" wäre redundant zum Schritt mit status LAEUFT und gesetzter
 * lauf_id — zwei Wahrheitsquellen für dieselbe Tatsache (§16.2).
 *
 * F17 WS-2 (a), löst F-323 teilweise: pruefeSchrittForm prüft zusätzlich, ob
 * schritt.rolle eine bekannte Rolle ist (istBekannteRolle, src/rollen/) — rein
 * strukturell, kennt nur den Rollennamen, nicht Werkzeugsatz/Worker/Schema. Die
 * inhaltliche Vertragsprüfung (Werkzeugsatz-Art, Worker, output_schema gegen
 * ROLLENVERTRAEGE) sitzt bewusst NICHT hier, sondern in
 * scripts/leitstand-server.mjs' loeseAusfuehrungsEingabenAuf — diese Funktion kennt
 * die Startvorlage nicht (siehe oben) und kann die Werkzeugsatz-Art eines Schritts
 * deshalb gar nicht auflösen. ermittleNaechstenSchritt bleibt von F17 WS-2
 * unverändert: sie ist Dispatch zur Laufzeit und kennt die Startvorlage ebenso wenig.
 */

import { registriereKernArtefakt } from '../lineage-registry/index.ts'
import { bekannteRollen, istBekannteRolle } from '../rollen/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import type { Ereignis, NaechsterSchritt, Optionen, SchrittErgebnis, WorkflowV0Daten, WorkflowV0Schritt } from './types.ts'

// Die vier Enum-Arrays unten sind die einzige laufzeitwirksame Wahrheit über
// die erlaubten Werte. src/workflow/types.ts trägt dieselben Listen ein
// zweites Mal als Literal-Unions (für ermittleNaechstenSchritt); wer eine
// Liste ändert, ändert beide. Warum das ohne Gate vertretbar ist, steht im
// Kopf von types.ts.

/** Erlaubte Werte von status auf Workflow-Ebene. */
const WORKFLOW_STATUS = ['OFFEN', 'WARTET_FREIGABE', 'LAEUFT', 'ABGESCHLOSSEN', 'KLAERUNG_ERFORDERLICH', 'GESTOPPT']

/** Erlaubte Werte von status auf Schritt-Ebene — die drei terminalen Ausgänge nach ARCHITECTURE.md §4 plus OFFEN/WARTET_FREIGABE/LAEUFT/UEBERSPRUNGEN. */
const SCHRITT_STATUS = ['OFFEN', 'WARTET_FREIGABE', 'LAEUFT', 'ERFOLGREICH', 'VERWEIGERT', 'FEHLGESCHLAGEN', 'UEBERSPRUNGEN']

/** Erlaubte Werte von worker — die beiden in Meilenstein 3 vorgesehenen Ausführungswerkzeuge. */
const WORKER = ['claude-code', 'codex']

/** Erlaubte Werte von freigabe — Freigabebedarf eines Schritts. */
const FREIGABE = ['AUTOMATISCH', 'EMPFOHLEN', 'ZWINGEND']

// Die DREI Allowlists von ermittleNaechstenSchritt (F15 WS-2a). Alle drei sind
// bewusst Teilmengen der Arrays oben und keine Negation davon: wächst
// WORKFLOW_STATUS, SCHRITT_STATUS oder FREIGABE um einen Wert, fällt der neue
// Wert damit in „hält an" statt in „startet automatisch" (Reviewer-Pass
// 10.09.2026, K2/R2). Eine Sperrliste an derselben Stelle hätte die umgekehrte
// Wirkung — der vergessene Wert nähme sich die Automatik lautlos.

/** Workflow-Status, aus denen heraus überhaupt noch ein Schritt entstehen darf. ABGESCHLOSSEN und GESTOPPT fehlen absichtlich. */
const FORTSETZBARE_WORKFLOW_STATUS = ['OFFEN', 'WARTET_FREIGABE', 'LAEUFT', 'KLAERUNG_ERFORDERLICH']

/** Schritt-Status, aus denen heraus ein Schritt gestartet werden darf. Alles andere ist entweder gelaufen, läuft oder wurde übersprungen. */
const STARTBEREITE_SCHRITT_STATUS = ['OFFEN', 'WARTET_FREIGABE']

/** Freigabewerte, die den Automaten ohne Rückfrage starten lassen (E-M3-1: die Automatik hängt allein an ≠ ZWINGEND). */
const AUTOMATISCH_STARTENDE_FREIGABE = ['AUTOMATISCH', 'EMPFOHLEN']

/**
 * Muster jeder Artefakt-Referenz in schritte[].eingaben. Wortgleich mit
 * "pattern" im Schema — bewusst dieselbe Regex statt einer startsWith-Prüfung:
 * '.' matcht in JS kein \n, eine startsWith-Fassung würde "artefakt:\n"
 * akzeptieren, das Schema es aber ablehnen (Reviewer-Pass 09.09.2026).
 */
const EINGABE_MUSTER = /^artefakt:.+/

const WORKFLOW_FELDER = new Set([
  'workflow_schema',
  'workflow_id',
  'auftrag_id',
  'version',
  'ziel',
  'status',
  'aktiver_schritt_id',
  // OPTIONAL (F15 WS-2c, löst F-202): der zuletzt festgestellte Halt-Grund des
  // Automaten. Bewusst optional und NICHT required — jede bereits geschriebene
  // Workflow-Version ist append-only (ARCHITECTURE.md §7) und trägt das Feld
  // nicht; ein Pflichtfeld machte den gesamten Bestand mit einem Schlag
  // ungültig. Dieselbe Überlegung, aus der grenzen.max_replans nicht entfernt
  // werden konnte (F-203).
  'grund',
  'grenzen',
  'schritte',
])

const GRENZEN_FELDER = new Set(['max_schritte', 'max_replans'])

const SCHRITT_FELDER = new Set([
  'schritt_id',
  'rolle',
  'werkzeugsatz',
  'worker',
  'modell',
  'eingaben',
  'output_schema',
  'freigabe',
  'risiko',
  'zeitgrenze_ms',
  'nachfolger',
  'status',
  'lauf_id',
  // OPTIONAL (F15 WS-2c (b1), löst F-207): die für genau diesen Schritt
  // erteilte menschliche Freigabe. Bewusst optional und NICHT required —
  // dieselbe Überlegung wie bei 'grund' (a5): jede bereits geschriebene
  // Workflow-Version ist append-only (ARCHITECTURE.md §7) und trägt das Feld
  // nicht.
  'freigabe_erteilt',
])

/**
 * Prüft, ob ein Wert ein einfaches Objekt ist (kein Array, nicht null).
 * @param wert - zu prüfender Wert
 * @returns true, wenn der Wert ein einfaches Objekt ist
 */
function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

/**
 * Prüft, ob ein Wert ein nicht-leerer String ist.
 * @param wert - zu prüfender Wert
 * @returns true, wenn der Wert ein String mit Länge > 0 ist
 */
function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.length > 0
}

/**
 * Prüft, ob ein Wert eine ganze Zahl >= untergrenze ist.
 * @param wert - zu prüfender Wert
 * @param untergrenze - kleinster erlaubter Wert (inklusiv)
 * @returns true, wenn der Wert eine ganze Zahl >= untergrenze ist
 */
function istGanzzahlAb(wert: unknown, untergrenze: number): boolean {
  return typeof wert === 'number' && Number.isInteger(wert) && wert >= untergrenze
}

/**
 * Prüft, ob ein Feld ein nicht-leerer String oder null ist (Form "string oder null").
 * Ein FEHLENDES Feld ist ebenfalls ein Verstoß — im Schema ist es required.
 * @param obj - das tragende Objekt
 * @param feld - Feldname
 * @returns true, wenn das Feld vorhanden und ein nicht-leerer String oder null ist
 */
function istStringOderNull(obj: Record<string, unknown>, feld: string): boolean {
  if (!(feld in obj)) return false
  return obj[feld] === null || istNichtLeererString(obj[feld])
}

/**
 * Meldet unbekannte Felder eines Objekts (additionalProperties: false).
 * @param obj - zu prüfendes Objekt
 * @param erlaubt - Menge der erlaubten Feldnamen
 * @param praefix - Pfad-Präfix für die Meldung, z. B. "schritte[0]."
 * @param verstoesse - Liste, an die Befunde angehängt werden
 */
function meldeUnbekannteFelder(
  obj: Record<string, unknown>,
  erlaubt: Set<string>,
  praefix: string,
  verstoesse: string[]
): void {
  for (const feld of Object.keys(obj)) {
    if (!erlaubt.has(feld)) verstoesse.push(`unbekanntes Feld '${praefix}${feld}' (additionalProperties: false)`)
  }
}

/**
 * Prüft ein einzelnes schritte[]-Element gegen die Schrittform von WORKFLOW_V0.
 * Prüft ausschließlich die Form des Schritts selbst — die Querverweise
 * (nachfolger auf eine existierende schritt_id) prüft validiereWorkflowDaten,
 * weil dafür die vollständige Schrittliste bekannt sein muss.
 * @param schritt - zu prüfendes Element, Typ unbekannt
 * @param praefix - Pfad-Präfix für Meldungen, z. B. "schritte[0]."
 * @param verstoesse - Liste, an die Befunde angehängt werden
 */
function pruefeSchrittForm(schritt: unknown, praefix: string, verstoesse: string[]): void {
  if (!istObjekt(schritt)) {
    verstoesse.push(`'${praefix.slice(0, -1)}' ist kein Objekt`)
    return
  }
  meldeUnbekannteFelder(schritt, SCHRITT_FELDER, praefix, verstoesse)

  if (!istNichtLeererString(schritt.schritt_id)) verstoesse.push(`'${praefix}schritt_id' muss ein nicht-leerer String sein`)
  if (!istNichtLeererString(schritt.rolle)) verstoesse.push(`'${praefix}rolle' muss ein nicht-leerer String sein`)
  else if (!istBekannteRolle(schritt.rolle)) verstoesse.push(`'${praefix}rolle' muss einer von ${bekannteRollen().join(', ')} sein`)
  if (!istNichtLeererString(schritt.werkzeugsatz)) verstoesse.push(`'${praefix}werkzeugsatz' muss ein nicht-leerer String sein`)
  if (typeof schritt.worker !== 'string' || !WORKER.includes(schritt.worker)) {
    verstoesse.push(`'${praefix}worker' muss einer von ${WORKER.join(', ')} sein`)
  }
  if (!istNichtLeererString(schritt.modell)) verstoesse.push(`'${praefix}modell' muss ein nicht-leerer String sein`)

  if (!Array.isArray(schritt.eingaben)) {
    verstoesse.push(`'${praefix}eingaben' muss ein Array sein`)
  } else {
    schritt.eingaben.forEach((eingabe, i) => {
      if (!istNichtLeererString(eingabe) || !EINGABE_MUSTER.test(eingabe)) {
        verstoesse.push(`'${praefix}eingaben[${i}]' muss eine Artefakt-Referenz im Format 'artefakt:<artefakt-id>' sein`)
      }
    })
  }

  if (!istStringOderNull(schritt, 'output_schema')) {
    verstoesse.push(`'${praefix}output_schema' muss ein nicht-leerer String oder null sein`)
  }
  if (typeof schritt.freigabe !== 'string' || !FREIGABE.includes(schritt.freigabe)) {
    verstoesse.push(`'${praefix}freigabe' muss einer von ${FREIGABE.join(', ')} sein`)
  }
  if (!istNichtLeererString(schritt.risiko)) verstoesse.push(`'${praefix}risiko' muss ein nicht-leerer String sein`)
  if (!istGanzzahlAb(schritt.zeitgrenze_ms, 1)) verstoesse.push(`'${praefix}zeitgrenze_ms' muss eine ganze Zahl >= 1 sein`)
  if (!istStringOderNull(schritt, 'nachfolger')) {
    verstoesse.push(`'${praefix}nachfolger' muss ein nicht-leerer String oder null sein`)
  }
  if (typeof schritt.status !== 'string' || !SCHRITT_STATUS.includes(schritt.status)) {
    verstoesse.push(`'${praefix}status' muss einer von ${SCHRITT_STATUS.join(', ')} sein`)
  }
  if (!istStringOderNull(schritt, 'lauf_id')) {
    verstoesse.push(`'${praefix}lauf_id' muss ein nicht-leerer String oder null sein`)
  }
  // Einziges OPTIONALES Feld auf Schrittebene (F15 WS-2c (b1)): ein FEHLENDES
  // Feld ist gültig (Bestandsversionen), ein vorhandenes muss ein boolean
  // sein. Deshalb die 'in'-Prüfung davor — Muster 'grund' auf Workflow-Ebene.
  if ('freigabe_erteilt' in schritt && typeof schritt.freigabe_erteilt !== 'boolean') {
    verstoesse.push(`'${praefix}freigabe_erteilt' muss ein boolean sein (optionales Feld)`)
  }
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/kontrollzustand-workflow-payload.schema.json (WORKFLOW_V0).
 * Keine Seiteneffekte, kein Datei-I/O — Muster validiereAuftragDaten (D5).
 * Über die reine Formprüfung hinaus gelten drei Querverweisregeln, die JSON
 * Schema nicht ausdrücken kann: keine doppelte schritt_id, jeder gesetzte
 * nachfolger zeigt auf eine schritt_id derselben Liste, und
 * aktiver_schritt_id (falls gesetzt) ebenso.
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereWorkflowDaten(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const obj = daten
  const verstoesse: string[] = []

  meldeUnbekannteFelder(obj, WORKFLOW_FELDER, '', verstoesse)

  if (obj.workflow_schema !== 'v0') verstoesse.push("'workflow_schema' muss 'v0' sein")
  if (!istNichtLeererString(obj.workflow_id)) verstoesse.push("'workflow_id' muss ein nicht-leerer String sein")
  if (!istNichtLeererString(obj.auftrag_id)) verstoesse.push("'auftrag_id' muss ein nicht-leerer String sein")
  if (!istGanzzahlAb(obj.version, 1)) verstoesse.push("'version' muss eine ganze Zahl >= 1 sein")
  if (!istNichtLeererString(obj.ziel)) verstoesse.push("'ziel' muss ein nicht-leerer String sein")
  if (typeof obj.status !== 'string' || !WORKFLOW_STATUS.includes(obj.status)) {
    verstoesse.push(`'status' muss einer von ${WORKFLOW_STATUS.join(', ')} sein`)
  }
  if (!istStringOderNull(obj, 'aktiver_schritt_id')) {
    verstoesse.push("'aktiver_schritt_id' muss ein nicht-leerer String oder null sein")
  }
  // grund ist das einzige OPTIONALE Feld auf Workflow-Ebene (F15 WS-2c): ein
  // FEHLENDES Feld ist gültig (Bestandsversionen aus der Zeit vor WS-2c), ein
  // vorhandenes muss die Form "nicht-leerer String oder null" tragen. Deshalb
  // die 'in'-Prüfung davor — istStringOderNull allein wertet ein fehlendes Feld
  // als Verstoß, so wie es bei jedem Pflichtfeld auch soll.
  if ('grund' in obj && !istStringOderNull(obj, 'grund')) {
    verstoesse.push("'grund' muss ein nicht-leerer String oder null sein (optionales Feld)")
  }

  if (!istObjekt(obj.grenzen)) {
    verstoesse.push("'grenzen' muss ein Objekt sein")
  } else {
    meldeUnbekannteFelder(obj.grenzen, GRENZEN_FELDER, 'grenzen.', verstoesse)
    if (!istGanzzahlAb(obj.grenzen.max_schritte, 1)) verstoesse.push("'grenzen.max_schritte' muss eine ganze Zahl >= 1 sein")
    if (!istGanzzahlAb(obj.grenzen.max_replans, 0)) verstoesse.push("'grenzen.max_replans' muss eine ganze Zahl >= 0 sein")
  }

  if (!Array.isArray(obj.schritte)) {
    verstoesse.push("'schritte' muss ein Array sein")
    return verstoesse
  }
  if (obj.schritte.length === 0) {
    verstoesse.push("'schritte' muss mindestens einen Eintrag enthalten")
    return verstoesse
  }

  for (const [i, schritt] of obj.schritte.entries()) {
    pruefeSchrittForm(schritt, `schritte[${i}].`, verstoesse)
  }

  // ─── Querverweise ──────────────────────────────────────────────────────
  // Die Menge der bekannten IDs entsteht nur aus Schritten mit formal
  // gültiger schritt_id — Grund ist Typsicherheit: ein Set<string> darf keine
  // Nicht-Strings aufnehmen, sonst vergleicht der Referenztest Äpfel mit
  // Birnen.
  //
  // Bewusst in Kauf genommen (Reviewer-Pass 09.09.2026): trägt ein Schritt
  // eine kaputte schritt_id und zeigt ein anderer nachfolger darauf, meldet
  // die Funktion beides — den Formfehler UND einen unbekannten nachfolger.
  // Zwei Meldungen für einen Defekt. Das Urteil (ungültig) bleibt richtig;
  // eine Unterdrückung der Folgemeldung wäre mehr Mechanik, als der Fall
  // wert ist.
  const bekannteIds = new Set<string>()
  const doppelte = new Set<string>()
  for (const schritt of obj.schritte) {
    if (!istObjekt(schritt) || !istNichtLeererString(schritt.schritt_id)) continue
    if (bekannteIds.has(schritt.schritt_id)) doppelte.add(schritt.schritt_id)
    bekannteIds.add(schritt.schritt_id)
  }
  for (const id of doppelte) {
    verstoesse.push(`'schritte' enthält die schritt_id '${id}' mehrfach — schritt_id muss eindeutig sein`)
  }

  for (const [i, schritt] of obj.schritte.entries()) {
    if (!istObjekt(schritt)) continue
    const nachfolger = schritt.nachfolger
    if (istNichtLeererString(nachfolger) && !bekannteIds.has(nachfolger)) {
      verstoesse.push(`'schritte[${i}].nachfolger' verweist auf die unbekannte schritt_id '${nachfolger}'`)
    }
  }

  const aktiv = obj.aktiver_schritt_id
  if (istNichtLeererString(aktiv) && !bekannteIds.has(aktiv)) {
    verstoesse.push(`'aktiver_schritt_id' verweist auf die unbekannte schritt_id '${aktiv}'`)
  }

  // Fünfte Querverweisregel (F15 WS-2b): zwei Schritte dürfen nicht denselben
  // nachfolger tragen. Bis WS-2b galt eine Zusammenführung ausdrücklich als
  // Grünfall — sie ist ja kein Zyklus. Der Startendpunkt bestimmt den
  // Lineage-Vorgänger eines Schritts aber über
  // 'nachfolger === schritt_id && lauf_id !== null'; bei einer Zusammenführung
  // ist er nicht bestimmbar, und der Endpunkt hält mit 409 an, statt zu raten
  // (D2). Ein Validator, der so einen Workflow annimmt, ließe also einen Plan
  // durch, der sich nicht zu Ende ausführen lässt — die Ablehnung gehört
  // hierher, an die Stelle, an der der Mensch den Plan noch ändern kann, und
  // nicht erst an den Start.
  //
  // Der 409 im Startendpunkt bleibt als zweite Verteidigungslinie stehen:
  // Bestandsartefakte aus der Zeit vor dieser Regel sind bereits geschrieben
  // und passieren validiereWorkflowDaten nie wieder — außer beim Laden im
  // Startendpunkt, wo sie jetzt an dieser Regel als 409 hängen bleiben.
  const zusammenfuehrungen = new Map<string, string[]>()
  for (const schritt of obj.schritte) {
    if (!istObjekt(schritt) || !istNichtLeererString(schritt.nachfolger) || !istNichtLeererString(schritt.schritt_id)) continue
    const vorgaenger = zusammenfuehrungen.get(schritt.nachfolger) ?? []
    vorgaenger.push(schritt.schritt_id)
    zusammenfuehrungen.set(schritt.nachfolger, vorgaenger)
  }
  for (const [nachfolger, vorgaenger] of zusammenfuehrungen) {
    if (vorgaenger.length > 1) {
      verstoesse.push(
        `'schritte' führt ${vorgaenger.length} Schritte (${vorgaenger.join(', ')}) auf denselben nachfolger '${nachfolger}' zusammen — der Lineage-Vorgänger wäre nicht bestimmbar`
      )
    }
  }

  for (const zyklus of findeZyklen(obj.schritte)) {
    verstoesse.push(`'schritte' enthält einen Zyklus über 'nachfolger': ${zyklus.join(' -> ')}`)
  }

  return verstoesse
}

/**
 * Sucht Zyklen in der nachfolger-Kette. In Fassung 1 ist nachfolger eine
 * lineare Kette ohne Schleifenkonstrukt — ein Zyklus oder Selbstverweis ist
 * damit immer ein Autorenfehler, nicht eine gewollte Wiederholung
 * ([EMPFEHLUNG] Technical Challenger, 09.09.2026, F15 WS-1 — zu verwerfen,
 * wenn Fassung 2 ein echtes Schleifenkonstrukt einführt).
 *
 * Verfahren: von jedem noch nicht abgearbeiteten Schritt der Kette folgen und
 * den Pfad mitführen. Trifft der Lauf auf eine ID im AKTUELLEN Pfad, ist ein
 * Zyklus gefunden; trifft er auf eine bereits abgearbeitete ID, endet er ohne
 * Befund. Das `abgearbeitet`-Set ist der Grund, warum jeder Zyklus GENAU
 * EINMAL gemeldet wird und nicht einmal je Einstiegspunkt.
 *
 * Schritte ohne gültige schritt_id und nachfolger, die ins Leere zeigen,
 * werden übersprungen — beides ist oben bereits als eigener Verstoß gemeldet.
 * @param schritte - die schritte-Liste, Elementtypen unbekannt
 * @returns je Zyklus ein Pfad, der mit der wiederholten ID beginnt und endet
 */
function findeZyklen(schritte: unknown[]): string[][] {
  const nachfolgerVonId = new Map<string, string>()
  for (const schritt of schritte) {
    if (!istObjekt(schritt) || !istNichtLeererString(schritt.schritt_id)) continue
    // Bei doppelter schritt_id gewinnt der erste Eintrag; die Dublette selbst
    // ist oben bereits gemeldet.
    if (nachfolgerVonId.has(schritt.schritt_id)) continue
    if (istNichtLeererString(schritt.nachfolger)) nachfolgerVonId.set(schritt.schritt_id, schritt.nachfolger)
  }

  const zyklen: string[][] = []
  const abgearbeitet = new Set<string>()

  for (const start of nachfolgerVonId.keys()) {
    if (abgearbeitet.has(start)) continue
    const pfad: string[] = []
    const imPfad = new Set<string>()
    let aktuell: string | undefined = start

    while (aktuell !== undefined && !abgearbeitet.has(aktuell)) {
      if (imPfad.has(aktuell)) {
        // Ab der Wiederholung schneiden und sie ans Ende hängen: a -> b -> a.
        zyklen.push([...pfad.slice(pfad.indexOf(aktuell)), aktuell])
        break
      }
      pfad.push(aktuell)
      imPfad.add(aktuell)
      aktuell = nachfolgerVonId.get(aktuell)
    }

    for (const id of pfad) abgearbeitet.add(id)
  }

  return zyklen
}

// ─── Registrierung (F15 WS-2a) ─────────────────────────────────────────────

function jetzt(): string {
  return new Date().toISOString()
}

function standardSchreiber(ereignis: Ereignis): void {
  console.log(JSON.stringify(ereignis))
}

function stillerLineageSchreiber(): void {
  // Unterdrückt F2s eigene lineage_*-Ereignisse — dieses Modul protokolliert
  // sein eigenes, höherstufiges workflow_registriert-Ereignis (Muster
  // src/auftrag/index.ts, dort wortgleich begründet).
}

/**
 * Registriert einen vollständigen WORKFLOW_V0-Datensatz als Kernartefakt
 * unter der Artefakt-ID `workflow-<workflow_id>` (F15 WS-2a), über F2s
 * registriereKernArtefakt — Muster registriereAuftrag (F11 WS-1), kein
 * Eingriff in src/lineage-registry/.
 *
 * Prüft NICHT selbst: `daten` muss bereits validiereWorkflowDaten passiert
 * haben. Bewusst dieselbe Arbeitsteilung wie bei registriereAuftrag (die
 * Formprüfung sitzt beim Aufrufer, nicht ein zweites Mal hier) — der einzige
 * Aufrufer in WS-2a, POST /api/workflows, lehnt vorher mit 400 ab.
 *
 * eingaben bleibt [] wie beim Auftrag: eine EingabeReferenz trägt Pfad UND
 * Inhalts-Hash des zitierten Artefakts, beides hat dieser Schreibpfad nicht
 * geladen (er startet nichts, er legt nur an). Der Bezug zum Auftrag steht
 * im Datensatz selbst (auftrag_id). Wenn WS-2b den Workflow real startet und
 * das Auftragsartefakt ohnehin lädt, ist das die Stelle, an der ein echtes
 * Zitat entstehen kann — nicht hier.
 * @param daten - vollständiger, bereits validierter WORKFLOW_V0-Datensatz
 * @param profilReferenz - Profilbezug, unverändert an F2 gereicht
 * @param optionen - basisVerzeichnis/schreiber, Muster F5/F2
 * @returns pfad, versionSequenz und inhaltsHash der geschriebenen Version
 */
export function registriereWorkflow(
  daten: WorkflowV0Daten,
  profilReferenz: ProfilReferenz,
  optionen: Optionen = {}
): { pfad: string; versionSequenz: number; inhaltsHash: string } {
  const schreiber = optionen.schreiber ?? standardSchreiber
  const lineageOptionen = { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: stillerLineageSchreiber }

  const { pfad, versionSequenz, inhaltsHash } = registriereKernArtefakt(
    `workflow-${daten.workflow_id}`,
    profilReferenz,
    { quelle: 'workflow' },
    daten,
    [],
    lineageOptionen
  )

  schreiber({ ereignis: 'workflow_registriert', zeitstempel: jetzt(), workflow_id: daten.workflow_id, versionSequenz })
  return { pfad, versionSequenz, inhaltsHash }
}

// ─── Schritt-Entscheidung (F15 WS-2a) ──────────────────────────────────────

/**
 * Zählt die real gelaufenen Schritte gegen grenzen.max_schritte.
 *
 * „Real gelaufen" heißt: der Schritt trägt eine lauf_id. Der gerade
 * gemeldete Vorschritt wird zusätzlich gezählt, wenn die Liste seine lauf_id
 * noch nicht trägt (Vergleich gegen den gemeldeten Wert, nicht bloß gegen
 * null — sonst bliebe ein Wiederholungslauf desselben Schritts ungezählt,
 * QA-Pass 10.09.2026, TC-A4). Ohne diesen Zusatz hinge das Ergebnis davon
 * ab, ob der Aufrufer die Schrittliste VOR oder NACH dem Aufruf
 * fortschreibt, und die Grenze wäre um eins zu spät wirksam.
 *
 * GRENZE DIESER GRENZE, ausdrücklich (QA-Pass 10.09.2026, TC-A3):
 * max_schritte ist ein SCHRITT-Budget, kein LAUF-Budget. WORKFLOW_V0 hält je
 * Schritt genau eine lauf_id; führt der Automat denselben Schritt ein zweites
 * Mal aus und überschreibt sie, steigt der Zähler nicht. Diese Funktion kann
 * eine Wiederholungsschleife also NICHT beenden — sie begrenzt die Zahl
 * verschiedener gelaufener Schritte, nicht die Zahl der Werkzeugaufrufe.
 * Dass der Automat terminiert, hängt zusätzlich an der Zyklenfreiheit der
 * nachfolger-Kette (validiereWorkflowDaten, nur beim Anlegen geprüft) und
 * daran, dass WS-2b keinen Schritt wiederholt, ohne selbst mitzuzählen. Ein
 * echtes Laufbudget bräuchte ein Zählfeld im Schema — eine WS-1-Änderung und
 * bewusst nicht Teil von WS-2a.
 * @param schritte - die Schrittliste des Workflows
 * @param vorschrittErgebnis - Ergebnis des zuletzt gelaufenen Schritts, falls vorhanden
 * @returns Anzahl der real gelaufenen Schritte
 */
function zaehleGelaufeneSchritte(schritte: WorkflowV0Schritt[], vorschrittErgebnis?: SchrittErgebnis): number {
  let gelaufen = 0
  for (const schritt of schritte) {
    if (schritt.lauf_id !== null) gelaufen += 1
  }
  if (vorschrittErgebnis !== undefined) {
    const vorschritt = schritte.find((schritt) => schritt.schritt_id === vorschrittErgebnis.schrittId)
    if (vorschritt !== undefined && vorschritt.lauf_id !== vorschrittErgebnis.laufId) gelaufen += 1
  }
  return gelaufen
}

/**
 * Reine Entscheidungsregel des Schritt-Automaten (F15 WS-2a, E-M3-1): was
 * geschieht nach dem gemeldeten Schrittergebnis — und beim Erststart eines
 * Workflows, wenn kein Ergebnis vorliegt. Kein Datei-I/O, kein Schreiben,
 * kein Import aus src/execution-controller: die Funktion entscheidet, sie
 * handelt nicht. Der Automat, der ein 'starte' in einen echten Lauf
 * übersetzt, ist WS-2b.
 *
 * Sieben Prüfungen (0, 1, 2, 3, 4, 4b, 5), in genau dieser Reihenfolge, und
 * die Reihenfolge ist die eigentliche Aussage:
 *
 * 0. Workflow-status ∉ FORTSETZBARE_WORKFLOW_STATUS → haltKlaerung (bzw.
 *    fertig, wenn ein ABGESCHLOSSENER Workflow ohne Ergebnis angeschaut
 *    wird, bzw. haltGestoppt bei GESTOPPT — WS-2c (b1): ein menschlicher
 *    Stopp darf von keinem Automaten-Ausgang überschrieben werden). Als
 *    einzige Regel VOR der Verzweigung nach „mit/ohne
 *    Vorschrittergebnis", weil sie sonst genau den Fall verfehlt, für den
 *    sie da ist — ein verspätetes Laufergebnis auf einem gestoppten
 *    Workflow (Reviewer-Pass 10.09.2026, R1).
 * 1. Vorschritt nicht ERFOLGREICH → haltKlaerung. Kein Weiterlaufen über
 *    einen VERWEIGERT/FEHLGESCHLAGEN-Ausgang hinweg (ARCHITECTURE.md §4:
 *    Blockieren ist ein normaler Ausgang; ein unterbrochener Baulauf wird
 *    nie automatisch neu gestartet).
 * 2. grenzen.max_schritte erreicht → haltGrenze. VOR den vier
 *    Schritt-Eigenschaften unten, weil die Grenze unabhängig davon gilt, was
 *    der nächste Schritt zufällig für einen Zustand, Worker, Freigabebedarf
 *    oder ein Ausgabeschema trägt — eine erreichte Grenze startet nichts und legt
 *    auch nichts zur Freigabe vor.
 * 3. Der zu startende Schritt ist nicht startbereit (lauf_id gesetzt, oder
 *    status außerhalb OFFEN/WARTET_FREIGABE) → haltKlaerung. Das ist
 *    dieselbe Regel wie 1, nur für den Fall OHNE Vorschrittergebnis: eine
 *    Wiederaufnahme nach Serverneustart liest den Workflow frisch ein und
 *    kommt hier ohne Ergebnis an. Ohne diese Regel liefe ein bereits
 *    ABGESCHLOSSENER oder ein auf VERWEIGERT stehen gebliebener Workflow von
 *    vorn los — ARCHITECTURE.md §4, „ein unterbrochener Baulauf wird nie
 *    automatisch neu gestartet", verletzt an genau der Stelle, die den
 *    Automaten sichern soll (Reviewer-Pass 10.09.2026, K1).
 *    UEBERSPRUNGEN hält hier ebenfalls an und wird NICHT übersprungen: einen
 *    Schritt zu überspringen heißt, die Kette an ihm vorbei fortzusetzen,
 *    und das ist eine Replan-Entscheidung (grenzen.max_replans), die WS-2a
 *    nicht trifft. Anhalten ist der sichere Vorgabewert.
 * 4. worker ∉ WORKER → haltKlaerung. VOR der Freigabeprüfung, obwohl beide
 *    anhalten: ein Schritt, der gar nicht startbar ist, darf dem Menschen
 *    nicht als Freigabefrage vorgelegt werden, die Freigabe bliebe folgenlos.
 *    Kein stiller Ersatz durch claude-code (E-159 kein stiller Fallback,
 *    E-M3-3 gepinnte Besetzung Rolle→Worker→Modell).
 *    Die WS-2a-[EMPFEHLUNG] an dieser Stelle — "worker ≠ 'claude-code' hält
 *    an, zu verwerfen, sobald F16 Codex dispatchbar macht" — ist mit F16
 *    WS-3a (AK10) eingelöst: 'codex' ist dispatchbar. Verworfen ist damit
 *    aber nur der WERT, nicht die FORM. Die Regel prüft weiterhin gegen das
 *    Erlaubte (WORKER) und nicht gegen das eine Verbotene: die naheliegende
 *    Erweiterung auf `worker !== 'claude-code' && worker !== 'codex'` wäre
 *    dieselbe Zeile in Blacklist-Form gewesen und hätte einem künftigen
 *    dritten Worker die Automatik lautlos überlassen (Reviewer-Pass
 *    10.09.2026, K2/R2 — siehe Absatz unten).
 * 4b. worker = 'claude-code' UND output_schema ≠ null → haltKlaerung (F16
 *    WS-3a, AK10). Ein Ausgabeschema gibt es ausschließlich als
 *    '--output-schema' am Codex-Argv (AK1); an einem Claude-Code-Schritt ist
 *    es eine Planangabe, die kein Aufrufbauer je einlöst — der Schritt liefe
 *    scheinbar planmäßig und ohne das erwartete typisierte Ergebnis. Still
 *    ignorieren ist die schlechtere Hälfte von E-159. Ausdrücklich HIER und
 *    NICHT in validiereWorkflowDaten (F-277/F-285): der Validator läuft über
 *    JEDEN Datensatz, auch über die bereits geschriebenen, append-only
 *    (ARCHITECTURE.md §2) — dieselbe Regel dort machte den Bestand
 *    rückwirkend ungültig, statt nur seinen nächsten Start anzuhalten.
 * 5. freigabe ∉ {AUTOMATISCH, EMPFOHLEN} UND freigabe_erteilt ≠ true →
 *    haltFreigabe, sonst starte. Der zweite Halbsatz ist WS-2c (b1): ein
 *    ZWINGEND-Schritt, für den ein Mensch real freigegeben hat, ist startbar;
 *    ohne das Feld hält er unverändert an (F-207/F-195).
 *    AUTOMATISCH und EMPFOHLEN starten beide (E-M3-1: die Automatik hängt
 *    allein an ≠ ZWINGEND). Der Unterschied zwischen AUTOMATISCH und
 *    EMPFOHLEN ist rein anzeigend und gehört nach WS-3 — hier bewusst KEINE
 *    Sonderbehandlung, sonst entstünde eine zweite, stille Freigabestufe.
 *
 * Die Regeln 0, 3, 4, 4b und 5 sind bewusst als ALLOWLIST formuliert („ist es
 * genau das Erlaubte?") und nicht als Blacklist („ist es das eine
 * Verbotene?"). Der Unterschied wird erst sichtbar, wenn jemand
 * WORKFLOW_STATUS, SCHRITT_STATUS, WORKER oder FREIGABE oben um einen Wert
 * erweitert (bei 4b: wenn ein zweiter Worker ein Ausgabeschema einlösen
 * können soll)
 * erweitert: bei einer Blacklist fiele der neue Wert still in „startet
 * automatisch", bei der Allowlist in „hält an". Ein neuer Status, Worker oder
 * eine neue Freigabestufe muss hier eine bewusste Zeile bekommen, statt sich
 * die Automatik lautlos zu nehmen (Reviewer-Pass 10.09.2026, K2/R2).
 *
 * Zwei Ausgänge stehen quer dazu: `fertig` (Vorschritt ERFOLGREICH,
 * nachfolger === null) wird direkt nach Regel 1 entschieden, weil dann gar
 * kein nächster Schritt existiert, auf den die Regeln 2-5 anwendbar wären.
 * Und ein Verweis ins Leere (unbekannte schritt_id im Ergebnis, im
 * nachfolger oder im Cursor) endet als haltKlaerung mit aktiverSchrittId
 * null: bei validierten Daten unerreichbar (validiereWorkflowDaten prüft
 * alle drei Querverweise), aber die Union bleibt geschlossen und der Automat
 * hält an, statt auf undefined weiterzurechnen.
 * @param daten - vollständiger, bereits validierter WORKFLOW_V0-Datensatz
 * @param vorschrittErgebnis - normalisiertes Ergebnis des zuletzt gelaufenen Schritts; weglassen beim Erststart
 * @returns der zu wählende Ausgang samt zu setzendem aktiver_schritt_id
 */
export function ermittleNaechstenSchritt(daten: WorkflowV0Daten, vorschrittErgebnis?: SchrittErgebnis): NaechsterSchritt {
  const schrittNachId = new Map(daten.schritte.map((schritt) => [schritt.schritt_id, schritt]))

  // Regel 0, VOR der Verzweigung und damit in BEIDEN Zweigen: aus einem nicht
  // fortsetzbaren Workflow entsteht kein Schritt.
  //
  // Sie steht hier oben und nicht nur im Erststart-Zweig, weil der gefährliche
  // Fall der andere ist (Reviewer-Pass 10.09.2026, R1): POST
  // /api/laeufe/<laufId>/abbrechen antwortet sofort, ohne auf das Laufende zu
  // warten — der abgebrochene Lauf fliegt noch. Setzt WS-2b daraufhin
  // status = 'GESTOPPT' und trifft danach das verspätete ERFOLGREICH des alten
  // Laufs ein, käme dieser Aufruf MIT Vorschrittergebnis an. Der Folgeschritt
  // wäre völlig startbereit, und der Automat setzte einen vom Menschen
  // gestoppten Workflow fort. Regel 3 fängt das nicht — sie prüft den Schritt,
  // nicht den Workflow.
  //
  // Auch diese Liste ist eine ALLOWLIST (siehe Regeln 4/5): ein künftiger
  // WORKFLOW_STATUS, den niemand hier einträgt, fällt in „hält an".
  if (!FORTSETZBARE_WORKFLOW_STATUS.includes(daten.status)) {
    // ABGESCHLOSSEN ohne Ergebnis ist das Normalende — der Automat schaut auf
    // einen fertigen Workflow. MIT Ergebnis ist es ein Klärfall: da meldet
    // etwas ein Laufende zu einem Workflow, der schon durch ist.
    if (daten.status === 'ABGESCHLOSSEN' && vorschrittErgebnis === undefined) {
      return { art: 'fertig', aktiverSchrittId: null }
    }
    // GESTOPPT bekommt seit WS-2c (b1) einen EIGENEN Ausgang statt eines
    // haltKlaerung (F-216, features/F15/feature.md, Vorbehalt zum
    // Regel-0-Ausgang). Der Unterschied ist nicht kosmetisch: die
    // Nachbereitung eines gerade noch laufenden Schritts schreibt den
    // Ausgang unbesehen zurück, und KLAERUNG_ERFORDERLICH ist wieder
    // fortsetzbar — ein vom Menschen gesetzter Stopp wäre nach wenigen
    // Sekunden weg. Mit der eigenen Zeile hier bildet workflowStatusZuAusgang
    // ihn auf 'GESTOPPT' ab, und der Schutz gilt in ALLEN Schreibpfaden
    // (Nachbereitung, Heilung, gescheiterte Fortsetzung) ohne einen einzigen
    // Sonderfallwächter in der I/O-Schale.
    //
    // Der Cursor bleibt, wie er ist: ein Stopp verschiebt ihn nicht, und der
    // Ausgang darf ihn deshalb auch nicht auf null zwingen.
    if (daten.status === 'GESTOPPT') {
      return { art: 'haltGestoppt', aktiverSchrittId: daten.aktiver_schritt_id }
    }
    return {
      art: 'haltKlaerung',
      grund: `Workflow ist ${daten.status} — daraus wird kein Schritt automatisch fortgesetzt`,
      aktiverSchrittId: null,
    }
  }

  let naechsteId: string
  if (vorschrittErgebnis === undefined) {
    // Erststart: der Cursor zeigt bereits auf den als Nächstes fälligen
    // Schritt (Cursor-Lesart aus WS-1). Ist er null — ein frisch gebauter
    // Workflow, der ihn noch nicht gesetzt hat —, ist es der erste Schritt
    // der Liste.
    const ersterSchritt = daten.schritte[0]
    if (ersterSchritt === undefined) {
      return { art: 'haltKlaerung', grund: "'schritte' ist leer — kein Schritt zu starten", aktiverSchrittId: null }
    }
    naechsteId = daten.aktiver_schritt_id ?? ersterSchritt.schritt_id
  } else {
    const vorschritt = schrittNachId.get(vorschrittErgebnis.schrittId)
    if (vorschritt === undefined) {
      return {
        art: 'haltKlaerung',
        grund: `Schrittergebnis nennt die unbekannte schritt_id '${vorschrittErgebnis.schrittId}'`,
        aktiverSchrittId: null,
      }
    }
    if (vorschrittErgebnis.ergebnis !== 'ERFOLGREICH') {
      return {
        art: 'haltKlaerung',
        grund: `Schritt '${vorschritt.schritt_id}' endete ${vorschrittErgebnis.ergebnis} (Lauf '${vorschrittErgebnis.laufId}')`,
        aktiverSchrittId: vorschritt.schritt_id,
      }
    }
    if (vorschritt.nachfolger === null) {
      return { art: 'fertig', aktiverSchrittId: null }
    }
    naechsteId = vorschritt.nachfolger
  }

  const naechsterSchritt = schrittNachId.get(naechsteId)
  if (naechsterSchritt === undefined) {
    return { art: 'haltKlaerung', grund: `es gibt keinen Schritt mit der schritt_id '${naechsteId}'`, aktiverSchrittId: null }
  }

  const gelaufen = zaehleGelaufeneSchritte(daten.schritte, vorschrittErgebnis)
  if (gelaufen >= daten.grenzen.max_schritte) {
    return {
      art: 'haltGrenze',
      grund: `grenzen.max_schritte (${daten.grenzen.max_schritte}) ist erreicht — ${gelaufen} Schritt(e) sind bereits gelaufen`,
      aktiverSchrittId: null,
    }
  }

  if (!STARTBEREITE_SCHRITT_STATUS.includes(naechsterSchritt.status) || naechsterSchritt.lauf_id !== null) {
    return {
      art: 'haltKlaerung',
      grund: `Schritt '${naechsterSchritt.schritt_id}' ist nicht startbereit (status ${naechsterSchritt.status}, lauf_id ${naechsterSchritt.lauf_id === null ? 'null' : `'${naechsterSchritt.lauf_id}'`}) — ein bereits gelaufener Schritt wird nie automatisch neu gestartet`,
      aktiverSchrittId: naechsterSchritt.schritt_id,
    }
  }

  // worker/freigabe absichtlich über die breiteren Typen string gelesen: die
  // laufzeitwirksame Wertemenge sind die Arrays WORKER/FREIGABE am Kopf dieser
  // Datei, nicht die Literal-Unions aus types.ts. Genau deshalb prüfen die
  // beiden Regeln unten gegen das ERLAUBTE (Allowlist) — ein Wert, den die
  // Arrays kennen und diese Funktion nicht, muss anhalten, nicht starten.
  const worker: string = naechsterSchritt.worker
  if (!WORKER.includes(worker)) {
    return {
      art: 'haltKlaerung',
      grund: `Worker '${worker}' ist nicht dispatchbar`,
      aktiverSchrittId: naechsterSchritt.schritt_id,
    }
  }

  // Regel 4b (F16 WS-3a, AK10), nach der Worker-Allowlist und vor der
  // Freigabe: dieselbe Begründung wie bei Regel 4 — ein Schritt, der so nicht
  // startbar ist, darf dem Menschen nicht als folgenlose Freigabefrage
  // vorgelegt werden.
  //
  // Geschrieben als `worker !== 'codex'` und nicht als
  // `worker === 'claude-code'` (Reviewer-Pass 11.09.2026, Befund 2): das ist
  // dieselbe Allowlist-Richtung wie Regel 4 darüber. 'codex' ist der einzige
  // Worker, der ein Ausgabeschema einlöst; ein künftiger dritter Worker mit
  // gesetztem output_schema fällt damit in "hält an" statt lautlos zu starten.
  // Der Vergleich steht trotz Regel 4 nicht überflüssig da — er ist die
  // Tiefenverteidigung, falls WORKER je um einen Wert wächst, den diese
  // Funktion nicht kennt.
  if (worker !== 'codex' && naechsterSchritt.output_schema !== null) {
    return {
      art: 'haltKlaerung',
      grund: `Schritt '${naechsterSchritt.schritt_id}' setzt output_schema '${naechsterSchritt.output_schema}', aber Worker '${worker}' kennt kein Ausgabeschema — nur 'codex' wird mit '--output-schema' gestartet`,
      aktiverSchrittId: naechsterSchritt.schritt_id,
    }
  }

  // Die erteilte Freigabe (WS-2c (b1), löst F-207/F-195): `freigabe` ist und
  // bleibt Plandatum — es ändert sich durch eine menschliche Entscheidung
  // nicht. Was sich ändert, ist `freigabe_erteilt` am Schritt, gesetzt
  // ausschließlich über POST /api/workflows/<id>/freigabe. Auch das ist eine
  // ALLOWLIST: nur exakt `true` startet; ein fehlendes Feld, false oder ein
  // Nicht-Boolean fallen in „hält an". Ohne diese Zeile hätte WARTET_FREIGABE
  // keinen Ausweg — der Zustand war bis hierher endgültig zugemauert.
  const freigabe: string = naechsterSchritt.freigabe
  if (!AUTOMATISCH_STARTENDE_FREIGABE.includes(freigabe) && naechsterSchritt.freigabe_erteilt !== true) {
    return { art: 'haltFreigabe', schrittId: naechsterSchritt.schritt_id, aktiverSchrittId: naechsterSchritt.schritt_id }
  }

  return { art: 'starte', schritt: naechsterSchritt, aktiverSchrittId: naechsterSchritt.schritt_id }
}
