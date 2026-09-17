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
 * 'lineage-chat-<projektId>') wird beim Betreten der View geladen — ein
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
 */

import { holeChatVerlauf, holeLaufDetail, sendeChatNachricht } from '../api.js'
import { escapeHtml } from '../render.js'
import { abonniereProjektWechsel } from '../projekt-kontext.js'
import { registriere } from '../router.js'
import { abonniere, abonniereDetailAuffrischer } from '../zustand.js'
import { loeseVorfilterAuf } from '../jarvis-vorfilter.js'

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

/** Baut die Anzeigeliste: persistierter Verlauf (bereits serverseitig aufsteigend sortiert) gefolgt von lokalen Einträgen (Push-Reihenfolge) und einem etwaigen ausstehenden Lauf zuletzt — beide Quellen entstehen immer chronologisch NACH dem zuletzt geladenen persistierten Stand, eine erneute Sortierung ist deshalb nicht nötig. */
function baueAnzeigeListe() {
  const liste = [...persistierterVerlauf.map((e) => ({ nachricht: e.nachricht, antwortText: antwortText(e.jarvisAntwort), quelle: 'jarvis' })), ...lokaleEintraege]
  if (ausstehenderLauf !== null) {
    liste.push({ nachricht: ausstehenderLauf.nachricht, antwortText: null, quelle: 'ausstehend' })
  }
  return liste
}

const QUELLE_LABEL = { jarvis: 'Jarvis', vorfilter: 'Vorfilter (lokal)', fehler: 'Fehler', ausstehend: 'Lauf gestartet' }

function renderEintrag(eintrag) {
  const quelleLabel = escapeHtml(QUELLE_LABEL[eintrag.quelle] ?? eintrag.quelle)
  const antwortHtml =
    eintrag.quelle === 'ausstehend'
      ? '<p class="chat-ausstehend">Lauf gestartet, wird bearbeitet… (kein Streaming, die Antwort erscheint hier, sobald der Lauf abgeschlossen ist)</p>'
      : `<p class="chat-antwort">${escapeHtml(eintrag.antwortText)}</p>`
  return `<div class="chat-eintrag">
    <p class="chat-nachricht"><strong>Du:</strong> ${escapeHtml(eintrag.nachricht)}</p>
    <p class="chat-quelle">${quelleLabel}</p>
    ${antwortHtml}
  </div>`
}

function renderVerlauf() {
  const container = document.getElementById('chat-verlauf')
  const liste = baueAnzeigeListe()
  container.innerHTML = liste.length === 0 ? '<p class="leer">Noch keine Nachrichten.</p>' : liste.map(renderEintrag).join('')
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
    lokaleEintraege.push({ nachricht, antwortText: beschreibeNichtErfolgreichesEnde(laufStatus), quelle: 'fehler' })
    renderVerlauf()
  }
  ausstehenderLauf = null
  setzeSendenSperre(false)
}

/** Formular „Senden": Vorfilter zuerst (lokal, kein Serverkontakt bei Treffer), sonst POST /api/chat. */
function initSendenFormular() {
  const button = document.getElementById('chat-senden')
  button.addEventListener('click', async () => {
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
        lokaleEintraege.push({ nachricht, antwortText: antwortText(vorfilterErgebnis), quelle: 'vorfilter' })
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
      ausstehenderLauf = { nachricht, laufId: angenommen.laufId }
      renderVerlauf()
      feld.value = ''
    } finally {
      // Bleibt gesperrt, solange ein Lauf aussteht (D13) — pruefeAusstehendenLauf hebt die Sperre
      // erst bei Terminallage auf; eine Vorfilter-Antwort oder ein Fehlschlag heben sofort auf.
      if (ausstehenderLauf === null) setzeSendenSperre(false)
    }
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

  registriere(/^#\/chat$/, 'chat', () => {
    void ladeVerlauf()
  })

  abonniere((zustand) => {
    letzterZustand = zustand
  })
  abonniereDetailAuffrischer(() => {
    void pruefeAusstehendenLauf()
  })
  abonniereProjektWechsel(setzeChatZustandZurueck)
}
