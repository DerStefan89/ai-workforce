/**
 * Datei: public/leitstand/views/workflow-abnahme.js
 *
 * Zweck: Anzeige der Abnahme am Ablauf (F44 WS-4b, Vorlage V10 d_abnahme_f35; Abgleich F-725 F13–F18)
 * auf derselben Seite `#/workflows/<id>`. Vier Lagen, abgeleitet allein aus GET …/abnahme (abnahmeLage):
 * - entscheidbar (workflowStatus ABGESCHLOSSEN, keine aktuelle Entscheidung — ANGENOMMEN ist erlaubt):
 *   der Abschnitt „Passt das Ergebnis?“ über der Timeline mit Empfehlung des Code Reviewers, „Vereinbart &
 *   überprüft“ (ak_urteile), Befunden, „Geänderte Dateien“, „Prüfbericht & Nachweise“ (samt F16
 *   „Prüfung wiederholen“) und „Deine Entscheidung“ inline;
 * - vorab (der Server erlaubt eine Aktion, aber nicht ANGENOMMEN — heute bei KLAERUNG_ERFORDERLICH, vor
 *   und nach dem Bau, auch im Sichtungs-Halt): kompakter Block unter der Timeline, nur die erlaubten
 *   Knöpfe; „Ergebnis ablehnen oder Anpassung wünschen“ samt Dateien und Prüfbericht als <details>, wenn
 *   die Ausführung gelaufen ist, sonst „Auftrag ablehnen oder Anpassung wünschen“;
 * - offen (vor dem Bau, Freigabe-Halt, kein erlaubter Status): eine Zeile unter der Timeline;
 * - entschieden: eine kompakte Zeile mit Ergebnis, Begründung und Datum, bei erzeuger 'kern' der
 *   F18-Hinweis „Automatisch angelegt · Iteration n/3“.
 * Dazu die Zeilen „Review-Urteil“ und „Deine Abnahme“ für „Auf einen Blick“.
 *
 * Reine Render-Funktionen: kein fetch, kein DOM, kein Import schreibender api.js-Funktionen; in Node
 * ohne DOM importierbar. Laden, Kennzeichen und alle POSTs bleiben in views/workflows.js.
 *
 * Die Oberfläche entscheidet NICHTS selbst (D5): welche Aktion angeboten wird, folgt der heutigen
 * Anzeige-Regel (ANGENOMMEN nur bei ABGESCHLOSSEN; ABGELEHNT und ANPASSUNG_ANGEFORDERT bei
 * ABGESCHLOSSEN oder KLAERUNG_ERFORDERLICH, F23 WS-2a/2b); der Server prüft dieselbe Regel beim
 * POST. 'veraltet' heißt: die vorhandene Entscheidung bezeugt ein früheres Bau-Ergebnis (F-384) — sie
 * bleibt als Audit-Spur sichtbar, die Abnahme ist wieder offen.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflows.js
 * - public/leitstand/views/workflow-abnahme.test.mjs (node:test)
 *
 * Wichtig:
 * - Serverwerte (begruendung, beleg, befunde, empfehlung, Dateipfade, IDs, Lauf-IDs) bleiben roh und
 *   werden immer escaped; feste Wertemengen (Urteil, Schwere, Ergebnis) erscheinen übersetzt, ein
 *   unbekannter Wert roh.
 * - Keine erfundenen Inhalte („Was sich verbessert hat“ der Vorlage gibt es nicht — der Kopf der
 *   Seite trägt bereits das Ziel des Ablaufs).
 * - IDs und Klassen der Bedienung bleiben: wf-abnahme-begruendung, .wf-abnahme-aktion mit
 *   data-aktion, .wf-pruefung-wiederholen (Klick-Delegation in views/workflows.js, Gate f20-shell).
 */

import { formatiereDatum, t, tHtml } from '../i18n.js'
import { escapeHtml } from '../render.js'

/** Die drei Abnahme-Aktionen in der Reihenfolge der Vorlage (Abnehmen, Anpassung, Ablehnen). */
export const ABNAHME_AKTIONEN = ['ANGENOMMEN', 'ANPASSUNG_ANGEFORDERT', 'ABGELEHNT']

/** Feste Wertemengen mit übersetztem Text (schemas/ergebnis-code-reviewer.schema.json, POST …/abnahme). */
const URTEILE = new Set(['BEREIT', 'BEREIT_NACH_KORREKTUR', 'BLOCKIERT'])
const AK_URTEILE = new Set(['ERFUELLT', 'NICHT_ERFUELLT', 'NICHT_PRUEFBAR'])
const SCHWEREN = new Set(['NIEDRIG', 'MITTEL', 'HOCH'])
const PRUEF_WERTE = new Set(['GRUEN', 'ROT', 'ZEITGRENZE', 'FEHLER'])

/** Nicht-'ok'-Status der Projektionen mit eigenem Text (Inhalt wie bisher, nur übersetzt). */
const URTEIL_STATUS = new Set(['kein_review_schritt', 'noch_nicht_gelaufen', 'laufakte_fehlt', 'nicht_lesbar'])
const PROJEKTION_STATUS = new Set(['kein_ausfuehrungs_schritt', 'noch_nicht_gelaufen', 'nicht_vorhanden'])

/** Statusfarbe (Klasse von .ablauf-status) je Urteil, Schwere und Abnahme-Ergebnis — Anzeige, keine Regel. */
const FARBE_URTEIL = { BEREIT: 'ok', BEREIT_NACH_KORREKTUR: 'warten', BLOCKIERT: 'fehler' }
const FARBE_SCHWERE = { HOCH: 'fehler', MITTEL: 'warten', NIEDRIG: 'neutral' }
const FARBE_ERGEBNIS = { ANGENOMMEN: 'ok', ANPASSUNG_ANGEFORDERT: 'warten', ABGELEHNT: 'fehler' }
/** Notiz-Variante je Urteil (Vorlage .note, .note.amber, .note.red). */
const NOTIZ_URTEIL = { BEREIT: 'note', BEREIT_NACH_KORREKTUR: 'note amber', BLOCKIERT: 'note red' }
/** Symbol je AK-Urteil (Vorlage ✓); der Text daneben trägt die Bedeutung, das Symbol ist aria-hidden. */
const SYMBOL_AK = { ERFUELLT: '✓', NICHT_ERFUELLT: '✗', NICHT_PRUEFBAR: '?' }
const FARBE_AK = { ERFUELLT: 'ok', NICHT_ERFUELLT: 'fehler', NICHT_PRUEFBAR: 'warten' }

/**
 * Übersetzt einen Wert einer festen Wertemenge; ein unbekannter erscheint roh.
 * @param menge - bekannte Werte
 * @param praefix - Schlüsselpräfix
 * @param wert - Serverwert
 * @returns Text
 */
function wertText(menge, praefix, wert) {
  return menge.has(wert) ? t(`${praefix}.${wert}`) : String(wert ?? '')
}

/**
 * Welche Abnahme-Aktionen der workflowStatus zulässt — ANZEIGE-Zwilling der Server-Regel (F23 WS-2a,
 * WS-2b AK21: ANPASSUNG_ANGEFORDERT im selben Statuspaar wie ABGELEHNT).
 * @param workflowStatus - abnahme.workflowStatus
 * @returns { ANGENOMMEN, ANPASSUNG_ANGEFORDERT, ABGELEHNT } als boolean
 */
export function erlaubteAbnahmeAktionen(workflowStatus) {
  const ablehnbar = workflowStatus === 'ABGESCHLOSSEN' || workflowStatus === 'KLAERUNG_ERFORDERLICH'
  return { ANGENOMMEN: workflowStatus === 'ABGESCHLOSSEN', ANPASSUNG_ANGEFORDERT: ablehnbar, ABGELEHNT: ablehnbar }
}

/** Status der Änderungsübersicht, bei denen die Ausführung (noch) nicht gelaufen ist — dann gibt es kein Ergebnis zum Ablehnen. */
const NICHT_GELAUFEN = new Set(['noch_nicht_gelaufen', 'kein_ausfuehrungs_schritt'])

/**
 * Ob die Ausführung gelaufen ist (es ein Ergebnis gibt). Fehlt die Änderungsübersicht ganz, gilt sie als
 * nicht gelaufen.
 * @param abnahme - Antwort von GET …/abnahme
 * @returns true, wenn aenderungsuebersicht.status weder 'noch_nicht_gelaufen' noch 'kein_ausfuehrungs_schritt' ist
 */
export function ausfuehrungGelaufen(abnahme) {
  return !NICHT_GELAUFEN.has(abnahme.aenderungsuebersicht?.status ?? 'noch_nicht_gelaufen')
}

/**
 * Die Lage der Abnahme (Entscheidungen Challenger, F44 WS-4b):
 * - 'entschieden': aktuelle Entscheidung (status 'ok');
 * - 'entscheidbar': workflowStatus ABGESCHLOSSEN ohne aktuelle Entscheidung (ANGENOMMEN ist erlaubt) —
 *   der Abschnitt „Passt das Ergebnis?“ über der Timeline;
 * - 'vorab': der Server erlaubt eine Aktion, aber nicht ANGENOMMEN (heute ABGELEHNT und
 *   ANPASSUNG_ANGEFORDERT bei KLAERUNG_ERFORDERLICH — vor dem Bau, nach dem Bau, im Sichtungs-Halt) —
 *   kompakter Block unter der Timeline;
 * - 'offen': sonst (Freigabe-Halt, kein erlaubter Status) — die Zeile „folgt“.
 * @param abnahme - Antwort von GET …/abnahme
 * @returns 'entschieden' | 'entscheidbar' | 'vorab' | 'offen'
 */
export function abnahmeLage(abnahme) {
  if (abnahme.entscheidung?.status === 'ok') return 'entschieden'
  if ((abnahme.freigabeHalt ?? null) !== null) return 'offen'
  const erlaubt = erlaubteAbnahmeAktionen(abnahme.workflowStatus)
  if (erlaubt.ANGENOMMEN) return 'entscheidbar'
  return Object.values(erlaubt).some(Boolean) ? 'vorab' : 'offen'
}

/**
 * F-656: „Prüfung wiederholen“ nur, solange der Workflow genau wegen dieses Ergebnisses hält
 * (KLAERUNG_ERFORDERLICH und ein Ergebnis ungleich GRUEN) — Regel unverändert; der Server prüft
 * dieselbe Vorbedingung beim POST.
 * @param abnahme - Antwort von GET …/abnahme
 * @returns true, wenn der Knopf angeboten wird
 */
export function pruefungWiederholbar(abnahme) {
  const pruefung = abnahme.pruefergebnis
  return abnahme.workflowStatus === 'KLAERUNG_ERFORDERLICH' && pruefung?.status === 'ok' && pruefung.ergebnis !== 'GRUEN'
}

/** @param wert - PruefergebnisWert (src/pruefschritt/types.ts) @returns übersetzter Text (GRUEN → „GRÜN“), unbekannt roh */
export function pruefWertText(wert) {
  return wertText(PRUEF_WERTE, 'abnahme.pruefung.wert', wert)
}

/** @param wert - ISO-Zeitstempel (Serverwert) @returns HTML, formatiert in der aktuellen Sprache */
function datumHtml(wert) {
  return escapeHtml(formatiereDatum(wert, { dateStyle: 'medium', timeStyle: 'short' }))
}

/** @param ergebnis - entscheidung.ergebnis @returns Text des Ergebnisses (unbekannt: roh) */
function ergebnisText(ergebnis) {
  return wertText(new Set(ABNAHME_AKTIONEN), 'abnahme.ergebnis', ergebnis)
}

/**
 * F18: Hinweis bei einer automatisch angelegten Anpassung — NUR bei erzeuger 'kern' (F35 WS-3).
 * @param entscheidung - abnahme.entscheidung
 * @returns HTML oder ''
 */
export function renderAutomatischHinweis(entscheidung) {
  if (entscheidung?.erzeuger !== 'kern') return ''
  return `<div class="note amber abnahme-automatisch"><strong>${tHtml('abnahme.automatisch', { iteration: String(entscheidung.automatische_iteration ?? '?') })}</strong></div>`
}

/**
 * Eine veraltete Entscheidung als Audit-Spur (F-384): bezieht sich auf ein früheres Bau-Ergebnis.
 * @param entscheidung - abnahme.entscheidung
 * @returns HTML oder ''
 */
function renderFruehereEntscheidung(entscheidung) {
  if (entscheidung?.status !== 'veraltet') return ''
  const text = tHtml('abnahme.frueher', { ergebnis: ergebnisText(entscheidung.ergebnis), begruendung: String(entscheidung.begruendung ?? '') }, { datum: datumHtml(entscheidung.entschiedenAm) })
  return `<p class="subtle abnahme-frueher">${text}</p>${renderAutomatischHinweis(entscheidung)}`
}

/**
 * Die Notiz „Empfehlung des Code Reviewers“ (F13): Urteil und empfehlung; ohne Urteil der Grund.
 * @param urteil - abnahme.urteil
 * @returns HTML
 */
function renderEmpfehlungNotiz(urteil) {
  if (urteil.status !== 'ok') {
    return `<div class="note amber abnahme-empfehlung"><strong>${tHtml('abnahme.empfehlung.titel')}</strong><p>${escapeHtml(wertText(URTEIL_STATUS, 'abnahme.urteil.status', urteil.status))}</p></div>`
  }
  const klasse = NOTIZ_URTEIL[urteil.urteil] ?? 'note'
  const symbol = urteil.urteil === 'BEREIT' ? '<span aria-hidden="true">✓ </span>' : ''
  const empfehlung = urteil.empfehlung ? escapeHtml(urteil.empfehlung) : tHtml('abnahme.empfehlung.keine')
  return `<div class="${klasse} abnahme-empfehlung">
    <strong>${symbol}${tHtml('abnahme.empfehlung.urteil', { urteil: wertText(URTEILE, 'abnahme.urteil.lang', urteil.urteil) })}</strong>
    <p>${empfehlung}</p>
    <p class="abnahme-lauf">${tHtml('abnahme.empfehlung.lauf', {}, { lauf: `<code>${escapeHtml(urteil.laufId ?? '')}</code>` })}</p>
  </div>`
}

/**
 * „Vereinbart & überprüft“ (F14) aus ak_urteile: Urteil als Symbol plus Text, Nachweis = beleg.
 * Ohne ak_urteile (Auftrag ohne Akzeptanzkriterien, Fassung vor F35 WS-2) nichts.
 * @param akUrteile - urteil.ak_urteile oder undefined
 * @returns HTML oder ''
 */
function renderKriterien(akUrteile) {
  if (!Array.isArray(akUrteile) || akUrteile.length === 0) return ''
  const zeilen = akUrteile
    .map(
      (ak) => `<li>
      <span class="abnahme-symbol ${FARBE_AK[ak.urteil] ?? 'neutral'}" aria-hidden="true">${SYMBOL_AK[ak.urteil] ?? '·'}</span>
      <div><strong><code>${escapeHtml(ak.ak_id ?? '')}</code> ${escapeHtml(wertText(AK_URTEILE, 'abnahme.ak', ak.urteil))}</strong>
      <p>${tHtml('abnahme.nachweis', { beleg: String(ak.beleg ?? '') })}</p></div>
    </li>`
    )
    .join('')
  return `<h3>${tHtml('abnahme.kriterien.titel')}</h3><ul class="abnahme-liste">${zeilen}</ul>`
}

/**
 * Die Befunde des Reviews als Liste: Schwere, Fundstelle, Zusammenfassung, Beleg.
 * @param urteil - abnahme.urteil (status 'ok')
 * @returns HTML
 */
function renderBefunde(urteil) {
  const befunde = Array.isArray(urteil.befunde) ? urteil.befunde : []
  const kopf = `<h3>${tHtml('abnahme.befunde.titel')}</h3>`
  if (befunde.length === 0) return `${kopf}<p class="subtle">${tHtml('abnahme.befunde.leer')}</p>`
  const zeilen = befunde
    .map(
      (b) => `<li class="abnahme-befund">
      <p><span class="ablauf-status ${FARBE_SCHWERE[b.schwere] ?? 'neutral'}">${escapeHtml(wertText(SCHWEREN, 'abnahme.schwere', b.schwere))}</span> <code>${escapeHtml(b.fundstelle ?? '')}</code></p>
      <p>${escapeHtml(b.zusammenfassung ?? '')}</p>
      <p class="subtle">${tHtml('abnahme.befunde.beleg', { beleg: String(b.beleg ?? '') })}</p>
    </li>`
    )
    .join('')
  return `${kopf}<ul class="abnahme-liste abnahme-befunde">${zeilen}</ul>`
}

/**
 * Die Änderungsübersicht (heutige Tabelle) für „Geänderte Dateien“.
 * @param projektion - abnahme.aenderungsuebersicht
 * @returns HTML
 */
export function renderAenderungsuebersicht(projektion) {
  if (projektion.status !== 'ok') return `<p class="subtle">${escapeHtml(wertText(PROJEKTION_STATUS, 'abnahme.dateien.status', projektion.status))}</p>`
  const daten = projektion.daten ?? {}
  const dateien = Array.isArray(daten.dateien) ? daten.dateien : []
  const gekuerzt = daten.gekuerzt ? ` <span class="ablauf-status fehler">${tHtml('abnahme.dateien.gekuerzt')}</span>` : ''
  const kopf = `<p class="subtle">${tHtml('abnahme.dateien.kopf', {}, { lauf: `<code>${escapeHtml(projektion.laufId ?? '')}</code>`, basis: `<code>${escapeHtml(daten.basis_ref ?? t('abnahme.unbekannt'))}</code>` })}${gekuerzt}</p>`
  if (dateien.length === 0) return `${kopf}<p class="subtle">${tHtml('abnahme.dateien.leer')}</p>`
  const zeilen = dateien
    .map((d) => `<tr><td>${escapeHtml(d.status)}</td><td><code>${escapeHtml(d.pfad)}</code></td><td>${d.plus === null ? '—' : `+${escapeHtml(String(d.plus))}`}</td><td>${d.minus === null ? '—' : `-${escapeHtml(String(d.minus))}`}</td></tr>`)
    .join('')
  return `${kopf}<div class="ablauf-tabelle"><table class="lauf-kopfdaten abnahme-dateien"><thead><tr><th>${tHtml('abnahme.dateien.spalte.status')}</th><th>${tHtml('abnahme.dateien.spalte.datei')}</th><th>+</th><th>-</th></tr></thead><tbody>${zeilen}</tbody></table></div>`
}

/**
 * Das Prüfergebnis (F15, F-652) samt F16 „Prüfung wiederholen“ (F-656) — eine knappe Zeile
 * (Ergebnis + Exit-Code + Lauf), kein zweiter Ausgabetext.
 * @param workflowId - Kennung des Workflows
 * @param abnahme - Antwort von GET …/abnahme
 * @returns HTML
 */
export function renderPruefergebnis(workflowId, abnahme) {
  const projektion = abnahme.pruefergebnis
  if (projektion?.status !== 'ok') return `<p class="subtle">${escapeHtml(wertText(PROJEKTION_STATUS, 'abnahme.pruefung.status', projektion?.status))}</p>`
  const farbe = projektion.ergebnis === 'GRUEN' ? 'ok' : 'fehler'
  const exit = projektion.exitCode === null || projektion.exitCode === undefined ? t('abnahme.unbekannt') : String(projektion.exitCode)
  const knopf = pruefungWiederholbar(abnahme) ? ` <button type="button" class="button wf-pruefung-wiederholen" data-workflow-id="${escapeHtml(workflowId)}">${tHtml('abnahme.pruefung.wiederholen')}</button>` : ''
  const ergebnis = `<span class="ablauf-status ${farbe}">${escapeHtml(wertText(PRUEF_WERTE, 'abnahme.pruefung.wert', projektion.ergebnis))}</span>`
  return `<p class="abnahme-pruefung">${tHtml('abnahme.pruefung.zeile', { exit }, { ergebnis, lauf: `<code>${escapeHtml(projektion.laufId ?? '')}</code>` })}${knopf}</p>`
}

/**
 * „Deine Entscheidung“ inline (F17): Pflichtbegründung und die drei Knöpfe; nicht erlaubte Aktionen
 * stehen disabled, mit Hinweis, warum „Ergebnis abnehmen“ (noch) nicht geht.
 * @param workflowId - Kennung des Workflows
 * @param workflowStatus - abnahme.workflowStatus
 * @returns HTML
 */
function renderEntscheidung(workflowId, workflowStatus) {
  const erlaubt = erlaubteAbnahmeAktionen(workflowStatus)
  const kennung = escapeHtml(workflowId)
  const stil = { ANGENOMMEN: 'button primary', ANPASSUNG_ANGEFORDERT: 'button', ABGELEHNT: 'button danger' }
  const knoepfe = ABNAHME_AKTIONEN.map(
    (aktion) => `<button type="button" class="${stil[aktion]} wf-abnahme-aktion" data-aktion="${aktion}" data-workflow-id="${kennung}"${erlaubt[aktion] ? '' : ' disabled'}>${tHtml(`abnahme.aktion.${aktion}`)}</button>`
  ).join('')
  return `<h3>${tHtml('abnahme.entscheidung.titel')}</h3>
    <p class="subtle">${tHtml('abnahme.entscheidung.text')}</p>
    <label class="field" for="wf-abnahme-begruendung">${tHtml('abnahme.entscheidung.begruendung')}</label>
    <textarea id="wf-abnahme-begruendung" rows="3" aria-required="true" aria-describedby="workflow-abnahme-meldung"></textarea>
    <div class="action-row">${knoepfe}</div>`
}

/**
 * „Geänderte Dateien · n Dateien“ und „Prüfbericht & Nachweise“ als <details> — im Abschnitt „Passt das
 * Ergebnis?“ und im Block „Ergebnis ablehnen …“; bei wiederholbarer Prüfung ist der Prüfbericht offen.
 * @param workflowId - Kennung des Workflows
 * @param abnahme - Antwort von GET …/abnahme
 * @returns HTML
 */
function renderErgebnisDetails(workflowId, abnahme) {
  const aenderung = abnahme.aenderungsuebersicht ?? { status: 'noch_nicht_gelaufen' }
  const dateien = aenderung.status === 'ok' ? tHtml('abnahme.dateien.titelAnzahl', { anzahl: Array.isArray(aenderung.daten?.dateien) ? aenderung.daten.dateien.length : 0 }) : tHtml('abnahme.dateien.titel')
  return `<details class="abnahme-details"><summary>${dateien}</summary>${renderAenderungsuebersicht(aenderung)}</details>
    <details class="abnahme-details"${pruefungWiederholbar(abnahme) ? ' open' : ''}><summary>${tHtml('abnahme.pruefbericht')}</summary>${renderPruefergebnis(workflowId, abnahme)}</details>`
}

/**
 * Der Abschnitt „Passt das Ergebnis?“ (Lage 'entscheidbar').
 * @param workflowId - Kennung des Workflows
 * @param abnahme - Antwort von GET …/abnahme
 * @returns HTML
 */
function renderAbnahmeAbschnitt(workflowId, abnahme) {
  const urteil = abnahme.urteil ?? { status: 'noch_nicht_gelaufen' }
  const urteilTeil = urteil.status === 'ok' ? `${renderKriterien(urteil.ak_urteile)}${renderBefunde(urteil)}` : ''
  return `<section class="abnahme-abschnitt" aria-labelledby="abnahme-titel">
    <div class="abnahme-kopf">
      <div><div class="eyebrow">${tHtml('abnahme.eyebrow')}</div><h2 id="abnahme-titel">${tHtml('abnahme.titel')}</h2></div>
      <span class="ablauf-status warten">${tHtml('abnahme.fehlt')}</span>
    </div>
    ${renderFruehereEntscheidung(abnahme.entscheidung)}
    ${renderEmpfehlungNotiz(urteil)}
    ${urteilTeil}
    ${renderErgebnisDetails(workflowId, abnahme)}
    ${renderEntscheidung(workflowId, abnahme.workflowStatus)}
  </section>`
}

/**
 * Die kompakte Zeile einer aktuellen Entscheidung (Lage 'entschieden', F17/F18).
 * @param entscheidung - abnahme.entscheidung (status 'ok')
 * @returns HTML
 */
function renderEntschieden(entscheidung) {
  const ergebnis = `<span class="ablauf-status ${FARBE_ERGEBNIS[entscheidung.ergebnis] ?? 'neutral'}">${escapeHtml(ergebnisText(entscheidung.ergebnis))}</span>`
  return `<div class="abnahme-stand">
    <p>${tHtml('abnahme.entschieden', { begruendung: String(entscheidung.begruendung ?? '') }, { ergebnis, datum: datumHtml(entscheidung.entschiedenAm) })}</p>
    ${renderAutomatischHinweis(entscheidung)}
  </div>`
}

/**
 * Der kompakte Block der Lage 'vorab' (unter der Timeline): „Ergebnis ablehnen oder Anpassung wünschen“,
 * wenn die Ausführung gelaufen ist — dann mit „Geänderte Dateien“ und „Prüfbericht & Nachweise“ als
 * <details> (bei wiederholbarer Prüfung aufgeklappt) —, sonst „Auftrag ablehnen oder Anpassung
 * wünschen“ ohne Ergebnis-Abschnitte. Dasselbe Pflichtfeld wf-abnahme-begruendung, nur die erlaubten Knöpfe.
 * @param workflowId - Kennung des Workflows
 * @param abnahme - Antwort von GET …/abnahme
 * @returns HTML
 */
function renderVorab(workflowId, abnahme) {
  const gelaufen = ausfuehrungGelaufen(abnahme)
  const ergebnis = gelaufen ? renderErgebnisDetails(workflowId, abnahme) : ''
  const erlaubt = erlaubteAbnahmeAktionen(abnahme.workflowStatus)
  const stil = { ANGENOMMEN: 'button primary', ANPASSUNG_ANGEFORDERT: 'button', ABGELEHNT: 'button danger' }
  const knoepfe = ABNAHME_AKTIONEN.filter((aktion) => erlaubt[aktion])
    .map((aktion) => `<button type="button" class="${stil[aktion]} wf-abnahme-aktion" data-aktion="${aktion}" data-workflow-id="${escapeHtml(workflowId)}">${tHtml(`abnahme.aktion.${aktion}`)}</button>`)
    .join('')
  return `<section class="abnahme-stand abnahme-vorab" aria-labelledby="abnahme-vorab-titel">
    <h3 id="abnahme-vorab-titel">${gelaufen ? tHtml('abnahme.vorab.titelErgebnis') : tHtml('abnahme.vorab.titel')}</h3>
    <p class="subtle">${gelaufen ? tHtml('abnahme.vorab.textErgebnis') : tHtml('abnahme.vorab.text')}</p>
    ${renderFruehereEntscheidung(abnahme.entscheidung)}
    ${ergebnis}
    <label class="field" for="wf-abnahme-begruendung">${tHtml('abnahme.entscheidung.begruendung')}</label>
    <textarea id="wf-abnahme-begruendung" rows="3" aria-required="true" aria-describedby="workflow-abnahme-meldung"></textarea>
    <div class="action-row">${knoepfe}</div>
  </section>`
}

/**
 * Die Abnahme für die Seite, aufgeteilt auf zwei Orte: `oben` (über der Timeline, nur der
 * entscheidbare Abschnitt) und `unten` (unter den Aktionen: der Block „vorab“, die Zeile „folgt“ bzw.
 * die Entscheidung). Ist die Prüfung wiederholbar, steht die Prüfzeile mit ihrem Knopf auch außerhalb
 * des Abschnitts.
 * @param workflowId - Kennung des Workflows
 * @param abnahme - Antwort von GET …/abnahme
 * @returns { lage, oben, unten } (HTML)
 */
export function renderAbnahme(workflowId, abnahme) {
  const lage = abnahmeLage(abnahme)
  if (lage === 'entscheidbar') return { lage, oben: renderAbnahmeAbschnitt(workflowId, abnahme), unten: '' }
  const pruefung = pruefungWiederholbar(abnahme) ? renderPruefergebnis(workflowId, abnahme) : ''
  // Nach dem Bau trägt der Block den Prüfbericht selbst (samt „Prüfung wiederholen“), vor dem Bau gibt es keinen.
  if (lage === 'vorab') return { lage, oben: '', unten: `${renderVorab(workflowId, abnahme)}${ausfuehrungGelaufen(abnahme) ? '' : pruefung}` }
  if (lage === 'entschieden') return { lage, oben: '', unten: `${renderEntschieden(abnahme.entscheidung)}${pruefung}` }
  return { lage, oben: '', unten: `<div class="abnahme-stand"><p class="subtle">${tHtml('abnahme.folgt')}</p>${renderFruehereEntscheidung(abnahme.entscheidung)}${pruefung}</div>` }
}

/**
 * Die Zeilen „Review-Urteil“ (sobald ein Urteil vorliegt) und „Deine Abnahme“ (offen oder Ergebnis)
 * für „Auf einen Blick“, dazu der Hinweis der Vorlage. Ohne Abnahme-Daten nichts.
 * @param abnahme - Antwort von GET …/abnahme, oder null
 * @returns HTML oder ''
 */
export function renderAbnahmeBlick(abnahme) {
  if (abnahme === null || abnahme === undefined) return ''
  const urteil = abnahme.urteil
  const urteilZeile =
    urteil?.status === 'ok'
      ? `<dt>${tHtml('abnahme.blick.urteil')}</dt><dd><span class="ablauf-status ${FARBE_URTEIL[urteil.urteil] ?? 'neutral'}">${escapeHtml(wertText(URTEILE, 'abnahme.urteil.kurz', urteil.urteil))}</span></dd>`
      : ''
  const entscheidung = abnahme.entscheidung
  const abnahmeText = entscheidung?.status === 'ok' ? escapeHtml(ergebnisText(entscheidung.ergebnis)) : tHtml('abnahme.blick.offen')
  return `<dl class="abnahme-blick">${urteilZeile}<dt>${tHtml('abnahme.blick.abnahme')}</dt><dd>${abnahmeText}</dd></dl>
    <div class="note abnahme-blick-hinweis"><p>${tHtml('abnahme.blick.hinweis')}</p></div>`
}
