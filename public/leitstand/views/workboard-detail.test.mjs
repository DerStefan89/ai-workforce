/**
 * Datei: public/leitstand/views/workboard-detail.test.mjs
 *
 * Zweck: node:test-Fälle für das Detail `#/workboard/<id>` (F46 D3, views/workboard-detail.js, Bilder
 * 07-eintrag-detail--Main und --Bug): Feature in Arbeit, mit offener Abnahme und ohne Ablauf; Bug offen
 * (Triage) und „Fix bereit zur Bestätigung“; ein TECH_DEBT-Eintrag ohne Triage. Geprüft werden die
 * drei Ebenen (Kopf, Kurz gesagt nur aus Daten, Status-Block mit „kommt“, Jetzt-Band mit genau einem
 * Hauptknopf), Urteile je AK aus der Abnahme, Rollen-Kreis, Befunde laut Feld „Entdeckt“, Links,
 * Escaping aller Akten-, Register- und Serverwerte und dass keine Platzhalter der Designs oder rohen
 * Wörterbuchschlüssel erscheinen. Ausgabe in de (i18n.js ist in Node auf de festgelegt).
 *
 * Wird aufgerufen von: `npm run test` (node --test).
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  behebungsSchritte,
  detailEyebrowHtml,
  detailInhaltHtml,
  detailJetzt,
  detailKopfZusatzHtml,
  detailKurzHtml,
  detailSpalteHtml,
  detailStatusBlockHtml,
  jarvisEntwurf,
  kartenStatus,
  phaseHtml,
} from './workboard-detail.js'

const feature = { quelle: 'feature', typ: 'FEATURE', id: 'F7', titel: 'Bauen <aus> der Akte', status: 'IN_ARBEIT', pfad: 'features/F7/feature.md' }
const bug = { quelle: 'finding', typ: 'BUG', id: 'F-9', titel: 'Fehler <b>', status: 'OFFEN', statusRoh: 'offen <neu>', prioritaet: 'P1', beschreibung: 'Text <script>alert(1)</script> passiert. Zweiter Satz.', fundstelle: '`public/leitstand/shell.js:12` (initProjektAuswahl)', auswirkung: 'Mittel <i>', massnahme: 'Rückfrage <einbauen>.', featureRun: 'Entdeckt: F7 <WS-1>.', zeile: 120 }
const laufend = { workflowId: 'w1', auftragId: 'a1', status: 'LAEUFT', ziel: 'Ziel <des> Ablaufs', naechster: { art: 'starte', schrittId: 's2' }, aktiverSchrittId: 's2', abnahme: { offen: false, status: 'nicht_faellig' } }
const abgeschlossen = { workflowId: 'w1', auftragId: 'a1', status: 'ABGESCHLOSSEN', ziel: 'Ziel', naechster: { art: 'fertig', schrittId: null }, aktiverSchrittId: null, abnahme: { offen: true, status: 'nicht_vorhanden' } }
const schritte = [
  { schritt_id: 's1', rolle: 'ausfuehrung', worker: 'claude-code', status: 'ERFOLGREICH', nachfolger: 's2', lauf_id: 'l1' },
  { schritt_id: 's2', rolle: 'code-reviewer', worker: 'codex', status: 'LAEUFT', nachfolger: null, lauf_id: 'l2' },
]
const schritteFertig = schritte.map((s) => ({ ...s, status: 'ERFOLGREICH' }))
const akte = { status: 'ok', titel: 'T', featureStatus: 'IN_ARBEIT', ziel: 'Ein <b>Ziel</b> für alle. Zweiter Satz.\nzweite Zeile', nicht_ziele: ['Kein <Ziel>'], akzeptanzkriterien: [{ id: 'AK1', text: 'Erstes <AK>' }, { id: 'AK2', text: 'Zweites AK' }] }
const roadmap = { status: 'ok', vision: 'V', meilensteine: [{ id: 'm1', titel: 'Verlässlich <arbeiten>', status: 'LAEUFT', features: [{ id: 'F7', status: 'IN_ARBEIT' }] }] }
const abnahme = {
  workflowStatus: 'ABGESCHLOSSEN',
  entscheidung: { status: 'nicht_vorhanden' },
  pruefergebnis: { status: 'ok', ergebnis: 'GRUEN', exitCode: 0 },
  urteil: { status: 'ok', ak_urteile: [{ ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'Beleg <img src=x>' }] },
}
const workitems = [feature, { ...bug, id: 'F-10', featureRun: 'Entdeckt: F7 D1.' }, { ...bug, id: 'F-11', status: 'ERLEDIGT', featureRun: 'F7' }, { ...bug, id: 'F-12', featureRun: 'F70' }]

/** Sicht mit Standardwerten (Feature mit laufendem Ablauf). */
const sicht = (aenderung = {}) => ({ workitem: feature, workflow: laufend, verknuepfung: 'ok', schritte, abnahme: undefined, akte, roadmap, workitems, ctw: 'gesperrt', repoPfad: 'C:\\Projekte\\Demo', kreisAuswahl: null, wasReiter: null, ...aenderung })

/** Ganze Seite einer Sicht als ein Text (für Escape-, Platzhalter- und Schlüsselprüfungen). */
const seite = (s) => [detailEyebrowHtml(s.workitem), detailKopfZusatzHtml(s), detailKurzHtml(s), detailStatusBlockHtml(s), detailJetzt(s).html, detailInhaltHtml(s), detailSpalteHtml(s)].join('\n')

/** Keine Platzhalter der Designs, keine rohen Wörterbuchschlüssel, keine unescapten Daten. */
function pruefeSauber(html, name) {
  assert.doesNotMatch(html, /\[n\]|\[…\]|\[–\]|\{\{|\[Text\]|\[#\]/, `${name}: Platzhalter`)
  assert.doesNotMatch(html, />[^<]*\beintrag\.[a-z]+\.[a-zA-Z.]+/, `${name}: roher Schlüssel`)
  assert.doesNotMatch(html, /<script>|<b>Ziel|<AK>|<img src=x>|<einbauen>|<WS-1>|<des>/, `${name}: unescapter Wert`)
}

test('Feature in Arbeit: Kopf, Kurz gesagt aus Daten, Status-Block mit „kommt“, ruhige Zeile statt Jetzt-Band', () => {
  const s = sicht()
  assert.match(detailEyebrowHtml(feature), /typ-chip typ-chip-feature[\s\S]*Feature · F7/)
  assert.equal(detailKopfZusatzHtml(s), '')
  const kurz = detailKurzHtml(s)
  assert.match(kurz, /Was das ist:<\/strong> Ein &lt;b&gt;Ziel&lt;\/b&gt; für alle\./, 'erster Satz der Akte, gekürzt, escaped')
  assert.doesNotMatch(kurz, /Zweiter Satz/)
  assert.match(kurz, /Was gerade passiert:<\/strong> Code Review arbeitet \(Codex\)\./)
  assert.match(kurz, /Was als Nächstes kommt:<\/strong> Nach diesem Schritt ist der Ablauf abgeschlossen\./)
  const status = detailStatusBlockHtml(s)
  assert.match(status, /data-ton="neutral"|data-ton="aktiv"/)
  assert.match(status, /<dt>Phase<\/dt><dd><span title="LAEUFT">In Ausführung<\/span><\/dd>/)
  assert.match(status, /<dt>Gerade dran<\/dt><dd>Code Review · Codex<\/dd>/)
  for (const schluessel of ['Workstreams', 'Rest', 'Ist bisher']) assert.match(status, new RegExp(`<dt>${schluessel}</dt><dd><span class="kommt-badge">kommt</span></dd>`), schluessel)
  assert.match(status, /<dt>Meilenstein<\/dt><dd>Verlässlich &lt;arbeiten&gt;<\/dd>/)
  const jetzt = detailJetzt(s)
  assert.equal(jetzt.zustand, 'ruhig')
  assert.match(jetzt.html, /Gerade wartet nichts auf dich\./)
  assert.match(jetzt.html, /href="#\/workflows\/w1">Ablauf ansehen/)
  assert.doesNotMatch(jetzt.html, /button primary/)
  pruefeSauber(seite(s), 'Feature in Arbeit')
})

test('Feature mit offener Abnahme (Kopfdatum abnahme.offen): Jetzt-Band mit genau einem Hauptknopf „Ergebnis prüfen →“, Urteile je AK', () => {
  const s = sicht({ workflow: abgeschlossen, schritte: schritteFertig, abnahme })
  const jetzt = detailJetzt(s)
  assert.equal(jetzt.zustand, 'dran')
  assert.match(jetzt.html, /Jetzt · Deine Entscheidung/)
  assert.match(jetzt.html, /Abnahme des Features/)
  assert.equal((jetzt.html.match(/button primary/g) ?? []).length, 1)
  assert.match(jetzt.html, /href="#\/workflows\/w1">Ergebnis prüfen/)
  assert.match(detailStatusBlockHtml(s), /data-ton="warten"[\s\S]*· Abnahme offen/)
  assert.match(detailKurzHtml(s), /die Abnahme liegt bei dir[\s\S]*Deine Abnahme: Ergebnis prüfen/)
  const inhalt = detailInhaltHtml(s)
  assert.match(inhalt, /Abnahmekriterien · 2/)
  assert.match(inhalt, /<code class="was-ak-id">AK1<\/code><span class="was-ak-text">Erstes &lt;AK&gt;<span class="ak-beleg">Beleg &lt;img src=x&gt;<\/span><\/span><span class="ak-urteil-chip" data-urteil="ERFUELLT">Erfüllt<\/span>/)
  assert.match(inhalt, /AK2<\/code><span class="was-ak-text">Zweites AK<\/span><span class="ak-urteil-chip" data-urteil="keins">noch kein Urteil<\/span>/)
  // Rollen-Kreis: Builder fertig, Prüfschritt fertig (GRÜN), Abnahme jetzt (wartet auf dich).
  assert.match(inhalt, /id="detail-kreis-tab-builder"[^>]*data-status="fertig"/)
  assert.match(inhalt, /id="detail-kreis-tab-pruefschritt"[^>]*data-status="fertig"/)
  assert.match(inhalt, /id="detail-kreis-tab-abnahme"[^>]*data-status="jetzt"[^>]*aria-selected="true"/)
  assert.doesNotMatch(inhalt, /id="rollen-kreis-tab-/, 'eigenes ID-Präfix — die Übersicht steht gleichzeitig im DOM')
  pruefeSauber(seite(s), 'Feature Abnahme offen')
})

test('Feature ohne Ablauf: Kurz gesagt „kein Ablauf“ / „Auftrag vorbereiten“, Kreis ganz offen, ohne Urteil, ruhige Zeile ohne Link', () => {
  const s = sicht({ workflow: null, schritte: undefined, ctw: 'frei' })
  assert.match(detailKurzHtml(s), /Für diesen Eintrag läuft kein Ablauf\.[\s\S]*Du kannst unten einen Auftrag vorbereiten/)
  const jetzt = detailJetzt(s)
  assert.equal(jetzt.zustand, 'ruhig')
  assert.doesNotMatch(jetzt.html, /<a /)
  const inhalt = detailInhaltHtml(s)
  assert.doesNotMatch(inhalt, /data-status="(fertig|jetzt)"/)
  assert.match(inhalt, /Noch kein Ablauf|kein Ablauf/i)
  assert.doesNotMatch(inhalt, /eintrag-schritte/, 'ohne Ablauf keine Schritte im Einzelnen')
  assert.equal((inhalt.match(/noch kein Urteil/g) ?? []).length, 2)
  assert.match(detailKurzHtml(sicht({ workflow: null, workitem: { ...feature, status: 'ABGESCHLOSSEN' } })), /Nichts mehr — der Eintrag ist abgeschlossen\./)
  pruefeSauber(seite(s), 'Feature ohne Ablauf')
})

test('Das Was: Reiter Auftrag (Ziel, Akte in VS Code), Nicht-Ziele, Fertig, wenn (kommt); Register-Muster', () => {
  const auftrag = detailInhaltHtml(sicht({ wasReiter: 'auftrag' }))
  assert.match(auftrag, /role="tablist"/)
  assert.match(auftrag, /id="was-tab-auftrag"[^>]*aria-selected="true"[^>]*tabindex="0"/)
  assert.match(auftrag, /id="was-tab-ak"[^>]*aria-selected="false"[^>]*tabindex="-1"/)
  assert.match(auftrag, /<p class="was-auftrag">Ein &lt;b&gt;Ziel&lt;\/b&gt; für alle\. Zweiter Satz\.\nzweite Zeile<\/p>/)
  assert.match(auftrag, /href="vscode:\/\/file\/C:\/Projekte\/Demo\/features\/F7\/feature\.md">Ganze Akte in VS Code öffnen/)
  const ohneOrdner = detailInhaltHtml(sicht({ wasReiter: 'auftrag', repoPfad: null }))
  assert.match(ohneOrdner, /role="link" tabindex="0" aria-disabled="true"[^>]*>Ganze Akte in VS Code öffnen/)
  assert.match(detailInhaltHtml(sicht({ wasReiter: 'nicht' })), /<ul class="was-nicht-liste"><li>Kein &lt;Ziel&gt;<\/li><\/ul>/)
  assert.match(detailInhaltHtml(sicht({ wasReiter: 'dod' })), /kommt-badge[\s\S]*Fixpaket B2/)
})

test('Akte lädt, unvollständig (Grund und Pfad escaped) oder nicht lesbar', () => {
  assert.match(detailInhaltHtml(sicht({ akte: undefined })), /Die Akte wird gelesen …/)
  const unvoll = detailInhaltHtml(sicht({ akte: { status: 'unvollstaendig', grund: 'Abschnitt <Ziel> fehlt' } }))
  assert.match(unvoll, /Die Akte ist unvollständig\.[\s\S]*Abschnitt &lt;Ziel&gt; fehlt[\s\S]*features\/F7\/feature\.md/)
  assert.match(detailKurzHtml(sicht({ akte: { status: 'fehler', meldung: 'x' } })), /Die Akte ist nicht lesbar/)
})

test('Code & Doku Review und Verlauf: Doku echt, Befunde nur laut Feld „Entdeckt“, sonst „kommt“', () => {
  const inhalt = detailInhaltHtml(sicht())
  assert.match(inhalt, /<code>state\/findings\.md<\/code> · 2 offen/, 'Zahl offener Befunde im Register')
  assert.match(inhalt, /Änderungen[\s\S]*kommt-badge[\s\S]*Code-Ansicht \(F46 D4\)/)
  assert.match(inhalt, /Prüfungen[\s\S]*F-962/)
  assert.match(inhalt, /Entscheidungen[\s\S]*kommt-badge[\s\S]*F-995/)
  assert.match(inhalt, /<p class="eintrag-zahl">1 <span class="subtle">offen von 2<\/span><\/p>/)
  assert.match(inhalt, /laut Feld „Entdeckt“ im Register/)
  assert.match(inhalt, /href="#\/workboard\/F-11">F-11<\/a> <a class="text-link" href="#\/workboard\/F-10">F-10<\/a>/, 'neueste zuerst, F-12 (F70) nicht')
  assert.match(detailInhaltHtml(sicht({ workitems: [feature] })), /Kein Befund nennt dieses Feature/)
  assert.match(detailInhaltHtml(sicht({ workitems: undefined })), /Befunde aus diesem Feature<\/span><\/p><p class="subtle">Lädt…/)
})

test('Rechte Spalte (Feature): Planung nur lesend, Speichern und Pull Requests „kommt“, Links Akte, Roadmap, Jarvis', () => {
  const spalte = detailSpalteHtml(sicht())
  assert.match(spalte, /<h2 id="eintrag-spalte-titel">Deine Planung<\/h2>/)
  assert.match(spalte, /<dt>Meilenstein<\/dt><dd>Verlässlich &lt;arbeiten&gt;<\/dd>/)
  assert.match(spalte, /aria-disabled="true">Planung speichern <span class="kommt-badge">kommt<\/span>/)
  assert.match(spalte, /aria-disabled="true">Pull Requests auf GitHub <span class="kommt-badge">kommt<\/span>/)
  assert.match(spalte, /href="vscode:\/\/file\/C:\/Projekte\/Demo\/features\/F7\/feature\.md">Akte in VS Code öffnen/)
  assert.match(spalte, /href="#\/roadmap"/)
  assert.match(spalte, /data-detail-jarvis>Frag Jarvis dazu/)
  assert.equal(jarvisEntwurf(feature), 'Frage zu Feature F7 (Bauen <aus> der Akte): ')
})

test('Bug offen: Kopf BUG · ID · Priorität, „gefunden“, Kurz gesagt aus dem Register, Triage-Band ohne eigenen Knopf', () => {
  const s = sicht({ workitem: bug, workflow: null, schritte: undefined, akte: undefined, roadmap: undefined, ctw: 'frei' })
  assert.match(detailEyebrowHtml(bug), /typ-chip typ-chip-bug[\s\S]*Bug · F-9 · P1/)
  assert.match(detailKopfZusatzHtml(s), /gefunden: F7 &lt;WS-1&gt;\.<\/span>/, '„Entdeckt:“ entfällt hinter „gefunden:“')
  assert.match(detailKopfZusatzHtml(s), /verwandt <span class="kommt-badge">kommt<\/span>/)
  const kurz = detailKurzHtml(s)
  assert.match(kurz, /Was passiert:<\/strong> Text &lt;script&gt;alert\(1\)&lt;\/script&gt; passiert\./)
  assert.match(kurz, /Wie schlimm:<\/strong> Mittel &lt;i&gt;/)
  assert.match(kurz, /Was als Nächstes kommt:<\/strong> Rückfrage &lt;einbauen&gt;\./)
  const status = detailStatusBlockHtml(s)
  assert.match(status, /data-ton="offen"/)
  assert.match(status, /<dt>Priorität<\/dt><dd>P1<\/dd>/)
  assert.match(status, /<dt>Eingeplant<\/dt><dd>Rückfrage &lt;einbauen&gt;\.<\/dd>/)
  for (const schluessel of ['Auslöser', 'Schätzung', 'Offen seit']) assert.match(status, new RegExp(`<dt>${schluessel}</dt><dd><span class="kommt-badge">kommt</span></dd>`), schluessel)
  const jetzt = detailJetzt(s)
  assert.equal(jetzt.zustand, 'dran-verbunden', 'der Hauptknopf „Jetzt beheben lassen“ steht im Click-to-Work-Bereich darunter')
  assert.match(jetzt.html, /Was passiert mit diesem Bug\?/)
  assert.doesNotMatch(jetzt.html, /button primary|\[Vorschlag/)
  assert.equal(detailJetzt({ ...s, ctw: 'gesperrt' }).zustand, 'ruhig', 'läuft schon ein Ablauf, keine Triage')
  pruefeSauber(seite(s), 'Bug offen')
})

test('Bug: Fehlerbild mit „kommt“ für strukturierte Felder, Fundstelle und Behebung echt, ganzer Eintrag aufklappbar; Links', () => {
  const s = sicht({ workitem: bug, workflow: null, schritte: undefined, ctw: 'frei' })
  const inhalt = detailInhaltHtml(s)
  assert.match(inhalt, /Fehlerbild[\s\S]*So stellst du ihn nach[\s\S]*kommt-badge[\s\S]*F-975/)
  assert.match(inhalt, /<dt>Erwartet<\/dt><dd><span class="kommt-badge">kommt<\/span><\/dd><dt>Tatsächlich<\/dt>/)
  assert.match(inhalt, /Fundstelle<\/span><\/p><p><code>public\/leitstand\/shell\.js:12<\/code> \(initProjektAuswahl\)<\/p>/, 'Backticks als <code>, nicht als Zeichen')
  assert.match(inhalt, /Vorgeschlagene Behebung<\/span><\/p><p>Rückfrage &lt;einbauen&gt;\.<\/p>/)
  assert.match(inhalt, /<details class="eintrag-ganz" data-klappe="ganz"><summary>Ganzer Eintrag im Register<\/summary><p class="eintrag-beschreibung">Text &lt;script&gt;alert\(1\)&lt;\/script&gt; passiert\. Zweiter Satz\.<\/p>/)
  assert.match(inhalt, /Verlauf des Befunds[\s\S]*kommt-badge/)
  // Ohne Ablauf: jeder Schritt der Behebung „kommt“, Auftrag mit Hinweis auf Click-to-Work.
  assert.deepEqual(behebungsSchritte(s).map((x) => x.stand), ['kommt', 'kommt', 'kommt', 'kommt', 'kommt'])
  assert.match(inhalt, /„Jetzt beheben lassen“ legt ihn an\./)
  const spalte = detailSpalteHtml(s)
  assert.match(spalte, /<h2 id="eintrag-spalte-titel">Einordnung<\/h2>/)
  assert.match(spalte, /href="vscode:\/\/file\/C:\/Projekte\/Demo\/public\/leitstand\/shell\.js:12">Fundstelle in VS Code öffnen/)
  assert.match(spalte, /href="vscode:\/\/file\/C:\/Projekte\/Demo\/state\/findings\.md:120">Eintrag im Register öffnen/)
  const zweiPfade = detailSpalteHtml({ ...s, workitem: { ...bug, fundstelle: '`a/b.js` und `c/d.js`' } })
  assert.doesNotMatch(zweiPfade, /Fundstelle in VS Code öffnen/, 'nur bei eindeutigem Pfad')
})

test('Bug „Fix bereit zur Bestätigung“: Abnahme offen am Bug-Ablauf → Band „Ist der Bug behoben?“, Schritte aus dem Ablauf', () => {
  const s = sicht({ workitem: bug, workflow: abgeschlossen, schritte: schritteFertig, abnahme, akte: undefined, ctw: 'gesperrt' })
  const jetzt = detailJetzt(s)
  assert.equal(jetzt.zustand, 'dran')
  assert.match(jetzt.html, /Ist der Bug behoben\?/)
  assert.equal((jetzt.html.match(/button primary/g) ?? []).length, 1)
  assert.match(detailStatusBlockHtml(s), /data-ton="warten"[\s\S]*Fix bereit zur Bestätigung/)
  assert.deepEqual(
    behebungsSchritte(s).map((x) => `${x.id}:${x.stand}`),
    ['nachstellen:kommt', 'beheben:erledigt', 'pruefen:erledigt', 'review:erledigt', 'bestaetigen:wartet']
  )
  const inhalt = detailInhaltHtml(s)
  assert.match(inhalt, /data-stand="wartet"><span class="behebung-name">Bestätigen/)
  assert.match(inhalt, /href="#\/workflows\/w1">a1<\/a>/)
  pruefeSauber(seite(s), 'Bug Fix bereit')
})

test('TECH_DEBT: Bug-Gerüst ohne Triage und ohne Nachstellen; neutraler Typ-Chip', () => {
  const schuld = { ...bug, typ: 'TECH_DEBT', id: 'F-20', prioritaet: 'P3' }
  const s = sicht({ workitem: schuld, workflow: null, schritte: undefined, ctw: 'frei' })
  assert.match(detailEyebrowHtml(schuld), /typ-chip typ-chip-neutral[\s\S]*Tech Debt · F-20 · P3/)
  assert.equal(detailJetzt(s).zustand, 'ruhig')
  const inhalt = detailInhaltHtml(s)
  assert.match(inhalt, /Worum es geht/)
  assert.match(inhalt, /Umsetzung/)
  assert.doesNotMatch(inhalt, /So stellst du ihn nach|Nachstellen|Regressionstest/)
  assert.match(detailKurzHtml(s), /Worum es geht:/)
  assert.deepEqual(behebungsSchritte(s).map((x) => x.id), ['umsetzen', 'pruefen', 'review', 'bestaetigen'])
  pruefeSauber(seite(s), 'TECH_DEBT')
})

test('Jetzt-Band: Freigabe und Rückfrage → Hauptknopf zum Ablauf; Vorschlag von Click-to-Work → Band ohne eigenen Knopf', () => {
  const freigabe = detailJetzt(sicht({ workflow: { ...laufend, status: 'WARTET_FREIGABE', naechster: { art: 'haltFreigabe', schrittId: 's2' } } }))
  assert.equal(freigabe.zustand, 'dran')
  assert.match(freigabe.html, /Freigabe des Ablaufs[\s\S]*href="#\/workflows\/w1">Freigabe prüfen/)
  const rueckfrage = detailJetzt(sicht({ workflow: { ...laufend, status: 'KLAERUNG_ERFORDERLICH', naechster: { art: 'haltKlaerung' } } }))
  assert.match(rueckfrage.html, /Rückfrage beantworten/)
  const vorschlag = detailJetzt(sicht({ ctw: 'vorschlag' }))
  assert.equal(vorschlag.zustand, 'dran-verbunden')
  assert.doesNotMatch(vorschlag.html, /button primary/)
  const wartend = schritte.map((s) => (s.schritt_id === 's2' ? { ...s, status: 'WARTET_FREIGABE' } : s))
  assert.match(detailKurzHtml(sicht({ schritte: wartend, workflow: { ...laufend, status: 'WARTET_FREIGABE', naechster: { art: 'haltFreigabe', schrittId: 's2' } } })), /Deine Freigabe für Code Review\./)
})

test('Verknüpfung lädt bzw. nicht bestimmbar: Kurz gesagt und Status sagen es, nichts wird geraten', () => {
  assert.match(detailKurzHtml(sicht({ verknuepfung: 'laedt', workflow: null })), /Was gerade passiert:<\/strong> Lädt…/)
  assert.match(detailStatusBlockHtml(sicht({ verknuepfung: 'fehlt', workflow: null })), /Ohne Ausführungsstand nicht bestimmbar\./)
})

test('Kartenstatus und Phase: Rohstatus escaped im title', () => {
  assert.match(kartenStatus(bug), /title="offen &lt;neu&gt;">Offen/)
  assert.match(phaseHtml(laufend), /<span title="LAEUFT">In Ausführung<\/span>/)
  assert.equal(phaseHtml(null), '')
})

test('Prüfpass D3 (qa 2, qa 3, cr 7): Band bei Störung von Click-to-Work verbunden; solange die Verknüpfung lädt/fehlt nur „lädt“ bzw. „nicht bestimmbar“, keine Triage', () => {
  const stoerung = detailJetzt(sicht({ workitem: bug, workflow: null, ctw: 'stoerung' }))
  assert.equal(stoerung.zustand, 'dran-verbunden')
  assert.match(stoerung.html, /Der Auftrag braucht dich/)
  assert.doesNotMatch(stoerung.html, /button primary/)
  const laedt = detailJetzt(sicht({ workitem: bug, workflow: null, verknuepfung: 'laedt', ctw: 'laedt' }))
  assert.equal(laedt.zustand, 'ruhig')
  assert.match(laedt.html, /<span>Lädt…<\/span>/)
  assert.doesNotMatch(laedt.html, /Gerade wartet nichts|Was passiert mit diesem Bug/)
  assert.match(detailJetzt(sicht({ verknuepfung: 'fehlt', workflow: null })).html, /Ohne Ausführungsstand nicht bestimmbar\./)
  assert.equal(detailJetzt(sicht({ workitem: bug, workflow: null, ctw: 'laedt' })).zustand, 'ruhig', 'Triage nur bei freiem Einstieg')
})

test('Prüfpass D3 (qa 1, dg 2): erledigter Bug ohne Triage, „Nichts mehr“; „als Nächstes“ aus dem Ablauf', () => {
  const erledigt = sicht({ workitem: { ...bug, status: 'ERLEDIGT', statusRoh: 'erledigt' }, workflow: null, ctw: 'frei' })
  assert.equal(detailJetzt(erledigt).zustand, 'ruhig')
  assert.match(detailKurzHtml(erledigt), /Was als Nächstes kommt:<\/strong> Nichts mehr — der Eintrag ist abgeschlossen\./)
  const nachFix = sicht({ workitem: bug, workflow: { ...abgeschlossen, abnahme: { offen: false, status: 'ok' } }, schritte: schritteFertig, abnahme: { ...abnahme, entscheidung: { status: 'ok', ergebnis: 'ANGENOMMEN' } }, ctw: 'frei' })
  assert.match(detailKurzHtml(nachFix), /Was als Nächstes kommt:<\/strong> Keine weiteren Schritte im Ablauf\./)
  const fixBereit = sicht({ workitem: bug, workflow: abgeschlossen, schritte: schritteFertig, abnahme, ctw: 'gesperrt' })
  assert.match(detailKurzHtml(fixBereit), /Was als Nächstes kommt:<\/strong> Deine Abnahme: Ergebnis prüfen/, 'kein Widerspruch zum Band „Ist der Bug behoben?“')
  assert.deepEqual(behebungsSchritte(nachFix).map((x) => x.stand).slice(-1), ['erledigt'])
})

test('Prüfpass D3 (qa 4, qa 5, dg 7): Abnahme nicht ladbar → Hinweis; Worker nur aus dem Ablauf; kein doppelter Status im Rollen-Panel', () => {
  const ohneAbnahme = detailInhaltHtml(sicht({ workflow: abgeschlossen, schritte: schritteFertig, abnahme: null }))
  assert.match(ohneAbnahme, /Die Abnahme-Daten \(Urteile, Prüfung, Entscheidung\) sind gerade nicht ladbar/)
  assert.doesNotMatch(detailInhaltHtml(sicht({ workflow: null, abnahme: undefined })), /nicht ladbar/)
  const mitAblauf = detailInhaltHtml(sicht({ workitem: bug, workflow: abgeschlossen, schritte: schritteFertig, abnahme }))
  assert.match(mitAblauf, /<span class="behebung-name">Beheben<\/span><span class="behebung-info">Umsetzung · Claude Code<\/span>/)
  assert.match(mitAblauf, /<span class="behebung-name">Review<\/span><span class="behebung-info">Code Review · Codex<\/span>/)
  const ohneAblauf = detailInhaltHtml(sicht({ workitem: bug, workflow: null, schritte: undefined }))
  assert.match(ohneAblauf, /<span class="behebung-info">Umsetzung<\/span>/)
  assert.doesNotMatch(ohneAblauf, /Claude Code|Codex/, 'ohne Ablauf kein angenommener Worker')
  const panel = detailInhaltHtml(sicht({ kreisAuswahl: 'reviewer' }))
  assert.doesNotMatch(panel, /Status: läuft · läuft/)
})

test('Prüfpass D3 (qa 7): Harness und Prozess wie Tech Debt; offene Abnahme bei einem Nicht-Bug-Befund', () => {
  for (const [typ, chip] of [['HARNESS_IMPROVEMENT', 'Harness'], ['PROCESS_IMPROVEMENT', 'Prozess']]) {
    const eintrag = { ...bug, typ, id: 'F-30' }
    const s = sicht({ workitem: eintrag, workflow: null, schritte: undefined, ctw: 'frei' })
    assert.match(detailEyebrowHtml(eintrag), new RegExp(`typ-chip-neutral.*${chip} · F-30`))
    assert.equal(detailJetzt(s).zustand, 'ruhig', typ)
    assert.doesNotMatch(detailInhaltHtml(s), /Nachstellen|Regressionstest/, typ)
    pruefeSauber(seite(s), typ)
  }
  const s = sicht({ workitem: { ...bug, typ: 'TECH_DEBT' }, workflow: abgeschlossen, schritte: schritteFertig, abnahme, ctw: 'gesperrt' })
  const band = detailJetzt(s)
  assert.match(band.html, /Abnahme des Ergebnisses[\s\S]*Ergebnis prüfen/)
  assert.match(detailStatusBlockHtml(s), /Abnahme offen/)
  const lang = { ...feature, titel: 'X'.repeat(400) }
  assert.match(detailEyebrowHtml(lang), /F7/)
  pruefeSauber(seite(sicht({ workitem: lang })), 'langer Titel')
})

test('F-997: Triage bei offenem Bug, solange kein verknüpfter Ablauf aktiv ist oder auf die Abnahme wartet — nach einem beendeten, abgelehnten oder gestoppten Fix wieder', () => {
  const triage = (workflow, ctw = 'frei') => detailJetzt(sicht({ workitem: bug, workflow, schritte: workflow === null ? undefined : schritteFertig, abnahme, ctw })).zustand
  assert.equal(triage(null), 'dran-verbunden', 'ohne Ablauf')
  assert.equal(triage({ ...abgeschlossen, abnahme: { offen: false, status: 'ok' } }), 'dran-verbunden', 'beendet und entschieden (angenommen oder abgelehnt)')
  assert.equal(triage({ ...laufend, status: 'GESTOPPT', naechster: { art: 'haltGestoppt' }, abnahme: { offen: false, status: 'nicht_faellig' } }), 'dran-verbunden', 'gestoppt')
  assert.equal(triage({ ...laufend, naechster: { art: 'haltKlaerung' } }, 'gesperrt'), 'ruhig', 'aktiver Ablauf')
  assert.equal(triage(abgeschlossen, 'gesperrt'), 'dran', 'Abnahme offen: „Ist der Bug behoben?“, keine Triage')
  assert.equal(triage({ ...laufend, status: 'KLAERUNG_ERFORDERLICH', naechster: { art: 'haltKlaerung' } }, 'gesperrt'), 'dran', 'echte Rückfrage am Fix-Ablauf geht vor')
  assert.match(detailJetzt(sicht({ workitem: bug, workflow: { ...abgeschlossen, abnahme: { offen: false, status: 'ok' } }, ctw: 'frei' })).html, /Was passiert mit diesem Bug\?/)
})

test('F-996 im Detail: ein laufender Ablauf (haltKlaerung bei Status LAEUFT) zeigt kein Rückfrage-Band, sondern die ruhige Zeile', () => {
  const s = sicht({ workflow: { ...laufend, naechster: { art: 'haltKlaerung', schrittId: null } } })
  const band = detailJetzt(s)
  assert.equal(band.zustand, 'ruhig')
  assert.doesNotMatch(band.html, /Rückfrage beantworten/)
  assert.match(detailStatusBlockHtml(s), /<dt>Phase<\/dt><dd><span title="LAEUFT">In Ausführung<\/span><\/dd>/)
  assert.match(detailKurzHtml(s), /Code Review arbeitet \(Codex\)\./)
})
