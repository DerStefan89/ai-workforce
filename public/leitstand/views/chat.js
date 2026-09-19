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
 * Ein laufender Jarvis-Lauf wird über den ohnehin vorhandenen
 * 2-Sekunden-Poll (zustand.js, abonniereDetailAuffrischer, Muster
 * views/workflows.js Workflow-Detail) verfolgt, kein eigener Timer. Erst
 * wenn der Lauf real ABGESCHLOSSEN ist, wird der Verlauf neu geladen (der
 * Server hat den Lineage-Eintrag dann bereits geschrieben, siehe
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
 */

import { holeChatVerlauf, holeLaufDetail, sendeChatNachricht } from '../api.js'
import { escapeHtml, formatiereUhrzeit } from '../render.js'
import { abonniereProjektWechsel } from '../projekt-kontext.js'
import { registriere } from '../router.js'
import { abonniere, abonniereDetailAuffrischer } from '../zustand.js'
import { loeseVorfilterAuf } from '../jarvis-vorfilter.js'

/** F29 WS-D2 (Auftrag Punkt C): true zeigt den vollständigen Verlauf, false nur die letzten zwei Einträge — reiner Anzeige-Umschalter ("Ganzen Verlauf öffnen"/"schließen"), kein zweiter Fetch. */
let zeigeAlle = false

/** Letztes Zustands-Aggregat aus dem Poll (für den Vorfilter), oder null vor dem ersten Tick. */
let letzterZustand = null

/** Persistierter Verlauf aus GET /api/chat, gemappt auf Anzeige-Einträge — neu geladen beim Betreten der View und nach jedem real erfolgreichen Jarvis-Lauf. Bereits in Server-Reihenfolge (aufsteigend), Anzeigereihenfolge unten daher reine Verkettung statt eines erneuten Sortierens. */
let persistierterVerlauf = []

/** Lokale, NICHT persistierte Einträge dieser Sitzung — Vorfilter-Antworten und die Fehlanzeige eines nicht erfolgreichen Jarvis-Laufs (siehe Datei-Kopf). In Entstehungsreihenfolge (push), die immer NACH dem zuletzt geladenen persistierterVerlauf-Stand liegt. */
let lokaleEintraege = []

/** Der gerade laufende, noch nicht terminierte Jarvis-Chat-Lauf dieser View, oder null. @type {{ nachricht: string, laufId: string } | null} */
let ausstehenderLauf = null

/** @param antwort - JarvisErgebnis-artiges Objekt ({ art, antwort, auftrag?, aktion?, bezug? }) oder null @returns Anzeigetext */
function antwortText(antwort) {
  if (antwort === null || typeof antwort?.antwort !== 'string') return '(keine lesbare Antwort)'
  return antwort.antwort
}

/** Baut die Anzeigeliste: persistierter Verlauf (bereits serverseitig aufsteigend sortiert) gefolgt von lokalen Einträgen (Push-Reihenfolge) und einem etwaigen ausstehenden Lauf zuletzt — beide Quellen entstehen immer chronologisch NACH dem zuletzt geladenen persistierten Stand, eine erneute Sortierung ist deshalb nicht nötig. F29 WS-D2: zeitstempel ist bei persistierten Einträgen IMMER null (der Server führt keines, Auftrag Punkt E: keine erfundene Zeit), bei lokalen der beim Push erfasste Wert (s. initSendenFormular/pruefeAusstehendenLauf). */
function baueAnzeigeListe() {
  const liste = [...persistierterVerlauf.map((e) => ({ nachricht: e.nachricht, antwortText: antwortText(e.jarvisAntwort), quelle: 'jarvis', zeitstempel: null })), ...lokaleEintraege]
  if (ausstehenderLauf !== null) {
    liste.push({ nachricht: ausstehenderLauf.nachricht, antwortText: null, quelle: 'ausstehend', zeitstempel: ausstehenderLauf.zeitstempel })
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

/** Ein Verlaufseintrag als zwei Sprechblasen-Zeilen (Nutzerfrage + Jarvis-Antwort bzw. Tippindikator, solange sie aussteht). @param eintrag - aus baueAnzeigeListe() @returns HTML-Block */
function renderEintrag(eintrag) {
  const zeitHtml = eintrag.zeitstempel ? ` <span class="chat-bubble-zeit">${escapeHtml(formatiereUhrzeit(eintrag.zeitstempel) ?? '')}</span>` : ''
  const nutzerZeile = chatBubbleReihe('Stefan', zeitHtml, `<p class="chat-bubble-text">${escapeHtml(eintrag.nachricht)}</p>`, 'nutzer')
  if (eintrag.quelle === 'ausstehend') {
    const tippindikator = '<p class="chat-tippindikator" aria-hidden="true"><span></span><span></span><span></span></p>'
    return nutzerZeile + chatBubbleReihe('Jarvis', '', tippindikator, 'jarvis')
  }
  const label = QUELLE_ANTWORT_LABEL[eintrag.quelle] ?? 'Jarvis'
  const jarvisZeile = chatBubbleReihe(label, zeitHtml, `<p class="chat-bubble-text">${escapeHtml(eintrag.antwortText)}</p>`, 'jarvis')
  return nutzerZeile + jarvisZeile
}

/** F29 WS-D2 (Auftrag Punkt C): zeigt standardmäßig nur die letzten zwei Einträge — "Ganzen Verlauf öffnen" (initGanzenVerlaufLink) schaltet zeigeAlle um und rendert neu, kein zweiter Fetch. */
function renderVerlauf() {
  const container = document.getElementById('chat-verlauf')
  const liste = baueAnzeigeListe()
  const sichtbar = zeigeAlle ? liste : liste.slice(-2)
  container.innerHTML = sichtbar.length === 0 ? '<p class="leer">Noch keine Nachrichten.</p>' : sichtbar.map(renderEintrag).join('')
  const link = document.getElementById('chat-ganzen-verlauf-link')
  link.hidden = liste.length <= 2
  link.textContent = zeigeAlle ? 'Verlauf einklappen' : 'Ganzen Verlauf öffnen'
}

function zeigeChatFehler(text) {
  const anzeige = document.getElementById('chat-fehler')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

/** Setzt Eingabefeld/Sende-Button in den Wartezustand — solange ein Vorfilter-Abruf läuft ODER ein Jarvis-Lauf aussteht (D13 lässt ohnehin nur einen Lauf zu). */
function setzeSendenSperre(gesperrt) {
  document.getElementById('chat-senden').disabled = gesperrt
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

/** Terminallage eines Jarvis-Chat-Laufs, der NICHT real ABGESCHLOSSEN/ERFOLGREICH endete — Text für die lokale Fehlanzeige (kein Lineage-Eintrag, siehe Datei-Kopf). @param laufStatus - detail.laufStatus aus GET /api/laeufe/<laufId> */
function beschreibeNichtErfolgreichesEnde(laufStatus) {
  if (laufStatus?.status === 'KLAERUNG_ERFORDERLICH') return `Lauf hält — Klärung erforderlich: ${laufStatus.grund}`
  if (laufStatus?.status === 'ABGESCHLOSSEN') return `Lauf abgeschlossen, aber nicht erfolgreich (${laufStatus.ergebnis}).`
  return `Lauf endete unerwartet (Status: ${laufStatus?.status ?? 'unbekannt'}).`
}

/** Bei jedem Poll-Tick geprüft (abonniereDetailAuffrischer): solange ein Jarvis-Chat-Lauf aussteht, GET /api/laeufe/<laufId> abrufen und bei Terminallage auflösen. */
async function pruefeAusstehendenLauf() {
  if (ausstehenderLauf === null) return
  const { laufId, nachricht } = ausstehenderLauf
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
  if (detail.aktiv === true) return
  const laufStatus = detail.laufStatus
  if (laufStatus?.status !== 'ABGESCHLOSSEN' && laufStatus?.status !== 'KLAERUNG_ERFORDERLICH') return // noch nicht terminal (z. B. NICHT_GESTARTET direkt nach 202)

  if (laufStatus.status === 'ABGESCHLOSSEN' && laufStatus.ergebnis === 'ERFOLGREICH') {
    // ausstehenderLauf bleibt gesetzt, bis ladeVerlauf() wirklich erfolgreich war (QA-Befund):
    // ein transienter Fehlschlag genau in diesem Moment ließe sonst weder die Pending-Anzeige
    // noch den fertigen Eintrag sichtbar — der nächste Tick prüft denselben, bereits terminalen
    // Lauf erneut und versucht das Neuladen einfach noch einmal.
    const geladen = await ladeVerlauf()
    if (!geladen) return
  } else {
    lokaleEintraege.push({ nachricht, antwortText: beschreibeNichtErfolgreichesEnde(laufStatus), quelle: 'fehler', zeitstempel: new Date().toISOString() })
    renderVerlauf()
  }
  ausstehenderLauf = null
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

  setzeSendenSperre(true)
  try {
      const vorfilterErgebnis = await loeseVorfilterAuf(nachricht, letzterZustand)
      if (vorfilterErgebnis !== null) {
        lokaleEintraege.push({ nachricht, antwortText: antwortText(vorfilterErgebnis), quelle: 'vorfilter', zeitstempel: new Date().toISOString() })
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
      if (antwort.status !== 202) {
        const koerper = await antwort.json().catch(() => ({}))
        zeigeChatFehler(`${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`)
        return
      }
      const angenommen = await antwort.json().catch(() => ({}))
      ausstehenderLauf = { nachricht, laufId: angenommen.laufId, zeitstempel: new Date().toISOString() }
      renderVerlauf()
      feld.value = ''
    } finally {
      // Bleibt gesperrt, solange ein Lauf aussteht (D13) — pruefeAusstehendenLauf hebt die Sperre
      // erst bei Terminallage auf; eine Vorfilter-Antwort oder ein Fehlschlag heben sofort auf.
      if (ausstehenderLauf === null) setzeSendenSperre(false)
    }
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
  lokaleEintraege = []
  persistierterVerlauf = []
  zeigeChatFehler('')
  setzeSendenSperre(false)
  renderVerlauf()
}

/** Initialisiert die Chat-View einmalig beim Bootstrap. */
export function initChatView() {
  initSendenFormular()
  initEingabeTastatur()
  initGanzenVerlaufLink()

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
  abonniereDetailAuffrischer(() => {
    void pruefeAusstehendenLauf()
  })
  abonniereProjektWechsel(setzeChatZustandZurueck)
}
