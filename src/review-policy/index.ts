/**
 * Datei: src/review-policy/index.ts
 *
 * Zweck: F45 B2a-3a (F-1063, Codex-Review-Spec docs/projekt/codex-review-spec.md). Einzige Quelle der versionierten
 * Review-Policy für den Schritt 'code-reviewer' — Codex und Claude bekommen denselben Text im Auftrag. Gebaut aus der
 * Spec (§3 Dimensionen, §4 nicht beauftragt, §6 Isolation, §7 Ausgabeformat), nicht als Kopie der Harness-Regeln:
 * ARCHITECTURE.md, ADRs, DoD und Checkliste liefert die Projektkarte (B2a-1) im selben Auftrag. Dazu die reine Prüfung
 * des Ergebnisses gegen den Ausgabevertrag (pruefeReviewErgebnis): ein Halt nur bei leeren Befunden ohne den Satz
 * (Regel 1k, src/workflow), fehlende Pflichtwerte nur als Hinweis (Entscheidung Stefan 13.10.2026, Plan v2.1).
 * Reine Funktionen, kein I/O.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (starteWorkflowSchritt: Policy-Block und Laufakte review.policy_version; Nachlauf des
 *   Reviews und GET …/abnahme: pruefeReviewErgebnis)
 * - scripts/check-f45-b2a3-codex-review.mjs, src/review-policy/review-policy.test.ts
 *
 * Wichtig:
 * - Jede Änderung am Text braucht eine neue REVIEW_POLICY_VERSION — das Gate koppelt den sha256 des Texts an die Version.
 *   Eine neue Version bekommt in pruefeReviewErgebnisFuer ihren eigenen Prüfer; ältere Läufe werden nie nach neuen
 *   Regeln bewertet.
 * - KEINE_BEFUNDE_SATZ ist Vertrag (Spec §7): ohne Befunde steht er in 'empfehlung', nie „fehlerfrei“.
 * - Die Werte von DIMENSIONEN/EVIDENZEN sind die Enums von schemas/ergebnis-code-reviewer.schema.json (v2).
 */

/** Version der Review-Policy; steht im Text und in der Laufakte (review.policy_version). */
export const REVIEW_POLICY_VERSION = 'review-policy-1'

/** Pflichtsatz bei leerer Befundliste (Spec §7). */
export const KEINE_BEFUNDE_SATZ = 'Keine belastbaren Findings im geprüften Scope'

/** Erlaubte Dimensionen eines Befunds (Schema v2). */
export const DIMENSIONEN = Object.freeze(['bugs', 'funktion', 'skalierbarkeit', 'wartbarkeit', 'prinzipien', 'sicherheit'])

/** Erlaubte Evidenzstufen eines Befunds (Schema v2). */
export const EVIDENZEN = Object.freeze(['confirmed', 'likely', 'needs-validation'])

/** Ergebnis von pruefeReviewErgebnis: halt → Regel 1k hält an; hinweise → nur sichtbar in Abnahme und Blick. */
export interface ReviewPruefung {
  halt: string[]
  hinweise: string[]
}

/** Ein Review-Ergebnis, wie es aus dem Rohstrom kommt — bewusst locker typisiert (ungeprüfter Modelltext). */
export interface ReviewErgebnisRoh {
  befunde?: unknown
  empfehlung?: unknown
}

/**
 * Baut den Policy-Block, der an den Auftrag jedes code-reviewer-Schritts angehängt wird (hinter Projektkarte und
 * ggf. Beobachtungsblock).
 * @returns Text des Blocks, beginnt mit „## Review-Policy (<Version>)“
 */
export function baueReviewPolicyBlock(): string {
  return [
    `## Review-Policy (${REVIEW_POLICY_VERSION})`,
    'Du prüfst den fertigen Code unabhängig und technisch: Welche Probleme sind nach dem Bau noch übrig? Du auditierst nicht den Prozess, der zu ihm geführt hat.',
    '',
    'Prüfe diese fünf Dimensionen:',
    '1. Bugs und Korrektheit: Logikfehler, Randfälle, Zustand und Nebenläufigkeit, Race Conditions, Fehlerbehandlung, Freigabe von Ressourcen.',
    '2. Funktionsfähigkeit: Erfüllt der Code die Anforderungen und die relevanten Schnittstellenverträge? Funktionieren Integrationen und die erwarteten Pfade?',
    '3. Skalierbarkeit: plausible Engpässe, Laufzeit- und Speicherverhalten, Last, parallele Zugriffe, Grenzen — bewertet im Kontext der tatsächlichen Zielarchitektur.',
    '4. Wartbarkeit: Verständlichkeit, Modularität, Kopplung, Verantwortlichkeit, unnötige Komplexität, langfristige Änderbarkeit.',
    '5. Technische Prinzipien und Definitionen: Konformität mit ARCHITECTURE.md, ADRs, Schnittstellen- und Datenverträgen und den Projektdefinitionen (siehe Projektkarte).',
    'Zusätzlich: Melde relevante Sicherheitsdefekte, die du im Code entdeckst.',
    '',
    'Explizit nicht beauftragt:',
    '- Plan v1 → Advisor → Plan v2 erneut durchlaufen oder auditieren.',
    '- Prüfen, ob Hooks, QA-Agent, Ponytail oder andere Harness-Schritte stattgefunden haben.',
    '- Vorhandene vollständige Test-Suiten ohne konkreten Grund wiederholen. Für einen konkreten Fehlerverdacht darfst du einen gezielten Test ausführen oder vorschlagen.',
    '- Kosmetische Stilkorrekturen, irrelevante Refactorings, Neugestaltung der Architektur aus Vorliebe.',
    '- Vorschläge anderer Prüfer ungeprüft als Wahrheit übernehmen.',
    '',
    'Vorrang: Diese Policy geht der Projektkarte vor. Prozesspunkte der DoD (Reviewer-/QA-Pass, Commit-Freigabe, Render-Nachweis, Prüfbefehl) bewertest du mit „nicht anwendbar (Harness-Abgleich)“, nicht als Befund. Steht in diesem Auftrag ein Beobachtungsblock zum Bau (nur beim Claude-Reviewer), ist er ein ausdrücklicher Zusatzauftrag; Befunde daraus und aus DoD oder Checkliste tragen die Dimension prinzipien.',
    '',
    'Unabhängigkeit:',
    '- Du darfst auch frühere Architekturannahmen (Architekt-Schritt) kritisieren — ein früherer Plan ist kein Qualitätsbeweis.',
    '- Grüne Tests sind kein Korrektheitsbeweis.',
    '- Leite Befunde nur aus prüfbarem Code- und Anforderungskontext ab und kennzeichne Unsicherheit. Was du wegen einer Lücke in der Projektkarte nicht prüfen konntest, nennst du als nicht geprüft — nie als bestanden.',
    '- Widersprechen sich zwei Quellen (z. B. ARCHITECTURE.md und ein ADR), nenne beide; wähle nicht stillschweigend eine.',
    '',
    'Je Befund in befunde[]:',
    '- id: B1, B2, … (eindeutig in diesem Ergebnis)',
    '- dimension: bugs | funktion | skalierbarkeit | wartbarkeit | prinzipien | sicherheit',
    '- schwere: KRITISCH | HOCH | MITTEL | NIEDRIG (KRITISCH/HOCH: realer Defekt oder schweres, begründetes Risiko; NIEDRIG nur, wenn objektiv relevant — keine Stil-Nitpicks)',
    '- fundstelle: Datei und Zeile bzw. konkrete Code-Stelle',
    '- zusammenfassung: beobachtetes oder plausibles Fehlverhalten und warum es auftritt; betroffene Anforderung oder Prinzip, falls relevant',
    '- beleg: reproduzierbare Schritte, Testidee oder nachvollziehbare statische Begründung',
    '- korrekturrichtung: minimal-invasive Korrektur',
    '- evidenz: confirmed | likely | needs-validation',
    `Ohne Befunde: befunde ist leer und empfehlung enthält den Satz „${KEINE_BEFUNDE_SATZ}“ — nie „fehlerfrei“ oder Ähnliches. Beginnt empfehlung mit „Checkliste: …“, steht der Satz danach.`,
    'Ohne vorgegebenes Ausgabeschema (z. B. als Claude-Reviewer) nennst du je Befund dieselben Felder als Liste; maschinell geprüft wird das Format nur beim Codex-Reviewer.',
  ].join('\n')
}

/**
 * Normalisiert Text für den Satzvergleich: Unicode NFC, Kleinschreibung, Leerraum zusammengefasst (Code-Review 1).
 * @param text - beliebiger Text
 * @returns normalisierter Text
 */
function normalisiere(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Prüft ein Review-Ergebnis nach den Regeln der Policy-Version, unter der es entstand (Code-Review 3): heute kennt nur
 * REVIEW_POLICY_VERSION einen Prüfer. Eine unbekannte Version wird nicht nach heutigen Regeln rückwirkend bewertet.
 * @param version - review.policy_version der Laufakte (oder null)
 * @param ergebnis - geparstes Ergebnisobjekt
 * @returns Prüfung, oder null ohne bzw. mit unbekannter Version
 */
export function pruefeReviewErgebnisFuer(version: unknown, ergebnis: ReviewErgebnisRoh): ReviewPruefung | null {
  return version === REVIEW_POLICY_VERSION ? pruefeReviewErgebnis(ergebnis) : null
}

/**
 * Prüft ein Review-Ergebnis gegen den Ausgabevertrag der Policy. Leere Befunde ohne den Satz sind ein Halt (Regel 1k);
 * fehlende oder unbekannte Pflichtwerte je Befund und doppelte ids sind Hinweise (sichtbar, ohne Halt).
 * @param ergebnis - geparstes Ergebnisobjekt (befunde, empfehlung)
 * @returns { halt, hinweise } — beide leer = vertragsgemäß
 */
export function pruefeReviewErgebnis(ergebnis: ReviewErgebnisRoh): ReviewPruefung {
  const befunde = Array.isArray(ergebnis.befunde) ? ergebnis.befunde : []
  const halt: string[] = []
  const hinweise: string[] = []
  if (befunde.length === 0) {
    const empfehlung = typeof ergebnis.empfehlung === 'string' ? normalisiere(ergebnis.empfehlung) : ''
    if (!empfehlung.includes(normalisiere(KEINE_BEFUNDE_SATZ))) halt.push(`keine Befunde, aber 'empfehlung' enthält nicht den Satz „${KEINE_BEFUNDE_SATZ}“`)
    return { halt, hinweise }
  }
  const gesehen = new Set<string>()
  befunde.forEach((roh, index) => {
    const b = roh !== null && typeof roh === 'object' ? (roh as Record<string, unknown>) : {}
    const id = typeof b.id === 'string' && b.id.trim() !== '' ? b.id : null
    const name = `Befund ${index + 1}${id === null ? '' : ` (${id})`}`
    for (const feld of ['id', 'dimension', 'evidenz', 'korrekturrichtung']) {
      const wert = b[feld]
      if (typeof wert !== 'string' || wert.trim() === '') hinweise.push(`${name}: '${feld}' fehlt`)
    }
    if (typeof b.dimension === 'string' && b.dimension !== '' && !DIMENSIONEN.includes(b.dimension)) hinweise.push(`${name}: unbekannte dimension '${b.dimension}'`)
    if (typeof b.evidenz === 'string' && b.evidenz !== '' && !EVIDENZEN.includes(b.evidenz)) hinweise.push(`${name}: unbekannte evidenz '${b.evidenz}'`)
    if (id !== null) {
      if (gesehen.has(id)) hinweise.push(`${name}: doppelte id '${id}'`)
      gesehen.add(id)
    }
  })
  return { halt, hinweise }
}
