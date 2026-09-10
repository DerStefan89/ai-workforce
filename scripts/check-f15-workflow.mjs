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
 * Wichtig: Jede der vier Regeln, die nur validiereWorkflowDaten kennt und
 * JSON Schema nicht ausdrücken kann, hat hier einen eigenen Rotfall —
 * unbekannter nachfolger, doppelte schritt_id, unbekannte
 * aktiver_schritt_id, Zyklus in der nachfolger-Kette (ARCHITECTURE.md §8:
 * eine behauptete Grenze ohne kalibrierten Rot- und Grün-Fall heißt nicht
 * ERZWUNGEN). Wer eine Regel entfernt, ohne den Rotfall anzufassen, lässt
 * hier ein grünes Gate über einer stillen Lücke stehen.
 *
 * Bekannte Grenze der Abdeckung: die Fixtures unten kalibrieren die sechs
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
import { ermittleNaechstenSchritt, validiereWorkflowDaten } from '../src/workflow/index.ts'
import { erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'
import { ladeStartvorlage } from '../src/startvorlage/index.ts'

const befunde = []

console.log('\n=== F15-Workflow-Check (WS-1 + WS-2a) ===\n')

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
    erwartetArt: 'haltKlaerung',
  },
  {
    name: 'Regel-0-Halt (Rotfall der Automatik): ein verspätetes ERFOLGREICH setzt einen GESTOPPTEN Workflow nicht fort',
    // Der Fall MIT Vorschrittergebnis — der Abbruch-Endpunkt antwortet sofort,
    // das Laufergebnis trifft danach ein. Alle Schritte des Folgeschritts sind
    // startbereit; nur daten.status hält den Automaten hier auf.
    workflow: gateWorkflow([gelaufen('schritt-2'), gateSchritt('schritt-2', null)], { aktiver_schritt_id: null, status: 'GESTOPPT' }),
    ergebnis: ERFOLG_1,
    erwartetArt: 'haltKlaerung',
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
  console.log(`✓ ${automatFaelle.length} Fall/Fälle von ermittleNaechstenSchritt geprüft (Regel-0-, ZWINGEND-, Codex-, Grenz-, Klär-, Wiederaufnahme- und Allowlist-Halt; Erststart, EMPFOHLEN, fertig).`)
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
