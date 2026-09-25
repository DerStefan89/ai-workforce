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
 * Ergebnis wird abgelehnt, ein gültiges angenommen (inkl. F-638/Regel 1c:
 * 'schema_entwuerfe[].json_schema' als String, der kein gültiges JSON ist),
 * (b2) den Codex-kompatiblen Schema-Dialekt (kein 'allOf'/'if'/'then'/'oneOf',
 * jede Top-Level- UND jede verschachtelte 'properties'-Eigenschaft steht in
 * ihrem eigenen 'required' — Muster scripts/check-f34-product-coach.mjs
 * (b2); 'schema_entwuerfe[].json_schema' ist seit F-638 ein String, kein
 * Objekt, und wird vom 'properties'-Scan deshalb korrekt übersprungen), und
 * (c) baueArchitektAuftragstext (Modus 'feature'/'projekt', Capability-
 * Auszug nur im Modus 'projekt' und nur wenn gesetzt).
 *
 * F39 WS-2a (löst state/findings.md F-632 Teil a und F-633) ergänzt: (d) das
 * optionale Herkunftsfeld eines Auftrags (validiereAuftragHerkunft,
 * src/auftrag/index.ts) — Rot-/Grünfall, importiert statt zweiter
 * Regelsatz —, (e) die deterministische Kontrolltiefe-Untergrenze
 * (bestimmeEffektiveKontrolltiefe/waehleWorkflowVorlage, src/router/
 * index.ts): 'projekt_interview' hebt 'standard' auf 'hoch' an, jede andere
 * Herkunft (inkl. keiner) bleibt unverändert, (f) die Struktur von
 * workflow-vorlagen/hoch.json (Rolle 'architekt' vor der Rolle
 * 'architecture-advisor', Eingaben/Platzhalter korrekt gesetzt), (g) den
 * neuen Eingabe-Platzhalter 'ergebnis-@<schrittId>'
 * (loeseSchrittEingabenAuf, scripts/leitstand-server.mjs) — dieselben drei
 * Schutzregeln wie beim bestehenden 'aenderungsuebersicht-@' (Selbstverweis,
 * unbekannte schritt_id, nicht gestartet), direkt gegen die reine Funktion
 * geprüft (Muster scripts/check-f23-abnahme.mjs (b), kein HTTP-Server
 * nötig), plus ein realer Grünfall mit einer manuell registrierten
 * Laufakte/Rohstrom-Fixture, und (h) dass workflow-vorlagen/fast-lane.json
 * unverändert keinen 'architekt'-Schritt trägt.
 *
 * Kein generischer JSON-Schema-Validator (D5): importiert die reale
 * validiereErgebnisArchitektur/ROLLENVERTRAEGE statt einen zweiten
 * Regelsatz zu pflegen.
 *
 * F39 WS-3a (löst state/findings.md F-635, P1): (n1)/(n2) prüfen, dass der
 * REALE Schrittstart-Pfad (POST /api/workflows/<id>/starten ->
 * starteWorkflowSchritt, scripts/leitstand-server.mjs) — nicht nur
 * baueArchitektAuftragstext selbst (bereits (c)) — den Auftragstext eines
 * 'architekt'-Schritts real umhüllt, für beide Modi ('feature' ohne
 * Herkunft, 'projekt' bei herkunft.art 'projekt_interview'). Muster
 * check-f15-workflow.mjs (WS-2b-Block): fuehreAufgabeDurchFn ist eine
 * Attrappe, die den tatsächlich an den Worker gereichten
 * AusfuehrungsEingaben.auftragstext abfängt — kein echter
 * Claude-Code-/Codex-Prozessstart nötig, das Gate prüft den Automatenpfad.
 * (n3)/(n4) (F42 WS-2 Verifikation, löst F-707, BUG P1): derselbe reale
 * Schrittstart-Pfad gab 'istStackOffen(repoWurzel)' bislang NICHT an
 * baueArchitektAuftragstext weiter (Zeile ~4156) — stackOffen blieb beim
 * Default 'false', STACK_OFFEN_HINWEIS erreichte den Architekten also NIE,
 * obwohl der Validator (leseArchitekturErgebnisAusLaufakte) bei offenem
 * Stack bereits eine 'kategorie: stack'-Entscheidung verlangte. (n3) belegt
 * das Nicht-Vorkommen des Hinweises gegen DIESES Repo (Stack gefüllt,
 * derselbe Server wie (n1)/(n2)); (n4) startet einen ZWEITEN, eigenen
 * Server mit einer Wegwerf-repoWurzel OHNE CLAUDE.md (istStackOffen dafür
 * true) und belegt, dass der Hinweis dort real im an den Worker gereichten
 * Auftragstext ankommt (repoWurzel lässt sich nur bei der Server-Erzeugung
 * setzen, nicht mehr pro Request — deshalb ein separater Server statt
 * eines dritten Aufrufs über denselben).
 *
 * Aufruf: node scripts/check-f39-architekt.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ROLLENVERTRAEGE } from '../src/rollen/index.ts'
import { baueArchitektAuftragstext, baueUmsetzungsInstruktion, validiereErgebnisArchitektur } from '../src/architekt/index.ts'
import { validiereAuftragHerkunft } from '../src/auftrag/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { bestimmeEffektiveKontrolltiefe, waehleWorkflowVorlage } from '../src/router/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { ermittleNaechstenSchritt, registriereWorkflow } from '../src/workflow/index.ts'
import { pruefeAntwortenGegenFragen } from '../src/workflow-entscheidung/index.ts'
import { findeWorkflowEntscheidungFuerSchritt, pruefeWorkflowEntscheidungsformular, registriereWorkflowEntscheidung } from './leitstand/routen-f39.mjs'
import { erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf, loeseSchrittEingabenAuf, pruefeAuftragsformular } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

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
    { pfad: 'schemas/examples/ergebnis-architektur.invalid-json-schema-kein-json.json', sollGueltigSein: false },
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
  // 'required' (F-423-Dialekt-Regel 2). 'json_schema' (schema_entwuerfe[].json_schema) ist seit
  // F-638 ein String, trägt also kein eigenes 'properties' und wird vom Scan deshalb korrekt
  // übersprungen — der JSON-Text darin ist ein vom Architekten entworfenes Fragment, kein Teil
  // DIESES Schema-Dialekts.
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

  // Gegenprobe: 'schema_entwuerfe[].json_schema' ist seit F-638 ein STRING (JSON-Text), kein
  // verschachteltes Objekt mehr — belegt, dass der Scan es nicht stillschweigend übersieht, weil
  // es (fälschlich) wieder ein Objekt ohne 'properties' wäre.
  const jsonSchemaKnoten = schema?.properties?.schema_entwuerfe?.items?.properties?.json_schema
  if (!jsonSchemaKnoten || jsonSchemaKnoten.type !== 'string') {
    befunde.push("(b2) Kalibrierung: 'schema_entwuerfe[].json_schema' sollte seit F-638 'type: string' sein, kein verschachteltes Objekt")
  }

  if (befunde.length === befundeVor) {
    console.log(
      "✓ (b2): schemas/ergebnis-architektur.schema.json enthält kein 'allOf'/'if'/'then'/'oneOf', jede Top-Level- UND jede verschachtelte property steht in ihrem eigenen 'required', 'json_schema' ist seit F-638 ein String."
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

// ─── (d) F39 WS-2a: validiereAuftragHerkunft (Rot-/Grünfall) + pruefeAuftragsformular ──────
{
  const befundeVor = befunde.length

  const gruen = validiereAuftragHerkunft({ art: 'projekt_interview' })
  if (gruen.length > 0) {
    befunde.push(`(d) Grünfall validiereAuftragHerkunft: erwartet [], erhalten ${JSON.stringify(gruen)}`)
  }
  const rotArt = validiereAuftragHerkunft({ art: 'erfunden' })
  if (!rotArt.some((v) => v.includes("'herkunft.art' muss einer von"))) {
    befunde.push(`(d) Rotfall validiereAuftragHerkunft (unbekannte art): erwartet Verstoß "'herkunft.art' muss einer von", erhalten ${JSON.stringify(rotArt)}`)
  }
  const rotFremdfeld = validiereAuftragHerkunft({ art: 'sparring', quelle: 'sollte verboten sein' })
  if (!rotFremdfeld.some((v) => v.includes("unbekanntes Feld 'herkunft.quelle'"))) {
    befunde.push(`(d) Rotfall validiereAuftragHerkunft (Fremdfeld): erwartet Verstoß "unbekanntes Feld 'herkunft.quelle'", erhalten ${JSON.stringify(rotFremdfeld)}`)
  }

  // pruefeAuftragsformular (scripts/leitstand-server.mjs): 'herkunft' optional, unbekannte
  // 'art' → 400 (ok:false), reicht eine gültige Herkunft unverändert durch.
  const formGruenMitHerkunft = pruefeAuftragsformular({ titel: 'T', auftragstext: 'X', herkunft: { art: 'jarvis' } })
  if (formGruenMitHerkunft.ok !== true || JSON.stringify(formGruenMitHerkunft.herkunft) !== JSON.stringify({ art: 'jarvis' })) {
    befunde.push(`(d) pruefeAuftragsformular Grünfall (mit herkunft): erwartet ok:true mit herkunft durchgereicht, erhalten ${JSON.stringify(formGruenMitHerkunft)}`)
  }
  const formGruenOhneHerkunft = pruefeAuftragsformular({ titel: 'T', auftragstext: 'X' })
  if (formGruenOhneHerkunft.ok !== true || 'herkunft' in formGruenOhneHerkunft) {
    befunde.push(`(d) pruefeAuftragsformular Grünfall (ohne herkunft): erwartet ok:true ohne 'herkunft'-Feld (Alt-Verhalten unverändert), erhalten ${JSON.stringify(formGruenOhneHerkunft)}`)
  }
  const formRot = pruefeAuftragsformular({ titel: 'T', auftragstext: 'X', herkunft: { art: 'erfunden' } })
  if (formRot.ok !== false) {
    befunde.push(`(d) pruefeAuftragsformular Rotfall (unbekannte herkunft.art): erwartet ok:false, erhalten ${JSON.stringify(formRot)}`)
  }

  if (befunde.length === befundeVor) {
    console.log("✓ (d): validiereAuftragHerkunft akzeptiert eine gültige Herkunft, lehnt eine unbekannte 'art' und ein Fremdfeld ab; pruefeAuftragsformular reicht 'herkunft' optional durch und lehnt eine unbekannte 'art' mit ok:false ab.")
  }
}

// ─── (e) F39 WS-2a: deterministische Kontrolltiefe-Untergrenze ────────────────────────────
{
  const befundeVor = befunde.length

  // (e1) bestimmeEffektiveKontrolltiefe: nur anheben, nie senken.
  const faelle = [
    { kontrolltiefe: 'standard', herkunftArt: 'projekt_interview', erwartet: { kontrolltiefe: 'hoch', angehoben: true } },
    { kontrolltiefe: 'fast-lane', herkunftArt: 'projekt_interview', erwartet: { kontrolltiefe: 'hoch', angehoben: true } },
    { kontrolltiefe: 'hoch', herkunftArt: 'projekt_interview', erwartet: { kontrolltiefe: 'hoch', angehoben: false } },
    { kontrolltiefe: 'standard', herkunftArt: 'sparring', erwartet: { kontrolltiefe: 'standard', angehoben: false } },
    { kontrolltiefe: 'standard', herkunftArt: 'jarvis', erwartet: { kontrolltiefe: 'standard', angehoben: false } },
    { kontrolltiefe: 'standard', herkunftArt: 'manuell', erwartet: { kontrolltiefe: 'standard', angehoben: false } },
    { kontrolltiefe: 'fast-lane', herkunftArt: undefined, erwartet: { kontrolltiefe: 'fast-lane', angehoben: false } },
    { kontrolltiefe: 'fast-lane', herkunftArt: null, erwartet: { kontrolltiefe: 'fast-lane', angehoben: false } },
  ]
  for (const fall of faelle) {
    const ergebnis = bestimmeEffektiveKontrolltiefe(fall.kontrolltiefe, fall.herkunftArt)
    if (JSON.stringify(ergebnis) !== JSON.stringify(fall.erwartet)) {
      befunde.push(`(e1) bestimmeEffektiveKontrolltiefe(${fall.kontrolltiefe}, ${JSON.stringify(fall.herkunftArt)}): erwartet ${JSON.stringify(fall.erwartet)}, erhalten ${JSON.stringify(ergebnis)}`)
    }
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (e1): bestimmeEffektiveKontrolltiefe hebt NUR bei herkunft 'projekt_interview' auf mindestens 'hoch' an, senkt nie, lässt jede andere Herkunft (inkl. keiner) unverändert.")
  }

  // (e2) waehleWorkflowVorlage: die Anhebung wählt real workflow-vorlagen/hoch.json (Schritt
  // 'architekt' vorhanden) statt standard.json, und hängt den Hinweis an 'ziel' an.
  const befundeVorE2 = befunde.length
  const klassifikationStandard = { kontrolltiefe: 'standard', risikoklasse: 'mittel', task_typen: ['neues-feature'], rueckfragen: [], begruendung: 'Testfixture.' }
  const angehoben = waehleWorkflowVorlage(klassifikationStandard, 'gate-f39-e2', 'Testziel', process.cwd(), 'projekt_interview')
  if (!angehoben.schritte.some((s) => s.rolle === 'architekt')) {
    befunde.push(`(e2) waehleWorkflowVorlage mit herkunft 'projekt_interview' + kontrolltiefe 'standard' sollte hoch.json (mit 'architekt'-Schritt) laden, erhalten Schritte: ${JSON.stringify(angehoben.schritte.map((s) => s.rolle))}`)
  }
  if (!angehoben.ziel.includes('Untergrenze hoch wegen herkunft projekt_interview')) {
    befunde.push(`(e2) waehleWorkflowVorlage sollte die Anhebung sichtbar im 'ziel' vermerken, erhalten: ${JSON.stringify(angehoben.ziel)}`)
  }
  const unveraendert = waehleWorkflowVorlage(klassifikationStandard, 'gate-f39-e2b', 'Testziel', process.cwd(), 'sparring')
  if (unveraendert.schritte.some((s) => s.rolle === 'architekt') || unveraendert.ziel !== 'Testziel') {
    befunde.push(`(e2) waehleWorkflowVorlage mit herkunft 'sparring' sollte UNVERÄNDERT 'standard' wählen (kein 'architekt'-Schritt, ziel unverändert), erhalten: ${JSON.stringify({ rollen: unveraendert.schritte.map((s) => s.rolle), ziel: unveraendert.ziel })}`)
  }
  const ohneHerkunft = waehleWorkflowVorlage(klassifikationStandard, 'gate-f39-e2c', 'Testziel', process.cwd())
  if (JSON.stringify(ohneHerkunft) !== JSON.stringify(unveraendert).replace(/gate-f39-e2b/g, 'gate-f39-e2c')) {
    befunde.push('(e2) waehleWorkflowVorlage ohne herkunftArt-Argument sollte bitgenau dasselbe Ergebnis liefern wie mit einer unbekannten/nicht-anhebenden Herkunft (Alt-Aufrufer unverändert)')
  }
  if (befunde.length === befundeVorE2) {
    console.log("✓ (e2): waehleWorkflowVorlage wählt bei herkunft 'projekt_interview' real workflow-vorlagen/hoch.json (statt 'standard') und vermerkt die Anhebung sichtbar in 'ziel'; jede andere Herkunft bleibt unverändert.")
  }
}

// ─── (f) workflow-vorlagen/hoch.json: 'architekt' vor 'architecture-advisor', Eingaben korrekt ──
{
  const befundeVor = befunde.length
  const hoch = JSON.parse(readFileSync('workflow-vorlagen/hoch.json', 'utf-8'))
  const rollenReihenfolge = hoch.schritte.map((s) => s.rolle)
  const architektIndex = rollenReihenfolge.indexOf('architekt')
  const advisorIndex = rollenReihenfolge.indexOf('architecture-advisor')
  if (architektIndex === -1 || advisorIndex === -1 || architektIndex >= advisorIndex) {
    befunde.push(`(f): 'architekt' sollte VOR 'architecture-advisor' stehen, Rollenreihenfolge: ${JSON.stringify(rollenReihenfolge)}`)
  }
  const architektSchritt = hoch.schritte[architektIndex]
  if (architektSchritt) {
    if (architektSchritt.worker !== 'codex') befunde.push(`(f): architekt-Schritt sollte worker 'codex' tragen, erhalten '${architektSchritt.worker}'`)
    if (architektSchritt.werkzeugsatz !== 'lesend') befunde.push(`(f): architekt-Schritt sollte werkzeugsatz 'lesend' tragen, erhalten '${architektSchritt.werkzeugsatz}'`)
    if (architektSchritt.freigabe !== 'ZWINGEND') befunde.push(`(f): architekt-Schritt sollte freigabe 'ZWINGEND' tragen, erhalten '${architektSchritt.freigabe}'`)
    // F39-WS-2a-Korrektur (23.09.2026): worker 'codex' löst das Ausgabeschema real über
    // '--output-schema' ein — Regel 4b (src/workflow/index.ts) hält nur 'claude-code' + gesetztes
    // output_schema an, nicht 'codex'. Autor (architekt/codex) und Prüfer
    // (architecture-advisor/claude-code) bleiben damit auf verschiedenen Modellen.
    if (architektSchritt.output_schema !== 'ergebnis-architektur') {
      befunde.push(`(f): architekt-Schritt sollte output_schema:'ergebnis-architektur' tragen (worker 'codex' löst es real ein), erhalten ${JSON.stringify(architektSchritt.output_schema)}`)
    }
    if (!architektSchritt.eingaben.includes('artefakt:auftrag-__AUFTRAG_ID__')) {
      befunde.push(`(f): architekt-Schritt sollte den Auftrag als Eingabe tragen, erhalten ${JSON.stringify(architektSchritt.eingaben)}`)
    }
  }
  const advisorSchritt = hoch.schritte[advisorIndex]
  const architektSchrittId = architektSchritt?.schritt_id
  if (advisorSchritt) {
    if (advisorSchritt.worker !== 'claude-code') befunde.push(`(f): architecture-advisor-Schritt sollte worker 'claude-code' tragen, erhalten '${advisorSchritt.worker}'`)
    if (advisorSchritt.output_schema !== null) {
      befunde.push(`(f): architecture-advisor-Schritt sollte output_schema:null tragen (Rollenvertrag architecture-advisor.erlaubtes_output_schema: null), erhalten ${JSON.stringify(advisorSchritt.output_schema)}`)
    }
  }
  if (advisorSchritt && architektSchrittId && !advisorSchritt.eingaben.includes(`artefakt:ergebnis-@${architektSchrittId}`)) {
    befunde.push(`(f): architecture-advisor-Schritt sollte 'ergebnis-@${architektSchrittId}' als Eingabe tragen, erhalten ${JSON.stringify(advisorSchritt.eingaben)}`)
  }
  const ausfuehrungSchritt = hoch.schritte.find((s) => s.rolle === 'ausfuehrung')
  const advisorSchrittId = advisorSchritt?.schritt_id
  if (ausfuehrungSchritt && architektSchrittId && advisorSchrittId) {
    const fehlend = [`artefakt:ergebnis-@${architektSchrittId}`, `artefakt:ergebnis-@${advisorSchrittId}`].filter((e) => !ausfuehrungSchritt.eingaben.includes(e))
    if (fehlend.length > 0) {
      befunde.push(`(f): ausfuehrung-Schritt sollte die Ergebnisse BEIDER Vorschritte als Eingabe tragen, es fehlen: ${JSON.stringify(fehlend)} (vorhanden: ${JSON.stringify(ausfuehrungSchritt.eingaben)})`)
    }
  }
  if (hoch.aktiver_schritt_id !== architektSchrittId) {
    befunde.push(`(f): aktiver_schritt_id sollte auf den architekt-Schritt zeigen, erhalten '${hoch.aktiver_schritt_id}'`)
  }
  if (!Number.isInteger(hoch.grenzen?.max_schritte) || hoch.grenzen.max_schritte < hoch.schritte.length) {
    befunde.push(`(f): grenzen.max_schritte (${hoch.grenzen?.max_schritte}) sollte mindestens die reale Schrittzahl (${hoch.schritte.length}) decken`)
  }
  if (befunde.length === befundeVor) {
    console.log(`✓ (f): workflow-vorlagen/hoch.json — 'architekt' (Schritt '${architektSchrittId}') steht vor 'architecture-advisor', beide Folgeschritte referenzieren die vorherigen Ergebnisse korrekt, max_schritte deckt alle ${hoch.schritte.length} Schritte.`)
  }
}

// ─── (g) Eingabe-Platzhalter 'ergebnis-@<schrittId>' (loeseSchrittEingabenAuf) ────────────
{
  const befundeVor = befunde.length
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const repoWurzel = process.cwd()
  const testBasis = `kontrollzustand-test-f39-g-${randomUUID()}`
  const ladeOptionen = { basisVerzeichnis: testBasis, schreiber: () => {} }

  function baueSchritt(eingaben, felder = {}) {
    return {
      schritt_id: 'schritt-referenzierend',
      rolle: 'code-reviewer',
      werkzeugsatz: 'lesend',
      worker: 'claude-code',
      modell: 'claude-sonnet-5',
      eingaben,
      output_schema: null,
      freigabe: 'AUTOMATISCH',
      risiko: 'Gate-Fixture, kein reales Risiko.',
      zeitgrenze_ms: 600000,
      nachfolger: null,
      status: 'OFFEN',
      lauf_id: null,
      ...felder,
    }
  }

  try {
    // (g1) unbekannte schritt_id.
    {
      const schritt = baueSchritt(['artefakt:ergebnis-@schritt-existiert-nicht'])
      const workflowDaten = { workflow_id: 'gate-f39-g1', schritte: [schritt] }
      const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
      if (ergebnis.ok !== false || !ergebnis.grund.includes('keine bekannte schritt_id')) {
        befunde.push(`(g1) unbekannte schritt_id: erwartet ok:false mit Ablehnungsgrund 'keine bekannte schritt_id', erhalten ${JSON.stringify(ergebnis)}`)
      } else {
        console.log("✓ (g1) 'ergebnis-@' mit unbekannter schritt_id: Schritt-Start wird abgelehnt.")
      }
    }

    // (g2) bekannte schritt_id, aber lauf_id noch null (Zielschritt noch nicht gestartet).
    {
      const referenzierterSchritt = { ...baueSchritt([]), schritt_id: 'schritt-1', lauf_id: null }
      const schritt = baueSchritt(['artefakt:ergebnis-@schritt-1'])
      const workflowDaten = { workflow_id: 'gate-f39-g2', schritte: [referenzierterSchritt, schritt] }
      const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
      if (ergebnis.ok !== false || !ergebnis.grund.includes('noch keine lauf_id')) {
        befunde.push(`(g2) schritt_id ohne lauf_id: erwartet ok:false mit Ablehnungsgrund 'noch keine lauf_id', erhalten ${JSON.stringify(ergebnis)}`)
      } else {
        console.log("✓ (g2) 'ergebnis-@' auf einen noch nicht gestarteten Schritt (lauf_id: null): Schritt-Start wird abgelehnt.")
      }
    }

    // (g3) Selbstreferenz.
    {
      const schritt = { ...baueSchritt(['artefakt:ergebnis-@schritt-referenzierend']), lauf_id: 'vorheriger-versuch-lauf-1' }
      const workflowDaten = { workflow_id: 'gate-f39-g3', schritte: [schritt] }
      const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
      if (ergebnis.ok !== false || !ergebnis.grund.includes('verweist auf sich selbst')) {
        befunde.push(`(g3) Selbstreferenz: erwartet ok:false mit Ablehnungsgrund 'verweist auf sich selbst', erhalten ${JSON.stringify(ergebnis)}`)
      } else {
        console.log("✓ (g3) 'ergebnis-@'-Selbstreferenz eines Schritts auf sich selbst wird abgelehnt.")
      }
    }

    // (g4) Grünfall: eine real registrierte Laufakte mit einem Rohstrom, dessen Ergebnistext
    // strukturiertes JSON trägt (Muster architekt/ergebnis-architektur), wird korrekt extrahiert
    // und formatiert als 'inhalt' in die Anfragenliste aufgenommen.
    {
      const zielLaufId = `gate-f39-g4-ziellauf-${randomUUID()}`
      mkdirSync(testBasis, { recursive: true })
      const rohstromPfad = join(testBasis, `${zielLaufId}-rohstrom.json`)
      writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify({ zusammenfassung: 'Testentwurf' }) }) }))
      const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
      registriereKernArtefakt(
        `laufakte-${zielLaufId}`,
        profilReferenz,
        { erzeuger: 'kern', schritt: 'gate-fixture' },
        { laufakte_schema: 'v0', lauf_id: zielLaufId, worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } },
        [],
        ladeOptionen
      )
      const referenzierterSchritt = { ...baueSchritt([]), schritt_id: 'schritt-1', lauf_id: zielLaufId }
      const schritt = baueSchritt(['artefakt:ergebnis-@schritt-1'])
      const workflowDaten = { workflow_id: 'gate-f39-g4', schritte: [referenzierterSchritt, schritt] }
      const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
      const anfrage = ergebnis.ok ? ergebnis.eingaben.anfragen.find((a) => a.pfad === `artefakt:ergebnis-${zielLaufId}`) : undefined
      if (!ergebnis.ok || anfrage === undefined || JSON.parse(anfrage.inhalt).zusammenfassung !== 'Testentwurf') {
        befunde.push(`(g4) Grünfall: erwartet ok:true mit einer Anfrage, deren 'inhalt' das extrahierte, formatierte JSON trägt, erhalten ${JSON.stringify(ergebnis)}`)
      } else {
        console.log("✓ (g4) 'ergebnis-@' löst real auf eine registrierte Laufakte auf und extrahiert deren strukturiertes Ergebnis formatiert in die Anfragenliste.")
      }
    }
  } finally {
    raeumeVerzeichnis(testBasis)
  }
}

// ─── (h) workflow-vorlagen/fast-lane.json trägt unverändert keinen 'architekt'-Schritt ────
{
  const befundeVor = befunde.length
  const fastLane = JSON.parse(readFileSync('workflow-vorlagen/fast-lane.json', 'utf-8'))
  if (fastLane.schritte.some((s) => s.rolle === 'architekt')) {
    befunde.push("(h): workflow-vorlagen/fast-lane.json sollte KEINEN 'architekt'-Schritt tragen (unverändert, nur 'hoch' bekommt ihn)")
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (h): workflow-vorlagen/fast-lane.json bleibt unverändert ohne 'architekt'-Schritt.")
  }
}

// ─── (i) Regel 1c direkt (src/workflow/index.ts): rot (Verstoß) / rot (Entscheidung ausstehend) / grün (idempotent) ──
{
  const befundeVor = befunde.length

  function schritt1c(overrides) {
    return {
      schritt_id: 's1',
      rolle: 'architekt',
      werkzeugsatz: 'lesend',
      worker: 'codex',
      modell: 'gpt-6-astra',
      eingaben: [],
      output_schema: 'ergebnis-architektur',
      freigabe: 'ZWINGEND',
      risiko: 'Gate-Fixture.',
      zeitgrenze_ms: 600000,
      nachfolger: 's2',
      status: 'ERFOLGREICH',
      lauf_id: 'lauf-1',
      ...overrides,
    }
  }
  const schritt2 = {
    schritt_id: 's2',
    rolle: 'architecture-advisor',
    werkzeugsatz: 'lesend',
    worker: 'claude-code',
    modell: 'claude-sonnet-5',
    eingaben: [],
    output_schema: null,
    freigabe: 'ZWINGEND',
    risiko: 'Gate-Fixture.',
    zeitgrenze_ms: 600000,
    nachfolger: null,
    status: 'OFFEN',
    lauf_id: null,
  }
  const workflow = { workflow_id: 'gate-f39-i', auftrag_id: 'a', version: 1, ziel: 'x', status: 'LAEUFT', aktiver_schritt_id: 's1', grund: null, grenzen: { max_schritte: 5, max_replans: 1 }, schritte: [schritt1c({}), schritt2] }

  const rotVerstoss = ermittleNaechstenSchritt(workflow, { schrittId: 's1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1', architekturVerstoesse: ["Pflichtfeld 'evidenz' fehlt"] })
  if (rotVerstoss.art !== 'haltKlaerung' || rotVerstoss.aktiverSchrittId !== 's1' || !/validiereErgebnisArchitektur ablehnt/.test(rotVerstoss.grund)) {
    befunde.push(`(i) Rotfall (Verstoß): erwartet haltKlaerung auf 's1' mit 'validiereErgebnisArchitektur ablehnt', erhalten ${JSON.stringify(rotVerstoss)}`)
  }

  const rotAusstehend = ermittleNaechstenSchritt(workflow, {
    schrittId: 's1',
    ergebnis: 'ERFOLGREICH',
    laufId: 'lauf-1',
    architekturVerstoesse: [],
    architekturEntscheidungAusstehend: true,
    architekturAnzahlFragen: 1,
  })
  if (rotAusstehend.art !== 'haltKlaerung' || rotAusstehend.aktiverSchrittId !== 's1' || !/Architektur-Entscheidung erforderlich/.test(rotAusstehend.grund)) {
    befunde.push(`(i) Rotfall (Entscheidung ausstehend): erwartet haltKlaerung auf 's1' mit 'Architektur-Entscheidung erforderlich', erhalten ${JSON.stringify(rotAusstehend)}`)
  }

  const gruenLeer = ermittleNaechstenSchritt(workflow, { schrittId: 's1', ergebnis: 'ERFOLGREICH', laufId: 'lauf-1', architekturVerstoesse: [] })
  const gruenErfasst = ermittleNaechstenSchritt(workflow, {
    schrittId: 's1',
    ergebnis: 'ERFOLGREICH',
    laufId: 'lauf-1',
    architekturVerstoesse: [],
    architekturEntscheidungAusstehend: false,
  })
  if (gruenLeer.art !== 'haltFreigabe' || gruenErfasst.art !== 'haltFreigabe') {
    befunde.push(`(i) Grünfall (leer / erfasst): beide sollten regulär bis Regel 5 (ZWINGEND, 's2') durchlaufen, erhalten leer=${JSON.stringify(gruenLeer)}, erfasst=${JSON.stringify(gruenErfasst)}`)
  }

  if (befunde.length === befundeVor) {
    console.log("✓ (i) Regel 1c: ein Verstoß und eine ausstehende Entscheidung halten real auf dem Architektur-Schritt an; eine leere Liste oder eine bereits erfasste Entscheidung setzen unverändert bis Regel 5 fort (Idempotenz).")
  }
}

/**
 * Legt einen ERFOLGREICH gelaufenen Architektur-Schritt (echte Laufakte + Rohstrom, Muster (g4))
 * plus einen ZWINGEND freizugebenden Folgeschritt an — der Workflow steht auf KLAERUNG_ERFORDERLICH
 * mit aktiver_schritt_id auf dem Architektur-Schritt (Regel 1c). 'entscheidungenMensch' bestimmt den
 * Fragenkatalog des Laufs; leer heißt: nichts zu entscheiden.
 * @returns { workflowId, architektSchrittId, architektLaufId, folgeSchrittId, entscheidungenMensch }
 */
function baueArchitekturKlaerungsWorkflow(basisVerzeichnis, ladeOptionen, profilReferenz, entscheidungenMensch) {
  const workflowId = `gate-f39-${randomUUID()}`
  const architektSchrittId = 'schritt-1-architekt'
  const folgeSchrittId = 'schritt-2-architektur'
  const architektLaufId = `${workflowId}-architekt-lauf`

  const ergebnisArchitektur = {
    modus: 'feature',
    zusammenfassung: 'Gate-Fixture-Entwurf.',
    module: [],
    adr_entwuerfe: [],
    schema_entwuerfe: [],
    entscheidungen_mensch: entscheidungenMensch,
    capabilities_bedarf: [],
    evidenz: [{ marker: '[Fakt]', aussage: 'Gate-Fixture.' }],
  }
  mkdirSync(basisVerzeichnis, { recursive: true })
  const rohstromPfad = join(basisVerzeichnis, `${architektLaufId}-rohstrom.json`)
  writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(ergebnisArchitektur) }) }))
  registriereKernArtefakt(
    `laufakte-${architektLaufId}`,
    profilReferenz,
    { erzeuger: 'kern', schritt: 'gate-fixture' },
    { laufakte_schema: 'v0', lauf_id: architektLaufId, worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } },
    [],
    ladeOptionen
  )

  registriereWorkflow(
    {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: 'auftrag-f39-gate-fixture',
      version: 1,
      ziel: 'Gate-Fixture: Architektur-Entscheidung (F39 WS-2b).',
      status: 'KLAERUNG_ERFORDERLICH',
      aktiver_schritt_id: architektSchrittId,
      grund: "Architektur-Entscheidung erforderlich — Gate-Fixture.",
      grenzen: { max_schritte: 6, max_replans: 1 },
      schritte: [
        {
          schritt_id: architektSchrittId,
          rolle: 'architekt',
          werkzeugsatz: 'lesend',
          worker: 'codex',
          modell: 'gpt-6-astra',
          eingaben: [],
          output_schema: 'ergebnis-architektur',
          freigabe: 'ZWINGEND',
          risiko: 'Gate-Fixture.',
          zeitgrenze_ms: 600000,
          nachfolger: folgeSchrittId,
          status: 'ERFOLGREICH',
          lauf_id: architektLaufId,
        },
        {
          schritt_id: folgeSchrittId,
          rolle: 'architecture-advisor',
          werkzeugsatz: 'lesend',
          worker: 'claude-code',
          modell: 'claude-sonnet-5',
          eingaben: [`artefakt:ergebnis-@${architektSchrittId}`, `artefakt:entscheidung-@${architektSchrittId}`],
          output_schema: null,
          freigabe: 'ZWINGEND',
          risiko: 'Gate-Fixture.',
          zeitgrenze_ms: 600000,
          nachfolger: null,
          status: 'OFFEN',
          lauf_id: null,
        },
      ],
    },
    profilReferenz,
    ladeOptionen
  )
  return { workflowId, architektSchrittId, architektLaufId, folgeSchrittId }
}

const GATE_FRAGE = {
  frage: 'Welches Speicherformat?',
  optionen: [
    { titel: 'JSONL je Turn', vorteile: ['Passt zum bestehenden Muster'], nachteile: [] },
    { titel: 'Ein Objekt je Lauf', vorteile: [], nachteile: ['Bricht mit dem Muster'] },
  ],
  auswirkung_bestand: 'keine',
  empfehlung: 'JSONL je Turn',
  begruendung: 'Gate-Fixture.',
}

// ─── (j0) Reine Logik direkt: pruefeWorkflowEntscheidungsformular + pruefeAntwortenGegenFragen ──
{
  const befundeVor = befunde.length
  const formRot = pruefeWorkflowEntscheidungsformular({ schrittId: '', antworten: [] })
  if (formRot.ok !== false) befunde.push(`(j0) pruefeWorkflowEntscheidungsformular: leere schrittId sollte ok:false liefern, erhalten ${JSON.stringify(formRot)}`)
  const formGruen = pruefeWorkflowEntscheidungsformular({ schrittId: 's1', antworten: [{ frage: 'f', gewaehlt: 'g' }] })
  if (formGruen.ok !== true) befunde.push(`(j0) pruefeWorkflowEntscheidungsformular: gültiger Body sollte ok:true liefern, erhalten ${JSON.stringify(formGruen)}`)
  const kreuzRot = pruefeAntwortenGegenFragen([], [GATE_FRAGE])
  if (!kreuzRot.some((v) => v.includes('ist unbeantwortet'))) befunde.push(`(j0) pruefeAntwortenGegenFragen: erwartet 'ist unbeantwortet' bei leeren antworten, erhalten ${JSON.stringify(kreuzRot)}`)
  const kreuzGruen = pruefeAntwortenGegenFragen([{ frage: GATE_FRAGE.frage, gewaehlt: 'JSONL je Turn' }], [GATE_FRAGE])
  if (kreuzGruen.length > 0) befunde.push(`(j0) pruefeAntwortenGegenFragen: eine gültige Antwort sollte [] liefern, erhalten ${JSON.stringify(kreuzGruen)}`)
  if (befunde.length === befundeVor) {
    console.log('✓ (j0): pruefeWorkflowEntscheidungsformular und pruefeAntwortenGegenFragen direkt geprüft (Form bzw. Kreuzprüfung gegen die Fragen).')
  }
}

// ─── (j) POST /api/workflows/<id>/entscheidung: rot (Status/Antworten) und grün (echter Dispatch) ──
{
  const befundeVor = befunde.length
  const basisVerzeichnis = `kontrollzustand-test-f39-j-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const profilReferenz = leiteProfilReferenzAb(vorlage)
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const { workflowId, architektSchrittId } = baueArchitekturKlaerungsWorkflow(basisVerzeichnis, ladeOptionen, profilReferenz, [GATE_FRAGE])

    // (j1) Rot: falscher Status/aktiver_schritt_id — eine erfundene schrittId trifft dieselbe Prüfung.
    const rotStatus = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/entscheidung`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ schrittId: 'schritt-existiert-nicht', antworten: [{ frage: GATE_FRAGE.frage, gewaehlt: 'JSONL je Turn' }] }),
    })
    if (rotStatus.status !== 409) befunde.push(`(j1) unbekannte/falsche schrittId: erwartet 409, erhalten ${rotStatus.status}`)

    // (j2) Rot: fehlende Antwort (leeres antworten-Array).
    const rotFehlend = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/entscheidung`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ schrittId: architektSchrittId, antworten: [] }),
    })
    const rotFehlendKoerper = await rotFehlend.json()
    if (rotFehlend.status !== 400 || !/unbeantwortet/.test(rotFehlendKoerper.grund)) {
      befunde.push(`(j2) fehlende Antwort: erwartet 400 mit 'unbeantwortet', erhalten ${rotFehlend.status} ${JSON.stringify(rotFehlendKoerper)}`)
    }

    // (j3) Rot: 'gewaehlt' nennt keine gelistete Option.
    const rotOption = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/entscheidung`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ schrittId: architektSchrittId, antworten: [{ frage: GATE_FRAGE.frage, gewaehlt: 'Erfundene Option' }] }),
    })
    const rotOptionKoerper = await rotOption.json()
    if (rotOption.status !== 400 || !/keine Option erfinden/.test(rotOptionKoerper.grund)) {
      befunde.push(`(j3) erfundene Option: erwartet 400 mit 'keine Option erfinden', erhalten ${rotOption.status} ${JSON.stringify(rotOptionKoerper)}`)
    }

    if (befunde.length === befundeVor) {
      console.log('✓ (j1)-(j3): falsche/unbekannte schrittId (409), unbeantwortete Frage (400) und eine erfundene Option (400) werden real abgelehnt, ohne etwas festzuhalten.')
    }

    // (j4) Grün: echter Dispatch — schreibt die Entscheidung UND setzt über ermittleNaechstenSchritt
    // fort. Der Folgeschritt ist ZWINGEND -> WARTET_FREIGABE, kein Auto-Start (Auftrags-Vorgabe Punkt 3).
    const befundeVorGruen = befunde.length
    const gruen = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/entscheidung`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ schrittId: architektSchrittId, antworten: [{ frage: GATE_FRAGE.frage, gewaehlt: 'JSONL je Turn', begruendung: 'Gate-Test.' }] }),
    })
    const gruenKoerper = await gruen.json()
    if (gruen.status !== 202 || gruenKoerper.status !== 'WARTET_FREIGABE') {
      befunde.push(`(j4) Grünfall: erwartet 202 mit status 'WARTET_FREIGABE', erhalten ${gruen.status} ${JSON.stringify(gruenKoerper)}`)
    }
    const entscheidung = findeWorkflowEntscheidungFuerSchritt(basisVerzeichnis, workflowId, architektSchrittId)
    if (entscheidung === null || entscheidung.antworten[0]?.gewaehlt !== 'JSONL je Turn') {
      befunde.push(`(j4) Grünfall: die Entscheidung sollte real unter 'workflow-entscheidung-${workflowId}' auffindbar sein, erhalten ${JSON.stringify(entscheidung)}`)
    }

    // (j5) Idempotenz/Regression: ein zweiter Versuch trifft keine offene Klärung mehr (der
    // Workflow steht jetzt auf WARTET_FREIGABE, nicht mehr KLAERUNG_ERFORDERLICH auf s1).
    const zweiterVersuch = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/entscheidung`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ schrittId: architektSchrittId, antworten: [{ frage: GATE_FRAGE.frage, gewaehlt: 'JSONL je Turn' }] }),
    })
    if (zweiterVersuch.status !== 409) befunde.push(`(j5) zweiter Versuch nach bereits erfasster Entscheidung: erwartet 409, erhalten ${zweiterVersuch.status}`)

    if (befunde.length === befundeVorGruen) {
      console.log("✓ (j4)/(j5): eine gültige Entscheidung wird real registriert und setzt den Workflow über ermittleNaechstenSchritt auf 'WARTET_FREIGABE' fort (ZWINGEND, kein Auto-Start); ein zweiter Versuch findet danach keine offene Klärung mehr (Idempotenz).")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (k) Eingabe-Platzhalter 'entscheidung-@<schrittId>' (loeseSchrittEingabenAuf) ─────────
{
  const befundeVor = befunde.length
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const profilReferenz = leiteProfilReferenzAb(vorlage)
  const repoWurzel = process.cwd()
  const testBasis = `kontrollzustand-test-f39-k-${randomUUID()}`
  const ladeOptionen = { basisVerzeichnis: testBasis, schreiber: () => {} }

  function baueSchritt(eingaben, felder = {}) {
    return {
      schritt_id: 'schritt-referenzierend',
      rolle: 'code-reviewer',
      werkzeugsatz: 'lesend',
      worker: 'claude-code',
      modell: 'claude-sonnet-5',
      eingaben,
      output_schema: null,
      freigabe: 'AUTOMATISCH',
      risiko: 'Gate-Fixture, kein reales Risiko.',
      zeitgrenze_ms: 600000,
      nachfolger: null,
      status: 'OFFEN',
      lauf_id: null,
      ...felder,
    }
  }

  try {
    // (k1) unbekannte schritt_id.
    {
      const schritt = baueSchritt(['artefakt:entscheidung-@schritt-existiert-nicht'])
      const workflowDaten = { workflow_id: 'gate-f39-k1', schritte: [schritt] }
      const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
      if (ergebnis.ok !== false || !ergebnis.grund.includes('keine bekannte schritt_id')) {
        befunde.push(`(k1) unbekannte schritt_id: erwartet ok:false mit 'keine bekannte schritt_id', erhalten ${JSON.stringify(ergebnis)}`)
      }
    }
    // (k2) bekannte schritt_id, lauf_id noch null.
    {
      const referenzierterSchritt = { ...baueSchritt([]), schritt_id: 'schritt-1', lauf_id: null }
      const schritt = baueSchritt(['artefakt:entscheidung-@schritt-1'])
      const workflowDaten = { workflow_id: 'gate-f39-k2', schritte: [referenzierterSchritt, schritt] }
      const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
      if (ergebnis.ok !== false || !ergebnis.grund.includes('noch keine lauf_id')) {
        befunde.push(`(k2) schritt_id ohne lauf_id: erwartet ok:false mit 'noch keine lauf_id', erhalten ${JSON.stringify(ergebnis)}`)
      }
    }
    // (k3) Selbstreferenz.
    {
      const schritt = { ...baueSchritt(['artefakt:entscheidung-@schritt-referenzierend']), lauf_id: 'vorheriger-versuch-lauf-1' }
      const workflowDaten = { workflow_id: 'gate-f39-k3', schritte: [schritt] }
      const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
      if (ergebnis.ok !== false || !ergebnis.grund.includes('verweist auf sich selbst')) {
        befunde.push(`(k3) Selbstreferenz: erwartet ok:false mit 'verweist auf sich selbst', erhalten ${JSON.stringify(ergebnis)}`)
      }
    }
    // (k4) Grünfall ohne Entscheidung (nichts registriert) — leerer Hinweistext statt Startsperre.
    {
      const referenzierterSchritt = { ...baueSchritt([]), schritt_id: 'schritt-1', lauf_id: 'lauf-ohne-entscheidung' }
      const schritt = baueSchritt(['artefakt:entscheidung-@schritt-1'])
      const workflowDaten = { workflow_id: 'gate-f39-k4', schritte: [referenzierterSchritt, schritt] }
      const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
      const anfrage = ergebnis.ok ? ergebnis.eingaben.anfragen.find((a) => a.pfad === 'artefakt:entscheidung-lauf-ohne-entscheidung') : undefined
      if (!ergebnis.ok || anfrage === undefined || anfrage.inhalt !== '') {
        befunde.push(`(k4) Grünfall ohne Entscheidung: erwartet ok:true mit leerem 'inhalt' (kein Startsperre), erhalten ${JSON.stringify(ergebnis)}`)
      }
    }
    // (k5) Grünfall MIT real registrierter Entscheidung — formatierter Text erscheint im 'inhalt'.
    {
      const architektLaufId = `gate-f39-k5-lauf-${randomUUID()}`
      registriereWorkflowEntscheidung(testBasis, 'gate-f39-k5', profilReferenz, 'schritt-1', [{ frage: GATE_FRAGE.frage, gewaehlt: 'JSONL je Turn', begruendung: 'Gate.' }], new Date().toISOString())
      const referenzierterSchritt = { ...baueSchritt([]), schritt_id: 'schritt-1', lauf_id: architektLaufId }
      const schritt = baueSchritt(['artefakt:entscheidung-@schritt-1'])
      const workflowDaten = { workflow_id: 'gate-f39-k5', schritte: [referenzierterSchritt, schritt] }
      const ergebnis = loeseSchrittEingabenAuf(schritt, workflowDaten, undefined, 'Gate-Auftragstext.', vorlage, repoWurzel, ladeOptionen)
      const anfrage = ergebnis.ok ? ergebnis.eingaben.anfragen.find((a) => a.pfad === `artefakt:entscheidung-${architektLaufId}`) : undefined
      if (!ergebnis.ok || anfrage === undefined || !anfrage.inhalt.includes('JSONL je Turn')) {
        befunde.push(`(k5) Grünfall mit Entscheidung: erwartet 'inhalt' mit 'JSONL je Turn', erhalten ${JSON.stringify(ergebnis)}`)
      }
    }
    if (befunde.length === befundeVor) {
      console.log("✓ (k) 'entscheidung-@': dieselben drei Schutzregeln wie 'ergebnis-@' (Selbstverweis, unbekannte schritt_id, nicht gestartet); ohne Entscheidung ein leerer Hinweistext statt Startsperre, mit einer real registrierten Entscheidung der formatierte Text.")
    }
  } finally {
    raeumeVerzeichnis(testBasis)
  }
}

// ─── (l) Regression: ein Workflow ohne 'architekt'-Schritt verhält sich bitgenau wie vorher ──
{
  const befundeVor = befunde.length
  const standard = JSON.parse(readFileSync('workflow-vorlagen/standard.json', 'utf-8'))
  if (standard.schritte.some((s) => s.rolle === 'architekt' || s.output_schema === 'ergebnis-architektur')) {
    befunde.push("(l): workflow-vorlagen/standard.json sollte KEINEN 'architekt'-Schritt/kein 'ergebnis-architektur' tragen (unverändert)")
  }
  // Regel 1c greift NUR über output_schema — ein Schritt ohne 'ergebnis-architektur' verhält sich
  // bitgenau wie vor F39 WS-2b, auch wenn (irrtümlich oder durch einen alten Aufrufer) Architektur-
  // Felder mitgesendet werden (bereits als eigener Fall in src/workflow/workflow.test.ts gepinnt;
  // hier zusätzlich am echten Feature-Schnitt bestätigt: 'ausfuehrung' aus workflow-vorlagen/standard.json).
  const ausfuehrungSchritt = { ...standard.schritte.find((s) => s.rolle === 'ausfuehrung'), status: 'ERFOLGREICH', lauf_id: 'lauf-1', nachfolger: null }
  const workflow = { workflow_id: 'gate-f39-l', auftrag_id: 'a', version: 1, ziel: 'x', status: 'LAEUFT', aktiver_schritt_id: ausfuehrungSchritt.schritt_id, grund: null, grenzen: { max_schritte: 5, max_replans: 1 }, schritte: [ausfuehrungSchritt] }
  const mitFeldern = ermittleNaechstenSchritt(workflow, { schrittId: ausfuehrungSchritt.schritt_id, ergebnis: 'ERFOLGREICH', laufId: 'lauf-1', architekturVerstoesse: ['sollte ignoriert werden'], architekturEntscheidungAusstehend: true })
  const ohneFelder = ermittleNaechstenSchritt(workflow, { schrittId: ausfuehrungSchritt.schritt_id, ergebnis: 'ERFOLGREICH', laufId: 'lauf-1' })
  if (JSON.stringify(mitFeldern) !== JSON.stringify(ohneFelder) || mitFeldern.art !== 'fertig') {
    befunde.push(`(l): ein Schritt ohne output_schema 'ergebnis-architektur' sollte bitgenau unverändert bleiben, egal ob Architektur-Felder mitgesendet werden, erhalten mitFeldern=${JSON.stringify(mitFeldern)}, ohneFelder=${JSON.stringify(ohneFelder)}`)
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (l) Regression: workflow-vorlagen/standard.json trägt unverändert keinen 'architekt'-Schritt; ein Schritt ohne 'ergebnis-architektur' verhält sich bitgenau wie vor F39 WS-2b, auch mit mitgesendeten Architektur-Feldern.")
  }
}

// ─── (m) GET /api/workflows/<id>: additives Feld 'architekturEntscheidung' ─────────────────
{
  const befundeVor = befunde.length
  const basisVerzeichnis = `kontrollzustand-test-f39-m-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage('startvorlagen/beispielprojekt.json'))
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const { workflowId, architektSchrittId } = baueArchitekturKlaerungsWorkflow(basisVerzeichnis, ladeOptionen, profilReferenz, [GATE_FRAGE])

    const vorEntscheidung = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`)).json()
    if (vorEntscheidung.architekturEntscheidung === null || vorEntscheidung.architekturEntscheidung.schrittId !== architektSchrittId || vorEntscheidung.architekturEntscheidung.fragen.length !== 1) {
      befunde.push(`(m) vor der Entscheidung: erwartet architekturEntscheidung mit schrittId '${architektSchrittId}' und einer Frage, erhalten ${JSON.stringify(vorEntscheidung.architekturEntscheidung)}`)
    }

    await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/entscheidung`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ schrittId: architektSchrittId, antworten: [{ frage: GATE_FRAGE.frage, gewaehlt: 'JSONL je Turn' }] }),
    })
    const nachEntscheidung = await (await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}`)).json()
    if (nachEntscheidung.architekturEntscheidung !== null) {
      befunde.push(`(m) nach der Entscheidung: erwartet architekturEntscheidung: null (Idempotenz, Cursor steht nicht mehr auf dem Architektur-Schritt), erhalten ${JSON.stringify(nachEntscheidung.architekturEntscheidung)}`)
    }

    if (befunde.length === befundeVor) {
      console.log("✓ (m): GET /api/workflows/<id> liefert 'architekturEntscheidung' (schrittId + fragen) genau während Regel 1c hält, danach wieder null.")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (n) F39 WS-3a (löst F-635): realer Schrittstart-Pfad umhüllt den Auftragstext ─────────
{
  const befundeVor = befunde.length
  const basisVerzeichnis = `kontrollzustand-test-f39-n-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)

  // Der architekt-Schritt läuft laut workflow-vorlagen/hoch.json auf worker 'codex' — die
  // reale Standard-Startvorlage (startvorlagen/beispielprojekt.json) trägt keinen
  // worker.codex-Block. Muster check-f15-workflow.mjs (WS-3a-Block): eine Wegwerfkopie MIT
  // Block, injiziert über die Server-Option startvorlagePfad — REPO-RELATIV (nicht im OS-
  // Temp-Verzeichnis wie beim F15-Vorbild), weil loeseRessourcenAuf (Modus 'projekt', unten)
  // startvorlagePfad intern gegen repoWurzel auflöst (join(repoWurzel, startvorlagePfad)) —
  // ein absoluter Pfad würde dort falsch verkettet. kontrollzustand-test-*-Verzeichnisse sind
  // gitignored (CLAUDE.md „Bekannte Fallen").
  mkdirSync(basisVerzeichnis, { recursive: true })
  const startvorlagePfadMitCodex = join(basisVerzeichnis, 'startvorlage-mit-codex.json')
  const vorlageBasis = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  writeFileSync(
    startvorlagePfadMitCodex,
    JSON.stringify({ ...vorlageBasis, worker: { codex: { startziel: [process.execPath], versionDeklariert: '0.153.4 (Codex CLI, Gate-Fixture)', sandbox: 'read-only' } } }),
    'utf8'
  )

  let gesehenerAuftragstext = null
  const fuehreAufgabeDurchFn = async (_laufId, _profilReferenz, eingaben) => {
    gesehenerAuftragstext = eingaben.auftragstext
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn, startvorlagePfad: startvorlagePfadMitCodex }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`

  /**
   * Legt real einen Auftrag (optional mit herkunft) und einen Ein-Schritt-Workflow mit Rolle
   * 'architekt' an und startet ihn über den echten Automatenpfad. Gibt den Auftragstext zurück,
   * den fuehreAufgabeDurchFn tatsächlich gesehen hat.
   * @param herkunft - optionales { art } für POST /api/auftraege, oder undefined
   * @returns der real an den Worker gereichte AusfuehrungsEingaben.auftragstext
   */
  async function starteArchitektSchrittUndLiesAuftragstext(herkunft) {
    gesehenerAuftragstext = null
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
      method: 'POST',
      body: JSON.stringify({ titel: 'F39-WS-3a-Gate', auftragstext: 'GATE-PLANUNGSTEXT-EINDEUTIG-F39-N', ...(herkunft !== undefined ? { herkunft } : {}) }),
    })
    const { auftragId } = await auftragAntwort.json()
    if (auftragAntwort.status !== 201 || typeof auftragId !== 'string') {
      throw new Error(`(n)-Vorbereitung: POST /api/auftraege erwartet 201 mit auftragId, erhalten ${auftragAntwort.status}`)
    }
    const workflowId = `gate-f39-n-${randomUUID()}`
    const workflowPayload = {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'Gate-Fixture (F39 WS-3a).',
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1',
      grund: null,
      grenzen: { max_schritte: 3, max_replans: 1 },
      schritte: [
        {
          schritt_id: 'schritt-1',
          rolle: 'architekt',
          werkzeugsatz: 'lesend',
          worker: 'codex',
          modell: 'gpt-6-astra',
          eingaben: [],
          output_schema: 'ergebnis-architektur',
          freigabe: 'AUTOMATISCH',
          risiko: 'Gate-Fixture, kein realer Lauf.',
          zeitgrenze_ms: 600000,
          nachfolger: null,
          status: 'OFFEN',
          lauf_id: null,
        },
      ],
    }
    const anlage = await fetch(`${basisUrl}/api/workflows`, { method: 'POST', body: JSON.stringify(workflowPayload) })
    if (anlage.status !== 201) {
      throw new Error(`(n)-Vorbereitung: POST /api/workflows erwartet 201, erhalten ${anlage.status} (${await anlage.text()})`)
    }
    const start = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (start.status !== 202) {
      throw new Error(`(n)-Vorbereitung: POST /api/workflows/<id>/starten erwartet 202, erhalten ${start.status} (${await start.text()})`)
    }
    return gesehenerAuftragstext
  }

  try {
    // (n1) Ohne Herkunft (Alt-Auftrag/manuell): Modus 'feature', keine Capability-Auszug-Zeile.
    const featureText = await starteArchitektSchrittUndLiesAuftragstext(undefined)
    if (typeof featureText !== 'string' || !/"modus":\s*"feature"/.test(featureText) || !featureText.includes('GATE-PLANUNGSTEXT-EINDEUTIG-F39-N')) {
      befunde.push(`(n1) realer Schrittstart ohne Herkunft: erwartet umhüllten Auftragstext mit "modus": "feature" und dem Planungstext, erhalten: ${JSON.stringify(featureText)?.slice(0, 300)}…`)
    } else if (featureText.includes('Verfügbare Ressourcen (Capability-Auszug):')) {
      befunde.push("(n1) realer Schrittstart ohne Herkunft: Modus 'feature' sollte KEINEN Capability-Auszug tragen")
    }

    // (n2) herkunft.art 'projekt_interview': Modus 'projekt', inkl. real gebautem Capability-Auszug.
    const projektText = await starteArchitektSchrittUndLiesAuftragstext({ art: 'projekt_interview' })
    if (typeof projektText !== 'string' || !/"modus":\s*"projekt"/.test(projektText) || !projektText.includes('GATE-PLANUNGSTEXT-EINDEUTIG-F39-N')) {
      befunde.push(`(n2) realer Schrittstart mit herkunft 'projekt_interview': erwartet umhüllten Auftragstext mit "modus": "projekt" und dem Planungstext, erhalten: ${JSON.stringify(projektText)?.slice(0, 300)}…`)
    } else if (!projektText.includes('Verfügbare Ressourcen (Capability-Auszug):')) {
      befunde.push("(n2) realer Schrittstart mit herkunft 'projekt_interview': erwartet einen real gebauten Capability-Auszug-Abschnitt")
    }

    // (n3) F-707 (BUG P1, löst "STACK_OFFEN_HINWEIS erreicht den Architekten zur Laufzeit nie"):
    // dieser Server läuft mit repoWurzel = process.cwd() (DIESES Repo, Stack bereits gefüllt,
    // istStackOffen(process.cwd()) === false, siehe check-f42-projekt-harness.mjs (f1)) — beide
    // real umhüllten Auftragstexte oben dürfen den Stack-Hinweis deshalb NICHT tragen. Ohne die
    // Korrektur (istStackOffen(repoWurzel) als viertes Argument an baueArchitektAuftragstext,
    // scripts/leitstand-server.mjs ~4156) wäre dieses Nicht-Vorkommen unbeweisbar, weil es dann
    // NIE vorkäme, unabhängig vom realen Stack-Zustand — der eigentliche Rot-Fall (Hinweis fehlt
    // bei offenem Stack) folgt gleich danach mit einem ZWEITEN Server gegen eine echte
    // Wegwerf-repoWurzel ohne CLAUDE.md.
    const STACK_HINWEIS_MARKER = 'NICHT selbst fest'
    if (featureText.includes(STACK_HINWEIS_MARKER) || projektText.includes(STACK_HINWEIS_MARKER)) {
      befunde.push('(n3) realer Schrittstart gegen DIESES Repo (Stack gefüllt): der Auftragstext sollte den Stack-Hinweis NICHT tragen')
    }

    if (befunde.length === befundeVor) {
      console.log(
        "✓ (n1)/(n2)/(n3): der REALE Schrittstart-Pfad (POST /api/workflows/<id>/starten -> starteWorkflowSchritt) umhüllt den Auftragstext eines 'architekt'-Schritts über baueArchitektAuftragstext — Modus 'feature' ohne Herkunft (kein Capability-Auszug), Modus 'projekt' bei herkunft.art 'projekt_interview' (inkl. real gebautem Capability-Auszug), UND gegen DIESES Repo (Stack gefüllt) ohne den Stack-Hinweis."
      )
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (n4) F-707: derselbe reale Schrittstart-Pfad gegen eine repoWurzel MIT offenem Stack ───
//
// Eigener Server (repoWurzel lässt sich nur bei der Server-Erzeugung setzen, nicht pro Request)
// — Rot-Fall-Beleg für F-707: OHNE 'istStackOffen(repoWurzel)' als viertes Argument an
// baueArchitektAuftragstext (scripts/leitstand-server.mjs ~4156) bliebe stackOffen beim Default
// 'false', der Hinweis erschiene NIE, unabhängig vom echten Stack-Zustand — dieser Block hätte
// den Fund vor der Korrektur real als Befund gemeldet (manuell verifiziert: Entfernen des vierten
// Arguments lässt (n4) unten real fehlschlagen).
{
  const befundeVor = befunde.length
  const basisVerzeichnis = `kontrollzustand-test-f39-n4-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  mkdirSync(basisVerzeichnis, { recursive: true })

  const startvorlagePfadMitCodex = join(basisVerzeichnis, 'startvorlage-mit-codex.json')
  const vorlageBasis = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  writeFileSync(
    startvorlagePfadMitCodex,
    JSON.stringify({ ...vorlageBasis, worker: { codex: { startziel: [process.execPath], versionDeklariert: '0.153.4 (Codex CLI, Gate-Fixture)', sandbox: 'read-only' } } }),
    'utf8'
  )

  // repoWurzel eines Wegwerf-Projekts OHNE CLAUDE.md — istStackOffen liefert dafür true (Muster
  // src/architekt/architekt.test.ts, check-f42-projekt-harness.mjs (f1)). Kein echtes Git-Repo
  // nötig: der architekt-Schritt läuft mit Werkzeugsatz 'lesend', die reale Git-Vorbedingung
  // (leseAusfuehrungsVorbedingungRealGit) greift laut scripts/leitstand-server.mjs (~Zeile 2203)
  // nur bei 'schreibend'.
  const repoWurzelOffenerStack = mkdtempSync(join(tmpdir(), 'f39-n4-repo-offen-'))

  let gesehenerAuftragstext = null
  const fuehreAufgabeDurchFn = async (_laufId, _profilReferenz, eingaben) => {
    gesehenerAuftragstext = eingaben.auftragstext
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn, startvorlagePfad: startvorlagePfadMitCodex, repoWurzel: repoWurzelOffenerStack }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`

  try {
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
      method: 'POST',
      body: JSON.stringify({ titel: 'F39-WS-3a-Gate-n4', auftragstext: 'GATE-PLANUNGSTEXT-EINDEUTIG-F39-N4' }),
    })
    const { auftragId } = await auftragAntwort.json()
    if (auftragAntwort.status !== 201 || typeof auftragId !== 'string') {
      throw new Error(`(n4)-Vorbereitung: POST /api/auftraege erwartet 201 mit auftragId, erhalten ${auftragAntwort.status}`)
    }
    const workflowId = `gate-f39-n4-${randomUUID()}`
    const workflowPayload = {
      workflow_schema: 'v0',
      workflow_id: workflowId,
      auftrag_id: auftragId,
      version: 1,
      ziel: 'Gate-Fixture (F-707).',
      status: 'OFFEN',
      aktiver_schritt_id: 'schritt-1',
      grund: null,
      grenzen: { max_schritte: 3, max_replans: 1 },
      schritte: [
        {
          schritt_id: 'schritt-1',
          rolle: 'architekt',
          werkzeugsatz: 'lesend',
          worker: 'codex',
          modell: 'gpt-6-astra',
          eingaben: [],
          output_schema: 'ergebnis-architektur',
          freigabe: 'AUTOMATISCH',
          risiko: 'Gate-Fixture, kein realer Lauf.',
          zeitgrenze_ms: 600000,
          nachfolger: null,
          status: 'OFFEN',
          lauf_id: null,
        },
      ],
    }
    const anlage = await fetch(`${basisUrl}/api/workflows`, { method: 'POST', body: JSON.stringify(workflowPayload) })
    if (anlage.status !== 201) {
      throw new Error(`(n4)-Vorbereitung: POST /api/workflows erwartet 201, erhalten ${anlage.status} (${await anlage.text()})`)
    }
    const start = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (start.status !== 202) {
      throw new Error(`(n4)-Vorbereitung: POST /api/workflows/<id>/starten erwartet 202, erhalten ${start.status} (${await start.text()})`)
    }

    const STACK_HINWEIS_MARKER = 'NICHT selbst fest'
    if (typeof gesehenerAuftragstext !== 'string' || !gesehenerAuftragstext.includes('GATE-PLANUNGSTEXT-EINDEUTIG-F39-N4')) {
      befunde.push(`(n4) realer Schrittstart gegen eine repoWurzel ohne CLAUDE.md: erwartet den umhüllten Planungstext, erhalten: ${JSON.stringify(gesehenerAuftragstext)?.slice(0, 300)}…`)
    } else if (!gesehenerAuftragstext.includes(STACK_HINWEIS_MARKER)) {
      befunde.push(`(n4) F-707: realer Schrittstart gegen eine repoWurzel OHNE CLAUDE.md (offener Stack) sollte den Stack-Hinweis tragen, tat es aber nicht — STACK_OFFEN_HINWEIS erreicht den Architekten zur Laufzeit nicht: ${JSON.stringify(gesehenerAuftragstext)?.slice(0, 300)}…`)
    }

    if (befunde.length === befundeVor) {
      console.log(
        "✓ (n4) F-707: der REALE Schrittstart-Pfad gegen eine repoWurzel OHNE CLAUDE.md (offener Stack) hängt den Stack-Hinweis real an — istStackOffen(repoWurzel) erreicht baueArchitektAuftragstext über scripts/leitstand-server.mjs tatsächlich, nicht nur den reinen Builder."
      )
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (o) F39 WS-3a, Punkt 2: baueUmsetzungsInstruktion + realer Schrittstart 'ausfuehrung' ──
{
  const befundeVor = befunde.length

  // (o0) Pure Funktion: die vier Übersetzungsregeln stehen im Zusatzblock.
  const instruktion = baueUmsetzungsInstruktion().join('\n')
  const erwarteteFragmente = ['docs/adr/TEMPLATE.md', 'schemas/examples/', 'feature.md', 'Entscheidung (Mensch)']
  const fehlendeFragmente = erwarteteFragmente.filter((fragment) => !instruktion.includes(fragment))
  if (fehlendeFragmente.length > 0) {
    befunde.push(`(o0) baueUmsetzungsInstruktion: erwartet Fragmente ${JSON.stringify(erwarteteFragmente)}, es fehlen ${JSON.stringify(fehlendeFragmente)}`)
  } else {
    console.log('✓ (o0): baueUmsetzungsInstruktion trägt alle vier Übersetzungsregeln (ADR/Schema/feature.md-Abschnitte/Entscheidung (Mensch)).')
  }

  // (o1)/(o2) realer Schrittstart-Pfad: ein 'ausfuehrung'-Schritt MIT 'ergebnis-@<architekt>'-
  // Eingabe bekommt den Zusatzblock angehängt; einer OHNE eine solche Eingabe bleibt unverändert.
  const basisVerzeichnis = `kontrollzustand-test-f39-o-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const vorlage = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const profilReferenz = leiteProfilReferenzAb(vorlage)

  let gesehenerAuftragstext = null
  const fuehreAufgabeDurchFn = async (_laufId, _profilReferenz, eingaben) => {
    gesehenerAuftragstext = eingaben.auftragstext
    return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }
  // E-F39-1=B (löst F-643): der 'ausfuehrung'-Schritt hier braucht ein sauberes, NICHT
  // main/master Wegwerf-Git-Repo als repoWurzel — sonst liefe die neue Ausführungs-Vorbedingung
  // (loeseAusfuehrungsEingabenAuf) gegen DIESES Repos echten, unvorhersagbaren Git-Zustand
  // (process.cwd(), Default) statt gegen eine feste Fixture.
  const repoWurzelWegwerf = mkdtempSync(join(tmpdir(), 'f39-o-repo-'))
  execFileSync('git', ['init', '--quiet', '-b', 'wegwerf-branch'], { cwd: repoWurzelWegwerf })

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, fuehreAufgabeDurchFn, repoWurzel: repoWurzelWegwerf }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`

  /**
   * Legt real einen Auftrag, einen bereits ERFOLGREICH gelaufenen 'architekt'-Schritt (echte
   * Laufakte + Rohstrom, Muster (g4)) und einen zum Start fälligen 'ausfuehrung'-Folgeschritt an
   * — der Cursor (aktiver_schritt_id) zeigt bereits auf den Folgeschritt (Erststart-Auslegung von
   * ermittleNaechstenSchritt: ohne vorschrittErgebnis startet der Schritt, auf den der Cursor
   * zeigt). 'ausfuehrungEingaben' bestimmt, ob der Folgeschritt eine 'ergebnis-@'-Eingabe auf den
   * architekt-Schritt trägt.
   * @returns der Auftragstext, den fuehreAufgabeDurchFn für den 'ausfuehrung'-Schritt real sah
   */
  async function starteAusfuehrungSchrittUndLiesAuftragstext(ausfuehrungEingaben) {
    gesehenerAuftragstext = null
    const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, {
      method: 'POST',
      body: JSON.stringify({ titel: 'F39-WS-3a-Gate-o', auftragstext: 'GATE-PLANUNGSTEXT-EINDEUTIG-F39-O' }),
    })
    const { auftragId } = await auftragAntwort.json()
    if (auftragAntwort.status !== 201 || typeof auftragId !== 'string') {
      throw new Error(`(o)-Vorbereitung: POST /api/auftraege erwartet 201 mit auftragId, erhalten ${auftragAntwort.status}`)
    }

    const workflowId = `gate-f39-o-${randomUUID()}`
    const architektLaufId = `${workflowId}-architekt-lauf`
    const ergebnisArchitektur = {
      modus: 'feature',
      zusammenfassung: 'Gate-Fixture-Entwurf (F39 WS-3a).',
      module: [{ name: 'GateModul', zweck: 'Testzweck.', abhaengigkeiten: [] }],
      adr_entwuerfe: [{ titel: 'Gate-ADR', kontext: 'x', entscheidung: 'x', alternativen: [], konsequenzen: [] }],
      schema_entwuerfe: [],
      entscheidungen_mensch: [],
      capabilities_bedarf: [],
      evidenz: [{ marker: '[Fakt]', aussage: 'Gate-Fixture.' }],
    }
    mkdirSync(basisVerzeichnis, { recursive: true })
    const rohstromPfad = join(basisVerzeichnis, `${architektLaufId}-rohstrom.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(ergebnisArchitektur) }) }))
    registriereKernArtefakt(
      `laufakte-${architektLaufId}`,
      profilReferenz,
      { erzeuger: 'kern', schritt: 'gate-fixture' },
      { laufakte_schema: 'v0', lauf_id: architektLaufId, worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } },
      [],
      ladeOptionen
    )

    registriereWorkflow(
      {
        workflow_schema: 'v0',
        workflow_id: workflowId,
        auftrag_id: auftragId,
        version: 1,
        ziel: 'Gate-Fixture (F39 WS-3a, Punkt 2).',
        status: 'LAEUFT',
        aktiver_schritt_id: 'schritt-2-ausfuehrung',
        grund: null,
        grenzen: { max_schritte: 4, max_replans: 1 },
        schritte: [
          {
            schritt_id: 'schritt-1-architekt',
            rolle: 'architekt',
            werkzeugsatz: 'lesend',
            worker: 'codex',
            modell: 'gpt-6-astra',
            eingaben: [],
            output_schema: 'ergebnis-architektur',
            freigabe: 'ZWINGEND',
            risiko: 'Gate-Fixture.',
            zeitgrenze_ms: 600000,
            nachfolger: 'schritt-2-ausfuehrung',
            status: 'ERFOLGREICH',
            lauf_id: architektLaufId,
          },
          {
            schritt_id: 'schritt-2-ausfuehrung',
            rolle: 'ausfuehrung',
            werkzeugsatz: 'schreibend',
            worker: 'claude-code',
            modell: 'claude-sonnet-5',
            eingaben: ausfuehrungEingaben,
            output_schema: null,
            freigabe: 'AUTOMATISCH',
            risiko: 'Gate-Fixture.',
            zeitgrenze_ms: 600000,
            nachfolger: null,
            status: 'OFFEN',
            lauf_id: null,
          },
        ],
      },
      profilReferenz,
      ladeOptionen
    )

    const start = await fetch(`${basisUrl}/api/workflows/${encodeURIComponent(workflowId)}/starten`, { method: 'POST' })
    if (start.status !== 202) {
      throw new Error(`(o)-Vorbereitung: POST /api/workflows/<id>/starten erwartet 202, erhalten ${start.status} (${await start.text()})`)
    }
    return gesehenerAuftragstext
  }

  try {
    // (o1) MIT 'ergebnis-@<architekt>'-Eingabe: der Zusatzblock wird real angehängt.
    const mitArchitekt = await starteAusfuehrungSchrittUndLiesAuftragstext(['artefakt:ergebnis-@schritt-1-architekt'])
    if (typeof mitArchitekt !== 'string' || !mitArchitekt.includes('GATE-PLANUNGSTEXT-EINDEUTIG-F39-O') || !mitArchitekt.includes('docs/adr/TEMPLATE.md')) {
      befunde.push(`(o1) 'ausfuehrung' MIT ergebnis-@<architekt>: erwartet den ursprünglichen Auftragstext PLUS den Umsetzungs-Zusatzblock, erhalten: ${JSON.stringify(mitArchitekt)?.slice(0, 300)}…`)
    }

    // (o2) OHNE eine solche Eingabe (nur der Auftrag selbst): bitgenau unverändert, kein Zusatzblock.
    const ohneArchitekt = await starteAusfuehrungSchrittUndLiesAuftragstext([])
    if (ohneArchitekt !== 'GATE-PLANUNGSTEXT-EINDEUTIG-F39-O') {
      befunde.push(`(o2) 'ausfuehrung' OHNE ergebnis-@<architekt>-Eingabe: erwartet bitgenau den ursprünglichen Auftragstext ohne Zusatzblock, erhalten: ${JSON.stringify(ohneArchitekt)?.slice(0, 300)}…`)
    }

    if (befunde.length === befundeVor) {
      console.log(
        "✓ (o1)/(o2): der REALE Schrittstart-Pfad hängt den Umsetzungs-Zusatzblock NUR an, wenn der 'ausfuehrung'-Schritt eine 'ergebnis-@<architekt-Schritt>'-Eingabe trägt — sonst bleibt der Auftragstext bitgenau unverändert (Regression)."
      )
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
    raeumeVerzeichnis(repoWurzelWegwerf)
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
