/**
 * Datei: public/leitstand/befehlsblock.js
 *
 * Zweck: Befehlsblock im Chat (F44 WS-8b, Regel „direkt ausführbar“, F-959). Zerlegt den Text des
 * Feldes 'antwort' einer Jarvis- oder Coach-Antwort in Text und Codeblöcke und rendert jeden
 * Codeblock als kopierbaren Befehlsblock: Etikett aus dem Sprach-Tag (POWERSHELL, BASH; ohne Tag
 * „Code“), Angabe „{n} Befehle · nacheinander“, Code als <pre><code>, Knopf „Kopieren“ und bei
 * einer Zeile mit <…> der Hinweis-Chip „Platzhalter ausfüllen“.
 *
 * Zerlegung: Ein Codeblock beginnt mit einer Zeile ``` (am Zeilenanfang, optional mit Sprach-Tag)
 * und endet mit einer Zeile ``` (am Zeilenanfang). Ein Öffner ohne schließende Zeile ist kein
 * Block — er und alles danach bleiben Text (unvollständiger Zaun).
 *
 * Sicherheitsgrenze: Der Leitstand führt nichts aus. Der Block kopiert nur in die Zwischenablage,
 * und nur auf Klick. Jeder Text aus der Modellausgabe wird escaped; nichts davon landet in einem
 * Attribut oder Link. Der zu kopierende Text wird beim Klick aus den Zeilen im <code>-Element gelesen
 * (textContent je .befehlsblock-zeile), nicht aus einem Attribut.
 *
 * Jede Befehlszeile ist ein eigener Block mit hängendem Einzug (style.css): bricht ein langer Befehl
 * im schmalen Dock um, ist die Fortsetzung eingerückt und nicht mit einem neuen Befehl zu verwechseln.
 *
 * Kopieren: navigator.clipboard.writeText mit den Zeilen des Blocks, mit \n verbunden. Danach
 * zeigt der Knopf kurz „Kopiert“ (keine Live-Region — die einzige gehört der Persona). Ohne
 * Clipboard-API oder bei Ablehnung wird der Code markiert und der Hinweis „Mit Strg+C kopieren“
 * eingeblendet.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/chat.js (renderAntwortText, kopiereBefehlsblock)
 * - public/leitstand/befehlsblock.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein DOM-Zugriff beim Import; nur kopiereBefehlsblock fasst das DOM an.
 * - Kein „Ins Terminal“, kein Ausführen (Bauauftrag WS-8b, Abschnitt 3).
 * - Bekannte Grenze (Prüfpass WS-8b, cr 2): renderVerlauf() ersetzt den Verlauf bei jedem Neuaufbau
 *   (z. B. Fortschritt eines laufenden Laufs). „Kopiert“, der Strg+C-Hinweis und die Markierung gehen
 *   dabei verloren; die Zwischenablage bleibt gefüllt. Akzeptiert, F-969.
 * - Ein Zaun muss am Zeilenanfang stehen; eingerückte Zäune (z. B. in Listen) bleiben Text (F-970).
 */

import { escapeHtml } from './render.js'
import { t, tHtml } from './i18n.js'

/** Öffner: ``` am Zeilenanfang, optional ein Sprach-Tag (nur Buchstaben, Ziffern, + _ -). */
const OEFFNER = /^```([A-Za-z0-9+_-]*)[ \t]*$/

/** Schließer: ``` am Zeilenanfang, sonst nichts. */
const SCHLIESSER = /^```[ \t]*$/

/** Platzhalter in einer Befehlszeile: <…> mit Inhalt, z. B. <commit-nachricht>. */
const PLATZHALTER = /<[^<>\s][^<>]*>/

/** Wie lange der Knopf nach dem Kopieren „Kopiert“ zeigt. */
const KOPIERT_MS = 2000

/** Laufender Rücksetz-Timer je Knopf — ein zweites Kopieren verlängert „Kopiert“, statt es zu früh zu beenden. */
const ruecksetzer = new WeakMap()

/**
 * Zerlegt einen Antworttext in Text- und Codesegmente.
 * @param text - Text des Feldes 'antwort'
 * @returns Liste von { art: 'text', text } und { art: 'code', sprache, zeilen }
 *   (sprache: Tag oder null; leere Textsegmente entfallen)
 */
export function zerlegeAntwort(text) {
  if (typeof text !== 'string' || text === '') return []
  const zeilen = text.split(/\r?\n/)
  const segmente = []
  let textZeilen = []
  const schliesseText = () => {
    const inhalt = textZeilen.join('\n')
    if (inhalt.trim() !== '') segmente.push({ art: 'text', text: inhalt.replace(/^\n+|\n+$/g, '') })
    textZeilen = []
  }
  let i = 0
  while (i < zeilen.length) {
    const oeffner = zeilen[i].match(OEFFNER)
    const ende = oeffner === null ? -1 : zeilen.findIndex((zeile, j) => j > i && SCHLIESSER.test(zeile))
    if (ende === -1) {
      textZeilen.push(zeilen[i])
      i++
      continue
    }
    schliesseText()
    segmente.push({ art: 'code', sprache: oeffner[1] === '' ? null : oeffner[1], zeilen: zeilen.slice(i + 1, ende) })
    i = ende + 1
  }
  schliesseText()
  return segmente
}

/**
 * Zahl der Befehle eines Blocks: nicht leere Zeilen.
 * @param zeilen - Zeilen des Blocks
 * @returns Anzahl
 */
export function zaehleBefehle(zeilen) {
  return zeilen.filter((zeile) => zeile.trim() !== '').length
}

/**
 * Enthält eine Zeile einen Platzhalter <…>?
 * @param zeilen - Zeilen des Blocks
 * @returns true bei mindestens einem Platzhalter
 */
export function hatPlatzhalter(zeilen) {
  return zeilen.some((zeile) => PLATZHALTER.test(zeile))
}

/**
 * Text, der beim Kopieren in die Zwischenablage geht: die Zeilen, mit \n verbunden.
 * @param zeilen - Zeilen des Blocks
 * @returns Text
 */
export function kopierText(zeilen) {
  return zeilen.join('\n')
}

/**
 * Rendert einen Codeblock als Befehlsblock.
 * @param segment - { sprache, zeilen } aus zerlegeAntwort
 * @returns HTML
 */
export function renderBefehlsblock(segment) {
  const etikett = segment.sprache === null ? t('befehl.etikettOhne') : segment.sprache.toUpperCase()
  const anzahl = zaehleBefehle(segment.zeilen)
  const chip = hatPlatzhalter(segment.zeilen) ? `<span class="befehlsblock-platzhalter">${tHtml('befehl.platzhalter')}</span>` : ''
  return `<div class="befehlsblock">
    <div class="befehlsblock-kopf">
      <span class="befehlsblock-etikett">${escapeHtml(etikett)}</span>
      <span class="befehlsblock-anzahl">${tHtml('befehl.anzahl', { anzahl })}</span>
      ${chip}
      <button type="button" class="button befehlsblock-kopieren" data-befehl-kopieren>${tHtml('befehl.kopieren')}</button>
    </div>
    <pre class="befehlsblock-code"><code>${segment.zeilen.map((zeile) => `<span class="befehlsblock-zeile">${escapeHtml(zeile)}</span>`).join('')}</code></pre>
    <p class="befehlsblock-hinweis" hidden>${tHtml('befehl.strgC')}</p>
  </div>`
}

/**
 * Rendert den Text des Feldes 'antwort': Textsegmente als Absätze (.chat-bubble-text), Codeblöcke
 * als Befehlsblöcke. Ohne Codeblock entsteht genau ein Absatz wie vor WS-8b.
 * @param text - Text des Feldes 'antwort'
 * @returns HTML
 */
export function renderAntwortText(text) {
  const segmente = zerlegeAntwort(text)
  if (segmente.length === 0) return `<p class="chat-bubble-text">${escapeHtml(text ?? '')}</p>`
  return segmente.map((segment) => (segment.art === 'code' ? renderBefehlsblock(segment) : `<p class="chat-bubble-text">${escapeHtml(segment.text)}</p>`)).join('')
}

/**
 * Markiert den Code eines Blocks und blendet den Hinweis „Mit Strg+C kopieren“ ein.
 * @param block - .befehlsblock
 */
function markiereZumKopieren(block) {
  const code = block.querySelector('code')
  const auswahl = globalThis.getSelection?.()
  if (code !== null && auswahl && typeof globalThis.document?.createRange === 'function') {
    const bereich = globalThis.document.createRange()
    bereich.selectNodeContents(code)
    auswahl.removeAllRanges()
    auswahl.addRange(bereich)
  }
  const hinweis = block.querySelector('.befehlsblock-hinweis')
  if (hinweis !== null) hinweis.hidden = false
}

/**
 * Klick auf „Kopieren“: schreibt den Code des Blocks in die Zwischenablage und zeigt kurz
 * „Kopiert“ im Knopf; ohne Clipboard-API oder bei Ablehnung markiert es den Code (s. Datei-Kopf).
 * @param knopf - der geklickte [data-befehl-kopieren]
 * @param zwischenablage - navigator.clipboard oder undefined (Parameter für den Test)
 * @returns Promise, erfüllt nach dem Versuch
 */
export async function kopiereBefehlsblock(knopf, zwischenablage = globalThis.navigator?.clipboard) {
  const block = knopf.closest('.befehlsblock')
  const code = block?.querySelector('code')
  if (!block || !code) return
  const zeilen = [...code.querySelectorAll('.befehlsblock-zeile')].map((zeile) => zeile.textContent ?? '')
  if (typeof zwischenablage?.writeText !== 'function') {
    markiereZumKopieren(block)
    return
  }
  try {
    await zwischenablage.writeText(kopierText(zeilen))
  } catch (fehler) {
    console.warn('Befehlsblock: Zwischenablage abgelehnt:', fehler)
    markiereZumKopieren(block)
    return
  }
  knopf.textContent = t('befehl.kopiert')
  clearTimeout(ruecksetzer.get(knopf))
  ruecksetzer.set(
    knopf,
    setTimeout(() => {
      knopf.textContent = t('befehl.kopieren')
    }, KOPIERT_MS)
  )
}
