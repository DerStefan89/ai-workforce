/**
 * Datei: scripts/leitstand/routen-harness-abgleich.mjs
 *
 * Zweck: Server-Anbindung des Harness-Abgleichs (F45 B1b-2, Beleg 12; Logik in src/harness-abgleich). Sammelt die
 * Laufbelege eines Workflows aus vorhandenen Kern-Artefakten (Schritte des Workflows, Prüfergebnis, Laufakte und
 * Änderungsübersicht des Ausführungslaufs), rechnet den Abgleich und baut daraus
 * - das Kern-Artefakt 'harness-abgleich-<workflowId>' am Ende der Kette (schreibeHarnessAbgleichAmKettenende, im
 *   Laufende-Rückruf von starteWorkflowSchritt — MUSS SYNCHRON BLEIBEN, siehe dort),
 * - die Antwort von GET /api/workflows/<id>/harness-abgleich (baueHarnessAbgleichAntwort: das Artefakt, wenn sein
 *   bezug zum heutigen Stand passt, sonst live gerechnet — eine GET-Anfrage schreibt keinen Kontrollzustand),
 * - das Feld abgleich von GET /api/harness (baueHarnessAbgleichOhneLauf: Projekt-Harness laut Zuordnung).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs
 * - scripts/leitstand/routen-harness-abgleich.test.mjs (node:test)
 * - features/F45/nachweise/b1b2/abgleich-nachweis.mjs (Nachweis)
 *
 * Wichtig:
 * - Alles synchron und ohne Wurf an den Aufrufer (Fehler als Ergebnis) — der Kettenende-Aufruf läuft im
 *   D13-Bereich, in dem kein Kontrollflusswechsel erlaubt ist (scripts/check-f15-workflow.mjs).
 * - Nicht im Poll: weder GET /api/zustand noch GET …/abnahme rufen dieses Modul.
 * - Der Schritt der Ausführung ist der mit rolle 'ausfuehrung' (dieselbe Regel wie findeAusfuehrungsSchritt im Server).
 */

import { resolve } from 'node:path'
import { berechneHarnessAbgleich, baueFaehigkeitenKurzliste, filtereHarnessDateien, ladeZuordnung, leseHarnessInventar, validiereHarnessAbgleichDaten } from '../../src/harness-abgleich/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../../src/lineage-registry/index.ts'

/** Artefakt-ID des Abgleichs eines Workflows. @param workflowId - Kennung @returns ID */
export const harnessAbgleichId = (workflowId) => `harness-abgleich-${workflowId}`

/**
 * Der Ausführungsschritt einer Fassung (rolle 'ausfuehrung'), oder null.
 * @param workflowDaten - WORKFLOW_V0-Daten
 * @returns Schritt oder null
 */
function ausfuehrungsSchritt(workflowDaten) {
  if (!Array.isArray(workflowDaten?.schritte)) return null
  return workflowDaten.schritte.find((s) => s !== null && typeof s === 'object' && s.rolle === 'ausfuehrung') ?? null
}

/**
 * Bezug eines Workflows auf seinen heutigen Stand: Lauf-ID der Ausführung und Inhalts-Hash der jüngsten Version
 * ihres Prüfergebnisses (eine wiederholte Prüfung ist eine neue Version).
 * @param workflowDaten - WORKFLOW_V0-Daten
 * @param ladeOptionen - { basisVerzeichnis, schreiber }
 * @returns { bezug, pruefergebnisVersion } (pruefergebnisVersion: geladene Version oder null)
 */
export function ermittleBezug(workflowDaten, ladeOptionen) {
  const laufId = ausfuehrungsSchritt(workflowDaten)?.lauf_id ?? null
  const pruefergebnisVersion = laufId === null ? null : ladeArtefaktVersion(`pruefergebnis-${laufId}`, undefined, ladeOptionen)
  return { bezug: { ausfuehrung_lauf_id: laufId, pruefergebnis_hash: pruefergebnisVersion?.inhaltsHash ?? null }, pruefergebnisVersion }
}

/**
 * Hat der Lauf die Quelldatei eines Inventar-Eintrags laut Änderungsübersicht geändert (DoD → CLAUDE.md, Hook → die
 * settings.json, sonst die Datei selbst; ein neuer bzw. gelöschter Ordner erscheint dort als Ordnerpfad)? Nur solche
 * Einträge des Projektordners werden gegen den Arbeitsordner verglichen — was Stefan nebenher im Projektordner ändert
 * oder was nach dem Basis-Commit auf main dazukommt, gilt so nicht fälschlich als „im Lauf entfernt“ (QA-Nachpass M1).
 * @param eintrag - Inventar-Eintrag des Projektordners
 * @param geaendert - geänderte Harness-Dateien des Ausführungslaufs
 * @returns true, wenn der Lauf die Quelle berührt hat
 */
function vomLaufGeaendert(eintrag, geaendert) {
  const quelle = eintrag.art === 'dod' ? 'CLAUDE.md' : eintrag.art === 'hook' ? '.claude/settings.json' : eintrag.quelle
  return geaendert.some((pfad) => pfad === quelle || (pfad.endsWith('/') && quelle.startsWith(pfad)))
}

/**
 * Rechnet den Abgleich eines Workflows mit seinen Laufbelegen. Wirft nicht.
 * @param eingabe - { workflowId, workflowDaten, wurzel (Harness-Ordner), repoWurzel (Projektordner; weicht wurzel davon ab,
 *   wird gegen dessen Harness verglichen — im Lauf entfernte Einträge sind offen), installWurzel, zuordnungPfad
 *   (Startvorlage, oder null), ladeOptionen }
 * @returns { ok: true, daten } oder { ok: false, grund }
 */
export function berechneAbgleichFuerWorkflow({ workflowId, workflowDaten, wurzel, repoWurzel = wurzel, installWurzel, zuordnungPfad = null, ladeOptionen }) {
  try {
    const { bezug, pruefergebnisVersion } = ermittleBezug(workflowDaten, ladeOptionen)
    const laufId = bezug.ausfuehrung_lauf_id
    const laufakte = laufId === null ? null : ladeArtefaktVersion(`laufakte-${laufId}`, undefined, ladeOptionen)
    const uebersicht = laufId === null ? null : ladeArtefaktVersion(`aenderungsuebersicht-${laufId}`, undefined, ladeOptionen)
    const beobachtung = laufakte?.daten?.beobachtung ?? null
    const laufbelege = {
      schritte: (Array.isArray(workflowDaten?.schritte) ? workflowDaten.schritte : []).map((s) => ({ schritt_id: String(s?.schritt_id ?? ''), rolle: String(s?.rolle ?? ''), status: String(s?.status ?? ''), lauf_id: typeof s?.lauf_id === 'string' ? s.lauf_id : null })),
      ausfuehrung_lauf_id: laufId,
      pruefergebnis: pruefergebnisVersion === null ? null : { ergebnis: String(pruefergebnisVersion.daten?.ergebnis ?? ''), lauf_id: laufId },
      beobachtung,
    }
    const zuordnung = ladeZuordnung(installWurzel, zuordnungPfad)
    const dateien = Array.isArray(uebersicht?.daten?.dateien) ? uebersicht.daten.dateien : null
    const geaendert = filtereHarnessDateien(dateien)
    const referenz = resolve(repoWurzel).toLowerCase() === resolve(wurzel).toLowerCase() || geaendert === null ? null : leseHarnessInventar(repoWurzel).filter((e) => vomLaufGeaendert(e, geaendert))
    const ergebnis = berechneHarnessAbgleich(leseHarnessInventar(wurzel), zuordnung, laufbelege, referenz)
    const daten = {
      harness_abgleich_schema: 'v0',
      workflow_id: workflowId,
      wurzel,
      zuordnung_quellen: zuordnung.quellen,
      bezug,
      zaehlung: ergebnis.zaehlung,
      bestanden: ergebnis.bestanden,
      eintraege: ergebnis.eintraege,
      faehigkeiten: baueFaehigkeitenKurzliste(beobachtung, laufId),
      geaenderte_harness_dateien: geaendert,
      berechnet_am: new Date().toISOString(),
    }
    const verstoesse = validiereHarnessAbgleichDaten(daten)
    if (verstoesse.length > 0) return { ok: false, grund: `verstößt gegen schemas/kontrollzustand-harness-abgleich-payload.schema.json: ${verstoesse.join('; ')}` }
    return { ok: true, daten }
  } catch (fehler) {
    return { ok: false, grund: fehler instanceof Error ? fehler.message : String(fehler) }
  }
}

/**
 * Kettenende (F45 B1b-2): rechnet den Abgleich und hängt ihn als neue Version an 'harness-abgleich-<workflowId>'.
 * MUSS SYNCHRON BLEIBEN — läuft im Laufende-Rückruf von starteWorkflowSchritt im D13-Bereich (kein Wechsel des
 * Kontrollflusses, scripts/check-f15-workflow.mjs). Wirft nicht.
 * Lädt die jüngste Fassung des Workflows selbst (Rückfall: die übergebene), damit der Aufrufer nichts lesen muss.
 * @param eingabe - wie berechneAbgleichFuerWorkflow, dazu profilReferenz
 * @returns { ok: true, versionSequenz } oder { ok: false, grund }
 */
export function schreibeHarnessAbgleichAmKettenende({ profilReferenz, ...eingabe }) {
  let workflowDaten = eingabe.workflowDaten
  try {
    workflowDaten = ladeArtefaktVersion(`workflow-${eingabe.workflowId}`, undefined, eingabe.ladeOptionen)?.daten ?? workflowDaten
  } catch {
    // Rückfall auf die übergebene Fassung — der Abgleich soll nicht am Nachladen scheitern.
  }
  const berechnet = berechneAbgleichFuerWorkflow({ ...eingabe, workflowDaten })
  if (!berechnet.ok) return berechnet
  try {
    const { versionSequenz } = registriereKernArtefakt(harnessAbgleichId(eingabe.workflowId), profilReferenz, { erzeuger: 'kern', schritt: 'harness-abgleich-kettenende' }, berechnet.daten, [], eingabe.ladeOptionen)
    return { ok: true, versionSequenz }
  } catch (fehler) {
    return { ok: false, grund: fehler instanceof Error ? fehler.message : String(fehler) }
  }
}

/**
 * Antwort von GET /api/workflows/<id>/harness-abgleich: das am Kettenende geschriebene Artefakt, wenn sein bezug
 * zum heutigen Stand passt (Ausführungslauf, Prüfergebnis), sonst live gerechnet und nicht geschrieben.
 * @param eingabe - wie berechneAbgleichFuerWorkflow
 * @returns { http, koerper }
 */
export function baueHarnessAbgleichAntwort(eingabe) {
  const { bezug } = ermittleBezug(eingabe.workflowDaten, eingabe.ladeOptionen)
  const artefakt = ladeArtefaktVersion(harnessAbgleichId(eingabe.workflowId), undefined, eingabe.ladeOptionen)
  const passt = artefakt !== null && artefakt.daten?.bezug?.ausfuehrung_lauf_id === bezug.ausfuehrung_lauf_id && artefakt.daten?.bezug?.pruefergebnis_hash === bezug.pruefergebnis_hash
  if (passt && validiereHarnessAbgleichDaten(artefakt.daten).length === 0) {
    return { http: 200, koerper: { status: 'ok', quelle: 'artefakt', versionSequenz: artefakt.versionSequenz, daten: artefakt.daten } }
  }
  const live = berechneAbgleichFuerWorkflow(eingabe)
  if (!live.ok) return { http: 500, koerper: { grund: `Harness-Abgleich nicht berechenbar: ${live.grund}` } }
  return { http: 200, koerper: { status: 'ok', quelle: 'live', versionSequenz: null, artefaktVeraltet: artefakt !== null, daten: live.daten } }
}

/**
 * Feld abgleich von GET /api/harness (Seite Workforce): Projekt-Harness laut Zuordnung, ohne Laufbelege. Wirft nicht.
 * @param eingabe - { repoWurzel, installWurzel, zuordnungPfad }
 * @returns { status: 'ok', zuordnung_quellen, zaehlung, bestanden: null, eintraege } oder { status: 'fehler', grund }
 */
export function baueHarnessAbgleichOhneLauf({ repoWurzel, installWurzel, zuordnungPfad = null }) {
  try {
    const zuordnung = ladeZuordnung(installWurzel, zuordnungPfad)
    const ergebnis = berechneHarnessAbgleich(leseHarnessInventar(repoWurzel), zuordnung, null)
    return { status: 'ok', zuordnung_quellen: zuordnung.quellen, zaehlung: ergebnis.zaehlung, bestanden: null, eintraege: ergebnis.eintraege }
  } catch (fehler) {
    return { status: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) }
  }
}
