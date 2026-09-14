/**
 * Datei: src/workboard/failed-runs.ts
 *
 * Zweck: Reine Projektionsfunktion für Failed Runs (F21 WS-1, dritter
 * Baustein aus dem Auftrag) über das bereits vom Server geladene
 * Lauf-Aggregat (sammleLaeufe in scripts/leitstand-server.mjs) — kein
 * eigenes Dateisystem-Scannen, die Funktion nimmt die Liste entgegen, die
 * der Server ohnehin schon baut. Noch nicht an einen Endpunkt angeschlossen
 * (WS-2 baut die Attention-View als Client-Projektion darüber,
 * features/F21/feature.md, Nicht-Ziele).
 *
 * "Failed" heißt hier ausschließlich ergebnis 'FEHLGESCHLAGEN' (F-370) —
 * 'VERWEIGERT' ist ein eigener, bereits über den Bypass-Verdacht-Pfad
 * behandelter Menschenentscheid (siehe scripts/leitstand-server.mjs,
 * POST /api/entscheidungen, art 'kenntnisnahme') und zählt hier bewusst
 * nicht als Fehlschlag.
 */

/** Minimaler Ausschnitt aus dem von sammleLaufKopfdaten gelieferten Kopfdatensatz — nur, was diese Projektion braucht. */
export interface LaufKopfdatenFuerProjektion {
  laufId: string
  ergebnis: 'ERFOLGREICH' | 'VERWEIGERT' | 'FEHLGESCHLAGEN' | null
  kenntnisgenommen: boolean
  zeitpunkt: string | null
  auftragsbezug: { auftragId: string; titel: string } | null
}

export interface FailedRunWorkitem {
  quelle: 'failed-run'
  laufId: string
  kenntnisgenommen: boolean
  zeitpunkt: string | null
  auftragsbezug: { auftragId: string; titel: string } | null
}

/**
 * @param laeufe - bereits geladene Lauf-Kopfdaten (sammleLaeufe-Ergebnis)
 * @returns nur die Läufe mit ergebnis 'FEHLGESCHLAGEN', unverändert sortiert wie die Eingabe
 */
export function projiziereFehlgeschlageneLaeufe(laeufe: LaufKopfdatenFuerProjektion[]): FailedRunWorkitem[] {
  return laeufe
    .filter((lauf) => lauf.ergebnis === 'FEHLGESCHLAGEN')
    .map((lauf) => ({
      quelle: 'failed-run' as const,
      laufId: lauf.laufId,
      kenntnisgenommen: lauf.kenntnisgenommen,
      zeitpunkt: lauf.zeitpunkt,
      auftragsbezug: lauf.auftragsbezug,
    }))
}
