/**
 * Datei: features/F45/nachweise/b1a1/korrekturlauf.mjs
 *
 * Zweck: Fortsetzung des realen Nachweises F45 B1a-1: nach dem Review-Urteil BLOCKIERT setzt die Korrekturschleife
 * Schritt 1 zurück (ZWINGEND). Dieses Skript erteilt die Freigabe des Korrekturlaufs (im Auftrag des Bauauftrags
 * B1a-1, Begründung sagt das), wartet auf das Ende und hängt das Ergebnis an realer-ablauf.json an: Korrekturlauf im
 * selben Worktree mit offenen Änderungen (Vorbedingung nur Branch, E-F45-5), Löschliste, Prüfschritt, Review,
 * Projektordner unverändert.
 *
 * Aufruf: node features/F45/nachweise/b1a1/korrekturlauf.mjs <workflowId>
 * Wird aufgerufen von: Hand (echte Modell-Läufe, nicht Teil von npm run check).
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [workflowId] = process.argv.slice(2)
const BASIS = 'http://127.0.0.1:4199/api'
const PROJEKT = process.cwd()
const AUSGABE = join(PROJEKT, 'features', 'F45', 'nachweise', 'b1a1', 'realer-ablauf.json')
const protokoll = JSON.parse(readFileSync(AUSGABE, 'utf8'))

/** Protokollzeile mit Zeitstempel. */
function notiere(art, daten) {
  const eintrag = { t: new Date().toISOString(), art, ...daten }
  protokoll.schritte.push(eintrag)
  console.log(JSON.stringify(eintrag).slice(0, 1500))
  writeFileSync(AUSGABE, `${JSON.stringify(protokoll, null, 2)}\n`)
}

/** Projektordner-Zustand ohne Kontrollzustand und dieses Protokoll (wie realer-ablauf.mjs). */
function projektZustand() {
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: PROJEKT, encoding: 'utf8' })
    .split('\n')
    .filter((zeile) => zeile.length > 0 && !zeile.slice(3).startsWith('kontrollzustand/') && !zeile.slice(3).startsWith('kontrollzustand-roh/') && !zeile.slice(3).startsWith('features/F45/nachweise/b1a1/'))
  return {
    status,
    branch: execFileSync('git', ['symbolic-ref', 'HEAD'], { cwd: PROJEKT, encoding: 'utf8' }).trim(),
    kopf: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: PROJEKT, encoding: 'utf8' }).trim(),
    statusHash: execFileSync('git', ['diff', '--stat'], { cwd: PROJEKT, encoding: 'utf8' }),
  }
}

const json = async (antwort) => ({ status: antwort.status, koerper: await antwort.json().catch(() => ({})) })
const vorher = projektZustand()
const freigabe = await json(
  await fetch(`${BASIS}/workflows/${workflowId}/freigabe`, {
    method: 'POST',
    body: JSON.stringify({ schrittId: 'schritt-1-ausfuehrung', entscheidung: 'FREIGEGEBEN', begruendung: 'Korrekturlauf im realen Nachweis F45 B1a-1 (Bauauftrag Stefan, 11.10.2026); Testablauf, wird nicht gemergt.' }),
  })
)
notiere('korrektur_freigabe', freigabe)
const t0 = Date.now()
let detail
for (;;) {
  detail = (await json(await fetch(`${BASIS}/workflows/${workflowId}`))).koerper
  if (detail.daten.status !== 'LAEUFT') break
  if (Date.now() - t0 > 60 * 60 * 1000) throw new Error('Korrekturlauf > 60 min')
  await new Promise((r) => setTimeout(r, 5000))
}
notiere('korrektur_ende', { wanduhr_ms: Date.now() - t0, status: detail.daten.status, grund: detail.daten.grund ?? null, schritte: detail.daten.schritte.map((s) => ({ id: s.schritt_id, status: s.status, lauf_id: s.lauf_id })), pruefergebnis: detail.pruefergebnis, arbeitsordner: detail.arbeitsordner })
const abnahme = (await json(await fetch(`${BASIS}/workflows/${workflowId}/abnahme`))).koerper
notiere('korrektur_abnahme_projektion', { aenderungsuebersicht: abnahme.aenderungsuebersicht, urteil: abnahme.urteil })
const ausfuehrung = detail.daten.schritte.find((s) => s.rolle === 'ausfuehrung')
const uebersicht = JSON.parse(
  execFileSync(process.execPath, ['-e', `const {ladeArtefaktVersion}=await import('./src/lineage-registry/index.ts');console.log(JSON.stringify(ladeArtefaktVersion('aenderungsuebersicht-${ausfuehrung.lauf_id}',undefined,{schreiber:()=>{}})?.daten??null))`], { cwd: PROJEKT, encoding: 'utf8', input: '' })
    .trim()
    .split('\n')
    .pop()
)
notiere('korrektur_loeschliste', { laufId: ausfuehrung.lauf_id, loeschliste: uebersicht?.loeschliste ?? null, dateien: uebersicht?.dateien ?? null })
notiere('worktree_status_nach_korrektur', { status: execFileSync('git', ['status', '--porcelain'], { cwd: detail.arbeitsordner.pfad, encoding: 'utf8' }).split('\n').filter(Boolean) })
const nachher = projektZustand()
notiere('projekt_nach_korrektur', { ...nachher, unveraendert: JSON.stringify(nachher) === JSON.stringify(vorher) })
