/**
 * Datei: scripts/check-f15-workflow-oberflaeche.mjs
 *
 * Zweck: F15-WS-3a/3b-Gate für die OBERFLÄCHE des Leitstands. Es prüft den
 * Quelltext von public/leitstand/index.html sowie der Workflow-Module gegen
 * die Zusagen der Workflow-Ansicht (AK8, erster von zwei Commits).
 *
 * F20 WS-1 (14.09.2026, F-352): `public/leitstand/app.js` war bis zur
 * Modul-Aufteilung die GESAMTE Client-Logik in einer Datei — dieses Gate las
 * sie deshalb komplett. Seit der Aufteilung in `router.js`, `api.js`,
 * `render.js` und `views/*.js` ist app.js nur noch ein dünner Bootstrap; die
 * Workflow-Ansicht und -Bedienung liegen in `views/workflows.js`, die
 * fetch()-Aufrufe selbst in `api.js` (eine View ruft dort eine benannte
 * Funktion auf, die Endpunkt-Literale liegen NUR noch in api.js). Dieses
 * Gate liest seither `views/workflows.js` UND `api.js` und verteilt seine
 * Zusagen auf die Datei, in der sie tatsächlich stehen — WAS geprüft wird,
 * ist unverändert, NUR die Fundstelle hat sich mit der Architektur
 * mitbewegt (Rot-Fall bei jeder der beiden Dateien real erhalten, siehe
 * Ende dieser Datei / QA-Nachweis F20 WS-1).
 *
 * F20 WS-2 (14.09.2026, F-362): die Poll-Konsolidierung (GET /api/zustand
 * statt drei setInterval-Timer, siehe public/leitstand/zustand.js) hat Fall
 * (b) real gebrochen — `views/workflows.js` ruft `holeWorkflows()` seither
 * NICHT mehr auf, die Liste kommt als Abnehmer des einen Poll-Timers
 * (`renderWorkflows(zustand.workflows)` in einem `abonniere(...)`-Callback).
 * (b) prüft seither GENAU diese Verdrahtung statt des alten
 * `await holeWorkflows()`-Aufrufs; Fall (g)s `pollWorkflows()`-Zusage ist aus
 * demselben Grund auf `pollJetzt()` (zustand.js) umgestellt — beide
 * Rot-Fälle real erhalten (Aufruf/Literal vorübergehend entfernt, Gate lief
 * rot, danach zurückgesetzt). Die AK3-Invariante selbst (genau ein
 * setInterval, in zustand.js, zielt auf /api/zustand) ist NICHT Teil dieses
 * Gates — sie steht als eigener, cross-cutting Client-Check in
 * `scripts/check-f20-zustand-poll.mjs` (Arbeitsteilung wie bei F-327: dort
 * die gesamte Oberfläche, hier ausschließlich die Workflow-Ansicht).
 *
 * WARUM ES DIESES GATE ÜBERHAUPT GIBT — bitte vor dem Löschen lesen:
 * `public/leitstand/` war bis hierher NICHT gegatet. scripts/check-f12-
 * leitstand-ansicht.mjs trug „Leitstand-Ansicht" im Namen, prüfte aber die
 * API-Projektionen HINTER der Ansicht (GET /api/laeufe, der Detailendpunkt,
 * der Rohstrom-Lesepfad), nicht die Ansicht selbst. Wer aus dem Namen auf
 * Deckung schloss, nahm eine Deckung an, die es nicht gab; genau diese
 * Fehlannahme ist beim Challenger real aufgetreten.
 *
 * Seit F16 AK12 prüft jenes Gate in seinem Fall (f) auch renderLaufakte
 * (seit F20 WS-1 in views/runs.js). Die Arbeitsteilung bleibt und ist der
 * Grund, warum beide Gates getrennt stehen: dort die fünf Zeilen des
 * Laufakte-Blocks, hier die Workflow-Ansicht und -Bedienung.
 *
 * WAS DIESES GATE NICHT IST: eine Quelltextprüfung, kein Rendern. Sie
 * belegt, dass die Oberfläche die genannten Felder und Endpunkte im Code
 * FÜHRT — nicht, dass ein Browser sie korrekt darstellt. Der reale Blick auf
 * die Seite bleibt Sache des Nachweises, nicht dieses Gates.
 *
 * Geprüft wird:
 * (a) index.html — der Abschnitt, seine Container-ids und der Einleitungssatz,
 *     der die schreibenden Ausnahmen benennt.
 * (b) views/workflows.js + api.js — die beiden Leseendpunkte GET
 *     /api/workflows und GET /api/workflows/<id>: api.js führt beide.
 *     Die Liste liest die View seit F20 WS-2 NICHT mehr per eigenem
 *     fetch()-Aufruf, sondern als Abnehmer des Zustands-Aggregat-Polls
 *     (abonniere(...) in zustand.js, renderWorkflows(zustand.workflows));
 *     das Detail ruft weiterhin direkt holeWorkflowDetail(workflowId) auf.
 * (c) views/workflows.js (+ views/runs.js für den Lauf-Verweis) —
 *     Kopfdaten- und Schrittfelder, jedes EINZELN nachgewiesen. Eine
 *     Sammelprüfung („irgendwas mit schritt") bliebe grün, während die halbe
 *     Liste fehlt.
 * (d) views/workflows.js (+ api.js für F-234) — der Zustand „Fassung
 *     ungültig", seit WS-3b aus dem Server-Feld verstoesse statt aus einem
 *     nie gesendeten 409 (F-247), und die Markierung des aktiven Laufs
 *     (F-234).
 * (e) api.js — die UMGEDREHTE Scope-Zusage. WS-3a hielt hier fest, dass die
 *     Oberfläche KEINEN der Schreibendpunkte aufruft; WS-3b verlangt genau
 *     diese Aufrufe. Der Fall ist umgedreht, nicht gelöscht: eine gelöschte
 *     Grenze hinterlässt keine Spur. Seit F20 WS-1 liegen die Endpunkt-
 *     Literale in api.js, nicht mehr am Bedienungs-Aufrufort.
 * (f) views/workflows.js, api.js, views/runs.js, router.js — Syntaxprüfung
 *     (node --check) auf allen vier. Der Ordner public liegt AUSSERHALB von
 *     Biome (biome.json führt nur scripts und src) und außerhalb von tsc
 *     (tsconfig ebenso, und nur .ts). Ohne diese Prüfung bliebe eine
 *     syntaktisch kaputte Datei in der gesamten Kette grün: eine
 *     Quelltextsuche findet ihre Muster auch dann noch.
 * (g) views/workflows.js (+ api.js) — F15 WS-3b: das Automaten-Verdikt
 *     (naechster) als Quelle der angezeigten Lage, jede der vier
 *     Bedienungen an GENAU ihrem Endpunkt, die Pflichtbegründungen und die
 *     ehrliche 409-Meldung statt eines Vorabsperrens.
 * (h) views/workflows.js (+ api.js für das Einreichen) — F15 WS-3b: der
 *     Reparaturentwurf mit seinen vier Korrekturen und den drei Warnungen
 *     (F-219, F-223, F-226).
 *
 * Alle Quelltext-Prüfungen laufen gegen den KOMMENTARFREIEN Quelltext
 * (entferneKommentare). Sonst hielte ein Kommentar, der einen Endpunkt nur
 * ERWÄHNT, die Scope-Grenze fälschlich für verletzt — und ein Feldname in
 * einem Kommentar zählte als „gerendert".
 *
 * Wird aufgerufen von: `npm run check`
 *
 * Aufruf: node scripts/check-f15-workflow-oberflaeche.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const befunde = []
console.log('\n=== F15-WS-3a/3b-Check (Workflow-Ansicht und -Bedienung, Quelltext von public/leitstand/) ===\n')

/**
 * Entfernt Block- und Zeilenkommentare aus JavaScript-Quelltext, damit eine
 * Quelltextprüfung über Code und nicht über Prosa urteilt.
 *
 * Bewusst einfach gehalten und deshalb mit einer Grenze: ein `//` innerhalb
 * eines Strings wird als Kommentarbeginn gelesen, außer es steht direkt
 * hinter einem `:` (das schützt `http://`). Die geprüften Dateien enthalten
 * heute keinen anderen Fall.
 *
 * Fehlerverhalten, und es ist NICHT symmetrisch: strippt diese Funktion zu
 * viel, gehen die Positivprüfungen (a)-(d) ins Rot und der Fehler fällt auf.
 * Die Scope-Grenze (e) ginge als einzige ins Grün — ein mitentfernter
 * Schreibaufruf verschwände spurlos. Deshalb läuft (e) zusätzlich gegen den
 * ungestrippten Quelltext, mit der Regel, die Prosa nicht auslöst.
 * @param quelltext - Inhalt einer .js-Datei
 * @returns derselbe Text ohne Kommentare
 */
function entferneKommentare(quelltext) {
  return quelltext.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

const htmlQuelltext = readFileSync('public/leitstand/index.html', 'utf8')
const workflowsQuelltext = entferneKommentare(readFileSync('public/leitstand/views/workflows.js', 'utf8'))
const apiQuelltext = entferneKommentare(readFileSync('public/leitstand/api.js', 'utf8'))
const runsQuelltext = entferneKommentare(readFileSync('public/leitstand/views/runs.js', 'utf8'))
// Kombiniert für Zusagen, die über die Modulgrenze hinweg gelten: die View ruft eine
// api.js-Funktion beim Namen auf, das Endpunkt-Literal steht in deren Definition.
const appQuelltext = [workflowsQuelltext, apiQuelltext].join('\n')

/**
 * Eine einzelne Zusage: `muster` muss in `quelltext` vorkommen.
 * @param bereich - Kennung des Prüfblocks für die Befundmeldung
 * @param name - was die Zusage behauptet
 * @param quelltext - zu durchsuchender Text
 * @param muster - String oder RegExp, der vorkommen muss
 */
function verlangeVorkommen(bereich, name, quelltext, muster) {
  const gefunden = typeof muster === 'string' ? quelltext.includes(muster) : muster.test(quelltext)
  if (!gefunden) {
    befunde.push(`(${bereich}) ${name}: nicht im Quelltext gefunden (gesucht: ${muster})`)
  }
}

// ─── (a) index.html: Abschnitt und Container-ids ────────────────────────────
verlangeVorkommen('a', 'Abschnitt <section id="workflows-abschnitt">', htmlQuelltext, '<section id="workflows-abschnitt">')
verlangeVorkommen('a', 'Überschrift <h2>Workflows</h2>', htmlQuelltext, '<h2>Workflows</h2>')
// workflow-detail-schliessen steht bewusst in derselben Liste: initWorkflowBedienung() greift
// unbedingt darauf zu und läuft VOR laden()/ladeWorkflows(). Fehlt die id, wirft der Bootstrap,
// und die GANZE Seite bleibt leer — nicht nur die Workflow-Ansicht.
for (const id of ['workflows', 'workflow-detail', 'workflow-detail-titel', 'workflow-detail-inhalt', 'workflow-detail-fehler', 'workflow-detail-schliessen']) {
  verlangeVorkommen('a', `Container-id '${id}'`, htmlQuelltext, `id="${id}"`)
}

// F15 WS-3b: die neuen Container. Sie sind die Bedingung dafür, dass eine Pflichtbegründung
// den 2-Sekunden-Poll überlebt — stünden Bedienung und Reparaturentwurf in
// #workflow-detail-inhalt, wäre jede angefangene Eingabe nach zwei Sekunden weg (F-249).
for (const id of ['workflow-bedienung', 'workflow-bedienung-meldung', 'workflow-reparatur']) {
  verlangeVorkommen('a', `Container-id '${id}' (WS-3b)`, htmlQuelltext, `id="${id}"`)
}

// Der Einleitungssatz nannte seit F13 das Startformular und die Wiederaufnahme als einzige
// Ausnahmen von "rein lesend". Mit der Workflow-Bedienung stimmt das nicht mehr — WS-3b
// korrigiert ihn, und diese Zusage ist wie (e) UMGEDREHT statt gelöscht: der alte Wortlaut darf
// nicht mehr dastehen, der neue muss die Workflow-Bedienung nennen.
if (htmlQuelltext.includes('Ausnahme: das Startformular und die Wiederaufnahme-Bedienung')) {
  befunde.push('(a) Der Einleitungssatz nennt weiterhin nur Startformular und Wiederaufnahme als schreibende Ausnahmen — seit WS-3b schreibt auch die Workflow-Bedienung, der Satz ist damit unwahr')
}
verlangeVorkommen('a', 'Einleitungssatz nennt die Workflow-Bedienung als schreibende Ausnahme', htmlQuelltext, 'Workflow-Bedienung')

// ─── (b) die beiden Leseendpunkte: api.js führt sie, die View liest sie ────
// F20 WS-2 (F-362): die Liste kommt seither NICHT mehr aus einem direkten holeWorkflows()-Aufruf
// in workflows.js, sondern als Abnehmer des einen Zustands-Aggregat-Polls (zustand.js) — die
// Zusage lautet deshalb auf die Abonnement-Verdrahtung, nicht mehr auf den fetch()-Aufrufort. Der
// Endpunkt selbst bleibt in api.js geführt (AK1, Zeile darüber unverändert).
verlangeVorkommen('b', "GET /api/workflows (Liste) — api.js", apiQuelltext, "fetch('/api/workflows')")
verlangeVorkommen('b', 'GET /api/workflows/<id> (Detail) — api.js', apiQuelltext, /fetch\(`\/api\/workflows\/\$\{encodeURIComponent\(workflowId\)\}`\)/)
verlangeVorkommen('b', 'initWorkflowsView abonniert den Zustands-Aggregat-Poll für die Liste (F20 WS-2)', workflowsQuelltext, 'abonniere((zustand) => {')
verlangeVorkommen('b', 'die Liste rendert aus dem Aggregat (renderWorkflows(zustand.workflows), F20 WS-2)', workflowsQuelltext, 'renderWorkflows(zustand.workflows)')
verlangeVorkommen('b', 'ladeWorkflowDetail() ruft holeWorkflowDetail(workflowId) auf', workflowsQuelltext, 'await holeWorkflowDetail(workflowId)')

// ─── (c) Kopfdaten- und Schrittfelder, jedes einzeln ────────────────────────
// Kopfdaten aus GET /api/workflows (baueWorkflowKopfdaten, scripts/leitstand-server.mjs).
for (const feld of ['workflowId', 'ziel', 'versionSequenz', 'status', 'aktiverSchrittId', 'grund']) {
  verlangeVorkommen('c', `Listenfeld '${feld}'`, appQuelltext, `workflow.${feld}`)
}

// Schrittfelder aus daten.schritte (schemas/kontrollzustand-workflow-payload.schema.json).
for (const feld of ['schritt_id', 'rolle', 'worker', 'modell', 'freigabe', 'freigabe_erteilt', 'status', 'lauf_id', 'nachfolger', 'zeitgrenze_ms']) {
  verlangeVorkommen('c', `Schrittfeld '${feld}'`, appQuelltext, `schritt.${feld}`)
}

// Der Cursor und der Halt-Grund müssen auch im Detail stehen, nicht nur in der Liste.
for (const feld of ['aktiver_schritt_id', 'grund', 'version']) {
  verlangeVorkommen('c', `Detailfeld 'daten.${feld}'`, appQuelltext, `daten.${feld}`)
}

// Die lauf_id ist ein Verweis auf den bestehenden Lauf-Abschnitt, kein nackter String.
//
// F20 WS-1 (F-352): der Verweis ruft seither NICHT mehr ladeLaufDetail() direkt auf (das wäre
// ein Cross-View-Import ohne Not), sondern navigiert per Hash zur bestehenden Route
// '#/runs/<laufId>' (router.js) — runs.js registriert diese Route und ruft dort ladeLaufDetail
// auf. Zwei Zusagen statt einer, weil der Weg jetzt über zwei Dateien führt.
verlangeVorkommen('c', 'lauf_id als Verweis (Klasse workflow-lauf-verweis)', workflowsQuelltext, 'workflow-lauf-verweis')
verlangeVorkommen('c', "lauf_id-Verweis navigiert zur Lauf-Detail-Route ('#/runs/<laufId>')", workflowsQuelltext, 'navigiere(`#/runs/${encodeURIComponent(button.dataset.laufId)}`)')
verlangeVorkommen('c', "runs.js registriert die Route '#/runs/<laufId>' (öffnet das bestehende Lauf-Detail)", runsQuelltext, "registriere(/^#\\/runs\\/([^/]+)$/, 'runs', (laufId) => {")
verlangeVorkommen('c', "Die Route '#/runs/<laufId>' ruft ladeLaufDetail(laufId) auf", runsQuelltext, 'ladeLaufDetail(laufId)')

// Schrittliste in Planreihenfolge, nicht in Niederschriftreihenfolge.
verlangeVorkommen('c', 'Planreihenfolge (ordneSchritteNachPlan)', appQuelltext, 'ordneSchritteNachPlan(daten.schritte)')

// ─── (d) Ungültige Fassung (F-247) und aktiver Lauf (F-234) ─────────────────
// WS-3b stellt diesen Fall UM statt ihn zu löschen: der 409-Zweig aus WS-3a war vom echten
// Server unerreichbar (GET /api/workflows/<id> antwortete immer 200, F-247). Seit WS-3b liefert
// derselbe Endpunkt das Feld verstoesse — die Zusage lautet jetzt auf den realen Weg, und
// zusätzlich darauf, dass die Ansicht die kaputte Fassung TROTZDEM zeigt: sie anzusehen ist der
// erste Schritt ihrer Reparatur.
verlangeVorkommen('d', 'benannter Zustand "Fassung ungültig"', appQuelltext, 'Fassung ungültig')
verlangeVorkommen('d', 'F-247: die Verstöße kommen aus der Server-Antwort', appQuelltext, 'detail.verstoesse')
// Gesucht wird die AUFRUFSTELLE, nicht der Funktionsname: 'renderWorkflowUngueltig(verstoesse)'
// allein stünde auch in der Deklaration der Funktion, und die Zusage wäre dann durch ihre
// eigene Signatur erfüllbar (bei der Rotkalibrierung real aufgefallen).
verlangeVorkommen('d', 'F-247: die Verstöße werden gerendert', appQuelltext, 'verstoesse.length > 0 ? renderWorkflowUngueltig(verstoesse)')
if (/antwort\.status === 409/.test(appQuelltext)) {
  befunde.push('(d) F-247: app.js führt weiterhin einen 409-Zweig für den Detailendpunkt — der Endpunkt sendet diesen Status nicht, der Zweig ist tot und gehört auf verstoesse umgestellt')
}
// F20 WS-1 (F-352): der fetch()-Aufruf für den aktiven Lauf liegt seither in api.js
// (holeLaufDetail), die View ruft ihn nur noch mit schritt.lauf_id auf.
verlangeVorkommen('d', 'F-234: aktiver Lauf über holeLaufDetail(schritt.lauf_id)', workflowsQuelltext, 'holeLaufDetail(schritt.lauf_id)')
verlangeVorkommen('d', 'F-234: api.js holeLaufDetail ruft GET /api/laeufe/<laufId>', apiQuelltext, 'holeLaufDetail = (laufId) => fetch(`/api/laeufe/${encodeURIComponent(laufId)}`)')
verlangeVorkommen('d', 'F-234: Quelle ist das aktiv-Feld (D13), nicht der Schrittstatus', appQuelltext, 'detail.aktiv === true')
verlangeVorkommen('d', 'F-234: der aktive Schritt ist markiert', appQuelltext, 'läuft jetzt')

// ─── (e) WS-3b: die Bedienung IST da — die umgedrehte Scope-Zusage ──────────
//
// WS-3a hielt hier fest, dass die Oberfläche KEINEN der drei Schreibendpunkte aufruft. WS-3b
// dreht denselben Fall um, statt ihn zu löschen: eine gelöschte Grenze hinterlässt keine Spur,
// eine umgedrehte schon — und die Zusage bleibt eine Zusage, sie zeigt nur in die andere
// Richtung. F20 WS-1 (F-352): die Endpunkt-Literale liegen seither in api.js, nicht mehr am
// Bedienungs-Aufrufort in views/workflows.js — diese Prüfung läuft deshalb gegen apiQuelltext.
//
// Vier Schreibwege, nicht drei: /starten, /freigabe und /stoppen sind am Pfad erkennbar, der
// vierte — POST /api/workflows, über den die Reparaturfassung eingereicht wird — ist es nicht,
// weil die Ansicht denselben Pfad LESEND benutzt. Er wird deshalb an der Methode im selben
// fetch-Aufruf erkannt.
const SCHREIBFENSTER = 200

/** @param quelltext - zu durchsuchender api.js-Text @returns Namen der gefundenen Schreibwege über die Pfadregel */
function findePfadSchreibwege(quelltext) {
  return ['starten', 'freigabe', 'stoppen'].filter((endpunkt) => new RegExp(`/api/workflows/[^'"\`\\n]*/${endpunkt}`).test(quelltext)).map((endpunkt) => `/api/workflows/<id>/${endpunkt}`)
}

/** @param quelltext - zu durchsuchender api.js-Text @returns true, wenn hinter einem /api/workflows-Vorkommen im selben Aufruf eine POST-Methode steht */
function hatWorkflowPost(quelltext) {
  for (let idx = quelltext.indexOf('/api/workflows'); idx !== -1; idx = quelltext.indexOf('/api/workflows', idx + 1)) {
    if (/method:\s*'POST'/.test(quelltext.slice(idx, idx + SCHREIBFENSTER))) return true
  }
  return false
}

const gefundeneSchreibwege = findePfadSchreibwege(apiQuelltext)
for (const erwartet of ['/api/workflows/<id>/starten', '/api/workflows/<id>/freigabe', '/api/workflows/<id>/stoppen']) {
  if (!gefundeneSchreibwege.includes(erwartet)) {
    befunde.push(`(e) WS-3b-Bedienung: api.js führt '${erwartet}' NICHT — AK8 verlangt die Bedienung, nicht nur die Ansicht`)
  }
}
if (!hatWorkflowPost(apiQuelltext)) {
  befunde.push("(e) WS-3b-Bedienung: api.js schickt kein POST an '/api/workflows' — ohne das ist der Reparaturentwurf nicht einreichbar (F-240)")
}
// Und die View muss diese Endpunkt-Funktionen auch wirklich AUFRUFEN — api.js allein genügt
// nicht, sonst wäre eine ungenutzte Funktion ausreichend (dieselbe Lehre wie bei (b)).
for (const funktion of ['starteWorkflowSchritt', 'sendeWorkflowFreigabe', 'stoppeWorkflow', 'reicheWorkflowFassungEin']) {
  verlangeVorkommen('e', `views/workflows.js ruft ${funktion}(...) auf`, workflowsQuelltext, `${funktion}(`)
}

// ─── (g) WS-3b: Verdikt als Quelle, vier Bedienungen, Pflichtbegründungen ───
//
// Die Kernzusage dieses Blocks ist nicht "es gibt Knöpfe", sondern WORAN sie hängen: an
// naechster.art und status, beides Aussagen des Servers. Eine Oberfläche, die selbst
// ausrechnet, ob ein ZWINGEND-Schritt gerade fällig ist, wäre ein zweiter Regelsatz im Browser
// (D5) — und würde bei der nächsten Regeländerung in src/workflow/index.ts still falsch.
verlangeVorkommen('g', 'Lage kommt aus naechster (Liste)', appQuelltext, 'workflow.naechster')
verlangeVorkommen('g', 'Lage kommt aus naechster (Detail)', appQuelltext, 'detail.naechster')
verlangeVorkommen('g', 'je Ausgang ein Lagetext (LAGE_JE_AUSGANG)', appQuelltext, 'LAGE_JE_AUSGANG')
for (const ausgang of ['starte', 'haltFreigabe', 'haltKlaerung', 'haltGrenze', 'haltGestoppt', 'fertig']) {
  verlangeVorkommen('g', `Lagetext für den Ausgang '${ausgang}'`, appQuelltext, `${ausgang}:`)
}
// F-253: der fällige Schritt ist in der Tabelle markiert, und EMPFOHLEN ist als "hält nicht an"
// ausgewiesen — beides Anzeigelücken, die AK8 auch LESEND unerfüllt ließen.
verlangeVorkommen('g', 'F-253: der fällige Schritt ist in der Schrittliste markiert', appQuelltext, 'faelligMarke')
verlangeVorkommen('g', 'F-253: der Cursor-Schritt ist in der Schrittliste markiert', appQuelltext, 'cursorMarke')
verlangeVorkommen('g', 'F-253: die Freigabestufe ist als haltend/nicht haltend ausgewiesen', appQuelltext, '(hält nicht an)')

// Jede der vier Bedienungen ruft GENAU ihren Endpunkt — je einzeln nachgewiesen, nicht als
// Sammelprüfung: drei von vier zu haben ist der wahrscheinliche Fehler, nicht null von vier.
//
// F20 WS-1 (F-352): sendeWorkflowBedienung nimmt seither keine Literal-URL mehr entgegen,
// sondern eine Anfrage-Funktion aus api.js (Cross-Modul-Aufruf statt eines dritten Parameters
// mit demselben Endpunkt-String wie vorher) — je zwei Zusagen statt einer: der Aufrufort nennt
// die richtige api.js-Funktion MIT workflowId, und diese Funktion führt den richtigen Endpunkt.
verlangeVorkommen('g', 'Starten ruft sendeWorkflowBedienung(() => starteWorkflowSchritt(workflowId), ...) auf', workflowsQuelltext, 'sendeWorkflowBedienung(() => starteWorkflowSchritt(workflowId), button')
verlangeVorkommen('g', 'api.js: starteWorkflowSchritt führt POST .../starten', apiQuelltext, /starteWorkflowSchritt = \(workflowId\) => fetch\(`\/api\/workflows\/\$\{encodeURIComponent\(workflowId\)\}\/starten`, \{ method: 'POST'/)
verlangeVorkommen('g', 'Freigeben/Ablehnen rufen sendeWorkflowFreigabe(workflowId, ...) auf', workflowsQuelltext, 'sendeWorkflowFreigabe(workflowId, { schrittId: button.dataset.schrittId')
verlangeVorkommen('g', 'api.js: sendeWorkflowFreigabe führt POST .../freigabe', apiQuelltext, /sendeWorkflowFreigabe = \(workflowId, koerper\) => fetch\(`\/api\/workflows\/\$\{encodeURIComponent\(workflowId\)\}\/freigabe`, \{ method: 'POST'/)
verlangeVorkommen('g', 'Stoppen ruft sendeWorkflowBedienung(() => stoppeWorkflow(workflowId, ...), ...) auf', workflowsQuelltext, 'sendeWorkflowBedienung(() => stoppeWorkflow(workflowId, { begruendung })')
verlangeVorkommen('g', 'api.js: stoppeWorkflow führt POST .../stoppen', apiQuelltext, /stoppeWorkflow = \(workflowId, koerper\) => fetch\(`\/api\/workflows\/\$\{encodeURIComponent\(workflowId\)\}\/stoppen`, \{ method: 'POST'/)
verlangeVorkommen('g', 'Freigeben schickt entscheidung FREIGEGEBEN', appQuelltext, "'FREIGEGEBEN'")
verlangeVorkommen('g', 'Ablehnen schickt entscheidung ABGELEHNT', appQuelltext, "'ABGELEHNT'")
verlangeVorkommen('g', 'die Freigabe nennt den Schritt, für den sie gilt', appQuelltext, 'schrittId: button.dataset.schrittId')

// Pflichtbegründungen: der Server antwortet ohne sie mit 400, und die Oberfläche darf diesen
// 400 nicht erst provozieren.
verlangeVorkommen('g', 'Pflichtbegründung der Freigabe/Ablehnung', appQuelltext, 'wf-freigabe-begruendung')
verlangeVorkommen('g', 'Pflichtbegründung des Stopps', appQuelltext, 'wf-stopp-begruendung')

// D13 wird gemeldet, nicht vorhergesagt: kein Vorabsperren anhand eines vermuteten aktiven
// Laufs, sondern der Grundtext des 409.
verlangeVorkommen('g', 'Fehlerantworten werden als Meldung am Workflow gezeigt', appQuelltext, 'zeigeBedienungsMeldung')
// Auch der ERFOLG bekommt eine Rückmeldung, und sie wertet den Antwortkörper aus: ob ein
// fliegender Lauf abgebrochen wurde (laufAbgebrochen) und ob die Entscheidung bezeugt werden
// konnte (bezeugt). Ohne diese Auswertung schwiege die Oberfläche ausgerechnet nach den
// Bedienungen, die etwas Unwiderrufliches tun (QA-Pass 10.09.2026).
verlangeVorkommen('g', 'Erfolgsmeldung je Bedienung', appQuelltext, 'erfolgstext')
verlangeVorkommen('g', 'der Erfolgskörper wird ausgewertet (laufAbgebrochen)', appQuelltext, 'inhalt.laufAbgebrochen === true')
verlangeVorkommen('g', 'der Erfolgskörper wird ausgewertet (bezeugt)', appQuelltext, 'inhalt.bezeugt === false')
// F20 WS-2 (F-362): der lokale pollWorkflows() ist entfallen — "außer der Reihe" heißt seither
// pollJetzt() aus zustand.js aufzurufen (derselbe eine Poll-Timer, nur außerhalb seines Taktes).
verlangeVorkommen('g', 'Poll außer der Reihe nach jeder Bedienung', appQuelltext, 'pollJetzt()')
// Der Überholschutz aus F-252 muss auch für den neuen Ladeweg greifen: ein älterer Tick darf
// weder Schrittliste noch Bedienknöpfe zurückschreiben.
verlangeVorkommen('g', 'F-252: der Bedienblock hängt am Überholschutz des Detail-Ladewegs', appQuelltext, 'aktualisiereWorkflowBedienung(workflowId')

// ─── (h) WS-3b: der Reparaturzug ────────────────────────────────────────────
//
// Die vier Korrekturen aus F-240 einzeln, weil sie einzeln vergessen werden können und jede
// einzelne Auslassung denselben Endzustand erzeugt: eine Fassung, die angenommen wird und
// sofort wieder steht.
verlangeVorkommen('h', 'Knopf "Reparaturfassung vorbereiten"', appQuelltext, 'Reparaturfassung vorbereiten')
verlangeVorkommen('h', 'Reparatur nur aus GESTOPPT/KLAERUNG_ERFORDERLICH', appQuelltext, "REPARIERBARE_WORKFLOW_STATUS = ['GESTOPPT', 'KLAERUNG_ERFORDERLICH']")
verlangeVorkommen('h', 'Korrektur (1): status -> OFFEN', appQuelltext, "status: 'OFFEN', aktiver_schritt_id: cursor")
verlangeVorkommen('h', 'Korrektur (2): Schrittfelder des abgebrochenen/gescheiterten Schritts', appQuelltext, "REPARIERBARE_SCHRITT_STATUS = ['LAEUFT', 'FEHLGESCHLAGEN', 'VERWEIGERT']")
verlangeVorkommen('h', 'Korrektur (2): status OFFEN und lauf_id null je Schritt', appQuelltext, "{ ...schritt, status: 'OFFEN', lauf_id: null }")
verlangeVorkommen('h', 'Korrektur (3): Cursor bleibt, sonst erster Schritt ohne lauf_id', appQuelltext, 'daten.aktiver_schritt_id ?? schritte.find((schritt) => schritt.lauf_id === null)')
// Korrektur (4) ist eine UNTERLASSUNG — grund bleibt stehen. Sie ist deshalb nicht an einer
// Zeile nachweisbar, sondern nur daran, dass der Entwurf das Feld nicht überschreibt: ein
// 'grund:' im Objektliteral von baueReparaturEntwurf wäre der Fehler.
if (/function baueReparaturEntwurf[\s\S]{0,600}?grund:/.test(appQuelltext)) {
  befunde.push('(h) Korrektur (4): baueReparaturEntwurf setzt grund selbst — der Halt-Grund soll im Entwurf sichtbar BLEIBEN, damit der Mensch liest, warum der Workflow stand')
}
verlangeVorkommen('h', 'der Entwurf ist bearbeitbarer JSON-Text, kein Formular', appQuelltext, 'JSON.stringify(entwurf, null, 2)')
// F20 WS-1 (F-352): der fetch()-Aufruf liegt seither in api.js (reicheWorkflowFassungEin).
verlangeVorkommen('h', 'Einreichen ruft reicheWorkflowFassungEin(koerper) auf', workflowsQuelltext, 'reicheWorkflowFassungEin(koerper)')
verlangeVorkommen('h', 'api.js: reicheWorkflowFassungEin geht an POST /api/workflows', apiQuelltext, "reicheWorkflowFassungEin = (koerper) => fetch('/api/workflows', { method: 'POST'")

// Die drei Warnungen, jede an ihrer Befundnummer erkennbar — der Text ist die Zusage, nicht
// bloß Beiwerk: er sagt dem Menschen, WAS er verliert.
for (const befund of ['F-223', 'F-219', 'F-226']) {
  verlangeVorkommen('h', `Warnung ${befund} über dem Entwurf`, appQuelltext, `${befund}:`)
}
verlangeVorkommen('h', 'F-223: erkannt an erteilter Freigabe ohne Lauf', appQuelltext, 'schritt.freigabe_erteilt === true && schritt.lauf_id === null')
verlangeVorkommen('h', 'F-226: Begründungsfeld steht am Entwurf, nicht erst im 400', appQuelltext, 'wf-reparatur-begruendung')
// Die Warnung muss beim BEARBEITEN entstehen, nicht erst beim Absenden — sonst erscheint sie
// gleichzeitig mit dem Ergebnis und wird nie gelesen (QA-Pass 10.09.2026).
verlangeVorkommen('h', 'F-226: die Warnungen werden beim Tippen neu gerechnet', appQuelltext, 'aktualisiereReparaturWarnungen')
// Zwei weitere Verluste derselben Klasse, beide aus F-240s eigener Aufzählung: der Halt-Grund
// wird beim Einreichen wegnormalisiert, und eine erreichte Schrittgrenze hebt der Entwurf nicht
// an — ohne Hinweis wird die Fassung angenommen und steht sofort wieder.
verlangeVorkommen('h', 'F-240: Warnung vor dem Verlust des Halt-Grunds', appQuelltext, 'wird beim Einreichen auf null normalisiert')
verlangeVorkommen('h', 'F-240: Warnung vor der bereits erreichten Schrittgrenze', appQuelltext, 'grenzen.max_schritte ${grenze}')

// Der Reparaturweg darf NICHT allein am Status hängen: POST /api/workflows lässt einen
// ungültigen Bestand in JEDEM Status ersetzen (bestandUngueltig). Ohne diesen Öffner wäre genau
// die Fassung, für die F-247 die Lesbarkeit erkämpft hat, ansehbar und nicht reparierbar
// (QA-Pass 10.09.2026).
verlangeVorkommen('h', 'F-247: eine ungültige Fassung ist auch außerhalb GESTOPPT/KLAERUNG reparierbar', appQuelltext, 'REPARIERBARE_WORKFLOW_STATUS.includes(status) || ungueltig')
// Umgekehrt: kein Stopp-Knopf auf einer ungültigen Fassung — der Stopp-Endpunkt lehnt sie mit
// 409 ab (F-241), der Knopf wäre eine Zusage, die der Server sicher bricht.
verlangeVorkommen('h', 'F-241: kein Stopp-Knopf auf einer ungültigen Fassung', appQuelltext, 'STOPPBARE_WORKFLOW_STATUS.includes(status) && !ungueltig')
// Der Entwurf hat einen eigenen Überholschutz: ein Doppelklick oder ein Schließen während des
// Ladens darf eingetippte Änderungen nicht überschreiben (Reviewer-Pass 10.09.2026).
verlangeVorkommen('h', 'Überholschutz des Reparaturentwurfs', appQuelltext, 'reparaturZaehler')

// ─── (f) die hier geprüften Module sind syntaktisch gültig ──────────────────
// F20 WS-1 (F-352): app.js allein zu prüfen reichte, solange es die gesamte Logik enthielt —
// seither verteilt sich das auf mehrere Dateien, und eine kaputte views/workflows.js wäre sonst
// unentdeckt geblieben, obwohl das dünne app.js selbst weiter gültig bliebe. F20 WS-2 (F-362):
// zustand.js ergänzt — der eine Poll-Timer, von dem seither jede hier geprüfte View abhängt.
for (const pfad of ['public/leitstand/views/workflows.js', 'public/leitstand/api.js', 'public/leitstand/views/runs.js', 'public/leitstand/router.js', 'public/leitstand/zustand.js']) {
  try {
    execFileSync(process.execPath, ['--check', pfad], { encoding: 'utf8' })
  } catch (fehler) {
    const meldung = String(fehler.stderr ?? fehler.message).trim().split(/\r?\n/)
    befunde.push(`(f) ${pfad} ist syntaktisch ungültig: ${meldung.find((z) => z.includes('Error')) ?? meldung[0]}`)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
// process.exitCode statt process.exit(): Muster der übrigen Gates (siehe
// scripts/check-f12-leitstand-ansicht.mjs), Exit-Code-Vertrag unverändert.
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
