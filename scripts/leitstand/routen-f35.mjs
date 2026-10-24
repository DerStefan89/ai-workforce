/**
 * Datei: scripts/leitstand/routen-f35.mjs
 *
 * Zweck: Orchestrierung für POST /api/features/<featureId>/auftrag (F35
 * WS-1, features/F35/feature.md) — aufgerufen über den projektpräfigierten
 * Pfad /api/projekte/<projektId>/features/<featureId>/auftrag (Muster
 * erzeugeMultiProjektDispatcher, scripts/leitstand-server.mjs: der Rest
 * nach der Projekt-id wird wieder mit '/api' zusammengesetzt, jede
 * erzeugeRequestHandler-Instanz sieht dadurch unverändert ihre eigenen
 * /api/...-Pfade).
 *
 * Liest features/<featureId>/feature.md aus der repoWurzel DIESES Projekts
 * (E-F41-2: Projektinhalt, nie die installWurzel — Muster
 * scripts/leitstand/routen-roadmap.mjs' baueFeatureEintrag, inkl. derselben
 * Pfadsicherheit: resolve + Präfixvergleich gegen '<repoWurzel>/features/',
 * nicht nur das featureId-Muster). Baut den Auftrag über
 * baueAuftragAusFeatureAkte (src/feature-auftrag/index.ts, F35 WS-1 AK3)
 * und registriert ihn über registriereAuftrag — denselben Pfad wie POST
 * /api/auftraege (D5, kein zweiter Registrierungsweg).
 *
 * F44 WS-3b: leseFeatureAkteFuerAnzeige ist die lesende Logik für GET
 * /api/features/<featureId>/akte (Detail im Leitstand) — gleiche ID-Prüfung,
 * Pfadsicherheit und Status-Zeile, registriert und schreibt nichts.
 *
 * F45 B5a-1 „Akte schreiben“ (features/F45/plan-b5a1-v2.md, Advisor features/F45/advisor-b5a1.md; E-F45-1, F-912,
 * F-995): Zwischenmuster E-FB1-2/F-1131 — erkenneAkteRoute erkennt GET/PUT …/features/<id>/akte und POST /api/features
 * (ohne Methodenweiche), der Server prüft die Methode hinter dem zentralen CSRF-Haken und reicht die Aktion samt Rückrufen
 * (Workflows, Aufträge, bestehende IDs) an fuehreAkteRouteDurch. GET liefert zusätzlich hash (sha256 der Dateibytes, aus
 * demselben Lesevorgang wie der Inhalt) und entscheidungen[]. PUT ersetzt Ziel, Nicht-Ziele und AKs
 * (bearbeiteFeatureAkte, src/feature-auftrag/akte-schreiben.ts): 400 Körper/grund, 404, 409 Sperre (ein nicht beendeter
 * Ablauf, dessen Auftrag auf das Feature zeigt — dieselbe Regel wie die Anzeige, baueVerknuepfung — oder dessen Auftrag
 * nicht lesbar ist) bzw. Hash-Drift, 422 (Status, Bearbeitbarkeit, Rundlauf, Gate), sonst Schreiben und 200 mit neuem Hash.
 * POST legt aus einem Coach-Scope eine neue Akte an (baueFeatureAkteAusScope, src/product-coach/index.ts), nie
 * überschreibend (409). Kein Commit, kein git-Prozess: die Antwort trägt einen Git-Block als Text (befehlsBlock,
 * public/leitstand/code-daten.js). Ausnahme „Feature-Akte im Projektordner“: ARCHITECTURE.md §2,
 * docs/architektur/arbeitsordner.md.
 *
 * F45 B5b-1b-1: loeseFeatureAktePfadAuf, sha256, lokalesDatum, antwort und baueGitBlock (Pfadliste) sind exportiert — die
 * Planungsroute (scripts/leitstand/routen-planung.mjs) nutzt dieselben Helfer statt Kopien.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs, scripts/leitstand/routen-planung.mjs,
 * scripts/check-f35-ws1-feature-auftrag.mjs, scripts/check-f45-b5a1-akte.mjs, scripts/leitstand/routen-f35.test.mjs.
 *
 * Wichtig: Ab dem Lesen der Akte bis zum Schreiben läuft alles synchron (kein await) — zwei gleichzeitige PUTs lösen sich
 * über den Hash auf (der zweite bekommt 409). Die Sperrprüfung davor ist asynchron; ein in diesem Fenster angelegter Ablauf
 * wird übersehen (DEKLARIERT). Schreiben ist nicht atomar; danach wird zurückgelesen und der Hash verglichen (500).
 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { befehlsBlock, gitPfadArgument, psArgument } from '../../public/leitstand/code-daten.js'
import { baueVerknuepfung, workitemReferenz } from '../../public/leitstand/entwicklung-daten.js'
import { registriereAuftrag, validiereAuftragAkzeptanzkriterien, validiereAuftragNichtZiele } from '../../src/auftrag/index.ts'
import { bearbeiteFeatureAkte, pruefeAkteAenderung } from '../../src/feature-auftrag/akte-schreiben.ts'
import { baueAuftragAusFeatureAkte, leseFeatureAkteAnzeige, leseFeatureEntscheidungen } from '../../src/feature-auftrag/index.ts'
import { baueFeatureAkteAusScope } from '../../src/product-coach/index.ts'
import { FEATURE_ID_MUSTER } from '../../src/projektkontext/index.ts'
import { leseFeatureStatus } from '../../src/workboard/feature-akte-pruefung.ts'

// Zwilling von public/leitstand/views/workboard.js' FEATURE_STATUS_NICHT_BAUBAR (F35 WS-1 AK6) —
// die Workboard-Sichtbarkeit des "Bauen"-Knopfs ist NICHT die einzige Durchsetzung: ohne diese
// serverseitige Prüfung könnte ein zweiter Browser-Tab, ein veralteter Poll-Zustand oder ein
// direkter API-Aufruf trotzdem einen Bau-Auftrag für eine bereits abgeschlossene/abgebrochene
// Feature-Akte anlegen (QA-Pass-Befund, frischer Kontext, 25.09.2026).
const STATUS_NICHT_BAUBAR = new Set(['ABGESCHLOSSEN', 'ABGEBROCHEN'])

/** F45 B5a-1: Workflow-Status, in denen ein Ablauf als beendet gilt (Zwilling BEENDET in routen-arbeitsordner.mjs). */
const ABLAUF_BEENDET = new Set(['ABGESCHLOSSEN', 'GESTOPPT'])
const AKTE_ROUTE = /^\/api\/features\/([^/]+)\/akte$/

/**
 * Löst features/<featureId>/feature.md sicher gegen repoWurzel auf (Muster
 * baueFeatureEintrag, scripts/leitstand/routen-roadmap.mjs) — liest nie
 * außerhalb von features/, auch wenn featureId (entgegen dem bereits vorher
 * geprüften FEATURE_ID_MUSTER) je ungeprüft ankäme.
 * @returns absoluter Pfad, oder null, wenn er außerhalb von <repoWurzel>/features/ läge
 */
export function loeseFeatureAktePfadAuf(featureId, repoWurzel) {
  const featuresWurzel = resolve(repoWurzel, 'features')
  const pfad = resolve(featuresWurzel, featureId, 'feature.md')
  const liegtUnterFeaturesWurzel = pfad === featuresWurzel || pfad.startsWith(featuresWurzel + sep)
  return liegtUnterFeaturesWurzel ? pfad : null
}

/**
 * Baut den Auftrag aus features/<featureId>/feature.md und registriert ihn
 * (Muster POST /api/auftraege, F39 WS-2a herkunft). Wirft nicht — jeder
 * Fehlerfall ist ein Fachergebnis mit passendem HTTP-Status (Auftrags-
 * Vorgabe Punkt 4: 400/404/422).
 * @param featureId - Feature-id aus dem Pfad (noch ungeprüft)
 * @param repoWurzel - Repo-Wurzel DIESES Projekts (E-F41-2, NIE die installWurzel)
 * @param profilReferenz - Profilreferenz dieser Serverinstanz
 * @param registrierOptionen - { basisVerzeichnis, schreiber? } (Muster registriereAuftrag-Aufrufstellen)
 * @returns { ok: true, auftragId } | { ok: false, status: 400 | 404 | 422 | 500, grund }
 */
export function baueUndRegistriereAuftragAusFeatureAkte(featureId, repoWurzel, profilReferenz, registrierOptionen) {
  if (typeof featureId !== 'string' || !FEATURE_ID_MUSTER.test(featureId)) {
    return { ok: false, status: 400, grund: `featureId muss dem Muster ^F[0-9]+[A-Za-z]?$ entsprechen (F-595), erhalten ${JSON.stringify(featureId)}` }
  }

  const pfad = loeseFeatureAktePfadAuf(featureId, repoWurzel)
  if (pfad === null || !existsSync(pfad)) {
    return { ok: false, status: 404, grund: `features/${featureId}/feature.md nicht gefunden` }
  }

  const inhalt = readFileSync(pfad, 'utf8')
  const status = leseFeatureStatus(inhalt)
  if (status !== null && STATUS_NICHT_BAUBAR.has(status)) {
    return { ok: false, status: 422, grund: `Feature-Status '${status}' lässt keinen Bau-Auftrag mehr zu (ABGESCHLOSSEN/ABGEBROCHEN)` }
  }

  const ergebnis = baueAuftragAusFeatureAkte(inhalt, featureId)
  if (!ergebnis.ok) {
    return { ok: false, status: 422, grund: ergebnis.grund }
  }

  // Verteidigungslinie (Muster registriereWorkflowEntscheidung, scripts/leitstand/routen-f39.mjs):
  // baueAuftragAusFeatureAkte hat akzeptanzkriterien/nicht_ziele bereits selbst geprüft (u. a.
  // eindeutige IDs) — diese zweite, unabhängige Prüfung gegen denselben Regelsatz wie das
  // AUFTRAG_V0-Schema verhindert, dass ein künftiger Fehler in baueAuftragAusFeatureAkte je ein
  // schemawidriges Kernartefakt schreiben könnte, statt hier mit einem Fachergebnis zu enden.
  const akVerstoesse = validiereAuftragAkzeptanzkriterien(ergebnis.akzeptanzkriterien)
  const nichtZieleVerstoesse = validiereAuftragNichtZiele(ergebnis.nicht_ziele)
  if (akVerstoesse.length > 0 || nichtZieleVerstoesse.length > 0) {
    return { ok: false, status: 500, grund: `baueAuftragAusFeatureAkte lieferte ein Ergebnis, das gegen das Auftragsschema verstößt: ${[...akVerstoesse, ...nichtZieleVerstoesse].join('; ')}` }
  }

  const auftragId = randomUUID()
  try {
    registriereAuftrag(auftragId, profilReferenz, ergebnis.titel, ergebnis.auftragstext, {
      ...registrierOptionen,
      herkunft: ergebnis.herkunft,
      akzeptanzkriterien: ergebnis.akzeptanzkriterien,
      nicht_ziele: ergebnis.nicht_ziele,
      // F45 B2a-2 (F-989): Feature-Bezug als Datum — die Verknüpfung Feature ↔ Ablauf hängt nicht mehr am Auftragstext.
      feature_ref: featureId,
    })
  } catch (fehler) {
    return { ok: false, status: 500, grund: `Auftrag konnte nicht registriert werden: ${fehler.message}` }
  }
  return { ok: true, auftragId }
}

/**
 * F44 WS-3b: Lesende Projektion einer Feature-Akte für das Detail im Leitstand
 * (GET /api/features/<featureId>/akte). Gleiche ID-Prüfung (F-595), gleiche Pfadsicherheit und
 * gleiche Status-Zeile wie baueUndRegistriereAuftragAusFeatureAkte; Titel, Ziel, Nicht-Ziele und
 * AKs über leseFeatureAkteAnzeige (derselbe Leser wie der Bau-Auftrag). Liest nur — registriert
 * nichts, schreibt nichts. Wirft nicht. F45 B5a-1: beide 200-Körper zusätzlich mit hash (Grundlage des PUT) und
 * entscheidungen (F-995); der Körper 'unvollstaendig' trägt keine Teilwerte (Grenze für B5a-2).
 * @param featureId - Feature-id aus dem Pfad (noch ungeprüft)
 * @param repoWurzel - Repo-Wurzel DIESES Projekts (E-F41-2, NIE die installWurzel)
 * @returns { status: 400 | 404 | 500, koerper: { grund } } | { status: 200, koerper: { status: 'ok', id, titel, featureStatus, ziel, nicht_ziele, akzeptanzkriterien, hash, entscheidungen } | { status: 'unvollstaendig', id, grund, hash, entscheidungen } }
 */
export function leseFeatureAkteFuerAnzeige(featureId, repoWurzel) {
  if (typeof featureId !== 'string' || !FEATURE_ID_MUSTER.test(featureId)) {
    return { status: 400, koerper: { grund: `featureId muss dem Muster ^F[0-9]+[A-Za-z]?$ entsprechen (F-595), erhalten ${JSON.stringify(featureId)}` } }
  }
  const pfad = loeseFeatureAktePfadAuf(featureId, repoWurzel)
  if (pfad === null || !existsSync(pfad)) {
    return { status: 404, koerper: { grund: `features/${featureId}/feature.md nicht gefunden` } }
  }
  let roh
  try {
    roh = readFileSync(pfad)
  } catch (fehler) {
    console.error(`[akte] features/${featureId}/feature.md nicht lesbar:`, fehler)
    return { status: 500, koerper: { grund: `features/${featureId}/feature.md nicht lesbar: ${fehler.message}` } }
  }
  // F45 B5a-1 (Advisor B6): Inhalt und Hash aus demselben Lesevorgang — sonst könnte ein Client Hash B zu Inhalt A bekommen.
  const inhalt = roh.toString('utf8')
  // featureStatus auch bei 'unvollstaendig' (qa 4): B5a-2 erkennt daran eine nicht mehr bearbeitbare Akte vor dem Speichern.
  const zusatz = { hash: sha256(roh), entscheidungen: leseFeatureEntscheidungen(inhalt) }
  const featureStatus = leseFeatureStatus(inhalt)
  const ergebnis = leseFeatureAkteAnzeige(inhalt, featureId)
  if (!ergebnis.ok) return { status: 200, koerper: { status: 'unvollstaendig', id: featureId, grund: ergebnis.grund, featureStatus, ...zusatz } }
  return {
    status: 200,
    koerper: {
      status: 'ok',
      id: featureId,
      titel: ergebnis.titel,
      // Der Feature-Status aus der Status-Zeile heißt featureStatus: 'status' trägt bereits den
      // Antwortzustand ('ok' | 'unvollstaendig'), ein Objekt kann den Schlüssel nur einmal führen.
      featureStatus,
      ziel: ergebnis.ziel,
      nicht_ziele: ergebnis.nicht_ziele,
      akzeptanzkriterien: ergebnis.akzeptanzkriterien,
      ...zusatz,
    },
  }
}

/** sha256 hex über Bytes. @param bytes - Buffer @returns Hash */
export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

/** Lokales Datum JJJJ-MM-TT (Änderungszeile). @param jetzt - Zeitpunkt @returns Datum */
export function lokalesDatum(jetzt = new Date()) {
  const zwei = (zahl) => String(zahl).padStart(2, '0')
  return `${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}`
}

/** Antwort. @param status - HTTP-Status @param grund - Grund @param felder - weitere Felder @returns { status, koerper } */
export const antwort = (status, grund, felder = {}) => ({ status, koerper: { grund, ...felder } })

/**
 * Git-Block als Text (nichts ausgeführt, F-1000 unberührt): benannte Pfade stagen und committen, in der Blockform des Leitstands.
 * F45 B5b-1b-1 (Advisor B5b-1 C4): eine Pfadliste — PUT …/planung ändert Akte und roadmap.json.
 * @param repoWurzel - Projektwurzel
 * @param pfade - repo-relative Pfade (nicht leer)
 * @param nachricht - Commit-Nachricht (`"` wird zu `'` — PowerShell 5.1 reicht `"` an native Programme verstümmelt weiter)
 * @returns Zeilen oder null, wenn kein absoluter Pfad bestimmbar ist
 */
export function baueGitBlock(repoWurzel, pfade, nachricht) {
  const pfadArgument = pfade.map((pfad) => gitPfadArgument(pfad)).join(' ')
  // Commit nur dieser Pfade (qa 8): sonst nähme er mit, was Stefan schon gestaged hat.
  return befehlsBlock(resolve(repoWurzel), [`git add -- ${pfadArgument}`, `git commit -m ${psArgument(nachricht.replace(/"/g, "'"))} -- ${pfadArgument}`])
}

/**
 * Erkennt die Akte-Routen (Zwischenmuster F-1131: nur der Pfad, die Methode prüft der Server).
 * @param pfad - Pfad ohne Projektpräfix
 * @returns { art: 'akte', rohId } | { art: 'anlegen' } | null
 */
export function erkenneAkteRoute(pfad) {
  if (pfad === '/api/features') return { art: 'anlegen' }
  const treffer = AKTE_ROUTE.exec(pfad)
  return treffer === null ? null : { art: 'akte', rohId: treffer[1] }
}

/**
 * Sucht einen Ablauf, der die Akte sperrt: nicht beendet (fehlender oder unbekannter Status sperrt) und sein Auftrag zeigt auf
 * das Feature (baueVerknuepfung: feature_ref, sonst workitem_referenz — dieselbe Regel wie die Anzeige) oder trägt eine
 * auftragId, die nicht in der Auftragsliste steht (Kette nicht lesbar, fail-closed). Ein Ablauf ohne auftragId zeigt auf kein
 * Feature.
 * @param featureId - geprüfte Feature-id
 * @param workflows - Kopfdaten (sammleWorkflows)
 * @param auftraege - Kopfdaten (sammleAuftraege)
 * @returns { workflowId, grund } oder null
 */
export function findeSperrendenAblauf(featureId, workflows, auftraege) {
  if (!Array.isArray(workflows) || !Array.isArray(auftraege)) return { workflowId: null, grund: 'Abläufe oder Aufträge nicht lesbar — Sperre nicht prüfbar' }
  const offen = (w) => !ABLAUF_BEENDET.has(w?.status)
  const { jeReferenz } = baueVerknuepfung(workflows, auftraege)
  const treffer = (jeReferenz.get(workitemReferenz({ quelle: 'feature', id: featureId })) ?? []).find(offen)
  if (treffer !== undefined) return { workflowId: treffer.workflowId ?? null, grund: `Ablauf '${treffer.workflowId}' (Status ${treffer.status ?? 'unbekannt'}) arbeitet an ${featureId} — Akte erst nach dessen Ende bearbeiten` }
  const bekannt = new Set(auftraege.map((a) => a?.auftragId))
  const unlesbar = workflows.find((w) => offen(w) && typeof w?.auftragId === 'string' && !bekannt.has(w.auftragId))
  if (unlesbar !== undefined) return { workflowId: unlesbar.workflowId ?? null, grund: `Auftrag '${unlesbar.auftragId}' des Ablaufs '${unlesbar.workflowId}' ist nicht lesbar — ob er an ${featureId} arbeitet, ist nicht prüfbar; den Ablauf stoppen oder den Auftrag reparieren` }
  return null
}

/**
 * PUT …/features/<id>/akte (E-F45-1). Wirft nicht.
 * @param featureId - dekodierte id
 * @param koerper - Ergebnis von leseJsonBegrenzt
 * @param kontext - { repoWurzel, workflows(), auftraege(), datum? }
 * @returns Promise<{ status, koerper }>
 */
async function bearbeiteAkte(featureId, koerper, kontext) {
  if (typeof featureId !== 'string' || !FEATURE_ID_MUSTER.test(featureId)) return antwort(400, `featureId muss dem Muster ^F[0-9]+[A-Za-z]?$ entsprechen (F-595), erhalten ${JSON.stringify(featureId)}`)
  const pfad = loeseFeatureAktePfadAuf(featureId, kontext.repoWurzel)
  if (pfad === null || !existsSync(pfad)) return antwort(404, `features/${featureId}/feature.md nicht gefunden`)
  if (!koerper.ok) return antwort(koerper.status, koerper.grund)
  const pruefung = pruefeAkteAenderung(koerper.daten)
  if (!pruefung.ok) return antwort(400, pruefung.grund)

  let sperre
  try {
    sperre = findeSperrendenAblauf(featureId, await kontext.workflows(), await kontext.auftraege())
  } catch (fehler) {
    console.error(`[akte] Sperre für ${featureId} nicht prüfbar:`, fehler)
    return antwort(500, `Sperre nicht prüfbar: ${fehler.message}`)
  }
  if (sperre !== null) return antwort(409, sperre.grund, { workflowId: sperre.workflowId })

  // Ab hier synchron bis zum Schreiben (kein await).
  let roh
  try {
    roh = readFileSync(pfad)
  } catch (fehler) {
    console.error(`[akte] features/${featureId}/feature.md nicht lesbar:`, fehler)
    return antwort(500, `features/${featureId}/feature.md nicht lesbar: ${fehler.message}`)
  }
  const aktuell = sha256(roh)
  if (aktuell !== pruefung.hash) return antwort(409, 'Die Akte wurde seit dem Lesen geändert — neu laden und erneut bearbeiten', { hash: aktuell })
  const inhalt = roh.toString('utf8')
  if (!Buffer.from(inhalt, 'utf8').equals(roh)) return antwort(422, 'Die Akte ist kein gültiges UTF-8 — der Rest bliebe nicht bytegleich, von Hand bearbeiten')
  const ergebnis = bearbeiteFeatureAkte(inhalt, featureId, pruefung.aenderung, kontext.datum ?? lokalesDatum())
  if (!ergebnis.ok) return antwort(422, ergebnis.grund, ergebnis.verstoesse === undefined ? {} : { verstoesse: ergebnis.verstoesse })

  const neu = Buffer.from(ergebnis.inhalt, 'utf8')
  try {
    writeFileSync(pfad, neu)
    if (!readFileSync(pfad).equals(neu)) {
      console.error(`[akte] features/${featureId}/feature.md nach dem Schreiben nicht wie erwartet`)
      return antwort(500, `features/${featureId}/feature.md nach dem Schreiben nicht wie erwartet — Akte prüfen (git diff)`)
    }
  } catch (fehler) {
    console.error(`[akte] Schreiben von ${featureId} gescheitert:`, fehler)
    return antwort(500, `features/${featureId}/feature.md nicht geschrieben: ${fehler.message} — Akte prüfen (git diff)`)
  }
  const nachricht = `${featureId}: Akte bearbeitet (${ergebnis.geaendert.join(', ')}) — ${pruefung.aenderung.grund}`
  return { status: 200, koerper: { status: 'ok', id: featureId, hash: sha256(neu), geaendert: ergebnis.geaendert, git: baueGitBlock(kontext.repoWurzel, [`features/${featureId}/feature.md`], nachricht) } }
}

/**
 * POST /api/features { scope } (F-912): neue Akte aus einem Coach-Scope, nie überschreibend. Wirft nicht.
 * @param koerper - Ergebnis von leseJsonBegrenzt
 * @param kontext - { repoWurzel, bestehendeIds(), datum? }
 * @returns { status, koerper }
 */
function legeAkteAn(koerper, kontext) {
  if (!koerper.ok) return antwort(koerper.status, koerper.grund)
  const daten = koerper.daten
  if (daten === null || typeof daten !== 'object' || Array.isArray(daten)) return antwort(400, 'Body muss ein JSON-Objekt { scope } sein')
  const fremd = Object.keys(daten).filter((k) => k !== 'scope')
  if (fremd.length > 0 || !('scope' in daten)) return antwort(400, `erlaubt ist genau das Feld scope${fremd.length > 0 ? ` (unbekannt: ${fremd.slice(0, 5).join(', ')})` : ''}`)
  const ergebnis = baueFeatureAkteAusScope(daten.scope, kontext.bestehendeIds(), kontext.datum ?? lokalesDatum())
  if (!ergebnis.ok) return antwort(ergebnis.status, ergebnis.grund, ergebnis.verstoesse === undefined ? {} : { verstoesse: ergebnis.verstoesse })

  const { featureId } = ergebnis
  const pfad = loeseFeatureAktePfadAuf(featureId, kontext.repoWurzel)
  if (pfad === null) return antwort(500, `features/${featureId}/feature.md liegt nicht unter features/`)
  const ordner = dirname(pfad)
  const ordnerNeu = !existsSync(ordner)
  const neu = Buffer.from(ergebnis.inhalt, 'utf8')
  try {
    mkdirSync(ordner, { recursive: true })
    writeFileSync(pfad, neu, { flag: 'wx' })
  } catch (fehler) {
    // C3: einen selbst angelegten, leeren Ordner wieder entfernen — sonst wäre die ID verbraucht und check-feature rot.
    if (ordnerNeu) {
      try {
        rmdirSync(ordner)
      } catch (rueckbau) {
        console.error(`[akte] leerer Ordner ${ordner} nicht entfernt:`, rueckbau)
      }
    }
    if (fehler.code === 'EEXIST') return antwort(409, `features/${featureId}/feature.md existiert bereits — nichts überschrieben`, { id: featureId })
    console.error(`[akte] Anlage von ${featureId} gescheitert:`, fehler)
    return antwort(500, `features/${featureId}/feature.md nicht angelegt: ${fehler.message}`)
  }
  return { status: 201, koerper: { status: 'ok', id: featureId, hash: sha256(neu), git: baueGitBlock(kontext.repoWurzel, [`features/${featureId}/feature.md`], `${featureId}: Akte angelegt aus Coach-Scope`) } }
}

/**
 * Führt eine Akte-Route aus (Zwischenmuster F-1131). Die Methode hat der Server geprüft und als aktion übergeben.
 * @param route - erkenneAkteRoute(pfad) plus aktion: 'lesen' | 'bearbeiten' | 'anlegen'
 * @param koerper - leseJsonBegrenzt-Ergebnis (null bei 'lesen')
 * @param kontext - { repoWurzel, workflows(), auftraege(), bestehendeIds(), datum? (nur Tests) }
 * @returns Promise<{ status, koerper }>
 */
export async function fuehreAkteRouteDurch(route, koerper, kontext) {
  if (route.aktion === 'anlegen') return legeAkteAn(koerper, kontext)
  let featureId
  try {
    featureId = decodeURIComponent(route.rohId)
  } catch {
    return antwort(400, 'featureId ist keine gültige URL-Kodierung')
  }
  if (route.aktion === 'lesen') return leseFeatureAkteFuerAnzeige(featureId, kontext.repoWurzel)
  if (route.aktion === 'bearbeiten') return bearbeiteAkte(featureId, koerper, kontext)
  return antwort(405, `Aktion ${JSON.stringify(route.aktion)} nicht erlaubt`)
}
