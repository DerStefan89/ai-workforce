#!/usr/bin/env node
/**
 * Datei: scripts/check-f35-ws3-adjust-automatik.mjs
 *
 * Zweck: Gate für F35 WS-3 (features/F35/feature.md, "ADJUST-Automatik").
 * Nachweis am REALEN Aufrufpfad (Muster scripts/check-f35-ws2-urteil-je-ak.mjs,
 * scripts/check-f659-review-korrektur-begruendung.mjs): ein Wegwerf-
 * "Fremdprojekt" trägt NUR features/<id>/feature.md; ein echter HTTP-
 * Testserver, ein echter zweistufiger Workflow (ausfuehrung ZWINGEND ->
 * code-reviewer AUTOMATISCH — ZWINGEND statt des sonst in Gate-Fixtures
 * üblichen AUTOMATISCH, weil AK4/das Grenzverhalten genau von diesem
 * Produktions-Verhalten abhängt, workflow-vorlagen/standard.json), der
 * Worker ist gestubbt (fuehreAufgabeDurchFn), aber jede Reviewer-Laufakte
 * wird REAL registriert — der Automat (ermittleNaechstenSchritt, Regel
 * 1b/1i, der neue Automaten-Hook in starteWorkflowSchritt) liest
 * Urteil/ak_urteile also am tatsächlichen Lese-/Prüfpfad, nicht an einem
 * Mock davon.
 *
 * Prüft:
 * (a) Reviewer-Stub liefert urteil BLOCKIERT mit 1 Befund (beide AK sonst
 *     ERFUELLT) → ein Abnahme-Artefakt ANPASSUNG_ANGEFORDERT mit
 *     Lineage-erzeuger 'kern' entsteht, bezug.review_lauf_id zeigt auf den
 *     Review-Lauf, schritt-1-ausfuehrung ist OFFEN/lauf_id null, der
 *     Workflow steht auf WARTET_FREIGABE (ZWINGEND) — KEIN zweiter
 *     ausfuehrung-Lauf wurde gestartet. GET .../abnahme liefert additiv
 *     erzeuger 'kern' und automatische_iteration 1.
 * (b) Erst NACH einer echten POST .../freigabe wird die nächste ausfuehrung
 *     gestartet; ihr Auftragstext trägt die automatische Begründung UND
 *     den Befund (F-648, unverändert).
 * (c) Zweite Iteration: urteil BEREIT, aber ein ak_urteil NICHT_ERFUELLT →
 *     ebenfalls automatische Anpassung, die Begründung nennt die AK-ID.
 * (d) Grenze: nach 3 automatischen Anpassungen führt ein 4. BLOCKIERT zu
 *     KLAERUNG_ERFORDERLICH OHNE ein 4. Abnahme-Artefakt.
 * (e) Reviewer-Stub liefert ein Urteil außerhalb der drei bekannten Werte
 *     (aber vollständige ERFUELLT-ak_urteile, damit NUR Regel 1b geprüft
 *     wird) → KLAERUNG_ERFORDERLICH, KEINE automatische Anpassung.
 * (f) Der menschliche POST .../abnahme mit ANPASSUNG_ANGEFORDERT
 *     funktioniert unverändert, Artefakt trägt erzeuger 'mensch'.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f35-ws3-adjust-automatik.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ladeArtefaktVersion, listeVersionen, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F35-WS3-Adjust-Automatik-Check ===\n')

/** @returns { basisUrl, schliessen } eines echten HTTP-Testservers (Muster check-f659/check-f35-ws2). */
async function starteTestserver(optionen) {
  const server = createServer(erzeugeRequestHandler(optionen))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return {
    basisUrl: `http://127.0.0.1:${port}`,
    schliessen: () => new Promise((resolve) => server.close(resolve)),
  }
}

function verzoegerung(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Pollt bis pruefen() true liefert oder die Zeit abläuft (Muster check-f659/check-f35-ws2). @returns der letzte Rückgabewert von pruefen() */
async function warteBis(pruefen, maxWartezeitMs) {
  const start = Date.now()
  let wert = await pruefen()
  while (!wert && Date.now() - start < maxWartezeitMs) {
    await verzoegerung(50)
    wert = await pruefen()
  }
  return wert
}

const INSTALL_WURZEL = process.cwd()
const FEATURE_ID = 'F9993'
const AKTE_MIT_2_AK = `# ${FEATURE_ID} — Gate-Feature WS-3

## Ziel
Ziel des Gate-Features WS-3.

## Nicht-Ziele
- Ein Nicht-Ziel, das der Review NIE als eigenen Befund übergehen darf.

## Akzeptanzkriterien
- Erstes Kriterium.
- Zweites Kriterium.
`

function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

/** Wegwerf-"Fremdprojekt" (NUR features/, keine Workforce-Assets), Git-Repo NICHT auf main/master (Muster check-f35-ws2 baueFremdprojekt). */
function baueFremdprojekt(featureAkten) {
  const fremdprojekt = mkdtempSync(join(tmpdir(), 'check-f35-ws3-fremdprojekt-'))
  git(fremdprojekt, ['init', '--quiet'])
  git(fremdprojekt, ['config', 'user.email', 'test@example.invalid'])
  git(fremdprojekt, ['config', 'user.name', 'Test'])
  git(fremdprojekt, ['branch', '-m', 'wegwerf-branch'])
  for (const [featureId, inhalt] of Object.entries(featureAkten)) {
    const ordner = join(fremdprojekt, 'features', featureId)
    mkdirSync(ordner, { recursive: true })
    writeFileSync(join(ordner, 'feature.md'), inhalt, 'utf8')
  }
  git(fremdprojekt, ['add', '.'])
  git(fremdprojekt, ['commit', '--quiet', '-m', 'init'])
  return fremdprojekt
}

// Codex braucht einen resolvierbaren (nicht notwendig existierenden) Startziel-Pfad (Muster check-f659/check-f35-ws2).
const CODEX_BLOCK = { codex: { startziel: [String.raw`C:\f35ws3-gate-dummy\codex.exe`], versionDeklariert: 'codex-cli-gate-fixture', sandbox: 'read-only' } }

function schreibeStartvorlage(verzeichnis) {
  const basis = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const pfad = join(verzeichnis, `startvorlage-${randomUUID()}.json`)
  writeFileSync(pfad, JSON.stringify({ ...basis, worker: CODEX_BLOCK }, null, 2))
  return pfad
}

/**
 * Zweistufiger Workflow (ausfuehrung -> review) — ANDERS als check-f659/check-f35-ws2:
 * schritt-1-ausfuehrung trägt freigabe 'ZWINGEND' (Muster workflow-vorlagen/standard.json), nicht
 * 'AUTOMATISCH', weil AK4/die Grenze GENAU von diesem Produktions-Verhalten abhängt (Kopfkommentar).
 */
function baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId) {
  const workflowId = `f35-ws3-gate-${randomUUID()}`
  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'F35-WS3-Gate-Fixture.',
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1-ausfuehrung',
      grenzen: { max_schritte: 20, max_replans: 5 },
      schritte: [
        {
          schritt_id: 'schritt-1-ausfuehrung',
          rolle: 'ausfuehrung',
          werkzeugsatz: 'schreibend',
          worker: 'claude-code',
          modell: 'claude-sonnet-5',
          eingaben: [],
          output_schema: null,
          freigabe: 'ZWINGEND',
          risiko: 'Gate-Fixture, kein reales Risiko.',
          zeitgrenze_ms: 600000,
          nachfolger: 'schritt-2-review',
          status: 'OFFEN',
          lauf_id: null,
        },
        {
          schritt_id: 'schritt-2-review',
          rolle: 'code-reviewer',
          werkzeugsatz: 'lesend',
          worker: 'codex',
          modell: 'gpt-6-astra',
          eingaben: [],
          output_schema: 'ergebnis-code-reviewer',
          freigabe: 'AUTOMATISCH',
          risiko: 'Gate-Fixture, kein reales Risiko.',
          zeitgrenze_ms: 600000,
          nachfolger: null,
          status: 'OFFEN',
          lauf_id: null,
        },
      ],
    },
    leiteProfilReferenzAb(vorlage),
    { basisVerzeichnis, schreiber: () => {} }
  )
  return workflowId
}

function ladeWorkflow(workflowId, basisVerzeichnis) {
  return ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: () => {} })?.daten ?? null
}

function listeAbnahmeVersionen(workflowId, basisVerzeichnis) {
  return listeVersionen(`entscheidung-workflow-${workflowId}-abnahme`, { basisVerzeichnis, schreiber: () => {} })
}

/**
 * Fire-and-forget-Attrappe (Muster check-f35-ws2 baueAttrappe): fängt eingaben.auftragstext je
 * laufId ab (JEDE Rolle, nicht nur code-reviewer — Fall (b) braucht den Auftragstext der
 * ausfuehrung-Läufe). Bei rolle 'code-reviewer' registriert sie zusätzlich real eine
 * 'laufakte-<laufId>' mit dem Inhalt von reviewErgebnisRef.aktuell und merkt sich die Review-laufId;
 * bei rolle 'ausfuehrung' merkt sie sich die laufId zusätzlich in ausfuehrungLaufIds (Fall (a):
 * "kein zweiter ausfuehrung-Lauf wurde automatisch gestartet").
 */
function baueAttrappe(basisVerzeichnis, profilReferenz, auftragstexte, reviewErgebnisRef, ausfuehrungLaufIds, reviewLaufIds) {
  return async (laufId, _profilReferenz, eingaben) => {
    auftragstexte.set(laufId, eingaben.auftragstext ?? null)
    if (eingaben.rolle === 'ausfuehrung') {
      ausfuehrungLaufIds.add(laufId)
    }
    if (eingaben.rolle === 'code-reviewer') {
      reviewLaufIds.push(laufId)
      mkdirSync(basisVerzeichnis, { recursive: true })
      const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
      writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: reviewErgebnisRef.aktuell }) }), 'utf8')
      registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f35-ws3-fake' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, undefined, {
        basisVerzeichnis,
        schreiber: () => {},
      })
    }
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
}

const AK_BEIDE_ERFUELLT = [
  { ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'src/beispiel.ts:1' },
  { ak_id: 'AK2', urteil: 'ERFUELLT', beleg: 'src/beispiel.ts:2' },
]
const EIN_BEFUND = { schwere: 'HOCH', fundstelle: 'src/beispiel.ts:9', zusammenfassung: 'Gate-Fixture-Befund F35-WS3 — muss in der Begründung/dem nächsten Auftragstext auftauchen.', beleg: 'Synthetischer Beleg, Gate-Fixture.' }

{
  const basisVerzeichnis = `kontrollzustand-test-f35-ws3-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const fremdprojekt = baueFremdprojekt({ [FEATURE_ID]: AKTE_MIT_2_AK })
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f35-ws3-gate-'))
  const startvorlagePfad = schreibeStartvorlage(verzeichnis)
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const profilReferenz = leiteProfilReferenzAb(vorlage)
  const auftragstexte = new Map()
  const ausfuehrungLaufIds = new Set()
  const reviewLaufIds = []
  const reviewErgebnisRef = { aktuell: null }
  const { basisUrl, schliessen } = await starteTestserver({
    basisVerzeichnis,
    fuehreAufgabeDurchFn: baueAttrappe(basisVerzeichnis, profilReferenz, auftragstexte, reviewErgebnisRef, ausfuehrungLaufIds, reviewLaufIds),
    repoWurzel: fremdprojekt,
    installWurzel: INSTALL_WURZEL,
    startvorlagePfad,
  })

  /** Legt einen frischen Auftrag+Workflow an, gibt schritt-1-ausfuehrung sofort frei (ZWINGEND) und wartet auf einen Endzustand. @returns { workflowId, daten } oder null bei Vorbedingungsfehler (dann bereits in befunde eingetragen) */
  async function starteFrischenWorkflow(bezeichnung, reviewErgebnis) {
    reviewErgebnisRef.aktuell = reviewErgebnis
    const auftragAntwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent(FEATURE_ID)}/auftrag`, { method: 'POST' })
    const auftragKoerper = await auftragAntwort.json().catch(() => ({}))
    if (auftragAntwort.status !== 201 || typeof auftragKoerper.auftragId !== 'string') {
      befunde.push(`${bezeichnung}: Vorbedingung POST .../auftrag erwartet 201, erhalten ${auftragAntwort.status} ${JSON.stringify(auftragKoerper)}`)
      return null
    }
    const workflowId = baueWorkflowFixture(basisVerzeichnis, vorlage, auftragKoerper.auftragId)
    return fuehreZyklusDurch(bezeichnung, workflowId, 'Gate: initiale Freigabe.')
  }

  /** Gibt schritt-1-ausfuehrung frei (FREIGEGEBEN) und wartet, bis der Workflow einen Endzustand erreicht (nicht mehr LAEUFT/OFFEN). @returns { workflowId, daten } oder null bei Vorbedingungsfehler */
  async function fuehreZyklusDurch(bezeichnung, workflowId, begruendung) {
    const freigabe = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, {
      method: 'POST',
      body: JSON.stringify({ schrittId: 'schritt-1-ausfuehrung', entscheidung: 'FREIGEGEBEN', begruendung }),
    })
    if (freigabe.status !== 202 && freigabe.status !== 200) {
      befunde.push(`${bezeichnung}: Vorbedingung POST .../freigabe erwartet 200/202, erhalten ${freigabe.status} (${await freigabe.text()})`)
      return null
    }
    const daten = await warteBis(() => {
      const aktuell = ladeWorkflow(workflowId, basisVerzeichnis)
      return aktuell !== null && aktuell.status !== 'LAEUFT' && aktuell.status !== 'OFFEN' ? aktuell : null
    }, 3000)
    if (daten === null) {
      befunde.push(`${bezeichnung}: Workflow '${workflowId}' hat innerhalb der Wartezeit keinen Endzustand erreicht`)
      return null
    }
    return { workflowId, daten }
  }

  try {
    // ── (a)+(b) BLOCKIERT mit 1 Befund → automatische Anpassung (erzeuger 'kern'), erst nach ──
    // ── echter Freigabe startet die nächste ausfuehrung, mit Begründung+Befund im Auftragstext ──
    let workflowIdAb = null
    {
      const ergebnis = await starteFrischenWorkflow('(a)', JSON.stringify({ urteil: 'BLOCKIERT', befunde: [EIN_BEFUND], empfehlung: 'Bitte beheben.', ak_urteile: AK_BEIDE_ERFUELLT }))
      if (ergebnis !== null) {
        const { workflowId, daten } = ergebnis
        workflowIdAb = workflowId
        // reviewLaufIds (Attrappe, beim START jedes Review-Laufs gefüllt) statt
        // daten.schritte[1].lauf_id: die automatische Anpassung hat den Review-Schritt im selben
        // synchronen Rückruf bereits wieder auf lauf_id null zurückgesetzt (Muster check-f659-Fix).
        const reviewLaufId = reviewLaufIds[0] ?? null
        const ausfuehrungVorDerFreigabe = new Set(ausfuehrungLaufIds)
        const abnahmeVersionen = listeAbnahmeVersionen(workflowId, basisVerzeichnis)
        const letzteAbnahme = abnahmeVersionen.at(-1) ?? null
        if (
          daten.status !== 'WARTET_FREIGABE' ||
          daten.schritte?.[0]?.status !== 'OFFEN' ||
          daten.schritte?.[0]?.lauf_id !== null ||
          letzteAbnahme === null ||
          letzteAbnahme.daten.ergebnis !== 'ANPASSUNG_ANGEFORDERT' ||
          letzteAbnahme.herkunft?.erzeuger !== 'kern' ||
          letzteAbnahme.daten.bezug?.review_lauf_id !== reviewLaufId
        ) {
          befunde.push(
            `(a) BLOCKIERT mit 1 Befund: erwartet WARTET_FREIGABE, schritt-1-ausfuehrung OFFEN/lauf_id null, ein Abnahme-Artefakt ANPASSUNG_ANGEFORDERT mit erzeuger 'kern' und bezug.review_lauf_id === '${reviewLaufId}' — erhalten status ${JSON.stringify(daten.status)}, schritt1 ${JSON.stringify(daten.schritte?.[0])}, letzteAbnahme ${JSON.stringify(letzteAbnahme)}`
          )
        } else {
          console.log("✓ (a) Reviewer BLOCKIERT mit 1 Befund: automatische Anpassung (erzeuger 'kern') entsteht, schritt-1-ausfuehrung ist zurückgesetzt, der Workflow wartet (ZWINGEND) auf Freigabe.")
        }

        // GET .../abnahme trägt additiv erzeuger/automatische_iteration (Bauauftrag Punkt 4).
        const abnahmeProjektion = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`)).json().catch(() => ({}))
        if (abnahmeProjektion.entscheidung?.erzeuger !== 'kern' || abnahmeProjektion.entscheidung?.automatische_iteration !== 1) {
          befunde.push(`(a) GET .../abnahme sollte entscheidung.erzeuger 'kern' und automatische_iteration 1 liefern, erhalten ${JSON.stringify(abnahmeProjektion.entscheidung)}`)
        } else {
          console.log("✓ (a) GET .../abnahme liefert additiv erzeuger 'kern' und automatische_iteration 1.")
        }

        // (b)+(c) laufen auf DERSELBEN zweiten Iteration: das Review-Ergebnis wird VOR der
        // Freigabe auf 'BEREIT, aber AK2 NICHT_ERFUELLT' gesetzt (statt erneut BLOCKIERT — ein
        // zweites BLOCKIERT verbrauchte sonst versehentlich eine zusätzliche automatische
        // Anpassung, bevor (d) unten die Grenze prüfen kann). (b) prüft den Auftragstext der neu
        // gestarteten ausfuehrung (F-648, unabhängig vom Ausgang IHRES Reviews), (c) prüft, dass
        // AK2 NICHT_ERFUELLT bei Gesamturteil BEREIT ebenfalls automatisch anpasst.
        reviewErgebnisRef.aktuell = JSON.stringify({
          urteil: 'BEREIT',
          befunde: [],
          empfehlung: 'Alles gut bis auf AK2.',
          ak_urteile: [{ ak_id: 'AK1', urteil: 'ERFUELLT', beleg: 'src/beispiel.ts:1' }, { ak_id: 'AK2', urteil: 'NICHT_ERFUELLT', beleg: 'Verhalten weicht ab.' }],
        })
        const zweiterZyklus = await fuehreZyklusDurch('(b)+(c)', workflowId, 'Gate: zweite Freigabe nach automatischer Anpassung.')
        const neueAusfuehrungLaufId = [...ausfuehrungLaufIds].find((id) => !ausfuehrungVorDerFreigabe.has(id))
        if (neueAusfuehrungLaufId === undefined) {
          befunde.push('(b) nach der Freigabe sollte eine NEUE ausfuehrung-laufId entstehen, aber keine wurde gefunden')
        } else {
          const zweiterAuftragstext = auftragstexte.get(neueAusfuehrungLaufId) ?? ''
          const traegtBegruendung = zweiterAuftragstext.includes('Automatische Anpassung (Iteration 1 von max. 3)')
          const traegtBefund = zweiterAuftragstext.includes(EIN_BEFUND.zusammenfassung)
          if (!traegtBegruendung || !traegtBefund) {
            befunde.push(`(b) der Auftragstext der neuen ausfuehrung sollte die automatische Begründung UND den Befund tragen — Begründung: ${traegtBegruendung}, Befund: ${traegtBefund}. Auftragstext: ${JSON.stringify(zweiterAuftragstext)}`)
          } else {
            console.log('✓ (b) Erst nach der echten Freigabe startet die nächste ausfuehrung; ihr Auftragstext trägt die automatische Begründung und den Befund (F-648 greift unverändert).')
          }
        }
        if (zweiterZyklus === null) {
          befunde.push('(b)/(c)/(d) Vorbedingung: der zweite Zyklus (nach Freigabe) hat keinen Endzustand erreicht — nachfolgende Prüfungen übersprungen')
        } else {
          {
            const abnahmeVersionenC = listeAbnahmeVersionen(workflowId, basisVerzeichnis)
            const letzteAbnahmeC = abnahmeVersionenC.at(-1) ?? null
            if (
              zweiterZyklus.daten.status !== 'WARTET_FREIGABE' ||
              letzteAbnahmeC === null ||
              letzteAbnahmeC.herkunft?.erzeuger !== 'kern' ||
              !letzteAbnahmeC.daten.begruendung?.includes('AK2')
            ) {
              befunde.push(`(c) AK2 NICHT_ERFUELLT bei Gesamturteil BEREIT sollte ebenfalls automatisch anpassen, Begründung sollte 'AK2' nennen — erhalten status ${JSON.stringify(zweiterZyklus.daten.status)}, letzteAbnahme ${JSON.stringify(letzteAbnahmeC)}`)
            } else {
              console.log("✓ (c) Urteil BEREIT, aber AK2 NICHT_ERFUELLT: ebenfalls automatische Anpassung (erzeuger 'kern'), die Begründung nennt 'AK2'.")
            }
          }

          // ── (d) Grenze: die 3. automatische Anpassung ist noch erlaubt, die 4. NICHT mehr ────
          // Bisherige kern-Versionen an dieser Stelle: 2 (kern#1 aus (a), kern#2 aus (c)) —
          // dieser Zyklus ist die 3., noch erlaubte automatische Anpassung.
          reviewErgebnisRef.aktuell = JSON.stringify({ urteil: 'BLOCKIERT', befunde: [], empfehlung: 'Weiterhin blockiert.', ak_urteile: AK_BEIDE_ERFUELLT })
          const viertZyklus = await fuehreZyklusDurch('(d)-3', workflowId, 'Gate: dritte Freigabe (3. automatische Anpassung erwartet).')
          if (viertZyklus === null) {
            befunde.push('(d) Vorbedingung: der dritte Zyklus (3. automatische Anpassung) hat keinen Endzustand erreicht')
          } else {
            const nach3 = listeAbnahmeVersionen(workflowId, basisVerzeichnis)
            const kernAnzahlNach3 = nach3.filter((v) => v.herkunft?.erzeuger === 'kern').length
            if (viertZyklus.daten.status !== 'WARTET_FREIGABE' || kernAnzahlNach3 !== 3) {
              befunde.push(`(d) die 3. automatische Anpassung sollte noch entstehen (WARTET_FREIGABE, 3 kern-Versionen) — erhalten status ${JSON.stringify(viertZyklus.daten.status)}, kernAnzahl ${kernAnzahlNach3}`)
            } else {
              const fuenfterZyklus = await fuehreZyklusDurch('(d)-4', workflowId, 'Gate: fünfte Freigabe (Grenze erreicht, 4. BLOCKIERT erwartet KLAERUNG_ERFORDERLICH).')
              if (fuenfterZyklus === null) {
                befunde.push('(d) Vorbedingung: der fünfte Zyklus (4. BLOCKIERT, Grenze) hat keinen Endzustand erreicht')
              } else {
                const nach4 = listeAbnahmeVersionen(workflowId, basisVerzeichnis)
                const kernAnzahlNach4 = nach4.filter((v) => v.herkunft?.erzeuger === 'kern').length
                if (fuenfterZyklus.daten.status !== 'KLAERUNG_ERFORDERLICH' || kernAnzahlNach4 !== 3) {
                  befunde.push(`(d) ein 4. BLOCKIERT nach 3 automatischen Anpassungen sollte KLAERUNG_ERFORDERLICH ergeben, OHNE ein 4. Abnahme-Artefakt (weiterhin 3 kern-Versionen) — erhalten status ${JSON.stringify(fuenfterZyklus.daten.status)}, kernAnzahl ${kernAnzahlNach4}`)
                } else {
                  console.log('✓ (d) Grenze: nach 3 automatischen Anpassungen führt ein 4. BLOCKIERT zu KLAERUNG_ERFORDERLICH, ohne ein 4. Abnahme-Artefakt.')
                }
              }
            }
          }
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(fremdprojekt)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ── (e) Urteil außerhalb der drei bekannten Werte, aber vollständige ERFUELLT-ak_urteile ────────
// ── (NUR Regel 1b greift, keine AK-Verstöße — sonst würde die AK-Prüfung selbst schon auslösen) ──
{
  const basisVerzeichnis = `kontrollzustand-test-f35-ws3-e-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const fremdprojekt = baueFremdprojekt({ [FEATURE_ID]: AKTE_MIT_2_AK })
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f35-ws3-gate-e-'))
  const startvorlagePfad = schreibeStartvorlage(verzeichnis)
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const profilReferenz = leiteProfilReferenzAb(vorlage)
  const auftragstexte = new Map()
  const ausfuehrungLaufIds = new Set()
  const reviewLaufIds = []
  const reviewErgebnisRef = { aktuell: JSON.stringify({ urteil: 'UNKLAR', befunde: [], empfehlung: 'Kein klares Urteil.', ak_urteile: AK_BEIDE_ERFUELLT }) }
  const { basisUrl, schliessen } = await starteTestserver({
    basisVerzeichnis,
    fuehreAufgabeDurchFn: baueAttrappe(basisVerzeichnis, profilReferenz, auftragstexte, reviewErgebnisRef, ausfuehrungLaufIds, reviewLaufIds),
    repoWurzel: fremdprojekt,
    installWurzel: INSTALL_WURZEL,
    startvorlagePfad,
  })
  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent(FEATURE_ID)}/auftrag`, { method: 'POST' })
    const { auftragId } = await auftragAntwort.json().catch(() => ({}))
    if (typeof auftragId !== 'string') {
      befunde.push(`(e) Vorbedingung POST .../auftrag lieferte keine auftragId, Status ${auftragAntwort.status}`)
    } else {
      const workflowId = baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId)
      const freigabe = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, {
        method: 'POST',
        body: JSON.stringify({ schrittId: 'schritt-1-ausfuehrung', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate (e): initiale Freigabe.' }),
      })
      if (freigabe.status !== 202 && freigabe.status !== 200) {
        befunde.push(`(e) Vorbedingung POST .../freigabe erwartet 200/202, erhalten ${freigabe.status} (${await freigabe.text()})`)
      } else {
        const daten = await warteBis(() => {
          const aktuell = ladeWorkflow(workflowId, basisVerzeichnis)
          return aktuell !== null && aktuell.status !== 'LAEUFT' && aktuell.status !== 'OFFEN' ? aktuell : null
        }, 3000)
        const abnahmeVersionen = listeAbnahmeVersionen(workflowId, basisVerzeichnis)
        if (daten === null) {
          befunde.push(`(e) Workflow '${workflowId}' hat innerhalb der Wartezeit keinen Endzustand erreicht`)
        } else if (daten.status !== 'KLAERUNG_ERFORDERLICH' || abnahmeVersionen.length !== 0) {
          befunde.push(`(e) ein Urteil außerhalb der bekannten Werte sollte KLAERUNG_ERFORDERLICH ergeben, OHNE Abnahme-Artefakt — erhalten status ${JSON.stringify(daten.status)}, Abnahme-Versionen ${abnahmeVersionen.length}`)
        } else {
          console.log("✓ (e) Reviewer-Stub ohne gültiges Urteil ('UNKLAR'): KLAERUNG_ERFORDERLICH, keine automatische Anpassung.")
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(fremdprojekt)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ── (f) Der menschliche POST .../abnahme (ANPASSUNG_ANGEFORDERT) funktioniert unverändert ──────
{
  const basisVerzeichnis = `kontrollzustand-test-f35-ws3-f-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const fremdprojekt = baueFremdprojekt({ [FEATURE_ID]: AKTE_MIT_2_AK })
  const verzeichnis = mkdtempSync(join(tmpdir(), 'f35-ws3-gate-f-'))
  const startvorlagePfad = schreibeStartvorlage(verzeichnis)
  const vorlage = ladeStartvorlage(startvorlagePfad)
  const profilReferenz = leiteProfilReferenzAb(vorlage)
  const auftragstexte = new Map()
  const ausfuehrungLaufIds = new Set()
  const reviewLaufIds = []
  // BEREIT mit beiden AK ERFUELLT: der Automat löst NICHTS aus (kein BLOCKIERT, keine
  // AK-Verstöße) — der Workflow schließt regulär ab (ABGESCHLOSSEN), und genau DORT ist der
  // menschliche POST .../abnahme mit ANPASSUNG_ANGEFORDERT zulässig (Sachprüfung (4) des Handlers).
  const reviewErgebnisRef = { aktuell: JSON.stringify({ urteil: 'BEREIT', befunde: [], empfehlung: 'Alles gut.', ak_urteile: AK_BEIDE_ERFUELLT }) }
  const { basisUrl, schliessen } = await starteTestserver({
    basisVerzeichnis,
    fuehreAufgabeDurchFn: baueAttrappe(basisVerzeichnis, profilReferenz, auftragstexte, reviewErgebnisRef, ausfuehrungLaufIds, reviewLaufIds),
    repoWurzel: fremdprojekt,
    installWurzel: INSTALL_WURZEL,
    startvorlagePfad,
  })
  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/features/${encodeURIComponent(FEATURE_ID)}/auftrag`, { method: 'POST' })
    const { auftragId } = await auftragAntwort.json().catch(() => ({}))
    if (typeof auftragId !== 'string') {
      befunde.push(`(f) Vorbedingung POST .../auftrag lieferte keine auftragId, Status ${auftragAntwort.status}`)
    } else {
      const workflowId = baueWorkflowFixture(basisVerzeichnis, vorlage, auftragId)
      const freigabe = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/freigabe`, {
        method: 'POST',
        body: JSON.stringify({ schrittId: 'schritt-1-ausfuehrung', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate (f): initiale Freigabe.' }),
      })
      if (freigabe.status !== 202 && freigabe.status !== 200) {
        befunde.push(`(f) Vorbedingung POST .../freigabe erwartet 200/202, erhalten ${freigabe.status} (${await freigabe.text()})`)
      } else {
        const daten = await warteBis(() => {
          const aktuell = ladeWorkflow(workflowId, basisVerzeichnis)
          return aktuell !== null && aktuell.status !== 'LAEUFT' && aktuell.status !== 'OFFEN' ? aktuell : null
        }, 3000)
        if (daten === null || daten.status !== 'ABGESCHLOSSEN') {
          befunde.push(`(f) Vorbedingung: der Workflow sollte ABGESCHLOSSEN erreichen (kein Auslöser bei BEREIT+beide AK ERFUELLT), erhalten ${JSON.stringify({ status: daten?.status, grund: daten?.grund })}`)
        } else {
          const MENSCHLICHE_BEGRUENDUNG = 'F35-WS3-Gate (f): menschliche Anpassung nach ABGESCHLOSSEN, unverändertes Verhalten.'
          const adjust = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/abnahme`, {
            method: 'POST',
            body: JSON.stringify({ ergebnis: 'ANPASSUNG_ANGEFORDERT', begruendung: MENSCHLICHE_BEGRUENDUNG }),
          })
          const adjustKoerper = await adjust.json().catch(() => ({}))
          const abnahmeVersionen = listeAbnahmeVersionen(workflowId, basisVerzeichnis)
          const letzteAbnahme = abnahmeVersionen.at(-1) ?? null
          if (adjust.status !== 200 || letzteAbnahme === null || letzteAbnahme.herkunft?.erzeuger !== 'mensch' || letzteAbnahme.daten.begruendung !== MENSCHLICHE_BEGRUENDUNG) {
            befunde.push(`(f) der menschliche POST .../abnahme (ANPASSUNG_ANGEFORDERT) sollte 200 liefern und ein Artefakt mit erzeuger 'mensch' schreiben — erhalten ${adjust.status} ${JSON.stringify(adjustKoerper)}, letzteAbnahme ${JSON.stringify(letzteAbnahme)}`)
          } else {
            console.log("✓ (f) Der menschliche POST .../abnahme (ANPASSUNG_ANGEFORDERT) funktioniert unverändert, das Artefakt trägt erzeuger 'mensch'.")
          }
        }
      }
    }
  } finally {
    await schliessen()
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(fremdprojekt)
    raeumeVerzeichnis(verzeichnis)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exit(0)
}

console.log(`✗ ${befunde.length} Befund(e):\n`)
for (const b of befunde) console.log(`  - ${b}`)
console.log('')
process.exit(1)
