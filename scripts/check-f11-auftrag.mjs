/**
 * Datei: scripts/check-f11-auftrag.mjs
 *
 * Zweck: Auftrag-Gate (F11 WS-1, state/plan-v1-f11-auftrag-ws1.md, state/
 * tasks/f11-auftrag-ws1.md). (a) drei Payload-Fixtures unter
 * schemas/examples/kontrollzustand-auftrag*.json gegen validiereAuftragDaten
 * (direkt aus src/auftrag/index.ts importiert, D5-Muster). (b) AK3-Grep +
 * Selbsttest (Muster check-f8-execution-controller.mjs, D4): kein Vorkommen
 * von 'auftragstext' im Teil von src/execution-controller/index.ts, der die
 * anfragen-Liste für den baueKontextpaket-Aufruf konstruiert — nur im
 * nachfolgenden Prompt-Zusammensetzungsteil.
 *
 * Bewusste Abweichung vom Vertragswortlaut (state/tasks/f11-auftrag-ws1.md
 * Punkt 9(b) beschreibt eine Teilung der GESAMTEN Datei am baueKontextpaket-
 * Marker): FUNKTIONSSTART_MARKER grenzt den geprüften "vorAufruf"-Bereich
 * zusätzlich auf den Funktionskörper ein. Ohne diese Eingrenzung meldet das
 * Gate einen Falsch-Befund gegen sich selbst — der Dateikopf-Kommentar von
 * src/execution-controller/index.ts erwähnt 'auftragstext' bereits in Prosa,
 * lange vor der Funktion (real beobachtet, Reviewer-Pass 06.09.2026).
 *
 * Bekannte Grenze (Reviewer-/QA-Pass 06.09.2026, kein Blocker für WS-1): das
 * Gate ist ein reiner Substring-Vergleich, keine AST-/Semantikprüfung. Ein
 * künftiger, nicht-adversarialer Refactor (z. B. eine ausgelagerte
 * Hilfsfunktion oder Modulkonstante außerhalb dieses Fensters, die
 * eingaben.auftragstext indirekt weiterreicht, ohne den Bezeichner selbst im
 * geprüften Bereich zu nennen) würde vom Gate NICHT erkannt. Ebenso deckt
 * `indexOf` nur das ERSTE Vorkommen von BAUEKONTEXTPAKET_AUFRUF_MARKER ab —
 * ein künftiger zweiter baueKontextpaket-Aufruf weiter unten in derselben
 * Datei läge unbeprüft in abAufruf. Das Gate ersetzt keine tiefere Prüfung,
 * sondern deckt genau den einen, in AK3 benannten Verstoßtyp mechanisch ab.
 *
 * F11 WS-2 (AK9) ergänzt drei mechanische Prüfungen, ergänzend zu den
 * echten Live-Server-Testfällen in scripts/check-f10-leitstand.mjs: (c)
 * AK5/AK6 rufen die reinen, aus scripts/leitstand-server.mjs exportierten
 * Funktionen (pruefeStartauftrag, loeseEvidenzPfadAuf) direkt auf, ohne
 * einen Server zu starten — Rot-/Grün-Fall je Regel. (d) AK7 (D13) ist
 * closure-gekapselter Zustand in erzeugeRequestHandler und deshalb ohne
 * Live-Server nicht direkt aufrufbar; die Prüfung ist deshalb ein
 * Grep+Selbsttest nach dem Muster von AK3 oben — sie belegt, dass die
 * D13-Sperre im Quelltext an der richtigen Stelle (vor laufIdBelegt) prüft
 * und in JEDEM Rückkehrzweig (.then UND .catch) zurückgesetzt wird.
 *
 * F12 WS-2 (state/plan-v1-f12-ws2.md) ergänzt (f) pruefeAuftragsformular-
 * Rot-/Grünfall (AK4, reine Funktion, kein Server) und (g) einen
 * pruefeStartauftrag-Rotfall für das jetzt verbotene 'auftragstext'-Feld
 * (AK5). Der gemeinsame Grundkörper (c)/(d)/(e) trägt seither `auftragId`
 * statt `auftragstext` (Risiko 4/5 des Plans) — pruefeStartauftrag ist eine
 * reine Formprüfung ohne Datei-I/O, die auftragId muss hier deshalb NICHT
 * real über registriereAuftrag existieren (anders als die echten
 * HTTP-Testfälle in check-f10-leitstand.mjs).
 *
 * Wird aufgerufen von: `npm run check`, `npm run check:template`
 *
 * Aufruf: node scripts/check-f11-auftrag.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validiereAuftragDaten } from '../src/auftrag/index.ts'
import { validiereStartvorlageDaten } from '../src/startvorlage/index.ts'
import { loeseEvidenzPfadAuf, pruefeAuftragsformular, pruefeStartauftrag } from './leitstand-server.mjs'

const befunde = []
const EXECUTION_CONTROLLER_INDEX = join('src', 'execution-controller', 'index.ts')
const FUNKTIONSSTART_MARKER = 'export async function fuehreAufgabeDurch('
const BAUEKONTEXTPAKET_AUFRUF_MARKER = 'const kontextpaketErgebnis = baueKontextpaket('

console.log('\n=== F11-Auftrag-Check (WS-1) ===\n')

// ─── (a) Drei Payload-Fixtures gegen validiereAuftragDaten ─────────────────
const fixtures = [
  { pfad: 'schemas/examples/kontrollzustand-auftrag.valid.json', sollGueltigSein: true },
  { pfad: 'schemas/examples/kontrollzustand-auftrag.invalid-falscher-schema-wert.json', sollGueltigSein: false },
  { pfad: 'schemas/examples/kontrollzustand-auftrag.invalid-leerer-auftragstext.json', sollGueltigSein: false },
]

for (const { pfad, sollGueltigSein } of fixtures) {
  if (!existsSync(pfad)) {
    befunde.push(`${pfad}: Datei fehlt`)
    continue
  }
  let obj
  try {
    obj = JSON.parse(readFileSync(pfad, 'utf-8'))
  } catch (fehler) {
    befunde.push(`${pfad}: kein gültiges JSON (${fehler.message})`)
    continue
  }
  const verstoesse = validiereAuftragDaten(obj)
  if (sollGueltigSein && verstoesse.length > 0) {
    befunde.push(`${pfad}: sollte gültig sein, aber verletzt: ${verstoesse.join('; ')}`)
  }
  if (!sollGueltigSein && verstoesse.length === 0) {
    befunde.push(`${pfad}: sollte ungültig sein, aber keine Regelverletzung gefunden`)
  }
}
if (befunde.length === 0) {
  console.log(`✓ ${fixtures.length} Payload-Fixture(s) geprüft.`)
}

// ─── (b) AK3-Grep + Selbsttest: 'auftragstext' nie vor dem baueKontextpaket-Aufruf ──

/**
 * Teilt inhalt in den anfragen-Konstruktionsblock (ab FUNKTIONSSTART_MARKER,
 * ausschließlich Dateikopf-Kommentare/Imports) und den Prompt-
 * Zusammensetzungsteil (ab BAUEKONTEXTPAKET_AUFRUF_MARKER). Liefert null,
 * wenn einer der beiden Marker fehlt.
 * @param inhalt - zu prüfender Quelltext
 * @returns { vorAufruf, abAufruf } oder null
 */
function teileAmAufrufMarker(inhalt) {
  const funktionsIndex = inhalt.indexOf(FUNKTIONSSTART_MARKER)
  const aufrufIndex = inhalt.indexOf(BAUEKONTEXTPAKET_AUFRUF_MARKER)
  if (funktionsIndex === -1 || aufrufIndex === -1 || aufrufIndex < funktionsIndex) return null
  return { vorAufruf: inhalt.slice(funktionsIndex, aufrufIndex), abAufruf: inhalt.slice(aufrufIndex) }
}

const inhalt = readFileSync(EXECUTION_CONTROLLER_INDEX, 'utf-8')
const geteilt = teileAmAufrufMarker(inhalt)
if (geteilt === null) {
  befunde.push(`AK3: Marker "${FUNKTIONSSTART_MARKER}"/"${BAUEKONTEXTPAKET_AUFRUF_MARKER}" in ${EXECUTION_CONTROLLER_INDEX} nicht (in dieser Reihenfolge) gefunden — Gate kann nicht prüfen`)
} else {
  const { vorAufruf, abAufruf } = geteilt
  if (/auftragstext/.test(vorAufruf)) {
    befunde.push(`AK3: 'auftragstext' kommt in ${EXECUTION_CONTROLLER_INDEX} im anfragen-Konstruktionsblock (zwischen Funktionsstart und baueKontextpaket-Aufruf) vor — würde in die Anfragenliste durchsickern`)
  } else if (!/auftragstext/.test(abAufruf)) {
    befunde.push(`AK3: 'auftragstext' kommt in ${EXECUTION_CONTROLLER_INDEX} nirgends nach dem baueKontextpaket-Aufruf vor — Prompt-Zusammensetzung scheint auftragstext nicht zu nutzen`)
  } else {
    console.log(
      "✓ AK3: kein Vorkommen von 'auftragstext' im anfragen-Konstruktionsblock von src/execution-controller/index.ts, Vorkommen im Prompt-Zusammensetzungsteil danach vorhanden."
    )
  }
}

// Selbsttest: ein simulierter Verstoß (auftragstext im anfragen-Konstruktionsblock) muss real erkannt werden.
const simulierterVerstoss = `${FUNKTIONSSTART_MARKER}eingaben) {\n  const anfragen = [{ pfad: 'x', frage: eingaben.auftragstext, begruendung: 'x', inhalt: 'x' }]\n  ${BAUEKONTEXTPAKET_AUFRUF_MARKER}anfragen, ...)`
const geteilterVerstoss = teileAmAufrufMarker(simulierterVerstoss)
if (geteilterVerstoss === null || !/auftragstext/.test(geteilterVerstoss.vorAufruf)) {
  befunde.push('AK3-Selbsttest: Muster erkennt einen simulierten Verstoß NICHT — Grep-Regel ist wirkungslos')
} else {
  console.log('✓ AK3-Selbsttest: simulierter Verstoß (auftragstext im anfragen-Konstruktionsblock) wird erkannt.')
}

// ─── (c0) F11 WS-2 AK4: Startvorlage-Fixtures + reale Datei gegen validiereStartvorlageDaten ──
{
  const startvorlageFixtures = [
    { pfad: 'schemas/examples/startvorlage.valid.json', sollGueltigSein: true },
    { pfad: 'schemas/examples/startvorlage.invalid-falscher-schema-wert.json', sollGueltigSein: false },
    { pfad: 'schemas/examples/startvorlage.invalid-kein-schreibender-werkzeugsatz.json', sollGueltigSein: false },
    { pfad: 'startvorlagen/beispielprojekt.json', sollGueltigSein: true },
  ]

  let ak4Befunde = 0
  for (const { pfad, sollGueltigSein } of startvorlageFixtures) {
    if (!existsSync(pfad)) {
      befunde.push(`AK4: ${pfad}: Datei fehlt`)
      ak4Befunde++
      continue
    }
    let obj
    try {
      obj = JSON.parse(readFileSync(pfad, 'utf-8'))
    } catch (fehler) {
      befunde.push(`AK4: ${pfad}: kein gültiges JSON (${fehler.message})`)
      ak4Befunde++
      continue
    }
    const verstoesse = validiereStartvorlageDaten(obj)
    if (sollGueltigSein && verstoesse.length > 0) {
      befunde.push(`AK4: ${pfad}: sollte gültig sein, aber verletzt: ${verstoesse.join('; ')}`)
      ak4Befunde++
    }
    if (!sollGueltigSein && verstoesse.length === 0) {
      befunde.push(`AK4: ${pfad}: sollte ungültig sein, aber keine Regelverletzung gefunden`)
      ak4Befunde++
    }
  }
  if (ak4Befunde === 0) {
    console.log(`✓ AK4: ${startvorlageFixtures.length} Startvorlage-Datei(en) (Fixtures + reale Datei) gegen validiereStartvorlageDaten geprüft.`)
  }
}

// ─── (c) F11 WS-2 AK5: pruefeStartauftrag lehnt Startvorlage-Felder und freie Werkzeugliste ab ──
const gueltigerKoerperOhneStartvorlagenFelder = {
  laufId: 'check-f11-ak5',
  rolle: 'ausfuehrung',
  anfragen: [],
  budget: {},
  aufrufEingaben: { modell: 'test-modell' },
  werkzeugsatz: 'lesend',
  auftragId: 'check-f11-ak5-auftrag',
}

{
  const gruenFall = pruefeStartauftrag(gueltigerKoerperOhneStartvorlagenFelder)
  if (gruenFall.ok !== true) {
    befunde.push(`AK5-Grünfall: gültiger Body ohne Startvorlage-Felder sollte durchgehen, wurde abgelehnt: ${gruenFall.grund}`)
  }

  const rotFallProfilReferenz = pruefeStartauftrag({ ...gueltigerKoerperOhneStartvorlagenFelder, profilReferenz: { pfad: 'x', hash: 'x', version: 1 } })
  if (rotFallProfilReferenz.ok !== false) {
    befunde.push("AK5-Rotfall: Body mit 'profilReferenz' sollte abgelehnt werden, wurde durchgelassen")
  }

  const rotFallFreieListe = pruefeStartauftrag({
    ...gueltigerKoerperOhneStartvorlagenFelder,
    aufrufEingaben: { modell: 'test-modell', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Bash'] } },
  })
  if (rotFallFreieListe.ok !== false) {
    befunde.push("AK5-Rotfall: Body mit freier 'aufrufEingaben.werkzeugsatz'-Liste sollte abgelehnt werden, wurde durchgelassen")
  }

  if (gruenFall.ok === true && rotFallProfilReferenz.ok === false && rotFallFreieListe.ok === false) {
    console.log("✓ AK5: pruefeStartauftrag lässt den Grünfall durch und lehnt 'profilReferenz' sowie eine freie 'aufrufEingaben.werkzeugsatz'-Liste ab.")
  }
}

// ─── (d) F11 WS-2 AK6: loeseEvidenzPfadAuf lehnt absolute/'..'/repo-fremde Pfade ab, lässt reale repo-relative Pfade durch ──
{
  const repoWurzel = process.cwd()

  const gruenFall = loeseEvidenzPfadAuf('package.json', repoWurzel)
  if (gruenFall.ok !== true || gruenFall.relativerPfad !== 'package.json') {
    befunde.push(`AK6-Grünfall: 'package.json' sollte auflösbar sein, erhalten: ${JSON.stringify(gruenFall)}`)
  }

  const rotFaelle = ['../ausserhalb.txt', 'C:\\Windows\\win.ini', '/etc/passwd', 'a/../../ausserhalb.txt']
  const rotFallErgebnisse = rotFaelle.map((pfad) => loeseEvidenzPfadAuf(pfad, repoWurzel))
  const nichtAbgelehnt = rotFaelle.filter((_, i) => rotFallErgebnisse[i].ok !== false)
  if (nichtAbgelehnt.length > 0) {
    befunde.push(`AK6-Rotfall: folgende Pfade sollten abgelehnt werden, wurden aber durchgelassen: ${nichtAbgelehnt.join(', ')}`)
  }

  const rotFallInhalt = pruefeStartauftrag({
    ...gueltigerKoerperOhneStartvorlagenFelder,
    anfragen: [{ pfad: 'package.json', frage: 'x', begruendung: 'x', inhalt: 'verboten' }],
  })
  if (rotFallInhalt.ok !== false) {
    befunde.push("AK6-Rotfall: eine Anfrage mit 'inhalt' sollte von pruefeStartauftrag abgelehnt werden, wurde durchgelassen")
  }

  if (gruenFall.ok === true && nichtAbgelehnt.length === 0 && rotFallInhalt.ok === false) {
    console.log(`✓ AK6: loeseEvidenzPfadAuf löst 'package.json' korrekt auf und lehnt ${rotFaelle.length} unsichere Pfade ab; pruefeStartauftrag lehnt 'inhalt' im Body ab.`)
  }
}

// ─── (f) F12 WS-2 AK4: pruefeAuftragsformular lässt Grünfall durch, lehnt leere Felder und unbekanntes Feld ab ──
{
  const gruenFall = pruefeAuftragsformular({ titel: 'Titel', auftragstext: 'Text' })
  if (gruenFall.ok !== true || gruenFall.titel !== 'Titel' || gruenFall.auftragstext !== 'Text') {
    befunde.push(`AK4-Grünfall: gültiger Auftragsformular-Body sollte durchgehen, erhalten: ${JSON.stringify(gruenFall)}`)
  }

  const rotFallLeererTitel = pruefeAuftragsformular({ titel: '', auftragstext: 'Text' })
  const rotFallFehlenderText = pruefeAuftragsformular({ titel: 'Titel' })
  const rotFallUnbekannt = pruefeAuftragsformular({ titel: 'Titel', auftragstext: 'Text', auftragId: 'sollte verboten sein' })
  if (rotFallLeererTitel.ok !== false || rotFallFehlenderText.ok !== false || rotFallUnbekannt.ok !== false) {
    befunde.push('AK4-Rotfall: leerer Titel, fehlender auftragstext oder ein unbekanntes Feld sollten abgelehnt werden, mindestens einer wurde durchgelassen')
  }

  if (gruenFall.ok === true && rotFallLeererTitel.ok === false && rotFallFehlenderText.ok === false && rotFallUnbekannt.ok === false) {
    console.log('✓ AK4: pruefeAuftragsformular lässt den Grünfall durch und lehnt leeren Titel, fehlenden auftragstext und ein unbekanntes Feld ab.')
  }
}

// ─── (g) F12 WS-2 AK5: pruefeStartauftrag lehnt 'auftragstext' im Body ab (kommt seither serverseitig aus dem Auftragsartefakt) ──
{
  const rotFallAuftragstext = pruefeStartauftrag({ ...gueltigerKoerperOhneStartvorlagenFelder, auftragstext: 'sollte verboten sein' })
  if (rotFallAuftragstext.ok !== false) {
    befunde.push("F12 AK5-Rotfall: Body mit 'auftragstext' sollte abgelehnt werden (kommt serverseitig aus dem Auftragsartefakt), wurde durchgelassen")
  } else {
    console.log("✓ F12 AK5: pruefeStartauftrag lehnt 'auftragstext' im Body ab.")
  }
}

// ─── (e) F11 WS-2 AK7 (D13): Grep+Selbsttest — Sperre wird VOR laufIdBelegt geprüft und in .then UND .catch zurückgesetzt ──
{
  const LEITSTAND_SERVER_PFAD = join('scripts', 'leitstand-server.mjs')
  const quelltext = readFileSync(LEITSTAND_SERVER_PFAD, 'utf-8')

  /**
   * Prüft den D13-Vertrag an einem Quelltext: eine 'if (laufAktiv)'-Prüfung mit 409-Antwort muss
   * VOR dem ersten 'laufIdBelegt('-Aufruf stehen, und 'laufAktiv = false' muss sowohl im .then- als
   * auch im .catch-Zweig des fuehreAufgabeDurchFn-Aufrufs vorkommen.
   *
   * Bekannte Grenze (real beobachtet beim Kalibrieren dieses Gates, Muster wie AK3s Substring-
   * Vergleich oben): reiner Text-/Regex-Vergleich, keine AST-Prüfung. Ein Reset, der nur als
   * KOMMENTARTEXT im .catch-Block steht (z. B. "// laufAktiv = false wurde entfernt"), zählt für
   * /laufAktiv\s*=\s*false/ als vorhanden, obwohl der echte Reset fehlt — beim ersten Kalibrierlauf
   * dieses Gates real so aufgetreten (die Rotfall-Injektion musste umformuliert werden, damit sie
   * nicht selbst den Text "laufAktiv = false" enthält).
   * @param text - zu prüfender Quelltext
   * @returns true, wenn der D13-Vertrag im Text erkennbar eingehalten ist
   */
  function erfuelltD13Vertrag(text) {
    const sperrIndex = text.indexOf('if (laufAktiv)')
    // 'if (laufIdBelegt(' statt nur 'laufIdBelegt(' — sonst träfe indexOf zuerst die weiter oben
    // stehende FunktionsDEFINITION 'function laufIdBelegt(laufId) {' statt ihres Aufrufs.
    const belegtIndex = text.indexOf('if (laufIdBelegt(')
    if (sperrIndex === -1 || belegtIndex === -1 || sperrIndex >= belegtIndex) return false

    const aufrufIndex = text.indexOf('fuehreAufgabeDurchFn(')
    if (aufrufIndex === -1) return false
    const nachAufruf = text.slice(aufrufIndex)
    const thenIndex = nachAufruf.indexOf('.then(')
    const catchIndex = nachAufruf.indexOf('.catch(')
    if (thenIndex === -1 || catchIndex === -1 || catchIndex <= thenIndex) return false

    const thenBlock = nachAufruf.slice(thenIndex, catchIndex)
    const catchBlock = nachAufruf.slice(catchIndex)
    return /laufAktiv\s*=\s*false/.test(thenBlock) && /laufAktiv\s*=\s*false/.test(catchBlock)
  }

  if (!erfuelltD13Vertrag(quelltext)) {
    befunde.push(`AK7: ${LEITSTAND_SERVER_PFAD} erfüllt den D13-Vertrag nicht erkennbar (Sperre vor laufIdBelegt, Reset in .then UND .catch)`)
  } else {
    console.log(`✓ AK7: ${LEITSTAND_SERVER_PFAD} prüft die D13-Sperre vor laufIdBelegt und setzt sie in .then UND .catch zurück.`)
  }

  // Selbsttest (Muster AK3 oben): eine simulierte Verletzung (Reset fehlt im .catch-Zweig) muss real erkannt werden.
  const simulierteVerletzung = `
    if (laufAktiv) { sendeJson(res, 409, {}) ; return }
    if (laufIdBelegt(laufId)) { return }
    fuehreAufgabeDurchFn(laufId, profilReferenz, eingaben)
      .then((ergebnis) => { laufAktiv = false })
      .catch((fehler) => { /* Reset fehlt hier */ })
  `
  if (erfuelltD13Vertrag(simulierteVerletzung)) {
    befunde.push('AK7-Selbsttest: Muster erkennt eine simulierte Verletzung (fehlender Reset im .catch-Zweig) NICHT — Grep-Regel ist wirkungslos')
  } else {
    console.log('✓ AK7-Selbsttest: simulierte Verletzung (fehlender Reset im .catch-Zweig) wird erkannt.')
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
