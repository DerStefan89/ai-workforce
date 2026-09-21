/**
 * Datei: public/leitstand/views/chat.js
 *
 * Zweck: View `#/chat` (F26 WS-2a) — natürliche Eingabe im Kontext des
 * aktiven Projekts (Kontextzeile in der Kopfzeile, Muster jeder anderen
 * View, projekt-kontext.js). Der deterministische Vorfilter
 * (jarvis-vorfilter.js) beantwortet "was braucht mich"/"Status…" lokal, ohne
 * Serverkontakt; alles andere geht an POST /api/chat (echter Jarvis-Lauf,
 * asynchron: 202 + laufId, kein Streaming — One-Shot bleibt, E-M4-3 "Der
 * Chat umgeht Router, Freigabe und Automat nicht").
 *
 * Der persistierte Verlauf (GET /api/chat, Checkpoint-Kette
 * 'lineage-chat-<projektId>') wird beim ersten Mount der Chat-Spalte
 * (initChatView, Shell-Bootstrap) UND zusätzlich bei jedem Betreten der
 * View '#/chat' geladen (F29 WS-D2-Korrektur: die Chat-Spalte ist ab
 * ≥1280px in jeder View sichtbar, nicht nur unter '#/chat') — ein
 * Reload verliert dadurch nichts (AK4), ABER nur für bereits real
 * ABGESCHLOSSENE/ERFOLGREICHE Jarvis-Antworten. QA-Befund (WS-2a, real
 * nachvollzogen): ein Reload MITTEN in einem ausstehenden Lauf verliert die
 * Pending-Anzeige (ausstehenderLauf lebt nur im Modulspeicher) — die
 * fertige Antwort erscheint danach erst, wenn die View ein weiteres Mal
 * verlassen und wieder betreten wird (registriere-onEnter lädt dann
 * GET /api/chat neu und findet den inzwischen geschriebenen Eintrag). Kein
 * Datenverlust (der Server hat den Lauf/die Lineage unabhängig vom Client
 * geschrieben), aber kein automatisches Nachladen ohne erneuten
 * View-Eintritt — bewusste, dokumentierte Grenze statt stillschweigend
 * übergangen (CLAUDE.md-Entscheidungsregel 5), eine "läuft gerade etwas"-
 * Projektion über einen Reload hinweg wäre eine eigene Server-Erweiterung.
 *
 * Ein laufender Jarvis-Lauf wurde bis F31 WS-3 über den gemeinsamen
 * 2-Sekunden-Poll (zustand.js, abonniereDetailAuffrischer) verfolgt. F31
 * WS-3 (Latenzmessung, features/F31/latenzmessung.md Abschnitt 4, Hebel 4)
 * ersetzt das durch einen EIGENEN, schnelleren Timer (500ms,
 * ausstehendenLaufTimer unten), der NUR läuft, solange ausstehenderLauf
 * gesetzt ist — der gemeinsame zustand.js-Timer und damit jeder andere Poll
 * (Zustand-Aggregat, Workflow-Detail, F26-Perf-Fix) bleibt unverändert bei
 * 2000ms, diese View liest daraus weiterhin nur letzterZustand (Vorfilter).
 * Erst wenn der Lauf real ABGESCHLOSSEN ist, wird der Verlauf neu geladen
 * (der Server hat den Lineage-Eintrag dann bereits geschrieben, siehe
 * scripts/leitstand-server.mjs POST /api/chat nachLauf-Callback — synchron
 * im selben Tick wie der Terminalstatus, kein Wettlauf). Schlägt dieses
 * Neuladen selbst transient fehl, bleibt der Lauf als ausstehend markiert
 * (QA-Befund) — der nächste Poll-Tick prüft denselben, bereits terminalen
 * Lauf erneut und versucht das Neuladen einfach noch einmal, statt die
 * gerade fertig gewordene Antwort kommentarlos verschwinden zu lassen.
 *
 * Vorfilter-Antworten und ein fehlgeschlagener/verweigerter Jarvis-Lauf
 * erscheinen NUR lokal für diese Sitzung (nicht in lineage-chat, siehe
 * jarvis-vorfilter.js Kopfkommentar) — ein Reload zeigt danach wieder genau
 * den serverseitig persistierten Verlauf. Ein Projektwechsel
 * (projekt-kontext.js, abonniereProjektWechsel) setzt denselben lokalen
 * Zustand zusätzlich explizit zurück — QA-Befund (real reproduziert): ohne
 * diesen Reset blieb eine ausstehende Nachricht/ein lokaler Eintrag aus dem
 * VORHERIGEN Projekt dauerhaft sichtbar bzw. pollte für immer gegen den
 * falschen, jetzt fremden api.js-Präfix (404 bei jedem Tick, Senden-Button
 * blieb tot).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initChatView beim Bootstrap)
 *
 * F29 WS-2a: reine Stylingumstellung auf das Komponentenvokabular aus
 * views/workboard.js (WS-1b) — jeder Verlaufseintrag ist jetzt eine .card,
 * die Quelle ein .badge (ok/aktiv/neutral/fehler, kein neues Farbpaar —
 * "fehler" bleibt Rot, wie in den anderen Views), "Senden" ist
 * .btn.btn-primary. KEIN neuer Schreib-/Auto-Apply-Button, KEINE Änderung
 * an Poll-/Timer-/Sende-Verhalten.
 *
 * F29 WS-D2 (Auftrag Punkt C, "Chat mit Jarvis" in der rechten Spalte —
 * #shell-chat-spalte IST diese rechte Spalte, keine zweite Chat-Ansicht):
 * reine Darstellungsänderung. ladeVerlauf()/pruefeAusstehendenLauf()/der
 * Sende-Ablauf in initSendenFormular() (Vorfilter → POST /api/chat, D13,
 * Terminal-Erkennung) sind UNVERÄNDERT (Nicht-Ziel: Poll-/Sende-Logik). Neu:
 * (a) renderEintrag zerlegt einen Verlaufseintrag jetzt in zwei
 * Sprechblasen (Nutzer rechts, Jarvis links, Mini-Avatare) statt einer
 * Karte; (b) renderVerlauf zeigt standardmäßig nur die LETZTEN ZWEI
 * Einträge, "Ganzen Verlauf öffnen/schließen" (zeigeAlleUmschalten) ist ein
 * rein lokaler Anzeige-Umschalter, kein zweiter Fetch/keine zweite Route;
 * (c) ein Tippindikator ersetzt die Antwort-Sprechblase, solange
 * ausstehenderLauf gesetzt ist; (d) lokale Einträge (vorfilter/fehler) UND
 * ausstehenderLauf tragen jetzt zusätzlich einen client-seitig erfassten
 * zeitstempel (Auftrag: Uhrzeit je Sprechblase) — persistierte, historische
 * Einträge aus GET /api/chat haben serverseitig KEIN Zeitfeld (Datenlage,
 * keine erfundene Zeit), ihre Sprechblase zeigt deshalb keine Uhrzeit; (e)
 * Enter sendet (Shift+Enter bleibt Zeilenumbruch, Auftrag-Hinweistext) —
 * ruft denselben, unveränderten Sende-Pfad wie der Button.
 *
 * F30 WS-1 (Aufgabe 1, additiv, keine Architekturänderung): #chat-abbrechen-btn
 * ist sichtbar, solange ausstehenderLauf gesetzt ist (initAbbrechenBedienung),
 * und löst POST /api/laeufe/<laufId>/abbrechen (F14, bereits von views/runs.js
 * genutzt) aus. Der Klick selbst schreibt KEINEN Verlaufseintrag und setzt
 * ausstehenderLauf NICHT zurück — das bleibt allein Sache des bestehenden
 * pruefeAusstehendenLauf-Polls, der einen jetzt FEHLGESCHLAGENEN Lauf bereits
 * unverändert wie jeden anderen nicht erfolgreichen Lauf terminal auflöst
 * (D13: der Server, nicht der Client, entscheidet, wann der Lauf wirklich
 * nicht mehr aktiv ist — ein sofortiges lokales Auflösen könnte die
 * Senden-Sperre freigeben, während der Server den vorherigen Lauf noch als
 * aktiv führt).
 *
 * F31 WS-2 (Gesprächsgedächtnis + "Zusammenfassen & neu starten"): #chat-zusammenfassen-btn
 * löst POST /api/chat/zusammenfassen aus — denselben D13/202/Poll-Pfad wie eine normale
 * Nachricht (sendeZusammenfassungAnfrage), nur ohne Vorfilter (eine Zusammenfassung hat keine
 * lokal beantwortbare Kurzform). setzeSendenSperre deaktiviert seither BEIDE Buttons (Muster
 * Sende-Sperre) — ein zweiter Lauf während eines ausstehenden ist ohnehin per D13 unmöglich.
 * Ein serverseitig erzeugter Zusammenfassungs-Turn trägt istZusammenfassung: true (GET
 * /api/chat, verarbeiteJarvisChatErgebnis) und wird hier zweifach ausgewertet: renderEintrag
 * zeigt ihn mit einem Trenner-Label und einer dezenten Nutzerzeile ("[Zusammenfassung
 * angefordert]"); renderVerlauf setzt bei NICHT zeigeAlle den Standard-Ausschnitt auf "ab dem
 * letzten Zusammenfassungs-Turn (inklusive) plus alles danach" statt der bisherigen letzten
 * zwei Einträge — ohne einen solchen Turn bleibt das Verhalten unverändert (letzte zwei).
 *
 * F31 WS-3 (Latenzmessung, features/F31/latenzmessung.md Abschnitt 4, Hebel 4): der
 * ausstehenderLauf-Poll läuft seither über eine eigene, verkettete setTimeout-Schleife (500ms,
 * starteAusstehendenLaufPoll/stoppeAusstehendenLaufPoll — bewusst setTimeout statt setInterval,
 * siehe Kommentar dort), NICHT mehr über den gemeinsamen 2-Sekunden-Timer aus zustand.js — der
 * bleibt für jeden anderen Poll (Zustand-Aggregat, Workflow-Detail) unverändert bei 2000ms. Der
 * Poll startet, sobald sendeAktuelleEingabe/sendeZusammenfassungAnfrage ausstehenderLauf setzen,
 * und stoppt, sobald pruefeAusstehendenLauf ihn terminal auflöst oder setzeChatZustandZurueck
 * (Projektwechsel) ihn zurücksetzt — läuft er bereits, ist ein erneutes Starten ein No-op (kein
 * zweiter Poll parallel). Ein Reload MITTEN in einem ausstehenden Lauf startet weiterhin keinen
 * Poll (ausstehenderLauf lebt nur im Modulspeicher, unverändert zur bereits oben dokumentierten
 * Grenze) — dasselbe galt schon für den vorherigen, gemeinsamen Timer, weil pruefeAusstehendenLauf
 * ohne ausstehenderLauf sofort zurückkehrte.
 *
 * fix/chat-fehler-anzeige (F-564, F-576), reine Client-Änderung, kein Server-/Persistenz-Umbau:
 * (F-564) ein manueller Abbruch (#chat-abbrechen-btn) endete serverseitig ununterscheidbar von einem
 * echten Fehlschlag als ABGESCHLOSSEN/FEHLGESCHLAGEN und wurde entsprechend als "nicht erfolgreich
 * (FEHLGESCHLAGEN)" gemeldet, obwohl der Nutzer selbst abgebrochen hatte —
 * beschreibeNichtErfolgreichesEnde meldet diesen Fall jetzt anhand des bereits vorhandenen,
 * sitzungslokalen abbruchAngefordert-Flags als "Lauf abgebrochen.". (F-576) lokaleEintraege wurde
 * bislang IMMER ans Ende der Anzeigeliste gehängt (baueAnzeigeListe), unter der Annahme, ein lokaler
 * Eintrag (Vorfilter-Antwort oder Fehlanzeige) liege chronologisch immer nach dem zuletzt geladenen
 * persistierterVerlauf-Stand — das gilt nur im Push-Moment, nicht mehr sobald danach weitere
 * Nachrichten erfolgreich persistiert werden (ladeVerlauf() lädt nach jedem erfolgreichen Lauf neu).
 * Jeder lokale Eintrag trägt seither persistierterVerlaufLaengeBeiPush (die Länge von
 * persistierterVerlauf zum Push-Zeitpunkt); baueAnzeigeListe() setzt ihn beim Rendern an genau dieser
 * Position zwischen die zu diesem Zeitpunkt bereits persistierten und die seither neu hinzugekommenen
 * persistierten Einträge ein, statt ihn pauschal ans Ende zu hängen.
 */

import { abbrichLauf, holeChatVerlauf, holeLaufDetail, sendeChatNachricht, sendeChatZusammenfassung } from '../api.js'
import { escapeHtml, formatiereUhrzeit } from '../render.js'
import { abonniereProjektWechsel } from '../projekt-kontext.js'
import { registriere } from '../router.js'
import { abonniere } from '../zustand.js'
import { loeseVorfilterAuf } from '../jarvis-vorfilter.js'

/** F29 WS-D2 (Auftrag Punkt C): true zeigt den vollständigen Verlauf, false nur die letzten zwei Einträge — reiner Anzeige-Umschalter ("Ganzen Verlauf öffnen"/"schließen"), kein zweiter Fetch. */
let zeigeAlle = false

/** Letztes Zustands-Aggregat aus dem Poll (für den Vorfilter), oder null vor dem ersten Tick. */
let letzterZustand = null

/** Persistierter Verlauf aus GET /api/chat, gemappt auf Anzeige-Einträge — neu geladen beim Betreten der View und nach jedem real erfolgreichen Jarvis-Lauf. Bereits in Server-Reihenfolge (aufsteigend), Anzeigereihenfolge unten daher reine Verkettung statt eines erneuten Sortierens. */
let persistierterVerlauf = []

/**
 * Lokale, NICHT persistierte Einträge dieser Sitzung — Vorfilter-Antworten und die Fehlanzeige eines nicht
 * erfolgreichen Jarvis-Laufs (siehe Datei-Kopf). In Entstehungsreihenfolge (push). F-576 (real reproduziert):
 * die frühere Annahme, ein lokaler Eintrag liege immer chronologisch NACH dem zuletzt geladenen
 * persistierterVerlauf-Stand, gilt nur im Push-Moment selbst — sobald DANACH weitere Nachrichten erfolgreich
 * persistiert werden (ladeVerlauf() läuft nach jedem real erfolgreichen Lauf neu), wächst persistierterVerlauf
 * über den lokalen Eintrag hinweg, der dann fälschlich weiterhin ganz unten gerendert würde. Jeder Eintrag
 * trägt deshalb zusätzlich persistierterVerlaufLaengeBeiPush (persistierterVerlauf.length zum Push-Zeitpunkt) —
 * baueAnzeigeListe() setzt ihn beim Rendern an genau dieser Position wieder ein, statt ihn ans Ende zu hängen.
 */
let lokaleEintraege = []

/** Der gerade laufende, noch nicht terminierte Jarvis-Chat-Lauf dieser View, oder null. @type {{ nachricht: string, laufId: string, messung?: Messung } | null} */
let ausstehenderLauf = null

/**
 * Task "Jarvis-Chat-Latenz senken" (state/), Schritt 1: reine Diagnose, kein
 * Servereingriff. Vier Zeitmarken je Turn (performance.now(), monoton,
 * unbeeinflusst von Systemuhr-Sprüngen): tSenden (Absenden-Klick),
 * tServerQuittung (202 von POST /api/chat[/zusammenfassen] erhalten),
 * tPollErgebnis (erster Poll-Tick mit terminalem Ergebnis für DIESEN
 * laufId), tDarstellung (Verlauf/Fehleranzeige gerendert). tickZeiten
 * sammelt performance.now() bei jedem Poll-Tick dieses Laufs (auch den
 * nicht-terminalen) — daraus Tick-Anzahl und größte Tick-Lücke.
 * @typedef {{ tSenden: number, tServerQuittung: number, tickZeiten: number[] }} Messung
 */

/** @param messung - Messung eines Laufs @param tPollErgebnis - performance.now() beim terminalen Poll-Tick @param tDarstellung - performance.now() nach dem Rendern Meldet eine console.info-Zeile mit den vier Deltas plus Tick-Anzahl/größter Tick-Lücke (F-Nachweis, kein Server-Call, keine Persistenz). */
function protokolliereClientLatenz(messung, tPollErgebnis, tDarstellung) {
  const tickLuecken = messung.tickZeiten.slice(1).map((t, i) => t - messung.tickZeiten[i])
  console.info('[jarvis-latenz] Chat-Turn:', {
    absenden_bis_quittung_ms: Math.round(messung.tServerQuittung - messung.tSenden),
    quittung_bis_pollergebnis_ms: Math.round(tPollErgebnis - messung.tServerQuittung),
    pollergebnis_bis_darstellung_ms: Math.round(tDarstellung - tPollErgebnis),
    gesamt_ms: Math.round(tDarstellung - messung.tSenden),
    poll_ticks: messung.tickZeiten.length,
    groesste_poll_luecke_ms: tickLuecken.length === 0 ? null : Math.round(Math.max(...tickLuecken)),
  })
}

/** F31 WS-3: Handle des eigenen 500ms-Polls (siehe Datei-Kopf), oder null, solange keiner läuft. */
let ausstehenderLaufTimeout = null

const AUSSTEHENDER_LAUF_POLL_MS = 500

/**
 * Plant den nächsten Tick per setTimeout, NICHT setInterval (scripts/check-f20-zustand-poll.mjs
 * AK3 erzwingt mechanisch genau einen 'setInterval('-Aufruf in public/leitstand/**, in zustand.js
 * — Regressionsschutz gegen die vor F20 WS-2 bestehenden Mehrfach-Timer. Dieser Poll ist bewusst
 * KEIN zweiter Aggregat-Timer dieser Art: er zielt auf eine einzelne Lauf-Detailressource
 * (GET /api/laeufe/<laufId>), läuft nur befristet, solange ausstehenderLauf gesetzt ist, und
 * plant erst nach Abschluss des vorherigen Ticks neu — ein langsamer Fetch häuft dadurch keine
 * überlappenden Requests an, wie es bei setInterval möglich wäre).
 */
function planeNaechstenAusstehendenLaufPoll() {
  ausstehenderLaufTimeout = setTimeout(async () => {
    // QA-Befund F31 WS-3: try/finally, NICHT nur await — ein Wurf aus pruefeAusstehendenLauf (z. B.
    // ein unerwartet geformtes GET /api/laeufe/<laufId>-Ergebnis) darf die Kette nicht dauerhaft
    // abbrechen. Ohne das bliebe ausstehenderLaufTimeout auf der bereits verbrauchten Timeout-ID
    // stehen, starteAusstehendenLaufPoll hielte den Poll fälschlich für "läuft schon" und der
    // Tippindikator/die Senden-Sperre blieben für den Rest der Sitzung hängen.
    try {
      await pruefeAusstehendenLauf()
    } finally {
      if (ausstehenderLaufTimeout !== null) planeNaechstenAusstehendenLaufPoll()
    }
  }, AUSSTEHENDER_LAUF_POLL_MS)
}

/** Startet den 500ms-Poll, falls noch keiner läuft (No-op sonst) — aufgerufen, sobald ausstehenderLauf gesetzt wird. */
function starteAusstehendenLaufPoll() {
  if (ausstehenderLaufTimeout !== null) return
  planeNaechstenAusstehendenLaufPoll()
}

/** Stoppt den 500ms-Poll, falls einer läuft (No-op sonst) — aufgerufen, sobald ausstehenderLauf terminal aufgelöst oder zurückgesetzt wird. */
function stoppeAusstehendenLaufPoll() {
  if (ausstehenderLaufTimeout === null) return
  clearTimeout(ausstehenderLaufTimeout)
  ausstehenderLaufTimeout = null
}

/**
 * Task "Jarvis-Chat-Latenz senken", Schritt 4: wird der Tab wieder sichtbar
 * (visibilitychange → 'visible'), während ein Lauf aussteht, löst das
 * SOFORT einen Poll-Tick aus, statt bis zu 500ms auf den nächsten
 * geplanten Tick zu warten — der typische Fall ist ein Nutzer, der den Tab
 * während des Wartens verlassen hat und beim Zurückkehren die Antwort
 * ohne die volle Poll-Verzögerung sehen soll. Kein zweiter setInterval
 * (scripts/check-f20-zustand-poll.mjs AK3 bleibt unberührt, reiner
 * Event-Listener). No-op ohne ausstehenden Lauf oder ohne laufenden Poll
 * (z. B. exakt zwischen Terminallage und stoppeAusstehendenLaufPoll).
 * try/finally wie planeNaechstenAusstehendenLaufPoll (QA-Muster F31 WS-3):
 * ein Wurf aus pruefeAusstehendenLauf darf die Kette nicht abbrechen.
 */
async function polleSofortBeiSichtbarkeit() {
  if (document.visibilityState !== 'visible' || ausstehenderLauf === null || ausstehenderLaufTimeout === null) return
  clearTimeout(ausstehenderLaufTimeout)
  ausstehenderLaufTimeout = null
  try {
    await pruefeAusstehendenLauf()
  } finally {
    if (ausstehenderLauf !== null) planeNaechstenAusstehendenLaufPoll()
  }
}

/** @param antwort - JarvisErgebnis-artiges Objekt ({ art, antwort, auftrag?, aktion?, bezug? }) oder null @returns Anzeigetext */
function antwortText(antwort) {
  if (antwort === null || typeof antwort?.antwort !== 'string') return '(keine lesbare Antwort)'
  return antwort.antwort
}

/**
 * Baut die Anzeigeliste: persistierter Verlauf (bereits serverseitig aufsteigend sortiert), lokale Einträge
 * jeweils an der Position einsortiert, die ihr persistierterVerlaufLaengeBeiPush entspricht (F-576, s.
 * lokaleEintraege), und ein etwaiger ausstehender Lauf zuletzt. lokaleEintraege ist nach
 * persistierterVerlaufLaengeBeiPush bereits aufsteigend sortiert (Push-Reihenfolge, persistierterVerlauf
 * wächst zwischen zwei Pushes nie rückwärts — einzige Ausnahme ist setzeChatZustandZurueck, das
 * lokaleEintraege im selben Zug leert), ein sequenzieller Durchlauf beider Listen reicht deshalb. F29 WS-D2:
 * zeitstempel ist bei persistierten Einträgen IMMER null (der Server führt keines, Auftrag Punkt E: keine
 * erfundene Zeit), bei lokalen der beim Push erfasste Wert (s. initSendenFormular/pruefeAusstehendenLauf).
 */
function baueAnzeigeListe() {
  const persistiert = persistierterVerlauf.map((e) => ({ nachricht: e.nachricht, antwortText: antwortText(e.jarvisAntwort), quelle: 'jarvis', zeitstempel: null, istZusammenfassung: e.istZusammenfassung === true }))
  const liste = []
  let naechsterLokalerIndex = 0
  for (let i = 0; i <= persistiert.length; i++) {
    while (naechsterLokalerIndex < lokaleEintraege.length && lokaleEintraege[naechsterLokalerIndex].persistierterVerlaufLaengeBeiPush === i) {
      liste.push(lokaleEintraege[naechsterLokalerIndex])
      naechsterLokalerIndex++
    }
    if (i < persistiert.length) liste.push(persistiert[i])
  }
  // Reviewer-Befund (fix/chat-fehler-anzeige): persistierterVerlauf wächst normalerweise nie
  // rückwärts, ABER initChatView löst ladeVerlauf() zweifach beim Bootstrap aus (Registrierung +
  // direkter Aufruf) — träfen deren Antworten aus dem Netzwerk außer der Reihe ein, könnte
  // persistierterVerlauf kurzzeitig kürzer sein als beim Push eines lokalen Eintrags. Ohne dieses
  // Sicherheitsnetz würde ein solcher Eintrag in keiner Schleifen-Iteration matchen und
  // kommentarlos aus der Anzeige verschwinden — angehängt bleibt er wenigstens sichtbar (Verhalten
  // vor diesem Fix), statt lautlos verloren zu gehen.
  while (naechsterLokalerIndex < lokaleEintraege.length) {
    liste.push(lokaleEintraege[naechsterLokalerIndex])
    naechsterLokalerIndex++
  }
  if (ausstehenderLauf !== null) {
    liste.push({ nachricht: ausstehenderLauf.nachricht, antwortText: null, quelle: 'ausstehend', zeitstempel: ausstehenderLauf.zeitstempel, istZusammenfassung: ausstehenderLauf.istZusammenfassung === true, fortschrittText: ausstehenderLauf.fortschrittText ?? null })
  }
  return liste
}

/** F29 WS-D2 (Auftrag Punkt C): eine Sprechblasen-Zeile — Nutzer rechts eingerückt mit Initialen-Kreis, Jarvis links mit Mini-Avatar (statischer Ausschnitt aus persona-gesicht.webp, dasselbe Bild wie die Persona — kein neues Bild, aber KEINE eigene montierePersona()-Instanz: eine animierte Instanz pro Sprechblase wäre reiner Overhead für ein 1,5rem-Icon, F28-Nicht-Ziel bleibt unberührt). @param label - sichtbarer Name ('Jarvis' oder 'Stefan') @param zeitHtml - bereits fertiges Uhrzeit-HTML (leer, wenn keine Zeit bekannt) @param textHtml - bereits fertiges Inhalts-HTML @param ausrichtung - 'nutzer' | 'jarvis' */
function chatBubbleReihe(label, zeitHtml, textHtml, ausrichtung) {
  const avatar =
    ausrichtung === 'nutzer'
      ? '<span class="chat-avatar chat-avatar-stefan" aria-hidden="true">S</span>'
      : '<span class="chat-avatar chat-avatar-jarvis" aria-hidden="true"><img src="/persona-gesicht.webp" alt="" /></span>'
  const bubble = `<div class="chat-bubble chat-bubble-${ausrichtung}">
    <p class="chat-bubble-kopf">${escapeHtml(label)}${zeitHtml}</p>
    ${textHtml}
  </div>`
  return `<div class="chat-bubble-reihe chat-bubble-reihe-${ausrichtung}">${ausrichtung === 'nutzer' ? bubble + avatar : avatar + bubble}</div>`
}

const QUELLE_ANTWORT_LABEL = { vorfilter: 'Jarvis (lokal beantwortet)', fehler: 'Jarvis — Lauf nicht erfolgreich' }

/** Ein Verlaufseintrag als zwei Sprechblasen-Zeilen (Nutzerfrage + Jarvis-Antwort bzw. Tippindikator, solange sie aussteht). F31 WS-2: ein Zusammenfassungs-Turn (istZusammenfassung) bekommt zusätzlich einen zentrierten Trenner davor, die Nutzerzeile ("[Zusammenfassung angefordert]") tritt dezent zurück. @param eintrag - aus baueAnzeigeListe() @returns HTML-Block */
function renderEintrag(eintrag) {
  const zeitHtml = eintrag.zeitstempel ? ` <span class="chat-bubble-zeit">${escapeHtml(formatiereUhrzeit(eintrag.zeitstempel) ?? '')}</span>` : ''
  const trennerHtml = eintrag.istZusammenfassung === true ? '<p class="chat-zusammenfassung-trenner">Zusammenfassung</p>' : ''
  const nutzerTextKlasse = eintrag.istZusammenfassung === true ? 'chat-bubble-text chat-bubble-text-dezent' : 'chat-bubble-text'
  const nutzerZeile = chatBubbleReihe('Stefan', zeitHtml, `<p class="${nutzerTextKlasse}">${escapeHtml(eintrag.nachricht)}</p>`, 'nutzer')
  if (eintrag.quelle === 'ausstehend') {
    const tippindikator = '<p class="chat-tippindikator" aria-hidden="true"><span></span><span></span><span></span></p>'
    const fortschrittHtml = eintrag.fortschrittText ? `<p class="chat-fortschritt">${escapeHtml(eintrag.fortschrittText)} …</p>` : ''
    return trennerHtml + nutzerZeile + chatBubbleReihe('Jarvis', '', tippindikator + fortschrittHtml, 'jarvis')
  }
  const label = QUELLE_ANTWORT_LABEL[eintrag.quelle] ?? 'Jarvis'
  const jarvisZeile = chatBubbleReihe(label, zeitHtml, `<p class="chat-bubble-text">${escapeHtml(eintrag.antwortText)}</p>`, 'jarvis')
  return trennerHtml + nutzerZeile + jarvisZeile
}

/**
 * F31 WS-2: der Standard-Ausschnitt (nicht zeigeAlle) beginnt ab dem letzten Eintrag mit
 * istZusammenfassung (inklusive) plus allem danach — ein Zusammenfassungs-Turn ist der neue
 * "Gesprächsanfang"; ohne einen solchen Turn bleibt es bei den letzten zwei Einträgen
 * (unverändertes WS-D2-Verhalten). @param liste - aus baueAnzeigeListe() @returns der Ausschnitt
 */
function berechneStandardAusschnitt(liste) {
  let letzterZusammenfassungsIndex = -1
  for (let i = liste.length - 1; i >= 0; i--) {
    if (liste[i].istZusammenfassung === true) {
      letzterZusammenfassungsIndex = i
      break
    }
  }
  return letzterZusammenfassungsIndex === -1 ? liste.slice(-2) : liste.slice(letzterZusammenfassungsIndex)
}

/**
 * F29 WS-D2 (Auftrag Punkt C): zeigt standardmäßig nur einen Ausschnitt — "Ganzen Verlauf öffnen"
 * (initGanzenVerlaufLink) schaltet zeigeAlle um und rendert neu, kein zweiter Fetch. QA-Befund
 * F31 WS-2: der Link muss sichtbar bleiben, sobald der Standard-Ausschnitt WENIGER zeigt als die
 * volle Liste — unabhängig vom aktuellen zeigeAlle-Zustand. Die alte Schwelle (liste.length <= 2)
 * blieb aus der Vor-WS-2-Zeit stehen, in der der Ausschnitt IMMER genau "letzte zwei" war; mit
 * einem frühen Zusammenfassungs-Turn (z. B. 1 Nachricht + sofort zusammengefasst, 2 Einträge
 * gesamt) verbarg sie den ersten echten Turn UND den Link, der ihn wieder sichtbar gemacht hätte.
 */
function renderVerlauf() {
  const container = document.getElementById('chat-verlauf')
  const liste = baueAnzeigeListe()
  const standardAusschnitt = berechneStandardAusschnitt(liste)
  const sichtbar = zeigeAlle ? liste : standardAusschnitt
  container.innerHTML = sichtbar.length === 0 ? '<p class="leer">Noch keine Nachrichten.</p>' : sichtbar.map(renderEintrag).join('')
  const link = document.getElementById('chat-ganzen-verlauf-link')
  link.hidden = standardAusschnitt.length === liste.length
  link.textContent = zeigeAlle ? 'Verlauf einklappen' : 'Ganzen Verlauf öffnen'
  document.getElementById('chat-abbrechen-btn').hidden = ausstehenderLauf === null
}

function zeigeChatFehler(text) {
  const anzeige = document.getElementById('chat-fehler')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

/** Setzt Eingabefeld/Sende-Button UND (F31 WS-2) den Zusammenfassen-Button in den Wartezustand — solange ein Vorfilter-Abruf läuft ODER ein Jarvis-Lauf aussteht (D13 lässt ohnehin nur einen Lauf zu). */
function setzeSendenSperre(gesperrt) {
  document.getElementById('chat-senden').disabled = gesperrt
  document.getElementById('chat-zusammenfassen-btn').disabled = gesperrt
}

/** Lädt GET /api/chat neu — beim Betreten der View und nach jedem real terminierten Jarvis-Lauf. @returns true bei Erfolg, false bei einem (transienten) Fehlschlag — der Aufrufer entscheidet dann, ob erneut versucht wird. */
async function ladeVerlauf() {
  let erfolgreich = true
  try {
    const antwort = await holeChatVerlauf()
    persistierterVerlauf = antwort.verlauf
    zeigeChatFehler('')
  } catch (fehler) {
    zeigeChatFehler(`Verlauf konnte nicht geladen werden: ${fehler.message}`)
    erfolgreich = false
  }
  renderVerlauf()
  return erfolgreich
}

/**
 * Terminallage eines Jarvis-Chat-Laufs, der NICHT real ABGESCHLOSSEN/ERFOLGREICH endete — Text für die
 * lokale Fehlanzeige (kein Lineage-Eintrag, siehe Datei-Kopf). F-564: ein Lauf, den DIESE Sitzung selbst
 * per #chat-abbrechen-btn abgebrochen hat (abbruchAngefordert, s. initAbbrechenBedienung), endet serverseitig
 * ebenfalls als ABGESCHLOSSEN/FEHLGESCHLAGEN (scripts/check-f14-abbruch.mjs AK7: beendigungsart 'ABBRUCH' —
 * dieses Feld erreicht den Client nicht extra, ist hier aber auch nicht nötig: nur ein Abbruch DIESER
 * Sitzung kann abbruchAngefordert gesetzt haben) und wurde bislang ununterscheidbar von einem echten
 * Fehlschlag als "FEHLGESCHLAGEN" gemeldet, obwohl der Nutzer selbst abgebrochen hat.
 * Bekannte, dokumentiert akzeptierte Restunschärfe (CLAUDE.md-Entscheidungsregel 5): abbruchAngefordert
 * belegt nur, dass DIESE Sitzung einen Abbruch ANGEFORDERT hat, nicht zwingend, dass der Lauf DESWEGEN
 * fehlschlug — träfe der Abbruch-Request serverseitig erst ein, nachdem der Lauf bereits aus einem
 * unabhängigen Grund gescheitert ist, zeigt diese Funktion trotzdem "Lauf abgebrochen." statt der
 * echten Fehlerursache. Ohne ein eigenes Server-Feld (beendigungsart, s. o.) bis zum Client ist eine
 * hundertprozentige Unterscheidung hier nicht möglich; das enge Zeitfenster wird als akzeptables
 * Restrisiko in Kauf genommen statt eines Server-/Persistenz-Umbaus für diesen kleinen Fix.
 * @param laufStatus - detail.laufStatus aus GET /api/laeufe/<laufId>
 * @param abbruchAngefordert - true, wenn diese Sitzung für DIESEN Lauf zuvor #chat-abbrechen-btn ausgelöst hat
 */
function beschreibeNichtErfolgreichesEnde(laufStatus, abbruchAngefordert) {
  if (abbruchAngefordert === true && laufStatus?.status === 'ABGESCHLOSSEN' && laufStatus.ergebnis === 'FEHLGESCHLAGEN') return 'Lauf abgebrochen.'
  if (laufStatus?.status === 'KLAERUNG_ERFORDERLICH') return `Lauf hält — Klärung erforderlich: ${laufStatus.grund}`
  if (laufStatus?.status === 'ABGESCHLOSSEN') return `Lauf abgeschlossen, aber nicht erfolgreich (${laufStatus.ergebnis}).`
  return `Lauf endete unerwartet (Status: ${laufStatus?.status ?? 'unbekannt'}).`
}

/**
 * F40 WS-1: kurzer Anzeigetext zum letzten live gemeldeten Werkzeugaufruf (GET /api/laeufe/<laufId>, Feld
 * fortschritt) — z. B. "liest docs/STATUS.md". Ein Pfad wird auf seine letzten zwei Segmente gekürzt (absolute
 * Windows-Pfade sind sonst länger als die Sprechblase), jedes Ziel zusätzlich auf 60 Zeichen (Grep-/Glob-Muster
 * können beliebig lang sein, QA-Befund F40 WS-1). @param fortschritt - { werkzeug, ziel } oder null
 * @returns Anzeigetext oder null ohne verwertbaren Fortschritt
 */
function beschreibeFortschritt(fortschritt) {
  if (fortschritt === null || typeof fortschritt !== 'object' || typeof fortschritt.werkzeug !== 'string') return null
  const zielRoh = typeof fortschritt.ziel === 'string' && fortschritt.ziel !== '' ? fortschritt.ziel : null
  const kuerze = (text) => ([...text].length > 60 ? `${[...text].slice(0, 59).join('')}…` : text)
  const ziel = zielRoh === null ? null : kuerze(zielRoh)
  const kurzPfad = zielRoh === null ? null : kuerze(zielRoh.split(/[\\/]/).filter(Boolean).slice(-2).join('/') || zielRoh)
  if (fortschritt.werkzeug === 'Read') return kurzPfad ? `liest ${kurzPfad}` : 'liest eine Datei'
  if (fortschritt.werkzeug === 'Grep') return ziel ? `durchsucht nach „${ziel}“` : 'durchsucht Dateien'
  if (fortschritt.werkzeug === 'Glob') return ziel ? `sucht ${ziel}` : 'sucht Dateien'
  return kurzPfad ? `nutzt ${fortschritt.werkzeug} (${kurzPfad})` : `nutzt ${fortschritt.werkzeug}`
}

/** Bei jedem Tick des eigenen 500ms-Polls geprüft (siehe Datei-Kopf): solange ein Jarvis-Chat-Lauf aussteht, GET /api/laeufe/<laufId> abrufen und bei Terminallage auflösen. */
async function pruefeAusstehendenLauf() {
  if (ausstehenderLauf === null) return
  const { laufId, nachricht, messung } = ausstehenderLauf
  messung?.tickZeiten.push(performance.now())
  let detail
  try {
    const antwort = await holeLaufDetail(laufId)
    if (!antwort.ok) return // Lauf-Detail noch nicht abrufbar (erster Checkpoint fehlt) — nächster Tick versucht es erneut.
    detail = await antwort.json()
  } catch {
    return // Netzwerkfehler dieses Ticks — kein Abbruch, der nächste Tick versucht es erneut.
  }
  // Real beobachtet (F26 WS-2a, echter curl-Nachweis gegen den echten Leitstand-Prozess): ein
  // noch laufender Lauf zeigt laufStatus.status 'KLAERUNG_ERFORDERLICH' ("RUN_PREPARED ohne
  // Terminalartefakt"), SOLANGE er läuft — das ist die normale Zwischenlage zwischen Start und
  // Ende, keine echte Klärungslage. detail.aktiv (D13, dieselbe Serverinstanz) unterscheidet
  // beides zuverlässig: erst wenn die Serverinstanz den Lauf selbst nicht mehr als aktiv führt,
  // ist laufStatus verlässlich terminal. Ein Poll-Tick, der das ignoriert hätte, hätte hier real
  // einen laufenden Lauf fälschlich als "hält — Klärung erforderlich" gemeldet.
  if (detail.aktiv === true) {
    // F40 WS-1: laufender Lauf — Werkzeug-Fortschritt anzeigen, nur bei geänderter Anzeige neu rendern.
    // Erneute laufId-Prüfung nach dem Await (Muster unten): ein Projektwechsel darf nicht überschrieben werden.
    const fortschrittText = beschreibeFortschritt(detail.fortschritt ?? null)
    if (ausstehenderLauf?.laufId === laufId && fortschrittText !== (ausstehenderLauf.fortschrittText ?? null)) {
      ausstehenderLauf.fortschrittText = fortschrittText
      renderVerlauf()
    }
    return
  }
  const laufStatus = detail.laufStatus
  if (laufStatus?.status !== 'ABGESCHLOSSEN' && laufStatus?.status !== 'KLAERUNG_ERFORDERLICH') return // noch nicht terminal (z. B. NICHT_GESTARTET direkt nach 202)
  const tPollErgebnis = performance.now()

  // Code-Review-Befund F31 WS-3: die obigen Awaits geben den Tick frei — ein Projektwechsel
  // (setzeChatZustandZurueck) kann währenddessen ausstehenderLauf bereits auf null gesetzt und
  // den Poll gestoppt haben. Ohne diese erneute Prüfung würde der jetzt fertige, aber schon
  // fremde laufId/nachricht in die lokaleEintraege des NEUEN Projekts geschrieben (falsch
  // zugeordnete Fehlanzeige) bzw. ausstehenderLauf/die Senden-Sperre eines inzwischen anders
  // aufgelösten Zustands überschreiben — Muster initAbbrechenBedienung.
  if (ausstehenderLauf?.laufId !== laufId) return

  const abbruchAngefordert = ausstehenderLauf.abbruchAngefordert === true

  if (laufStatus.status === 'ABGESCHLOSSEN' && laufStatus.ergebnis === 'ERFOLGREICH') {
    // ausstehenderLauf bleibt gesetzt, bis ladeVerlauf() wirklich erfolgreich war (QA-Befund):
    // ein transienter Fehlschlag genau in diesem Moment ließe sonst weder die Pending-Anzeige
    // noch den fertigen Eintrag sichtbar — der nächste Tick prüft denselben, bereits terminalen
    // Lauf erneut und versucht das Neuladen einfach noch einmal.
    const geladen = await ladeVerlauf()
    if (!geladen) return
    // ladeVerlauf() ist selbst ein weiterer Await-Punkt — dieselbe Prüfung wie oben, jetzt danach.
    if (ausstehenderLauf?.laufId !== laufId) return
    // Real reproduziert (state/nachweis-jarvis-latenz.md, "Abbruch Runde 2"): ein Abbruch, der
    // erst NACH dem Ende des Werkzeugprozesses eintrifft, wird vom Server mit 202 quittiert
    // (der Lauf gilt bis zum Ende der Nachbereitung als aktiv), kann den bereits fertigen
    // Prozess aber nicht mehr beenden — der Lauf endet ERFOLGREICH und die Antwort erscheint.
    // Ohne diesen Hinweis sähe der Mensch nur seine Antwort und nie, dass sein Abbruch wirkungslos
    // blieb (genau die Beobachtung, die diesen Auftrag ausgelöst hat).
    if (abbruchAngefordert) {
      zeigeChatFehler('Abbruch kam zu spät: die Antwort war bereits fertig, der Lauf wurde nicht abgebrochen.')
    }
  } else {
    lokaleEintraege.push({
      nachricht,
      antwortText: beschreibeNichtErfolgreichesEnde(laufStatus, abbruchAngefordert),
      quelle: 'fehler',
      zeitstempel: new Date().toISOString(),
      persistierterVerlaufLaengeBeiPush: persistierterVerlauf.length,
    })
  }
  if (messung !== undefined) protokolliereClientLatenz(messung, tPollErgebnis, performance.now())
  // Bug (real reproduziert, state/nachweis-jarvis-latenz.md Abschnitt "Abbruch"): ausstehenderLauf
  // MUSS vor diesem abschließenden renderVerlauf() auf null stehen — renderVerlauf() blendet den
  // Abbrechen-Button nur aus, wenn ausstehenderLauf === null (s. dort), und setzt dessen Text/Sperre
  // nicht zurück. Ein Render VOR dem Nullen (wie bisher im Fehlerzweig oben) ließ den Button nach
  // einem manuellen Abbruch dauerhaft auf "Abbruch angefordert"/gesperrt stehen, obwohl der Lauf
  // längst terminal aufgelöst war.
  ausstehenderLauf = null
  setzeAbbrechenZustand('Lauf abbrechen', false)
  renderVerlauf()
  stoppeAusstehendenLaufPoll()
  setzeSendenSperre(false)
}

/** Formular „Senden": Vorfilter zuerst (lokal, kein Serverkontakt bei Treffer), sonst POST /api/chat. F29 WS-D2: als benannte Funktion statt eines Inline-Klick-Handlers, damit sowohl der Senden-Button als auch Enter im Eingabefeld (initEingabeTastatur) denselben, unveränderten Ablauf auslösen. */
async function sendeAktuelleEingabe() {
  const button = document.getElementById('chat-senden')
  if (button.disabled) return
  const feld = document.getElementById('chat-eingabe')
  const nachricht = feld.value.trim()
  zeigeChatFehler('')
  if (nachricht === '') {
    zeigeChatFehler('Bitte eine Nachricht eingeben.')
    return
  }

  const tSenden = performance.now()
  setzeSendenSperre(true)
  try {
      const vorfilterErgebnis = await loeseVorfilterAuf(nachricht, letzterZustand)
      if (vorfilterErgebnis !== null) {
        lokaleEintraege.push({
          nachricht,
          antwortText: antwortText(vorfilterErgebnis),
          quelle: 'vorfilter',
          zeitstempel: new Date().toISOString(),
          persistierterVerlaufLaengeBeiPush: persistierterVerlauf.length,
        })
        renderVerlauf()
        feld.value = ''
        return
      }

      let antwort
      try {
        antwort = await sendeChatNachricht({ nachricht })
      } catch (fehler) {
        zeigeChatFehler(`Anfrage fehlgeschlagen: ${fehler.message}`)
        return
      }
      const tServerQuittung = performance.now()
      if (antwort.status !== 202) {
        const koerper = await antwort.json().catch(() => ({}))
        zeigeChatFehler(`${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`)
        return
      }
      const angenommen = await antwort.json().catch(() => ({}))
      ausstehenderLauf = { nachricht, laufId: angenommen.laufId, zeitstempel: new Date().toISOString(), messung: { tSenden, tServerQuittung, tickZeiten: [] } }
      starteAusstehendenLaufPoll()
      setzeAbbrechenZustand('Lauf abbrechen', false)
      renderVerlauf()
      feld.value = ''
    } finally {
      // Bleibt gesperrt, solange ein Lauf aussteht (D13) — pruefeAusstehendenLauf hebt die Sperre
      // erst bei Terminallage auf; eine Vorfilter-Antwort oder ein Fehlschlag heben sofort auf.
      if (ausstehenderLauf === null) setzeSendenSperre(false)
    }
}

/** Bedienzustand des Abbrechen-Buttons (Text + Sperre) — unabhängig von renderVerlauf(), das nur dessen Sichtbarkeit (hidden) synchron zu ausstehenderLauf hält (s. dort). */
function setzeAbbrechenZustand(text, gesperrt) {
  const button = document.getElementById('chat-abbrechen-btn')
  button.textContent = text
  button.disabled = gesperrt
}

/** F30 WS-1 (Aufgabe 1): Klick auf #chat-abbrechen-btn — POST /api/laeufe/<laufId>/abbrechen (F14), 202 sofort ohne auf das Laufende zu warten (Datei-Kommentar leitstand-server.mjs). Löst selbst KEINE terminale Auflösung aus: der eigene 500ms-Poll (pruefeAusstehendenLauf) behandelt den jetzt FEHLGESCHLAGENEN Lauf anschließend genau wie jeden anderen nicht erfolgreichen Lauf — derselbe Codepfad, keine zweite Auflösungsregel. Nur ein Fehlschlag DIESER Anfrage selbst (Netzwerk, 404 bei einem inzwischen bereits beendeten Lauf) wird hier direkt gemeldet, Muster views/runs.js meldeAbbrechenFehler. */
function initAbbrechenBedienung() {
  document.getElementById('chat-abbrechen-btn').addEventListener('click', async () => {
    if (ausstehenderLauf === null) return
    const { laufId } = ausstehenderLauf
    setzeAbbrechenZustand('Abbruch angefordert', true)
    try {
      const antwort = await abbrichLauf(laufId)
      if (antwort.ok) {
        // Für die Auswertung in pruefeAusstehendenLauf: ein 202 heißt nur "angenommen", nicht
        // "hat gewirkt" (s. dort) — der Lauf kann trotzdem regulär mit einer Antwort enden.
        if (ausstehenderLauf?.laufId === laufId) ausstehenderLauf.abbruchAngefordert = true
        return
      }
      if (ausstehenderLauf?.laufId !== laufId) return // inzwischen anders aufgelöst (Poll/Projektwechsel) — keine Meldung mehr für den falschen Lauf
      const koerper = await antwort.json().catch(() => ({}))
      zeigeChatFehler(`Abbruch fehlgeschlagen: ${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`)
      setzeAbbrechenZustand('Lauf abbrechen', false)
    } catch (fehler) {
      if (ausstehenderLauf?.laufId !== laufId) return
      zeigeChatFehler(`Abbruch-Anfrage fehlgeschlagen: ${fehler.message}`)
      setzeAbbrechenZustand('Lauf abbrechen', false)
    }
  })
}

/** F31 WS-2: Klick auf #chat-zusammenfassen-btn — POST /api/chat/zusammenfassen, danach derselbe ausstehenderLauf/Tippindikator/Poll-Pfad wie eine normale Nachricht (pruefeAusstehendenLauf löst terminal auf, kein zweiter Codepfad). Kein Vorfilter (eine Zusammenfassung hat keine lokal beantwortbare Kurzform). Ein 409 (D13 oder "kein Verlauf zum Zusammenfassen") erscheint wie bei sendeAktuelleEingabe als Fehleranzeige. */
async function sendeZusammenfassungAnfrage() {
  const button = document.getElementById('chat-zusammenfassen-btn')
  if (button.disabled) return
  zeigeChatFehler('')
  const tSenden = performance.now()
  setzeSendenSperre(true)
  try {
    const antwort = await sendeChatZusammenfassung()
    const tServerQuittung = performance.now()
    if (antwort.status !== 202) {
      const koerper = await antwort.json().catch(() => ({}))
      zeigeChatFehler(`${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`)
      setzeSendenSperre(false)
      return
    }
    const angenommen = await antwort.json().catch(() => ({}))
    ausstehenderLauf = {
      nachricht: '[Zusammenfassung angefordert]',
      laufId: angenommen.laufId,
      zeitstempel: new Date().toISOString(),
      istZusammenfassung: true,
      messung: { tSenden, tServerQuittung, tickZeiten: [] },
    }
    starteAusstehendenLaufPoll()
    setzeAbbrechenZustand('Lauf abbrechen', false)
    renderVerlauf()
  } catch (fehler) {
    zeigeChatFehler(`Anfrage fehlgeschlagen: ${fehler.message}`)
    setzeSendenSperre(false)
  }
}

function initZusammenfassenBedienung() {
  document.getElementById('chat-zusammenfassen-btn').addEventListener('click', () => void sendeZusammenfassungAnfrage())
}

function initSendenFormular() {
  document.getElementById('chat-senden').addEventListener('click', () => void sendeAktuelleEingabe())
}

/** F29 WS-D2 (Auftrag Punkt C, Hinweistext "Shift + Enter für neue Zeile"): Enter sendet, Shift+Enter bleibt normaler Zeilenumbruch (Browser-Default) — ruft denselben, unveränderten Sende-Pfad wie der Button. */
function initEingabeTastatur() {
  document.getElementById('chat-eingabe').addEventListener('keydown', (ereignis) => {
    if (ereignis.key === 'Enter' && !ereignis.shiftKey) {
      ereignis.preventDefault()
      void sendeAktuelleEingabe()
    }
  })
}

/** F29 WS-D2 (Auftrag Punkt C): "Ganzen Verlauf öffnen"/"schließen" — reiner Anzeige-Umschalter (renderVerlauf), kein zweiter Fetch. */
function initGanzenVerlaufLink() {
  document.getElementById('chat-ganzen-verlauf-link').addEventListener('click', () => {
    zeigeAlle = !zeigeAlle
    renderVerlauf()
  })
}

/** QA-Befund WS-2a (real reproduziert): setzt den kompletten lokalen Chat-Zustand zurück — aufgerufen bei jedem Projektwechsel (abonniereProjektWechsel), damit weder eine ausstehende Nachricht noch ein lokaler Eintrag aus dem VORHERIGEN Projekt im neuen sichtbar bleibt oder gegen dessen api.js-Präfix weiterpollt. */
function setzeChatZustandZurueck() {
  ausstehenderLauf = null
  stoppeAusstehendenLaufPoll()
  lokaleEintraege = []
  persistierterVerlauf = []
  zeigeChatFehler('')
  setzeSendenSperre(false)
  setzeAbbrechenZustand('Lauf abbrechen', false)
  renderVerlauf()
}

/** Initialisiert die Chat-View einmalig beim Bootstrap. */
export function initChatView() {
  initSendenFormular()
  initEingabeTastatur()
  initGanzenVerlaufLink()
  initAbbrechenBedienung()
  initZusammenfassenBedienung()

  // F29 WS-1a: { ueberlagert: true } — Chat ist seither die umschaltbare rechte Spalte der Shell
  // (public/leitstand/shell.js), kein `[data-view]`-Container in <main> mehr; der Dispatch auf
  // '#/chat' lässt die Hauptansicht deshalb unangetastet (router.js Datei-Kommentar). Rein
  // strukturelle Registrierungs-Option, keine Änderung an Verlauf/Formular-Logik dieser Datei.
  registriere(/^#\/chat$/, 'chat', () => {
    void ladeVerlauf()
  }, { ueberlagert: true })

  // F29 WS-D2-Korrektur: #shell-chat-spalte ist ab ≥1280px in JEDER View sichtbar (shell.js),
  // nicht nur unter '#/chat' — das obige onEnter allein lädt den Verlauf deshalb nicht mehr
  // zuverlässig (z. B. Start → Workboard, ohne '#/chat' je betreten zu haben, blieb die Spalte
  // leer). Einmaliger Ladeversuch hier beim Shell-Bootstrap, unabhängig von der aktiven Route —
  // renderProjektKontext() (app.js) läuft davor, das aktive Projekt steht also bereits fest.
  void ladeVerlauf()

  abonniere((zustand) => {
    letzterZustand = zustand
  })
  abonniereProjektWechsel(setzeChatZustandZurueck)

  // Task "Jarvis-Chat-Latenz senken", Schritt 4: siehe Kommentar an polleSofortBeiSichtbarkeit.
  document.addEventListener('visibilitychange', () => void polleSofortBeiSichtbarkeit())
}
