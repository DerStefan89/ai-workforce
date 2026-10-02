/**
 * Datei: scripts/check-akte-meilenstein.mjs
 *
 * Zweck: Gate Akte ↔ Meilenstein (F46 D0, löst F-953 mechanisch). Jede Akte
 * features/<id>/feature.md steht in GENAU einem Meilenstein von docs/projekt/roadmap.json,
 * und jeder Roadmap-Eintrag hat eine Akte. Anlassfall F-953: F42 und F44 fehlten in M5, Roadmap-
 * Ansicht und Fortschrittsring zählten sie nicht mit — niemand hat es bemerkt, weil keine Prüfung
 * die beiden Quellen gegeneinander hält.
 *
 * Ausnahmen nur über AUSNAHMEN unten, je mit Art und Begründung:
 * - art 'ohne_meilenstein': die Akte darf in keinem Meilenstein stehen;
 * - art 'ohne_akte': der Roadmap-Eintrag darf ohne Akte sein.
 * Eine Ausnahme, die nicht mehr greift (die Akte steht inzwischen in einem Meilenstein bzw. existiert
 * inzwischen), ist selbst ein Befund — sonst bliebe sie still als Freibrief stehen (Muster
 * KONTRAST_AUSNAHMEN in scripts/check-f20-design-tokens.mjs); ebenso eine Ausnahme ohne ID, ohne
 * Begründung, mit unbekannter Art oder doppelt in der Liste. Doppelte Roadmap-Einträge (auch zweimal
 * im selben Meilenstein) sind nie ausnehmbar.
 *
 * Wird aufgerufen von:
 * - `npm run check` (package.json, direkt nach check-feature)
 * - scripts/check-akte-meilenstein.test.mjs (node:test, importiert pruefeAkteMeilenstein; der
 *   istDirekterAufruf-Wächter am Dateiende verhindert den echten Lauf beim Import)
 *
 * Wichtig — bekannte Grenzen:
 * - Akte heißt: Ordner unter features/ MIT feature.md. Ein Ordner ohne feature.md ist Sache von
 *   scripts/check-feature.mjs, nicht dieses Gates.
 * - Das Gate vergleicht nur IDs, nicht den Status (eine ABGESCHLOSSEN-Akte in einem LAEUFT-
 *   Meilenstein ist zulässig) und nicht die Reihenfolge innerhalb eines Meilensteins.
 * - Die Form von roadmap.json (Schema v0) prüft scripts/check-f33-projektkontext.mjs; hier nur so
 *   viel, wie für den Abgleich nötig ist (meilensteine[].features[] als Strings).
 *
 * Aufruf: node scripts/check-akte-meilenstein.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Begründete Ausnahmen. Form: { id, art: 'ohne_meilenstein' | 'ohne_akte', grund }.
 */
export const AUSNAHMEN = [
  {
    id: 'AF-F001',
    art: 'ohne_meilenstein',
    grund: 'Harness-Grundlage „Feature-Akte im Repo“ aus der Vertragsschiene vor Meilenstein 1 (state/plan-v2-af-f001-feature-akte.md); kein Produktfeature eines Meilensteins.',
  },
  {
    id: 'F30',
    art: 'ohne_akte',
    grund: 'F30 Dogfooding steht seit E-M5-15 in M5; die Akte entsteht mit dem Beginn von F30 nach dem Fixpaket „Arbeitsfähigkeit“ (E-M5-18, geändert 02.10.2026). Entfällt, sobald features/F30/feature.md existiert.',
  },
]

/**
 * Gleicht Akten und Roadmap ab. Reine Funktion — Gate und Test rufen sie auf.
 * @param aktenIds - IDs der Akten (Ordnernamen unter features/ mit feature.md)
 * @param roadmap - geparstes roadmap.json
 * @param ausnahmen - begründete Ausnahmen (Standard AUSNAHMEN)
 * @returns Befunde als Text; leer = sauber
 */
export function pruefeAkteMeilenstein(aktenIds, roadmap, ausnahmen = AUSNAHMEN) {
  const befunde = []
  const meilensteine = roadmap?.meilensteine
  if (!Array.isArray(meilensteine)) return ['roadmap.json: meilensteine fehlt oder ist keine Liste']

  const gesehen = new Set()
  for (const ausnahme of ausnahmen) {
    if (typeof ausnahme.id !== 'string' || ausnahme.id === '') befunde.push(`Ausnahme ohne ID (${JSON.stringify(ausnahme)})`)
    const schluessel = `${ausnahme.id}|${ausnahme.art}`
    if (gesehen.has(schluessel)) befunde.push(`Ausnahme ${ausnahme.id} (${ausnahme.art}) steht doppelt in der Liste`)
    gesehen.add(schluessel)
    if (typeof ausnahme.grund !== 'string' || ausnahme.grund.trim() === '') befunde.push(`Ausnahme ${ausnahme.id}: Begründung fehlt`)
    if (ausnahme.art !== 'ohne_meilenstein' && ausnahme.art !== 'ohne_akte') befunde.push(`Ausnahme ${ausnahme.id}: unbekannte Art „${ausnahme.art}“`)
  }
  const ausgenommen = (id, art) => ausnahmen.some((a) => a.id === id && a.art === art)

  // Fundstellen je Feature-ID: in welchen Meilensteinen (mit Wiederholung) sie steht.
  const fundstellen = new Map()
  for (const [index, meilenstein] of meilensteine.entries()) {
    const name = typeof meilenstein?.id === 'string' ? meilenstein.id : `#${index}`
    if (!Array.isArray(meilenstein?.features)) {
      befunde.push(`Meilenstein ${name}: features fehlt oder ist keine Liste`)
      continue
    }
    for (const id of meilenstein.features) {
      if (typeof id !== 'string' || id === '') {
        befunde.push(`Meilenstein ${name}: Eintrag ist keine Feature-ID (${JSON.stringify(id)})`)
        continue
      }
      fundstellen.set(id, [...(fundstellen.get(id) ?? []), name])
    }
  }

  const akten = new Set(aktenIds)
  for (const id of [...akten].sort((a, b) => a.localeCompare(b))) {
    const orte = fundstellen.get(id) ?? []
    if (orte.length === 0 && !ausgenommen(id, 'ohne_meilenstein')) befunde.push(`Akte ${id} steht in keinem Meilenstein`)
    if (orte.length > 1) befunde.push(`Akte ${id} steht ${orte.length}× in der Roadmap (${orte.join(', ')}) — genau einmal erlaubt`)
  }
  for (const [id, orte] of [...fundstellen].sort(([a], [b]) => a.localeCompare(b))) {
    if (akten.has(id)) continue
    if (orte.length > 1) befunde.push(`Roadmap-Eintrag ${id} steht ${orte.length}× in der Roadmap (${orte.join(', ')}) — genau einmal erlaubt`)
    if (!ausgenommen(id, 'ohne_akte')) befunde.push(`Roadmap-Eintrag ${id} (${orte.join(', ')}) hat keine Akte features/${id}/feature.md`)
  }

  // Veraltete Ausnahmen.
  for (const ausnahme of ausnahmen) {
    if (ausnahme.art === 'ohne_meilenstein' && fundstellen.has(ausnahme.id)) befunde.push(`Ausnahme ${ausnahme.id} (ohne_meilenstein) ist veraltet: die Akte steht in einem Meilenstein`)
    if (ausnahme.art === 'ohne_meilenstein' && !akten.has(ausnahme.id)) befunde.push(`Ausnahme ${ausnahme.id} (ohne_meilenstein) ist veraltet: keine Akte features/${ausnahme.id}/feature.md`)
    if (ausnahme.art === 'ohne_akte' && akten.has(ausnahme.id)) befunde.push(`Ausnahme ${ausnahme.id} (ohne_akte) ist veraltet: die Akte existiert`)
    if (ausnahme.art === 'ohne_akte' && !fundstellen.has(ausnahme.id)) befunde.push(`Ausnahme ${ausnahme.id} (ohne_akte) ist veraltet: kein Roadmap-Eintrag`)
  }
  return befunde
}

/**
 * Liest die Akten-IDs aus einem features/-Verzeichnis.
 * @param featuresDir - Pfad zu features/
 * @returns IDs der Ordner mit feature.md
 */
export function leseAktenIds(featuresDir) {
  if (!existsSync(featuresDir)) return []
  return readdirSync(featuresDir, { withFileTypes: true })
    .filter((eintrag) => eintrag.isDirectory() && existsSync(join(featuresDir, eintrag.name, 'feature.md')))
    .map((eintrag) => eintrag.name)
}

const istDirekterAufruf = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (istDirekterAufruf) {
  console.log('\n=== Akte↔Meilenstein-Check (features/ gegen docs/projekt/roadmap.json) ===\n')
  const aktenIds = leseAktenIds('features')
  let befunde
  if (aktenIds.length === 0) {
    // Falsches Arbeitsverzeichnis darf nicht still grün sein (Muster check-status-akten).
    befunde = ['keine Akte unter features/ gefunden — falsches Arbeitsverzeichnis?']
  } else {
    try {
      befunde = pruefeAkteMeilenstein(aktenIds, JSON.parse(readFileSync('docs/projekt/roadmap.json', 'utf-8')))
    } catch (fehler) {
      befunde = [`docs/projekt/roadmap.json nicht lesbar: ${fehler instanceof Error ? fehler.message : String(fehler)}`]
    }
  }
  if (befunde.length === 0) {
    for (const ausnahme of AUSNAHMEN) console.log(`  Ausnahme ${ausnahme.id} (${ausnahme.art}): ${ausnahme.grund}`)
    console.log(`✓ ${aktenIds.length} Akte(n) gegen die Roadmap geprüft, keine Befunde.\n`)
    process.exit(0)
  }
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const befund of befunde) console.log(`  - ${befund}`)
  console.log('')
  process.exit(1)
}
