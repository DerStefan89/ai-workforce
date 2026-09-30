/**
 * Datei: public/leitstand/auswahl-bremse.js
 *
 * Zweck: Tastatur-Bremse für die <select>-Felder im Kopf (Projektauswahl, Sprachwahl; F44 WS-1b).
 * Unter Windows löst jede Pfeiltaste im GESCHLOSSENEN <select> sofort „change“ aus. Ohne Bremse
 * wechselte jede Taste das Projekt bzw. lüde die Seite in einer anderen Sprache neu (WCAG 3.2.2,
 * QA-Pass WS-1a). Regeln:
 * - Ein „change“, der direkt aus einer gerade gedrückten Taste kommt (zwischen keydown und keyup
 *   einer Pfeil-, Blätter- oder Buchstabentaste), wird zurückgehalten: Der Wert wartet.
 * - Enter wendet an; das Verlassen des Felds (blur) wendet an; Escape verwirft einen wartenden
 *   Wert (zuruecksetzen).
 * - Eine Auswahl per Maus oder in der geöffneten Liste (Alt+↓, F4, Leertaste öffnen sie) wendet
 *   sofort an — dort kommt „change“ erst mit der Bestätigung.
 * anwenden() muss selbst prüfen, ob sich etwas ändert; es darf mehrfach aufgerufen werden.
 *
 * Wird aufgerufen von:
 * - public/leitstand/shell.js (Projektauswahl und Sprachwahl im Kopf)
 * - public/leitstand/auswahl-bremse.test.mjs (node:test)
 *
 * Wichtig: Import-sicher (kein DOM-Zugriff beim Import); arbeitet an jedem EventTarget mit value.
 */

/** Tasten, mit denen sich der Wert eines geschlossenen <select> ändert. */
const AUSWAHL_TASTEN = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'])

/**
 * Verdrahtet die Bremse an einem <select>.
 * @param auswahl - das <select> (oder ein EventTarget mit value)
 * @param anwenden - () => void, liest auswahl.value und wechselt, falls nötig
 * @param zuruecksetzen - () => void, stellt die Anzeige auf den geltenden Wert zurück
 */
export function beiBestaetigterAuswahl(auswahl, anwenden, zuruecksetzen) {
  let tasteLaeuft = false
  let wartet = false
  auswahl.addEventListener('keydown', (ereignis) => {
    if (ereignis.key === 'Enter') {
      wartet = false
      anwenden()
      return
    }
    if (ereignis.key === 'Escape') {
      if (!wartet) return
      wartet = false
      zuruecksetzen()
      return
    }
    // Alt+↓, F4 und Leertaste öffnen die Liste — die Wahl darin kommt mit ihrer Bestätigung.
    if (ereignis.altKey || ereignis.key === 'F4' || ereignis.key === ' ') return
    if (AUSWAHL_TASTEN.has(ereignis.key) || ereignis.key.length === 1) tasteLaeuft = true
  })
  auswahl.addEventListener('keyup', () => {
    tasteLaeuft = false
  })
  auswahl.addEventListener('change', () => {
    if (tasteLaeuft) {
      wartet = true
      return
    }
    wartet = false
    anwenden()
  })
  auswahl.addEventListener('blur', () => {
    tasteLaeuft = false
    wartet = false
    anwenden()
  })
}
