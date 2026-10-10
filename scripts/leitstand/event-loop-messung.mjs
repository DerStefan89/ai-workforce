/**
 * Datei: scripts/leitstand/event-loop-messung.mjs
 *
 * Zweck: Event-Loop-Sichtbarkeit des Leitstands (F45 B0, Teil 2 Punkt 6; Abnahmekriterium P2 in
 * docs/projekt/fixpaket-f45.md). Misst mit perf_hooks.monitorEventLoopDelay die Verzögerung der
 * Event-Loop und gibt alle 60 s genau eine Zeile „[leitstand] Event-Loop 60s: max <ms> p99 <ms>“ aus.
 * Danach wird das Histogramm zurückgesetzt — jede Zeile beschreibt nur ihr eigenes Fenster.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (CLI-Bindeblock, nach server.listen)
 * - scripts/messe-chat.mjs liest die Zeilen aus stdout (Muster der Zeitmessungs-Zeile)
 * - scripts/leitstand/event-loop-messung.test.mjs (node:test)
 *
 * Wichtig:
 * - Nur bei LEITSTAND_ZEITMESSUNG=1 aktiv (dieselbe Variable wie die Zeitmessung je Chat-Lauf); sonst
 *   No-op ohne Histogramm und ohne Timer — kein Verhaltensunterschied im Normalbetrieb.
 * - Der Timer ist unref(): er hält den Prozess nie am Leben.
 * - Das Zeilenformat lesen scripts/messe-chat.mjs und das Abnahmekriterium P2; nicht ohne beide ändern.
 */

import { monitorEventLoopDelay } from 'node:perf_hooks'

/** Länge eines Messfensters in Millisekunden. */
export const EVENT_LOOP_FENSTER_MS = 60_000

/**
 * Formatiert eine Messzeile aus Nanosekunden-Werten des Histogramms.
 * @param maxNs - größte gemessene Verzögerung im Fenster (ns)
 * @param p99Ns - 99. Perzentil im Fenster (ns)
 * @returns die Zeile „[leitstand] Event-Loop 60s: max <ms> p99 <ms>“ (ganze Millisekunden)
 */
export function formatiereEventLoopZeile(maxNs, p99Ns) {
  const ms = (ns) => (Number.isFinite(ns) ? Math.round(ns / 1e6) : 0)
  return `[leitstand] Event-Loop 60s: max ${ms(maxNs)} p99 ${ms(p99Ns)}`
}

/**
 * Startet die Event-Loop-Messung, wenn LEITSTAND_ZEITMESSUNG=1 gesetzt ist.
 * @param optionen - { env, fensterMs, ausgabe } — alle optional (Standard process.env, 60 s, console.log)
 * @returns Stopp-Funktion (bei inaktiver Messung eine No-op-Funktion)
 */
export function starteEventLoopMessung({ env = process.env, fensterMs = EVENT_LOOP_FENSTER_MS, ausgabe = console.log } = {}) {
  if (env.LEITSTAND_ZEITMESSUNG !== '1') return () => {}
  const histogramm = monitorEventLoopDelay({ resolution: 10 })
  histogramm.enable()
  const timer = setInterval(() => {
    ausgabe(formatiereEventLoopZeile(histogramm.max, histogramm.percentile(99)))
    histogramm.reset()
  }, fensterMs)
  timer.unref()
  return () => {
    clearInterval(timer)
    histogramm.disable()
  }
}
