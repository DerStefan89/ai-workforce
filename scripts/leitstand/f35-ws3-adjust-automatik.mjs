/**
 * Datei: scripts/leitstand/f35-ws3-adjust-automatik.mjs
 *
 * Zweck: F35 WS-3 (features/F35/feature.md, zielfassung.md §13.6 E-M5-4) —
 * endet ein Review-Schritt mit Urteil BLOCKIERT oder mit AK-Verstößen
 * (F35 WS-2, Regel 1i), legt der Kern AUTOMATISCH dieselbe Abnahme-
 * Entscheidung an, die bislang nur ein Mensch über POST
 * /api/workflows/<id>/abnahme (ergebnis 'ANPASSUNG_ANGEFORDERT') anlegen
 * konnte — mit Lineage-herkunft.erzeuger 'kern' statt 'mensch'.
 *
 * Reine Fachlogik, kein I/O (Muster src/ak-pruefung/index.ts,
 * src/korrekturschleife/index.ts): baueAutomatischeAnpassungsBegruendung baut
 * die Begründung, ermittleAutomatischeAnpassung entscheidet, OB der Kern
 * jetzt auslösen soll, zaehleKernVersionen zählt die Grenze. Importiert nur
 * listeVersionen (Lesezugriff, kein Schreiben) aus src/lineage-registry.
 *
 * Die eigentliche Schreiblogik (Entscheidungsartefakt registrieren,
 * Ausführungs-/Review-Schritt zurücksetzen — 'wendeAutomatischeAnpassungAn')
 * bleibt bewusst in scripts/leitstand-server.mjs stehen, NICHT hier: sie
 * ruft schreibeWorkflowFortschritt auf, und genau diese Aufrufstellen prüft
 * scripts/check-f15-workflow.mjs (F-228, textuelle Zählung "jede
 * Schreibstelle liest den GESTOPPT-Schutz") ausschließlich innerhalb DIESER
 * einen Datei — ein zweiter Aufrufort in einem anderen Modul unterliefe
 * diese Prüfung, ohne dass sie es bemerkte (Muster
 * scripts/leitstand/routen-f39.mjs, Kopfkommentar: "der POST-Dispatch selbst
 * ... bleibt im Server").
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (Auslöser-Prüfung im
 * starteWorkflowSchritt-Rückruf, Begründung dort UND im POST
 * .../abnahme-Handler für erzeuger 'mensch', Grenze/GET-Projektion),
 * scripts/check-f35-ws3-adjust-automatik.mjs,
 * scripts/leitstand/f35-ws3-adjust-automatik.test.mjs.
 */

import { listeVersionen } from '../../src/lineage-registry/index.ts'

const GRENZE_AUTOMATISCHE_ANPASSUNGEN = 3

/** Name der Kernartefakt-Kette einer Workflow-Abnahme-Entscheidung — dieselbe ID wie GET/POST /api/workflows/<id>/abnahme (D5, kein zweiter Lesepfad). */
function abnahmeArtefaktId(workflowId) {
  return `entscheidung-workflow-${workflowId}-abnahme`
}

/**
 * Zählt die bisherigen AUTOMATISCH (herkunft.erzeuger 'kern') erzeugten
 * Abnahme-Versionen eines Workflows — genutzt sowohl vom Auslöser
 * (Grenze GRENZE_AUTOMATISCHE_ANPASSUNGEN, vor dem Schreiben gezählt) als
 * auch von der GET-Projektion (automatische_iteration, nach dem Laden der
 * aktuellen Version gezählt) — EINE Funktion, zwei Aufrufer.
 * @param workflowId - id des betroffenen Workflows
 * @param ladeOptionen - { basisVerzeichnis, schreiber }
 * @returns Anzahl der bisher mit erzeuger 'kern' geschriebenen Abnahme-Versionen
 */
export function zaehleKernVersionen(workflowId, ladeOptionen) {
  return listeVersionen(abnahmeArtefaktId(workflowId), ladeOptionen).filter((version) => version.herkunft?.erzeuger === 'kern').length
}

/**
 * Baut die Begründung einer automatischen Anpassung — reine Funktion,
 * deterministisch, minLength-konform (der feste Kopf allein reicht bereits,
 * nie leer). Muster baueReviewKorrekturInstruktion (src/korrekturschleife/
 * index.ts): Befunde als nummerierte Liste, AK-Verstöße als Liste — die
 * Verstoß-Strings aus pruefeAkUrteile (src/ak-pruefung/index.ts) nennen die
 * betroffene ak_id bereits wörtlich, keine Zusatzlogik nötig.
 * @param urteil - das Gesamturteil des Reviews ('BLOCKIERT' im Regelfall, kann bei reinen AK-Verstößen auch 'BEREIT'/'BEREIT_NACH_KORREKTUR' sein), oder null/undefined
 * @param befunde - befunde[] aus dem geparsten Reviewer-Ergebnis (schwere/fundstelle/zusammenfassung)
 * @param akVerstoesse - Verstoß-Strings aus pruefeAkUrteile, ggf. leer
 * @param iteration - 1-basierte Nummer dieser automatischen Anpassung (1..GRENZE_AUTOMATISCHE_ANPASSUNGEN)
 * @returns die Begründung als Text
 */
export function baueAutomatischeAnpassungsBegruendung(urteil, befunde, akVerstoesse, iteration) {
  const zeilen = [`Automatische Anpassung (Iteration ${iteration} von max. ${GRENZE_AUTOMATISCHE_ANPASSUNGEN}) nach Review-Urteil ${urteil ?? 'unbekannt'}:`]
  if (befunde.length > 0) {
    zeilen.push('', 'Befunde:')
    befunde.forEach((befund, index) => {
      zeilen.push(`${index + 1}. [${befund.schwere ?? '?'}] ${befund.fundstelle ?? '?'} — ${befund.zusammenfassung ?? ''}`)
    })
  }
  if (akVerstoesse.length > 0) {
    zeilen.push('', 'Verletzte Akzeptanzkriterien:')
    akVerstoesse.forEach((verstoss) => zeilen.push(`- ${verstoss}`))
  }
  return zeilen.join('\n')
}

/**
 * Reine Entscheidungsfunktion: soll der Kern JETZT automatisch
 * 'ANPASSUNG_ANGEFORDERT' anlegen? Bauauftrag Punkt 2, alle Bedingungen
 * müssen gelten. Bewusst OHNE D13-Parameter — der Aufrufer (der
 * starteLaufUndVergiss-Rückruf in starteWorkflowSchritt) prüft laufAktiv/
 * globalerLaufZustand.aktiv selbst, VOR dem Aufruf dieser Funktion, weil
 * D13 dort strukturell (synchroner Tick, kein await) immer erfüllt ist —
 * eine Tiefenverteidigung ohne eigenen Rot-Fall gehört an die Aufrufstelle,
 * nicht in diese reine Funktion.
 * @param eingabe - { outputSchema, schrittStatus, heilbar, urteil, akVerstoesse, anzahlBisherigerKernVersionen }
 * @returns { ausloesen: true } oder { ausloesen: false, grund } (grund nur zur Lesbarkeit/Tests, keine Fachbedeutung)
 */
export function ermittleAutomatischeAnpassung({ outputSchema, schrittStatus, heilbar, urteil, akVerstoesse, anzahlBisherigerKernVersionen }) {
  if (outputSchema !== 'ergebnis-code-reviewer') {
    return { ausloesen: false, grund: "output_schema ist nicht 'ergebnis-code-reviewer'" }
  }
  if (heilbar) {
    return { ausloesen: false, grund: 'Lauf ist heilbar (kein Checkpoint geschrieben) — kein auswertbares Ergebnis' }
  }
  if (schrittStatus !== 'ERFOLGREICH') {
    return { ausloesen: false, grund: `Lauf ist '${schrittStatus}', nicht ERFOLGREICH` }
  }
  const istBlockiert = urteil === 'BLOCKIERT'
  const hatAkVerstoesse = Array.isArray(akVerstoesse) && akVerstoesse.length > 0
  if (!istBlockiert && !hatAkVerstoesse) {
    return { ausloesen: false, grund: `Urteil '${urteil ?? 'fehlend'}' ist nicht 'BLOCKIERT' und es gibt keine AK-Verstöße` }
  }
  if (anzahlBisherigerKernVersionen >= GRENZE_AUTOMATISCHE_ANPASSUNGEN) {
    return { ausloesen: false, grund: `Grenze erreicht (${anzahlBisherigerKernVersionen} bisherige automatische Anpassungen)` }
  }
  return { ausloesen: true }
}
