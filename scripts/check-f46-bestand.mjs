/**
 * Datei: scripts/check-f46-bestand.mjs
 *
 * Zweck: Gate „Bestand bleibt“ (Stefan, 02.10.2026; docs/design/abgleich-f46.md §1 und Leitprinzip).
 * Die Designs unter docs/design/neu/ zeigen die Seitenleiste vereinfacht — das ist keine Vorgabe zum
 * Entfernen. Dieses Gate hält fest, was aus F44 (Vorlage V10) bleiben muss:
 *   (a) die Bilder public/leitstand/assets/gear.webp und public/leitstand/persona-gesicht.webp existieren;
 *   (b) index.html enthält die Wortmarke (.brand, #shell-marke), „Zuletzt geöffnet“ (#shell-zuletzt),
 *       den unteren Bereich nav.side-bottom mit der Illustration img.side-art (src /assets/gear.webp)
 *       und dem Profil (#shell-profil), sowie das Persona-Bild am Chat-Knopf (#chat-umschalter) und an
 *       der Blase (#chat-blase);
 *   (c) die Haupteinträge der Seitenleiste: oben Produktübersicht, Roadmap, Entwicklung,
 *       Entscheidungen, Produktzyklus, Brain (#shell-nav); unten Alle Produkte, Nutzung, Einstellungen,
 *       Workforce (nav.side-bottom).
 * Neu darf nur dazukommen (z. B. der Zähler an „Entscheidungen“, F46 D2); was hier fehlt, ist ein
 * Befund. Grün- und Rot-Fälle: scripts/check-f46-bestand.test.mjs.
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-f46-bestand.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync } from 'node:fs'

/** Bilder, die bleiben (Pfad relativ zur Repo-Wurzel). */
export const BILDER = ['public/leitstand/assets/gear.webp', 'public/leitstand/persona-gesicht.webp']

/** Haupteinträge oben (#shell-nav): data-nav-view → Name. */
export const EINTRAEGE_OBEN = { dashboard: 'Produktübersicht', roadmap: 'Roadmap', workboard: 'Entwicklung', attention: 'Entscheidungen', produktzyklus: 'Produktzyklus', brain: 'Brain' }

/** Einträge unten (nav.side-bottom): data-nav-view → Name. */
export const EINTRAEGE_UNTEN = { 'projekte-uebersicht': 'Alle Produkte', nutzung: 'Nutzung', einstellungen: 'Einstellungen', capabilities: 'Workforce' }

/**
 * Das öffnende Tag des Elements mit der id, oder null.
 * @param html - Quelltext
 * @param id - Element-id
 * @returns Tag-Text oder null
 */
function tagMitId(html, id) {
  return html.match(new RegExp(`<[a-z]+\\b[^>]*\\bid="${id}"[^>]*>`))?.[0] ?? null
}

/**
 * Der Abschnitt ab dem öffnenden Tag bis zum zugehörigen schließenden Tag desselben Namens (ohne
 * Verschachtelung desselben Elementtyps — für nav/button hier ausreichend).
 * @param html - Quelltext
 * @param muster - RegExp des öffnenden Tags
 * @param name - Elementname
 * @returns Abschnitt oder null
 */
function abschnitt(html, muster, name) {
  const treffer = html.match(muster)
  if (treffer === null) return null
  const start = treffer.index
  const ende = html.indexOf(`</${name}>`, start)
  return ende < 0 ? null : html.slice(start, ende)
}

/**
 * Prüft den Bestand (rein: Quelltext und Dateiprüfung kommen herein).
 * @param html - Inhalt von public/leitstand/index.html
 * @param existiert - (pfad) => boolean für BILDER
 * @returns Befunde (leer = sauber)
 */
export function pruefeBestand(html, existiert) {
  const befunde = []
  for (const bild of BILDER) if (!existiert(bild)) befunde.push(`(a) Bild fehlt: ${bild}`)

  const marke = tagMitId(html, 'shell-marke')
  if (marke === null || !/\bclass="[^"]*\bbrand\b/.test(marke)) befunde.push('(b) Wortmarke .brand mit id shell-marke fehlt')
  if (tagMitId(html, 'shell-zuletzt') === null) befunde.push('(b) „Zuletzt geöffnet“ (#shell-zuletzt) fehlt')
  const unten = abschnitt(html, /<nav\b[^>]*\bclass="[^"]*\bside-bottom\b[^"]*"[^>]*>/, 'nav')
  if (unten === null) befunde.push('(b) unterer Bereich nav.side-bottom fehlt')
  else {
    if (!/<img\b(?=[^>]*\bclass="[^"]*\bside-art\b)(?=[^>]*\bsrc="\/assets\/gear\.webp")[^>]*>/.test(unten)) befunde.push('(b) Illustration img.side-art mit src /assets/gear.webp fehlt in nav.side-bottom')
    if (!/\bid="shell-profil"/.test(unten)) befunde.push('(b) Profil (#shell-profil) fehlt in nav.side-bottom')
    for (const [view, name] of Object.entries(EINTRAEGE_UNTEN)) if (!new RegExp(`data-nav-view="${view}"`).test(unten)) befunde.push(`(c) Eintrag unten fehlt: ${name} (data-nav-view="${view}")`)
  }
  for (const id of ['chat-umschalter', 'chat-blase']) {
    const knopf = abschnitt(html, new RegExp(`<button\\b[^>]*\\bid="${id}"[^>]*>`), 'button')
    if (knopf === null || !/<img\b[^>]*\bsrc="\/persona-gesicht\.webp"/.test(knopf)) befunde.push(`(b) Persona-Bild (/persona-gesicht.webp) fehlt an #${id}`)
  }
  const oben = abschnitt(html, /<nav\b[^>]*\bid="shell-nav"[^>]*>/, 'nav')
  if (oben === null) befunde.push('(c) Hauptnavigation #shell-nav fehlt')
  else for (const [view, name] of Object.entries(EINTRAEGE_OBEN)) if (!new RegExp(`data-nav-view="${view}"`).test(oben)) befunde.push(`(c) Eintrag oben fehlt: ${name} (data-nav-view="${view}")`)
  return befunde
}

// Nur als Skript ausführen, nicht beim Import durch den Test.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/check-f46-bestand.mjs')) {
  console.log('\n=== F46-Bestand-Check (Seitenleiste, Bilder, Persona — „Bestand bleibt“) ===\n')
  const befunde = pruefeBestand(readFileSync('public/leitstand/index.html', 'utf8'), (pfad) => existsSync(pfad))
  if (befunde.length > 0) {
    for (const befund of befunde) console.error(`✗ ${befund}`)
    process.exit(1)
  }
  console.log('✓ Keine Befunde: Wortmarke, Zuletzt geöffnet, Illustration, Profil, Persona an Chat-Knopf und Blase, alle Haupteinträge vorhanden.')
}
