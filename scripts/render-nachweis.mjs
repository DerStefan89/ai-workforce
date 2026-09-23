#!/usr/bin/env node
/**
 * Datei: scripts/render-nachweis.mjs
 *
 * Zweck: generisches CLI-Werkzeug für einen realen Headless-Render-Nachweis
 * (F-622, PROCESS_IMPROVEMENT → Harness-Regel, Stefan 23.09.2026): nimmt eine
 * URL plus eine Klickfolge (JSON-Datei, Format s. u.), fährt sie per
 * Playwright (Chromium, headless) gegen eine bereits laufende Instanz ab und
 * schreibt je Schritt ein zugeschnittenes Screenshot sowie eine
 * Markdown-Tabelle (aktive Buttons/Elemente, Sichtbarkeit, Titel) in ein
 * angegebenes Verzeichnis. Kein Ersatz für die statischen Gates
 * (scripts/check-*.mjs) — ein realer DOM-/CSS-Nachweis für genau die
 * Fehlerklasse, die kein Quelltext-Scan finden kann (F-620/F-621: eine
 * CSS-Kaskadeninteraktion bzw. eine fehlende classList-Mutation bei korrekt
 * gesetztem Attribut).
 *
 * Chromium-Hinweis (dieser Rechner, 23.09.2026): Playwrights eigener
 * Installer (`npx playwright install chromium`) läuft in dieser Umgebung in
 * einen Timeout gegen `storage.googleapis.com` — der Browser liegt hier
 * manuell per `curl` nachgeladen unter `%LOCALAPPDATA%\ms-playwright\`
 * (chromium-<rev>/chrome-win64 und chromium_headless_shell-<rev>). Auf einer
 * frischen Maschine genügt normalerweise `npx playwright install chromium`.
 *
 * Klickfolge-JSON-Format:
 * {
 *   "url": "http://127.0.0.1:4173/#/chat",
 *   "viewport": { "breite": 900, "hoehe": 500 },
 *   "localStorageEntfernen": ["leitstand-chat-modus"],
 *   "screenshotAusschnitt": { "selector": "#view-chat", "hoehe": 260 },
 *   "beobachtete": {
 *     "gruppen": [{ "name": "Hauptmodus", "ids": ["btn-a", "btn-b"], "aktivKlasse": "btn-primary" }],
 *     "sichtbarkeit": [{ "name": "Unterauswahl", "id": "chat-untermodus-auswahl" }],
 *     "titel": { "name": "Titel", "selector": "#chat-titel" },
 *     "vorhanden": [{ "name": "Auftrag-Trigger", "selector": ".chat-auftrag-oeffnen-btn" }]
 *   },
 *   "schritte": [
 *     { "label": "Initial", "reload": false, "screenshot": "01-initial.png" },
 *     { "label": "Klick X", "klick": "#chat-modus-sparring-btn", "screenshot": "02-x.png" },
 *     { "label": "Tippen", "tippen": { "selector": "#chat-eingabe", "text": "Nachricht" } },
 *     { "label": "Warten auf Antwort", "warteAufSelector": { "selector": ".chat-scope-block", "timeoutMs": 5000 } },
 *     { "label": "Reload", "reload": true, "screenshot": "03-reload.png" }
 *   ]
 * }
 *
 * 'vorhanden' (F34 Fixpaket, F-624/F-625/F-626): prüft je Beobachtung nur, ob IRGENDEIN Element den
 * Selector matcht (document.querySelector !== null) — für dynamisch von renderEintrag/
 * renderAuftragBruecke erzeugte Klassen ohne stabile ID (anders als 'sichtbarkeit', das eine feste ID
 * + [hidden]/display voraussetzt). 'tippen' (page.fill) und 'warteAufSelector' (page.waitForSelector,
 * Timeout-Überschreitung wird verschluckt statt den Lauf abzubrechen — der nächste Zustands-Schnitt
 * zeigt dann einfach, was WIRKLICH da ist, statt eines Skript-Absturzes) sind generische, wiederver-
 * wendbare Schritt-Arten (kein F34-Spezifikum) — ein Fixture-Server anstelle eines echten LLM-Laufs
 * hinter der Nachricht macht 'warteAufSelector' auch für einen sekundenschnellen Regressionsnachweis
 * praktikabel (features/F34/nachweis-fixpaket-ui/erzeuge-nachweis.mjs).
 *
 * Aufruf: node scripts/render-nachweis.mjs <klickfolge.json> <ausgabeVerzeichnis>
 * NICHT Teil von `npm run check` (braucht eine laufende Server-Instanz UND
 * einen echten Browser) — eigenes Skript `npm run render-nachweis`.
 */

import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Liest den Beobachtungszustand der Seite gemäß der 'beobachtete'-Konfiguration.
 * @param page - die aktuelle Playwright-Seite
 * @param beobachtete - Konfigurationsblock aus der Klickfolge-JSON
 * @returns { spalte: Name -> Wert } für die Markdown-Tabelle
 */
async function leseZustand(page, beobachtete) {
  return page.evaluate((beobachtete) => {
    const zeile = {}
    for (const gruppe of beobachtete.gruppen ?? []) {
      const aktive = gruppe.ids.filter((id) => document.getElementById(id)?.classList.contains(gruppe.aktivKlasse))
      zeile[gruppe.name] = aktive.length === 0 ? '(keiner aktiv)' : aktive.join(', ')
    }
    for (const sicht of beobachtete.sichtbarkeit ?? []) {
      const element = document.getElementById(sicht.id)
      zeile[sicht.name] = element ? getComputedStyle(element).display !== 'none' : '(fehlt)'
    }
    if (beobachtete.titel) {
      const element = document.querySelector(beobachtete.titel.selector)
      zeile[beobachtete.titel.name] = element ? element.textContent.trim() : '(fehlt)'
    }
    for (const eintrag of beobachtete.vorhanden ?? []) {
      zeile[eintrag.name] = document.querySelector(eintrag.selector) !== null
    }
    return zeile
  }, beobachtete)
}

async function main() {
  const [klickfolgePfad, ausgabeVerzeichnis] = process.argv.slice(2)
  if (!klickfolgePfad || !ausgabeVerzeichnis) {
    console.error('Nutzung: node scripts/render-nachweis.mjs <klickfolge.json> <ausgabeVerzeichnis>')
    process.exitCode = 1
    return
  }

  const klickfolge = JSON.parse(readFileSync(klickfolgePfad, 'utf-8'))
  mkdirSync(ausgabeVerzeichnis, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: klickfolge.viewport?.breite ?? 1280, height: klickfolge.viewport?.hoehe ?? 800 },
  })

  const knappesScreenshot = async (dateiname) => {
    const ausschnitt = klickfolge.screenshotAusschnitt
    if (!ausschnitt) {
      await page.screenshot({ path: join(ausgabeVerzeichnis, dateiname) })
      return
    }
    const box = await page.locator(ausschnitt.selector).boundingBox()
    await page.screenshot({ path: join(ausgabeVerzeichnis, dateiname), clip: { x: box.x, y: box.y, width: box.width, height: ausschnitt.hoehe ?? box.height } })
  }

  // Verifikation dieses Skripts, 23.09.2026 (F34 Fixpaket): ein Wurf mitten in der Klickfolge (z. B.
  // page.click läuft in ein Element, das dauerhaft disabled bleibt — realer Fund, s. F-624/F-625-
  // Nachweis) ließ 'browser' bis dahin unkommentiert offen: Playwrights eigener Browser-Handle hält
  // den Node-Event-Loop am Leben, der Prozess (samt Chromium-Kindprozessen) hängt dann UNBEGRENZT,
  // statt mit dem geworfenen Fehler zu beenden — ein orphaner Prozessbaum, der z. B. einen später
  // erneut belegten Port dauerhaft blockiert. try/finally schließt 'browser' jetzt IMMER, auch bei
  // einem Wurf — der Fehler propagiert danach unverändert weiter (main().catch() unten meldet ihn).
  const protokoll = []
  // F34 Fixpaket (löst F-628, real verifiziert 23.09.2026): page.goto(klickfolge.url) auf die
  // BEREITS AKTUELLE URL ist in dieser Umgebung ein No-op — Chromium navigiert nicht neu, wenn Ziel-
  // und aktuelle URL byte-identisch sind (inkl. Hash), der JS-Modulzustand bleibt dadurch unverändert
  // im Speicher stehen. Ein zwischengeschalteter Sprung auf 'about:blank' erzwingt eine ECHTE
  // Navigation (verifiziert per Marker-Test: ein window-Feld überlebt goto(url)→goto(url) unverändert,
  // aber NICHT goto(url)→goto('about:blank')→goto(url)). Betraf bislang unbemerkt jeden 'reload'-
  // Schritt jeder bisherigen Klickfolge — blieb dort folgenlos, weil ein frischer Playwright-Kontext
  // ohnehin leeres localStorage mitbringt (page.reload() selbst hängt bei Hash-URLs in dieser
  // Umgebung, s. u. — kein Ausweg dorthin).
  const erzwingeNavigation = async (url) => {
    await page.goto('about:blank')
    await page.goto(url)
  }
  try {
    await erzwingeNavigation(klickfolge.url)
    for (const schluessel of klickfolge.localStorageEntfernen ?? []) {
      await page.evaluate((s) => localStorage.removeItem(s), schluessel)
    }
    if ((klickfolge.localStorageEntfernen ?? []).length > 0) {
      await erzwingeNavigation(klickfolge.url)
    }

    for (const schritt of klickfolge.schritte) {
      // F34 Fixpaket: 'tippen' VOR 'klick' (Muster: Text erst eintippen, dann Senden-Button klicken,
      // beides innerhalb DESSELBEN Schritts formulierbar).
      if (schritt.tippen) await page.fill(schritt.tippen.selector, schritt.tippen.text)
      if (schritt.klick) await page.click(schritt.klick)
      if (schritt.reload) await erzwingeNavigation(klickfolge.url) // page.reload() hängt bei Hash-URLs (#/chat) in dieser Umgebung — goto() über 'about:blank' erzwingt stattdessen real eine echte Navigation (löst F-628)
      if (schritt.warteAufSelector) {
        // Timeout-Überschreitung wird bewusst verschluckt (Muster networkidle-catch unten) — ein
        // Ausbleiben der erwarteten Antwort ist selbst ein reales, im Protokoll sichtbares Ergebnis
        // (die 'vorhanden'-Beobachtung bleibt dann false), kein Grund, den gesamten Lauf abzubrechen.
        await page.waitForSelector(schritt.warteAufSelector.selector, { timeout: schritt.warteAufSelector.timeoutMs ?? 5000 }).catch(() => {})
      }
      // networkidle statt fixer Wartezeit: ein Klick, der einen ERSTEN Moduswechsel auslöst, lädt
      // seinen Verlauf per Fetch nach (chat.js ladeVerlauf) und rendert erst danach — eine feste,
      // zu kurze Wartezeit las den Zustand hier real vor Abschluss dieses Fetches (Verifikation
      // dieses Skripts, 23.09.2026: Zustand einer Zeile erschien verzögert erst in der nächsten).
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 })
      } catch {
        // Ein Hintergrund-Poll (F20 Zustand-Poll) kann networkidle dauerhaft verhindern —
        // dann bleibt die feste Wartezeit unten die Rückfalllösung.
      }
      await page.waitForTimeout(300)
      const zustand = await leseZustand(page, klickfolge.beobachtete)
      protokoll.push({ label: schritt.label, ...zustand })
      if (schritt.screenshot) await knappesScreenshot(schritt.screenshot)
    }
  } finally {
    await browser.close()
  }

  const spalten = ['Aktion', ...Object.keys(protokoll[0] ?? {}).filter((k) => k !== 'label')]
  const kopf = `| ${spalten.join(' | ')} |`
  const trenner = `| ${spalten.map(() => '---').join(' | ')} |`
  const zeilen = protokoll.map((eintrag) => `| ${[eintrag.label, ...spalten.slice(1).map((s) => String(eintrag[s]))].join(' | ')} |`)
  const markdown = [kopf, trenner, ...zeilen].join('\n')

  writeFileSync(join(ausgabeVerzeichnis, 'protokoll.md'), `${markdown}\n`, 'utf-8')
  writeFileSync(join(ausgabeVerzeichnis, 'protokoll.json'), `${JSON.stringify(protokoll, null, 2)}\n`, 'utf-8')

  console.log(markdown)
  console.log(`\nScreenshots + protokoll.md/protokoll.json in ${ausgabeVerzeichnis}`)
}

main().catch((fehler) => {
  console.error(fehler)
  process.exitCode = 1
})
