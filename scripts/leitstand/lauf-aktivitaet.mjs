/**
 * Datei: scripts/leitstand/lauf-aktivitaet.mjs
 *
 * Zweck: Ringpuffer der Werkzeugaufrufe des aktiven Laufs (F46 D5, docs/design/abgleich-f46.md §4.9
 * „Aktivität“, „Anzahl Aufrufe“, „Berührte Dateien“; löst F-977). Statt nur des letzten Aufrufs
 * (laufAktivFortschritt, F40 WS-1) hält er die letzten AKTIVITAET_GRENZE Aufrufe mit Zeit, Werkzeug,
 * gekürztem Ziel und Art, dazu die Gesamtzahl und die eindeutigen Ziele schreibender Werkzeuge.
 *
 * Grenzen:
 * - Nur Speicher: nichts wird auf Platte geschrieben (kein Checkpoint pro stream-json-Zeile, D4). Die
 *   vollständige Spur steht nach dem Lauf in Laufakte und Rohstrom.
 * - Genau ein Lauf zur Zeit (D13): starte(laufId) verwirft alles Vorherige, beende(laufId) löscht den
 *   Eintrag dieses Laufs. Die Map hält deshalb höchstens einen Eintrag; ein spät eintreffender Rückruf
 *   eines alten Laufs (melde mit fremder laufId) wird verworfen, eine fremde laufId liest null.
 * - Speicher je Lauf beschränkt: AKTIVITAET_GRENZE Einträge, Ziel auf ZIEL_MAX_ZEICHEN, Werkzeugname
 *   auf WERKZEUG_MAX_ZEICHEN, berührte Dateien auf BERUEHRT_GRENZE Pfade.
 * - Blockiert nie: alle Operationen sind synchron, konstant bzw. linear in der festen Grenze, ohne I/O.
 *
 * Abbildung Werkzeug → Art (WERKZEUG_ART): 'aendert' (schreibende Datei-Werkzeuge), 'befehl'
 * (Shell), 'liest' (lesende Werkzeuge), 'faehigkeit' (Skill, Subagent, MCP-Werkzeuge mit Präfix
 * mcp__), sonst 'sonstiges'. Die Oberfläche übersetzt die Art in ein Verb (i18n live.art.*).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (starteLaufUndVergiss: starte, beiWerkzeugaufruf → melde, Reset in
 *   .then/.catch → beende; GET /api/laeufe/<laufId> → lese als Feld aktivitaet)
 * - scripts/leitstand/lauf-aktivitaet.test.mjs (node:test)
 */

/** Höchstzahl gehaltener Aufrufe je Lauf (Abgleich §4.9: „letzte 50 Aufrufe“). */
export const AKTIVITAET_GRENZE = 50

/** Höchstlänge eines Ziels (Pfad, Muster, Befehl) in Zeichen; länger wird mit „…“ gekürzt. */
export const ZIEL_MAX_ZEICHEN = 300

/** Höchstlänge eines Werkzeugnamens in Zeichen (MCP-Namen sind frei wählbar). */
export const WERKZEUG_MAX_ZEICHEN = 100

/** Höchstzahl eindeutiger berührter Dateien je Lauf. */
export const BERUEHRT_GRENZE = 100

/** Die fünf Arten eines Aufrufs. */
export const AKTIVITAET_ARTEN = Object.freeze(['aendert', 'befehl', 'liest', 'faehigkeit', 'sonstiges'])

/** Werkzeugname (Claude Code, stream-json tool_use.name) → Art. Nicht gelistet: 'sonstiges', Präfix mcp__: 'faehigkeit'. */
export const WERKZEUG_ART = Object.freeze({
  Write: 'aendert',
  Edit: 'aendert',
  MultiEdit: 'aendert',
  NotebookEdit: 'aendert',
  Bash: 'befehl',
  BashOutput: 'befehl',
  KillShell: 'befehl',
  KillBash: 'befehl',
  PowerShell: 'befehl',
  Read: 'liest',
  Glob: 'liest',
  Grep: 'liest',
  LS: 'liest',
  NotebookRead: 'liest',
  WebFetch: 'liest',
  WebSearch: 'liest',
  Skill: 'faehigkeit',
  Task: 'faehigkeit',
  Agent: 'faehigkeit',
})

/**
 * Art eines Werkzeugaufrufs.
 * @param werkzeug - Werkzeugname
 * @returns eine der AKTIVITAET_ARTEN
 */
export function werkzeugArt(werkzeug) {
  if (typeof werkzeug !== 'string') return 'sonstiges'
  if (Object.hasOwn(WERKZEUG_ART, werkzeug)) return WERKZEUG_ART[werkzeug]
  return werkzeug.startsWith('mcp__') ? 'faehigkeit' : 'sonstiges'
}

/**
 * Kürzt einen Text auf eine Höchstlänge (Codepunkte, kein halbes Ersatzpaar); gekürzt endet er auf „…“.
 * @param text - Text oder null
 * @param max - Höchstlänge
 * @returns gekürzter Text, oder null ohne Text
 */
export function kuerze(text, max) {
  if (typeof text !== 'string' || text === '') return null
  const zeichen = Array.from(text)
  return zeichen.length <= max ? text : `${zeichen.slice(0, max - 1).join('')}…`
}

/**
 * Legt den Speicher an — eine Instanz je Serverinstanz (erzeugeRequestHandler).
 * @param optionen - { jetzt: () => ISO-Zeitstempel } (für Tests überschreibbar)
 * @returns { starte, melde, beende, lese, anzahlLaeufe }
 */
export function erzeugeAktivitaetsSpeicher({ jetzt = () => new Date().toISOString() } = {}) {
  /** laufId → { eintraege (älteste zuerst), anzahlGesamt, beruehrt: Set, beruehrtGekappt } — höchstens ein Eintrag (D13). */
  const laeufe = new Map()

  return {
    /**
     * Beginnt einen leeren Puffer für den neuen aktiven Lauf und verwirft jeden anderen (D13).
     * @param laufId - laufId des gerade gestarteten Laufs
     */
    starte(laufId) {
      laeufe.clear()
      laeufe.set(laufId, { eintraege: [], anzahlGesamt: 0, beruehrt: new Set(), beruehrtGekappt: false })
    },

    /**
     * Nimmt einen live gemeldeten Werkzeugaufruf auf — nur für den Lauf, dessen Puffer besteht.
     * @param laufId - laufId des meldenden Laufs
     * @param aufruf - { werkzeug, ziel } aus dem Gateway (beiWerkzeugaufruf)
     */
    melde(laufId, aufruf) {
      const lauf = laeufe.get(laufId)
      if (lauf === undefined) return
      const werkzeug = kuerze(aufruf?.werkzeug, WERKZEUG_MAX_ZEICHEN) ?? '?'
      const art = werkzeugArt(aufruf?.werkzeug)
      const zielVoll = typeof aufruf?.ziel === 'string' && aufruf.ziel !== '' ? aufruf.ziel : null
      lauf.eintraege.push({ zeit: jetzt(), werkzeug, ziel: kuerze(zielVoll, ZIEL_MAX_ZEICHEN), art })
      if (lauf.eintraege.length > AKTIVITAET_GRENZE) lauf.eintraege.shift()
      lauf.anzahlGesamt += 1
      if (art === 'aendert' && zielVoll !== null) {
        const pfad = kuerze(zielVoll, ZIEL_MAX_ZEICHEN)
        if (lauf.beruehrt.has(pfad)) return
        if (lauf.beruehrt.size < BERUEHRT_GRENZE) lauf.beruehrt.add(pfad)
        else lauf.beruehrtGekappt = true
      }
    },

    /**
     * Löscht den Puffer nach Laufende. Ohne laufId bzw. mit der laufId des Puffers wird er gelöscht;
     * eine fremde laufId lässt einen neueren Lauf unberührt.
     * @param laufId - laufId des beendeten Laufs (optional)
     */
    beende(laufId = undefined) {
      if (laufId === undefined) laeufe.clear()
      else laeufe.delete(laufId)
    },

    /**
     * Projektion für GET /api/laeufe/<laufId>, Feld aktivitaet.
     * @param laufId - angefragte laufId
     * @returns { eintraege (neueste zuerst), anzahlGesamt, grenze, beruehrteDateien, beruehrteGekappt }, oder null ohne Puffer für diese laufId
     */
    lese(laufId) {
      const lauf = laeufe.get(laufId)
      if (lauf === undefined) return null
      return {
        eintraege: lauf.eintraege.map((e) => ({ ...e })).reverse(),
        anzahlGesamt: lauf.anzahlGesamt,
        grenze: AKTIVITAET_GRENZE,
        beruehrteDateien: [...lauf.beruehrt],
        beruehrteGekappt: lauf.beruehrtGekappt,
      }
    },

    /** @returns Zahl gehaltener Puffer (0 oder 1, D13) — für den Speichertest */
    anzahlLaeufe() {
      return laeufe.size
    },
  }
}
