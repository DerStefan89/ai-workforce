/**
 * Datei: scripts/check-f12-leitstand-ansicht.mjs
 *
 * Zweck: F12-WS-3-Gate (AK7/AK8/AK10 mechanisch, state/plan-v1-f12-ws3.md
 * Abschnitt 2.5), seit F16 AK12 um (e)/(f) erweitert. Sechs Fälle; (a)-(e)
 * laufen real gegen einen laufenden Testserver (Muster
 * scripts/check-f10-leitstand.mjs), (f) ist eine reine Quelltextprüfung:
 * (a) AK1 — eine reine Artefaktkette (registriereAuftrag, keine
 *     Wirkungsmarke) erscheint nicht in GET /api/laeufe. Regressionsschutz:
 *     WS-3 fügt hier keine neue Logik hinzu, das Gate sichert nur ab, dass
 *     AK7/AK8s Erweiterungen sammleLaeufe/istLaufkette nicht versehentlich
 *     verändern.
 * (b) AK2 — GET /api/laeufe liefert je Eintrag kein checkpoints-Array.
 *     Ebenfalls Regressionsschutz, WS-3 rührt sammleLaufKopfdaten bis auf
 *     das neue auftragsbezug-Feld (F-147) nicht an.
 * (c) AK5 — Body mit auftragstext → 400; unbekannte auftragId → 400.
 *     Wiederholung der WS-2-Fälle (Offene Frage 6 des WS-3-Plans, mit dem
 *     Plan entschieden): die Fälle bleiben in check-f10-leitstand.mjs/
 *     check-f11-auftrag.mjs stehen (WS-2 hat sie dort real gebaut) — dieses
 *     Gate dupliziert sie nur so weit, wie feature.md AK10 es wörtlich für
 *     DIESES Gate verlangt, damit AK10 auch bei isoliertem Gate-Lauf
 *     beweiskräftig ist.
 * (d) AK8 — gültiger Rohstrom liefert die volle Projektion; ein
 *     manipulierter Rohstrom (Hash weicht ab) liefert AUSSCHLIESSLICH
 *     { status: 'hash_weicht_ab' }, kein exitCode/permissionDenials/
 *     sonstiges Rohstromfeld, kein stiller Durchlauf. Fixture-Aufbau (Q5
 *     des Plans): schreibeWirkungsmarke für die Laufkette PLUS
 *     registriereKernArtefakt für die Laufakte, eine reale Datei unter
 *     einem Temp-repoWurzel — keine starteGateway-Attrappe, kein
 *     fuehreAufgabeDurchFn-Aufruf (Befund 9/Auflage: kein Gate-Fall startet
 *     einen erfolgreichen Lauf). Wichtig, vom Plan übersehen und hier
 *     korrigiert: der Detailendpunkt prüft zusätzlich
 *     existsSync(join(basisVerzeichnis, laufId)) — die Laufakte allein
 *     (Verzeichnis lineage-laufakte-<laufId>) reicht als Fixture NICHT,
 *     das Laufverzeichnis <laufId> muss real existieren (Muster Fall (k)
 *     in check-f10-leitstand.mjs, hier über schreibeWirkungsmarke erfüllt).
 * (e) F16 AK12 — worker/modellDeklariert der Laufakte-Detailprojektion.
 *     Liegt hier und nicht in einem eigenen Gate, weil AK7 (ebendiese
 *     Detailprojektion) hier bereits abgesichert ist: die beiden Felder
 *     sind eine additive Erweiterung derselben Projektion, kein neuer
 *     Gegenstand. Zwei Fälle: eine Codex-Laufakte liefert beide Felder,
 *     eine Bestands-Laufakte ohne beide Felder liefert worker
 *     'claude-code' (AK4) und modellDeklariert null — kein geratener Wert.
 * (f) F16 AK12 — die ANZEIGE dazu: renderLaufakte in public/leitstand/app.js
 *     führt worker, modellDeklariert und modellBeobachtet als je eigene
 *     Zeile, jedes Label an seinem Feld. REGRESSIONSSCHUTZ, KEIN AK12-BELEG
 *     (F-272): AK12 belegt der reale zweistufige Lauf, nicht dieses Gate —
 *     eine Quelltextprüfung zeigt, dass die Oberfläche die Felder FÜHRT,
 *     nicht, dass ein Browser sie darstellt. Der einzige Fall ohne
 *     Testserver. Anmerkung zum Kopfkommentar von
 *     check-f15-workflow-oberflaeche.mjs: dessen Satz, dieses Gate enthalte
 *     „keinen einzigen Verweis auf public/leitstand/", gilt seit (f) nicht
 *     mehr — die Arbeitsteilung bleibt aber, dort die Workflow-Ansicht,
 *     hier die fünf Zeilen des Laufakte-Blocks (F-327).
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f12-leitstand-ansicht.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { schreibeWirkungsmarke, sha256Hex } from '../src/checkpoint-store/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F12-WS-3-Check (Detailansicht, Rohstrom-Lesepfad, Gate) ===\n')

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

/** @param optionen - an erzeugeRequestHandler durchgereicht @returns { basisUrl, schliessen } eines echten HTTP-Testservers auf einem Ephemeral-Loopback-Port (Muster check-f10-leitstand.mjs) */
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    basisUrl: `http://127.0.0.1:${port}`,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  }
}

const gueltigerStartauftrag = (laufId, auftragId) => ({
  laufId,
  rolle: 'ausfuehrung',
  anfragen: [],
  budget: {},
  aufrufEingaben: { modell: 'test-modell' },
  werkzeugsatz: 'lesend',
  auftragId,
})

// ─── (a) AK1: reine Artefaktkette (registriereAuftrag, keine Wirkungsmarke) erscheint nicht in GET /api/laeufe ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f12-ws3-ak1'
  const auftragId = `test-auftrag-${randomUUID()}`
  registriereAuftrag(auftragId, PROFIL_REFERENZ, 'Testtitel', 'Testauftragstext', { basisVerzeichnis, schreiber: () => {} })

  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const laeufe = await (await fetch(`${basisUrl}/api/laeufe`)).json()
    const laufIds = laeufe.map((l) => l.laufId)
    if (laufIds.includes(`lineage-auftrag-${auftragId}`)) {
      befunde.push(`AK1: reine Artefaktkette 'lineage-auftrag-${auftragId}' (kein Lauf, per registriereAuftrag angelegt) erscheint fälschlich in GET /api/laeufe`)
    } else {
      console.log('✓ AK1: eine reine Artefaktkette (registriereAuftrag, keine Wirkungsmarke) erscheint nicht in GET /api/laeufe.')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (b) AK2: GET /api/laeufe liefert je Lauf kein checkpoints-Array ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f12-ws3-ak2'
  const laufId = `check-f12-ws3-ak2-${randomUUID()}`
  schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })

  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const laeufe = await (await fetch(`${basisUrl}/api/laeufe`)).json()
    const kopf = laeufe.find((l) => l.laufId === laufId)
    if (kopf === undefined || 'checkpoints' in kopf) {
      befunde.push(`AK2: GET /api/laeufe-Eintrag für '${laufId}' fehlt oder enthält noch 'checkpoints', erhalten ${JSON.stringify(kopf)}`)
    } else {
      console.log('✓ AK2: GET /api/laeufe liefert je Lauf kein checkpoints-Array (Kopfdaten bleiben schlank).')
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (c) AK5: Body mit 'auftragstext' → 400; unbekannte 'auftragId' → 400 (isolierter Beleg, feature.md AK10) ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f12-ws3-ak5'
  const auftragId = `test-auftrag-${randomUUID()}`
  registriereAuftrag(auftragId, PROFIL_REFERENZ, 'Testtitel', 'Testauftragstext', { basisVerzeichnis, schreiber: () => {} })
  // Attrappe statt der echten fuehreAufgabeDurch — wird in keinem der beiden Fälle erreicht (beide
  // scheitern synchron vor jeder Zustandsänderung), steht hier nur defensiv (Muster check-f10-leitstand.mjs).
  const fuehreAufgabeDurchFn = async () => ({ ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } })
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, fuehreAufgabeDurchFn })
  try {
    const mitAuftragstext = { ...gueltigerStartauftrag(`check-f12-ws3-ak5-a-${randomUUID()}`, auftragId), auftragstext: 'sollte verboten sein' }
    const antwortAuftragstext = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(mitAuftragstext) })
    if (antwortAuftragstext.status !== 400) {
      befunde.push(`AK5: Startauftrag mit 'auftragstext' im Body erwartet 400, erhalten ${antwortAuftragstext.status}`)
    }

    const unbekannteAuftragId = gueltigerStartauftrag(`check-f12-ws3-ak5-b-${randomUUID()}`, `nie-existent-${randomUUID()}`)
    const antwortUnbekannt = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(unbekannteAuftragId) })
    if (antwortUnbekannt.status !== 400) {
      befunde.push(`AK5: Startauftrag mit unbekannter 'auftragId' erwartet 400, erhalten ${antwortUnbekannt.status}`)
    }

    if (befunde.length === 0) {
      console.log(
        "✓ AK5: Startauftrag mit 'auftragstext' im Body und mit unbekannter 'auftragId' werden je mit 400 abgelehnt (isolierter Beleg — dieselben Fälle bleiben zusätzlich in check-f10-leitstand.mjs/check-f11-auftrag.mjs stehen, Offene Frage 6)."
      )
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (d) AK8: gültiger Rohstrom → volle Projektion; manipulierter Rohstrom (Hash weicht ab) → AUSSCHLIESSLICH { status: 'hash_weicht_ab' } ──
{
  const repoWurzel = mkdtempSync(join(tmpdir(), 'f12-ws3-ak8-'))
  const basisVerzeichnis = join(repoWurzel, 'kontrollzustand')
  const laufId = `check-f12-ws3-ak8-${randomUUID()}`

  // Q5: schreibeWirkungsmarke für die Laufkette (istLaufkette/AK1-Voraussetzung) PLUS
  // registriereKernArtefakt für die Laufakte — keine starteGateway-Attrappe.
  schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })

  const rohVerzeichnis = join(repoWurzel, 'kontrollzustand-roh', laufId)
  mkdirSync(rohVerzeichnis, { recursive: true })
  const rohPfad = join(rohVerzeichnis, 'rohstrom.json')
  const rohInhaltGruen = JSON.stringify({ werkzeugStartziel: ['claude'], stdout: '', stderr: '', exitCode: 0, startfehler: null })
  writeFileSync(rohPfad, rohInhaltGruen, 'utf8')

  registriereKernArtefakt(
    `laufakte-${laufId}`,
    PROFIL_REFERENZ,
    { erzeuger: 'kern', schritt: 'check-f12-ws3-ak8-fixture' },
    {
      laufakte_schema: 'v0',
      lauf_id: laufId,
      werkzeug_version_deklariert: 'test-version',
      berechtigungskontext: 'test-kontext',
      arbeitsverzeichnis_pfad: repoWurzel,
      modell_beobachtet: null,
      // Realistisch zum leeren stdout: die echte starteGateway-Logik setzt beobachtungsbasis_vollstaendig
      // aus ergebnisObjekt !== null ab (src/claude-code-gateway/index.ts) — bei leerem stdout wäre das
      // real 'false'. Für dieses Gate ohne Fachbedeutung (rohstrom-Projektion liest das Feld nicht),
      // hier trotzdem realitätsnah gehalten statt eines widersprüchlichen 'true'.
      beobachtungsbasis_vollstaendig: false,
      rohstrom_referenz: { pfad: join('kontrollzustand-roh', laufId, 'rohstrom.json'), inhalts_hash: sha256Hex(rohInhaltGruen) },
      erstellt_am: new Date().toISOString(),
    },
    [],
    { basisVerzeichnis, schreiber: () => {} }
  )

  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, repoWurzel })
  try {
    const gruen = await (await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufId)}`)).json()
    if (gruen.rohstrom?.status !== 'ok' || gruen.rohstrom.exitCode !== 0 || gruen.rohstrom.ergebnisobjekt?.status !== 'kein_ergebnisobjekt') {
      befunde.push(
        `AK8-Grünfall: unveränderter Rohstrom (leeres stdout) erwartet rohstrom.status 'ok' mit exitCode 0 und ergebnisobjekt.status 'kein_ergebnisobjekt', erhalten ${JSON.stringify(gruen.rohstrom)}`
      )
    }

    // Rotfall: Inhalt manipulieren, OHNE inhalts_hash in der Laufakte anzupassen (echte Byte-Änderung).
    writeFileSync(rohPfad, JSON.stringify({ werkzeugStartziel: ['claude'], stdout: '', stderr: '', exitCode: 1, startfehler: null }), 'utf8')

    const rot = await (await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufId)}`)).json()
    const rohstromFelder = Object.keys(rot.rohstrom ?? {})
    if (rot.rohstrom?.status !== 'hash_weicht_ab' || rohstromFelder.length !== 1) {
      befunde.push(`AK8-Rotfall: manipulierter Rohstrom erwartet AUSSCHLIESSLICH { status: 'hash_weicht_ab' } (kein exitCode/permissionDenials/sonstiges Feld), erhalten ${JSON.stringify(rot.rohstrom)}`)
    }

    // Zusatzfall (Reviewer-Hinweis): Hash passt, aber der Dateiinhalt selbst ist kein gültiges JSON —
    // eigene laufId/eigene Laufakte-Version, damit dieser Fall den Rotfall oben nicht verdrängt.
    const laufIdNichtParsebar = `check-f12-ws3-ak8-np-${randomUUID()}`
    schreibeWirkungsmarke(laufIdNichtParsebar, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })
    const rohVerzeichnisNichtParsebar = join(repoWurzel, 'kontrollzustand-roh', laufIdNichtParsebar)
    mkdirSync(rohVerzeichnisNichtParsebar, { recursive: true })
    const rohPfadNichtParsebar = join(rohVerzeichnisNichtParsebar, 'rohstrom.json')
    const rohInhaltNichtParsebar = 'kein gueltiges JSON { {{'
    writeFileSync(rohPfadNichtParsebar, rohInhaltNichtParsebar, 'utf8')
    registriereKernArtefakt(
      `laufakte-${laufIdNichtParsebar}`,
      PROFIL_REFERENZ,
      { erzeuger: 'kern', schritt: 'check-f12-ws3-ak8-fixture-nicht-parsebar' },
      {
        laufakte_schema: 'v0',
        lauf_id: laufIdNichtParsebar,
        werkzeug_version_deklariert: 'test-version',
        berechtigungskontext: 'test-kontext',
        arbeitsverzeichnis_pfad: repoWurzel,
        modell_beobachtet: null,
        beobachtungsbasis_vollstaendig: false,
        rohstrom_referenz: { pfad: join('kontrollzustand-roh', laufIdNichtParsebar, 'rohstrom.json'), inhalts_hash: sha256Hex(rohInhaltNichtParsebar) },
        erstellt_am: new Date().toISOString(),
      },
      [],
      { basisVerzeichnis, schreiber: () => {} }
    )
    const nichtParsebar = await (await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufIdNichtParsebar)}`)).json()
    if (nichtParsebar.rohstrom?.status !== 'nicht_parsebar') {
      befunde.push(`AK8-Zusatzfall: Hash-gültiger, aber syntaktisch ungültiger Rohstrom erwartet rohstrom.status 'nicht_parsebar', erhalten ${JSON.stringify(nichtParsebar.rohstrom)}`)
    }

    if (befunde.length === 0) {
      console.log(
        "✓ AK8: gültiger Rohstrom liefert die volle Projektion; ein manipulierter Rohstrom (Hash weicht ab) liefert AUSSCHLIESSLICH { status: 'hash_weicht_ab' } — kein stiller Durchlauf; ein hash-gültiger, aber nicht parsebarer Rohstrom liefert { status: 'nicht_parsebar' }."
      )
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(repoWurzel)
  }
}

// ─── (e) F16 AK12: worker/modellDeklariert in der Detailprojektion — Codex-Laufakte liefert beide Felder, Bestands-Laufakte ohne beide Felder fällt auf 'claude-code'/null ──
{
  const basisVerzeichnis = 'kontrollzustand-test-f12-ws3-ak12'
  const laufIdCodex = `check-f12-ws3-ak12-codex-${randomUUID()}`
  const laufIdBestand = `check-f12-ws3-ak12-bestand-${randomUUID()}`
  const laufIdCodexOhneModell = `check-f12-ws3-ak12-codex-ohne-modell-${randomUUID()}`

  // Fixture-Aufbau wie in (d): schreibeWirkungsmarke für die Laufkette (das Laufverzeichnis
  // <laufId> muss real existieren, sonst antwortet der Detailendpunkt gar nicht) PLUS
  // registriereKernArtefakt für die Laufakte. rohstrom_referenz ist nach
  // validiereLaufakteDaten (src/claude-code-gateway/index.ts) ein Pflichtfeld und steht
  // deshalb hier, obwohl dieser Fall die Rohstrom-Projektion nicht prüft — eine Fixture,
  // die eine real nie entstehende Form nachbaut, belegt am Ende die falsche Sache. Die
  // Datei dahinter wird bewusst nicht angelegt: rohstrom.status fällt damit auf
  // 'nicht_verfuegbar', was diesen Fall nicht berührt.
  const laufakteBasis = (laufId) => ({
    laufakte_schema: 'v0',
    lauf_id: laufId,
    werkzeug_version_deklariert: 'test-version',
    berechtigungskontext: 'test-kontext',
    arbeitsverzeichnis_pfad: basisVerzeichnis,
    modell_beobachtet: null,
    beobachtungsbasis_vollstaendig: false,
    rohstrom_referenz: { pfad: join('kontrollzustand-roh', laufId, 'rohstrom.json'), inhalts_hash: '0'.repeat(64) },
    erstellt_am: new Date().toISOString(),
  })

  for (const [laufId, zusatz] of [
    // Codex-Lauf: beide Felder real gesetzt. modell_beobachtet bleibt null — für Codex ist
    // die Beobachtung korrekt leer, die deklarierte Angabe ersetzt sie nicht.
    [laufIdCodex, { worker: 'codex', modell_deklariert: 'gpt-6-astra' }],
    // Bestands-Laufakte: beide Felder fehlen vollständig (Zustand vor F16).
    [laufIdBestand, {}],
    // Zwischenstück: die beiden Felder sind unabhängig optional, ein Codex-Lauf OHNE
    // deklarierte Angabe ist schema-zulässig. Belegt, dass das fehlende Feld auch dann
    // null bleibt und nicht etwa aus dem worker abgeleitet wird.
    [laufIdCodexOhneModell, { worker: 'codex' }],
  ]) {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })
    registriereKernArtefakt(
      `laufakte-${laufId}`,
      PROFIL_REFERENZ,
      { erzeuger: 'kern', schritt: 'check-f12-ws3-ak12-fixture' },
      { ...laufakteBasis(laufId), ...zusatz },
      [],
      { basisVerzeichnis, schreiber: () => {} }
    )
  }

  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis })
  try {
    const codex = await (await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufIdCodex)}`)).json()
    if (codex.laufakte?.worker !== 'codex' || codex.laufakte?.modellDeklariert !== 'gpt-6-astra') {
      befunde.push(`AK12-Codexfall: Laufakte mit worker 'codex' und modell_deklariert 'gpt-6-astra' erwartet beide Felder in der Detailprojektion, erhalten ${JSON.stringify(codex.laufakte)}`)
    }

    const bestand = await (await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufIdBestand)}`)).json()
    if (bestand.laufakte?.worker !== 'claude-code') {
      befunde.push(`AK12-Bestandsfall: Laufakte ohne 'worker' erwartet worker 'claude-code' (AK4: fehlend bedeutet claude-code), erhalten ${JSON.stringify(bestand.laufakte?.worker)}`)
    }
    // Strikt auf null, nicht auf falsy: ein geratener Wert (z. B. 'claude-sonnet-5' aus der
    // Startvorlage) wäre genau der Fehler, den dieser Fall verhindern soll.
    if (bestand.laufakte?.modellDeklariert !== null) {
      befunde.push(`AK12-Bestandsfall: Laufakte ohne 'modell_deklariert' erwartet modellDeklariert null (kein Raten aus Startvorlage/Beobachtung), erhalten ${JSON.stringify(bestand.laufakte?.modellDeklariert)}`)
    }

    const codexOhneModell = await (await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufIdCodexOhneModell)}`)).json()
    if (codexOhneModell.laufakte?.worker !== 'codex' || codexOhneModell.laufakte?.modellDeklariert !== null) {
      befunde.push(
        `AK12-Zwischenstück: Laufakte mit worker 'codex' ohne 'modell_deklariert' erwartet worker 'codex' und modellDeklariert null, erhalten ${JSON.stringify(codexOhneModell.laufakte)}`
      )
    }

    if (befunde.length === 0) {
      console.log(
        "✓ AK12: eine Codex-Laufakte liefert worker/modellDeklariert aus GET /api/laeufe/<laufId>; eine Bestands-Laufakte ohne beide Felder liefert worker 'claude-code' und modellDeklariert null; ein Codex-Lauf ohne deklarierte Angabe behält modellDeklariert null — kein geratener Wert."
      )
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (f) F16 AK12: renderLaufakte führt worker/modellDeklariert/modellBeobachtet als je eigene Zeile, Label dem richtigen Feld zugeordnet ──
//
// REGRESSIONSSCHUTZ, KEIN AK12-BELEG (F-272). AK12 wird durch den realen
// zweistufigen Lauf belegt, nicht durch dieses Gate: eine Quelltextprüfung
// zeigt, dass die Oberfläche die Felder im Code FÜHRT — nicht, dass ein
// Browser sie darstellt. Sie schützt die Anzeige nur dagegen, dass ein
// späterer Umbau von renderLaufakte eine Zeile still verliert oder zwei
// Labels vertauscht, während Fall (e) weiter grün bleibt (F-327: API-Feld
// und angezeigte Zeile haben sonst kein gemeinsames Gate).
//
// Muster: scripts/check-f15-workflow-oberflaeche.mjs. Geprüft wird der
// KOMMENTARFREIE Quelltext — der Kopfkommentar von renderLaufakte nennt
// alle drei Feldnamen, ohne dass eine einzige Zeile gerendert würde.
//
// Label UND Feld stehen in EINEM Muster je Zeile. Eine reine
// Vorkommensprüfung ("irgendwo steht 'Worker', irgendwo steht
// laufakte.worker") bliebe grün, wenn jemand die Werte vertauscht — genau
// der Fehler, der einen Codex-Lauf als claude-code ausweisen würde.
{
  const appQuelltext = readFileSync('public/leitstand/app.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')

  for (const [label, feld] of [
    ['Worker', 'worker'],
    ['Modell \\(deklariert\\)', 'modellDeklariert'],
    ['Modell \\(beobachtet\\)', 'modellBeobachtet'],
  ]) {
    // <tr><th>LABEL</th><td>${laufakte.FELD ? escapeHtml(laufakte.FELD) : ...
    const muster = new RegExp(`<tr><th>${label}</th><td>\\$\\{laufakte\\.${feld}\\s*\\?\\s*escapeHtml\\(laufakte\\.${feld}\\)`)
    if (!muster.test(appQuelltext)) {
      befunde.push(
        `AK12-Anzeige: renderLaufakte führt keine Zeile, die das Label '${label.replace(/\\/g, '')}' mit dem Feld laufakte.${feld} paart (escapeHtml inbegriffen) — Zeile fehlt, Label und Feld sind vertauscht, oder der Wert wird ungeescaped eingesetzt (gesucht: ${muster})`
      )
    }
  }

  // Die unqualifizierte Zeile darf NICHT zurückkehren: "Modell" neben "Modell (deklariert)"
  // liest sich als die maßgebliche Angabe, obwohl sie die beobachtete ist. Umgedrehte
  // Zusage statt gelöschter Grenze (Muster check-f15-workflow-oberflaeche.mjs Fall (e)).
  if (/<tr><th>Modell<\/th>/.test(appQuelltext)) {
    befunde.push("AK12-Anzeige: renderLaufakte führt wieder eine unqualifizierte Zeile '<th>Modell</th>' — beide Modellzeilen müssen ihren Rang nennen ('beobachtet'/'deklariert')")
  }

  if (befunde.length === 0) {
    console.log(
      '✓ AK12-Anzeige (Regressionsschutz, kein AK12-Beleg — F-272): renderLaufakte paart Worker/Modell (deklariert)/Modell (beobachtet) mit je ihrem Feld, alle über escapeHtml; keine unqualifizierte Modell-Zeile.'
    )
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
// process.exitCode statt process.exit(): ein explizites process.exit() direkt nach mehreren
// Server-open/close-Zyklen löst auf diesem Windows-Rechner real reproduzierbar einen
// libuv-Assertion-Absturz aus ("UV_HANDLE_CLOSING", src/win/async.c) — der Exit-Code-Vertrag
// (0 sauber, 1 Befund) bleibt unverändert, Node beendet sich danach von selbst.
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
