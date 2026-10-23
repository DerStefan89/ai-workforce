/**
 * Datei: scripts/leitstand/freigabe-abschwaechung.mjs
 *
 * Zweck: Vergleich zweier Fassungen eines Workflows auf verlorene Freigabepflichten (F15 WS-2c (b3), F-226). Rein, kein I/O.
 * Unverändert aus scripts/leitstand-server.mjs ausgelagert (F45 FB-1b, Ausgleich der Server-Zeilen nach der Wachstumsbremse,
 * ARCHITECTURE.md §1).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (POST /api/workflows — Planänderung mit Begründungspflicht)
 * - scripts/leitstand/freigabe-abschwaechung.test.mjs (node:test)
 */

/**
 * Vergleicht zwei Fassungen desselben Workflows und meldet jeden Schritt, der
 * dabei seine Freigabepflicht verliert (F15 WS-2c (b3), löst F-226).
 *
 * Der zweite Weg an der Freigabe vorbei: ein ZWINGEND-Schritt lässt sich seit
 * (b1) über POST /api/workflows/<id>/freigabe auflösen — mit Pflichtbegründung
 * und Entscheidungsartefakt —, aber ebenso über eine neue Fassung, in der
 * derselbe Schritt AUTOMATISCH trägt. Der Bedrohungsfall ist nicht
 * Böswilligkeit, sondern Unachtsamkeit: der Mensch ändert einen Plan und merkt
 * nicht, dass er dabei eine Freigabepflicht verloren hat — der Automat fährt
 * den Schritt danach unbeaufsichtigt.
 *
 * Zwei Formen von Abschwächung, beide gleich behandelt:
 *   - derselbe Schritt trägt nicht mehr ZWINGEND (nachher: der neue Wert),
 *   - der Schritt fehlt in der neuen Fassung ganz (nachher: null). Ein
 *     entfernter ZWINGEND-Schritt ist keine kleinere Änderung als ein
 *     abgestufter, sondern eine größere.
 *
 * ABSICHTLICH als "nicht mehr ZWINGEND" formuliert und nicht als Aufzählung
 * der beiden heutigen Gegenwerte (EMPFOHLEN, AUTOMATISCH): käme je eine vierte
 * Freigabestufe dazu, fiele sie sonst still aus der Bezeugungspflicht. Die
 * sichere Richtung ist hier die umgekehrte als bei den Allowlists in
 * ermittleNaechstenSchritt — dort heißt sie "hält an", hier "wird bezeugt".
 *
 * Die VERSCHÄRFUNG ist ausdrücklich frei: wer AUTOMATISCH auf ZWINGEND hebt,
 * legt sich selbst eine Pflicht auf und braucht dafür keine Begründung.
 * @param vorherigeSchritte - schritte-Liste der abgelegten Fassung
 * @param neueSchritte - schritte-Liste der eingereichten Fassung
 * @returns [{ schritt_id, vorher: 'ZWINGEND', nachher: <neuer Wert> | null }], leer bei keinem Treffer
 */
export function ermittleFreigabeAbschwaechungen(vorherigeSchritte, neueSchritte) {
  if (!Array.isArray(vorherigeSchritte)) return []
  const neueNachId = new Map((Array.isArray(neueSchritte) ? neueSchritte : []).map((schritt) => [schritt?.schritt_id, schritt]))
  const treffer = []
  for (const alt of vorherigeSchritte) {
    if (alt?.freigabe !== 'ZWINGEND') continue
    const neu = neueNachId.get(alt.schritt_id)
    if (neu === undefined) {
      treffer.push({ schritt_id: alt.schritt_id, vorher: 'ZWINGEND', nachher: null })
      continue
    }
    if (neu.freigabe !== 'ZWINGEND') {
      treffer.push({ schritt_id: alt.schritt_id, vorher: 'ZWINGEND', nachher: neu.freigabe ?? null })
    }
  }
  return treffer
}
