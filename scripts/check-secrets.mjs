/**
 * Datei: scripts/check-secrets.mjs
 *
 * Zweck: F45 B1a-2 (F-1024) — lokaler Secret-Scan in `npm run check`, damit Testattrappen oder echte
 * Geheimnisse nicht erst nach dem Push in der CI auffallen. Gleiches Verhalten wie Teil (c) der
 * Mindest-Gates des Projekt-Skeletts: die Prüfung wird von dort importiert
 * (vorlagen/projekt-skelett/scripts/check-gates.mjs, pruefeSecrets) — eine Quelle, kein zweiter Code.
 * gitleaks aus dem PATH, sonst per Docker (gleiche Fassung wie .github/workflows/ci.yml), sonst ein
 * sichtbarer Hinweis (kein Exit 1, nie stilles Überspringen). Gescannt wird der Arbeitsbaum ohne Git
 * (`--no-git`), wie in der CI — lokal also auch ungetrackte Ordner (z. B. `kontrollzustand/`).
 * Keine Allowlist: Testattrappen werden zur Laufzeit zusammengesetzt.
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-secrets.mjs
 * Exit 0 = keine Funde oder Hinweis (Werkzeug fehlt), Exit 1 = Funde oder Scan fehlgeschlagen
 */

import { pruefeSecrets } from '../vorlagen/projekt-skelett/scripts/check-gates.mjs'

console.log('\n=== Secret-Scan (lokal) ===\n')
const ergebnis = pruefeSecrets(process.cwd())
const zeichen = { gruen: '✓', hinweis: '⚠', rot: '✗' }[ergebnis.stufe]
console.log(`${zeichen} ${ergebnis.zeilen[0]}`)
for (const zeile of ergebnis.zeilen.slice(1)) console.log(zeile)
console.log('')
process.exit(ergebnis.stufe === 'rot' ? 1 : 0)
