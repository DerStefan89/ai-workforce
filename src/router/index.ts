/**
 * Datei: src/router/index.ts
 *
 * Zweck: Router-Modul (F18 WS-2, F22 WS-1, Meilenstein 3, docs/projekt/
 * zielfassung.md §13.4). Drei reine Verantwortlichkeiten, keine
 * Klassifikationslogik: validiereErgebnisRouter prüft ein geparstes Objekt
 * gegen schemas/ergebnis-router.schema.json (Muster validiereWorkflowDaten,
 * D5 — handgeschrieben statt ajv, dieselbe Repo-Entscheidung),
 * waehleWorkflowVorlage bildet eine bereits validierte Klassifikation
 * (ErgebnisRouter) auf ein vollständiges WORKFLOW_V0-Gerüst ab — reiner
 * Lookup einer statischen Vorlage unter workflow-vorlagen/<kontrolltiefe>.json
 * plus Platzhalter-Befüllung, keine eigene Einstufung von Kontrolltiefe oder
 * Risiko —, und validiereRouterErgebnisDaten (F22 WS-1) prüft ein geparstes
 * Objekt gegen schemas/kontrollzustand-router-ergebnis-payload.schema.json,
 * das Hüllenformat des Router-Ergebnis-Kernartefakts (worker, klassifikation,
 * vorlage, beobachtung) — NICHT die Form von 'klassifikation' selbst, die
 * bleibt Sache von validiereErgebnisRouter (D5, keine zweite Formkopie). Die
 * Klassifikation selbst entsteht ausschließlich über die Rolle 'router'
 * (src/rollen/index.ts) als echten Werkzeuglauf — dieses Modul bekommt ihr
 * Ergebnis bereits fertig.
 *
 * ENTSCHIEDEN (Kopfkommentar-Pflicht aus dem Bauauftrag): das erzeugte
 * WORKFLOW_V0 trägt status 'OFFEN', NICHT 'WARTET_FREIGABE'. Zwei
 * unabhängige Belege dafür, real gegen scripts/leitstand-server.mjs
 * geprüft, nicht angenommen:
 *
 * 1. POST /api/workflows lehnt einen eingereichten Datensatz mit
 *    status 'WARTET_FREIGABE' strukturell mit 400 ab
 *    (GESPERRTE_ERSETZUNGS_STATUS umfasst 'WARTET_FREIGABE') — dieser
 *    Status ist beim ANLEGEN eines Workflows gar nicht einreichbar, er
 *    entsteht ausschließlich als ABGELEITETER Ausgang des Schritt-Automaten
 *    (ermittleNaechstenSchritt -> workflowStatusZuAusgang, wenn ein
 *    Startversuch auf einen ZWINGEND-Schritt trifft). Ein frisch erzeugter,
 *    noch nie gestarteter Workflow kann diesen Status also strukturell nicht
 *    tragen.
 * 2. Der Zielsatz "Stefan gibt den Workflow frei, bevor er läuft"
 *    (docs/projekt/zielfassung.md §13.4) ist damit nicht verletzt: POST
 *    /api/workflows registriert nur ("Startet NICHTS und führt NICHTS aus",
 *    Kopfkommentar des Endpunkts) — ein Lauf entsteht ausschließlich über
 *    den separaten POST /api/workflows/<id>/starten-Aufruf, den ein Mensch
 *    auslöst. Zusätzlich trägt jeder schreibende Schritt in jeder der drei
 *    Vorlagen freigabe 'ZWINGEND' (CLAUDE.md: "schreibende Schritte sind in
 *    diesem Repo durchgängig ZWINGEND") — die Freigabe vor der Ausführung
 *    ist damit zweifach abgesichert: kein Autostart bei der Registrierung,
 *    und ein expliziter Freigabe-Halt vor jedem schreibenden Schritt.
 *
 * Wird aufgerufen von: scripts/route-auftrag.mjs, scripts/leitstand-server.mjs
 * (F22 WS-1), scripts/check-f22-click-to-work.mjs, src/router/router.test.ts.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ErgebnisRouter, Kontrolltiefe, Risikoklasse, TaskTyp } from './types.ts'
import type { WorkflowV0Daten } from '../workflow/types.ts'

const KONTROLLTIEFE = ['fast-lane', 'standard', 'hoch']
const RISIKOKLASSE = ['niedrig', 'mittel', 'hoch']
const TASK_TYPEN = ['text-aenderung', 'neues-feature', 'bugfix', 'refactoring', 'dokumentation', 'unklar']

/** Rang je Kontrolltiefe, für den Untergrenzen-Vergleich unten — Zwilling der KONTROLLTIEFE-Reihenfolge oben. */
const KONTROLLTIEFE_RANG: Record<string, number> = { 'fast-lane': 0, standard: 1, hoch: 2 }

/** Herkunftsarten, die eine deterministische Kontrolltiefe-Untergrenze auslösen — Zwilling der Enum-Werte in schemas/kontrollzustand-auftrag-payload.schema.json' herkunft.art (F39 WS-2a, löst state/findings.md F-633 Teil a). */
const KONTROLLTIEFE_UNTERGRENZE_HERKUNFT: Record<string, Kontrolltiefe> = { projekt_interview: 'hoch' }

/**
 * Zusatz-Satz, der ans Workflow-Ziel angehängt wird, wenn die Untergrenze
 * gegriffen hat (F39 WS-2a, Auftrags-Vorgabe: „die Anhebung sichtbar
 * machen") — GENAU dieser Wortlaut, damit ein Mensch oder ein späterer
 * Gate-Test ihn wörtlich wiederfinden kann.
 */
function baueUntergrenzeHinweis(herkunftArt: string, kontrolltiefe: Kontrolltiefe): string {
  return ` [Untergrenze ${kontrolltiefe} wegen herkunft ${herkunftArt}]`
}

const ERGEBNIS_ROUTER_FELDER = new Set(['kontrolltiefe', 'risikoklasse', 'task_typen', 'rueckfragen', 'begruendung'])

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.length > 0
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/ergebnis-router.schema.json. Keine Seiteneffekte, kein Datei-I/O —
 * Muster validiereWorkflowDaten (src/workflow/index.ts, D5).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereErgebnisRouter(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []

  for (const feld of Object.keys(daten)) {
    if (!ERGEBNIS_ROUTER_FELDER.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ERGEBNIS_ROUTER_FELDER) {
    if (!(feld in daten)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('kontrolltiefe' in daten && (typeof daten.kontrolltiefe !== 'string' || !KONTROLLTIEFE.includes(daten.kontrolltiefe))) {
    verstoesse.push(`'kontrolltiefe' muss einer von ${KONTROLLTIEFE.join(', ')} sein`)
  }
  if ('risikoklasse' in daten && (typeof daten.risikoklasse !== 'string' || !RISIKOKLASSE.includes(daten.risikoklasse))) {
    verstoesse.push(`'risikoklasse' muss einer von ${RISIKOKLASSE.join(', ')} sein`)
  }

  if ('task_typen' in daten) {
    if (!Array.isArray(daten.task_typen) || daten.task_typen.length === 0) {
      verstoesse.push("'task_typen' muss ein Array mit mindestens einem Eintrag sein")
    } else {
      daten.task_typen.forEach((eintrag, i) => {
        if (typeof eintrag !== 'string' || !TASK_TYPEN.includes(eintrag)) {
          verstoesse.push(`'task_typen[${i}]' muss einer von ${TASK_TYPEN.join(', ')} sein`)
        }
      })
    }
  }

  if ('rueckfragen' in daten) {
    if (!Array.isArray(daten.rueckfragen)) {
      verstoesse.push("'rueckfragen' muss ein Array sein")
    } else {
      daten.rueckfragen.forEach((eintrag, i) => {
        if (!istNichtLeererString(eintrag)) verstoesse.push(`'rueckfragen[${i}]' muss ein nicht-leerer String sein`)
      })
    }
  }

  if ('begruendung' in daten && !istNichtLeererString(daten.begruendung)) {
    verstoesse.push("'begruendung' muss ein nicht-leerer String sein")
  }

  return verstoesse
}

const ROUTER_ERGEBNIS_FELDER = new Set(['router_ergebnis_schema', 'auftrag_id', 'lauf_id', 'worker', 'klassifikation', 'vorlage', 'beobachtung', 'erstellt_am'])
const ROUTER_ERGEBNIS_WORKER = ['claude-code', 'codex']
const ROUTER_ERGEBNIS_BEOBACHTUNG = [null, 'fence_entfernt']

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/kontrollzustand-router-ergebnis-payload.schema.json (F22 WS-1).
 * Muster validiereErgebnisRouter (D5 — handgeschrieben statt ajv). 'klassifikation'
 * wird NICHT gegen die Form von schemas/ergebnis-router.schema.json geprüft — das ist
 * Sache von validiereErgebnisRouter selbst, bereits VOR der Registrierung des
 * Router-Ergebnis-Artefakts durchlaufen; eine zweite Formprüfung hier wäre eine
 * unabhängig verfallende Kopie (D5). Diese Funktion verlangt nur, dass 'klassifikation'
 * ein Objekt ist.
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereRouterErgebnisDaten(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []

  for (const feld of Object.keys(daten)) {
    if (!ROUTER_ERGEBNIS_FELDER.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ROUTER_ERGEBNIS_FELDER) {
    if (!(feld in daten)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('router_ergebnis_schema' in daten && daten.router_ergebnis_schema !== 'v0') {
    verstoesse.push("'router_ergebnis_schema' muss 'v0' sein")
  }
  if ('auftrag_id' in daten && !istNichtLeererString(daten.auftrag_id)) {
    verstoesse.push("'auftrag_id' muss ein nicht-leerer String sein")
  }
  if ('lauf_id' in daten && !istNichtLeererString(daten.lauf_id)) {
    verstoesse.push("'lauf_id' muss ein nicht-leerer String sein")
  }
  if ('worker' in daten && (typeof daten.worker !== 'string' || !ROUTER_ERGEBNIS_WORKER.includes(daten.worker))) {
    verstoesse.push(`'worker' muss einer von ${ROUTER_ERGEBNIS_WORKER.join(', ')} sein`)
  }
  if ('klassifikation' in daten && !istObjekt(daten.klassifikation)) {
    verstoesse.push("'klassifikation' muss ein Objekt sein")
  }
  if ('vorlage' in daten && (typeof daten.vorlage !== 'string' || !KONTROLLTIEFE.includes(daten.vorlage))) {
    verstoesse.push(`'vorlage' muss einer von ${KONTROLLTIEFE.join(', ')} sein`)
  }
  if ('beobachtung' in daten && !ROUTER_ERGEBNIS_BEOBACHTUNG.includes(daten.beobachtung as string | null)) {
    verstoesse.push("'beobachtung' muss null oder 'fence_entfernt' sein")
  }
  if ('erstellt_am' in daten && !istNichtLeererString(daten.erstellt_am)) {
    verstoesse.push("'erstellt_am' muss ein nicht-leerer String sein")
  }

  return verstoesse
}

/**
 * Ersetzt die drei Platzhalter einer Vorlage NACH dem JSON.parse (nicht auf
 * dem Rohtext davor) — auftragId und ziel können Zeichen tragen, die im
 * Rohtext die JSON-Form brechen würden (Anführungszeichen, Backslashes);
 * nach dem Parsen sind es nur noch gewöhnliche JS-Strings.
 */
function ersetzePlatzhalter(wert: string, workflowId: string, auftragId: string, ziel: string): string {
  return wert.replaceAll('__WORKFLOW_ID__', workflowId).replaceAll('__AUFTRAG_ID__', auftragId).replaceAll('__ZIEL__', ziel)
}

/**
 * Leitet die workflow_id aus der auftragId ab. Kollisionsfrei, weil
 * auftragId serverseitig per randomUUID() vergeben wird (POST /api/auftraege,
 * F12 WS-2 AK4) — ein fester Präfix kann deshalb nicht mit einer
 * workflow_id eines anderen Auftrags zusammenfallen. Bewusst DETERMINISTISCH
 * (nicht selbst randomUUID()): ein zweiter Routing-Versuch für denselben
 * Auftrag trifft dieselbe workflow_id und legt eine neue VERSION an
 * (ARCHITECTURE.md §2, "versioniert, nicht überschrieben"), statt einen
 * unabhängigen zweiten Workflow für denselben Auftrag zu erzeugen.
 */
function leiteWorkflowIdAb(auftragId: string): string {
  return `router-${auftragId}`
}

/**
 * Reine Funktion: hebt eine vorgeschlagene Kontrolltiefe auf eine
 * deterministische Untergrenze an, wenn die Herkunft-Art des Auftrags das
 * verlangt — NUR anheben, nie senken (F39 WS-2a, löst state/findings.md
 * F-633 Teil a). `herkunftArt` ohne bekannte Untergrenze (undefined, null,
 * 'sparring', 'jarvis', 'manuell', ein unbekannter Wert) lässt
 * `kontrolltiefe` unverändert — jeder Auftrag ohne strukturiertes
 * Herkunftsfeld verhält sich bitgenau wie vor diesem Nachtrag.
 * @param kontrolltiefe - die vom Router vorgeschlagene Kontrolltiefe
 * @param herkunftArt - `AuftragV0Daten.herkunft.art`, oder undefined/null ohne Herkunftsfeld
 * @returns die tatsächlich zu verwendende Kontrolltiefe plus ob eine Anhebung stattfand
 */
export function bestimmeEffektiveKontrolltiefe(kontrolltiefe: Kontrolltiefe, herkunftArt?: string | null): { kontrolltiefe: Kontrolltiefe; angehoben: boolean } {
  if (herkunftArt === undefined || herkunftArt === null) return { kontrolltiefe, angehoben: false }
  const untergrenze = KONTROLLTIEFE_UNTERGRENZE_HERKUNFT[herkunftArt]
  if (untergrenze === undefined || KONTROLLTIEFE_RANG[untergrenze] <= KONTROLLTIEFE_RANG[kontrolltiefe]) {
    return { kontrolltiefe, angehoben: false }
  }
  return { kontrolltiefe: untergrenze, angehoben: true }
}

/**
 * Bildet eine bereits validierte Router-Klassifikation auf ein vollständiges
 * WORKFLOW_V0-Gerüst ab (F18 WS-2). Lädt workflow-vorlagen/<kontrolltiefe>.json
 * und füllt workflow_id/auftrag_id/ziel — KEINE eigene Klassifikationslogik,
 * reiner Lookup + Befüllung. Wirft, wenn die Vorlagendatei fehlt oder kein
 * gültiges JSON trägt (Konfigurationsfehler, kein Laufzeitfall).
 *
 * F39 WS-2a: `herkunftArt` (Default undefined) hebt die vom Router
 * vorgeschlagene Kontrolltiefe deterministisch an (bestimmeEffektiveKontrolltiefe,
 * nur anheben, nie senken) — ein Aufrufer ohne dieses Argument (jeder
 * bestehende Aufrufer außer dem einen in scripts/leitstand-server.mjs,
 * s. dort) verhält sich bitgenau wie vor diesem Nachtrag. Eine tatsächliche
 * Anhebung hängt einen sichtbaren Hinweis an 'ziel' an (Auftrags-Vorgabe:
 * „die Anhebung sichtbar machen"), VOR der Platzhalter-Ersetzung — der
 * Hinweis erscheint dadurch überall dort, wo `__ZIEL__` in der Vorlage
 * vorkommt (aktuell nur im 'ziel'-Feld selbst, keiner der drei Vorlagen
 * nutzt __ZIEL__ in `schritte[].eingaben`).
 * @param klassifikation - bereits gegen validiereErgebnisRouter geprüftes Ergebnis der Rolle 'router'
 * @param auftragId - auftrag_id des gerouteten Auftrags
 * @param ziel - Zieltext des gerouteten Auftrags
 * @param installWurzel - absoluter Pfad der Installationswurzel (E-F41-2, löst state/findings.md
 *   F-676: workflow-vorlagen/ ist ein Workforce-EIGENES Asset, NIE die Projekt-repoWurzel —
 *   Default process.cwd(), Muster scripts/leitstand-server.mjs' installWurzel-Parameter)
 * @param herkunftArt - `AuftragV0Daten.herkunft.art` des gerouteten Auftrags, oder undefined/null (Default) ohne Herkunftsfeld
 * @returns vollständiger, noch nicht validierter WORKFLOW_V0-Datensatz (status 'OFFEN', siehe Kopfkommentar)
 */
export function waehleWorkflowVorlage(
  klassifikation: ErgebnisRouter,
  auftragId: string,
  ziel: string,
  installWurzel: string = process.cwd(),
  herkunftArt?: string | null
): WorkflowV0Daten {
  const effektiv = bestimmeEffektiveKontrolltiefe(klassifikation.kontrolltiefe, herkunftArt)
  const vorlagenPfad = join(installWurzel, 'workflow-vorlagen', `${effektiv.kontrolltiefe}.json`)
  const vorlage = JSON.parse(readFileSync(vorlagenPfad, 'utf8')) as WorkflowV0Daten
  const workflowId = leiteWorkflowIdAb(auftragId)
  // Nur bei tatsächlicher Anhebung ist herkunftArt hier auch tatsächlich ein nicht-leerer String
  // (bestimmeEffektiveKontrolltiefe liefert angehoben:true nur dann) — der Zusatz trägt trotzdem
  // eine explizite Prüfung, keine Annahme über den Aufrufer.
  const zielMitHinweis = effektiv.angehoben && typeof herkunftArt === 'string' ? `${ziel}${baueUntergrenzeHinweis(herkunftArt, effektiv.kontrolltiefe)}` : ziel

  return {
    ...vorlage,
    workflow_id: ersetzePlatzhalter(vorlage.workflow_id, workflowId, auftragId, zielMitHinweis),
    auftrag_id: ersetzePlatzhalter(vorlage.auftrag_id, workflowId, auftragId, zielMitHinweis),
    ziel: ersetzePlatzhalter(vorlage.ziel, workflowId, auftragId, zielMitHinweis),
    schritte: vorlage.schritte.map((schritt) => ({
      ...schritt,
      eingaben: schritt.eingaben.map((eingabe) => ersetzePlatzhalter(eingabe, workflowId, auftragId, zielMitHinweis)),
    })),
  }
}

/**
 * Auslöser, bei denen der Router 'hoch' wählen soll (F39 WS-2a, Auftrags-Vorgabe Punkt 2) —
 * ergänzt die Rolleninstruktion des Routers um eine konkrete, prüfbare Liste statt reinem
 * Modell-Ermessen. Unabhängig von der deterministischen Untergrenze oben (die greift
 * NACHTRÄGLICH, code-seitig, nur für herkunft 'projekt_interview') — diese Liste soll das
 * Router-URTEIL selbst für JEDEN Auftrag verbessern, unabhängig von seiner Herkunft.
 */
const ROUTER_HOCH_AUSLOESER = [
  'eine dokumentierte Architekturentscheidung wird geändert',
  'eine neue State-/Persistenzsemantik entsteht',
  'eine Authorization-/Security-Grenze ist betroffen',
  'ein neues externes System mit Rechten wird angebunden',
  'mehrere Kernmodule sind strukturell betroffen',
  'ein neues zentrales Datenmodell entsteht',
  'ein neues blockierendes Gate entsteht',
  'eine Schema-/Migrationsänderung ist nötig',
]

/**
 * Baut die Rolleninstruktion für einen Router-Lauf — Muster baueCoachAuftragstext/
 * baueArchitektAuftragstext (F34/F39 WS-1): der EINZIGE Eingabekanal (F-269-Muster), JSON-only-
 * Vertrag (F-337-Lehre), gefolgt vom Auftragstext. Ergänzt gegenüber dem bisherigen, direkt
 * übergebenen Auftragstext (F18) die Auslöserliste für 'hoch' (ROUTER_HOCH_AUSLOESER) — vorher
 * bekam der Router NUR schemas/ergebnis-router.schema.json (über --output-schema bzw. dessen
 * Beschreibung) und den rohen Auftragstext, keine konkreten Kriterien für die höchste
 * Kontrolltiefe.
 *
 * E-F41-2 (löst state/findings.md F-676): die Form wird seit hier INLINE genannt (Muster
 * baueArchitektAuftragstext/baueFeatureRolleninstruktion, baueJarvisAuftragstext), statt nur
 * "gemäß schemas/ergebnis-router.schema.json" zu sagen. Real beobachtet im F41-WS-3-Reallauf
 * (Auftrag 1c82e21f...): ein 'claude-code'-Lauf gegen ein NEUES Projekt (kein --output-schema-
 * Mechanismus für diesen Worker, F-337) hatte keinen Zugriff auf schemas/ (Workforce-eigenes
 * Asset, existiert nur in der Installationswurzel, nicht im Projekt-Repo) — das Modell erriet
 * die Feldnamen und lieferte 'aufgabentypen' statt 'task_typen'. Ein Codex-Lauf (--output-schema)
 * erzwingt die Form ohnehin serverseitig (loeseAusgabeSchemaAuf löst seit E-F41-2 gegen die
 * Installationswurzel auf, nicht mehr gegen die Projekt-repoWurzel) — die Inline-Form hier ist
 * die zusätzliche, vom Dateisystem UNABHÄNGIGE Absicherung für den claude-code-Rückfall.
 * @param auftragstext - der rohe Auftragstext des zu klassifizierenden Auftrags
 * @returns der vollständige Auftragstext, der als AusfuehrungsEingaben.auftragstext den einzigen Eingabekanal für den Router-Lauf bildet
 */
export function baueRouterAuftragstext(auftragstext: string): string {
  const zeilen = [
    "Du bist als Rolle 'router' verantwortlich, einen Auftrag VOR dem Bau zu klassifizieren: Kontrolltiefe (fast-lane/standard/hoch), Risikoklasse, Aufgabentyp(en), offene Rückfragen und eine Begründung — ohne selbst Code zu lesen.",
    "Wähle 'hoch', wenn mindestens EINER der folgenden Auslöser zutrifft:",
    ...ROUTER_HOCH_AUSLOESER.map((satz) => `- ${satz}`),
    "Trifft keiner der Auslöser zu, wähle 'standard' oder 'fast-lane' nach deinem sonstigen Urteil.",
    'Deine GESAMTE Antwort besteht aus GENAU EINEM JSON-Objekt und sonst NICHTS: kein einleitender Satz, keine Erklärung davor oder danach, kein Markdown, kein Codezaun (```). Die allererste Zeile deiner Antwort ist "{", die letzte Zeile ist "}".',
    'Das JSON-Objekt hat GENAU diese Form:',
    '{',
    `  "kontrolltiefe": ${KONTROLLTIEFE.map((w) => `"${w}"`).join(' | ')},`,
    `  "risikoklasse": ${RISIKOKLASSE.map((w) => `"${w}"`).join(' | ')},`,
    `  "task_typen": [ ${TASK_TYPEN.map((w) => `"${w}"`).join(' | ')}, ... ] (mindestens ein Eintrag, mehrere möglich),`,
    '  "rueckfragen": ["<offene Rückfrage an den Menschen>", ...] (leeres Array, wenn keine Rückfrage nötig),',
    '  "begruendung": "<Begründung für Kontrolltiefe, Risikoklasse und Task-Typen, als string>"',
    '}',
    "Kein weiteres Feld außer den genannten fünf. 'task_typen' NUR Werte aus der genannten Liste, kein eigener Wortlaut.",
    '',
    'Auftrag:',
    auftragstext,
  ]
  return zeilen.join('\n')
}

export type { ErgebnisRouter, Kontrolltiefe, Risikoklasse, TaskTyp }
