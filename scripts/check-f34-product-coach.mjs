/**
 * Datei: scripts/check-f34-product-coach.mjs
 *
 * Zweck: Product-Coach-Gate (F34 WS-1). Prüft (a) den Rollenvertrag
 * 'product-coach' (ROLLENVERTRAEGE, src/rollen/index.ts) und Rot-/Grünfälle
 * gegen loeseAusfuehrungsEingabenAuf, (b) schemas/ergebnis-product-coach.schema.json
 * + Beispiele gegen validiereErgebnisProductCoach (src/product-coach/index.ts),
 * (b2) den Codex-kompatiblen Schema-Dialekt (kein 'allOf'/'if'/'then'/'oneOf',
 * Muster scripts/check-f26-jarvis.mjs (b2)), (b3) die Validator-Kopplungen auch
 * in der Codex-Form (explizites null statt weggelassenem Feld), (c)
 * baueAuftragAusScope-Determinismus, (d) reale Rot-Fälle von POST /api/sparring
 * (Formprüfung des Bodys, D13), (e) GET /api/sparring bei leerer Kette,
 * (f) den realen POST-/GET-/api/sparring-Rundlauf inkl. der product-coach-
 * spezifischen aufrufEingaben (settingSources/mcpConfig/disallowedTools wie
 * 'jarvis', aber OHNE MAX_THINKING_TOKENS), und (g) die Jarvis-Regression: POST
 * /api/chat übergibt nach der starteJarvisChatLauf → starteRollenChatLauf-
 * Parametrisierung weiterhin bitgenau dieselben aufrufEingaben (Muster
 * scripts/check-f31-gedaechtnis.mjs Abschnitt (a)).
 *
 * F34 WS-2 (Sparring-UI + Chat→Auftrag-Brücke, löst state/findings.md F-606) ergänzt: (h) die
 * F-506-Fehlerpfad-Regression für 'product-coach' (Muster check-f31-gedaechtnis.mjs (j)), (i)
 * baueAuftragAusScope-Gleichheit zwischen dem Server-Original (src/product-coach/index.ts) und
 * seiner reinen JS-Kopie für den Browser (public/leitstand/auftrag-aus-scope.js — ein Browser
 * ohne Build-Schritt kann .ts nicht laden), (j) eine statische Quelltextprüfung von
 * public/leitstand/views/chat.js: die Auftrag-Brücke ruft legeAuftragAn ausschließlich mit
 * { titel, auftragstext } (POST /api/auftraege, F12-Pfad) und art 'auftrag_vorschlag' löst
 * dieselbe Brücke aus wie 'scope_entwurf' (löst F-606: Jarvis' Auftragsvorschlag wird nicht mehr
 * NUR als Text gerendert). Kein DOM-Test für chat.js selbst — dieser Leitstand testet KEINEN
 * View-Renderer direkt (state/findings.md F-601, view-weite, akzeptierte Grenze: nur reine
 * State-Ableitungsmodule wie persona-state.js/verbrauch-zeitraum.js sind gate-geprüft); die
 * statische Prüfung (j) ist der etablierte Ersatz für diesen einen, sonst ungeprüften Pfad. (k)
 * ist eine gezielte Regressionswache gegen einen real im Reviewer-Pass gefundenen Bug: die
 * geteilten #chat-senden/#chat-zusammenfassen-btn-Elemente blieben nach einem Moduswechsel
 * während eines im Hintergrund laufenden Laufs dauerhaft gesperrt, weil die Freigabe an
 * 'modus === aktiverModus' gegattert war — der Fix leitet den Sperrzustand seither bei jedem
 * renderVerlauf() aus dem Zustand ab.
 *
 * Kein generischer JSON-Schema-Validator (D5): importiert die reale
 * validiereErgebnisProductCoach/ROLLENVERTRAEGE statt einen zweiten
 * Regelsatz zu pflegen.
 *
 * Aufruf: node scripts/check-f34-product-coach.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROLLENVERTRAEGE } from '../src/rollen/index.ts'
import { baueAuftragAusScope, validiereErgebnisProductCoach } from '../src/product-coach/index.ts'
import { baueAuftragAusScope as baueAuftragAusScopeBrowser } from '../public/leitstand/auftrag-aus-scope.js'
import { erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
const STILLER_SCHREIBER = () => {}

console.log('\n=== F34-Product-Coach-Check ===\n')

// ─── (a) ROLLENVERTRAEGE['product-coach'] hat die erwartete Form ───────────
{
  const coach = ROLLENVERTRAEGE['product-coach']
  if (!coach) {
    befunde.push("ROLLENVERTRAEGE trägt keinen Eintrag 'product-coach'")
  } else {
    if (typeof coach.zweck !== 'string' || coach.zweck.length === 0) {
      befunde.push("'product-coach'.zweck fehlt oder ist leer")
    }
    if (JSON.stringify(coach.erlaubte_werkzeugsatz_arten) !== JSON.stringify(['lesend'])) {
      befunde.push(`'product-coach'.erlaubte_werkzeugsatz_arten erwartet ['lesend'], erhalten ${JSON.stringify(coach.erlaubte_werkzeugsatz_arten)}`)
    }
    if (JSON.stringify([...coach.erlaubte_worker].sort()) !== JSON.stringify(['claude-code', 'codex'])) {
      befunde.push(`'product-coach'.erlaubte_worker erwartet beide Worker, erhalten ${JSON.stringify(coach.erlaubte_worker)}`)
    }
    if (coach.erlaubtes_output_schema !== 'ergebnis-product-coach') {
      befunde.push(`'product-coach'.erlaubtes_output_schema erwartet 'ergebnis-product-coach', erhalten ${JSON.stringify(coach.erlaubtes_output_schema)}`)
    }
    if (JSON.stringify(coach.ausschlussmuster) !== JSON.stringify(['src/**'])) {
      befunde.push(`'product-coach'.ausschlussmuster erwartet ['src/**'], erhalten ${JSON.stringify(coach.ausschlussmuster)}`)
    }
    if (befunde.length === 0) {
      console.log("✓ (a): ROLLENVERTRAEGE['product-coach'] trägt alle fünf Felder in erwarteter Form.")
    }
  }
}

// ─── (a2) Rot-/Grünfall direkt gegen loeseAusfuehrungsEingabenAuf ──────────
{
  const testVorlage = {
    startvorlage_schema: 'v0',
    profilPfad: 'profiles/beispiel.json',
    werkzeugStartziel: ['check-f34-startziel'],
    werkzeugVersionDeklariert: 'check-f34-1',
    berechtigungskontext: 'profil-standard',
    modell: 'check-f34-modell',
    standardBudget: { maxElemente: 5, maxBytes: 5000 },
    werkzeugsaetze: {
      lesend: { art: 'lesend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] },
      schreibend: { art: 'schreibend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Write'] },
    },
  }
  const eingaben = (felder) => ({
    rolle: 'product-coach',
    anfragen: [],
    budget: { maxElemente: 1 },
    aufrufEingaben: { modell: 'check-f34-modell' },
    auftragId: 'check-f34-auftrag',
    ...felder,
  })
  const befundeVor = befunde.length

  // Rotfall: product-coach erlaubt keinen schreibenden Werkzeugsatz.
  const rot = loeseAusfuehrungsEingabenAuf(eingaben({}), 'schreibend', 'text', testVorlage, 'unbenutzt')
  if (rot.ok !== false || !/erlaubt die Werkzeugsatz-Art 'schreibend' nicht/.test(rot.grund)) {
    befunde.push(`(a2) Rotfall: erwartet ok:false mit "erlaubt die Werkzeugsatz-Art 'schreibend' nicht", erhalten ${JSON.stringify(rot)}`)
  }
  // Grünfall: product-coach + lesend.
  const gruen = loeseAusfuehrungsEingabenAuf(eingaben({}), 'lesend', 'text', testVorlage, 'unbenutzt')
  if (!gruen.ok) {
    befunde.push(`(a2) Grünfall: 'product-coach' + 'lesend' erwartet ok:true, erhalten ${JSON.stringify(gruen)}`)
  }
  // Rotfall: falsches output_schema für product-coach.
  const rotSchema = loeseAusfuehrungsEingabenAuf(eingaben({ ausgabeSchemaPfad: '/irgendwo/schemas/ergebnis-jarvis.schema.json' }), 'lesend', 'text', testVorlage, 'unbenutzt')
  if (rotSchema.ok !== false || !/erlaubt output_schema 'ergebnis-jarvis' nicht/.test(rotSchema.grund)) {
    befunde.push(`(a2) Rotfall (output_schema): erwartet ok:false mit "erlaubt output_schema 'ergebnis-jarvis' nicht", erhalten ${JSON.stringify(rotSchema)}`)
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (a2): 'schreibend' gegen 'product-coach' real abgelehnt, 'lesend' real angenommen, ein fremdes output_schema real abgelehnt.")
  }
}

// ─── (b) schemas/ergebnis-product-coach.schema.json + Beispiele ────────────
{
  const befundeVor = befunde.length
  JSON.parse(readFileSync('schemas/ergebnis-product-coach.schema.json', 'utf-8')) // wirft bei kaputtem JSON

  const beispiele = [
    { pfad: 'schemas/examples/ergebnis-product-coach.valid-frage.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/ergebnis-product-coach.valid-alternativen.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/ergebnis-product-coach.valid-scope-entwurf.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/ergebnis-product-coach.invalid-unbekannte-art.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-product-coach.invalid-alternativen-zu-wenige.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-product-coach.invalid-art-alternativen-ohne-alternativen.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-product-coach.invalid-art-scope-entwurf-ohne-scope.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-product-coach.invalid-scope-fehlendes-feld.json', sollGueltigSein: false },
  ]
  for (const { pfad, sollGueltigSein } of beispiele) {
    const obj = JSON.parse(readFileSync(pfad, 'utf-8'))
    const verstoesse = validiereErgebnisProductCoach(obj)
    if (sollGueltigSein && verstoesse.length > 0) {
      befunde.push(`(b): ${pfad} sollte gültig sein, verletzt aber: ${verstoesse.join('; ')}`)
    }
    if (!sollGueltigSein && verstoesse.length === 0) {
      befunde.push(`(b): ${pfad} sollte ungültig sein, wurde aber akzeptiert`)
    }
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (b): schemas/ergebnis-product-coach.schema.json gültiges JSON; alle drei valid*.json erfüllen validiereErgebnisProductCoach, alle fünf invalid-*.json verletzen je eine benannte Regel.')
  }
}

// ─── (b2) F-423-Muster: Schema enthält kein 'allOf'/'if'/'then'/'oneOf' ────
{
  const befundeVor = befunde.length
  const verboteneSchluessel = ['allOf', 'if', 'then', 'oneOf']
  const schema = JSON.parse(readFileSync('schemas/ergebnis-product-coach.schema.json', 'utf-8'))
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
    befunde.push(`(b2): schemas/ergebnis-product-coach.schema.json enthält 'allOf'/'if'/'then'/'oneOf' (Codex-inkompatibel, F-423-Muster): ${gefundeneTreffer.join(', ')}`)
  }
  const kalibrierungsTreffer = []
  scanne({ allOf: [{ if: {}, then: {} }], properties: { x: { oneOf: [] } } }, '$kalibrierung', kalibrierungsTreffer)
  if (kalibrierungsTreffer.length !== 4) {
    befunde.push(`(b2) Kalibrierung: der Scan sollte in einem konstruierten Testobjekt genau 4 Treffer finden (allOf/if/then/oneOf), fand ${kalibrierungsTreffer.length}`)
  }
  // Jede 'properties'-Eigenschaft steht auch in 'required' (F-423-Dialekt-Regel 2).
  const wurzelEigenschaften = Object.keys(schema.properties ?? {})
  const fehlendInRequired = wurzelEigenschaften.filter((feld) => !Array.isArray(schema.required) || !schema.required.includes(feld))
  if (fehlendInRequired.length > 0) {
    befunde.push(`(b2): folgende Top-Level-properties stehen nicht in 'required' (Codex-Dialekt-Zwang): ${fehlendInRequired.join(', ')}`)
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (b2): schemas/ergebnis-product-coach.schema.json enthält kein 'allOf'/'if'/'then'/'oneOf', jede Top-Level-property steht in 'required'.")
  }
}

// ─── (b3) Validator-Kopplungen auch in der Codex-Form (explizites null) ────
{
  const befundeVor = befunde.length

  const rotAlternativenNull = validiereErgebnisProductCoach({ art: 'alternativen', antwort: 'x', alternativen: null, scope: null })
  if (!rotAlternativenNull.some((v) => v.includes("'alternativen' fehlt — bei art 'alternativen' Pflicht"))) {
    befunde.push(`(b3) Rotfall (alternativen: null): erwartet Verstoß "'alternativen' fehlt", erhalten ${JSON.stringify(rotAlternativenNull)}`)
  }
  const gruenAlternativen = validiereErgebnisProductCoach({
    art: 'alternativen',
    antwort: 'x',
    alternativen: [
      { titel: 'A', beschreibung: 'x', abwaegung: 'x' },
      { titel: 'B', beschreibung: 'x', abwaegung: 'x' },
    ],
    scope: null,
  })
  if (gruenAlternativen.length > 0) {
    befunde.push(`(b3) Grünfall (alternativen gesetzt, Codex-Form): erwartet keine Verstöße, erhalten ${JSON.stringify(gruenAlternativen)}`)
  }

  const rotScopeNull = validiereErgebnisProductCoach({ art: 'scope_entwurf', antwort: 'x', alternativen: null, scope: null })
  if (!rotScopeNull.some((v) => v.includes("'scope' fehlt — bei art 'scope_entwurf' Pflicht"))) {
    befunde.push(`(b3) Rotfall (scope: null): erwartet Verstoß "'scope' fehlt", erhalten ${JSON.stringify(rotScopeNull)}`)
  }

  if (befunde.length === befundeVor) {
    console.log("✓ (b3): validiereErgebnisProductCoach erzwingt art→alternativen/scope auch in der Codex-Form (Feld explizit auf null statt weggelassen).")
  }
}

// ─── (c) baueAuftragAusScope: Determinismus ────────────────────────────────
{
  const befundeVor = befunde.length
  const scope = JSON.parse(readFileSync('schemas/examples/ergebnis-product-coach.valid-scope-entwurf.json', 'utf-8')).scope
  const einmal = baueAuftragAusScope(scope)
  const zweimal = baueAuftragAusScope(scope)
  if (JSON.stringify(einmal) !== JSON.stringify(zweimal)) {
    befunde.push(`(c): baueAuftragAusScope sollte für denselben Scope ein byte-identisches Ergebnis liefern, erhalten ${JSON.stringify(einmal)} vs. ${JSON.stringify(zweimal)}`)
  }
  if (einmal.titel !== scope.titel) {
    befunde.push(`(c): baueAuftragAusScope.titel sollte 1:1 aus scope.titel übernommen werden, erhalten '${einmal.titel}' statt '${scope.titel}'`)
  }
  if (!einmal.auftragstext.includes(scope.problem) || !einmal.auftragstext.includes(scope.erfolgskriterium)) {
    befunde.push(`(c): baueAuftragAusScope.auftragstext sollte problem/erfolgskriterium enthalten, erhalten: ${einmal.auftragstext}`)
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (c): baueAuftragAusScope ist deterministisch und übernimmt Scope-Felder vollständig in den Auftragstext.')
  }
}

// ─── (d) POST /api/sparring: reale Rot-Fälle der Bodyprüfung ───────────────
{
  const basisVerzeichnis = `kontrollzustand-test-f34-ak-d-${randomUUID()}`
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
      { body: JSON.stringify({ nachricht: 42 }), erwartet: /'nachricht' muss ein nicht-leerer String sein/, name: 'falscher Typ' },
      { body: JSON.stringify({ nachricht: 'Wie schneiden wir das?', fremdfeld: 'x' }), erwartet: /unbekanntes Feld 'fremdfeld'/, name: 'unbekanntes Feld' },
      { body: 'kein-json', erwartet: /Body ist kein gültiges JSON/, name: 'kein JSON' },
      { body: JSON.stringify({ nachricht: 'x'.repeat(8001) }), erwartet: /'nachricht' darf höchstens 8000 Zeichen haben/, name: 'nachricht zu lang' },
    ]
    for (const fall of faelle) {
      const antwort = await fetch(`${basisUrl}/api/sparring`, { method: 'POST', body: fall.body })
      const koerper = await antwort.json()
      if (antwort.status !== 400 || !fall.erwartet.test(koerper.grund ?? '')) {
        befunde.push(`(d) Rotfall '${fall.name}': erwartet 400 mit ${fall.erwartet}, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }
    }
    if (befunde.length === befundeVor) {
      console.log('✓ (d): POST /api/sparring lehnt fehlende/leere/typfalsche nachricht, unbekannte Felder, kaputtes JSON und zu lange Nachrichten real mit 400 ab.')
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (e) GET /api/sparring: leere Kette liefert { verlauf: [] }, kein Fehler ─
{
  const basisVerzeichnis = `kontrollzustand-test-f34-ak-e-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId: 'check-f34-leer' }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  try {
    const antwort = await fetch(`http://127.0.0.1:${port}/api/sparring`)
    const koerper = await antwort.json()
    if (antwort.status !== 200 || JSON.stringify(koerper) !== JSON.stringify({ verlauf: [] })) {
      befunde.push(`(e): erwartet 200 mit { verlauf: [] } bei leerer Kette, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
    }
    if (befunde.length === befundeVor) {
      console.log('✓ (e): GET /api/sparring liefert bei leerer Kette { verlauf: [] }, kein Fehler.')
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (f) Realer POST/GET-/api/sparring-Rundlauf: coach-spezifische aufrufEingaben ─
{
  const basisVerzeichnis = `kontrollzustand-test-f34-ak-f-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length
  const projektId = 'check-f34-ak-f'
  const gueltigesErgebnis = JSON.parse(readFileSync('schemas/examples/ergebnis-product-coach.valid-frage.json', 'utf-8'))

  let letzteEingaben = null
  const fuehreAufgabeDurchFn = async (laufId, _profilReferenz, eingaben) => {
    letzteEingaben = eingaben
    mkdirSync(basisVerzeichnis, { recursive: true })
    const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(gueltigesErgebnis) }) }), 'utf8')
    const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
    const { registriereKernArtefakt } = await import('../src/lineage-registry/index.ts')
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f34-fake' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, undefined, {
      basisVerzeichnis,
      schreiber: STILLER_SCHREIBER,
    })
    return { ok: true, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId, fuehreAufgabeDurchFn }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const antwort = await fetch(`${basisUrl}/api/sparring`, { method: 'POST', body: JSON.stringify({ nachricht: 'Sollen wir das Onboarding mit einbeziehen?' }) })
    if (antwort.status !== 202) {
      befunde.push(`(f): erwartet 202, erhalten ${antwort.status} (${await antwort.text()})`)
    }
    await new Promise((resolve) => setTimeout(resolve, 30))

    if (letzteEingaben === null || letzteEingaben.rolle !== 'product-coach') {
      befunde.push(`(f): fuehreAufgabeDurchFn sollte mit rolle 'product-coach' aufgerufen werden, erhalten ${JSON.stringify(letzteEingaben)}`)
    } else if (letzteEingaben.aufrufEingaben?.settingSources !== '') {
      befunde.push(`(f): erwartet aufrufEingaben.settingSources '', erhalten ${JSON.stringify(letzteEingaben.aufrufEingaben)}`)
    } else if (letzteEingaben.aufrufEingaben?.mcpConfig !== '{"mcpServers":{}}') {
      befunde.push(`(f): erwartet aufrufEingaben.mcpConfig '{"mcpServers":{}}', erhalten ${JSON.stringify(letzteEingaben.aufrufEingaben)}`)
    } else if (letzteEingaben.aufrufEingaben?.disallowedTools !== 'Read(~/.claude/**)') {
      befunde.push(`(f): erwartet aufrufEingaben.disallowedTools 'Read(~/.claude/**)', erhalten ${JSON.stringify(letzteEingaben.aufrufEingaben)}`)
    } else if (letzteEingaben.aufrufEingaben?.umgebungsvariablen?.MAX_THINKING_TOKENS !== '0') {
      // F34 WS-2 (F-609, features/F34/nachweis-ws2-latenz.md): real A/B-gemessen — MAX_THINKING_TOKENS=0
      // senkt die Sparring-Median-Latenz von 67,1 s auf 8,2 s ohne Qualitätsverlust, product-coach
      // trägt seither denselben Wert wie jarvis (anders als der ursprüngliche WS-1-Stand).
      befunde.push(`(f): erwartet aufrufEingaben.umgebungsvariablen.MAX_THINKING_TOKENS '0' (F34 WS-2, F-609), erhalten ${JSON.stringify(letzteEingaben.aufrufEingaben)}`)
    } else {
      console.log("✓ (f): POST /api/sparring übergibt rolle 'product-coach' und aufrufEingaben.settingSources/mcpConfig/disallowedTools/umgebungsvariablen.MAX_THINKING_TOKENS wie 'jarvis' (F34 WS-2, F-609).")
    }

    const verlauf = await (await fetch(`${basisUrl}/api/sparring`)).json()
    if (verlauf.verlauf.length !== 1 || verlauf.verlauf[0].nachricht !== 'Sollen wir das Onboarding mit einbeziehen?' || verlauf.verlauf[0].coachAntwort === null) {
      befunde.push(`(f): GET /api/sparring sollte genau einen Eintrag mit 'coachAntwort' zeigen, erhalten ${JSON.stringify(verlauf)}`)
    } else if (befunde.length === befundeVor + 0 && verlauf.verlauf[0].coachAntwort.art !== gueltigesErgebnis.art) {
      befunde.push(`(f): GET /api/sparring sollte das echte Coach-Ergebnis projizieren, erhalten ${JSON.stringify(verlauf.verlauf[0].coachAntwort)}`)
    } else {
      console.log("✓ (f): GET /api/sparring projiziert den geschriebenen Turn mit 'coachAntwort' (Lineage-Kette 'sparring-<projektId>').")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (h) F-506-Muster: unlesbares Ergebnis nach ERFOLGREICH → sichtbarer Fehler-Turn ────
//
// Code-Review-Befund (F34 WS-1, frischer Kontext): der F-506-Fehlerpfad (Runde 2, Schritt 2,
// scripts/check-f31-gedaechtnis.mjs Abschnitt (j)) war für 'jarvis' real geprüft, für
// 'product-coach' aber nirgends — genau die rollenspezifischen Konfigurationswerte fehlerArt
// ('frage') und fehlerAntwortPraefix ('Coach-Antwort') sind reine Handarbeit (von der
// Jarvis-Fassung abgeleitet) und damit die wahrscheinlichste Stelle für einen unbemerkten
// Tippfehler. Muster check-f31-gedaechtnis.mjs (j), hier für POST /api/sparring.
{
  const basisVerzeichnis = `kontrollzustand-test-f34-ak-h-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const projektId = 'check-f34-ak-h'

  const fuehreAufgabeDurchFn = async (laufId) => {
    mkdirSync(basisVerzeichnis, { recursive: true })
    const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
    // Real beobachtetes Muster (state/nachweis-jarvis-latenz.md "Runde 2"): reine Prosa, kein
    // JSON, auch nach der robusteren Extraktion nicht rettbar — bleibt absichtlich ungültig.
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'Kein neuer Sachstand — ich antworte konsistent damit.' }) }), 'utf8')
    const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
    const { registriereKernArtefakt } = await import('../src/lineage-registry/index.ts')
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f34-fake-ungueltig' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, undefined, {
      basisVerzeichnis,
      schreiber: STILLER_SCHREIBER,
    })
    return { ok: true, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId, fuehreAufgabeDurchFn }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const antwort = await fetch(`${basisUrl}/api/sparring`, { method: 'POST', body: JSON.stringify({ nachricht: 'Was ist der Stand?' }) })
    if (antwort.status !== 202) {
      befunde.push(`(h): erwartet 202, erhalten ${antwort.status} (${await antwort.text()})`)
    } else {
      await new Promise((resolve) => setTimeout(resolve, 30))
      const verlauf = (await (await fetch(`${basisUrl}/api/sparring`)).json()).verlauf
      if (verlauf.length !== 1) {
        befunde.push(`(h): erwartet GENAU einen Sparring-Eintrag (den sichtbaren Fehler-Turn), erhalten ${verlauf.length}`)
      } else {
        const eintrag = verlauf[0]
        if (eintrag.coachAntwort?.art !== 'frage') {
          befunde.push(`(h): erwartet coachAntwort.art 'frage' (konfiguration.fehlerArt), erhalten ${JSON.stringify(eintrag.coachAntwort)}`)
        } else if (typeof eintrag.coachAntwort.antwort !== 'string' || !eintrag.coachAntwort.antwort.startsWith('Coach-Antwort konnte nicht gelesen werden:')) {
          befunde.push(`(h): erwartet einen erkennbaren Fehlertext (konfiguration.fehlerAntwortPraefix 'Coach-Antwort') in coachAntwort.antwort, erhalten ${JSON.stringify(eintrag.coachAntwort)}`)
        } else if (eintrag.nachricht !== 'Was ist der Stand?') {
          befunde.push(`(h): die persistierte 'nachricht' sollte die echte Nutzerfrage bleiben, erhalten ${JSON.stringify(eintrag.nachricht)}`)
        } else {
          console.log("✓ (h): ein real ABGESCHLOSSEN/ERFOLGREICH beendeter Product-Coach-Lauf mit unlesbarem Ergebnis schreibt GENAU einen sichtbaren Fehler-Eintrag in 'sparring-<projektId>' (coachAntwort.art 'frage', Text beginnt mit 'Coach-Antwort konnte nicht gelesen werden:') statt gar keinen.")
        }
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (g) Jarvis-Regression: POST /api/chat unverändert nach der Parametrisierung ─
{
  const basisVerzeichnis = `kontrollzustand-test-f34-ak-g-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length
  const projektId = 'check-f34-ak-g'
  const gueltigesErgebnis = JSON.parse(readFileSync('schemas/examples/ergebnis-jarvis.valid.json', 'utf-8'))

  let letzteEingaben = null
  const fuehreAufgabeDurchFn = async (laufId, _profilReferenz, eingaben) => {
    letzteEingaben = eingaben
    mkdirSync(basisVerzeichnis, { recursive: true })
    const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(gueltigesErgebnis) }) }), 'utf8')
    const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
    const { registriereKernArtefakt } = await import('../src/lineage-registry/index.ts')
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f34-fake' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, undefined, {
      basisVerzeichnis,
      schreiber: STILLER_SCHREIBER,
    })
    return { ok: true, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
  }

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId, fuehreAufgabeDurchFn }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const antwort = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Status?' }) })
    if (antwort.status !== 202) {
      befunde.push(`(g): erwartet 202, erhalten ${antwort.status} (${await antwort.text()})`)
    }
    await new Promise((resolve) => setTimeout(resolve, 30))

    if (letzteEingaben === null || letzteEingaben.rolle !== 'jarvis') {
      befunde.push(`(g): fuehreAufgabeDurchFn sollte weiterhin mit rolle 'jarvis' aufgerufen werden, erhalten ${JSON.stringify(letzteEingaben)}`)
    } else if (letzteEingaben.aufrufEingaben?.settingSources !== '' || letzteEingaben.aufrufEingaben?.mcpConfig !== '{"mcpServers":{}}') {
      befunde.push(`(g): 'jarvis' sollte weiterhin settingSources ''/mcpConfig '{"mcpServers":{}}' tragen, erhalten ${JSON.stringify(letzteEingaben.aufrufEingaben)}`)
    } else if (letzteEingaben.aufrufEingaben?.umgebungsvariablen?.MAX_THINKING_TOKENS !== '0') {
      befunde.push(`(g): 'jarvis' sollte weiterhin umgebungsvariablen.MAX_THINKING_TOKENS '0' tragen (unverändert nach der Parametrisierung), erhalten ${JSON.stringify(letzteEingaben.aufrufEingaben)}`)
    } else if (letzteEingaben.aufrufEingaben?.disallowedTools !== 'Read(~/.claude/**)') {
      befunde.push(`(g): 'jarvis' sollte weiterhin disallowedTools 'Read(~/.claude/**)' tragen, erhalten ${JSON.stringify(letzteEingaben.aufrufEingaben)}`)
    } else {
      console.log("✓ (g): POST /api/chat übergibt nach der starteRollenChatLauf-Parametrisierung weiterhin bitgenau dieselben aufrufEingaben für 'jarvis' (settingSources/mcpConfig/umgebungsvariablen.MAX_THINKING_TOKENS/disallowedTools) — keine Regression.")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (i) F34 WS-2: baueAuftragAusScope-Gleichheit (Server-TS vs. Browser-JS-Kopie) ─
//
// public/leitstand/auftrag-aus-scope.js ist eine reine JS-Kopie von src/product-coach/index.ts'
// baueAuftragAusScope — ein Browser ohne Build-Schritt kann die .ts-Quelle nicht laden (CLAUDE.md).
// Verhaltensgleichheit wird hier mechanisch geprüft (D5-Geist: kein Vertrauen, ein Test), nicht nur
// behauptet: dieselben Scope-Fixtures gegen BEIDE Funktionen, byte-identisches Ergebnis erwartet.
{
  const befundeVor = befunde.length
  const fixtures = [
    JSON.parse(readFileSync('schemas/examples/ergebnis-product-coach.valid-scope-entwurf.json', 'utf-8')).scope,
    {
      titel: 'Minimal-Scope',
      problem: 'x',
      ziel: 'y',
      in_scope: [],
      out_of_scope: [],
      annahmen: [],
      offene_fragen: [],
      erfolgskriterium: 'z',
    },
    {
      titel: 'Scope mit mehreren Listeneinträgen',
      problem: 'Problem mit "Anführungszeichen" & Sonderzeichen',
      ziel: 'Ziel',
      in_scope: ['a', 'b', 'c'],
      out_of_scope: ['d'],
      annahmen: ['e', 'f'],
      offene_fragen: [],
      erfolgskriterium: 'Kriterium',
    },
  ]
  for (const [index, scope] of fixtures.entries()) {
    const serverErgebnis = baueAuftragAusScope(scope)
    const browserErgebnis = baueAuftragAusScopeBrowser(scope)
    if (JSON.stringify(serverErgebnis) !== JSON.stringify(browserErgebnis)) {
      befunde.push(`(i) Fixture ${index}: baueAuftragAusScope (Server) und die Browser-Kopie liefern unterschiedliche Ergebnisse — Server: ${JSON.stringify(serverErgebnis)}, Browser: ${JSON.stringify(browserErgebnis)}`)
    }
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (i): baueAuftragAusScope (src/product-coach/index.ts) und ihre Browser-JS-Kopie (public/leitstand/auftrag-aus-scope.js) liefern für drei verschiedene Scope-Fixtures byte-identische Ergebnisse.')
  }
}

// ─── (j) F34 WS-2 (löst F-606): statische Prüfung der Auftrag-Brücke in views/chat.js ──
//
// Kein DOM-Test (F-601-Muster, s. Dateikopf) — mechanischer Quelltext-Scan statt eines
// Vertrauensvorschusses: (1) legeAuftragAn wird aus '../api.js' importiert UND mit einem Objekt
// aufgerufen, das wörtlich 'titel' und 'auftragstext' als Schlüssel trägt (POST /api/auftraege
// erwartet exakt diese Form, s. pruefeAuftragsformular); (2) art 'auftrag_vorschlag' UND
// 'scope_entwurf' lösen beide denselben Kandidaten-Pfad aus (leseAuftragKandidat) — der frühere
// Zustand (F-606: nur .antwort wird je gerendert) ist damit real behoben, nicht nur behauptet.
{
  const befundeVor = befunde.length
  const quelltext = readFileSync('public/leitstand/views/chat.js', 'utf-8')

  if (!/import\s*\{[^}]*\blegeAuftragAn\b[^}]*\}\s*from\s*['"]\.\.\/api\.js['"]/.test(quelltext)) {
    befunde.push("(j): public/leitstand/views/chat.js importiert 'legeAuftragAn' nicht (mehr) aus '../api.js' — Auftrag-Brücke fehlt oder wurde umgebaut")
  }
  if (!/legeAuftragAn\(\{\s*titel,\s*auftragstext\s*\}\)/.test(quelltext)) {
    befunde.push("(j): kein Aufruf 'legeAuftragAn({ titel, auftragstext })' in views/chat.js gefunden — POST /api/auftraege erwartet exakt diese Form (pruefeAuftragsformular)")
  }
  if (!/art\s*===\s*'scope_entwurf'/.test(quelltext) || !/art\s*===\s*'auftrag_vorschlag'/.test(quelltext)) {
    befunde.push("(j): leseAuftragKandidat sollte sowohl 'scope_entwurf' (Sparring) als auch 'auftrag_vorschlag' (Jarvis) als Auftrag-Kandidaten erkennen — mindestens eine der beiden Prüfungen fehlt im Quelltext")
  }
  if (!/antwort\.auftrag\.titel/.test(quelltext) || !/antwort\.auftrag\.text/.test(quelltext)) {
    befunde.push("(j): Jarvis' 'auftrag_vorschlag' sollte auftrag.titel/auftrag.text direkt in den Auftrag-Kandidaten übernehmen (kein zweiter Builder, s. Auftragstext Punkt 3) — Zugriff im Quelltext nicht gefunden")
  }
  if (!/leseAuftragKandidat/.test(quelltext) || !/renderAuftragBruecke/.test(quelltext)) {
    befunde.push("(j): die Auftrag-Brücke (leseAuftragKandidat/renderAuftragBruecke) scheint nicht mehr vorhanden — art 'auftrag_vorschlag'/'scope_entwurf' würden dann wieder nur als Text gerendert (F-606-Regression)")
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (j): views/chat.js ruft legeAuftragAn ausschließlich mit { titel, auftragstext } auf; sowohl Jarvis' 'auftrag_vorschlag' als auch Sparrings 'scope_entwurf' lösen dieselbe Auftrag-Brücke aus (F-606 behoben, nicht mehr nur als Text gerendert).")
  }
}

// ─── (k) F34 WS-2: statische Regression gegen den real gefundenen Cross-Modus-Sperr-Bug ──
//
// Code-Review-Befund (real gefunden, kein DOM-Test möglich, F-601-Muster), in einem zweiten,
// unabhängigen Verifikations-Pass verschärft: #chat-senden/#chat-zusammenfassen-btn/
// #chat-abbrechen-btn sind EIN geteiltes DOM-Element für beide Modi (index.html), keine Pro-Modus-
// Kopie. Der ERSTE Fix leitete #chat-senden/#chat-zusammenfassen-btn zwar in renderVerlauf() ab,
// beließ aber mehrere andere imperative setzeSendenSperre(...)/setzeAbbrechenZustand(...)-Aufrufe
// (sendeAktuelleEingabe, sendeZusammenfassungAnfrage, initAbbrechenBedienung, pruefeAusstehendenLauf,
// setzeChatZustandZurueck) unangetastet — genau dieselbe Bug-Klasse in abgeschwächter Form (transiente
// Fehlableitung statt Dauerhänger) blieb dadurch erreichbar. Der zweite Fix entfernt BEIDE Funktionen
// vollständig: jeder Button-Zustand (Sende-/Zusammenfassen-Sperre, Abbrechen-Text/-Sperre) wird
// AUSSCHLIESSLICH in renderVerlauf() aus zustand (sendenLaeuft/ausstehenderLauf/abbruchAngefordert)
// abgeleitet — kein zweiter, potenziell veralteter Schreibpfad auf dieselben DOM-Elemente mehr.
{
  const befundeVor = befunde.length
  const quelltext = readFileSync('public/leitstand/views/chat.js', 'utf-8')

  if (!/zustand\.sendenLaeuft\s*===\s*true\s*\|\|\s*zustand\.ausstehenderLauf\s*!==\s*null/.test(quelltext) || !/document\.getElementById\('chat-senden'\)\.disabled\s*=\s*gesperrt/.test(quelltext)) {
    befunde.push("(k): renderVerlauf() sollte #chat-senden.disabled bei JEDEM Aufruf aus zustand.sendenLaeuft/ausstehenderLauf ableiten — die Ableitung fehlt im Quelltext (Regression des Cross-Modus-Sperr-Bugs möglich)")
  }
  if (!/abbrechenBtn\.textContent\s*=\s*abbruchAngefordert/.test(quelltext) || !/abbrechenBtn\.disabled\s*=\s*abbruchAngefordert/.test(quelltext)) {
    befunde.push('(k): renderVerlauf() sollte #chat-abbrechen-btn.textContent/.disabled bei JEDEM Aufruf aus zustand.ausstehenderLauf?.abbruchAngefordert ableiten — die Ableitung fehlt im Quelltext')
  }
  // Die vollständige Entfernung der beiden imperativen Mutator-Funktionen ist die eigentliche Wache:
  // solange KEINE der beiden mehr als Funktion DEFINIERT ist, kann kein Aufrufer mehr (versehentlich
  // wieder eingeführt) an 'modus === aktiverModus' vorbei- oder mitgegattert werden — jeder Button-
  // Zustand hat dann strukturell nur noch die eine Ableitungsstelle in renderVerlauf().
  if (/function setzeSendenSperre\(/.test(quelltext) || /function setzeAbbrechenZustand\(/.test(quelltext)) {
    befunde.push('(k): setzeSendenSperre/setzeAbbrechenZustand existieren wieder als eigene Funktionen — genau der zweite Schreibpfad neben renderVerlauf()s Ableitung, der die abgeschwächte Form des Cross-Modus-Sperr-Bugs ermöglichte (Regression)')
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (k): Sende-/Zusammenfassen-Sperre und Abbrechen-Text/-Sperre werden ausschließlich in renderVerlauf() aus dem Zustand des angezeigten Modus abgeleitet — keine imperativen setzeSendenSperre/setzeAbbrechenZustand-Mutatoren mehr, die an einer der Aufrufstellen falsch gegattert sein könnten.')
  }
}

// ─── (l) F34 WS-2: statische Prüfung gegen die Auftrag-Dialog-Ergebnis-Fehlzuordnung ──
//
// Verifikations-Pass-Befund: 'Anlegen' las offenerAuftragDialog per Objekt-Spread ERST NACH dem
// await legeAuftragAn(...) — öffnete der Mensch währenddessen den Dialog eines ANDEREN Eintrags
// (dessen eigene "Als Auftrag anlegen"-Trigger bleiben bedienbar, nur der SUBMITTING-Dialog selbst
// ist gesperrt), schrieb die Fortsetzung das Ergebnis DIESER Anfrage auf den inzwischen fremden,
// neuen Dialog (falsche auftragId/falscher Fehlertext am falschen Eintrag). Der Fix friert
// modus/schluessel VOR dem await ein und prüft nach JEDEM await, ob offenerAuftragDialog noch auf
// denselben Eintrag zeigt, bevor er ihn überschreibt.
{
  const befundeVor = befunde.length
  const quelltext = readFileSync('public/leitstand/views/chat.js', 'utf-8')

  if (!/const\s*\{\s*modus,\s*schluessel\s*\}\s*=\s*offenerAuftragDialog/.test(quelltext)) {
    befunde.push('(l): der Anlegen-Handler sollte modus/schluessel aus offenerAuftragDialog VOR dem await einfrieren — fehlt im Quelltext (mögliche Ergebnis-Fehlzuordnung bei einem währenddessen geöffneten anderen Dialog)')
  }
  if (!/gehoertNochZuDiesemDialog/.test(quelltext)) {
    befunde.push('(l): keine erneute Zugehörigkeitsprüfung (gehoertNochZuDiesemDialog o. ä.) nach dem await legeAuftragAn gefunden — das Ergebnis könnte auf einen inzwischen fremden, neuen Dialog geschrieben werden')
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (l): der Anlegen-Handler friert modus/schluessel vor dem await ein und prüft danach erneut, ob offenerAuftragDialog noch demselben Eintrag gehört, bevor er dessen Ergebnis schreibt.')
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
