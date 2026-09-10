/**
 * Datei: scripts/check-f15-workflow-oberflaeche.mjs
 *
 * Zweck: F15-WS-3a-Gate für die OBERFLÄCHE des Leitstands. Es prüft den
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
 * (a) index.html — der Abschnitt und seine Container-ids.
 * (b) app.js — die beiden Leseendpunkte GET /api/workflows und
 *     GET /api/workflows/<id>.
 * (c) app.js — Kopfdaten- und Schrittfelder, jedes EINZELN nachgewiesen.
 *     Eine Sammelprüfung („irgendwas mit schritt") bliebe grün, während die
 *     halbe Liste fehlt.
 * (d) app.js — der Zweig für eine ungültige Fassung (409, F-241) und die
 *     Markierung des aktiven Laufs (F-234).
 * (e) app.js — die WS-3a-Scope-Grenze als Vertrag: KEIN Aufruf von
 *     POST /api/workflows/<id>/starten, /freigabe oder /stoppen.
 *     WS-3b dreht diesen Fall bewusst um — dort wird er ANGEPASST, nicht
 *     gelöscht.
 * (f) app.js — Syntaxprüfung (node --check). Der Ordner public liegt
 *     AUSSERHALB von Biome (biome.json führt nur scripts und src) und
 *     außerhalb von tsc (tsconfig ebenso, und nur .ts). Ohne diese Prüfung
 *     bliebe eine syntaktisch kaputte app.js in der gesamten Kette grün:
 *     eine Quelltextsuche findet ihre Muster auch dann noch.
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
console.log('\n=== F15-WS-3a-Check (Workflow-Ansicht, Quelltext von public/leitstand/) ===\n')

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

// Der Einleitungssatz nennt seit F13 das Startformular und die Wiederaufnahme als einzige
// Ausnahmen von "rein lesend". WS-3a fügt keine dritte hinzu; WS-3b tut es und muss den Satz
// dann korrigieren. Hier festgehalten, damit die Korrektur nicht vergessen wird.
verlangeVorkommen('a', 'Einleitungssatz nennt die Ausnahmen von "rein lesend"', htmlQuelltext, 'Ausnahme: das Startformular und die Wiederaufnahme-Bedienung')

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

// ─── (d) Ungültige Fassung (409, F-241) und aktiver Lauf (F-234) ────────────
verlangeVorkommen('d', '409-Zweig für eine ungültige Fassung', appQuelltext, 'antwort.status === 409')
verlangeVorkommen('d', 'benannter Zustand "Fassung ungültig"', appQuelltext, 'Fassung ungültig')
verlangeVorkommen('d', '409-Zweig zeigt den Grundtext des Servers', appQuelltext, 'renderWorkflowUngueltig(koerper.grund')
verlangeVorkommen('d', 'F-234: aktiver Lauf aus GET /api/laeufe/<laufId>', appQuelltext, /fetch\(`\/api\/laeufe\/\$\{encodeURIComponent\(schritt\.lauf_id\)\}`\)/)
verlangeVorkommen('d', 'F-234: Quelle ist das aktiv-Feld (D13), nicht der Schrittstatus', appQuelltext, 'detail.aktiv === true')
verlangeVorkommen('d', 'F-234: der aktive Schritt ist markiert', appQuelltext, 'läuft jetzt')

// ─── (e) WS-3a-Scope-Grenze: keine Bedienung ────────────────────────────────
// WS-3b DREHT diesen Fall um: dann MUSS app.js diese Endpunkte aufrufen, und die Prüfung wird
// dort angepasst — nicht gelöscht. Eine gelöschte Grenze hinterlässt keine Spur, eine
// umgedrehte schon.
//
// Vier Schreibwege, nicht drei: /starten, /freigabe und /stoppen sind am Pfad erkennbar, der
// vierte — POST /api/workflows, über den eine Reparaturfassung eingereicht würde — ist es
// nicht, weil die Ansicht denselben Pfad LESEND benutzt. Er wird deshalb an der Methode im
// selben fetch-Aufruf erkannt.
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

for (const weg of findePfadSchreibwege(appQuelltext)) {
  befunde.push(`(e) WS-3a-Scope: app.js ruft '${weg}' auf — WS-3a ist rein lesend, Bedienung ist WS-3b`)
}
if (hatWorkflowPost(appQuelltext)) {
  befunde.push("(e) WS-3a-Scope: app.js schickt ein POST an '/api/workflows' — eine neue Fassung einzureichen ist Bedienung (Reparaturentwurf), also WS-3b")
}

// Dieselbe Methodenregel noch einmal gegen den UNGESTRIPPTEN Quelltext. Grund: die
// Positivprüfungen (a)-(d) gehen bei einem zu gierigen entferneKommentare ins ROT und fallen
// damit auf; (e) ginge als einzige ins GRÜN — ein Schreibaufruf, den der Stripper versehentlich
// mitentfernt, verschwände spurlos. Die Methodenregel ist dafür geeignet und die Pfadregel
// nicht: Prosa nennt Endpunktpfade, aber kein "method: 'POST'".
if (hatWorkflowPost(readFileSync('public/leitstand/app.js', 'utf8'))) {
  befunde.push("(e) WS-3a-Scope: im ungestrippten Quelltext steht ein POST an '/api/workflows' — falls es nur ein Kommentarbeispiel ist, gehört es umformuliert, sonst ist es Bedienung (WS-3b)")
}

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
