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
 * fuehreAufgabeDurchFn, GET /api/chat als Projektion. Seit F45 B0 (F-1008)
 * schreibt der Rotfall (FEHLGESCHLAGEN) genau einen als Fehler gekennzeichneten
 * Eintrag (istFehler, fehler.art), keine Antwort. Neu in F45 B0: (g) eigene
 * Chat-Zeitgrenze 180 s (F-1007) samt laufZeitgrenzeMs im Lauf-Detail, (h) fester
 * Chat-Worker claude-code trotz verfügbarem Codex (F-544), (i) Start-Hinweis in
 * GET /api/zustand (F-986 a). Ausführliche Fälle: scripts/leitstand-chat-misserfolg.test.mjs.
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
import { erzeugeRequestHandler, leseJarvisErgebnisAusLaufakte, loeseAusfuehrungsEingabenAuf, vergleicheStartordner } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { wegwerfOrdner } from './_wegwerf.ts'

/** Wegwerf-Wurzel dieses Laufs unter os.tmpdir() (F45 W2b-2), beim Prozessende geräumt. */
const WEGWERF = wegwerfOrdner('f26-jarvis')

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
    { pfad: 'schemas/examples/ergebnis-jarvis.valid-aktion-anpassen.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/ergebnis-jarvis.invalid-aktion-anpassen-mit-workitem.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-jarvis.invalid-aktion-anpassen-ohne-bezug.json', sollGueltigSein: false },
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
    console.log('✓ (b): schemas/ergebnis-jarvis.schema.json gültiges JSON; alle drei valid*.json erfüllen validiereErgebnisJarvis, alle sieben invalid-*.json verletzen je eine benannte Regel.')
  }
}

// ─── (b2) F-423: Schema enthält kein 'allOf'/'if'/'then'/'oneOf' mehr ──────
//
// Codex' '--output-schema' (response_format) lehnt diese vier Schlüsselwörter strukturell ab
// (real gegen Codex-CLI 0.153.4 gespikt, features/F26/nachweis-f423.md) — ein rekursiver Scan
// über das geparste Schema statt eines Textmusters, damit ein Vorkommen in einem verschachtelten
// Unterobjekt (z. B. innerhalb von 'properties.bezug') genauso gefunden wird wie eines auf
// oberster Ebene.
{
  const befundeVor = befunde.length
  const verboteneSchluessel = ['allOf', 'if', 'then', 'oneOf']
  const schema = JSON.parse(readFileSync('schemas/ergebnis-jarvis.schema.json', 'utf-8'))
  // Rekursiver Scan, parametrisiert über das Sammel-Array (D5) — sowohl für den echten Schema-Scan
  // als auch für die Kalibrierung unten verwendet, statt zwei fast identische Kopien zu pflegen.
  const scanne = (knoten, pfad, treffer) => {
    if (Array.isArray(knoten)) {
      knoten.forEach((eintrag, index) => scanne(eintrag, `${pfad}[${index}]`, treffer))
    } else if (knoten !== null && typeof knoten === 'object') {
      for (const [schluessel, wert] of Object.entries(knoten)) {
        if (verboteneSchluessel.includes(schluessel)) treffer.push(`${pfad}.${schluessel}`)
        scanne(wert, `${pfad}.${schluessel}`, treffer)
      }
    }
  }
  const gefundeneTreffer = []
  scanne(schema, '$', gefundeneTreffer)
  if (gefundeneTreffer.length > 0) {
    befunde.push(`(b2): schemas/ergebnis-jarvis.schema.json enthält 'allOf'/'if'/'then'/'oneOf' (Codex-inkompatibel, F-423): ${gefundeneTreffer.join(', ')}`)
  }
  // Kalibrierung: derselbe Scan-Mechanismus MUSS einen konstruierten Treffer finden (eigenes
  // Sammel-Array, damit ein echter Treffer oben nicht mit dem Kalibrierungs-Treffer vermischt wird).
  const kalibrierungsTreffer = []
  scanne({ allOf: [{ if: {}, then: {} }], properties: { x: { oneOf: [] } } }, '$kalibrierung', kalibrierungsTreffer)
  if (kalibrierungsTreffer.length !== 4) {
    befunde.push(`(b2) Kalibrierung: der Scan sollte in einem konstruierten Testobjekt genau 4 Treffer finden (allOf/if/then/oneOf), fand ${kalibrierungsTreffer.length}`)
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (b2): schemas/ergebnis-jarvis.schema.json enthält kein 'allOf'/'if'/'then'/'oneOf' (rekursiver Scan, F-423).")
  }
}

// ─── (b3) F-423: Validator-Kopplungen auch in der Codex-Form (explizites null) ──
//
// Vor F-423 wurden art→auftrag/aktion und aktion.typ 'anpassen'→bezug.auftrag_id nur gegen die
// ALTE Form geprüft (Feld ganz weggelassen). Codex' Structured-Output-Zwang liefert dieselben
// Verstöße real mit dem Feld explizit auf 'null' gesetzt (schemas/ergebnis-jarvis.schema.json
// verlangt 'auftrag'/'aktion'/'bezug' als Pflichtfelder vom Typ ["object","null"]) — ein
// Validator, der nur die alte Form prüft, würde jeden Codex-Lauf fälschlich als gültig
// durchlassen. Rot-/Grünfall-Paare, Muster Kalibrierung oben im Dateikopf.
{
  const befundeVor = befunde.length

  // Rotfall: art 'auftrag_vorschlag', 'auftrag' explizit null (Codex-Form) statt weggelassen.
  const rotAuftragNull = validiereErgebnisJarvis({ art: 'auftrag_vorschlag', antwort: 'x', auftrag: null, aktion: null, bezug: null })
  if (!rotAuftragNull.some((v) => v.includes("'auftrag' fehlt — bei art 'auftrag_vorschlag' Pflicht"))) {
    befunde.push(`(b3) Rotfall (auftrag: null): erwartet Verstoß "'auftrag' fehlt", erhalten ${JSON.stringify(rotAuftragNull)}`)
  }
  // Grünfall: dieselbe Form, aber 'auftrag' real gesetzt.
  const gruenAuftrag = validiereErgebnisJarvis({ art: 'auftrag_vorschlag', antwort: 'x', auftrag: { titel: 't', text: 'x' }, aktion: null, bezug: null })
  if (gruenAuftrag.length > 0) {
    befunde.push(`(b3) Grünfall (auftrag gesetzt, Codex-Form): erwartet keine Verstöße, erhalten ${JSON.stringify(gruenAuftrag)}`)
  }

  // Rotfall: art 'aktion', 'aktion' explizit null.
  const rotAktionNull = validiereErgebnisJarvis({ art: 'aktion', antwort: 'x', auftrag: null, aktion: null, bezug: null })
  if (!rotAktionNull.some((v) => v.includes("'aktion' fehlt — bei art 'aktion' Pflicht"))) {
    befunde.push(`(b3) Rotfall (aktion: null): erwartet Verstoß "'aktion' fehlt", erhalten ${JSON.stringify(rotAktionNull)}`)
  }
  // Grünfall: dieselbe Form, aber 'aktion' real gesetzt (Codex-Form, real gegen den echten Leitstand-
  // Prozess nachgewiesen, features/F26/nachweis-f423.md Teil 2 Abschnitt C).
  const gruenAktion = validiereErgebnisJarvis({ art: 'aktion', antwort: 'x', auftrag: null, aktion: { typ: 'oeffnen', ziel: '#/workboard' }, bezug: null })
  if (gruenAktion.length > 0) {
    befunde.push(`(b3) Grünfall (aktion gesetzt, Codex-Form): erwartet keine Verstöße, erhalten ${JSON.stringify(gruenAktion)}`)
  }

  // Rotfall: aktion.typ 'anpassen', bezug.auftrag_id explizit null (bezug.workitem gesetzt) — Codex-Form.
  const rotAnpassenNull = validiereErgebnisJarvis({
    art: 'aktion',
    antwort: 'x',
    auftrag: null,
    aktion: { typ: 'anpassen', ziel: 'F-1' },
    bezug: { auftrag_id: null, workitem: 'F-1' },
  })
  if (!rotAnpassenNull.some((v) => v.includes("'bezug.auftrag_id' fehlt — bei aktion.typ 'anpassen' Pflicht"))) {
    befunde.push(`(b3) Rotfall (anpassen, auftrag_id: null): erwartet Verstoß "'bezug.auftrag_id' fehlt", erhalten ${JSON.stringify(rotAnpassenNull)}`)
  }
  // Grünfall: dieselbe Form, aber bezug.auftrag_id real gesetzt, bezug.workitem null (Codex-Form).
  const gruenAnpassen = validiereErgebnisJarvis({
    art: 'aktion',
    antwort: 'x',
    auftrag: null,
    aktion: { typ: 'anpassen', ziel: 'auftrag-1' },
    bezug: { auftrag_id: 'auftrag-1', workitem: null },
  })
  if (gruenAnpassen.length > 0) {
    befunde.push(`(b3) Grünfall (anpassen, auftrag_id gesetzt, Codex-Form): erwartet keine Verstöße, erhalten ${JSON.stringify(gruenAnpassen)}`)
  }

  if (befunde.length === befundeVor) {
    console.log("✓ (b3): validiereErgebnisJarvis erzwingt art→auftrag/aktion und aktion.typ 'anpassen'→bezug.auftrag_id auch in der Codex-Form (Feld explizit auf null statt weggelassen).")
  }
}

// ─── (c) POST /api/chat: reale Rot-Fälle der Bodyprüfung ───────────────────
{
  const basisVerzeichnis = join(WEGWERF, `f26-ak-c-${randomUUID()}`)
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
  const basisVerzeichnis = join(WEGWERF, `f26-ak-d-${randomUUID()}`)
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
  const basisVerzeichnis = join(WEGWERF, `f26-ak-e-${randomUUID()}`)
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
  const basisVerzeichnis = join(WEGWERF, `f26-ak-f-${randomUUID()}`)
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

    // Rotfall: real ABGESCHLOSSEN, aber NICHT ERFOLGREICH → seit F45 B0 (F-1008) genau EIN als Fehler
    // gekennzeichneter Eintrag (istFehler, fehler.art), nie eine Antwort — vorher schrieb dieser Fall
    // nichts, und nach Neuladen waren Nachricht und Grund weg.
    ergebnisModus = 'fehlgeschlagen'
    const zweite = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Noch eine Nachricht' }) })
    if (zweite.status !== 202) {
      befunde.push(`(f) Rotfall: erwartet 202, erhalten ${zweite.status} (${await zweite.text()})`)
    }
    await new Promise((resolve) => setTimeout(resolve, 30))

    const verlaufNachFehlschlag = await (await fetch(`${basisUrl}/api/chat`)).json()
    const fehlerEintrag = verlaufNachFehlschlag.verlauf[1]
    if (verlaufNachFehlschlag.verlauf.length !== 2) {
      befunde.push(`(f) Rotfall: ein ABGESCHLOSSEN/FEHLGESCHLAGEN beendeter Lauf sollte GENAU einen weiteren Eintrag (den Fehler-Eintrag) erzeugen, GET /api/chat zeigt aber ${verlaufNachFehlschlag.verlauf.length} Einträge`)
    } else if (verlaufNachFehlschlag.verlauf[0].istFehler !== false) {
      befunde.push(`(f) Grünfall: ein erfolgreicher Eintrag darf nicht als Fehler gekennzeichnet sein, erhalten ${JSON.stringify(verlaufNachFehlschlag.verlauf[0])}`)
    } else if (fehlerEintrag.istFehler !== true || fehlerEintrag.fehler?.art !== 'nicht_erfolgreich' || fehlerEintrag.nachricht !== 'Noch eine Nachricht') {
      befunde.push(`(f) Rotfall: der Eintrag muss als Fehler gekennzeichnet sein (istFehler, fehler.art 'nicht_erfolgreich') und die Nachricht tragen, erhalten ${JSON.stringify(fehlerEintrag)}`)
    } else if (typeof fehlerEintrag.jarvisAntwort?.antwort !== 'string' || !fehlerEintrag.jarvisAntwort.antwort.startsWith('Lauf nicht erfolgreich:')) {
      befunde.push(`(f) Rotfall: der Fehler-Eintrag darf keine Antwort tragen, nur den Fehlertext, erhalten ${JSON.stringify(fehlerEintrag.jarvisAntwort)}`)
    }

    if (befunde.length === befundeVor) {
      console.log(
        "✓ (f): POST /api/chat schreibt nach einem real ABGESCHLOSSEN/ERFOLGREICH beendeten Jarvis-Lauf automatisch einen gültigen 'lineage-chat-<projektId>'-Eintrag (sichtbar über GET /api/chat); ein ABGESCHLOSSEN/FEHLGESCHLAGEN beendeter Lauf schreibt genau einen als Fehler gekennzeichneten Eintrag, keine Antwort (F45 B0, F-1008)."
      )
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (g)/(h) F45 B0: eigene Chat-Zeitgrenze (F-1007) und fester Chat-Worker (F-544) ───
//
// Rot gegen den Stand vor F45 B0: dort erbte ein Chat-Lauf zeitgrenzeMs der Startvorlage (mit
// startvorlagen/ai-workforce.json 1 800 000) und lief auf Codex, sobald die Startvorlage Codex
// verfügbar machte. Grün: zeitgrenzeMs 180 000 am Lauf, laufZeitgrenzeMs 180 000 im Lauf-Detail,
// worker claude-code (fehlendes Feld) ohne Ausgabe-Schema.
{
  const basisVerzeichnis = join(WEGWERF, `f26-f45-${randomUUID()}`)
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length
  let gesehen = null
  const fuehreAufgabeDurchFn = async (laufId, profil, eingaben, optionen) => {
    gesehen = { laufId, eingaben, zeitgrenzeMs: optionen.zeitgrenzeMs }
    mkdirSync(join(basisVerzeichnis, laufId), { recursive: true })
    return { ok: true, klassifikation: { ergebnis: 'FEHLGESCHLAGEN', grund: 'timeout' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' } }
  }
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId: 'check-f26-f45', startvorlagePfad: 'startvorlagen/ai-workforce.json', fuehreAufgabeDurchFn }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const basisUrl = `http://127.0.0.1:${server.address().port}`
  try {
    const antwort = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Zeitgrenze?' }) })
    await new Promise((resolve) => setTimeout(resolve, 30))
    if (antwort.status !== 202 || gesehen === null) {
      befunde.push(`(g) erwartet 202 und einen Laufstart, erhalten ${antwort.status}`)
    } else {
      if (gesehen.zeitgrenzeMs !== 180_000) befunde.push(`(g) Chat-Lauf muss mit zeitgrenzeMs 180000 starten (nicht die 1800000 der Startvorlage), erhalten ${gesehen.zeitgrenzeMs}`)
      const detail = await (await fetch(`${basisUrl}/api/laeufe/${gesehen.laufId}`)).json()
      if (detail.laufZeitgrenzeMs !== 180_000) befunde.push(`(g) GET /api/laeufe/<laufId> muss laufZeitgrenzeMs 180000 melden, erhalten ${detail.laufZeitgrenzeMs}`)
      const verlauf = (await (await fetch(`${basisUrl}/api/chat`)).json()).verlauf
      if (verlauf.length !== 1 || verlauf[0].fehler?.art !== 'zeitgrenze') befunde.push(`(g) ein an der Zeitgrenze beendeter Lauf muss genau einen Fehler-Eintrag 'zeitgrenze' schreiben, erhalten ${JSON.stringify(verlauf)}`)
      if ((gesehen.eingaben.worker ?? 'claude-code') !== 'claude-code' || gesehen.eingaben.ausgabeSchemaPfad !== undefined) {
        befunde.push(`(h) Chat-Worker muss claude-code sein, auch wenn die Startvorlage Codex verfügbar macht, erhalten worker ${gesehen.eingaben.worker}, ausgabeSchemaPfad ${gesehen.eingaben.ausgabeSchemaPfad}`)
      }
    }
    if (befunde.length === befundeVor) {
      console.log('✓ (g)/(h): Chat-Lauf startet mit eigener Zeitgrenze 180 s (laufZeitgrenzeMs im Detail, Fehler-Eintrag an der Grenze) und fest auf claude-code — auch mit startvorlagen/ai-workforce.json (Codex verfügbar).')
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (i) F45 B0: Start-Hinweis (F-986 a) ────────────────────────────────────
//
// Rot: ein Pfad ungleich dem nachgewiesenen ergibt einen Hinweis mit beiden Pfaden; Grün: derselbe
// Pfad in anderer Schreibweise (Trenner, Groß-/Kleinschreibung — Normalisierung wie E-188) ergibt
// keinen. GET /api/zustand trägt den Hinweis lesend.
{
  const befundeVor = befunde.length
  const soll = 'C:\\Users\\stefa\\Projekte\\ai-workforce'
  if (vergleicheStartordner('c:/users/stefa/projekte/ai-workforce', soll) !== null) befunde.push('(i) Grünfall: gleiche Pfade in anderer Schreibweise dürfen keinen Start-Hinweis erzeugen')
  const hinweis = vergleicheStartordner('C:\\Users\\stefa\\Projekte\\aiw-main-ansicht', soll)
  if (hinweis?.art !== 'falscherOrdner' || hinweis.sollPfad !== soll) befunde.push(`(i) Rotfall: abweichender Ordner muss einen Start-Hinweis mit beiden Pfaden erzeugen, erhalten ${JSON.stringify(hinweis)}`)
  const basisVerzeichnis = join(WEGWERF, `f26-f45i-${randomUUID()}`)
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, startHinweis: hinweis }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const zustand = await (await fetch(`http://127.0.0.1:${server.address().port}/api/zustand`)).json()
    if (JSON.stringify(zustand.startHinweis) !== JSON.stringify(hinweis)) befunde.push(`(i) GET /api/zustand muss startHinweis tragen, erhalten ${JSON.stringify(zustand.startHinweis)}`)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
  if (befunde.length === befundeVor) console.log('✓ (i): Start-Hinweis bei abweichendem Ordner (Normalisierung wie E-188), lesend in GET /api/zustand.')
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
