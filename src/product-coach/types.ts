/**
 * Datei: src/product-coach/types.ts
 *
 * Zweck: Typen für das Ergebnis der Rolle 'product-coach' (F34 WS-1/WS-3).
 * Spiegelt schemas/ergebnis-product-coach.schema.json — die einzige
 * Formbeschreibung, validiereErgebnisProductCoach (src/product-coach/index.ts)
 * die einzige Prüfung dagegen (D5, Muster src/jarvis/types.ts).
 *
 * Wird aufgerufen von: src/product-coach/index.ts.
 */

export type CoachArt = 'frage' | 'alternativen' | 'scope_entwurf' | 'projekt_entwurf'

export type CoachModus = 'feature' | 'projekt'

export type CapabilityStatus = 'vorhanden' | 'offen' | 'fehlt'

export interface ProjektFeatureEntwurf {
  titel: string
  ziel: string
  nicht_ziele: string[]
  akzeptanzkriterien: string[]
  abhaengig_von_titel: string[]
}

export interface ProjektMeilensteinEntwurf {
  titel: string
  ziel: string
  features: ProjektFeatureEntwurf[]
}

export interface CapabilityBedarf {
  bedarf: string
  ressource_id: string | null
  status: CapabilityStatus
}

export interface ProjektEntwurf {
  vision: string
  zielgruppe: string
  ziele: string[]
  scope_in: string[]
  scope_out: string[]
  meilensteine: ProjektMeilensteinEntwurf[]
  capabilities_bedarf: CapabilityBedarf[]
  architektur_hinweise: string[]
  offene_fragen: string[]
}

export interface CoachAlternative {
  titel: string
  beschreibung: string
  abwaegung: string
}

export interface CoachScope {
  titel: string
  problem: string
  ziel: string
  in_scope: string[]
  out_of_scope: string[]
  annahmen: string[]
  offene_fragen: string[]
  erfolgskriterium: string
}

/**
 * F-423-Muster (ergebnis-jarvis): 'alternativen'/'scope'/'projekt' sind im
 * Codex-kompatiblen Schema TOP-LEVEL PFLICHTFELDER vom Typ ["array","null"]
 * bzw. ["object","null"] — 'null' und 'fehlend' sind für
 * validiereErgebnisProductCoach gleichbedeutend (der claude-code-Worker
 * lässt das Feld weiterhin weg statt es auf null zu setzen), deshalb
 * bleiben die Felder hier zusätzlich optional.
 */
export interface ErgebnisProductCoach {
  art: CoachArt
  antwort: string
  alternativen?: CoachAlternative[] | null
  scope?: CoachScope | null
  projekt?: ProjektEntwurf | null
}

/**
 * Ein Turn aus der 'sparring-<projektId>'-Kette, wie ihn
 * waehleVerlaufsfenster/baueCoachAuftragstext sehen — bereits auf Nachricht +
 * Antworttext reduziert (Muster JarvisVerlaufsEintrag, src/jarvis/types.ts).
 */
export interface CoachVerlaufsEintrag {
  nachricht: string
  antwort: string
  istZusammenfassung?: boolean
}

/**
 * F34 WS-3: Feature-/Meilenstein-IDs, die bereits real vergeben sind — Eingabe
 * für vergebeFeatureIds (src/product-coach/index.ts). Der Aufrufer (Server)
 * sammelt sie aus features/<id>/ (Verzeichnisnamen) UND roadmap.json
 * (meilensteine[].features[]/meilensteine[].id) — vergebeFeatureIds selbst
 * liest keine Dateien (rein, kein I/O).
 */
export interface BestehendeIds {
  features: string[]
  meilensteine: string[]
}

/** Ein Feature aus einem Projekt-Entwurf, nachdem vergebeFeatureIds ihm eine ID zugewiesen hat. */
export interface ZugewiesenesFeature extends ProjektFeatureEntwurf {
  id: string
  /** abhaengig_von_titel aufgelöst zu IDs — ein unbekannter Titel erzeugt STATTDESSEN einen offene_fragen-Eintrag, kein Raten. */
  abhaengig_von_ids: string[]
}

/** Ein Meilenstein aus einem Projekt-Entwurf, nachdem vergebeFeatureIds ihm (und seinen Features) eine ID zugewiesen hat. */
export interface ZugewiesenerMeilenstein {
  id: string
  titel: string
  ziel: string
  features: ZugewiesenesFeature[]
}

/** Rückgabe von vergebeFeatureIds: ID-tragende Meilensteine/Features plus um ungelöste Abhängigkeiten ergänzte offene_fragen. */
export interface ProjektMitIds {
  meilensteine: ZugewiesenerMeilenstein[]
  offene_fragen: string[]
}

/**
 * Ein vollständiger Projekt-Entwurf mit bereits vergebenen IDs — Eingabe für
 * baueAuftragAusProjektentwurf (src/product-coach/index.ts): alle Felder von
 * ProjektEntwurf, aber 'meilensteine'/'offene_fragen' durch die
 * ID-tragende Fassung aus vergebeFeatureIds ersetzt. 'auftragModus' kommt NICHT aus
 * vergebeFeatureIds (das liefert nur ProjektMitIds), sondern wird vom Aufrufer
 * (verarbeiteRollenChatErgebnis, scripts/leitstand-server.mjs) separat aus denselben
 * bestehendeIds abgeleitet und vor dem Persistieren in dasselbe Objekt gemischt — hier trotzdem
 * mitdeklariert, weil sowohl die Server-Funktion als auch die Browser-Kopie das Feld tatsächlich
 * lesen (Code-Review-Befund F34 WS-3: der TS-Typ soll die real persistierte Form vollständig
 * beschreiben, nicht nur, was vergebeFeatureIds selbst zurückgibt).
 */
export type ProjektEntwurfMitIds = Omit<ProjektEntwurf, 'meilensteine' | 'offene_fragen'> & ProjektMitIds & { auftragModus: 'neu' | 'erweiterung' }

/**
 * F42 WS-1 (löst F-701): serverseitiges Wissen, das die reine Funktion
 * baueAuftragAusProjektentwurf (src/product-coach/index.ts) selbst nicht
 * besitzt — pruefbefehl (argv der Ziel-Startvorlage, aus GET /api/zustand)
 * und istAiWorkforce (repoWurzel === installWurzel). Beide optional;
 * fehlen sie, erfindet die Funktion nichts (kein Prüfbefehl, keine
 * ai-workforce-eigenen Prüfpfade).
 */
export interface AuftragKontext {
  pruefbefehl?: string[]
  istAiWorkforce?: boolean
}
