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
 * Nicht in WS-1: der Schritt-Automat und die Dispatch-Integration in
 * scripts/leitstand-server.mjs (WS-2) sowie die Leitstand-Ansicht (WS-3).
 * Dieses Modul registriert deshalb noch KEIN Artefakt — anders als
 * src/auftrag/index.ts gibt es hier bewusst noch kein registriereWorkflow.
 *
 * Wird aufgerufen von:
 * - scripts/check-f15-workflow.mjs
 *
 * Wichtig: Vier Regeln lassen sich in JSON Schema nicht ausdrücken und leben
 * nur hier — Eindeutigkeit der schritt_id, die Querverweise nachfolger und
 * aktiver_schritt_id INNERHALB derselben schritte-Liste sowie die
 * Zyklenfreiheit der nachfolger-Kette. Wer das Schema ändert, muss diese
 * Funktion mitändern; das Gate hält beide über dieselben Fixtures aneinander.
 *
 * aktiver_schritt_id ist ein CURSOR ([EMPFEHLUNG] Technical Challenger,
 * 09.09.2026, F15 WS-1 — reversibel, solange keine realen
 * WORKFLOW_V0-Artefakte existieren; zu verwerfen, wenn WS-2 zeigt, dass der
 * Wiederaufnahmepunkt ohnehin aus der Schrittliste abgeleitet werden muss):
 * der Schritt, auf dem der Automat steht — der laufende, sonst der als
 * Nächstes fällige; null nur bei ABGESCHLOSSEN oder GESTOPPT. Die Lesart
 * „läuft gerade" wäre redundant zum Schritt mit status LAEUFT und gesetzter
 * lauf_id — zwei Wahrheitsquellen für dieselbe Tatsache (§16.2).
 */

/** Erlaubte Werte von status auf Workflow-Ebene. */
const WORKFLOW_STATUS = ['OFFEN', 'WARTET_FREIGABE', 'LAEUFT', 'ABGESCHLOSSEN', 'KLAERUNG_ERFORDERLICH', 'GESTOPPT']

/** Erlaubte Werte von status auf Schritt-Ebene — die drei terminalen Ausgänge nach ARCHITECTURE.md §4 plus OFFEN/WARTET_FREIGABE/LAEUFT/UEBERSPRUNGEN. */
const SCHRITT_STATUS = ['OFFEN', 'WARTET_FREIGABE', 'LAEUFT', 'ERFOLGREICH', 'VERWEIGERT', 'FEHLGESCHLAGEN', 'UEBERSPRUNGEN']

/** Erlaubte Werte von worker — die beiden in Meilenstein 3 vorgesehenen Ausführungswerkzeuge. */
const WORKER = ['claude-code', 'codex']

/** Erlaubte Werte von freigabe — Freigabebedarf eines Schritts. */
const FREIGABE = ['AUTOMATISCH', 'EMPFOHLEN', 'ZWINGEND']

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
