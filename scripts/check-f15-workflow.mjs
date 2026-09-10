/**
 * Datei: scripts/check-f15-workflow.mjs
 *
 * Zweck: Workflow-Gate (F15 WS-1, Meilenstein 3, docs/projekt/
 * zielfassung.md §13.4 E-M3-1). Prüft die Payload-Fixtures unter
 * schemas/examples/kontrollzustand-workflow*.json gegen
 * validiereWorkflowDaten (direkt aus src/workflow/index.ts importiert,
 * D5-Muster) — je Datei gegen die erwartete Gültigkeit.
 *
 * Aufbau gespiegelt von scripts/check-f11-auftrag.mjs, Abschnitt (a).
 *
 * F15 WS-2a ergänzt zwei Abschnitte: (b) je ein kalibrierter Fall für die
 * Ausgänge von ermittleNaechstenSchritt — der ZWINGEND-Halt und der
 * Codex-Halt sind die beiden, die eine Grenze tragen, die übrigen stehen
 * als Grünfall daneben, damit „hält an" nicht durch „hält immer an"
 * erfüllbar ist; (c) die drei Workflow-Endpunkte real gegen einen
 * laufenden Testserver (Muster check-f12-leitstand-ansicht.mjs), mit dem
 * Rotfall für die workflow_id-Zeichenregel. Der Schritt-Automat selbst
 * (WS-2b) und die Leitstand-Ansicht (WS-3) bringen ihre eigenen Prüfungen
 * mit.
 *
 * F15 WS-2b ergänzt zwei Abschnitte: (d) POST /api/workflows/<id>/starten real
 * gegen einen Testserver mit vier Rotfällen (404 unbekannter Workflow, 409 bei
 * aktivem Lauf/D13, 409 bei nicht startbarem Workflow, 400 bei fehlendem
 * Eingabe-Artefakt) und einem Grünfall, der zusätzlich die Abbildung (A)/(B)
 * festnagelt — rolle/modell/zeitgrenzeMs/auftragId/budget und die als
 * notwendig:true vorangestellte, aufgelöste Artefakt-Anfrage. Jeder Rotfall
 * prüft zusätzlich, dass NICHTS gestartet und keine neue Workflow-Version
 * geschrieben wurde: ein Statuscode allein belegt die Zusage nicht.
 * (e) Die Auflage aus dem Bauauftrag — genau EIN Aufrufpunkt des Werkzeuglaufs
 * in scripts/leitstand-server.mjs — als Zählung im Quelltext. WS-2b hätte sie
 * leicht gebrochen; ein zweiter Aufrufpunkt wäre eine zweite Fassung der
 * D13-Rückgabe und der Startfehlerliste.
 *
 * F15 WS-2c ergänzt (a) den Grünfall der automatischen Fortsetzung — EIN
 * POST .../starten führt einen zweistufigen Workflow zu Ende, ohne dass
 * irgendwo ein zweiter Aufruf steht (AK6b); der frühere Fall, der genau das
 * Gegenteil zusagte („der Cursor darf NICHTS starten"), ist damit ersetzt
 * und nicht bloß ergänzt. (b) Den Verhaltensbeleg, dass D13 nach der
 * Übergabe wieder belegt ist. (c) Die Quelltext-Invariante der Übergabe
 * selbst (D13-UEBERGABE-OHNE-FENSTER, mit Selbsttest). (d) Die Zusage, dass
 * ein Halt seinen Grund im Workflow-Artefakt hinterlässt (F-202).
 *
 * Wichtig: Jede der fünf Regeln, die nur validiereWorkflowDaten kennt und
 * JSON Schema nicht ausdrücken kann, hat hier einen eigenen Rotfall —
 * unbekannter nachfolger, doppelte schritt_id, unbekannte
 * aktiver_schritt_id, Zyklus in der nachfolger-Kette und (F15 WS-2b) die
 * Zusammenführung zweier Schritte auf denselben nachfolger (ARCHITECTURE.md §8:
 * eine behauptete Grenze ohne kalibrierten Rot- und Grün-Fall heißt nicht
 * ERZWUNGEN). Wer eine Regel entfernt, ohne den Rotfall anzufassen, lässt
 * hier ein grünes Gate über einer stillen Lücke stehen.
 *
 * Bekannte Grenze der Abdeckung: die Fixtures unten kalibrieren die sieben
 * Regeln mit dem höchsten Vorbildwert je einzeln rot. Die übrige Formprüfung
 * (Enums, Zahlgrenzen, leere Strings, fehlende Pflichtfelder, Nicht-Objekt-/
 * Nicht-Array-Wurzeln) trägt src/workflow/workflow.test.ts tabellengetrieben
 * — dort ist ein Rotfall eine Zeile statt einer Datei. Wer eine Regel
 * ergänzt, ergänzt ihren Rotfall dort, nicht als weitere JSON-Datei.
 *
 * Wird aufgerufen von: `npm run check`
 * (NICHT `npm run check:template` — das Skript importiert src/workflow/,
 * ist also stackgebunden; dieselbe Einordnung wie check-f14-abbruch.mjs.)
 *
 * Aufruf: node scripts/check-f15-workflow.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { ermittleNaechstenSchritt, registriereWorkflow, validiereWorkflowDaten } from '../src/workflow/index.ts'
import { erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { ladeArtefaktVersion } from '../src/lineage-registry/index.ts'
import { schreibeWirkungsmarke } from '../src/checkpoint-store/index.ts'

const befunde = []

console.log('\n=== F15-Workflow-Check (WS-1 + WS-2a + WS-2b) ===\n')

// ─── Payload-Fixtures gegen validiereWorkflowDaten ──────────────────────────
const fixtures = [
  { pfad: 'schemas/examples/kontrollzustand-workflow.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-falscher-schema-wert.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-unbekannter-nachfolger.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-doppelte-schritt-id.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-unbekannter-aktiver-schritt.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-leere-schritte.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-unbekanntes-feld.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-zyklus.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-workflow.invalid-zusammenfuehrung.json', sollGueltigSein: false },
]

for (const { pfad, sollGueltigSein } of fixtures) {
  if (!existsSync(pfad)) {
    befunde.push(`${pfad}: Datei fehlt`)
    continue
  }
  let obj
  try {
    obj = JSON.parse(readFileSync(pfad, 'utf-8'))
  } catch (fehler) {
    befunde.push(`${pfad}: kein gültiges JSON (${fehler.message})`)
    continue
  }
  const verstoesse = validiereWorkflowDaten(obj)
  if (sollGueltigSein && verstoesse.length > 0) {
    befunde.push(`${pfad}: sollte gültig sein, aber verletzt: ${verstoesse.join('; ')}`)
  }
  if (!sollGueltigSein && verstoesse.length === 0) {
    befunde.push(`${pfad}: sollte ungültig sein, aber keine Regelverletzung gefunden`)
  }
}
if (befunde.length === 0) {
  console.log(`✓ ${fixtures.length} Payload-Fixture(s) gegen validiereWorkflowDaten geprüft.`)
}

// ─── Das Schema selbst muss gültiges JSON sein (Muster check-datenformate.mjs) ──
const SCHEMA_PFAD = 'schemas/kontrollzustand-workflow-payload.schema.json'
if (!existsSync(SCHEMA_PFAD)) {
  befunde.push(`${SCHEMA_PFAD}: Datei fehlt`)
} else {
  try {
    JSON.parse(readFileSync(SCHEMA_PFAD, 'utf-8'))
    console.log(`✓ ${SCHEMA_PFAD} ist gültiges JSON.`)
  } catch (fehler) {
    befunde.push(`${SCHEMA_PFAD}: kein gültiges JSON (${fehler.message})`)
  }
}


// ─── ermittleNaechstenSchritt: je Ausgang ein kalibrierter Fall (WS-2a) ─────
//
// Diese Fälle stehen bewusst NICHT nur in src/workflow/workflow.test.ts:
// sie sind die Regeln, an denen der Schritt-Automat (WS-2b) entweder anhält
// oder eben nicht. Wer den Codex-Halt oder den ZWINGEND-Halt entfernt,
// entfernt eine Grenze — und eine Grenze ohne Rotfall im Gate heißt nach
// ARCHITECTURE.md §8 nicht ERZWUNGEN. Der Grünfall daneben ist der Beleg,
// dass die Prüfung nicht einfach alles anhält.

/**
 * Baut einen WORKFLOW_V0-Schritt für die Fälle unten.
 * @param schrittId - schritt_id
 * @param nachfolger - schritt_id des Folgeschritts oder null
 * @param felder - Abweichungen von der Vorgabe (worker, freigabe, lauf_id, status)
 * @returns Schritt-Objekt
 */
function gateSchritt(schrittId, nachfolger, felder = {}) {
  return {
    schritt_id: schrittId,
    rolle: 'code-reviewer',
    werkzeugsatz: 'lesend',
    worker: 'claude-code',
    modell: 'gate-modell',
    eingaben: ['artefakt:auftrag-gate-auftrag'],
    output_schema: null,
    freigabe: 'AUTOMATISCH',
    risiko: 'Gate-Fixture, kein realer Lauf.',
    zeitgrenze_ms: 600000,
    nachfolger,
    status: 'OFFEN',
    lauf_id: null,
    ...felder,
  }
}

/**
 * Baut einen vollständigen WORKFLOW_V0-Datensatz für die Fälle unten.
 * @param schritte - Schrittliste
 * @param felder - Abweichungen von der Vorgabe (grenzen, workflow_id, aktiver_schritt_id)
 * @returns WORKFLOW_V0-Datensatz
 */
function gateWorkflow(schritte, felder = {}) {
  return {
    workflow_schema: 'v0',
    workflow_id: 'gate-workflow',
    auftrag_id: 'gate-auftrag',
    version: 1,
    ziel: 'Gate-Fixture für den Schritt-Automaten.',
    status: 'OFFEN',
    aktiver_schritt_id: schritte[0].schritt_id,
    grenzen: { max_schritte: 8, max_replans: 2 },
    schritte,
    ...felder,
  }
}

const ERFOLG_1 = { schrittId: 'schritt-1', ergebnis: 'ERFOLGREICH', laufId: 'gate-lauf-1' }
const gelaufen = (nachfolger, felder = {}) => gateSchritt('schritt-1', nachfolger, { status: 'ERFOLGREICH', lauf_id: 'gate-lauf-1', ...felder })

const automatFaelle = [
  {
    name: "ZWINGEND-Halt (Rotfall der Automatik): freigabe 'ZWINGEND' darf NIE automatisch starten",
    workflow: gateWorkflow([gelaufen('schritt-2'), gateSchritt('schritt-2', null, { freigabe: 'ZWINGEND' })]),
    ergebnis: ERFOLG_1,
    erwartet: { art: 'haltFreigabe', schrittId: 'schritt-2', aktiverSchrittId: 'schritt-2' },
  },
  {
    name: "Codex-Halt (Rotfall der Automatik): worker 'codex' hält an, statt still auf claude-code auszuweichen (E-159, E-M3-3)",
    workflow: gateWorkflow([gelaufen('schritt-2'), gateSchritt('schritt-2', null, { worker: 'codex' })]),
    ergebnis: ERFOLG_1,
    erwartet: { art: 'haltKlaerung', grund: "Worker 'codex' ist erst ab F16 dispatchbar", aktiverSchrittId: 'schritt-2' },
  },
  {
    name: 'Grenz-Halt: grenzen.max_schritte erreicht',
    workflow: gateWorkflow([gelaufen('schritt-2'), gateSchritt('schritt-2', null)], { grenzen: { max_schritte: 1, max_replans: 0 } }),
    ergebnis: ERFOLG_1,
    erwartetArt: 'haltGrenze',
  },
  {
    name: 'Klär-Halt: Vorschritt VERWEIGERT läuft nicht weiter',
    workflow: gateWorkflow([gelaufen('schritt-2', { status: 'VERWEIGERT' }), gateSchritt('schritt-2', null)]),
    ergebnis: { ...ERFOLG_1, ergebnis: 'VERWEIGERT' },
    erwartetArt: 'haltKlaerung',
  },
  {
    name: 'Wiederaufnahme-Halt (Rotfall der Automatik): ein Cursor auf einem bereits gelaufenen Schritt startet ihn NICHT erneut',
    workflow: gateWorkflow([gelaufen('schritt-2'), gateSchritt('schritt-2', null)], { aktiver_schritt_id: 'schritt-1', status: 'LAEUFT' }),
    ergebnis: undefined,
    erwartetArt: 'haltKlaerung',
  },
  {
    name: 'Wiederaufnahme-Halt (Rotfall der Automatik): ein GESTOPPTER Workflow wird nicht automatisch fortgesetzt',
    // Alle Schritte OFFEN und ohne lauf_id — sonst finge die Startbereitschafts-
    // Regel den Fall ab und dieser Fall kalibrierte nicht mehr daten.status,
    // sondern ein zweites Mal dieselbe Regel.
    workflow: gateWorkflow([gateSchritt('schritt-1', null)], { aktiver_schritt_id: null, status: 'GESTOPPT' }),
    ergebnis: undefined,
    erwartet: { art: 'haltGestoppt', aktiverSchrittId: null },
  },
  {
    name: 'Regel-0-Halt (Rotfall der Automatik): ein verspätetes ERFOLGREICH setzt einen GESTOPPTEN Workflow nicht fort',
    // Der Fall MIT Vorschrittergebnis — der Abbruch-Endpunkt antwortet sofort,
    // das Laufergebnis trifft danach ein. Alle Schritte des Folgeschritts sind
    // startbereit; nur daten.status hält den Automaten hier auf.
    //
    // Der erwartete Ausgang ist seit WS-2c (b1) 'haltGestoppt' statt
    // 'haltKlaerung' — die eigentliche Zusage dieses Falls. Ein haltKlaerung
    // schriebe die Nachbereitung als KLAERUNG_ERFORDERLICH über den Stopp
    // zurück, und der wäre nach Sekunden weg; der Verhaltensbeleg dazu steht
    // unten in „ein Automaten-Ausgang überschreibt ein GESTOPPT nicht".
    workflow: gateWorkflow([gelaufen('schritt-2'), gateSchritt('schritt-2', null)], { aktiver_schritt_id: null, status: 'GESTOPPT' }),
    ergebnis: ERFOLG_1,
    erwartet: { art: 'haltGestoppt', aktiverSchrittId: null },
  },
  {
    name: 'Freigabe-Grünfall (WS-2c (b1)): ZWINGEND mit freigabe_erteilt true startet',
    workflow: gateWorkflow([gelaufen('schritt-2'), gateSchritt('schritt-2', null, { freigabe: 'ZWINGEND', freigabe_erteilt: true })]),
    ergebnis: ERFOLG_1,
    erwartetArt: 'starte',
  },
  {
    name: 'Freigabe-Rotfall (WS-2c (b1)): freigabe_erteilt false ist keine Freigabe — nur exakt true startet',
    workflow: gateWorkflow([gelaufen('schritt-2'), gateSchritt('schritt-2', null, { freigabe: 'ZWINGEND', freigabe_erteilt: false })]),
    ergebnis: ERFOLG_1,
    erwartet: { art: 'haltFreigabe', schrittId: 'schritt-2', aktiverSchrittId: 'schritt-2' },
  },
  {
    name: 'Allowlist-Halt (Rotfall der Automatik): ein WORKER-Wert, den die Entscheidungsregel nicht kennt, startet nicht',
    // Bildet nach, dass jemand WORKER in index.ts erweitert und die Regel nicht mitzieht.
    // Die Fixture ist deshalb absichtlich KEIN gültiger WORKFLOW_V0 — sie wird unten von der
    // Vorab-Validierung ausgenommen.
    workflow: gateWorkflow([gateSchritt('schritt-1', null, { worker: 'gemini' })]),
    ergebnis: undefined,
    erwartetArt: 'haltKlaerung',
    fixtureIstAbsichtlichUngueltig: true,
  },
  {
    name: 'Grünfall Erststart: ohne Vorschrittergebnis startet der Cursor-Schritt',
    workflow: gateWorkflow([gateSchritt('schritt-1', null)]),
    ergebnis: undefined,
    erwartetArt: 'starte',
  },
  {
    name: "Grünfall EMPFOHLEN: startet automatisch wie AUTOMATISCH (E-M3-1, der Unterschied ist rein anzeigend)",
    workflow: gateWorkflow([gelaufen('schritt-2'), gateSchritt('schritt-2', null, { freigabe: 'EMPFOHLEN' })]),
    ergebnis: ERFOLG_1,
    erwartetArt: 'starte',
  },
  {
    name: 'Grünfall Ende: ERFOLGREICH ohne nachfolger meldet fertig',
    workflow: gateWorkflow([gelaufen(null)]),
    ergebnis: ERFOLG_1,
    erwartet: { art: 'fertig', aktiverSchrittId: null },
  },
]

const befundeVorAutomat = befunde.length
for (const fall of automatFaelle) {
  // Jede Fixture muss zuerst die Formprüfung bestehen — sonst kalibriert der
  // Fall eine Regel an Daten, die real nie bis zum Automaten kommen. Einzige
  // Ausnahme: die Allowlist-Fälle, deren ganzer Zweck ein Wert ist, den die
  // Formprüfung (noch) nicht kennt; dort wäre die Vorab-Validierung genau der
  // Beweis, den der Fall nicht führen will.
  if (fall.fixtureIstAbsichtlichUngueltig !== true) {
    const verstoesse = validiereWorkflowDaten(fall.workflow)
    if (verstoesse.length > 0) {
      befunde.push(`ermittleNaechstenSchritt / ${fall.name}: die Fixture selbst ist kein gültiger WORKFLOW_V0 (${verstoesse.join('; ')})`)
      continue
    }
  }
  const ergebnis = ermittleNaechstenSchritt(fall.workflow, fall.ergebnis)
  if (fall.erwartet !== undefined) {
    if (JSON.stringify(ergebnis) !== JSON.stringify(fall.erwartet)) {
      befunde.push(`ermittleNaechstenSchritt / ${fall.name}: erwartet ${JSON.stringify(fall.erwartet)}, erhalten ${JSON.stringify(ergebnis)}`)
    }
  } else if (ergebnis.art !== fall.erwartetArt) {
    befunde.push(`ermittleNaechstenSchritt / ${fall.name}: erwartet art '${fall.erwartetArt}', erhalten '${ergebnis.art}'`)
  }
}
if (befunde.length === befundeVorAutomat) {
  console.log(
    `✓ ${automatFaelle.length} Fall/Fälle von ermittleNaechstenSchritt geprüft (Regel-0-/Gestoppt-, ZWINGEND-, Codex-, Grenz-, Klär-, Wiederaufnahme- und Allowlist-Halt; Erststart, EMPFOHLEN, erteilte Freigabe, fertig).`
  )
}

// ─── Workflow-Endpunkte: Anlegen und Lesen, ohne Start (WS-2a) ──────────────
//
// Der neu behauptete Schutz hier ist die workflow_id-Zeichenregel: anders
// als eine auftragId (serverseitig per randomUUID erzeugt) kommt sie aus der
// Payload und geht über 'lineage-workflow-<id>' in einen Dateisystempfad
// ein. validiereWorkflowDaten verlangt nur einen nicht-leeren String —
// ohne den Rotfall unten stünde die Grenze unbelegt da.

/** @param optionen - an erzeugeRequestHandler durchgereicht @returns { basisUrl, schliessen } eines echten HTTP-Testservers auf einem Ephemeral-Loopback-Port (Muster check-f12-leitstand-ansicht.mjs) */
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    basisUrl: `http://127.0.0.1:${port}`,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  }
}

{
  const basisVerzeichnis = 'kontrollzustand-test-f15-ws2a'
  const workflowId = `gate-workflow-${randomUUID()}`
  const befundeVorEndpunkten = befunde.length
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const poste = (payload) => fetch(`${basisUrl}/api/workflows`, { method: 'POST', body: JSON.stringify(payload) })

    // Grünfall: eine gültige Payload wird angelegt.
    const gueltig = gateWorkflow([gateSchritt('schritt-1', null)], { workflow_id: workflowId })
    const antwortAnlegen = await poste(gueltig)
    if (antwortAnlegen.status !== 201) {
      befunde.push(`POST /api/workflows: gültige Payload erwartet 201, erhalten ${antwortAnlegen.status} (${await antwortAnlegen.text()})`)
    }

    // Rotfall 1: eine Payload, die validiereWorkflowDaten verletzt (unbekannter nachfolger).
    const ungueltig = gateWorkflow([gateSchritt('schritt-1', 'gibt-es-nicht')], { workflow_id: `${workflowId}-b` })
    const antwortUngueltig = await poste(ungueltig)
    if (antwortUngueltig.status !== 400) {
      befunde.push(`POST /api/workflows: ungültige Payload erwartet 400, erhalten ${antwortUngueltig.status}`)
    }

    // Rotfall 2: workflow_ids, die aus dem Kontrollzustand-Verzeichnis ausbrechen würden — alle
    // vier Varianten der Zeichenregel (Schrägstrich, Rückwärtsschrägstrich, '..', Steuerzeichen),
    // nicht nur eine. Geprüft wird zusätzlich, dass wirklich NICHTS geschrieben wurde: der
    // Statuscode allein belegt die Zusage „vor jedem Schreiben" nicht.
    for (const boese of ['../ausbruch', 'a/b', 'a\\b', 'a\u0001b']) {
      const antwort = await poste(gateWorkflow([gateSchritt('schritt-1', null)], { workflow_id: boese }))
      if (antwort.status !== 400) {
        befunde.push(`POST /api/workflows: workflow_id ${JSON.stringify(boese)} erwartet 400, erhalten ${antwort.status}`)
      }
    }
    if (existsSync(join(basisVerzeichnis, 'lineage-workflow-../ausbruch')) || existsSync(join(basisVerzeichnis, '..', 'ausbruch'))) {
      befunde.push('POST /api/workflows: eine abgelehnte workflow_id hat trotzdem ein Verzeichnis erzeugt — die Prüfung greift nicht vor dem Schreiben')
    }

    // Rotfall 3: Body-Randfälle. Alle vier enden in 400, keiner in einem 500 oder Prozesstod.
    for (const [name, roh] of [
      ['leerer Body', ''],
      ['kaputtes JSON', '{'],
      ['Wurzel ist null', 'null'],
      ['Wurzel ist ein Array', '[]'],
    ]) {
      const antwort = await fetch(`${basisUrl}/api/workflows`, { method: 'POST', body: roh })
      if (antwort.status !== 400) {
        befunde.push(`POST /api/workflows / ${name}: erwartet 400, erhalten ${antwort.status}`)
      }
    }

    // Ein zweiter POST derselben workflow_id erzeugt eine neue VERSION (ARCHITECTURE.md §2,
    // versioniert statt überschrieben) — bisher war das nur behauptet, nicht geprüft.
    const antwortZweitfassung = await poste({ ...gueltig, ziel: 'Zweite Fassung desselben Workflows.' })
    const zweitfassung = await antwortZweitfassung.json()
    if (antwortZweitfassung.status !== 201 || zweitfassung.versionSequenz !== 2) {
      befunde.push(`POST /api/workflows: zweiter POST derselben workflow_id erwartet 201 mit versionSequenz 2, erhalten ${antwortZweitfassung.status} (${JSON.stringify(zweitfassung)})`)
    }

    // GET-Liste und GET-Detail projizieren das eben angelegte Artefakt.
    const liste = await (await fetch(`${basisUrl}/api/workflows`)).json()
    const kopf = liste.find((eintrag) => eintrag.workflowId === workflowId)
    if (kopf === undefined || kopf.schritteAnzahl !== 1 || 'schritte' in kopf) {
      befunde.push(`GET /api/workflows: Eintrag für '${workflowId}' fehlt oder trägt die volle Schrittliste, erhalten ${JSON.stringify(kopf)}`)
    }

    const detail = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`)
    const detailBody = await detail.json()
    if (detail.status !== 200 || detailBody.daten?.workflow_id !== workflowId || detailBody.daten?.schritte?.length !== 1) {
      befunde.push(`GET /api/workflows/<id>: erwartet 200 mit vollem Datensatz, erhalten ${detail.status} (${JSON.stringify(detailBody)})`)
    }

    const unbekannt = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(`${workflowId}-fehlt`)}`)
    if (unbekannt.status !== 404) {
      befunde.push(`GET /api/workflows/<id>: unbekannte workflowId erwartet 404, erhalten ${unbekannt.status}`)
    }

    // Der Detailendpunkt behauptet dieselbe Zeichenregel wie der POST — bisher ohne Rotfall.
    // '%' und '%zz' sind der Sonderfall: sie sind nicht dekodierbar. Vor der Korrektur warf
    // decodeURIComponent dort einen URIError aus einem async-Handler, dessen Promise niemand
    // awaitet — der Serverprozess starb (F10 AK6, „kein Prozesstod"). Deshalb steht hinter
    // dieser Schleife eine Lebendprüfung: ein Statuscode allein bewiese nichts, wenn der
    // Prozess erst danach fällt.
    for (const roh of ['%2E%2E%2Fausbruch', 'a%2Fb', 'a%5Cb', '%00', '%', '%zz', '']) {
      const antwort = await fetch(`${basisUrl}/api/workflows/${roh}`)
      if (antwort.status !== 400) {
        befunde.push(`GET /api/workflows/${roh || '<leer>'}: erwartet 400, erhalten ${antwort.status}`)
      }
    }
    const lebtNoch = await fetch(`${basisUrl}/api/workflows`)
    if (lebtNoch.status !== 200) {
      befunde.push(`GET /api/workflows nach den Rotfällen: Server antwortet nicht mehr mit 200, erhalten ${lebtNoch.status}`)
    }

    if (befunde.length === befundeVorEndpunkten) {
      console.log('✓ POST /api/workflows legt an (201), lehnt eine ungültige Payload und eine ausbrechende workflow_id ab (400); GET liefert Liste, Detail und 404.')
    }
  } finally {
    await schliessen()
    rmSync(basisVerzeichnis, { recursive: true, force: true })
  }
}

// ─── loeseAusfuehrungsEingabenAuf: Direkttest der Extraktion (WS-2a) ────────
//
// Muster: check-f11-auftrag.mjs behandelt loeseEvidenzPfadAuf genauso — als
// F11 WS-2 sie aus dem Handler zog, bekam sie sofort einen Direkttest mit
// Grün- und Rotfällen. Ohne dasselbe hier wäre die Zusage „verhaltensgleich
// extrahiert" im Kopf von leitstand-server.mjs durch nichts gedeckt: der
// Zweig „unbekannter Werkzeugsatz" hat in KEINEM bestehenden Gate einen
// Fall, und die Reihenfolge Werkzeugsatz-Auflösung vor Pfadprüfung ist
// nirgends festgenagelt — ein Vertauschen der beiden Blöcke bliebe grün
// (Reviewer-/QA-Pass 10.09.2026, K3/TC-C1/TC-C2).

{
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const repoWurzel = process.cwd()
  const basisEingaben = {
    rolle: 'ausfuehrung',
    anfragen: [{ pfad: 'package.json', zweck: 'Gate-Fixture' }],
    budget: { maxElemente: 5 },
    aufrufEingaben: { modell: 'gate-modell' },
    auftragId: 'gate-auftrag',
  }
  const befundeVorExtraktion = befunde.length

  // Grünfall: der vollständige Feldsatz entsteht, inklusive gelesenem Inhalt.
  const gruen = loeseAusfuehrungsEingabenAuf(basisEingaben, 'lesend', 'Gate-Auftragstext', vorlage, repoWurzel)
  if (!gruen.ok) {
    befunde.push(`loeseAusfuehrungsEingabenAuf: Grünfall erwartet ok:true, erhalten ${JSON.stringify(gruen)}`)
  } else {
    // Die Schlüsselmenge wird als Ganzes verglichen — ein bei der Extraktion still
    // verlorenes Feld fiele sonst erst in einem echten Werkzeuglauf auf.
    const erwarteteFelder = [
      'rolle',
      'anfragen',
      'budget',
      'aufrufEingaben',
      'werkzeugStartziel',
      'werkzeugVersionDeklariert',
      'berechtigungskontext',
      'auftragstext',
      'auftragId',
    ]
    const erhalten = Object.keys(gruen.eingaben).sort()
    if (JSON.stringify(erhalten) !== JSON.stringify([...erwarteteFelder].sort())) {
      befunde.push(`loeseAusfuehrungsEingabenAuf: Feldsatz erwartet ${JSON.stringify([...erwarteteFelder].sort())}, erhalten ${JSON.stringify(erhalten)}`)
    }
    if (gruen.eingaben.auftragstext !== 'Gate-Auftragstext') {
      befunde.push("loeseAusfuehrungsEingabenAuf: auftragstext wird nicht durchgereicht")
    }
    if (gruen.eingaben.aufrufEingaben.werkzeugsatz?.modus !== 'DEKLARIERT') {
      befunde.push(`loeseAusfuehrungsEingabenAuf: aufrufEingaben.werkzeugsatz fehlt oder trägt nicht den Modus der Startvorlage, erhalten ${JSON.stringify(gruen.eingaben.aufrufEingaben)}`)
    }
    if (typeof gruen.eingaben.anfragen[0]?.inhalt !== 'string' || gruen.eingaben.anfragen[0].inhalt.length === 0) {
      befunde.push('loeseAusfuehrungsEingabenAuf: die Evidenzdatei wurde nicht gelesen (anfragen[0].inhalt fehlt oder ist leer)')
    }
    if ('vorgaengerLaufId' in gruen.eingaben) {
      befunde.push("loeseAusfuehrungsEingabenAuf: 'vorgaengerLaufId' darf ohne Angabe NICHT im Ergebnis stehen")
    }
  }

  // Grünfall 2: vorgaengerLaufId wird nur durchgereicht, wenn es angegeben ist.
  const mitVorgaenger = loeseAusfuehrungsEingabenAuf({ ...basisEingaben, vorgaengerLaufId: 'lauf-0' }, 'lesend', 'text', vorlage, repoWurzel)
  if (!mitVorgaenger.ok || mitVorgaenger.eingaben.vorgaengerLaufId !== 'lauf-0') {
    befunde.push(`loeseAusfuehrungsEingabenAuf: 'vorgaengerLaufId' wird nicht durchgereicht, erhalten ${JSON.stringify(mitVorgaenger)}`)
  }

  const rotfaelle = [
    {
      name: 'unbekannter Werkzeugsatz',
      eingaben: basisEingaben,
      werkzeugsatz: 'gibt-es-nicht',
      grundMuster: /^unbekannter Werkzeugsatz 'gibt-es-nicht'/,
    },
    {
      name: 'absoluter Evidenzpfad',
      eingaben: { ...basisEingaben, anfragen: [{ pfad: '/etc/passwd' }] },
      werkzeugsatz: 'lesend',
      grundMuster: /Pfad ist absolut/,
    },
    {
      name: "'..'-Segment im Evidenzpfad",
      eingaben: { ...basisEingaben, anfragen: [{ pfad: '../geheim.txt' }] },
      werkzeugsatz: 'lesend',
      grundMuster: /'\.\.'-Segment/,
    },
    {
      name: 'Evidenzdatei fehlt',
      eingaben: { ...basisEingaben, anfragen: [{ pfad: 'gibt-es-nicht-im-repo.txt' }] },
      werkzeugsatz: 'lesend',
      grundMuster: /Datei nicht gefunden/,
    },
  ]

  for (const fall of rotfaelle) {
    const ergebnis = loeseAusfuehrungsEingabenAuf(fall.eingaben, fall.werkzeugsatz, 'text', vorlage, repoWurzel)
    if (ergebnis.ok !== false || !fall.grundMuster.test(ergebnis.grund)) {
      befunde.push(`loeseAusfuehrungsEingabenAuf / ${fall.name}: erwartet ok:false mit Grund nach ${fall.grundMuster}, erhalten ${JSON.stringify(ergebnis)}`)
    }
  }

  // Reihenfolge festgenagelt: trägt ein Aufruf BEIDE Fehler, muss der
  // Werkzeugsatz-Fehler gewinnen — er wird zuerst geprüft. Ohne diesen Fall
  // liefe ein Vertauschen der beiden Blöcke grün durch.
  const beides = loeseAusfuehrungsEingabenAuf({ ...basisEingaben, anfragen: [{ pfad: '/etc/passwd' }] }, 'gibt-es-nicht', 'text', vorlage, repoWurzel)
  if (beides.ok !== false || !/^unbekannter Werkzeugsatz/.test(beides.grund)) {
    befunde.push(`loeseAusfuehrungsEingabenAuf: bei Werkzeugsatz- UND Pfadfehler muss der Werkzeugsatz-Fehler zuerst gemeldet werden, erhalten ${JSON.stringify(beides)}`)
  }

  if (befunde.length === befundeVorExtraktion) {
    console.log('✓ loeseAusfuehrungsEingabenAuf: Feldsatz, vorgaengerLaufId, vier Ablehnungsgründe und die Prüfreihenfolge festgenagelt.')
  }
}
// ─── POST /api/workflows/<id>/starten: der Automatenpfad, ein Schritt (WS-2b) ──
//
// Vier Rotfälle und ein Grünfall. Die Rotfälle sind die Grenzen, die dieser
// Endpunkt behauptet — 404 (unbekannter Workflow), 409 (D13 aktiv), 409 (der
// Workflow ist nicht startbar), 400 (eine erklärte Eingabe fehlt). Ohne sie
// wäre „hält an" durch ein „hält immer an" erfüllbar; der Grünfall daneben ist
// der Beleg, dass real etwas startet (ARCHITECTURE.md §8).
//
// fuehreAufgabeDurchFn ist in allen Fällen eine Attrappe (Muster
// check-f10-leitstand.mjs): das Gate prüft den Automatenpfad, nicht F8.

{
  const basisVerzeichnis = 'kontrollzustand-test-f15-ws2b'
  const befundeVorStart = befunde.length
  rmSync(basisVerzeichnis, { recursive: true, force: true })

  /** @returns ein AusfuehrungsErgebnis, das normalisiereSchrittAusgang als ERFOLGREICH liest */
  const erfolgreichesErgebnis = () => ({
    ok: true,
    klassifikation: { ergebnis: 'ERFOLGREICH' },
    laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' },
  })

  // Ein Auftrag muss real existieren: der Startendpunkt lädt seinen Text aus dem
  // Auftragsartefakt (Muster POST /api/laeufe, F12 WS-2 AK5).
  let auftragId
  {
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
    try {
      const antwort = await fetch(`${basisUrl}/api/auftraege`, {
        method: 'POST',
        body: JSON.stringify({ titel: 'F15-WS-2b-Gate', auftragstext: 'Auftragstext des Gate-Workflows.' }),
      })
      auftragId = (await antwort.json()).auftragId
      if (antwort.status !== 201 || typeof auftragId !== 'string') {
        befunde.push(`WS-2b-Vorbereitung: POST /api/auftraege erwartet 201 mit auftragId, erhalten ${antwort.status}`)
      }
    } finally {
      await schliessen()
    }
  }

  /**
   * Legt einen Workflow über POST /api/workflows an.
   * @param basisUrl - Basis-URL des Testservers
   * @param workflowId - workflow_id
   * @param schritte - Schrittliste
   * @param felder - Abweichungen auf Workflow-Ebene
   * @returns die angelegte Payload
   */
  async function legeWorkflowAn(basisUrl, workflowId, schritte, felder = {}) {
    const payload = gateWorkflow(schritte, { workflow_id: workflowId, auftrag_id: auftragId, ...felder })
    const antwort = await fetch(`${basisUrl}/api/workflows`, { method: 'POST', body: JSON.stringify(payload) })
    if (antwort.status !== 201) {
      befunde.push(`WS-2b-Vorbereitung: POST /api/workflows für '${workflowId}' erwartet 201, erhalten ${antwort.status} (${await antwort.text()})`)
    }
    return payload
  }

  // ─── Grünfall: ein Schritt startet real ───────────────────────────────────
  {
    const workflowId = `ws2b-gruen-${randomUUID()}`
    let gesehen = null
    const fuehreAufgabeDurchFn = async (laufId, _profilReferenz, eingaben, laufOptionen) => {
      gesehen = { laufId, eingaben, laufOptionen }
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      // schritte[].eingaben verweist auf das reale Auftragsartefakt — die einzige Artefakt-Art,
      // die dieses Gate ohne echten Lauf sicher zur Verfügung hat. Dass fuehreAufgabeDurch den
      // Auftrag ohnehin selbst voranstellt, ist hier ohne Belang: die Attrappe tut das nicht,
      // und geprüft wird die Auflösung durch den Automaten.
      await legeWorkflowAn(basisUrl, workflowId, [
        gateSchritt('schritt-1', null, { eingaben: [`artefakt:auftrag-${auftragId}`], modell: 'schritt-modell', zeitgrenze_ms: 12345 }),
      ])

      const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      const koerper = await antwort.json()
      if (antwort.status !== 202 || koerper.workflowId !== workflowId || koerper.schrittId !== 'schritt-1' || typeof koerper.laufId !== 'string') {
        befunde.push(`POST /api/workflows/<id>/starten: erwartet 202 mit { workflowId, schrittId, laufId }, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }

      // Die VOR dem Laufstart geschriebene Version muss LAEUFT + lauf_id tragen. Sie ist nach
      // dem Laufende bereits von der Nachbereitung überholt — deshalb wird die Version mit
      // versionSequenz 2 gelesen (1 = das Anlegen), nicht die jüngste.
      const vorher = ladeArtefaktVersion(`workflow-${workflowId}`, 2, { basisVerzeichnis, schreiber: () => {} })
      const schrittVorher = vorher?.daten?.schritte?.[0]
      if (vorher === null || vorher.daten.status !== 'LAEUFT' || schrittVorher?.status !== 'LAEUFT' || schrittVorher?.lauf_id !== koerper.laufId) {
        befunde.push(`POST /api/workflows/<id>/starten: die vor dem Lauf geschriebene Version trägt nicht LAEUFT + lauf_id, erhalten ${JSON.stringify(vorher?.daten)}`)
      }
      if (vorher?.daten?.aktiver_schritt_id !== 'schritt-1') {
        befunde.push(`POST /api/workflows/<id>/starten: aktiver_schritt_id erwartet 'schritt-1', erhalten ${JSON.stringify(vorher?.daten?.aktiver_schritt_id)}`)
      }

      // Die Abbildung (A)/(B) — der Feldsatz, den der Automat gebaut hat.
      if (gesehen === null) {
        befunde.push('POST /api/workflows/<id>/starten: der Lauf wurde nicht gestartet (Attrappe nie aufgerufen)')
      } else {
        if (gesehen.eingaben.rolle !== 'code-reviewer') {
          befunde.push(`WS-2b (A): rolle erwartet 'code-reviewer' (schritt.rolle), erhalten ${JSON.stringify(gesehen.eingaben.rolle)}`)
        }
        if (gesehen.eingaben.aufrufEingaben?.modell !== 'schritt-modell') {
          befunde.push(`WS-2b (A): aufrufEingaben.modell erwartet 'schritt-modell' (gepinntes Plandatum, E-185), erhalten ${JSON.stringify(gesehen.eingaben.aufrufEingaben?.modell)}`)
        }
        if (gesehen.laufOptionen?.zeitgrenzeMs !== 12345) {
          befunde.push(`WS-2b (A): laufOptionen.zeitgrenzeMs erwartet 12345 (schritt.zeitgrenze_ms schlägt vorlage.zeitgrenzeMs), erhalten ${JSON.stringify(gesehen.laufOptionen?.zeitgrenzeMs)}`)
        }
        if (gesehen.eingaben.auftragId !== auftragId) {
          befunde.push(`WS-2b (A): auftragId erwartet '${auftragId}' (daten.auftrag_id), erhalten ${JSON.stringify(gesehen.eingaben.auftragId)}`)
        }
        if ('vorgaengerLaufId' in gesehen.eingaben) {
          befunde.push("WS-2b (A): beim ERSTEN Schritt darf 'vorgaengerLaufId' NICHT gesetzt sein")
        }
        const vorlageBudget = ladeStartvorlage('startvorlagen/beispielprojekt.json').standardBudget
        if (JSON.stringify(gesehen.eingaben.budget) !== JSON.stringify(vorlageBudget)) {
          befunde.push(`WS-2b (A): budget erwartet vorlage.standardBudget ${JSON.stringify(vorlageBudget)}, erhalten ${JSON.stringify(gesehen.eingaben.budget)}`)
        }
        const erste = gesehen.eingaben.anfragen?.[0]
        if (erste?.pfad !== `artefakt:auftrag-${auftragId}` || erste?.notwendig !== true || typeof erste?.inhalt !== 'string' || erste.inhalt.length === 0) {
          befunde.push(`WS-2b (B): schritte[].eingaben wurde nicht als vorangestellte notwendig:true-Anfrage aufgelöst, erhalten ${JSON.stringify(gesehen.eingaben.anfragen)}`)
        }
      }

      // Nach dem Laufende: der Schritt trägt seinen Ausgang. Das .then läuft asynchron nach der
      // 202 — kurz warten, statt auf ein Ereignis zu horchen, das der Server nicht anbietet.
      await new Promise((resolve) => setTimeout(resolve, 50))
      const nachher = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (nachher?.daten?.schritte?.[0]?.status !== 'ERFOLGREICH' || nachher?.daten?.status !== 'ABGESCHLOSSEN' || nachher?.daten?.aktiver_schritt_id !== null) {
        befunde.push(`POST /api/workflows/<id>/starten: nach ERFOLGREICH ohne nachfolger erwartet Schritt ERFOLGREICH, Workflow ABGESCHLOSSEN, Cursor null (WS-2b (6)), erhalten ${JSON.stringify(nachher?.daten)}`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── Rotfall 1: unbekannter Workflow → 404 ────────────────────────────────
  {
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: async () => erfolgreichesErgebnis() })
    try {
      const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(`gibt-es-nicht-${randomUUID()}`)}/starten`, { method: 'POST' })
      if (antwort.status !== 404) {
        befunde.push(`POST /api/workflows/<id>/starten: unbekannter Workflow erwartet 404, erhalten ${antwort.status}`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── Rotfall 2: D13 aktiv → 409, nichts gestartet ─────────────────────────
  //
  // Der erste Lauf hängt (Muster check-f10-leitstand.mjs AK7), bis das Gate ihn freigibt —
  // erst dann verlässt er den Aufruf und gibt laufAktiv zurück.
  {
    const workflowId = `ws2b-d13-${randomUUID()}`
    let starts = 0
    let gibFrei
    const haengt = new Promise((resolve) => {
      gibFrei = resolve
    })
    const fuehreAufgabeDurchFn = async () => {
      starts += 1
      await haengt
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: [] })])

      const erster = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      if (erster.status !== 202) {
        befunde.push(`WS-2b/D13: der erste Start erwartet 202, erhalten ${erster.status} (${await erster.text()})`)
      }

      const zweiter = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      const grund = (await zweiter.json()).grund ?? ''
      if (zweiter.status !== 409 || !grund.includes('(D13)')) {
        befunde.push(`WS-2b/D13: der zweite Start bei aktivem Lauf erwartet 409 mit D13-Grund, erhalten ${zweiter.status} (${grund})`)
      }

      // Auch ein HTTP-Start muss an derselben Sperre scheitern — D13 gilt über beide Pfade.
      const ueberLaeufe = await fetch(`${basisUrl}/api/laeufe`, {
        method: 'POST',
        body: JSON.stringify({
          laufId: `d13-probe-${randomUUID()}`,
          rolle: 'ausfuehrung',
          anfragen: [],
          budget: { maxElemente: 5 },
          aufrufEingaben: { modell: 'gate-modell' },
          auftragId,
          werkzeugsatz: 'lesend',
        }),
      })
      if (ueberLaeufe.status !== 409) {
        befunde.push(`WS-2b/D13: POST /api/laeufe bei aktivem Workflow-Schritt erwartet 409, erhalten ${ueberLaeufe.status}`)
      }
      if (starts !== 1) {
        befunde.push(`WS-2b/D13: erwartet genau EIN gestarteter Lauf, erhalten ${starts}`)
      }
    } finally {
      gibFrei()
      await new Promise((resolve) => setTimeout(resolve, 50))
      await schliessen()
    }
  }

  // ─── Rotfall 3: Workflow nicht startbar (GESTOPPT) → 409, nichts gestartet ─
  {
    const workflowId = `ws2b-gestoppt-${randomUUID()}`
    let starts = 0
    const fuehreAufgabeDurchFn = async () => {
      starts += 1
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: [] })], {
        status: 'GESTOPPT',
        aktiver_schritt_id: null,
      })
      const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      const koerper = await antwort.json()
      // art 'haltGestoppt' seit WS-2c (b1) — GESTOPPT ist ein eigener Ausgang, kein Klärfall.
      if (antwort.status !== 409 || koerper.art !== 'haltGestoppt') {
        befunde.push(`WS-2b: ein GESTOPPTER Workflow erwartet 409 mit art 'haltGestoppt', erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }
      if (starts !== 0) {
        befunde.push(`WS-2b: ein GESTOPPTER Workflow darf keinen Lauf starten, erhalten ${starts}`)
      }
      // Nichts geschrieben: die Version bleibt die eine vom Anlegen.
      const zweiteVersion = ladeArtefaktVersion(`workflow-${workflowId}`, 2, { basisVerzeichnis, schreiber: () => {} })
      if (zweiteVersion !== null) {
        befunde.push('WS-2b: ein abgelehnter Start hat trotzdem eine neue Workflow-Version geschrieben')
      }
    } finally {
      await schliessen()
    }
  }

  // ─── Rotfall 4: eine erklärte Eingabe fehlt → 400, Halt statt stillem Start ─
  {
    const workflowId = `ws2b-eingabe-fehlt-${randomUUID()}`
    let starts = 0
    const fuehreAufgabeDurchFn = async () => {
      starts += 1
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: ['artefakt:auftrag-gibt-es-nicht'] })])
      const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      const grund = (await antwort.json()).grund ?? ''
      if (antwort.status !== 400 || !grund.includes('auftrag-gibt-es-nicht')) {
        befunde.push(`WS-2b (B): ein fehlendes Eingabe-Artefakt erwartet 400 mit der Artefakt-ID im Grund, erhalten ${antwort.status} (${grund})`)
      }
      if (starts !== 0) {
        befunde.push(`WS-2b (B): bei fehlendem Eingabe-Artefakt darf kein Lauf starten, erhalten ${starts}`)
      }
      const zweiteVersion = ladeArtefaktVersion(`workflow-${workflowId}`, 2, { basisVerzeichnis, schreiber: () => {} })
      if (zweiteVersion !== null) {
        befunde.push('WS-2b (B): bei fehlendem Eingabe-Artefakt wurde trotzdem eine neue Workflow-Version geschrieben')
      }
    } finally {
      await schliessen()
    }
  }

  // ─── Rotfall 5: auftrag_id als Pfad-Ausbruch → 400, Server lebt ───────────
  //
  // Real reproduziert (Reviewer-Pass 10.09.2026): auftrag_id geht über
  // 'lineage-auftrag-<id>' in einen Dateisystempfad ein, und ladeArtefaktVersion WIRFT
  // dort (F1s pruefeLaufId) statt null zu liefern. Aus einem async-Handler, dessen
  // Promise niemand awaitet, war das eine unhandled rejection — also Prozesstod statt
  // Antwort. Zwei Stellen, zwei Fälle: das Anlegen lehnt ab, und ein BESTANDSartefakt
  // (hier direkt über registriereWorkflow angelegt, am Endpunkt vorbei) wird beim Starten
  // abgelehnt. Hinter beiden steht eine Lebendprüfung — ein Statuscode allein bewiese
  // nichts, wenn der Prozess erst danach fällt.
  {
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: async () => erfolgreichesErgebnis() })
    try {
      for (const boese of ['../../ausbruch', 'a/b', 'a\\b', 'ab']) {
        const payload = gateWorkflow([gateSchritt('schritt-1', null, { eingaben: [] })], {
          workflow_id: `ws2b-auftragid-${randomUUID()}`,
          auftrag_id: boese,
        })
        const antwort = await fetch(`${basisUrl}/api/workflows`, { method: 'POST', body: JSON.stringify(payload) })
        if (antwort.status !== 400) {
          befunde.push(`POST /api/workflows: auftrag_id ${JSON.stringify(boese)} erwartet 400, erhalten ${antwort.status}`)
        }
      }

      // Bestandsartefakt: am Endpunkt vorbei angelegt, wie es ein früherer Serverstand
      // hinterlassen haben kann. Der Startendpunkt muss es abfangen, statt daran zu sterben.
      const bestandId = `ws2b-bestand-${randomUUID()}`
      registriereWorkflow(
        gateWorkflow([gateSchritt('schritt-1', null, { eingaben: [] })], { workflow_id: bestandId, auftrag_id: '../../ausbruch' }),
        leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json')),
        { basisVerzeichnis, schreiber: () => {} }
      )
      const gestartet = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(bestandId)}/starten`, { method: 'POST' })
      const grund = (await gestartet.json()).grund ?? ''
      if (gestartet.status !== 400 || !grund.includes('auftrag_id')) {
        befunde.push(`WS-2b: ein Bestandsworkflow mit ausbrechender auftrag_id erwartet 400, erhalten ${gestartet.status} (${grund})`)
      }

      // Rotfall 6: kaputte/ausbrechende Prozentkodierung am neuen POST — dieselbe Klasse, die
      // in WS-2a real den Serverprozess getötet hat (siehe Kopf von leitstand-server.mjs).
      for (const roh of ['%2E%2E%2Fausbruch', 'a%2Fb', 'a%5Cb', '%00', '%', '%zz']) {
        const antwort = await fetch(`${basisUrl}/api/workflows/${roh}/starten`, { method: 'POST' })
        if (antwort.status !== 400) {
          befunde.push(`POST /api/workflows/${roh}/starten: erwartet 400, erhalten ${antwort.status}`)
        }
      }

      const lebtNoch = await fetch(`${basisUrl}/api/workflows`)
      if (lebtNoch.status !== 200) {
        befunde.push(`GET /api/workflows nach den WS-2b-Rotfällen: Server antwortet nicht mehr mit 200, erhalten ${lebtNoch.status}`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── Grünfall 2 (WS-2c, AK6b): EIN /starten führt beide Schritte aus ──────────────
  //
  // Bis WS-2b war das der manuelle Schritt-für-Schritt-Modus: der Cursor wanderte nach
  // einem erfolgreichen Schritt weiter, gestartet wurde nichts, und ein ZWEITER Aufruf
  // führte Schritt 2 aus. WS-2c ersetzt genau diesen zweiten Aufruf — der Automat setzt
  // selbst fort. Der Fall prüft deshalb jetzt das Gegenteil der WS-2b-Zusage: nach EINEM
  // Aufruf sind BEIDE Schritte gelaufen, ohne dass irgendwo ein zweiter POST steht.
  {
    const workflowId = `ws2c-auto-${randomUUID()}`
    const gestartete = []
    const gesehene = []
    const fuehreAufgabeDurchFn = async (laufId, _profilReferenz, eingaben) => {
      gestartete.push(laufId)
      gesehene.push(eingaben)
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [
        gateSchritt('schritt-1', 'schritt-2', { eingaben: [] }),
        gateSchritt('schritt-2', null, { eingaben: [] }),
      ])

      const ersterStart = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      const ersterKoerper = await ersterStart.json()
      if (ersterStart.status !== 202 || ersterKoerper.schrittId !== 'schritt-1') {
        befunde.push(`AK6b: der einzige Start erwartet 202 für 'schritt-1', erhalten ${ersterStart.status} (${JSON.stringify(ersterKoerper)})`)
      }
      await new Promise((resolve) => setTimeout(resolve, 100))

      // KEIN zweiter POST .../starten. Was jetzt auf der Platte steht, hat der Automat
      // geschrieben.
      const nachSchritt2 = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (nachSchritt2?.daten?.schritte?.[1]?.status !== 'ERFOLGREICH' || nachSchritt2?.daten?.schritte?.[1]?.lauf_id === null) {
        befunde.push(`AK6b: Schritt 2 muss ohne zweiten Aufruf gelaufen sein, erhalten ${JSON.stringify(nachSchritt2?.daten?.schritte?.[1])}`)
      }
      if (nachSchritt2?.daten?.status !== 'ABGESCHLOSSEN' || nachSchritt2?.daten?.aktiver_schritt_id !== null) {
        befunde.push(`AK6b: nach dem letzten Schritt erwartet ABGESCHLOSSEN mit Cursor null, erhalten ${JSON.stringify({ cursor: nachSchritt2?.daten?.aktiver_schritt_id, status: nachSchritt2?.daten?.status })}`)
      }
      if (gestartete.length !== 2 || gestartete[0] === gestartete[1]) {
        befunde.push(`AK6b: erwartet zwei Läufe mit verschiedenen laufIds aus EINEM Aufruf, erhalten ${JSON.stringify(gestartete)}`)
      }
      // (a4): grenzen.max_schritte über haltGrenze ist die einzige Abbruchbedingung — hier
      // greift sie nicht (max_schritte 8), der Automat endet über 'fertig'. Der Halt-Grund
      // steht seit (a5) im Artefakt und nicht mehr nur in einer HTTP-Antwort, die bei einem
      // automatischen Ende niemand mehr sieht.
      if (typeof nachSchritt2?.daten?.grund !== 'string' || !nachSchritt2.daten.grund.includes('durchgelaufen')) {
        befunde.push(`(a5): der Halt-Grund muss im Workflow-Artefakt stehen, erhalten ${JSON.stringify(nachSchritt2?.daten?.grund)}`)
      }
      // Lineage über die Schrittgrenze: Schritt 2 wird mit der lauf_id von Schritt 1 als
      // vorgaengerLaufId gestartet (Nicht-Ziel "Keine neue Lineage-Mechanik"). Vor der
      // Cursor-Wanderung konnte ein zweiter Schritt nie starten — die Zusage war damit unbelegt
      // und beim Bau von (6) real verlorengegangen (QA-Pass 10.09.2026).
      if ('vorgaengerLaufId' in (gesehene[0] ?? {})) {
        befunde.push("WS-2b: der ERSTE Schritt darf keine vorgaengerLaufId tragen")
      }
      if (gesehene[1]?.vorgaengerLaufId !== gestartete[0]) {
        befunde.push(`WS-2b: Schritt 2 muss mit vorgaengerLaufId '${gestartete[0]}' (lauf_id von Schritt 1) starten, erhalten ${JSON.stringify(gesehene[1]?.vorgaengerLaufId)}`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── Grünfall 2b (WS-2c, AK6b): nach der Übergabe ist D13 belegt ─────────────────
  //
  // Der Verhaltensbeleg zur Invariante, soweit ein Test ihn führen kann: Schritt 2 hängt,
  // der Automat hat ihn also gerade selbst gestartet — und ein POST /api/laeufe muss in
  // diesem Zustand mit 409 abgewiesen werden. Das belegt das ENDE der Übergabe (D13 ist
  // danach wieder belegt), nicht die Lücke davor; die prüft die Quelltext-Invariante unten.
  {
    const workflowId = `ws2c-d13-uebergabe-${randomUUID()}`
    const gestartete = []
    let gibFrei
    const haengt = new Promise((resolve) => {
      gibFrei = resolve
    })
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      // Nur der ZWEITE Lauf hängt — der erste muss durchlaufen, damit der Automat überhaupt
      // fortsetzt.
      if (gestartete.length === 2) await haengt
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [
        gateSchritt('schritt-1', 'schritt-2', { eingaben: [] }),
        gateSchritt('schritt-2', null, { eingaben: [] }),
      ])
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 100))

      if (gestartete.length !== 2) {
        befunde.push(`AK6b/D13: der Automat muss Schritt 2 selbst gestartet haben, erhalten ${gestartete.length} Läufe`)
      }
      const ueberLaeufe = await fetch(`${basisUrl}/api/laeufe`, {
        method: 'POST',
        body: JSON.stringify({
          laufId: `d13-uebergabe-probe-${randomUUID()}`,
          rolle: 'ausfuehrung',
          anfragen: [],
          budget: { maxElemente: 5 },
          aufrufEingaben: { modell: 'gate-modell' },
          auftragId,
          werkzeugsatz: 'lesend',
        }),
      })
      const grund = (await ueberLaeufe.json()).grund ?? ''
      if (ueberLaeufe.status !== 409 || !grund.includes('(D13)')) {
        befunde.push(`AK6b/D13: während des automatisch fortgesetzten Schritts erwartet POST /api/laeufe 409 mit D13-Grund, erhalten ${ueberLaeufe.status} (${grund})`)
      }
    } finally {
      gibFrei()
      await new Promise((resolve) => setTimeout(resolve, 50))
      await schliessen()
    }
  }

  // ─── Rotfall 7 (WS-2c): die Auto-Fortsetzung scheitert — kein zugemauerter Workflow ─
  //
  // Der Fall, den Reviewer- und QA-Pass am 10.09.2026 beide gefunden haben. Schritt 1 läuft
  // erfolgreich, die Fortsetzung auf Schritt 2 scheitert VOR dem Laufstart (unauflösbare
  // eingaben-Referenz — ein gewöhnlicher Planfehler, kein Sonderfall). Ohne den Halt, den
  // die Fortsetzung seither festschreibt, bliebe stehen: Workflow LAEUFT, Cursor auf
  // Schritt 2, KEIN Schritt auf LAEUFT, grund null. Dieser Zustand ist endgültig: die
  // Stale-Heilung greift nicht (sie verlangt einen SCHRITT auf LAEUFT), jeder weitere
  // /starten scheitert gleich, und eine korrigierte Fassung ist gesperrt, weil LAEUFT in
  // GESPERRTE_ERSETZUNGS_STATUS steht.
  //
  // Geprüft werden deshalb DREI Dinge: der Status, der persistierte Grund, und — der
  // eigentliche Zweck — dass der Mensch mit einer neuen Fassung wieder herauskommt.
  {
    const workflowId = `ws2c-fortsetzung-scheitert-${randomUUID()}`
    const gestartete = []
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [
        gateSchritt('schritt-1', 'schritt-2', { eingaben: [] }),
        gateSchritt('schritt-2', null, { eingaben: ['artefakt:gibt-es-wirklich-nicht'] }),
      ])
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 100))

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (gestartete.length !== 1) {
        befunde.push(`WS-2c: bei gescheiterter Fortsetzung darf kein zweiter Lauf starten, erhalten ${gestartete.length}`)
      }
      if (stand?.daten?.status !== 'KLAERUNG_ERFORDERLICH') {
        befunde.push(`WS-2c: eine gescheiterte Auto-Fortsetzung muss als KLAERUNG_ERFORDERLICH festgeschrieben werden (sonst ist der Workflow zugemauert), erhalten ${JSON.stringify(stand?.daten?.status)}`)
      }
      if (typeof stand?.daten?.grund !== 'string' || !stand.daten.grund.includes('gibt-es-wirklich-nicht')) {
        befunde.push(`WS-2c: der Grund der gescheiterten Fortsetzung muss im Artefakt stehen und die Ursache nennen, erhalten ${JSON.stringify(stand?.daten?.grund)}`)
      }
      // Der eigentliche Zweck: der Mensch kommt über eine korrigierte Fassung wieder heraus.
      const repariert = await fetch(`${basisUrl}/api/workflows`, {
        method: 'POST',
        body: JSON.stringify(
          gateWorkflow([gateSchritt('schritt-1', null, { eingaben: [], status: 'ERFOLGREICH', lauf_id: gestartete[0] })], {
            workflow_id: workflowId,
            auftrag_id: auftragId,
            status: 'KLAERUNG_ERFORDERLICH',
          })
        ),
      })
      if (repariert.status !== 201) {
        befunde.push(`WS-2c: nach einer gescheiterten Fortsetzung muss eine korrigierte Fassung angenommen werden, erhalten ${repariert.status} (${await repariert.text()})`)
      }
      // Und der eingereichte grund wird dabei NICHT übernommen — er gehört dem Automaten.
      const nachReparatur = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (nachReparatur?.daten?.grund !== null) {
        befunde.push(`WS-2c: eine neu eingereichte Fassung darf keinen Halt-Grund tragen, erhalten ${JSON.stringify(nachReparatur?.daten?.grund)}`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── Grünfall 5 (WS-2c): DREI Schritte, Grenze mitten in der laufenden Kette ───────
  //
  // Bis WS-2c benutzte kein Fall im Repo mehr als zwei Schritte (QA-Pass 10.09.2026): die
  // Grenze griff immer schon bei der ERSTEN Fortsetzungsentscheidung, „Halt mitten in einer
  // Kette" war damit unbelegt. Hier laufen zwei Schritte automatisch, dann hält
  // grenzen.max_schritte die Kette an — mit persistiertem Grund und konsistentem Cursor.
  {
    const workflowId = `ws2c-drei-schritte-${randomUUID()}`
    const gestartete = []
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(
        basisUrl,
        workflowId,
        [
          gateSchritt('schritt-1', 'schritt-2', { eingaben: [] }),
          gateSchritt('schritt-2', 'schritt-3', { eingaben: [] }),
          gateSchritt('schritt-3', null, { eingaben: [] }),
        ],
        { grenzen: { max_schritte: 2, max_replans: 0 } }
      )
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 150))

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (gestartete.length !== 2) {
        befunde.push(`WS-2c: bei max_schritte 2 erwartet GENAU ZWEI automatisch gelaufene Schritte, erhalten ${gestartete.length}`)
      }
      if (stand?.daten?.status !== 'GESTOPPT' || stand?.daten?.aktiver_schritt_id !== null) {
        befunde.push(`WS-2c: nach erreichtem max_schritte mitten in der Kette erwartet GESTOPPT mit Cursor null, erhalten ${JSON.stringify({ status: stand?.daten?.status, cursor: stand?.daten?.aktiver_schritt_id })}`)
      }
      if (typeof stand?.daten?.grund !== 'string' || !stand.daten.grund.includes('max_schritte')) {
        befunde.push(`(a5): der haltGrenze-Halt muss seinen Grund im Artefakt nennen, erhalten ${JSON.stringify(stand?.daten?.grund)}`)
      }
      if (stand?.daten?.schritte?.[2]?.status !== 'OFFEN' || stand?.daten?.schritte?.[2]?.lauf_id !== null) {
        befunde.push(`WS-2c: der dritte Schritt muss unberührt bleiben, erhalten ${JSON.stringify(stand?.daten?.schritte?.[2])}`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── Grünfall 6 (WS-2c, a5): ein Start räumt den Halt-Grund wieder ab ─────────────
  //
  // Die Gegenrichtung zu allen grund-Fällen oben. Ohne sie wäre „auf null gesetzt, sobald ein
  // Schritt startet" durch ein „wird nie genullt" erfüllbar, und der Mensch läse in WS-3
  // dauerhaft den Grund eines längst behobenen Halts.
  {
    const workflowId = `ws2c-grund-reset-${randomUUID()}`
    let laeufe = 0
    const fuehreAufgabeDurchFn = async () => {
      laeufe += 1
      // Der ERSTE Lauf wird ohne Checkpoint abgelehnt (Heilung: Schritt zurück auf OFFEN,
      // Workflow KLAERUNG_ERFORDERLICH mit Grund), der zweite gelingt. Bewusst am Zähler
      // festgemacht und nicht am Plan: der Workflow bleibt zwischen den beiden Starts
      // UNVERÄNDERT, sonst käme das null auch aus der Normalisierung des eingereichten
      // Körpers und der Fall bewiese nicht, was er behauptet.
      if (laeufe === 1) {
        return { ok: false, stufe: 'kontextpaket', ergebnis: { ok: false, grund: 'unbekannte_rolle', rolle: 'code-reviewr' } }
      }
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: [] })])
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 100))

      const nachHeilung = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (nachHeilung?.daten?.status !== 'KLAERUNG_ERFORDERLICH' || typeof nachHeilung?.daten?.grund !== 'string' || !nachHeilung.daten.grund.includes('kein Checkpoint')) {
        befunde.push(`(a5): auch die Heilung muss ihren Grund im Artefakt hinterlassen, erhalten ${JSON.stringify({ status: nachHeilung?.daten?.status, grund: nachHeilung?.daten?.grund })}`)
      }

      // Zweiter Start auf demselben, unveränderten Artefakt.
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Version 4 ist die VOR dem zweiten Laufstart geschriebene (1 Anlegen, 2 erster Start,
      // 3 Heilung, 4 zweiter Start) — die jüngste ist bereits die Nachbereitung.
      const beimStart = ladeArtefaktVersion(`workflow-${workflowId}`, 4, { basisVerzeichnis, schreiber: () => {} })
      if (beimStart?.daten?.status !== 'LAEUFT' || beimStart?.daten?.grund !== null) {
        befunde.push(`(a5): ein startender Schritt muss den Halt-Grund auf null zurücksetzen, erhalten ${JSON.stringify({ status: beimStart?.daten?.status, grund: beimStart?.daten?.grund })}`)
      }
      if (laeufe !== 2) {
        befunde.push(`(a5): erwartet zwei Läufe (Ablehnung, dann Erfolg), erhalten ${laeufe}`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── Grünfall 3 (WS-2b (6)): ZWINGEND hinter einem erfolgreichen Schritt ──────────
  //
  // Der Cursor wandert auf den ZWINGEND-Schritt, der Workflow geht auf WARTET_FREIGABE,
  // und ein zweiter /starten startet ihn NICHT (409 haltFreigabe). Das ist die Grenze aus
  // E-M3-1, jetzt über den Endpunkt kalibriert und nicht nur über die reine Funktion.
  {
    const workflowId = `ws2b-zwingend-${randomUUID()}`
    const gestartete = []
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [
        gateSchritt('schritt-1', 'schritt-2', { eingaben: [] }),
        gateSchritt('schritt-2', null, { eingaben: [], freigabe: 'ZWINGEND' }),
      ])
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 50))

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (stand?.daten?.status !== 'WARTET_FREIGABE' || stand?.daten?.aktiver_schritt_id !== 'schritt-2') {
        befunde.push(`WS-2b (6): vor einem ZWINGEND-Schritt erwartet WARTET_FREIGABE mit Cursor 'schritt-2', erhalten ${JSON.stringify({ cursor: stand?.daten?.aktiver_schritt_id, status: stand?.daten?.status })}`)
      }
      // (a5): der Automat ist hier von selbst angehalten — der Grund muss die Platte
      // erreichen, sonst ist er nach einem Serverneustart weg (F-202).
      if (typeof stand?.daten?.grund !== 'string' || !stand.daten.grund.includes('ZWINGEND')) {
        befunde.push(`(a5): der ZWINGEND-Halt muss seinen Grund im Workflow-Artefakt hinterlassen, erhalten ${JSON.stringify(stand?.daten?.grund)}`)
      }
      const zweiter = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      const koerper = await zweiter.json()
      if (zweiter.status !== 409 || koerper.art !== 'haltFreigabe') {
        befunde.push(`WS-2b (6): ein ZWINGEND-Schritt erwartet 409 mit art 'haltFreigabe', erhalten ${zweiter.status} (${JSON.stringify(koerper)})`)
      }
      if (gestartete.length !== 1) {
        befunde.push(`WS-2b (6): ein ZWINGEND-Schritt darf nicht gestartet werden, erhalten ${gestartete.length} Läufe`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (3) Heilung einer verwaisten lauf_id — beide Seiten der Bedingung ────────────
  //
  // Die Bedingung ist ENGER als ok === false: F6as verweigereStart schreibt in fünf von
  // sieben Ablehnungszweigen eine reale VERWEIGERT-Wirkungsmarke, bevor starteGateway
  // ok:false zurückgibt. Deshalb zwei kalibrierte Fälle, die sich NUR darin unterscheiden,
  // ob unter der laufId etwas auf der Platte steht. Ohne den zweiten wäre „kein Rücksetzen,
  // wo real ein Artefakt entstanden ist" unbelegt — und ein Rücksetzen auf ok:false allein
  // liefe grün durch.
  {
    // (a) Fachliche Ablehnung OHNE Checkpoint (F5-Fall, z. B. Tippfehler in schritt.rolle):
    //     lauf_id zurück auf null, Schritt zurück auf OFFEN, Workflow KLAERUNG_ERFORDERLICH.
    const workflowId = `ws2b-heilung-${randomUUID()}`
    const fuehreAufgabeDurchFn = async () => ({ ok: false, stufe: 'kontextpaket', ergebnis: { ok: false, grund: 'unbekannte_rolle', rolle: 'code-reviewr' } })
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: [], rolle: 'code-reviewr' })])
      const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      if (antwort.status !== 202) {
        befunde.push(`WS-2b (3): der Start erwartet 202, erhalten ${antwort.status}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 50))

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      const schritt = stand?.daten?.schritte?.[0]
      if (schritt?.status !== 'OFFEN' || schritt?.lauf_id !== null) {
        befunde.push(`WS-2b (3): eine Ablehnung ohne Checkpoint muss den Schritt auf OFFEN mit lauf_id null zurücksetzen, erhalten ${JSON.stringify(schritt)}`)
      }
      if (stand?.daten?.status !== 'KLAERUNG_ERFORDERLICH' || stand?.daten?.aktiver_schritt_id !== 'schritt-1') {
        befunde.push(`WS-2b (3): erwartet Workflow KLAERUNG_ERFORDERLICH mit Cursor auf dem Schritt, erhalten ${JSON.stringify({ cursor: stand?.daten?.aktiver_schritt_id, status: stand?.daten?.status })}`)
      }
      // Der eigentliche Zweck der Heilung: der Schritt ist danach wieder startbar.
      const erneut = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      if (erneut.status !== 202) {
        befunde.push(`WS-2b (3): nach der Heilung muss derselbe Schritt wieder startbar sein, erhalten ${erneut.status} (${await erneut.text()})`)
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    } finally {
      await schliessen()
    }
  }
  {
    // (b) Fachliche Ablehnung MIT geschriebener Wirkungsmarke (F6a-verweigereStart-Fall):
    //     KEIN Rücksetzen — F1s Kette ist append-only, ein OFFEN darüber wäre eine Lüge.
    const workflowId = `ws2b-keine-heilung-${randomUUID()}`
    const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
    const fuehreAufgabeDurchFn = async (laufId) => {
      // Bildet verweigereStart nach: eine reale VERWEIGERT-Wirkungsmarke VOR dem ok:false.
      schreibeWirkungsmarke(laufId, profilReferenz, 'terminal', { ergebnis: 'VERWEIGERT' }, { basisVerzeichnis, schreiber: () => {} })
      return { ok: false, stufe: 'gateway', grund: 'Startfreigabe ABGELEHNT' }
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: [] })])
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 50))

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      const schritt = stand?.daten?.schritte?.[0]
      if (schritt?.status !== 'FEHLGESCHLAGEN' || typeof schritt?.lauf_id !== 'string') {
        befunde.push(`WS-2b (3): eine Ablehnung MIT Wirkungsmarke darf NICHT zurückgesetzt werden (Schritt FEHLGESCHLAGEN, lauf_id bleibt), erhalten ${JSON.stringify(schritt)}`)
      }
      if (stand?.daten?.status !== 'KLAERUNG_ERFORDERLICH') {
        befunde.push(`WS-2b (3): erwartet Workflow KLAERUNG_ERFORDERLICH, erhalten ${JSON.stringify(stand?.daten?.status)}`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── Grünfall 4 (WS-2b (6)): grenzen.max_schritte hält den Workflow an ───────────
  //
  // Die einzige Abbildung in workflowStatusZuAusgang, die auf einen terminalen
  // Nicht-Erfolgs-Status führt — ohne diesen Fall bliebe sie ungeprüft, und ein Vertippen
  // auf ABGESCHLOSSEN liefe grün durch.
  {
    const workflowId = `ws2b-grenze-${randomUUID()}`
    const gestartete = []
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(
        basisUrl,
        workflowId,
        [gateSchritt('schritt-1', 'schritt-2', { eingaben: [] }), gateSchritt('schritt-2', null, { eingaben: [] })],
        { grenzen: { max_schritte: 1, max_replans: 0 } }
      )
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 50))

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (stand?.daten?.status !== 'GESTOPPT' || stand?.daten?.aktiver_schritt_id !== null) {
        befunde.push(`WS-2b (6): bei erreichtem max_schritte erwartet GESTOPPT mit Cursor null, erhalten ${JSON.stringify({ cursor: stand?.daten?.aktiver_schritt_id, status: stand?.daten?.status })}`)
      }
      const zweiter = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      if (zweiter.status !== 409 || gestartete.length !== 1) {
        befunde.push(`WS-2b (6): ein GESTOPPTER Workflow erwartet 409 und keinen zweiten Lauf, erhalten ${zweiter.status} / ${gestartete.length} Läufe`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (4) POST /api/workflows auf einen nicht-OFFENen Workflow → 409 ──────────────
  //
  // Bis WS-2b ersetzte ein zweiter POST die Definition eines Workflows, den der Automat
  // gerade abarbeitet: der Mensch gibt Fassung 1 frei, der Schritt schreibt seinen Ausgang
  // in Fassung 2. Der Grünfall daneben (OFFEN → 201, versionSequenz 2) steht bereits im
  // Abschnitt zu POST /api/workflows oben und bleibt unberührt.
  {
    const workflowId = `ws2b-ersetzen-${randomUUID()}`
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: async () => erfolgreichesErgebnis() })
    try {
      const payload = await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: [] })])
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 50))

      const antwort = await fetch(`${basisUrl}/api/workflows`, { method: 'POST', body: JSON.stringify({ ...payload, ziel: 'Untergeschobene zweite Fassung.' }) })
      const koerper = await antwort.json()
      if (antwort.status !== 409 || koerper.status !== 'ABGESCHLOSSEN') {
        befunde.push(`POST /api/workflows: ein bereits gelaufener Workflow erwartet 409, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }
      // Nichts überschrieben: der letzte Stand trägt weiterhin das ursprüngliche Ziel.
      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (stand?.daten?.ziel === 'Untergeschobene zweite Fassung.') {
        befunde.push('POST /api/workflows: die abgelehnte zweite Fassung wurde trotzdem geschrieben')
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (A) Ersetzbarkeit je Workflow-Status ────────────────────────────────────────
  //
  // Die Regel trennt drei gesperrte von drei erlaubten Zuständen, und beide Seiten
  // brauchen einen Fall: eine reine Rotfall-Prüfung wäre durch ein "sperrt immer"
  // erfüllbar, eine reine Grünfall-Prüfung durch ein "erlaubt immer". Der wichtigste
  // Grünfall ist KLAERUNG_ERFORDERLICH — der motivierende Reparaturzug.
  {
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: async () => erfolgreichesErgebnis() })
    try {
      // Die Zustände werden direkt über registriereWorkflow gesetzt (am Endpunkt vorbei) —
      // sonst müsste jeder Fall über einen echten Lauf erzeugt werden, und der Testfall
      // prüfte dann den Weg dorthin statt der Regel.
      const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
      for (const [status, erwartet] of [
        ['LAEUFT', 409],
        ['WARTET_FREIGABE', 409],
        ['ABGESCHLOSSEN', 409],
        ['OFFEN', 201],
        ['KLAERUNG_ERFORDERLICH', 201],
        ['GESTOPPT', 201],
      ]) {
        const workflowId = `ws2b-ersetzbar-${randomUUID()}`
        const bestand = gateWorkflow([gateSchritt('schritt-1', null, { eingaben: [] })], {
          workflow_id: workflowId,
          auftrag_id: auftragId,
          status,
          // ABGESCHLOSSEN und GESTOPPT verlangen laut Cursor-Festlegung aktiver_schritt_id null.
          ...(status === 'ABGESCHLOSSEN' || status === 'GESTOPPT' ? { aktiver_schritt_id: null } : {}),
        })
        registriereWorkflow(bestand, profilReferenz, { basisVerzeichnis, schreiber: () => {} })

        // Der eingereichte Body trägt IMMER 'OFFEN' — sonst prüfte dieser Fall zwei Variablen
        // auf einmal (Bestandsstatus und Body-Status) und die Body-Regel unten wäre nicht mehr
        // von der Bestandsregel unterscheidbar.
        const antwort = await fetch(`${basisUrl}/api/workflows`, {
          method: 'POST',
          body: JSON.stringify({ ...bestand, status: 'OFFEN', aktiver_schritt_id: 'schritt-1', ziel: 'Zweite Fassung des Menschen.' }),
        })
        if (antwort.status !== erwartet) {
          befunde.push(`POST /api/workflows: Bestand mit status '${status}' erwartet ${erwartet}, erhalten ${antwort.status} (${await antwort.text()})`)
          continue
        }
        const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
        const uebernommen = stand?.daten?.ziel === 'Zweite Fassung des Menschen.'
        if (erwartet === 201 && !uebernommen) {
          befunde.push(`POST /api/workflows: Bestand mit status '${status}' wurde angenommen, aber die neue Fassung steht nicht auf der Platte`)
        }
        if (erwartet === 409 && uebernommen) {
          befunde.push(`POST /api/workflows: Bestand mit status '${status}' wurde abgelehnt, aber die neue Fassung wurde trotzdem geschrieben`)
        }
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (A) Der eingereichte status darf sich nicht selbst aussperren ──────────────
  //
  // Ohne diese Regel genügte EINE falsche Feldangabe: eine Fassung mit status
  // 'ABGESCHLOSSEN' wurde mit 201 angenommen und war danach weder startbar (Regel 0)
  // noch ersetzbar (der Bestand ist jetzt gesperrt). Das hebelte die zentrale Zusage
  // dieser Runde aus — "aus jedem Halt heraus über eine neue Fassung".
  {
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: async () => erfolgreichesErgebnis() })
    try {
      for (const [status, erwartet] of [
        ['LAEUFT', 400],
        ['WARTET_FREIGABE', 400],
        ['ABGESCHLOSSEN', 400],
        ['OFFEN', 201],
        ['KLAERUNG_ERFORDERLICH', 201],
        ['GESTOPPT', 201],
      ]) {
        const workflowId = `ws2b-bodystatus-${randomUUID()}`
        const payload = gateWorkflow([gateSchritt('schritt-1', null, { eingaben: [] })], {
          workflow_id: workflowId,
          auftrag_id: auftragId,
          status,
          ...(status === 'ABGESCHLOSSEN' || status === 'GESTOPPT' ? { aktiver_schritt_id: null } : {}),
        })
        const antwort = await fetch(`${basisUrl}/api/workflows`, { method: 'POST', body: JSON.stringify(payload) })
        if (antwort.status !== erwartet) {
          befunde.push(`POST /api/workflows: eingereichter status '${status}' erwartet ${erwartet}, erhalten ${antwort.status} (${await antwort.text()})`)
        }
        if (erwartet === 400 && ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} }) !== null) {
          befunde.push(`POST /api/workflows: eingereichter status '${status}' wurde abgelehnt, aber trotzdem geschrieben`)
        }
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (A) Ein UNGÜLTIGER Bestand ist immer ersetzbar, auch in einem gesperrten Status ──
  //
  // Sonst wäre ein Workflow, den eine neu hinzugekommene Validatorregel ungültig macht,
  // dauerhaft unerreichbar: der Startendpunkt lehnt ihn beim Laden ab (409), und die
  // Ersatzfassung scheiterte am Status. Zusammenführungen waren bis WS-2b gültig UND
  // startbar — der Fall ist real, nicht konstruiert.
  {
    const workflowId = `ws2b-ungueltiger-bestand-${randomUUID()}`
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn: async () => erfolgreichesErgebnis() })
    try {
      // Am Endpunkt vorbei angelegt: eine Zusammenführung im Status LAEUFT.
      registriereWorkflow(
        gateWorkflow(
          [
            gateSchritt('schritt-1', 'schritt-3', { eingaben: [] }),
            gateSchritt('schritt-2', 'schritt-3', { eingaben: [] }),
            gateSchritt('schritt-3', null, { eingaben: [] }),
          ],
          { workflow_id: workflowId, auftrag_id: auftragId, status: 'LAEUFT' }
        ),
        leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json')),
        { basisVerzeichnis, schreiber: () => {} }
      )
      const gestartet = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      if (gestartet.status !== 409) {
        befunde.push(`WS-2b: ein Bestand mit Zusammenführung erwartet beim Start 409, erhalten ${gestartet.status}`)
      }
      const ersetzt = await fetch(`${basisUrl}/api/workflows`, {
        method: 'POST',
        body: JSON.stringify(gateWorkflow([gateSchritt('schritt-1', null, { eingaben: [] })], { workflow_id: workflowId, auftrag_id: auftragId })),
      })
      if (ersetzt.status !== 201) {
        befunde.push(`WS-2b: ein UNGÜLTIGER Bestand muss auch in einem gesperrten Status ersetzbar sein, erhalten ${ersetzt.status} (${await ersetzt.text()})`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (A) Der motivierende Fall, in einem Zug: Tippfehler → Heilung → Korrektur → Start ──
  //
  // Das ist der Grund, aus dem die 409-Bedingung verengt wurde. Vorher endete diese Kette
  // im vierten Schritt in einem 409, und der Tippfehler war nicht mehr korrigierbar.
  {
    const workflowId = `ws2b-reparatur-${randomUUID()}`
    let laeufe = 0
    const fuehreAufgabeDurchFn = async (_laufId, _profilReferenz, eingaben) => {
      laeufe += 1
      if (eingaben.rolle !== 'code-reviewer') {
        return { ok: false, stufe: 'kontextpaket', ergebnis: { ok: false, grund: 'unbekannte_rolle', rolle: eingaben.rolle } }
      }
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      const kaputt = await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: [], rolle: 'code-reviewr' })])
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 50))

      const nachHeilung = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (nachHeilung?.daten?.status !== 'KLAERUNG_ERFORDERLICH') {
        befunde.push(`WS-2b-Reparatur: nach der Heilung erwartet KLAERUNG_ERFORDERLICH, erhalten ${JSON.stringify(nachHeilung?.daten?.status)}`)
      }

      // Die Korrektur: dieselbe workflow_id, richtige Rolle. Vor der Verengung: 409.
      const korrigiert = {
        ...kaputt,
        status: 'KLAERUNG_ERFORDERLICH',
        schritte: [{ ...kaputt.schritte[0], rolle: 'code-reviewer' }],
      }
      const angenommen = await fetch(`${basisUrl}/api/workflows`, { method: 'POST', body: JSON.stringify(korrigiert) })
      if (angenommen.status !== 201) {
        befunde.push(`WS-2b-Reparatur: die korrigierte Fassung erwartet 201, erhalten ${angenommen.status} (${await angenommen.text()})`)
      }

      const erneut = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      if (erneut.status !== 202) {
        befunde.push(`WS-2b-Reparatur: nach der Korrektur muss der Schritt starten, erhalten ${erneut.status} (${await erneut.text()})`)
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
      const fertig = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (fertig?.daten?.status !== 'ABGESCHLOSSEN' || laeufe !== 2) {
        befunde.push(`WS-2b-Reparatur: erwartet ABGESCHLOSSEN nach zwei Läufen, erhalten status ${JSON.stringify(fertig?.daten?.status)} / ${laeufe} Läufe`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (B) Stale LAEUFT: Serverneustart mitten im Schritt ──────────────────────────
  //
  // Nachgebildet, wie es real entsteht: ein Workflow, dessen Schritt auf LAEUFT mit
  // lauf_id steht, während die Serverinstanz nichts davon weiß (laufAktiv === false —
  // eine frische Instanz kennt keine Läufe früherer Prozesse, F-128). Ohne die Heilung
  // liefe der Aufruf in Regel 3 und der Workflow bliebe dauerhaft auf 409 stehen.
  {
    const workflowId = `ws2b-stale-${randomUUID()}`
    const toteLaufId = `tote-lauf-id-${randomUUID()}`
    let starts = 0
    const fuehreAufgabeDurchFn = async () => {
      starts += 1
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      registriereWorkflow(
        gateWorkflow([gateSchritt('schritt-1', null, { eingaben: [], status: 'LAEUFT', lauf_id: toteLaufId })], {
          workflow_id: workflowId,
          auftrag_id: auftragId,
          status: 'LAEUFT',
        }),
        leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json')),
        { basisVerzeichnis, schreiber: () => {} }
      )

      const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      const koerper = await antwort.json()
      if (antwort.status !== 409 || koerper.stale !== true) {
        befunde.push(`WS-2b (B): ein stale LAEUFT erwartet 409 mit stale:true, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }
      if (starts !== 0) {
        befunde.push(`WS-2b (B): ein stale LAEUFT darf nichts starten, erhalten ${starts} Läufe`)
      }

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (stand?.daten?.status !== 'KLAERUNG_ERFORDERLICH') {
        befunde.push(`WS-2b (B): der Stale-State muss als KLAERUNG_ERFORDERLICH festgeschrieben werden, erhalten ${JSON.stringify(stand?.daten?.status)}`)
      }
      // Der Schritt bleibt unangetastet — unter seiner lauf_id kann real ein Lauf gelaufen
      // sein, dessen Ausgang niemand eingesammelt hat. Das ist der Unterschied zur Heilung
      // nach einem Laufende, wo BELEGT ist, dass nichts geschrieben wurde.
      const schritt = stand?.daten?.schritte?.[0]
      if (schritt?.lauf_id !== toteLaufId || schritt?.status !== 'LAEUFT') {
        befunde.push(`WS-2b (B): der betroffene Schritt darf NICHT angefasst werden (lauf_id und status bleiben), erhalten ${JSON.stringify(schritt)}`)
      }
      // Und der Zustand ist jetzt reparierbar: KLAERUNG_ERFORDERLICH ist nach (A) ersetzbar.
      const reparatur = await fetch(`${basisUrl}/api/workflows`, {
        method: 'POST',
        body: JSON.stringify(gateWorkflow([gateSchritt('schritt-1', null, { eingaben: [] })], { workflow_id: workflowId, auftrag_id: auftragId })),
      })
      if (reparatur.status !== 201) {
        befunde.push(`WS-2b (B): nach der Stale-Heilung muss eine neue Fassung angenommen werden, erhalten ${reparatur.status}`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (C) Ein technischer WURF heilt, wenn nichts entstand — und nur dann ─────────
  {
    // (a) Wurf, bevor irgendetwas geschrieben wurde: derselbe Befund wie bei einer
    //     F5-Ablehnung — es ist nichts passiert.
    const workflowId = `ws2b-wurf-${randomUUID()}`
    const fuehreAufgabeDurchFn = async () => {
      throw new Error('Vorbedingungsverletzung vor dem ersten Schreibvorgang')
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: [] })])
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 50))

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      const schritt = stand?.daten?.schritte?.[0]
      if (schritt?.status !== 'OFFEN' || schritt?.lauf_id !== null) {
        befunde.push(`WS-2b (C): ein Wurf OHNE geschriebenes Verzeichnis muss heilen, erhalten ${JSON.stringify(schritt)}`)
      }
      if (stand?.daten?.status !== 'KLAERUNG_ERFORDERLICH') {
        befunde.push(`WS-2b (C): nach einem geheilten Wurf erwartet KLAERUNG_ERFORDERLICH, erhalten ${JSON.stringify(stand?.daten?.status)}`)
      }
    } finally {
      await schliessen()
    }
  }
  {
    // (b) Wurf NACH einer geschriebenen Wirkungsmarke: keine Heilung. Das ist die Grenze,
    //     ohne die (C) zu einem "heilt immer bei Misserfolg" verkäme.
    const workflowId = `ws2b-wurf-mit-marke-${randomUUID()}`
    const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
    const fuehreAufgabeDurchFn = async (laufId) => {
      schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })
      throw new Error('Prozessfehler nach dem run_prepared')
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: [] })])
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 50))

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      const schritt = stand?.daten?.schritte?.[0]
      if (schritt?.status !== 'FEHLGESCHLAGEN' || typeof schritt?.lauf_id !== 'string') {
        befunde.push(`WS-2b (C): ein Wurf NACH einer Wirkungsmarke darf NICHT heilen, erhalten ${JSON.stringify(schritt)}`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (b1) POST /api/workflows/<id>/freigabe: der Ausweg aus WARTET_FREIGABE (AK7) ──
  //
  // Bis (b1) war WARTET_FREIGABE der einzige Halt ohne jeden Weg zurück (F-207). Der
  // Grünfall unten ist deshalb die eigentliche Zusage von AK7: der Automat hält vor dem
  // ZWINGEND-Schritt an, EINE menschliche Freigabe löst den Halt, und die Kette läuft bis
  // zum Ende weiter. Die Rotfälle daneben sind die Grenzen, die der Endpunkt behauptet —
  // ohne sie wäre „die Freigabe startet" durch ein „alles startet" erfüllbar.
  //
  // Hilfsfunktion für beide Zweige: ein Workflow, dessen zweiter Schritt ZWINGEND ist.
  /**
   * Legt einen zweistufigen Workflow mit ZWINGEND-Schritt 2 an und fährt ihn bis zum Halt.
   * @param basisUrl - Basis-URL des Testservers
   * @param workflowId - workflow_id
   * @returns nichts; der Workflow steht danach auf WARTET_FREIGABE
   */
  async function fahreBisZumFreigabeHalt(basisUrl, workflowId) {
    await legeWorkflowAn(basisUrl, workflowId, [
      gateSchritt('schritt-1', 'schritt-2', { eingaben: [] }),
      gateSchritt('schritt-2', null, { eingaben: [], freigabe: 'ZWINGEND' }),
    ])
    await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  const freigebe = (basisUrl, workflowId, koerper) =>
    fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, { method: 'POST', body: JSON.stringify(koerper) })

  // ─── (b1) Grünfall FREIGEGEBEN: die Kette läuft nach der Freigabe zu Ende ────────
  {
    const workflowId = `ws2c-freigabe-gruen-${randomUUID()}`
    const gestartete = []
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await fahreBisZumFreigabeHalt(basisUrl, workflowId)
      const imHalt = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (imHalt?.daten?.status !== 'WARTET_FREIGABE' || gestartete.length !== 1) {
        befunde.push(`AK7-Vorbereitung: erwartet WARTET_FREIGABE nach genau einem Lauf, erhalten ${JSON.stringify({ status: imHalt?.daten?.status, laeufe: gestartete.length })}`)
      }

      const antwort = await freigebe(basisUrl, workflowId, { schrittId: 'schritt-2', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate: geprüft und freigegeben.' })
      const koerper = await antwort.json()
      if (antwort.status !== 202 || koerper.schrittId !== 'schritt-2' || typeof koerper.laufId !== 'string') {
        befunde.push(`AK7: FREIGEGEBEN erwartet 202 mit { workflowId, schrittId, laufId }, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }
      await new Promise((resolve) => setTimeout(resolve, 100))

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (gestartete.length !== 2) {
        befunde.push(`AK7: nach der Freigabe muss der ZWINGEND-Schritt real laufen, erhalten ${gestartete.length} Läufe`)
      }
      if (stand?.daten?.status !== 'ABGESCHLOSSEN' || stand?.daten?.schritte?.[1]?.status !== 'ERFOLGREICH') {
        befunde.push(`AK7: nach der Freigabe muss die Kette zu Ende laufen, erhalten ${JSON.stringify({ status: stand?.daten?.status, s2: stand?.daten?.schritte?.[1]?.status })}`)
      }
      // Die Freigabe steht am SCHRITT, nicht als Seiteneffekt im Serverspeicher — sonst wäre
      // sie nach einem Neustart weg und der Halt käme zurück.
      if (stand?.daten?.schritte?.[1]?.freigabe_erteilt !== true) {
        befunde.push(`AK7: freigabe_erteilt muss am Schritt festgeschrieben sein, erhalten ${JSON.stringify(stand?.daten?.schritte?.[1])}`)
      }
      // 'freigabe' bleibt unverändertes Plandatum (AK7 Satz 2, F-195) — der Endpunkt schreibt
      // die Entscheidung daneben, nicht in den Plan hinein.
      if (stand?.daten?.schritte?.[1]?.freigabe !== 'ZWINGEND') {
        befunde.push(`AK7: 'freigabe' ist Plandatum und darf sich durch die Freigabe NICHT ändern, erhalten ${JSON.stringify(stand?.daten?.schritte?.[1]?.freigabe)}`)
      }
      // Und die Entscheidung selbst ist als Kernartefakt festgehalten (AK7 Satz 2).
      const entscheidung = ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-schritt-2`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (entscheidung?.daten?.ergebnis !== 'FREIGEGEBEN' || entscheidung?.daten?.begruendung !== 'Gate: geprüft und freigegeben.') {
        befunde.push(`AK7: die Freigabe muss als Entscheidungsartefakt mit ergebnis und begruendung festgehalten werden, erhalten ${JSON.stringify(entscheidung?.daten)}`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (b1) ABGELEHNT: GESTOPPT, und der Reparaturpfad steht offen ─────────────────
  {
    const workflowId = `ws2c-freigabe-abgelehnt-${randomUUID()}`
    const gestartete = []
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await fahreBisZumFreigabeHalt(basisUrl, workflowId)
      const antwort = await freigebe(basisUrl, workflowId, { schrittId: 'schritt-2', entscheidung: 'ABGELEHNT', begruendung: 'Gate: so nicht.' })
      if (antwort.status !== 200) {
        befunde.push(`AK7: ABGELEHNT erwartet 200, erhalten ${antwort.status} (${await antwort.text()})`)
      }
      await new Promise((resolve) => setTimeout(resolve, 50))

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (stand?.daten?.status !== 'GESTOPPT' || stand?.daten?.aktiver_schritt_id !== null) {
        befunde.push(`AK7: nach ABGELEHNT erwartet GESTOPPT mit Cursor null, erhalten ${JSON.stringify({ status: stand?.daten?.status, cursor: stand?.daten?.aktiver_schritt_id })}`)
      }
      if (typeof stand?.daten?.grund !== 'string' || !stand.daten.grund.includes('Gate: so nicht.')) {
        befunde.push(`AK7: der Grund einer Ablehnung muss die Begründung des Menschen tragen, erhalten ${JSON.stringify(stand?.daten?.grund)}`)
      }
      if (gestartete.length !== 1) {
        befunde.push(`AK7: eine Ablehnung darf keinen Lauf starten, erhalten ${gestartete.length} Läufe`)
      }
      if (stand?.daten?.schritte?.[1]?.freigabe_erteilt === true) {
        befunde.push('AK7: eine Ablehnung darf freigabe_erteilt nicht setzen')
      }
      const entscheidung = ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-schritt-2`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (entscheidung?.daten?.ergebnis !== 'ABGELEHNT') {
        befunde.push(`AK7: auch die Ablehnung muss als Entscheidungsartefakt festgehalten werden, erhalten ${JSON.stringify(entscheidung?.daten)}`)
      }
      // Der Punkt, für den GESTOPPT und nicht KLAERUNG_ERFORDERLICH gewählt wurde: GESTOPPT
      // steht NICHT in GESPERRTE_ERSETZUNGS_STATUS, der Mensch kommt also mit einer
      // korrigierten Fassung weiter. Das ist der Reparaturpfad, nicht bloß die Erlaubnis.
      const repariert = await fetch(`${basisUrl}/api/workflows`, {
        method: 'POST',
        body: JSON.stringify(
          gateWorkflow([gateSchritt('schritt-1', null, { eingaben: [], status: 'ERFOLGREICH', lauf_id: gestartete[0] })], {
            workflow_id: workflowId,
            auftrag_id: auftragId,
            status: 'KLAERUNG_ERFORDERLICH',
          })
        ),
      })
      if (repariert.status !== 201) {
        befunde.push(`AK7: nach einer Ablehnung muss eine korrigierte Fassung angenommen werden, erhalten ${repariert.status} (${await repariert.text()})`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (b1) Die Ablehnungsgründe des Freigabe-Endpunkts ────────────────────────────
  //
  // Jeder Fall prüft zusätzlich, dass NICHTS geschrieben wurde: weder ein
  // Entscheidungsartefakt noch eine neue Workflow-Version. Ein Statuscode allein belegt
  // „vor jeder Zustandsänderung" nicht.
  {
    const workflowId = `ws2c-freigabe-rot-${randomUUID()}`
    const gestartete = []
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await fahreBisZumFreigabeHalt(basisUrl, workflowId)
      const versionenImHalt = (() => {
        let n = 1
        while (ladeArtefaktVersion(`workflow-${workflowId}`, n + 1, { basisVerzeichnis, schreiber: () => {} }) !== null) n += 1
        return n
      })()

      const gueltigerKoerper = { schrittId: 'schritt-2', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate.' }
      const rotfaelle = [
        ['unbekannter Workflow → 404', `gibt-es-nicht-${randomUUID()}`, gueltigerKoerper, 404],
        ['workflowId mit Ausbruchsversuch → 400', 'a%2Fb', gueltigerKoerper, 400],
        ['Stale-Schutz: falsche schrittId → 409', workflowId, { ...gueltigerKoerper, schrittId: 'schritt-1' }, 409],
        ['schrittId fehlt → 400', workflowId, { entscheidung: 'FREIGEGEBEN', begruendung: 'Gate.' }, 400],
        ['unbekannte entscheidung → 400', workflowId, { ...gueltigerKoerper, entscheidung: 'VIELLEICHT' }, 400],
        ['begruendung fehlt → 400', workflowId, { schrittId: 'schritt-2', entscheidung: 'FREIGEGEBEN' }, 400],
        ['begruendung nur Leerzeichen → 400', workflowId, { ...gueltigerKoerper, begruendung: '   ' }, 400],
        // Reviewer-Pass 10.09.2026, V4: zwei Ablehnungsgründe, die der Endpunkt behauptet und
        // die bis dahin keinen Rotfall hatten. Die schrittId-Zeichenregel ist keine Theorie —
        // schritt_id ist im Schema nur „nicht-leerer String" und geht hier über die
        // Entscheidungs-Artefakt-ID in einen Dateisystempfad ein; ohne sie wirft der
        // Checkpoint Store aus einem async-Handler, und das ist Prozesstod statt Antwort.
        ['schrittId mit Ausbruchsversuch → 400', workflowId, { ...gueltigerKoerper, schrittId: '../ausbruch' }, 400],
        ['schrittId mit Schrägstrich → 400', workflowId, { ...gueltigerKoerper, schrittId: 'a/b' }, 400],
      ]
      for (const [name, zielId, koerper, erwartet] of rotfaelle) {
        const antwort = await fetch(`${basisUrl}/api/workflows/${zielId === workflowId ? encodeURIComponent(zielId) : zielId}/freigabe`, {
          method: 'POST',
          body: JSON.stringify(koerper),
        })
        if (antwort.status !== erwartet) {
          befunde.push(`AK7-Rotfall (${name}): erwartet ${erwartet}, erhalten ${antwort.status} (${await antwort.text()})`)
        }
      }
      // Body-Randfälle: keiner endet in einem 500 oder Prozesstod (Muster POST /api/workflows).
      for (const [name, roh] of [
        ['leerer Body', ''],
        ['kaputtes JSON', '{'],
        ['Wurzel ist null', 'null'],
        ['Wurzel ist ein Array', '[]'],
      ]) {
        const antwort = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, { method: 'POST', body: roh })
        if (antwort.status !== 400) {
          befunde.push(`AK7-Rotfall (${name}): erwartet 400, erhalten ${antwort.status}`)
        }
      }
      const lebtNoch = await fetch(`${basisUrl}/api/workflows`)
      if (lebtNoch.status !== 200) {
        befunde.push(`AK7-Rotfall: der Server antwortet nach den Body-Randfällen nicht mehr mit 200, erhalten ${lebtNoch.status}`)
      }

      // Ein Workflow, der gar nicht auf eine Freigabe wartet, wird ebenfalls abgelehnt.
      const offenerId = `ws2c-freigabe-offen-${randomUUID()}`
      await legeWorkflowAn(basisUrl, offenerId, [gateSchritt('schritt-1', null, { eingaben: [] })])
      const falscherStatus = await freigebe(basisUrl, offenerId, { schrittId: 'schritt-1', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate.' })
      if (falscherStatus.status !== 409) {
        befunde.push(`AK7-Rotfall (Workflow wartet nicht auf eine Freigabe → 409): erhalten ${falscherStatus.status} (${await falscherStatus.text()})`)
      }
      if (ladeArtefaktVersion(`entscheidung-workflow-${offenerId}-schritt-1`, undefined, { basisVerzeichnis, schreiber: () => {} }) !== null) {
        befunde.push('AK7-Rotfall: ein abgelehnter Freigabeversuch hat trotzdem ein Entscheidungsartefakt geschrieben')
      }

      if (gestartete.length !== 1) {
        befunde.push(`AK7-Rotfall: kein abgelehnter Freigabeversuch darf einen Lauf starten, erhalten ${gestartete.length} Läufe`)
      }
      if (ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-schritt-2`, undefined, { basisVerzeichnis, schreiber: () => {} }) !== null) {
        befunde.push('AK7-Rotfall: ein abgelehnter Freigabeversuch hat trotzdem ein Entscheidungsartefakt geschrieben')
      }
      if (ladeArtefaktVersion(`workflow-${workflowId}`, versionenImHalt + 1, { basisVerzeichnis, schreiber: () => {} }) !== null) {
        befunde.push('AK7-Rotfall: ein abgelehnter Freigabeversuch hat trotzdem eine neue Workflow-Version geschrieben')
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (b1) Der Body erteilt sich keine Freigabe selbst ───────────────────────────
  //
  // Ohne diese Zusage wäre der Freigabe-Endpunkt vollständig umgehbar: ein POST
  // /api/workflows mit freigabe_erteilt: true auf einem ZWINGEND-Schritt startete ihn
  // beim nächsten /starten, ohne dass je eine Entscheidung festgehalten wurde. Das ist
  // AK7 Satz 2 („die erteilte Freigabe wird als Entscheidungsartefakt festgehalten und
  // ist die EINZIGE Auflösung") und ARCHITECTURE.md §3.
  {
    const workflowId = `ws2c-selbstfreigabe-${randomUUID()}`
    const gestartete = []
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      const antwort = await fetch(`${basisUrl}/api/workflows`, {
        method: 'POST',
        body: JSON.stringify(
          gateWorkflow([gateSchritt('schritt-1', null, { eingaben: [], freigabe: 'ZWINGEND', freigabe_erteilt: true })], {
            workflow_id: workflowId,
            auftrag_id: auftragId,
          })
        ),
      })
      if (antwort.status !== 201) {
        befunde.push(`(b1) Selbstfreigabe: die Fassung selbst ist gültig und wird angenommen, erhalten ${antwort.status} (${await antwort.text()})`)
      }
      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (stand?.daten?.schritte?.[0]?.freigabe_erteilt !== undefined) {
        befunde.push(`(b1) Selbstfreigabe: ein eingereichtes freigabe_erteilt darf NICHT übernommen werden, erhalten ${JSON.stringify(stand?.daten?.schritte?.[0]?.freigabe_erteilt)}`)
      }
      // Und die Wirkung, nicht nur das Feld: der Schritt hält weiterhin an.
      const gestartet = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      const koerper = await gestartet.json()
      if (gestartet.status !== 409 || koerper.art !== 'haltFreigabe' || gestartete.length !== 0) {
        befunde.push(
          `(b1) Selbstfreigabe: ein selbst erteiltes freigabe_erteilt darf keinen ZWINGEND-Schritt starten, erhalten ${gestartet.status} (${JSON.stringify(koerper)}) / ${gestartete.length} Läufe`
        )
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (b1) D13: eine Freigabe startet nicht neben einem laufenden Schritt ─────────
  {
    const workflowId = `ws2c-freigabe-d13-${randomUUID()}`
    const zweiterId = `ws2c-freigabe-d13-b-${randomUUID()}`
    const gestartete = []
    let gibFrei
    const haengt = new Promise((resolve) => {
      gibFrei = resolve
    })
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      if (gestartete.length === 2) await haengt
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      // Workflow A fährt in den Freigabe-Halt; Workflow B belegt danach D13 mit einem
      // hängenden Lauf. Die Freigabe auf A muss daran scheitern — sonst liefen zwei
      // Arbeitsstränge über einen Pfad, der die Sperre nicht kennt.
      await fahreBisZumFreigabeHalt(basisUrl, workflowId)
      await legeWorkflowAn(basisUrl, zweiterId, [gateSchritt('schritt-1', null, { eingaben: [] })])
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(zweiterId)}/starten`, { method: 'POST' })
      await new Promise((resolve) => setTimeout(resolve, 50))

      const antwort = await freigebe(basisUrl, workflowId, { schrittId: 'schritt-2', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate.' })
      const grund = (await antwort.json()).grund ?? ''
      // Der Text muss zusätzlich sagen, dass auch die ENTSCHEIDUNG nicht abgelegt wurde: dieser
      // Endpunkt verbindet zwei Akte, und eine Meldung über eine fremde laufId sagt das von
      // sich aus nicht (QA-Pass 10.09.2026, Befund 9).
      if (antwort.status !== 409 || !grund.includes('(D13)') || !grund.includes('NICHT festgehalten')) {
        befunde.push(`AK7/D13: eine Freigabe bei aktivem Lauf erwartet 409 mit D13-Grund und dem Hinweis auf die nicht festgehaltene Entscheidung, erhalten ${antwort.status} (${grund})`)
      }
      if (gestartete.length !== 2) {
        befunde.push(`AK7/D13: die abgelehnte Freigabe darf keinen dritten Lauf gestartet haben, erhalten ${gestartete.length}`)
      }
    } finally {
      gibFrei()
      await new Promise((resolve) => setTimeout(resolve, 50))
      await schliessen()
    }
  }

  // ─── (b1) Ein Automaten-Ausgang überschreibt ein bestehendes GESTOPPT NICHT ──────
  //
  // Die Zusage, für die haltGestoppt gebaut ist. Nachgebildet, wie es real entsteht
  // (und ab (b2) über POST .../stoppen wirklich entsteht): Schritt 1 läuft noch, der
  // Workflow geht in der Zwischenzeit auf GESTOPPT, dann kommt das Laufende. Die
  // Nachbereitung lädt frisch, sieht GESTOPPT und schreibt es zurück — statt
  // KLAERUNG_ERFORDERLICH, das wieder fortsetzbar wäre und den Stopp aufhöbe.
  {
    const workflowId = `ws2c-gestoppt-bleibt-${randomUUID()}`
    const gestartete = []
    let gibFrei
    const haengt = new Promise((resolve) => {
      gibFrei = resolve
    })
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      await haengt
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [
        gateSchritt('schritt-1', 'schritt-2', { eingaben: [] }),
        gateSchritt('schritt-2', null, { eingaben: [] }),
      ])
      const start = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      const laufId = (await start.json()).laufId

      // Der Stopp wird hier direkt geschrieben (am Endpunkt vorbei — den baut (b2)), damit
      // dieser Fall die REGEL prüft und nicht den Weg zu ihr.
      const laufender = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      registriereWorkflow(
        { ...laufender.daten, status: 'GESTOPPT', aktiver_schritt_id: 'schritt-1', grund: 'Mensch hat gestoppt (Gate-Fixture).' },
        leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json')),
        { basisVerzeichnis, schreiber: () => {} }
      )

      gibFrei()
      await new Promise((resolve) => setTimeout(resolve, 150))

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (stand?.daten?.status !== 'GESTOPPT') {
        befunde.push(`(b1): ein Automaten-Ausgang darf ein bestehendes GESTOPPT NICHT überschreiben, erhalten ${JSON.stringify(stand?.daten?.status)}`)
      }
      if (stand?.daten?.grund !== 'Mensch hat gestoppt (Gate-Fixture).') {
        befunde.push(`(b1): der Grund des Menschen muss den Automaten-Ausgang überleben, erhalten ${JSON.stringify(stand?.daten?.grund)}`)
      }
      if (stand?.daten?.aktiver_schritt_id !== 'schritt-1') {
        befunde.push(`(b1): haltGestoppt darf den Cursor nicht verschieben, erhalten ${JSON.stringify(stand?.daten?.aktiver_schritt_id)}`)
      }
      // Der Schritt bekommt trotzdem seinen tatsächlichen Ausgang — der Stopp friert den
      // Workflow ein, er verschweigt nicht, was gelaufen ist.
      //
      // Die status-Prüfung ist der Unterschied zwischen „der Stopp hat gehalten" und „die
      // Nachbereitung ist stumm ausgefallen" (Reviewer-Pass 10.09.2026, K3): die Fixture
      // schreibt den Schritt mit status LAEUFT fest, ERFOLGREICH kann nur aus einem real
      // gelaufenen Nachbereitungsschreibvorgang stammen. Ohne sie wären alle übrigen
      // Assertions dieses Falls schon durch die Fixture selbst erfüllt.
      if (stand?.daten?.schritte?.[0]?.status !== 'ERFOLGREICH' || stand?.daten?.schritte?.[0]?.lauf_id !== laufId) {
        befunde.push(`(b1): der gelaufene Schritt muss seinen tatsächlichen Ausgang bekommen, erhalten ${JSON.stringify(stand?.daten?.schritte?.[0])}`)
      }
      if (gestartete.length !== 1 || stand?.daten?.schritte?.[1]?.status !== 'OFFEN') {
        befunde.push(`(b1): nach einem Stopp darf Schritt 2 NICHT starten, erhalten ${gestartete.length} Läufe / ${JSON.stringify(stand?.daten?.schritte?.[1]?.status)}`)
      }
    } finally {
      gibFrei()
      await new Promise((resolve) => setTimeout(resolve, 50))
      await schliessen()
    }
  }

  // ─── (b1) Ein GESTOPPT überlebt auch die HEILUNG eines gescheiterten Laufs ──────
  //
  // Der zweite Schreibpfad, den der Automaten-Ausgang haltGestoppt NICHT abdeckt
  // (Reviewer-Pass 10.09.2026, K1): die Heilung einer verwaisten lauf_id schreibt
  // KLAERUNG_ERFORDERLICH hart, ohne ermittleNaechstenSchritt zu fragen. Ohne den Schutz
  // in schreibeWorkflowFortschritt machte ein heilbar gescheiterter Lauf aus dem Stopp des
  // Menschen wieder einen fortsetzbaren Workflow — genau der Defekt, eine Verzweigung
  // neben dem, den (b1) beseitigt.
  {
    const workflowId = `ws2c-gestoppt-heilung-${randomUUID()}`
    let gibFrei
    const haengt = new Promise((resolve) => {
      gibFrei = resolve
    })
    // Scheitert OHNE Checkpoint → heilbar (Muster: der F5-Ablehnungsfall oben).
    const fuehreAufgabeDurchFn = async () => {
      await haengt
      return { ok: false, stufe: 'kontextpaket', ergebnis: { ok: false, grund: 'unbekannte_rolle', rolle: 'code-reviewr' } }
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [
        gateSchritt('schritt-1', 'schritt-2', { eingaben: [] }),
        gateSchritt('schritt-2', null, { eingaben: [] }),
      ])
      await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })

      const laufender = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      registriereWorkflow(
        { ...laufender.daten, status: 'GESTOPPT', aktiver_schritt_id: 'schritt-1', grund: 'Mensch hat gestoppt (Heilungsfall).' },
        leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json')),
        { basisVerzeichnis, schreiber: () => {} }
      )
      gibFrei()
      await new Promise((resolve) => setTimeout(resolve, 150))

      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (stand?.daten?.status !== 'GESTOPPT' || stand?.daten?.grund !== 'Mensch hat gestoppt (Heilungsfall).') {
        befunde.push(
          `(b1) K1: auch die HEILUNG darf ein bestehendes GESTOPPT nicht überschreiben, erhalten ${JSON.stringify({ status: stand?.daten?.status, grund: stand?.daten?.grund })}`
        )
      }
      // Die Schrittfelder gelten trotzdem: die Heilung setzt den Schritt zurück, damit er nach
      // einer Wiederaufnahme startbar wäre. Eingefroren ist die Workflow-Ebene, nicht der Schritt.
      if (stand?.daten?.schritte?.[0]?.status !== 'OFFEN' || stand?.daten?.schritte?.[0]?.lauf_id !== null) {
        befunde.push(`(b1) K1: die Heilung des Schritts muss trotzdem wirken, erhalten ${JSON.stringify(stand?.daten?.schritte?.[0])}`)
      }
    } finally {
      gibFrei()
      await new Promise((resolve) => setTimeout(resolve, 50))
      await schliessen()
    }
  }

  // ─── (b1) Ein ZWINGEND-Schritt ist auch OHNE persistiertes WARTET_FREIGABE freigebbar ──
  //
  // QA-Pass 10.09.2026 (TC-05/TC-06): WARTET_FREIGABE schreibt AUSSCHLIESSLICH die
  // Nachbereitung eines erfolgreichen Vorschritts. Ist der ERSTE Schritt ZWINGEND — oder der
  // fällige Schritt einer Reparaturfassung —, antwortet /starten 409 und schreibt nichts.
  // Hinge die Freigabe am persistierten Status, wäre der Governance-Fall in genau diesen
  // beiden Bauformen unbedienbar, und der einzige Ausweg wäre, ZWINGEND aus dem Plan zu
  // entfernen: eine Freigabe-Umgehung ohne jedes Entscheidungsartefakt. Der Endpunkt fragt
  // deshalb ermittleNaechstenSchritt, nicht den Status.
  {
    const workflowId = `ws2c-freigabe-erster-schritt-${randomUUID()}`
    const gestartete = []
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: [], freigabe: 'ZWINGEND' })])

      // Der Halt ist real: /starten lehnt ab und schreibt nichts — der Status bleibt OFFEN.
      const gestartetOhneFreigabe = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      const vorher = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (gestartetOhneFreigabe.status !== 409 || vorher?.daten?.status !== 'OFFEN') {
        befunde.push(
          `(b1) TC-05-Vorbedingung: erwartet 409 ohne Schreibvorgang (Status bleibt OFFEN), erhalten ${gestartetOhneFreigabe.status} / ${JSON.stringify(vorher?.daten?.status)}`
        )
      }

      const antwort = await freigebe(basisUrl, workflowId, { schrittId: 'schritt-1', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate: erster Schritt freigegeben.' })
      const koerper = await antwort.json()
      if (antwort.status !== 202) {
        befunde.push(`(b1) TC-05: ein ZWINGEND-Schritt ohne persistiertes WARTET_FREIGABE muss freigebbar sein, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (gestartete.length !== 1 || stand?.daten?.status !== 'ABGESCHLOSSEN') {
        befunde.push(`(b1) TC-05: nach der Freigabe muss der Schritt real laufen, erhalten ${gestartete.length} Läufe / ${JSON.stringify(stand?.daten?.status)}`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (b1) Der Halt bleibt Halt: nicht startbare Schritte werden nicht freigegeben ───
  //
  // Die Gegenrichtung zum Fall darüber. Die Regel ist die SCHÄRFERE Prüfung, nicht die
  // laxere — sonst hätte der Wechsel vom Statusvergleich zur Regel eine Grenze aufgeweicht.
  {
    const gestartete = []
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      // (a) Ein Schritt, der gar nicht dispatchbar ist (worker 'codex', Regel 4), darf keine
      //     Freigabefrage sein — die Freigabe bliebe folgenlos.
      const codexId = `ws2c-freigabe-codex-${randomUUID()}`
      await legeWorkflowAn(basisUrl, codexId, [gateSchritt('schritt-1', null, { eingaben: [], freigabe: 'ZWINGEND', worker: 'codex' })])
      const codex = await freigebe(basisUrl, codexId, { schrittId: 'schritt-1', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate.' })
      const codexKoerper = await codex.json()
      if (codex.status !== 409 || codexKoerper.art !== 'haltKlaerung') {
        befunde.push(`(b1): ein nicht dispatchbarer Schritt darf nicht freigegeben werden, erhalten ${codex.status} (${JSON.stringify(codexKoerper)})`)
      }
      // (a2) Der Fall, der die Regel vom Statusvergleich UNTERSCHEIDET (Reviewer-Pass
      //      10.09.2026, W1): ein Bestand, der WARTET_FREIGABE trägt und trotzdem keine
      //      beantwortbare Freigabefrage ist. Alle übrigen Rotfälle hier wären auch unter der
      //      alten Bedingung `status === 'WARTET_FREIGABE'` rot gewesen — sie belegen „lehnt
      //      ab", nicht „lehnt SCHÄRFER ab". Ohne diesen Fall bliebe der Rückbau auf den
      //      Statusvergleich unbemerkt grün.
      //
      //      Am Endpunkt vorbei angelegt, weil kein Automatenpfad diesen Zustand erzeugt: er
      //      entsteht aus einem Bestandsartefakt oder einer von Hand geschriebenen Fassung.
      const profilReferenzW1 = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
      const wartetAberCodexId = `ws2c-freigabe-wartet-codex-${randomUUID()}`
      registriereWorkflow(
        gateWorkflow([gateSchritt('schritt-1', null, { eingaben: [], freigabe: 'ZWINGEND', worker: 'codex' })], {
          workflow_id: wartetAberCodexId,
          auftrag_id: auftragId,
          status: 'WARTET_FREIGABE',
        }),
        profilReferenzW1,
        { basisVerzeichnis, schreiber: () => {} }
      )
      const wartetAberCodex = await freigebe(basisUrl, wartetAberCodexId, { schrittId: 'schritt-1', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate.' })
      const wartetAberCodexKoerper = await wartetAberCodex.json()
      if (wartetAberCodex.status !== 409 || wartetAberCodexKoerper.art !== 'haltKlaerung') {
        befunde.push(
          `(b1) W1: ein Bestand mit status WARTET_FREIGABE, dessen Schritt nicht dispatchbar ist, darf KEINE Freigabe annehmen (die Regel ist schärfer als der Statusvergleich), erhalten ${wartetAberCodex.status} (${JSON.stringify(wartetAberCodexKoerper)})`
        )
      }
      // Dasselbe mit erreichter Grenze: WARTET_FREIGABE, aber max_schritte ist aufgebraucht.
      const wartetAberGrenzeId = `ws2c-freigabe-wartet-grenze-${randomUUID()}`
      registriereWorkflow(
        gateWorkflow(
          [
            gateSchritt('schritt-1', 'schritt-2', { eingaben: [], status: 'ERFOLGREICH', lauf_id: `w1-lauf-${randomUUID()}` }),
            gateSchritt('schritt-2', null, { eingaben: [], freigabe: 'ZWINGEND' }),
          ],
          { workflow_id: wartetAberGrenzeId, auftrag_id: auftragId, status: 'WARTET_FREIGABE', aktiver_schritt_id: 'schritt-2', grenzen: { max_schritte: 1, max_replans: 0 } }
        ),
        profilReferenzW1,
        { basisVerzeichnis, schreiber: () => {} }
      )
      const wartetAberGrenze = await freigebe(basisUrl, wartetAberGrenzeId, { schrittId: 'schritt-2', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate.' })
      const wartetAberGrenzeKoerper = await wartetAberGrenze.json()
      if (wartetAberGrenze.status !== 409 || wartetAberGrenzeKoerper.art !== 'haltGrenze') {
        befunde.push(
          `(b1) W1: ein Bestand mit status WARTET_FREIGABE bei erreichtem max_schritte darf KEINE Freigabe annehmen, erhalten ${wartetAberGrenze.status} (${JSON.stringify(wartetAberGrenzeKoerper)})`
        )
      }
      for (const [name, id, schritt] of [
        ['W1/codex', wartetAberCodexId, 'schritt-1'],
        ['W1/grenze', wartetAberGrenzeId, 'schritt-2'],
      ]) {
        if (ladeArtefaktVersion(`entscheidung-workflow-${id}-${schritt}`, undefined, { basisVerzeichnis, schreiber: () => {} }) !== null) {
          befunde.push(`(b1) ${name}: der abgelehnte Freigabeversuch hat trotzdem ein Entscheidungsartefakt geschrieben`)
        }
      }

      // (b) Ein GESTOPPTER Workflow ebenfalls nicht.
      const gestopptId = `ws2c-freigabe-gestoppt-${randomUUID()}`
      await legeWorkflowAn(basisUrl, gestopptId, [gateSchritt('schritt-1', null, { eingaben: [], freigabe: 'ZWINGEND' })], {
        status: 'GESTOPPT',
        aktiver_schritt_id: null,
      })
      const gestoppt = await freigebe(basisUrl, gestopptId, { schrittId: 'schritt-1', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate.' })
      const gestopptKoerper = await gestoppt.json()
      if (gestoppt.status !== 409 || gestopptKoerper.art !== 'haltGestoppt') {
        befunde.push(`(b1): ein GESTOPPTER Workflow darf keine Freigabe annehmen, erhalten ${gestoppt.status} (${JSON.stringify(gestopptKoerper)})`)
      }
      if (gestartete.length !== 0) {
        befunde.push(`(b1): keiner dieser Fälle darf einen Lauf starten, erhalten ${gestartete.length}`)
      }
      for (const [name, workflowId] of [
        ['codex', codexId],
        ['gestoppt', gestopptId],
      ]) {
        if (ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-schritt-1`, undefined, { basisVerzeichnis, schreiber: () => {} }) !== null) {
          befunde.push(`(b1): der abgelehnte Freigabeversuch (${name}) hat trotzdem ein Entscheidungsartefakt geschrieben`)
        }
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (b1) Die ZWEITE Freigabe auf denselben Schritt prallt ab ───────────────────
  //
  // Die Zusage mit der höchsten Alltagswahrscheinlichkeit — Doppelklick, wiederholter
  // Aufruf nach einem Timeout — und bis zum QA-Pass vom 10.09.2026 im Quelltext behauptet,
  // aber nirgends geprüft (Befund 3). Geprüft wird nicht nur der Statuscode, sondern auch,
  // dass KEIN zweites Entscheidungsartefakt und KEIN zweiter Lauf entsteht, und dass der
  // Grundtext lesbar ist: dieser Pfad antwortete auf 'starte' mit dem Wort 'undefined'
  // (Befund 2), weil dieser Ausgang als einziger kein grund-Feld trägt.
  {
    const workflowId = `ws2c-freigabe-doppelt-${randomUUID()}`
    const gestartete = []
    let gibFrei
    const haengt = new Promise((resolve) => {
      gibFrei = resolve
    })
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      await haengt
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: [], freigabe: 'ZWINGEND' })])
      const erste = await freigebe(basisUrl, workflowId, { schrittId: 'schritt-1', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate: erste Freigabe.' })
      if (erste.status !== 202) {
        befunde.push(`(b1) Doppelfreigabe: die erste Freigabe erwartet 202, erhalten ${erste.status} (${await erste.text()})`)
      }
      const versionenNachErster = (() => {
        let n = 1
        while (ladeArtefaktVersion(`workflow-${workflowId}`, n + 1, { basisVerzeichnis, schreiber: () => {} }) !== null) n += 1
        return n
      })()

      // Der Schritt läuft noch: die zweite Freigabe prallt an D13 ab — mit dem Hinweis, dass
      // die Entscheidung NICHT festgehalten wurde.
      // Sie prallt an der REGEL ab, nicht erst an D13: die Regelprüfung (3) liegt vor der
      // D13-Prüfung (5), und der Schritt trägt bereits eine lauf_id (Regel 3). Das ist die
      // genauere Antwort — sie redet über den Schritt, nach dem gefragt wurde, statt über
      // einen fremden aktiven Lauf.
      const zweiteWaehrendLauf = await freigebe(basisUrl, workflowId, { schrittId: 'schritt-1', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate: zweite Freigabe.' })
      const waehrendLauf = await zweiteWaehrendLauf.json()
      if (zweiteWaehrendLauf.status !== 409 || waehrendLauf.art !== 'haltKlaerung' || !(waehrendLauf.grund ?? '').includes('nicht startbereit')) {
        befunde.push(`(b1) Doppelfreigabe: während des Laufs erwartet 409 mit art 'haltKlaerung' (Schritt nicht startbereit), erhalten ${zweiteWaehrendLauf.status} (${JSON.stringify(waehrendLauf)})`)
      }

      // Und nach dem Laufende: jetzt greift die Regel selbst — der Schritt ist gelaufen, es
      // gibt keine offene Freigabefrage mehr.
      gibFrei()
      await new Promise((resolve) => setTimeout(resolve, 100))
      const zweiteNachLauf = await freigebe(basisUrl, workflowId, { schrittId: 'schritt-1', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate: dritte Freigabe.' })
      const grundNachLauf = (await zweiteNachLauf.json()).grund ?? ''
      if (zweiteNachLauf.status !== 409) {
        befunde.push(`(b1) Doppelfreigabe: nach dem Laufende erwartet 409, erhalten ${zweiteNachLauf.status} (${grundNachLauf})`)
      }
      if (grundNachLauf.includes('undefined')) {
        befunde.push(`(b1) Befund 2: der Ablehnungsgrund darf kein 'undefined' enthalten, erhalten ${JSON.stringify(grundNachLauf)}`)
      }
      if (gestartete.length !== 1) {
        befunde.push(`(b1) Doppelfreigabe: eine zweite Freigabe darf keinen zweiten Lauf starten, erhalten ${gestartete.length}`)
      }
      // Genau EINE Entscheidungsversion — keine zweite, die nur die erste wiederholt.
      if (ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-schritt-1`, 2, { basisVerzeichnis, schreiber: () => {} }) !== null) {
        befunde.push('(b1) Doppelfreigabe: eine abgeprallte Freigabe hat trotzdem ein zweites Entscheidungsartefakt geschrieben')
      }
      // Und keine überzählige Workflow-Version aus den abgeprallten Versuchen.
      if (ladeArtefaktVersion(`workflow-${workflowId}`, versionenNachErster + 2, { basisVerzeichnis, schreiber: () => {} }) !== null) {
        befunde.push('(b1) Doppelfreigabe: die abgeprallten Versuche haben Workflow-Versionen geschrieben')
      }
    } finally {
      gibFrei()
      await new Promise((resolve) => setTimeout(resolve, 50))
      await schliessen()
    }
  }

  // ─── (b1) Eine erteilte Freigabe überlebt eine Heilung (Festlegung, jetzt belegt) ──
  //
  // features/F15/feature.md legt ausdrücklich fest: eine Freigabe gilt für die
  // SCHRITTFASSUNG, nicht für einen einzelnen Startversuch. Scheitert der freigegebene
  // Schritt heilbar, ist er ohne neue Entscheidung erneut startbar. Eine Governance-Aussage
  // mit Wirkung gehört belegt, sonst kippt sie beim nächsten Umbau still in die
  // Gegenrichtung (QA-Pass 10.09.2026, Befund 7).
  {
    const workflowId = `ws2c-freigabe-ueberlebt-heilung-${randomUUID()}`
    let laeufe = 0
    const fuehreAufgabeDurchFn = async () => {
      laeufe += 1
      // Der erste Lauf scheitert OHNE Checkpoint → Heilung; der zweite gelingt.
      if (laeufe === 1) {
        return { ok: false, stufe: 'kontextpaket', ergebnis: { ok: false, grund: 'unbekannte_rolle', rolle: 'code-reviewr' } }
      }
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      await legeWorkflowAn(basisUrl, workflowId, [gateSchritt('schritt-1', null, { eingaben: [], freigabe: 'ZWINGEND' })])
      await freigebe(basisUrl, workflowId, { schrittId: 'schritt-1', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate: freigegeben, erster Lauf scheitert.' })
      await new Promise((resolve) => setTimeout(resolve, 100))

      const nachHeilung = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (nachHeilung?.daten?.status !== 'KLAERUNG_ERFORDERLICH' || nachHeilung?.daten?.schritte?.[0]?.status !== 'OFFEN') {
        befunde.push(`(b1) Festlegung: erwartet Heilung nach dem gescheiterten Lauf, erhalten ${JSON.stringify({ status: nachHeilung?.daten?.status, schritt: nachHeilung?.daten?.schritte?.[0] })}`)
      }
      if (nachHeilung?.daten?.schritte?.[0]?.freigabe_erteilt !== true) {
        befunde.push(`(b1) Festlegung: die Heilung darf die erteilte Freigabe nicht wegwerfen, erhalten ${JSON.stringify(nachHeilung?.daten?.schritte?.[0]?.freigabe_erteilt)}`)
      }
      // Der Beleg der Festlegung: ein GEWÖHNLICHER Start reicht, ohne zweite Entscheidung.
      const erneut = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
      if (erneut.status !== 202) {
        befunde.push(`(b1) Festlegung: nach der Heilung muss der freigegebene Schritt ohne neue Freigabe startbar sein, erhalten ${erneut.status} (${await erneut.text()})`)
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
      const fertig = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (fertig?.daten?.status !== 'ABGESCHLOSSEN' || laeufe !== 2) {
        befunde.push(`(b1) Festlegung: erwartet ABGESCHLOSSEN nach zwei Läufen, erhalten ${JSON.stringify(fertig?.daten?.status)} / ${laeufe}`)
      }
      // Die Gegenrichtung steht im Selbstfreigabe-Fall: eine NEUE Fassung verwirft die Freigabe.
      if (ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-schritt-1`, 2, { basisVerzeichnis, schreiber: () => {} }) !== null) {
        befunde.push('(b1) Festlegung: der zweite Start darf kein zweites Entscheidungsartefakt erzeugen')
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (b1) Die Freigabe scheitert am Start — kein zugemauerter Workflow ──────────
  //
  // Der Zwilling von Rotfall 7 (Auto-Fortsetzung) auf dem Freigabepfad (Reviewer-Pass
  // 10.09.2026, K2; QA-Fehler 3). Ohne den festgeschriebenen Halt bliebe der Workflow auf
  // LAEUFT ohne Schritt auf LAEUFT stehen: keine Stale-Heilung, Ersetzung gesperrt.
  {
    const workflowId = `ws2c-freigabe-startfehler-${randomUUID()}`
    const gestartete = []
    const fuehreAufgabeDurchFn = async (laufId) => {
      gestartete.push(laufId)
      return erfolgreichesErgebnis()
    }
    const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
    try {
      // ZWINGEND mit unauflösbarer eingaben-Referenz: die Freigabe ist zulässig, der Start
      // scheitert danach an einem gewöhnlichen Planfehler.
      await legeWorkflowAn(basisUrl, workflowId, [
        gateSchritt('schritt-1', null, { eingaben: ['artefakt:gibt-es-wirklich-nicht'], freigabe: 'ZWINGEND' }),
      ])
      const antwort = await freigebe(basisUrl, workflowId, { schrittId: 'schritt-1', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate: freigegeben, Start scheitert.' })
      const koerper = await antwort.json()
      // 409 und NICHT 400: es ist etwas geschrieben worden. Die Antwort muss das sagen.
      if (antwort.status !== 409 || koerper.status !== 'KLAERUNG_ERFORDERLICH') {
        befunde.push(`(b1) K2: ein gescheiterter Start nach erteilter Freigabe erwartet 409 mit status KLAERUNG_ERFORDERLICH, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }
      if (gestartete.length !== 0) {
        befunde.push(`(b1) K2: bei fehlendem Eingabe-Artefakt darf kein Lauf starten, erhalten ${gestartete.length}`)
      }
      const stand = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
      if (stand?.daten?.status !== 'KLAERUNG_ERFORDERLICH') {
        befunde.push(`(b1) K2: der Workflow muss als KLAERUNG_ERFORDERLICH festgeschrieben sein (sonst zugemauert), erhalten ${JSON.stringify(stand?.daten?.status)}`)
      }
      if (typeof stand?.daten?.grund !== 'string' || !stand.daten.grund.includes('gibt-es-wirklich-nicht')) {
        befunde.push(`(b1) K2: der Grund muss die Ursache nennen, erhalten ${JSON.stringify(stand?.daten?.grund)}`)
      }
      // Und der Mensch kommt heraus: KLAERUNG_ERFORDERLICH ist ersetzbar.
      const repariert = await fetch(`${basisUrl}/api/workflows`, {
        method: 'POST',
        body: JSON.stringify(
          gateWorkflow([gateSchritt('schritt-1', null, { eingaben: [], freigabe: 'ZWINGEND' })], { workflow_id: workflowId, auftrag_id: auftragId })
        ),
      })
      if (repariert.status !== 201) {
        befunde.push(`(b1) K2: nach dem gescheiterten Start muss eine korrigierte Fassung angenommen werden, erhalten ${repariert.status}`)
      }
    } finally {
      await schliessen()
    }
  }

  rmSync(basisVerzeichnis, { recursive: true, force: true })
  if (befunde.length === befundeVorStart) {
    console.log('✓ POST /api/workflows/<id>/starten: ein Schritt startet real (202, LAEUFT + lauf_id, Eingaben nach (A)/(B)); 404, 409 (D13), 409 (nicht startbar), 400 (Eingabe-Artefakt fehlt), 400 (ausbrechende auftrag_id, auch als Bestandsartefakt) und 400 (kaputte Prozentkodierung) halten an — der Server lebt danach. Der Automat setzt nach einem erfolgreichen Schritt selbst fort (AK6b: EIN Aufruf, zwei Läufe, danach ist D13 wieder belegt; ZWINGEND hält bei WARTET_FREIGABE, mit persistiertem grund), eine Ablehnung OHNE Checkpoint heilt die lauf_id, eine MIT Wirkungsmarke nicht, und eine neue Fassung ist in LAEUFT/WARTET_FREIGABE/ABGESCHLOSSEN gesperrt, in OFFEN/KLAERUNG_ERFORDERLICH/GESTOPPT erlaubt (Reparaturzug Tippfehler -> Heilung -> Korrektur -> Start belegt); ein stale LAEUFT wird als KLAERUNG_ERFORDERLICH festgeschrieben, ohne den Schritt anzufassen; ein eingereichter Datensatz darf sich nicht selbst aussperren (400), und ein ungültiger Bestand bleibt in jedem Status ersetzbar. AK7 (b1): POST .../freigabe löst den ZWINGEND-Halt real auf (202, freigabe_erteilt am Schritt, Entscheidungsartefakt, Kette läuft zu Ende) — auch ohne persistiertes WARTET_FREIGABE, also beim ERSTEN Schritt eines Workflows; ABGELEHNT stoppt und lässt den Reparaturpfad offen; 404/400 (Body, Zeichenregel für workflowId UND schrittId)/409 (Stale-schrittId, keine offene Freigabefrage, nicht dispatchbarer Schritt, GESTOPPT, D13) halten an, ohne etwas zu schreiben, und der Server lebt danach; ein gescheiterter Start NACH erteilter Freigabe endet als KLAERUNG_ERFORDERLICH statt zugemauert; und weder eine Nachbereitung noch eine Heilung überschreibt ein bestehendes GESTOPPT.')
  }
}

// ─── Genau EIN Aufrufpunkt des Werkzeuglaufs (Auflage WS-2b) ────────────────
//
// AK4 aus WS-2a sagt es zu, WS-2b hätte es leicht brechen können: der
// Automatenpfad braucht denselben Fire-and-forget-Block wie POST /api/laeufe.
// Ein zweiter Aufrufpunkt wäre eine zweite Fassung der D13-Rückgabe und der
// Startfehlerliste — geprüft wird deshalb die Zahl der Aufrufstellen im
// Quelltext, nicht bloß, dass es überhaupt eine gibt.
{
  const quelltext = readFileSync(join('scripts', 'leitstand-server.mjs'), 'utf-8')
  // Zusammengesetzt, damit dieses Gate den gesuchten Text nicht selbst enthält, wenn es
  // eines Tages im selben Verzeichnis mitgelesen wird.
  const muster = new RegExp(`${'fuehreAufgabeDurch'}${'Fn'}\\(`, 'g')
  const treffer = quelltext.match(muster) ?? []
  if (treffer.length !== 1) {
    befunde.push(`Auflage WS-2b: erwartet genau EINEN Aufrufpunkt des Werkzeuglaufs in scripts/leitstand-server.mjs, gefunden ${treffer.length}`)
  } else {
    console.log('✓ Auflage WS-2b: genau ein Aufrufpunkt des Werkzeuglaufs in scripts/leitstand-server.mjs (AK4 aus WS-2a hält).')
  }

  // ─── Genau EIN Schreiber von freigabe_erteilt (F15 WS-2c (b1), AK7) ────────────
  //
  // Die Zusage „ein ZWINGEND-Schritt startet nie automatisch" ist KEINE Regel — die Regel
  // startet ihn sehr wohl, sobald freigabe_erteilt true ist, und die Auto-Fortsetzung nimmt
  // jedes 'starte' unbesehen. Sie hält allein deshalb, weil zwei Tatsachen zusammenwirken
  // (QA-Pass 10.09.2026, Befund 6):
  //
  //   (1) freigabe_erteilt wird an GENAU EINER Stelle gesetzt — im Freigabe-Endpunkt, für
  //       den fälligen Schritt, der unmittelbar danach gestartet wird.
  //   (2) POST /api/workflows normalisiert das Feld aus jedem eingereichten Körper weg.
  //
  // (2) hat einen eigenen Verhaltensfall (Selbstfreigabe). (1) hatte keinen. Schriebe ein
  // künftiger Pfad — WS-3s „Überspringen", ein Cursor-Endpunkt, eine Wiederaufnahme — das
  // Feld an einem Schritt, den der Cursor erst später erreicht, startete die
  // Auto-Fortsetzung ihn ohne jede menschliche Entscheidung. Das ist die Zusage, die WS-3 am
  // ehesten unbeabsichtigt bricht; deshalb hier als Zählung im Quelltext.
  const freigabeSchreiber = new RegExp(`${'freigabe_'}${'erteilt'}: true`, 'g')
  const freigabeTreffer = (quelltext.match(freigabeSchreiber) ?? []).length
  if (freigabeTreffer !== 1) {
    befunde.push(
      `AK7: erwartet GENAU EINEN Schreiber von freigabe_erteilt in scripts/leitstand-server.mjs (der Freigabe-Endpunkt), gefunden ${freigabeTreffer} — ein zweiter Schreiber könnte einen ZWINGEND-Schritt ohne menschliche Entscheidung startbar machen`
    )
  } else {
    console.log('✓ AK7: genau ein Schreiber von freigabe_erteilt (der Freigabe-Endpunkt) — kein zweiter Weg, einen ZWINGEND-Schritt startbar zu machen.')
  }

  // Dieselbe Zählung eine Ebene höher, für den Startpfad des Automaten (F15 WS-2c,
  // Reviewer-Pass 10.09.2026). starteWorkflowSchritt prüft die D13-Sperre NICHT selbst — es
  // verlässt sich darauf, dass genau zwei Stellen es aufrufen: der HTTP-Endpunkt, der laufAktiv
  // unmittelbar davor prüft, und die Auto-Fortsetzung, in der laufAktiv gerade zurückgesetzt
  // wurde. Ein DRITTER Aufrufer wäre ein Startpfad ohne D13-Prüfung, und weder der D13-Vertrag
  // in check-f11-auftrag.mjs (der nur das erste Vorkommen im Quelltext betrachtet, F-215) noch
  // die Invariante unten fingen ihn. Gezählt werden die Aufrufe, nicht die Definition — deshalb
  // das Muster mit öffnender Klammer und einem vorangehenden Nicht-Wortzeichen außer 'n' aus
  // 'function'.
  const startpfadMuster = new RegExp(`${'starteWorkflow'}${'Schritt'}\\(`, 'g')
  const startpfadTreffer = (quelltext.match(startpfadMuster) ?? []).length
  // 4 = eine Definition + drei Aufrufe. Die Definition trägt dieselbe Zeichenfolge. Seit
  // WS-2c (b1) ist der Freigabe-Endpunkt der dritte Aufrufer — er prüft laufAktiv unmittelbar
  // davor, wie die beiden anderen. Die ZAHL wird mitgezogen, die Prüfung nicht aufgeweicht.
  if (startpfadTreffer !== 4) {
    befunde.push(
      `AK6b/AK7: erwartet GENAU DREI Aufrufstellen des Automaten-Startpfads in scripts/leitstand-server.mjs (Startendpunkt, Auto-Fortsetzung, Freigabe-Endpunkt) plus die Definition, gefunden ${startpfadTreffer} Vorkommen — ein weiterer Aufrufer wäre ein Startpfad ohne D13-Prüfung`
    )
  } else {
    console.log('✓ AK6b/AK7: genau drei Aufrufstellen des Automaten-Startpfads (Startendpunkt, Auto-Fortsetzung, Freigabe-Endpunkt) — kein vierter, ungeschützter Startpfad.')
  }
}

// ─── D13-Übergabe ohne Fenster (AK6b, WS-2c) ────────────────────────────────
//
// Die Invariante, die AK6b ausmacht: zwischen dem Reset von laufAktiv im .then
// des Fire-and-forget-Blocks und dem erneuten `laufAktiv = true` in
// starteWorkflowSchritt liegt KEIN Kontrollflusswechsel. Läge dort einer, könnte
// ein paralleler POST /api/laeufe durchschlüpfen und es liefen zwei
// Arbeitsstränge — D13 wäre über den Automatenpfad aushebelbar, ohne dass eine
// Antwort falsch aussieht.
//
// Das ist eine Eigenschaft des KONTROLLFLUSSES, nicht des Ergebnisses: ein Test,
// der zwischen zwei Schritten einen POST absetzt, kann das Fenster nicht
// zuverlässig treffen (es wäre ein Microtask breit). Geprüft wird deshalb der
// Quelltext der drei markierten Bereiche. Die Verhaltensbelege daneben stehen im
// Grünfall 2 oben (ein Aufruf, zwei Läufe) und im Grünfall 2b (nach der Übergabe
// ist D13 belegt); die Textprüfung hier ist die einzige, die das FENSTER selbst
// adressiert — die beiden Verhaltensfälle prüfen die Enden, nicht die Lücke.
{
  const quelltext = readFileSync(join('scripts', 'leitstand-server.mjs'), 'utf-8')
  const marke = 'D13-UEBERGABE-OHNE-FENSTER'
  const bereiche = []
  let rest = quelltext
  while (true) {
    const start = rest.indexOf(`${marke}: START`)
    if (start === -1) break
    const ende = rest.indexOf(`${marke}: ENDE`, start)
    if (ende === -1) {
      befunde.push(`AK6b-Invariante: ein ${marke}-Bereich hat keine ENDE-Marke`)
      break
    }
    bereiche.push(rest.slice(start, ende))
    rest = rest.slice(ende + 1)
  }

  // Vier Bereiche, hier in QUELLTEXT-Reihenfolge gezählt — die Meldung unten nennt
  // „Bereich i+1", und die Nummer muss auf denselben Block zeigen wie die Aufzählung
  // (Reviewer-Pass 10.09.2026, V5): (1) der .then-Zweig, in dem laufAktiv zurückgesetzt
  // und der Rückruf gemeldet wird, (2) starteWorkflowSchritt vom Eintritt bis zur
  // D13-Belegung, (3) der Rückruf selbst bis zur Fortsetzung, (4) seit WS-2c (b1) der
  // Freigabe-Endpunkt vom Body bis zum Start. Fehlt einer, ist die Kette nicht mehr
  // lückenlos abgedeckt und die Zusage nicht mehr geprüft.
  if (bereiche.length !== 4) {
    befunde.push(`AK6b-Invariante: erwartet GENAU VIER mit ${marke} markierte Bereiche in scripts/leitstand-server.mjs, gefunden ${bereiche.length}`)
  }

  // Jede dieser Zeichenketten gibt die Kontrolle an den Event-Loop zurück und
  // öffnet damit das Fenster. `.then(` steht mit auf der Liste, weil eine
  // Fortsetzung, die erst im Promise-Callback belegt, dasselbe Loch reißt wie ein
  // await — auch wenn sie synchron aussieht.
  //
  // WARNUNG für spätere Umbauten (Reviewer-Pass 10.09.2026, V7): diese Liste sieht auch
  // KOMMENTARE. Bereich 4 (der Freigabe-Endpunkt) umspannt inzwischen gut zweihundert Zeilen
  // mit viel Prosa und passiert nur, weil dort jede Erwähnung „async-Handler" heißt und nicht
  // „async ". Ein neuer Kommentar mit einer dieser Zeichenketten macht das Gate ohne realen
  // Anlass rot. Das ist die sichere Richtung — aber wer hier landet, soll wissen, warum.
  const VERBOTEN = ['await ', 'queueMicrotask', 'setTimeout', 'setImmediate', 'nextTick', '.then(', 'async ']
  for (const [i, bereich] of bereiche.entries()) {
    for (const verboten of VERBOTEN) {
      if (bereich.includes(verboten)) {
        befunde.push(`AK6b-Invariante: Bereich ${i + 1} zwischen ${marke}-START und -ENDE enthält '${verboten.trim()}' — zwischen D13-Reset und D13-Belegung darf kein Kontrollflusswechsel liegen`)
      }
    }
  }

  // Selbsttest (Muster check-f11-auftrag.mjs AK7): eine simulierte Verletzung muss
  // real erkannt werden. Ohne ihn belegte die Prüfung oben nur, dass die Marken da
  // sind — nicht, dass sie etwas fangen (F-211).
  const simulierteVerletzung = [`${marke}: START`, '  await verzoegerung(0)', '  laufAktiv = true', `${marke}: ENDE`].join('\n')
  const trefferImSelbsttest = VERBOTEN.filter((verboten) => simulierteVerletzung.includes(verboten))
  if (trefferImSelbsttest.length === 0) {
    befunde.push('AK6b-Invariante-Selbsttest: ein eingefügtes await im markierten Bereich wird NICHT erkannt — die Prüfung ist wirkungslos')
  }

  if (bereiche.length === 4) {
    console.log(`✓ AK6b: die vier ${marke}-Bereiche in scripts/leitstand-server.mjs enthalten keinen Kontrollflusswechsel (Selbsttest erkennt ein eingefügtes await).`)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
//
// process.exitCode statt process.exit() — bewusste Abweichung von den
// übrigen Gates, hier real erzwungen (Windows, Node 24.16, WS-2a):
// process.exit() unmittelbar nach einem POST, dessen Handler selbst nach
// stdout geschrieben hat (registriereWorkflow/registriereAuftrag
// protokollieren ihr *_registriert-Ereignis), reißt libuv einen noch
// schließenden Handle unter den Füßen weg — "Assertion failed:
// !(handle->flags & UV_HANDLE_CLOSING), src\win\async.c" und Exitcode 127,
// reproduzierbar in drei von drei Läufen. Mit exitCode läuft der
// Event-Loop leer, bevor der Prozess endet; das Ergebnis für den Aufrufer
// (0 = sauber, 1 = Befund) bleibt gleich. Nachweisbar nicht durch WS-2a
// eingeschleppt: derselbe Absturz entsteht mit POST /api/auftraege, also
// mit unverändertem F12-Code.
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
