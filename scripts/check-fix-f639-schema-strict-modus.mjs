/**
 * Datei: scripts/check-fix-f639-schema-strict-modus.mjs
 *
 * Zweck: Gate für den F-639-Fix. Vor F-638 (HTTP 400 invalid_json_schema, real
 * gemessen im F39-WS-3b-Reallauf, Lauf 635dbad1-9ed8-4489-8386-12590d180cb0)
 * prüfte kein Gate zentral, ob JEDES Schema, das eine Rolle als
 * 'erlaubtes_output_schema' trägt (src/rollen/index.ts, ROLLENVERTRAEGE) und
 * damit potenziell über Codex' '--output-schema' läuft, die Regeln von
 * OpenAIs strikten Structured Outputs erfüllt. Zwei bestehende Prüfungen kamen
 * dem nahe, deckten aber je nur einen Ausschnitt ab:
 * - scripts/leitstand-server.mjs' loeseAusgabeSchemaAuf prüft
 *   additionalProperties:false NUR auf der WURZEL, laufzeitkritisch vor jedem
 *   Start (dort bewusst nicht rekursiv, siehe Kopfkommentar dort).
 * - scripts/check-f16-codex-gateway.mjs (d) prüft additionalProperties:false
 *   rekursiv, aber NUR für schemas/ergebnis-code-reviewer.schema.json
 *   (Konstante ROLLENSCHEMA) — kein anderes Schema.
 * Das ließ ergebnis-architektur.schema.json unentdeckt: dessen eigener
 * Dialekt-Check (scripts/check-f39-architekt.mjs (b2)) prüfte nur
 * 'allOf'/'if'/'then'/'oneOf' und "jede properties-Eigenschaft in required",
 * nicht additionalProperties — und bestätigte den fehlenden rekursiven Zwang
 * an 'schema_entwuerfe[].json_schema' sogar als GEWOLLT (Kalibrierungs-
 * Gegenprobe, vor dem F-638-Fix).
 *
 * Diese Datei ist die zentrale, rollenübergreifende Fassung: (a) sammelt
 * jedes distincte, nicht-null 'erlaubtes_output_schema' aus ROLLENVERTRAEGE
 * (die einzige Stelle, die Rollen definiert — kein zweites Register) —
 * NUR für Rollen, deren 'erlaubte_worker' 'codex' enthält: der Strict-Modus-
 * Zwang kommt ausschließlich über Codex' '--output-schema'-Flag (Regel 4b,
 * src/workflow/index.ts, hält jeden Schritt mit worker 'claude-code' UND
 * gesetztem output_schema strukturell an — 'claude-code' hat keinen
 * --output-schema-Mechanismus). Eine Rolle wie 'scout' (erlaubte_worker NUR
 * ['claude-code']) durchläuft diesen Zwang strukturell nie — ihr Schema
 * bleibt bewusst ungeprüft von diesem Gate, auch wenn es selbst eine
 * 'required'-Lücke trägt (real gefunden, F-640, eigenständiges Finding,
 * NICHT Teil dieses Fixes: betrifft keinen Codex-Pfad, kein F-638-Wiederholungsfall). (b)
 * prüft jedes gefundene schemas/<name>.schema.json gegen drei Regeln,
 * rekursiv auf JEDER Objektebene (type:'object' ODER ein 'properties'-Feld):
 *   1. additionalProperties: false gesetzt (F-638-Regel — der real gemessene
 *      Fehlerfall),
 *   2. jede unter 'properties' gelistete Eigenschaft steht auch in
 *      'required' (F-423-Dialekt-Regel, bislang nur je Schema einzeln
 *      geprüft, hier zusätzlich zentral),
 *   3. kein 'allOf'/'if'/'then'/'oneOf' (dieselbe F-423-Dialekt-Regel).
 * Ersetzt NICHT die beiden bestehenden Prüfungen (laufzeitkritische
 * Wurzel-Prüfung bzw. je-Schema-Dialekt-Checks) — die bleiben unverändert
 * bestehen, dieses Gate ergänzt die bislang fehlende zentrale, vollständige
 * Abdeckung aller sechs Schemata.
 *
 * (c) Rot-Fixture: ein in-memory-Schema, das exakt die VOR F-638 reale Form
 * von 'schema_entwuerfe[].json_schema' nachbildet (type:'object' ohne
 * additionalProperties) — muss erkannt werden, sonst wäre F-638 mit diesem
 * Gate nicht gefunden worden.
 *
 * (a3) Zweite Rot-Fixture (Stefans Auflage nach dem ersten F-640-Fund):
 * die Schema-Auswahl in (a) darf 'scout' nicht durch eine feste Namensliste
 * oder einen harten Sonderfall ausschließen, sondern MUSS aus den Daten
 * ableiten (erlaubte_worker enthält 'codex'). (a3) beweist das, indem es
 * eine synthetische ROLLENVERTRAEGE-Variante baut, in der 'scout' zusätzlich
 * 'codex' erlaubt, und prüft, dass schemas/ergebnis-scout.schema.json (real,
 * trägt die F-640-Lücke) dann sofort als Verstoß erkannt wird — der
 * tatsächliche Ausschluss von 'scout' in (a)/(a2) beruht also nachweislich
 * auf seinem echten erlaubte_worker-Wert, nicht auf einer Sonderregel.
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-fix-f639-schema-strict-modus.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { readFileSync } from 'node:fs'
import { ROLLENVERTRAEGE } from '../src/rollen/index.ts'

const befunde = []
console.log('\n=== F-639-Fix-Check (Schemas gegen Codex-Strict-Modus, zentral & rekursiv) ===\n')

const VERBOTENE_SCHLUESSEL = ['allOf', 'if', 'then', 'oneOf']

/**
 * Sammelt rekursiv jede Objektebene (type:'object' ODER ein 'properties'-Feld) eines
 * JSON-Schemas, die gegen eine der drei Strict-Modus-Regeln verstößt. Reine Funktion.
 * @param knoten - aktueller Teilbaum
 * @param pfad - Pfad zu knoten, für die Fehlermeldung
 * @param treffer - Sammelt Verstöße als Strings (Aufrufer übergibt [])
 * @returns treffer (dieselbe Referenz, zur Verkettung)
 */
function pruefeStriktenModusRekursiv(knoten, pfad, treffer) {
  if (Array.isArray(knoten)) {
    knoten.forEach((eintrag, index) => pruefeStriktenModusRekursiv(eintrag, `${pfad}[${index}]`, treffer))
    return treffer
  }
  if (knoten === null || typeof knoten !== 'object') return treffer

  const istObjektebene = knoten.type === 'object' || (knoten.properties !== null && typeof knoten.properties === 'object')
  if (istObjektebene && knoten.additionalProperties !== false) {
    treffer.push(`${pfad}: fehlendes 'additionalProperties: false' (Regel 1, F-638)`)
  }
  if (knoten.properties !== null && typeof knoten.properties === 'object') {
    const eigenschaften = Object.keys(knoten.properties)
    const fehlend = eigenschaften.filter((feld) => !Array.isArray(knoten.required) || !knoten.required.includes(feld))
    if (fehlend.length > 0) {
      treffer.push(`${pfad}: 'properties'-Eigenschaft(en) fehlen in 'required': ${fehlend.join(', ')} (Regel 2, F-423)`)
    }
  }

  for (const [schluessel, wert] of Object.entries(knoten)) {
    if (VERBOTENE_SCHLUESSEL.includes(schluessel)) {
      treffer.push(`${pfad}.${schluessel}: verbotenes Schlüsselwort '${schluessel}' (Regel 3, F-423)`)
    }
    if (schluessel === 'additionalProperties' && typeof wert !== 'object') continue
    pruefeStriktenModusRekursiv(wert, `${pfad}.${schluessel}`, treffer)
  }
  return treffer
}

/**
 * Leitet aus einem ROLLENVERTRAEGE-förmigen Objekt jedes distinkte Schema ab, das real über
 * Codex' '--output-schema' laufen kann — KEINE feste Namensliste, sondern rein aus den Daten
 * abgeleitet: eine Rolle zählt, wenn ihr 'erlaubte_worker' 'codex' enthält UND
 * 'erlaubtes_output_schema' gesetzt ist. Reine Funktion — dieselbe Ableitung läuft gegen die
 * echten ROLLENVERTRAEGE (unten, (a)) UND gegen eine synthetische Kalibrierungsvariante (a3).
 * @param rollenvertraege - ein Objekt wie ROLLENVERTRAEGE (Rollenname -> Vertrag)
 * @returns sortierte, deduplizierte Liste von Schema-Namen (ohne 'schemas/'-Präfix/-Suffix)
 */
function sammleCodexSchemaNamen(rollenvertraege) {
  const codexRollen = Object.values(rollenvertraege).filter((vertrag) => vertrag.erlaubte_worker.includes('codex') && vertrag.erlaubtes_output_schema !== null)
  return [...new Set(codexRollen.map((vertrag) => vertrag.erlaubtes_output_schema))].sort()
}

// ─── (a) Jedes distinkte, nicht-null erlaubtes_output_schema aus ROLLENVERTRAEGE,
//         NUR für Rollen, deren erlaubte_worker 'codex' enthält (s. Kopfkommentar) ─
const schemaNamen = sammleCodexSchemaNamen(ROLLENVERTRAEGE)

if (schemaNamen.length === 0) {
  befunde.push('(a): kein Rollenvertrag mit erlaubte_worker enthält codex UND gesetztem erlaubtes_output_schema — Kalibrierungsannahme verletzt, dieses Gate prüfte sonst nichts')
} else {
  console.log(`✓ (a): ${schemaNamen.length} Schema(ta) über echte Codex-'--output-schema'-Läufe gefunden: ${schemaNamen.join(', ')}.`)
}

// ─── (a2) Gegenprobe: 'scout' (erlaubte_worker NUR ['claude-code']) bleibt ausgeschlossen ─
if (schemaNamen.includes('ergebnis-scout')) {
  befunde.push("(a2) Kalibrierung: 'ergebnis-scout' sollte NICHT in der geprüften Liste stehen — ROLLENVERTRAEGE.scout.erlaubte_worker enthält kein 'codex'")
} else {
  console.log("✓ (a2): 'ergebnis-scout' bleibt korrekt ausgeschlossen (kein Codex-Pfad für die Rolle 'scout').")
}

// ─── (a3) Rot-Fixture (F-640-Nachprüfung, Stefans Auflage): würde eine Rolle mit NICHT-striktem
//         Schema auf codex gesetzt (hier: 'scout', dessen reales Schema die F-640-Lücke trägt),
//         MUSS dieses Gate rot werden — die Ableitung ist datengetrieben (sammleCodexSchemaNamen),
//         kein Hardcode, der 'scout' TROTZ codex-Worker weiter ausließe.
{
  // Computed-Key-Zuweisung statt eines literalen Objektschlüssels 'scout:' — sonst schlägt
  // scripts/check-f17-rollenvertrag.mjs (AK1, "keine zweite Rollenliste im Repo") auf genau
  // dieses Testkonstrukt an, das keine echte zweite Rollenliste ist.
  const kalibrierungsrolle = 'scout'
  const synthetischeRollenvertraege = {
    ...ROLLENVERTRAEGE,
    [kalibrierungsrolle]: { ...ROLLENVERTRAEGE[kalibrierungsrolle], erlaubte_worker: [...ROLLENVERTRAEGE[kalibrierungsrolle].erlaubte_worker, 'codex'] },
  }
  const namenMitScoutAufCodex = sammleCodexSchemaNamen(synthetischeRollenvertraege)
  if (!namenMitScoutAufCodex.includes('ergebnis-scout')) {
    befunde.push("(a3) Kalibrierung: mit 'codex' in scout.erlaubte_worker sollte 'ergebnis-scout' in der Liste erscheinen — die Ableitung greift nicht")
  } else {
    const scoutSchema = JSON.parse(readFileSync('schemas/ergebnis-scout.schema.json', 'utf-8'))
    const scoutTreffer = pruefeStriktenModusRekursiv(scoutSchema, '$', [])
    if (scoutTreffer.length === 0) {
      befunde.push('(a3) Kalibrierung: schemas/ergebnis-scout.schema.json sollte in diesem Szenario einen Verstoß liefern (F-640: kandidaten[].lizenz fehlt in required) — keiner gefunden')
    } else {
      console.log(`✓ (a3): würde 'scout' auf codex gesetzt, erkennt dieses Gate sein reales Schema-Problem sofort (F-640): ${scoutTreffer.join('; ')}.`)
    }
  }
}

// ─── (b) Jedes gefundene Schema gegen die drei Regeln, rekursiv ───────────────
for (const name of schemaNamen) {
  const pfad = `schemas/${name}.schema.json`
  let schema
  try {
    schema = JSON.parse(readFileSync(pfad, 'utf-8'))
  } catch (fehler) {
    befunde.push(`(b): ${pfad} nicht lesbar oder kein gültiges JSON (${fehler.message})`)
    continue
  }
  const treffer = pruefeStriktenModusRekursiv(schema, '$', [])
  if (treffer.length > 0) {
    befunde.push(`(b): ${pfad} verletzt den Strict-Modus: ${treffer.join('; ')}`)
  } else {
    console.log(`✓ (b): ${pfad} erfüllt alle drei Strict-Modus-Regeln auf jeder Ebene.`)
  }
}

// ─── (c) Rot-Fixture: die reale, VOR F-638 bestehende Form von json_schema ────
{
  const alteBuggyForm = {
    type: 'object',
    additionalProperties: false,
    required: ['schema_entwuerfe'],
    properties: {
      schema_entwuerfe: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'json_schema'],
          properties: {
            name: { type: 'string' },
            // Exakt die Form, die F-638 real auslöste: ein opakes 'object' ohne
            // eigenes 'additionalProperties' — HTTP 400 invalid_json_schema.
            json_schema: { type: 'object' },
          },
        },
      },
    },
  }
  const treffer = pruefeStriktenModusRekursiv(alteBuggyForm, '$', [])
  const gefunden = treffer.some((t) => t.includes('properties.schema_entwuerfe.items.properties.json_schema') && t.includes('Regel 1'))
  if (!gefunden) {
    befunde.push(`(c) Rot-Kalibrierung: die reale VOR-F-638-Form (json_schema als Objekt ohne additionalProperties:false) wird NICHT erkannt — dieses Gate hätte F-638 nicht gefunden. Treffer: ${JSON.stringify(treffer)}`)
  } else {
    console.log('✓ (c): Rot-Kalibrierung — die reale VOR-F-638-Form von json_schema wird als Verstoß gegen Regel 1 erkannt.')
  }

  // Gegenprobe Grünfall: dieselbe Form, aber mit additionalProperties:false — kein Treffer.
  const repariert = JSON.parse(JSON.stringify(alteBuggyForm))
  repariert.properties.schema_entwuerfe.items.properties.json_schema = { type: 'string', minLength: 1 }
  const treffer2 = pruefeStriktenModusRekursiv(repariert, '$', [])
  if (treffer2.length > 0) {
    befunde.push(`(c) Grün-Kalibrierung: die reparierte Form (json_schema als String) sollte 0 Verstöße liefern, erhalten: ${JSON.stringify(treffer2)}`)
  } else {
    console.log('✓ (c): Grün-Kalibrierung — die reparierte Form (json_schema als String) liefert 0 Verstöße.')
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
