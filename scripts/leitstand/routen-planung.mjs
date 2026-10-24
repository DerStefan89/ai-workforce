/**
 * Datei: scripts/leitstand/routen-planung.mjs
 *
 * Zweck: F45 B5b-1b-1 „Planung schreiben“ (R6, F-984; features/F45/plan-b5b1b-v2.md, Advisor features/F45/advisor-b5b1b.md) —
 * PUT …/features/<id>/planung { prioritaet?, meilenstein?, workstreams?, grund, hash, roadmap_hash? }: Priorität und Schätzungen
 * in die Akte (src/feature-auftrag/planung-schreiben.ts), ein Meilenstein-Wechsel verschiebt die ID in roadmap.json ans Ende des
 * Ziel-Meilensteins (src/workboard/roadmap-schreiben.ts). Zwischenmuster E-FB1-2/F-1131: erkennePlanungRoute erkennt nur den Pfad,
 * der Server prüft die Methode hinter dem zentralen CSRF-Haken und reicht die Rückrufe herein. Ausnahme „Akte und Roadmap im
 * Projektordner“: ARCHITECTURE.md §2, docs/architektur/arbeitsordner.md. Kein Commit, kein git-Prozess: die Antwort trägt einen
 * Git-Block mit allen geänderten Pfaden.
 *
 * Ablauf: 400 Kodierung/ID → 404 Akte → 400 Körper → 409 Sperre (findeSperrendenAblauf, wie B5a-1) → ab hier synchron bis nach dem
 * Schreiben: Akte lesen (Hash 409, UTF-8 422); mit meilenstein roadmap.json lesen (fehlt/UTF-8/CRLF/JSON/Schema 422, Hash 409 mit
 * roadmap_hash), verschieben, R1 (src/workboard/roadmap-regeln.ts) auf altem und neuem Stand mit frisch gelesenem Status aller
 * Roadmap-Akten — nur neue Befunde ⇒ 422 „erst bereinigen“; Akte bearbeiten (422, Akte-Gate blockiert jeden Befund); schreiben in
 * fester Reihenfolge Akte → roadmap.json, je Datei zurücklesen.
 *
 * Antwort 200: { status: 'ok', id, hash (neuer Akte-Hash), roadmap_hash? (nur mit meilenstein: Hash der Datei nach dem Schreiben bzw.
 * unverändert), geaendert (Felder), geschrieben (repo-relative Pfade in Schreibreihenfolge), git (Befehlsblock) }.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs, scripts/check-f45-b5b1b1-planung-schreiben.mjs.
 *
 * Wichtig (DEKLARIERT): Scheitert ein Schreiben oder Rücklesen, werden alle Dateien bis einschließlich der scheiternden auf die alten
 * Bytes zurückgesetzt (best effort — nichts ist committet); die 500-Antwort nennt je Pfad das Ergebnis und „git diff prüfen“. Ein
 * Prozessabbruch zwischen zwei Schreibvorgängen bleibt ohne Rückbau. Ein Ablauf, der zwischen Sperrprüfung und Lesen angelegt wird,
 * wird übersehen (wie B5a-1). Die Ausnahmen-Datei liegt neben roadmapPfad und wird nur gelesen; ein abweichender roadmapPfad im
 * Fremdprojekt verschiebt sie mit (Advisor C7); ist sie ungültig, gilt R1 nicht als prüfbar ⇒ 422 „von Hand“ (cr 3). Ausplanen ist
 * nicht unterstützt. Die Feature-ID muss genau dem Ordnernamen unter features/ entsprechen (qa 6: auf Windows fände existsSync
 * auch „F1b“ für „F1B“ und verschiebeFeature legte einen zweiten Roadmap-Eintrag an).
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { bearbeitePlanungInAkte, pruefePlanungAenderung } from '../../src/feature-auftrag/planung-schreiben.ts'
import { FEATURE_ID_MUSTER, validiereRoadmapDaten } from '../../src/projektkontext/index.ts'
import { leseFeatureStatus } from '../../src/workboard/feature-akte-pruefung.ts'
import { leseStatusAusnahmen, pruefeMeilensteinStatus } from '../../src/workboard/roadmap-regeln.ts'
import { verschiebeFeature } from '../../src/workboard/roadmap-schreiben.ts'
import { antwort, baueGitBlock, findeSperrendenAblauf, loeseFeatureAktePfadAuf, lokalesDatum, sha256 } from './routen-f35.mjs'

const PLANUNG_ROUTE = /^\/api\/features\/([^/]+)\/planung$/
const AUSNAHMEN_DATEI = 'roadmap-ausnahmen.json'

/**
 * Erkennt die Planungsroute (Zwischenmuster F-1131: nur der Pfad, die Methode prüft der Server).
 * @param pfad - Pfad ohne Projektpräfix
 * @returns { art: 'planung', rohId } | null
 */
export function erkennePlanungRoute(pfad) {
  const treffer = PLANUNG_ROUTE.exec(pfad)
  return treffer === null ? null : { art: 'planung', rohId: treffer[1] }
}

/** Text eines Wurfs, auch wenn kein Error geworfen wurde (cr 9). @param fehler - Wurf @returns Text */
const meldung = (fehler) => (fehler instanceof Error ? fehler.message : String(fehler))

/**
 * Liest eine Datei als Bytes.
 * @param pfad - absoluter Pfad
 * @param rel - repo-relativer Pfad für Meldungen
 * @returns { ok: true, roh } | { ok: false, antwort } (500)
 */
function leseBytes(pfad, rel) {
  try {
    return { ok: true, roh: readFileSync(pfad) }
  } catch (fehler) {
    console.error(`[planung] ${rel} nicht lesbar:`, fehler)
    return { ok: false, antwort: antwort(500, `${rel} nicht lesbar: ${meldung(fehler)}`) }
  }
}

/**
 * Die Bytes als Text, wenn sie gültiges UTF-8 sind (sonst bliebe der Rest nicht bytegleich).
 * @param roh - Bytes
 * @returns Text oder null
 */
function alsText(roh) {
  const text = roh.toString('utf8')
  return Buffer.from(text, 'utf8').equals(roh) ? text : null
}

/** 422 für eine Datei, die kein gültiges UTF-8 ist. @param rel - Pfad @returns Antwort */
const keinUtf8 = (rel) => antwort(422, `${rel} ist kein gültiges UTF-8 — der Rest bliebe nicht bytegleich, von Hand bearbeiten`)

/**
 * Status je Feature-ID der Roadmap, frisch aus den Akten (im synchronen Abschnitt, Advisor B10). Unlesbare Akte = kein Eintrag.
 * @param roadmap - geparste roadmap.json
 * @param repoWurzel - Projektwurzel
 * @returns Map ID → Status
 */
function leseAktenStatus(roadmap, repoWurzel) {
  const status = new Map()
  for (const id of roadmap.meilensteine.flatMap((m) => m.features)) {
    const pfad = loeseFeatureAktePfadAuf(id, repoWurzel)
    if (pfad === null || !existsSync(pfad)) continue
    try {
      const wert = leseFeatureStatus(readFileSync(pfad, 'utf8'))
      if (wert !== null) status.set(id, wert)
    } catch (fehler) {
      console.error(`[planung] features/${id}/feature.md nicht lesbar — Status fehlt für R1:`, fehler)
    }
  }
  return status
}

/**
 * Schreibt die Ziele in fester Reihenfolge und liest jedes zurück. Scheitert eines (Wurf oder Abweichung), werden alle bis
 * einschließlich des scheiternden mit den alten Bytes zurückgesetzt und zurückgelesen (Advisor B3).
 * @param ziele - [{ pfad, rel, alt, neu }]
 * @param schreibe - Schreibfunktion (writeFileSync; Tests ersetzen sie für den Rückbau-Fall)
 * @returns { ok: true } | { ok: false, rel, fehler, rueckbau: [{ pfad, zurueckgesetzt }] }
 */
function schreibeMitRueckbau(ziele, schreibe) {
  for (const [index, ziel] of ziele.entries()) {
    let fehler = null
    try {
      schreibe(ziel.pfad, ziel.neu)
      if (!readFileSync(ziel.pfad).equals(ziel.neu)) fehler = 'nach dem Schreiben nicht wie erwartet'
    } catch (wurf) {
      fehler = meldung(wurf)
    }
    if (fehler === null) continue
    console.error(`[planung] ${ziel.rel} nicht geschrieben (${fehler}) — Rückbau`)
    const rueckbau = ziele.slice(0, index + 1).map((z) => {
      try {
        writeFileSync(z.pfad, z.alt)
        return { pfad: z.rel, zurueckgesetzt: readFileSync(z.pfad).equals(z.alt) }
      } catch (rueckbauFehler) {
        console.error(`[planung] Rückbau von ${z.rel} gescheitert:`, rueckbauFehler)
        return { pfad: z.rel, zurueckgesetzt: false }
      }
    })
    return { ok: false, rel: ziel.rel, fehler, rueckbau }
  }
  return { ok: true }
}

/**
 * PUT …/features/<id>/planung. Wirft nicht.
 * @param featureId - dekodierte id
 * @param koerper - Ergebnis von leseJsonBegrenzt
 * @param kontext - { repoWurzel, roadmapPfad, workflows(), auftraege(), datum?, schreibe? }
 * @returns Promise<{ status, koerper }>
 */
async function bearbeitePlanung(featureId, koerper, kontext) {
  if (typeof featureId !== 'string' || !FEATURE_ID_MUSTER.test(featureId)) return antwort(400, `featureId muss dem Muster ^F[0-9]+[A-Za-z]?$ entsprechen (F-595), erhalten ${JSON.stringify(featureId)}`)
  const aktePfad = loeseFeatureAktePfadAuf(featureId, kontext.repoWurzel)
  const akteRel = `features/${featureId}/feature.md`
  if (aktePfad === null || !existsSync(aktePfad)) return antwort(404, `${akteRel} nicht gefunden`)
  let ordner
  try {
    ordner = readdirSync(join(kontext.repoWurzel, 'features'))
  } catch (fehler) {
    console.error('[planung] features/ nicht lesbar:', fehler)
    return antwort(500, `features/ nicht lesbar: ${meldung(fehler)}`)
  }
  if (!ordner.includes(featureId)) return antwort(404, `${akteRel} nicht gefunden (Groß-/Kleinschreibung der ID beachten)`)
  if (!koerper.ok) return antwort(koerper.status, koerper.grund)
  const pruefung = pruefePlanungAenderung(koerper.daten)
  if (!pruefung.ok) return antwort(400, pruefung.grund)
  const { aenderung } = pruefung

  let sperre
  try {
    sperre = findeSperrendenAblauf(featureId, await kontext.workflows(), await kontext.auftraege())
  } catch (fehler) {
    console.error(`[planung] Sperre für ${featureId} nicht prüfbar:`, fehler)
    return antwort(500, `Sperre nicht prüfbar: ${meldung(fehler)}`)
  }
  if (sperre !== null) return antwort(409, sperre.grund, { workflowId: sperre.workflowId })

  // Ab hier synchron bis nach dem Schreiben (kein await): zwei gleichzeitige PUTs lösen sich über die Hashes auf.
  // Akte: erst der Hash, dann UTF-8 (Reihenfolge wie PUT …/akte, cr 4).
  const akte = leseBytes(aktePfad, akteRel)
  if (!akte.ok) return akte.antwort
  const akteHash = sha256(akte.roh)
  if (akteHash !== pruefung.hash) return antwort(409, 'Die Akte wurde seit dem Lesen geändert — neu laden und erneut bearbeiten', { hash: akteHash })
  const akteText = alsText(akte.roh)
  if (akteText === null) return keinUtf8(akteRel)

  const ziele = []
  let wechsel = null
  let roadmapHash
  if (aenderung.meilenstein !== null) {
    const roadmapPfad = join(kontext.repoWurzel, kontext.roadmapPfad)
    const roadmapRel = kontext.roadmapPfad.replace(/\\/g, '/')
    if (!existsSync(roadmapPfad)) return antwort(422, `${roadmapRel} fehlt — kein Meilenstein-Wechsel möglich`)
    const roadmap = leseBytes(roadmapPfad, roadmapRel)
    if (!roadmap.ok) return roadmap.antwort
    const roadmapText = alsText(roadmap.roh)
    if (roadmapText === null) return keinUtf8(roadmapRel)
    // A3: der Kern schreibt LF (ARCHITECTURE.md §7) — eine CRLF-Roadmap bliebe sonst nicht bytegleich.
    if (roadmapText.includes('\r')) return antwort(422, `${roadmapRel} enthält CRLF-Zeilenenden — von Hand bearbeiten (der Leitstand schreibt die Roadmap nur mit LF)`)
    roadmapHash = sha256(roadmap.roh)
    if (roadmapHash !== pruefung.roadmapHash) return antwort(409, 'roadmap.json wurde seit dem Lesen geändert — neu laden und erneut bearbeiten', { roadmap_hash: roadmapHash })
    let alt
    try {
      alt = JSON.parse(roadmapText)
    } catch (fehler) {
      return antwort(422, `${roadmapRel} ist kein gültiges JSON (${meldung(fehler)}) — von Hand beheben`)
    }
    const schema = validiereRoadmapDaten(alt)
    if (schema.length > 0) return antwort(422, `${roadmapRel} verletzt das Schema — von Hand beheben`, { verstoesse: schema })
    const verschiebung = verschiebeFeature(roadmapText, featureId, aenderung.meilenstein)
    if (!verschiebung.ok) return antwort(422, verschiebung.grund)
    if (verschiebung.geaendert) {
      const neu = JSON.parse(verschiebung.text)
      const ausnahmenPfad = join(kontext.repoWurzel, dirname(kontext.roadmapPfad), AUSNAHMEN_DATEI)
      let ausnahmenText = null
      try {
        ausnahmenText = existsSync(ausnahmenPfad) ? readFileSync(ausnahmenPfad, 'utf8') : null
      } catch (fehler) {
        console.error(`[planung] ${AUSNAHMEN_DATEI} nicht lesbar:`, fehler)
        return antwort(500, `${AUSNAHMEN_DATEI} nicht lesbar: ${meldung(fehler)}`)
      }
      const { ausnahmen, befunde: ausnahmenBefunde } = leseStatusAusnahmen(ausnahmenText)
      // cr 3: eine ungültige Ausnahmen-Datei läse sich wie „keine Ausnahmen“ — R1 wäre dann nicht verlässlich prüfbar.
      if (ausnahmenBefunde.length > 0) return antwort(422, `${AUSNAHMEN_DATEI} ist ungültig — von Hand beheben, dann verschieben`, { verstoesse: ausnahmenBefunde })
      // Status über die IDs des NEUEN Stands (cr 1): er enthält alle alten plus die eingeplante.
      const aktenStatus = leseAktenStatus(neu, kontext.repoWurzel)
      const vorher = pruefeMeilensteinStatus(alt, aktenStatus, ausnahmen).befunde
      // Nur neue Befunde blockieren (Advisor B1): Altbefunde können außerhalb dieser Akte liegen.
      const neueBefunde = pruefeMeilensteinStatus(neu, aktenStatus, ausnahmen).befunde.filter((befund) => !vorher.includes(befund))
      if (neueBefunde.length > 0) return antwort(422, `Der Meilenstein-Wechsel verletzte die Status-Regel R1 — erst bereinigen: die Ausnahme in ${AUSNAHMEN_DATEI} von Hand entfernen bzw. den Status klären, dann verschieben`, { verstoesse: neueBefunde })
      wechsel = { von: verschiebung.von, nach: aenderung.meilenstein }
      const neuBytes = Buffer.from(verschiebung.text, 'utf8')
      ziele.push({ pfad: roadmapPfad, rel: roadmapRel, alt: roadmap.roh, neu: neuBytes })
      roadmapHash = sha256(neuBytes)
    }
  }

  const ergebnis = bearbeitePlanungInAkte(akteText, aenderung, wechsel, kontext.datum ?? lokalesDatum())
  if (!ergebnis.ok) return antwort(422, ergebnis.grund, ergebnis.verstoesse === undefined ? {} : { verstoesse: ergebnis.verstoesse })
  const akteNeu = Buffer.from(ergebnis.inhalt, 'utf8')
  ziele.unshift({ pfad: aktePfad, rel: akteRel, alt: akte.roh, neu: akteNeu })

  const geschrieben = schreibeMitRueckbau(ziele, kontext.schreibe ?? writeFileSync)
  if (!geschrieben.ok) {
    const stand = geschrieben.rueckbau.map((r) => `${r.pfad} ${r.zurueckgesetzt ? 'zurückgesetzt' : 'NICHT zurückgesetzt'}`).join(', ')
    return antwort(500, `${geschrieben.rel} nicht geschrieben (${geschrieben.fehler}) — Rückbau: ${stand}; git diff prüfen`, { rueckbau: geschrieben.rueckbau })
  }
  const pfade = ziele.map((z) => z.rel)
  const nachricht = `${featureId}: Planung (${ergebnis.geaendert.join(', ')}) — ${aenderung.grund}`
  return {
    status: 200,
    koerper: { status: 'ok', id: featureId, hash: sha256(akteNeu), ...(roadmapHash === undefined ? {} : { roadmap_hash: roadmapHash }), geaendert: ergebnis.geaendert, geschrieben: pfade, git: baueGitBlock(kontext.repoWurzel, pfade, nachricht) },
  }
}

/**
 * Führt die Planungsroute aus (Zwischenmuster F-1131). Die Methode hat der Server geprüft.
 * @param route - erkennePlanungRoute(pfad)
 * @param koerper - leseJsonBegrenzt-Ergebnis
 * @param kontext - { repoWurzel, roadmapPfad, workflows(), auftraege(), datum? (nur Tests), schreibe? (nur Tests) }
 * @returns Promise<{ status, koerper }>
 */
export async function fuehrePlanungRouteDurch(route, koerper, kontext) {
  let featureId
  try {
    featureId = decodeURIComponent(route.rohId)
  } catch {
    return antwort(400, 'featureId ist keine gültige URL-Kodierung')
  }
  return bearbeitePlanung(featureId, koerper, kontext)
}
