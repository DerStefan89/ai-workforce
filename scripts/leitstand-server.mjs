/**
 * Datei: scripts/leitstand-server.mjs
 *
 * Zweck: F10-Leitstand. Lesend liefert der Server kontrollzustand/
 * (F1-Checkpoints, F2-Lineage-Einträge, seit WS-1 zusätzlich der echte
 * F1B-Laufstatus, AK8) als JSON an eine statische Seite unter
 * public/leitstand/. Seit WS-1 (F10-Feature-Akte) hat der Server zusätzlich
 * einen Schreibpfad: POST /api/laeufe nimmt einen Startauftrag entgegen und
 * löst ihn ausschließlich über F8s fuehreAufgabeDurch aus (AK2) — der
 * Server selbst schreibt nie nach kontrollzustand/ (Scope-Grenze aus der
 * F10-Akte). AusfuehrungsOptionen wird nie aus dem Body gelesen (AK3,
 * Options-Sperre). Der Server bindet ausschließlich auf 127.0.0.1 (AK4,
 * löst F-120). Eine laufId wird synchron vor dem fuehreAufgabeDurch-Aufruf
 * reserviert (AK5) und bei Fehlschlag der Kette wieder freigegeben. Ein
 * Wurf aus fuehreAufgabeDurch beendet den Prozess nicht (AK6) — er landet
 * in einer flüchtigen In-Memory-Liste unter GET /api/startfehler.
 *
 * Wird aufgerufen von: `npm run leitstand`, scripts/check-f10-leitstand.mjs
 *
 * Wichtig: Kein eigener Schreibzugriff auf kontrollzustand/ hinzufügen —
 * jede Schreibwirkung läuft ausschließlich mittelbar über
 * fuehreAufgabeDurch (F8 → F5/F6a/F7/F1B). erzeugeRequestHandler hält ihren
 * eigenen In-Memory-Zustand (angenommene laufIds, Startfehler) pro Aufruf
 * isoliert — wichtig für parallele Gate-Tests (scripts/check-f10-
 * leitstand.mjs), die eigene Serverinstanzen gegen ein Testverzeichnis
 * starten, ohne sich gegenseitig zu beeinflussen. Seed-Daten kommen separat
 * aus scripts/leitstand-seed.mjs, nicht aus diesem Server.
 *
 * F11 WS-1 (Option B, state/plan-v1-f11-auftrag-ws1.md Abschnitt 2.4):
 * auftragstext ist jetzt Pflichtfeld eines Startauftrags (AK2 macht es zum
 * Pflichtfeld von AusfuehrungsEingaben) — ERLAUBTE_STARTAUFTRAG_FELDER/
 * PFLICHT_STARTAUFTRAG_FELDER/pruefeStartauftrags eingaben-Rückgabe
 * entsprechend erweitert. Reine Formprüfung, keine Verhaltens-/Routen-
 * Änderung.
 *
 * F11 WS-2 (AK4-AK7, features/F11/feature.md): die maschinenkonstanten
 * Startfelder (werkzeugStartziel, werkzeugVersionDeklariert,
 * berechtigungskontext, profilReferenz) kommen nicht mehr aus dem Body,
 * sondern aus einer serverseitig einmal geladenen Startvorlage
 * (src/startvorlage/); ein Startauftrag wählt stattdessen einen benannten
 * Werkzeugsatz über das neue Feld `werkzeugsatz` (AK4/AK5,
 * VERBOTENE_STARTVORLAGE_FELDER). anfragen[] benennt Evidenz nur noch über
 * `pfad` — der Server liest jede Datei selbst, nach Pfadsicherheitsprüfung
 * über F3s leiteRepoRelativenPfadAb (AK6, loeseEvidenzPfadAuf). Eine reine
 * In-Memory-Sperre (laufAktiv) lässt je Serverinstanz nur einen
 * ausstehenden fuehreAufgabeDurch-Aufruf gleichzeitig zu (AK7, D13, löst
 * F-128) — nie aus kontrollzustand/ abgeleitet, ein Serverneustart setzt
 * sie zurück.
 *
 * F12 WS-1 (AK1-AK3, state/plan-v1-f12-ws1.md): GET /api/laeufe listet nur
 * noch echte Läufe (mindestens eine Wirkungsmarke in der gültigen Kette,
 * istLaufkette) - F2-Lineage-Ketten (lauf_id-Präfix "lineage-") erscheinen
 * nicht mehr (F-137). Die Antwort ist auf Kopfdaten geschrumpft
 * (sammleLaufKopfdaten); die volle Checkpoint-Projektion (unverändert
 * sammleCheckpoints) zieht in den neuen Detailendpunkt GET
 * /api/laeufe/<laufId> um (404 bei unbekannter laufId). Dessen laufId wird
 * nach decodeURIComponent gegen dieselbe Zeichenregel wie ein
 * Startauftrag geprüft (LAUFID_UNZULAESSIGE_ZEICHEN), bevor sie in einen
 * Dateisystempfad eingesetzt wird - sonst 400. Angezeigte Zeitpunkte
 * kommen seit E-M2-5 aus payload.erstellt_am (Artefaktinhalt), nicht mehr
 * aus statSync(pfad).mtime (F-141); fehlt das Feld (Bestandsdaten), liefert
 * der Server null statt eines Ersatzwerts.
 *
 * F12 WS-2 (AK4-AK6, state/plan-v1-f12-ws2.md): POST/GET /api/auftraege
 * legt einen Auftrag über den unveränderten registriereAuftrag-Pfad an
 * bzw. listet alle Aufträge (Verzeichnis-Scan nach dem Präfix
 * lineage-auftrag-, Abschnitt 0 des Plans — keine Lineage-Registry-
 * Funktion listet alle Artefakt-IDs einer Art). Ein Startauftrag trägt
 * seither `auftragId` statt `auftragstext` (VERBOTENE_AUFTRAG_FELDER);
 * der Auftragstext wird serverseitig aus dem Auftragsartefakt geladen. Die
 * auftragId-Existenzprüfung läuft SYNCHRON in erzeugeRequestHandler, nach
 * D13/laufIdBelegt und vor jeder Zustandsänderung — anders als das
 * vorgaengerLaufId-Vorbild (das erst innerhalb von fuehreAufgabeDurch,
 * also nach der bereits gesendeten 202-Antwort, wirft), weil AK5 einen
 * synchronen 400 vor jedem Schreibzugriff verlangt (D2, Plan Abschnitt 4).
 * GET /api/startvorlage/werkzeugsaetze liefert die Werkzeugsätze der
 * Startvorlage auf { name, modus, erlaubte_werkzeuge } reduziert — nie
 * werkzeugStartziel/berechtigungskontext/profilReferenz (D5).
 *
 * F12 WS-3 (AK7/AK8/AK10, state/plan-v1-f12-ws3.md): GET /api/laeufe/<laufId>
 * trägt seither vier zusätzliche Top-Level-Felder — kontextpaket, auftrag,
 * laufakte, rohstrom —, jedes mit eigenem status-Unterfeld statt Weglassen
 * bei Fehlen (kein 500 bei fehlender Zusatzquelle, sechs von sieben
 * Bestandsläufen haben keinen Auftragsbezug). auftrag hängt kausal vom
 * Kontextpaket ab (baueAuftragsbezug liest die artefakt:auftrag-<id>-
 * Referenz aus dessen elemente[]) — ohne Kontextpaket ist die Referenz nicht
 * auffindbar (status 'kontextpaket_fehlt', nicht 'kein_auftragsbezug').
 * baueAuftragsbezug wird zusätzlich von sammleLaufKopfdaten wiederverwendet
 * (F-147: auftragsbezug-Kopfdatum), mit einem Request-lokalen Memo
 * (auftragMemo, in sammleLaeufe angelegt) — eine von mehreren Läufen
 * geteilte Auftragskette wird pro Poll nur einmal geladen, kein
 * serverübergreifender Cache. rohstrom löst rohstrom_referenz.pfad
 * AUSSCHLIESSLICH über die Laufakte auf (nie aus der laufId gebaut), prüft
 * den Inhalts-Hash VOR jeder Feldprojektion (D2: hash_weicht_ab liefert kein
 * einziges Inhaltsfeld) und liest permission_denials ausschließlich über
 * F6as leseErgebnisobjekt(rohstrom.stdout) — nie eigenes Parsing (D5).
 * ergebnisobjekt.status 'kein_ergebnisobjekt' deckt sowohl ein leeres/nicht-
 * JSON-stdout als auch ein Nicht-"result"-Objekt ab (K1-Korrektur: die
 * ursprüngliche Planfassung nahm fälschlich an, leseErgebnisobjekt liefere
 * bei rohstrom.status 'ok' immer ein Objekt — real beobachtet in
 * kontrollzustand/lineage-laufakte-e2e-referenzfeature-2026-09-06,
 * beobachtungsbasis_vollstaendig: false). tool_input wird nie ausgeliefert,
 * nur tool_name (dedupliziert in toolNamen, anzahl zählt roh).
 *
 * F13 WS-2 (AK3-AK7, features/F13/feature.md): POST /api/entscheidungen ist
 * der einzige Schreibpfad für eine menschliche Entscheidung — Body-
 * Diskriminator `art` ('antwort'|'stale'|'terminal') wählt zwischen genau
 * drei bestehenden Kernverben: F9s importiereAntwort (E-186-Eskalation),
 * F9s entscheideStale (STALE-Entscheidung), F1Bs
 * schreibeWirkungsmarke(art:'terminal') (Auflösung von
 * KLAERUNG_ERFORDERLICH) — kein neuer Speicher, keine eigene Schreibfunktion
 * (D5, AK3). pruefeEntscheidungsformular ist reine Formprüfung (kein
 * Dateizugriff) und lehnt ein unbekanntes `art` UND ein Pflichtfeld ab, BEVOR
 * irgendetwas geschrieben wird (D2). F-162: das Wirkungsmarke-Schema kennt
 * kein erzeuger-Feld — AK4 wird für Fall 'terminal' stattdessen über ein
 * Pflichtfeld `begruendung` erfüllt (nicht-leerer String), das als
 * daten.mensch_begruendung mitgeschrieben wird; für 'antwort'/'stale' ist
 * `erzeuger: 'mensch'` bereits in den F9-Funktionen selbst fest codiert.
 * Eine geworfene Vorbedingungsverletzung aus importiereAntwort/entscheideStale
 * (keine bestehende transport-<laufId>-Kette, D3-Muster) wird als 400 mit
 * Klartext durchgereicht, kein 500/Absturz — der Aufruf ist synchron, kein
 * 202/Polling nötig. AK6 (D13): dieser Endpunkt prüft laufAktiv nicht — ein
 * Entscheidungs-POST ist kein Laufstart und bleibt von der Sperre unberührt.
 *
 * F13 WS-3 (AK5, nur art:'terminal' — features/F13/feature.md): eine Wirkungsmarke allein
 * ist für eine Wiederaufnahme unsichtbar (execution-controller löst 'artefakt:'-Pfade
 * ausschließlich gegen per registriereKernArtefakt registrierte Lineage-Artefakte auf, nie
 * gegen einen rohen Checkpoint-/Wirkungsmarke-Eintrag). Deshalb registriert der
 * art:'terminal'-Zweig NACH der Wirkungsmarke zusätzlich ein entscheidung-<laufId>-
 * Lineage-Artefakt (Vorbild: erzeugeTransportpaket, human-transport/index.ts:106-138) — kein
 * neues Schema, daten bleibt unknown (D5). Für 'antwort'/'stale' bewusst zurückgestellt
 * (F-163, kein belegter Fall — der Folgelauf verweist dort bereits über die Transportpaket-
 * Kette, F9). Die Response trägt seither zusätzlich artefaktId/versionSequenz dieses
 * Lineage-Artefakts.
 *
 * F13 WS-4 (F-166/F-167, features/F13/feature.md): vor WS-4 war ein über den
 * Leitstand gestarteter Lauf real nie entscheidbar — art:'terminal' wurde nur
 * bei KLAERUNG_ERFORDERLICH angeboten (praktisch unerreichbar, weil
 * klassifiziereLauf jeden Ausgang terminal markiert), der reale Klärfall
 * VERWEIGERT-durch-Werkzeuggrenze landet in ABGESCHLOSSEN und bekam dort nur
 * das art:'antwort'-Formular, das ohne transport-<laufId>-Kette (nur bei der
 * E-186-Eskalation vorhanden) garantiert 400 wirft (F-166). Deshalb eine
 * vierte Entscheidungsart 'kenntnisnahme': erlaubt nur bei ABGESCHLOSSEN mit
 * ergebnis VERWEIGERT oder FEHLGESCHLAGEN, schreibt KEINE zweite
 * Wirkungsmarke (der Lauf ist bereits terminal) — nur dieselbe
 * registriereKernArtefakt(entscheidung-<laufId>-…)-Registrierung, die der
 * terminal-Zweig für die Lineage-Sichtbarkeit schon nutzt (D5, kein neuer
 * Speicher). ergebnis kommt dabei ausschließlich aus stelleLaufstatusFest,
 * nie aus dem Body (verhindert Divergenz zwischen angezeigtem und
 * festgehaltenem Ergebnis). Zusätzlich (F-167): art:'terminal' prüfte den
 * Laufstatus bisher nicht und konnte auf einem bereits ABGESCHLOSSENEN Lauf
 * eine verwaiste zweite Terminalmarke erzeugen — beide Zweige rufen jetzt VOR
 * jedem Schreiben stelleLaufstatusFest auf: 'terminal' nur bei
 * KLAERUNG_ERFORDERLICH, 'kenntnisnahme' nur bei ABGESCHLOSSEN/VERWEIGERT
 * oder ABGESCHLOSSEN/FEHLGESCHLAGEN, sonst 400 mit Klartext-Grund, bevor
 * irgendetwas geschrieben wird (D2). QA-Nachtrag: bei VERWEIGERT lehnt
 * 'kenntnisnahme' zusätzlich ab, wenn die Terminalmarke einen echten
 * Bypass-Verdacht trägt (bypass_verdacht_anzahl > 0, über dieselbe
 * baueVerweigertDatenProjektion wie das GET-Detail) — das ist der E-186-Fall,
 * für den die UI bewusst 'antwort' statt 'kenntnisnahme' anbietet; ohne
 * diese Spiegelung wäre die Unterscheidung nur eine client-seitige
 * Formularweiche und der Server nicht mehr maßgeblich (D2-Verstoß).
 *
 * F-145-Fix: der Fire-and-forget-Aufruf des Startlaufs in POST /api/laeufe
 * reicht seither sein viertes Argument (optionen) strukturell durch
 * (dieselben Optionen, mit denen erzeugeRequestHandler selbst aufgerufen
 * wurde) — vorher respektierten nur die synchronen Prüfungen davor (D13,
 * laufIdBelegt, auftragId-Existenz) ein Nicht-Default-basisVerzeichnis, der
 * eigentliche Lauf fiel intern auf den Default 'kontrollzustand' zurück
 * (stille Divergenz, in Produktion unsichtbar bei Default=Default). Hinweis
 * für künftige Codeeingriffe: check-f11-auftrag.mjs' D13-Vertragsprüfung
 * findet die reale Aufrufstelle des Fire-and-forget-Laufs über deren
 * ERSTES Vorkommen im Quelltext — Kommentare oberhalb dürfen den
 * zusammengesetzten Funktionsnamen und die öffnende Klammer deshalb nie
 * unmittelbar hintereinander als Literalstring nennen.
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, isAbsolute, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ladeGueltigeCheckpoints, schreibeWirkungsmarke, sha256Hex, stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion, pruefeStale, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { entscheideStale, importiereAntwort } from '../src/human-transport/index.ts'
import { fuehreAufgabeDurch } from '../src/execution-controller/index.ts'
import { leiteRepoRelativenPfadAb } from '../src/authorization-boundary/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb, loeseWerkzeugsatzAuf } from '../src/startvorlage/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { leseErgebnisobjekt } from '../src/claude-code-gateway/index.ts'

const PORT = Number(process.env.LEITSTAND_PORT ?? 4173)
const BASISVERZEICHNIS = 'kontrollzustand'
const PUBLIC_VERZEICHNIS = join(import.meta.dirname, '..', 'public', 'leitstand')
const STANDARD_STARTVORLAGE_PFAD = 'startvorlagen/beispielprojekt.json'
const DATEINAME_MUSTER = /^(\d+)-([0-9a-f]{64})\.json$/
const STILLER_SCHREIBER = () => {}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

/**
 * F9-Erweiterung: die innere daten.daten (F2s registriereKernArtefakt-
 * Parameter 'daten') trägt bei Human-Transport-Artefakten ihren eigenen
 * Diskriminator (bedarf_schema/transport_schema) — daten.art ist bei
 * jedem kern-erzeugten Artefakt unverändert "artefakt_version" (F2s
 * eigener Diskriminator, eine Ebene höher), nie "bedarf"/"transportpaket".
 */
function humanTransportFelder(innereDaten) {
  if (typeof innereDaten !== 'object' || innereDaten === null) return {}
  if (innereDaten.bedarf_schema === 'v0') {
    return { humanTransportArt: 'bedarf', beschreibung: innereDaten.beschreibung, werkzeugAuswahl: innereDaten.werkzeug_auswahl }
  }
  if (innereDaten.transport_schema === 'v0') {
    return {
      humanTransportArt: 'transportpaket',
      transportStatus: innereDaten.status,
      executor: innereDaten.executor,
      bezugBedarf: innereDaten.bezieht_sich_auf_bedarf,
    }
  }
  return {}
}

function lineageFelder(daten) {
  return {
    art: daten.art,
    artefaktId: daten.artefakt_id,
    ...(daten.art === 'artefakt_version' ? { erzeugungsart: daten.erzeugungsart } : {}),
    ...(daten.art === 'stale_entscheidung' ? { entscheidung: daten.entscheidung, beziehtSichAuf: daten.bezieht_sich_auf } : {}),
    ...humanTransportFelder(daten.daten),
  }
}

/** F9-Erweiterung: art/ergebnis einer Wirkungsmarke (F1B) — RUN_PREPARED/Terminal, für Status-/Ergebnis-Spalten. */
function wirkungsmarkeFelder(payload) {
  return {
    art: payload.art,
    ...(payload.ergebnis !== undefined ? { ergebnis: payload.ergebnis } : {}),
  }
}

/** Liest den aktuellen Inhalt der referenzierten Dateien live von der Platte — nur lesend, für die Staleness-Live-Prüfung. */
function leseAktuelleEingaben(eingaben) {
  const inhalte = {}
  for (const eingabe of eingaben) {
    if (existsSync(eingabe.pfad)) {
      try {
        inhalte[eingabe.pfad] = readFileSync(eingabe.pfad, 'utf8')
      } catch {
        // Datei existiert laut existsSync, ist aber nicht lesbar — Eingabe einfach auslassen (pruefeStale ignoriert fehlende Pfade ohnehin).
      }
    }
  }
  return inhalte
}

/**
 * Liest alle Checkpoints einer lauf_id, sortiert aufsteigend nach sequenz.
 * Kettenintegrität (gültig/ungültig + Grund) kommt ausschließlich aus der
 * echten F1-Validierung (ladeGueltigeCheckpoints) — keine zweite,
 * selbstgebaute Prüfung. Staleness wird für artefakt_version-Einträge mit
 * Eingaben live über die echte pruefeStale-Funktion berechnet, nicht
 * vorberechnet. Seit F12 WS-1 (AK3, E-M2-5) liefert zeitstempel bei
 * gültigen Einträgen payload.erstellt_am (null bei Bestandsdaten ohne das
 * Feld) statt statSync(pfad).mtime — nur die "ungültig"-Zeile ohne
 * validierten Payload zeigt weiterhin die Datei-mtime als Diagnosewert.
 * @param laufId - Lauf-Kennung
 * @param basisVerzeichnis - Kontrollzustand-Wurzel (Default 'kontrollzustand', überschreibbar für Tests)
 * @returns Checkpoint-Liste, aufsteigend nach sequenz
 */
function sammleCheckpoints(laufId, basisVerzeichnis = BASISVERZEICHNIS) {
  const verzeichnis = join(basisVerzeichnis, laufId, 'checkpoints')
  if (!existsSync(verzeichnis)) return []

  const pfadNachSequenz = new Map()
  for (const datei of readdirSync(verzeichnis)) {
    const treffer = DATEINAME_MUSTER.exec(datei)
    if (treffer) pfadNachSequenz.set(Number(treffer[1]), join(verzeichnis, datei))
  }
  if (pfadNachSequenz.size === 0) return []

  const gruendeNachSequenz = new Map()
  const gueltigeEintraege = ladeGueltigeCheckpoints(laufId, {
    basisVerzeichnis,
    schreiber: (ereignis) => {
      if (ereignis.ereignis === 'checkpoint_validierungsfehler' && ereignis.sequenz !== undefined) {
        gruendeNachSequenz.set(ereignis.sequenz, ereignis.verstoesse ?? [])
      }
    },
  })
  const gueltigNachSequenz = new Map(gueltigeEintraege.map((eintrag) => [eintrag.payload.sequenz, eintrag]))

  const checkpoints = []
  for (const [sequenz, pfad] of pfadNachSequenz) {
    const eintrag = gueltigNachSequenz.get(sequenz)

    if (eintrag === undefined) {
      checkpoints.push({
        sequenz,
        // Kein validierter Payload vorhanden (Parse-/Ketten-/Hash-Fehler) — Diagnosewert für die
        // "ungültig"-Zeile, keine Aussage über einen Artefaktinhalt. AK3 betrifft nur gültige Einträge.
        zeitstempel: statSync(pfad).mtime.toISOString(),
        gueltig: false,
        gruende: gruendeNachSequenz.get(sequenz) ?? ['unbekannter Validierungsfehler'],
        typ: '(ungültig)',
      })
      continue
    }

    const daten = eintrag.payload.daten
    const istLineage = typeof daten === 'object' && daten !== null && daten.typ === 'lineage'
    const istStaleFaehig = istLineage && daten.art === 'artefakt_version' && (daten.eingaben?.length ?? 0) > 0
    const istWirkungsmarke = eintrag.typ === 'wirkungsmarke'

    checkpoints.push({
      sequenz,
      // AK3, E-M2-5: aus dem Artefaktinhalt (payload.erstellt_am), nicht mehr aus statSync(pfad).mtime
      // (F-141) — fehlt das Feld (Bestandsdaten), null statt eines Ersatzwerts.
      zeitstempel: eintrag.payload.erstellt_am ?? null,
      gueltig: true,
      typ: istLineage ? `lineage/${daten.art}` : eintrag.typ,
      ...(istLineage ? { lineage: lineageFelder(daten) } : {}),
      ...(istWirkungsmarke ? { wirkungsmarke: wirkungsmarkeFelder(eintrag.payload) } : {}),
      ...(istStaleFaehig
        ? { stale: pruefeStale(daten.artefakt_id, sequenz, leseAktuelleEingaben(daten.eingaben), { basisVerzeichnis, schreiber: STILLER_SCHREIBER }) }
        : {}),
    })
  }
  checkpoints.sort((a, b) => a.sequenz - b.sequenz)
  return checkpoints
}

/** Eine gültige Kette zählt nur als Lauf, wenn sie mindestens eine Wirkungsmarke enthält — Konvention (lauf_id-Präfix) ist dafür nie maßgeblich (F-137, AK1). */
function istLaufkette(gueltigeEintraege) {
  return gueltigeEintraege.some((eintrag) => eintrag.typ === 'wirkungsmarke')
}

// ─── F12 WS-3 (AK7/AK8): Detailprojektion — Kontextpaket, Auftragsbezug, Laufakte, Rohstrom ──

/** Lädt die Kontextpaket-Version eines Laufs, oder null (Bestandslauf ohne Kontextpaket, Befund 6). @param laufId - Lauf-Kennung @param basisVerzeichnis - Kontrollzustand-Wurzel @returns ArtefaktVersion des Kontextpakets, oder null */
function ladeKontextpaketVersion(laufId, basisVerzeichnis) {
  return ladeArtefaktVersion(`kontextpaket-${laufId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
}

/** Detailprojektion des Kontextpakets (AK7) — rolle/elemente/ausgeschlossen aus dem bereits geladenen Artefakt, kein zweiter Ladevorgang. @param kontextpaketVersion - Ergebnis von ladeKontextpaketVersion @returns { status: 'ok', rolle, elemente, ausgeschlossen } | { status: 'nicht_vorhanden' } */
function baueKontextpaketProjektion(kontextpaketVersion) {
  if (kontextpaketVersion === null) return { status: 'nicht_vorhanden' }
  const daten = kontextpaketVersion.daten
  return {
    status: 'ok',
    rolle: daten?.rolle,
    elemente: Array.isArray(daten?.elemente) ? daten.elemente : [],
    ausgeschlossen: Array.isArray(daten?.ausgeschlossen) ? daten.ausgeschlossen : [],
  }
}

const ARTEFAKT_AUFTRAG_PRAEFIX = 'artefakt:auftrag-'

/**
 * Leitet den Auftragsbezug eines Laufs aus dem Kontextpaket-Element mit
 * Pfad 'artefakt:auftrag-<auftragId>' ab (E-M2-4, Befund 2) und lädt bei
 * Treffer das Auftragsartefakt — lädt IMMER titel + auftragstext (D4, Q2):
 * der Kopfdaten-Aufrufer (sammleLaufKopfdaten) schneidet auftragstext weg,
 * die Detailansicht (GET /api/laeufe/<laufId>) nutzt die volle Rückgabe
 * unverändert als 'auftrag'-Feld. auftragMemo ist ein Request-lokales
 * Map(auftragId → Ergebnis), von sammleLaeufe angelegt — eine von mehreren
 * Läufen geteilte Auftragskette wird pro Poll nur einmal geladen (Q2),
 * kein serverübergreifender Cache, kein Zustand über den Request hinaus.
 * @param kontextpaketVersion - Ergebnis von ladeKontextpaketVersion
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @param auftragMemo - optionales Request-lokales Memo (Map)
 * @returns vier Ausprägungen, siehe state/plan-v1-f12-ws3.md Abschnitt 2.1 (D1)
 */
function baueAuftragsbezug(kontextpaketVersion, basisVerzeichnis, auftragMemo) {
  if (kontextpaketVersion === null) return { status: 'kontextpaket_fehlt' }
  const elemente = Array.isArray(kontextpaketVersion.daten?.elemente) ? kontextpaketVersion.daten.elemente : []
  const element = elemente.find((e) => typeof e?.pfad === 'string' && e.pfad.startsWith(ARTEFAKT_AUFTRAG_PRAEFIX))
  if (element === undefined) return { status: 'kein_auftragsbezug' }

  const auftragId = element.pfad.slice(ARTEFAKT_AUFTRAG_PRAEFIX.length)
  if (auftragMemo?.has(auftragId)) return auftragMemo.get(auftragId)

  const auftragVersion = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  const ergebnis =
    auftragVersion === null
      ? { status: 'auftrag_fehlt', auftragId }
      : { status: 'ok', auftragId, titel: auftragVersion.daten?.titel, auftragstext: auftragVersion.daten?.auftragstext }
  auftragMemo?.set(auftragId, ergebnis)
  return ergebnis
}

/** Detailprojektion der Laufakte (AK7) — modellBeobachtet/beobachtungsbasisVollstaendig/arbeitsverzeichnisPfad, ohne rohstrom_referenz (die bleibt intern, AK8: nie aus der laufId gebaut, nie an den Client ausgeliefert). @param laufakteVersion - ArtefaktVersion der Laufakte, oder null @returns { status: 'ok', ... } | { status: 'nicht_vorhanden' } */
function baueLaufakteProjektion(laufakteVersion) {
  if (laufakteVersion === null) return { status: 'nicht_vorhanden' }
  const daten = laufakteVersion.daten ?? {}
  return {
    status: 'ok',
    modellBeobachtet: daten.modell_beobachtet ?? null,
    beobachtungsbasisVollstaendig: daten.beobachtungsbasis_vollstaendig ?? null,
    arbeitsverzeichnisPfad: daten.arbeitsverzeichnis_pfad ?? null,
  }
}

/**
 * F13 WS-1 (AK2): bei ABGESCHLOSSEN/VERWEIGERT das daten-Feld der
 * terminalen Wirkungsmarke (bypass_verdacht_anzahl, is_error,
 * non_execution_kind — src/result-evaluator/index.ts, Schritt 0 dieser
 * Iteration) direkt aus der Checkpoint-Kette lesen. NICHT aus
 * baueLaufakteProjektion (die Felder liegen dort nicht, siehe oben) — ein
 * eigener, kleiner Projektionszweig (D5: kein neuer Endpunkt, GET
 * /api/laeufe/<laufId> bleibt der einzige Lieferant). Ein Bestandslauf vor
 * dieser Änderung trägt kein daten-Feld — 'unbekannt' je fehlendem Feld,
 * nie 0/false raten (Muster renderRohstrom "unbekannt (kein
 * Ergebnisobjekt)").
 * @param laufId - Lauf-Kennung
 * @param laufStatus - Ergebnis von stelleLaufstatusFest, unverändert übernommen
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @returns null außer bei ABGESCHLOSSEN/VERWEIGERT, sonst { bypassVerdachtAnzahl, isError, nonExecutionKind } (je 'unbekannt' bei fehlendem Feld)
 */
function baueVerweigertDatenProjektion(laufId, laufStatus, basisVerzeichnis) {
  if (laufStatus.status !== 'ABGESCHLOSSEN' || laufStatus.ergebnis !== 'VERWEIGERT') return null

  const kette = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  const terminal = kette.find((eintrag) => eintrag.typ === 'wirkungsmarke' && eintrag.payload.sequenz === laufStatus.terminalSequenz)
  const daten = terminal?.payload?.daten
  const hatDaten = typeof daten === 'object' && daten !== null

  return {
    bypassVerdachtAnzahl: hatDaten && typeof daten.bypass_verdacht_anzahl === 'number' ? daten.bypass_verdacht_anzahl : 'unbekannt',
    isError: hatDaten && 'is_error' in daten ? daten.is_error : 'unbekannt',
    nonExecutionKind: hatDaten && 'non_execution_kind' in daten ? daten.non_execution_kind : 'unbekannt',
  }
}

/**
 * Begrenzte, hashgeprüfte Rohstrom-Projektion (AK8). Auflösung
 * AUSSCHLIESSLICH über laufakteVersion.daten.rohstrom_referenz.pfad (nie
 * aus der laufId gebaut), Pfadsicherheit über F11s loeseEvidenzPfadAuf
 * (D5, kein zweiter Check). Reihenfolge zwingend (D2): Hash zuerst, dann
 * JSON.parse des Wurzelobjekts, dann Feldprojektion — bei hash_weicht_ab
 * oder nicht_parsebar wird KEIN Inhaltsfeld ausgeliefert, auch nicht
 * teilweise. exitCode/startfehler/stdoutLaenge/stderrLaenge stammen direkt
 * aus dem geparsten Wurzelobjekt (ProzessErgebnis-Form); permissionDenials
 * kommt ausschließlich über F6as leseErgebnisobjekt(wurzel.stdout) (Befund
 * 4, D5) — ergebnisobjekt.status 'kein_ergebnisobjekt' deckt sowohl
 * leeres/kaputtes stdout als auch ein Nicht-"result"-Objekt ab (K1: real
 * beobachtet bei beobachtungsbasis_vollstaendig: false, e2e-
 * referenzfeature-2026-09-06). tool_input wird nie ausgeliefert (D3), nur
 * der dedupliziert String-Wert tool_name (toolNamen); anzahl zählt roh
 * (Q7) — toolNamen darf leer sein, während anzahl > 0.
 * @param laufakteVersion - ArtefaktVersion der Laufakte, oder null
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel (AK6-Muster)
 * @returns siehe state/plan-v1-f12-ws3.md Abschnitt 2.1/2.2 (K1-Korrektur)
 */
function baueRohstromProjektion(laufakteVersion, repoWurzel) {
  if (laufakteVersion === null) return { status: 'laufakte_fehlt' }
  const referenz = laufakteVersion.daten?.rohstrom_referenz
  if (typeof referenz?.pfad !== 'string' || typeof referenz?.inhalts_hash !== 'string') return { status: 'nicht_verfuegbar' }

  const pfadErgebnis = loeseEvidenzPfadAuf(referenz.pfad, repoWurzel)
  if (!pfadErgebnis.ok) return { status: 'nicht_verfuegbar' }
  const zielPfad = join(repoWurzel, pfadErgebnis.relativerPfad)
  if (!existsSync(zielPfad) || !statSync(zielPfad).isFile()) return { status: 'nicht_verfuegbar' }

  let rohInhalt
  try {
    rohInhalt = readFileSync(zielPfad, 'utf8')
  } catch {
    return { status: 'nicht_verfuegbar' }
  }

  // D2: Hash zuerst, DANN projizieren — bei Abweichung kein einziges Inhaltsfeld.
  if (sha256Hex(rohInhalt) !== referenz.inhalts_hash) return { status: 'hash_weicht_ab' }

  let wurzel
  try {
    wurzel = JSON.parse(rohInhalt)
  } catch {
    return { status: 'nicht_parsebar' }
  }
  if (typeof wurzel !== 'object' || wurzel === null || Array.isArray(wurzel)) return { status: 'nicht_parsebar' }

  const ergebnisobjekt = typeof wurzel.stdout === 'string' ? leseErgebnisobjekt(wurzel.stdout) : null
  const denialsRoh = ergebnisobjekt?.permission_denials
  const denials = Array.isArray(denialsRoh) ? denialsRoh.filter((d) => typeof d === 'object' && d !== null) : []

  return {
    status: 'ok',
    exitCode: wurzel.exitCode ?? null,
    startfehler: wurzel.startfehler ?? null,
    stdoutLaenge: typeof wurzel.stdout === 'string' ? wurzel.stdout.length : null,
    stderrLaenge: typeof wurzel.stderr === 'string' ? wurzel.stderr.length : null,
    ergebnisobjekt:
      ergebnisobjekt === null
        ? { status: 'kein_ergebnisobjekt' }
        : {
            status: 'ok',
            permissionDenials: {
              anzahl: denials.length,
              toolNamen: [...new Set(denials.map((d) => d.tool_name).filter((t) => typeof t === 'string'))],
            },
          },
  }
}

/**
 * Kopfdaten eines einzelnen Laufs (AK2) — die schlanke Projektion für GET
 * /api/laeufe. Ruft ladeGueltigeCheckpoints genau einmal auf (D1, F-140);
 * die volle Checkpoint-Projektion liefert erst GET /api/laeufe/<laufId>
 * (sammleCheckpoints, unverändert). zeitpunkt kommt aus payload.erstellt_am
 * des letzten gültigen Eintrags (AK3, E-M2-5) — statSync/mtime wird hier
 * nicht mehr gelesen; fehlt erstellt_am (Bestandsdaten), liefert dieses
 * Feld null. auftragsbezug kommt seit F12 WS-3 (F-147) aus baueAuftragsbezug
 * (status 'ok') → { auftragId, titel }, sonst null — auftragstext bleibt
 * bewusst außen vor (D4 aus WS-2 gilt weiter, nur die Detailansicht braucht
 * den Volltext).
 * @param laufId - Lauf-Kennung
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @param auftragMemo - Request-lokales Memo für baueAuftragsbezug (F-147, Q2)
 * @returns Kopfdaten, oder null, wenn das Verzeichnis keine echte Laufkette ist (AK1)
 */
function sammleLaufKopfdaten(laufId, basisVerzeichnis, auftragMemo) {
  const gueltigeEintraege = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  if (!istLaufkette(gueltigeEintraege)) return null

  const verzeichnis = join(basisVerzeichnis, laufId, 'checkpoints')
  const alleDateien = existsSync(verzeichnis) ? readdirSync(verzeichnis).filter((datei) => DATEINAME_MUSTER.test(datei)) : []
  const kettenintegritaet = gueltigeEintraege.length === alleDateien.length
  const laufStatus = stelleLaufstatusFest(laufId, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  const letzter = gueltigeEintraege.at(-1)

  const auftragsbezugVoll = baueAuftragsbezug(ladeKontextpaketVersion(laufId, basisVerzeichnis), basisVerzeichnis, auftragMemo)
  const auftragsbezug = auftragsbezugVoll.status === 'ok' ? { auftragId: auftragsbezugVoll.auftragId, titel: auftragsbezugVoll.titel } : null

  return {
    laufId,
    laufStatus,
    ergebnis: laufStatus.status === 'ABGESCHLOSSEN' ? laufStatus.ergebnis : null,
    zeitpunkt: letzter?.payload.erstellt_am ?? null,
    auftragsbezug,
    anzahlCheckpoints: gueltigeEintraege.length,
    kettenintegritaet,
  }
}

/**
 * Liefert die Kopfdaten aller echten Läufe unter basisVerzeichnis (AK1,
 * AK2) — reine F2-Lineage-Ketten ohne jede Wirkungsmarke werden
 * inhaltsbasiert ausgefiltert (istLaufkette), nicht über den
 * lauf_id-Präfix. auftragMemo (F-147, Q2) lebt genau einen Aufruf lang —
 * eine von mehreren Läufen geteilte Auftragskette wird pro Poll nur einmal
 * geladen, kein serverübergreifender Cache.
 * @param basisVerzeichnis - Kontrollzustand-Wurzel (Default 'kontrollzustand', überschreibbar für Tests)
 * @returns Liste aller Lauf-Kopfdaten
 */
function sammleLaeufe(basisVerzeichnis = BASISVERZEICHNIS) {
  if (!existsSync(basisVerzeichnis)) return []
  const auftragMemo = new Map()
  return readdirSync(basisVerzeichnis, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((laufId) => sammleLaufKopfdaten(laufId, basisVerzeichnis, auftragMemo))
    .filter((kopfdaten) => kopfdaten !== null)
}

/** Verzeichnispräfix eines Auftrags unter basisVerzeichnis (Abschnitt 0 des Plans — registriereAuftrag→registriereKernArtefakt schreibt real unter lineage-auftrag-<auftragId>, nicht auftrag-<auftragId>). */
const AUFTRAG_VERZEICHNIS_PRAEFIX = 'lineage-auftrag-'

/**
 * Kopfdaten aller Aufträge unter basisVerzeichnis (AK4) — es gibt keine
 * Lineage-Registry-Funktion, die alle Artefakt-IDs einer Art listet
 * (Abschnitt 0), deshalb selbst per Verzeichnis-Scan gefiltert (Muster
 * sammleLaeufe). auftragstext bewusst NICHT enthalten (D4, Q2/Offene
 * Frage 2) — nur beim Start/in der Detailansicht relevant. Ein Auftrag,
 * dessen Kette keine gültige Version mehr liefert, wird übersprungen statt
 * den gesamten Request 500en zu lassen (Q4).
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @returns Kopfdaten je Auftrag, neueste zuerst (erstellt_am, Fallback Verzeichnis-mtime)
 */
function sammleAuftraege(basisVerzeichnis = BASISVERZEICHNIS) {
  if (!existsSync(basisVerzeichnis)) return []
  const eintraege = []
  for (const verzeichnisName of readdirSync(basisVerzeichnis, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()) {
    if (!verzeichnisName.startsWith(AUFTRAG_VERZEICHNIS_PRAEFIX)) continue
    const auftragId = verzeichnisName.slice(AUFTRAG_VERZEICHNIS_PRAEFIX.length)
    const version = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
    if (version === null) continue
    const erstelltAm = version.daten?.erstellt_am ?? statSync(join(basisVerzeichnis, verzeichnisName)).mtime.toISOString()
    eintraege.push({ auftragId, titel: version.daten?.titel, erstellt_am: erstelltAm })
  }
  eintraege.sort((a, b) => (a.erstellt_am < b.erstellt_am ? 1 : a.erstellt_am > b.erstellt_am ? -1 : 0))
  return eintraege
}

/** Reine Formprüfung eines POST /api/auftraege-Bodys (AK4) — beide Felder nicht-leere Strings, keine Zweitvalidierung des Auftragsinhalts über registriereAuftrags Feldregeln hinaus (D5, Q2). @param body - geparster JSON-Body @returns bei Erfolg titel/auftragstext, sonst grund der Ablehnung */
export function pruefeAuftragsformular(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, grund: 'Body muss ein JSON-Objekt sein' }
  }
  for (const feld of Object.keys(body)) {
    if (!ERLAUBTE_AUFTRAG_FELDER.has(feld)) {
      return { ok: false, grund: `unbekanntes Feld '${feld}'` }
    }
  }
  if (typeof body.titel !== 'string' || body.titel.length === 0) {
    return { ok: false, grund: "'titel' muss ein nicht-leerer String sein" }
  }
  if (typeof body.auftragstext !== 'string' || body.auftragstext.length === 0) {
    return { ok: false, grund: "'auftragstext' muss ein nicht-leerer String sein" }
  }
  return { ok: true, titel: body.titel, auftragstext: body.auftragstext }
}

const ENTSCHEIDUNG_ARTEN = new Set(['antwort', 'stale', 'terminal', 'kenntnisnahme'])
const ENTSCHEIDUNG_EINSTUFUNG_WERTE = new Set(['ERFOLGREICH', 'VERWEIGERT'])
const ENTSCHEIDUNG_ENTSCHEIDUNG_WERTE = new Set(['neu_erzeugen', 'nachtrag', 'unveraendert_gueltig'])
const ENTSCHEIDUNG_ERGEBNIS_WERTE = new Set(['ERFOLGREICH', 'VERWEIGERT', 'FEHLGESCHLAGEN'])

/**
 * Reine Formprüfung eines POST /api/entscheidungen-Bodys (F13 WS-2, AK3) —
 * lehnt ein unbekanntes `art`, eine unzulässige laufId (Muster GET
 * /api/laeufe/<laufId>, D5 — dieselbe Zeichenregel) und je Art fehlende/
 * ungültige Pflichtfelder ab, BEVOR irgendetwas geschrieben wird (D2).
 * `begruendung` ist bei art 'terminal' Pflicht (F-162, das Wirkungsmarke-
 * Schema kennt kein erzeuger-Feld) — bei 'stale' bleibt sie optional, die
 * eigentliche Pflicht nur bei entscheidung 'unveraendert_gueltig' erzwingt
 * bereits haltFestStaleEntscheidung selbst (D5, keine Zweitprüfung hier).
 * F13 WS-4: `begruendung` ist auch bei art 'kenntnisnahme' Pflicht — kein
 * `ergebnis`-Feld erlaubt, das kommt serverseitig aus stelleLaufstatusFest
 * (verhindert Divergenz zwischen angezeigtem und festgehaltenem Ergebnis).
 * @param body - geparster JSON-Body
 * @returns bei Erfolg die geprüften Felder, sonst { ok: false, grund }
 */
export function pruefeEntscheidungsformular(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, grund: 'Body muss ein JSON-Objekt sein' }
  }
  if (!ENTSCHEIDUNG_ARTEN.has(body.art)) {
    return { ok: false, grund: `unbekannte Entscheidungsart ${JSON.stringify(body.art)} — erlaubt: ${[...ENTSCHEIDUNG_ARTEN].join(', ')}` }
  }
  if (typeof body.laufId !== 'string' || body.laufId.length === 0) {
    return { ok: false, grund: "'laufId' muss ein nicht-leerer String sein" }
  }
  if (LAUFID_UNZULAESSIGE_ZEICHEN.test(body.laufId)) {
    return { ok: false, grund: `'laufId' enthält unzulässige Zeichen: ${JSON.stringify(body.laufId)}` }
  }

  if (body.art === 'antwort') {
    for (const feld of Object.keys(body)) {
      if (!new Set(['art', 'laufId', 'antwort', 'einstufung']).has(feld)) {
        return { ok: false, grund: `unbekanntes Feld '${feld}' für art 'antwort'` }
      }
    }
    if (typeof body.antwort !== 'string' || body.antwort.length === 0) {
      return { ok: false, grund: "'antwort' muss ein nicht-leerer String sein" }
    }
    if (!ENTSCHEIDUNG_EINSTUFUNG_WERTE.has(body.einstufung)) {
      return { ok: false, grund: `'einstufung' muss eines von ${[...ENTSCHEIDUNG_EINSTUFUNG_WERTE].join(', ')} sein, erhalten: ${JSON.stringify(body.einstufung)}` }
    }
    return { ok: true, art: 'antwort', laufId: body.laufId, antwort: body.antwort, einstufung: body.einstufung }
  }

  if (body.art === 'stale') {
    for (const feld of Object.keys(body)) {
      if (!new Set(['art', 'laufId', 'entscheidung', 'begruendung']).has(feld)) {
        return { ok: false, grund: `unbekanntes Feld '${feld}' für art 'stale'` }
      }
    }
    if (!ENTSCHEIDUNG_ENTSCHEIDUNG_WERTE.has(body.entscheidung)) {
      return { ok: false, grund: `'entscheidung' muss eines von ${[...ENTSCHEIDUNG_ENTSCHEIDUNG_WERTE].join(', ')} sein, erhalten: ${JSON.stringify(body.entscheidung)}` }
    }
    if (body.begruendung !== undefined && (typeof body.begruendung !== 'string' || body.begruendung.length === 0)) {
      return { ok: false, grund: "'begruendung' muss, wenn angegeben, ein nicht-leerer String sein" }
    }
    return { ok: true, art: 'stale', laufId: body.laufId, entscheidung: body.entscheidung, begruendung: body.begruendung }
  }

  if (body.art === 'kenntnisnahme') {
    for (const feld of Object.keys(body)) {
      if (!new Set(['art', 'laufId', 'begruendung']).has(feld)) {
        return { ok: false, grund: `unbekanntes Feld '${feld}' für art 'kenntnisnahme'` }
      }
    }
    if (typeof body.begruendung !== 'string' || body.begruendung.length === 0) {
      return { ok: false, grund: "'begruendung' muss ein nicht-leerer String sein (Pflichtfeld bei art 'kenntnisnahme')" }
    }
    return { ok: true, art: 'kenntnisnahme', laufId: body.laufId, begruendung: body.begruendung }
  }

  // art === 'terminal'
  for (const feld of Object.keys(body)) {
    if (!new Set(['art', 'laufId', 'ergebnis', 'begruendung']).has(feld)) {
      return { ok: false, grund: `unbekanntes Feld '${feld}' für art 'terminal'` }
    }
  }
  if (!ENTSCHEIDUNG_ERGEBNIS_WERTE.has(body.ergebnis)) {
    return { ok: false, grund: `'ergebnis' muss eines von ${[...ENTSCHEIDUNG_ERGEBNIS_WERTE].join(', ')} sein, erhalten: ${JSON.stringify(body.ergebnis)}` }
  }
  if (typeof body.begruendung !== 'string' || body.begruendung.length === 0) {
    return { ok: false, grund: "'begruendung' muss ein nicht-leerer String sein (F-162, Pflichtfeld bei art 'terminal')" }
  }
  return { ok: true, art: 'terminal', laufId: body.laufId, ergebnis: body.ergebnis, begruendung: body.begruendung }
}

function sendeDatei(res, pfad) {
  const inhalt = readFileSync(pfad)
  res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(pfad)] ?? 'application/octet-stream' })
  res.end(inhalt)
}

function sendeJson(res, statusCode, wert) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(wert))
}

/** Top-Level-Felder eines Startauftrags, die AusfuehrungsOptionen (src/execution-controller/types.ts) zuzuordnen sind — AK3, nie aus dem Body gelesen. */
export const VERBOTENE_OPTIONEN_FELDER = new Set([
  'schreiber',
  'basisVerzeichnis',
  'rohBasisVerzeichnis',
  'starter',
  'settingsPfad',
  'aktuelleAutorisierungPfad',
  'startfreigabeRepoWurzel',
  // F14 WS-1, AK2: neu in AusfuehrungsOptionen (src/execution-controller/types.ts), PFLICHT-Nachtrag.
  'zeitgrenzeMs',
])

/** Erlaubte Top-Level-Felder eines Startauftrags (AK2, F11 WS-2 AK4/AK5) — laufId plus die AusfuehrungsEingaben-Felder, die noch aus dem Body kommen, plus werkzeugsatz (Name aus der Startvorlage) und optional vorgaengerLaufId. werkzeugStartziel/werkzeugVersionDeklariert/berechtigungskontext/profilReferenz sind NICHT mehr erlaubt (VERBOTENE_STARTVORLAGE_FELDER) — sie kommen serverseitig aus der Startvorlage. */
const ERLAUBTE_STARTAUFTRAG_FELDER = new Set(['laufId', 'rolle', 'anfragen', 'budget', 'aufrufEingaben', 'auftragId', 'werkzeugsatz', 'vorgaengerLaufId'])

/** F11 WS-2, AK5: diese vier Felder sind jetzt Sache der Startvorlage, nicht mehr des Body — ein Vorkommen wird wie ein AusfuehrungsOptionen-Feld mit 400 abgelehnt, nicht still ignoriert. */
export const VERBOTENE_STARTVORLAGE_FELDER = new Set(['werkzeugStartziel', 'werkzeugVersionDeklariert', 'berechtigungskontext', 'profilReferenz'])

/** F12 WS-2, AK5: auftragstext kommt jetzt ausschließlich aus dem Auftragsartefakt (ladeArtefaktVersion) — ein Vorkommen im Body wird wie ein Startvorlage-Feld mit 400 abgelehnt, nicht still ignoriert (Muster F11 WS-2 AK5). */
export const VERBOTENE_AUFTRAG_FELDER = new Set(['auftragstext'])

/** Erlaubte Top-Level-Felder eines POST /api/auftraege-Bodys (AK4). */
const ERLAUBTE_AUFTRAG_FELDER = new Set(['titel', 'auftragstext'])

/** Spiegelt src/checkpoint-store/index.ts' pruefeLaufId (nicht exportiert) — dieselbe rein strukturelle Zeichenregel, kein zweiter fachlicher Regelsatz (D5). Fängt einen unzulässigen Wert ab, BEVOR laufIdBelegt() ihn ungeprüft in einen existsSync-Pfad einsetzt. */
const LAUFID_UNZULAESSIGE_ZEICHEN = /[/\\]|\.\.|[\u0000-\u001f]/

const PFLICHT_STARTAUFTRAG_FELDER = ['laufId', 'rolle', 'anfragen', 'budget', 'aufrufEingaben', 'auftragId', 'werkzeugsatz']

/**
 * Prüft einen geparsten Startauftrag-Body gegen AK2/AK3 und F11 WS-2
 * AK5/AK6: nur die genannten Felder sind erlaubt, ein AusfuehrungsOptionen-
 * oder Startvorlage-Feld oder ein sonstiges unbekanntes Feld führt zur
 * Ablehnung — nicht stillem Ignorieren. Reine Formprüfung (Pflichtfelder,
 * Grundtypen), keine Datei-/Netz-I/O: die Auflösung von werkzeugsatz gegen
 * die Startvorlage und das Lesen der Evidenzdateien (AK6) macht der
 * Aufrufer danach. Die fachliche Prüfung von Rolle/Anfragen/Budget/
 * Aufrufkonstruktion bleibt F5/F6a vorbehalten (D5 — kein zweiter,
 * selbstgebauter Regelsatz).
 * @param body - geparster JSON-Body
 * @returns bei Erfolg laufId/werkzeugsatzName/eingaben, sonst grund der Ablehnung
 */
export function pruefeStartauftrag(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, grund: 'Body muss ein JSON-Objekt sein' }
  }

  for (const feld of Object.keys(body)) {
    if (VERBOTENE_OPTIONEN_FELDER.has(feld)) {
      return { ok: false, grund: `Feld '${feld}' gehört zu AusfuehrungsOptionen und wird nicht aus dem Body gelesen (AK3)` }
    }
    if (VERBOTENE_STARTVORLAGE_FELDER.has(feld)) {
      return { ok: false, grund: `Feld '${feld}' gehört zur Startvorlage und wird nicht mehr aus dem Body gelesen (F11 WS-2 AK5)` }
    }
    if (VERBOTENE_AUFTRAG_FELDER.has(feld)) {
      return { ok: false, grund: `Feld '${feld}' wird serverseitig aus dem Auftragsartefakt geladen und nicht mehr aus dem Body gelesen (F12 WS-2 AK5)` }
    }
    if (!ERLAUBTE_STARTAUFTRAG_FELDER.has(feld)) {
      return { ok: false, grund: `unbekanntes Feld '${feld}'` }
    }
  }

  for (const feld of PFLICHT_STARTAUFTRAG_FELDER) {
    if (!(feld in body)) {
      return { ok: false, grund: `Pflichtfeld '${feld}' fehlt` }
    }
  }

  if (typeof body.laufId !== 'string' || body.laufId.length === 0) {
    return { ok: false, grund: "'laufId' muss ein nicht-leerer String sein" }
  }
  if (LAUFID_UNZULAESSIGE_ZEICHEN.test(body.laufId)) {
    return { ok: false, grund: `'laufId' enthält unzulässige Zeichen: ${JSON.stringify(body.laufId)}` }
  }
  if (typeof body.werkzeugsatz !== 'string' || body.werkzeugsatz.length === 0) {
    return { ok: false, grund: "'werkzeugsatz' muss ein nicht-leerer String sein (F11 WS-2 AK5 — Name eines in der Startvorlage benannten Werkzeugsatzes)" }
  }
  if (typeof body.auftragId !== 'string' || body.auftragId.length === 0) {
    return { ok: false, grund: "'auftragId' muss ein nicht-leerer String sein (F12 WS-2 AK5)" }
  }
  if (typeof body.aufrufEingaben === 'object' && body.aufrufEingaben !== null && !Array.isArray(body.aufrufEingaben) && 'werkzeugsatz' in body.aufrufEingaben) {
    return {
      ok: false,
      grund: "'aufrufEingaben.werkzeugsatz' ist eine freie erlaubte_werkzeuge-Liste und nicht mehr erlaubt (F11 WS-2 AK5) — wähle stattdessen einen benannten Werkzeugsatz über das Top-Level-Feld 'werkzeugsatz'",
    }
  }
  if (!Array.isArray(body.anfragen)) {
    return { ok: false, grund: "'anfragen' muss ein Array sein" }
  }
  for (const anfrage of body.anfragen) {
    if (typeof anfrage !== 'object' || anfrage === null || Array.isArray(anfrage)) {
      return { ok: false, grund: 'jede Anfrage muss ein Objekt sein' }
    }
    if ('inhalt' in anfrage) {
      return { ok: false, grund: "eine Anfrage darf kein Feld 'inhalt' enthalten — der Server liest die Datei selbst (F11 WS-2 AK6)" }
    }
    if (typeof anfrage.pfad !== 'string' || anfrage.pfad.length === 0) {
      return { ok: false, grund: "jede Anfrage braucht ein nicht-leeres 'pfad'-Feld" }
    }
  }
  if (body.vorgaengerLaufId !== undefined && typeof body.vorgaengerLaufId !== 'string') {
    return { ok: false, grund: "'vorgaengerLaufId' muss ein String sein" }
  }

  return {
    ok: true,
    laufId: body.laufId,
    werkzeugsatzName: body.werkzeugsatz,
    eingaben: {
      rolle: body.rolle,
      anfragen: body.anfragen,
      budget: body.budget,
      aufrufEingaben: body.aufrufEingaben,
      auftragId: body.auftragId,
      ...(body.vorgaengerLaufId !== undefined ? { vorgaengerLaufId: body.vorgaengerLaufId } : {}),
    },
  }
}

/**
 * Löst einen von einem Startauftrag benannten Evidenzpfad sicher gegen die
 * Repo-Wurzel auf (F11 WS-2, AK6). Reine Funktion, keine I/O — existsSync/
 * readFileSync bleiben Sache des Aufrufers. Drei Rot-Fälle, in dieser
 * Reihenfolge geprüft: absoluter Pfad, ein '..'-Segment, außerhalb der
 * Repo-Wurzel aufgelöst. Der dritte Fall nutzt F3s leiteRepoRelativenPfadAb
 * wieder (D5, keine zweite Pfadprüfung) — nach den ersten beiden Prüfungen
 * kann `join(repoWurzel, pfad)` die Repo-Wurzel nicht mehr über '..'
 * verlassen, die Wiederverwendung ist zusätzliche Tiefenverteidigung, kein
 * Ersatz für die ersten beiden Prüfungen.
 *
 * Bekannte Grenze (Reviewer-Pass, F11 WS-2): geprüft wird nur die logische
 * Pfad-Zeichenkette, nicht der aufgelöste Realpfad. Ein Symlink innerhalb
 * der Repo-Wurzel, der nach außen zeigt, besteht alle drei Prüfungen und
 * das anschließende readFileSync läse real außerhalb der Repo-Wurzel.
 * Angesichts des Bedrohungsmodells (Server bindet nur auf 127.0.0.1, ein
 * einziger lokaler Nutzer, F10 AK4) kein Blocker für WS-2, aber bewusst
 * nicht durch diese Funktion abgedeckt.
 *
 * CI-Rotfall (F11 WS-2, real auf dem Linux-CI-Runner beobachtet, lokal unter
 * Windows grün): node:path's isAbsolute() ist plattformabhängig — unter
 * POSIX erkennt es einen Windows-Laufwerksbuchstaben-Pfad (`C:\...`) oder
 * einen UNC-Pfad (`\\...`) NICHT als absolut, weil ein Doppelpunkt bzw.
 * Backslash dort kein reserviertes Pfad-Zeichen ist. AK6 verlangt aber die
 * Ablehnung JEDES absoluten Pfads, unabhängig vom Ausführungs-Betriebssystem
 * (das Repo läuft nachweislich auf beiden — CI auf Linux, Stefans
 * Dev-Rechner auf Windows). Deshalb zusätzlich zu isAbsolute() explizit auf
 * beide Muster geprüft, statt sich auf das plattformabhängige Verhalten von
 * node:path allein zu verlassen.
 * @param pfad - vom Startauftrag gelieferter Pfad (anfrage.pfad)
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel
 * @returns bei Erfolg den repo-relativen Pfad, sonst einen Ablehnungsgrund
 */
const WINDOWS_LAUFWERKSBUCHSTABE_PFAD = /^[a-zA-Z]:[\\/]/
const WINDOWS_UNC_PFAD = /^\\\\/

export function loeseEvidenzPfadAuf(pfad, repoWurzel) {
  if (isAbsolute(pfad) || WINDOWS_LAUFWERKSBUCHSTABE_PFAD.test(pfad) || WINDOWS_UNC_PFAD.test(pfad)) {
    return { ok: false, grund: 'Pfad ist absolut' }
  }
  if (pfad.split(/[/\\]/).includes('..')) {
    return { ok: false, grund: "Pfad enthält ein '..'-Segment" }
  }
  const relativerPfad = leiteRepoRelativenPfadAb(join(repoWurzel, pfad), repoWurzel)
  if (relativerPfad === null) {
    return { ok: false, grund: 'Pfad liegt außerhalb der Repo-Wurzel' }
  }
  return { ok: true, relativerPfad }
}

/** Baut einen lesbaren Ablehnungsgrund aus einem ok:false-AusfuehrungsErgebnis (F5- oder F6a-Stufe). @param ergebnis - ok:false-Zweig von AusfuehrungsErgebnis @returns lesbarer Text für die Startfehlerliste */
function beschreibeAblehnung(ergebnis) {
  if (ergebnis.stufe === 'kontextpaket') {
    return `F5-Ablehnung (${ergebnis.ergebnis.grund})`
  }
  return `F6a-Ablehnung: ${ergebnis.grund}`
}

/** Sammelt den Request-Body eines eingehenden Requests als Text. @param req - eingehender Request @returns Body als Text */
function leseBody(req) {
  return new Promise((resolve, reject) => {
    let daten = ''
    req.on('data', (chunk) => {
      daten += chunk
    })
    req.on('end', () => resolve(daten))
    req.on('error', reject)
  })
}

/**
 * Baut den Request-Handler des Leitstands. Eigener, in sich
 * abgeschlossener In-Memory-Zustand je Aufruf (angenommene laufIds,
 * Startfehlerliste, F11 WS-2 zusätzlich laufAktiv/D13) — erlaubt
 * parallele, voneinander unabhängige Serverinstanzen in Tests
 * (scripts/check-f10-leitstand.mjs). Die Startvorlage wird einmal beim
 * Aufbau geladen und validiert (ladeStartvorlage wirft bei Fehlschlag —
 * ein Konfigurationsfehler des Servers, kein Fachergebnis eines
 * Startauftrags), ProfilReferenz wird daraus einmal frisch abgeleitet
 * (leiteProfilReferenzAb) statt je Request neu von der Platte gelesen zu
 * werden — die Profildatei ändert sich während eines Serverlaufs nicht
 * ([EMPFEHLUNG], YAGNI).
 * @param optionen - fuehreAufgabeDurchFn (Default: die echte F8-Funktion, austauschbar für Tests, Muster wie F6as Starter), basisVerzeichnis (Default 'kontrollzustand'), publicVerzeichnis (Default public/leitstand), startvorlagePfad (Default startvorlagen/beispielprojekt.json), repoWurzel (Default process.cwd(), für AK6-Pfadsicherheit)
 * @returns Node-http-Request-Handler
 */
export function erzeugeRequestHandler(optionen = {}) {
  const {
    fuehreAufgabeDurchFn = fuehreAufgabeDurch,
    basisVerzeichnis = BASISVERZEICHNIS,
    publicVerzeichnis = PUBLIC_VERZEICHNIS,
    startvorlagePfad = STANDARD_STARTVORLAGE_PFAD,
    repoWurzel = process.cwd(),
  } = optionen

  const vorlage = ladeStartvorlage(startvorlagePfad)
  const profilReferenz = leiteProfilReferenzAb(vorlage)

  /** Synchron VOR dem fuehreAufgabeDurch-Aufruf reservierte laufIds dieser Serverinstanz (AK5) — die erste run_prepared-Marke liegt erst Sekunden später auf der Platte. */
  const angenommeneLaufIds = new Set()
  /** Flüchtige Projektion eines Wurfs aus fuehreAufgabeDurch (AK6) — kein Zustand, keine Datei unter kontrollzustand/, geht bei Serverneustart verloren. */
  const startfehlerListe = []
  /** F11 WS-2, AK7 (D13): true, solange ein über diese Serverinstanz gestarteter Lauf den fuehreAufgabeDurch-Aufruf noch nicht durch .then/.catch verlassen hat. NIE aus kontrollzustand/ abgeleitet (F-128) — ein Serverneustart setzt sie zurück, ein alter, verwaister KLAERUNG_ERFORDERLICH-Lauf aus einem früheren Serverlauf blockiert nicht. */
  let laufAktiv = false
  /** laufId des gerade aktiven Laufs (QA-Hinweis, F11 WS-2) — nur für die 409-Ablehnungsmeldung unten, keine eigene Fachbedeutung. */
  let laufAktivLaufId = null

  /** Prüft AK5(a)+(b): laufId hat bereits ein Verzeichnis unter kontrollzustand/, oder ist in dieser Serverinstanz schon reserviert. @param laufId - zu prüfende laufId @returns true, wenn laufId belegt ist */
  function laufIdBelegt(laufId) {
    return angenommeneLaufIds.has(laufId) || existsSync(join(basisVerzeichnis, laufId))
  }

  return async function requestHandler(req, res) {
    const pfad = new URL(req.url, `http://${req.headers.host}`).pathname

    // Detailendpunkt (AK2) VOR dem Listenendpunkt geprüft — längeres, spezielleres
    // Präfix zuerst. laufId wird nach decodeURIComponent gegen dieselbe Zeichenregel
    // wie ein Startauftrag geprüft (Offene Frage 2/Advisor-Entscheidung), BEVOR sie
    // in join(basisVerzeichnis, laufId) eingesetzt wird — sonst 400 statt Pfad-Escape.
    if (req.method === 'GET' && pfad.startsWith('/api/laeufe/')) {
      const laufId = decodeURIComponent(pfad.slice('/api/laeufe/'.length))
      if (LAUFID_UNZULAESSIGE_ZEICHEN.test(laufId)) {
        sendeJson(res, 400, { grund: `laufId enthält unzulässige Zeichen: ${JSON.stringify(laufId)}` })
        return
      }
      if (!existsSync(join(basisVerzeichnis, laufId))) {
        sendeJson(res, 404, { grund: `Lauf '${laufId}' nicht gefunden` })
        return
      }

      // F12 WS-3 (AK7/AK8): vier Zusatzquellen, jede unabhängig ladbar/fehlerfähig (2.1) —
      // kontextpaket zuerst (auftrag hängt kausal davon ab, Befund 2), laufakte danach (eigene
      // Artefaktkette), rohstrom nutzt dieselbe laufakteVersion (kein zweiter Ladevorgang).
      const kontextpaketVersion = ladeKontextpaketVersion(laufId, basisVerzeichnis)
      const laufakteVersion = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      const laufStatus = stelleLaufstatusFest(laufId, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })

      sendeJson(res, 200, {
        laufId,
        checkpoints: sammleCheckpoints(laufId, basisVerzeichnis),
        laufStatus,
        verweigertDaten: baueVerweigertDatenProjektion(laufId, laufStatus, basisVerzeichnis),
        kontextpaket: baueKontextpaketProjektion(kontextpaketVersion),
        auftrag: baueAuftragsbezug(kontextpaketVersion, basisVerzeichnis),
        laufakte: baueLaufakteProjektion(laufakteVersion),
        rohstrom: baueRohstromProjektion(laufakteVersion, repoWurzel),
      })
      return
    }

    if (req.method === 'GET' && pfad === '/api/laeufe') {
      sendeJson(res, 200, sammleLaeufe(basisVerzeichnis))
      return
    }

    if (req.method === 'GET' && pfad === '/api/startfehler') {
      sendeJson(res, 200, startfehlerListe)
      return
    }

    if (req.method === 'GET' && pfad === '/api/auftraege') {
      sendeJson(res, 200, sammleAuftraege(basisVerzeichnis))
      return
    }

    if (req.method === 'GET' && pfad === '/api/startvorlage/werkzeugsaetze') {
      // AK6, D5: strikte Allowlist — nie art/werkzeugStartziel/berechtigungskontext/profilReferenz ausliefern.
      const werkzeugsaetze = Object.entries(vorlage.werkzeugsaetze).map(([name, w]) => ({ name, modus: w.modus, erlaubte_werkzeuge: w.erlaubte_werkzeuge }))
      sendeJson(res, 200, werkzeugsaetze)
      return
    }

    if (req.method === 'POST' && pfad === '/api/auftraege') {
      let body
      try {
        const roh = await leseBody(req)
        body = JSON.parse(roh.length === 0 ? '{}' : roh)
      } catch (fehler) {
        sendeJson(res, 400, { grund: `Body ist kein gültiges JSON (${fehler.message})` })
        return
      }

      const pruefung = pruefeAuftragsformular(body)
      if (!pruefung.ok) {
        sendeJson(res, 400, { grund: pruefung.grund })
        return
      }

      // D1: auftragId wird serverseitig per randomUUID() erzeugt, nie vom Client gewählt (AK4).
      const auftragId = randomUUID()
      // registriereAuftrag führt echte, synchrone Disk-I/O aus und kann werfen (Disk voll,
      // Berechtigungsfehler, transientes Sperrverhalten — CLAUDE.md "Bekannte Fallen"). requestHandler
      // ist eine async function, deren Promise niemand awaitet — ein ungefangener Wurf würde zur
      // unhandled promise rejection und (Node 24) zum Prozessabsturz führen, Reviewer-Pass F12 WS-2.
      try {
        registriereAuftrag(auftragId, profilReferenz, pruefung.titel, pruefung.auftragstext, { basisVerzeichnis })
      } catch (fehler) {
        console.error(`[leitstand] Auftrag '${auftragId}' konnte nicht registriert werden:`, fehler)
        sendeJson(res, 500, { grund: `Auftrag konnte nicht registriert werden: ${fehler.message}` })
        return
      }
      sendeJson(res, 201, { auftragId })
      return
    }

    if (req.method === 'POST' && pfad === '/api/laeufe') {
      let body
      try {
        const roh = await leseBody(req)
        body = JSON.parse(roh.length === 0 ? '{}' : roh)
      } catch (fehler) {
        sendeJson(res, 400, { grund: `Body ist kein gültiges JSON (${fehler.message})` })
        return
      }

      const startauftrag = pruefeStartauftrag(body)
      if (!startauftrag.ok) {
        sendeJson(res, 400, { grund: startauftrag.grund })
        return
      }

      // F11 WS-2, AK7 (D13): genau ein aktiver Arbeitsstrang je Serverinstanz — geprüft VOR der
      // laufId-spezifischen 409-Prüfung unten, weil D13 unabhängig von der konkreten laufId gilt.
      if (laufAktiv) {
        sendeJson(res, 409, { grund: `ein anderer, über diese Serverinstanz gestarteter Lauf ('${laufAktivLaufId}') ist noch aktiv (D13) — genau ein aktiver Arbeitsstrang` })
        return
      }

      const { laufId, werkzeugsatzName, eingaben: eingabenRoh } = startauftrag
      if (laufIdBelegt(laufId)) {
        sendeJson(res, 409, { grund: `laufId '${laufId}' ist bereits vergeben` })
        return
      }

      // F12 WS-2, AK5: auftragId-Existenzprüfung SYNCHRON, vor jeder Zustandsänderung (Reservierung/202) —
      // anders als das vorgaengerLaufId-Muster in fuehreAufgabeDurch, das erst NACH der 202-Antwort wirft
      // (D2, Plan Abschnitt 0/4). ladeArtefaktVersion ist rein synchron, kein Umbau nötig.
      // Reihenfolge bewusst NACH D13/laufIdBelegt (nicht davor, wie der ursprüngliche Plantext vorsah) —
      // Stefans Korrektur zum Bauauftrag: D13 ist unbedingt und läuft vor jedem request-feld-spezifischen
      // Check, weil es unabhängig vom konkreten Request gilt (Prinzip aus F11 WS-2). D13/laufIdBelegt sind
      // reine Lesezugriffe ohne Zustandsänderung — AK5s "vor jeder Zustandsänderung" bleibt davon unberührt.
      const auftragVersion = ladeArtefaktVersion(`auftrag-${eingabenRoh.auftragId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      if (auftragVersion === null) {
        sendeJson(res, 400, { grund: `Auftrag '${eingabenRoh.auftragId}' nicht gefunden` })
        return
      }

      // F11 WS-2, AK4/AK5: Werkzeugsatz nur über seinen Namen aus der Startvorlage, nie über eine freie Liste.
      const werkzeugsatz = loeseWerkzeugsatzAuf(vorlage, werkzeugsatzName)
      if (werkzeugsatz === undefined) {
        sendeJson(res, 400, { grund: `unbekannter Werkzeugsatz '${werkzeugsatzName}' — bekannt: ${Object.keys(vorlage.werkzeugsaetze).join(', ')}` })
        return
      }

      // F11 WS-2, AK6: der Server liest jede benannte Evidenzdatei selbst — Pfadsicherheit VOR dem Lesen, fehlende Datei → 400, nie leerer Inhalt.
      const anfragenMitInhalt = []
      for (const anfrage of eingabenRoh.anfragen) {
        const pfadErgebnis = loeseEvidenzPfadAuf(anfrage.pfad, repoWurzel)
        if (!pfadErgebnis.ok) {
          sendeJson(res, 400, { grund: `Anfrage-Pfad '${anfrage.pfad}': ${pfadErgebnis.grund}` })
          return
        }
        const zielPfad = join(repoWurzel, pfadErgebnis.relativerPfad)
        if (!existsSync(zielPfad) || !statSync(zielPfad).isFile()) {
          sendeJson(res, 400, { grund: `Anfrage-Pfad '${anfrage.pfad}': Datei nicht gefunden` })
          return
        }
        let inhalt
        try {
          inhalt = readFileSync(zielPfad, 'utf8')
        } catch (fehler) {
          sendeJson(res, 400, { grund: `Anfrage-Pfad '${anfrage.pfad}': nicht lesbar (${fehler.message})` })
          return
        }
        anfragenMitInhalt.push({ ...anfrage, inhalt })
      }

      const eingaben = {
        rolle: eingabenRoh.rolle,
        anfragen: anfragenMitInhalt,
        budget: eingabenRoh.budget,
        aufrufEingaben: { ...eingabenRoh.aufrufEingaben, werkzeugsatz: { modus: werkzeugsatz.modus, erlaubte_werkzeuge: werkzeugsatz.erlaubte_werkzeuge } },
        werkzeugStartziel: vorlage.werkzeugStartziel,
        werkzeugVersionDeklariert: vorlage.werkzeugVersionDeklariert,
        berechtigungskontext: vorlage.berechtigungskontext,
        auftragstext: auftragVersion.daten.auftragstext,
        auftragId: eingabenRoh.auftragId,
        ...(eingabenRoh.vorgaengerLaufId !== undefined ? { vorgaengerLaufId: eingabenRoh.vorgaengerLaufId } : {}),
      }

      // Reservierung SYNCHRON vor dem fuehreAufgabeDurch-Aufruf (AK5) — sonst gewinnt bei zwei
      // unmittelbar aufeinanderfolgenden POSTs derselbe laufId-Wert zweimal die Prüfung oben.
      angenommeneLaufIds.add(laufId)
      laufAktiv = true
      laufAktivLaufId = laufId
      sendeJson(res, 202, { laufId })

      // Fire-and-forget mit Pflicht-.catch() (AK6) — ein Wurf aus fuehreAufgabeDurch beendet den
      // Server nicht. laufAktiv wird in JEDEM Fall zurückgesetzt (AK7, D13) — anders als die
      // laufId-Reservierung, die nur bei ok:false/Wurf freigegeben wird. Bei Ablehnung durch F5/F6a
      // (ok:false) oder Wurf wird die In-Memory-Reservierung wieder freigegeben (AK5). Ein
      // korrigierter Retry unter DERSELBEN laufId gelingt danach nur, wenn die Ablehnung keinen
      // Checkpoint geschrieben hat (reine F5-Ablehnung, oder F6as pruefeStartziel-Zweig) —
      // laufIdBelegt() prüft zusätzlich das Dateisystem, und die meisten F6a-Ablehnungen
      // (Invocation Policy, E-182, fehlende/ungültige Autorisierung, Startfreigabe ABGELEHNT)
      // schreiben über verweigereStart bereits eine reale VERWEIGERT-Wirkungsmarke, BEVOR
      // starteGateway ok:false zurückgibt — die laufId bleibt danach absichtlich belegt (F1s
      // Hash-Kette ist append-only, kein Überschreiben eines persistierten Artefakts,
      // ARCHITECTURE.md §7). Ein Retry braucht dann eine neue laufId.
      // F-145: dieselben Optionen, mit denen erzeugeRequestHandler selbst aufgerufen wurde,
      // strukturell durchgereicht (nicht basisVerzeichnis einzeln herauskopiert) — sonst
      // respektieren die synchronen Prüfungen oben (D13, laufIdBelegt, auftragId-Existenz) ein
      // Nicht-Default-basisVerzeichnis, der eigentliche Lauf aber nicht (stille Divergenz). Extra
      // Felder von optionen (fuehreAufgabeDurchFn/publicVerzeichnis/startvorlagePfad/repoWurzel),
      // die AusfuehrungsOptionen nicht kennt: fuehreAufgabeDurch kopiert für starteGateway nur die
      // sieben bekannten Felder einzeln heraus (src/execution-controller/index.ts, F-107), das rohe
      // Objekt selbst reicht es nur an die F9-Eskalationshelfer (erfasseBedarf/erzeugeTransportpaket/
      // haendigeAus) unverändert weiter — auch die lesen nur bekannte Felder per Property-Zugriff,
      // Extrafelder bleiben überall ungelesen (D5, kein Verhalten im Default-Fall geändert).
      fuehreAufgabeDurchFn(laufId, profilReferenz, eingaben, optionen)
        .then((ergebnis) => {
          laufAktiv = false
          laufAktivLaufId = null
          if (ergebnis.ok === false) {
            angenommeneLaufIds.delete(laufId)
            const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: beschreibeAblehnung(ergebnis) }
            startfehlerListe.push(eintrag)
            console.error(`[leitstand] Lauf '${laufId}' abgelehnt:`, eintrag.fehler)
          }
        })
        .catch((fehler) => {
          laufAktiv = false
          laufAktivLaufId = null
          angenommeneLaufIds.delete(laufId)
          const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: String(fehler?.message ?? fehler) }
          startfehlerListe.push(eintrag)
          console.error(`[leitstand] Lauf '${laufId}' fehlgeschlagen:`, fehler)
        })
      return
    }

    // F13 WS-2 (AK3-AK7): einziger Entscheidungs-Schreibpfad — kein laufAktiv-Bezug (AK6, D13
    // gilt nur für Laufstarts), keine eigene Schreibfunktion (D5): ausschließlich importiereAntwort/
    // entscheideStale/schreibeWirkungsmarke, synchron, unbekanntes `art` und fehlende Pflichtfelder
    // (inkl. F-162s begruendung bei 'terminal') werden VOR jedem Aufruf abgelehnt (D2). F13 WS-4
    // (F-166/F-167): zusätzlich eine vierte Art 'kenntnisnahme' — beide Arten 'terminal'/
    // 'kenntnisnahme' prüfen VOR jedem Schreiben den echten Laufstatus (stelleLaufstatusFest).
    if (req.method === 'POST' && pfad === '/api/entscheidungen') {
      let body
      try {
        const roh = await leseBody(req)
        body = JSON.parse(roh.length === 0 ? '{}' : roh)
      } catch (fehler) {
        sendeJson(res, 400, { grund: `Body ist kein gültiges JSON (${fehler.message})` })
        return
      }

      const pruefung = pruefeEntscheidungsformular(body)
      if (!pruefung.ok) {
        sendeJson(res, 400, { grund: pruefung.grund })
        return
      }

      // Eine geworfene Vorbedingungsverletzung (keine bestehende transport-<laufId>-Kette,
      // D3-Muster) ist bei (a)/(b) korrekt, kein Bug — 400 mit Klartext statt 500/Absturz.
      try {
        if (pruefung.art === 'antwort') {
          const ergebnis = importiereAntwort(pruefung.laufId, profilReferenz, { antwort: pruefung.antwort }, pruefung.einstufung, optionen)
          if (ergebnis.ok === false) {
            sendeJson(res, 400, { grund: ergebnis.grund })
            return
          }
          sendeJson(res, 200, { versionSequenz: ergebnis.versionSequenz })
          return
        }
        if (pruefung.art === 'stale') {
          const ergebnis = entscheideStale(pruefung.laufId, profilReferenz, pruefung.entscheidung, pruefung.begruendung, optionen)
          sendeJson(res, 200, ergebnis)
          return
        }

        // F13 WS-4 (F-167): 'terminal' und 'kenntnisnahme' brauchen beide den aktuellen
        // Laufstatus VOR jedem Schreiben (D2) — derselbe synchrone Aufruf, den auch der
        // GET /api/laeufe/<laufId>-Detailendpunkt nutzt (D5, kein zweiter Regelsatz).
        const laufStatus = stelleLaufstatusFest(pruefung.laufId, optionen)

        if (pruefung.art === 'terminal') {
          // F-167: vorher ungeprüft — konnte auf einem bereits ABGESCHLOSSENEN Lauf eine
          // verwaiste zweite Terminalmarke erzeugen. 'terminal' löst ausschließlich die von
          // stelleLaufstatusFest selbst benannte aufloesungsbedingung auf.
          if (laufStatus.status !== 'KLAERUNG_ERFORDERLICH') {
            sendeJson(res, 400, { grund: `art 'terminal' ist nur bei Status KLAERUNG_ERFORDERLICH erlaubt (F-167), aktueller Status: ${laufStatus.status}` })
            return
          }
          // art === 'terminal': F-162 — begruendung landet als daten.mensch_begruendung, das
          // Wirkungsmarke-Schema selbst kennt kein erzeuger-Feld.
          const ergebnis = schreibeWirkungsmarke(
            pruefung.laufId,
            profilReferenz,
            'terminal',
            { ergebnis: pruefung.ergebnis, daten: { mensch_begruendung: pruefung.begruendung } },
            optionen
          )
          // F13 WS-3 (AK5, nur art:'terminal' — Stefan-Entscheidung, siehe features/F13/feature.md):
          // die Wirkungsmarke allein ist für eine Wiederaufnahme unsichtbar (context-builder liest nie
          // selbst von der Platte, execution-controller löst 'artefakt:'-Pfade ausschließlich gegen
          // per registriereKernArtefakt registrierte Lineage-Artefakte auf). Deshalb zusätzlich als
          // eigenes Lineage-Artefakt registriert, exakt nach dem Transportpaket-Vorbild
          // (human-transport/index.ts:106-138) — kein neues Schema, daten bleibt unknown wie dort (D5).
          const entscheidungsArtefakt = registriereKernArtefakt(
            `entscheidung-${pruefung.laufId}`,
            profilReferenz,
            { erzeuger: 'mensch', schritt: 'entscheidung-terminal' },
            { entscheidung_schema: 'v0', ergebnis: pruefung.ergebnis, begruendung: pruefung.begruendung, entschieden_am: new Date().toISOString() },
            [],
            optionen
          )
          sendeJson(res, 200, { ...ergebnis, artefaktId: `entscheidung-${pruefung.laufId}`, versionSequenz: entscheidungsArtefakt.versionSequenz })
          return
        }

        // art === 'kenntnisnahme' (F13 WS-4, F-166): der Lauf ist bereits terminal — keine
        // zweite Wirkungsmarke, nur dieselbe Lineage-Registrierung wie im terminal-Zweig (D5).
        // ergebnis kommt ausschließlich aus laufStatus, nie vom Client (verhindert Divergenz
        // zwischen angezeigtem und festgehaltenem Ergebnis).
        if (laufStatus.status !== 'ABGESCHLOSSEN' || (laufStatus.ergebnis !== 'VERWEIGERT' && laufStatus.ergebnis !== 'FEHLGESCHLAGEN')) {
          const statusText = laufStatus.status === 'ABGESCHLOSSEN' ? `${laufStatus.status} (${laufStatus.ergebnis})` : laufStatus.status
          sendeJson(res, 400, { grund: `art 'kenntnisnahme' ist nur bei Status ABGESCHLOSSEN mit Ergebnis VERWEIGERT oder FEHLGESCHLAGEN erlaubt, aktueller Status: ${statusText}` })
          return
        }
        // QA-Befund (F13 WS-4): ein VERWEIGERT MIT echtem Bypass-Verdacht ist der E-186-Fall —
        // renderEntscheidungBlock zeigt dafür bewusst 'antwort' statt 'kenntnisnahme' (app.js,
        // hatBypassVerdacht). Diese client-seitige Weiche allein wäre ein zweiter, nur im Client
        // durchgesetzter Regelsatz (Verstoß gegen "Server ist maßgeblich") — deshalb serverseitig
        // gespiegelt, über dieselbe Projektion (baueVerweigertDatenProjektion), die auch das
        // GET /api/laeufe/<laufId>-Detail nutzt (D5, kein zweiter Regelsatz, keine neue Prüfung).
        if (laufStatus.ergebnis === 'VERWEIGERT') {
          const verweigertDaten = baueVerweigertDatenProjektion(pruefung.laufId, laufStatus, basisVerzeichnis)
          if (typeof verweigertDaten?.bypassVerdachtAnzahl === 'number' && verweigertDaten.bypassVerdachtAnzahl > 0) {
            sendeJson(res, 400, {
              grund: `art 'kenntnisnahme' ist bei VERWEIGERT mit Bypass-Verdacht (bypass_verdacht_anzahl=${verweigertDaten.bypassVerdachtAnzahl}) nicht erlaubt — das ist der E-186-Fall, der eine echte Antwort (art 'antwort') statt einer bloßen Kenntnisnahme erfordert`,
            })
            return
          }
        }
        const kenntnisnahmeArtefakt = registriereKernArtefakt(
          `entscheidung-${pruefung.laufId}`,
          profilReferenz,
          { erzeuger: 'mensch', schritt: 'entscheidung-kenntnisnahme' },
          { entscheidung_schema: 'v0', ergebnis: laufStatus.ergebnis, begruendung: pruefung.begruendung, entschieden_am: new Date().toISOString() },
          [],
          optionen
        )
        sendeJson(res, 200, { artefaktId: `entscheidung-${pruefung.laufId}`, versionSequenz: kenntnisnahmeArtefakt.versionSequenz })
        return
      } catch (fehler) {
        sendeJson(res, 400, { grund: fehler.message })
        return
      }
    }

    const statischerPfad = join(publicVerzeichnis, pfad === '/' ? 'index.html' : pfad)
    if (statischerPfad.startsWith(publicVerzeichnis) && existsSync(statischerPfad) && statSync(statischerPfad).isFile()) {
      sendeDatei(res, statischerPfad)
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Nicht gefunden')
  }
}

// Nur beim direkten Aufruf (`npm run leitstand`) tatsächlich binden — ein Import dieser Datei aus
// scripts/check-f10-leitstand.mjs darf keinen echten Server starten.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createServer(erzeugeRequestHandler())
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Leitstand läuft auf http://127.0.0.1:${PORT}`)
  })
}
