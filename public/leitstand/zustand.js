/**
 * Datei: public/leitstand/zustand.js
 *
 * Zweck: GENAU EIN Poll-Timer der Jarvis Shell (F20 WS-2, AK3). Holt alle
 * zwei Sekunden GET /api/zustand und reicht das Aggregat { laeufe,
 * startfehler, workflows, fehler, aktiverLauf } an registrierte Abnehmer
 * weiter (abonniere(fn)) — ersetzt die drei eigenständigen setInterval-Timer,
 * die vorher in views/runs.js (laden, ladeStartfehler) und views/workflows.js
 * (pollWorkflows) liefen. aktiverLauf ist F28 WS-1s additive Ergänzung
 * (globalerLaufZustand-Spiegelung, siehe leitstand-server.mjs).
 *
 * zeigePollFehler ist von render.js hierher umgezogen: ein einziger Poll hat
 * nur noch einen fetch()-Fehlerpfad, nicht mehr je View einen eigenen.
 *
 * Detail-Auffrischer (abonniereDetailAuffrischer(fn)) laufen NACH den
 * Abnehmern, bei JEDEM Tick — kein zweiter Timer. Das Workflow-Detail wird so
 * weiterhin gepollt, solange eines offen ist (views/workflows.js); das
 * Lauf-Detail bleibt bewusst UNGEPOLLT (TECH_DEBT F-363, unverändert aus
 * WS-1 — es hängt hier an nichts, weil views/runs.js keinen
 * Detail-Auffrischer registriert).
 *
 * pollJetzt() löst denselben Tick außerhalb des Zeitplans aus — für die
 * sofortige Rückmeldung nach einer Bedienung (F20 WS-1 Muster
 * "pollWorkflows() nach jeder Bedienung", jetzt zentral statt je View). Es
 * startet KEINEN zweiten Timer, nur einen einmaligen Tick.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initZustandPoll beim Bootstrap, NACH allen
 *   initXView()-Aufrufen, die ihrerseits abonniere() registrieren)
 * - public/leitstand/views/runs.js, views/workflows.js, views/dashboard.js
 *   (abonniere, teils abonniereDetailAuffrischer, pollJetzt)
 */

import { holeZustand } from './api.js'

/** Registrierte Abnehmer, je Tick mit dem vollen Aggregat aufgerufen. */
const abnehmer = []

/** Registrierte Detail-Auffrischer, je Tick ohne Argument aufgerufen (siehe Dateikommentar). */
const detailAuffrischer = []

/** Registriert eine Funktion, die bei jedem Poll-Tick mit dem Aggregat aufgerufen wird. @param fn - (zustand) => void, zustand = { laeufe, startfehler, workflows, fehler, aktiverLauf } */
export function abonniere(fn) {
  abnehmer.push(fn)
}

/** Registriert einen Auffrischer für eine offene Detailansicht — läuft bei jedem Tick, unabhängig vom Aggregat (siehe Dateikommentar). @param fn - () => void, prüft selbst, ob gerade ein Detail offen ist */
export function abonniereDetailAuffrischer(fn) {
  detailAuffrischer.push(fn)
}

/** Zeigt/verbirgt den globalen Poll-Fehlerhinweis im Shell-Header. @param fehlgeschlagen - true, wenn der letzte Poll-Versuch fehlschlug */
function zeigePollFehler(fehlgeschlagen) {
  const anzeige = document.getElementById('poll-fehler')
  anzeige.hidden = !fehlgeschlagen
}

/**
 * Das Promise des gerade laufenden pollZustand-Ticks, oder null, wenn keiner läuft.
 *
 * Real beobachtet (Stefans Netzwerk-Konsole, 21.09.2026, und per curl nachgemessen): der
 * 2-Sekunden-Timer feuerte bisher unbedingt — dauerte eine Zustandsabfrage länger als das
 * Intervall, startete der nächste Tick trotzdem. Die Anfragen stapelten sich dann unbegrenzt
 * (HTTP/1.1, 6 Verbindungen je Host; die übrigen warten in der Browser-Warteschlange), und weil
 * der Server das Aggregat synchron von Platte baut, blockierte jede wartende Zustandsabfrage
 * auch POST /api/chat und POST /api/laeufe/<id>/abbrechen dahinter — gemessen bis 45 s für eine
 * einzelne Abfrage, während dieselbe Abfrage ohne Stapel 0,08-0,3 s braucht. Genau das erzeugte
 * das Bild "Leitstand lädt ewig, Senden dauert, Abbrechen wirkt nicht".
 *
 * Der TIMER-Tick hängt sich an einen bereits laufenden Tick an, statt einen zweiten Abruf zu
 * starten — für ihn genügt die ohnehin laufende Abfrage. Kein zweiter Timer
 * (scripts/check-f20-zustand-poll.mjs AK3 erzwingt genau EIN setInterval im Leitstand-Client).
 */
let laufenderPoll = null

/**
 * Das Promise eines angeforderten NACHLAUFS (siehe pollJetzt), oder null.
 *
 * Ein laufender Tick kann seine Antwort schon VOR der auslösenden Aktion vom Server geholt
 * haben — sich an ihn anzuhängen, hieße die Aktion mit einem älteren Zustand zu beantworten.
 * pollJetzt() fordert deshalb einen weiteren Tick NACH dem laufenden an. Mehrere Aufrufe
 * während desselben Ticks teilen sich GENAU EINEN Nachlauf (ein Abruf reicht, um alle zu
 * bedienen) — so bleibt die Zusage "nie zwei Abrufe gleichzeitig" erhalten.
 */
let nachlaufPromise = null

/** Startet einen Tick und hält ihn in laufenderPoll, bis er fertig ist. @returns Promise des Ticks */
function starteTick() {
  laufenderPoll = fuehrePollTickAus().finally(() => {
    laufenderPoll = null
  })
  return laufenderPoll
}

/** Ein Poll-Tick des Timers: hängt sich an einen bereits laufenden Tick an, statt zu überlappen. */
function pollZustand() {
  if (laufenderPoll !== null) return laufenderPoll
  return starteTick()
}

/** Der eigentliche Tick — ausschließlich von pollZustand() aufgerufen, nie direkt (Überlappungsschutz dort). */
async function fuehrePollTickAus() {
  try {
    const zustand = await holeZustand()
    // Jeder Abnehmer einzeln gefangen (QA-Pass F20 WS-2): ein werfender Abnehmer darf weder die
    // übrigen Abnehmer stoppen noch fälschlich als fetch()-Fehlschlag gemeldet werden — der Fetch
    // war erfolgreich, nur eine EINZELNE Anzeige hat einen Fehler.
    for (const fn of abnehmer) {
      try {
        fn(zustand)
      } catch (fehler) {
        console.error('[leitstand] Abnehmer des Zustands-Polls ist fehlgeschlagen:', fehler)
      }
    }
    zeigePollFehler(false)
  } catch {
    zeigePollFehler(true)
  }
  // F-560: jeder Auffrischer einzeln gefangen — Muster der abnehmer-Schleife oben. Ein Wurf hier
  // beendete sonst fuehrePollTickAus mit einer Ablehnung; laufenderPoll wurde dann zwar im
  // finally geleert, aber die an ihn gehängte Nachlauf-Kette (pollJetzt) läuft nur im
  // Erfüllungsfall an — ein einziger werfender Auffrischer hätte den angeforderten Nachlauf
  // dauerhaft ausfallen lassen und pollJetzt() mit einer Ablehnung beantwortet.
  for (const fn of detailAuffrischer) {
    try {
      fn()
    } catch (fehler) {
      console.error('[leitstand] Detail-Auffrischer des Zustands-Polls ist fehlgeschlagen:', fehler)
    }
  }
}

/**
 * Löst außerhalb des Zeitplans einen Tick aus, dessen Antwort GARANTIERT nach dem Aufruf beim
 * Server geholt wurde (siehe nachlaufPromise) — kein zweiter Timer.
 *
 * Läuft gerade keiner, ist das dieser eine Tick. Läuft bereits einer, wird ein Nachlauf
 * angefordert: der laufende Tick kann seine Antwort schon vor der auslösenden Aktion geholt
 * haben und würde die Anzeige sonst mit einem Zustand von VOR der Aktion beantworten. Mehrere
 * Aufrufe während desselben Ticks werden zu EINEM Nachlauf zusammengefasst.
 */
export async function pollJetzt() {
  if (laufenderPoll === null) {
    await starteTick()
    return
  }
  if (nachlaufPromise === null) {
    nachlaufPromise = laufenderPoll.then(() => {
      // Erst hier freigeben, nicht im finally des Nachlauf-Ticks: ein pollJetzt() WÄHREND des
      // Nachlaufs soll wieder einen eigenen Nachlauf bekommen (seine Aktion liegt nach dessen
      // Abruf), ein zweites pollJetzt() aus demselben Wartefenster dagegen nicht.
      nachlaufPromise = null
      return starteTick()
    })
  }
  await nachlaufPromise
}

const POLL_INTERVALL_MS = 2000

/** Initialisiert den einen Poll-Timer — einmalig beim Bootstrap, NACH allen abonniere()-Aufrufen der Views. */
export function initZustandPoll() {
  void pollZustand()
  setInterval(pollZustand, POLL_INTERVALL_MS)
}
