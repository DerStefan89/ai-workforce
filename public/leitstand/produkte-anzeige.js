/**
 * Datei: public/leitstand/produkte-anzeige.js
 *
 * Zweck: Reine Anzeigeregeln der Seite „Alle Produkte“ (F44 WS-6a, Vorlage V10 d_projekte und
 * d_projekt_neu, Abgleich F-725 H1–H7): ID-Ableitung aus dem Produktnamen, Lage einer Karte
 * (Statuschip und Hinweis), Kennzahlen aus Roadmap bzw. Zustand und offenen Workitems je Projekt
 * und der Kurzstand der Vorschau für die Technik-Klappe. Ohne DOM und ohne eigenen Netzabruf, damit
 * node:test die Regeln direkt prüft (produkte-anzeige.test.mjs).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/projekte-uebersicht.js
 * - public/leitstand/produkte-anzeige.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: attention-daten.js zieht api.js nach, beide greifen beim Import weder auf DOM
 *   noch auf Netz zu.
 * - Projektdaten (Name, vision, Pfad, Status, grund) bleiben roh; escapen ist Sache der View.
 */

import { baueEntscheidungen, waehleP0P1 } from './attention-daten.js'
import { roadmapZustand, zaehleRoadmap } from './roadmap-anzeige.js'

/**
 * Höchstlänge einer neuen Projekt-ID (Server: NEUE_PROJEKT_ID_MUSTER `^[a-z0-9][a-z0-9-]{1,40}$`,
 * src/projekt-anlegen/index.ts) — die Ableitung kürzt darauf, statt eine ID vorzuschlagen, die der
 * Server sicher ablehnt.
 */
export const PROJEKT_ID_MAX = 41

/** Umlaute und ß in der Schreibweise, die ein Bindestrich-Slug lesbar hält. */
const ERSATZ = [
  ['ä', 'ae'],
  ['ö', 'oe'],
  ['ü', 'ue'],
  ['ß', 'ss'],
]

/** Mindestlänge einer neuen Projekt-ID (NEUE_PROJEKT_ID_MUSTER verlangt zwei Zeichen). */
export const PROJEKT_ID_MIN = 2

/**
 * Leitet aus einem Produktnamen eine Projekt-ID ab: Kleinbuchstaben, ä→ae, ö→oe, ü→ue, ß→ss, danach
 * übrige Akzente entfernt (ç→c, ş→s, é→e; ı→i — F44 WS-6a, Korrekturrunde: tr ist eine UI-Sprache),
 * jedes andere Zeichen außer [a-z0-9] → „-“, mehrere „-“ zusammengefasst, Ränder ohne „-“, gekürzt auf
 * PROJEKT_ID_MAX. Ergibt sich weniger als PROJEKT_ID_MIN Zeichen (z. B. ein kyrillischer Name oder
 * „X“), ist das Ergebnis '' — dann muss die ID von Hand kommen, statt dass der Server sicher ablehnt.
 * @param name - Produktname (beliebiger Wert)
 * @returns ID im Muster `^[a-z0-9][a-z0-9-]{1,40}$` oder ''
 */
export function leiteProjektIdAb(name) {
  let text = typeof name === 'string' ? name.toLowerCase() : ''
  for (const [zeichen, ersatz] of ERSATZ) text = text.replaceAll(zeichen, ersatz)
  text = text.replaceAll('ı', 'i').normalize('NFD').replace(/\p{M}/gu, '')
  const slug = text
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, PROJEKT_ID_MAX)
    .replace(/-+$/, '')
  return slug.length >= PROJEKT_ID_MIN ? slug : ''
}

/**
 * Lage einer Produktkarte: offene Entscheidungen gehen vor einem laufenden Lauf, sonst „bereit“.
 * Solange die Zahl der Entscheidungen fehlt (lädt oder nicht ladbar), entscheidet nur laufAktiv.
 * @param entscheidungen - Anzahl, oder null/undefined, wenn unbekannt
 * @param laufAktiv - aus GET /api/projekte
 * @returns { lage: 'entscheidung' | 'laeuft' | 'bereit', chipKlasse: CSS-Klasse der Statuszeile (.ablauf-status) }
 */
export function kartenLage(entscheidungen, laufAktiv) {
  if (typeof entscheidungen === 'number' && entscheidungen > 0) return { lage: 'entscheidung', chipKlasse: 'warten' }
  if (laufAktiv === true) return { lage: 'laeuft', chipKlasse: '' }
  return { lage: 'bereit', chipKlasse: 'neutral' }
}

/**
 * Text einer Fehlerliste aus einem Projektions-Körper ([{ quelle, grund }] oder Strings).
 * @param fehler - Liste oder etwas anderes
 * @returns Rohtext, '' ohne Einträge
 */
function fehlerText(fehler) {
  if (!Array.isArray(fehler)) return ''
  return fehler.map((f) => (f !== null && typeof f === 'object' ? [f.quelle, f.grund].filter((teil) => typeof teil === 'string' && teil !== '').join(': ') : String(f))).join('; ')
}

/**
 * Kennzahlen aus einer Antwort von GET /api/projekte/<id>/roadmap (Ziel und Ring). Ohne Roadmap
 * (nicht_vorhanden) gilt 0/0 und kein Ziel; eine ungültige oder fehlerhafte Antwort ist ein Fehler
 * mit Grund — nie „keine Roadmap“ (F-854).
 * @param antwort - geparste Antwort, oder { status: 'fehler', grund } nach einem Wurf
 * @returns { ok: true, abgenommen, gesamt, vision: Rohtext oder null } oder { ok: false, grund }
 */
export function roadmapKennzahlen(antwort) {
  const zustand = roadmapZustand(antwort)
  if (zustand === 'ok') {
    const vision = typeof antwort.vision === 'string' && antwort.vision.trim() !== '' ? antwort.vision : null
    return { ok: true, ...zaehleRoadmap(antwort), vision }
  }
  if (zustand === 'nicht_vorhanden') return { ok: true, abgenommen: 0, gesamt: 0, vision: null }
  if (zustand === 'ungueltig') return { ok: false, grund: fehlerText(antwort.fehler) }
  const grund = antwort !== null && typeof antwort === 'object' && typeof antwort.grund === 'string' ? antwort.grund : ''
  return { ok: false, grund }
}

/**
 * Zahl der offenen Entscheidungen eines Projekts — dieselbe Auswahl wie „Deine Entscheidungen“
 * (baueEntscheidungen über Zustand und offene P0/P1-Workitems). Ist eine Quelle defekt, gibt es
 * keine Zahl, sondern den Grund.
 * @param zustand - Antwort von GET /api/projekte/<id>/zustand
 * @param workitemsAntwort - Antwort von GET /api/projekte/<id>/workitems?status=OFFEN
 * @returns { ok: true, anzahl } oder { ok: false, grund }
 */
export function entscheidungsKennzahl(zustand, workitemsAntwort) {
  if (zustand === null || typeof zustand !== 'object' || workitemsAntwort === null || typeof workitemsAntwort !== 'object') return { ok: false, grund: '' }
  const { workitems, fehler } = waehleP0P1({ ...workitemsAntwort, workitems: Array.isArray(workitemsAntwort.workitems) ? workitemsAntwort.workitems : null })
  const ergebnis = baueEntscheidungen(zustand, workitems)
  if (ergebnis.defekt) return { ok: false, grund: [fehlerText(zustand.fehler), fehlerText(fehler)].filter((teil) => teil !== '').join('; ') }
  return { ok: true, anzahl: ergebnis.eintraege.length }
}

/**
 * Kurzstand der Vorschau für die Zusammenfassung der Technik-Klappe (F43, F-849) — nur aus
 * daten.vorschau abgeleitet; den Öffnen-Link baut allein renderVorschau (projekt-aufruf-anzeige.js).
 * @param vorschau - VorschauStatus aus GET …/projekt-aufruf, oder null solange geprüft wird
 * @returns 'laedt' | 'nichtGesetzt' | 'gesperrt' | 'erreichbar' | 'nichtErreichbar'
 */
export function vorschauKurzstand(vorschau) {
  if (vorschau === null || vorschau === undefined) return 'laedt'
  if (vorschau.url === null) return 'nichtGesetzt'
  // F-849: vorschau_url auf dem Leitstand-Port — der Server fragt sie nicht an (erreichbar null).
  if (vorschau.erreichbar === null) return 'gesperrt'
  return vorschau.erreichbar === true ? 'erreichbar' : 'nichtErreichbar'
}
