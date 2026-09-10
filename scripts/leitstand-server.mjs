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
 * F14 WS-4 (features/F14/feature.md, AK7/AK8, F-177): ergänzt einen
 * AbortController je aktivem Lauf (laufAktivAbortController, D13 — genau
 * einer, kein Multi-Lauf-Registry), dessen .signal als abbruchSignal in die
 * AusfuehrungsOptionen DIESES Laufs gegeben wird. POST
 * /api/laeufe/<laufId>/abbrechen löst ihn aus (404 bei unbekannter/inaktiver
 * laufId, sonst 202 sofort, ohne auf das Laufende zu warten — die
 * bestehende fuehreAufgabeDurch-Kette WS-1/WS-2/WS-3 läuft danach
 * unverändert asynchron fertig). AK8 (löst F-175): POST /api/entscheidungen
 * lehnt 'terminal'/'kenntnisnahme' auf der gerade aktiven laufId mit 400 ab
 * (VOR jedem Schreiben) — 'antwort'/'stale' bleiben unberührt (AK6 aus F13
 * WS-2 gilt weiter). F-177: zeitgrenzeMs kommt jetzt ebenfalls serverseitig
 * aus der Startvorlage (Muster werkzeugStartziel/berechtigungskontext, F11
 * WS-2) statt nirgends gesetzt zu werden — Voraussetzung für AK10 (WS-5).
 * F-172 (trivialer Nachtrag, kein vollständiger Fix): GET
 * /api/laeufe/<laufId> trägt seither zusätzlich `aktiv`.
 *
 * F15 WS-2a (Meilenstein 3, docs/projekt/zielfassung.md §13.4 E-M3-1):
 * zwei Dinge, beide Vorbereitung für den Schritt-Automaten in WS-2b — der
 * Automat selbst ist NICHT hier. (1) Die Auflösung eines geprüften
 * Startauftrags zu fertigen AusfuehrungsEingaben (Werkzeugsatz aus der
 * Startvorlage, Evidenzdateien selbst gelesen nach AK6-Pfadprüfung,
 * auftragstext aus dem Auftragsartefakt) steht nicht mehr inline im POST
 * /api/laeufe-Handler, sondern in loeseAusfuehrungsEingabenAuf —
 * verhaltensgleich extrahiert, ohne HTTP-Kenntnis, der Handler übersetzt
 * den Ablehnungsgrund weiterhin selbst in seine 400er. Damit startet WS-2bs
 * Schritt n+1 über denselben Weg wie ein HTTP-Start, statt einen zweiten,
 * divergierenden aufzubauen. Die Reihenfolge D13 → laufIdBelegt →
 * auftragId-Existenz im Handler bleibt davon unberührt. (2) Drei
 * Workflow-Endpunkte: POST /api/workflows legt eine vollständige, mit F15s
 * validiereWorkflowDaten geprüfte WORKFLOW_V0-Payload als Kernartefakt
 * workflow-<workflow_id> an (Muster POST /api/auftraege; kein Start, keine
 * Ausführung), GET /api/workflows und GET /api/workflows/<id> projizieren
 * daraus (Muster /api/auftraege bzw. /api/laeufe). Ein Startendpunkt gehört
 * bewusst nicht dazu — er ist WS-2b.
 *
 *
 * F15 WS-2b (Meilenstein 3): POST /api/workflows/<id>/starten startet GENAU
 * EINEN Schritt eines Workflows über den Automatenpfad — die automatische
 * Fortsetzung auf Schritt n+1 ist WS-2c und steht bewusst nicht hier. Drei
 * Dinge sind dafür neu: (1) loeseSchrittEingabenAuf baut aus einem
 * WORKFLOW_V0-Schritt dieselben AusfuehrungsEingaben wie ein Startauftrag-Body
 * und löst dabei schritte[].eingaben ('artefakt:<id>') über ladeArtefaktVersion
 * auf — als notwendig:true-Anfragen VORANGESTELLT, mit Halt statt stillem
 * Überspringen, wenn ein Artefakt fehlt; budget kommt aus
 * vorlage.standardBudget, modell und zeitgrenze_ms aus dem Schritt (E-185/
 * E-M3-3: das gepinnte Plandatum gewinnt gegen die Startvorlage).
 * (2) starteLaufUndVergiss ist seither der EINZIGE Aufrufpunkt des
 * Werkzeuglaufs in dieser Datei — der Block stand bis WS-2a inline im POST
 * /api/laeufe-Handler und ist verhaltensgleich extrahiert, damit der
 * Automatenpfad keinen zweiten, divergierenden bekommt. (3)
 * schreibeWorkflowFortschritt legt über registriereWorkflow eine neue
 * Workflow-Version an: einmal VOR dem Laufstart (Schritt auf LAEUFT mit
 * lauf_id, Workflow auf LAEUFT), einmal nach dem Laufende. Die laufId erzeugt
 * der Server per randomUUID; sie kommt nie aus einer Payload. POST /api/laeufe
 * ist unverändert.
 *
 * Nach dem Laufende passieren zwei Dinge, beide in derselben neuen Version:
 * (a) der Schritt bekommt seinen normalisierten Ausgang — es sei denn, der Lauf
 * wurde FACHLICH abgelehnt, OHNE dass ein Checkpoint entstanden ist; dann geht
 * er auf OFFEN mit lauf_id null zurück, weil eine lauf_id ohne Kette den Schritt
 * über Regel 3 dauerhaft unstartbar machte (ein Tippfehler in schritt.rolle
 * mauerte ihn zu). Die Bedingung ist ENGER als ok === false und wird am
 * Dateisystem abgelesen: F6as verweigereStart schreibt in fünf von sieben
 * Ablehnungszweigen eine reale VERWEIGERT-Wirkungsmarke, und wo ein Artefakt
 * entstanden ist, wird nichts zurückgesetzt (F1s Kette ist append-only).
 * (b) der Cursor wandert über ermittleNaechstenSchritt auf den nächsten fälligen
 * Schritt weiter, und der Workflow-Status folgt dessen Ausgang
 * (workflowStatusZuAusgang). Gestartet wird dabei NICHTS: WS-2b ist ein
 * manueller Schritt-für-Schritt-Modus, in dem ein zweiter POST .../starten den
 * nächsten Schritt ausführt; WS-2c ersetzt nur diesen zweiten Aufruf.
 *
 * Zusätzlich seit WS-2b: POST /api/workflows lehnt eine neue Fassung eines
 * Workflows mit 409 ab, solange sein aktueller Stand LAEUFT, WARTET_FREIGABE oder
 * ABGESCHLOSSEN ist (GESPERRTE_ERSETZUNGS_STATUS) — sonst gäbe der Mensch Fassung 1
 * frei und der laufende Schritt schriebe seinen Ausgang in Fassung 2, oder eine
 * Freigabe ließe sich durch eine neue Fassung umgehen. In OFFEN,
 * KLAERUNG_ERFORDERLICH und GESTOPPT ist die neue Fassung dagegen der menschliche
 * Reparaturzug und ausdrücklich erlaubt; ein ungültiger Bestand ist es immer. Der
 * eingereichte Datensatz selbst darf keinen gesperrten status tragen, sonst sperrte
 * sich der Mensch mit einer Feldangabe aus.
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
 *
 * F15 WS-2c-Vorbereitung (F-201): belegeInstanzLock schreibt vor dem Binden
 * eine Datei <basis>/.leitstand.lock mit { pid, port, gestartetAm } und
 * bricht den Start ab, wenn die darin genannte PID noch lebt. Damit können
 * nicht mehr zwei Serverprozesse aus demselben Arbeitsverzeichnis dasselbe
 * kontrollzustand/ bespielen (auf Standardport verhinderte das bisher allein
 * EADDRINUSE; LEITSTAND_PORT=<anderer> blieb offen). Das ist die EINZIGE
 * Ausnahme zur Regel "kein eigener Schreibzugriff auf kontrollzustand/":
 * die Lock-Datei ist flüchtiger Betriebszustand, kein Kernartefakt — kein
 * registriereKernArtefakt, keine Lineage, keine Hash-Kette, git-ignoriert.
 * Sie wird ausschließlich aus dem CLI-Bindeblock am Dateiende belegt, nie
 * aus erzeugeRequestHandler oder einem Request-Handler heraus: parallele,
 * voneinander unabhängige Serverinstanzen in Tests (scripts/check-f10-
 * leitstand.mjs, check-f13/f14) müssen möglich bleiben.
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { extname, isAbsolute, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { kanonischesJson, ladeGueltigeCheckpoints, schreibeWirkungsmarke, sha256Hex, stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion, pruefeStale, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { entscheideStale, importiereAntwort } from '../src/human-transport/index.ts'
import { fuehreAufgabeDurch } from '../src/execution-controller/index.ts'
import { leiteRepoRelativenPfadAb } from '../src/authorization-boundary/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb, loeseWerkzeugsatzAuf } from '../src/startvorlage/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { ermittleNaechstenSchritt, registriereWorkflow, validiereWorkflowDaten } from '../src/workflow/index.ts'
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

const WORKFLOW_VERZEICHNIS_PRAEFIX = 'lineage-workflow-'

/**
 * Kopfdaten eines WORKFLOW_V0-Datensatzes für die Listenansicht (F15
 * WS-2a) — die Projektion, die GET /api/workflows je Eintrag liefert.
 * schritte[] bleibt bewusst draußen (Muster sammleAuftraege, das
 * auftragstext ebenfalls nur im Detail liefert): eine Liste zeigt, wo ein
 * Workflow steht, nicht seinen ganzen Inhalt.
 * @param workflowId - Kennung aus dem Verzeichnisnamen
 * @param version - geladene Artefaktversion (ladeArtefaktVersion)
 * @returns Kopfdaten-Objekt für die Liste
 */
function baueWorkflowKopfdaten(workflowId, version) {
  const daten = version.daten ?? {}
  return {
    workflowId,
    auftragId: daten.auftrag_id ?? null,
    ziel: daten.ziel ?? null,
    status: daten.status ?? null,
    aktiverSchrittId: daten.aktiver_schritt_id ?? null,
    schritteAnzahl: Array.isArray(daten.schritte) ? daten.schritte.length : 0,
    versionSequenz: version.versionSequenz,
  }
}

/**
 * Kopfdaten aller Workflows unter basisVerzeichnis (F15 WS-2a) — derselbe
 * Verzeichnis-Scan wie sammleAuftraege, aus demselben Grund: es gibt keine
 * Lineage-Registry-Funktion, die alle Artefakt-IDs einer Art listet. Ein
 * Workflow, dessen Kette keine gültige Version mehr liefert, wird
 * übersprungen statt den gesamten Request 500en zu lassen.
 *
 * Sortierung: alphabetisch nach workflowId (readdirSync().sort()) — anders
 * als sammleAuftraege, das nach erstellt_am sortiert. WORKFLOW_V0 hat kein
 * Zeitfeld; eine Sortierung nach Verzeichnis-mtime wäre genau der
 * Ersatzwert, den E-M2-5/F-141 aus der Laufliste entfernt haben.
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @returns Kopfdaten je Workflow, alphabetisch nach workflowId
 */
function sammleWorkflows(basisVerzeichnis = BASISVERZEICHNIS) {
  if (!existsSync(basisVerzeichnis)) return []
  const eintraege = []
  for (const verzeichnisName of readdirSync(basisVerzeichnis, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()) {
    if (!verzeichnisName.startsWith(WORKFLOW_VERZEICHNIS_PRAEFIX)) continue
    const workflowId = verzeichnisName.slice(WORKFLOW_VERZEICHNIS_PRAEFIX.length)
    const version = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
    if (version === null) continue
    eintraege.push(baueWorkflowKopfdaten(workflowId, version))
  }
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

/**
 * Dekodiert ein Pfadsegment und liefert null statt zu werfen (F15 WS-2a).
 * decodeURIComponent wirft bei kaputter Prozentkodierung ('%', '%zz') einen
 * URIError. requestHandler ist eine async function, deren Promise niemand
 * awaitet — ein ungefangener Wurf wird zur unhandled rejection und beendet
 * unter Node 24 den Prozess. Genau das schließt F10 AK6 aus, und real
 * reproduziert: `GET /api/workflows/%` beendete den Server (Reviewer-/
 * QA-Pass 10.09.2026).
 *
 * Bekannte Grenze, bewusst nicht in diesem Auftrag behoben: dieselbe Lücke
 * besteht seit F12/F14 in GET /api/laeufe/<laufId> und POST
 * /api/laeufe/<laufId>/abbrechen. Sie dort zu schließen ändert das Verhalten
 * zweier Endpunkte außerhalb des WS-2a-Zuschnitts (heute Prozesstod, danach
 * 400) — das ist eine eigene, kleine Iteration und Stefans Entscheidung,
 * kein stiller Nebeneffekt dieses Auftrags.
 * @param segment - rohes, noch kodiertes Pfadsegment
 * @returns dekodiertes Segment, oder null bei kaputter Kodierung
 */
function dekodiereSegment(segment) {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
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
  // F14 WS-4, AK7: ebenso — entsteht serverseitig (ein AbortController je aktivem Lauf), kommt nie über den Body.
  'abbruchSignal',
])

/** Erlaubte Top-Level-Felder eines Startauftrags (AK2, F11 WS-2 AK4/AK5) — laufId plus die AusfuehrungsEingaben-Felder, die noch aus dem Body kommen, plus werkzeugsatz (Name aus der Startvorlage) und optional vorgaengerLaufId. werkzeugStartziel/werkzeugVersionDeklariert/berechtigungskontext/profilReferenz sind NICHT mehr erlaubt (VERBOTENE_STARTVORLAGE_FELDER) — sie kommen serverseitig aus der Startvorlage. */
const ERLAUBTE_STARTAUFTRAG_FELDER = new Set(['laufId', 'rolle', 'anfragen', 'budget', 'aufrufEingaben', 'auftragId', 'werkzeugsatz', 'vorgaengerLaufId'])

/** F11 WS-2, AK5: diese vier Felder sind jetzt Sache der Startvorlage, nicht mehr des Body — ein Vorkommen wird wie ein AusfuehrungsOptionen-Feld mit 400 abgelehnt, nicht still ignoriert. */
export const VERBOTENE_STARTVORLAGE_FELDER = new Set(['werkzeugStartziel', 'werkzeugVersionDeklariert', 'berechtigungskontext', 'profilReferenz'])

/** F12 WS-2, AK5: auftragstext kommt jetzt ausschließlich aus dem Auftragsartefakt (ladeArtefaktVersion) — ein Vorkommen im Body wird wie ein Startvorlage-Feld mit 400 abgelehnt, nicht still ignoriert (Muster F11 WS-2 AK5). */
export const VERBOTENE_AUFTRAG_FELDER = new Set(['auftragstext'])

/**
 * Workflow-Status, in denen POST /api/workflows eine neue Fassung mit 409 ablehnt (F15 WS-2b).
 * Bewusst eine SPERRliste und keine Allowlist — anders als bei den Entscheidungsregeln in
 * src/workflow/index.ts ist die sichere Richtung hier "erlauben", nicht "anhalten": ein
 * Workflow, den niemand mehr ersetzen darf, ist zugemauert, und der Mensch verliert seinen
 * Reparaturzug. Ein künftig ergänzter WORKFLOW_STATUS ist deshalb erst einmal ersetzbar und
 * muss hier eine bewusste Zeile bekommen, wenn er es nicht sein soll.
 */
const GESPERRTE_ERSETZUNGS_STATUS = new Set(['LAEUFT', 'WARTET_FREIGABE', 'ABGESCHLOSSEN'])

/** Nur für den Ablehnungstext — die Gegenmenge zu GESPERRTE_ERSETZUNGS_STATUS, damit der Mensch liest, was geht. */
const ERSETZBARE_STATUS_TEXT = ['OFFEN', 'KLAERUNG_ERFORDERLICH', 'GESTOPPT']

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

/**
 * Löst einen geprüften Startauftrag zu fertigen AusfuehrungsEingaben auf
 * (F15 WS-2a) — verhaltensgleich aus dem POST /api/laeufe-Handler
 * extrahiert, wo dieser Block seit F11 WS-2 inline stand. Zwei Schritte,
 * unverändert in dieser Reihenfolge: (1) Werkzeugsatz über seinen Namen aus
 * der Startvorlage auflösen (F11 WS-2 AK4/AK5, nie über eine freie Liste),
 * (2) jede benannte Evidenzdatei selbst lesen — Pfadsicherheit VOR dem
 * Lesen, fehlende Datei → Ablehnung, nie leerer Inhalt (F11 WS-2 AK6).
 *
 * Warum überhaupt extrahiert: WS-2b startet Schritt n+1 eines Workflows und
 * braucht dieselben AusfuehrungsEingaben. Ein zweiter, eigener Weg dorthin
 * wäre eine zweite Fassung der AK6-Pfadprüfung — und die zweite Fassung ist
 * die, die beim nächsten Eingriff vergessen wird.
 *
 * KEINE HTTP-Kenntnis (kein res, kein sendeJson): die Funktion liefert einen
 * Ablehnungsgrund zurück, der Handler übersetzt ihn weiterhin selbst in
 * seine 400er — Muster der pruefe*-Funktionen oben. Ebenso wenig prüft sie
 * D13, laufIdBelegt oder die Existenz des Auftrags: diese drei stehen in
 * einer bewusst begründeten Reihenfolge im Handler und bleiben dort.
 * @param eingabenRoh - der eingaben-Teil aus pruefeStartauftrag
 * @param werkzeugsatzName - Name des Werkzeugsatzes aus dem Startauftrag
 * @param auftragstext - Text aus dem bereits geladenen Auftragsartefakt
 * @param vorlage - die geladene Startvorlage
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel (AK6-Pfadsicherheit)
 * @returns bei Erfolg { ok: true, eingaben }, sonst { ok: false, grund }
 */
export function loeseAusfuehrungsEingabenAuf(eingabenRoh, werkzeugsatzName, auftragstext, vorlage, repoWurzel) {
  const werkzeugsatz = loeseWerkzeugsatzAuf(vorlage, werkzeugsatzName)
  if (werkzeugsatz === undefined) {
    return { ok: false, grund: `unbekannter Werkzeugsatz '${werkzeugsatzName}' — bekannt: ${Object.keys(vorlage.werkzeugsaetze).join(', ')}` }
  }

  const anfragenMitInhalt = []
  for (const anfrage of eingabenRoh.anfragen) {
    const pfadErgebnis = loeseEvidenzPfadAuf(anfrage.pfad, repoWurzel)
    if (!pfadErgebnis.ok) {
      return { ok: false, grund: `Anfrage-Pfad '${anfrage.pfad}': ${pfadErgebnis.grund}` }
    }
    const zielPfad = join(repoWurzel, pfadErgebnis.relativerPfad)
    if (!existsSync(zielPfad) || !statSync(zielPfad).isFile()) {
      return { ok: false, grund: `Anfrage-Pfad '${anfrage.pfad}': Datei nicht gefunden` }
    }
    let inhalt
    try {
      inhalt = readFileSync(zielPfad, 'utf8')
    } catch (fehler) {
      return { ok: false, grund: `Anfrage-Pfad '${anfrage.pfad}': nicht lesbar (${fehler.message})` }
    }
    anfragenMitInhalt.push({ ...anfrage, inhalt })
  }

  return {
    ok: true,
    eingaben: {
      rolle: eingabenRoh.rolle,
      anfragen: anfragenMitInhalt,
      budget: eingabenRoh.budget,
      aufrufEingaben: { ...eingabenRoh.aufrufEingaben, werkzeugsatz: { modus: werkzeugsatz.modus, erlaubte_werkzeuge: werkzeugsatz.erlaubte_werkzeuge } },
      werkzeugStartziel: vorlage.werkzeugStartziel,
      werkzeugVersionDeklariert: vorlage.werkzeugVersionDeklariert,
      berechtigungskontext: vorlage.berechtigungskontext,
      auftragstext,
      auftragId: eingabenRoh.auftragId,
      ...(eingabenRoh.vorgaengerLaufId !== undefined ? { vorgaengerLaufId: eingabenRoh.vorgaengerLaufId } : {}),
    },
  }
}

/**
 * Baut aus einem WORKFLOW_V0-Schritt dieselben AusfuehrungsEingaben, die
 * POST /api/laeufe aus einem Startauftrag-Body baut (F15 WS-2b, (A)/(B) des
 * Bauauftrags). Der letzte Schritt ist deshalb bewusst ein Aufruf von
 * loeseAusfuehrungsEingabenAuf und keine eigene Zusammenstellung: Werkzeugsatz-
 * Auflösung und AK6-Pfadprüfung sollen für Automat und HTTP-Start EIN Weg
 * bleiben, nicht zwei, von denen einer altert (Begründung wortgleich zur
 * Extraktion in WS-2a).
 *
 * Abbildung (Bauauftrag (A)):
 *   schritt.rolle            -> eingabenRoh.rolle
 *   schritt.werkzeugsatz     -> Name des Werkzeugsatzes in der Startvorlage
 *   schritt.modell           -> aufrufEingaben.modell (E-185/E-M3-3: das
 *                               gepinnte Plandatum des Schritts, nie
 *                               vorlage.modell)
 *   workflowDaten.auftrag_id -> eingabenRoh.auftragId
 *   schritt.eingaben[]       -> aufgelöste Artefakt-Anfragen, siehe unten
 * schritt.zeitgrenze_ms gehört NICHT hierher: es ist eine AusfuehrungsOption,
 * keine Eingabe, und wird vom Aufrufer an laufOptionen gereicht — dort
 * gewinnt es ebenso gegenüber vorlage.zeitgrenzeMs.
 *
 * budget kommt aus vorlage.standardBudget — der einzige verwendbare Wert, den
 * eine Serverkonfiguration dafür trägt (F11 WS-2 AK4). Ein Workflow-Schritt
 * hat keine eigene Budgetquelle: WORKFLOW_V0 kennt kein Budgetfeld, und ein
 * hier erfundener Default wäre eine stille fachliche Entscheidung. Damit weicht
 * der Automat bewusst von der F11-WS-2-[EMPFEHLUNG] ab, standardBudget nicht
 * anzuwenden — die galt für einen Body, der ein eigenes budget mitbringt; ein
 * Schritt bringt keins.
 *
 * (B) schritte[].eingaben: jede 'artefakt:<id>'-Referenz wird über
 * ladeArtefaktVersion aufgelöst und der Anfragenliste als notwendig:true-
 * Eintrag VORANGESTELLT — dasselbe Muster, mit dem
 * src/execution-controller/index.ts Auftrag, Laufakte und Entscheidung
 * einhängt, mit kanonischesJson(daten) als inhalt. Fehlt ein Artefakt, entsteht
 * KEINE Anfrage weniger, sondern eine Ablehnung, die die Artefakt-ID nennt: ein
 * Schritt, dem eine erklärte Eingabe fehlt, liefe mit stillschweigend weniger
 * Kontext, als der Mensch geplant hat.
 *
 * Auftrag, Laufakte und Entscheidung des Vorgängerlaufs werden hier NICHT
 * eingehängt — fuehreAufgabeDurch stellt genau diese drei selbst voran. Wer sie
 * zusätzlich in schritte[].eingaben schreibt, bekommt sie doppelt; das ist eine
 * Eigenschaft des Workflows, keine des Automaten.
 * @param schritt - der zu startende WORKFLOW_V0-Schritt (bereits validiert)
 * @param workflowDaten - der Workflow, zu dem der Schritt gehört
 * @param vorgaengerLaufId - lauf_id des Vorschritts, oder undefined beim ersten Schritt
 * @param auftragstext - Text aus dem bereits geladenen Auftragsartefakt
 * @param vorlage - die geladene Startvorlage
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel (AK6-Pfadsicherheit)
 * @param ladeOptionen - basisVerzeichnis/schreiber für ladeArtefaktVersion
 * @returns bei Erfolg { ok: true, eingaben }, sonst { ok: false, grund }
 */
export function loeseSchrittEingabenAuf(schritt, workflowDaten, vorgaengerLaufId, auftragstext, vorlage, repoWurzel, ladeOptionen) {
  const artefaktAnfragen = []
  for (const referenz of schritt.eingaben) {
    if (typeof referenz !== 'string' || !referenz.startsWith('artefakt:')) {
      return { ok: false, grund: `Schritt '${schritt.schritt_id}': Eingabe ${JSON.stringify(referenz)} ist keine 'artefakt:<id>'-Referenz` }
    }
    const artefaktId = referenz.slice('artefakt:'.length)
    // Dieselbe Zeichenregel wie für laufId/workflow_id (D5, kein zweiter Regelsatz): die
    // artefaktId geht über 'lineage-<id>' in einen Dateisystempfad ein, und ihr Wert stammt
    // aus einer Workflow-Payload, nicht aus dem Server. validiereWorkflowDaten verlangt an
    // dieser Stelle nur das Muster '^artefakt:.+'.
    if (artefaktId.length === 0 || LAUFID_UNZULAESSIGE_ZEICHEN.test(artefaktId)) {
      return { ok: false, grund: `Schritt '${schritt.schritt_id}': Eingabe-Artefakt-ID ${JSON.stringify(artefaktId)} enthält unzulässige Zeichen` }
    }
    const version = ladeArtefaktVersion(artefaktId, undefined, ladeOptionen)
    if (version === null) {
      return { ok: false, grund: `Schritt '${schritt.schritt_id}': Eingabe-Artefakt '${artefaktId}' nicht gefunden — der Schritt wird nicht gestartet` }
    }
    artefaktAnfragen.push({
      pfad: `artefakt:${artefaktId}`,
      frage: `Erklärte Eingabe des Workflow-Schritts '${schritt.schritt_id}'`,
      begruendung: `In schritte[].eingaben des Workflows '${workflowDaten.workflow_id}' festgelegt (F15 WS-2b)`,
      inhalt: kanonischesJson(version.daten),
      notwendig: true,
    })
  }

  // anfragen bleibt hier leer: ein Schritt benennt seine Eingaben ausschließlich als
  // Artefakt-Referenzen, nie als Dateipfade. Die aufgelösten Artefakt-Anfragen dürfen NICHT
  // durch loeseAusfuehrungsEingabenAuf laufen — die Funktion behandelt jede Anfrage als
  // repo-relativen Dateipfad und läse 'artefakt:...' als Datei, die es nicht gibt.
  const eingabenRoh = {
    rolle: schritt.rolle,
    anfragen: [],
    budget: vorlage.standardBudget,
    aufrufEingaben: { modell: schritt.modell },
    auftragId: workflowDaten.auftrag_id,
    ...(vorgaengerLaufId !== undefined ? { vorgaengerLaufId } : {}),
  }

  const ergebnis = loeseAusfuehrungsEingabenAuf(eingabenRoh, schritt.werkzeugsatz, auftragstext, vorlage, repoWurzel)
  if (!ergebnis.ok) {
    return { ok: false, grund: `Schritt '${schritt.schritt_id}': ${ergebnis.grund}` }
  }
  return { ok: true, eingaben: { ...ergebnis.eingaben, anfragen: [...artefaktAnfragen, ...ergebnis.eingaben.anfragen] } }
}

/**
 * Normalisiert ein AusfuehrungsErgebnis (F8) zu einem der drei SCHRITT_STATUS-
 * Ausgänge, die WORKFLOW_V0 für einen gelaufenen Schritt kennt (F15 WS-2b,
 * Schritt 8 des Bauauftrags).
 *
 * ALLOWLIST wie in ermittleNaechstenSchritt (Reviewer-Pass 10.09.2026, K2/R2):
 * ERFOLGREICH entsteht nur, wenn F7s Klassifikation UND F1Bs Laufstatus es
 * beide sagen. Jeder andere Ausgang — eine F5-/F6a-Ablehnung (ok:false), ein
 * KLAERUNG_ERFORDERLICH, ein Laufstatus, den diese Funktion nicht kennt —
 * fällt auf FEHLGESCHLAGEN und damit auf einen Workflow-Halt. Der Preis ist
 * eine überflüssige Rückfrage an den Menschen; der umgekehrte Fehler wäre eine
 * Automatik, die auf einem ungeklärten Lauf weiterrechnet.
 *
 * Bewusste Ungenauigkeit, ausdrücklich benannt: SCHRITT_STATUS kennt kein
 * KLAERUNG_ERFORDERLICH. Ein Lauf, der dort landet, erscheint am Schritt als
 * FEHLGESCHLAGEN; die Klärbedürftigkeit trägt der Workflow-Status
 * (KLAERUNG_ERFORDERLICH), nicht der Schritt.
 * @param ergebnis - Rückgabe von fuehreAufgabeDurch
 * @returns 'ERFOLGREICH', 'VERWEIGERT' oder 'FEHLGESCHLAGEN'
 */
export function normalisiereSchrittAusgang(ergebnis) {
  if (ergebnis?.ok !== true) return 'FEHLGESCHLAGEN'
  const klassifiziert = ergebnis.klassifikation?.ergebnis
  if (klassifiziert === 'ERFOLGREICH') {
    return ergebnis.laufStatus?.status === 'ABGESCHLOSSEN' && ergebnis.laufStatus.ergebnis === 'ERFOLGREICH' ? 'ERFOLGREICH' : 'FEHLGESCHLAGEN'
  }
  if (klassifiziert === 'VERWEIGERT') return 'VERWEIGERT'
  return 'FEHLGESCHLAGEN'
}

/**
 * Schreibt eine neue Workflow-Version, in der genau ein Schritt und die beiden
 * Workflow-Felder status/aktiver_schritt_id fortgeschrieben sind (F15 WS-2b).
 * Kein Überschreiben: registriereWorkflow legt über F2 eine neue Version an
 * (ARCHITECTURE.md §2, versioniert statt überschrieben).
 *
 * Der Datensatz wird bewusst FRISCH geladen und nicht aus einem im Speicher
 * gehaltenen Stand fortgeschrieben: zwischen Start und Laufende kann ein
 * zweiter POST /api/workflows eine neue Fassung angelegt haben, und die
 * Fortschreibung soll auf der jüngsten aufsetzen, nicht eine ältere
 * wiederbeleben.
 * @param workflowId - Kennung des Workflows
 * @param schrittId - der fortzuschreibende Schritt
 * leiteWorkflowFelderAb bekommt den bereits fortgeschriebenen Datensatz und nicht
 * den geladenen (F15 WS-2b (6)): der Cursor entsteht aus ermittleNaechstenSchritt,
 * und das braucht die Schrittliste MIT dem gerade gesetzten Schrittausgang. Eine
 * vorher berechnete Feldmenge müsste den Datensatz ein zweites Mal laden oder auf
 * einem veralteten Stand rechnen.
 * @param schrittFelder - zu setzende Schrittfelder (status, lauf_id)
 * @param leiteWorkflowFelderAb - (datenMitSchritt) => { status, aktiver_schritt_id }
 * @param profilReferenz - Profilbezug, unverändert an F2 gereicht
 * @param ladeOptionen - basisVerzeichnis/schreiber
 * @returns bei Erfolg { ok: true, versionSequenz }, sonst { ok: false, grund }
 */
function schreibeWorkflowFortschritt(workflowId, schrittId, schrittFelder, leiteWorkflowFelderAb, profilReferenz, ladeOptionen) {
  const version = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
  if (version === null) {
    return { ok: false, grund: `Workflow '${workflowId}' nicht mehr ladbar` }
  }
  const daten = version.daten
  if (!Array.isArray(daten?.schritte) || !daten.schritte.some((s) => s.schritt_id === schrittId)) {
    return { ok: false, grund: `Workflow '${workflowId}' kennt den Schritt '${schrittId}' nicht mehr` }
  }
  const datenMitSchritt = {
    ...daten,
    schritte: daten.schritte.map((s) => (s.schritt_id === schrittId ? { ...s, ...schrittFelder } : s)),
  }
  const neueDaten = { ...datenMitSchritt, ...leiteWorkflowFelderAb(datenMitSchritt) }
  // Vor dem Schreiben validieren (Reviewer-Pass 10.09.2026, V5): registriereWorkflow prüft
  // bewusst nicht selbst, und der Startendpunkt validiert beim LADEN — ein hier geschriebener
  // ungültiger Datensatz käme also erst später als 409 zurück, und der Workflow wäre zugemauert.
  // Eine Zeile schließt die ganze Klasse; die Invariante hält heute, aber sie hängt an vier
  // Aufrufstellen, nicht an einer.
  const verstoesse = validiereWorkflowDaten(neueDaten)
  if (verstoesse.length > 0) {
    return { ok: false, grund: `fortgeschriebener Workflow '${workflowId}' wäre kein gültiger WORKFLOW_V0: ${verstoesse.join('; ')}` }
  }
  try {
    const registriert = registriereWorkflow(neueDaten, profilReferenz, { basisVerzeichnis: ladeOptionen.basisVerzeichnis })
    return { ok: true, versionSequenz: registriert.versionSequenz }
  } catch (fehler) {
    return { ok: false, grund: `Workflow-Version konnte nicht geschrieben werden: ${fehler.message}` }
  }
}

/**
 * Workflow-Status, der zu einem Ausgang von ermittleNaechstenSchritt gehört
 * (F15 WS-2b (6)). Der Cursor kommt in allen fünf Fällen unverändert aus
 * ausgang.aktiverSchrittId — die Union trägt ihn selbst, es gibt hier nichts
 * zu rechnen.
 *
 * 'starte' setzt LAEUFT, startet aber NICHTS: WS-2b ist ein manueller
 * Schritt-für-Schritt-Modus, in dem der Cursor nach jedem Schritt auf den
 * nächsten fälligen weiterwandert und ein zweiter POST .../starten ihn
 * ausführt. WS-2c ersetzt nur diesen zweiten Aufruf durch den automatischen —
 * der Zustand auf der Platte ist derselbe.
 * @param ausgang - Rückgabe von ermittleNaechstenSchritt
 * @returns der zu setzende Workflow-Status
 */
function workflowStatusZuAusgang(ausgang) {
  if (ausgang.art === 'starte') return 'LAEUFT'
  if (ausgang.art === 'haltFreigabe') return 'WARTET_FREIGABE'
  if (ausgang.art === 'haltGrenze') return 'GESTOPPT'
  if (ausgang.art === 'fertig') return 'ABGESCHLOSSEN'
  if (ausgang.art === 'haltKlaerung') return 'KLAERUNG_ERFORDERLICH'
  // ALLOWLIST wie überall in F15 (Reviewer-Pass 10.09.2026, V6): ein künftiger sechster Ausgang
  // fällt in "hält an" und muss hier eine bewusste Zeile bekommen, statt sich still einen Status
  // zu nehmen. KLAERUNG_ERFORDERLICH ist dabei nicht der Default, sondern eine eigene Zeile —
  // sonst wäre die Unterscheidung nur behauptet.
  return 'KLAERUNG_ERFORDERLICH'
}

/**
 * Übersetzt einen Nicht-'starte'-Ausgang von ermittleNaechstenSchritt in einen
 * lesbaren Grund für die 409-Antwort des Startendpunkts (F15 WS-2b). Nötig,
 * weil zwei der fünf Ausgänge kein grund-Feld tragen: 'haltFreigabe' nennt nur
 * die schrittId, 'fertig' gar nichts.
 * @param ausgang - Rückgabe von ermittleNaechstenSchritt
 * @returns lesbarer Grund
 */
function beschreibeAutomatAusgang(ausgang) {
  if (ausgang.art === 'haltFreigabe') {
    return `Schritt '${ausgang.schrittId}' verlangt eine menschliche Freigabe (freigabe 'ZWINGEND') — er startet nicht über diesen Endpunkt`
  }
  if (ausgang.art === 'fertig') {
    return 'der Workflow hat keinen zu startenden Schritt mehr — er ist durchgelaufen'
  }
  return ausgang.grund
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
  /** F14 WS-4 (AK7, D13): AbortController des gerade aktiven Laufs — genau einer, weil D13 genau einen aktiven Arbeitsstrang je Serverinstanz garantiert. Lebt nur so lange wie laufAktiv true ist, wird in JEDEM Fall (ok:false, ok:true, Wurf) zusammen mit laufAktiv/laufAktivLaufId zurückgesetzt (kein Leak, keine Wiederverwendung über Läufe hinweg). */
  let laufAktivAbortController = null

  /** Prüft AK5(a)+(b): laufId hat bereits ein Verzeichnis unter kontrollzustand/, oder ist in dieser Serverinstanz schon reserviert. @param laufId - zu prüfende laufId @returns true, wenn laufId belegt ist */
  function laufIdBelegt(laufId) {
    return angenommeneLaufIds.has(laufId) || existsSync(join(basisVerzeichnis, laufId))
  }

  /**
   * Der EINZIGE Aufrufpunkt des Werkzeuglaufs in dieser Datei (F10 AK2/AK6,
   * F11 WS-2 AK7, F15 WS-2b). Vor WS-2b stand dieser Block inline im
   * POST /api/laeufe-Handler; seit WS-2b braucht ihn zusätzlich der
   * Startendpunkt des Schritt-Automaten. Ein zweiter Aufrufpunkt ist bewusst
   * NICHT entstanden: die D13-Rückgabe und die Startfehlerliste sind
   * Sicherheitsverhalten, und die zweite Fassung davon ist die, die beim
   * nächsten Eingriff vergessen wird. scripts/check-f11-auftrag.mjs prüft
   * genau diesen Block als D13-Vertrag (Sperre vor laufIdBelegt, Reset in
   * .then UND .catch) über das ERSTE Vorkommen des zusammengesetzten
   * Funktionsnamens im Quelltext — Kommentare oberhalb dürfen ihn deshalb nie
   * unmittelbar vor einer öffnenden Klammer nennen.
   *
   * Vorbedingung, vom Aufrufer zu erfüllen (unverändert zum Stand vor der
   * Extraktion): laufAktiv/laufAktivLaufId/laufAktivAbortController sind
   * gesetzt, die laufId ist reserviert, und die 202-Antwort ist bereits raus.
   *
   * nachLauf läuft im selben synchronen Tick, in dem laufAktiv zurückgesetzt
   * wird — Vorbedingung für AK6 (D13-Übergabe ohne Fenster) in WS-2c. Ein Wurf
   * daraus wird gefangen und als Startfehler protokolliert: er darf weder die
   * D13-Rückgabe noch den Serverprozess mitreißen.
   * @param laufId - reservierte laufId dieses Laufs
   * @param eingaben - fertige AusfuehrungsEingaben
   * @param zeitgrenzeMsUeberschreibung - überstimmt vorlage.zeitgrenzeMs (F15 WS-2b: das gepinnte schritt.zeitgrenze_ms), sonst undefined
   * @param nachLauf - optionaler Rückruf (ergebnis, fehler) nach Laufende
   */
  function starteLaufUndVergiss(laufId, eingaben, zeitgrenzeMsUeberschreibung = undefined, nachLauf = undefined) {
    // F-145: dieselben Optionen, mit denen erzeugeRequestHandler selbst aufgerufen wurde,
    // strukturell durchgereicht (nicht basisVerzeichnis einzeln herauskopiert) — sonst
    // respektieren die synchronen Prüfungen im Handler (D13, laufIdBelegt, auftragId-Existenz)
    // ein Nicht-Default-basisVerzeichnis, der eigentliche Lauf aber nicht (stille Divergenz).
    // Extra Felder von optionen (fuehreAufgabeDurchFn/publicVerzeichnis/startvorlagePfad/
    // repoWurzel), die AusfuehrungsOptionen nicht kennt: fuehreAufgabeDurch kopiert für
    // starteGateway nur die neun bekannten Felder einzeln heraus (src/execution-controller/
    // index.ts, F-107; F14 WS-4 ergänzt abbruchSignal als neuntes), das rohe Objekt selbst
    // reicht es nur an die F9-Eskalationshelfer (erfasseBedarf/erzeugeTransportpaket/
    // haendigeAus) unverändert weiter — auch die lesen nur bekannte Felder per
    // Property-Zugriff, Extrafelder bleiben überall ungelesen (D5).
    // F14 WS-4 (AK7, F-177): zeitgrenzeMs kommt serverseitig aus der Startvorlage (Muster
    // werkzeugStartziel/berechtigungskontext), abbruchSignal aus dem gerade angelegten
    // Controller — beide reine Durchreichung an AusfuehrungsOptionen (D5, execution-controller
    // interpretiert keins der beiden selbst). F15 WS-2b: zeitgrenzeMsUeberschreibung steht NACH
    // der Startvorlage und gewinnt deshalb gegen sie — das gepinnte zeitgrenze_ms eines
    // Workflow-Schritts ist ein Plandatum, das der Mensch freigegeben hat (E-M3-3). Bewusst ein
    // SKALAR und kein Optionen-Objekt: ein durchgereichtes Objekt an dieser Stelle überstimmte
    // auch basisVerzeichnis/starter/settingsPfad — genau die Felder, die diese Datei sonst mit
    // VERBOTENE_OPTIONEN_FELDER am härtesten verteidigt (Reviewer-Pass 10.09.2026).
    const laufOptionen = {
      ...optionen,
      ...(vorlage.zeitgrenzeMs !== undefined ? { zeitgrenzeMs: vorlage.zeitgrenzeMs } : {}),
      ...(zeitgrenzeMsUeberschreibung !== undefined ? { zeitgrenzeMs: zeitgrenzeMsUeberschreibung } : {}),
      abbruchSignal: laufAktivAbortController.signal,
    }

    /** Ruft nachLauf auf, ohne dass ein Wurf daraus zur unhandled rejection wird. @param ergebnis - AusfuehrungsErgebnis oder null @param fehler - Wurf oder null */
    const meldeLaufende = (ergebnis, fehler) => {
      if (nachLauf === undefined) return
      try {
        nachLauf(ergebnis, fehler)
      } catch (nachLaufFehler) {
        const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: `Nachbereitung fehlgeschlagen: ${String(nachLaufFehler?.message ?? nachLaufFehler)}` }
        startfehlerListe.push(eintrag)
        console.error(`[leitstand] Nachbereitung von Lauf '${laufId}' fehlgeschlagen:`, nachLaufFehler)
      }
    }

    // Fire-and-forget mit Pflicht-.catch() (AK6) — ein Wurf aus dem Lauf beendet den Server
    // nicht. laufAktiv wird in JEDEM Fall zurückgesetzt (AK7, D13) — anders als die
    // laufId-Reservierung, die nur bei ok:false/Wurf freigegeben wird. Ein korrigierter Retry
    // unter DERSELBEN laufId gelingt danach nur, wenn die Ablehnung keinen Checkpoint
    // geschrieben hat (reine F5-Ablehnung, oder F6as pruefeStartziel-Zweig) — laufIdBelegt()
    // prüft zusätzlich das Dateisystem, und die meisten F6a-Ablehnungen (Invocation Policy,
    // E-182, fehlende/ungültige Autorisierung, Startfreigabe ABGELEHNT) schreiben über
    // verweigereStart bereits eine reale VERWEIGERT-Wirkungsmarke, BEVOR starteGateway
    // ok:false zurückgibt — die laufId bleibt danach absichtlich belegt (F1s Hash-Kette ist
    // append-only, kein Überschreiben eines persistierten Artefakts, ARCHITECTURE.md §7).
    fuehreAufgabeDurchFn(laufId, profilReferenz, eingaben, laufOptionen)
      .then((ergebnis) => {
        laufAktiv = false
        laufAktivLaufId = null
        laufAktivAbortController = null
        if (ergebnis.ok === false) {
          angenommeneLaufIds.delete(laufId)
          const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: beschreibeAblehnung(ergebnis) }
          startfehlerListe.push(eintrag)
          console.error(`[leitstand] Lauf '${laufId}' abgelehnt:`, eintrag.fehler)
        }
        meldeLaufende(ergebnis, null)
      })
      .catch((fehler) => {
        laufAktiv = false
        laufAktivLaufId = null
        laufAktivAbortController = null
        angenommeneLaufIds.delete(laufId)
        const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: String(fehler?.message ?? fehler) }
        startfehlerListe.push(eintrag)
        console.error(`[leitstand] Lauf '${laufId}' fehlgeschlagen:`, fehler)
        meldeLaufende(null, fehler)
      })
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
        // F14 WS-4 (F-172, trivialer Nachtrag): ob DIESER Lauf gerade der aktive Arbeitsstrang der
        // Serverinstanz ist (D13) — kein Ersatz für eine vollständige F-172-Lösung (auch andere
        // Leitstand-Ansichten), nur dieses eine, bereits vorhandene In-Memory-Feld mitgeliefert.
        aktiv: laufAktiv && laufId === laufAktivLaufId,
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

    // F15 WS-2a: Detailendpunkt VOR dem Listenendpunkt (längeres, spezielleres Präfix zuerst,
    // Muster /api/laeufe). workflowId wird nach decodeURIComponent gegen dieselbe Zeichenregel
    // geprüft wie eine laufId, BEVOR sie über 'lineage-workflow-<id>' in einen
    // Dateisystempfad eingeht — sonst 400 statt Pfad-Escape.
    if (req.method === 'GET' && pfad.startsWith('/api/workflows/')) {
      const workflowId = dekodiereSegment(pfad.slice('/api/workflows/'.length))
      if (workflowId === null || workflowId.length === 0 || LAUFID_UNZULAESSIGE_ZEICHEN.test(workflowId)) {
        sendeJson(res, 400, { grund: `workflowId fehlt, ist nicht dekodierbar oder enthält unzulässige Zeichen: ${JSON.stringify(pfad.slice('/api/workflows/'.length))}` })
        return
      }
      const version = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      if (version === null) {
        sendeJson(res, 404, { grund: `Workflow '${workflowId}' nicht gefunden` })
        return
      }
      // Der Detailendpunkt liefert den WORKFLOW_V0-Datensatz unverändert (daten), nicht auf
      // eine Auswahl reduziert: anders als bei der Startvorlage (D5, strikte Allowlist) trägt
      // ein Workflow kein einziges Feld, das ein Geheimnis wäre — er ist genau das, was der
      // Mensch vorher freigegeben hat.
      sendeJson(res, 200, { workflowId, versionSequenz: version.versionSequenz, daten: version.daten })
      return
    }

    if (req.method === 'GET' && pfad === '/api/workflows') {
      sendeJson(res, 200, sammleWorkflows(basisVerzeichnis))
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

    // F15 WS-2a: nimmt eine vollständige WORKFLOW_V0-Payload entgegen und legt sie als
    // Kernartefakt workflow-<workflow_id> an (Muster POST /api/auftraege). Startet NICHTS und
    // führt NICHTS aus — der Startendpunkt des Schritt-Automaten ist WS-2b.
    if (req.method === 'POST' && pfad === '/api/workflows') {
      let body
      try {
        const roh = await leseBody(req)
        body = JSON.parse(roh.length === 0 ? '{}' : roh)
      } catch (fehler) {
        sendeJson(res, 400, { grund: `Body ist kein gültiges JSON (${fehler.message})` })
        return
      }

      // Einzige fachliche Prüfung: F15s validiereWorkflowDaten (D5, kein zweiter,
      // selbstgebauter Regelsatz im Server). Die Verstoßtexte gehen unverändert an den Client.
      const verstoesse = validiereWorkflowDaten(body)
      if (verstoesse.length > 0) {
        sendeJson(res, 400, { grund: `WORKFLOW_V0-Verstöße: ${verstoesse.join('; ')}`, verstoesse })
        return
      }

      // Anders als eine auftragId (D1, serverseitig per randomUUID) kommt workflow_id aus der
      // Payload — sie geht über 'lineage-workflow-<id>' in einen Dateisystempfad ein.
      // validiereWorkflowDaten verlangt nur einen nicht-leeren String; die Zeichenregel steht
      // deshalb hier, VOR jedem Schreibversuch (D2), statt sich auf den Wurf des Checkpoint
      // Store zu verlassen, der als 500 herauskäme.
      if (LAUFID_UNZULAESSIGE_ZEICHEN.test(body.workflow_id)) {
        sendeJson(res, 400, { grund: `'workflow_id' enthält unzulässige Zeichen: ${JSON.stringify(body.workflow_id)}` })
        return
      }
      // F15 WS-2b: der eingereichte Datensatz darf selbst keinen der Zustände tragen, in denen
      // er anschließend nicht mehr ersetzbar wäre. Ohne diese Zeile sperrte sich der Mensch mit
      // EINER falschen Feldangabe dauerhaft aus — eine Fassung mit status 'ABGESCHLOSSEN' wurde
      // angenommen und war danach weder ersetzbar (der Bestand ist jetzt gesperrt) noch startbar
      // (Regel 0). 400 statt 409: hier ist der Body schuld, nicht der abgelegte Zustand
      // (QA-Pass 10.09.2026).
      if (GESPERRTE_ERSETZUNGS_STATUS.has(body.status)) {
        sendeJson(res, 400, {
          grund: `'status' darf beim Anlegen oder Ersetzen nicht '${body.status}' sein — ein so eingereichter Workflow wäre weder startbar noch ersetzbar (erlaubt: ${ERSETZBARE_STATUS_TEXT.join(', ')})`,
        })
        return
      }

      // Dieselbe Regel für auftrag_id, aus demselben Grund und seit F15 WS-2b nicht mehr
      // theoretisch: der Startendpunkt lädt 'auftrag-<auftrag_id>', und ladeArtefaktVersion
      // WIRFT bei einem unzulässigen Zeichen (F1s pruefeLaufId) — aus einem async-Handler,
      // dessen Promise niemand awaitet, also mit Prozesstod statt 400 (Reviewer-Pass
      // 10.09.2026, real reproduziert). Hier abgefangen, damit ein solches Artefakt gar nicht
      // erst entsteht; der Startendpunkt prüft zusätzlich, weil Bestandsartefakte es schon
      // sein können.
      if (LAUFID_UNZULAESSIGE_ZEICHEN.test(body.auftrag_id)) {
        sendeJson(res, 400, { grund: `'auftrag_id' enthält unzulässige Zeichen: ${JSON.stringify(body.auftrag_id)}` })
        return
      }

      // F15 WS-2b (4): ein zweiter POST ersetzte bis hierher die Definition eines Workflows,
      // den der Automat gerade abarbeitet — der Mensch hätte Fassung 1 freigegeben, der Schritt
      // schriebe seinen Ausgang in Fassung 2, und E-M3-1s Voraussetzung ("innerhalb eines vom
      // Menschen freigegebenen Workflows") wäre unterlaufen. Gesperrt sind deshalb genau die
      // drei Zustände, in denen eine neue Fassung wirklich Schaden anrichtet:
      //
      //   LAEUFT           — es läuft etwas; die Fassung würde unter dem laufenden Schritt getauscht.
      //   WARTET_FREIGABE  — es wartet etwas auf eine menschliche Freigabe; eine neue Fassung wäre
      //                      eine Freigabe-Umgehung durch die Hintertür.
      //   ABGESCHLOSSEN    — eine fertige Historie wird nicht umgeschrieben; dafür gibt es eine
      //                      neue workflow_id.
      //
      // OFFEN, KLAERUNG_ERFORDERLICH und GESTOPPT sind ERLAUBT. Eine frühere, breitere Fassung
      // dieser Regel ("alles außer OFFEN") sperrte auch die beiden Zustände, in denen die neue
      // Fassung der menschliche REPARATURZUG selbst ist — und mauerte damit genau den Fall zu,
      // für den die Heilung einer verwaisten lauf_id gebaut wurde: ein Tippfehler in
      // schritt.rolle war danach nicht mehr korrigierbar (Reviewer-/QA-Pass 10.09.2026).
      //
      // KEIN max_replans-Verbrauch: max_replans begrenzt die AUTOMATISCHE Wiederholung. Ein
      // Mensch, der eine neue Fassung einreicht, ist selbst die Grenze.
      // Ein Bestand, der die heutigen WORKFLOW_V0-Regeln verletzt, ist IMMER ersetzbar,
      // unabhängig von seinem status: aus ihm kann kein Lauf mehr gestartet werden (der
      // Startendpunkt validiert beim Laden und antwortet 409), also gibt es nichts zu schützen —
      // und ohne diese Ausnahme wäre er dauerhaft unerreichbar. Der Fall entsteht real, sobald
      // eine neue Validatorregel dazukommt: Zusammenführungen waren bis WS-2b gültig UND
      // startbar (Reviewer-Pass 10.09.2026).
      const bestand = ladeArtefaktVersion(`workflow-${body.workflow_id}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      const bestandUngueltig = bestand !== null && validiereWorkflowDaten(bestand.daten).length > 0
      if (bestand !== null && !bestandUngueltig && GESPERRTE_ERSETZUNGS_STATUS.has(bestand.daten?.status)) {
        sendeJson(res, 409, {
          grund: `Workflow '${body.workflow_id}' existiert bereits mit status '${bestand.daten?.status}' — in diesem Zustand wird er nicht durch eine neue Fassung ersetzt (erlaubt: ${[...ERSETZBARE_STATUS_TEXT].join(', ')})`,
          status: bestand.daten?.status ?? null,
        })
        return
      }

      // registriereWorkflow führt echte, synchrone Disk-I/O aus und kann werfen — derselbe
      // Grund wie bei registriereAuftrag oben (requestHandler ist eine async function, deren
      // Promise niemand awaitet; ein ungefangener Wurf würde den Prozess beenden).
      let registriert
      try {
        registriert = registriereWorkflow(body, profilReferenz, { basisVerzeichnis })
      } catch (fehler) {
        console.error(`[leitstand] Workflow '${body.workflow_id}' konnte nicht registriert werden:`, fehler)
        sendeJson(res, 500, { grund: `Workflow konnte nicht registriert werden: ${fehler.message}` })
        return
      }
      // Ein zweiter POST mit derselben workflow_id ist kein Fehler, sondern eine neue Version
      // desselben Artefakts (ARCHITECTURE.md §2: versioniert, nicht überschrieben) — deshalb
      // trägt die Antwort versionSequenz, damit der Aufrufer sieht, welche er bekommen hat.
      //
      // Zwei Prüfungen fehlen hier weiterhin BEWUSST (die dritte, der zweite POST auf einen
      // laufenden Workflow, ist seit F15 WS-2b oben umgesetzt):
      // (1) auftrag_id wird NICHT auf EXISTENZ geprüft — anders als POST /api/laeufe, das genau
      //     das synchron tut (F12 AK5). Ein Workflow ohne existierenden Auftrag ist hier ein
      //     zulässiger Zwischenzustand (der Auftrag kann später entstehen); beim Start ist er es
      //     nicht mehr (400 dort). Die ZEICHENregel dagegen greift seit WS-2b auch hier.
      // (2) workflow_id wird nur gegen LAUFID_UNZULAESSIGE_ZEICHEN geprüft (Spiegel von
      //     pruefeLaufId, D5 — kein zweiter Regelsatz). Länge und die unter Windows
      //     unzulässigen Zeichen (: < > " | ? *) bleiben ungeprüft und enden als 500 statt 400,
      //     unter Linux dagegen als 201 — OS-divergent. Eine strengere Regel gehört in den
      //     Checkpoint Store (eine Wahrheitsquelle), nicht als Zweitregel hierher.
      sendeJson(res, 201, { workflowId: body.workflow_id, versionSequenz: registriert.versionSequenz })
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

      // F15 WS-2a: die Auflösung von Werkzeugsatz und Evidenzdateien zu fertigen
      // AusfuehrungsEingaben steht seither in loeseAusfuehrungsEingabenAuf (verhaltensgleich
      // extrahiert, gleiche Reihenfolge/Prüftiefe/Fehlertexte, alle drei Ablehnungsgründe
      // weiterhin 400). Grund für die Extraktion: der Schritt-Automat (WS-2b) muss Schritt n+1
      // über GENAU denselben Weg starten wie ein HTTP-Start — zwei divergierende Wege zu
      // AusfuehrungsEingaben wären zwei Sicherheitsprüfungen, von denen eine altert.
      const eingabenErgebnis = loeseAusfuehrungsEingabenAuf(eingabenRoh, werkzeugsatzName, auftragVersion.daten.auftragstext, vorlage, repoWurzel)
      if (!eingabenErgebnis.ok) {
        sendeJson(res, 400, { grund: eingabenErgebnis.grund })
        return
      }
      const { eingaben } = eingabenErgebnis

      // Reservierung SYNCHRON vor dem fuehreAufgabeDurch-Aufruf (AK5) — sonst gewinnt bei zwei
      // unmittelbar aufeinanderfolgenden POSTs derselbe laufId-Wert zweimal die Prüfung oben.
      angenommeneLaufIds.add(laufId)
      laufAktiv = true
      laufAktivLaufId = laufId
      // F14 WS-4 (AK7): ein AbortController je aktivem Lauf — sein .signal wird unten als
      // abbruchSignal in die AusfuehrungsOptionen DIESES EINEN Laufs gegeben. POST
      // /api/laeufe/<laufId>/abbrechen löst später genau diesen Controller aus (D13: genau ein
      // aktiver Lauf, ein einzelner Controller reicht, kein Multi-Lauf-Registry).
      laufAktivAbortController = new AbortController()
      sendeJson(res, 202, { laufId })

      // F15 WS-2b: der Fire-and-forget-Block stand bis hier inline; seit WS-2b liegt er in
      // starteLaufUndVergiss (oben), weil der Startendpunkt des Schritt-Automaten denselben
      // Block braucht. Verhaltensgleich extrahiert — dieselben Optionen (F-145, F-177), dieselbe
      // D13-Rückgabe in .then UND .catch (AK7), dieselbe Startfehlerliste (AK6). Kein zweiter
      // Aufrufpunkt des Werkzeuglaufs; die Begründung steht am Helfer.
      starteLaufUndVergiss(laufId, eingaben)
      return
    }

    // F15 WS-2b (Meilenstein 3, docs/projekt/zielfassung.md §13.4 E-M3-1): startet GENAU EINEN
    // Schritt eines Workflows über den Automatenpfad. Die automatische Fortsetzung auf Schritt
    // n+1 ist NICHT hier — sie ist WS-2c. Die Route steht bewusst NACH POST /api/laeufe: die
    // D13-Vertragsprüfung in scripts/check-f11-auftrag.mjs sucht das ERSTE 'if (laufAktiv)' und
    // das ERSTE 'if (laufIdBelegt(' im Quelltext; stünde diese Route davor, prüfte das Gate
    // seine Zusage nicht mehr an dem Handler, für den sie geschrieben wurde (Reviewer-Pass
    // 10.09.2026). Gegen die GET-Detailroute ist sie nicht mehrdeutig: dort req.method === 'GET'.
    if (req.method === 'POST' && pfad.startsWith('/api/workflows/') && pfad.endsWith('/starten')) {
      const rohId = pfad.slice('/api/workflows/'.length, pfad.length - '/starten'.length)
      const workflowId = dekodiereSegment(rohId)
      if (workflowId === null || workflowId.length === 0 || LAUFID_UNZULAESSIGE_ZEICHEN.test(workflowId)) {
        sendeJson(res, 400, { grund: `workflowId fehlt, ist nicht dekodierbar oder enthält unzulässige Zeichen: ${JSON.stringify(rohId)}` })
        return
      }

      // (1) Workflow laden.
      const workflowVersion = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      if (workflowVersion === null) {
        sendeJson(res, 404, { grund: `Workflow '${workflowId}' nicht gefunden` })
        return
      }
      const workflowDaten = workflowVersion.daten

      // (2) validiereWorkflowDaten auch beim LADEN, nicht nur beim Anlegen (features/F15/
      // feature.md, „Entschieden", max_schritte-Eintrag): die Terminierung des Automaten hängt
      // an der Zyklenfreiheit der nachfolger-Kette, und zwischen Anlegen und Start kann eine
      // zweite Fassung desselben Workflows angelegt worden sein. 409 statt 400: der Body ist
      // nicht schuld, der abgelegte Zustand ist es.
      const verstoesse = validiereWorkflowDaten(workflowDaten)
      if (verstoesse.length > 0) {
        sendeJson(res, 409, { grund: `Workflow '${workflowId}' verletzt WORKFLOW_V0: ${verstoesse.join('; ')}`, verstoesse })
        return
      }

      // (2b) Stale LAEUFT: der abgelegte Zustand sagt "läuft", D13 sagt "nichts läuft". Dann ist
      // der Server mitten im Schritt gestorben — der aufgezeichnete Zustand ist veraltet, nicht
      // falsch. Ohne diese Heilung liefe der Aufruf in Regel 3 ("Schritt trägt eine lauf_id")
      // und der Workflow bliebe dauerhaft auf 409 stehen, ohne dass irgendwo steht, warum.
      //
      // Muster: F1Bs stelleLaufstatusFest erkennt denselben Zustand eine Ebene tiefer — ein
      // run_prepared ohne Terminalmarke — und liefert dafür KLAERUNG_ERFORDERLICH statt eines
      // Fehlers. Genau das hier auf Workflow-Ebene: der Zustand wird als klärungsbedürftig
      // FESTGESCHRIEBEN und der Mensch bekommt einen reparierbaren Workflow (er darf jetzt eine
      // neue Fassung einreichen, siehe (A)), statt eines zugemauerten.
      //
      // Der betroffene Schritt wird dabei NICHT angefasst: seine lauf_id bleibt stehen. Das ist
      // der Unterschied zur Heilung nach einem Laufende — dort ist BELEGT, dass nichts
      // geschrieben wurde; hier ist unbekannt, ob unter dieser lauf_id real ein Lauf gelaufen
      // ist, dessen Ausgang niemand mehr eingesammelt hat. Eine lauf_id wegzuwerfen, die auf
      // eine reale Kette zeigt, wäre der schlimmere Fehler.
      //
      // GENAUER als "Workflow steht auf LAEUFT" (Kalibrierung am Gate, 10.09.2026): seit der
      // Cursor-Wanderung steht ein Workflow auch dann auf LAEUFT, wenn der letzte Schritt sauber
      // fertig ist und der Cursor auf dem nächsten, noch OFFENEN Schritt wartet — das ist der
      // gesunde Zwischenstand des Schritt-für-Schritt-Modus, kein Stale-State. Der belastbare
      // Marker ist ein SCHRITT auf LAEUFT: den setzt der Endpunkt unmittelbar vor dem Laufstart,
      // und die Nachbereitung nimmt ihn in jedem Fall wieder herunter. Steht er noch, obwohl D13
      // nichts kennt, hat die Nachbereitung nie stattgefunden.
      const laufenderSchritt = laufAktiv ? undefined : workflowDaten.schritte.find((s) => s.status === 'LAEUFT')
      if (workflowDaten.status === 'LAEUFT' && laufenderSchritt !== undefined) {
        const grund = `Workflow '${workflowId}' steht auf LAEUFT und Schritt '${laufenderSchritt.schritt_id}' ebenfalls, aber über diese Serverinstanz ist kein Lauf aktiv (D13) — der aufgezeichnete Zustand ist veraltet (Serverneustart mitten im Schritt). Der Workflow wurde auf KLAERUNG_ERFORDERLICH gesetzt; die lauf_id des Schritts bleibt unverändert, weil unbekannt ist, ob unter ihr real ein Lauf gelaufen ist.`
        const geheilt = schreibeWorkflowFortschritt(
          workflowId,
          laufenderSchritt.schritt_id,
          {},
          (datenMitSchritt) => ({ status: 'KLAERUNG_ERFORDERLICH', aktiver_schritt_id: datenMitSchritt.aktiver_schritt_id }),
          profilReferenz,
          { basisVerzeichnis, schreiber: STILLER_SCHREIBER }
        )
        if (!geheilt.ok) {
          console.error(`[leitstand] Stale-LAEUFT-Heilung für Workflow '${workflowId}' fehlgeschlagen:`, geheilt.grund)
          sendeJson(res, 500, { grund: geheilt.grund })
          return
        }
        sendeJson(res, 409, { grund, stale: true })
        return
      }

      // (3) D13, wortgleich zu POST /api/laeufe und aus demselben Grund an derselben Stelle:
      // die Sperre gilt unabhängig vom konkreten Request und läuft deshalb vor jeder
      // request-spezifischen Prüfung.
      if (laufAktiv) {
        sendeJson(res, 409, { grund: `ein anderer, über diese Serverinstanz gestarteter Lauf ('${laufAktivLaufId}') ist noch aktiv (D13) — genau ein aktiver Arbeitsstrang` })
        return
      }

      // (4) Die Entscheidung trifft ausschließlich F15s ermittleNaechstenSchritt (D5) — ohne
      // Vorschrittergebnis, weil dieser Endpunkt den ERSTEN Schritt startet. Jeder Ausgang
      // außer 'starte' ist ein 409, bei dem nichts geschrieben und nichts gestartet wird.
      const ausgang = ermittleNaechstenSchritt(workflowDaten)
      if (ausgang.art !== 'starte') {
        sendeJson(res, 409, { grund: `Workflow '${workflowId}' ist nicht startbar (${ausgang.art}): ${beschreibeAutomatAusgang(ausgang)}`, art: ausgang.art })
        return
      }
      const schritt = ausgang.schritt

      // Die laufId eines Workflow-Schritts erzeugt der Server (Muster auftragId, D1) — sie kommt
      // nie aus einer Payload. laufIdBelegt bleibt trotzdem geprüft: randomUUID ist praktisch
      // kollisionsfrei, aber die Reservierung ist die Zusage, nicht die Wahrscheinlichkeit.
      const laufId = randomUUID()
      if (laufIdBelegt(laufId)) {
        sendeJson(res, 409, { grund: `laufId '${laufId}' ist bereits vergeben` })
        return
      }

      // (5) Eingaben nach (A)/(B). Der Auftragstext kommt aus dem Auftragsartefakt — dieselbe
      // synchrone Existenzprüfung wie in POST /api/laeufe (F12 WS-2 AK5), vor jeder
      // Zustandsänderung (D2). POST /api/workflows prüft auftrag_id bewusst NICHT; beim Start
      // ist der Zwischenzustand „Auftrag kommt später" nicht mehr zulässig.
      if (LAUFID_UNZULAESSIGE_ZEICHEN.test(workflowDaten.auftrag_id)) {
        sendeJson(res, 400, { grund: `'auftrag_id' des Workflows enthält unzulässige Zeichen: ${JSON.stringify(workflowDaten.auftrag_id)}` })
        return
      }
      const auftragVersion = ladeArtefaktVersion(`auftrag-${workflowDaten.auftrag_id}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      if (auftragVersion === null) {
        sendeJson(res, 400, { grund: `Auftrag '${workflowDaten.auftrag_id}' nicht gefunden` })
        return
      }
      // Lineage-Verweis auf den Vorschritt: die lauf_id des Schritts, dessen nachfolger auf
      // diesen zeigt und der real gelaufen ist. Beim ERSTEN Schritt gibt es keinen — dann bleibt
      // vorgaengerLaufId weg (Bauauftrag (A)). Kein neuer Mechanismus, nur die bestehende
      // Verweisbildung aus F8 WS-2b / F13 WS-3 (Nicht-Ziel "Keine neue Lineage-Mechanik").
      //
      // Ein geheilter Schritt trägt lauf_id null und ist damit kein Vorschritt — richtig so, es
      // lief nichts, worauf ein Verweis zeigen könnte.
      //
      // Sind ZWEI Vorschritte gelaufen, ist der Lineage-Vorgänger nicht bestimmbar — dann wird
      // angehalten statt geraten (D2).
      //
      // HEUTE UNERREICHBAR, und das ist Absicht: seit der fünften Querverweisregel lehnt
      // validiereWorkflowDaten jede Zusammenführung ab, und dieser Handler validiert den
      // geladenen Datensatz oben (409), bevor er hierher kommt — auch Bestandsartefakte aus der
      // Zeit vor der Regel. Die Prüfung bleibt als Tiefenverteidigung stehen, falls die
      // Validierung je verschoben wird; sie wird deshalb NICHT als eigene Grenze im Gate
      // behauptet (ARCHITECTURE.md §8: eine Grenze ohne Rotfall heißt nicht ERZWUNGEN).
      // Frühere Fassung dieses Kommentars berief sich auf einen Testfall, den dieselbe
      // Iteration in sein Gegenteil gedreht hat (Reviewer-Pass 10.09.2026).
      const gelaufeneVorschritte = workflowDaten.schritte.filter((s) => s.nachfolger === schritt.schritt_id && s.lauf_id !== null)
      if (gelaufeneVorschritte.length > 1) {
        sendeJson(res, 409, {
          grund: `Schritt '${schritt.schritt_id}' hat ${gelaufeneVorschritte.length} gelaufene Vorschritte (${gelaufeneVorschritte.map((s) => s.schritt_id).join(', ')}) — der Lineage-Vorgänger ist nicht bestimmbar`,
        })
        return
      }
      const vorgaengerLaufId = gelaufeneVorschritte[0]?.lauf_id ?? undefined

      const eingabenErgebnis = loeseSchrittEingabenAuf(
        schritt,
        workflowDaten,
        vorgaengerLaufId,
        auftragVersion.daten.auftragstext,
        vorlage,
        repoWurzel,
        { basisVerzeichnis, schreiber: STILLER_SCHREIBER }
      )
      if (!eingabenErgebnis.ok) {
        sendeJson(res, 400, { grund: eingabenErgebnis.grund })
        return
      }

      // (6) Die neue Workflow-Version wird geschrieben, BEVOR der Lauf startet: stirbt der
      // Server danach, zeigt der Zustand auf der Platte, welcher Schritt lief — ein Schritt auf
      // LAEUFT mit gesetzter lauf_id ist nach Regel 3 von ermittleNaechstenSchritt nicht mehr
      // startbereit und wird nie automatisch neu gestartet (ARCHITECTURE.md §4).
      // workflowDaten.version bleibt unangetastet: das Feld zählt Planfassungen (Replans), nicht
      // Artefaktversionen — die zählt F2 als versionSequenz.
      const fortschritt = schreibeWorkflowFortschritt(
        workflowId,
        schritt.schritt_id,
        { status: 'LAEUFT', lauf_id: laufId },
        () => ({ status: 'LAEUFT', aktiver_schritt_id: ausgang.aktiverSchrittId }),
        profilReferenz,
        { basisVerzeichnis, schreiber: STILLER_SCHREIBER }
      )
      if (!fortschritt.ok) {
        console.error(`[leitstand] Workflow '${workflowId}' konnte nicht fortgeschrieben werden:`, fortschritt.grund)
        sendeJson(res, 500, { grund: fortschritt.grund })
        return
      }

      // (7) Reservierung synchron vor dem Laufstart, dann 202 — Muster POST /api/laeufe.
      angenommeneLaufIds.add(laufId)
      laufAktiv = true
      laufAktivLaufId = laufId
      laufAktivAbortController = new AbortController()
      sendeJson(res, 202, { workflowId, schrittId: schritt.schritt_id, laufId })

      // (8) Nach dem Laufende: der Schritt bekommt seinen Ausgang, dann wandert der Cursor über
      // ermittleNaechstenSchritt auf den nächsten fälligen Schritt weiter und der Workflow-Status
      // folgt diesem Ausgang (F15 WS-2b (6)). Es wird dabei NICHTS gestartet — ein zweiter POST
      // .../starten führt den nächsten Schritt aus. WS-2c ersetzt nur diesen zweiten Aufruf.
      //
      // (3) Heilung einer verwaisten lauf_id: schlägt der Lauf FACHLICH fehl, ohne dass ein
      // Checkpoint entstanden ist, trägt der Schritt sonst eine lauf_id, unter der es nichts zu
      // sehen gibt — und Regel 3 von ermittleNaechstenSchritt macht ihn damit dauerhaft nicht
      // mehr startbar. Ein Tippfehler in schritt.rolle mauerte den Schritt zu. Deshalb: lauf_id
      // zurück auf null, Schritt zurück auf OFFEN, Workflow auf KLAERUNG_ERFORDERLICH mit dem
      // Ablehnungsgrund. Das ist KEIN Replan (es lief nichts) und verbraucht kein max_replans.
      //
      // Die Bedingung ist ENGER als ok === false und wird deshalb am Dateisystem abgelesen, nicht
      // am Ergebnistyp: F6as verweigereStart schreibt in fünf von sieben Ablehnungszweigen eine
      // reale VERWEIGERT-Wirkungsmarke, BEVOR starteGateway ok:false zurückgibt. Wo eine solche
      // Marke liegt, wird nichts zurückgesetzt — F1s Kette ist append-only (ARCHITECTURE.md §7),
      // und ein OFFEN über einer realen Wirkungsmarke wäre eine Lüge auf der Platte.
      // existsSync(<basis>/<laufId>) ist genau die Prüfung, mit der laufIdBelegt() schon heute
      // entscheidet, ob ein Retry unter derselben laufId möglich ist (D5, kein zweiter Regelsatz).
      //
      // GENAU gelesen (Reviewer-Pass 10.09.2026, K2): die Prüfung sagt "kein Checkpoint und keine
      // Wirkungsmarke unter <basis>/<laufId>", NICHT "kein Artefakt". Lineage-Artefakte liegen
      // woanders — registriereKernArtefakt schreibt nach <basis>/lineage-<artefaktId>/. Es gibt
      // deshalb einen realen Pfad, auf dem geheilt wird, obwohl etwas entstanden ist: F5 gelingt
      // und registriert kontextpaket-<laufId>, danach lehnt F6as pruefeStartziel-Zweig OHNE
      // Wirkungsmarke ab. Zurück bleibt ein verwaistes Kontextpaket, auf das kein Schritt mehr
      // zeigt. Die Kette selbst bleibt heil (der nächste Start zieht eine frische randomUUID) —
      // benannt, damit die Zusage nicht weiter reicht, als sie trägt.
      //
      // schritt.zeitgrenze_ms überstimmt vorlage.zeitgrenzeMs (E-M3-3, gepinntes Plandatum).
      starteLaufUndVergiss(laufId, eingabenErgebnis.eingaben, schritt.zeitgrenze_ms, (ergebnis, fehler) => {
        // Das Dateisystem ist das faktische Prädikat, nicht der Ergebnistyp: ein Wurf, BEVOR
        // etwas geschrieben wurde, heißt genauso "nichts ist passiert" wie eine F5-Ablehnung
        // (fuehreAufgabeDurch wirft z.B. bei einer Vorbedingungsverletzung, lange vor dem
        // ersten Checkpoint); ein Wurf DANACH findet das Verzeichnis und heilt nicht. Die
        // frühere Zusatzbedingung 'fehler === null' schloss den technischen Wurf aus und ließ
        // damit dieselbe verwaiste lauf_id zurück, die die Heilung verhindern soll
        // (Reviewer-Pass 10.09.2026, V1).
        //
        // Was das Dateisystem NICHT ersetzt: ein ok:true-Lauf wird nie geheilt, auch wenn unter
        // seiner laufId nichts läge. Ein ok:true ist durch F6a und F7 gelaufen, hat also
        // per Konstruktion eine Wirkungsmarke — läge trotzdem nichts da, wäre das ein Defekt und
        // kein Anlass, ein reales Ergebnis wegzuwerfen.
        const nichtErfolgreich = fehler !== null || ergebnis?.ok === false
        const heilbar = nichtErfolgreich && !existsSync(join(basisVerzeichnis, laufId))

        const schrittStatus = fehler !== null ? 'FEHLGESCHLAGEN' : normalisiereSchrittAusgang(ergebnis)
        const schrittFelder = heilbar ? { status: 'OFFEN', lauf_id: null } : { status: schrittStatus, lauf_id: laufId }

        const nachlauf = schreibeWorkflowFortschritt(
          workflowId,
          schritt.schritt_id,
          schrittFelder,
          (datenMitSchritt) => {
            // Ein geheilter Schritt hat nicht stattgefunden — es gibt kein Schrittergebnis, aus
            // dem ein Folgeschritt entstehen dürfte. Der Cursor bleibt auf ihm stehen, der
            // Mensch klärt (KLAERUNG_ERFORDERLICH), und ein erneuter Start ist danach möglich.
            if (heilbar) return { status: 'KLAERUNG_ERFORDERLICH', aktiver_schritt_id: schritt.schritt_id }
            const naechster = ermittleNaechstenSchritt(datenMitSchritt, { schrittId: schritt.schritt_id, ergebnis: schrittStatus, laufId })
            return { status: workflowStatusZuAusgang(naechster), aktiver_schritt_id: naechster.aktiverSchrittId }
          },
          profilReferenz,
          { basisVerzeichnis, schreiber: STILLER_SCHREIBER }
        )
        if (heilbar) {
          const anlass = fehler !== null ? `Wurf: ${String(fehler?.message ?? fehler)}` : beschreibeAblehnung(ergebnis)
          const eintrag = {
            zeitstempel: new Date().toISOString(),
            laufId,
            fehler: `Workflow '${workflowId}', Schritt '${schritt.schritt_id}': ${anlass} — kein Checkpoint geschrieben, Schritt auf OFFEN zurückgesetzt (kein Replan)`,
          }
          startfehlerListe.push(eintrag)
          console.error(`[leitstand] ${eintrag.fehler}`)
        }
        if (!nachlauf.ok) {
          // Kein Wurf: starteLaufUndVergiss fängt ihn zwar, aber ein stiller Startfehler-Eintrag
          // ist hier die ehrlichere Meldung — der Lauf selbst ist real gelaufen.
          const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: `Workflow '${workflowId}' nach Schritt '${schritt.schritt_id}': ${nachlauf.grund}` }
          startfehlerListe.push(eintrag)
          console.error(`[leitstand] ${eintrag.fehler}`)
        }
      })
      return
    }

    // F14 WS-4 (AK7, Teil 2): manueller Abbruch des gerade aktiven Laufs. Prüft ausschließlich gegen
    // laufAktivLaufId (D13, kein Multi-Lauf-Registry) — bei Treffer wird der bei dessen Start angelegte
    // AbortController ausgelöst und SOFORT geantwortet, ohne auf das Laufende zu warten (die bestehende
    // fuehreAufgabeDurch-Kette WS-1/WS-2/WS-3 läuft danach asynchron wie bisher fertig, siehe .then oben).
    if (req.method === 'POST' && pfad.startsWith('/api/laeufe/') && pfad.endsWith('/abbrechen')) {
      const laufId = decodeURIComponent(pfad.slice('/api/laeufe/'.length, pfad.length - '/abbrechen'.length))
      if (laufId.length === 0) {
        sendeJson(res, 400, { grund: "laufId darf nicht leer sein (Pfadform '/api/laeufe/<laufId>/abbrechen')" })
        return
      }
      if (LAUFID_UNZULAESSIGE_ZEICHEN.test(laufId)) {
        sendeJson(res, 400, { grund: `laufId enthält unzulässige Zeichen: ${JSON.stringify(laufId)}` })
        return
      }
      if (!laufAktiv || laufId !== laufAktivLaufId) {
        sendeJson(res, 404, { grund: `kein aktiver Lauf mit laufId '${laufId}' (D13) — Abbruch nicht möglich` })
        return
      }
      laufAktivAbortController.abort()
      sendeJson(res, 202, { grund: 'Abbruch angefordert' })
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

      // F14 WS-4 (AK8, löst F-175): eine terminale Entscheidung auf dem gerade aktiven Lauf würde
      // die noch laufende fuehreAufgabeDurch-Kette unterlaufen — nur 'terminal'/'kenntnisnahme' sind
      // betroffen (D13 gilt für Laufstarts, nicht für 'antwort'/'stale', AK6 aus F13 WS-2 bleibt
      // unverändert). Geprüft VOR jedem Schreiben, synchron gegen laufAktivLaufId (kein Dateizugriff nötig).
      if ((pruefung.art === 'terminal' || pruefung.art === 'kenntnisnahme') && laufAktiv && pruefung.laufId === laufAktivLaufId) {
        sendeJson(res, 400, { grund: `Lauf '${pruefung.laufId}' ist noch aktiv, Entscheidung nicht möglich (AK8)` })
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

/**
 * Prüft, ob die genannte PID noch lebt. process.kill(pid, 0) sendet kein Signal, sondern
 * fragt nur die Existenz ab: ESRCH = Prozess weg, EPERM = Prozess da, aber fremder
 * Eigentümer (zählt als lebend — Abbruch ist hier die sichere Seite).
 * @param pid - zu prüfende Prozesskennung
 * @returns true, wenn der Prozess existiert
 */
function pidLebt(pid) {
  // Ein pid-Feld, das keine positive Ganzzahl ist (fehlend, null, String, negativ), gilt
  // bewusst als tot und führt damit in den Heilungspfad — dieselbe Entscheidung wie bei
  // kaputtem JSON, kein Sonderfall. Eine Lock-Datei mit unbrauchbarem Inhalt ist kein Beleg
  // für eine laufende Instanz.
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (fehler) {
    return fehler.code === 'EPERM'
  }
}

/**
 * Belegt den prozessübergreifenden Instanz-Lock für ein Arbeitsverzeichnis (F-201).
 *
 * Der Erwerb läuft über EXKLUSIVES Anlegen (Flag 'wx'), nicht über existsSync-dann-
 * schreiben: zwei gleichzeitig gestartete Instanzen fänden beide keine Datei vor und
 * belegten beide den Lock — exakt die Race-Klasse, gegen die F-201 gebaut wurde. Nur
 * wenn 'wx' mit EEXIST scheitert, wird die vorgefundene Datei überhaupt gelesen.
 *
 * Lebt die darin genannte PID, wirft die Funktion — der Aufrufer (CLI-Bindeblock)
 * bricht damit VOR server.listen ab; die fremde Datei bleibt dabei unangetastet. Ist
 * die Datei unlesbar, kein gültiges JSON oder nennt sie eine tote PID, wird sie
 * entfernt und GENAU EINMAL neu angelegt: das ist der Heilungspfad nach einem harten
 * Absturz und führt bewusst NICHT zum Abbruch. Scheitert auch dieser zweite Versuch an
 * EEXIST, hat eine andere Instanz das Rennen um die verwaiste Datei gewonnen — dann
 * wird geworfen statt weiterprobiert.
 *
 * Bewusst als eigenständige Funktion und nicht inline im Bindeblock, damit
 * scripts/check-f15-instanzlock.mjs beide Pfade prüfen kann, ohne einen echten Server
 * zu binden. Aufgerufen wird sie ausschließlich aus dem CLI-Bindeblock unten — nie aus
 * erzeugeRequestHandler oder einem Request-Handler (siehe Dateikopf).
 *
 * @param basisVerzeichnis - Kontrollzustand-Wurzel, in der die Lock-Datei liegt
 * @param port - Port, den diese Instanz binden will (nur zur Diagnose in der Datei)
 * @returns { lockPfad, uebernommen } — uebernommen:true genau dann, wenn eine vorgefundene Datei entfernt und ersetzt wurde
 * @throws Error mit menschenlesbarer Meldung (PID, Port, Startzeit, Dateipfad), wenn eine lebende Instanz den Lock hält oder eine andere Instanz das Rennen gewonnen hat
 */
export function belegeInstanzLock(basisVerzeichnis, port) {
  const lockPfad = join(basisVerzeichnis, '.leitstand.lock')
  // Leerzustand wiederherstellen: vor dem Lock startete der Server auch ohne vorhandenes
  // kontrollzustand/ sauber mit leeren Listen (sammleLaeufe/sammleAuftraege/sammleWorkflows
  // prüfen alle mit existsSync). Der wx-Erwerb hat daraus einen ENOENT-Abbruch gemacht —
  // ein frisch geklontes Arbeitsverzeichnis wäre damit nicht mehr startbar. recursive:true
  // ist ein No-op, wenn das Verzeichnis schon existiert.
  mkdirSync(basisVerzeichnis, { recursive: true })
  /** Legt die Lock-Datei exklusiv an. @returns true bei Erfolg, false bei EEXIST (jeder andere fs-Fehler wird eingekleidet weitergeworfen) */
  const legeExklusivAn = () => {
    try {
      writeFileSync(lockPfad, `${JSON.stringify({ pid: process.pid, port, gestartetAm: new Date().toISOString() }, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
      return true
    } catch (fehler) {
      if (fehler.code === 'EEXIST') return false
      // Jeder andere fs-Fehler wird NICHT geschluckt, aber eingekleidet: der nackte
      // Node-Text nennt weder den Leitstand noch eine Handlung. Deckt zugleich den Fall ab,
      // dass .leitstand.lock ein Verzeichnis ist (EISDIR/EPERM) — dafür bewusst kein eigener
      // Zweig. Originalfehler bleibt als cause erhalten.
      throw new Error(
        `Der Leitstand konnte die Lock-Datei ${lockPfad} nicht anlegen (Fehlercode ${fehler.code ?? 'unbekannt'}). ` +
          'Prüfe die Schreibrechte auf das Verzeichnis; unter Windows kann auch ein Virenscanner- oder ' +
          'OneDrive-Handle die Datei kurzzeitig sperren — dann hilft ein zweiter Versuch.',
        { cause: fehler }
      )
    }
  }

  let uebernommen = false
  if (!legeExklusivAn()) {
    let vorgefunden = null
    try {
      const gelesen = JSON.parse(readFileSync(lockPfad, 'utf8'))
      if (typeof gelesen === 'object' && gelesen !== null) vorgefunden = gelesen
    } catch {
      // Unlesbar oder kaputtes JSON: wie eine verwaiste Datei behandeln (Heilungspfad).
      vorgefunden = null
    }
    if (vorgefunden !== null && pidLebt(vorgefunden.pid)) {
      throw new Error(
        `Es läuft bereits eine Leitstand-Instanz für dieses Arbeitsverzeichnis: PID ${vorgefunden.pid}, Port ${vorgefunden.port ?? 'unbekannt'}, gestartet ${vorgefunden.gestartetAm ?? 'unbekannt'}. ` +
          `Beende sie, oder entferne nach einem harten Absturz die Lock-Datei ${lockPfad} von Hand.`
      )
    }
    unlinkSync(lockPfad)
    uebernommen = true
    if (!legeExklusivAn()) {
      throw new Error(
        `Die verwaiste Lock-Datei ${lockPfad} wurde im selben Moment von einer anderen Leitstand-Instanz übernommen — diese hier startet nicht. Versuche es erneut, sobald klar ist, welche Instanz laufen soll.`
      )
    }
  }

  // Nur die EIGENE Datei wieder aufräumen: hat sie inzwischen eine fremde pid, gehört sie
  // einer anderen Instanz, die den Lock nach unserem Ende legitim übernommen hat.
  const raeumeAuf = () => {
    try {
      const aktuell = JSON.parse(readFileSync(lockPfad, 'utf8'))
      if (aktuell?.pid === process.pid) unlinkSync(lockPfad)
    } catch {
      // Datei bereits weg oder unlesbar — nichts zu tun.
    }
  }
  process.on('exit', raeumeAuf)
  // Signale lösen 'exit' NICHT aus. Ohne die beiden Handler bliebe nach jedem normalen
  // Ctrl+C eine Lock-Datei liegen, und der nächste Start meldete "Verwaiste Lock-Datei
  // übernommen" — eine Meldung, die bei fast jedem Start kommt, verliert ihre Warnwirkung
  // für den Fall, für den sie gedacht ist (echter Absturz bei laufendem Schritt).
  // SIGTERM wird unter Windows nicht real zugestellt; der Handler schadet dort nicht, der
  // Aufräumpfad läuft dort über SIGINT (Ctrl+C). Der exit-Hook bleibt als Netz für den
  // normalen Programmablauf. Kein Graceful-Shutdown des HTTP-Servers — bewusst nicht Teil
  // dieses Auftrags.
  // Exit-Code 0 statt der konventionellen 130/143 ist bewusst gewählt: der Leitstand wird
  // interaktiv über `npm run leitstand` beendet, und npm druckt bei jedem Exit != 0 einen
  // ELIFECYCLE-Fehlerblock nach einem völlig normalen Ctrl+C. Der Vertragsfall, der Exit 0
  // festschreibt, prüft damit eine gewollte Entscheidung, keine Nachlässigkeit.
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      raeumeAuf()
      process.exit(0)
    })
  }
  return { lockPfad, uebernommen }
}

// Nur beim direkten Aufruf (`npm run leitstand`) tatsächlich binden — ein Import dieser Datei aus
// scripts/check-f10-leitstand.mjs darf keinen echten Server starten.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // F14 WS-5 (Vorbereitung AK10): Startvorlage per Umgebungsvariable überschreibbar (Muster
  // LEITSTAND_PORT oben) — erlaubt Stefan einen realen Lauf gegen z. B.
  // startvorlagen/beispielprojekt-kurze-zeitgrenze.json, ohne startvorlagen/beispielprojekt.json
  // anzufassen: `LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/beispielprojekt-kurze-zeitgrenze.json npm run leitstand`.
  const startvorlagePfad = process.env.LEITSTAND_STARTVORLAGE_PFAD ?? STANDARD_STARTVORLAGE_PFAD
  // F-201: prozessübergreifender Instanz-Lock, VOR dem Binden. Dasselbe BASISVERZEICHNIS,
  // das erzeugeRequestHandler hier per Default benutzt — der Lock schützt genau dieses
  // kontrollzustand/, nicht den Port (den schützt EADDRINUSE ohnehin).
  try {
    const { lockPfad, uebernommen } = belegeInstanzLock(BASISVERZEICHNIS, PORT)
    if (uebernommen) console.log(`Verwaiste Lock-Datei ${lockPfad} übernommen (kein lebender Vorbesitzer).`)
  } catch (fehler) {
    console.error(fehler.message)
    process.exit(1)
  }
  const server = createServer(erzeugeRequestHandler({ startvorlagePfad }))
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Leitstand läuft auf http://127.0.0.1:${PORT} (Startvorlage: ${startvorlagePfad})`)
  })
}
