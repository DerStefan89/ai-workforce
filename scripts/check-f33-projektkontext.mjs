/**
 * Datei: scripts/check-f33-projektkontext.mjs
 *
 * Zweck: Gate für F33 WS-1 (Projektkontext & Roadmap — Repo-Dateien +
 * Einspeisung über den Context Builder). Prüft:
 * (a) die drei Repo-Dateien existieren real (docs/projekt/kontext/
 *     beschreibung.md, docs/projekt/kontext/anweisungen.md,
 *     docs/projekt/roadmap.json) und sind nicht leer;
 * (b) Grün-Fall: die reale docs/projekt/roadmap.json ist über ladeRoadmap
 *     ladbar und gültig (kein zweiter Lesepfad neben validiereRoadmapDaten,
 *     D5 — Muster ladeProjektregister);
 * (c) Rot-Fälle: ein invalides roadmap.json (unbekanntes Feld, falscher
 *     status, doppelte Meilenstein-id, falsches roadmap_schema) wird von
 *     validiereRoadmapDaten abgelehnt (kein zweiter Regelsatz, D5 — dieselbe
 *     Funktion wie scripts/check-f25-projekte.mjs Abschnitt (1));
 * (d) die reale projekte.json bleibt trotz der additiven, optionalen Felder
 *     kontext_pfad/roadmap_pfad ohne Migration gültig (Regressionsschutz);
 * (e) das über baueProjektkontextAnfragen gebaute Kontextpaket enthält für
 *     BEIDE Rollen (jarvis, router) alle vier Elemente (Beschreibung,
 *     Anweisungen, Roadmap, seit F40 WS-2 zusätzlich das Lagebild),
 *     zusammen mit einer realistisch vorangestellten Auftragsreferenz
 *     (Muster execution-controller/index.ts) gegen das reale
 *     standardBudget — real über F5s baueKontextpaket gegen ein
 *     Wegwerf-basisVerzeichnis (Muster check-f32-verbrauch.mjs);
 * (f) QA-Pass-Befund (kritisch): ein Projekt OHNE vorbereitete Kontextdateien
 *     (kontext_pfad/roadmap_pfad zeigt ins Leere) blockiert jarvis/router
 *     NICHT mehr komplett — real über POST /api/chat gegen einen frischen
 *     erzeugeRequestHandler geprüft (filtereExistierendeAnfragen lässt die
 *     drei Anfragen still weg, kein 400);
 * (g) Code-Review-Befund: ein Projekt MIT abweichendem, real existierendem
 *     kontext_pfad/roadmap_pfad bekommt tatsächlich dessen Inhalt eingespeist
 *     — real über POST /api/chat gegen einen erzeugeRequestHandler mit
 *     überschriebenen kontextPfad/roadmapPfad-Optionen geprüft, kein
 *     stillschweigender Rückfall auf den Standardpfad.
 *
 * Aufruf: node scripts/check-f33-projektkontext.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { validiereRoadmapDaten, ladeRoadmap } from '../src/projektkontext/index.ts'
import { validiereProjekteDaten } from '../src/projekte/index.ts'
import { baueKontextpaket } from '../src/context-builder/index.ts'
import { baueProjektkontextAnfragen, filtereExistierendeAnfragen, erzeugeRequestHandler } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STANDARD_BUDGET = { maxElemente: 20, maxBytes: 200000 }
const STILLER_SCHREIBER = () => {}

console.log('\n=== F33-WS1-Projektkontext-Check ===\n')

// ─── (a) Dateien existieren real und sind nicht leer ────────────────────────
{
  const dateien = ['docs/projekt/kontext/beschreibung.md', 'docs/projekt/kontext/anweisungen.md', 'docs/projekt/roadmap.json']
  for (const pfad of dateien) {
    if (!existsSync(pfad)) {
      befunde.push(`(a) '${pfad}' existiert nicht`)
      continue
    }
    const inhalt = readFileSync(pfad, 'utf8')
    if (inhalt.trim().length === 0) {
      befunde.push(`(a) '${pfad}' ist leer`)
    }
  }
  if (befunde.length === 0) {
    console.log(`✓ (a) Alle drei Repo-Dateien existieren und sind nicht leer: ${dateien.join(', ')}.`)
  }
}

// ─── (b) Grün-Fall: reale docs/projekt/roadmap.json ist über ladeRoadmap gültig ──
{
  try {
    ladeRoadmap('docs/projekt/roadmap.json')
    console.log('✓ (b) docs/projekt/roadmap.json: über ladeRoadmap ladbar und gültig.')
  } catch (fehler) {
    befunde.push(`(b) ladeRoadmap('docs/projekt/roadmap.json') wirft: ${fehler.message}`)
  }
}

// ─── (c) Rot-Fälle: ungültiges roadmap.json wird abgelehnt ──────────────────
{
  const GUELTIGER_MEILENSTEIN = { id: 'test-m1', titel: 'Test-Meilenstein', status: 'GEPLANT', features: ['F00'] }
  const rotFaelle = [
    { titel: 'unbekanntes Feld an der Wurzel', daten: { roadmap_schema: 'v0', vision: 'Test', meilensteine: [GUELTIGER_MEILENSTEIN], unbekannt: 1 } },
    { titel: 'falsches roadmap_schema', daten: { roadmap_schema: 'v1', vision: 'Test', meilensteine: [GUELTIGER_MEILENSTEIN] } },
    { titel: 'leere vision', daten: { roadmap_schema: 'v0', vision: '', meilensteine: [GUELTIGER_MEILENSTEIN] } },
    { titel: 'ungültiger status', daten: { roadmap_schema: 'v0', vision: 'Test', meilensteine: [{ ...GUELTIGER_MEILENSTEIN, status: 'ERFUNDEN' }] } },
    { titel: 'doppelte Meilenstein-id', daten: { roadmap_schema: 'v0', vision: 'Test', meilensteine: [GUELTIGER_MEILENSTEIN, GUELTIGER_MEILENSTEIN] } },
    { titel: 'features ist kein Array', daten: { roadmap_schema: 'v0', vision: 'Test', meilensteine: [{ ...GUELTIGER_MEILENSTEIN, features: 'F00' }] } },
    { titel: 'unbekanntes Feld in einem Meilenstein', daten: { roadmap_schema: 'v0', vision: 'Test', meilensteine: [{ ...GUELTIGER_MEILENSTEIN, unbekannt: 1 }] } },
  ]
  const befundeVorRot = befunde.length
  for (const { titel, daten } of rotFaelle) {
    if (validiereRoadmapDaten(daten).length === 0) {
      befunde.push(`(c) Rot-Fall '${titel}' wurde fälschlich als gültig akzeptiert`)
    }
  }
  if (validiereRoadmapDaten({ roadmap_schema: 'v0', vision: 'Test', meilensteine: [GUELTIGER_MEILENSTEIN] }).length !== 0) {
    befunde.push('(c) Grün-Fall (synthetischer gültiger Meilenstein) wurde fälschlich abgelehnt')
  }
  if (befunde.length === befundeVorRot) {
    console.log(`✓ (c) ${rotFaelle.length} Rot-Fall/-Fälle erkannt, synthetischer Grün-Fall akzeptiert.`)
  }
}

// ─── (d) Regressionsschutz: reale projekte.json bleibt ohne Migration gültig ──
{
  const rohDaten = JSON.parse(readFileSync('projekte.json', 'utf8'))
  const verstoesse = validiereProjekteDaten(rohDaten)
  if (verstoesse.length > 0) {
    befunde.push(`(d) projekte.json verletzt validiereProjekteDaten nach der additiven Schemaerweiterung: ${verstoesse.join('; ')}`)
  } else {
    console.log('✓ (d) projekte.json bleibt ohne Migration gültig (kontext_pfad/roadmap_pfad additiv optional).')
  }
}

// ─── (e) Kontextpaket für 'jarvis' UND 'router' enthält alle drei Elemente, ──
// ─── zusammen mit einer realistisch vorangestellten Auftragsreferenz gegen ──
// ─── das reale standardBudget (QA-Pass-Befund: bislang nur isoliert geprüft) ──
{
  for (const rolle of ['jarvis', 'router']) {
    const basisVerzeichnis = `kontrollzustand-test-f33-projektkontext-${rolle}-${randomUUID()}`
    raeumeVerzeichnis(basisVerzeichnis)
    try {
      const anfragenOhneInhalt = baueProjektkontextAnfragen('docs/projekt/kontext', 'docs/projekt/roadmap.json')
      // Realer Dateiinhalt (Muster loeseAusfuehrungsEingabenAuf, scripts/leitstand-server.mjs) —
      // kein zweiter Lesepfad, dieselben drei Dateien wie unter (a) geprüft.
      const kontextAnfragen = anfragenOhneInhalt.map((anfrage) => ({ ...anfrage, inhalt: readFileSync(anfrage.pfad, 'utf8') }))
      // Realistische Auftragsreferenz (Muster src/execution-controller/index.ts:258-267) — in
      // Produktion IMMER zusätzlich notwendig:true vorangestellt, bevor baueKontextpaket läuft.
      const auftragAnfrage = {
        pfad: `artefakt:auftrag-check-f33-${rolle}`,
        frage: 'Auftragsbezug dieses Laufs',
        begruendung: 'Lineage-Verweis auf den Auftrag (E-M2-4, AK5)',
        inhalt: JSON.stringify({ auftrag_schema: 'v0', titel: 'Test', auftragstext: 'Eine realistisch lange Testnachricht für die Budgetprüfung.' }),
        notwendig: true,
      }
      const anfragen = [auftragAnfrage, ...kontextAnfragen]

      const ergebnis = baueKontextpaket(`check-f33-${rolle}-${randomUUID()}`, rolle, anfragen, PROFIL_REFERENZ, STANDARD_BUDGET, {
        basisVerzeichnis,
        schreiber: STILLER_SCHREIBER,
      })

      if (!ergebnis.ok) {
        befunde.push(`(e) baueKontextpaket('${rolle}', …) wurde mit Auftragsreferenz + Projektkontext abgelehnt: ${JSON.stringify(ergebnis)}`)
      } else {
        const pfade = new Set(ergebnis.paket.elemente.map((e) => e.pfad))
        const erwartet = [
          'docs/projekt/kontext/beschreibung.md',
          'docs/projekt/kontext/anweisungen.md',
          'docs/projekt/roadmap.json',
          'docs/projekt/kontext/lagebild.md',
        ]
        const fehlend = erwartet.filter((p) => !pfade.has(p))
        if (fehlend.length > 0) {
          befunde.push(`(e) Kontextpaket für '${rolle}' fehlen Elemente: ${fehlend.join(', ')} (vorhanden: ${[...pfade].join(', ')})`)
        } else {
          console.log(`✓ (e) Kontextpaket für Rolle '${rolle}' enthält alle vier Projektkontext-Elemente, zusammen mit einer Auftragsreferenz, innerhalb des realen standardBudget.`)
        }
      }
    } finally {
      raeumeVerzeichnis(basisVerzeichnis)
    }
  }
}

/** Startet handler auf 127.0.0.1 und liefert { basisUrl, schliessen } — Muster check-f25-projekte.mjs. */
async function starteTestserver(handler) {
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return { basisUrl: `http://127.0.0.1:${port}`, schliessen: () => new Promise((resolve) => server.close(resolve)) }
}

// ─── (f) QA-Pass-Befund (kritisch): fehlende Kontextdateien blockieren jarvis NICHT ──
// ─── mehr komplett — real über POST /api/chat gegen einen Handler geprüft, dessen ──
// ─── kontextPfad/roadmapPfad auf NICHT existierende Pfade zeigen. ──────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f33-fehlender-kontext-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  try {
    let beobachteteAnfragen = null
    const attrappeFuehreAufgabeDurch = async (_laufId, _profilReferenz, eingaben) => {
      beobachteteAnfragen = eingaben.anfragen
      return { ok: false, stufe: 'gateway', grund: 'attrappe (Gate-Test, F33 fehlender Kontext)' }
    }
    const handler = erzeugeRequestHandler({
      fuehreAufgabeDurchFn: attrappeFuehreAufgabeDurch,
      basisVerzeichnis,
      startvorlagePfad: 'startvorlagen/beispielprojekt.json',
      kontextPfad: `nicht-existent-${randomUUID()}`,
      roadmapPfad: `nicht-existent-${randomUUID()}/roadmap.json`,
    })
    const { basisUrl, schliessen } = await starteTestserver(handler)
    try {
      const antwort = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'F33-Fehlender-Kontext-Test' }) })
      await new Promise((r) => setTimeout(r, 50))
      if (antwort.status !== 202) {
        befunde.push(`(f) POST /api/chat mit fehlenden Kontextdateien erwartet 202 (kein Blocker), erhalten ${antwort.status}`)
      } else if (beobachteteAnfragen === null) {
        befunde.push('(f) fuehreAufgabeDurchFn wurde nicht aufgerufen — Testaufbau selbst defekt')
      } else if (beobachteteAnfragen.some((a) => a.pfad.includes('nicht-existent'))) {
        befunde.push(`(f) Anfragenliste enthält trotz fehlender Datei einen Kontextpfad-Eintrag: ${JSON.stringify(beobachteteAnfragen)}`)
      } else {
        console.log('✓ (f) Ein Projekt ohne vorbereitete Kontextdateien blockiert jarvis NICHT (202, Anfragen werden still weggelassen statt 400).')
      }
    } finally {
      await schliessen()
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (g) Ein abweichender, real existierender kontext_pfad/roadmap_pfad wird ────
// ─── tatsächlich eingespeist — kein stiller Rückfall auf den Standardpfad. ──────
{
  const kontextOrdner = `kontrollzustand-test-f33-override-kontext-${randomUUID()}`
  const basisVerzeichnis = `kontrollzustand-test-f33-override-${randomUUID()}`
  mkdirSync(kontextOrdner, { recursive: true })
  raeumeVerzeichnis(basisVerzeichnis)
  try {
    writeFileSync(join(kontextOrdner, 'beschreibung.md'), '# Override-Beschreibung\n')
    writeFileSync(join(kontextOrdner, 'anweisungen.md'), '# Override-Anweisungen\n')
    writeFileSync(join(kontextOrdner, 'roadmap-custom.json'), JSON.stringify({ roadmap_schema: 'v0', vision: 'Override-Vision', meilensteine: [] }))

    let beobachteteAnfragen = null
    const attrappeFuehreAufgabeDurch = async (_laufId, _profilReferenz, eingaben) => {
      beobachteteAnfragen = eingaben.anfragen
      return { ok: false, stufe: 'gateway', grund: 'attrappe (Gate-Test, F33 Override)' }
    }
    const handler = erzeugeRequestHandler({
      fuehreAufgabeDurchFn: attrappeFuehreAufgabeDurch,
      basisVerzeichnis,
      startvorlagePfad: 'startvorlagen/beispielprojekt.json',
      kontextPfad: kontextOrdner,
      roadmapPfad: `${kontextOrdner}/roadmap-custom.json`,
    })
    const { basisUrl, schliessen } = await starteTestserver(handler)
    try {
      await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'F33-Override-Test' }) })
      await new Promise((r) => setTimeout(r, 50))
      if (beobachteteAnfragen === null) {
        befunde.push('(g) POST /api/chat hat fuehreAufgabeDurchFn nicht aufgerufen — Testaufbau selbst defekt')
      } else {
        const pfade = beobachteteAnfragen.map((a) => a.pfad)
        const erwartet = [`${kontextOrdner}/beschreibung.md`, `${kontextOrdner}/anweisungen.md`, `${kontextOrdner}/roadmap-custom.json`]
        const fehlend = erwartet.filter((p) => !pfade.includes(p))
        if (fehlend.length > 0) {
          befunde.push(`(g) POST /api/chat mit überschriebenem kontext_pfad/roadmap_pfad: erwartete Pfade fehlen: ${fehlend.join(', ')} (erhalten: ${pfade.join(', ')})`)
        } else {
          console.log('✓ (g) Ein abweichender, real existierender kontext_pfad/roadmap_pfad erreicht real über POST /api/chat die Anfragenliste — kein stiller Rückfall auf den Standardpfad.')
        }
      }
    } finally {
      await schliessen()
    }
  } finally {
    raeumeVerzeichnis(kontextOrdner)
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
// process.exitCode statt process.exit() (Muster check-f25-projekte.mjs) — Abschnitte (f)/(g)
// nutzen echtes fetch()/createServer(); ein hartes process.exit() direkt danach kollidierte real
// mit noch schließenden libuv-Handles (Windows-Assertion in src/win/async.c).
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
