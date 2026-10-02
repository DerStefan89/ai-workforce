/**
 * Datei: public/leitstand/views/live-anzeige.js
 *
 * Zweck: Render der Live-Ansicht (F46 D5, docs/design/abgleich-f46.md §4.9; Bilder 08-live--Main und
 * 08-live--Main-nichts-laeuft): Kopf mit Chips und „Gerade“, Status-Block, Ablaufleiste, Aktivität mit
 * Filtern, „Mehr dazu“ mit „Frag Jarvis dazu“, Berührte Dateien, Bremsen & Warnungen, Fähigkeiten,
 * Output bisher, „Was der Builder bekommen hat“ und der Zustand „Die Workforce wartet“ (Zuletzt, Als
 * Nächstes). Ein beendeter Lauf ist dieselbe Seite im Zustand „beendet“.
 *
 * Reine Render-Funktionen: Sie bekommen Daten und liefern HTML — kein fetch, kein DOM, kein Timer.
 * Laden und Bedienung liegen in views/live.js und views/runs.js.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/live.js
 * - public/leitstand/views/live-anzeige.test.mjs (node:test)
 *
 * Wichtig:
 * - Werkzeugnamen, Ziele, Pfade, Titel und Servertexte sind Fremddaten: immer escaped, nie übersetzt.
 * - Was keine Quelle hat, ist „kommt“ (kommt.js) mit Ziel (Fixpaket B1, B2, B5), nie ein Beispielwert.
 * - Die Aktivitätsliste ist KEINE Live-Region (einzige Live-Region bleibt die Persona).
 * - Farben nur über Klassen; die Töne je Art stehen in style.css über Tokens.
 */

import { statusBlockHtml } from '../eintrag-bausteine.js'
import { formatiereDatum, t, tHtml } from '../i18n.js'
import { baueVsCodeLink } from '../kopf-werkzeuge.js'
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { AKTIVITAET_FILTER, eintragSchluessel, filtereAktivitaet, KOMMT_FILTER, minutenSeit, outputSchritte } from '../live-daten.js'
import { escapeHtml } from '../render.js'
import { rollenName, workerName } from '../rollen-anzeige.js'

/** Arten eines Aufrufs mit eigenem Verb (i18n live.art.*); eine andere erscheint als 'sonstiges'. */
const ARTEN = new Set(['aendert', 'befehl', 'liest', 'faehigkeit', 'sonstiges'])

/**
 * Relative Zeit „jetzt“ / „n min“ / „n h“.
 * @param iso - ISO-Zeitstempel
 * @param jetztMs - Date.now()
 * @returns Text
 */
export function relativeZeit(iso, jetztMs) {
  const minuten = minutenSeit(iso, jetztMs)
  if (minuten === null) return '—'
  if (minuten < 1) return t('live.zeit.jetzt')
  if (minuten < 60) return t('live.zeit.minuten', { n: minuten })
  return t('live.zeit.stunden', { n: Math.floor(minuten / 60) })
}

/**
 * Dauer in Minuten als Text.
 * @param minuten - Zahl oder null
 * @returns Text ('—' ohne Wert)
 */
function dauerText(minuten) {
  if (typeof minuten !== 'number') return '—'
  return minuten < 60 ? t('live.zeit.minuten', { n: minuten }) : t('live.zeit.stundenMinuten', { h: Math.floor(minuten / 60), m: minuten % 60 })
}

/** @param art - Art eines Aufrufs @returns Art mit eigenem Verb */
function artVon(art) {
  return ARTEN.has(art) ? art : 'sonstiges'
}

/**
 * Art-Chip eines Aufrufs (Verb über i18n, Ton über data-art in style.css).
 * @param art - Art
 * @returns HTML
 */
export function artChipHtml(art) {
  const a = artVon(art)
  return `<span class="live-art" data-art="${a}">${tHtml(`live.art.${a}`)}</span>`
}

/**
 * Ziel eines Aufrufs als code, ohne Ziel der Werkzeugname.
 * @param eintrag - Aktivitätseintrag
 * @returns HTML
 */
function zielHtml(eintrag) {
  const ziel = typeof eintrag?.ziel === 'string' && eintrag.ziel !== '' ? eintrag.ziel : null
  return ziel === null ? `<code class="live-ziel">${escapeHtml(eintrag?.werkzeug ?? '')}</code>` : `<code class="live-ziel">${escapeHtml(ziel)}</code>`
}

/** Ein Chip im Kopf. @param html - Inhalt (escaped) @param klasse - Zusatzklasse @returns HTML */
function kopfChip(html, klasse = '') {
  return `<span class="live-kopf-chip${klasse ? ` ${klasse}` : ''}">${html}</span>`
}

// ─── Kopf ───────────────────────────────────────────────────────────────────

/**
 * Chips des Kopfs: Rolle · Worker, Modell, Werkzeugsatz, „Zum Eintrag“.
 * @param kontext - { detail, schritt, eintragHash }
 * @returns HTML ('' ohne Angaben)
 */
export function renderKopfChips({ detail, schritt = null, eintragHash = null }) {
  const chips = []
  const rolle = schritt?.rolle ?? (detail?.kontextpaket?.status === 'ok' ? detail.kontextpaket.rolle : null)
  const worker = schritt?.worker ?? (detail?.laufakte?.status === 'ok' ? detail.laufakte.worker : null)
  const teile = [rolle ? rollenName(rolle) : null, worker ? workerName(worker) : null].filter((x) => x !== null)
  if (teile.length > 0) chips.push(kopfChip(escapeHtml(teile.join(' · '))))
  const modell = typeof schritt?.modell === 'string' && schritt.modell !== '' ? schritt.modell : null
  chips.push(kopfChip(modell === null ? tHtml('live.chip.modellStartvorlage') : tHtml('live.chip.modell', { modell })))
  if (typeof schritt?.werkzeugsatz === 'string' && schritt.werkzeugsatz !== '') chips.push(kopfChip(tHtml('live.chip.werkzeugsatz', { name: schritt.werkzeugsatz })))
  if (typeof eintragHash === 'string') chips.push(`<a class="live-kopf-chip live-kopf-chip-link" href="${escapeHtml(eintragHash)}">${tHtml('live.zumEintrag')} <span aria-hidden="true">→</span></a>`)
  return chips.join('')
}

/**
 * „Gerade: <verb> <ziel>“ — der letzte Aufruf des laufenden Laufs.
 * @param aktivitaet - detail.aktivitaet oder null
 * @param fortschritt - detail.fortschritt (Bestand, falls aktivitaet fehlt) oder null
 * @returns HTML
 */
export function renderGerade(aktivitaet, fortschritt = null) {
  const letzter = Array.isArray(aktivitaet?.eintraege) && aktivitaet.eintraege.length > 0 ? aktivitaet.eintraege[0] : null
  if (letzter !== null) return `<span class="live-gerade-label">${tHtml('live.gerade')}</span> <strong>${tHtml(`live.art.${artVon(letzter.art)}`)}</strong> ${zielHtml(letzter)}`
  if (fortschritt && typeof fortschritt.werkzeug === 'string') return `<span class="live-gerade-label">${tHtml('live.gerade')}</span> ${zielHtml(fortschritt)}`
  return `<span class="live-gerade-label">${tHtml('live.gerade')}</span> <span class="subtle">${tHtml('live.geradeNichts')}</span>`
}

/**
 * Status-Block rechts im Kopf (Baustein statusBlockHtml): läuft seit bzw. Dauer, Zeitgrenze mit
 * Rest und Balken, Schätzung (kommt, Fixpaket B5), Aufrufe; darunter „Abbrechen …“ und „Laufakte“.
 * @param stand - { aktiv, startIso, dauerMinuten, zeitgrenze (zeitgrenzeStand), aktivitaet, laufStatusHtml (Text ohne eigenen Punkt — der Block hat einen), ton, abbrechenHtml, jetztMs }
 * @returns HTML
 */
export function renderStatusBlock({ aktiv, startIso = null, dauerMinuten = null, zeitgrenze = null, aktivitaet = null, laufStatusHtml = '', ton = null, abbrechenHtml = '', jetztMs = Date.now() }) {
  const zeilen = []
  if (aktiv) zeilen.push({ schluessel: t('live.status.laeuftSeit'), wertHtml: escapeHtml(dauerText(minutenSeit(startIso, jetztMs))) })
  else zeilen.push({ schluessel: t('live.status.dauer'), wertHtml: escapeHtml(dauerText(dauerMinuten)) })
  if (aktiv && zeitgrenze !== null) {
    zeilen.push({ schluessel: t('live.status.zeitgrenze'), wertHtml: tHtml('live.status.zeitgrenzeWert', { grenze: dauerText(zeitgrenze.grenzeMinuten), rest: dauerText(zeitgrenze.restMinuten) }) })
  } else if (aktiv) {
    zeilen.push({ schluessel: t('live.status.zeitgrenze'), wertHtml: '—' })
  }
  zeilen.push({ schluessel: t('live.status.schaetzung'), wertHtml: `${kommtBadge()} <span class="subtle">${tHtml('live.kommt.b5')}</span>` })
  const anzahl = typeof aktivitaet?.anzahlGesamt === 'number' ? tHtml('live.status.aufrufeWert', { anzahl: aktivitaet.anzahlGesamt }) : '—'
  zeilen.push({ schluessel: t('live.status.aufrufe'), wertHtml: aktiv ? anzahl : `<span class="subtle">${tHtml('live.status.aufrufeNachLauf')}</span>` })
  const block = statusBlockHtml({ kopfHtml: laufStatusHtml || tHtml(aktiv ? 'live.status.kopf.laeuft' : 'live.status.kopf.beendet'), ton: ton ?? (aktiv ? 'aktiv' : 'neutral'), zeilen })
  const balken =
    aktiv && zeitgrenze !== null
      ? `<div class="progress-track live-zeitbalken" role="progressbar" aria-label="${tHtml('live.status.zeitbalken')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(zeitgrenze.anteil * 100)}"><span style="width: ${Math.round(zeitgrenze.anteil * 100)}%"></span></div>`
      : ''
  return `${block}${balken}<div class="live-status-aktionen">${abbrechenHtml}<button type="button" class="button live-laufakte" data-live-aktion="laufakte">${tHtml('live.aktion.laufakte')}</button></div>`
}

// ─── Ablaufleiste ───────────────────────────────────────────────────────────

/**
 * Ablaufleiste aus ablaufStufen; ohne Workflow ein Hinweis statt erfundener Stufen.
 * @param stufen - Ergebnis von ablaufStufen, oder null ohne Workflow
 * @returns HTML
 */
export function renderAblaufleiste(stufen) {
  if (!Array.isArray(stufen)) return `<p class="subtle live-ablauf-ohne">${tHtml('live.ablauf.ohneWorkflow')}</p>`
  const kacheln = stufen.map((stufe, index) => {
    const status = stufe.status === 'kommt' ? kommtBadge() : `<span class="live-stufe-status">${tHtml(`live.ablauf.status.${stufe.id === 'freigabe' && stufe.status === 'jetzt' ? 'wartet' : stufe.status}`)}</span>`
    return `<li class="live-stufe" data-status="${escapeHtml(stufe.status)}"${stufe.status === 'jetzt' ? ' aria-current="step"' : ''}>
      <span class="live-stufe-nr">${index + 1}</span>
      <span class="live-stufe-name">${tHtml(`live.ablauf.stufe.${stufe.id}`)}</span>
      ${status}
    </li>`
  })
  return `<ol class="live-ablauf" aria-label="${tHtml('live.ablauf.titel')}">${kacheln.join('')}</ol>`
}

// ─── Aktivität ──────────────────────────────────────────────────────────────

/**
 * Karte „Aktivität“: Kopf mit Filtern (Warnungen „kommt“), Liste neueste oben, Fußzeile.
 * @param stand - { aktiv, aktivitaet, filter, gewaehlt (eintragSchluessel), jetztMs }
 * @returns HTML
 */
export function renderAktivitaet({ aktiv, aktivitaet, filter = 'alle', gewaehlt = null, jetztMs = Date.now() }) {
  const filterKnoepfe = AKTIVITAET_FILTER.map((f) => {
    if (KOMMT_FILTER.has(f)) return `<button type="button" class="filter-chip" aria-disabled="true">${tHtml(`live.filter.${f}`)} ${kommtBadge()}</button>`
    return `<button type="button" class="filter-chip" data-live-filter="${f}" aria-pressed="${f === filter}">${tHtml(`live.filter.${f}`)}</button>`
  }).join('')
  // Nach dem Lauf: nur Titel und Hinweis — Filter ohne Liste wären Bedienelemente ohne Wirkung.
  if (!aktiv) return `<div class="live-karte-kopf"><h2 id="live-aktivitaet-titel">${tHtml('live.aktivitaet.titel')}</h2></div><p class="subtle">${tHtml('live.aktivitaet.beendet')}</p>`
  const kopf = `<div class="live-karte-kopf">
      <h2 id="live-aktivitaet-titel">${tHtml('live.aktivitaet.titel')}</h2>
      <p class="subtle live-karte-hinweis">${tHtml('live.aktivitaet.hinweis')}</p>
      <div class="live-filter" role="group" aria-label="${tHtml('live.filter.gruppe')}">${filterKnoepfe}</div>
    </div>`
  if (aktivitaet === null || typeof aktivitaet !== 'object') return `${kopf}<p class="subtle">${tHtml('live.aktivitaet.nichtVerfuegbar')}</p>`
  const grenze = typeof aktivitaet.grenze === 'number' ? aktivitaet.grenze : 50
  const eintraege = filtereAktivitaet(aktivitaet.eintraege, filter)
  let liste
  if (!Array.isArray(aktivitaet.eintraege) || aktivitaet.eintraege.length === 0) liste = `<p class="subtle live-leer">${tHtml('live.aktivitaet.leer')}</p>`
  else if (eintraege.length === 0) liste = `<p class="subtle live-leer">${tHtml('live.aktivitaet.leerFilter', { grenze })}</p>`
  else {
    const zeilen = eintraege.map((e) => {
      const schluessel = eintragSchluessel(e)
      const an = schluessel === gewaehlt
      return `<li><button type="button" class="live-zeile" data-live-eintrag="${escapeHtml(schluessel)}" aria-pressed="${an}" aria-controls="live-mehr">
        <span class="live-zeit"><time datetime="${escapeHtml(e.zeit ?? '')}">${escapeHtml(relativeZeit(e.zeit, jetztMs))}</time></span>
        ${artChipHtml(e.art)}
        ${zielHtml(e)}
      </button></li>`
    })
    liste = `<ul class="live-liste" aria-labelledby="live-aktivitaet-titel">${zeilen.join('')}</ul>`
  }
  return `${kopf}${liste}<p class="subtle live-fuss">${tHtml('live.aktivitaet.fuss', { grenze, anzahl: aktivitaet.anzahlGesamt ?? 0 })}</p>`
}

/**
 * Karte „Mehr dazu“ zum gewählten Aufruf: Werkzeug, Ziel, Zeit (echt); Erklärung, Ausschnitt und
 * „Im Umfang?“ kommen (Fixpaket B2); „Frag Jarvis dazu“ befüllt nur die Chat-Eingabe.
 * @param stand - { eintrag (oder null), schritt (Workflow-Schritt oder null) }
 * @returns HTML
 */
export function renderMehrDazu({ eintrag = null, schritt = null }) {
  const titel = `<p class="live-eyebrow">${tHtml('live.mehr.titel')}</p>`
  if (eintrag === null) return `${titel}<p class="subtle">${tHtml('live.mehr.leer')}</p>`
  const schrittText = schritt ? [rollenName(schritt.rolle), schritt.worker ? workerName(schritt.worker) : null].filter((x) => x).join(' · ') : null
  const ziel = typeof eintrag.ziel === 'string' && eintrag.ziel !== '' ? eintrag.ziel : null
  // Ein auf ZIEL_MAX_ZEICHEN gekürztes Ziel (endet auf „…“) ergäbe einen kaputten Link — dann keiner.
  const gekuerzt = ziel !== null && ziel.endsWith('…') && Array.from(ziel).length >= 300
  const vscode = artVon(eintrag.art) === 'aendert' && ziel !== null && !gekuerzt ? baueVsCodeLink(ziel) : null
  const knoepfe = []
  if (vscode !== null) knoepfe.push(`<a class="button" href="${escapeHtml(vscode)}">${tHtml('live.mehr.vscode')}</a>`)
  if (artVon(eintrag.art) === 'aendert') knoepfe.push(`<a class="button" href="#/code">${tHtml('live.mehr.code')}</a>`)
  knoepfe.push(kommtKnopf(t('live.mehr.arbeitspaket')))
  return `${titel}
    <p class="live-mehr-kopf">${artChipHtml(eintrag.art)} ${zielHtml(eintrag)}</p>
    <dl class="live-felder">
      <dt>${tHtml('live.mehr.werkzeug')}</dt><dd><code>${escapeHtml(eintrag.werkzeug ?? '')}</code></dd>
      <dt>${tHtml('live.mehr.ziel')}</dt><dd>${ziel === null ? '—' : `<code class="live-ziel">${escapeHtml(ziel)}</code>`}</dd>
      <dt>${tHtml('live.mehr.zeit')}</dt><dd>${typeof eintrag.zeit === 'string' ? `<time datetime="${escapeHtml(eintrag.zeit)}">${escapeHtml(formatiereDatum(eintrag.zeit, { timeStyle: 'medium' }))}</time>` : '—'}</dd>
      <dt>${tHtml('live.mehr.schritt')}</dt><dd>${schrittText ? escapeHtml(schrittText) : '—'}</dd>
      <dt>${tHtml('live.mehr.erklaerung')}</dt><dd>${kommtBadge()} <span class="subtle">${tHtml('live.kommt.b2')}</span></dd>
      <dt>${tHtml('live.mehr.ausschnitt')}</dt><dd>${kommtBadge()}</dd>
      <dt>${tHtml('live.mehr.umfang')}</dt><dd>${kommtBadge()} <span class="subtle">${tHtml('live.kommt.b2')}</span></dd>
    </dl>
    <div class="action-row live-mehr-knoepfe">${knoepfe.join('')}</div>
    <div class="live-jarvis">
      <p class="live-eyebrow" id="live-jarvis-titel">${tHtml('live.jarvis.titel')}</p>
      <div class="live-jarvis-fragen" role="group" aria-labelledby="live-jarvis-titel">
        <button type="button" class="filter-chip" data-live-frage="warum">${tHtml('live.jarvis.warum')}</button>
        <button type="button" class="filter-chip" data-live-frage="wo">${tHtml('live.jarvis.wo')}</button>
        <button type="button" class="filter-chip" data-live-frage="plan">${tHtml('live.jarvis.plan')}</button>
      </div>
      <form class="live-jarvis-form" data-live-jarvis-form>
        <label class="sr-only" for="live-jarvis-eingabe">${tHtml('live.jarvis.label')}</label>
        <input id="live-jarvis-eingabe" type="text" autocomplete="off" placeholder="${tHtml('live.jarvis.platzhalter')}">
        <button type="submit" class="button primary">${tHtml('live.jarvis.fragen')}</button>
      </form>
      <p class="subtle live-jarvis-hinweis">${tHtml('live.jarvis.hinweis')}</p>
    </div>`
}

/**
 * Entwurf für die Chat-Eingabe zu einem Aufruf (wird nicht gesendet).
 * @param frage - Fragetext (übersetzt bzw. getippt)
 * @param laufId - Kennung des Laufs
 * @param eintrag - gewählter Aufruf oder null
 * @returns Text
 */
export function baueJarvisEntwurf(frage, laufId, eintrag) {
  const bezug = eintrag
    ? t('live.jarvis.kontextAufruf', { laufId, werkzeug: eintrag.werkzeug ?? '', ziel: eintrag.ziel ?? '—' })
    : t('live.jarvis.kontextLauf', { laufId })
  return `${frage}\n\n${bezug}`
}

// ─── Untere Karten ──────────────────────────────────────────────────────────

/**
 * „Berührte Dateien“ aus dem Ringpuffer; nach dem Lauf der Verweis auf den Code-Reiter.
 * @param stand - { aktiv, aktivitaet }
 * @returns HTML
 */
export function renderBeruehrteDateien({ aktiv, aktivitaet }) {
  const kopf = `<h2>${tHtml('live.dateien.titel')}</h2>`
  const umfang = `<p class="subtle live-klein">${tHtml('live.dateien.umfang')} ${kommtBadge()}</p>`
  if (!aktiv) return `${kopf}<p class="subtle">${tHtml('live.dateien.beendet')}</p><a class="text-link" href="#/code">${tHtml('live.mehr.code')} <span aria-hidden="true">→</span></a>`
  const dateien = Array.isArray(aktivitaet?.beruehrteDateien) ? aktivitaet.beruehrteDateien : []
  if (dateien.length === 0) return `${kopf}<p class="subtle">${tHtml('live.dateien.leer')}</p>${umfang}`
  const zeilen = dateien.map((pfad) => `<li><span class="live-datei-punkt" aria-hidden="true"></span><code class="live-ziel">${escapeHtml(pfad)}</code><span class="subtle live-klein">${tHtml('live.dateien.geaendert')}</span></li>`)
  const gekappt = aktivitaet?.beruehrteGekappt === true ? `<p class="subtle live-klein">${tHtml('live.dateien.gekappt', { anzahl: dateien.length })}</p>` : ''
  return `${kopf}<ul class="live-dateien">${zeilen.join('')}</ul>${gekappt}${umfang}`
}

/** @returns HTML der Karte „Bremsen & Warnungen“ (kommt: das Gateway liefert sie heute nicht) */
export function renderBremsen() {
  return `<h2>${tHtml('live.bremsen.titel')} ${kommtBadge()}</h2><p class="subtle">${tHtml('live.bremsen.text')}</p>`
}

/**
 * „Fähigkeiten“: vorgesehen gegen genutzt kommt (Fixpaket B1); nach dem Lauf „genutzt“ aus der
 * Beobachtung der Laufakte, wenn vorhanden.
 * @param stand - { aktiv, laufakte }
 * @returns HTML
 */
export function renderFaehigkeitenKarte({ aktiv, laufakte }) {
  const vergleich = `<p class="subtle">${tHtml('live.faehigkeiten.vergleich')} ${kommtBadge()} <span class="subtle">${tHtml('live.kommt.b1')}</span></p>`
  const beobachtung = !aktiv && laufakte?.status === 'ok' && laufakte.beobachtung ? beobachtungHtml(laufakte.beobachtung) : ''
  const genutzt = aktiv
    ? `<p class="subtle">${tHtml('live.faehigkeiten.waehrend')}</p>`
    : beobachtung || `<p><span class="unbekannt">${tHtml('lauf.laufakte.nichtBeobachtet')}</span></p>`
  return `<h2>${tHtml('live.faehigkeiten.titel')}</h2>${vergleich}${genutzt}`
}

/**
 * Was der Lauf laut Laufakte genutzt hat (Beobachtung: aufgerufene Skills, Subagenten, MCP) — lesbar, leere
 * Listen als „keine“; die technische Zeile (geladen/aufgerufen) bleibt im Aufklappbereich.
 * @param beobachtung - laufakte.beobachtung
 * @returns HTML
 */
function beobachtungHtml(beobachtung) {
  const liste = (feld) => (Array.isArray(beobachtung?.[feld]) ? beobachtung[feld].filter((x) => typeof x === 'string') : [])
  const zeile = (schluessel, feld) => {
    const werte = liste(feld)
    return `<dt>${tHtml(schluessel)}</dt><dd>${werte.length === 0 ? tHtml('live.faehigkeiten.keine') : werte.map((w) => `<code>${escapeHtml(w)}</code>`).join(', ')}</dd>`
  }
  return `<p class="subtle">${tHtml('live.faehigkeiten.genutzt')}</p><dl class="live-felder">${zeile('live.faehigkeiten.skills', 'skill_aufrufe')}${zeile('live.faehigkeiten.agents', 'subagent_aufrufe')}${zeile('live.faehigkeiten.mcp', 'mcp_aufrufe')}</dl>`
}

/**
 * „Output bisher“: die begonnenen bzw. fertigen Schritte des Workflows mit Status und Rolle.
 * @param stand - { workflow (GET /api/workflows/<id>) oder null, laufId }
 * @returns HTML
 */
export function renderOutput({ workflow = null, laufId = null }) {
  const kopf = `<h2>${tHtml('live.output.titel')}</h2>`
  if (workflow === null) return `${kopf}<p class="subtle">${tHtml('live.output.ohne')}</p>`
  const schritte = outputSchritte(workflow.daten?.schritte)
  if (schritte.length === 0) return `${kopf}<p class="subtle">${tHtml('live.output.leer')}</p>`
  const zeilen = schritte.map((s) => {
    const wer = [s.worker ? workerName(s.worker) : null].filter((x) => x).join(' · ')
    const link = typeof s.lauf_id === 'string' && s.lauf_id !== '' && s.lauf_id !== laufId ? `<a class="text-link" href="#/runs/${escapeHtml(encodeURIComponent(s.lauf_id))}">${tHtml('live.output.zumLauf')}</a>` : ''
    return `<li class="live-output-zeile"><span class="live-schritt-status" data-status="${escapeHtml(s.status)}">${escapeHtml(schrittStatusText(s.status))}</span><strong>${escapeHtml(rollenName(s.rolle))}</strong>${wer ? `<span class="subtle">${escapeHtml(wer)}</span>` : ''}<code class="live-schritt-id">${escapeHtml(s.schritt_id ?? '')}</code>${link}</li>`
  })
  return `${kopf}<ul class="live-output">${zeilen.join('')}</ul>`
}

/** @param status - Schrittstatus @returns Text (bekannte Werte übersetzt, sonst roh) */
function schrittStatusText(status) {
  const bekannt = ['LAEUFT', 'ERFOLGREICH', 'VERWEIGERT', 'FEHLGESCHLAGEN', 'UEBERSPRUNGEN']
  return bekannt.includes(status) ? t(`live.schritt.${status}`) : String(status ?? '')
}

/**
 * „Was der Builder bekommen hat“: Arbeitspaket kommt (Fixpaket B2); Kontextpaket nur, wenn das
 * Lauf-Detail die Liste liefert, sonst kommt.
 * @param kontextpaket - detail.kontextpaket
 * @returns HTML
 */
export function renderBuilderPaket(kontextpaket) {
  const arbeitspaket = `<p>${tHtml('live.paket.arbeitspaket')} ${kommtBadge()} <span class="subtle">${tHtml('live.kommt.b2')}</span></p>`
  let kontext
  if (kontextpaket?.status === 'ok' && Array.isArray(kontextpaket.elemente)) {
    const liste =
      kontextpaket.elemente.length === 0
        ? ''
        : `<details class="live-kontext"><summary>${tHtml('live.paket.kontextListe')}</summary><ul>${kontextpaket.elemente.map((e) => `<li><code>${escapeHtml(e.pfad ?? '')}</code></li>`).join('')}</ul></details>`
    kontext = `<p>${tHtml('live.paket.kontextpaket', { anzahl: kontextpaket.elemente.length })}</p>${liste}`
  } else {
    kontext = `<p>${tHtml('live.paket.kontextFehlt')} ${kommtBadge()}</p>`
  }
  return `<h2>${tHtml('live.paket.titel')}</h2>${arbeitspaket}${kontext}`
}

// ─── Zustand „nichts läuft“ ─────────────────────────────────────────────────

/**
 * Karte „Zuletzt“: letzter Lauf mit Titel, Ergebnis, Dauer und Links auf Laufakte (Lauf-Seite) und
 * Code-Reiter. Der Bericht im Format geändert/geprüft/erfolgreich/Blocker kommt (Fixpaket B2).
 * @param stand - { lauf (Eintrag aus zustand.laeufe) oder null, dauerMinuten, ergebnisHtml, jetztMs }
 * @returns HTML
 */
export function renderZuletzt({ lauf = null, dauerMinuten = null, ergebnisHtml = '', jetztMs = Date.now() }) {
  if (lauf === null) return `<p class="live-eyebrow">${tHtml('live.zuletzt.eyebrow')}</p><p class="subtle">${tHtml('live.zuletzt.leer')}</p>`
  const id = String(lauf.laufId ?? '')
  const titel = typeof lauf.auftragsbezug?.titel === 'string' && lauf.auftragsbezug.titel.trim() !== '' ? lauf.auftragsbezug.titel : id
  const vor = typeof lauf.zeitpunkt === 'string' ? tHtml('live.zuletzt.vor', { zeit: relativeZeit(lauf.zeitpunkt, jetztMs) }) : ''
  return `<p class="live-eyebrow">${tHtml('live.zuletzt.eyebrow')}${vor ? ` · ${vor}` : ''}</p>
    <h2 class="live-wartet-karte-titel">${escapeHtml(titel)}</h2>
    <dl class="live-felder">
      <dt>${tHtml('live.zuletzt.ergebnis')}</dt><dd>${ergebnisHtml}</dd>
      <dt>${tHtml('live.zuletzt.dauer')}</dt><dd>${escapeHtml(dauerText(dauerMinuten))}</dd>
      <dt>${tHtml('live.zuletzt.bericht')}</dt><dd>${kommtBadge()} <span class="subtle">${tHtml('live.kommt.b2')}</span></dd>
    </dl>
    <div class="action-row"><a class="button" href="#/runs/${escapeHtml(encodeURIComponent(id))}">${tHtml('live.aktion.laufakte')}</a><a class="button" href="#/code">${tHtml('live.mehr.code')}</a></div>`
}

/**
 * Karte „Als Nächstes“, wenn laut Poll ein Lauf aktiv ist, der hier keine Seite hat (anderes Projekt oder noch
 * nicht in der Laufliste): kein Startangebot, nur der ehrliche Hinweis (ein Lauf zur Zeit, D13).
 * @returns HTML
 */
export function renderFremderLauf() {
  return `<p class="live-eyebrow live-eyebrow-akzent">${tHtml('live.naechstes.eyebrow')}</p><p>${tHtml('live.wartet.fremd')}</p><a class="text-link" href="#/ausfuehrungen">${tHtml('lauf.zurueck')} <span aria-hidden="true">→</span></a>`
}

/**
 * Karte „Als Nächstes“: nächste offene Entscheidung (→ #/attention) oder nächster startbereiter
 * Schritt (→ Ablauf); sonst der Hinweis auf „Auftrag anlegen“.
 * @param naechstes - Ergebnis von waehleAlsNaechstes
 * @returns HTML
 */
export function renderAlsNaechstes(naechstes) {
  const eyebrow = `<p class="live-eyebrow live-eyebrow-akzent">${tHtml('live.naechstes.eyebrow')}</p>`
  if (naechstes?.art === 'entscheidung') {
    const e = naechstes.eintrag
    return `${eyebrow}<h2 class="live-wartet-karte-titel">${escapeHtml(e.titel ?? '')}</h2>
      <p>${tHtml(`live.naechstes.art.${e.art}`)}${e.satz ? ` — ${escapeHtml(e.satz)}` : ''}</p>
      <div class="action-row"><a class="button primary" href="#/attention">${tHtml('live.naechstes.zuEntscheidungen')} <span aria-hidden="true">→</span></a></div>`
  }
  if (naechstes?.art === 'schritt') {
    const w = naechstes.workflow
    return `${eyebrow}<h2 class="live-wartet-karte-titel">${escapeHtml(w.ziel ?? w.workflowId ?? '')}</h2>
      <p>${tHtml('live.naechstes.schritt')}${w.naechster?.grund ? ` — ${escapeHtml(w.naechster.grund)}` : ''}</p>
      <a class="text-link" href="#/workflows/${escapeHtml(encodeURIComponent(w.workflowId ?? ''))}">${tHtml('live.naechstes.zumAblauf')} <span aria-hidden="true">→</span></a>`
  }
  return `${eyebrow}<p class="subtle">${tHtml('live.naechstes.leer')}</p><a class="text-link" href="#/projekt">${tHtml('ablauf.runs.auftragAnlegen')} <span aria-hidden="true">→</span></a>`
}
