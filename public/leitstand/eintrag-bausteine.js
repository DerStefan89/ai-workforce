/**
 * Datei: public/leitstand/eintrag-bausteine.js
 *
 * Zweck: Gemeinsame Bausteine „Kurz gesagt“, „Status-Block“ und „Jetzt-Band“ (F46 D3,
 * docs/design/abgleich-f46.md §1 „Gemeinsame Bausteine“, Leitprinzip Ebene 1 und 2; Bilder
 * 07-eintrag-detail--Main und --Bug). Erster Verbraucher ist das Detail `#/workboard/<id>`
 * (views/workboard-detail.js); D4 und D5 verwenden sie wieder. Dazu zwei reine Lesehilfen für
 * Register-Felder: die eindeutige Fundstelle eines Befunds (findeFundstellenPfad) und die Befunde,
 * deren Feld „Feature/Run“ eine Feature-ID nennt (befundeAusFeature).
 *
 * Die Bausteine formulieren nichts selbst (Regel 8 des Abgleichs): Sie setzen nur Texte zusammen,
 * die der Aufrufer aus Daten gebildet hat. Ein fehlender Wert (null) erscheint als Badge „kommt“
 * (kommt.js), nie als erfundener Wert. Kürzen (kuerzeText) schneidet nur ab, es formuliert nicht um.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workboard-detail.js
 * - public/leitstand/eintrag-bausteine.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein DOM, kein Netz — in Node testbar.
 * - Werte kommen als fertiges, bereits escaptes HTML (…Html) oder als Text, der hier escaped wird.
 * - Genau ein Hauptknopf: Das Jetzt-Band trägt höchstens einen gefüllten Knopf (Leitprinzip).
 */

import { tHtml } from './i18n.js'
import { kommtBadge } from './kommt.js'
import { escapeHtml } from './render.js'

/** Standardlänge einer Zeile in „Kurz gesagt“ (Zeichen). */
export const KURZ_MAX = 220

/** Text endet auf eine gängige Abkürzung oder einen einzelnen Buchstaben (der folgende Punkt ist kein Satzende). */
const ABKUERZUNG_VOR_PUNKT = /(?:^|[\s(])(?:bzw|ggf|vgl|usw|etc|ca|inkl|evtl|bspw|Nr|Abs|[A-Za-zÄÖÜäöü])$/

/**
 * Kürzt einen Projekttext für „Kurz gesagt“, ohne ihn umzuformulieren: erster Absatz, davon der
 * erste Satz (Ende an . ! ? vor Leerraum); ist er länger als max, Schnitt an der letzten
 * Wortgrenze mit „…“.
 * @param text - Rohtext (Akte, Register) oder null
 * @param max - höchste Länge in Zeichen
 * @returns gekürzter Text, oder null ohne Inhalt
 */
export function kuerzeText(text, max = KURZ_MAX) {
  if (typeof text !== 'string') return null
  const absatz = text.trim().split(/\n\s*\n/)[0].replace(/\s+/g, ' ').trim()
  if (absatz === '') return null
  // Satzende: . ! ? vor Leerraum oder Textende — nicht nach einer Abkürzung („bzw.“, „z. B.“) oder
  // einem einzelnen Buchstaben, sonst endete der Satz mitten im Gedanken ohne „…“.
  const satzEnde = [...absatz.matchAll(/[.!?](?=\s|$)/g)].find((m) => m[0] !== '.' || !ABKUERZUNG_VOR_PUNKT.test(absatz.slice(0, m.index)))
  const satz = satzEnde === undefined ? absatz : absatz.slice(0, satzEnde.index + 1)
  if (satz.length <= max) return satz
  const schnitt = satz.slice(0, max)
  const leer = schnitt.lastIndexOf(' ')
  return `${(leer > max / 2 ? schnitt.slice(0, leer) : schnitt).replace(/[\s,;:–-]+$/, '')} …`
}

/**
 * „Kurz gesagt“: drei Zeilen (was, gerade, als Nächstes).
 * @param zeilen - [{ label: Text (übersetzt), wertHtml: fertiges HTML oder null (→ „kommt“) }]
 * @param idPraefix - Präfix der Überschrift-ID (`<präfix>-titel`); eine zweite Sicht im DOM braucht ein eigenes
 * @returns HTML
 */
export function kurzGesagtHtml(zeilen, idPraefix = 'kurz-gesagt') {
  const zeile = ({ label, wertHtml }) => `<p class="kurz-zeile"><strong>${escapeHtml(label)}</strong> ${wertHtml ?? kommtBadge()}</p>`
  const id = `${escapeHtml(idPraefix)}-titel`
  return `<section class="kurz-gesagt" aria-labelledby="${id}">
      <h2 id="${id}" class="kurz-gesagt-titel">${tHtml('eintrag.kurz.titel')}</h2>
      ${zeilen.map(zeile).join('')}
    </section>`
}

/** Erlaubte Töne der Kopfzeile des Status-Blocks (Farbe nur über Tokens, Text trägt die Bedeutung). */
const STATUS_TOENE = new Set(['ok', 'aktiv', 'warten', 'offen', 'neutral'])

/**
 * Status-Block: Kopfzeile (Punkt + Statustext) und eine Liste Schlüssel → Wert.
 * @param block - { kopfHtml: Statustext als HTML, ton: 'ok' | 'aktiv' | 'warten' | 'offen' | 'neutral',
 *   zeilen: [{ schluessel: Text (übersetzt), wertHtml: fertiges HTML oder null (→ „kommt“) }] }
 * @returns HTML
 */
export function statusBlockHtml({ kopfHtml, ton, zeilen }) {
  const t0 = STATUS_TOENE.has(ton) ? ton : 'neutral'
  const eintraege = zeilen.map(({ schluessel, wertHtml }) => `<dt>${escapeHtml(schluessel)}</dt><dd>${wertHtml ?? kommtBadge()}</dd>`).join('')
  return `<section class="status-block" data-ton="${t0}" aria-label="${tHtml('eintrag.status.titel')}">
      <p class="status-block-kopf"><span class="status-block-punkt" aria-hidden="true"></span><span>${kopfHtml}</span></p>
      <dl class="status-block-liste">${eintraege}</dl>
    </section>`
}

/**
 * Jetzt-Band (Leitprinzip Ebene 2). Zwei Formen:
 * - 'dran': Stefan ist dran — Eyebrow „Jetzt · Deine Entscheidung“, Titel, Satz und höchstens EIN
 *   Hauptknopf (Link); optional weitere, nicht gefüllte Knöpfe (nebenHtml, z. B. „kommt“).
 * - 'ruhig': eine ruhige Zeile „Gerade wartet nichts auf dich.“, optional ein Satz und ein Link.
 * @param band - { zustand: 'dran', titel, text, knopf: { href, text } | null, nebenHtml? }
 *   | { zustand: 'ruhig', text?: Text, link?: { href, text }, ohneSatz?: true — nur der Text, ohne
 *       „Gerade wartet nichts auf dich.“ (etwa solange der Stand noch lädt) }
 * @param idPraefix - Präfix der Überschrift-ID (`<präfix>-titel`); eine zweite Sicht im DOM braucht ein eigenes
 * @returns HTML
 */
export function jetztBandHtml(band, idPraefix = 'jetzt-band') {
  const id = `${escapeHtml(idPraefix)}-titel`
  if (band?.zustand === 'dran') {
    const knopf = band.knopf ? `<a class="button primary jetzt-band-knopf" href="${escapeHtml(band.knopf.href)}">${escapeHtml(band.knopf.text)} <span aria-hidden="true">→</span></a>` : ''
    const neben = typeof band.nebenHtml === 'string' && band.nebenHtml !== '' ? `<div class="jetzt-band-neben">${band.nebenHtml}</div>` : ''
    return `<section class="jetzt-band-dran" aria-labelledby="${id}">
        <div class="jetzt-band-text">
          <p class="jetzt-band-eyebrow">${tHtml('eintrag.jetzt.eyebrow')}</p>
          <h2 id="${id}">${escapeHtml(band.titel)}</h2>
          ${band.text ? `<p>${escapeHtml(band.text)}</p>` : ''}
        </div>
        ${knopf}${neben}
      </section>`
  }
  const text = typeof band?.text === 'string' && band.text !== '' ? escapeHtml(band.text) : ''
  const satz = band?.ohneSatz === true ? text : `<strong>${tHtml('eintrag.jetzt.ruhig')}</strong>${text !== '' ? ` ${text}` : ''}`
  const link = band?.link ? `<a class="text-link" href="${escapeHtml(band.link.href)}">${escapeHtml(band.link.text)}</a>` : ''
  return `<p class="jetzt-band-ruhig"><span class="jetzt-band-punkt" aria-hidden="true"></span><span>${satz}</span>${link}</p>`
}

/**
 * Feld „Fundstelle“ als HTML: Abschnitte in Backticks als <code>, der übrige Text als Text — der
 * Rohwert bleibt, nur die Markdown-Zeichen verschwinden aus der Anzeige.
 * @param fundstelle - Rohtext des Feldes
 * @returns HTML (escaped)
 */
export function fundstelleHtml(fundstelle) {
  return String(fundstelle ?? '')
    .split(/`([^`\n]+)`/)
    .map((teil, i) => (i % 2 === 1 ? `<code>${escapeHtml(teil)}</code>` : escapeHtml(teil)))
    .join('')
}

/** Ein Repo-relativer Dateipfad mit Ordner und Endung, optional :Zeile — ohne Laufwerk, ohne führenden Schrägstrich, ohne '..'; ein gepunkteter Bezeichner (`abnahme.offen`) ist kein Pfad. */
const PFAD_MUSTER = /^((?:[\w.-]+\/)+[\w-][\w.-]*\.[A-Za-z0-9]+)(?::(\d+))?$/

/**
 * Die eindeutige Fundstelle eines Befunds (Feld „Fundstelle“): Kandidaten sind die Werte in
 * Backticks, ohne Backticks der ganze Text. Gültig ist ein Kandidat, der PFAD_MUSTER erfüllt und
 * kein '..'-Segment trägt. Eindeutig heißt: genau ein Dateipfad (Zeilen zählen nicht mit); die
 * Zeile gilt nur, wenn alle Nennungen dieses Pfads dieselbe Zeile tragen.
 * @param fundstelle - Rohtext des Feldes oder null
 * @returns { pfad, zeile: Zahl oder null } oder null, wenn kein bzw. mehr als ein Pfad
 */
export function findeFundstellenPfad(fundstelle) {
  if (typeof fundstelle !== 'string' || fundstelle.trim() === '') return null
  const inBackticks = [...fundstelle.matchAll(/`([^`\n]+)`/g)].map((t0) => t0[1].trim())
  const kandidaten = inBackticks.length > 0 ? inBackticks : [fundstelle.trim()]
  const treffer = kandidaten.map((k) => k.match(PFAD_MUSTER)).filter((m) => m !== null && !m[1].split('/').includes('..'))
  const pfade = new Set(treffer.map((m) => m[1]))
  if (pfade.size !== 1) return null
  const zeilen = new Set(treffer.map((m) => m[2] ?? null))
  const [zeile] = [...zeilen]
  return { pfad: treffer[0][1], zeile: zeilen.size === 1 && zeile !== null ? Number(zeile) : null }
}

/**
 * Trifft die Feature-ID als eigenes Wort im Text („F46 D2“, „F46,“ — nicht „F460“, „F46a“, „F-46“).
 * @param text - Rohtext (z. B. Feld „Feature/Run“) oder null
 * @param featureId - Feature-ID (^F[0-9]+[A-Za-z]?$)
 * @returns true bei einem Treffer
 */
export function nenntFeature(text, featureId) {
  if (typeof text !== 'string' || typeof featureId !== 'string' || featureId === '') return false
  const id = featureId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![A-Za-z0-9-])${id}(?![A-Za-z0-9])`).test(text)
}

/**
 * Befunde aus einem Feature: nur Findings, deren Feld „Feature/Run“ (featureRun) die Feature-ID
 * nennt (nenntFeature) — die einzige maschinenlesbare Zuordnung im Register.
 * @param workitems - GET …/workitems (ungefiltert) oder null/undefined
 * @param featureId - ID des Features
 * @returns { offen, gesamt, ids: IDs in Register-Reihenfolge, neueste zuletzt } oder null ohne Liste
 */
export function befundeAusFeature(workitems, featureId) {
  if (!Array.isArray(workitems)) return null
  const treffer = workitems.filter((w) => w?.quelle === 'finding' && nenntFeature(w.featureRun, featureId))
  return { offen: treffer.filter((w) => w.status === 'OFFEN').length, gesamt: treffer.length, ids: treffer.map((w) => w.id) }
}
