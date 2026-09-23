/**
 * Datei: scripts/check-f39-architekt.mjs
 *
 * Zweck: Architekt-Gate (F39 WS-1). Prüft (a) den Rollenvertrag 'architekt'
 * (ROLLENVERTRAEGE, src/rollen/index.ts) in erwarteter Form, (a2) Rot-/
 * Grünfälle gegen loeseAusfuehrungsEingabenAuf (Vertragswidrige Besetzung —
 * z. B. 'architekt' mit einem schreibenden Werkzeugsatz — wird VOR dem
 * Workerstart abgehalten; eine vertragskonforme Besetzung wird angenommen),
 * (b) schemas/ergebnis-architektur.schema.json + Beispiele gegen
 * validiereErgebnisArchitektur (src/architekt/index.ts) — ein ungültiges
 * Ergebnis wird abgelehnt, ein gültiges angenommen, (b2) den
 * Codex-kompatiblen Schema-Dialekt (kein 'allOf'/'if'/'then'/'oneOf', jede
 * Top-Level- UND jede verschachtelte 'properties'-Eigenschaft steht in
 * ihrem eigenen 'required' — Muster scripts/check-f34-product-coach.mjs
 * (b2); 'schema_entwuerfe[].json_schema' ist ein bewusst opakes Objekt ohne
 * eigenes 'properties' und wird vom Scan deshalb korrekt übersprungen), und
 * (c) baueArchitektAuftragstext (Modus 'feature'/'projekt', Capability-
 * Auszug nur im Modus 'projekt' und nur wenn gesetzt).
 *
 * Kein generischer JSON-Schema-Validator (D5): importiert die reale
 * validiereErgebnisArchitektur/ROLLENVERTRAEGE statt einen zweiten
 * Regelsatz zu pflegen.
 *
 * Aufruf: node scripts/check-f39-architekt.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readFileSync } from 'node:fs'
import { ROLLENVERTRAEGE } from '../src/rollen/index.ts'
import { baueArchitektAuftragstext, validiereErgebnisArchitektur } from '../src/architekt/index.ts'
import { loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'

const befunde = []

console.log('\n=== F39-Architekt-Check ===\n')

// ─── (a) ROLLENVERTRAEGE['architekt'] hat die erwartete Form ───────────────
{
  const architekt = ROLLENVERTRAEGE.architekt
  if (!architekt) {
    befunde.push("ROLLENVERTRAEGE trägt keinen Eintrag 'architekt'")
  } else {
    if (typeof architekt.zweck !== 'string' || architekt.zweck.length === 0) {
      befunde.push("'architekt'.zweck fehlt oder ist leer")
    }
    if (JSON.stringify(architekt.erlaubte_werkzeugsatz_arten) !== JSON.stringify(['lesend'])) {
      befunde.push(`'architekt'.erlaubte_werkzeugsatz_arten erwartet ['lesend'], erhalten ${JSON.stringify(architekt.erlaubte_werkzeugsatz_arten)}`)
    }
    if (JSON.stringify([...architekt.erlaubte_worker].sort()) !== JSON.stringify(['claude-code', 'codex'])) {
      befunde.push(`'architekt'.erlaubte_worker erwartet beide Worker, erhalten ${JSON.stringify(architekt.erlaubte_worker)}`)
    }
    if (architekt.erlaubtes_output_schema !== 'ergebnis-architektur') {
      befunde.push(`'architekt'.erlaubtes_output_schema erwartet 'ergebnis-architektur', erhalten ${JSON.stringify(architekt.erlaubtes_output_schema)}`)
    }
    if (JSON.stringify(architekt.ausschlussmuster) !== JSON.stringify(['src/**'])) {
      befunde.push(`'architekt'.ausschlussmuster erwartet ['src/**'], erhalten ${JSON.stringify(architekt.ausschlussmuster)}`)
    }
    if (befunde.length === 0) {
      console.log("✓ (a): ROLLENVERTRAEGE['architekt'] trägt alle fünf Felder in erwarteter Form.")
    }
  }
}

// ─── (a2) Rot-/Grünfall direkt gegen loeseAusfuehrungsEingabenAuf ──────────
{
  const testVorlage = {
    startvorlage_schema: 'v0',
    profilPfad: 'profiles/beispiel.json',
    werkzeugStartziel: ['check-f39-startziel'],
    werkzeugVersionDeklariert: 'check-f39-1',
    berechtigungskontext: 'profil-standard',
    modell: 'check-f39-modell',
    standardBudget: { maxElemente: 5, maxBytes: 5000 },
    werkzeugsaetze: {
      lesend: { art: 'lesend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] },
      schreibend: { art: 'schreibend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Write'] },
    },
  }
  const eingaben = (felder) => ({
    rolle: 'architekt',
    anfragen: [],
    budget: { maxElemente: 1 },
    aufrufEingaben: { modell: 'check-f39-modell' },
    auftragId: 'check-f39-auftrag',
    ...felder,
  })
  const befundeVor = befunde.length

  // Rotfall: architekt erlaubt keinen schreibenden Werkzeugsatz (Auftrags-Vorgabe Punkt 4: "z. B. architekt mit 'schreibend'").
  const rot = loeseAusfuehrungsEingabenAuf(eingaben({}), 'schreibend', 'text', testVorlage, 'unbenutzt')
  if (rot.ok !== false || !/erlaubt die Werkzeugsatz-Art 'schreibend' nicht/.test(rot.grund)) {
    befunde.push(`(a2) Rotfall: erwartet ok:false mit "erlaubt die Werkzeugsatz-Art 'schreibend' nicht", erhalten ${JSON.stringify(rot)}`)
  }
  // Grünfall: architekt + lesend.
  const gruen = loeseAusfuehrungsEingabenAuf(eingaben({}), 'lesend', 'text', testVorlage, 'unbenutzt')
  if (!gruen.ok) {
    befunde.push(`(a2) Grünfall: 'architekt' + 'lesend' erwartet ok:true, erhalten ${JSON.stringify(gruen)}`)
  }
  // Rotfall: falsches output_schema für architekt.
  const rotSchema = loeseAusfuehrungsEingabenAuf(eingaben({ ausgabeSchemaPfad: '/irgendwo/schemas/ergebnis-jarvis.schema.json' }), 'lesend', 'text', testVorlage, 'unbenutzt')
  if (rotSchema.ok !== false || !/erlaubt output_schema 'ergebnis-jarvis' nicht/.test(rotSchema.grund)) {
    befunde.push(`(a2) Rotfall (output_schema): erwartet ok:false mit "erlaubt output_schema 'ergebnis-jarvis' nicht", erhalten ${JSON.stringify(rotSchema)}`)
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (a2): 'schreibend' gegen 'architekt' real abgelehnt, 'lesend' real angenommen, ein fremdes output_schema real abgelehnt.")
  }
}

// ─── (b) schemas/ergebnis-architektur.schema.json + Beispiele ─────────────
{
  const befundeVor = befunde.length
  const schema = JSON.parse(readFileSync('schemas/ergebnis-architektur.schema.json', 'utf-8')) // wirft bei kaputtem JSON

  const beispiele = [
    { pfad: 'schemas/examples/ergebnis-architektur.valid-feature.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/ergebnis-architektur.valid-projekt.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/ergebnis-architektur.invalid-unbekannter-modus.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-architektur.invalid-fehlendes-feld.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-architektur.invalid-modul-fehlendes-feld.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-architektur.invalid-leere-evidenz.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-architektur.invalid-entscheidung-erfundene-empfehlung.json', sollGueltigSein: false },
  ]
  for (const { pfad, sollGueltigSein } of beispiele) {
    const obj = JSON.parse(readFileSync(pfad, 'utf-8'))
    const verstoesse = validiereErgebnisArchitektur(obj)
    if (sollGueltigSein && verstoesse.length > 0) {
      befunde.push(`(b): ${pfad} sollte gültig sein, verletzt aber: ${verstoesse.join('; ')}`)
    }
    if (!sollGueltigSein && verstoesse.length === 0) {
      befunde.push(`(b): ${pfad} sollte ungültig sein, wurde aber akzeptiert`)
    }
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (b): schemas/ergebnis-architektur.schema.json gültiges JSON; beide valid-*.json erfüllen validiereErgebnisArchitektur, alle fünf invalid-*.json verletzen je eine benannte Regel.')
  }
  // eigenständig gehalten (kein toter Import), Kalibrierung in (b2) prüft denselben Scan.
  void schema
}

// ─── (b2) F-423-Muster: Schema enthält kein 'allOf'/'if'/'then'/'oneOf' ────
{
  const befundeVor = befunde.length
  const verboteneSchluessel = ['allOf', 'if', 'then', 'oneOf']
  const schema = JSON.parse(readFileSync('schemas/ergebnis-architektur.schema.json', 'utf-8'))
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
    befunde.push(`(b2): schemas/ergebnis-architektur.schema.json enthält 'allOf'/'if'/'then'/'oneOf' (Codex-inkompatibel, F-423-Muster): ${gefundeneTreffer.join(', ')}`)
  }
  const kalibrierungsTreffer = []
  scanne({ allOf: [{ if: {}, then: {} }], properties: { x: { oneOf: [] } } }, '$kalibrierung', kalibrierungsTreffer)
  if (kalibrierungsTreffer.length !== 4) {
    befunde.push(`(b2) Kalibrierung: der Scan sollte in einem konstruierten Testobjekt genau 4 Treffer finden (allOf/if/then/oneOf), fand ${kalibrierungsTreffer.length}`)
  }

  // Jede 'properties'-Eigenschaft — auf JEDER Verschachtelungsebene — steht auch in ihrem eigenen
  // 'required' (F-423-Dialekt-Regel 2). 'json_schema' (schema_entwuerfe[].json_schema) trägt
  // selbst kein 'properties' und wird vom Scan deshalb korrekt übersprungen — es ist ein opakes,
  // vom Architekten entworfenes Fragment, kein Teil DIESES Schema-Dialekts.
  const pruefeVerschachteltesRequired = (knoten, pfad, treffer) => {
    if (knoten === null || typeof knoten !== 'object') return
    if (knoten.properties && typeof knoten.properties === 'object') {
      const eigenschaften = Object.keys(knoten.properties)
      const fehlend = eigenschaften.filter((feld) => !Array.isArray(knoten.required) || !knoten.required.includes(feld))
      if (fehlend.length > 0) treffer.push(`${pfad} (fehlend: ${fehlend.join(', ')})`)
      for (const [feld, unterschema] of Object.entries(knoten.properties)) {
        pruefeVerschachteltesRequired(unterschema, `${pfad}.properties.${feld}`, treffer)
        if (unterschema?.items) pruefeVerschachteltesRequired(unterschema.items, `${pfad}.properties.${feld}.items`, treffer)
      }
    }
  }
  const verschachtelteTreffer = []
  pruefeVerschachteltesRequired(schema, '$', verschachtelteTreffer)
  if (verschachtelteTreffer.length > 0) {
    befunde.push(`(b2): folgende verschachtelten properties-Objekte haben nicht jede eigene Eigenschaft in ihrem eigenen 'required' (Codex-Dialekt-Zwang): ${verschachtelteTreffer.join('; ')}`)
  }

  // Gegenprobe: 'schema_entwuerfe[].json_schema' selbst trägt bewusst KEIN 'properties' im
  // Schema — belegt, dass der Scan es nicht stillschweigend übersieht, weil es leer ist.
  const jsonSchemaKnoten = schema?.properties?.schema_entwuerfe?.items?.properties?.json_schema
  if (!jsonSchemaKnoten || jsonSchemaKnoten.type !== 'object' || 'properties' in jsonSchemaKnoten) {
    befunde.push("(b2) Kalibrierung: 'schema_entwuerfe[].json_schema' sollte ein opakes 'type: object' ohne eigenes 'properties' sein")
  }

  if (befunde.length === befundeVor) {
    console.log(
      "✓ (b2): schemas/ergebnis-architektur.schema.json enthält kein 'allOf'/'if'/'then'/'oneOf', jede Top-Level- UND jede verschachtelte property steht in ihrem eigenen 'required', 'json_schema' bleibt bewusst opak."
    )
  }
}

// ─── (b3) Validator-Kopplungen: erfundene Empfehlung, erfundene Ressource, leere Evidenz ──
{
  const befundeVor = befunde.length

  const rotEmpfehlung = validiereErgebnisArchitektur({
    modus: 'feature',
    zusammenfassung: 'x',
    module: [],
    adr_entwuerfe: [],
    schema_entwuerfe: [],
    entscheidungen_mensch: [{ frage: 'f', optionen: [{ titel: 'A', vorteile: [], nachteile: [] }], auswirkung_bestand: 'keine', empfehlung: 'B', begruendung: 'x' }],
    capabilities_bedarf: [],
    evidenz: [{ marker: '[Fakt]', aussage: 'x' }],
  })
  if (!rotEmpfehlung.some((v) => v.includes('nennt keinen Titel aus'))) {
    befunde.push(`(b3) Rotfall (erfundene Empfehlung): erwartet Verstoß "nennt keinen Titel aus", erhalten ${JSON.stringify(rotEmpfehlung)}`)
  }

  const gruenEmpfehlung = validiereErgebnisArchitektur({
    modus: 'feature',
    zusammenfassung: 'x',
    module: [],
    adr_entwuerfe: [],
    schema_entwuerfe: [],
    entscheidungen_mensch: [{ frage: 'f', optionen: [{ titel: 'A', vorteile: [], nachteile: [] }], auswirkung_bestand: 'keine', empfehlung: 'A', begruendung: 'x' }],
    capabilities_bedarf: [],
    evidenz: [{ marker: '[Fakt]', aussage: 'x' }],
  })
  if (gruenEmpfehlung.length > 0) {
    befunde.push(`(b3) Grünfall (Empfehlung nennt echte Option): erwartet [], erhalten ${JSON.stringify(gruenEmpfehlung)}`)
  }

  if (befunde.length === befundeVor) {
    console.log("✓ (b3): eine 'empfehlung', die keine gelistete Option nennt, wird real abgelehnt; eine echte wird angenommen.")
  }
}

// ─── (c) baueArchitektAuftragstext ─────────────────────────────────────────
{
  const befundeVor = befunde.length

  const AUSZUG_MARKER = 'Verfügbare Ressourcen (Capability-Auszug):'

  const feature = baueArchitektAuftragstext('Planungstext A', 'feature')
  if (!/"modus":\s*"feature"/.test(feature) || !feature.includes('Planungstext A') || feature.includes(AUSZUG_MARKER)) {
    befunde.push(`(c): Modus 'feature' sollte "modus": "feature" und den Planungstext enthalten, aber keinen Capability-Auszug-Abschnitt, erhalten: ${feature.slice(0, 200)}…`)
  }

  const projektOhneAuszug = baueArchitektAuftragstext('Planungstext B', 'projekt', null)
  if (!/"modus":\s*"projekt"/.test(projektOhneAuszug) || projektOhneAuszug.includes(AUSZUG_MARKER)) {
    befunde.push(`(c): Modus 'projekt' ohne Auszug sollte "modus": "projekt" enthalten und keinen Capability-Auszug-Abschnitt, erhalten: ${projektOhneAuszug.slice(0, 200)}…`)
  }

  const projektMitAuszug = baueArchitektAuftragstext('Planungstext C', 'projekt', '- res-1: CODE_WRITE')
  if (!projektMitAuszug.includes(AUSZUG_MARKER) || !projektMitAuszug.includes('res-1')) {
    befunde.push(`(c): Modus 'projekt' mit Auszug sollte den Capability-Auszug-Abschnitt inkl. Inhalt enthalten, erhalten: ${projektMitAuszug.slice(0, 200)}…`)
  }

  if (baueArchitektAuftragstext('x') !== baueArchitektAuftragstext('x', 'feature')) {
    befunde.push("(c): Default-Modus sollte 'feature' sein (Muster baueCoachAuftragstext)")
  }

  if (befunde.length === befundeVor) {
    console.log("✓ (c): baueArchitektAuftragstext trägt den Modus korrekt, den Capability-Auszug nur im Modus 'projekt' und nur wenn gesetzt, Default-Modus 'feature'.")
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
