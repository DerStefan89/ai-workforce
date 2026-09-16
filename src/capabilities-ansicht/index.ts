/**
 * Datei: src/capabilities-ansicht/index.ts
 *
 * Zweck: Reine Projektionsfunktionen für die Capabilities-View (F24 WS-1,
 * `#/capabilities`). Macht F19 (Capability Foundation) sichtbar — Library,
 * Coverage je Rolle, Rollen-Besetzung — ausschließlich als Sicht über
 * bereits bestehende Quellen (src/ressourcen, src/rollen, workflow-
 * vorlagen/*.json, Laufakten). Keine zweite Registry, keine automatische
 * Worker-/Modellwahl (E-M3-3 bleibt unberührt) — dieses Modul prüft und
 * meldet, wie schon src/ressourcen/index.ts.
 *
 * Drei reine Funktionen, kein Datei-I/O: projeziereLibrary (AK1, AK5, AK6),
 * projeziereAbdeckung (AK2) und baueRollenBesetzungsAnsicht (AK4) —
 * letztere bekommt die bereits geladenen Vorlagen/Laufakte-Daten als
 * Parameter statt selbst von der Platte zu lesen (Muster src/router/index.ts
 * waehleWorkflowVorlage: I/O bleibt beim Aufrufer, scripts/leitstand-
 * server.mjs).
 *
 * F346_AUSNAHMEN war bisher NUR lokal in scripts/check-f19-ressourcen.mjs
 * definiert — seit F24 liegt sie hier als einzige Quelle (Kein-
 * Zweitwahrheit-Prinzip dieses Repos), das F19-Gate importiert sie jetzt von
 * hier, unverändert in Inhalt und Wirkung.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs,
 * scripts/check-f19-ressourcen.mjs, scripts/check-f24-capabilities.mjs,
 * src/capabilities-ansicht/capabilities-ansicht.test.ts.
 */

import type { AufgelosteRessource } from '../ressourcen/types.ts'
import type { Rollenvertrag } from '../rollen/types.ts'
import type {
  AbdeckungsAnsicht,
  AbdeckungsEintrag,
  LibraryAnsicht,
  LibraryEintrag,
  LibraryPhase,
  RealeBesetzung,
  RollenBesetzungsAnsicht,
  VorlagenBesetzung,
  WorkerAbdeckungsLuecke,
} from './types.ts'

export type { AbdeckungsAnsicht, AbdeckungsEintrag, LibraryAnsicht, LibraryEintrag, LibraryPhase, RealeBesetzung, RollenBesetzungsAnsicht, VorlagenBesetzung, WorkerAbdeckungsLuecke } from './types.ts'

/** AK5: v1 hat kein Scout-Artefakt (F27-Scope) — die Phase bleibt strukturell leer, aber benannt statt einer stillen leeren Liste. */
export const ASSESSED_HINWEIS = 'Scout-Artefakt kommt mit F27 — in v1 strukturell leer, keine Ressource kann diese Phase erreichen.'

/** AK1: fester Anzeigetext für jede typ:'extern'-Ressource — R2 erzwingt bei 'extern' immer freigabe 'OFFEN', der Kern (loeseRessourcenAuf) liefert dafür den generischen, identischen Text 'extern, nicht auflösbar'. Diese View unterscheidet daraus erkennbar "wartet auf einen Menschen" von "technisch kaputt/fehlt" (z. B. ein Skill ohne SKILL.md, ein Worker ohne Startvorlagen-Block). */
const EXTERN_ANZEIGE_GRUND = 'Vom Menschen noch nicht freigegeben (freigabe: OFFEN) — kein technischer Defekt, sondern eine offene Entscheidung.'

function leiteAnzeigeGrundAb(ressource: AufgelosteRessource): string {
  return ressource.typ === 'extern' ? EXTERN_ANZEIGE_GRUND : ressource.grund
}

function leitePhasenAb(ressource: AufgelosteRessource): LibraryPhase[] {
  const phasen: LibraryPhase[] = []
  if (ressource.typ === 'extern') phasen.push('DISCOVERED')
  // ASSESSED: siehe ASSESSED_HINWEIS — kein Eintrag kann sie in v1 erreichen.
  if (ressource.freigabe === 'FREIGEGEBEN') phasen.push('APPROVED')
  if (ressource.verfuegbar) phasen.push('AVAILABLE')
  return phasen
}

/**
 * AK1/AK5/AK6: baut die Library-Ansicht aus bereits aufgelösten Ressourcen.
 * @param aufgeloest - Ergebnis von loeseRessourcenAuf (src/ressourcen/index.ts)
 * @param startvorlagePfad - Pfad der Startvorlage, gegen die aufgeloest ermittelt wurde (AK6)
 * @returns Library-Ansicht mit anzeigeGrund/phasen je Eintrag
 */
export function projeziereLibrary(aufgeloest: AufgelosteRessource[], startvorlagePfad: string): LibraryAnsicht {
  const eintraege: LibraryEintrag[] = aufgeloest.map((ressource) => ({
    ...ressource,
    anzeigeGrund: leiteAnzeigeGrundAb(ressource),
    phasen: leitePhasenAb(ressource),
  }))
  return { startvorlagePfad, eintraege, assessedHinweis: ASSESSED_HINWEIS }
}

/** F-346: drei eng benannte, geprüfte Ausnahmen (Details: state/findings.md F-346, features/F19/nachweis-ws2.md). Einzige Quelle seit F24 — scripts/check-f19-ressourcen.mjs importiert von hier. Der 'scout'-Eintrag (F27 WS-1) deckt denselben strukturellen Grund wie 'router'/'code-reviewer' ab: 'claude-code' hat keinen '--output-schema'-Mechanismus (F-337), ein Scout-Lauf über den direkten POST /api/laeufe-Pfad läuft strukturell immer als 'claude-code'. */
export const F346_AUSNAHMEN: ReadonlyArray<{ rolle: string; worker: string; erlaubteLuecke: string[] }> = [
  { rolle: 'router', worker: 'claude-code', erlaubteLuecke: ['STRUCTURED_OUTPUT'] },
  { rolle: 'code-reviewer', worker: 'claude-code', erlaubteLuecke: ['STRUCTURED_OUTPUT'] },
  { rolle: 'scout', worker: 'claude-code', erlaubteLuecke: ['STRUCTURED_OUTPUT'] },
]

/**
 * Für eine Rolle: je registriertem, erlaubtem Worker die fehlenden
 * Capabilities, mit F-346-Markierung (AK2). Ein erlaubter, aber nicht
 * registrierter Worker wird ausgelassen — das ist kein F-346-Fall (Muster
 * scripts/check-f19-ressourcen.mjs Regel 6, unverändert übernommen).
 * @param rolle - Rollenname (für den F346_AUSNAHMEN-Abgleich)
 * @param vertrag - Rollenvertrag dieser Rolle
 * @param capabilitiesJeWorker - Map workerId -> dessen capabilities, aus bereits aufgelösten Ressourcen
 * @returns eine WorkerAbdeckungsLuecke je registriertem erlaubtem Worker
 */
export function berechneWorkerAbdeckung(rolle: string, vertrag: Rollenvertrag, capabilitiesJeWorker: Map<string, string[]>): WorkerAbdeckungsLuecke[] {
  return vertrag.erlaubte_worker
    .filter((worker) => capabilitiesJeWorker.has(worker))
    .map((worker) => {
      const capabilities = capabilitiesJeWorker.get(worker) ?? []
      const fehlend = vertrag.benoetigte_capabilities.filter((c) => !capabilities.includes(c))
      const ausnahme = F346_AUSNAHMEN.find((a) => a.rolle === rolle && a.worker === worker)
      const restFehlend = ausnahme === undefined ? fehlend : fehlend.filter((c) => !ausnahme.erlaubteLuecke.includes(c))
      return { worker, fehlend, f346Ausnahme: restFehlend.length < fehlend.length, restFehlend }
    })
}

/**
 * AK2: Coverage je Rolle. gedeckt ist true, wenn workerAbdeckung
 * NICHT-LEER ist UND nach Abzug der F-346-Ausnahmen kein registrierter
 * erlaubter Worker mehr eine fehlende Capability trägt. Das
 * Nicht-leer-Kriterium ist bewusst explizit (QA-Befund, F24 WS-1): ohne es
 * wäre eine Rolle, deren erlaubte_worker KEINEN einzigen registrierten
 * Worker trifft (z. B. Tippfehler im Workernamen, oder ein inzwischen
 * entfernter Worker), über die leere-Array-Wahrheit von .every() fälschlich
 * "gedeckt" — obwohl buchstäblich kein Worker etwas deckt.
 * @param rollenvertraege - ROLLENVERTRAEGE (src/rollen/index.ts)
 * @param aufgeloest - Ergebnis von loeseRessourcenAuf
 * @param startvorlagePfad - Pfad der Startvorlage (AK6)
 */
export function projeziereAbdeckung(rollenvertraege: Record<string, Rollenvertrag>, aufgeloest: AufgelosteRessource[], startvorlagePfad: string): AbdeckungsAnsicht {
  const capabilitiesJeWorker = new Map(aufgeloest.filter((r) => r.typ === 'worker').map((r) => [r.id, r.capabilities]))
  const rollen: AbdeckungsEintrag[] = Object.entries(rollenvertraege).map(([rolle, vertrag]) => {
    const workerAbdeckung = berechneWorkerAbdeckung(rolle, vertrag, capabilitiesJeWorker)
    return {
      rolle,
      benoetigteCapabilities: vertrag.benoetigte_capabilities,
      workerAbdeckung,
      gedeckt: workerAbdeckung.length > 0 && workerAbdeckung.every((w) => w.restFehlend.length === 0),
    }
  })
  return { startvorlagePfad, rollen }
}

/**
 * AK4: für eine Rolle, aus schon in Vorlagendateien gefundenen Schritten
 * (rolle === die gesuchte), die Vorlagen-Besetzung (Ebene 2). Reine
 * Filterfunktion — das Einlesen der drei Dateien unter workflow-vorlagen/
 * bleibt beim Aufrufer (I/O, Muster src/router/index.ts).
 * @param rolle - gesuchte Rolle
 * @param vorlagenSchritte - je Vorlage die bereits geparsten schritte, mit vorlage-Name annotiert
 */
export function findeVorlagenBesetzung(rolle: string, vorlagenSchritte: Array<{ vorlage: string; schritt_id: string; rolle: string; worker: string; modell: string }>): VorlagenBesetzung[] {
  return vorlagenSchritte
    .filter((s) => s.rolle === rolle)
    .map((s) => ({ vorlage: s.vorlage, schrittId: s.schritt_id, worker: s.worker, modell: s.modell }))
}

/**
 * AK4: setzt die vier Ebenen zu einer Rollen-Besetzungs-Ansicht zusammen.
 * Ebene 3 (gepinnt) und Ebene 4 (beobachtet) kommen bereits fertig ermittelt
 * vom Aufrufer (scripts/leitstand-server.mjs — Disk-Scan über reale
 * Workflow-/Laufakte-Artefakte, kein reiner Funktionsumfang), diese
 * Funktion fügt nur noch Rollenvertrag und Vorlagen-Besetzung hinzu und
 * baut die endgültige RealeBesetzung-Ausprägung.
 * @param rolle - gewählte Rolle
 * @param rollenvertrag - ROLLENVERTRAEGE[rolle]
 * @param vorlagenBesetzung - Ergebnis von findeVorlagenBesetzung
 * @param letzterTreffer - der jüngste reale Workflow-Schritt dieser Rolle mit gesetzter lauf_id, oder null (noch kein Lauf)
 * @param beobachtet - worker/modell_deklariert aus der zugehörigen Laufakte, oder null (Laufakte fehlt trotz gesetzter lauf_id)
 */
export function baueRollenBesetzungsAnsicht(
  rolle: string,
  rollenvertrag: Rollenvertrag,
  vorlagenBesetzung: VorlagenBesetzung[],
  letzterTreffer: { workflowId: string; schrittId: string; laufId: string; worker: string; modell: string } | null,
  beobachtet: { worker: string; modellDeklariert: string | null } | null
): RollenBesetzungsAnsicht {
  let letzteRealeBesetzung: RealeBesetzung
  if (letzterTreffer === null) {
    letzteRealeBesetzung = { status: 'kein_lauf' }
  } else {
    const gepinnt = { worker: letzterTreffer.worker, modell: letzterTreffer.modell }
    letzteRealeBesetzung =
      beobachtet === null
        ? { status: 'laufakte_fehlt', workflowId: letzterTreffer.workflowId, schrittId: letzterTreffer.schrittId, laufId: letzterTreffer.laufId, gepinnt }
        : { status: 'ok', workflowId: letzterTreffer.workflowId, schrittId: letzterTreffer.schrittId, laufId: letzterTreffer.laufId, gepinnt, beobachtet }
  }
  return { rolle, rollenvertrag, vorlagenBesetzung, letzteRealeBesetzung }
}
