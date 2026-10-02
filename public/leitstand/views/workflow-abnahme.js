/**
 * Datei: public/leitstand/views/workflow-abnahme.js
 *
 * Zweck: Anzeige der Abnahme am Ablauf (F44 WS-4b, Vorlage V10 d_abnahme_f35; Abgleich F-725 F13–F18)
 * auf derselben Seite `#/workflows/<id>`. Vier Lagen, abgeleitet allein aus GET …/abnahme (abnahmeLage):
 * - entscheidbar (workflowStatus ABGESCHLOSSEN, keine aktuelle Entscheidung — ANGENOMMEN ist erlaubt):
 *   seit F46 D2 die Seite Entscheiden nach 09-entscheidungen--Entscheiden-Abnahme (abgleich-f46.md
 *   §4.5): Hauptspalte mit „Abnahmekriterien“ (ak_urteile, „x erfüllt · y nicht erfüllt“), den
 *   Kacheln Prüfung · Review (Codex) · Nachweise, „Selbst ausprobieren“ (vorschau_url, F43) und
 *   „Nachweise im Einzelnen“ (Befunde, „Geänderte Dateien“, „Prüfbericht & Nachweise“ samt F16
 *   „Prüfung wiederholen“); dazu die Spalte „Deine Entscheidung“ (entscheidung-panel.js);
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
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { escapeHtml } from '../render.js'
import { renderEntscheidungsPanel } from './entscheidung-panel.js'

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
 * Zahlen der AK-Urteile für die Zusammenfassung „x erfüllt · y nicht erfüllt“ (F46 D2).
 * @param akUrteile - urteil.ak_urteile oder undefined
 * @returns { gesamt, erfuellt, nichtErfuellt, nichtPruefbar, nichtErfuellteIds }
 */
export function zaehleAkUrteile(akUrteile) {
  const liste = Array.isArray(akUrteile) ? akUrteile : []
  const nichtErfuellt = liste.filter((ak) => ak.urteil === 'NICHT_ERFUELLT')
  return {
    gesamt: liste.length,
    erfuellt: liste.filter((ak) => ak.urteil === 'ERFUELLT').length,
    nichtErfuellt: nichtErfuellt.length,
    nichtPruefbar: liste.filter((ak) => ak.urteil === 'NICHT_PRUEFBAR').length,
    nichtErfuellteIds: nichtErfuellt.map((ak) => String(ak.ak_id ?? '')),
  }
}

/**
 * Einleitung unter „Passt das Ergebnis?“ — nur aus vorhandenen Daten (Regel 8): mit Review-Urteil
 * je AK die Zahl der erfüllten, sonst der Satz ohne Zahlen.
 * @param abnahme - Antwort von GET …/abnahme
 * @returns Text
 */
export function abnahmeEinleitung(abnahme) {
  const z = zaehleAkUrteile(abnahme?.urteil?.status === 'ok' ? abnahme.urteil.ak_urteile : undefined)
  if (z.gesamt === 0) return t('entscheiden.abnahme.einleitung.ohneAk')
  if (z.nichtErfuellt === 0 && z.nichtPruefbar === 0) return t('entscheiden.abnahme.einleitung.alle', { anzahl: z.gesamt, zahl: String(z.gesamt) })
  return t('entscheiden.abnahme.einleitung.teil', { erfuellt: String(z.erfuellt), gesamt: String(z.gesamt) })
}

/**
 * „Abnahmekriterien“ (09-Entscheiden-Abnahme): Zusammenfassung und je AK Kennung, Beleg und Urteil.
 * Das Review liefert je AK Kennung, Urteil und Beleg (ak_urteile); den Wortlaut des Kriteriums trägt
 * es nicht, der Beleg steht deshalb an seiner Stelle.
 * @param urteil - abnahme.urteil
 * @returns HTML
 */
function renderAkAbschnitt(urteil) {
  const kopf = `<h2 id="abnahme-kriterien-titel">${tHtml('entscheiden.abnahme.kriterien')}</h2>`
  if (urteil.status !== 'ok') return `<section class="entscheiden-karte" aria-labelledby="abnahme-kriterien-titel">${kopf}<p class="subtle">${escapeHtml(wertText(URTEIL_STATUS, 'abnahme.urteil.status', urteil.status))}</p></section>`
  const liste = Array.isArray(urteil.ak_urteile) ? urteil.ak_urteile : []
  if (liste.length === 0) return `<section class="entscheiden-karte" aria-labelledby="abnahme-kriterien-titel">${kopf}<p class="subtle">${tHtml('entscheiden.abnahme.keineKriterien')}</p></section>`
  const z = zaehleAkUrteile(liste)
  const teile = [tHtml('entscheiden.abnahme.zahl.erfuellt', { zahl: String(z.erfuellt) }), tHtml('entscheiden.abnahme.zahl.nichtErfuellt', { zahl: String(z.nichtErfuellt) })]
  if (z.nichtPruefbar > 0) teile.push(tHtml('entscheiden.abnahme.zahl.nichtPruefbar', { zahl: String(z.nichtPruefbar) }))
  teile.push(tHtml('entscheiden.abnahme.letztesWort'))
  const zeilen = liste
    .map(
      (ak) => `<li class="ak-zeile">
        <code class="ak-id">${escapeHtml(ak.ak_id ?? '')}</code>
        <span class="ak-beleg">${escapeHtml(ak.beleg ?? '')}</span>
        <span class="ak-urteil ak-urteil-${FARBE_AK[ak.urteil] ?? 'neutral'}"><span aria-hidden="true">${SYMBOL_AK[ak.urteil] ?? '·'} </span>${escapeHtml(wertText(AK_URTEILE, 'abnahme.ak', ak.urteil))}</span>
      </li>`
    )
    .join('')
  return `<section class="entscheiden-karte" aria-labelledby="abnahme-kriterien-titel">
    <div class="entscheiden-karte-kopf">${kopf}<span class="subtle">${teile.join(' · ')}</span></div>
    <ul class="ak-liste">${zeilen}</ul>
  </section>`
}

/**
 * Kachel „Prüfung“: Ergebnis, Exit-Code und Lauf, „Prüfung wiederholen“ nur nach der heutigen Regel.
 * @param workflowId - Kennung des Workflows
 * @param abnahme - Antwort von GET …/abnahme
 * @returns HTML
 */
function renderPruefungKachel(workflowId, abnahme) {
  const projektion = abnahme.pruefergebnis
  let inhalt
  if (projektion?.status !== 'ok') inhalt = `<p class="subtle">${escapeHtml(wertText(PROJEKTION_STATUS, 'abnahme.pruefung.status', projektion?.status))}</p>`
  else {
    const exit = projektion.exitCode === null || projektion.exitCode === undefined ? t('abnahme.unbekannt') : String(projektion.exitCode)
    inhalt = `<strong class="entscheiden-wert entscheiden-wert-${projektion.ergebnis === 'GRUEN' ? 'ok' : 'fehler'}">${escapeHtml(pruefWertText(projektion.ergebnis))}</strong>
      <p class="subtle">${tHtml('entscheiden.abnahme.exit', { exit })} · <code>${escapeHtml(projektion.laufId ?? '')}</code></p>`
  }
  const knopf = pruefungWiederholbar(abnahme) ? `<button type="button" class="button wf-pruefung-wiederholen" data-workflow-id="${escapeHtml(workflowId)}">${tHtml('abnahme.pruefung.wiederholen')}</button>` : ''
  return `<div class="entscheiden-kachel"><span class="eyebrow">${tHtml('entscheiden.abnahme.pruefung')}</span>${inhalt}${knopf}</div>`
}

/**
 * Kachel „Review“: das Urteil des Reviews (Codex) mit Empfehlung; Urteile je Claude-Prüfer „kommt“.
 * @param urteil - abnahme.urteil
 * @returns HTML
 */
function renderReviewKachel(urteil) {
  const inhalt =
    urteil.status === 'ok'
      ? `<p><span class="ablauf-status ${FARBE_URTEIL[urteil.urteil] ?? 'neutral'}">${escapeHtml(wertText(URTEILE, 'abnahme.urteil.kurz', urteil.urteil))}</span> <span class="subtle">${tHtml('entscheiden.abnahme.reviewWer')}</span></p>
        <p class="entscheiden-review-text">${urteil.empfehlung ? escapeHtml(urteil.empfehlung) : tHtml('abnahme.empfehlung.keine')}</p>
        <p class="subtle">${tHtml('abnahme.empfehlung.lauf', {}, { lauf: `<code>${escapeHtml(urteil.laufId ?? '')}</code>` })}</p>`
      : `<p class="subtle">${escapeHtml(wertText(URTEIL_STATUS, 'abnahme.urteil.status', urteil.status))}</p>`
  return `<div class="entscheiden-kachel"><span class="eyebrow">${tHtml('entscheiden.abnahme.review')}</span>${inhalt}
    <p class="subtle entscheiden-kommt" aria-disabled="true">${tHtml('entscheiden.abnahme.claudePruefer')} ${kommtBadge()}</p></div>`
}

/**
 * Kachel „Nachweise“: geänderte Dateien und Befunde in Zahlen, „Alle Nachweise“ springt zum
 * Abschnitt darunter (Kacheln Desktop/Mobil/Hell nur, wenn Dateien vorlägen — heute keine Quelle).
 * @param abnahme - Antwort von GET …/abnahme
 * @returns HTML
 */
function renderNachweiseKachel(abnahme) {
  const aenderung = abnahme.aenderungsuebersicht ?? { status: 'noch_nicht_gelaufen' }
  const dateien =
    aenderung.status === 'ok'
      ? tHtml('entscheiden.abnahme.dateien', { anzahl: Array.isArray(aenderung.daten?.dateien) ? aenderung.daten.dateien.length : 0 })
      : escapeHtml(wertText(PROJEKTION_STATUS, 'abnahme.dateien.status', aenderung.status))
  const befunde = abnahme.urteil?.status === 'ok' && Array.isArray(abnahme.urteil.befunde) ? `<p>${tHtml('entscheiden.abnahme.befunde', { anzahl: abnahme.urteil.befunde.length })}</p>` : ''
  return `<div class="entscheiden-kachel"><span class="eyebrow">${tHtml('entscheiden.abnahme.nachweise')}</span>
    <p>${dateien}</p>${befunde}
    <button type="button" class="text-link-knopf abnahme-nachweise-zeigen" aria-controls="abnahme-nachweise">${tHtml('entscheiden.abnahme.alleNachweise')}</button></div>`
}

/**
 * „Selbst ausprobieren“: Satz aus den nicht erfüllten AKs (sonst allgemein), „Produkt öffnen“ über
 * die vorschau_url des Projekts (F43, GET /api/projekte/<id>/projekt-aufruf) und „Änderungen im
 * Code-Reiter“ („kommt“ bis D4).
 * @param urteil - abnahme.urteil
 * @param vorschau - null (lädt), { fehler: true } oder VorschauStatus { url, erreichbar, grund }
 * @returns HTML
 */
function renderSelbstAusprobieren(urteil, vorschau) {
  const ids = zaehleAkUrteile(urteil?.status === 'ok' ? urteil.ak_urteile : undefined).nichtErfuellteIds
  const satz = ids.length > 0 ? tHtml('entscheiden.abnahme.selbst.ak', {}, { ids: ids.map((id) => `<code>${escapeHtml(id)}</code>`).join(', ') }) : tHtml('entscheiden.abnahme.selbst.text')
  let produkt
  if (vorschau === null || vorschau === undefined) produkt = `<p class="subtle">${tHtml('entscheiden.abnahme.vorschau.laedt')}</p>`
  else if (vorschau.fehler === true) produkt = `<p class="subtle">${tHtml('entscheiden.abnahme.vorschau.fehler')}</p>`
  else if (typeof vorschau.url !== 'string') produkt = `<p class="subtle">${tHtml('entscheiden.abnahme.vorschau.keine')}</p>`
  else if (vorschau.erreichbar === null) produkt = `<p class="subtle">${tHtml('entscheiden.abnahme.vorschau.gesperrt', { grund: String(vorschau.grund ?? '') })}</p>`
  else {
    const hinweis = vorschau.erreichbar === false ? ` <span class="subtle">${tHtml('entscheiden.abnahme.vorschau.nichtErreichbar')}</span>` : ''
    produkt = `<a class="button" href="${escapeHtml(vorschau.url)}" target="_blank" rel="noopener noreferrer">${tHtml('entscheiden.abnahme.produktOeffnen')}<span class="sr-only"> ${tHtml('entscheiden.abnahme.neuerTab')}</span></a>${hinweis}`
  }
  return `<section class="entscheiden-karte" aria-labelledby="abnahme-selbst-titel">
    <h2 id="abnahme-selbst-titel">${tHtml('entscheiden.abnahme.selbst.titel')}</h2>
    <p class="subtle">${satz}</p>
    <div class="action-row">${produkt}${kommtKnopf(t('entscheiden.abnahme.codeReiter'))}</div>
  </section>`
}

/**
 * Hauptspalte der Abnahme (Lage 'entscheidbar', 09-Entscheiden-Abnahme): oben eine veraltete frühere
 * Entscheidung als Audit-Spur (samt F18-Hinweis), Abnahmekriterien, die Kacheln Prüfung · Review ·
 * Nachweise (die Review-Empfehlung dort gekürzt), „Selbst ausprobieren“ und darunter „Nachweise im
 * Einzelnen“ (Empfehlung des Reviews im Volltext, Befunde offen, geänderte Dateien und Prüfbericht
 * aufklappbar) — nichts von heute fällt weg.
 * @param workflowId - Kennung des Workflows
 * @param abnahme - Antwort von GET …/abnahme
 * @param vorschau - siehe renderSelbstAusprobieren
 * @returns HTML
 */
export function renderAbnahmeSeite(workflowId, abnahme, vorschau = null) {
  const urteil = abnahme.urteil ?? { status: 'noch_nicht_gelaufen' }
  // Eine veraltete frühere Entscheidung steht oben (qa 15) — sie erklärt, warum die Abnahme wieder offen ist.
  return `<div class="entscheiden-inhalt">
    ${renderFruehereEntscheidung(abnahme.entscheidung)}
    ${renderAkAbschnitt(urteil)}
    <section class="entscheiden-kacheln" aria-label="${tHtml('entscheiden.abnahme.kachelnLabel')}">
      ${renderPruefungKachel(workflowId, abnahme)}${renderReviewKachel(urteil)}${renderNachweiseKachel(abnahme)}
    </section>
    ${renderSelbstAusprobieren(urteil, vorschau)}
    <section id="abnahme-nachweise" class="entscheiden-karte" aria-labelledby="abnahme-nachweise-titel">
      <h2 id="abnahme-nachweise-titel" tabindex="-1">${tHtml('entscheiden.abnahme.nachweiseTitel')}</h2>
      ${urteil.status === 'ok' ? `<h3>${tHtml('entscheiden.abnahme.empfehlungVoll')}</h3><p class="entscheiden-empfehlung-voll">${urteil.empfehlung ? escapeHtml(urteil.empfehlung) : tHtml('abnahme.empfehlung.keine')}</p>${renderBefunde(urteil)}` : ''}
      ${renderErgebnisDetails(workflowId, abnahme)}
    </section>
  </div>`
}

/**
 * Spalte „Deine Entscheidung“ der Abnahme: Annehmen · Anpassung anfordern · Ablehnen (nicht erlaubte
 * gesperrt, erlaubteAbnahmeAktionen), Pflichtbegründung wf-abnahme-begruendung, Knopf .wf-abnahme-aktion
 * (data-aktion setzt views/workflows.js nach der Wahl).
 * @param workflowId - Kennung des Workflows
 * @param abnahme - Antwort von GET …/abnahme
 * @returns HTML
 */
export function renderAbnahmePanel(workflowId, abnahme) {
  const erlaubt = erlaubteAbnahmeAktionen(abnahme.workflowStatus)
  return renderEntscheidungsPanel({
    art: 'abnahme',
    frageHtml: tHtml('entscheiden.abnahme.frage'),
    name: 'wf-abnahme-option',
    optionen: ABNAHME_AKTIONEN.map((aktion) => ({
      wert: aktion,
      titel: t(`entscheiden.abnahme.option.${aktion}`),
      info: t(`entscheiden.abnahme.info.${aktion}`),
      erlaubt: erlaubt[aktion],
      bestaetigen: t(`entscheiden.abnahme.bestaetigen.${aktion}`),
    })),
    feldId: 'wf-abnahme-begruendung',
    knopfKlasse: 'wf-abnahme-aktion',
    knopfDaten: { 'workflow-id': workflowId, aktion: '' },
  })
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
 * Die Abnahme für die Seite, aufgeteilt auf bis zu drei Orte: `oben` (Hauptspalte der Seite
 * Entscheiden, nur Lage „entscheidbar“, F46 D2), `spalte` (die Spalte „Deine Entscheidung“, nur
 * „entscheidbar“) und `unten` (unter den Aktionen: der Block „vorab“, die Zeile „folgt“ bzw. die
 * Entscheidung). Ist die Prüfung wiederholbar, steht die Prüfzeile mit ihrem Knopf auch außerhalb
 * des Abschnitts.
 * @param workflowId - Kennung des Workflows
 * @param abnahme - Antwort von GET …/abnahme
 * @param vorschau - Vorschau des Projekts für „Produkt öffnen“ (siehe renderSelbstAusprobieren), null solange sie lädt
 * @returns { lage, oben, unten, spalte? } (HTML)
 */
export function renderAbnahme(workflowId, abnahme, vorschau = null) {
  const lage = abnahmeLage(abnahme)
  if (lage === 'entscheidbar') return { lage, oben: renderAbnahmeSeite(workflowId, abnahme, vorschau), unten: '', spalte: renderAbnahmePanel(workflowId, abnahme) }
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
