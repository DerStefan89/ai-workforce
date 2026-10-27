/**
 * Datei: scripts/leitstand/ist-nach-abnahme.mjs
 *
 * Zweck: F45 B5b-3 „Ist nach Abnahme“ (R7; features/F45/plan-b5b3-v2.md) — der I/O-Teil: nach POST …/abnahme ANGENOMMEN die
 * Akte des Features (feature_ref des Auftrags) im Laufort des Ablaufs fortschreiben (Regel rein in
 * src/feature-auftrag/ist-nach-abnahme.ts). Laufort = Arbeitsordner, wenn der Ablauf einen hat — dann steht die Änderung im Block
 * „Bereit zum Sichern“ desselben Ablaufs (ein Commit mit dem Bau); sonst der Projektordner mit Git-Block in der Antwort und der
 * Sperre findeSperrendenAblauf wie PUT …/planung. Ausnahme „Akte“: ARCHITECTURE.md §2, docs/architektur/arbeitsordner.md. Kein
 * Commit, kein git-Prozess.
 *
 * Ergebnis (Feld ist_nach_abnahme der 200): null ohne feature_ref (Feld fehlt), sonst { art: 'geschrieben' | 'schon_geschrieben'
 * | 'keine_akte' | 'hinweis', workstream?, ist?, pfad?, hinweis?, git? } — git nur im Projektordner.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (POST …/abnahme, Zweig ANGENOMMEN), scripts/leitstand/ist-nach-abnahme.test.mjs.
 *
 * Wichtig (DEKLARIERT, Plan v2): Wirft nie — die Abnahme ist schon festgehalten, R7 ist Nebenwirkung. Der Hinweis steht nur in der
 * Antwort (nach Neuladen weg). „Erst abnehmen, dann sichern“ ist nicht erzwungen (A5). Begonnen-Ersatz = lokaler Tag des ersten
 * Checkpoints der Workflow-Kette (Anlage des Ablaufs).
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { ladeGueltigeCheckpoints } from '../../src/checkpoint-store/index.ts'
import { schreibeIstNachAbnahme } from '../../src/feature-auftrag/ist-nach-abnahme.ts'
import { ladeArtefaktVersion } from '../../src/lineage-registry/index.ts'
import { FEATURE_ID_MUSTER } from '../../src/projektkontext/index.ts'
import { baueGitBlock, findeSperrendenAblauf, loeseFeatureAktePfadAuf, lokalesDatum } from './routen-f35.mjs'

/** Text eines Wurfs. @param fehler - Wurf @returns Text */
const meldung = (fehler) => (fehler instanceof Error ? fehler.message : String(fehler))

/**
 * Lokaler Tag der Anlage des Ablaufs (erster gültiger Checkpoint der Workflow-Kette) oder null.
 * @param workflowId - Kennung
 * @param ladeOptionen - { basisVerzeichnis, schreiber }
 * @returns JJJJ-MM-TT oder null
 */
function anlageTag(workflowId, ladeOptionen) {
  let iso
  try {
    iso = ladeGueltigeCheckpoints(`lineage-workflow-${workflowId}`, ladeOptionen)[0]?.payload?.erstellt_am
  } catch (fehler) {
    // Nur der Ersatz fällt weg (cr 2): Begonnen bleibt leer, R7 läuft weiter.
    console.error(`[ist-nach-abnahme] Anlage des Ablaufs ${workflowId} nicht lesbar:`, fehler)
    return null
  }
  const zeit = typeof iso === 'string' ? new Date(iso) : null
  return zeit === null || Number.isNaN(zeit.getTime()) ? null : lokalesDatum(zeit)
}

/**
 * Schreibt die Workstream-Zeile nach der Abnahme fort. Wirft nicht.
 * @param eingabe - { workflowId, workflowDaten, laufort: () => ermittleLaufort(…) (erst im try aufgerufen, cr 1), repoWurzel,
 *   ladeOptionen, workflows(), auftraege(), datum?, schreibe? (Tests) }
 * @returns Promise<Ergebnis | null>
 */
export async function fuehreIstNachAbnahmeDurch(eingabe) {
  const { workflowId, workflowDaten, repoWurzel, ladeOptionen } = eingabe
  let featureRef
  try {
    featureRef = ladeArtefaktVersion(`auftrag-${workflowDaten.auftrag_id}`, undefined, ladeOptionen)?.daten?.feature_ref
  } catch (fehler) {
    console.error(`[ist-nach-abnahme] Auftrag von '${workflowId}' nicht lesbar:`, fehler)
    return { art: 'hinweis', hinweis: `Auftrag nicht lesbar (${meldung(fehler)}) — Workstream von Hand nachtragen` }
  }
  if (typeof featureRef !== 'string') return null
  const hinweis = (text) => ({ art: 'hinweis', hinweis: text })
  try {
    if (!FEATURE_ID_MUSTER.test(featureRef)) return hinweis(`feature_ref '${featureRef}' ist keine Feature-ID — von Hand nachtragen`)
    const laufort = eingabe.laufort()
    if (!laufort.ok) return hinweis('Der Arbeitsordner des Ablaufs ist nicht verfügbar — Workstream von Hand nachtragen')
    const wurzel = laufort.wurzel
    const pfad = loeseFeatureAktePfadAuf(featureRef, wurzel)
    // Exakter Ordnername (wie PUT …/planung, qa 6): auf Windows fände existsSync auch „f45“ für „F45“.
    if (pfad === null || !existsSync(pfad) || !readdirSync(join(wurzel, 'features')).includes(featureRef)) return { art: 'keine_akte' }
    const rel = relative(wurzel, pfad).replace(/\\/g, '/')
    if (laufort.arbeitsordner === null) {
      const sperre = findeSperrendenAblauf(featureRef, await eingabe.workflows(), await eingabe.auftraege())
      if (sperre !== null) return hinweis(`${sperre.grund} — Workstream danach von Hand nachtragen`)
    }
    // Ab hier synchron bis nach dem Schreiben.
    const alt = readFileSync(pfad)
    const text = alt.toString('utf8')
    if (!Buffer.from(text, 'utf8').equals(alt)) return hinweis(`${rel} ist kein gültiges UTF-8 — von Hand nachtragen`)
    const datum = eingabe.datum ?? lokalesDatum()
    const regel = schreibeIstNachAbnahme(text, { workflowId, datum, begonnenErsatz: anlageTag(workflowId, ladeOptionen) })
    if (regel.art === 'hinweis') return hinweis(regel.grund)
    if (regel.art === 'schon_geschrieben') return { art: 'schon_geschrieben', pfad: rel }
    const neu = Buffer.from(regel.inhalt, 'utf8')
    const schreibe = eingabe.schreibe ?? writeFileSync
    try {
      schreibe(pfad, neu)
      if (!readFileSync(pfad).equals(neu)) throw new Error('nach dem Schreiben nicht wie erwartet')
    } catch (fehler) {
      console.error(`[ist-nach-abnahme] ${rel} nicht geschrieben — Rückbau:`, fehler)
      let rueckbau = 'zurückgesetzt'
      try {
        writeFileSync(pfad, alt)
        if (!readFileSync(pfad).equals(alt)) rueckbau = 'NICHT zurückgesetzt'
      } catch (rueckbauFehler) {
        console.error(`[ist-nach-abnahme] Rückbau von ${rel} gescheitert:`, rueckbauFehler)
        rueckbau = `NICHT zurückgesetzt (${meldung(rueckbauFehler)})`
      }
      return hinweis(`${rel} nicht geschrieben (${meldung(fehler)}), Rückbau: ${rueckbau} — git diff prüfen, Workstream von Hand nachtragen`)
    }
    const ergebnis = { art: 'geschrieben', workstream: regel.workstream, ist: regel.ist, pfad: rel }
    if (laufort.arbeitsordner !== null) return ergebnis
    return { ...ergebnis, git: baueGitBlock(repoWurzel, [rel], `${featureRef}: Workstream ${regel.workstream} erledigt — Abnahme ${workflowId}`) }
  } catch (fehler) {
    console.error(`[ist-nach-abnahme] Workstream für '${workflowId}' nicht fortgeschrieben:`, fehler)
    return hinweis(`Workstream nicht fortgeschrieben (${meldung(fehler)}) — von Hand nachtragen`)
  }
}
