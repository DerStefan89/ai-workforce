/**
 * Datei: scripts/check-f32-verbrauch.mjs
 *
 * Zweck: Gate für F32 WS-1 (Verbrauch & Kontingent — Laufakte-Feld +
 * Projektion). Prüft:
 * (a) Rot-Fall: eine Laufakte mit ungültigem `verbrauch` (falscher Typ,
 *     fehlendes Pflichtfeld, unbekanntes Feld, ungültige quelle) wird von
 *     validiereLaufakteDaten abgelehnt (kein zweiter Regelsatz, D5 — dieselbe
 *     Funktion wie scripts/check-f6a-claude-code-gateway.mjs Abschnitt (e)).
 * (b) Grün-Fall: eine Laufakte OHNE `verbrauch` bleibt gültig (additiv,
 *     optional, Muster worker/modell_deklariert — Regression gegen ein
 *     versehentliches Pflichtfeld).
 * (c) Die Projektion (scripts/leitstand/routen-verbrauch.mjs,
 *     baueVerbrauchsProjektion) summiert korrekt über zwei reale
 *     Laufakte-Fixturen — eine claude-code- und eine codex-Laufakte,
 *     real über F2s registriereKernArtefakt in ein Wegwerf-basisVerzeichnis
 *     geschrieben — sowie über einen dritten Lauf ohne `verbrauch`, der nur
 *     unter ohneBeobachtung zählt, nie in eine Summe eingeht.
 * (d) Der Zeitraumfilter (?von=/?bis=) grenzt über erstellt_am ein, ein Lauf
 *     ohne erstellt_am bleibt davon unberührt.
 *
 * Aufruf: node scripts/check-f32-verbrauch.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomUUID } from 'node:crypto'
import { validiereLaufakteDaten } from '../src/claude-code-gateway/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { baueVerbrauchsProjektion } from './leitstand/routen-verbrauch.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STILLER_SCHREIBER = () => {}

console.log('\n=== F32-WS1-Verbrauch-Check ===\n')

function gueltigeBasisLaufakte(laufId) {
  return {
    laufakte_schema: 'v0',
    lauf_id: laufId,
    werkzeug_version_deklariert: '2.1.241',
    berechtigungskontext: 'profil-standard',
    arbeitsverzeichnis_pfad: 'C:\\Users\\stefa\\Projekte\\ai-workforce',
    modell_beobachtet: null,
    beobachtungsbasis_vollstaendig: true,
    rohstrom_referenz: { pfad: `kontrollzustand-roh/${laufId}/rohstrom.json`, inhalts_hash: 'a'.repeat(64) },
    erstellt_am: '2026-09-20T09:00:00.000Z',
  }
}

// ─── (a) Rot-Fall: ungültiges verbrauch ─────────────────────────────────────
{
  const faelle = [
    {
      name: 'input_tokens als String statt Zahl',
      verbrauch: { input_tokens: '2', output_tokens: 1, cache_read_tokens: 0, cache_write_tokens: 0, dauer_ms: 100, dauer_api_ms: null, turns: null, quelle: 'claude-code' },
    },
    {
      name: 'Pflichtfeld quelle fehlt',
      verbrauch: { input_tokens: 2, output_tokens: 1, cache_read_tokens: 0, cache_write_tokens: 0, dauer_ms: 100, dauer_api_ms: null, turns: null },
    },
    {
      name: 'unbekanntes Feld',
      verbrauch: { input_tokens: 2, output_tokens: 1, cache_read_tokens: 0, cache_write_tokens: 0, dauer_ms: 100, dauer_api_ms: null, turns: null, quelle: 'claude-code', total_cost_usd: 0.01 },
    },
    {
      name: "quelle außerhalb der Aufzählung",
      verbrauch: { input_tokens: 2, output_tokens: 1, cache_read_tokens: 0, cache_write_tokens: 0, dauer_ms: 100, dauer_api_ms: null, turns: null, quelle: 'gemini' },
    },
    {
      name: 'negativer Wert',
      verbrauch: { input_tokens: -1, output_tokens: 1, cache_read_tokens: 0, cache_write_tokens: 0, dauer_ms: 100, dauer_api_ms: null, turns: null, quelle: 'codex' },
    },
  ]
  for (const { name, verbrauch } of faelle) {
    const laufakte = { ...gueltigeBasisLaufakte(`rot-${randomUUID()}`), verbrauch }
    const verstoesse = validiereLaufakteDaten(laufakte)
    if (verstoesse.length === 0) {
      befunde.push(`Rot-Fall '${name}': validiereLaufakteDaten hätte verbrauch ablehnen müssen, tat es nicht`)
    } else {
      console.log(`✓ Rot-Fall '${name}': abgelehnt (${verstoesse[0]})`)
    }
  }
}

// ─── (b) Grün-Fall: Laufakte ohne verbrauch bleibt gültig ───────────────────
{
  const laufakte = gueltigeBasisLaufakte(`gruen-ohne-verbrauch-${randomUUID()}`)
  const verstoesse = validiereLaufakteDaten(laufakte)
  if (verstoesse.length > 0) {
    befunde.push(`Grün-Fall 'ohne verbrauch': sollte gültig sein, verletzt: ${verstoesse.join('; ')}`)
  } else {
    console.log("✓ Grün-Fall: Laufakte ohne 'verbrauch' bleibt gültig (additiv, optional).")
  }
}

// ─── (c)/(d) Projektion: zwei reale Fixture-Laufakten + ein Lauf ohne Beobachtung ──
{
  const basisVerzeichnis = `kontrollzustand-test-f32-projektion-${randomUUID()}`
  const projektId = 'check-f32-projektion'
  raeumeVerzeichnis(basisVerzeichnis)
  try {
    /** Registriert Kontextpaket + Laufakte für einen Fixture-Lauf — Muster check-f31-gedaechtnis.mjs. */
    function schreibeLauf(laufId, rolle, auftragId, laufakteZusatz) {
      registriereKernArtefakt(
        `kontextpaket-${laufId}`,
        PROFIL_REFERENZ,
        { erzeuger: 'check-f32-fake' },
        { rolle, elemente: [{ pfad: `artefakt:auftrag-${auftragId}` }], ausgeschlossen: [] },
        undefined,
        { basisVerzeichnis, schreiber: STILLER_SCHREIBER }
      )
      registriereKernArtefakt(
        `laufakte-${laufId}`,
        PROFIL_REFERENZ,
        { erzeuger: 'check-f32-fake' },
        { ...gueltigeBasisLaufakte(laufId), ...laufakteZusatz },
        undefined,
        { basisVerzeichnis, schreiber: STILLER_SCHREIBER }
      )
    }

    // Lauf 1: claude-code, Rolle 'ausfuehrung', Auftrag A, mit verbrauch.
    schreibeLauf(`lauf-cc-${randomUUID()}`, 'ausfuehrung', 'auftrag-a', {
      erstellt_am: '2026-09-20T09:00:00.000Z',
      worker: 'claude-code',
      modell_beobachtet: 'claude-sonnet-5',
      verbrauch: { input_tokens: 2, output_tokens: 55, cache_read_tokens: 11395, cache_write_tokens: 4760, dauer_ms: 2444, dauer_api_ms: 3257, turns: 1, quelle: 'claude-code' },
    })

    // Lauf 2: codex, Rolle 'code-reviewer', Auftrag A — dieselbe Gruppe wie
    // Lauf 1 NICHT (anderer worker/modell), separate Summenzeile erwartet.
    schreibeLauf(`lauf-codex-${randomUUID()}`, 'code-reviewer', 'auftrag-a', {
      erstellt_am: '2026-09-20T10:00:00.000Z',
      worker: 'codex',
      modell_deklariert: 'gpt-5-codex',
      verbrauch: { input_tokens: 16454, output_tokens: 175, cache_read_tokens: 0, cache_write_tokens: 0, dauer_ms: 4200, dauer_api_ms: null, turns: null, quelle: 'codex' },
    })

    // Lauf 3: dieselbe Gruppe wie Lauf 1 (claude-code/ausfuehrung/Auftrag A),
    // aber OHNE verbrauch (kein Ergebnisobjekt beobachtet) — zählt mit,
    // fließt in keine Summe ein.
    schreibeLauf(`lauf-ohne-beobachtung-${randomUUID()}`, 'ausfuehrung', 'auftrag-a', {
      erstellt_am: '2026-09-20T11:00:00.000Z',
      worker: 'claude-code',
      modell_beobachtet: 'claude-sonnet-5',
      beobachtungsbasis_vollstaendig: false,
    })

    const projektion = baueVerbrauchsProjektion(basisVerzeichnis)

    if (projektion.laeufeGesamt !== 3) {
      befunde.push(`Projektion: laeufeGesamt sollte 3 sein, war ${projektion.laeufeGesamt}`)
    }
    if (projektion.ohneBeobachtungGesamt !== 1) {
      befunde.push(`Projektion: ohneBeobachtungGesamt sollte 1 sein, war ${projektion.ohneBeobachtungGesamt}`)
    }
    if (projektion.gruppen.length !== 2) {
      befunde.push(`Projektion: sollte 2 Gruppen bilden (claude-code/ausfuehrung und codex/code-reviewer), waren ${projektion.gruppen.length}`)
    } else {
      const gruppeCc = projektion.gruppen.find((g) => g.worker === 'claude-code')
      const gruppeCodex = projektion.gruppen.find((g) => g.worker === 'codex')
      if (gruppeCc === undefined || gruppeCodex === undefined) {
        befunde.push('Projektion: erwartete beide Gruppen (claude-code, codex) nicht gefunden')
      } else {
        if (gruppeCc.rolle !== 'ausfuehrung' || gruppeCc.modell !== 'claude-sonnet-5' || gruppeCc.auftragId !== 'auftrag-a') {
          befunde.push(`Projektion: claude-code-Gruppe falsch beschriftet: ${JSON.stringify(gruppeCc)}`)
        }
        if (gruppeCc.anzahlLaeufe !== 2 || gruppeCc.ohneBeobachtung !== 1) {
          befunde.push(`Projektion: claude-code-Gruppe sollte 2 Läufe / 1 ohne Beobachtung tragen, war anzahlLaeufe=${gruppeCc.anzahlLaeufe}, ohneBeobachtung=${gruppeCc.ohneBeobachtung}`)
        }
        if (gruppeCc.verbrauch.inputTokens !== 2 || gruppeCc.verbrauch.outputTokens !== 55 || gruppeCc.verbrauch.cacheReadTokens !== 11395 || gruppeCc.verbrauch.cacheWriteTokens !== 4760 || gruppeCc.verbrauch.dauerMs !== 2444) {
          befunde.push(`Projektion: claude-code-Gruppensumme falsch (Lauf 3 ohne verbrauch darf nicht mitzählen): ${JSON.stringify(gruppeCc.verbrauch)}`)
        }
        if (gruppeCodex.rolle !== 'code-reviewer' || gruppeCodex.modell !== 'gpt-5-codex' || gruppeCodex.auftragId !== 'auftrag-a') {
          befunde.push(`Projektion: codex-Gruppe falsch beschriftet: ${JSON.stringify(gruppeCodex)}`)
        }
        if (gruppeCodex.anzahlLaeufe !== 1 || gruppeCodex.ohneBeobachtung !== 0) {
          befunde.push(`Projektion: codex-Gruppe sollte 1 Lauf / 0 ohne Beobachtung tragen, war anzahlLaeufe=${gruppeCodex.anzahlLaeufe}, ohneBeobachtung=${gruppeCodex.ohneBeobachtung}`)
        }
        if (gruppeCodex.verbrauch.inputTokens !== 16454 || gruppeCodex.verbrauch.outputTokens !== 175 || gruppeCodex.verbrauch.dauerMs !== 4200) {
          befunde.push(`Projektion: codex-Gruppensumme falsch: ${JSON.stringify(gruppeCodex.verbrauch)}`)
        }
      }
    }
    if (befunde.length === 0) {
      console.log('✓ Projektion summiert korrekt über zwei Fixture-Laufakten (claude-code + codex) und zählt einen dritten Lauf nur unter ohneBeobachtung.')
    }

    // (d) Zeitraumfilter: 'von'/'bis' rahmen exakt Lauf 2 (10:00) ein — Lauf 1 (09:00) liegt
    // vor 'von', Lauf 3 (11:00) liegt nach 'bis'. Nur die codex-Gruppe bleibt übrig.
    const gefiltert = baueVerbrauchsProjektion(basisVerzeichnis, { von: '2026-09-20T09:30:00.000Z', bis: '2026-09-20T10:30:00.000Z' })
    if (gefiltert.laeufeGesamt !== 1 || gefiltert.gruppen.length !== 1 || gefiltert.gruppen[0].worker !== 'codex') {
      befunde.push(`Zeitraumfilter 'von'/'bis': erwartet genau 1 Lauf (codex-Gruppe), erhalten: ${JSON.stringify(gefiltert)}`)
    } else {
      console.log("✓ Zeitraumfilter '?von=&bis=' grenzt über erstellt_am korrekt ein.")
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
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
