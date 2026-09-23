/**
 * Datei: src/workboard/feature-abschnitte.ts
 *
 * Zweck: Optionale technische Abschnitte einer Feature-Akte (features/<id>/feature.md,
 * F39 WS-3a, Auftrags-Vorgabe Punkt 3) — Architekturentscheidung, Komponenten/Module,
 * Datenmodell, Interfaces/Contracts, State/Persistenz, Security/Permissions, Datenflüsse,
 * Migration, Red-/Green-Cases. Liefern sie der 'ausfuehrung'-Schritt eines hoch-Workflows
 * (baueUmsetzungsInstruktion, src/architekt/index.ts) in die betroffene Akte ein, prüft
 * scripts/check-feature.mjs (Feature-Akte-Gate) hier NUR, dass ein vorhandener Abschnitt
 * nicht leer ist — kein Abschnitt ist Pflicht (Rückwärtskompatibilität, Muster
 * gueltigeStatusWerte/feature-status.ts: EINE Quelle für das Gate, reine Funktion, kein I/O).
 * Eine Akte ohne diese Abschnitte bleibt vollständig gültig; sie sind ein additiver
 * Fundort für Architektur-Wissen, kein weiterer Pflichtabschnitt neben Ziel/Nicht-Ziele/
 * Akzeptanzkriterien/Dependencies (die bleiben Sache von scripts/check-feature.mjs selbst).
 */

/** Namen der neun optionalen technischen Abschnitte, exakt wie sie als '## <Name>'-Überschrift auftreten. */
export const OPTIONALE_ABSCHNITTE = [
  'Architekturentscheidung',
  'Komponenten/Module',
  'Datenmodell',
  'Interfaces/Contracts',
  'State/Persistenz',
  'Security/Permissions',
  'Datenflüsse',
  'Migration',
  'Red-/Green-Cases',
]

/**
 * Liest den Inhalt EINES Abschnitts (zwischen seiner '## <Name>'-Überschrift und der
 * nächsten '## '-Überschrift oder dem Dateiende) — Muster der bestehenden
 * pflichtAbschnitte-Erkennung in scripts/check-feature.mjs (exakte, case-sensitive
 * '^##\s+<Name>'-Überschrift, kein Fuzzy-Toleranzbereich).
 * @param inhalt - der vollständige Text von feature.md
 * @param name - exakter Abschnittsname (aus OPTIONALE_ABSCHNITTE)
 * @returns der Abschnittstext nach der Überschriftzeile (ungetrimmt), oder null, wenn die Überschrift fehlt
 */
function leseAbschnitt(inhalt: string, name: string): string | null {
  const ueberschrift = new RegExp(`^##\\s+${name}\\b.*$`, 'm')
  const treffer = ueberschrift.exec(inhalt)
  if (treffer === null) return null
  const restAbUeberschrift = inhalt.slice(treffer.index + treffer[0].length)
  const naechsteUeberschrift = /^##\s+/m.exec(restAbUeberschrift)
  return naechsteUeberschrift === null ? restAbUeberschrift : restAbUeberschrift.slice(0, naechsteUeberschrift.index)
}

/**
 * Prüft die neun optionalen technischen Abschnitte einer Feature-Akte: fehlt ein Abschnitt,
 * ist das gültig (Rückwärtskompatibilität) — nur ein VORHANDENER, aber leerer Abschnitt (kein
 * Mindestinhalt außer der Überschrift selbst) ist ein Befund. Reine Funktion, kein I/O.
 * @param inhalt - der vollständige Text von feature.md
 * @returns Liste lesbarer Befundtexte; leer = keine Verletzung
 */
export function pruefeOptionaleAbschnitte(inhalt: string): string[] {
  const befunde: string[] = []
  for (const name of OPTIONALE_ABSCHNITTE) {
    const abschnitt = leseAbschnitt(inhalt, name)
    if (abschnitt !== null && abschnitt.trim().length === 0) {
      befunde.push(`Abschnitt "${name}" ist vorhanden, aber leer (kein Mindestinhalt)`)
    }
  }
  return befunde
}
