#!/usr/bin/env node
/**
 * Datei: scripts/check-dateigroesse.mjs
 *
 * Zweck: Harte Dateigrenze für Code-Dateien (F45 B3a). Ein neues Projekt hat keinen Bestand, deshalb gibt es keine
 * Ratsche: jede Code-Datei über GRENZE Zeilen macht das Gate rot. Zählt wie `wc -l` (eine letzte Zeile ohne
 * Zeilenumbruch zählt mit). Läuft auch ohne Code-Dateien (dann grün) und ohne Abhängigkeit. Nicht gezählt: `node_modules`
 * und Punkt-Ordner in jeder Tiefe (`.git`, `.claude` mit den Harness-Hooks, Ausgaben wie `.next`), `dist`/`build`/
 * `coverage` an der Wurzel und symbolische Links (keine Schleifen). Weitere Ausgabe-Ordner oder erzeugter Code nur mit
 * Begründung (AUSNAHMEN bzw. UEBERSPRUNGEN_WURZEL). Gegenstück: Ausnahmen in biome.json/tsconfig.json der Gate-Vorlage
 * docs/harness/gate-vorlage-node.md.
 *
 * Wird aufgerufen von: `npm run check` (package.json).
 *
 * Aufruf: node scripts/check-dateigroesse.mjs
 * Exit 0 = alle Code-Dateien innerhalb der Grenze, 1 = mindestens eine darüber
 */

import { readdirSync, readFileSync, realpathSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const GRENZE = 800

/** Endungen, die als Code-Datei zählen. */
export const CODE_ENDUNGEN = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])

/** Ordner, die nur direkt unter der Wurzel übersprungen werden (erzeugte Ausgaben). */
const UEBERSPRUNGEN_WURZEL = new Set(['dist', 'build', 'coverage'])

/**
 * Ausnahmen nur mit Begründung: ['pfad/relativ/zur/wurzel.ts', 'Grund'] (Schrägstrich als Trenner).
 * @type {ReadonlyMap<string, string>}
 */
export const AUSNAHMEN = new Map([])

/**
 * Zählt Zeilen wie `wc -l`, zuzüglich einer letzten Zeile ohne Zeilenumbruch.
 * @param {string} text - Dateiinhalt
 * @returns {number} Anzahl Zeilen
 */
export function zaehleZeilen(text) {
  if (text === '') return 0
  const umbrueche = text.split('\n').length - 1
  return text.endsWith('\n') ? umbrueche : umbrueche + 1
}

/**
 * Sammelt alle Code-Dateien unter einem Ordner (relativ, mit Schrägstrich).
 * @param {string} wurzel - Startordner
 * @param {string} ordner - aktueller Ordner
 * @param {string[]} ergebnis - Sammelliste (wird ergänzt)
 * @returns {string[]} relative Pfade
 */
function sammleCodeDateien(wurzel, ordner = wurzel, ergebnis = []) {
  for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
    const pfad = join(ordner, eintrag.name)
    if (eintrag.isDirectory()) {
      const uebersprungen =
        eintrag.name === 'node_modules' ||
        eintrag.name.startsWith('.') ||
        (ordner === wurzel && UEBERSPRUNGEN_WURZEL.has(eintrag.name))
      if (!uebersprungen) sammleCodeDateien(wurzel, pfad, ergebnis)
    } else if (eintrag.isFile() && CODE_ENDUNGEN.has(extname(eintrag.name))) {
      ergebnis.push(relative(wurzel, pfad).split(sep).join('/'))
    }
  }
  return ergebnis
}

/**
 * Prüft alle Code-Dateien unter `wurzel` gegen die Grenze.
 * @param {string} wurzel - Projektordner
 * @param {ReadonlyMap<string, string>} ausnahmen - Pfad → Begründung
 * @returns {{ pfad: string, zeilen: number }[]} Dateien über der Grenze, sortiert
 */
export function pruefeDateigroessen(wurzel, ausnahmen = AUSNAHMEN) {
  return sammleCodeDateien(wurzel)
    .filter((pfad) => !ausnahmen.has(pfad))
    .map((pfad) => ({ pfad, zeilen: zaehleZeilen(readFileSync(join(wurzel, pfad), 'utf8')) }))
    .filter((datei) => datei.zeilen > GRENZE)
    .sort((a, b) => a.pfad.localeCompare(b.pfad))
}

/**
 * Direkter Aufruf? Vergleich über realpath — Node lädt das Hauptmodul über den aufgelösten Pfad; ein Aufruf über eine
 * Junction oder einen Symlink darf das Gate nicht still überspringen.
 * @returns {boolean} true bei `node scripts/check-dateigroesse.mjs`
 */
function istHaupteinstieg() {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (istHaupteinstieg()) {
  const zuGross = pruefeDateigroessen(process.cwd())
  if (zuGross.length === 0) {
    console.log(`✓ Dateigrenze: keine Code-Datei über ${GRENZE} Zeilen`)
  } else {
    for (const { pfad, zeilen } of zuGross) console.error(`✗ ${pfad}: ${zeilen} Zeilen (Grenze ${GRENZE})`)
    console.error('Datei teilen; eine Ausnahme nur mit Begründung in AUSNAHMEN (scripts/check-dateigroesse.mjs).')
    process.exitCode = 1
  }
}
