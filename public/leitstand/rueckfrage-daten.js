/**
 * Datei: public/leitstand/rueckfrage-daten.js
 *
 * Zweck: Reine Daten-Logik des Rückfrage-Kanals im Leitstand (F45 B2b-3b-2b-2a-2, features/F45/plan-b2b3b2b2a2-v2.md): Instanz des
 * aktiven Laufs (Advisor V6), Maskierung täuschender Zeichen (F-1126 (3) Auflage B12, Advisor M4), Einträge für „Deine Entscheidungen“
 * aus GET …/rueckfragen und die Restzeit bis zur Wartegrenze. Kein DOM, kein fetch — in Node importierbar.
 *
 * Wird aufgerufen von:
 * - public/leitstand/rueckfrage-kanal.js (Abruf, Zustand, DOM)
 * - public/leitstand/rueckfrage-anzeige.js (Render der Karten)
 * - public/leitstand/rueckfrage-daten.test.mjs, scripts/check-f45-b2b3b2b2a2-anzeige.mjs
 *
 * Wichtig:
 * - Maskiert werden Steuer- und Formatzeichen (Unicode Cc, Cf, Cs, Zl, Zp) und die Markenzeichen ⟦ ⟧ selbst — sonst wäre eine echte
 *   Marke von einem wörtlich im Text stehenden „⟦U+202E⟧“ nur über die Klasse zu unterscheiden. Erhalten bleiben je nach Ort `\n`
 *   (Zeilenwechsel in Befehl und Frage) und `\t` (nur im Befehl). Grenze (DEKLARIERT, ARCHITECTURE §3): NBSP und andere Zs,
 *   Variationsselektoren und Homoglyphen bleiben unmaskiert.
 * - Alle Texte bleiben roh; escaped wird beim Rendern (rueckfrage-anzeige.js).
 */

/** Zeichen, die maskiert werden (ohne die je Ort erlaubten Leerraumzeichen). */
const MASKIERT = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}⟦⟧]/u

/** Was je Ort erhalten bleibt (alles andere aus MASKIERT wird zur Marke). */
export const ERHALTEN = Object.freeze({ befehl: '\n\t', frage: '\n', option: '' })

/**
 * Code-Punkt als „U+XXXX“.
 * @param zeichen - ein Zeichen (auch ein einzelnes Surrogat)
 * @returns Text
 */
function codePunkt(zeichen) {
  return `U+${(zeichen.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`
}

/**
 * Zerlegt einen Text in Abschnitte: Klartext und Masken täuschender Zeichen. Wirft nie.
 * @param text - beliebiger Wert (kein String ⇒ leer)
 * @param erhalten - Zeichen, die trotz MASKIERT bleiben (ERHALTEN.befehl | .frage | .option)
 * @returns Liste { text } | { maske: 'U+XXXX' }; benachbarter Klartext zusammengefasst
 */
export function zerlegeMitMasken(text, erhalten = '') {
  if (typeof text !== 'string') return []
  const teile = []
  let klar = ''
  for (const zeichen of text) {
    if (MASKIERT.test(zeichen) && !erhalten.includes(zeichen)) {
      if (klar !== '') teile.push({ text: klar })
      klar = ''
      teile.push({ maske: codePunkt(zeichen) })
    } else klar += zeichen
  }
  if (klar !== '') teile.push({ text: klar })
  return teile
}

/**
 * Ob ein Text mindestens ein maskiertes Zeichen enthält.
 * @param text - Text
 * @param erhalten - wie zerlegeMitMasken
 * @returns true bei mindestens einer Marke
 */
export function hatMasken(text, erhalten = '') {
  return zerlegeMitMasken(text, erhalten).some((teil) => 'maske' in teil)
}

/**
 * Instanz des aktiven Laufs (Advisor V6). `laufAktiv` je Registereintrag (GET /api/projekte) hängt am Laufordner im Kontrollzustand —
 * kurz nach dem Start kann er fehlen; dann gilt die Workforce-Instanz nur für diesen Takt (treffer: false), der nächste fragt erneut.
 * @param projekte - Registereinträge ({ id, laufAktiv }) oder etwas anderes (Register nicht lesbar)
 * @param aktiverLauf - zustand.aktiverLauf ({ aktiv, laufId })
 * @returns null ohne aktiven Lauf (auch laufId null: Projekt-Anlage), sonst { praefix, projektId | null, treffer }
 */
export function instanzPraefixDesLaufs(projekte, aktiverLauf) {
  if (aktiverLauf?.aktiv !== true || typeof aktiverLauf.laufId !== 'string' || aktiverLauf.laufId === '') return null
  const eintrag = Array.isArray(projekte) ? projekte.find((p) => p?.laufAktiv === true && typeof p.id === 'string' && p.id !== '') : undefined
  if (eintrag === undefined) return { praefix: '/api', projektId: null, treffer: false }
  return { praefix: `/api/projekte/${encodeURIComponent(eintrag.id)}`, projektId: eintrag.id, treffer: true }
}

/**
 * Zeilen und Zeichen eines Befehls (Zeilen = durch `\n` getrennte Abschnitte; ein leerer Befehl hat 1 Zeile).
 * @param befehl - Befehlstext
 * @returns { zeilen: string[], zeichen }
 */
export function befehlsZeilen(befehl) {
  const text = typeof befehl === 'string' ? befehl : ''
  return { zeilen: text.split('\n'), zeichen: [...text].length }
}

/** Nicht-leerer Text oder null. */
const text = (wert) => (typeof wert === 'string' && wert !== '' ? wert : null)

/**
 * Einträge der Gruppe „kanal“ in „Deine Entscheidungen“ aus GET …/rueckfragen (Feld rueckfragen). Felder für attention-daten.js
 * (art, id, titel, satz, hash, eintragHash) plus Kanal-Felder. Unvollständige Einträge (ohne id/frist) fallen weg.
 * @param rueckfragen - Liste der offenen Rückfragen oder etwas anderes
 * @param instanz - { praefix, projektId | null } der abgefragten Instanz
 * @returns Eintrag[] — { art: 'kanal', id, titel, satz: null, hash: null, eintragHash: null, typ: 'befehl' | 'rechte' | 'frage', laufId,
 *   toolName, befehl?, frage?, optionen?, seit, frist, praefix, projektId }
 */
export function baueKanalEintraege(rueckfragen, instanz) {
  if (!Array.isArray(rueckfragen)) return []
  return rueckfragen
    .filter((r) => text(r?.id) !== null && text(r?.frist) !== null)
    .map((r) => {
      const typ = r.art === 'frage' ? 'frage' : typeof r.befehl === 'string' ? 'befehl' : 'rechte'
      return {
        art: 'kanal',
        id: r.id,
        titel: typ === 'frage' ? 'frage_stefan' : (text(r.tool_name) ?? 'unbekannt'),
        satz: null,
        hash: null,
        eintragHash: null,
        typ,
        laufId: text(r.lauf_id),
        toolName: text(r.tool_name),
        ...(typ === 'befehl' ? { befehl: r.befehl } : {}),
        ...(typ === 'frage' ? { frage: typeof r.frage === 'string' ? r.frage : '', optionen: Array.isArray(r.optionen) ? r.optionen.filter((o) => typeof o === 'string') : [] } : {}),
        seit: text(r.seit),
        frist: r.frist,
        praefix: instanz?.praefix ?? '/api',
        projektId: instanz?.projektId ?? null,
      }
    })
}

/**
 * Zuletzt entschiedene Rückfragen aus GET …/rueckfragen (Feld entschieden); `nichtBrowser` markiert eine Antwort, die nicht aus dem
 * Browser kam (E-B7 — Hinweis, kein Schutz). Fehlt das Feld (älterer Server), ist die Liste leer.
 * @param entschieden - Liste oder etwas anderes
 * @returns Liste { id, laufId, art, toolName, befehl?, frage?, ergebnis, herkunft | null, nichtBrowser, antwort?, entschiedenAm }
 */
export function baueEntschiedene(entschieden) {
  if (!Array.isArray(entschieden)) return []
  return entschieden
    .filter((e) => text(e?.id) !== null && text(e?.ergebnis) !== null)
    .map((e) => ({
      id: e.id,
      laufId: text(e.lauf_id),
      art: e.art === 'frage' ? 'frage' : 'rechte',
      toolName: text(e.tool_name),
      ...(typeof e.befehl === 'string' ? { befehl: e.befehl } : {}),
      ...(typeof e.frage === 'string' ? { frage: e.frage } : {}),
      ergebnis: e.ergebnis,
      herkunft: text(e.herkunft),
      nichtBrowser: e.herkunft === 'nicht_browser',
      ...(typeof e.antwort === 'string' ? { antwort: e.antwort } : {}),
      entschiedenAm: text(e.entschieden_am),
    }))
}

/**
 * Restzeit bis zur Frist.
 * @param frist - ISO-Zeitpunkt
 * @param jetztMs - jetzt (Date.now()-Skala)
 * @returns { ms, abgelaufen, text: 'm:ss' } oder null bei ungültiger Frist
 */
export function restzeit(frist, jetztMs) {
  const ende = typeof frist === 'string' ? Date.parse(frist) : Number.NaN
  if (Number.isNaN(ende)) return null
  const ms = Math.max(0, ende - jetztMs)
  const sekunden = Math.ceil(ms / 1000)
  return { ms, abgelaufen: ms === 0, text: `${Math.floor(sekunden / 60)}:${String(sekunden % 60).padStart(2, '0')}` }
}

/**
 * Nächste Frist der offenen Rückfragen (für das Band).
 * @param offene - Kanal-Einträge
 * @param jetztMs - jetzt
 * @returns restzeit der frühesten Frist oder null ohne Einträge
 */
export function naechsteFrist(offene, jetztMs) {
  const zeiten = (Array.isArray(offene) ? offene : []).map((e) => restzeit(e.frist, jetztMs)).filter((r) => r !== null)
  if (zeiten.length === 0) return null
  return zeiten.reduce((a, b) => (b.ms < a.ms ? b : a))
}
