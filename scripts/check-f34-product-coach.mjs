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
 * F34 WS-3 (Projekt-Interview, E-M5-12) ergänzt: (m) reale Rot-/Grünfälle der optionalen
 * 'modus'-Body-Prüfung in POST /api/sparring ('feature'/'projekt', Standard 'feature'), (n)
 * vergebeFeatureIds (Determinismus, keine Kollision mit real bestehenden IDs inkl. der
 * irregulären F1B/F6a/F19-bridge, Auflösung einer bekannten Abhängigkeit zu einer ID, ein
 * unbekannter Titel erzeugt eine offene Frage statt zu raten), (o) baueCapabilityAuszug
 * (Determinismus/Sortierung, leere Liste), (p) eine erfundene 'projekt.capabilities_bedarf[].
 * ressource_id' ist ein Validator-Verstoß (nur wenn bekannteRessourcenIds übergeben wird — ohne
 * bleibt die Prüfung bewusst aus), (q) baueAuftragAusProjektentwurf-Gleichheit zwischen dem
 * Server-Original und seiner Browser-JS-Kopie (public/leitstand/auftrag-aus-projektentwurf.js,
 * Muster (i)), (r) ein realer POST/GET-/api/sparring-Rundlauf im Modus 'projekt': der
 * Auftragstext trägt einen Capability-Auszug UND die Interview-Reihenfolge-Instruktion, GET
 * /api/sparring projiziert 'modus: projekt', und der persistierte Projekt-Entwurf trägt real
 * vergebene Meilenstein-/Feature-IDs plus 'auftragModus'. Reviewer-/QA-Pass (frischer Kontext)
 * ergänzt: (s) ein art:'projekt_entwurf'-Ergebnis bei angefragtem modus 'feature' (Rolleninstruktion
 * missachtet) wird real als Vertragsverstoß abgelehnt statt stillschweigend IDs zu vergeben und die
 * Ressourcen-Erfindungsprüfung zu umgehen (löst F-613), (t) das Verlaufsfenster ist nach 'modus'
 * gefiltert — 'feature'/'projekt' sehen im Kontext nur Turns ihres eigenen Untermodus (löst F-614).
 *
 * F34 WS-3 Korrekturrunde (Verifikation Challenger, löst F-618) ergänzt: (u) vergebeFeatureIds
 * vergibt gegen die REALE docs/projekt/roadmap.json (sammleBestehendeIds, jetzt exportiert) nie
 * eine dort bereits reservierte ID (F41, M5/E-M5-14) erneut — die höchste real bestehende Nummer
 * wird aus features/<id>/ UND roadmap.json gemeinsam ermittelt, nicht nur aus einer der beiden
 * Quellen.
 *
 * F34 WS-3 Korrekturrunde (Sichtprüfung Stefan + Challenger, löst F-620/F-621) ergänzt: (v)
 * statische Prüfung, dass renderVerlauf 'btn-primary' für alle vier Umschalter-Buttons gleichlaufend
 * mit aria-pressed toggelt (F-620) und dass style.css '.chat-modus-auswahl[hidden] { display: none; }'
 * trägt, damit die UA-[hidden]-Regel nicht durch 'display: flex' überschrieben wird (F-621). Realer
 * Render-Nachweis (Playwright) ergänzend in features/F34/nachweis-ws3.md.
 *
 * F34 Fixpaket (Feature-Review-Pass Gesamt, löst F-624/F-625) ergänzt: (w) statischer Quelltext-Scan
 * gegen die Regression von F-624 — baueAnzeigeListe taggt alle drei Eintragsquellen (persistiert/
 * lokal/ausstehend) mit 'eintragModus' und filtert NUR für 'sparring' danach (kein DOM-Test möglich,
 * F-601-Muster — der reale Beweis ist der Render-Nachweis in features/F34/nachweis-fixpaket-ui/).
 * (x) ein realer HTTP-Rundlauf für F-625: POST /api/sparring/<laufId>/auftrag schreibt einen
 * Rückverweis, GET /api/sparring projiziert ihn als 'auftragErstelltId' — ein Turn ohne Zuordnung
 * bleibt weiterhin null (Alt-Einträge-Verhalten unverändert), reale Rot-Fälle der Formprüfung.
 *
 * F34 Fixpaket-Nachtrag (löst F-629, real beim Erzeugen des Fixpaket-Render-Nachweises entdeckt)
 * ergänzt: (y) statischer Scan, dass style.css '.btn[hidden] { display: none; }' trägt — ohne diese
 * Regel überschrieben '.btn'/'.chat-zusammenfassen-btn' die UA-[hidden]-Regel, #chat-abbrechen-btn/
 * #chat-zusammenfassen-btn blieben dadurch immer sichtbar (dieselbe Fehlerklasse wie F-620/F-621).
 *
 * F34 Fixpaket-Nachtrag (löst F-631) ergänzt in (x): POST /api/sparring/<laufId>/auftrag lehnt eine
 * formal gültige, aber real nicht existierende laufId bzw. auftragId mit 404 ab (kein Rückverweis
 * gespeichert) — der Grünfall verwendet seither eine über POST /api/auftraege real angelegte
 * auftragId statt einer erfundenen Zeichenkette.
 *
 * Korrekturschleife (Abnahme 23.09.2026, Reviewer-Befund) ergänzt in (x): eine auftragId mit
 * unzulässigen Zeichen (z. B. '/') wird jetzt real mit 400 abgelehnt statt als lauf_id in
 * ladeArtefaktVersion→pruefeLaufId (checkpoint-store/index.ts) zu werfen und über den generischen
 * Handler-Catch als 500 zu enden — Muster POST /api/auftraege/<id>/routen (LAUFID_UNZULAESSIGE_ZEICHEN).
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
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ROLLENVERTRAEGE } from '../src/rollen/index.ts'
import { anzeigePruefbefehl, baueAuftragAusProjektentwurf, baueAuftragAusScope, baueCapabilityAuszug, validiereErgebnisProductCoach, vergebeFeatureIds } from '../src/product-coach/index.ts'
import { schreibeStartvorlageUndProfil } from '../src/projekt-anlegen/index.ts'
import { baueAuftragAusScope as baueAuftragAusScopeBrowser } from '../public/leitstand/auftrag-aus-scope.js'
import { anzeigePruefbefehl as anzeigePruefbefehlBrowser, baueAuftragAusProjektentwurf as baueAuftragAusProjektentwurfBrowser } from '../public/leitstand/auftrag-aus-projektentwurf.js'
import { erzeugeRequestHandler, loeseAusfuehrungsEingabenAuf, sammleBestehendeIds } from './leitstand-server.mjs'
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
    { pfad: 'schemas/examples/ergebnis-product-coach.valid-projekt-entwurf.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/ergebnis-product-coach.invalid-unbekannte-art.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-product-coach.invalid-alternativen-zu-wenige.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-product-coach.invalid-art-alternativen-ohne-alternativen.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-product-coach.invalid-art-scope-entwurf-ohne-scope.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-product-coach.invalid-scope-fehlendes-feld.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-product-coach.invalid-art-projekt-entwurf-ohne-projekt.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/ergebnis-product-coach.invalid-projekt-fehlendes-feld.json', sollGueltigSein: false },
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
    console.log('✓ (b): schemas/ergebnis-product-coach.schema.json gültiges JSON; alle vier valid*.json erfüllen validiereErgebnisProductCoach, alle sieben invalid-*.json verletzen je eine benannte Regel.')
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

  // F34 WS-3: dieselbe Regel 2 gilt auch für jedes VERSCHACHTELTE Objekt unter 'projekt'
  // (meilensteine[].*, meilensteine[].features[].*, capabilities_bedarf[].*) — ein rekursiver
  // Scan über jedes 'properties'-tragende Schemaobjekt statt einer Handvoll fest verdrahteter Pfade.
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
    befunde.push(`(b2): folgende verschachtelte properties-Objekte haben nicht jede eigene Eigenschaft in ihrem eigenen 'required' (Codex-Dialekt-Zwang): ${verschachtelteTreffer.join('; ')}`)
  }

  if (befunde.length === befundeVor) {
    console.log("✓ (b2): schemas/ergebnis-product-coach.schema.json enthält kein 'allOf'/'if'/'then'/'oneOf', jede Top-Level- UND jede verschachtelte property (projekt.meilensteine[]/.features[]/.capabilities_bedarf[]) steht in ihrem eigenen 'required'.")
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

  // F34 WS-3: dieselbe Kopplung jetzt auch für 'projekt' (art 'projekt_entwurf').
  const rotProjektNull = validiereErgebnisProductCoach({ art: 'projekt_entwurf', antwort: 'x', alternativen: null, scope: null, projekt: null })
  if (!rotProjektNull.some((v) => v.includes("'projekt' fehlt — bei art 'projekt_entwurf' Pflicht"))) {
    befunde.push(`(b3) Rotfall (projekt: null): erwartet Verstoß "'projekt' fehlt", erhalten ${JSON.stringify(rotProjektNull)}`)
  }
  const projektGueltig = JSON.parse(readFileSync('schemas/examples/ergebnis-product-coach.valid-projekt-entwurf.json', 'utf-8'))
  const gruenProjekt = validiereErgebnisProductCoach(projektGueltig, ['claude-code'])
  if (gruenProjekt.length > 0) {
    befunde.push(`(b3) Grünfall (projekt gesetzt, Codex-Form): erwartet keine Verstöße, erhalten ${JSON.stringify(gruenProjekt)}`)
  }
  const rotProjektMitScope = validiereErgebnisProductCoach({ ...projektGueltig, art: 'scope_entwurf', scope: JSON.parse(readFileSync('schemas/examples/ergebnis-product-coach.valid-scope-entwurf.json', 'utf-8')).scope })
  if (!rotProjektMitScope.some((v) => v.includes("'projekt' gesetzt, aber art ist nicht 'projekt_entwurf'"))) {
    befunde.push(`(b3) Rotfall (projekt gesetzt, art 'scope_entwurf'): erwartet Verstoß "'projekt' gesetzt, aber art ist nicht 'projekt_entwurf'", erhalten ${JSON.stringify(rotProjektMitScope)}`)
  }

  if (befunde.length === befundeVor) {
    console.log("✓ (b3): validiereErgebnisProductCoach erzwingt art→alternativen/scope/projekt auch in der Codex-Form (Feld explizit auf null statt weggelassen).")
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
  // F39 WS-2a: der Aufruf trägt seither optional ein verschachteltes '...(herkunft !== null ? { herkunft } : {})'
  // NACH 'titel, auftragstext' (leseAuftragKandidat/pruefeAuftragsformular) — die Regex prüft nur noch das
  // Präfix (verschachtelte '{'/'}' im Spread-Ausdruck lassen sich mit '[^}]*' nicht sauber überspringen),
  // verlangt aber weiterhin GENAU diese beiden Felder in GENAU dieser Reihenfolge zuerst.
  if (!/legeAuftragAn\(\{\s*titel,\s*auftragstext\b/.test(quelltext)) {
    befunde.push("(j): kein Aufruf 'legeAuftragAn({ titel, auftragstext, ... })' in views/chat.js gefunden — POST /api/auftraege erwartet titel/auftragstext zuerst (pruefeAuftragsformular)")
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
  // F39 WS-2a (löst state/findings.md F-633 Teil a): leseAuftragKandidat setzt 'herkunft' je Ergebnistyp —
  // ohne dieses Feld hätte ein Projekt-Interview-Auftrag keinen Weg zur deterministischen Kontrolltiefe-
  // Untergrenze (src/router/index.ts' bestimmeEffektiveKontrolltiefe).
  if (!/herkunft:\s*\{\s*art:\s*'projekt_interview'\s*\}/.test(quelltext)) {
    befunde.push("(j): leseAuftragKandidat sollte für 'projekt_entwurf' herkunft: { art: 'projekt_interview' } setzen — fehlt im Quelltext (F39 WS-2a)")
  }
  if (!/herkunft:\s*\{\s*art:\s*'sparring'\s*\}/.test(quelltext)) {
    befunde.push("(j): leseAuftragKandidat sollte für 'scope_entwurf' herkunft: { art: 'sparring' } setzen — fehlt im Quelltext (F39 WS-2a)")
  }
  if (!/herkunft:\s*\{\s*art:\s*'jarvis'\s*\}/.test(quelltext)) {
    befunde.push("(j): leseAuftragKandidat sollte für Jarvis' 'auftrag_vorschlag' herkunft: { art: 'jarvis' } setzen — fehlt im Quelltext (F39 WS-2a)")
  }
  if (befunde.length === befundeVor) {
    console.log(
      "✓ (j): views/chat.js ruft legeAuftragAn mit { titel, auftragstext, ... } auf; sowohl Jarvis' 'auftrag_vorschlag' als auch Sparrings 'scope_entwurf' lösen dieselbe Auftrag-Brücke aus (F-606 behoben, nicht mehr nur als Text gerendert); leseAuftragKandidat setzt 'herkunft' je Ergebnistyp (F39 WS-2a)."
    )
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

  // F39 WS-2a: die Destrukturierung trägt seither zusätzlich 'herkunft' (für den legeAuftragAn-
  // Aufruf) — die Regex verlangt weiterhin, dass modus/schluessel VOR jedem weiteren Feld stehen.
  if (!/const\s*\{\s*modus,\s*schluessel\s*(?:,[^}]*)?\}\s*=\s*offenerAuftragDialog/.test(quelltext)) {
    befunde.push('(l): der Anlegen-Handler sollte modus/schluessel aus offenerAuftragDialog VOR dem await einfrieren — fehlt im Quelltext (mögliche Ergebnis-Fehlzuordnung bei einem währenddessen geöffneten anderen Dialog)')
  }
  if (!/gehoertNochZuDiesemDialog/.test(quelltext)) {
    befunde.push('(l): keine erneute Zugehörigkeitsprüfung (gehoertNochZuDiesemDialog o. ä.) nach dem await legeAuftragAn gefunden — das Ergebnis könnte auf einen inzwischen fremden, neuen Dialog geschrieben werden')
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (l): der Anlegen-Handler friert modus/schluessel vor dem await ein und prüft danach erneut, ob offenerAuftragDialog noch demselben Eintrag gehört, bevor er dessen Ergebnis schreibt.')
  }
}

// ─── (m) F34 WS-3: POST /api/sparring — reale Rot-/Grünfälle der 'modus'-Prüfung ──────
{
  const basisVerzeichnis = `kontrollzustand-test-f34-ak-m-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length

  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const rotFaelle = [
      { body: JSON.stringify({ nachricht: 'x', modus: 'unbekannt' }), erwartet: /'modus' muss einer von feature, projekt sein/, name: "modus 'unbekannt'" },
      { body: JSON.stringify({ nachricht: 'x', modus: 42 }), erwartet: /'modus' muss einer von feature, projekt sein/, name: 'modus falscher Typ' },
      { body: JSON.stringify({ nachricht: 'x', fremdfeld: 'x' }), erwartet: /unbekanntes Feld 'fremdfeld'/, name: 'unbekanntes Feld bleibt weiterhin abgelehnt' },
    ]
    for (const fall of rotFaelle) {
      const antwort = await fetch(`${basisUrl}/api/sparring`, { method: 'POST', body: fall.body })
      const koerper = await antwort.json()
      if (antwort.status !== 400 || !fall.erwartet.test(koerper.grund ?? '')) {
        befunde.push(`(m) Rotfall '${fall.name}': erwartet 400 mit ${fall.erwartet}, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
      }
    }
    if (befunde.length === befundeVor) {
      console.log("✓ (m): POST /api/sparring lehnt einen unbekannten/typfalschen 'modus'-Wert weiterhin real mit 400 ab, das bisherige Fremdfeld-Verhalten bleibt unverändert.")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (n) F34 WS-3: vergebeFeatureIds — Determinismus, keine Kollision, ungelöste Abhängigkeit ──
{
  const befundeVor = befunde.length
  // F1B/F6a sind real existierende, irreguläre Alt-IDs (Groß-/Kleinschreibung des Suffix) — sie
  // dürfen den numerischen Scan weder verwirren noch eine Kollision auslösen. 'F19-bridge' ist eine
  // reale, irreguläre MEILENSTEIN-Id (matcht kein M<n>) und muss beim Meilenstein-Scan übersprungen,
  // nicht fälschlich als Zahl gelesen werden.
  const bestehendeIds = { features: ['F1', 'F1B', 'F6a', 'F40'], meilensteine: ['M1', 'M2', 'F19-bridge'] }
  const projekt = {
    meilensteine: [
      {
        titel: 'Meilenstein A',
        ziel: 'Ziel A',
        features: [
          { titel: 'Feature A1', ziel: 'x', nicht_ziele: [], akzeptanzkriterien: [], abhaengig_von_titel: [] },
          { titel: 'Feature A2', ziel: 'x', nicht_ziele: [], akzeptanzkriterien: [], abhaengig_von_titel: ['Feature A1', 'Ein völlig unbekannter Titel'] },
        ],
      },
      {
        titel: 'Meilenstein B',
        ziel: 'Ziel B',
        features: [{ titel: 'Feature B1', ziel: 'x', nicht_ziele: [], akzeptanzkriterien: [], abhaengig_von_titel: [] }],
      },
    ],
    offene_fragen: ['Bereits vorhandene offene Frage'],
  }

  const einmal = vergebeFeatureIds(projekt, bestehendeIds)
  const zweimal = vergebeFeatureIds(projekt, bestehendeIds)
  if (JSON.stringify(einmal) !== JSON.stringify(zweimal)) {
    befunde.push(`(n): vergebeFeatureIds sollte für denselben Entwurf ein byte-identisches Ergebnis liefern, erhalten ${JSON.stringify(einmal)} vs. ${JSON.stringify(zweimal)}`)
  }

  const alleVergebenenIds = [einmal.meilensteine[0].id, einmal.meilensteine[1].id, ...einmal.meilensteine.flatMap((m) => m.features.map((f) => f.id))]
  const kollision = alleVergebenenIds.filter((id) => bestehendeIds.features.includes(id) || bestehendeIds.meilensteine.includes(id))
  if (kollision.length > 0) {
    befunde.push(`(n): vergebeFeatureIds hat mit real bestehenden IDs kollidiert: ${kollision.join(', ')}`)
  }
  if (einmal.meilensteine[0].id !== 'M3' || einmal.meilensteine[1].id !== 'M4') {
    befunde.push(`(n): erwartet Meilenstein-IDs M3/M4 (höchste bestehende numerische ist M2, 'F19-bridge' übersprungen), erhalten ${einmal.meilensteine.map((m) => m.id).join(', ')}`)
  }
  const featureIds = einmal.meilensteine.flatMap((m) => m.features.map((f) => f.id))
  if (JSON.stringify(featureIds) !== JSON.stringify(['F41', 'F42', 'F43'])) {
    befunde.push(`(n): erwartet Feature-IDs F41/F42/F43 in Entwurfsreihenfolge (höchste bestehende numerische ist F40, F1B/F6a übersprungen), erhalten ${featureIds.join(', ')}`)
  }

  const featureA2 = einmal.meilensteine[0].features[1]
  if (JSON.stringify(featureA2.abhaengig_von_ids) !== JSON.stringify([einmal.meilensteine[0].features[0].id])) {
    befunde.push(`(n): 'Feature A2' sollte NUR die aufgelöste ID von 'Feature A1' in abhaengig_von_ids tragen (der unbekannte Titel wird NICHT geraten), erhalten ${JSON.stringify(featureA2.abhaengig_von_ids)}`)
  }
  if (!einmal.offene_fragen.some((f) => f.includes('Ein völlig unbekannter Titel') && f.includes('Feature A2'))) {
    befunde.push(`(n): ein unbekannter Abhängigkeits-Titel sollte einen offene_fragen-Eintrag erzeugen (kein Raten), erhalten ${JSON.stringify(einmal.offene_fragen)}`)
  }
  if (!einmal.offene_fragen.includes('Bereits vorhandene offene Frage')) {
    befunde.push(`(n): bereits vorhandene offene_fragen-Einträge sollten erhalten bleiben, erhalten ${JSON.stringify(einmal.offene_fragen)}`)
  }

  if (befunde.length === befundeVor) {
    console.log('✓ (n): vergebeFeatureIds ist deterministisch, kollidiert nicht mit real bestehenden IDs (inkl. der irregulären F1B/F6a/F19-bridge), löst eine bekannte Abhängigkeit zu einer ID auf und erzeugt für einen unbekannten Titel eine offene Frage statt zu raten.')
  }
}

// ─── (o) F34 WS-3: baueCapabilityAuszug — Determinismus, Sortierung, leere Liste ──────
{
  const befundeVor = befunde.length
  const ressourcen = [
    { id: 'werkzeug-auswahl', typ: 'skill', capabilities: ['TOOL_SELECTION'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'skill', pfad: 'x' }, name: 'x', beschreibung: 'x', verfuegbar: true, grund: 'x' },
    { id: 'claude-code', typ: 'worker', capabilities: ['CODE_WRITE', 'CODE_REVIEW'], freigabe: 'FREIGEGEBEN', herkunft: { art: 'startvorlage', worker: 'claude-code' }, name: 'x', beschreibung: 'x', verfuegbar: true, grund: 'x' },
    { id: 'playwright-mcp', typ: 'extern', capabilities: ['BROWSER_AUTOMATION'], freigabe: 'OFFEN', herkunft: { art: 'extern', url: 'https://x' }, name: 'x', beschreibung: 'x', verfuegbar: false, grund: 'extern, nicht auflösbar' },
  ]
  const einmal = baueCapabilityAuszug(ressourcen)
  const zweimal = baueCapabilityAuszug([...ressourcen].reverse())
  if (einmal !== zweimal) {
    befunde.push(`(o): baueCapabilityAuszug sollte unabhängig von der Eingabereihenfolge dasselbe (nach 'id' sortierte) Ergebnis liefern, erhalten:\n${einmal}\nvs.\n${zweimal}`)
  }
  const zeilen = einmal.split('\n')
  if (zeilen.length !== 3 || !zeilen[0].startsWith('- claude-code') || !zeilen[1].startsWith('- playwright-mcp') || !zeilen[2].startsWith('- werkzeug-auswahl')) {
    befunde.push(`(o): erwartet drei nach 'id' sortierte Zeilen (claude-code, playwright-mcp, werkzeug-auswahl), erhalten:\n${einmal}`)
  }
  if (!einmal.includes('verfuegbar=false') || !einmal.includes('freigabe=OFFEN')) {
    befunde.push(`(o): erwartet sichtbare freigabe/verfuegbar-Angaben je Ressource, erhalten:\n${einmal}`)
  }
  if (baueCapabilityAuszug([]) !== '(keine Ressourcen vorhanden)') {
    befunde.push(`(o): erwartet '(keine Ressourcen vorhanden)' bei leerer Liste, erhalten '${baueCapabilityAuszug([])}'`)
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (o): baueCapabilityAuszug ist deterministisch (Eingabereihenfolge-unabhängig, nach 'id' sortiert), zeigt freigabe/verfuegbar je Ressource, '(keine Ressourcen vorhanden)' bei leerer Liste.")
  }
}

// ─── (p) F34 WS-3: erfundene ressource_id → Validator-Rot ─────────────────────────────
{
  const befundeVor = befunde.length
  const daten = JSON.parse(readFileSync('schemas/examples/ergebnis-product-coach.projekt-ressource-erfunden.json', 'utf-8'))
  const bekannteRessourcenIds = ['claude-code', 'werkzeug-auswahl']

  const rot = validiereErgebnisProductCoach(daten, bekannteRessourcenIds)
  if (!rot.some((v) => v.includes("ressource_id' ('nicht-existente-ressource') ist im Capability-Auszug nicht vorhanden"))) {
    befunde.push(`(p) Rotfall: erwartet Verstoß gegen eine erfundene ressource_id, erhalten ${JSON.stringify(rot)}`)
  }
  const gruen = validiereErgebnisProductCoach(daten, [...bekannteRessourcenIds, 'nicht-existente-ressource'])
  if (gruen.length > 0) {
    befunde.push(`(p) Grünfall: dieselbe ressource_id in der bekannten Liste sollte keinen Verstoß erzeugen, erhalten ${JSON.stringify(gruen)}`)
  }
  const permissiv = validiereErgebnisProductCoach(daten)
  if (permissiv.length > 0) {
    befunde.push(`(p) ohne bekannteRessourcenIds (undefined): die Existenzprüfung sollte aussetzen statt zu blockieren, erhalten ${JSON.stringify(permissiv)}`)
  }
  if (befunde.length === befundeVor) {
    console.log('✓ (p): eine ressource_id außerhalb der bekannten Capability-Auszug-IDs ist ein Validator-Verstoß; dieselbe ID in der bekannten Liste ist gültig; ohne übergebene Liste (undefined) bleibt die Prüfung aus.')
  }
}

// ─── (q) F34 WS-3: baueAuftragAusProjektentwurf-Gleichheit (Server-TS vs. Browser-JS-Kopie) ──
//
// Korrekturrunde (Code-Review-Befund): die ursprüngliche Fixture (valid-projekt-entwurf.json)
// hat keinen Meilenstein-/Feature-Titel mit ID-artigem Präfix — der F-612-Strip-Zweig von
// entferneIdPraefix blieb dadurch ungeprüft, und ein reiner Gleichheitsvergleich allein kann
// ohnehin nicht unterscheiden "beide richtig" von "beide gleich falsch". Die zweite Fixture unten
// reproduziert den realen Fall aus features/F34/nachweis-ws3.md UND prüft zusätzlich explizite
// Korrektheit (keine Dopplung, Titel aus Meilenstein statt vision), nicht nur Gleichheit.
{
  const befundeVor = befunde.length
  const projektGueltig = JSON.parse(readFileSync('schemas/examples/ergebnis-product-coach.valid-projekt-entwurf.json', 'utf-8')).projekt
  const zugewiesen = vergebeFeatureIds(projektGueltig, { features: [], meilensteine: [] })
  const projektMitIds = { ...projektGueltig, meilensteine: zugewiesen.meilensteine, offene_fragen: zugewiesen.offene_fragen }

  const projektMitIdPraefixRoh = {
    vision: 'AI Workforce führt ein Vorhaben von der Idee bis zum abgenommenen Ergebnis.',
    zielgruppe: 'Stefan',
    ziele: ['x'],
    scope_in: ['x'],
    scope_out: ['x'],
    capabilities_bedarf: [],
    architektur_hinweise: [],
    offene_fragen: [],
    meilensteine: [{ titel: 'M6 — Aufräum-Werkzeug für Testrückstände', ziel: 'z', features: [{ titel: 'F41 - On-Demand-Skript', ziel: 'z', nicht_ziele: [], akzeptanzkriterien: [], abhaengig_von_titel: [] }] }],
  }
  const zugewiesenPraefix = vergebeFeatureIds(projektMitIdPraefixRoh, { features: [], meilensteine: [] })
  const projektMitIdPraefix = { ...projektMitIdPraefixRoh, meilensteine: zugewiesenPraefix.meilensteine, offene_fragen: zugewiesenPraefix.offene_fragen }

  // F-703 (BUG P1, löst eine Regression aus F42 WS-1): die kontext-Fixtures nutzen ECHTE argv
  // statt künstlicher — ein künstliches argv wie ['npm', 'run', 'check'] (biserige Fassung dieses
  // Gates) hätte den F-703-Bug (rohes .join(' ') eines ABSOLUTEN Programmpfads) nie aufgedeckt,
  // weil es bereits wie die gewünschte Anzeigeform aussah. echtesAiWorkforceArgv kommt real aus
  // startvorlagen/ai-workforce.json, echtesNeuesProjektArgv real aus schreibeStartvorlageUndProfil
  // (src/projekt-anlegen/index.ts) — demselben Pfad, den POST /api/projekte tatsächlich schreibt.
  const echtesAiWorkforceArgv = JSON.parse(readFileSync('startvorlagen/ai-workforce.json', 'utf-8')).pruefbefehl

  const quelleF703 = join(tmpdir(), `check-f34-f703-quelle-${randomUUID()}`)
  mkdirSync(join(quelleF703, 'startvorlagen'), { recursive: true })
  mkdirSync(join(quelleF703, 'profiles'), { recursive: true })
  writeFileSync(
    join(quelleF703, 'startvorlagen', 'ai-workforce.json'),
    JSON.stringify({ startvorlage_schema: 'v0', profilPfad: 'profiles/ai-workforce.json', werkzeugStartziel: ['irrelevant'], werkzeugVersionDeklariert: '0.0.0', berechtigungskontext: 'profil-standard', modell: 'test', standardBudget: {}, werkzeugsaetze: {} })
  )
  writeFileSync(join(quelleF703, 'profiles', 'ai-workforce.json'), JSON.stringify({ projekt: 'ai-workforce', version: 1, gates: [], dod: [], werkzeuge: {}, reviewRegeln: [] }))
  const zielF703 = join(tmpdir(), `check-f34-f703-ziel-${randomUUID()}`)
  mkdirSync(zielF703, { recursive: true })
  schreibeStartvorlageUndProfil('f703-probe', quelleF703, zielF703)
  const echtesNeuesProjektArgv = JSON.parse(readFileSync(join(zielF703, 'startvorlagen', 'f703-probe.json'), 'utf-8')).pruefbefehl
  raeumeVerzeichnis(quelleF703)
  raeumeVerzeichnis(zielF703)

  // Fremd-argv MIT Leerzeichen im Pfad — belegt den Quotier-Zweig von anzeigePruefbefehl (kein
  // node/npm-cli.js-Muster).
  const fremdArgvMitLeerzeichen = ['C:\\Program Files\\Fremdtool\\tool.exe', '--run', 'alle-tests']

  const kontexte = [
    ['kein-kontext', undefined],
    ['ai-workforce-echtes-argv', { istAiWorkforce: true, pruefbefehl: echtesAiWorkforceArgv }],
    ['fremdprojekt-echtes-neues-projekt-argv', { istAiWorkforce: false, pruefbefehl: echtesNeuesProjektArgv }],
    ['fremdprojekt-mit-leerzeichen', { istAiWorkforce: false, pruefbefehl: fremdArgvMitLeerzeichen }],
    ['fremdprojekt-ohne-pruefbefehl', { istAiWorkforce: false }],
  ]

  for (const auftragModus of ['neu', 'erweiterung']) {
    for (const [fixtureName, projekt] of [
      ['valid-projekt-entwurf', projektMitIds],
      ['id-praefix-im-titel', projektMitIdPraefix],
    ]) {
      for (const [kontextName, kontext] of kontexte) {
        const serverErgebnis = kontext === undefined ? baueAuftragAusProjektentwurf(projekt, auftragModus) : baueAuftragAusProjektentwurf(projekt, auftragModus, kontext)
        const browserErgebnis = kontext === undefined ? baueAuftragAusProjektentwurfBrowser(projekt, auftragModus) : baueAuftragAusProjektentwurfBrowser(projekt, auftragModus, kontext)
        if (JSON.stringify(serverErgebnis) !== JSON.stringify(browserErgebnis)) {
          befunde.push(`(q) Fixture '${fixtureName}', Modus '${auftragModus}', Kontext '${kontextName}': baueAuftragAusProjektentwurf (Server) und die Browser-Kopie liefern unterschiedliche Ergebnisse — Server: ${JSON.stringify(serverErgebnis)}, Browser: ${JSON.stringify(browserErgebnis)}`)
        }
      }
    }
  }

  // Explizite Korrektheit der kontext-Zweige (F42 WS-1, löst F-701): ai-workforce-eigene
  // Prüfpfade NUR bei istAiWorkforce===true, Prüfbefehl-Zeile spiegelt den gegebenen pruefbefehl
  // in AUSFÜHRBARER Anzeigeform (F-703), ohne kontext wird nichts erfunden.
  const ergebnisOhneKontext = baueAuftragAusProjektentwurf(projektMitIds, 'neu')
  if (ergebnisOhneKontext.auftragstext.includes('validiereRoadmapDaten') || ergebnisOhneKontext.auftragstext.includes('check-feature.mjs')) {
    befunde.push(`(q): ohne kontext behauptet der Auftragstext dennoch ai-workforce-eigene Prüfpfade (Regression von F-701): ${ergebnisOhneKontext.auftragstext}`)
  } else if (!ergebnisOhneKontext.auftragstext.includes('Kein Prüfbefehl konfiguriert')) {
    befunde.push(`(q): ohne kontext sollte der Auftragstext 'Kein Prüfbefehl konfiguriert' nennen, nicht 'npm run check' erfinden (Regression von F-701): ${ergebnisOhneKontext.auftragstext}`)
  }

  // (F-703) Fremdprojekt mit dem ECHTEN, von schreibeStartvorlageUndProfil erzeugten argv — muss
  // 'npm run check:template' zeigen, NICHT die rohen absoluten node.exe/npm-cli.js-Pfade.
  const ergebnisFremdprojekt = baueAuftragAusProjektentwurf(projektMitIds, 'neu', { istAiWorkforce: false, pruefbefehl: echtesNeuesProjektArgv })
  if (ergebnisFremdprojekt.auftragstext.includes('validiereRoadmapDaten') || ergebnisFremdprojekt.auftragstext.includes('check-feature.mjs')) {
    befunde.push(`(q): Fremdprojekt-kontext behauptet dennoch ai-workforce-eigene Prüfpfade (Regression von F-701): ${ergebnisFremdprojekt.auftragstext}`)
  } else if (!ergebnisFremdprojekt.auftragstext.includes('npm run check:template muss danach grün sein.')) {
    befunde.push(`(q/F-703): Fremdprojekt mit dem echten schreibeStartvorlageUndProfil-argv sollte 'npm run check:template' zeigen, nicht das rohe argv (${JSON.stringify(echtesNeuesProjektArgv)}): ${ergebnisFremdprojekt.auftragstext}`)
  } else if (ergebnisFremdprojekt.auftragstext.includes(echtesNeuesProjektArgv[0])) {
    befunde.push(`(q/F-703)-Rot-Fall-Beleg: der Auftragstext enthält noch den rohen absoluten Programmpfad '${echtesNeuesProjektArgv[0]}' — genau der Fehler, den ein bloßes .join(' ') erzeugt hätte: ${ergebnisFremdprojekt.auftragstext}`)
  }

  // (F-703) ai-workforce selbst mit dem ECHTEN argv aus startvorlagen/ai-workforce.json.
  const ergebnisAiWorkforce = baueAuftragAusProjektentwurf(projektMitIds, 'neu', { istAiWorkforce: true, pruefbefehl: echtesAiWorkforceArgv })
  if (!ergebnisAiWorkforce.auftragstext.includes('validiereRoadmapDaten') || !ergebnisAiWorkforce.auftragstext.includes('check-feature.mjs')) {
    befunde.push(`(q): istAiWorkforce:true sollte weiterhin validiereRoadmapDaten/check-feature.mjs nennen (Regression von F-701): ${ergebnisAiWorkforce.auftragstext}`)
  } else if (!ergebnisAiWorkforce.auftragstext.includes('npm run check muss danach grün sein.')) {
    befunde.push(`(q/F-703): ai-workforce-Auftragstext sollte 'npm run check' zeigen (Anzeigeform des echten startvorlagen/ai-workforce.json-argv ${JSON.stringify(echtesAiWorkforceArgv)}), erhalten: ${ergebnisAiWorkforce.auftragstext}`)
  }

  // (F-703) Fremd-argv mit Leerzeichen im Pfad — muss gequotet erscheinen, nicht roh/unquotiert.
  const ergebnisMitLeerzeichen = baueAuftragAusProjektentwurf(projektMitIds, 'neu', { istAiWorkforce: false, pruefbefehl: fremdArgvMitLeerzeichen })
  const erwarteteQuotierteZeile = `"${fremdArgvMitLeerzeichen[0]}" ${fremdArgvMitLeerzeichen.slice(1).join(' ')} muss danach grün sein.`
  if (!ergebnisMitLeerzeichen.auftragstext.includes(erwarteteQuotierteZeile)) {
    befunde.push(`(q/F-703): Fremd-argv mit Leerzeichen sollte gequotet erscheinen ('${erwarteteQuotierteZeile}'), erhalten: ${ergebnisMitLeerzeichen.auftragstext}`)
  }

  // (F-703) Server/Browser-Gleichheit von anzeigePruefbefehl selbst, über alle drei Musterformen.
  for (const [name, argv] of [
    ['neues-projekt-node+npm-cli.js', echtesNeuesProjektArgv],
    ['ai-workforce-node+npm-cli.js', echtesAiWorkforceArgv],
    ['fremd-mit-leerzeichen', fremdArgvMitLeerzeichen],
  ]) {
    const serverAnzeige = anzeigePruefbefehl(argv)
    const browserAnzeige = anzeigePruefbefehlBrowser(argv)
    if (serverAnzeige !== browserAnzeige) {
      befunde.push(`(q/F-703): anzeigePruefbefehl (Server) und die Browser-Kopie liefern für '${name}' unterschiedliche Ergebnisse — Server: '${serverAnzeige}', Browser: '${browserAnzeige}'`)
    }
  }

  // Explizite Korrektheit (nicht nur Server/Browser-Gleichheit) am ID-Präfix-Fixture, Modus 'erweiterung'.
  const ergebnisPraefixErweiterung = baueAuftragAusProjektentwurf(projektMitIdPraefix, 'erweiterung')
  const meilensteinId = projektMitIdPraefix.meilensteine[0].id
  const featureId = projektMitIdPraefix.meilensteine[0].features[0].id
  if (ergebnisPraefixErweiterung.auftragstext.includes(`${meilensteinId} — ${meilensteinId}`)) {
    befunde.push(`(q): Dopplung im Meilenstein-Header gefunden (Regression von F-612): ${ergebnisPraefixErweiterung.auftragstext}`)
  } else if (ergebnisPraefixErweiterung.auftragstext.includes(`${featureId} — ${featureId}`)) {
    befunde.push(`(q): Dopplung in der Feature-Zeile gefunden (Regression von F-612): ${ergebnisPraefixErweiterung.auftragstext}`)
  } else if (ergebnisPraefixErweiterung.titel !== 'Erweiterung: Aufräum-Werkzeug für Testrückstände') {
    befunde.push(`(q): Titel im Modus 'erweiterung' sollte aus dem bereinigten Meilenstein-Titel kommen (Regression von F-611), erhalten '${ergebnisPraefixErweiterung.titel}'`)
  } else if (ergebnisPraefixErweiterung.titel.includes('AI Workforce führt ein Vorhaben')) {
    befunde.push(`(q): Titel im Modus 'erweiterung' sollte NICHT aus vision kommen (Regression von F-611), erhalten '${ergebnisPraefixErweiterung.titel}'`)
  }

  if (befunde.length === befundeVor) {
    console.log("✓ (q): baueAuftragAusProjektentwurf (src/product-coach/index.ts) und ihre Browser-JS-Kopie (public/leitstand/auftrag-aus-projektentwurf.js) liefern für 'neu'/'erweiterung' × zwei Fixtures (inkl. ID-artigem Titel-Präfix) byte-identische UND korrekte Ergebnisse (keine Dopplung, Titel aus Meilenstein statt vision) — löst F-611/F-612; anzeigePruefbefehl zeigt für die ECHTEN argv aus startvorlagen/ai-workforce.json und aus schreibeStartvorlageUndProfil 'npm run check'/'npm run check:template' statt der rohen, absoluten Programmpfade, und quotet ein Fremd-argv mit Leerzeichen — löst F-703.")
  }
}

// ─── (r) F34 WS-3: realer POST/GET-/api/sparring-Rundlauf im Modus 'projekt' ──────────
//
// Modus 'projekt' speist einen Capability-Auszug in den Auftragstext ein UND vergibt nach einem
// erfolgreichen Lauf real Feature-/Meilenstein-IDs (vergebeFeatureIds, verarbeiteRollenChatErgebnis)
// — beides nur end-to-end über den echten Endpunkt nachweisbar, nicht durch einen Unit-Test allein.
{
  const basisVerzeichnis = `kontrollzustand-test-f34-ak-r-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length
  const projektId = 'check-f34-ak-r'
  const gueltigesErgebnis = JSON.parse(readFileSync('schemas/examples/ergebnis-product-coach.valid-projekt-entwurf.json', 'utf-8'))

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

  // repoWurzel bleibt der echte Repo-Pfad (Default von erzeugeRequestHandler) — sammleBestehendeIds
  // liest damit die REALEN features/*/ und docs/projekt/roadmap.json dieses Repos; die Prüfungen
  // unten verlangen deshalb bewusst nur FORM (Muster ^F[0-9]+$/^M[0-9]+$), keinen festen Zahlenwert
  // (der würde mit jedem neuen, real angelegten Feature altern).
  const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, projektId, fuehreAufgabeDurchFn }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const basisUrl = `http://127.0.0.1:${port}`
  try {
    const antwort = await fetch(`${basisUrl}/api/sparring`, { method: 'POST', body: JSON.stringify({ nachricht: 'Lass uns ein neues Projekt planen.', modus: 'projekt' }) })
    if (antwort.status !== 202) {
      befunde.push(`(r): erwartet 202, erhalten ${antwort.status} (${await antwort.text()})`)
    }
    await new Promise((resolve) => setTimeout(resolve, 30))

    if (letzteEingaben === null || !letzteEingaben.auftragstext.includes('Capability-Auszug') || !/- claude-code \(worker\)/.test(letzteEingaben.auftragstext)) {
      befunde.push(`(r): der Auftragstext im Modus 'projekt' sollte einen Capability-Auszug (u. a. 'claude-code (worker)') enthalten, erhalten: ${letzteEingaben?.auftragstext}`)
    } else if (!letzteEingaben.auftragstext.includes('Vision/Problem')) {
      befunde.push(`(r): der Auftragstext im Modus 'projekt' sollte die Interview-Reihenfolge (u. a. 'Vision/Problem') benennen, erhalten: ${letzteEingaben.auftragstext}`)
    } else {
      console.log("✓ (r): POST /api/sparring baut im Modus 'projekt' einen Auftragstext mit Capability-Auszug UND Interview-Reihenfolge-Instruktion.")
    }

    const verlauf = await (await fetch(`${basisUrl}/api/sparring`)).json()
    const eintrag = verlauf.verlauf[0]
    if (verlauf.verlauf.length !== 1 || eintrag?.modus !== 'projekt') {
      befunde.push(`(r): GET /api/sparring sollte genau einen Eintrag mit modus 'projekt' zeigen, erhalten ${JSON.stringify(verlauf)}`)
    } else {
      console.log("✓ (r): GET /api/sparring projiziert 'modus: projekt' für den geschriebenen Turn.")
    }

    const projekt = eintrag?.coachAntwort?.projekt
    const meilenstein = projekt?.meilensteine?.[0]
    const feature = meilenstein?.features?.[0]
    if (!/^M[0-9]+$/.test(meilenstein?.id ?? '') || !/^F[0-9]+$/.test(feature?.id ?? '')) {
      befunde.push(`(r): der persistierte Projekt-Entwurf sollte real vergebene Meilenstein-/Feature-IDs tragen (Form M<n>/F<n>), erhalten ${JSON.stringify(projekt?.meilensteine)}`)
    } else if (projekt?.auftragModus !== 'neu' && projekt?.auftragModus !== 'erweiterung') {
      befunde.push(`(r): der persistierte Projekt-Entwurf sollte 'auftragModus' ('neu' oder 'erweiterung') tragen, erhalten ${JSON.stringify(projekt?.auftragModus)}`)
    } else {
      console.log(`✓ (r): vergebeFeatureIds vergibt real Meilenstein-/Feature-IDs (${meilenstein.id}/${feature.id}) und der Entwurf trägt 'auftragModus' ('${projekt.auftragModus}').`)
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (s) F34 WS-3 (Code-Review-Befund, löst F-613): modus/art-Kopplung real erzwungen ──────
//
// Ohne diese Prüfung könnte ein Modell, das seine Rolleninstruktion missachtet, im angefragten
// modus 'feature' trotzdem art 'projekt_entwurf' liefern — die Ressourcen-Erfindungsprüfung liefe
// leer (bekannteRessourcenIds wird NUR im Modus 'projekt' aufgelöst) UND vergebeFeatureIds vergäbe
// trotzdem reale IDs für ein Ergebnis, dessen Herkunft der Server gar nicht als Projekt-Interview
// angefragt hatte. verarbeiteRollenChatErgebnis lehnt diesen Widerspruch jetzt wie jeden anderen
// Vertragsverstoß ab (sichtbarer Fehler-Turn, F-506-Muster) statt ihm zu vertrauen.
{
  const basisVerzeichnis = `kontrollzustand-test-f34-ak-s-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length
  const projektId = 'check-f34-ak-s'
  const projektEntwurfErgebnis = JSON.parse(readFileSync('schemas/examples/ergebnis-product-coach.valid-projekt-entwurf.json', 'utf-8'))

  const fuehreAufgabeDurchFn = async (laufId) => {
    mkdirSync(basisVerzeichnis, { recursive: true })
    const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
    // Simuliert ein Modell, das trotz angefragtem modus 'feature' (unten, kein 'modus' im Body)
    // art 'projekt_entwurf' liefert — Instruktionsverstoß, den der Server nicht verhindern kann,
    // aber erkennen und ablehnen muss.
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(projektEntwurfErgebnis) }) }), 'utf8')
    const profilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
    const { registriereKernArtefakt } = await import('../src/lineage-registry/index.ts')
    registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'check-f34-fake-modus-verstoss' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad } }, undefined, {
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
    const antwort = await fetch(`${basisUrl}/api/sparring`, { method: 'POST', body: JSON.stringify({ nachricht: 'Was schlägst du vor?' }) })
    if (antwort.status !== 202) {
      befunde.push(`(s): erwartet 202, erhalten ${antwort.status} (${await antwort.text()})`)
    } else {
      await new Promise((resolve) => setTimeout(resolve, 30))
      const verlauf = (await (await fetch(`${basisUrl}/api/sparring`)).json()).verlauf
      if (verlauf.length !== 1) {
        befunde.push(`(s): erwartet GENAU einen Sparring-Eintrag (den sichtbaren Fehler-Turn), erhalten ${verlauf.length}`)
      } else {
        const eintrag = verlauf[0]
        if (eintrag.coachAntwort?.art !== 'frage') {
          befunde.push(`(s): ein art:'projekt_entwurf'-Ergebnis bei angefragtem modus 'feature' sollte einen sichtbaren Fehler-Turn erzeugen (konfiguration.fehlerArt 'frage'), erhalten ${JSON.stringify(eintrag.coachAntwort)}`)
        } else if (typeof eintrag.coachAntwort.antwort !== 'string' || !eintrag.coachAntwort.antwort.includes('Rolleninstruktion missachtet')) {
          befunde.push(`(s): erwartet einen erkennbaren Vertragsverstoß-Text ('Rolleninstruktion missachtet') in coachAntwort.antwort, erhalten ${JSON.stringify(eintrag.coachAntwort)}`)
        } else if (eintrag.coachAntwort.projekt !== undefined) {
          befunde.push(`(s): ein abgelehntes Ergebnis darf KEIN 'projekt'-Feld mit real vergebenen IDs tragen, erhalten ${JSON.stringify(eintrag.coachAntwort)}`)
        } else {
          console.log("✓ (s): ein art:'projekt_entwurf'-Ergebnis bei angefragtem modus 'feature' wird real als Vertragsverstoß abgelehnt (sichtbarer Fehler-Turn, KEINE ID-Vergabe) — löst F-613.")
        }
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (t) F34 WS-3 (QA-/Code-Review-Befund, löst F-614): Verlaufsfenster nach modus gefiltert ──
//
// 'feature' und 'projekt' teilen sich denselben 'sparring-<projektId>'-Verlauf — ohne Filter sah
// der Coach frühere Turns des JEWEILS ANDEREN Untermodus als ungekennzeichneten Kontext (real
// beobachtet, features/F34/nachweis-ws3.md). ladeRollenVerlaufsfenster filtert jetzt nach modus.
{
  const basisVerzeichnis = `kontrollzustand-test-f34-ak-t-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const projektId = 'check-f34-ak-t'
  const frageErgebnis = JSON.parse(readFileSync('schemas/examples/ergebnis-product-coach.valid-frage.json', 'utf-8'))

  let letzteEingaben = null
  const fuehreAufgabeDurchFn = async (laufId, _profilReferenz, eingaben) => {
    letzteEingaben = eingaben
    mkdirSync(basisVerzeichnis, { recursive: true })
    const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(frageErgebnis) }) }), 'utf8')
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
  const sende = async (nachricht, modus) => {
    const antwort = await fetch(`${basisUrl}/api/sparring`, { method: 'POST', body: JSON.stringify({ nachricht, modus }) })
    if (antwort.status !== 202) throw new Error(`(t) sende('${nachricht}'): erwartet 202, erhalten ${antwort.status}`)
    await new Promise((resolve) => setTimeout(resolve, 30))
  }
  try {
    await sende('Feature-Nachricht eins', 'feature')
    await sende('Projekt-Nachricht eins', 'projekt')
    await sende('Feature-Nachricht zwei', 'feature')
    const auftragstextFeature = letzteEingaben.auftragstext
    if (!auftragstextFeature.includes('Feature-Nachricht eins') || auftragstextFeature.includes('Projekt-Nachricht eins')) {
      befunde.push(`(t): das Verlaufsfenster für modus 'feature' sollte nur frühere 'feature'-Turns zeigen, erhalten: ${auftragstextFeature}`)
    } else {
      console.log("✓ (t): das Verlaufsfenster im Modus 'feature' zeigt nur frühere 'feature'-Turns, keine 'projekt'-Turns (löst F-614).")
    }
    await sende('Projekt-Nachricht zwei', 'projekt')
    const auftragstextProjekt = letzteEingaben.auftragstext
    if (!auftragstextProjekt.includes('Projekt-Nachricht eins') || auftragstextProjekt.includes('Feature-Nachricht eins') || auftragstextProjekt.includes('Feature-Nachricht zwei')) {
      befunde.push(`(t): das Verlaufsfenster für modus 'projekt' sollte nur frühere 'projekt'-Turns zeigen, erhalten: ${auftragstextProjekt}`)
    } else {
      console.log("✓ (t): das Verlaufsfenster im Modus 'projekt' zeigt nur frühere 'projekt'-Turns, keine 'feature'-Turns (löst F-614).")
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (u) F34 WS-3 Korrekturrunde (löst F-618): vergebeFeatureIds gegen die REALE roadmap.json ──
//
// docs/projekt/roadmap.json reserviert seit dem F-618-Fix bereits 'F41' (M5, E-M5-14 — "Neues
// Projekt anlegen"), auch ohne eigene features/F41/-Akte. vergebeFeatureIds darf diese ID nie
// erneut vergeben, unabhängig davon, ob sie aus einem features/<id>/-Verzeichnis oder
// ausschließlich aus roadmap.json stammt (sammleBestehendeIds sammelt aus BEIDEN Quellen in eine
// gemeinsame Menge) — genau der Fehler, der im realen WS-3-Nachweis F41 kollidieren ließ.
{
  const befundeVor = befunde.length
  const bestehendeIds = sammleBestehendeIds(process.cwd(), 'docs/projekt/roadmap.json')
  if (!bestehendeIds.features.includes('F41')) {
    befunde.push("(u): 'F41' sollte über docs/projekt/roadmap.json (M5, E-M5-14) reserviert sein, sammleBestehendeIds fand sie nicht — Regression von F-618")
  }
  const hoechsteNummer = bestehendeIds.features.reduce((max, id) => {
    const treffer = /^F([0-9]+)[A-Za-z]?$/.exec(id)
    return treffer === null ? max : Math.max(max, Number.parseInt(treffer[1], 10))
  }, 0)
  const projekt = {
    meilensteine: [{ titel: 'x', ziel: 'x', features: [{ titel: 'Einziges Feature', ziel: 'x', nicht_ziele: [], akzeptanzkriterien: [], abhaengig_von_titel: [] }] }],
    offene_fragen: [],
  }
  const zugewiesen = vergebeFeatureIds(projekt, bestehendeIds)
  const vergebeneId = zugewiesen.meilensteine[0].features[0].id
  if (vergebeneId === 'F41') {
    befunde.push("(u): vergebeFeatureIds hat gegen den realen Bestand erneut 'F41' vergeben, obwohl roadmap.json sie bereits reserviert — Regression von F-618")
  } else {
    const vergebeneNummer = Number.parseInt(/^F([0-9]+)/.exec(vergebeneId)?.[1] ?? '0', 10)
    if (!(vergebeneNummer > hoechsteNummer)) {
      befunde.push(`(u): erwartet eine Feature-ID > F${hoechsteNummer} (höchste real bestehende, inkl. roadmap.json-Reservierungen), erhalten '${vergebeneId}'`)
    } else if (bestehendeIds.features.includes(vergebeneId)) {
      befunde.push(`(u): vergebeFeatureIds hat eine bereits real bestehende ID erneut vergeben: '${vergebeneId}'`)
    } else {
      console.log(`✓ (u): vergebeFeatureIds vergibt gegen die reale docs/projekt/roadmap.json (F41 reserviert, E-M5-14) korrekt die nächste freie ID ('${vergebeneId}'), nicht 'F41' — löst F-618.`)
    }
  }
}

// ─── (v) F34 WS-3 Korrekturrunde (löst F-620/F-621): Umschalter-Hervorhebung + [hidden]-Kaskade ──
//
// Sichtprüfung (Stefan) + Challenger, 23.09.2026: renderVerlauf aktualisierte bislang nur
// aria-pressed, nie classList('btn-primary') — die optische Hervorhebung wechselte beim Klicken
// nie (F-620). Zusätzlich überschrieb .chat-modus-auswahl { display: flex } die UA-Regel
// [hidden] { display: none } (Muster #shell-chat-spalte[hidden]) — #chat-untermodus-auswahl trägt
// beide Klassen und blieb dadurch auch im Modus 'jarvis' sichtbar (F-621). Kein DOM-Test (F-601-
// Muster, s. Dateikopf) — statischer Quelltext-/Stylesheet-Scan als Regressionswache, ergänzt um
// den realen Playwright-Render-Nachweis in features/F34/nachweis-ws3.md.
{
  const befundeVor = befunde.length
  const chatQuelltext = readFileSync('public/leitstand/views/chat.js', 'utf-8')
  const styleQuelltext = readFileSync('public/leitstand/style.css', 'utf-8')

  const gedruecktIds = ['chat-modus-jarvis-btn', 'chat-modus-sparring-btn', 'chat-untermodus-feature-btn', 'chat-untermodus-projekt-btn']
  if (!/classList\.toggle\(\s*'btn-primary'/.test(chatQuelltext)) {
    befunde.push("(v): renderVerlauf sollte 'btn-primary' per classList.toggle setzen — kein Aufruf im Quelltext gefunden (Regression von F-620: aria-pressed allein wechselt die optische Hervorhebung nicht)")
  }
  for (const id of gedruecktIds) {
    if (!new RegExp(`setzeGedruecktenZustand\\(\\s*'${id}'`).test(chatQuelltext)) {
      befunde.push(`(v): renderVerlauf sollte den gedrückten Zustand von '${id}' über setzeGedruecktenZustand (aria-pressed + btn-primary gleichlaufend) ableiten — kein Aufruf dafür gefunden`)
    }
  }
  if (!/\.chat-modus-auswahl\[hidden\]\s*\{\s*display:\s*none/.test(styleQuelltext)) {
    befunde.push("(v): style.css sollte eine Regel '.chat-modus-auswahl[hidden] { display: none; }' tragen — ohne sie überschreibt 'display: flex' die UA-[hidden]-Regel (Regression von F-621, #chat-untermodus-auswahl bliebe auch im Modus 'jarvis' sichtbar)")
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (v): renderVerlauf leitet 'btn-primary' für alle vier Umschalter-Buttons gleichlaufend mit aria-pressed ab, style.css trägt '.chat-modus-auswahl[hidden] { display: none; }' — F-620/F-621 real behoben.")
  }
}

// ─── (w) F34 Fixpaket (löst F-624): statischer Scan gegen die Cross-Untermodus-Vermischung ──
{
  const befundeVor = befunde.length
  const quelltext = readFileSync('public/leitstand/views/chat.js', 'utf-8')

  if (!/eintragModus:\s*e\.modus\s*\?\?\s*'feature'/.test(quelltext)) {
    befunde.push("(w): baueAnzeigeListe sollte persistierte Einträge mit 'eintragModus: e.modus ?? 'feature'' taggen — fehlt im Quelltext (Regression von F-624 möglich)")
  }
  if (!/eintragModus:\s*zustand\.ausstehenderLauf\.sparringUntermodus\s*\?\?\s*'feature'/.test(quelltext) && !/eintragModus:\s*zustand\.ausstehenderLauf\?\.sparringUntermodus\s*\?\?\s*'feature'/.test(quelltext)) {
    befunde.push("(w): der 'ausstehend'-Eintrag sollte eintragModus aus zustand.ausstehenderLauf.sparringUntermodus ableiten — fehlt im Quelltext")
  }
  if (!/sparringUntermodus:\s*modus\s*===\s*'sparring'\s*\?\s*sparringUntermodus\s*:\s*undefined/.test(quelltext)) {
    befunde.push("(w): sendeAktuelleEingabe sollte den bei Sende-Zeitpunkt aktiven sparringUntermodus auf zustand.ausstehenderLauf ablegen — fehlt im Quelltext (ohne das trägt der spätere Fehler-/Ausstehend-Eintrag den FALSCHEN, ggf. inzwischen gewechselten Untermodus)")
  }
  if (!/modus\s*===\s*'sparring'\s*\?\s*liste\.filter\(\s*\(eintrag\)\s*=>\s*eintrag\.eintragModus\s*===\s*sparringUntermodus\s*\)\s*:\s*liste/.test(quelltext)) {
    befunde.push("(w): baueAnzeigeListe sollte am Ende NUR für 'sparring' nach sparringUntermodus filtern (liste.filter(…) : liste) — Filter-Endzeile fehlt oder wurde verändert (Regression von F-624: 'feature'/'projekt' würden wieder gemischt angezeigt)")
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (w): baueAnzeigeListe taggt persistierte/lokale/ausstehende Einträge einheitlich mit eintragModus und filtert NUR im Modus 'sparring' danach — 'jarvis' bleibt strukturell unangetastet (löst F-624).")
  }
}

// ─── (x) F34 Fixpaket (löst F-625): POST /api/sparring/<laufId>/auftrag — realer Rundlauf ──
{
  const basisVerzeichnis = `kontrollzustand-test-f34-ak-x-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const befundeVor = befunde.length
  const projektId = 'check-f34-ak-x'
  const scopeErgebnis = JSON.parse(readFileSync('schemas/examples/ergebnis-product-coach.valid-scope-entwurf.json', 'utf-8'))

  const fuehreAufgabeDurchFn = async (laufId) => {
    mkdirSync(basisVerzeichnis, { recursive: true })
    const rohstromPfad = join(basisVerzeichnis, `${laufId}-rohstrom.json`)
    writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: JSON.stringify(scopeErgebnis) }) }), 'utf8')
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
    const gesendet = await fetch(`${basisUrl}/api/sparring`, { method: 'POST', body: JSON.stringify({ nachricht: 'Scope für F-625-Test' }) })
    if (gesendet.status !== 202) befunde.push(`(x): Vorbereitung — erwartet 202 beim Senden, erhalten ${gesendet.status}`)
    await new Promise((resolve) => setTimeout(resolve, 30))

    const vorher = await (await fetch(`${basisUrl}/api/sparring`)).json()
    const laufId = vorher.verlauf[0]?.laufId
    if (typeof laufId !== 'string' || laufId.length === 0) {
      befunde.push(`(x): Vorbereitung — konnte keine laufId aus GET /api/sparring lesen, erhalten ${JSON.stringify(vorher)}`)
    } else if (vorher.verlauf[0].auftragErstelltId !== null) {
      befunde.push(`(x): ein frischer Turn ohne Zuordnung sollte auftragErstelltId null projizieren (Alt-Einträge-Verhalten), erhalten ${JSON.stringify(vorher.verlauf[0])}`)
    } else {
      console.log('✓ (x): ein Turn ohne Zuordnung projiziert weiterhin auftragErstelltId null (unverändertes Alt-Einträge-Verhalten).')
    }

    if (typeof laufId === 'string' && laufId.length > 0) {
      const rotFaelle = [
        { pfad: `/api/sparring/${encodeURIComponent(laufId)}/auftrag`, body: JSON.stringify({}), erwartet: /'auftragId' muss ein nicht-leerer String sein/, name: 'auftragId fehlt' },
        { pfad: `/api/sparring/${encodeURIComponent(laufId)}/auftrag`, body: JSON.stringify({ auftragId: '' }), erwartet: /'auftragId' muss ein nicht-leerer String sein/, name: 'auftragId leer' },
        { pfad: `/api/sparring/${encodeURIComponent(laufId)}/auftrag`, body: JSON.stringify({ auftragId: 'x', fremdfeld: 1 }), erwartet: /unbekanntes Feld 'fremdfeld'/, name: 'Fremdfeld' },
        { pfad: '/api/sparring//auftrag', body: JSON.stringify({ auftragId: 'x' }), erwartet: /laufId darf nicht leer sein/, name: 'leere laufId im Pfad' },
        // Korrekturschleife (Abnahme 23.09.2026): auftragId mit '/' würde ohne die
        // LAUFID_UNZULAESSIGE_ZEICHEN-Prüfung als lauf_id in ladeArtefaktVersion→pruefeLaufId
        // werfen und über den generischen Handler-Catch 500 statt 400 liefern.
        { pfad: `/api/sparring/${encodeURIComponent(laufId)}/auftrag`, body: JSON.stringify({ auftragId: 'a/b' }), erwartet: /'auftragId' enthält unzulässige Zeichen/, name: 'auftragId mit Schrägstrich' },
      ]
      const befundeVorRotfaelle = befunde.length
      for (const fall of rotFaelle) {
        const antwort = await fetch(`${basisUrl}${fall.pfad}`, { method: 'POST', body: fall.body })
        const koerper = await antwort.json()
        if (antwort.status !== 400 || !fall.erwartet.test(koerper.grund ?? '')) {
          befunde.push(`(x) Rotfall '${fall.name}': erwartet 400 mit ${fall.erwartet}, erhalten ${antwort.status} (${JSON.stringify(koerper)})`)
        }
      }
      if (befunde.length === befundeVorRotfaelle) {
        console.log('✓ (x): POST /api/sparring/<laufId>/auftrag lehnt eine fehlende/leere auftragId, ein Fremdfeld, eine leere laufId im Pfad und eine auftragId mit unzulässigen Zeichen (z. B. \'/\') real mit 400 ab (kein 500).')
      }

      // F34 Fixpaket-Nachtrag (löst F-631): eine formal gültige, aber real nicht existierende
      // laufId/auftragId wird mit 404 abgelehnt — kein Rückverweis wird gespeichert.
      const befundeVorExistenz = befunde.length
      const unbekannteLaufIdAntwort = await fetch(`${basisUrl}/api/sparring/lauf-nicht-vorhanden/auftrag`, { method: 'POST', body: JSON.stringify({ auftragId: 'irgendein-auftrag' }) })
      const unbekannteLaufIdKoerper = await unbekannteLaufIdAntwort.json()
      if (unbekannteLaufIdAntwort.status !== 404 || !/Sparring-Lauf 'lauf-nicht-vorhanden' nicht gefunden/.test(unbekannteLaufIdKoerper.grund ?? '')) {
        befunde.push(`(x) Rotfall 'unbekannte laufId': erwartet 404 mit "Sparring-Lauf 'lauf-nicht-vorhanden' nicht gefunden", erhalten ${unbekannteLaufIdAntwort.status} (${JSON.stringify(unbekannteLaufIdKoerper)})`)
      }
      const unbekannteAuftragIdAntwort = await fetch(`${basisUrl}/api/sparring/${encodeURIComponent(laufId)}/auftrag`, { method: 'POST', body: JSON.stringify({ auftragId: 'auftrag-nicht-vorhanden' }) })
      const unbekannteAuftragIdKoerper = await unbekannteAuftragIdAntwort.json()
      if (unbekannteAuftragIdAntwort.status !== 404 || !/Auftrag 'auftrag-nicht-vorhanden' nicht gefunden/.test(unbekannteAuftragIdKoerper.grund ?? '')) {
        befunde.push(`(x) Rotfall 'unbekannte auftragId': erwartet 404 mit "Auftrag 'auftrag-nicht-vorhanden' nicht gefunden", erhalten ${unbekannteAuftragIdAntwort.status} (${JSON.stringify(unbekannteAuftragIdKoerper)})`)
      }
      const zwischenstand = await (await fetch(`${basisUrl}/api/sparring`)).json()
      if (zwischenstand.verlauf[0]?.auftragErstelltId !== null) {
        befunde.push(`(x): eine abgelehnte Zuordnung (unbekannte laufId/auftragId) darf keinen Rückverweis speichern, erhalten ${JSON.stringify(zwischenstand.verlauf[0])}`)
      }
      if (befunde.length === befundeVorExistenz) {
        console.log("✓ (x): POST /api/sparring/<laufId>/auftrag lehnt eine real nicht existierende laufId und eine real nicht existierende auftragId mit 404 ab, ohne einen Rückverweis zu speichern (löst F-631).")
      }

      // Grünfall: auftragId muss real über POST /api/auftraege angelegt sein (F-631 prüft Existenz).
      const auftragAntwort = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'F-631-Test-Auftrag', auftragstext: 'x' }) })
      const { auftragId: realeAuftragId } = await auftragAntwort.json()
      const grueneAntwort = await fetch(`${basisUrl}/api/sparring/${encodeURIComponent(laufId)}/auftrag`, { method: 'POST', body: JSON.stringify({ auftragId: realeAuftragId }) })
      if (grueneAntwort.status !== 200) {
        befunde.push(`(x): erwartet 200 bei gültiger Zuordnung, erhalten ${grueneAntwort.status} (${await grueneAntwort.text()})`)
      }
      const nachher = await (await fetch(`${basisUrl}/api/sparring`)).json()
      if (nachher.verlauf[0]?.auftragErstelltId !== realeAuftragId) {
        befunde.push(`(x): GET /api/sparring sollte 'auftragErstelltId': '${realeAuftragId}' projizieren, erhalten ${JSON.stringify(nachher.verlauf[0])}`)
      } else {
        console.log("✓ (x): POST /api/sparring/<laufId>/auftrag registriert die Zuordnung real, GET /api/sparring projiziert sie danach als 'auftragErstelltId' (löst F-625).")
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

// ─── (y) F34 Fixpaket-Nachtrag (löst F-629): '.btn[hidden]' schlägt konkurrierende display-Regeln ──
//
// '.btn { display: inline-flex }' und '.chat-zusammenfassen-btn { display: block }' überschrieben die
// UA-Regel '[hidden] { display: none }' — #chat-abbrechen-btn/#chat-zusammenfassen-btn blieben dadurch
// IMMER sichtbar, unabhängig vom hidden-Attribut (dieselbe Fehlerklasse wie F-620/F-621, Muster (v)).
// Kein DOM-Test möglich (F-601-Muster) — statischer Scan, realer Beweis im Render-Nachweis
// (features/F34/nachweis-fixpaket-ui/).
{
  const befundeVor = befunde.length
  const styleQuelltext = readFileSync('public/leitstand/style.css', 'utf-8')

  if (!/\.btn\[hidden\]\s*\{\s*display:\s*none/.test(styleQuelltext)) {
    befunde.push("(y): style.css sollte eine Regel '.btn[hidden] { display: none; }' tragen — ohne sie überschreiben '.btn'/'.chat-zusammenfassen-btn' die UA-[hidden]-Regel (Regression von F-629, #chat-abbrechen-btn/#chat-zusammenfassen-btn blieben dann wieder immer sichtbar)")
  }
  if (befunde.length === befundeVor) {
    console.log("✓ (y): style.css trägt '.btn[hidden] { display: none; }' — #chat-abbrechen-btn/#chat-zusammenfassen-btn (und jedes andere .btn-Element) respektieren das hidden-Attribut wieder real (löst F-629).")
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
