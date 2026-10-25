/**
 * Datei: scripts/nachweis-laden.mjs
 *
 * Zweck: Gemeinsame Hilfe der Render-Nachweise (F45 B5b-2c-2-AB, features/F45/plan-b5b2c2-v2.md, Advisor `advisor-b5b2c2.md` B9;
 * Anlass F-1201: Bilder mit „Lädt…“): warten, bis ein Bereich keinen Ladeplatzhalter mehr zeigt.
 * - ladePlatzhalter(woerterbuch): die Platzhaltertexte eines Wörterbuchs — alle Werte von Schlüsseln, deren letzter Teil
 *   „laedt“ bzw. „Laedt“ enthält (z. B. „Lädt…“, „Diff lädt …“, „Der Ausführungsstand wird geladen …“, „wird geprüft“). Ein
 *   einzelnes Wort ohne Satzzeichen (etwa „lädt“ als Chip-Text) fällt weg: es kommt auch in fertigem Text vor.
 * - warteBisGeladen(seite, platzhalter, selektor, optionen): fragt den sichtbaren Text (innerText) des Bereichs ab, bis keiner der
 *   Platzhalter mehr darin steht; nach der Zeitgrenze wirft sie und nennt die restlichen Platzhalter (bzw. „Bereich fehlt“), statt
 *   zu hängen — etwa wenn Click-to-Work in der Wegwerf-Kopie nie fertig lädt.
 *
 * Wird aufgerufen von:
 * - features/F45/nachweise/b5b2c2ab/erzeuge-nachweis.mjs (Render-Nachweis B5b-2c-2-AB)
 * - scripts/nachweis-laden.test.mjs (node:test)
 *
 * Wichtig:
 * - Importiert Playwright NICHT: die Seite kommt als Argument (nur `evaluate` und `waitForTimeout` werden benutzt), damit der Test
 *   den reinen Teil ohne Browser lädt.
 * - Ältere Nachweisskripte (z. B. nachweise/b5b2c1) nutzen sie nicht; ihre Bilder werden nicht neu erzeugt (Auftrag
 *   B5b-2c-2-AB, abweichend von Plan v2).
 */

/** Ladeplatzhalter: der letzte Schlüsselteil enthält „laedt“ bzw. „Laedt“ (…laedt, laedtNeu, zielLaedt). */
const LADE_SCHLUESSEL = /laedt[^.]*$/i

/** Ein einzelnes Wort ohne Satzzeichen — zu allgemein als Platzhalter. */
const EIN_WORT = /^\p{L}+$/u

/** Standard-Zeitgrenze und Abfrageabstand (ms). */
const ZEITGRENZE_MS = 20_000
const ABSTAND_MS = 150

/**
 * Platzhaltertexte eines Wörterbuchs (eindeutig, längste zuerst — die Fehlermeldung nennt so den genauesten).
 * @param woerterbuch - Schlüssel → Text bzw. Pluralobjekt (public/leitstand/i18n/<sprache>.js)
 * @returns string[]
 */
export function ladePlatzhalter(woerterbuch) {
  const texte = new Set()
  for (const [schluessel, wert] of Object.entries(woerterbuch ?? {})) {
    if (!LADE_SCHLUESSEL.test(schluessel)) continue
    for (const text of typeof wert === 'string' ? [wert] : Object.values(wert ?? {})) {
      const sauber = typeof text === 'string' ? text.trim() : ''
      if (sauber !== '' && !EIN_WORT.test(sauber)) texte.add(sauber)
    }
  }
  return [...texte].sort((a, b) => b.length - a.length)
}

/**
 * Wartet, bis der sichtbare Text des Bereichs keinen Platzhalter mehr enthält.
 * @param seite - Playwright-Seite (oder ein Ersatz mit evaluate(fn, arg) und waitForTimeout(ms))
 * @param platzhalter - aus ladePlatzhalter
 * @param selektor - CSS-Selektor des Bereichs
 * @param optionen - { zeitgrenzeMs (Standard 20 000), abstandMs (Standard 150) }
 * @returns Promise<void>; wirft nach der Zeitgrenze mit den restlichen Platzhaltern
 */
export async function warteBisGeladen(seite, platzhalter, selektor, optionen = {}) {
  const zeitgrenze = optionen.zeitgrenzeMs ?? ZEITGRENZE_MS
  const abstand = optionen.abstandMs ?? ABSTAND_MS
  const ende = Date.now() + zeitgrenze
  let rest = null
  for (;;) {
    rest = await seite.evaluate(
      ([sel, liste]) => {
        const bereich = document.querySelector(sel)
        if (bereich === null) return null
        const text = bereich.innerText ?? bereich.textContent ?? ''
        return liste.filter((p) => text.includes(p))
      },
      [selektor, platzhalter]
    )
    if (Array.isArray(rest) && rest.length === 0) return
    if (Date.now() >= ende) break
    await seite.waitForTimeout(abstand)
  }
  throw new Error(`${selektor} nach ${zeitgrenze} ms nicht fertig geladen: ${rest === null ? 'Bereich fehlt' : rest.map((p) => `„${p}“`).join(', ')}`)
}
