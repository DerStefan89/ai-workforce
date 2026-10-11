/**
 * Datei: scripts/leitstand/event-loop-messung.mjs
 *
 * Zweck: Event-Loop-Sichtbarkeit des Leitstands (F45 B0, Teil 2 Punkt 6; Abnahmekriterium P2 in
 * docs/projekt/fixpaket-f45.md). Misst mit perf_hooks.monitorEventLoopDelay die Verzögerung der
 * Event-Loop und gibt alle 60 s genau eine Zeile „[leitstand] Event-Loop 60s: max <ms> p99 <ms>“ aus.
 * Danach wird das Histogramm zurückgesetzt — jede Zeile beschreibt nur ihr eigenes Fenster.
 *
 * F45 P (Teil 1 Punkt 2): zusätzlich je Fenster eine Zeile „[leitstand] Zustand-Quellen 60s: <json>“ mit
 * max/p95/anzahl der Dauer je Poll-Quelle von GET /api/zustand (erfasseQuellenDauer, aufgerufen aus
 * sammleZustandsQuelle), und sofort je synchroner Strecke über SYNCHRON_SCHWELLE_MS eine Zeile
 * „[leitstand] Synchron > 200 ms: <name> <ms> ms“ (meldeSynchroneStrecke, aufgerufen vom Dispatcher-
 * Mantel im CLI-Bindeblock des Servers).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (CLI-Bindeblock, nach server.listen; sammleZustandsQuelle; Dispatcher-Mantel)
 * - scripts/messe-chat.mjs liest die Zeilen aus stdout (Muster der Zeitmessungs-Zeile)
 * - scripts/leitstand/event-loop-messung.test.mjs (node:test)
 *
 * Wichtig:
 * - Nur bei LEITSTAND_ZEITMESSUNG=1 aktiv (dieselbe Variable wie die Zeitmessung je Chat-Lauf); sonst
 *   No-op ohne Histogramm und ohne Timer — kein Verhaltensunterschied im Normalbetrieb. Die Quellen-
 *   Erfassung bleibt ohne starteEventLoopMessung inaktiv (quellenFenster null).
 * - Der Timer ist unref(): er hält den Prozess nie am Leben.
 * - Die Zeilenformate lesen scripts/messe-chat.mjs und die Abnahmekriterien P1/P2; nicht ohne beide ändern.
 */

import { monitorEventLoopDelay } from 'node:perf_hooks'

/** Länge eines Messfensters in Millisekunden. */
export const EVENT_LOOP_FENSTER_MS = 60_000

/** Ab dieser Dauer (ms) wird eine synchrone Strecke mit Namen protokolliert (Abnahmekriterium P2). */
export const SYNCHRON_SCHWELLE_MS = 200

/** Dauer je Poll-Quelle im laufenden Fenster (Map quelle → ms[]), oder null, solange die Messung nicht läuft. */
let quellenFenster = null

/** Ausgabe der laufenden Messung (für meldeSynchroneStrecke), oder null, solange sie nicht läuft. */
let aktiveAusgabe = null

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
 * Formatiert die Quellen-Zeile eines Fensters.
 * @param fenster - Map quelle → Dauern in ms
 * @returns „[leitstand] Zustand-Quellen 60s: {"<quelle>":{"max":…,"p95":…,"anzahl":…},…}“ (ganze ms)
 */
export function formatiereQuellenZeile(fenster) {
  const werte = {}
  for (const [quelle, dauern] of fenster) {
    const sortiert = [...dauern].sort((a, b) => a - b)
    const p95 = sortiert[Math.min(sortiert.length - 1, Math.ceil(sortiert.length * 0.95) - 1)]
    werte[quelle] = { max: Math.round(sortiert.at(-1)), p95: Math.round(p95), anzahl: sortiert.length }
  }
  return `[leitstand] Zustand-Quellen 60s: ${JSON.stringify(werte)}`
}

/**
 * Erfasst die Dauer einer Poll-Quelle im laufenden Fenster — No-op, solange die Messung nicht läuft.
 * @param quelle - Kennung der Quelle (z. B. 'laeufe', 'workflows', 'gesamt')
 * @param dauerMs - gemessene Dauer in ms
 */
export function erfasseQuellenDauer(quelle, dauerMs) {
  if (quellenFenster === null) return
  const liste = quellenFenster.get(quelle)
  if (liste === undefined) quellenFenster.set(quelle, [dauerMs])
  else liste.push(dauerMs)
}

/**
 * Protokolliert eine synchrone Strecke über SYNCHRON_SCHWELLE_MS mit Namen — No-op, solange die Messung nicht läuft.
 * @param name - Bezeichnung der Strecke (z. B. 'GET /api/zustand')
 * @param dauerMs - gemessene Dauer in ms
 */
export function meldeSynchroneStrecke(name, dauerMs) {
  if (aktiveAusgabe === null || dauerMs <= SYNCHRON_SCHWELLE_MS) return
  aktiveAusgabe(`[leitstand] Synchron > ${SYNCHRON_SCHWELLE_MS} ms: ${name} ${Math.round(dauerMs)} ms`)
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
  quellenFenster = new Map()
  aktiveAusgabe = ausgabe
  const timer = setInterval(() => {
    ausgabe(formatiereEventLoopZeile(histogramm.max, histogramm.percentile(99)))
    histogramm.reset()
    if (quellenFenster !== null && quellenFenster.size > 0) {
      ausgabe(formatiereQuellenZeile(quellenFenster))
      quellenFenster = new Map()
    }
  }, fensterMs)
  timer.unref()
  return () => {
    clearInterval(timer)
    histogramm.disable()
    quellenFenster = null
    aktiveAusgabe = null
  }
}
