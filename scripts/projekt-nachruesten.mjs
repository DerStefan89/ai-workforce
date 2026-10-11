/**
 * Datei: scripts/projekt-nachruesten.mjs
 *
 * Zweck: F45 B1a-2 (Umfang 5) — CLI zum Nachrüsten eines bestehenden Projekts mit fehlenden Dateien des
 * Projekt-Skeletts. Dünne Hülle um src/projekt-anlegen/nachruesten.ts (Regeln und Pfadprüfung dort);
 * diese Datei selbst startet kein Git.
 *
 * Wird aufgerufen von: npm run projekt:nachruesten (package.json), scripts/projekt-nachruesten.test.mjs.
 *
 * Aufruf: npm run projekt:nachruesten -- <Projektpfad> [--anwenden]
 * Exit 0 = Bericht ausgegeben (Probelauf oder vollständig angewendet)
 * Exit 1 = beim Anwenden ist mindestens eine Kopie gescheitert (Bericht nennt Kopiertes und Fehler) oder
 *          Abbruch vor dem ersten Schreiben (Ziel außerhalb des Projekts — dann nichts geschrieben)
 * Exit 2 = Aufruf falsch oder Ziel abgelehnt (nichts geschrieben)
 */

import { formatiereNachruestBericht, nachruesten, pruefeNachruestZiel } from '../src/projekt-anlegen/nachruesten.ts'

const argumente = process.argv.slice(2)
const anwenden = argumente.includes('--anwenden')
const unbekannt = argumente.filter((a) => a.startsWith('--') && a !== '--anwenden')
const pfade = argumente.filter((a) => !a.startsWith('--'))

if (unbekannt.length > 0 || pfade.length !== 1) {
  console.error('Aufruf: npm run projekt:nachruesten -- <Projektpfad> [--anwenden]')
  if (unbekannt.length > 0) console.error(`Unbekannte Option: ${unbekannt.join(', ')}`)
  if (pfade.length > 1) console.error(`Genau ein Projektpfad erwartet, erhalten: ${pfade.length}`)
  process.exit(2)
}

let pruefung
try {
  pruefung = pruefeNachruestZiel(pfade[0])
} catch (fehler) {
  pruefung = { ok: false, grund: fehler instanceof Error ? fehler.message : String(fehler) }
}
if (!pruefung.ok) {
  console.error(`Abgelehnt: ${pruefung.grund}`)
  process.exit(2)
}

try {
  const bericht = nachruesten(pruefung.projektWurzel, anwenden)
  for (const zeile of formatiereNachruestBericht(bericht, anwenden)) console.log(zeile)
  process.exit(bericht.fehler.length > 0 ? 1 : 0)
} catch (fehler) {
  console.error(`[projekt-nachruesten] ${fehler instanceof Error ? fehler.message : String(fehler)}`)
  process.exit(1)
}
