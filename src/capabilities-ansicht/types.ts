/**
 * Datei: src/capabilities-ansicht/types.ts
 *
 * Zweck: Typen für das Capabilities-View-Modul (F24 WS-1). Reine
 * Projektionstypen über bereits bestehende Quellen (src/ressourcen,
 * src/rollen, workflow-vorlagen/*.json, Laufakten) — keine dieser Typen
 * beschreibt eine neue Registry, jede beschreibt nur eine Sicht auf eine
 * bestehende.
 *
 * Wird aufgerufen von: src/capabilities-ansicht/index.ts,
 * src/capabilities-ansicht/capabilities-ansicht.test.ts,
 * scripts/leitstand-server.mjs, scripts/check-f24-capabilities.mjs.
 */

import type { AufgelosteRessource } from '../ressourcen/types.ts'
import type { Rollenvertrag } from '../rollen/types.ts'

/** Zwilling der vier Library-Phasen aus features/F24/feature.md AK5. Ein Eintrag kann mehreren Phasen gleichzeitig angehören. */
export type LibraryPhase = 'DISCOVERED' | 'ASSESSED' | 'APPROVED' | 'AVAILABLE'

/** Eine aufgelöste Ressource plus die view-eigenen, additiven Felder (AK1, AK5) — der Kern (AufgelosteRessource) bleibt unverändert, anzeigeGrund/phasen kommen ausschließlich aus dieser View-Schicht. */
export interface LibraryEintrag extends AufgelosteRessource {
  /** AK1: für typ 'extern' (immer freigabe 'OFFEN', R2) erkennbar anderer Text als bei einer technisch nicht vorhandenen Ressource. Sonst unverändert r.grund. */
  anzeigeGrund: string
  phasen: LibraryPhase[]
}

export interface LibraryAnsicht {
  /** AK6. */
  startvorlagePfad: string
  eintraege: LibraryEintrag[]
  /** AK5: benannte Leerstelle für die strukturell leere Phase ASSESSED. */
  assessedHinweis: string
}

/** Eine von der Rolle benötigte Capability, die ein bestimmter erlaubter Worker nicht deckt — F-346-Ausnahmen (Zwilling von F346_AUSNAHMEN unten) bleiben sichtbar markiert statt die Lücke zu verstecken. */
export interface WorkerAbdeckungsLuecke {
  worker: string
  /** Alle fehlenden Capabilities dieses Workers für diese Rolle, VOR Abzug etwaiger F-346-Ausnahmen. */
  fehlend: string[]
  /** true, wenn mindestens eine fehlende Capability durch F346_AUSNAHMEN gedeckt ist. */
  f346Ausnahme: boolean
  /** fehlend MINUS die per F-346 geduldeten Capabilities — bleibt hier etwas übrig, ist das ein echter Gap (AK3). */
  restFehlend: string[]
}

export interface AbdeckungsEintrag {
  rolle: string
  benoetigteCapabilities: string[]
  /** Je registriertem, in erlaubte_worker genannten Worker. Ein erlaubter, aber nicht registrierter Worker taucht hier nicht auf (kein F-346-Fall, sondern AK7/F19-Angelegenheit). */
  workerAbdeckung: WorkerAbdeckungsLuecke[]
  /** true, wenn jeder Eintrag in workerAbdeckung restFehlend: [] hat. */
  gedeckt: boolean
}

export interface AbdeckungsAnsicht {
  startvorlagePfad: string
  rollen: AbdeckungsEintrag[]
}

/** Eine Rolle→Worker→Modell-Zeile aus einer statischen Workflow-Vorlage (workflow-vorlagen/*.json) — Ebene 2 von AK4. */
export interface VorlagenBesetzung {
  vorlage: string
  schrittId: string
  worker: string
  modell: string
}

/** Ebene 3+4 von AK4: die reale Besetzung im zuletzt gelaufenen echten Workflow mit dieser Rolle — gepinnt (Ebene 3, aus dem Workflow-Schritt) und beobachtet (Ebene 4, aus der Laufakte, sobald der Schritt gelaufen ist). */
export type RealeBesetzung =
  | { status: 'kein_lauf' }
  | { status: 'laufakte_fehlt'; workflowId: string; schrittId: string; laufId: string; gepinnt: { worker: string; modell: string } }
  | { status: 'ok'; workflowId: string; schrittId: string; laufId: string; gepinnt: { worker: string; modell: string }; beobachtet: { worker: string; modellDeklariert: string | null } }

export interface RollenBesetzungsAnsicht {
  rolle: string
  rollenvertrag: Rollenvertrag
  vorlagenBesetzung: VorlagenBesetzung[]
  letzteRealeBesetzung: RealeBesetzung
}
