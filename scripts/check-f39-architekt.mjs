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
 * Aufruf: node scripts/check-f39-architekt.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROLLENVERTRAEGE } from '../src/rollen/index.ts'
import { baueArchitektAuftragstext, validiereErgebnisArchitektur } from '../src/architekt/index.ts'
import { validiereAuftragHerkunft } from '../src/auftrag/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { bestimmeEffektiveKontrolltiefe, waehleWorkflowVorlage } from '../src/router/index.ts'
import { ladeStartvorlage } from '../src/startvorlage/index.ts'
import { loeseAusfuehrungsEingabenAuf, loeseSchrittEingabenAuf, pruefeAuftragsformular } from './leitstand-server.mjs'
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
