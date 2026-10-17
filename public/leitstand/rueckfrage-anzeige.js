/**
 * Datei: public/leitstand/rueckfrage-anzeige.js
 *
 * Zweck: Reine Render-Funktionen des Rückfrage-Kanals (F45 B2b-3b-2b-2a-2, features/F45/plan-b2b3b2b2a2-v2.md) — Karte einer offenen
 * Rückfrage in „Deine Entscheidungen“, „Zuletzt entschieden“ und der Text des Kanal-Bands. Liefert HTML-Strings bzw. Text; kein DOM,
 * kein fetch, in Node importierbar (Muster views/workflow-abnahme.js).
 *
 * Wird aufgerufen von:
 * - public/leitstand/rueckfrage-kanal.js (baut jede Karte einmal je Rückfrage-id, Advisor V2)
 * - public/leitstand/rueckfrage-anzeige.test.mjs, scripts/check-f45-b2b3b2b2a2-anzeige.mjs (c)
 *
 * Wichtig:
 * - Jeder Server- bzw. Modelltext (Befehl, Frage, Optionen, IDs, Antworten) geht nur über escapeHtml in die Seite, nie als HTML;
 *   täuschende Zeichen erscheinen als Marke ⟦U+XXXX⟧ (rueckfrage-daten.js zerlegeMitMasken, Auflage B12).
 * - Bash: wörtlich und vollständig — keine Kürzung, keine Höhenbegrenzung, je Zeile eine Nummer am Rand, dazu Zeilen- und Zeichenzahl.
 * - Rechte-Anfragen nur „Einmal erlauben“ / „Ablehnen“ (kein „immer“, E-B2b-3-1 = A); keiner der Knöpfe ist der Hauptknopf.
 * - Die Restzeit steht in einem eigenen leeren Element (data-kanal-restzeit) — rueckfrage-kanal.js füllt es je Takt per textContent,
 *   damit die Karte (Freitext, Fokus) nicht neu gezeichnet wird.
 */

import { formatiereDatum, formatiereZahl, t, tHtml } from './i18n.js'
import { escapeHtml } from './render.js'
import { befehlsZeilen, ERHALTEN, hatMasken, naechsteFrist, restzeit, zerlegeMitMasken } from './rueckfrage-daten.js'
import { artChip } from './typ-chip.js'

/** Ergebnis-Codes der Vermittlung mit eigenem Text (rueckfrage-vermittlung.mjs); ein unbekannter Code erscheint roh. */
const ERGEBNISSE = new Set(['stefan_erlaubt', 'stefan_abgelehnt', 'frage_beantwortet', 'zeitueberschreitung', 'lauf_beendet', 'frage_ohne_antwort'])

/** Datum und Uhrzeit wie in views/attention.js. */
const ZEIT_FORMAT = { dateStyle: 'medium', timeStyle: 'short' }

/**
 * Text mit sichtbaren Masken als HTML.
 * @param text - Rohtext
 * @param erhalten - ERHALTEN.befehl | .frage | .option
 * @returns HTML (Klartext escaped, Masken als <span class="rueckfrage-maske">)
 */
export function maskiertesHtml(text, erhalten) {
  return zerlegeMitMasken(text, erhalten)
    .map((teil) => ('maske' in teil ? `<span class="rueckfrage-maske" title="${escapeHtml(t('rueckfrage.maske.titel'))}">⟦${escapeHtml(teil.maske)}⟧</span>` : escapeHtml(teil.text)))
    .join('')
}

/**
 * Kopfzeile einer Karte: Art-Chip, Instanz (Projekt oder Workforce) und Lauf.
 * @param eintrag - Kanal-Eintrag (rueckfrage-daten.js baueKanalEintraege)
 * @returns HTML
 */
function kopf(eintrag) {
  const instanz = eintrag.projektId !== null ? escapeHtml(eintrag.projektId) : tHtml('rueckfrage.instanz.workforce')
  const lauf = eintrag.laufId !== null ? ` · ${tHtml('rueckfrage.lauf')} <code>${escapeHtml(eintrag.laufId)}</code>` : ''
  return `<div class="entscheidung-karte-kopf">${artChip('kanal')}<span class="entscheidung-karte-eintrag">${instanz}${lauf}</span><span class="rueckfrage-restzeit" data-kanal-restzeit></span></div>`
}

/**
 * Befehl wörtlich und vollständig mit Zeilennummern.
 * @param befehl - Befehlstext
 * @returns HTML
 */
function befehlBlock(befehl) {
  const { zeilen, zeichen } = befehlsZeilen(befehl)
  const umfang = t('rueckfrage.befehl.umfang', { anzahl: zeilen.length, zeilen: formatiereZahl(zeilen.length), zeichen: formatiereZahl(zeichen) })
  const liste = zeilen.map((zeile) => `<li>${maskiertesHtml(zeile, ERHALTEN.befehl)}</li>`).join('')
  return `<p class="rueckfrage-umfang">${escapeHtml(umfang)}</p><ol class="rueckfrage-befehl" aria-label="${escapeHtml(t('rueckfrage.befehl.liste'))}">${liste}</ol>`
}

/**
 * Antwortteil einer Rechte-Anfrage: genau zwei Entscheidungen.
 * @returns HTML
 */
function rechteAktionen() {
  return `<div class="rueckfrage-aktionen">
      <button type="button" class="button" data-kanal-aktion="rechte" data-entscheidung="einmal_erlauben">${tHtml('rueckfrage.knopf.erlauben')}</button>
      <button type="button" class="button danger" data-kanal-aktion="rechte" data-entscheidung="ablehnen">${tHtml('rueckfrage.knopf.ablehnen')}</button>
    </div>`
}

/**
 * Antwortteil einer Frage: je Option ein Knopf (leere Option gesperrt, der Server lehnt sie ab), dazu freie Antwort.
 * @param eintrag - Kanal-Eintrag mit frage/optionen
 * @returns HTML
 */
function frageAktionen(eintrag) {
  const feldId = `kanal-antwort-${escapeHtml(eintrag.id)}`
  const optionen = eintrag.optionen
    .map((option, index) => {
      const leer = option.trim() === ''
      return `<button type="button" class="button rueckfrage-option" data-kanal-aktion="option" data-option-index="${index}"${leer ? ` disabled data-kanal-leer title="${escapeHtml(t('rueckfrage.option.leer'))}"` : ''}>${leer ? tHtml('rueckfrage.option.leerText') : maskiertesHtml(option, ERHALTEN.option)}</button>`
    })
    .join('')
  return `${optionen === '' ? '' : `<div class="rueckfrage-optionen" role="group" aria-label="${escapeHtml(t('rueckfrage.optionen'))}">${optionen}</div>`}
    <label class="field" for="${feldId}">${tHtml('rueckfrage.frei.label')}</label>
    <textarea id="${feldId}" class="rueckfrage-frei" rows="2" maxlength="2000" placeholder="${escapeHtml(t('rueckfrage.frei.platzhalter'))}" data-kanal-frei></textarea>
    <div class="rueckfrage-aktionen"><button type="button" class="button" data-kanal-aktion="frei">${tHtml('rueckfrage.knopf.antworten')}</button></div>`
}

/**
 * Karte einer offenen Rückfrage (einmal je id gebaut; Restzeit und Meldung füllt rueckfrage-kanal.js).
 * @param eintrag - Kanal-Eintrag (baueKanalEintraege)
 * @returns HTML eines <article data-kanal-id>
 */
export function renderKanalKarte(eintrag) {
  const titel = tHtml(`rueckfrage.titel.${eintrag.typ === 'frage' ? 'frage' : eintrag.typ === 'befehl' ? 'befehl' : 'rechte'}`)
  let inhalt
  if (eintrag.typ === 'befehl') inhalt = `${befehlBlock(eintrag.befehl)}${rechteAktionen()}`
  else if (eintrag.typ === 'frage') {
    const masken = hatMasken(eintrag.frage, ERHALTEN.frage) || eintrag.optionen.some((o) => hatMasken(o, ERHALTEN.option))
    inhalt = `<p class="rueckfrage-frage">${maskiertesHtml(eintrag.frage, ERHALTEN.frage)}</p>${masken ? `<p class="rueckfrage-hinweis">${tHtml('rueckfrage.maske.hinweis')}</p>` : ''}${frageAktionen(eintrag)}`
  } else inhalt = `<p class="entscheidung-karte-kontext">${tHtml('rueckfrage.rechte.werkzeug')} <code>${escapeHtml(eintrag.toolName ?? '')}</code></p>${rechteAktionen()}`
  return `<article class="entscheidung-karte art-kanal rueckfrage-karte" data-kanal-id="${escapeHtml(eintrag.id)}">
      <div class="entscheidung-karte-text">
        ${kopf(eintrag)}
        <h3 tabindex="-1">${titel}</h3>
        ${inhalt}
        <p class="rueckfrage-meldung" tabindex="-1" data-kanal-meldung hidden></p>
      </div>
    </article>`
}

/**
 * Text der Restzeit einer Karte.
 * @param eintrag - Kanal-Eintrag
 * @param jetztMs - jetzt
 * @returns Text
 */
export function restzeitText(eintrag, jetztMs) {
  const rest = restzeit(eintrag.frist, jetztMs)
  if (rest === null) return ''
  return rest.abgelaufen ? t('rueckfrage.restzeit.abgelaufen') : t('rueckfrage.restzeit.noch', { zeit: rest.text })
}

/**
 * Ergebnistext eines entschiedenen Eintrags.
 * @param ergebnis - Code der Vermittlung
 * @returns HTML
 */
function ergebnisHtml(ergebnis) {
  return ERGEBNISSE.has(ergebnis) ? tHtml(`rueckfrage.ergebnis.${ergebnis}`) : escapeHtml(ergebnis)
}

/**
 * „Zuletzt entschieden“ des Kanals: je Eintrag Ergebnis, Befehl bzw. Frage, Herkunft — eine Antwort, die nicht aus dem Browser kam,
 * fällt als rote Marke auf (E-B7, Hinweis, kein Schutz).
 * @param entschiedene - baueEntschiedene(…)
 * @returns HTML der Liste oder '' ohne Einträge
 */
export function renderZuletzt(entschiedene) {
  if (!Array.isArray(entschiedene) || entschiedene.length === 0) return ''
  const zeilen = entschiedene
    .map((e) => {
      const gegenstand = e.befehl !== undefined ? `<code class="rueckfrage-zuletzt-text">${maskiertesHtml(e.befehl, ERHALTEN.befehl)}</code>` : e.frage !== undefined ? `<span class="rueckfrage-zuletzt-text">${maskiertesHtml(e.frage, ERHALTEN.frage)}</span>` : `<code>${escapeHtml(e.toolName ?? '')}</code>`
      const antwort = e.antwort !== undefined ? `<span class="rueckfrage-zuletzt-antwort">${tHtml('rueckfrage.zuletzt.antwort')} ${maskiertesHtml(e.antwort, ERHALTEN.frage)}</span>` : ''
      const herkunft = e.nichtBrowser ? `<span class="badge fehler">${tHtml('rueckfrage.herkunft.nicht_browser')}</span>` : e.herkunft === 'browser' ? `<span class="subtle">${tHtml('rueckfrage.herkunft.browser')}</span>` : ''
      const zeit = e.entschiedenAm !== null ? `<time datetime="${escapeHtml(e.entschiedenAm)}">${escapeHtml(formatiereDatum(e.entschiedenAm, ZEIT_FORMAT))}</time>` : ''
      const lauf = e.laufId !== null ? `<span class="subtle">${tHtml('rueckfrage.lauf')} <code>${escapeHtml(e.laufId)}</code></span>` : ''
      return `<li class="rueckfrage-zuletzt-eintrag${e.nichtBrowser ? ' nicht-browser' : ''}"><div class="rueckfrage-zuletzt-kopf"><strong>${ergebnisHtml(e.ergebnis)}</strong>${herkunft}${zeit}${lauf}</div>${gegenstand}${antwort}</li>`
    })
    .join('')
  return `<h3>${tHtml('rueckfrage.zuletzt.titel')}</h3><p class="subtle">${tHtml('rueckfrage.zuletzt.hinweis')}</p><ul class="rueckfrage-zuletzt">${zeilen}</ul>`
}

/**
 * Text des Kanal-Bands (Advisor V4): mit wartenden Rückfragen Anzahl und nächste Frist; Abruf defekt ⇒ eigener, auffälliger Text
 * (Korrekturrunde qa 2, code-reviewer 4 — sonst sähe ein Defekt aus wie „nichts wartet“); sonst der Hinweis „Kanal an“.
 * @param offene - Kanal-Einträge (Array), null (Abruf fehlgeschlagen) oder undefined (lädt)
 * @param warteGrenzeMs - Wartegrenze aus zustand.rueckfrageStatus
 * @param jetztMs - jetzt
 * @returns { text, wartend } — wartend true, wenn mindestens eine Rückfrage offen ist
 */
export function kanalBandText(offene, warteGrenzeMs, jetztMs) {
  if (offene === null) return { text: t('rueckfrage.band.defekt'), wartend: true }
  const anzahl = Array.isArray(offene) ? offene.length : 0
  if (anzahl > 0) {
    const frist = naechsteFrist(offene, jetztMs)
    return { text: t('rueckfrage.band.wartend', { anzahl, zahl: formatiereZahl(anzahl), zeit: frist?.text ?? '–' }), wartend: true }
  }
  const minuten = Number.isFinite(warteGrenzeMs) && warteGrenzeMs > 0 ? Math.round(warteGrenzeMs / 60000) : 10
  return { text: t('rueckfrage.band.an', { minuten: formatiereZahl(minuten) }), wartend: false }
}
