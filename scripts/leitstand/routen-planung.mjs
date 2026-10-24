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
 * Seit F45 B5b-1b-2 „Bereinigungsliste“ (F-1010; features/F45/plan-b5b1b2-v2.md, Advisor features/F45/advisor-b5b1b2.md) zusätzlich:
 * - GET /api/roadmap/bereinigung (liest nur): 200 { status: 'ok', befunde, eintraege: [{ eintrag: 'M3/F18', meilenstein, feature,
 *   featureStatus, ausnahme, vorschlaege: [{ entscheidung, text, nebenwirkung }], quelle: { roadmap, akte, ausnahme, status_md },
 *   hashes: { roadmap, ausnahmen, akte, status_md } }] } (immer vier Hash-Schlüssel, null = Datei fehlt); fehlende bzw. ungültige
 *   Roadmap oder Ausnahmen-Datei ⇒ 200 { status: 'nicht_vorhanden' | 'ungueltig', fehler? }.
 * - POST /api/roadmap/bereinigung/bestaetigen { eintrag, entscheidung, grund, hashes }: genau ein Eintrag (Liste/zweites Feld ⇒ 400),
 *   400 Körper/Grund → 409 Sperre (Feature des Eintrags, beide Entscheidungen) → synchron: Stand lesen, Hash je Datei 409
 *   { hashes, abweichend }, Eintrag/Entscheidung aktuell (422), „Feature → ABGESCHLOSSEN“: Akte (src/feature-auftrag/
 *   akte-abschliessen.ts), STATUS.md (src/workboard/status-md.ts; übersprungen mit hinweis, wenn sie fehlt oder keine Standardform
 *   trägt), „Meilenstein → LAEUFT“: Status in roadmap.json; je Ausnahme entfernt (src/workboard/roadmap-schreiben.ts); CRLF in jedem
 *   Schreibziel außer der Akte ⇒ 422; R1 neu (neueR1Befunde) ⇒ 422; Schreiben Akte → STATUS.md → roadmap.json → Ausnahmen mit
 *   Rücklesen und Rückbau. 200 { status: 'ok', eintrag, entscheidung, geschrieben, hashes (Stand danach — die übrigen Einträge
 *   teilen roadmap/Ausnahmen/STATUS.md, vor der nächsten Bestätigung neu laden), hinweis?, git }; die Commit-Nachricht trägt den Grund
 *   (O5: „Meilenstein → LAEUFT“ schreibt keine Änderungszeile).
 * - erkennePlanungRoute liefert neben `art` das Feld `verb` (die eine erlaubte HTTP-Methode); der Server vergleicht es, das Modul
 *   verzweigt nur über `art` (Advisor B2, Gate b5b1b1 (m)).
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs, scripts/check-f45-b5b1b1-planung-schreiben.mjs,
 * scripts/check-f45-b5b1b2-bereinigung.mjs.
 *
 * Wichtig (DEKLARIERT): Scheitert ein Schreiben oder Rücklesen, werden alle Dateien bis einschließlich der scheiternden auf die alten
 * Bytes zurückgesetzt (best effort — nichts ist committet); die 500-Antwort nennt je Pfad das Ergebnis und „git diff prüfen“. Ein
 * Prozessabbruch zwischen zwei Schreibvorgängen bleibt ohne Rückbau. Ein Ablauf, der zwischen Sperrprüfung und Lesen angelegt wird,
 * wird übersehen (wie B5a-1). Die Ausnahmen-Datei liegt neben roadmapPfad (PUT liest sie nur, die Bereinigung entfernt je
 * Bestätigung eine Zeile); ein abweichender roadmapPfad im Fremdprojekt verschiebt sie mit (Advisor C7); ist sie ungültig, gilt R1
 * nicht als prüfbar ⇒ 422 „von Hand“ (cr 3). Ausplanen ist nicht unterstützt. Die Feature-ID muss genau dem Ordnernamen unter features/ entsprechen (qa 6: auf Windows fände existsSync
 * auch „F1b“ für „F1B“ und verschiebeFeature legte einen zweiten Roadmap-Eintrag an). Bereinigung (DEKLARIERT, Advisor B5b-1b-2):
 * ein Abbruch zwischen zwei Schreibvorgängen hinterlässt einen R1-roten, sichtbaren Teilstand (B4); die Sperre gilt auch für
 * „Meilenstein → LAEUFT“ (Punkt 1); eine verwaiste Ausnahme im Meilenstein blockiert LAEUFT (B3); `Abgenommen:` trägt den Tag der
 * Bestätigung (C4); Überschriften und Freitext in STATUS.md bleiben Handarbeit (C3); Meilenstein-IDs mit `/` sind nicht
 * adressierbar (C8).
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setzeAkteAbgeschlossen } from '../../src/feature-auftrag/akte-abschliessen.ts'
import { pruefeGrund, SHA256_MUSTER } from '../../src/feature-auftrag/akte-schreiben.ts'
import { bearbeitePlanungInAkte, pruefePlanungAenderung } from '../../src/feature-auftrag/planung-schreiben.ts'
import { FEATURE_ID_MUSTER, validiereRoadmapDaten } from '../../src/projektkontext/index.ts'
import { leseFeatureStatus } from '../../src/workboard/feature-akte-pruefung.ts'
import { bereinigungsEintraege, leseStatusAusnahmen, neueR1Befunde, pruefeEintrag, pruefeMeilensteinStatus } from '../../src/workboard/roadmap-regeln.ts'
import { entferneStatusAusnahme, setzeMeilensteinStatus, verschiebeFeature } from '../../src/workboard/roadmap-schreiben.ts'
import { sammleStatusMdAngaben, setzeStatusMdStatus } from '../../src/workboard/status-md.ts'
import { antwort, baueGitBlock, findeSperrendenAblauf, loeseFeatureAktePfadAuf, lokalesDatum, sha256 } from './routen-f35.mjs'

const PLANUNG_ROUTE = /^\/api\/features\/([^/]+)\/planung$/
const BEREINIGUNG_ROUTE = '/api/roadmap/bereinigung'
const AUSNAHMEN_DATEI = 'roadmap-ausnahmen.json'
const STATUS_MD = 'docs/STATUS.md'
/** Die vier Hash-Schlüssel jedes Bereinigungs-Eintrags — immer alle, string|null (Advisor B5b-1b Punkt 8). */
const HASH_SCHLUESSEL = ['roadmap', 'ausnahmen', 'akte', 'status_md']
const ENTSCHEIDUNGEN = ['feature_abgeschlossen', 'meilenstein_laeuft']

/**
 * Erkennt die Planungs- und Bereinigungsrouten (Zwischenmuster F-1131: nur der Pfad). `verb` nennt die eine erlaubte HTTP-Methode;
 * der Server vergleicht sie hinter dem zentralen CSRF-Haken (405 sonst) — das Modul verzweigt nur über `art`.
 * @param pfad - Pfad ohne Projektpräfix
 * @returns { art: 'planung', verb: 'PUT', rohId } | { art: 'bereinigung', verb: 'GET' } | { art: 'bestaetigen', verb: 'POST' } | null
 */
export function erkennePlanungRoute(pfad) {
  if (pfad === BEREINIGUNG_ROUTE) return { art: 'bereinigung', verb: 'GET' }
  if (pfad === `${BEREINIGUNG_ROUTE}/bestaetigen`) return { art: 'bestaetigen', verb: 'POST' }
  const treffer = PLANUNG_ROUTE.exec(pfad)
  return treffer === null ? null : { art: 'planung', verb: 'PUT', rohId: treffer[1] }
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
      // Nur neue Befunde blockieren (Advisor B1): Altbefunde können außerhalb dieser Akte liegen — eine Regel mit der Bereinigung.
      const neueBefunde = neueR1Befunde({ roadmap: alt, aktenStatus, ausnahmen }, { roadmap: neu, aktenStatus, ausnahmen })
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
 * Liest eine Datei, die fehlen darf.
 * @param pfad - absoluter Pfad
 * @param rel - repo-relativer Pfad
 * @returns { ok: true, roh: Buffer | null } | { ok: false, antwort } (500)
 */
function leseOptional(pfad, rel) {
  return existsSync(pfad) ? leseBytes(pfad, rel) : { ok: true, roh: null }
}

/** sha256 der Bytes oder null. @param roh - Buffer oder null @returns Hash oder null */
const hashOderNull = (roh) => (roh === null ? null : sha256(roh))

/**
 * Liest im synchronen Abschnitt alles, was die Bereinigung braucht (Advisor B5b-1b B10): roadmap.json, die Ausnahmen-Datei neben
 * roadmapPfad (C7), docs/STATUS.md und den Status aller Roadmap-Akten frisch. UTF-8 wird für die geparsten JSON-Dateien geprüft;
 * STATUS.md erst, wenn sie Schreibziel ist (Advisor C1).
 * @param kontext - { repoWurzel, roadmapPfad }
 * @returns { art: 'ok', roadmap, ausnahmen, statusMd, daten, ausnahmenListe, aktenStatus, abweichungen, befunde }
 *   | { art: 'nicht_vorhanden' } | { art: 'ungueltig', fehler } | { art: 'fehler', antwort } (500)
 */
function leseBereinigungsStand(kontext) {
  const roadmapRel = kontext.roadmapPfad.replace(/\\/g, '/')
  const ausnahmenRel = dirname(roadmapRel) === '.' ? AUSNAHMEN_DATEI : `${dirname(roadmapRel)}/${AUSNAHMEN_DATEI}`
  const datei = (rel) => ({ pfad: join(kontext.repoWurzel, rel), rel })
  const roadmap = datei(roadmapRel)
  if (!existsSync(roadmap.pfad)) return { art: 'nicht_vorhanden' }
  const gelesen = [leseBytes(roadmap.pfad, roadmapRel), leseOptional(join(kontext.repoWurzel, ausnahmenRel), ausnahmenRel), leseOptional(join(kontext.repoWurzel, STATUS_MD), STATUS_MD)]
  const fehler = gelesen.find((g) => !g.ok)
  if (fehler !== undefined) return { art: 'fehler', antwort: fehler.antwort }
  const [roadmapRoh, ausnahmenRoh, statusMdRoh] = gelesen.map((g) => g.roh)
  const roadmapText = alsText(roadmapRoh)
  if (roadmapText === null) return { art: 'ungueltig', fehler: [`${roadmapRel} ist kein gültiges UTF-8`] }
  let daten
  try {
    daten = JSON.parse(roadmapText)
  } catch (wurf) {
    return { art: 'ungueltig', fehler: [`${roadmapRel}: JSON-Parsefehler: ${meldung(wurf)}`] }
  }
  const schema = validiereRoadmapDaten(daten)
  if (schema.length > 0) return { art: 'ungueltig', fehler: schema }
  const ausnahmenText = ausnahmenRoh === null ? null : alsText(ausnahmenRoh)
  if (ausnahmenRoh !== null && ausnahmenText === null) return { art: 'ungueltig', fehler: [`${ausnahmenRel} ist kein gültiges UTF-8`] }
  // Advisor B5b-1b B3: eine ungültige Ausnahmen-Datei läse sich wie „keine Ausnahmen“ — R1 wäre nicht verlässlich.
  const { ausnahmen: ausnahmenListe, befunde: ausnahmenBefunde } = leseStatusAusnahmen(ausnahmenText)
  if (ausnahmenBefunde.length > 0) return { art: 'ungueltig', fehler: ausnahmenBefunde }
  const aktenStatus = leseAktenStatus(daten, kontext.repoWurzel)
  const { abweichungen, befunde } = pruefeMeilensteinStatus(daten, aktenStatus, ausnahmenListe)
  return {
    art: 'ok',
    roadmap: { ...roadmap, roh: roadmapRoh, text: roadmapText },
    ausnahmen: { ...datei(ausnahmenRel), roh: ausnahmenRoh, text: ausnahmenText },
    statusMd: { ...datei(STATUS_MD), roh: statusMdRoh },
    daten,
    ausnahmenListe,
    aktenStatus,
    abweichungen,
    befunde,
  }
}

/**
 * Liest die Akte eines Eintrags (fehlt erlaubt). Die ID muss genau dem Ordnernamen entsprechen (qa 6 B5b-1b-1).
 * @param featureId - geprüfte Feature-ID
 * @param repoWurzel - Projektwurzel
 * @returns { ok: true, pfad, rel, roh: Buffer | null } | { ok: false, antwort } (500)
 */
function leseEintragsAkte(featureId, repoWurzel) {
  const rel = `features/${featureId}/feature.md`
  const pfad = loeseFeatureAktePfadAuf(featureId, repoWurzel)
  if (pfad === null || !existsSync(pfad)) return { ok: true, pfad, rel, roh: null }
  try {
    if (!readdirSync(join(repoWurzel, 'features')).includes(featureId)) return { ok: true, pfad, rel, roh: null }
  } catch (fehler) {
    console.error('[bereinigung] features/ nicht lesbar:', fehler)
    return { ok: false, antwort: antwort(500, `features/ nicht lesbar: ${meldung(fehler)}`) }
  }
  const akte = leseBytes(pfad, rel)
  return akte.ok ? { ok: true, pfad, rel, roh: akte.roh } : akte
}

/**
 * Die vier Hashes eines Eintrags (immer alle Schlüssel, null = Datei fehlt).
 * @param stand - leseBereinigungsStand (art 'ok')
 * @param akteRoh - Bytes der Akte oder null
 * @returns { roadmap, ausnahmen, akte, status_md }
 */
const eintragsHashes = (stand, akteRoh) => ({ roadmap: sha256(stand.roadmap.roh), ausnahmen: hashOderNull(stand.ausnahmen.roh), akte: hashOderNull(akteRoh), status_md: hashOderNull(stand.statusMd.roh) })

/**
 * GET /api/roadmap/bereinigung — liest nur. Fehlende oder ungültige Roadmap bzw. Ausnahmen-Datei sind Fachergebnisse (200, Muster
 * Projektion), kein 500.
 * @param kontext - { repoWurzel, roadmapPfad }
 * @returns { status, koerper }
 */
function listeBereinigung(kontext) {
  const stand = leseBereinigungsStand(kontext)
  if (stand.art === 'fehler') return stand.antwort
  if (stand.art === 'nicht_vorhanden') return { status: 200, koerper: { status: 'nicht_vorhanden' } }
  if (stand.art === 'ungueltig') return { status: 200, koerper: { status: 'ungueltig', fehler: stand.fehler } }
  const statusMdText = stand.statusMd.roh === null ? null : alsText(stand.statusMd.roh)
  const angaben = statusMdText === null ? [] : sammleStatusMdAngaben(statusMdText)
  const eintraege = []
  for (const eintrag of bereinigungsEintraege(stand.abweichungen)) {
    const akte = leseEintragsAkte(eintrag.feature, kontext.repoWurzel)
    if (!akte.ok) return akte.antwort
    const statusZeilen = angaben.filter((a) => a.id === eintrag.feature)
    const quelle = {
      roadmap: stand.roadmap.rel,
      akte: akte.roh === null ? null : akte.rel,
      ausnahme: eintrag.ausnahme === null ? null : stand.ausnahmen.rel,
      status_md: statusZeilen.length === 1 ? `${STATUS_MD}:${statusZeilen[0].zeile}` : null,
    }
    eintraege.push({ ...eintrag, quelle, hashes: eintragsHashes(stand, akte.roh) })
  }
  return { status: 200, koerper: { status: 'ok', befunde: stand.befunde, eintraege } }
}

/**
 * Prüft den Körper von POST …/bereinigung/bestaetigen: genau { eintrag, entscheidung, grund, hashes } — genau ein Eintrag als
 * String `<M>/<F>` (keine Liste, kein zweites Feld), Entscheidung bekannt, Pflichtgrund, immer alle vier Hash-Schlüssel.
 * @param daten - geparster Körper
 * @returns { ok: true, meilenstein, feature, entscheidung, grund, hashes } | { ok: false, grund } (HTTP 400)
 */
function pruefeBestaetigung(daten) {
  if (daten === null || typeof daten !== 'object' || Array.isArray(daten)) return { ok: false, grund: 'Körper muss ein Objekt { eintrag, entscheidung, grund, hashes } sein' }
  const fremd = Object.keys(daten).filter((k) => !['eintrag', 'entscheidung', 'grund', 'hashes'].includes(k))
  if (fremd.length > 0) return { ok: false, grund: `unbekannte Felder ${fremd.join(', ')} — genau ein Eintrag je Bestätigung, keine Sammel-Bestätigung` }
  const eintrag = pruefeEintrag(daten.eintrag, FEATURE_ID_MUSTER)
  if (eintrag === null) return { ok: false, grund: `'eintrag' muss genau ein Eintrag '<Meilenstein>/<Feature-ID>' sein (keine Liste, keine Sammel-Bestätigung), erhalten ${JSON.stringify(daten.eintrag)}` }
  if (!ENTSCHEIDUNGEN.includes(daten.entscheidung)) return { ok: false, grund: `'entscheidung' muss ${ENTSCHEIDUNGEN.join(' oder ')} sein` }
  const grund = pruefeGrund(daten.grund)
  if (!grund.ok) return grund
  const hashes = daten.hashes
  const hashesOk =
    hashes !== null &&
    typeof hashes === 'object' &&
    !Array.isArray(hashes) &&
    Object.keys(hashes).length === HASH_SCHLUESSEL.length &&
    HASH_SCHLUESSEL.every((k) => k in hashes && (hashes[k] === null || (typeof hashes[k] === 'string' && SHA256_MUSTER.test(hashes[k]))))
  if (!hashesOk) return { ok: false, grund: `'hashes' muss genau { ${HASH_SCHLUESSEL.join(', ')} } tragen, je sha256 oder null (aus GET ${BEREINIGUNG_ROUTE})` }
  return { ok: true, ...eintrag, entscheidung: daten.entscheidung, grund: grund.wert, hashes }
}

/** 422 für CRLF in einem Schreibziel (A3, A1 = b: §7 bleibt, der Kern schreibt LF). @param rel - Pfad @returns Antwort */
const crlf = (rel) => antwort(422, `${rel} enthält CRLF-Zeilenenden — von Hand bearbeiten (der Leitstand schreibt dort nur LF)`)

/**
 * POST /api/roadmap/bereinigung/bestaetigen — schreibt genau die eine bestätigte Änderung (B6 bzw. O5). Wirft nicht.
 * @param koerper - leseJsonBegrenzt-Ergebnis
 * @param kontext - { repoWurzel, roadmapPfad, workflows(), auftraege(), datum?, schreibe? }
 * @returns Promise<{ status, koerper }>
 */
async function bestaetigeBereinigung(koerper, kontext) {
  if (!koerper.ok) return antwort(koerper.status, koerper.grund)
  const b = pruefeBestaetigung(koerper.daten)
  if (!b.ok) return antwort(400, b.grund)
  const eintragsId = `${b.meilenstein}/${b.feature}`

  // Sperre für das Feature des Eintrags bei beiden Entscheidungen (eine Regel, fail-closed; DEKLARIERT, Advisor Punkt 1).
  let sperre
  try {
    sperre = findeSperrendenAblauf(b.feature, await kontext.workflows(), await kontext.auftraege())
  } catch (fehler) {
    console.error(`[bereinigung] Sperre für ${b.feature} nicht prüfbar:`, fehler)
    return antwort(500, `Sperre nicht prüfbar: ${meldung(fehler)}`)
  }
  if (sperre !== null) return antwort(409, sperre.grund, { workflowId: sperre.workflowId })

  // Ab hier synchron bis nach dem Schreiben (kein await): Hashes, R1 und Schreiben sehen denselben Stand.
  const stand = leseBereinigungsStand(kontext)
  if (stand.art === 'fehler') return stand.antwort
  if (stand.art === 'nicht_vorhanden') return antwort(422, `${kontext.roadmapPfad.replace(/\\/g, '/')} fehlt — keine Bereinigung möglich`)
  if (stand.art === 'ungueltig') return antwort(422, 'roadmap.json bzw. roadmap-ausnahmen.json ist ungültig — von Hand beheben', { verstoesse: stand.fehler })
  const akte = leseEintragsAkte(b.feature, kontext.repoWurzel)
  if (!akte.ok) return akte.antwort
  const aktuell = eintragsHashes(stand, akte.roh)
  const abweichend = HASH_SCHLUESSEL.filter((k) => aktuell[k] !== b.hashes[k])
  if (abweichend.length > 0) return antwort(409, `Seit dem Lesen geändert: ${abweichend.join(', ')} — Bereinigungsliste neu laden und erneut bestätigen`, { hashes: aktuell, abweichend })

  const eintrag = bereinigungsEintraege(stand.abweichungen).find((e) => e.meilenstein === b.meilenstein && e.feature === b.feature)
  if (eintrag === undefined) return antwort(422, `${eintragsId} ist keine aktuelle R1-Abweichung — Bereinigungsliste neu laden`)
  if (!eintrag.vorschlaege.some((v) => v.entscheidung === b.entscheidung)) {
    const anzahl = stand.abweichungen.filter((a) => a.meilenstein === b.meilenstein).length
    const warum =
      b.entscheidung === 'meilenstein_laeuft'
        ? `„${b.meilenstein} → LAEUFT“ gibt es nur, wenn ${b.meilenstein} genau eine R1-Abweichung hat (heute ${anzahl}) — erst die übrigen Einträge von ${b.meilenstein} einzeln bestätigen oder von Hand (B4)`
        : `„${b.feature} → ABGESCHLOSSEN“ gibt es nur für eine Akte mit Status ≠ ABGEBROCHEN (heute ${eintrag.featureStatus ?? 'keine Akte bzw. kein Status'}) — von Hand`
    return antwort(422, warum, { vorschlaege: eintrag.vorschlaege.map((v) => v.entscheidung) })
  }

  const datum = kontext.datum ?? lokalesDatum()
  const ziele = []
  const neu = { roadmap: stand.daten, aktenStatus: new Map(stand.aktenStatus), ausnahmen: stand.ausnahmenListe }
  let hinweis
  if (b.entscheidung === 'feature_abgeschlossen') {
    if (akte.roh === null) return antwort(422, `${akte.rel} nicht gefunden (Groß-/Kleinschreibung der ID beachten) — von Hand`)
    const akteText = alsText(akte.roh)
    if (akteText === null) return keinUtf8(akte.rel)
    const akteNeu = setzeAkteAbgeschlossen(akteText, { datum, grund: b.grund, meilenstein: b.meilenstein })
    if (!akteNeu.ok) return antwort(422, akteNeu.grund, akteNeu.verstoesse === undefined ? {} : { verstoesse: akteNeu.verstoesse })
    ziele.push({ pfad: akte.pfad, rel: akte.rel, alt: akte.roh, neu: Buffer.from(akteNeu.inhalt, 'utf8') })
    const statusMdText = stand.statusMd.roh === null ? null : alsText(stand.statusMd.roh)
    if (stand.statusMd.roh !== null && statusMdText === null) return keinUtf8(STATUS_MD)
    const statusMd = setzeStatusMdStatus(statusMdText, b.feature, 'ABGESCHLOSSEN')
    if (!statusMd.ok) return antwort(422, statusMd.grund)
    if (statusMd.geaendert) ziele.push({ pfad: stand.statusMd.pfad, rel: STATUS_MD, alt: stand.statusMd.roh, neu: Buffer.from(statusMd.text, 'utf8') })
    else hinweis = statusMd.hinweis
    neu.aktenStatus.set(b.feature, 'ABGESCHLOSSEN')
  } else {
    if (stand.roadmap.text.includes('\r')) return crlf(stand.roadmap.rel)
    const roadmapNeu = setzeMeilensteinStatus(stand.roadmap.text, b.meilenstein, 'LAEUFT')
    if (!roadmapNeu.ok) return antwort(422, roadmapNeu.grund)
    ziele.push({ pfad: stand.roadmap.pfad, rel: stand.roadmap.rel, alt: stand.roadmap.roh, neu: Buffer.from(roadmapNeu.text, 'utf8') })
    neu.roadmap = JSON.parse(roadmapNeu.text)
  }
  if (eintrag.ausnahme !== null) {
    if (stand.ausnahmen.text.includes('\r')) return crlf(stand.ausnahmen.rel)
    const ausnahmenNeu = entferneStatusAusnahme(stand.ausnahmen.text, b.meilenstein, b.feature)
    if (!ausnahmenNeu.ok) return antwort(422, ausnahmenNeu.grund)
    ziele.push({ pfad: stand.ausnahmen.pfad, rel: stand.ausnahmen.rel, alt: stand.ausnahmen.roh, neu: Buffer.from(ausnahmenNeu.text, 'utf8') })
    neu.ausnahmen = leseStatusAusnahmen(ausnahmenNeu.text).ausnahmen
  }

  // Gate vor dem Schreiben (Advisor B3): nur neue R1-Befunde blockieren; der Eintrag ist danach keine Abweichung mehr. Eine
  // verwaiste Ausnahme im Meilenstein ändert bei LAEUFT ihren Befundtext und blockiert damit (fail-closed, DEKLARIERT).
  const neueBefunde = neueR1Befunde({ roadmap: stand.daten, aktenStatus: stand.aktenStatus, ausnahmen: stand.ausnahmenListe }, neu)
  const bleibt = pruefeMeilensteinStatus(neu.roadmap, neu.aktenStatus, neu.ausnahmen).abweichungen.some((a) => a.meilenstein === b.meilenstein && a.feature === b.feature)
  if (neueBefunde.length > 0 || bleibt) return antwort(422, `Die Bestätigung von ${eintragsId} verletzte die Status-Regel R1 — nichts geschrieben, erst von Hand bereinigen`, { verstoesse: bleibt ? [...neueBefunde, `${eintragsId} bliebe eine Abweichung`] : neueBefunde })

  // Feste Reihenfolge Akte → STATUS.md → roadmap.json → Ausnahmen; ein Abbruch dazwischen hinterlässt einen R1-roten, sichtbaren
  // Teilstand (DEKLARIERT, Advisor B4).
  const geschrieben = schreibeMitRueckbau(ziele, kontext.schreibe ?? writeFileSync)
  if (!geschrieben.ok) {
    const stand500 = geschrieben.rueckbau.map((r) => `${r.pfad} ${r.zurueckgesetzt ? 'zurückgesetzt' : 'NICHT zurückgesetzt'}`).join(', ')
    return antwort(500, `${geschrieben.rel} nicht geschrieben (${geschrieben.fehler}) — Rückbau: ${stand500}; git diff prüfen`, { rueckbau: geschrieben.rueckbau })
  }
  const nachher = { ...aktuell }
  const schluessel = { [akte.rel]: 'akte', [STATUS_MD]: 'status_md', [stand.roadmap.rel]: 'roadmap', [stand.ausnahmen.rel]: 'ausnahmen' }
  for (const ziel of ziele) nachher[schluessel[ziel.rel]] = sha256(ziel.neu)
  const pfade = ziele.map((z) => z.rel)
  const was = b.entscheidung === 'feature_abgeschlossen' ? `${b.feature} → ABGESCHLOSSEN` : `${b.meilenstein} → LAEUFT`
  return {
    status: 200,
    koerper: { status: 'ok', eintrag: eintragsId, entscheidung: b.entscheidung, geschrieben: pfade, hashes: nachher, ...(hinweis === undefined ? {} : { hinweis }), git: baueGitBlock(kontext.repoWurzel, pfade, `${eintragsId}: Bereinigung ${was} — ${b.grund}`) },
  }
}

/**
 * Führt die Planungs- und Bereinigungsrouten aus (Zwischenmuster F-1131). Die Methode hat der Server geprüft.
 * @param route - erkennePlanungRoute(pfad)
 * @param koerper - leseJsonBegrenzt-Ergebnis (null bei GET)
 * @param kontext - { repoWurzel, roadmapPfad, workflows(), auftraege(), datum? (nur Tests), schreibe? (nur Tests) }
 * @returns Promise<{ status, koerper }>
 */
export async function fuehrePlanungRouteDurch(route, koerper, kontext) {
  if (route.art === 'bereinigung') return listeBereinigung(kontext)
  if (route.art === 'bestaetigen') return bestaetigeBereinigung(koerper, kontext)
  let featureId
  try {
    featureId = decodeURIComponent(route.rohId)
  } catch {
    return antwort(400, 'featureId ist keine gültige URL-Kodierung')
  }
  return bearbeitePlanung(featureId, koerper, kontext)
}
