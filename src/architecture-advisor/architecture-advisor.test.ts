/**
 * Datei: src/architecture-advisor/architecture-advisor.test.ts
 *
 * Zweck: node:test-Fälle für leseUrteilAusAdvisorText und baueArchitectureAdvisorAuftragstext
 * (F-641). Der Rot-Fall ist die REALE Advisor-Antwort aus Lauf
 * 4b3ebc42-91df-422b-9dd4-b2fc02dc4151 (F39-WS-3b-Reallauf, 23.09.2026), wörtlich übernommen
 * (kontrollzustand-roh/4b3ebc42-…/rohstrom.json, 'result'-Feld) — kein konstruierter Fall.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { baueArchitectureAdvisorAuftragstext, leseUrteilAusAdvisorText } from './index.ts'

// Wörtlich aus kontrollzustand-roh/4b3ebc42-91df-422b-9dd4-b2fc02dc4151/rohstrom.json,
// 'result'-Feld — die reale Advisor-Antwort, die F-641 auslöste: kein Urteil, stattdessen ein
// Plan, die Dokumentation selbst zu schreiben, und eine Bitte um Schreibzugriff.
const REALE_ADVISOR_ANTWORT_OHNE_URTEIL = `I've reviewed the necessary context (\`ARCHITECTURE.md\`, \`docs/STATUS.md\`, \`beschreibung.md\`, \`roadmap.json\`, \`check-feature.mjs\`, \`feature-status.ts\`, \`validiereRoadmapDaten\`, and F33's \`feature.md\` as a template) and have a clear picture of what needs to be added. However, I only have read-only tools available in this session (Glob, Grep, Read) — no Write, Edit, or Bash tool is available to me right now, so I can't actually create or modify any files.

To proceed I'd need write access. Once available, the plan is:

1. **\`docs/projekt/kontext/beschreibung.md\`** — append two sections: \`## Scout-Kandidaten\` with \`(keine)\`, and \`## Für den Architekten (F39)\` with the four Architektur-Hinweise bullets from the order.
2. **\`docs/projekt/roadmap.json\`** — append a new milestone \`M6\` (\`titel\`: "Sparring-Auftragsverweise absichern", \`status: "GEPLANT"\`, \`features: ["F42"]\`) to the existing \`meilensteine\` array — matches \`validiereRoadmapDaten\`'s pattern (\`^F[0-9]+[A-Za-z]?$\`, unique milestone id).
3. **\`features/F42/feature.md\`** — new file, \`Status: ENTWURF\`, with \`## Ziel\`, \`## Nicht-Ziele\`, \`## Akzeptanzkriterien\`, \`## Dependencies\` sections drawn from the F42 spec in the order.
4. Run \`npm run check\` to confirm green.

Could you grant Write/Edit tool access (or Bash) so I can make these changes?`

test('leseUrteilAusAdvisorText: die reale Advisor-Antwort ohne Urteil (F-641, Lauf 4b3ebc42) liefert null', () => {
  assert.strictEqual(leseUrteilAusAdvisorText(REALE_ADVISOR_ANTWORT_OHNE_URTEIL), null)
})

test('leseUrteilAusAdvisorText: null-Text liefert null', () => {
  assert.strictEqual(leseUrteilAusAdvisorText(null), null)
})

test('leseUrteilAusAdvisorText: eine Antwort mit Urteil-Zeile liefert den getrimmten Wert', () => {
  assert.strictEqual(leseUrteilAusAdvisorText('Der Entwurf ist angemessen.\n\nUrteil: BEREIT\n'), 'BEREIT')
})

test('leseUrteilAusAdvisorText: die Urteil-Zeile muss nicht die letzte sein', () => {
  assert.strictEqual(leseUrteilAusAdvisorText('Urteil: BLOCKIERT\n\nBegründung folgt hier.'), 'BLOCKIERT')
})

test('leseUrteilAusAdvisorText: ein unbekannter Urteilswert wird trotzdem gelesen (Regel 1d prüft nur Vorhandensein)', () => {
  assert.strictEqual(leseUrteilAusAdvisorText('Urteil: VIELLEICHT'), 'VIELLEICHT')
})

test("leseUrteilAusAdvisorText: 'Urteil' ohne Doppelpunkt zählt nicht als Urteil-Zeile", () => {
  assert.strictEqual(leseUrteilAusAdvisorText('Mein Urteil dazu ist positiv.'), null)
})

test('baueArchitectureAdvisorAuftragstext: nennt die Rolle, verbietet Schreiben/Planen und verlangt die Urteil-Zeile', () => {
  const text = baueArchitectureAdvisorAuftragstext('Prüfe diesen Entwurf.')
  assert.match(text, /architecture-advisor/)
  assert.match(text, /schreibst und planst nichts/)
  assert.match(text, /Urteil: /)
  assert.match(text, /BEREIT_NACH_KORREKTUR/)
  assert.match(text, /Prüfe diesen Entwurf\./)
})

test("baueArchitectureAdvisorAuftragstext: stellt klar, dass 'Auftrag an den Baudurchgang' nicht an den Advisor gerichtet ist", () => {
  const text = baueArchitectureAdvisorAuftragstext('x')
  assert.match(text, /Auftrag an den Baudurchgang.*NICHT an dich gerichtet/s)
})
