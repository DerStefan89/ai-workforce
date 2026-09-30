/**
 * Datei: src/projekt-aufruf/types.ts
 *
 * Zweck: Typen für F43 „Projekt aufrufen/anzeigen“ (features/F43/feature.md). Flüchtige
 * Antwortformen des Leitstands, kein Kernartefakt und kein Schema unter schemas/ — das Ergebnis
 * eines Aufrufs lebt nur im Speicher der Serverinstanz (Begründung im Kopf von index.ts).
 *
 * Wird aufgerufen von: src/projekt-aufruf/index.ts.
 */

import type { PruefergebnisWert } from '../pruefschritt/types.ts'

/** Inhalt von ergebnis_datei nach dem Aufruf — Text nur für .md/.json/.txt, sonst nur die Größe. */
export type ErgebnisDateiAnsicht =
  | { pfad: string; vorhanden: false; grund: string }
  | { pfad: string; vorhanden: true; bytes: number; ausDiesemAufruf: boolean; text: string | null; gekuerzt: boolean }

/** Ergebnis eines Aufrufs; ausgang übernimmt die vier Prüfschritt-Ausgänge (GRUEN = Exit 0). */
export interface AufrufErgebnis {
  befehl: string[]
  ausgang: PruefergebnisWert
  exit_code: number | null
  dauer_ms: number
  zeitgrenze_ms: number
  gestartet_am: string
  stdout_ende: string
  stderr_ende: string
  ergebnis_datei: ErgebnisDateiAnsicht | null
}

/** Erreichbarkeit der vorschau_url. erreichbar null = keine gültige URL gesetzt. */
export interface VorschauStatus {
  url: string | null
  erreichbar: boolean | null
  grund: string
}
