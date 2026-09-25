#!/usr/bin/env node
/**
 * Datei: scripts/check-f35-ws1-feature-auftrag.mjs
 *
 * Zweck: Gate für F35 WS-1 (features/F35/feature.md, "Feature bauen aus
 * Akte"). Nachweis am REALEN Aufrufpfad (F-708, Muster
 * scripts/check-fix-f676-installwurzel.mjs): ein Wegwerf-"Fremdprojekt"
 * trägt NUR features/<id>/feature.md, keine Workforce-Assets
 * (ressourcen.json/schemas//workflow-vorlagen/) — `repoWurzel` zeigt
 * dorthin, `installWurzel` bleibt diese Installation (E-F41-2). Die neue
 * Route `POST /api/features/<featureId>/auftrag` (aufgerufen wie über
 * `/api/projekte/<id>/features/<featureId>/auftrag`, Muster
 * erzeugeMultiProjektDispatcher) wird über einen echten HTTP-Testserver
 * angesprochen (Muster scripts/check-f22-click-to-work.mjs' starteTestserver).
 *
 * Prüft:
 * (a) Grünfall: eine Akte mit 3 AKs (eines mit expliziter ID, zwei ohne)
 *     ergibt real einen persistierten Auftrag mit `akzeptanzkriterien`
 *     (3 Einträge, korrekte IDs), `nicht_ziele`, der `workitem:feature:
 *     <id>`-Zeile und `herkunft.art === 'feature_akte'`.
 * (b) Rotfall: Akte ohne AK → 422.
 * (b2) Rotfall (Reviewer-Befund, frischer Kontext): eine explizite AK-ID, die
 *     mit der Positions-ID eines anderen Bullets kollidiert, → 422 statt
 *     eines Auftrags mit zwei gleich-ID'ten Akzeptanzkriterien.
 * (b3) Rotfall (QA-Pass-Befund, frischer Kontext): eine Akte mit Status
 *     ABGESCHLOSSEN → 422 — die Statusgrenze aus AK6 gilt serverseitig, nicht
 *     nur als Sichtbarkeitsbedingung des Workboard-Knopfs.
 * (c) Rotfall: featureId `../x` → 400.
 * (d) Rotfall: fehlende Akte → 404.
 * (e) Rotfall: `POST /api/auftraege` mit `akzeptanzkriterien` im Body → 400
 *     (die neuen Felder bleiben dem Formular verschlossen, nur die neue
 *     Route setzt sie — AK2).
 * (f) AK5 (Kontrolltiefe-Untergrenze): `verarbeiteRouterErgebnis` (dieselbe
 *     Funktion, die `POST /api/auftraege/<id>/routen` real aufruft) mit
 *     einer `herkunft.art: 'feature_akte'`-Auftragsversion und einer
 *     gestubbten `fast-lane`-Klassifikation wählt real `standard.json`
 *     (Schritt 'code-reviewer' vorhanden), nicht `fast-lane.json`.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f35-ws1-feature-auftrag.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeArtefaktVersion } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { erzeugeRequestHandler, verarbeiteRouterErgebnis } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F35-WS1-Feature-Auftrag-Check ===\n')

/** @param optionen - an erzeugeRequestHandler durchgereicht @returns { basisUrl, schliessen } eines echten HTTP-Testservers (Muster check-f22-click-to-work.mjs) */
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    basisUrl: `http://127.0.0.1:${port}`,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  }
}

const INSTALL_WURZEL = process.cwd()
// F-595-Muster (^F[0-9]+[A-Za-z]?$): nur Ziffern nach 'F', höchstens EIN Buchstabe am Ende —
// 'F35GATE' verletzt das (mehrere Buchstaben) und wurde real vom Gate selbst als Rotfall (a)
// verworfen, bevor die eigentliche Grünfall-Prüfung lief.
const FREMDPROJEKT_ID = 'F9991'
const AKTE_MIT_AKS = `# ${FREMDPROJEKT_ID} — Gate-Feature

## Titel
Gate-Feature

## Status
Status: ENTWURF

## Ziel
Ziel des Gate-Features.

## Nicht-Ziele
- Erstes Nicht-Ziel.
- Zweites Nicht-Ziel.

## Akzeptanzkriterien
- Erstes AK ohne explizite ID.
- Zweites AK ohne explizite ID.
- AK5: Drittes AK mit expliziter ID.

## Dependencies
- Keine.
`
const AKTE_OHNE_AK = `# ${FREMDPROJEKT_ID}-B — Gate-Feature ohne AK

## Titel
Gate-Feature ohne AK

## Status
Status: ENTWURF

## Ziel
Ziel ohne Akzeptanzkriterien.

## Dependencies
- Keine.
`
// Reviewer-Befund (frischer Kontext, 25.09.2026): eine explizite AK-ID kann mit der Positions-ID
// eines anderen Bullets kollidieren (Bullet 2 ohne ID läge sonst still auf derselben ID 'AK2').
const AKTE_MIT_ID_KOLLISION = `# ${FREMDPROJEKT_ID}C — Gate-Feature mit ID-Kollision

## Ziel
Ziel-Text.

## Akzeptanzkriterien
- AK2: Explizit benanntes Kriterium.
- Zweites Kriterium ohne ID (Position 2 — kollidiert mit AK2).
`
// QA-Pass-Befund (frischer Kontext, 25.09.2026): der Status-Gate muss auch serverseitig gelten,
// nicht nur als Sichtbarkeitsbedingung des Workboard-Knopfs.
const AKTE_ABGESCHLOSSEN = `# ${FREMDPROJEKT_ID}D — Gate-Feature abgeschlossen

## Status
Status: ABGESCHLOSSEN

## Ziel
Ziel-Text.

## Akzeptanzkriterien
- Einziges AK.
`

/** Baut ein Wegwerf-"Fremdprojekt" (NUR features/, keine Workforce-Assets) mit den übergebenen feature.md-Inhalten. @returns absoluter Pfad des Fremdprojekt-Verzeichnisses */
function baueFremdprojekt(featureAkten) {
  const fremdprojekt = mkdtempSync(join(tmpdir(), 'check-f35-fremdprojekt-'))
  for (const [featureId, inhalt] of Object.entries(featureAkten)) {
    const ordner = join(fremdprojekt, 'features', featureId)
    mkdirSync(ordner, { recursive: true })
    writeFileSync(join(ordner, 'feature.md'), inhalt, 'utf8')
  }
  return fremdprojekt
}

// ─── (a)/(b)/(c)/(d): echte HTTP-Route gegen das Fremdprojekt ──────────────────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f35-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const fremdprojekt = baueFremdprojekt({
    [FREMDPROJEKT_ID]: AKTE_MIT_AKS,
    [`${FREMDPROJEKT_ID}B`]: AKTE_OHNE_AK,
    [`${FREMDPROJEKT_ID}C`]: AKTE_MIT_ID_KOLLISION,
    [`${FREMDPROJEKT_ID}D`]: AKTE_ABGESCHLOSSEN,
  })
  const { basisUrl, schliessen } = await starteTestserver({ basisVerzeichnis, repoWurzel: fremdprojekt, installWurzel: INSTALL_WURZEL })
  try {
    // (a) Grünfall
    {
      const befundeVor = befunde.length
      const antwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent(FREMDPROJEKT_ID)}/auftrag`, { method: 'POST' })
      const inhalt = await antwort.json().catch(() => ({}))
      if (antwort.status !== 201 || typeof inhalt.auftragId !== 'string') {
        befunde.push(`(a) Grünfall: erwartet 201 mit auftragId, erhalten ${antwort.status} ${JSON.stringify(inhalt)}`)
      } else {
        const version = ladeArtefaktVersion(`auftrag-${inhalt.auftragId}`, undefined, { basisVerzeichnis, schreiber: () => {} })
        const daten = version?.daten ?? {}
        if (daten.herkunft?.art !== 'feature_akte') {
          befunde.push(`(a) Grünfall: herkunft.art erwartet 'feature_akte', erhalten ${JSON.stringify(daten.herkunft)}`)
        }
        const erwarteteAks = [
          { id: 'AK1', text: 'Erstes AK ohne explizite ID.' },
          { id: 'AK2', text: 'Zweites AK ohne explizite ID.' },
          { id: 'AK5', text: 'Drittes AK mit expliziter ID.' },
        ]
        if (JSON.stringify(daten.akzeptanzkriterien) !== JSON.stringify(erwarteteAks)) {
          befunde.push(`(a) Grünfall: akzeptanzkriterien erwartet ${JSON.stringify(erwarteteAks)}, erhalten ${JSON.stringify(daten.akzeptanzkriterien)}`)
        }
        if (JSON.stringify(daten.nicht_ziele) !== JSON.stringify(['Erstes Nicht-Ziel.', 'Zweites Nicht-Ziel.'])) {
          befunde.push(`(a) Grünfall: nicht_ziele erwartet die zwei Bullets, erhalten ${JSON.stringify(daten.nicht_ziele)}`)
        }
        if (typeof daten.auftragstext !== 'string' || !daten.auftragstext.includes(`workitem:feature:${FREMDPROJEKT_ID}`)) {
          befunde.push(`(a) Grünfall: auftragstext trägt nicht die Referenzzeile 'workitem:feature:${FREMDPROJEKT_ID}', erhalten ${JSON.stringify(daten.auftragstext)}`)
        }
      }
      if (befunde.length === befundeVor) {
        console.log('✓ (a) Grünfall: 3 AKs (2 Positions-IDs, 1 explizite ID) korrekt persistiert, nicht_ziele/workitem-Zeile/herkunft feature_akte real geschrieben.')
      }
    }

    // (b) Akte ohne AK → 422
    {
      const antwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent(`${FREMDPROJEKT_ID}B`)}/auftrag`, { method: 'POST' })
      if (antwort.status !== 422) {
        befunde.push(`(b) Akte ohne AK: erwartet 422, erhalten ${antwort.status} (${JSON.stringify(await antwort.json().catch(() => ({})))})`)
      } else {
        console.log('✓ (b) Akte ohne AK → 422.')
      }
    }

    // (b2) Akte mit AK-ID-Kollision (explizit vs. Position) → 422, kein Auftrag mit Duplikat-IDs
    {
      const antwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent(`${FREMDPROJEKT_ID}C`)}/auftrag`, { method: 'POST' })
      const inhalt = await antwort.json().catch(() => ({}))
      if (antwort.status !== 422 || !inhalt.grund?.includes('AK2')) {
        befunde.push(`(b2) Akte mit AK-ID-Kollision: erwartet 422 mit 'AK2' im Grund, erhalten ${antwort.status} (${JSON.stringify(inhalt)})`)
      } else {
        console.log('✓ (b2) Akte mit AK-ID-Kollision (explizit vs. Position) → 422, kein Auftrag mit Duplikat-IDs.')
      }
    }

    // (b3) Akte mit Status ABGESCHLOSSEN → 422, serverseitig durchgesetzt (nicht nur Workboard-UI)
    {
      const antwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent(`${FREMDPROJEKT_ID}D`)}/auftrag`, { method: 'POST' })
      const inhalt = await antwort.json().catch(() => ({}))
      if (antwort.status !== 422 || !inhalt.grund?.includes('ABGESCHLOSSEN')) {
        befunde.push(`(b3) Akte mit Status ABGESCHLOSSEN: erwartet 422 mit 'ABGESCHLOSSEN' im Grund, erhalten ${antwort.status} (${JSON.stringify(inhalt)})`)
      } else {
        console.log('✓ (b3) Akte mit Status ABGESCHLOSSEN → 422, serverseitig durchgesetzt.')
      }
    }

    // (c) featureId '../x' → 400 (encodeURIComponent belässt '..', kodiert nur '/')
    {
      const antwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent('../x')}/auftrag`, { method: 'POST' })
      if (antwort.status !== 400) {
        befunde.push(`(c) featureId '../x': erwartet 400, erhalten ${antwort.status} (${JSON.stringify(await antwort.json().catch(() => ({})))})`)
      } else {
        console.log("✓ (c) featureId '../x' → 400.")
      }
    }

    // (d) fehlende Akte → 404
    {
      const antwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent('F999')}/auftrag`, { method: 'POST' })
      if (antwort.status !== 404) {
        befunde.push(`(d) fehlende Akte: erwartet 404, erhalten ${antwort.status} (${JSON.stringify(await antwort.json().catch(() => ({})))})`)
      } else {
        console.log('✓ (d) fehlende Akte → 404.')
      }
    }

    // (e) POST /api/auftraege mit akzeptanzkriterien im Body → 400 (AK2: Formular bleibt zu)
    {
      const antwort = await fetch(`${basisUrl}/api/auftraege`, {
        method: 'POST',
        body: JSON.stringify({ titel: 'Gate', auftragstext: 'Text.', akzeptanzkriterien: [{ id: 'AK1', text: 'Text.' }] }),
      })
      if (antwort.status !== 400) {
        befunde.push(`(e) POST /api/auftraege mit akzeptanzkriterien: erwartet 400, erhalten ${antwort.status} (${JSON.stringify(await antwort.json().catch(() => ({})))})`)
      } else {
        console.log('✓ (e) POST /api/auftraege mit akzeptanzkriterien im Body → 400 (unbekanntes Feld).')
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(fremdprojekt)
  }
}

// ─── (f) AK5: Kontrolltiefe-Untergrenze real über verarbeiteRouterErgebnis ─────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f35-f-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  try {
    const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
    const auftragId = `f35-untergrenze-${randomUUID()}`
    const laufId = `router-${auftragId}-${Date.now()}`
    const rohstromPfad = join(basisVerzeichnis, 'rohstrom.json')
    mkdirSync(basisVerzeichnis, { recursive: true })
    const klassifikation = { kontrolltiefe: 'fast-lane', risikoklasse: 'niedrig', task_typen: ['neues-feature'], rueckfragen: [], begruendung: 'Gate-Fixture.' }
    const stdout = `${JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(klassifikation) } })}\n`
    writeFileSync(rohstromPfad, JSON.stringify({ stdout }), 'utf8')
    const laufakte = { worker: 'codex', rohstrom_referenz: { pfad: rohstromPfad } }
    const auftragVersion = { daten: { titel: 'Gate-Auftrag F35 Untergrenze', herkunft: { art: 'feature_akte' } }, inhaltsHash: 'd'.repeat(64) }
    const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }

    const befundeVor = befunde.length
    const ergebnis = verarbeiteRouterErgebnis(laufakte, auftragId, laufId, auftragVersion, INSTALL_WURZEL, profilReferenz, ladeOptionen, INSTALL_WURZEL)
    if (!ergebnis.ok) {
      befunde.push(`(f) verarbeiteRouterErgebnis erwartet ok:true, erhalten ok:false (${ergebnis.grund})`)
    } else {
      const workflowArtefakt = ladeArtefaktVersion(`workflow-${ergebnis.workflowId}`, undefined, ladeOptionen)
      const rollen = (workflowArtefakt?.daten?.schritte ?? []).map((s) => s.rolle)
      if (!rollen.includes('code-reviewer') || rollen.includes('architekt')) {
        befunde.push(`(f) klassifiziert als 'fast-lane' + herkunft 'feature_akte' sollte die 'standard'-Vorlage wählen (Schritt 'code-reviewer', kein 'architekt'), erhalten Rollen ${JSON.stringify(rollen)}`)
      }
      if (!workflowArtefakt?.daten?.ziel?.includes('Untergrenze standard wegen herkunft feature_akte')) {
        befunde.push(`(f) ziel sollte die Anhebung vermerken ('Untergrenze standard wegen herkunft feature_akte'), erhalten ${JSON.stringify(workflowArtefakt?.daten?.ziel)}`)
      }
    }
    if (befunde.length === befundeVor) {
      console.log("✓ (f) AK5: herkunft 'feature_akte' + Klassifikation 'fast-lane' wählt real 'standard' (nie 'fast-lane'), Anhebung im Workflow-Ziel vermerkt.")
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
