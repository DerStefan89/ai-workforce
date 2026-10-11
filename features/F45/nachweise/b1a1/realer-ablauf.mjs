/**
 * Datei: features/F45/nachweise/b1a1/realer-ablauf.mjs
 *
 * Zweck: Realer Nachweis F45 B1a-1 (E-F45-3 = A): ein kleiner echter Ablauf der Standard-Kette (Ausführung
 * claude-code → Prüfschritt → Review codex) gegen ai-workforce über einen eigenen Leitstand auf Port 4199. Belegt:
 * Arbeitsordner entsteht (Pfad, Branch, Basis, Laufzeiten worktree add / npm ci / E-183), Bau, Prüfschritt und
 * Review laufen im Worktree, Löschliste wird ausgeführt, der Projektordner bleibt unverändert (git status vorher/
 * nachher ohne kontrollzustand/, Branch, HEAD), danach Aufräumen (ohne Verwerfen abgelehnt, mit Verwerfen
 * entfernt). Schreibt das Protokoll nach features/F45/nachweise/b1a1/realer-ablauf.json.
 *
 * Die Freigabe des ZWINGEND-Schritts gibt dieses Skript im Auftrag von Stefans Bauauftrag B1a-1 (Punkt 4: „realer
 * Nachweis“) über die echte Route; die Begründung sagt das.
 *
 * Aufruf (Leitstand muss auf 4199 laufen): node features/F45/nachweise/b1a1/realer-ablauf.mjs
 * Wird aufgerufen von: Hand (nicht Teil von npm run check — echte Modell-Läufe).
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASIS = 'http://127.0.0.1:4199/api'
const PROJEKT = process.cwd()
const AUSGABE = join(PROJEKT, 'features', 'F45', 'nachweise', 'b1a1', 'realer-ablauf.json')
const protokoll = { gestartet_am: new Date().toISOString(), schritte: [] }

/** Protokollzeile mit Zeitstempel. */
function notiere(art, daten) {
  const eintrag = { t: new Date().toISOString(), art, ...daten }
  protokoll.schritte.push(eintrag)
  console.log(JSON.stringify(eintrag))
  writeFileSync(AUSGABE, `${JSON.stringify(protokoll, null, 2)}\n`)
}

/** Projektordner-Zustand ohne den Kontrollzustand (Laufartefakte des Leitstands liegen dort, untracked). */
function projektZustand() {
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: PROJEKT, encoding: 'utf8' })
    .split('\n')
    // Ausgenommen: Kontrollzustand des Leitstands und das Protokoll dieses Skripts selbst.
    .filter((zeile) => zeile.length > 0 && !zeile.slice(3).startsWith('kontrollzustand/') && !zeile.slice(3).startsWith('kontrollzustand-roh/') && !zeile.slice(3).startsWith('features/F45/nachweise/b1a1/'))
  return {
    status,
    branch: execFileSync('git', ['symbolic-ref', 'HEAD'], { cwd: PROJEKT, encoding: 'utf8' }).trim(),
    kopf: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: PROJEKT, encoding: 'utf8' }).trim(),
    statusHash: execFileSync('git', ['diff', '--stat'], { cwd: PROJEKT, encoding: 'utf8' }),
  }
}

const json = async (antwort) => ({ status: antwort.status, koerper: await antwort.json().catch(() => ({})) })
const post = async (pfad, koerper) => json(await fetch(`${BASIS}${pfad}`, { method: 'POST', body: JSON.stringify(koerper) }))
const get = async (pfad) => json(await fetch(`${BASIS}${pfad}`))
const warte = (ms) => new Promise((r) => setTimeout(r, ms))

const vorher = projektZustand()
notiere('projekt_vorher', vorher)

const auftrag = await post('/auftraege', {
  titel: 'F45 B1a-1 Nachweis: Arbeitsordner',
  auftragstext: [
    'Kleiner Testauftrag für den Nachweis „eigener Arbeitsordner je Ablauf“ (F45 B1a-1). Wird nicht gemergt.',
    '1. Ändere in docs/kommentar-standard.md die erste Zeile unter der Hauptüberschrift nicht inhaltlich, sondern hänge ans Ende der Datei genau eine neue Zeile an: "<!-- F45 B1a-1 Nachweis: Arbeitsordner je Ablauf -->".',
    '2. Lösche die Testdatei public/leitstand/views/runs-dialog.test.mjs. Lösche sie nicht selbst, sondern nenne sie in der Löschliste (Block zu_loeschen).',
    'Sonst nichts ändern.',
  ].join('\n'),
})
notiere('auftrag', auftrag)
const auftragId = auftrag.koerper.auftragId

const vorlage = readFileSync(join(PROJEKT, 'workflow-vorlagen', 'standard.json'), 'utf8')
const workflowId = `b1a1-nachweis-${randomUUID().slice(0, 8)}`
const workflow = JSON.parse(vorlage.replaceAll('__WORKFLOW_ID__', workflowId).replaceAll('__AUFTRAG_ID__', auftragId).replaceAll('__ZIEL__', 'F45 B1a-1 Nachweis: Arbeitsordner je Ablauf'))
const angelegt = await post('/workflows', workflow)
notiere('workflow_angelegt', { status: angelegt.status, workflowId, koerper: angelegt.koerper })

const detailVorher = await get(`/workflows/${workflowId}`)
notiere('anzeige_vor_dem_start', { arbeitsordner: detailVorher.koerper.arbeitsordner, naechster: detailVorher.koerper.naechster })

const freigabeKoerper = { schrittId: 'schritt-1-ausfuehrung', entscheidung: 'FREIGEGEBEN', begruendung: 'Realer Nachweis F45 B1a-1 im Auftrag des Bauauftrags (Stefan, 11.10.2026); Testablauf, wird nicht gemergt.' }
const t0 = Date.now()
const erste = await post(`/workflows/${workflowId}/freigabe`, freigabeKoerper)
notiere('freigabe_1', erste)

let detail
for (;;) {
  detail = await get(`/workflows/${workflowId}`)
  const ao = detail.koerper.arbeitsordner
  if (ao?.vorbereitungLaeuft === false && ['BEREIT', 'FEHLGESCHLAGEN'].includes(ao.status)) break
  if (Date.now() - t0 > 15 * 60 * 1000) throw new Error('Vorbereitung > 15 min')
  await warte(1000)
}
notiere('arbeitsordner_vorbereitet', { wanduhr_ms: Date.now() - t0, arbeitsordner: detail.koerper.arbeitsordner })
if (detail.koerper.arbeitsordner.status !== 'BEREIT') process.exit(1)

const zweite = await post(`/workflows/${workflowId}/freigabe`, freigabeKoerper)
notiere('freigabe_2', zweite)

const t1 = Date.now()
for (;;) {
  detail = await get(`/workflows/${workflowId}`)
  const status = detail.koerper.daten?.status
  if (status !== 'LAEUFT') break
  if (Date.now() - t1 > 75 * 60 * 1000) throw new Error('Ablauf > 75 min')
  await warte(5000)
}
notiere('ablauf_ende', { wanduhr_ms: Date.now() - t1, status: detail.koerper.daten.status, grund: detail.koerper.daten.grund ?? null, schritte: detail.koerper.daten.schritte.map((s) => ({ id: s.schritt_id, status: s.status, lauf_id: s.lauf_id })), pruefergebnis: detail.koerper.pruefergebnis })

const ausfuehrung = detail.koerper.daten.schritte.find((s) => s.rolle === 'ausfuehrung')
const abnahme = await get(`/workflows/${workflowId}/abnahme`)
notiere('abnahme_projektion', { aenderungsuebersicht: abnahme.koerper.aenderungsuebersicht, urteil: abnahme.koerper.urteil })
const ao = detail.koerper.arbeitsordner
const worktreeStatus = execFileSync('git', ['status', '--porcelain'], { cwd: ao.pfad, encoding: 'utf8' })
notiere('worktree_status', { pfad: ao.pfad, status: worktreeStatus.split('\n').filter(Boolean), ausfuehrungLaufId: ausfuehrung?.lauf_id ?? null })

const nachher = projektZustand()
notiere('projekt_nachher', { ...nachher, unveraendert: JSON.stringify(nachher) === JSON.stringify(vorher) })
console.log('Weiter mit: node features/F45/nachweise/b1a1/realer-ablauf.mjs --aufraeumen', workflowId)
