/**
 * Datei: scripts/leitstand/budget-stand.mjs
 *
 * Zweck: Budget-Stand eines Ablaufs (F45 B2b-3c, F-981, features/F45/plan-b2b3c-v2.md) — die I/O-Schale um src/budget.
 * Summe = Tokens aller Laufakten, deren `lauf_id` je an einem Schritt des Ablaufs stand (alle Versionen, Korrekturrunden
 * inklusive). Ein Lauf ohne `verbrauch` zählt nur unter `ohneMessung` (nie geschätzt); eine `lauf_id` ohne Laufakte
 * (läuft gerade, oder geheilter Start) zählt gar nicht (Advisor B13). Kontrolltiefe aus den Schrittrollen (Advisor B9,
 * gilt auch nach einer Reparaturfassung), Budget aus `budget_tokens` der neuesten Auftragsversion — immer frisch gelesen,
 * denn „Budget erhöhen“ ändert es ohne neue Workflow-Version.
 *
 * Zwischenspeicher (Advisor B8, Poll alle 2 s): die Lauf-Summe je (workflowId, versionSequenz) — die Menge der `lauf_id`
 * ändert sich nur mit einer neuen Version. Gespeichert wird nur, wenn jede `lauf_id` eine Laufakte hatte (sonst kann ihre
 * Laufakte später kommen, ohne dass die Version wechselt). NUR für die GET-Anzeigen (Delta-Advisor D1): jeder durchsetzende
 * Weg ruft ohne versionSequenz auf und liest frisch — eine vor dem Lauf gespeicherte Summe kennt den gerade beendeten Lauf nicht.
 *
 * Synchron (läuft auch im D13-Bereich von starteWorkflowSchritt, Advisor B7: nur listeVersionen/ladeArtefaktVersion),
 * wirft nie: nicht bestimmbar ⇒ `null`, dann hält nichts an. Durchsetzungsgrad DEKLARIERT (ARCHITECTURE.md §8): fail-open
 * und nach dem Schritt geprüft — eine Überschreitung um bis zu einen Schritt ist möglich.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs, scripts/check-f45-b2b3c-budget.mjs.
 */

import { bestimmeBudget, istUeberschritten, kontrolltiefeAusSchritten, tokensDesVerbrauchs } from '../../src/budget/index.ts'
import { ladeArtefaktVersion, listeVersionen } from '../../src/lineage-registry/index.ts'

/** Lauf-Summen je `${basisVerzeichnis}|${workflowId}|${versionSequenz}` — nur vollständige (siehe Dateikopf). */
const summenCache = new Map()
const CACHE_GRENZE = 200

/**
 * Summe der Tokens aller Läufe des Ablaufs.
 * @param workflowId - Kennung des Ablaufs
 * @param workflowDaten - aktuelle Daten (deren lauf_id zählen mit, auch wenn die Version noch nicht in der Liste steht)
 * @param ladeOptionen - { basisVerzeichnis, schreiber }
 * @returns { summe, gemessen, ohneMessung, vollstaendig }
 */
function summiereLaeufe(workflowId, workflowDaten, ladeOptionen) {
  const laufIds = new Set()
  for (const version of listeVersionen(`workflow-${workflowId}`, ladeOptionen)) {
    for (const schritt of version.daten?.schritte ?? []) if (typeof schritt?.lauf_id === 'string') laufIds.add(schritt.lauf_id)
  }
  for (const schritt of workflowDaten.schritte ?? []) if (typeof schritt?.lauf_id === 'string') laufIds.add(schritt.lauf_id)
  let summe = 0
  let gemessen = 0
  let ohneMessung = 0
  let vollstaendig = true
  for (const laufId of laufIds) {
    const laufakte = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, ladeOptionen)
    if (laufakte === null) {
      vollstaendig = false
      continue
    }
    const tokens = tokensDesVerbrauchs(laufakte.daten?.verbrauch)
    if (tokens === null) ohneMessung += 1
    else {
      summe += tokens
      gemessen += 1
    }
  }
  return { summe, gemessen, ohneMessung, vollstaendig }
}

/**
 * Budget-Stand eines Ablaufs.
 * @param workflowId - Kennung des Ablaufs
 * @param workflowDaten - aktuelle Daten des Ablaufs (der Aufrufer hat sie schon geladen)
 * @param ladeOptionen - { basisVerzeichnis, schreiber }
 * @param versionSequenz - Version der übergebenen Daten (Schlüssel des Zwischenspeichers), oder undefined (kein Speicher)
 * @returns { summe, gemessen, ohneMessung, tokens, quelle, kontrolltiefe, ueberschritten } oder null
 */
export function ermittleBudgetStand(workflowId, workflowDaten, ladeOptionen, versionSequenz = undefined) {
  try {
    const schluessel = versionSequenz === undefined ? null : `${ladeOptionen.basisVerzeichnis}|${workflowId}|${versionSequenz}`
    let laeufe = schluessel === null ? undefined : summenCache.get(schluessel)
    if (laeufe === undefined) {
      laeufe = summiereLaeufe(workflowId, workflowDaten, ladeOptionen)
      if (schluessel !== null && laeufe.vollstaendig) {
        if (summenCache.size >= CACHE_GRENZE) summenCache.delete(summenCache.keys().next().value)
        summenCache.set(schluessel, laeufe)
      }
    }
    // Eine auftrag_id mit unzulässigen Zeichen (Bestand, Gate-Attrappen) lässt die Lineage werfen — dann kein Arbeitspaket-Budget,
    // der Default gilt (kein „nicht bestimmbar“ für den ganzen Stand).
    let auftragDaten = null
    try {
      auftragDaten = typeof workflowDaten.auftrag_id === 'string' ? (ladeArtefaktVersion(`auftrag-${workflowDaten.auftrag_id}`, undefined, ladeOptionen)?.daten ?? null) : null
    } catch {
      auftragDaten = null
    }
    const kontrolltiefe = kontrolltiefeAusSchritten(Array.isArray(workflowDaten.schritte) ? workflowDaten.schritte : [])
    const budget = bestimmeBudget(auftragDaten?.budget_tokens, kontrolltiefe)
    return {
      summe: laeufe.summe,
      gemessen: laeufe.gemessen,
      ohneMessung: laeufe.ohneMessung,
      tokens: budget.tokens,
      quelle: budget.quelle,
      kontrolltiefe,
      ueberschritten: istUeberschritten(laeufe.summe, budget.tokens),
    }
  } catch (fehler) {
    console.error(`[leitstand] Budget-Stand für Ablauf '${workflowId}' nicht bestimmbar — kein Budget-Halt:`, fehler)
    return null
  }
}
