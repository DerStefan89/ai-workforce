/**
 * Datei: scripts/leitstand/routen-sparring.mjs
 *
 * Zweck: Projektion für GET /api/sparring (F34 WS-1). Projiziert den
 * 'sparring-<projektId>'-Artefakt-Verlauf (Checkpoint-Kette 'lineage-
 * sparring-<projektId>', geschrieben vom nachLauf-Callback in
 * starteRollenChatLauf über die interne verarbeiteRollenChatErgebnis mit
 * KONFIGURATION_PRODUCT_COACH, scripts/leitstand-server.mjs) in eine Liste — Muster GET /api/chat
 * (scripts/leitstand-server.mjs, F26 WS-2a), aber mit 'coachAntwort' statt
 * 'jarvisAntwort' als Feldname (eigene Artefaktfamilie, kein gemeinsamer
 * Verlauf mit dem Jarvis-Chat).
 *
 * Der POST-Dispatch (POST /api/sparring) bleibt im Server — er braucht die
 * D13-Closure-Sperre (laufAktiv), die dieses Modul nicht kennt (Muster
 * routen-roadmap.mjs/routen-verbrauch.mjs: reine, lesende Projektion, kein
 * Schreibpfad). leitstand-server.mjs registriert GET /api/sparring
 * ausschließlich gegen baueSparringVerlaufsProjektion — keine zweite Kopie
 * dieser Logik dort (D5).
 */

import { listeVersionen } from '../../src/lineage-registry/index.ts'

function STILLER_SCHREIBER() {}

/**
 * Baut die Verlaufsprojektion für GET /api/sparring. Eine (noch) leere Kette
 * ist kein Fehler (Erststart) — listeVersionen liefert dafür bereits [].
 * @param basisVerzeichnis - Kontrollzustand-Wurzel des Projekts
 * @param projektId - Projekt-id der bedienenden Handler-Instanz (erzeugeRequestHandler-Option)
 * @returns { verlauf: [{ laufId, nachricht, coachAntwort, modus }] }
 */
export function baueSparringVerlaufsProjektion(basisVerzeichnis, projektId) {
  const versionen = listeVersionen(`sparring-${projektId}`, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  return {
    verlauf: versionen.map((version) => ({
      laufId: version.herkunft?.lauf_id ?? null,
      nachricht: version.daten?.nachricht ?? null,
      coachAntwort: version.daten?.coachAntwort ?? null,
      // F34 WS-3: Alt-Einträge (vor WS-3, kein 'modus'-Feld geschrieben) projizieren als
      // 'feature' — das war ihr einziges Verhalten, bevor der Modus existierte.
      modus: version.daten?.modus ?? 'feature',
    })),
  }
}
