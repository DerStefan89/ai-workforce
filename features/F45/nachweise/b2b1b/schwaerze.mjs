// Schwärzung der Spike-Rohströme F-1105 (Muster wie f3a/f3b2): Benutzerverzeichnis → <HOME>, Pipe-Name in
// messaging_socket_path → <PIPE>. Arbeitet auf dem rohen NDJSON-Text, damit alles andere byte-gleich bleibt.
// Als Skript: `node schwaerze.mjs <datei>...` schwärzt die Dateien an Ort und Stelle und prüft jede Zeile auf gültiges JSON.
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const regexSicher = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Ersetzt alle Schreibweisen des Benutzerverzeichnisses (JSON-escaped, Vorwärtsstriche, Projekt-Slug wie
 * `C--Users-name`) durch <HOME> und den Wert von messaging_socket_path durch <PIPE>.
 * @param {string} text roher NDJSON-Text
 * @param {string} [home] Benutzerverzeichnis, Standard os.homedir()
 * @returns {string} geschwärzter Text
 */
export function schwaerze(text, home = homedir()) {
  const formen = [home.replaceAll('\\', '\\\\'), home.replaceAll('\\', '/'), home.replace(/[^A-Za-z0-9]/g, '-')]
  let s = text
  for (const form of formen) s = s.replace(new RegExp(regexSicher(form), 'gi'), '<HOME>')
  return s.replace(/("messaging_socket_path"\s*:\s*)"[^"]*"/g, '$1"<PIPE>"')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const datei of process.argv.slice(2)) {
    const neu = schwaerze(readFileSync(datei, 'utf8'))
    neu.split('\n').filter(Boolean).forEach((zeile, i) => {
      try {
        JSON.parse(zeile)
      } catch (fehler) {
        console.error(`${datei}:${i + 1} kein gültiges JSON nach Schwärzung`, fehler)
        process.exit(1)
      }
    })
    writeFileSync(datei, neu)
    console.log(`geschwärzt: ${datei}`)
  }
}
