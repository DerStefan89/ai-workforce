/**
 * Datei: public/leitstand/rollen-kreis.js
 *
 * Zweck: Baustein Rollen-Kreis (F46 D1, docs/design/abgleich-f46.md §1 „Gemeinsame Bausteine“,
 * Design 02-produktuebersicht „Wer arbeitet gerade“). Sechs Rollen im Kreis — Planner (Codex,
 * Architekt) · Advisor (Claude) · Builder (Claude Code) · Prüfschritt (kein Modell) · Reviewer
 * (Codex) · Abnahme (Du) — und drei Satelliten am Builder: code-reviewer, qa, design-guardian (je
 * Claude). Reviewer (Codex-Review-Schritt) und code-reviewer (Claude-Subagent) sind getrennte Rollen
 * (Festlegung F46, features/F46/feature.md).
 *
 * Status je Rolle ('fertig' | 'jetzt' | 'offen') kommt aus den Schritten des Workflows zum Feature
 * in Arbeit (kreisStatus). Abbildung Schritt-Rolle → Kreis-Rolle: KREIS_ROLLE_JE_SCHRITT_ROLLE.
 * - Planner, Advisor, Builder, Reviewer: aus den Schritten ihrer Schritt-Rolle — ein Schritt
 *   LAEUFT → 'jetzt'; alle Schritte ERFOLGREICH oder UEBERSPRUNGEN (mindestens einer ERFOLGREICH)
 *   → 'fertig'; sonst (offen, wartet auf Freigabe, verweigert, fehlgeschlagen) → 'offen'.
 * - Prüfschritt: hat keinen eigenen Workflow-Schritt; 'fertig', wenn die deterministische Prüfung
 *   nach dem Builder GRUEN gemeldet hat (GET …/abnahme, pruefergebnis), sonst 'offen'.
 * - Abnahme: 'fertig' bei einer gültigen Abnahme-Entscheidung ANGENOMMEN; 'jetzt', wenn der
 *   Workflow ABGESCHLOSSEN ist und die Abnahme-Quelle geladen ist, aber keine gültige Entscheidung
 *   trägt (wartet auf dich); fehlt die Quelle (GET …/abnahme nicht ladbar), bleibt sie 'offen' —
 *   nichts wird geraten (Prüfpass D1, cr 1).
 * - Satelliten: immer 'offen' — es gibt keine Quelle für Urteile je Claude-Prüfer (K, §4.5).
 * - Ohne Workflow (oder solange er lädt): alle 'offen'.
 *
 * Bedienung: Die Rollen sind ein Register (role=tablist/tab, Muster F44 WS-7/WS-8): Klick oder
 * Pfeil links/rechts, Pos1, Ende wählen eine Rolle; die gewählte Rolle steuert das Panel „Rolle im
 * Detail“ (aria-controls). Das Verdrahten (Ereignisse) macht der Aufrufer; hier steht nur, was
 * gerendert wird und welche Rolle als Nächstes gewählt ist (naechsteKreisRolle).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/dashboard.js (Karten „Wer arbeitet gerade“ und „Rolle im Detail“)
 * - public/leitstand/views/workboard-detail.js (Fortschritt im Detail eines Features, F46 D3)
 * - public/leitstand/rollen-kreis.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein DOM, kein Netz — in Node testbar.
 * - Der Status steht nie nur als Farbe: Punktform (✓ fertig, gefüllt jetzt, Ring offen) und ein
 *   Text für Screenreader (und im title) tragen ihn mit.
 * - Rollen- und Workernamen über t(); Werte aus dem Workflow (Schritt-IDs, Worker) escaped.
 */

import { naechsterRegisterIndex } from './faehigkeiten-anzeige.js'
import { t, tHtml } from './i18n.js'
import { escapeHtml } from './render.js'

/** Die sechs Rollen des Kreises in Kreisreihenfolge (oben beginnend, im Uhrzeigersinn). */
export const KREIS_ROLLEN = Object.freeze(['planner', 'advisor', 'builder', 'pruefschritt', 'reviewer', 'abnahme'])

/** Die drei Satelliten am Builder (Claude-Prüfer, Subagenten). */
export const SATELLITEN = Object.freeze(['code-reviewer', 'qa', 'design-guardian'])

/** Alle wählbaren Rollen in Tab-Reihenfolge. */
export const ALLE_KREIS_ROLLEN = Object.freeze([...KREIS_ROLLEN, ...SATELLITEN])

/**
 * Abbildung Schritt-Rolle (schritt.rolle, src/rollen) → Kreis-Rolle. Nur diese vier Rollen kommen als
 * Workflow-Schritt vor (workflow-vorlagen/*.json); jede andere Schritt-Rolle erscheint nicht im Kreis.
 * Der Review-Schritt trägt die Rolle 'code-reviewer' (Worker Codex) — im Kreis ist das der Reviewer,
 * nicht der Satellit code-reviewer (Claude-Subagent am Builder).
 */
export const KREIS_ROLLE_JE_SCHRITT_ROLLE = Object.freeze({
  architekt: 'planner',
  'architecture-advisor': 'advisor',
  ausfuehrung: 'builder',
  'code-reviewer': 'reviewer',
})

/** Erledigte Schrittstatus (src/workflow/index.ts SCHRITT_STATUS). */
const ERLEDIGT = new Set(['ERFOLGREICH', 'UEBERSPRUNGEN'])

/**
 * Status aller Kreis-Rollen und Satelliten.
 * @param nachtrag - Fokus-Nachtrag des Workflows (fokus-daten.js ladeFokusNachtrag: schritte,
 *   workflowStatus, pruefergebnis, abnahmeEntscheidung) oder null ohne Workflow
 * @returns { [rolle]: { status: 'fertig' | 'jetzt' | 'offen', schritt: Workflow-Schritt oder null } }
 */
export function kreisStatus(nachtrag) {
  const ergebnis = Object.fromEntries(ALLE_KREIS_ROLLEN.map((rolle) => [rolle, { status: 'offen', schritt: null }]))
  const schritte = Array.isArray(nachtrag?.schritte) ? nachtrag.schritte.filter((s) => s !== null && typeof s === 'object') : []
  if (schritte.length === 0) return ergebnis

  for (const [schrittRolle, kreisRolle] of Object.entries(KREIS_ROLLE_JE_SCHRITT_ROLLE)) {
    const eigene = schritte.filter((s) => s.rolle === schrittRolle)
    if (eigene.length === 0) continue
    const laufend = eigene.find((s) => s.status === 'LAEUFT') ?? null
    const mitLauf = [...eigene].reverse().find((s) => typeof s.lauf_id === 'string' && s.lauf_id !== '') ?? null
    let status = 'offen'
    if (laufend !== null) status = 'jetzt'
    else if (eigene.every((s) => ERLEDIGT.has(s.status)) && eigene.some((s) => s.status === 'ERFOLGREICH')) status = 'fertig'
    ergebnis[kreisRolle] = { status, schritt: laufend ?? mitLauf ?? eigene[eigene.length - 1] }
  }

  if (nachtrag?.pruefergebnis?.status === 'ok' && nachtrag.pruefergebnis.ergebnis === 'GRUEN') ergebnis.pruefschritt = { status: 'fertig', schritt: null }

  const entscheidung = nachtrag?.abnahmeEntscheidung
  if (entscheidung?.status === 'ok' && entscheidung.ergebnis === 'ANGENOMMEN') ergebnis.abnahme = { status: 'fertig', schritt: null }
  else if (nachtrag?.workflowStatus === 'ABGESCHLOSSEN' && entscheidung !== null && typeof entscheidung === 'object' && entscheidung.status !== 'ok') ergebnis.abnahme = { status: 'jetzt', schritt: null }
  return ergebnis
}

/**
 * Die vorgewählte Rolle: die erste mit Status 'jetzt' in Kreisreihenfolge, sonst der Builder.
 * @param status - Ergebnis von kreisStatus
 * @returns Rollen-ID
 */
export function vorgewaehlteRolle(status) {
  return KREIS_ROLLEN.find((rolle) => status?.[rolle]?.status === 'jetzt') ?? 'builder'
}

/**
 * Nächste gewählte Rolle bei einer Taste (Register-Muster: Pfeil links/rechts, Pos1, Ende).
 * @param aktuell - gewählte Rollen-ID
 * @param taste - KeyboardEvent.key
 * @returns Rollen-ID oder null, wenn die Taste nichts wählt
 */
export function naechsteKreisRolle(aktuell, taste) {
  const index = Math.max(0, ALLE_KREIS_ROLLEN.indexOf(aktuell))
  const neu = naechsterRegisterIndex(index, ALLE_KREIS_ROLLEN.length, taste)
  return neu === null ? null : ALLE_KREIS_ROLLEN[neu]
}

/**
 * Ein Rollen-Reiter.
 * @param rolle - Rollen-ID
 * @param status - { status }
 * @param gewaehlt - true, wenn gewählt
 * @param panelId - ID des Panels „Rolle im Detail“
 * @param satellit - true für die Satelliten-Form (Pille)
 * @param idPraefix - Präfix der Reiter-IDs (`<präfix>-tab-<rolle>`)
 * @returns HTML
 */
function reiter(rolle, status, gewaehlt, panelId, satellit, idPraefix) {
  const statusText = t(`kreis.status.${status.status}`)
  const name = `${t(`kreis.rolle.${rolle}`)}`
  const worker = t(`kreis.worker.${rolle}`)
  const inhalt = satellit
    ? `<span class="rk-punkt" aria-hidden="true"></span><span class="rk-name">${escapeHtml(name)} · ${escapeHtml(worker)}</span>`
    : `<span class="rk-zeile"><span class="rk-punkt" aria-hidden="true"></span><span class="rk-name">${escapeHtml(name)}</span></span><span class="rk-worker">${escapeHtml(worker)}</span>`
  return `<button type="button" role="tab" id="${escapeHtml(idPraefix)}-tab-${rolle}" class="${satellit ? 'rk-satellit' : `rk-rolle rk-pos-${rolle}`}" data-kreis-rolle="${rolle}" data-status="${status.status}" aria-selected="${gewaehlt}" aria-controls="${escapeHtml(panelId)}" tabindex="${gewaehlt ? 0 : -1}" title="${escapeHtml(`${name} · ${worker} · ${statusText}`)}">${inhalt}<span class="sr-only"> · ${escapeHtml(statusText)}</span></button>`
}

/**
 * Rendert den Rollen-Kreis.
 * @param optionen - { status: kreisStatus, auswahl: Rollen-ID, panelId, mitteHtml: fertiges HTML für die Kreismitte,
 *   idPraefix: Präfix der Reiter-IDs, Standard 'rollen-kreis' (F46 D3: das Detail nutzt ein eigenes,
 *   weil Übersicht und Detail gleichzeitig im DOM stehen) }
 * @returns HTML
 */
export function rollenKreisHtml({ status, auswahl, panelId, mitteHtml, idPraefix = 'rollen-kreis' }) {
  const rollen = KREIS_ROLLEN.map((rolle) => reiter(rolle, status[rolle], rolle === auswahl, panelId, false, idPraefix)).join('')
  const satelliten = SATELLITEN.map((rolle) => reiter(rolle, status[rolle], rolle === auswahl, panelId, true, idPraefix)).join('')
  return `<div class="rollen-kreis" role="tablist" aria-label="${tHtml('kreis.register')}">
      <div class="rk-flaeche">
        <div class="rk-ring" aria-hidden="true"></div>
        <div class="rk-mitte">${mitteHtml}</div>
        ${rollen}
      </div>
      <div class="rk-satelliten">
        <span class="rk-satelliten-titel">${tHtml('kreis.satelliten')}</span>
        <div class="rk-satelliten-liste">${satelliten}</div>
      </div>
    </div>`
}
