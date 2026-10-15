/**
 * Datei: features/F45/nachweise/b2b1b/schwaerze.mjs
 *
 * Zweck: Schwärzung der Spike-Rohströme F-1105 (Muster wie f3a/f3b2) und der Zählungen der Startfreigabe
 * (F-1111 (3)): Temp-Ordner → <TEMP>, Benutzerverzeichnis → <HOME>, Pipe-Name in messaging_socket_path → <PIPE>.
 * Arbeitet auf dem rohen Text, damit alles andere byte-gleich bleibt.
 * Als Skript: `node schwaerze.mjs <datei>...` schwärzt NDJSON-Dateien an Ort und Stelle und prüft jede Zeile auf
 * gültiges JSON; `node schwaerze.mjs --json <datei>...` behandelt jede Datei als ganzes (mehrzeiliges) JSON-Dokument.
 *
 * Wird aufgerufen von:
 * - docs/harness/startfreigabe-erneuern.md, Schritt 2a (`--json`)
 * - features/F45/nachweise/b2b1b/spike-f1105.mjs, spike-f1105-stdin.mjs, features/F45/nachweise/b2b2a/spike-reviewer-schema.mjs
 * - features/F45/nachweise/b2b1b/schwaerze.test.mjs
 *
 * Wichtig:
 * Temp vor Home (unter Windows liegt der Temp-Ordner im Benutzerverzeichnis) und je Pfad die längere Escape-Form vor
 * der kürzeren — sonst bleiben Teilstücke stehen. Im Modus `--json` bricht das Skript ab, ohne zu schreiben, wenn
 * der Name des Benutzerordners danach noch als Pfadsegment vorkommt (Restprüfung).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const regexSicher = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Schreibweisen eines Pfads: doppelt JSON-escaped (JSON-Text in einem JSON-String, z. B. Werkzeugergebnis in der
 * Zählung von CLI 2.1.299), JSON-escaped, Vorwärtsstriche, Projekt-Slug wie `C--Users-name`, roh (Klartext wie stderr).
 * @param {string} pfad
 * @returns {string[]}
 */
const schreibweisen = (pfad) => [
  pfad.replaceAll('\\', '\\\\\\\\'),
  pfad.replaceAll('\\', '\\\\'),
  pfad.replaceAll('\\', '/'),
  pfad.replace(/[^A-Za-z0-9]/g, '-'),
  pfad,
]

/**
 * Ersetzt alle Schreibweisen des Temp-Ordners durch <TEMP>, danach die des Benutzerverzeichnisses durch <HOME>, und
 * den Wert von messaging_socket_path durch <PIPE>. Pfade mit weniger als zwei Segmenten (z. B. `/` als HOME im
 * Container) werden übersprungen, weil sie jeden Schrägstrich bzw. Bindestrich träfen.
 * @param {string} text roher Text (NDJSON oder JSON)
 * @param {string} [home] Benutzerverzeichnis, Standard os.homedir()
 * @param {string} [temp] Temp-Ordner, Standard os.tmpdir()
 * @returns {string} geschwärzter Text
 */
export function schwaerze(text, home = homedir(), temp = tmpdir()) {
  let s = text
  for (const [pfad, marke] of [
    [temp, '<TEMP>'],
    [home, '<HOME>'],
  ]) {
    if (!pfad || pfad.split(/[\\/]/).filter(Boolean).length < 2) continue
    for (const form of schreibweisen(pfad)) s = s.replace(new RegExp(regexSicher(form), 'gi'), marke)
  }
  return s.replace(/("messaging_socket_path"\s*:\s*)"[^"]*"/g, '$1"<PIPE>"')
}

/**
 * Restprüfung: findet der Name des Benutzerordners noch als Pfadsegment (zwischen `\`, `/` oder `-`) im Text,
 * z. B. in einer Escape-Form, die `schwaerze` nicht kennt.
 * @param {string} text geschwärzter Text
 * @param {string} [home] Benutzerverzeichnis, Standard os.homedir()
 * @returns {boolean}
 */
export function hatRestpfad(text, home = homedir()) {
  const name = basename(home)
  if (!name) return false
  return new RegExp(`(^|[\\\\/-])${regexSicher(name)}([\\\\/-]|$)`, 'im').test(text)
}

/**
 * Prüft den geschwärzten Text: im JSON-Modus als ganzes Dokument, sonst jede nicht leere Zeile.
 * @param {string} text geschwärzter Text
 * @param {boolean} ganzesJson
 * @returns {string | null} Fehlerbeschreibung oder null
 */
function pruefeJson(text, ganzesJson) {
  const teile = ganzesJson ? [text] : text.split('\n').filter(Boolean)
  for (const [i, teil] of teile.entries()) {
    try {
      JSON.parse(teil)
    } catch (fehler) {
      return `${ganzesJson ? 'Datei' : `Zeile ${i + 1}`} kein gültiges JSON nach Schwärzung: ${fehler instanceof Error ? fehler.message : fehler}`
    }
  }
  return null
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argumente = process.argv.slice(2)
  const ganzesJson = argumente.includes('--json')
  for (const datei of argumente.filter((a) => a !== '--json')) {
    const neu = schwaerze(readFileSync(datei, 'utf8'))
    const fehler = pruefeJson(neu, ganzesJson) ?? (ganzesJson && hatRestpfad(neu) ? 'Benutzerordner nach Schwärzung noch enthalten' : null)
    if (fehler) {
      console.error(`${datei}: ${fehler}`)
      process.exit(1)
    }
    writeFileSync(datei, neu)
    console.log(`geschwärzt: ${datei}`)
  }
}
