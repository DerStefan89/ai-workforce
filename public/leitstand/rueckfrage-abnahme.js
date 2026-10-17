/**
 * Datei: public/leitstand/rueckfrage-abnahme.js
 *
 * Zweck: Abnahme-Anzeige des Rückfrage-Kanals (F45 B2b-3b-2b-2a-3, features/F45/plan-b2b3b2b2a3-v2.md) — was der Kanal in einem Lauf
 * bewirkt hat (Zählung aus `rueckfrageKanal` von GET /api/laeufe/<laufId>), warum ein Kanal-Lauf VERWEIGERT blieb (Klasse des
 * Abgleich-Grunds statt des Standardsatzes) und die R3-Meldung „Protokoll nicht bestätigt“. Reine Render-Funktionen: kein DOM, kein fetch,
 * in Node importierbar.
 *
 * Wird aufgerufen von: public/leitstand/views/runs.js (Lauf-Detail), views/lauf-detail.js (Ursache in der Fehler-Notiz),
 * views/workflow-eingriffe.js (Sichtungs-Notiz beim F-760-Halt); geprüft von
 * public/leitstand/rueckfrage-abnahme.test.mjs und scripts/check-f45-b2b3b2b2a3-abnahme.mjs.
 *
 * Wichtig:
 * - Klassen statt Einzelcodes (Advisor V1): `echt` (kein_eintrag, kein_protokoll) ersetzt den Standardsatz NICHT — dort hat die
 *   Verweigerung mit dem Kanal nichts zu tun; `nicht_geprueft` (E-186) erscheint nur im Block (Advisor M10).
 * - Jede Zuordnung Code ⇒ i18n-Schlüssel ist literal (i18n-Gate, Advisor M5); ABGLEICH_KLASSE ist gegen ABGLEICH_GRUENDE
 *   (src/rueckfrage/protokoll.ts) im Test verankert.
 * - Grund und Abweichung stammen aus daten der Terminalmarke, die Abweichung ggf. aus einer gefälschten Datei: nur escaped bzw. mit
 *   sichtbaren Masken (maskiertesHtml), nie als HTML.
 */

import { t, tHtml } from './i18n.js'
import { escapeHtml } from './render.js'
import { maskiertesHtml } from './rueckfrage-anzeige.js'
import { ERHALTEN } from './rueckfrage-daten.js'

/** Klasse je Grund des Abgleichs (art 'abgleich', ABGLEICH_GRUENDE in src/rueckfrage/protokoll.ts). */
export const ABGLEICH_KLASSE = Object.freeze({
  kein_eintrag: 'echt',
  nicht_von_stefan: 'automatisch',
  ablehnungstext_passt_nicht: 'nicht_bestaetigt',
  werkzeug_abweichend: 'nicht_bestaetigt',
  eingabe_abweichend: 'nicht_bestaetigt',
  eintrag_mehrfach: 'nicht_bestaetigt',
  id_doppelt: 'nicht_bestaetigt',
  id_fehlt: 'nicht_bestaetigt',
  ablehnung_ungueltig: 'nicht_bestaetigt',
  keine_ablehnung: 'nicht_bestaetigt', // in der Auswertung nicht erreichbar (ohne Ablehnung ⇒ ERFOLGREICH), der Vollständigkeit halber
  protokoll_ungueltig: 'protokoll',
  protokoll_fremd: 'protokoll',
})

/** Literale i18n-Schlüssel je Klasse (Titel, Satz, was tun). */
export const KLASSEN_SCHLUESSEL = Object.freeze({
  echt: { titel: 'abnahme.kanal.klasse.echt.titel', text: 'abnahme.kanal.klasse.echt.text', wasTun: 'abnahme.kanal.klasse.echt.wasTun' },
  automatisch: { titel: 'abnahme.kanal.klasse.automatisch.titel', text: 'abnahme.kanal.klasse.automatisch.text', wasTun: 'abnahme.kanal.klasse.automatisch.wasTun' },
  nicht_bestaetigt: { titel: 'abnahme.kanal.klasse.nichtBestaetigt.titel', text: 'abnahme.kanal.klasse.nichtBestaetigt.text', wasTun: 'abnahme.kanal.klasse.nichtBestaetigt.wasTun' },
  protokoll: { titel: 'abnahme.kanal.klasse.protokoll.titel', text: 'abnahme.kanal.klasse.protokoll.text', wasTun: 'abnahme.kanal.klasse.protokoll.wasTun' },
  nicht_geprueft: { titel: 'abnahme.kanal.klasse.nichtGeprueft.titel', text: 'abnahme.kanal.klasse.nichtGeprueft.text', wasTun: 'abnahme.kanal.klasse.nichtGeprueft.wasTun' },
  unbekannt: { titel: 'abnahme.kanal.klasse.unbekannt.titel', text: 'abnahme.kanal.klasse.unbekannt.text', wasTun: 'abnahme.kanal.klasse.unbekannt.wasTun' },
})

/** Felder der Zählung mit ihrem Text (Antworten bzw. unbeantwortet). */
const ANTWORTEN = [
  ['stefan_erlaubt', 'abnahme.kanal.erlaubt'],
  ['stefan_abgelehnt', 'abnahme.kanal.abgelehnt'],
  ['frage_beantwortet', 'abnahme.kanal.beantwortet'],
  ['nicht_browser', 'abnahme.kanal.nichtBrowser'],
]
const UNBEANTWORTET = [
  ['abgelaufen', 'abnahme.kanal.abgelaufen'],
  ['lauf_ende', 'abnahme.kanal.laufEnde'],
  ['automatisch', 'abnahme.kanal.automatisch'],
]

/** Nicht-negative Ganzzahl. */
const istAnzahl = (wert) => Number.isInteger(wert) && wert >= 0

/**
 * Klasse des Abgleich-Grunds (Advisor V1/M6: `art` wird gegen die vier bekannten Werte geprüft).
 * @param abgleich - rueckfrageKanal.abgleich ({ art, grund }) oder null
 * @returns 'echt' | 'automatisch' | 'nicht_bestaetigt' | 'protokoll' | 'nicht_geprueft' | 'unbekannt' oder null (kein Abgleich)
 */
export function abgleichKlasse(abgleich) {
  if (typeof abgleich !== 'object' || abgleich === null) return null
  if (abgleich.art === 'abgleich') return Object.hasOwn(ABGLEICH_KLASSE, abgleich.grund) ? ABGLEICH_KLASSE[abgleich.grund] : 'unbekannt'
  if (abgleich.art === 'kein_protokoll') return 'echt'
  if (abgleich.art === 'abweichung') return 'protokoll'
  if (abgleich.art === 'nicht_geprueft') return 'nicht_geprueft'
  return 'unbekannt'
}

/**
 * Grund der Auswertung als HTML: Titel, Satz, Code (escaped) und „was tun“.
 * @param abgleich - { art, grund }
 * @param klasse - abgleichKlasse(abgleich)
 * @param r3Darunter - true, wenn die R3-Meldung (renderRueckfrageAbweichung) direkt folgt: bei art 'abweichung' dann nur Titel und Satz
 * @returns HTML
 */
function grundHtml(abgleich, klasse, r3Darunter = false) {
  const s = KLASSEN_SCHLUESSEL[klasse]
  // Steht die R3-Meldung direkt darunter (Lauf-Detail), tragen Freitext und „was tun“ nur sie (design-guardian 3: nicht doppelt); die
  // Sichtungs-Notiz zeigt keine R3-Meldung und behält „was tun“ (code-reviewer Nachpass C).
  if (abgleich.art === 'abweichung' && r3Darunter) return `<p class="kanal-grund"><strong>${tHtml(s.titel)}.</strong> ${tHtml(s.text)}</p>`
  const code = typeof abgleich.grund === 'string' && abgleich.grund !== '' ? ` <code>${escapeHtml(abgleich.grund)}</code>` : ''
  return `<p class="kanal-grund"><strong>${tHtml(s.titel)}.</strong> ${tHtml(s.text)}${code}</p>
      <p class="kanal-was-tun"><strong>${tHtml('abnahme.kanal.wasTun')}</strong> ${tHtml(s.wasTun)}</p>`
}

/**
 * Ersatz für den Standardsatz einer Verweigerung (Lauf-Notiz „Ursache“, Sichtungs-Notiz beim F-760-Halt): nur, wenn der Kanal die
 * Ursache ist — nicht bei `echt` (Standardsatz bleibt) und nicht bei `nicht_geprueft` (E-186, nur im Block).
 * @param kanal - rueckfrageKanal aus dem Lauf-Detail oder null
 * @param optionen - { r3Darunter: true } im Lauf-Detail (die R3-Meldung folgt dort unter der Notiz)
 * @returns HTML oder '' (Standardsatz bleibt)
 */
export function kanalUrsacheHtml(kanal, optionen = {}) {
  const klasse = abgleichKlasse(kanal?.abgleich ?? null)
  if (klasse === null || klasse === 'echt' || klasse === 'nicht_geprueft') return ''
  return grundHtml(kanal.abgleich, klasse, optionen.r3Darunter === true)
}

/**
 * Eine Liste „Text: Zahl“ der Zählung; ein fehlender Wert (Bestandsmarke ohne die neuen Felder) als „nicht erfasst“.
 * @param zaehlung - Zählung
 * @param felder - [Feld, Schlüssel][]
 * @returns HTML
 */
function zahlenListe(zaehlung, felder) {
  const zeilen = felder.map(([feld, schluessel]) => `<li>${tHtml(schluessel, { n: istAnzahl(zaehlung[feld]) ? String(zaehlung[feld]) : t('abnahme.kanal.nichtErfasst') })}</li>`)
  return `<ul class="lauf-daten">${zeilen.join('')}</ul>`
}

/**
 * Block „Rückfrage-Kanal im Lauf“ (Advisor B10/V3): Antworten mit Beschriftung, davon bestätigte Ablehnungen, unbeantwortete; alle null
 * ⇒ „keine Rückfrage“ (unterscheidbar von „kein Kanal“ = kein Block); dazu der Grund der Auswertung, wenn vorhanden.
 * @param kanal - rueckfrageKanal aus dem Lauf-Detail oder null
 * @returns HTML ('' ohne Kanal)
 */
export function renderRueckfrageAbnahme(kanal) {
  if (typeof kanal !== 'object' || kanal === null) return ''
  const z = kanal.zaehlung
  let zaehlung
  if (typeof z !== 'object' || z === null) zaehlung = `<p>${tHtml('abnahme.kanal.nichtLesbar')}</p>`
  else if ([...ANTWORTEN, ...UNBEANTWORTET].every(([feld]) => z[feld] === 0)) zaehlung = `<p>${tHtml('abnahme.kanal.keineRueckfrage')}</p>`
  else {
    const bestaetigt = istAnzahl(z.stefan_abgelehnt) && z.stefan_abgelehnt > 0 ? `<p>${bestaetigtText(kanal)}</p>` : ''
    zaehlung = `<p><strong>${tHtml('abnahme.kanal.antworten')}</strong></p>${zahlenListe(z, ANTWORTEN)}
      <p class="subtle">${tHtml('abnahme.kanal.hinweisB10')}</p>${bestaetigt}
      <p><strong>${tHtml('abnahme.kanal.unbeantwortet')}</strong></p>${zahlenListe(z, UNBEANTWORTET)}`
  }
  // Die Kanal-Klassen stehen schon als Ursache in der Fehler-Notiz (kanalUrsacheHtml) — hier nur, was die Notiz nicht zeigt (echt, E-186).
  const klasse = abgleichKlasse(kanal.abgleich ?? null)
  const grund = klasse === 'echt' || klasse === 'nicht_geprueft' ? `<p><strong>${tHtml('abnahme.kanal.auswertung')}</strong></p>${grundHtml(kanal.abgleich, klasse)}` : ''
  // design-guardian 2: die R3-Meldung (das Wesentliche) direkt unter der Fehler-Notiz, die Zahlen danach.
  return `${renderRueckfrageAbweichung(kanal.abweichung)}<div class="note rueckfrage-abnahme">
      <strong>${tHtml('abnahme.kanal.titel')}</strong>
      ${zaehlung}
      ${grund}
    </div>`
}

/**
 * Zeile „bestätigt“ je Ergebnis (code-reviewer 2, qa 3): nur ERFOLGREICH trägt die Zahl der bestätigten Ablehnungen; VERWEIGERT verweist
 * auf den Grund; ein FEHLGESCHLAGEN-Lauf (z. B. TIMEOUT, Abbruch, Exit-Code) wurde nicht abgeglichen.
 * @param kanal - rueckfrageKanal
 * @returns HTML
 */
function bestaetigtText(kanal) {
  if (kanal.ergebnis === 'ERFOLGREICH') return tHtml('abnahme.kanal.bestaetigt', { n: String(istAnzahl(kanal.abgelehntDurchStefan) ? kanal.abgelehntDurchStefan : 0) })
  if (kanal.ergebnis === 'VERWEIGERT') return tHtml('abnahme.kanal.bestaetigtVerweigert')
  return tHtml('abnahme.kanal.bestaetigtNichtAusgewertet')
}

/**
 * R3 als eigene, dauerhafte Meldung (aus daten der Terminalmarke, überlebt den Neustart): Fälschung oder Schreibfehler, was tun.
 * Der Grundtext kann aus einer gefälschten Datei stammen ⇒ escaped, täuschende Zeichen als sichtbare Masken.
 * @param abweichung - rueckfrageKanal.abweichung (Text) oder null
 * @returns HTML ('' ohne Abweichung)
 */
export function renderRueckfrageAbweichung(abweichung) {
  if (typeof abweichung !== 'string') return ''
  return `<div class="note red rueckfrage-abweichung">
      <strong>${tHtml('abnahme.kanal.abweichung.titel')}</strong>
      <p>${tHtml('abnahme.kanal.abweichung.text')}</p>
      <p><code>${maskiertesHtml(abweichung, ERHALTEN.option)}</code></p>
      <p><strong>${tHtml('abnahme.kanal.wasTun')}</strong> ${tHtml('abnahme.kanal.abweichung.wasTun')}</p>
    </div>`
}
