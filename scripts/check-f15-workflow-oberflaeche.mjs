/**
 * Datei: scripts/check-f15-workflow-oberflaeche.mjs
 *
 * Zweck: F15-WS-3a/3b-Gate für die OBERFLÄCHE des Leitstands. Es prüft den
 * Quelltext von public/leitstand/index.html und public/leitstand/app.js
 * gegen die Zusagen der Workflow-Ansicht (AK8, erster von zwei Commits).
 *
 * WARUM ES DIESES GATE ÜBERHAUPT GIBT — bitte vor dem Löschen lesen:
 * `public/leitstand/` war bis hierher NICHT gegatet. scripts/check-f12-
 * leitstand-ansicht.mjs trägt „Leitstand-Ansicht" im Namen, enthält aber
 * keinen einzigen Verweis auf public/leitstand/ — es prüft die
 * API-Projektionen HINTER der Ansicht (GET /api/laeufe, der Detailendpunkt,
 * der Rohstrom-Lesepfad), nicht die Ansicht selbst. Wer aus dem Namen auf
 * Deckung schließt, nimmt eine Deckung an, die es nicht gibt; genau diese
 * Fehlannahme ist beim Challenger real aufgetreten.
 *
 * WAS DIESES GATE NICHT IST: eine Quelltextprüfung, kein Rendern. Sie
 * belegt, dass die Oberfläche die genannten Felder und Endpunkte im Code
 * FÜHRT — nicht, dass ein Browser sie korrekt darstellt. Der reale Blick auf
 * die Seite bleibt Sache des Nachweises, nicht dieses Gates.
 *
 * Geprüft wird:
 * (a) index.html — der Abschnitt, seine Container-ids und der Einleitungssatz,
 *     der die schreibenden Ausnahmen benennt.
 * (b) app.js — die beiden Leseendpunkte GET /api/workflows und
 *     GET /api/workflows/<id>.
 * (c) app.js — Kopfdaten- und Schrittfelder, jedes EINZELN nachgewiesen.
 *     Eine Sammelprüfung („irgendwas mit schritt") bliebe grün, während die
 *     halbe Liste fehlt.
 * (d) app.js — der Zustand „Fassung ungültig", seit WS-3b aus dem
 *     Server-Feld verstoesse statt aus einem nie gesendeten 409 (F-247), und
 *     die Markierung des aktiven Laufs (F-234).
 * (e) app.js — die UMGEDREHTE Scope-Zusage. WS-3a hielt hier fest, dass app.js
 *     KEINEN der Schreibendpunkte aufruft; WS-3b verlangt genau diese
 *     Aufrufe. Der Fall ist umgedreht, nicht gelöscht: eine gelöschte Grenze
 *     hinterlässt keine Spur.
 * (f) app.js — Syntaxprüfung (node --check). Der Ordner public liegt
 *     AUSSERHALB von Biome (biome.json führt nur scripts und src) und
 *     außerhalb von tsc (tsconfig ebenso, und nur .ts). Ohne diese Prüfung
 *     bliebe eine syntaktisch kaputte app.js in der gesamten Kette grün:
 *     eine Quelltextsuche findet ihre Muster auch dann noch.
 * (g) app.js — F15 WS-3b: das Automaten-Verdikt (naechster) als Quelle der
 *     angezeigten Lage, jede der vier Bedienungen an GENAU ihrem Endpunkt,
 *     die Pflichtbegründungen und die ehrliche 409-Meldung statt eines
 *     Vorabsperrens.
 * (h) app.js — F15 WS-3b: der Reparaturentwurf mit seinen vier Korrekturen
 *     und den drei Warnungen (F-219, F-223, F-226).
 *
 * Alle app.js-Prüfungen laufen gegen den KOMMENTARFREIEN Quelltext
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
 * hinter einem `:` (das schützt `http://`). public/leitstand/app.js enthält
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
const appQuelltext = entferneKommentare(readFileSync('public/leitstand/app.js', 'utf8'))

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

// ─── (b) app.js: die beiden Leseendpunkte ───────────────────────────────────
verlangeVorkommen('b', "GET /api/workflows (Liste)", appQuelltext, "fetch('/api/workflows')")
verlangeVorkommen('b', 'GET /api/workflows/<id> (Detail)', appQuelltext, /fetch\(`\/api\/workflows\/\$\{encodeURIComponent\(workflowId\)\}`\)/)

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
verlangeVorkommen('c', 'lauf_id als Verweis (Klasse workflow-lauf-verweis)', appQuelltext, 'workflow-lauf-verweis')
verlangeVorkommen('c', 'lauf_id-Verweis öffnet das bestehende Lauf-Detail', appQuelltext, 'ladeLaufDetail(button.dataset.laufId)')

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
verlangeVorkommen('d', 'F-234: aktiver Lauf aus GET /api/laeufe/<laufId>', appQuelltext, /fetch\(`\/api\/laeufe\/\$\{encodeURIComponent\(schritt\.lauf_id\)\}`\)/)
verlangeVorkommen('d', 'F-234: Quelle ist das aktiv-Feld (D13), nicht der Schrittstatus', appQuelltext, 'detail.aktiv === true')
verlangeVorkommen('d', 'F-234: der aktive Schritt ist markiert', appQuelltext, 'läuft jetzt')

// ─── (e) WS-3b: die Bedienung IST da — die umgedrehte Scope-Zusage ──────────
//
// WS-3a hielt hier fest, dass app.js KEINEN der drei Schreibendpunkte aufruft. WS-3b dreht
// denselben Fall um, statt ihn zu löschen: eine gelöschte Grenze hinterlässt keine Spur, eine
// umgedrehte schon — und die Zusage bleibt eine Zusage, sie zeigt nur in die andere Richtung.
//
// Vier Schreibwege, nicht drei: /starten, /freigabe und /stoppen sind am Pfad erkennbar, der
// vierte — POST /api/workflows, über den die Reparaturfassung eingereicht wird — ist es nicht,
// weil die Ansicht denselben Pfad LESEND benutzt. Er wird deshalb an der Methode im selben
// fetch-Aufruf erkannt.
const SCHREIBFENSTER = 200

/** @param quelltext - zu durchsuchender app.js-Text @returns Namen der gefundenen Schreibwege über die Pfadregel */
function findePfadSchreibwege(quelltext) {
  return ['starten', 'freigabe', 'stoppen'].filter((endpunkt) => new RegExp(`/api/workflows/[^'"\`\\n]*/${endpunkt}`).test(quelltext)).map((endpunkt) => `/api/workflows/<id>/${endpunkt}`)
}

/** @param quelltext - zu durchsuchender app.js-Text @returns true, wenn hinter einem /api/workflows-Vorkommen im selben Aufruf eine POST-Methode steht */
function hatWorkflowPost(quelltext) {
  for (let idx = quelltext.indexOf('/api/workflows'); idx !== -1; idx = quelltext.indexOf('/api/workflows', idx + 1)) {
    if (/method:\s*'POST'/.test(quelltext.slice(idx, idx + SCHREIBFENSTER))) return true
  }
  return false
}

const gefundeneSchreibwege = findePfadSchreibwege(appQuelltext)
for (const erwartet of ['/api/workflows/<id>/starten', '/api/workflows/<id>/freigabe', '/api/workflows/<id>/stoppen']) {
  if (!gefundeneSchreibwege.includes(erwartet)) {
    befunde.push(`(e) WS-3b-Bedienung: app.js ruft '${erwartet}' NICHT auf — AK8 verlangt die Bedienung, nicht nur die Ansicht`)
  }
}
if (!hatWorkflowPost(appQuelltext)) {
  befunde.push("(e) WS-3b-Bedienung: app.js schickt kein POST an '/api/workflows' — ohne das ist der Reparaturentwurf nicht einreichbar (F-240)")
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
verlangeVorkommen('g', 'Starten ruft POST .../starten', appQuelltext, /sendeWorkflowBedienung\(\s*`\/api\/workflows\/\$\{encodeURIComponent\(workflowId\)\}\/starten`/)
verlangeVorkommen('g', 'Freigeben/Ablehnen rufen POST .../freigabe', appQuelltext, /`\/api\/workflows\/\$\{encodeURIComponent\(workflowId\)\}\/freigabe`/)
verlangeVorkommen('g', 'Stoppen ruft POST .../stoppen', appQuelltext, /`\/api\/workflows\/\$\{encodeURIComponent\(workflowId\)\}\/stoppen`/)
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
verlangeVorkommen('g', 'Poll außer der Reihe nach jeder Bedienung', appQuelltext, 'pollWorkflows()')
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
verlangeVorkommen('h', 'Einreichen geht an POST /api/workflows', appQuelltext, /fetch\('\/api\/workflows', \{ method: 'POST'/)

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

// ─── (f) app.js ist syntaktisch gültig ──────────────────────────────────────
try {
  execFileSync(process.execPath, ['--check', 'public/leitstand/app.js'], { encoding: 'utf8' })
} catch (fehler) {
  const meldung = String(fehler.stderr ?? fehler.message).trim().split(/\r?\n/)
  befunde.push(`(f) public/leitstand/app.js ist syntaktisch ungültig: ${meldung.find((z) => z.includes('Error')) ?? meldung[0]}`)
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
