/**
 * Datei: scripts/leitstand/ablauf-sichern.mjs
 *
 * Zweck: „Bereit zum Sichern“ (F45 B2b-4a-1, F-979, F-1087; features/F45/plan-b2b4a1.md) — ein ABGELEITETER Zustand, kein
 * Workflow-Status: ein abgeschlossener Ablauf, dessen eigener Arbeitsordner noch Änderungen trägt, die nicht auf main sind.
 * Rein, kein I/O; eine Quelle der Gründe (SICHERN_GRUENDE) für die Antwort von GET …/code?workflow=<id> (Feld
 * ablauf.sichern) und deren 409.
 *
 * - arbeitsordnerGrund: Lage des Arbeitsordners allein (Eingabe = baueArbeitsordnerProjektion des Servers). Nur der
 *   409-Pfad braucht sie — die Route ruft leiteSichernLageAb erst nach ermittleLaufort.ok auf, die Ordnerlage steht
 *   deshalb nicht noch einmal in der Ableitung.
 * - leiteSichernLageAb: die Ableitung nach ermittleLaufort.ok, Regeln in fester Reihenfolge (siehe Funktion).
 * - mitAblauf: hängt ablauf samt sichern an eine Code-Projektion (ohne ablauf antwortet der Server unverändert).
 *
 * Grenzen (DEKLARIERT, Plan v3 A):
 * - „voraus“ zählt Commits, die noch nicht auf main sind (rev-list gegen den lokal bekannten origin/main bzw. main,
 *   scripts/leitstand/routen-code.mjs leseBasis) — nicht „ungepusht“. Die Projektion holt nie (fetch): nach einem Push und
 *   nach einem Merge im Web (in der Regel Squash) bleibt ein Ablauf „bereit“, bis der Arbeitsordner aufgeräumt ist.
 * - Ob ein Remote „origin“ oder ein Branch vorhanden ist, prüft die Ableitung nicht; den Befehlsblock (und dessen Grund
 *   keinOrigin/keinBranch) baut die Anzeige (4a-2) aus remoteWebUrl/branch der Projektion.
 * - Ohne Basis-Ref (weder origin/main noch main) ist die Lage nichtBestimmbar, auch wenn ein Commit möglich wäre.
 * - Unverfolgte Dateien zählen mit (git status --untracked-files=all). Ein Fremdprojekt ohne node_modules in der .gitignore
 *   (das Skelett hat keine) zeigt nach npm ci im Arbeitsordner node_modules/ als neu ⇒ „bereit (commit)“, ohne dass der
 *   Ablauf etwas geändert hat, bzw. bei sehr großer Liste nichtBestimmbar. Die Vorbereitung nimmt node_modules aus
 *   (src/arbeitsordner zaehleUnsauber), die Ableitung nicht — der Befehlsblock (4a-2) muss das berücksichtigen (F-1157).
 * - Läuft gerade das Aufräumen und liegt der Ordner noch da, ist der Status noch BEREIT: die Route liest dann im Ordner, der
 *   gerade entfernt wird, und die Lage kann kurz „bereit“ zeigen; ist er schon weg, gilt inVorbereitung.
 * - GESTOPPT mit offenen Änderungen wird nicht angeboten (Regel 1); eine abgelehnte Abnahme setzt den Ablauf auf GESTOPPT.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (loeseCodeOrt, GET /api/code)
 * - scripts/leitstand/ablauf-sichern.test.mjs (node:test), scripts/check-f45-b2b4a1-sichern.mjs
 *
 * Wichtig: Die Texte sind Servertexte ohne Kennung (keine workflowId, kein Pfad); übersetzt wird über den Schlüssel
 * (Anzeige 4a-2).
 */

/** Die Gründe, warum ein Ablauf nicht „bereit zum Sichern“ ist — die eine Liste. */
export const SICHERN_GRUENDE = Object.freeze(['nichtAbgeschlossen', 'keinArbeitsordner', 'nichtAngelegt', 'inVorbereitung', 'fehlgeschlagen', 'aufgeraeumt', 'ordnerFehlt', 'nichtBestimmbar', 'nichtsOffen'])

/** Deutscher Servertext je Grund (Rückfall für Leser ohne Übersetzung). */
export const SICHERN_GRUND_TEXT = Object.freeze({
  nichtAbgeschlossen: 'Der Ablauf ist nicht abgeschlossen (er läuft, wartet oder ist gestoppt)',
  keinArbeitsordner: 'Der Ablauf hat keinen eigenen Arbeitsordner',
  nichtAngelegt: 'Der Arbeitsordner des Ablaufs ist noch nicht angelegt',
  inVorbereitung: 'Der Arbeitsordner des Ablaufs wird gerade vorbereitet oder aufgeräumt',
  fehlgeschlagen: 'Die Vorbereitung des Arbeitsordners ist fehlgeschlagen',
  aufgeraeumt: 'Der Arbeitsordner des Ablaufs ist aufgeräumt',
  ordnerFehlt: 'Der Arbeitsordner des Ablaufs fehlt auf der Platte',
  nichtBestimmbar: 'Der Stand des Arbeitsordners lässt sich nicht bestimmen (z. B. weder main noch origin/main, oder Git antwortet nicht)',
  nichtsOffen: 'Im Arbeitsordner ist nichts offen — keine Änderungen und keine Commits, die noch nicht auf main sind',
})

/**
 * Lage des Arbeitsordners allein (für die 409 von GET …/code?workflow=).
 * @param ao - Ergebnis von baueArbeitsordnerProjektion: { status: 'kein_bedarf' | 'bestand' | 'fehlt' | wirksamer Status,
 *   vorbereitungLaeuft?, ordnerVorhanden? }
 * @returns null (kein Arbeitsordner oder bereit und vorhanden) oder ein Schlüssel aus SICHERN_GRUENDE
 */
export function arbeitsordnerGrund(ao) {
  if (ao === null || typeof ao !== 'object') return 'nichtBestimmbar'
  if (ao.status === 'kein_bedarf' || ao.status === 'bestand') return null
  if (ao.status === 'fehlt') return 'nichtAngelegt'
  if (ao.status === 'ENTFERNT') return 'aufgeraeumt'
  // Das Aufräumen belegt dieselbe Sperre wie die Vorbereitung — ein Text für beides (Advisor-Delta 4a-1, 10).
  if (ao.vorbereitungLaeuft === true || ao.status === 'IN_VORBEREITUNG') return 'inVorbereitung'
  if (ao.status === 'FEHLGESCHLAGEN') return 'fehlgeschlagen'
  if (ao.status === 'BEREIT') return ao.ordnerVorhanden === false ? 'ordnerFehlt' : null
  return 'nichtBestimmbar'
}

/**
 * Ableitung „Bereit zum Sichern“ nach ermittleLaufort.ok. Reihenfolge:
 * 1. Ablauf nicht ABGESCHLOSSEN → nichtAbgeschlossen;
 * 2. kein Arbeitsordner (bedarf ≠ 'pflicht') → keinArbeitsordner;
 * 3. Projektion, dateien oder basis ohne status 'ok' → nichtBestimmbar;
 * 4. geänderte Dateien → bereit, art 'commit';
 * 5. Commits noch nicht auf main → bereit, art 'push';
 * 6. sonst → nichtsOffen.
 * @param eingabe - { workflowStatus, bedarf ('pflicht' | 'kein_bedarf' | 'bestand'), projektion (Antwort von baueCodeProjektion) }
 * @returns { bereit, art: 'commit' | 'push' | null, grund: Schlüssel | null, offeneAenderungen: Zahl | null, voraus: Zahl | null }
 */
export function leiteSichernLageAb({ workflowStatus, bedarf, projektion }) {
  const dateien = projektion?.dateien
  const basis = projektion?.basis
  const offeneAenderungen = dateien?.status === 'ok' && typeof dateien.anzahl === 'number' ? dateien.anzahl : null
  const voraus = basis?.status === 'ok' && typeof basis.voraus === 'number' ? basis.voraus : null
  const nicht = (grund) => ({ bereit: false, art: null, grund, offeneAenderungen, voraus })
  if (workflowStatus !== 'ABGESCHLOSSEN') return nicht('nichtAbgeschlossen')
  if (bedarf !== 'pflicht') return nicht('keinArbeitsordner')
  if (projektion?.status !== 'ok' || offeneAenderungen === null || voraus === null) return nicht('nichtBestimmbar')
  if (offeneAenderungen > 0) return { bereit: true, art: 'commit', grund: null, offeneAenderungen, voraus }
  if (voraus > 0) return { bereit: true, art: 'push', grund: null, offeneAenderungen, voraus }
  return nicht('nichtsOffen')
}

/**
 * Hängt das Feld ablauf (mit sichern) an eine Code-Projektion; die Projektion selbst bleibt unverändert (sie kann von
 * gleichzeitigen Abrufen geteilt sein).
 * @param projektion - Antwort von baueCodeProjektion
 * @param ablauf - { workflowId, bedarf, workflowStatus, arbeitsordner: { pfad, branch } | null }
 * @returns neue Antwort { ...projektion, ablauf: { ...ablauf, sichern } }
 */
export function mitAblauf(projektion, ablauf) {
  return { ...projektion, ablauf: { ...ablauf, sichern: leiteSichernLageAb({ workflowStatus: ablauf.workflowStatus, bedarf: ablauf.bedarf, projektion }) } }
}
