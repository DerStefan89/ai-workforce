/**
 * Datei: public/leitstand/zustand.js
 *
 * Zweck: GENAU EIN Poll-Timer der Jarvis Shell (F20 WS-2, AK3). Holt alle
 * zwei Sekunden GET /api/zustand und reicht das Aggregat { laeufe,
 * startfehler, workflows, fehler } an registrierte Abnehmer weiter
 * (abonniere(fn)) — ersetzt die drei eigenständigen setInterval-Timer, die
 * vorher in views/runs.js (laden, ladeStartfehler) und views/workflows.js
 * (pollWorkflows) liefen.
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

/** Registriert eine Funktion, die bei jedem Poll-Tick mit dem Aggregat aufgerufen wird. @param fn - (zustand) => void, zustand = { laeufe, startfehler, workflows, fehler } */
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

/** Ein Poll-Tick: holt das Aggregat, ruft alle Abnehmer und danach alle Detail-Auffrischer auf. */
async function pollZustand() {
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
  for (const fn of detailAuffrischer) fn()
}

/** Löst außerhalb des Zeitplans genau einen weiteren Tick aus (siehe Dateikommentar) — kein zweiter Timer. */
export async function pollJetzt() {
  await pollZustand()
}

const POLL_INTERVALL_MS = 2000

/** Initialisiert den einen Poll-Timer — einmalig beim Bootstrap, NACH allen abonniere()-Aufrufen der Views. */
export function initZustandPoll() {
  void pollZustand()
  setInterval(pollZustand, POLL_INTERVALL_MS)
}
