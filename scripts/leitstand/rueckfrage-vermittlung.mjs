/**
 * Datei: scripts/leitstand/rueckfrage-vermittlung.mjs
 *
 * Zweck: Vermittlung des Rückfrage-Kanals im Leitstand (F45 B2b-3b-1a, features/F45/plan-b2b3b1a-v2.md §3). Hält je Lauf
 * ein Token und die Warteschlange der Rückfragen (Rechte-Anfragen der CLI über `rechte_pruefen`, Fragen über
 * `frage_stefan`), entscheidet Rechte-Anfragen zuerst über die reine Vorentscheidung (src/rueckfrage) und nimmt nur einen
 * Bash-Befehl in die Warteschlange; Stefan antwortet über den Browser.
 *
 * Grenzen:
 * - Nur Speicher, kein I/O. Das Protokoll geht über den Rückruf `protokolliere(laufId, eintrag, { arbeitsordner, ab, eintraege })`
 *   an den Server; die Vermittlung führt je Lauf die vollständige Eintragsliste und übergibt seit B2b-3b-2b-1a nur die noch
 *   nicht geschriebenen Einträge ab Index `ab` — der Schreiber (scripts/leitstand/rueckfrage-protokoll.mjs) registriert daraus die
 *   nächste Version des Kern-Artefakts (Schema v1, nur Zuwachs), ohne zu laden; ein fehlgeschlagener Schreibvorgang wird mit der
 *   nächsten Entscheidung nachgeholt. Ein Wurf des Rückrufs ändert keine Entscheidung. Grenze (Advisor B10/D13): wirft der
 *   Rückruf erst nach dem Schreiben, oder wird dieselbe laufId neu geöffnet, entsteht eine Lücke ⇒ die Auswertung verwirft das
 *   Protokoll (VERWEIGERT, über R3 sichtbar).
 * - Token: nur zum Fragen (`stelle`, `warte`), nie zum Antworten — `beantworte` kennt kein Token (ERZWUNGEN über die Routen).
 *   Gültig nur zwischen `oeffneLauf` und `beendeLauf`.
 * - auto_deny entsteht ohne Warteschlangeneintrag; jede `tool_use_id` eines Laufs wird gemerkt, eine zweite Anfrage mit
 *   derselben id wird automatisch abgelehnt (Vorbereitung A6, Delta-Pass H5).
 * - Bash nur „einmal erlauben“ oder „ablehnen“ (kein „immer“, E-B2b-3-1 = A). Jede Rückfrage genau einmal beantwortbar.
 * - Wartegrenze je Rückfrage (Standard 10 min) ⇒ automatische Ablehnung; beim Lauf-Ende werden offene abgelehnt.
 * - Eine Entscheidung bleibt bis `beendeLauf` erhalten: ein Long-Poll nach der Antwort bekommt sie noch (A7).
 * - B2b-3b-2a: `eintraegeVon` ist der Speicherstand des Protokolls und damit die Quelle der Wahrheit für die Auswertung (F-1128
 *   (1)); je Lauf höchstens MAX_OFFENE_JE_LAUF unentschiedene Rückfragen und MAX_PROTOKOLL_JE_LAUF Einträge (F-1126 (2),
 *   F-1128 (5)). Seit B2b-3b-2b-1a schreibt jede Version nur ihren Zuwachs (200 Einträge ⇒ 200 Eintragskopien statt 20 100).
 * - B2b-3b-2b-1a: `zugang(laufId, melde)` bündelt für den Controller Speicherstand und Meldung einer Abweichung (R3, Startfehlerliste
 *   des Servers); `beendeLauf` liefert die Zahl der Ablehnungen durch Stefan (R2, Löschliste); `beantworte` merkt je Antwort die
 *   Herkunft (E-B7, `herkunftDerAntwort`) — Hinweis, kein Schutz: jeder lokale Prozess kann antworten (DEKLARIERT).
 * - B2b-3b-2b-1b (F-1128 R1): jede Ablehnung durch Stefan bekommt einen eigenen Text (`ablehnungstextStefan`, mit Ref); er geht als
 *   `message` an den Warter (MCP-Skript ⇒ CLI), Protokoll und Speicherstand tragen nur `ablehnung_hash`. Die Auswertung zählt die
 *   Ablehnung nur, wenn das tool_result der CLI genau diesen Text trägt (src/rueckfrage/protokoll.ts).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (Routen /api/rueckfrage/…, /api/rueckfragen…, starteLaufUndVergiss,
 * laufOptionen.rueckfrageZugang), scripts/check-f45-b2b3b1-rueckfrage.mjs, scripts/check-f45-b2b3b2a-absicherung.mjs,
 * scripts/check-f45-b2b3b2b1a-rest.mjs, scripts/check-f45-b2b3b2b1b-r1.mjs, scripts/check-f45-b2b3b2b2a-einschalten.mjs (Dispatcher-Fall (d)),
 * scripts/leitstand/rueckfrage-vermittlung.test.mjs. Seit B2b-3b-2b-2a-1 liefert `zugang` zusätzlich `zaehlung()` und `abweichung()` (daten der
 * Terminalmarke über den Controller); seit B2b-3b-2b-2a-3 zählt `zaehlung()` auch die unbeantworteten (F-1132 (1)). Seit B2b-3b-2b-2a-2 (features/F45/plan-b2b3b2b2a2-v2.md, Advisor M3/M11) liefert `entschiedene()`
 * die letzten ENTSCHIEDEN_MAX Entscheidungen von Warteschlangeneinträgen (auch beendeter Läufe, nur Speicher, nach Neustart leer) für
 * GET /api/rueckfragen (Feld `entschieden`, scripts/check-f45-b2b3b2b2a2-anzeige.mjs); Befehl und freie Antwort darin maskiert
 * (maskiereGeheimnisse) — ohne Token für jeden lokalen Prozess lesbar wie die offene Liste (DEKLARIERT, ARCHITECTURE §3).
 */

import { randomUUID, timingSafeEqual } from 'node:crypto'
import { kanonischesJson, sha256Hex } from '../../src/checkpoint-store/index.ts'
import { vorentscheidung } from '../../src/rueckfrage/index.ts'
import { RUECKFRAGE_HERKUENFTE, RUECKFRAGE_PROTOKOLL_ARTEN, toolNameFuerProtokoll } from '../../src/rueckfrage/protokoll.ts'
import { maskiereGeheimnisse } from './geheimnisse-maskieren.mjs'

/** Wartegrenze je Rückfrage (Auftrag: 10 min). */
export const WARTE_GRENZE_MS = 600000
/** Höchstdauer eines Long-Polls; danach `{ offen: true }` und das Skript fragt erneut. */
export const POLL_FENSTER_MS = 25000
/** Antworttext an das Modell, wenn eine Frage ohne Antwort endet. */
export const KEINE_ANTWORT = 'keine Antwort von Stefan'
/** Höchstlänge einer Frage bzw. Antwort in Zeichen. */
export const TEXT_MAX_ZEICHEN = 2000
/** Höchstzahl und -länge der Optionen einer Frage. */
export const OPTIONEN_MAX = 10
export const OPTION_MAX_ZEICHEN = 500
/** Höchstlänge einer tool_use_id. */
const ID_MAX_ZEICHEN = 200
/** F45 B2b-3b-2a (F-1126 (2)): höchstens so viele gleichzeitig offene (unentschiedene) Rückfragen je Lauf. */
export const MAX_OFFENE_JE_LAUF = 20
/**
 * F45 B2b-3b-2a (F-1128 (5)): höchstens so viele Protokolleinträge je Lauf, auch auto_deny. Jede offene Rückfrage hält einen
 * Platz für ihre Entscheidung frei (Invariante: Einträge + offene ≤ Grenze); darüber wird ohne Eintrag abgelehnt.
 */
export const MAX_PROTOKOLL_JE_LAUF = 200
/** B2b-3b-2b-2a-2 (Advisor M3): so viele zuletzt entschiedene Rückfragen hält `entschiedene()` (alle Läufe zusammen, neueste zuerst). */
export const ENTSCHIEDEN_MAX = 20
/** B2b-3b-2b-2a-3 (F-1132 (1)): Grund einer Ablehnung durch die Wartegrenze bzw. beim Lauf-Ende — die Zählung unterscheidet danach. */
const GRUND_WARTEGRENZE = 'Wartegrenze erreicht'
const GRUND_LAUF_ENDE = 'Lauf beendet'

/** Protokoll-Arten (A5: eigene Arten für Fragen) — einzige Quelle src/rueckfrage/protokoll.ts (3b-1b). */
export const PROTOKOLL_ARTEN = RUECKFRAGE_PROTOKOLL_ARTEN

/** Antworten auf eine Rechte-Anfrage (kein „immer“). */
export const RECHTE_ANTWORTEN = Object.freeze(['einmal_erlauben', 'ablehnen'])

const istText = (wert) => typeof wert === 'string'

/**
 * B2b-3b-2b-1b (F-1128 R1): eindeutiger Ablehnungstext einer Ablehnung durch Stefan. Die CLI gibt ihn wörtlich als tool_result
 * zurück (features/F45/nachweise/b2b3a/rohstrom-deny.ndjson:9); der Abgleich zählt die Ablehnung nur dann. ASCII (Advisor B12).
 * @returns `Stefan hat den Befehl abgelehnt. (Ref <uuid>)`
 */
export const ablehnungstextStefan = () => `Stefan hat den Befehl abgelehnt. (Ref ${randomUUID()})`

/**
 * E-B7 (B2b-3b-2b-1a): Herkunft einer Antwort aus ihren Kopfzeilen — 'browser', wenn Sec-Fetch-Site 'same-origin' ist oder ein
 * Origin-Kopf zum Host-Kopf passt; sonst 'nicht_browser' (auch 'none', fremder oder ungültiger Origin). Eigener kleiner Vergleich
 * statt istFremdeBrowserAnfrage (f813 (4)); fremde Browser-Anfragen weist der zentrale CSRF-Haken vorher ab. Header sind
 * fälschbar — Hinweis, kein Schutz. Wirft nie.
 * @param headers - req.headers (oder ein Objekt mit kleingeschriebenen Kopfnamen)
 * @returns 'browser' | 'nicht_browser'
 */
export function herkunftDerAntwort(headers) {
  if (headers?.['sec-fetch-site'] === 'same-origin') return 'browser'
  const origin = headers?.origin
  if (!istText(origin) || !istText(headers?.host)) return 'nicht_browser'
  try {
    return new URL(origin).host === headers.host ? 'browser' : 'nicht_browser'
  } catch {
    return 'nicht_browser'
  }
}

/**
 * @param {object} [optionen]
 * @param {number} [optionen.warteGrenzeMs] - Wartegrenze je Rückfrage (Standard WARTE_GRENZE_MS; Gate verkürzt)
 * @param {number} [optionen.pollFensterMs] - Long-Poll-Fenster (Standard POLL_FENSTER_MS)
 * @param {(laufId: string, eintrag: object, kontext: { arbeitsordner: string, ab: number, eintraege: object[] }) => void} [optionen.protokolliere] -
 *   Rückruf je Entscheidung, VOR der Auslieferung; `kontext.eintraege` sind die noch nicht geschriebenen Einträge ab Index `ab`
 * @param {object} [optionen.pfadOptionen] - an vorentscheidung durchgereicht (nur Tests)
 * @param {() => Date} [optionen.jetzt] - Uhr (nur Tests)
 * @returns Vermittlung { warteGrenzeMs (einzige Quelle auch für Skript-Frist und CLI-timeout), oeffneLauf, laufZuToken, stelle, warte,
 *   offene, entschiedene, beantworte, beendeLauf, eintraegeVon, zugang }
 */
export function erzeugeRueckfrageVermittlung(optionen = {}) {
  const warteGrenzeMs = optionen.warteGrenzeMs ?? WARTE_GRENZE_MS
  const pollFensterMs = optionen.pollFensterMs ?? POLL_FENSTER_MS
  const protokolliere = optionen.protokolliere ?? (() => {})
  const jetzt = optionen.jetzt ?? (() => new Date())
  /** laufId → { token, arbeitsordner, werkzeugNamen, eintraege: Map<id, Eintrag>, bekannteIds: Set<string>, protokoll: object[], geschrieben: number, grenzeGemeldet: boolean, ohneEintrag: number } */
  const laeufe = new Map()
  /** B2b-3b-2b-2a-2: Ringpuffer der zuletzt entschiedenen Warteschlangeneinträge (neueste zuerst, höchstens ENTSCHIEDEN_MAX). */
  const zuletzt = []

  /**
   * Protokolliert eine Entscheidung: an die Eintragsliste des Laufs anhängen, dann den Rückruf mit den noch nicht geschriebenen
   * Einträgen ab `lauf.geschrieben` (B2b-3b-2b-1a: nur Zuwachs); ohne Wurf gelten sie als geschrieben. Ein Wurf des Rückrufs
   * ändert die Entscheidung nicht, die Einträge gehen mit der nächsten Entscheidung erneut mit.
   * @param laufId - Lauf
   * @param lauf - Lauf-Zustand (auch nach dem Entfernen aus der Map in beendeLauf)
   * @param eintrag - Protokollfelder ohne Zeit
   */
  function schreibeProtokoll(laufId, lauf, eintrag) {
    const vollstaendig = { ...eintrag, zeit: jetzt().toISOString() }
    lauf.protokoll.push(vollstaendig)
    try {
      protokolliere(laufId, vollstaendig, { arbeitsordner: lauf.arbeitsordner, ab: lauf.geschrieben, eintraege: lauf.protokoll.slice(lauf.geschrieben) })
      lauf.geschrieben = lauf.protokoll.length
    } catch (fehler) {
      console.error(`[leitstand] Rückfrage-Protokoll für Lauf '${laufId}' fehlgeschlagen:`, fehler)
    }
  }

  /** Protokollfelder einer Anfrage (Rohtext; neutralisiert wird beim dauerhaften Schreiben, 3b-1b): tool_use_id, tool_name, input_hash, befehl|frage. */
  function protokollBasis(anfrage) {
    return {
      tool_use_id: anfrage.tool_use_id,
      tool_name: anfrage.tool_name,
      input_hash: anfrage.input_hash,
      ...(anfrage.befehl !== undefined ? { befehl: anfrage.befehl } : {}),
      ...(anfrage.frage !== undefined ? { frage: anfrage.frage } : {}),
    }
  }

  /**
   * Schließt einen Eintrag mit einer Entscheidung: Timer weg, Protokoll, dann Auslieferung an alle Warter.
   * @param laufId - Lauf
   * @param lauf - Lauf-Zustand (Eintragsliste des Protokolls)
   * @param eintrag - Warteschlangeneintrag
   * @param entscheidung - { behavior: 'allow' } | { behavior: 'deny', message } | { antwort }
   * @param protokoll - { art, grund, antwort?, herkunft?, ablehnung_hash? }
   */
  function entscheide(laufId, lauf, eintrag, entscheidung, protokoll) {
    if (eintrag.entscheidung !== null) return
    clearTimeout(eintrag.timer)
    eintrag.entscheidung = entscheidung
    schreibeProtokoll(laufId, lauf, { ...protokollBasis(eintrag), ...protokoll })
    merkeEntscheidung(eintrag, protokoll)
    for (const warter of eintrag.warter) warter(entscheidung)
    eintrag.warter.clear()
  }

  /**
   * B2b-3b-2b-2a-2 (Advisor M3/M11): legt eine Entscheidung in den Ringpuffer — Befehl und freie Antwort maskiert, die Frage roh (die
   * Anzeige maskiert Steuerzeichen). Neue Objekte, keine geteilten Referenzen.
   * @param eintrag - entschiedener Warteschlangeneintrag
   * @param protokoll - { art, herkunft?, antwort? } der Entscheidung
   */
  function merkeEntscheidung(eintrag, protokoll) {
    zuletzt.unshift({
      id: eintrag.id,
      lauf_id: eintrag.lauf_id,
      art: eintrag.art,
      tool_name: eintrag.tool_name,
      ...(eintrag.befehl !== undefined ? { befehl: maskiereGeheimnisse(eintrag.befehl) } : {}),
      ...(eintrag.frage !== undefined ? { frage: eintrag.frage } : {}),
      ergebnis: protokoll.art,
      ...(protokoll.herkunft !== undefined ? { herkunft: protokoll.herkunft } : {}),
      ...(protokoll.antwort !== undefined ? { antwort: maskiereGeheimnisse(protokoll.antwort) } : {}),
      entschieden_am: jetzt().toISOString(),
    })
    zuletzt.length = Math.min(zuletzt.length, ENTSCHIEDEN_MAX)
  }

  /** B2b-3b-2a (Advisor B2): offen = unentschieden; entschiedene Einträge bleiben bis beendeLauf in der Map (A7). */
  const anzahlOffen = (lauf) => [...lauf.eintraege.values()].filter((e) => e.entscheidung === null).length

  /** Ablehnung bzw. „keine Antwort“ je Art eines Eintrags. */
  const ablehnungFuer = (eintrag, message) => (eintrag.art === 'frage' ? { antwort: KEINE_ANTWORT } : { behavior: 'deny', message })

  /**
   * Öffnet einen Lauf für den Kanal. Wirft nicht; ungültige Kanal-Daten (Token nicht 64 Hex-Zeichen) öffnen nichts — jede
   * Anfrage des Skripts endet dann mit 403 ⇒ deny. Ein schon offener Lauf derselben id wird zuerst beendet.
   * @param laufId - Lauf
   * @param kanal - { token, arbeitsordner, werkzeugNamen }
   */
  function oeffneLauf(laufId, kanal) {
    if (typeof kanal?.token !== 'string' || !/^[0-9a-f]{64}$/.test(kanal.token) || !Array.isArray(kanal.werkzeugNamen)) {
      console.error(`[leitstand] Rückfrage-Kanal für Lauf '${laufId}' nicht geöffnet: Kanal-Daten ungültig`)
      return
    }
    if (laeufe.has(laufId)) beendeLauf(laufId)
    laeufe.set(laufId, { token: kanal.token, arbeitsordner: kanal.arbeitsordner, werkzeugNamen: [...kanal.werkzeugNamen], eintraege: new Map(), bekannteIds: new Set(), protokoll: [], geschrieben: 0, grenzeGemeldet: false, ohneEintrag: 0 })
  }

  /**
   * Lauf zu einem Token (zeitkonstanter Vergleich, nur offene Läufe).
   * @param token - Wert aus dem Authorization-Kopf
   * @returns laufId oder null
   */
  function laufZuToken(token) {
    if (!istText(token) || !/^[0-9a-f]{64}$/.test(token)) return null
    const gesucht = Buffer.from(token)
    let treffer = null
    for (const [laufId, lauf] of laeufe) {
      const eigenes = Buffer.from(lauf.token)
      // timingSafeEqual wirft bei ungleicher Länge — oeffneLauf lässt nur 64 Hex-Zeichen zu, die Prüfung bleibt trotzdem.
      if (eigenes.length === gesucht.length && timingSafeEqual(eigenes, gesucht)) treffer = laufId
    }
    return treffer
  }

  /**
   * Prüft die Form einer Anfrage des Skripts.
   * @returns { ok: true, anfrage } | { ok: false, grund }
   */
  function pruefeAnfrage(roh) {
    if (typeof roh !== 'object' || roh === null || Array.isArray(roh)) return { ok: false, grund: 'Anfrage ist kein Objekt' }
    const toolUseId = roh.tool_use_id ?? null
    if (toolUseId !== null && (!istText(toolUseId) || toolUseId.length === 0 || toolUseId.length > ID_MAX_ZEICHEN)) return { ok: false, grund: 'tool_use_id ungültig' }
    if (roh.art === 'rechte') {
      if (!istText(roh.tool_name)) return { ok: false, grund: 'tool_name fehlt' }
      const befehl = roh.tool_name === 'Bash' && typeof roh.input === 'object' && roh.input !== null && istText(roh.input.command) ? roh.input.command : undefined
      return { ok: true, anfrage: { art: 'rechte', tool_name: roh.tool_name, input: roh.input, input_hash: sha256Hex(kanonischesJson(roh.input ?? null)), tool_use_id: toolUseId, ...(befehl !== undefined ? { befehl } : {}) } }
    }
    if (roh.art === 'frage') {
      if (!istText(roh.frage) || roh.frage.trim().length === 0 || roh.frage.length > TEXT_MAX_ZEICHEN) return { ok: false, grund: 'frage fehlt oder ist zu lang' }
      const optionen = roh.optionen ?? []
      if (!Array.isArray(optionen) || optionen.length > OPTIONEN_MAX || !optionen.every((o) => istText(o) && o.length <= OPTION_MAX_ZEICHEN)) return { ok: false, grund: 'optionen ungültig' }
      return { ok: true, anfrage: { art: 'frage', tool_name: 'frage_stefan', input: { frage: roh.frage, optionen }, input_hash: sha256Hex(kanonischesJson({ frage: roh.frage, optionen })), tool_use_id: toolUseId, frage: roh.frage, optionen: [...optionen] } }
    }
    return { ok: false, grund: "art muss 'rechte' oder 'frage' sein" }
  }

  /**
   * Nimmt eine Anfrage des Skripts an.
   * @param laufId - Lauf (aus dem Token)
   * @param roh - Body der Anfrage
   * @returns { ok: true, entscheidung } (sofort) | { ok: true, id } (in der Warteschlange) | { ok: false, status, grund }
   */
  function stelle(laufId, roh) {
    const lauf = laeufe.get(laufId)
    if (lauf === undefined) return { ok: false, status: 403, grund: 'Lauf nicht offen' }
    const geprueft = pruefeAnfrage(roh)
    if (!geprueft.ok) return { ok: false, status: 400, grund: geprueft.grund }
    const anfrage = geprueft.anfrage
    // B2b-3b-2a (F-1128 (5)): über der Protokollgrenze (offene zählen mit, ihr Platz ist reserviert) ⇒ ablehnen ohne Eintrag;
    // eine Ablehnung ohne Eintrag bleibt im Abgleich A6 VERWEIGERT (sichere Richtung).
    const offen = anzahlOffen(lauf)
    if (lauf.protokoll.length + offen >= MAX_PROTOKOLL_JE_LAUF) {
      const grund = `Obergrenze der Protokolleinträge je Lauf erreicht (${MAX_PROTOKOLL_JE_LAUF})`
      if (!lauf.grenzeGemeldet) console.error(`[leitstand] Rückfrage-Kanal Lauf '${laufId}': ${grund} — weitere Anfragen ohne Protokolleintrag abgelehnt`)
      lauf.grenzeGemeldet = true
      lauf.ohneEintrag++
      return { ok: true, entscheidung: anfrage.art === 'frage' ? { antwort: KEINE_ANTWORT } : { behavior: 'deny', message: `Automatisch abgelehnt: ${grund}` } }
    }
    // H5: jede tool_use_id genau einmal je Lauf — auch auto_deny-Fälle werden gemerkt.
    if (anfrage.tool_use_id !== null) {
      if (lauf.bekannteIds.has(anfrage.tool_use_id)) {
        const grund = 'Rückfrage-ID doppelt'
        schreibeProtokoll(laufId, lauf, { ...protokollBasis(anfrage), art: anfrage.art === 'frage' ? 'frage_ohne_antwort' : 'auto_deny', grund })
        return { ok: true, entscheidung: anfrage.art === 'frage' ? { antwort: KEINE_ANTWORT } : { behavior: 'deny', message: `Automatisch abgelehnt: ${grund}` } }
      }
      lauf.bekannteIds.add(anfrage.tool_use_id)
    }
    if (anfrage.art === 'rechte') {
      const vor = vorentscheidung(anfrage.tool_name, anfrage.input, lauf.arbeitsordner, lauf.werkzeugNamen, optionen.pfadOptionen)
      if (vor.art === 'auto_deny') {
        schreibeProtokoll(laufId, lauf, { ...protokollBasis(anfrage), art: 'auto_deny', grund: vor.grund })
        return { ok: true, entscheidung: { behavior: 'deny', message: `Automatisch abgelehnt: ${vor.grund}` } }
      }
    }
    // B2b-3b-2a (F-1126 (2)): höchstens MAX_OFFENE_JE_LAUF unentschiedene Rückfragen — darüber automatisch, mit Eintrag.
    if (offen >= MAX_OFFENE_JE_LAUF) {
      const grund = `zu viele offene Rückfragen je Lauf (${MAX_OFFENE_JE_LAUF})`
      schreibeProtokoll(laufId, lauf, { ...protokollBasis(anfrage), art: anfrage.art === 'frage' ? 'frage_ohne_antwort' : 'auto_deny', grund })
      return { ok: true, entscheidung: anfrage.art === 'frage' ? { antwort: KEINE_ANTWORT } : { behavior: 'deny', message: `Automatisch abgelehnt: ${grund}` } }
    }
    const seit = jetzt()
    const eintrag = { id: randomUUID(), lauf_id: laufId, ...anfrage, seit, frist: new Date(seit.getTime() + warteGrenzeMs), entscheidung: null, warter: new Set(), timer: null }
    eintrag.timer = setTimeout(() => {
      entscheide(laufId, lauf, eintrag, ablehnungFuer(eintrag, 'Keine Antwort von Stefan innerhalb der Wartegrenze — abgelehnt.'), { art: eintrag.art === 'frage' ? 'frage_ohne_antwort' : 'zeitueberschreitung', grund: GRUND_WARTEGRENZE })
    }, warteGrenzeMs)
    eintrag.timer.unref?.()
    lauf.eintraege.set(eintrag.id, eintrag)
    return { ok: true, id: eintrag.id }
  }

  /**
   * Long-Poll des Skripts: die Entscheidung (auch eine schon gefallene) oder nach dem Poll-Fenster `{ offen: true }`.
   * @param laufId - Lauf (aus dem Token)
   * @param id - Rückfrage-ID
   * @returns Promise<{ ok: true, entscheidung } | { ok: true, offen: true } | { ok: false, status, grund }>
   */
  function warte(laufId, id) {
    const eintrag = laeufe.get(laufId)?.eintraege.get(id)
    if (eintrag === undefined) return Promise.resolve({ ok: false, status: 404, grund: 'Rückfrage unbekannt' })
    if (eintrag.entscheidung !== null) return Promise.resolve({ ok: true, entscheidung: eintrag.entscheidung })
    return new Promise((fertig) => {
      const warter = (entscheidung) => {
        clearTimeout(zeitgeber)
        fertig({ ok: true, entscheidung })
      }
      const zeitgeber = setTimeout(() => {
        eintrag.warter.delete(warter)
        fertig({ ok: true, offen: true })
      }, pollFensterMs)
      zeitgeber.unref?.()
      eintrag.warter.add(warter)
    })
  }

  /**
   * Offene Rückfragen aller offenen Läufe — ohne Token; der Befehl steht wörtlich da (E-B2b-3-1 = A).
   * @returns Liste { id, lauf_id, art, tool_name, befehl?, frage?, optionen?, seit, frist }
   */
  function offene() {
    const liste = []
    for (const lauf of laeufe.values()) {
      for (const e of lauf.eintraege.values()) {
        if (e.entscheidung !== null) continue
        liste.push({
          id: e.id,
          lauf_id: e.lauf_id,
          art: e.art,
          tool_name: e.tool_name,
          ...(e.befehl !== undefined ? { befehl: e.befehl } : {}),
          ...(e.frage !== undefined ? { frage: e.frage, optionen: [...e.optionen] } : {}),
          seit: e.seit.toISOString(),
          frist: e.frist.toISOString(),
        })
      }
    }
    return liste
  }

  /**
   * B2b-3b-2b-2a-2: die zuletzt entschiedenen Rückfragen (Feld `entschieden` von GET /api/rueckfragen), auch beendeter Läufe.
   * @returns Liste { id, lauf_id, art, tool_name, befehl?, frage?, ergebnis, herkunft?, antwort?, entschieden_am } (Kopien)
   */
  function entschiedene() {
    return zuletzt.map((e) => ({ ...e }))
  }

  /**
   * Antwort Stefans (Browser). Nur eine offene Rückfrage eines offenen Laufs, genau einmal.
   * @param id - Rückfrage-ID
   * @param antwort - Body: { entscheidung: 'einmal_erlauben' | 'ablehnen' } (Rechte) bzw. { antwort: string } (Frage)
   * @param herkunft - E-B7: 'browser' | 'nicht_browser' (herkunftDerAntwort); jeder andere Wert gilt als 'nicht_browser'
   * @returns { ok: true } | { ok: false, status, grund }
   */
  function beantworte(id, antwort, herkunft = 'nicht_browser') {
    const quelle = RUECKFRAGE_HERKUENFTE.includes(herkunft) ? herkunft : 'nicht_browser'
    let gefunden = null
    for (const [laufId, lauf] of laeufe) {
      const e = lauf.eintraege.get(id)
      if (e !== undefined) gefunden = { laufId, lauf, eintrag: e }
    }
    if (gefunden === null) return { ok: false, status: 404, grund: 'Rückfrage unbekannt oder Lauf beendet' }
    const { laufId, lauf, eintrag } = gefunden
    if (eintrag.entscheidung !== null) return { ok: false, status: 409, grund: 'Rückfrage ist schon entschieden' }
    if (typeof antwort !== 'object' || antwort === null || Array.isArray(antwort)) return { ok: false, status: 400, grund: 'Antwort ist kein Objekt' }
    if (eintrag.art === 'rechte') {
      if (!RECHTE_ANTWORTEN.includes(antwort.entscheidung)) return { ok: false, status: 400, grund: `entscheidung muss ${RECHTE_ANTWORTEN.join(' oder ')} sein` }
      if (antwort.entscheidung === 'einmal_erlauben') entscheide(laufId, lauf, eintrag, { behavior: 'allow' }, { art: 'stefan_erlaubt', grund: 'Stefan hat einmal erlaubt', herkunft: quelle })
      else {
        // B2b-3b-2b-1b (F-1128 R1): je Ablehnung ein eigener Text (ASCII, wörtlich als tool_result der CLI belegt); ins Protokoll nur sein Hash.
        const message = ablehnungstextStefan()
        entscheide(laufId, lauf, eintrag, { behavior: 'deny', message }, { art: 'stefan_abgelehnt', grund: 'Stefan hat abgelehnt', herkunft: quelle, ablehnung_hash: sha256Hex(message) })
      }
      return { ok: true }
    }
    if (!istText(antwort.antwort) || antwort.antwort.trim().length === 0 || antwort.antwort.length > TEXT_MAX_ZEICHEN) return { ok: false, status: 400, grund: `antwort muss ein Text mit 1–${TEXT_MAX_ZEICHEN} Zeichen sein` }
    entscheide(laufId, lauf, eintrag, { antwort: antwort.antwort }, { art: 'frage_beantwortet', grund: 'Stefan hat geantwortet', antwort: antwort.antwort, herkunft: quelle })
    return { ok: true }
  }

  /**
   * Lauf-Ende (regulär, Zeitgrenze, Abbruch, Startfehler): offene Rückfragen ablehnen, Token ungültig, Lauf entfernen.
   * Idempotent; ein nicht geöffneter Lauf ist ein No-op.
   * @param laufId - Lauf
   * @returns B2b-3b-2b-1a (F-1128 R2): Zahl der Ablehnungen durch Stefan im Lauf (jede `stefan_abgelehnt`, auch eine, die die
   *   Auswertung verwirft — sichere Richtung für die Löschliste); 0, wenn der Lauf nicht offen war
   */
  function beendeLauf(laufId) {
    const lauf = laeufe.get(laufId)
    if (lauf === undefined) return 0
    laeufe.delete(laufId)
    for (const e of lauf.eintraege.values()) {
      entscheide(laufId, lauf, e, ablehnungFuer(e, 'Lauf beendet — abgelehnt.'), { art: e.art === 'frage' ? 'frage_ohne_antwort' : 'lauf_beendet', grund: GRUND_LAUF_ENDE })
    }
    return lauf.protokoll.filter((e) => e.art === 'stefan_abgelehnt').length
  }

  /**
   * B2b-3b-2a (F-1128 (1)): Speicherstand des Protokolls eines offenen Laufs — Quelle der Wahrheit für den Controller
   * (ermittleRueckfrageProtokoll, gleicher Prozess), die Datei ist das Audit. Nur die Vergleichsfelder als neue Objekte
   * (Advisor B10: kein Rohtext, keine geteilten Referenzen); ein Werkzeugname über 200 Zeichen wie im Schreiber als '<zu lang>'.
   * Seit B2b-3b-2b-1b (R1) an stefan_abgelehnt zusätzlich `ablehnung_hash` (nur wenn vorhanden).
   * @param laufId - Lauf
   * @returns Liste { tool_use_id, tool_name, input_hash, art, ablehnung_hash? } oder null (Lauf nicht offen, beendet, nach Neustart)
   */
  function eintraegeVon(laufId) {
    const lauf = laeufe.get(laufId)
    if (lauf === undefined) return null
    return lauf.protokoll.map((e) => ({
      tool_use_id: e.tool_use_id ?? null,
      tool_name: toolNameFuerProtokoll(e.tool_name),
      input_hash: e.input_hash,
      art: e.art,
      ...(e.ablehnung_hash !== undefined ? { ablehnung_hash: e.ablehnung_hash } : {}),
    }))
  }

  /**
   * B2b-3b-2b-2a-1 (F-1128 (3), E-B7, D13): Zählung der Rückfragen eines offenen Laufs je Art aus dem Speicherstand (nicht aus der
   * Datei) — für daten der Terminalmarke. `nicht_browser` zählt die Antworten der drei Arten mit Herkunft 'nicht_browser'. Enthält auch
   * Ablehnungen durch Stefan, die die Auswertung nicht bestätigt (Advisor B10, Beschriftung in der Anzeige).
   * B2b-3b-2b-2a-3 (F-1132 (1)): dazu die unbeantworteten — `abgelaufen` (Wartegrenze), `lauf_ende` (beim Lauf-Ende abgelehnt und die beim
   * Lesen noch offenen: der Controller liest nach dem Prozessende der CLI und erreicht `beendeLauf` ohne await, dort werden genau sie
   * abgelehnt — Advisor M1) und `automatisch` (auto_deny, übrige Fragen ohne Antwort, Ablehnungen über der Protokollgrenze ohne Eintrag).
   * @param laufId - Lauf
   * @returns { stefan_erlaubt, stefan_abgelehnt, frage_beantwortet, nicht_browser, abgelaufen, lauf_ende, automatisch } oder null (Lauf nicht offen)
   */
  function zaehlungVon(laufId) {
    const lauf = laeufe.get(laufId)
    if (lauf === undefined) return null
    const zaehlung = { stefan_erlaubt: 0, stefan_abgelehnt: 0, frage_beantwortet: 0, nicht_browser: 0, abgelaufen: 0, lauf_ende: anzahlOffen(lauf), automatisch: lauf.ohneEintrag }
    for (const e of lauf.protokoll) {
      if (e.art === 'stefan_erlaubt' || e.art === 'stefan_abgelehnt' || e.art === 'frage_beantwortet') {
        zaehlung[e.art]++
        if (e.herkunft !== 'browser') zaehlung.nicht_browser++
      } else if (e.art === 'zeitueberschreitung' || (e.art === 'frage_ohne_antwort' && e.grund === GRUND_WARTEGRENZE)) zaehlung.abgelaufen++
      else if (e.art === 'lauf_beendet' || (e.art === 'frage_ohne_antwort' && e.grund === GRUND_LAUF_ENDE)) zaehlung.lauf_ende++
      else zaehlung.automatisch++
    }
    return zaehlung
  }

  /**
   * B2b-3b-2b-1a (F-1128 R3): Zugang des Controllers zu einem Lauf (laufOptionen.rueckfrageZugang). Wird für jeden Lauf gebaut,
   * auch ohne Kanal und vor `oeffneLauf` (Advisor B6/D9) — deshalb schlagen `speicher()`/`zaehlung()` den Lauf erst beim Aufruf nach. Wirft nie.
   * @param laufId - Lauf
   * @param melde - (fehler: string) => void, z. B. Eintrag in die Startfehlerliste des Servers; ein Wurf wird geloggt
   * @returns { speicher: () => Projektion | null, zaehlung: () => Zählung | null, abweichung: () => string | null, meldeAbweichung: (grund: string) => void }
   */
  function zugang(laufId, melde) {
    let letzteAbweichung = null
    return {
      speicher: () => eintraegeVon(laufId),
      zaehlung: () => zaehlungVon(laufId),
      // B2b-3b-2b-2a-1 (R3): der Controller liest die gemeldete Abweichung zurück (daten der Terminalmarke, bleibt nach Neustart).
      abweichung: () => letzteAbweichung,
      meldeAbweichung: (grund) => {
        letzteAbweichung = typeof grund === 'string' ? grund : String(grund)
        try {
          melde(`Rückfrage-Protokoll von Lauf '${laufId}' nicht bestätigt — Ablehnungen durch Stefan zählen nicht: ${grund}`)
        } catch (fehler) {
          console.error(`[leitstand] Abweichung des Rückfrage-Protokolls von Lauf '${laufId}' nicht gemeldet:`, fehler)
        }
      },
    }
  }

  return { warteGrenzeMs, oeffneLauf, laufZuToken, stelle, warte, offene, entschiedene, beantworte, beendeLauf, eintraegeVon, zugang }
}
