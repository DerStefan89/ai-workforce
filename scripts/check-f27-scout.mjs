/**
 * Datei: scripts/check-f27-scout.mjs
 *
 * Zweck: Resource-Scout-Gate (F27 WS-1). Prüft AK1 (Werkzeugsatz-Art
 * 'recherchierend' additiv in Startvorlage/Schema/Typen, real vorhanden in
 * startvorlagen/ai-workforce.json), AK2 (Rollenvertrag 'scout' vollständig
 * UND real belegter Rot-Fall: derselbe Werkzeugsatz gegen eine Rolle ohne
 * diese erlaubte Art wird real abgelehnt — direkt gegen
 * loeseAusfuehrungsEingabenAuf und real über POST /api/laeufe, Muster
 * scripts/check-f17-rollenvertrag.mjs AK6), AK3 (schemas/ergebnis-
 * scout.schema.json + Beispiele gegen validiereErgebnisScout) und AK5
 * (leseScoutErgebnisAusLaufakte liest/validiert einen präparierten Rohstrom
 * korrekt, Rot- und Grünfall, Muster scripts/check-f22-click-to-work.mjs'
 * schreibeRohstromFixture).
 *
 * Kalibrierung (AK7, Muster scripts/check-f21-workboard.mjs): jeder
 * Rot-Fall unten steht neben einem passenden Grün-Fall mit ansonsten
 * identischen, nur am geprüften Merkmal geänderten Daten — ein Gate, das
 * pauschal alles rot meldet, fiele am eigenen Grün-Fall auf.
 *
 * Kein generischer JSON-Schema-Validator (Muster check-f18-router.mjs, D5):
 * importiert die reale validiereErgebnisScout statt einen zweiten
 * Regelsatz zu pflegen.
 *
 * Aufruf: node scripts/check-f27-scout.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROLLENVERTRAEGE } from '../src/rollen/index.ts'
import { validiereErgebnisScout } from '../src/scout/index.ts'
import { validiereStartvorlageDaten } from '../src/startvorlage/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { erzeugeRequestHandler, leseScoutErgebnisAusLaufakte, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'
import { schreibeWirkungsmarke, sha256Hex } from '../src/checkpoint-store/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

console.log('\n=== F27-Scout-Check ===\n')

// ─── AK2 (a): ROLLENVERTRAEGE.scout hat die erwartete Form ─────────────────
{
  const scout = ROLLENVERTRAEGE.scout
  if (!scout) {
    befunde.push("ROLLENVERTRAEGE trägt keinen Eintrag 'scout'")
  } else {
    if (typeof scout.zweck !== 'string' || scout.zweck.length === 0) {
      befunde.push("scout.zweck fehlt oder ist leer")
    }
    if (JSON.stringify(scout.erlaubte_werkzeugsatz_arten) !== JSON.stringify(['recherchierend'])) {
      befunde.push(`scout.erlaubte_werkzeugsatz_arten erwartet ['recherchierend'], erhalten ${JSON.stringify(scout.erlaubte_werkzeugsatz_arten)}`)
    }
    if (JSON.stringify(scout.erlaubte_worker) !== JSON.stringify(['claude-code'])) {
      befunde.push(`scout.erlaubte_worker erwartet ['claude-code'], erhalten ${JSON.stringify(scout.erlaubte_worker)}`)
    }
    if (scout.erlaubtes_output_schema !== 'ergebnis-scout') {
      befunde.push(`scout.erlaubtes_output_schema erwartet 'ergebnis-scout', erhalten ${JSON.stringify(scout.erlaubtes_output_schema)}`)
    }
    if (JSON.stringify(scout.ausschlussmuster) !== JSON.stringify(['src/**'])) {
      befunde.push(`scout.ausschlussmuster erwartet ['src/**'], erhalten ${JSON.stringify(scout.ausschlussmuster)}`)
    }
    for (const capability of ['WEB_RESEARCH', 'STRUCTURED_OUTPUT', 'REPO_READ']) {
      if (!scout.benoetigte_capabilities.includes(capability)) {
        befunde.push(`scout.benoetigte_capabilities sollte '${capability}' enthalten, erhalten ${JSON.stringify(scout.benoetigte_capabilities)}`)
      }
    }
    if (befunde.length === 0) {
      console.log("✓ AK2 (a): ROLLENVERTRAEGE.scout trägt alle fünf Felder in erwarteter Form.")
    }
  }
}

// ─── AK1: startvorlagen/ai-workforce.json trägt den neuen Werkzeugsatz ─────
{
  const befundeVor = befunde.length
  const roh = JSON.parse(readFileSync('startvorlagen/ai-workforce.json', 'utf-8'))
  const werkzeugsatz = roh.werkzeugsaetze?.recherchierend
  if (werkzeugsatz === undefined) {
    befunde.push("AK1: startvorlagen/ai-workforce.json trägt keinen Werkzeugsatz 'recherchierend'")
  } else {
    if (werkzeugsatz.art !== 'recherchierend') {
      befunde.push(`AK1: werkzeugsaetze.recherchierend.art erwartet 'recherchierend', erhalten ${JSON.stringify(werkzeugsatz.art)}`)
    }
    for (const werkzeug of ['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch']) {
      if (!werkzeugsatz.erlaubte_werkzeuge?.includes(werkzeug)) {
        befunde.push(`AK1: werkzeugsaetze.recherchierend.erlaubte_werkzeuge sollte '${werkzeug}' enthalten, erhalten ${JSON.stringify(werkzeugsatz.erlaubte_werkzeuge)}`)
      }
    }
  }
  const verstoesse = validiereStartvorlageDaten(roh)
  if (verstoesse.length > 0) {
    befunde.push(`AK1: startvorlagen/ai-workforce.json verletzt validiereStartvorlageDaten (mit 'recherchierend'): ${verstoesse.join('; ')}`)
  }
  // Grünfall/Kalibrierung: eine bestehende Vorlage OHNE 'recherchierend' bleibt weiterhin
  // gültig — die neue Art ist additiv, kein Pflichtfeld (F27/feature.md AK1).
  const ohneRecherchierend = JSON.parse(readFileSync('startvorlagen/beispielprojekt.json', 'utf-8'))
  if (validiereStartvorlageDaten(ohneRecherchierend).length > 0) {
    befunde.push("AK1 (Kalibrierung): startvorlagen/beispielprojekt.json (ohne 'recherchierend') sollte weiterhin gültig sein")
  }
  // Rotfall/Kalibrierung: eine unbekannte Art wird weiterhin abgelehnt — 'recherchierend' ist
  // additiv zur bestehenden Allowlist, keine Aufweichung zu einer freien Zeichenkette.
  const mitUnbekannterArt = { ...roh, werkzeugsaetze: { ...roh.werkzeugsaetze, kaputt: { art: 'fliegend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] } } }
  if (validiereStartvorlageDaten(mitUnbekannterArt).length === 0) {
    befunde.push("AK1 (Kalibrierung): eine unbekannte Werkzeugsatz-Art ('fliegend') sollte weiterhin abgelehnt werden")
  }
  if (befunde.length === befundeVor) {
    console.log("✓ AK1: 'recherchierend' additiv in startvorlagen/ai-workforce.json vorhanden, validiereStartvorlageDaten akzeptiert sie, eine unbekannte Art bleibt abgelehnt, eine Vorlage ohne sie bleibt gültig.")
  }
}

// ─── AK3: schemas/ergebnis-scout.schema.json + Beispiele ───────────────────
{
  const befundeVor = befunde.length
  JSON.parse(readFileSync('schemas/ergebnis-scout.schema.json', 'utf-8')) // wirft bei kaputtem JSON

  const beispiele = [
    { pfad: 'schemas/examples/ergebnis-scout.valid.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/ergebnis-scout.invalid-hinweis-untrusted-false.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-scout.invalid-zu-viele-kandidaten.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-scout.invalid-unbekannter-typ.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-scout.invalid-quelle-url-schema.json', sollGueltigSein: false },
  ]
  for (const { pfad, sollGueltigSein } of beispiele) {
    const obj = JSON.parse(readFileSync(pfad, 'utf-8'))
    const verstoesse = validiereErgebnisScout(obj)
    if (sollGueltigSein && verstoesse.length > 0) {
      befunde.push(`AK3: ${pfad} sollte gültig sein, verletzt aber: ${verstoesse.join('; ')}`)
    }
    if (!sollGueltigSein && verstoesse.length === 0) {
      befunde.push(`AK3: ${pfad} sollte ungültig sein, wurde aber akzeptiert`)
    }
  }
  if (befunde.length === befundeVor) {
    console.log('✓ AK3: schemas/ergebnis-scout.schema.json gültiges JSON; valid.json erfüllt validiereErgebnisScout, alle vier invalid-*.json verletzen je eine benannte Regel.')
  }
}

// ─── AK2 (b): Rot-Fall direkt gegen loeseAusfuehrungsEingabenAuf + Grünfall ─
{
  const testVorlage = {
    startvorlage_schema: 'v0',
    profilPfad: 'profiles/beispiel.json',
    werkzeugStartziel: ['check-f27-startziel'],
    werkzeugVersionDeklariert: 'check-f27-1',
    berechtigungskontext: 'profil-standard',
    modell: 'check-f27-modell',
    standardBudget: { maxElemente: 5, maxBytes: 5000 },
    werkzeugsaetze: {
      lesend: { art: 'lesend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] },
      schreibend: { art: 'schreibend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Write'] },
      recherchierend: { art: 'recherchierend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'WebSearch'] },
    },
  }
  const eingaben = (felder) => ({
    rolle: 'ausfuehrung',
    anfragen: [],
    budget: { maxElemente: 1 },
    aufrufEingaben: { modell: 'check-f27-modell' },
    auftragId: 'check-f27-auftrag',
    ...felder,
  })

  const befundeVor = befunde.length

  // Rotfall (AK2): dieselbe Werkzeugsatz-Art 'recherchierend' gegen eine Rolle, die sie
  // nicht führt (ausfuehrung erlaubt nur lesend/schreibend).
  const rot = loeseAusfuehrungsEingabenAuf(eingaben({ rolle: 'ausfuehrung' }), 'recherchierend', 'text', testVorlage, 'unbenutzt')
  if (rot.ok !== false || !/erlaubt die Werkzeugsatz-Art 'recherchierend' nicht/.test(rot.grund)) {
    befunde.push(`AK2 Rotfall: erwartet ok:false mit "erlaubt die Werkzeugsatz-Art 'recherchierend' nicht", erhalten ${JSON.stringify(rot)}`)
  }

  // Grünfall (Kalibrierung): dieselbe Werkzeugsatz-Art gegen die Rolle, die sie führt.
  const gruen = loeseAusfuehrungsEingabenAuf(eingaben({ rolle: 'scout' }), 'recherchierend', 'text', testVorlage, 'unbenutzt')
  if (!gruen.ok) {
    befunde.push(`AK2 Grünfall: 'scout' + 'recherchierend' erwartet ok:true, erhalten ${JSON.stringify(gruen)}`)
  }

  // Grünfall (Kalibrierung): 'scout' bleibt bei 'lesend' abgelehnt — die neue Art ist additiv,
  // keine Aufweichung des Rollenvertrags auf eine zweite Art.
  const rotUmgekehrt = loeseAusfuehrungsEingabenAuf(eingaben({ rolle: 'scout' }), 'lesend', 'text', testVorlage, 'unbenutzt')
  if (rotUmgekehrt.ok !== false) {
    befunde.push(`AK2 Rotfall (umgekehrt): 'scout' + 'lesend' erwartet ok:false, erhalten ${JSON.stringify(rotUmgekehrt)}`)
  }

  if (befunde.length === befundeVor) {
    console.log("✓ AK2 (b): 'recherchierend' gegen 'ausfuehrung' real abgelehnt, gegen 'scout' real angenommen, 'scout' + 'lesend' bleibt real abgelehnt.")
  }
}

// ─── AK2 (c): derselbe Rot-Fall real über POST /api/laeufe ─────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f27-ak2-http-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length
  const auftragId = `check-f27-ak2-http-auftrag-${randomUUID()}`
  registriereAuftrag(auftragId, profilReferenz, 'AK2-HTTP-Gate-Fixture', 'Auftragstext.', { basisVerzeichnis, schreiber: () => {} })

  // startvorlagePfad ausdrücklich 'ai-workforce.json' — der Server-Default
  // (startvorlagen/beispielprojekt.json) trägt 'recherchierend' bewusst nicht (AK1 macht die
  // Art additiv, keine bestehende Vorlage muss sie führen); nur ai-workforce.json (AK1) tut es.
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, startvorlagePfad: 'startvorlagen/ai-workforce.json' }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const body = {
      laufId: `check-f27-ak2-http-${randomUUID()}`,
      rolle: 'ausfuehrung',
      anfragen: [],
      budget: {},
      aufrufEingaben: { modell: 'check-f27-modell' },
      werkzeugsatz: 'recherchierend',
      auftragId,
    }
    const antwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(body) })
    const koerper = await antwort.json()
    if (antwort.status !== 400 || !/erlaubt die Werkzeugsatz-Art 'recherchierend' nicht/.test(koerper.grund ?? '')) {
      befunde.push(`AK2 (HTTP): POST /api/laeufe mit rolle 'ausfuehrung' + werkzeugsatz 'recherchierend' erwartet 400, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
    }
    if (befunde.length === befundeVor) {
      console.log("✓ AK2 (c, real über HTTP): POST /api/laeufe lehnt 'recherchierend' gegen die Rolle 'ausfuehrung' real mit 400 ab.")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── AK5: leseScoutErgebnisAusLaufakte über präparierten Rohstrom ──────────
{
  const basisVerzeichnis = `kontrollzustand-test-f27-ak5-${randomUUID()}`
  const befundeVor = befunde.length
  try {
    mkdirSync(basisVerzeichnis, { recursive: true })
    const schreibeRohstromFixture = (dateiname, stdout) => {
      const pfad = join(basisVerzeichnis, dateiname)
      writeFileSync(pfad, JSON.stringify({ stdout }), 'utf8')
      return pfad
    }

    const gueltigesErgebnis = JSON.parse(readFileSync('schemas/examples/ergebnis-scout.valid.json', 'utf-8'))

    // Grünfall: claude-code-Rohstrom, Ergebnis in einem Markdown-Codezaun (Fence-Stripping,
    // dasselbe Muster wie der claude-code-Router-Rückfallzweig).
    {
      const rohstromPfad = schreibeRohstromFixture('ak5-gruenfall.json', JSON.stringify({ type: 'result', result: `\`\`\`json\n${JSON.stringify(gueltigesErgebnis)}\n\`\`\`` }))
      const ergebnis = leseScoutErgebnisAusLaufakte({ worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } })
      if (!ergebnis.ok || JSON.stringify(ergebnis.ergebnis) !== JSON.stringify(gueltigesErgebnis)) {
        befunde.push(`AK5 Grünfall: erwartet ok:true mit dem gültigen Ergebnis (inkl. Codezaun-Fallback), erhalten ${JSON.stringify(ergebnis)}`)
      }
    }

    // Rotfall: dasselbe Ergebnis, aber hinweis_untrusted:false — Schemaverstoß, nicht
    // wortgleich zum AK3-Beispiel, gegen die reale Lesefunktion statt nur gegen den Validator.
    {
      const ungueltigesErgebnis = { ...gueltigesErgebnis, hinweis_untrusted: false }
      const rohstromPfad = schreibeRohstromFixture('ak5-rotfall-schema.json', JSON.stringify({ type: 'result', result: JSON.stringify(ungueltigesErgebnis) }))
      const ergebnis = leseScoutErgebnisAusLaufakte({ worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } })
      if (ergebnis.ok !== false || !/hinweis_untrusted/.test(ergebnis.grund)) {
        befunde.push(`AK5 Rotfall (Schema): erwartet ok:false mit 'hinweis_untrusted' im Grund, erhalten ${JSON.stringify(ergebnis)}`)
      }
    }

    // Rotfall: kein verwertbarer Ergebnistext im Rohstrom (weder JSON noch Codezaun).
    {
      const rohstromPfad = schreibeRohstromFixture('ak5-rotfall-kein-json.json', JSON.stringify({ type: 'result', result: 'kein JSON, kein Codezaun' }))
      const ergebnis = leseScoutErgebnisAusLaufakte({ worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } })
      if (ergebnis.ok !== false) {
        befunde.push(`AK5 Rotfall (kein JSON): erwartet ok:false, erhalten ${JSON.stringify(ergebnis)}`)
      }
    }

    if (befunde.length === befundeVor) {
      console.log('✓ AK5: leseScoutErgebnisAusLaufakte liest ein gültiges, gecodezauntes Ergebnis korrekt, lehnt einen Schemaverstoß und einen unverwertbaren Rohstrom real ab.')
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── AK14 (F27 WS-2): GET /api/laeufe/<laufId> liefert scoutErgebnis ───────
//
// baueScoutErgebnisProjektion (scripts/leitstand-server.mjs, neue Modulfunktion aus WS-2 AK11)
// ist wie ihre Geschwister (baueLaufakteProjektion/baueRohstromProjektion) bewusst NICHT
// exportiert — geprüft wird real über GET /api/laeufe/<laufId> gegen einen präparierten
// Laufakte-/Rohstrom-Fixture. Muster derselben Datei (AK2 (c) oben): basisVerzeichnis direkt
// unter der Repo-Wurzel (kein Temp-repoWurzel wie in check-f12-leitstand-ansicht.mjs Fall (d) —
// leseRollenErgebnisRohstrom/leseScoutErgebnisAusLaufakte lösen rohstrom_referenz.pfad NICHT
// über loeseEvidenzPfadAuf/repoWurzel auf, sondern lesen ihn direkt relativ zum Prozess-cwd, wie
// AK5s eigener Fixture-Aufbau oben es bereits zeigt). schreibeWirkungsmarke für das
// Laufverzeichnis PLUS registriereKernArtefakt für die Laufakte, keine starteGateway-Attrappe.
{
  const basisVerzeichnis = `kontrollzustand-test-f27-ak14-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length

  const gueltigesErgebnis = JSON.parse(readFileSync('schemas/examples/ergebnis-scout.valid.json', 'utf-8'))

  function schreibeLaufakteFixture(laufIdSuffix, roherErgebnistext) {
    const laufId = `check-f27-ak14-${laufIdSuffix}-${randomUUID()}`
    schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })
    const rohVerzeichnis = join(basisVerzeichnis, `roh-${laufId}`)
    mkdirSync(rohVerzeichnis, { recursive: true })
    const rohPfad = join(rohVerzeichnis, 'rohstrom.json')
    // ProzessErgebnis-Form (Muster AK5-Fixture oben): rohstrom.json trägt ein stdout-Feld, dessen
    // Inhalt selbst wieder JSON ist (leseErgebnisobjekt liest EIN "type":"result"-Objekt daraus).
    const rohInhalt = JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: roherErgebnistext }) })
    writeFileSync(rohPfad, rohInhalt, 'utf8')
    registriereKernArtefakt(
      `laufakte-${laufId}`,
      profilReferenz,
      { erzeuger: 'kern', schritt: `check-f27-ak14-fixture-${laufIdSuffix}` },
      {
        laufakte_schema: 'v0',
        lauf_id: laufId,
        werkzeug_version_deklariert: 'test-version',
        berechtigungskontext: 'test-kontext',
        arbeitsverzeichnis_pfad: process.cwd(),
        modell_beobachtet: null,
        worker: 'claude-code',
        beobachtungsbasis_vollstaendig: true,
        rohstrom_referenz: { pfad: rohPfad, inhalts_hash: sha256Hex(rohInhalt) },
        erstellt_am: new Date().toISOString(),
      },
      [],
      { basisVerzeichnis, schreiber: () => {} }
    )
    return laufId
  }

  const laufIdGruen = schreibeLaufakteFixture('gruen', JSON.stringify(gueltigesErgebnis))
  const laufIdRot = schreibeLaufakteFixture('rot', JSON.stringify({ ...gueltigesErgebnis, hinweis_untrusted: false }))
  const laufIdOhneLaufakte = `check-f27-ak14-ohne-laufakte-${randomUUID()}`
  schreibeWirkungsmarke(laufIdOhneLaufakte, profilReferenz, 'run_prepared', {}, { basisVerzeichnis, schreiber: () => {} })

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const gruen = await (await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufIdGruen)}`)).json()
    if (gruen.scoutErgebnis?.status !== 'ok' || JSON.stringify(gruen.scoutErgebnis.ergebnis) !== JSON.stringify(gueltigesErgebnis)) {
      befunde.push(`AK14 Grünfall: GET /api/laeufe/<laufId> erwartet scoutErgebnis.status 'ok' mit dem gültigen Ergebnis, erhalten ${JSON.stringify(gruen.scoutErgebnis)}`)
    }

    const rot = await (await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufIdRot)}`)).json()
    if (rot.scoutErgebnis?.status !== 'nicht_lesbar' || !/hinweis_untrusted/.test(rot.scoutErgebnis.grund ?? '')) {
      befunde.push(`AK14 Rotfall (Schemaverstoß): GET /api/laeufe/<laufId> erwartet scoutErgebnis.status 'nicht_lesbar' mit 'hinweis_untrusted' im Grund, erhalten ${JSON.stringify(rot.scoutErgebnis)}`)
    }

    const ohneLaufakte = await (await fetch(`${basisUrl}/api/laeufe/${encodeURIComponent(laufIdOhneLaufakte)}`)).json()
    if (ohneLaufakte.scoutErgebnis?.status !== 'nicht_vorhanden') {
      befunde.push(`AK14 Rotfall (keine Laufakte): GET /api/laeufe/<laufId> erwartet scoutErgebnis.status 'nicht_vorhanden', erhalten ${JSON.stringify(ohneLaufakte.scoutErgebnis)}`)
    }

    if (befunde.length === befundeVor) {
      console.log("✓ AK14: GET /api/laeufe/<laufId> liefert scoutErgebnis — 'ok' mit dem geparsten Ergebnis bei gültigem Rohstrom, 'nicht_lesbar' bei Schemaverstoß, 'nicht_vorhanden' ohne Laufakte.")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
//
// process.exitCode statt process.exit() (Muster scripts/check-f17-rollenvertrag.mjs,
// dort ausführlich begründet): ein echter HTTP-Testserver schließt asynchron.
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
