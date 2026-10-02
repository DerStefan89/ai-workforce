/**
 * Datei: public/leitstand/views/entscheidung-panel.js
 *
 * Zweck: Baustein „Deine Entscheidung“ der Seite Entscheiden (F46 D2, Bilder
 * 09-entscheidungen--Entscheiden und --Entscheiden-Abnahme, abgleich-f46.md §4.5): die rechte,
 * beim Scrollen mitlaufende Spalte mit Frage, „Jarvis empfiehlt“ („kommt“, keine Quelle), drei
 * Optionen als Radiogruppe, Pflichtbegründung und genau einem Hauptknopf „<Option> bestätigen“.
 * Der Knopf ist gesperrt (disabled), bis eine erlaubte Option gewählt und die Begründung nicht leer
 * ist (bedienZustand) — dieselbe Bedingung, die der Server stellt; der Server prüft ohnehin selbst.
 *
 * Reine Funktionen (kein DOM, kein fetch): views/workflows.js setzt den Zustand des Knopfs über
 * bedienZustand und führt die bestehenden Entscheidungswege aus (Freigabe: der Knopf öffnet den
 * bestehenden Freigabedialog mit Kennzeichen und „Anzeige = Start“; Abnahme: der Knopf trägt
 * .wf-abnahme-aktion und schickt POST …/abnahme wie bisher).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflow-entscheiden.js (Freigabe)
 * - public/leitstand/views/workflow-abnahme.js (Abnahme)
 * - public/leitstand/views/workflows.js (bedienZustand)
 * - public/leitstand/views/workflow-entscheiden.test.mjs (node:test, auch bedienZustand)
 *
 * Wichtig: Alle Texte über t()/tHtml(); IDs (Feld, Knopf, Meldung) gibt der Aufrufer vor, damit die
 * bestehenden IDs der Entscheidungswege (z. B. wf-abnahme-begruendung) erhalten bleiben.
 */

import { t, tHtml } from '../i18n.js'
import { kommtBadge } from '../kommt.js'
import { escapeHtml } from '../render.js'

/**
 * Baut die Spalte „Deine Entscheidung“.
 * @param eingabe - { art: 'freigabe' | 'abnahme', frageHtml, name (Radiogruppe), optionen: [{ wert, titel, info, erlaubt, bestaetigen }], feldId, knopfKlasse, knopfDaten: { schlüssel: wert } (data-*-Attribute, escaped), meldungId: optional id einer eigenen Meldung }
 * @returns HTML
 */
export function renderEntscheidungsPanel({ art, frageHtml, name, optionen, feldId, knopfKlasse, knopfDaten = {}, meldungId }) {
  const titelId = `${name}-titel`
  const hinweisId = `${name}-hinweis`
  const daten = Object.entries(knopfDaten)
    .map(([schluessel, wert]) => ` data-${schluessel}="${escapeHtml(String(wert))}"`)
    .join('')
  const zeilen = optionen
    .map(
      (o) => `<label class="entscheidung-option${o.erlaubt ? '' : ' entscheidung-option-gesperrt'}">
        <input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(o.wert)}" data-bestaetigen="${escapeHtml(o.bestaetigen)}"${o.erlaubt ? '' : ' disabled'} />
        <span><strong>${escapeHtml(o.titel)}</strong><small>${escapeHtml(o.info)}</small></span>
      </label>`
    )
    .join('')
  return `<section class="entscheidung-panel entscheidung-panel-${escapeHtml(art)}" aria-labelledby="${titelId}">
    <div class="eyebrow">${tHtml('entscheiden.panel.eyebrow')}</div>
    <h2 id="${titelId}">${frageHtml}</h2>
    <p class="entscheidung-panel-empfehlung" aria-disabled="true"><span class="subtle">${tHtml('entscheiden.panel.empfiehlt')}</span> ${kommtBadge()}</p>
    <fieldset class="entscheidung-optionen">
      <legend class="sr-only">${tHtml('entscheiden.panel.optionen')}</legend>
      ${zeilen}
    </fieldset>
    <label class="field" for="${escapeHtml(feldId)}">${tHtml('entscheiden.panel.begruendung')}</label>
    <textarea id="${escapeHtml(feldId)}" rows="4" aria-required="true" aria-describedby="${hinweisId}" placeholder="${tHtml('entscheiden.panel.platzhalter')}"></textarea>
    <button type="button" class="button primary entscheidung-absenden ${escapeHtml(knopfKlasse)}"${daten}${art === 'freigabe' ? ' aria-haspopup="dialog"' : ''} aria-describedby="${hinweisId}" disabled>${tHtml('entscheiden.panel.waehlen')}</button>
    <p id="${hinweisId}" class="subtle entscheidung-panel-hinweis">${tHtml(`entscheiden.panel.hinweis.${art}`)}</p>
    ${meldungId ? `<p id="${escapeHtml(meldungId)}" class="fehler" tabindex="-1" hidden></p>` : ''}
  </section>`
}

/**
 * Zustand des Knopfs aus Auswahl und Begründung (Absenden gesperrt, solange eins fehlt).
 * @param gewaehlt - { wert, bestaetigen, erlaubt } der gewählten Option, oder null
 * @param begruendung - Inhalt des Begründungsfelds
 * @returns { gesperrt, text, aktion } — text ist der Knopftext, aktion der gewählte Wert oder ''
 */
export function bedienZustand(gewaehlt, begruendung) {
  if (gewaehlt === null || gewaehlt.erlaubt === false) return { gesperrt: true, text: t('entscheiden.panel.waehlen'), aktion: '' }
  return { gesperrt: String(begruendung ?? '').trim().length === 0, text: gewaehlt.bestaetigen, aktion: gewaehlt.wert }
}
