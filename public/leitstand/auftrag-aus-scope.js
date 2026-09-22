/**
 * Datei: public/leitstand/auftrag-aus-scope.js
 *
 * Zweck: reine JS-Kopie von baueAuftragAusScope (src/product-coach/index.ts, F34 WS-1) für den
 * Browser (F34 WS-2, löst F-606 zusammen mit views/chat.js) — dieser Leitstand hat keinen
 * Build-Schritt (CLAUDE.md: strip-only TypeScript auf Node, kein Bundler), ein Browser kann die
 * `.ts`-Quelle nicht laden. Verhaltensgleichheit wird NICHT durch Vertrauen sichergestellt,
 * sondern mechanisch geprüft: scripts/check-f34-product-coach.mjs importiert BEIDE Funktionen und
 * vergleicht ihre Ausgabe gegen dieselben Scope-Fixtures (Ersatz für den fehlenden gemeinsamen
 * Modulpfad zwischen Server-TS und Browser-JS, D5-Geist).
 *
 * Wird aufgerufen von: public/leitstand/views/chat.js, scripts/check-f34-product-coach.mjs.
 *
 * Wichtig: JEDE Änderung an src/product-coach/index.ts' baueAuftragAusScope/markdownListe MUSS
 * hier nachgezogen werden, sonst schlägt das Gate fehl.
 */

/** @param eintraege - string[] @returns Markdown-Liste, oder "- (keine)" bei leerem Array */
function markdownListe(eintraege) {
  return eintraege.length > 0 ? eintraege.map((eintrag) => `- ${eintrag}`).join('\n') : '- (keine)'
}

/**
 * Baut aus einem fertigen Scope-Entwurf deterministisches Markdown für einen F22-Auftrag.
 * @param scope - ein gültiger Scope ({ titel, problem, ziel, in_scope, out_of_scope, annahmen, offene_fragen, erfolgskriterium })
 * @returns { titel, auftragstext }
 */
export function baueAuftragAusScope(scope) {
  const auftragstext = [
    `# ${scope.titel}`,
    '',
    '## Problem',
    scope.problem,
    '',
    '## Ziel',
    scope.ziel,
    '',
    '## In Scope',
    markdownListe(scope.in_scope),
    '',
    '## Out of Scope',
    markdownListe(scope.out_of_scope),
    '',
    '## Annahmen',
    markdownListe(scope.annahmen),
    '',
    '## Offene Fragen',
    markdownListe(scope.offene_fragen),
    '',
    '## Erfolgskriterium',
    scope.erfolgskriterium,
  ].join('\n')
  return { titel: scope.titel, auftragstext }
}
