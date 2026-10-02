/**
 * Datei: public/leitstand/projektakte-anzeige.js
 *
 * Zweck: Reine Anzeigeregeln der Projektakte (F46 D1, docs/design/abgleich-f46.md §4.3) über der
 * Antwort von GET …/projektakte (scripts/leitstand/routen-projektakte.mjs):
 * - Abschnitte einer Markdown-Datei finden (abschnitte, abschnitt) — nur über Überschriftzeilen
 *   außerhalb von Codeblöcken (``` bzw. ~~~),
 *   '# …' bis '###### …' (Raute, Leerzeichen); eine Raute direkt vor einer Zahl (PR-Nummer im
 *   Fließtext) ist keine Überschrift.
 * - Text als Klartext-Absätze (absaetzeHtml): Leerzeilen trennen Absätze, Überschriften werden zu
 *   Zwischentiteln, Listenzeilen behalten ihren Umbruch. Alles escaped — kein Markdown-zu-HTML,
 *   keine Links, keine Hervorhebung (Sterne und Backticks bleiben als Zeichen stehen).
 * - Wer die Akte bekommt (AKTE_EMPFAENGER): Jarvis, Router und Product Coach bekommen den
 *   Projektkontext über baueProjektkontextAnfragen (scripts/leitstand-server.mjs); Architekt, Advisor,
 *   Builder und Review heute nicht (F-936, Fixpaket B2; der Builder liest nur CLAUDE.md über die
 *   Projekteinstellungen, nicht die Kontextdateien). projektakte-anzeige.test.mjs liest dafür den
 *   Serverquelltext und prüft, dass die Liste zum Code passt.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/projektakte.js
 * - public/leitstand/views/dashboard.js (versionsziel — Karte „Ziel dieser Version“)
 * - public/leitstand/projektakte-anzeige.test.mjs (node:test)
 *
 * Wichtig: Import-sicher, ohne DOM und Netz. Dateiinhalte sind Projektinhalte: nie übersetzt,
 * immer escaped.
 */

import { escapeHtml } from './render.js'

/**
 * Wer die Projektakte (Projektkontext) heute bekommt — eine Zeile je Rolle, bekommt true/false.
 * Muss dem Server entsprechen (Test). `rolle` ist die Schritt-/Lauf-Rolle aus src/rollen.
 */
export const AKTE_EMPFAENGER = Object.freeze([
  Object.freeze({ rolle: 'jarvis', bekommt: true }),
  Object.freeze({ rolle: 'router', bekommt: true }),
  Object.freeze({ rolle: 'product-coach', bekommt: true }),
  Object.freeze({ rolle: 'architekt', bekommt: false }),
  Object.freeze({ rolle: 'architecture-advisor', bekommt: false }),
  Object.freeze({ rolle: 'ausfuehrung', bekommt: false }),
  Object.freeze({ rolle: 'code-reviewer', bekommt: false }),
])

/** Überschriftzeile: eine bis sechs Rauten, dann Leerraum und Text. */
const UEBERSCHRIFT = /^(#{1,6})\s+(.*\S)\s*$/

/** Zaun eines Markdown-Codeblocks (drei Backticks oder Tilden) — Zeilen darin sind nie Überschriften. */
const CODEZAUN = /^\s*(```|~~~)/

/** Listenzeile: '- ', '* ' oder '1. '. */
const LISTENZEILE = /^\s*(?:[-*]|\d+\.)\s+/

/**
 * Teilt einen Text an seinen Überschriften.
 * @param text - Dateiinhalt
 * @returns [{ titel: string | null, ebene: 0–6, text: Inhalt bis zur nächsten Überschrift }]; der Teil vor der ersten Überschrift hat titel null und ebene 0
 */
export function abschnitte(text) {
  const liste = [{ titel: null, ebene: 0, zeilen: [] }]
  let imCodeblock = false
  for (const zeile of String(text ?? '').split(/\r?\n/)) {
    if (CODEZAUN.test(zeile)) imCodeblock = !imCodeblock
    const treffer = imCodeblock ? null : zeile.match(UEBERSCHRIFT)
    if (treffer !== null) liste.push({ titel: treffer[2], ebene: treffer[1].length, zeilen: [] })
    else liste[liste.length - 1].zeilen.push(zeile)
  }
  return liste.map(({ titel, ebene, zeilen }) => ({ titel, ebene, text: zeilen.join('\n').trim() }))
}

/**
 * Inhalt GENAU eines Abschnitts mit dieser Überschrift (Groß-/Kleinschreibung egal).
 * @param text - Dateiinhalt
 * @param titel - Überschrift ohne Rauten, z. B. 'Für wen'
 * @returns Text des Abschnitts, oder null, wenn es keinen oder mehrere gibt oder er leer ist
 */
export function abschnitt(text, titel) {
  const gesucht = titel.trim().toLowerCase()
  const treffer = abschnitte(text).filter((a) => a.titel !== null && a.titel.trim().toLowerCase() === gesucht)
  return treffer.length === 1 && treffer[0].text !== '' ? treffer[0].text : null
}

/**
 * Text ab der ersten Überschrift der Ebene 2 (lässt Dateititel und Einleitung weg).
 * @param text - Dateiinhalt
 * @returns [{ titel, text }] der Abschnitte ab Ebene 2; leer, wenn es keine gibt
 */
export function hauptabschnitte(text) {
  return abschnitte(text).filter((a) => a.ebene === 2)
}

/**
 * Klartext als Absätze (escaped). Leerzeilen trennen Absätze; Zeilen eines Absatzes werden mit
 * Leerzeichen verbunden, Listenzeilen behalten ihren Zeilenumbruch (Klasse .akte-text: white-space:
 * pre-line). Überschriften werden zu Zwischentiteln (p.akte-zwischentitel), ohne Rauten.
 * @param text - Klartext (Dateiinhalt oder Abschnitt)
 * @returns HTML
 */
export function absaetzeHtml(text) {
  const bloecke = []
  let aktuell = []
  const abschliessen = () => {
    if (aktuell.length > 0) bloecke.push({ art: 'absatz', zeilen: aktuell })
    aktuell = []
  }
  let imCodeblock = false
  for (const zeile of String(text ?? '').split(/\r?\n/)) {
    if (CODEZAUN.test(zeile)) imCodeblock = !imCodeblock
    const ueberschrift = imCodeblock ? null : zeile.match(UEBERSCHRIFT)
    if (ueberschrift !== null) {
      abschliessen()
      bloecke.push({ art: 'titel', zeilen: [ueberschrift[2]] })
    } else if (zeile.trim() === '') abschliessen()
    else aktuell.push(zeile.trim())
  }
  abschliessen()
  return bloecke
    .map((b) => {
      if (b.art === 'titel') return `<p class="akte-zwischentitel">${escapeHtml(b.zeilen[0])}</p>`
      const inhalt = b.zeilen.reduce((summe, zeile, i) => (i === 0 ? zeile : `${summe}${LISTENZEILE.test(zeile) ? '\n' : ' '}${zeile}`), '')
      return `<p class="akte-text">${escapeHtml(inhalt)}</p>`
    })
    .join('')
}

/**
 * Zustand einer Datei aus der Antwort.
 * @param antwort - Antwort von GET …/projektakte, null (lädt) oder { status: 'fehler' } nach einem Wurf
 * @param schluessel - 'beschreibung' | 'anweisungen' | 'lagebild' | 'zielfassung' | 'roadmap'
 * @returns { zustand: 'laedt' | 'ok' | 'fehlt' | 'fehler', datei: Eintrag oder null }
 */
export function dateiZustand(antwort, schluessel) {
  if (antwort === null || antwort === undefined) return { zustand: 'laedt', datei: null }
  const datei = antwort?.dateien?.[schluessel]
  if (datei === null || typeof datei !== 'object') return { zustand: 'fehler', datei: null }
  if (datei.status === 'ok' || datei.status === 'fehlt') return { zustand: datei.status, datei }
  return { zustand: 'fehler', datei }
}

/**
 * Das Versionsziel der Antwort, wenn es eindeutig gefunden wurde.
 * @param antwort - Antwort von GET …/projektakte (oder null/Fehlerform)
 * @returns { meilenstein, zielsatz, kriterien: string[] | null } oder null
 */
export function versionsziel(antwort) {
  const ziel = antwort?.versionsziel
  if (ziel?.status !== 'ok' || typeof ziel.zielsatz !== 'string' || ziel.zielsatz.trim() === '') return null
  return { meilenstein: typeof ziel.meilenstein === 'string' ? ziel.meilenstein : null, zielsatz: ziel.zielsatz, kriterien: Array.isArray(ziel.kriterien) && ziel.kriterien.length > 0 ? ziel.kriterien.filter((k) => typeof k === 'string') : null }
}
