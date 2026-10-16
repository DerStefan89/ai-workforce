/**
 * Datei: features/F45/nachweise/b2b3e1/render/erzeuge-nachweis.mjs
 *
 * Zweck: Nachweis F45 B2b-3e-1 „keine persönlichen Pfade in Render-Screenshots“ (F-1125) gegen die Testinstanz
 * features/F45/nachweise/b2b3e1/instanz.mjs (Port 4405, neutrale Umgebung):
 * - n1-projekt-de-1440 : `#/projekt` ganze Seite — die Pfadprobe vor dem Screenshot ist sauber, „Wo gearbeitet wird“ zeigt den
 *   neutralen Arbeitsordner (Spalte „Projektordner“ = `.umgebung-pfad`); ein Bild, Spalte „Pfadprobe“ = sauber.
 * - n2-eingeschleust   : derselbe Weg, GET …/code antwortet (im Browser, anfragenAntworten) mit einem ERFUNDENEN persönlichen
 *   Pfad als `absoluterPfad` (`C:\Users\anna\…`, kein echter Nutzer) — die Probe vor dem Screenshot muss abbrechen.
 * - n3-nur-protokoll   : derselbe eingeschleuste Pfad, aber ohne Screenshot und mit 'texte' auf `.umgebung-pfad` — der Pfad
 *   steht nur im Protokoll; die Probe vor dem Schreiben von protokoll.md muss abbrechen (Korrekturrunde, qa 3).
 * n2/n3 belegen den Abbruch über die Meldung (Ort und Fundstelle) und darüber, dass im Ordner weder Bild noch protokoll.* liegt
 * (Delta-Pass B2), nicht nur über den Exit-Code. Ergebnis je Fall in <ordner>/ergebnis.json — vor dem Schreiben prüft die
 * Pfadprobe die Meldung ohne den erfundenen Pfad (ein echter Pfad dort bricht ab, code-reviewer 10).
 *
 * Aufruf: node features/F45/nachweise/b2b3e1/render/erzeuge-nachweis.mjs [basis]
 * Wird aufgerufen von: Hand. Nicht Teil von `npm run check`.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pruefeAufPersoenlichePfade } from '../../../../../scripts/render-pfadprobe.mjs'

const [basis = 'http://127.0.0.1:4405'] = process.argv.slice(2)
const ziel = dirname(fileURLToPath(import.meta.url))
const wurzel = resolve(ziel, '../../../../..')
const HELFER = join(wurzel, 'scripts/render-nachweis.mjs')
/** Erfundener Nutzerordner für n2/n3 — kein echter Nutzer. */
const ERFUNDEN_NUTZER = 'C:\\Users\\anna'
const ERFUNDEN = `${ERFUNDEN_NUTZER}\\AppData\\Local\\Temp\\f45-erfunden\\projekt`

const BEOBACHTUNG = {
  texte: [{ name: 'Projektordner', selector: '.umgebung-pfad' }],
  vorhanden: [{ name: 'Formular', selector: '#auftrag-formular' }],
  ueberlauf: true,
}

/**
 * Schreibt die Klickfolge in einen frischen Ordner (alte Bilder/Protokolle/Ergebnisse weg).
 * @param name - Ordnername
 * @param folge - Klickfolge
 * @returns { verzeichnis, datei }
 */
function bereite(name, folge) {
  const verzeichnis = join(ziel, name)
  mkdirSync(verzeichnis, { recursive: true })
  for (const eintrag of readdirSync(verzeichnis)) if (/\.(webp|png)$|^protokoll\.|^ergebnis\.json$/.test(eintrag)) rmSync(join(verzeichnis, eintrag))
  const datei = join(verzeichnis, 'klickfolge.json')
  writeFileSync(datei, `${JSON.stringify(folge, null, 2)}\n`)
  return { verzeichnis, datei }
}

/** Ein Schritt auf `#/projekt`, wartet auf den Projektordner. @param bild - Dateiname oder undefined (kein Screenshot) @returns Schritt */
const schritt = (bild) => ({ label: '#/projekt, „Wo gearbeitet wird“ geladen', warteAufSelector: { selector: '.umgebung-pfad', timeoutMs: 10000 }, ...(bild ? { screenshot: bild } : {}) })

/**
 * Lässt einen Fall laufen, der abbrechen muss, und hält den Beleg fest.
 * @param name - Ordnername
 * @param folge - Klickfolge
 * @param ort - erwarteter Ort in der Meldung
 * @returns true, wenn der Abbruch belegt ist
 */
function erwarteAbbruch(name, folge, ort) {
  const { verzeichnis, datei } = bereite(name, folge)
  console.log(`\n=== ${name} (Abbruch erwartet) ===`)
  let exitCode = 0
  let meldung = ''
  try {
    execFileSync(process.execPath, [HELFER, datei, verzeichnis], { stdio: ['ignore', 'pipe', 'pipe'], cwd: wurzel, encoding: 'utf8' })
  } catch (fehler) {
    exitCode = fehler.status ?? -1
    meldung = (String(fehler.stderr ?? '').split('\n').find((z) => z.includes('Pfadprobe')) ?? String(fehler.stderr ?? fehler.message)).trim()
  }
  const dateien = readdirSync(verzeichnis)
  const ergebnis = {
    hinweis: `Der Pfad ${ERFUNDEN_NUTZER}\\… ist erfunden (kein echter Nutzer) und nur im Browser eingeschleust.`,
    exitCode,
    meldung,
    ortGenannt: meldung.includes(ort),
    fundstelleGenannt: meldung.includes(ERFUNDEN_NUTZER),
    bildVorhanden: dateien.some((d) => /\.(webp|png)$/.test(d)),
    protokollVorhanden: dateien.some((d) => d.startsWith('protokoll.')),
  }
  ergebnis.abbruchBelegt = exitCode !== 0 && ergebnis.ortGenannt && ergebnis.fundstelleGenannt && !ergebnis.bildVorhanden && !ergebnis.protokollVorhanden
  const json = JSON.stringify(ergebnis, null, 2)
  // Nur der erfundene Pfad darf in der Datei stehen — maskiert, damit ein echter Fund daneben abbricht.
  pruefeAufPersoenlichePfade(json.split(ERFUNDEN_NUTZER.replace(/\\/g, '\\\\')).join('<ERFUNDEN>').split(ERFUNDEN_NUTZER).join('<ERFUNDEN>'), `${name}/ergebnis.json`)
  writeFileSync(join(verzeichnis, 'ergebnis.json'), `${json}\n`)
  console.log(json)
  return ergebnis.abbruchBelegt
}

// ─── n1: sauber ──────────────────────────────────────────────────────────────
{
  const { verzeichnis, datei } = bereite('n1-projekt-de-1440', { url: `${basis}/#/projekt`, viewport: { breite: 1440, hoehe: 1600 }, screenshotVollseite: true, beobachtete: BEOBACHTUNG, schritte: [schritt('01-de-1440.webp')] })
  console.log('\n=== n1-projekt-de-1440 ===')
  execFileSync(process.execPath, [HELFER, datei, verzeichnis], { stdio: 'inherit', cwd: wurzel })
}

// ─── n2/n3: eingeschleuster (erfundener) Pfad ⇒ Abbruch ohne Bild und Protokoll ─
const echt = await (await fetch(`${basis}/api/code`)).json()
const eingeschleust = { url: `${basis}/#/projekt`, viewport: { breite: 1440, hoehe: 1600 }, screenshotVollseite: true, anfragenAntworten: [{ muster: '**/api/code', methode: 'GET', status: 200, json: { ...echt, absoluterPfad: ERFUNDEN } }], beobachtete: BEOBACHTUNG }
const n2 = erwarteAbbruch('n2-eingeschleust', { ...eingeschleust, schritte: [schritt('01-eingeschleust.webp')] }, 'Screenshot 01-eingeschleust.webp')
const n3 = erwarteAbbruch('n3-nur-protokoll', { ...eingeschleust, schritte: [schritt(undefined)] }, 'protokoll.md')
if (!n2 || !n3 || !existsSync(join(ziel, 'n1-projekt-de-1440', '01-de-1440.webp'))) process.exitCode = 1
