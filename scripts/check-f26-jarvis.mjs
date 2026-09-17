/**
 * Datei: scripts/check-f26-jarvis.mjs
 *
 * Zweck: Jarvis-Chat-Gate (F26 WS-1/WS-2a). Prüft (a) den Rollenvertrag 'jarvis'
 * (ROLLENVERTRAEGE, src/rollen/index.ts), (b) schemas/ergebnis-jarvis.schema.json
 * + Beispiele gegen validiereErgebnisJarvis (src/jarvis/index.ts), (c) reale
 * Rot-Fälle von POST /api/chat (Formprüfung des Bodys, D13), (d)
 * leseJarvisErgebnisAusLaufakte über präparierte Rohstrom-Fixtures (Muster
 * scripts/check-f27-scout.mjs AK5), (e) den Lineage-Chat-Mechanismus, den
 * der reale CLI-Nachweis des WS-1-Auftrags nutzte (features/F26/nachweis-ws1.md):
 * registriereKernArtefakt mit artefaktId 'chat-<projektId>' erzeugt einen
 * lineage-'chat-<projektId>'-Eintrag, der gegen
 * schemas/kontrollzustand-lineage-payload.schema.json gültig ist
 * (validiereLineageEintrag) — mit der Nachricht im freien 'daten'-Feld, NICHT
 * in 'eingaben' (das ist für Datei-Referenzen mit inhalts_hash reserviert) —
 * und (f, WS-2a) den automatischen Lineage-Write DURCH POST /api/chat selbst
 * (kein externes Glue-Skript mehr): ein realer Grün-/Rotfall über eine fake
 * fuehreAufgabeDurchFn, GET /api/chat als Projektion.
 *
 * Kein generischer JSON-Schema-Validator (D5): importiert die reale
 * validiereErgebnisJarvis/validiereLineageEintrag statt einen zweiten
 * Regelsatz zu pflegen. Bewusst noch KEIN Gate-Abschnitt für einen echten
 * Claude-Code-Kindprozess-Lauf (teuer, nicht wiederholbar in jedem
 * npm-run-check-Durchlauf) — dieser reale Nachweis lebt eigenständig in
 * features/F26/nachweis-ws1.md (Muster F16/F27: realer Nachweis getrennt vom
 * automatisierten Gate).
 *
 * Kalibrierung (Muster scripts/check-f21-workboard.mjs): jeder Rot-Fall unten
 * steht neben einem passenden Grün-Fall mit ansonsten identischen, nur am
 * geprüften Merkmal geänderten Daten.
 *
 * Aufruf: node scripts/check-f26-jarvis.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROLLENVERTRAEGE } from '../src/rollen/index.ts'
import { validiereErgebnisJarvis } from '../src/jarvis/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { registriereKernArtefakt, validiereLineageEintrag } from '../src/lineage-registry/index.ts'
import { ladeGueltigeCheckpoints } from '../src/checkpoint-store/index.ts'
import { erzeugeRequestHandler, leseJarvisErgebnisAusLaufakte, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const STILLER_SCHREIBER = () => {}

console.log('\n=== F26-Jarvis-Check ===\n')

// ─── (a) ROLLENVERTRAEGE.jarvis hat die erwartete Form ─────────────────────
{
  const jarvis = ROLLENVERTRAEGE.jarvis
  if (!jarvis) {
    befunde.push("ROLLENVERTRAEGE trägt keinen Eintrag 'jarvis'")
  } else {
    if (typeof jarvis.zweck !== 'string' || jarvis.zweck.length === 0) {
      befunde.push('jarvis.zweck fehlt oder ist leer')
    }
    if (JSON.stringify(jarvis.erlaubte_werkzeugsatz_arten) !== JSON.stringify(['lesend'])) {
      befunde.push(`jarvis.erlaubte_werkzeugsatz_arten erwartet ['lesend'], erhalten ${JSON.stringify(jarvis.erlaubte_werkzeugsatz_arten)}`)
    }
    if (JSON.stringify([...jarvis.erlaubte_worker].sort()) !== JSON.stringify(['claude-code', 'codex'])) {
      befunde.push(`jarvis.erlaubte_worker erwartet beide Worker, erhalten ${JSON.stringify(jarvis.erlaubte_worker)}`)
    }
    if (jarvis.erlaubtes_output_schema !== 'ergebnis-jarvis') {
      befunde.push(`jarvis.erlaubtes_output_schema erwartet 'ergebnis-jarvis', erhalten ${JSON.stringify(jarvis.erlaubtes_output_schema)}`)
    }
    if (JSON.stringify(jarvis.ausschlussmuster) !== JSON.stringify(['src/**'])) {
      befunde.push(`jarvis.ausschlussmuster erwartet ['src/**'], erhalten ${JSON.stringify(jarvis.ausschlussmuster)}`)
    }
    for (const capability of ['TASK_CLASSIFICATION', 'STRUCTURED_OUTPUT', 'REPO_READ']) {
      if (!jarvis.benoetigte_capabilities.includes(capability)) {
        befunde.push(`jarvis.benoetigte_capabilities sollte '${capability}' enthalten, erhalten ${JSON.stringify(jarvis.benoetigte_capabilities)}`)
      }
    }
    if (befunde.length === 0) {
      console.log("✓ (a): ROLLENVERTRAEGE.jarvis trägt alle fünf Felder in erwarteter Form.")
    }
  }
}

// ─── (a2) Rot-/Grünfall direkt gegen loeseAusfuehrungsEingabenAuf ──────────
{
  const testVorlage = {
    startvorlage_schema: 'v0',
    profilPfad: 'profiles/beispiel.json',
    werkzeugStartziel: ['check-f26-startziel'],
    werkzeugVersionDeklariert: 'check-f26-1',
    berechtigungskontext: 'profil-standard',
    modell: 'check-f26-modell',
    standardBudget: { maxElemente: 5, maxBytes: 5000 },
    werkzeugsaetze: {
      lesend: { art: 'lesend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] },
      schreibend: { art: 'schreibend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Write'] },
    },
  }
  const eingaben = (felder) => ({
    rolle: 'jarvis',
    anfragen: [],
    budget: { maxElemente: 1 },
    aufrufEingaben: { modell: 'check-f26-modell' },
    auftragId: 'check-f26-auftrag',
    ...felder,
  })
  const befundeVor = befunde.length

  // Rotfall: jarvis erlaubt keinen schreibenden Werkzeugsatz.
  const rot = loeseAusfuehrungsEingabenAuf(eingaben({}), 'schreibend', 'text', testVorlage, 'unbenutzt')
  if (rot.ok !== false || !/erlaubt die Werkzeugsatz-Art 'schreibend' nicht/.test(rot.grund)) {
    befunde.push(`(a2) Rotfall: erwartet ok:false mit "erlaubt die Werkzeugsatz-Art 'schreibend' nicht", erhalten ${JSON.stringify(rot)}`)
  }
  // Grünfall: jarvis + lesend.
  const gruen = loeseAusfuehrungsEingabenAuf(eingaben({}), 'lesend', 'text', testVorlage, 'unbenutzt')
  if (!gruen.ok) {
    befunde.push(`(a2) Grünfall: 'jarvis' + 'lesend' erwartet ok:true, erhalten ${JSON.stringify(gruen)}`)
  }
  // Rotfall: falsches output_schema für jarvis.
  const rotSchema = loeseAusfuehrungsEingabenAuf(eingaben({ ausgabeSchemaPfad: '/irgendwo/schemas/ergebnis-scout.schema.json' }), 'lesend', 'text', testVorlage, 'unbenutzt')
  if (rotSchema.ok !== false || !/erlaubt output_schema 'ergebnis-scout' nicht/.test(rotSchema.grund)) {
    befunde.push(`(a2) Rotfall (output_schema): erwartet ok:false mit "erlaubt output_schema 'ergebnis-scout' nicht", erhalten ${JSON.stringify(rotSchema)}`)
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (a2): 'schreibend' gegen 'jarvis' real abgelehnt, 'lesend' real angenommen, ein fremdes output_schema real abgelehnt.")
  }
}

// ─── (b) schemas/ergebnis-jarvis.schema.json + Beispiele ───────────────────
{
  const befundeVor = befunde.length
  JSON.parse(readFileSync('schemas/ergebnis-jarvis.schema.json', 'utf-8')) // wirft bei kaputtem JSON

  const beispiele = [
    { pfad: 'schemas/examples/ergebnis-jarvis.valid.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/ergebnis-jarvis.valid-auftrag-vorschlag.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/ergebnis-jarvis.invalid-unbekannte-art.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-jarvis.invalid-bezug-beide-felder.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-jarvis.invalid-auftrag-ohne-text.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-jarvis.invalid-auftrag-vorschlag-ohne-auftrag.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-jarvis.invalid-aktion-ohne-aktion.json', sollGueltigSein: false },
  ]
  for (const { pfad, sollGueltigSein } of beispiele) {
    const obj = JSON.parse(readFileSync(pfad, 'utf-8'))
    const verstoesse = validiereErgebnisJarvis(obj)
    if (sollGueltigSein && verstoesse.length > 0) {
      befunde.push(`(b): ${pfad} sollte gültig sein, verletzt aber: ${verstoesse.join('; ')}`)
    }
    if (!sollGueltigSein && verstoesse.length === 0) {
      befunde.push(`(b): ${pfad} sollte ungültig sein, wurde aber akzeptiert`)
    }
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (b): schemas/ergebnis-jarvis.schema.json gültiges JSON; beide valid*.json erfüllen validiereErgebnisJarvis, alle fünf invalid-*.json verletzen je eine benannte Regel.')
  }
}

// ─── (c) POST /api/chat: reale Rot-Fälle der Bodyprüfung ───────────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f26-ak-c-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const faelle = [
      { body: '{}', erwartet: /'nachricht' muss ein nicht-leerer String sein/, name: 'fehlende nachricht' },
      { body: JSON.stringify({ nachricht: '' }), erwartet: /'nachricht' muss ein nicht-leerer String sein/, name: 'leere nachricht' },
      { body: JSON.stringify({ nachricht: '   ' }), erwartet: /'nachricht' muss ein nicht-leerer String sein/, name: 'nur Leerraum' },
      { body: JSON.stringify({ nachricht: 42 }), erwartet: /'nachricht' muss ein nicht-leerer String sein/, name: 'falscher Typ' },
      { body: JSON.stringify({ nachricht: 'Status?', laufId: 'x' }), erwartet: /unbekanntes Feld 'laufId'/, name: 'unbekanntes Feld' },
      { body: 'kein-json', erwartet: /Body ist kein gültiges JSON/, name: 'kein JSON' },
      { body: JSON.stringify({ nachricht: 'x'.repeat(8001) }), erwartet: /'nachricht' darf höchstens 8000 Zeichen haben/, name: 'nachricht zu lang (QA-Befund WS-1)' },
    ]
    for (const fall of faelle) {
      const antwort = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: fall.body })
      const koerper = await antwort.json()
      if (antwort.status !== 400 || !fall.erwartet.test(koerper.grund ?? '')) {
        befunde.push(`(c) Rotfall '${fall.name}': erwartet 400 mit ${fall.erwartet}, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }
    }
    if (befunde.length === befundeVor) {
      console.log('✓ (c): POST /api/chat lehnt fehlende/leere/typfalsche nachricht, unbekannte Felder und kaputtes JSON real mit 400 ab.')
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (d) leseJarvisErgebnisAusLaufakte über präparierten Rohstrom ──────────
{
  const basisVerzeichnis = `kontrollzustand-test-f26-ak-d-${randomUUID()}`
  const befundeVor = befunde.length
  try {
    mkdirSync(basisVerzeichnis, { recursive: true })
    const schreibeRohstromFixture = (dateiname, stdout) => {
      const pfad = join(basisVerzeichnis, dateiname)
      writeFileSync(pfad, JSON.stringify({ stdout }), 'utf8')
      return pfad
    }

    const gueltigesErgebnis = JSON.parse(readFileSync('schemas/examples/ergebnis-jarvis.valid.json', 'utf-8'))

    // Grünfall: claude-code-Rohstrom, Ergebnis in einem Markdown-Codezaun (Fence-Stripping).
    {
      const rohstromPfad = schreibeRohstromFixture('d-gruenfall.json', JSON.stringify({ type: 'result', result: `\`\`\`json\n${JSON.stringify(gueltigesErgebnis)}\n\`\`\`` }))
      const ergebnis = leseJarvisErgebnisAusLaufakte({ worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } })
      if (!ergebnis.ok || JSON.stringify(ergebnis.ergebnis) !== JSON.stringify(gueltigesErgebnis)) {
        befunde.push(`(d) Grünfall: erwartet ok:true mit dem gültigen Ergebnis (inkl. Codezaun-Fallback), erhalten ${JSON.stringify(ergebnis)}`)
      }
    }

    // Rotfall: Schemaverstoß (unbekannte art).
    {
      const ungueltigesErgebnis = { ...gueltigesErgebnis, art: 'unbekannt' }
      const rohstromPfad = schreibeRohstromFixture('d-rotfall-schema.json', JSON.stringify({ type: 'result', result: JSON.stringify(ungueltigesErgebnis) }))
      const ergebnis = leseJarvisErgebnisAusLaufakte({ worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } })
      if (ergebnis.ok !== false || !/'art' muss einer von/.test(ergebnis.grund)) {
        befunde.push(`(d) Rotfall (Schema): erwartet ok:false mit "'art' muss einer von" im Grund, erhalten ${JSON.stringify(ergebnis)}`)
      }
    }

    // Rotfall: kein verwertbarer Ergebnistext im Rohstrom.
    {
      const rohstromPfad = schreibeRohstromFixture('d-rotfall-kein-json.json', JSON.stringify({ type: 'result', result: 'kein JSON, kein Codezaun' }))
      const ergebnis = leseJarvisErgebnisAusLaufakte({ worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } })
      if (ergebnis.ok !== false) {
        befunde.push(`(d) Rotfall (kein JSON): erwartet ok:false, erhalten ${JSON.stringify(ergebnis)}`)
      }
    }

    if (befunde.length === befundeVor) {
      console.log('✓ (d): leseJarvisErgebnisAusLaufakte liest ein gültiges, gecodezauntes Ergebnis korrekt, lehnt einen Schemaverstoß und einen unverwertbaren Rohstrom real ab.')
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (e) Lineage-Chat-Mechanismus: registriereKernArtefakt + validiereLineageEintrag ─
//
// Belegt den Mechanismus, den features/F26/nachweis-ws1.md real gegen einen echten
// Jarvis-Lauf nutzt: ein 'chat-<projektId>'-Artefakt (Checkpoint-Kette 'lineage-chat-
// <projektId>') mit der Nachricht im freien 'daten'-Feld — NICHT in 'eingaben' (das ist für
// Datei-Referenzen mit inhalts_hash reserviert, schemas/kontrollzustand-lineage-payload.schema.json).
{
  const basisVerzeichnis = `kontrollzustand-test-f26-ak-e-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length
  try {
    const projektId = 'check-f26-projekt'
    registriereKernArtefakt(
      `chat-${projektId}`,
      profilReferenz,
      { quelle: 'jarvis-chat' },
      { nachricht: 'Was blockiert mich gerade?', jarvisAntwort: { art: 'antwort', antwort: 'Nichts blockiert aktuell.' } },
      undefined,
      { basisVerzeichnis, schreiber: STILLER_SCHREIBER }
    )
    const eintraege = ladeGueltigeCheckpoints(`lineage-chat-${projektId}`, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
    if (eintraege.length !== 1) {
      befunde.push(`(e): erwartet genau einen Checkpoint-Eintrag unter 'lineage-chat-${projektId}', gefunden ${eintraege.length}`)
    } else {
      const verstoesse = validiereLineageEintrag(eintraege[0])
      if (verstoesse.length > 0) {
        befunde.push(`(e) Grünfall: der geschriebene lineage-chat-Eintrag sollte gegen validiereLineageEintrag gültig sein, verletzt: ${verstoesse.join('; ')}`)
      }
      const daten = eintraege[0].payload.daten
      if (typeof daten.daten?.nachricht !== 'string') {
        befunde.push(`(e): 'daten.daten.nachricht' fehlt oder ist kein String — die Nachricht muss im freien daten-Feld stehen, erhalten ${JSON.stringify(daten)}`)
      }
      if (daten.eingaben !== undefined && daten.eingaben.length !== 0) {
        befunde.push(`(e): 'daten.eingaben' sollte leer sein (die Nachricht gehört nach 'daten', nicht 'eingaben'), erhalten ${JSON.stringify(daten.eingaben)}`)
      }
    }

    // Rotfall (Kalibrierung): ein Eintrag ohne Pflichtfeld 'herkunft' verletzt weiterhin die
    // F1-Hülle bzw. die Lineage-Payload-Form — validiereLineageEintrag meldet das real.
    const kaputterEintrag = {
      ...eintraege[0],
      payload: { ...eintraege[0].payload, daten: { typ: 'lineage', art: 'artefakt_version', artefakt_id: `chat-${projektId}`, erzeugungsart: 'kern', inhalts_hash: 'a'.repeat(64), eingaben: [] } },
    }
    const rotVerstoesse = validiereLineageEintrag(kaputterEintrag)
    if (rotVerstoesse.length === 0) {
      befunde.push("(e) Rotfall: ein Eintrag ohne Pflichtfeld 'herkunft' sollte von validiereLineageEintrag abgelehnt werden")
    }

    if (befunde.length === befundeVor) {
      console.log(
        "✓ (e): registriereKernArtefakt('chat-<projektId>', …) erzeugt einen 'lineage-chat-<projektId>'-Eintrag mit der Nachricht im freien daten-Feld (nicht in eingaben), gültig gegen validiereLineageEintrag; ein Eintrag ohne 'herkunft' wird real abgelehnt."
      )
    }
  } finally {
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (f) POST /api/chat: Auto-Lineage-Write nach realem Laufende (WS-2a) ───
//
// Belegt die in features/F26/feature.md "Bekannte Grenzen" geschlossene Lücke: der
// nachLauf-Callback in POST /api/chat (scripts/leitstand-server.mjs) schreibt automatisch einen
// 'lineage-chat-<projektId>'-Eintrag, sobald fuehreAufgabeDurchFn real ABGESCHLOSSEN/ERFOLGREICH
// meldet — kein externes Glue-Skript mehr nötig (anders als noch beim WS-1-Nachweis,
// scripts/jarvis-chat-nachweis.mjs). fuehreAufgabeDurchFn (erzeugeRequestHandler-Option, Muster
// scripts/check-f22-click-to-work.mjs) ersetzt den echten Kindprozess-Lauf durch eine
// vorbereitete Laufakte + ein synthetisches AusfuehrungsErgebnis — kein echter
// Claude-Code-Kindprozess im automatisierten Gate (WS-1-Entscheidung, unverändert). Testet damit
// zugleich die neue erzeugeRequestHandler-Option 'projektId' UND GET /api/chat (Projektion der
// Checkpoint-Kette) in einem echten HTTP-Rundlauf.
{
  const basisVerzeichnis = `kontrollzustand-test-f26-ak-f-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length
  const projektId = 'check-f26-ws2a'
  const gueltigesErgebnis = JSON.parse(readFileSync('schemas/examples/ergebnis-jarvis.valid.json', 'utf-8'))

  // Steuert je Aufruf, ob die fake fuehreAufgabeDurchFn einen Grün- oder Rotfall simuliert.
  let ergebnisModus = 'erfolgreich'
  const fuehreAufgabeDurchFn = async (laufId) => {
    // Die Laufakte MUSS existieren, bevor der nachLauf-Callback sie lesen kann (Muster des
    // echten F8/fuehreAufgabeDurch) — hier direkt über registriereKernArtefakt geschrieben, mit
    // demselben minimalen Feldsatz, den leseJarvisErgebnisAusLaufakte braucht (worker,
    // rohstrom_referenz.pfad, Muster Abschnitt (d) oben).
    mkdirSync(basisVerzeichnis, { recursive: true })
    const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
    // Muster Abschnitt (d): der Rohstrom liegt unter 'stdout' als STRING (der reale Rohstrom
    // eines claude-code-Laufs), leseRollenErgebnisRohstrom parst diesen erst in einem zweiten
    // Schritt — ein direktes { type, result } ohne 'stdout'-Hülle liefert 'kein Ergebnistext im
    // Rohstrom gefunden' (real beim ersten Kalibrierlauf dieses Abschnitts so aufgetreten).
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(gueltigesErgebnis) }) }), 'utf8')
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f26-fake' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, undefined, {
      basisVerzeichnis,
      schreiber: STILLER_SCHREIBER,
    })
    return { ok: true, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: ergebnisModus === 'erfolgreich' ? 'ERFOLGREICH' : 'FEHLGESCHLAGEN' } }
  }

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId, fuehreAufgabeDurchFn }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    // Grünfall: real ABGESCHLOSSEN/ERFOLGREICH → automatischer, gültiger Lineage-Eintrag, sichtbar über GET /api/chat.
    ergebnisModus = 'erfolgreich'
    const erste = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Status?' }) })
    if (erste.status !== 202) {
      befunde.push(`(f) Grünfall: erwartet 202, erhalten ${erste.status} (${await erste.text()})`)
    }
    // nachLauf läuft synchron im .then-Zweig von fuehreAufgabeDurchFn — 30ms lassen den fake,
    // rein synchronen Promise-Tick sicher durch (Muster check-f22-click-to-work.mjs).
    await new Promise((resolve) => setTimeout(resolve, 30))

    const verlaufNachErfolg = await (await fetch(`${basisUrl}/api/chat`)).json()
    if (verlaufNachErfolg.verlauf.length !== 1 || verlaufNachErfolg.verlauf[0].nachricht !== 'Status?') {
      befunde.push(`(f) Grünfall: GET /api/chat sollte genau einen Eintrag mit der gesendeten Nachricht zeigen, erhalten ${JSON.stringify(verlaufNachErfolg)}`)
    } else {
      const eintraege = ladeGueltigeCheckpoints(`lineage-chat-${projektId}`, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      const verstoesse = eintraege.length === 1 ? validiereLineageEintrag(eintraege[0]) : ['kein einziger Checkpoint-Eintrag gefunden']
      if (verstoesse.length > 0) {
        befunde.push(`(f) Grünfall: der automatisch geschriebene Eintrag sollte gegen validiereLineageEintrag gültig sein, verletzt: ${verstoesse.join('; ')}`)
      }
    }

    // Rotfall: real ABGESCHLOSSEN, aber NICHT ERFOLGREICH → kein automatischer Lineage-Eintrag
    // ('Chat hat keine eigene Wahrheit', nur ein real erfolgreicher Lauf wird Lineage).
    ergebnisModus = 'fehlgeschlagen'
    const zweite = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Noch eine Nachricht' }) })
    if (zweite.status !== 202) {
      befunde.push(`(f) Rotfall: erwartet 202, erhalten ${zweite.status} (${await zweite.text()})`)
    }
    await new Promise((resolve) => setTimeout(resolve, 30))

    const verlaufNachFehlschlag = await (await fetch(`${basisUrl}/api/chat`)).json()
    if (verlaufNachFehlschlag.verlauf.length !== 1) {
      befunde.push(`(f) Rotfall: ein ABGESCHLOSSEN/FEHLGESCHLAGEN beendeter Lauf sollte KEINEN weiteren Lineage-Eintrag erzeugen, GET /api/chat zeigt aber ${verlaufNachFehlschlag.verlauf.length} Einträge`)
    }

    if (befunde.length === befundeVor) {
      console.log(
        "✓ (f): POST /api/chat schreibt nach einem real ABGESCHLOSSEN/ERFOLGREICH beendeten Jarvis-Lauf automatisch einen gültigen 'lineage-chat-<projektId>'-Eintrag (sichtbar über GET /api/chat); ein ABGESCHLOSSEN/FEHLGESCHLAGEN beendeter Lauf schreibt real KEINEN."
      )
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
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
