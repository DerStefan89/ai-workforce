/**
 * Datei: src/router/index.ts
 *
 * Zweck: Router-Modul (F18 WS-2, Meilenstein 3, docs/projekt/
 * zielfassung.md §13.4). Zwei reine Verantwortlichkeiten, keine
 * Klassifikationslogik: validiereErgebnisRouter prüft ein geparstes Objekt
 * gegen schemas/ergebnis-router.schema.json (Muster validiereWorkflowDaten,
 * D5 — handgeschrieben statt ajv, dieselbe Repo-Entscheidung), und
 * waehleWorkflowVorlage bildet eine bereits validierte Klassifikation
 * (ErgebnisRouter) auf ein vollständiges WORKFLOW_V0-Gerüst ab — reiner
 * Lookup einer statischen Vorlage unter workflow-vorlagen/<kontrolltiefe>.json
 * plus Platzhalter-Befüllung, keine eigene Einstufung von Kontrolltiefe oder
 * Risiko. Die Klassifikation selbst entsteht ausschließlich über die Rolle
 * 'router' (src/rollen/index.ts) als echten Werkzeuglauf — dieses Modul
 * bekommt ihr Ergebnis bereits fertig.
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
 * Wird aufgerufen von: scripts/route-auftrag.mjs, src/router/router.test.ts.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ErgebnisRouter, Kontrolltiefe, Risikoklasse, TaskTyp } from './types.ts'
import type { WorkflowV0Daten } from '../workflow/types.ts'

const KONTROLLTIEFE = ['fast-lane', 'standard', 'hoch']
const RISIKOKLASSE = ['niedrig', 'mittel', 'hoch']
const TASK_TYPEN = ['text-aenderung', 'neues-feature', 'bugfix', 'refactoring', 'dokumentation', 'unklar']

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
 * Bildet eine bereits validierte Router-Klassifikation auf ein vollständiges
 * WORKFLOW_V0-Gerüst ab (F18 WS-2). Lädt workflow-vorlagen/<kontrolltiefe>.json
 * und füllt workflow_id/auftrag_id/ziel — KEINE eigene Klassifikationslogik,
 * reiner Lookup + Befüllung. Wirft, wenn die Vorlagendatei fehlt oder kein
 * gültiges JSON trägt (Konfigurationsfehler, kein Laufzeitfall).
 * @param klassifikation - bereits gegen validiereErgebnisRouter geprüftes Ergebnis der Rolle 'router'
 * @param auftragId - auftrag_id des gerouteten Auftrags
 * @param ziel - Zieltext des gerouteten Auftrags
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel (Default: process.cwd(), Muster scripts/leitstand-server.mjs' repoWurzel-Parameter)
 * @returns vollständiger, noch nicht validierter WORKFLOW_V0-Datensatz (status 'OFFEN', siehe Kopfkommentar)
 */
export function waehleWorkflowVorlage(klassifikation: ErgebnisRouter, auftragId: string, ziel: string, repoWurzel: string = process.cwd()): WorkflowV0Daten {
  const vorlagenPfad = join(repoWurzel, 'workflow-vorlagen', `${klassifikation.kontrolltiefe}.json`)
  const vorlage = JSON.parse(readFileSync(vorlagenPfad, 'utf8')) as WorkflowV0Daten
  const workflowId = leiteWorkflowIdAb(auftragId)

  return {
    ...vorlage,
    workflow_id: ersetzePlatzhalter(vorlage.workflow_id, workflowId, auftragId, ziel),
    auftrag_id: ersetzePlatzhalter(vorlage.auftrag_id, workflowId, auftragId, ziel),
    ziel: ersetzePlatzhalter(vorlage.ziel, workflowId, auftragId, ziel),
    schritte: vorlage.schritte.map((schritt) => ({
      ...schritt,
      eingaben: schritt.eingaben.map((eingabe) => ersetzePlatzhalter(eingabe, workflowId, auftragId, ziel)),
    })),
  }
}

export type { ErgebnisRouter, Kontrolltiefe, Risikoklasse, TaskTyp }
