# F26 — Jarvis Chat v1

## ID
F26

## Titel
Rolle "jarvis", Schema, Dispatch-Endpunkt, realer CLI-Nachweis (WS-1);
Chat-View, clientseitiger Vorfilter, automatischer Lineage-Verlauf (WS-2a)

## Status
Status: ABGESCHLOSSEN

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Natürliche Eingabe im Projektkontext, die in Auftrag + Router mündet oder
eine Statusfrage deterministisch beantwortet (Zielbild §11–§13; „Behebe
F-123" oder „Was blockiert?" ohne Formular). WS-1 lieferte die Mechanik bis
zum real per HTTP ausgelösten, schemakonformen Jarvis-Lauf — Rolle, Schema,
Dispatch-Endpunkt (`POST /api/chat`) — und einen realen Nachweis, dass eine
Jarvis-Antwort als `lineage-chat-<projektId>`-Kernartefakt geschrieben und
gegen `schemas/kontrollzustand-lineage-payload.schema.json` validiert werden
kann (damals noch über ein externes Glue-Skript). WS-2a liefert die
Chat-View selbst, den deterministischen Vorfilter clientseitig und
verdrahtet den Lineage-Verlauf automatisch IN `POST /api/chat` — kein
Glue-Skript mehr nötig. Der Vorschlag-aus-Chat-Pfad (F22/F23) ist WS-2b.

## Nicht-Ziele
- Vorschlag-aus-Chat → F22-Pfad (Auftrag anlegen, Routen, Freigabe) und
  Anpassungswunsch → F23-ADJUST-Pfad (POST /api/workflows/<id>/abnahme mit
  `ergebnis: 'ANPASSUNG_ANGEFORDERT'` im SELBEN Workflow — kein eigener
  "ADJUST-Folgeworkflow" als Ressource, Klärung dieser Challenge-Runde) —
  beide sind WS-2b, brauchen aber die WS-2a-View, um einen Vorschlag
  überhaupt anzuzeigen und eine Aktion auszulösen.
- Streaming, mehrstufige Dialoge im Lauf (One-Shot bleibt, Muster
  router/scout), globaler Chat über Projekte (v1: nur Projektkontext), neuer
  Provider.
- Ein zweiter serverseitiger Attention-Regelsatz (bewusst NICHT gebaut,
  siehe Klärung 3 unten — der Vorfilter bleibt clientseitig, jetzt real
  gebaut in WS-2a, nicht nur als Absicht dokumentiert).

## Workstreams
- WS-1 — Rolle/Schema/Vorfilter-Grundlage/CLI-Nachweis. **ABGESCHLOSSEN**
  (AK1-AK6, siehe unten).
- WS-2a — Chat-View, clientseitiger Vorfilter, automatischer
  Lineage-Verlauf. Baudurchgang + Reviewer-/QA-Pass durchlaufen, Befunde
  behoben (AK7-AK11, siehe unten und "Feature Review").
- WS-2b — Vorschlag-aus-Chat → F22/F23-Anschluss. **ABGESCHLOSSEN** (#180):
  beide Pfade real bewiesen — der F22-Pfad (Auftrag anlegen, Routen,
  Freigabe) durch den realen, menschlich freigegebenen Bau, der
  `features/F26/nachweis-ws2b-testartefakt.md` selbst erzeugt hat; der
  F23-ADJUST-Pfad (`aktion.typ 'anpassen'` → `POST /api/workflows/<id>/
  abnahme` mit `ANPASSUNG_ANGEFORDERT`) real nachgewiesen in derselben Datei,
  Abschnitte D-E.
- WS-3 (Nachzug) — F-423-Fix: `schemas/ergebnis-jarvis.schema.json`
  Codex-kompatibel umgebaut (kein `allOf`/`if`/`then`/`oneOf` mehr, alle
  Felder top-level `required` mit `null`-Option statt optional), die drei
  Kopplungen ausschließlich noch in `validiereErgebnisJarvis` erzwungen.
  **ABGESCHLOSSEN**, siehe "Feature Review" und `features/F26/nachweis-f423.md`.

## Akzeptanzkriterien

- AK1 Rolle `jarvis` an den drei bestehenden Stellen registriert (D5-Muster
  wie router/scout): `src/rollen/index.ts` (`erlaubte_werkzeugsatz_arten:
  ['lesend']`, `erlaubte_worker: ['claude-code', 'codex']`,
  `erlaubtes_output_schema: 'ergebnis-jarvis'`, `ausschlussmuster:
  ['src/**']`, `benoetigte_capabilities: ['TASK_CLASSIFICATION',
  'STRUCTURED_OUTPUT', 'REPO_READ']`); `src/rollen/rollen.test.ts`
  (`ERWARTETE_ROLLEN` + Formassertions erweitert);
  `scripts/check-f17-rollenvertrag.mjs` (`jarvis: ['src/**']` in der
  Ausschlussmuster-Map, sonst wäre das Gate nach der Registrierung rot
  gelaufen).

- AK2 `schemas/ergebnis-jarvis.schema.json` neu, `additionalProperties:
  false`, Form exakt wie in der Plan-Akte zitiert: `{ art: antwort |
  auftrag_vorschlag | aktion, antwort (Pflicht), auftrag?{titel, text},
  aktion?{typ: routen|oeffnen, ziel}, bezug?{auftrag_id|workitem} }` (`bezug`
  erlaubt GENAU eines der beiden Unterfelder). Zusätzlich (QA-Pass,
  nachträglich verbindlich gemacht): `art` und ihr passendes Unterobjekt
  sind gekoppelt — `auftrag_vorschlag` verlangt `auftrag`, `aktion` verlangt
  `aktion` (`allOf`/`if`/`then` im Schema, dieselbe Regel in
  `validiereErgebnisJarvis`), sonst könnte ein WS-2-Client ungeprüft
  `ergebnis.auftrag.titel` lesen und auf `undefined` treffen.
  `src/jarvis/index.ts` (`validiereErgebnisJarvis`, handgeschrieben statt
  ajv, D5-Muster `src/scout/index.ts`) + sieben Beispieldateien unter
  `schemas/examples/`.

- AK3 Deterministischer Vorfilter bleibt bewusst CLIENTSEITIG (Klärung 3 der
  Plan-Akte, F21-Entscheidung: kein `/api/attention`-Endpunkt) — WS-1 baut
  dafür keinen zweiten serverseitigen Regelsatz. Dokumentiert statt
  stillschweigend übergangen (CLAUDE.md-Entscheidungsregel 5).

- AK4 Server-Endpunkt `POST /api/chat` (Muster `POST
  /api/auftraege/<id>/routen`, `scripts/leitstand-server.mjs`): nimmt
  `{nachricht}` (nicht-leerer String, höchstens 8000 Zeichen — QA-Befund,
  ohne Obergrenze ginge ein beliebig langer Paste 1:1 in Auftragsakte und
  Prompt), D13 vor jeder Formprüfung, die selbst schon Ressourcen braucht,
  löst Worker/Eingaben auf und registriert ERST NACH deren Erfolg einen
  Auftrag aus der Nachricht (`registriereAuftrag`, Audit-Transparenz: die
  Auftragsakte trägt die reine Nachricht) — Reihenfolge bewusst so
  (Code-Review-Befund: anders als beim Router-Endpunkt, der einen bereits
  bestehenden Auftrag nur lädt, ERZEUGT dieser Endpunkt den Auftrag neu; ein
  Fehlschlag vor dem Schreiben hinterlässt deshalb keinen Orphan). Dispatcht
  danach einen Ein-Schuss-Lauf
  mit `rolle: 'jarvis'`, `output_schema: 'ergebnis-jarvis'` (Codex mit
  `--output-schema`, wenn verfügbar, sonst `claude-code`-Rückfall mit
  Fence-Stripping — Muster Router-Endpunkt, kein neuer Parsing-Mechanismus,
  `leseJarvisErgebnisAusLaufakte` reicht `leseRollenErgebnisRohstrom`
  unverändert durch). Der tatsächlich an den Worker gehende Prompt kommt aus
  `baueJarvisAuftragstext` (`src/jarvis/index.ts`) — bei router/scout wurde
  die Rolleninstruktion je Klassifikationslauf von Hand in den Auftragstext
  geschrieben (Nachweis `features/F18/nachweis-ws3-szenario-a.md`); ein Chat
  hat keinen Menschen, der das vor jeder Nachricht neu formuliert, der
  Server übernimmt es hier (Entschieden, Punkt unten).

- AK5 Gate `scripts/check-f26-jarvis.mjs` — jetzt gebaut, nicht erst WS-2
  (Begründung: Rolle/Schema/Endpoint-Dispatch sind bereits real und
  mechanisch testbar; ein `npm-run-check`-Gate braucht dafür keinen echten
  Claude-Code-Kindprozess). Deckt: (a)/(a2) Rollenvertrag + Rot-/Grünfälle
  gegen `loeseAusfuehrungsEingabenAuf`, (b) Schema + fünf Beispiele gegen
  `validiereErgebnisJarvis`, (c) reale `POST /api/chat`-Rotfälle
  (Bodyprüfung: fehlende/leere/typfalsche `nachricht`, unbekanntes Feld,
  kaputtes JSON), (d) `leseJarvisErgebnisAusLaufakte` über präparierte
  Rohstrom-Fixtures (Grün- und zwei Rotfälle), (e) der Lineage-Chat-
  Mechanismus (`registriereKernArtefakt('chat-<projektId>', …)` →
  `validiereLineageEintrag`, Grün- und Rotfall). Bewusst OHNE echten
  Kindprozess-Lauf im automatisierten Gate (teuer, nicht für jeden
  `npm run check`-Durchlauf geeignet) — der reale Lauf lebt eigenständig in
  `features/F26/nachweis-ws1.md` (Muster F16/F27: realer Nachweis getrennt
  vom automatisierten Gate).

- AK6 (Realer Nachweis) Ein echter Jarvis-Lauf über `POST /api/chat` gegen
  den echten Leitstand-Prozess mit echtem Claude-Code-Kindprozess, real
  `ABGESCHLOSSEN`/`ERFOLGREICH`. Danach `scripts/jarvis-chat-nachweis.mjs`
  real ausgeführt: liest die Laufakte, validiert das Ergebnis gegen
  `ergebnis-jarvis.schema.json`, schreibt einen `chat-ai-workforce`-
  Kernartefakt (Checkpoint-Kette `lineage-chat-ai-workforce`) mit der
  Nachricht und der Jarvis-Antwort im freien `daten`-Feld (NICHT
  `eingaben`), validiert den geschriebenen Eintrag gegen
  `schemas/kontrollzustand-lineage-payload.schema.json`
  (`validiereLineageEintrag`) — 0 Verstöße. Details, Rohstrom-Referenzen und
  ein real gefundener Formatfehler (Prompt nachgebessert):
  `features/F26/nachweis-ws1.md`.

- AK7 (WS-2a) Deterministischer Vorfilter, CLIENTSEITIG, neues Modul
  `public/leitstand/jarvis-vorfilter.js` (Muster `attention-daten.js`, F21):
  erkennt `"was braucht mich"` (Attention-Aggregat, dieselbe Filterregel wie
  `views/attention.js` + ein einmaliger `holeOffeneP0P1Workitems`-Abruf) und
  `"Status"`/`"Status <Kurzname>"` (vier Zahlen aus dem ohnehin gepollten
  `GET /api/zustand`-Aggregat) und beantwortet beides lokal, ohne
  Serverkontakt. QA-Befund (real gefunden, behoben): das erste
  `Status`-Muster war nur am Anfang verankert (`/^status\b/i`) und
  verschluckte jeden Nachsatz einer echten Frage kommentarlos — jetzt
  symmetrisch zu `"was braucht mich"` beidseitig verankert
  (`/^status(\s+[a-z0-9][a-z0-9-]*)?\??$/i`). Kein Treffer → Nachricht geht
  unverändert an `POST /api/chat`.

- AK8 (WS-2a) Chat-View `#/chat` (`public/leitstand/views/chat.js`):
  Kontextzeile (bestehende Projekt-Kopfzeile, kein neues Pattern),
  Eingabefeld, Verlaufsliste, ehrlicher „Lauf gestartet"-Hinweis vor der
  Antwort (kein Streaming, One-Shot bleibt). Persistierter Verlauf
  (`GET /api/chat`) wird beim Betreten geladen; ein laufender Lauf wird über
  den bestehenden 2-Sekunden-Poll verfolgt (kein neuer Timer). Vorfilter-
  Antworten und die Fehlanzeige eines nicht erfolgreichen Laufs sind NUR
  session-lokal (kein Lineage-Eintrag ohne echten Jarvis-Lauf). QA-Befunde
  (real reproduziert, behoben):
  1. **kritisch**: ein Projektwechsel während eines ausstehenden Chat-Laufs
     ließ die View für immer gegen den FALSCHEN, jetzt fremden
     `api.js`-Präfix pollen (404 bei jedem Tick) — Senden-Button blieb
     dauerhaft gesperrt, nur ein voller Reload half. Behoben über einen
     neuen Hook `abonniereProjektWechsel` (`projekt-kontext.js`), den
     `chat.js` nutzt, um seinen gesamten lokalen Zustand bei jedem
     Projektwechsel zurückzusetzen.
  2. Lokale Einträge (Vorfilter-/Fehlanzeigen) blieben ohne diesen Reset
     projektübergreifend sichtbar — mit demselben Fix geschlossen.
  3. Ein transienter `GET /api/chat`-Fehlschlag exakt im Moment der
     Lauf-Terminierung ließ die fertige Antwort spurlos verschwinden (weder
     Pending-Anzeige noch Eintrag) — behoben: der ausstehende Lauf bleibt
     markiert, bis das Neuladen wirklich erfolgreich war, der nächste
     Poll-Tick versucht es sonst erneut.
  4. Ein Reload MITTEN in einem ausstehenden Lauf verliert die
     Pending-Anzeige (Modulspeicher, kein Server-Zustand dafür) — als
     bewusste, dokumentierte Grenze belassen (siehe "Bekannte Grenzen"),
     kein stiller Datenverlust (der Server schreibt unabhängig vom Client),
     aber kein automatisches Nachladen ohne erneuten View-Eintritt.

- AK9 (WS-2a) `POST /api/chat` (`scripts/leitstand-server.mjs`) erweitert:
  neue `erzeugeRequestHandler`-Option `projektId` (Default `'ai-workforce'`,
  von `baueProjektHandlerMap` je Registereintrag mit `projekt.id` befüllt)
  löst die in WS-1 "Bekannte Grenzen" dokumentierte Lücke. Extrahierte
  Funktion `verarbeiteJarvisChatErgebnis` (Muster `verarbeiteRouterErgebnis`)
  liest das Jarvis-Ergebnis aus der Laufakte und registriert bei einem real
  `ABGESCHLOSSEN`/`ERFOLGREICH` beendeten Lauf automatisch den
  `chat-<projektId>`-Kernartefakt — verdrahtet über einen `nachLauf`-
  Callback in `starteLaufUndVergiss`, synchron im selben Tick wie der
  D13-Reset (kein Wettlauf, Reviewer-Pass bestätigt). Jede andere
  Terminallage schreibt bewusst nichts.

- AK10 (WS-2a) Neuer lesender Endpunkt `GET /api/chat`
  (`scripts/leitstand-server.mjs`): projiziert den `chat-<projektId>`-
  Artefakt-Verlauf über `listeVersionen` (`src/lineage-registry`, dieselbe
  Leseschicht wie `ladeArtefaktVersion`) in `{verlauf: [...]}`. Reviewer-
  Befund (behoben): ein roher `ladeGueltigeCheckpoints`-Aufruf mit
  selbstgebautem `lineage-`-Präfix hätte `listeVersionen`s
  `istArtefaktVersion`-Filter umgangen — ein `stale_entscheidung`-Eintrag in
  derselben Kette (`haltFestStaleEntscheidung` schreibt generisch nach
  `lineage-<artefaktId>`) wäre sonst ungefiltert als kaputter
  `{laufId:null,…}`-Verlaufseintrag beim Client angekommen. Eine leere Kette
  ist kein Fehler (`{verlauf: []}`).

- AK11 (Realer Nachweis, WS-2a) Drei echte Jarvis-Läufe über `POST /api/chat`
  gegen den echten Leitstand-Prozess (`features/F26/nachweis-ws2a.md`):
  (A) ein Codex-Lauf real `FEHLGESCHLAGEN` — neuer, real gefundener Bug
  **F-423** (`state/findings.md`): Codex' `--output-schema` akzeptiert kein
  `allOf`, das WS-1s Schema-Kopplung aber verwendet; kein Lineage-Eintrag
  geschrieben. (B) ein `claude-code`-Lauf real `VERWEIGERT` (Modell
  versuchte einen nicht erlaubten Werkzeugaufruf, korrigierte sich selbst)
  — ebenfalls kein Lineage-Eintrag; an diesem Lauf real das oben genannte
  `KLAERUNG_ERFORDERLICH`-während-aktiv-Verhalten gefunden und in `chat.js`
  behoben. (C) ein `claude-code`-Lauf real `ABGESCHLOSSEN`/`ERFOLGREICH` —
  `GET /api/chat` zeigt danach automatisch einen dritten Eintrag (ohne
  `scripts/jarvis-chat-nachweis.mjs`), `validiereLineageEintrag`: 0
  Verstöße, `versionSequenz: 3`, korrekt an die zwei WS-1-Einträge
  angeschlossen. Vorfilter-Logik zusätzlich direkt mit Node verifiziert
  (Mustererkennung + deterministische Textbildung). Kein Browser-/DOM-Test
  der View selbst (kein Automatisierungswerkzeug in dieser Umgebung
  verfügbar, siehe "Bekannte Grenzen").

## Dependencies
- F17 — Rollenvertrag (`ROLLENVERTRAEGE`,
  `loeseAusfuehrungsEingabenAuf`-Durchsetzung), auf dessen Mechanik F26
  ausschließlich mit einer additiven Rolle aufsetzt — keine zweite
  Durchsetzungslogik.
- F19 — Capability Foundation (`ressourcen.json`, `F346_AUSNAHMEN` in
  `src/capabilities-ansicht/index.ts`), die AK1 um einen vierten, eng
  benannten Eintrag (`jarvis`/`claude-code`/`STRUCTURED_OUTPUT`) erweitert —
  derselbe strukturelle Grund wie bei `router`/`code-reviewer`/`scout`:
  `claude-code` hat keinen `--output-schema`-Mechanismus (F-337).
- F18 — Router v1 (`POST /api/auftraege/<id>/routen`,
  `loeseAusfuehrungsEingabenAuf`, Worker-Auflösung claude-code/codex), dessen
  Endpunkt-Muster `POST /api/chat` unverändert übernimmt.
- F22 — Click-to-Work v1. Nach Plan blockiert F26 v1 nichts Hartes, aber der
  Vorschlag-aus-Chat-Pfad (WS-2) mündet in F22s Auftrag-Route/Freigabe-Kette.
- F25 — Projekte v1 (`erzeugeMultiProjektDispatcher`,
  `/api/projekte/<id>/…`, `baueProjektHandlerMap`), über den `POST /api/chat`
  zusätzlich zum unpräfigierten Pfad für `ai-workforce` auch
  projektspezifisch erreichbar ist. WS-1s Bekannte Grenze (`erzeugeRequestHandler`
  kannte seine Projekt-id nicht) ist mit WS-2a geschlossen (AK9, neue
  `projektId`-Option, von `baueProjektHandlerMap` durchgereicht).

## Betroffene Primitive
`ROLLENVERTRAEGE`, `schemas/ergebnis-jarvis.schema.json`,
`src/jarvis/index.ts`, `POST /api/chat`, `GET /api/chat` (neu, WS-2a),
`leseJarvisErgebnisAusLaufakte`, `verarbeiteJarvisChatErgebnis` (neu,
WS-2a), `erzeugeRequestHandler`-Option `projektId` (neu, WS-2a),
`src/lineage-registry/index.ts` (`registriereKernArtefakt`/`listeVersionen`
für `chat-<projektId>`, unverändert, additiv genutzt),
`public/leitstand/jarvis-vorfilter.js` (neu, WS-2a),
`public/leitstand/views/chat.js` (neu, WS-2a),
`public/leitstand/projekt-kontext.js` (`abonniereProjektWechsel`, neu,
WS-2a).

## Risiken
Claude-code hat keinen `--output-schema`-Mechanismus (F-337) — ein Jarvis-
Lauf ohne verfügbaren Codex-Worker hängt von Fence-Stripping und einem
disziplinierten Prompt ab (real beobachtet, siehe "Entschieden" unten: der
erste reale Lauf lieferte erklärenden Text vor dem JSON, Prompt musste
nachgebessert werden). Ein Auftragsvorschlag/Aktionsvorschlag aus dem Chat
ist in WS-1 noch nicht an den F22-/F23-Pfad angeschlossen — reines
Datenformat ohne Wirkung, bis WS-2 den Vorschlag anzeigt und eine
Bedienung dafür anbietet.

## Entschieden
- Klärung 3 (Plan-Akte, verbindlich für WS-1): der deterministische
  Vorfilter läuft clientseitig (F21-Entscheidung, kein
  `/api/attention`-Endpunkt) — WS-1 baut nur Rolle/Schema/Dispatch-Endpunkt.
- Der Prompt, der die Rolleninstruktion trägt (Ausgabeschema, Enum-Werte,
  Codezaun-Verbot), wird SERVERSEITIG automatisiert gebaut
  (`baueJarvisAuftragstext`, `src/jarvis/index.ts`) statt — wie bei
  router/scout — von Hand je Klassifikationsauftrag formuliert: ein Chat hat
  keinen Menschen, der das vor jeder Nachricht neu tippt. Die registrierte
  Auftragsakte trägt trotzdem die REINE Nachricht (Audit-Transparenz), die
  Rolleninstruktion kommt erst beim Aufruf des Ausführungskanals hinzu.
- Bei fehlendem Codex-Worker läuft `jarvis` wie `router`/`scout` als
  `claude-code` mit Fence-Stripping statt `--output-schema` — real bewusst
  in Kauf genommene, dokumentierte Grenze (F-346-Ausnahme, F346_AUSNAHMEN).

## Bekannte Grenzen (dokumentiert statt stillschweigend übergangen — CLAUDE.md-Entscheidungsregel 5)
- ~~`POST /api/chat` schreibt KEINEN `lineage-chat-<projektId>`-Eintrag
  automatisch~~ — **geschlossen in WS-2a** (AK9: `projektId`-Option +
  `nachLauf`-Callback, real nachgewiesen in `features/F26/nachweis-ws2a.md`
  Abschnitt C). Historisch: WS-1 kannte die eigene Projekt-id noch nicht
  und musste über ein externes Glue-Skript (`scripts/jarvis-chat-nachweis.mjs`)
  schreiben.
- (WS-2a, Code-Review-Befund) `baueProjektHandlerMap`s "Selbst"-Kollaps
  (F25: ein Registereintrag, dessen `repoWurzel` exakt der des laufenden
  Serverprozesses entspricht, bekommt keine eigene Handler-Instanz, sondern
  zeigt auf `defaultHandler`) kollidiert potenziell mit der jetzt
  projektspezifischen Chat-Historie: gäbe es je ZWEI Registereinträge mit
  unterschiedlicher `id`, die beide auf denselben Repo-Pfad zeigen, würden
  `GET /api/projekte/<id1>/chat` und `.../<id2>/chat` denselben
  `lineage-chat-ai-workforce`-Verlauf zeigen, ohne die Warnung, die der
  Nicht-Selbst-Dedup-Zweig für diesen Fall bereits ausgibt. Aktuell nur
  hypothetisch (genau ein solcher Registereintrag existiert), bewusst nicht
  behoben — Anlass für eine spätere Warnung/Prüfung, falls ein zweiter
  Registereintrag mit identischem `repoWurzel` je hinzukommt.
- (WS-2a, QA-Befund) Ein Seiten-Reload MITTEN in einem ausstehenden
  Chat-Lauf verliert die Pending-Anzeige der View (`ausstehenderLauf` lebt
  nur im Modulspeicher, keine Server-Projektion "läuft gerade etwas" für
  einen einzelnen Chat). Kein Datenverlust — der Server schreibt den
  Lineage-Eintrag unabhängig vom Client fertig, `GET /api/chat` findet ihn
  beim nächsten View-Eintritt —, aber kein automatisches Nachladen ohne
  erneutes Verlassen/Betreten von `#/chat`. Eine echte Lösung bräuchte eine
  serverseitige "aktiver Chat-Lauf je Projekt"-Projektion, die es noch nicht
  gibt; bewusst nicht in WS-2a gebaut (D13 kennt nur EINEN
  Workforce-weiten aktiven Lauf, nicht dessen Chat-spezifischen Kontext).
- (WS-2a, Code-Review-Befund, Muster wie oben) Die Worker-Auflösung steht
  weiterhin dreifach nahezu wortgleich (Router-, Chat-Endpunkt,
  unverändert seit WS-1) — kein neuer dritter Aufrufer in WS-2a, weiterhin
  YAGNI.
- ~~**F-423** (`state/findings.md`, real gefunden in WS-2a): Jarvis-Chat mit
  Codex-Worker scheitert real IMMER — `schemas/ergebnis-jarvis.schema.json`s
  `allOf`-Konstrukt (WS-1-QA-Fix) wird von Codex' `--output-schema`
  abgelehnt (`invalid_json_schema`)~~ — **gelöst** (WS-3-Nachzug): Schema
  Codex-kompatibel umgebaut (kein `allOf`/`if`/`then`/`oneOf` mehr, `auftrag`/
  `aktion`/`bezug` top-level `required` mit Typ `["object","null"]` statt
  optional), die drei Kopplungen ausschließlich im Validator
  (`validiereErgebnisJarvis`) erzwungen — akzeptiert weiterhin auch die
  ältere, schlankere `claude-code`-Form (Feld weggelassen statt `null`). Real
  nachgewiesen mit beiden Workern, siehe "Feature Review" und
  `features/F26/nachweis-f423.md`.
- (WS-2a) Kein Browser-/DOM-Test der Chat-View selbst durchgeführt — kein
  projekteigener `run`-Skill für den Leitstand, kein Browser-
  Automatisierungswerkzeug in dieser Umgebung installiert (siehe
  `features/F26/nachweis-ws2a.md` Abschnitt D). Vorfilter-LOGIK und der
  Server-Rundlauf (WS-2a AK9-AK11) sind real geprüft, die DOM-Verdrahtung
  folgt unverändert den bereits produktiv laufenden Mustern aus
  `views/attention.js`/`views/workflows.js`. Empfehlung: einmal manuell im
  Browser prüfen, bevor die Gesamtakte final als geprüft gilt.
- `POST /api/chat` wählt IMMER `werkzeugsatz: 'lesend'` und (bei fehlendem
  Codex) `modell: vorlage.modell` — keine Wiederverwendung des Auftrags-
  Kontexts über mehrere Chat-Nachrichten hinweg (One-Shot bleibt, Nicht-Ziel
  laut Plan). Ein Folgemessage im selben Gespräch bekommt keinen Bezug zur
  vorherigen Antwort, außer der Mensch nennt ihn selbst (`bezug`-Feld ist
  vom MODELL gesetzt, nicht vom Server aus dem Gesprächsverlauf abgeleitet
  — es gibt in WS-1 noch keinen Gesprächsverlauf).
- Die Worker-Auflösung (`leseRessourcenRoh`/`loeseRessourcenAuf`/Codex-
  Verfügbarkeit) steht im Router-Endpunkt und im Chat-Endpunkt nahezu
  wortgleich (Code-Review-Befund, kein Blocker) — beide Stellen sind bei
  einer künftigen Änderung an der Codex-Verfügbarkeitslogik (z. B. ein
  F-337-Fix) synchron zu halten. Bewusst nicht in WS-1 extrahiert (YAGNI bei
  zwei Aufrufern); ein dritter Aufrufer wäre der Anlass für einen
  gemeinsamen Helfer.
- AK6s und AK11s realer Nachweis decken weiterhin nur die Statusfrage
  (`art: antwort`) ab, keinen realen Lauf mit `art: auftrag_vorschlag`/
  `aktion`, keine Leerraum-/Sonderzeichen-Nachricht (QA-Befund WS-1,
  bestätigt weiterhin offen) — für WS-2a-Scope vertretbar (die Form dieser
  Fälle ist über die Schema-Beispiele und `validiereErgebnisJarvis`-Unit-
  Tests abgedeckt, nur kein echter Kindprozess-Lauf dafür), aber ein guter
  erster Testfall für WS-2b, sobald der Chat-View-Bedienpfad reale
  Auftragsvorschläge anzeigen und auslösen muss.

## Feature Review
`npm run check` grün (552 Tests, alle Gates inkl. neuem
`scripts/check-f26-jarvis.mjs`). Realer Nachweis: zwei echte Jarvis-Läufe
über `POST /api/chat` gegen den echten Leitstand-Prozess mit echtem
Claude-Code-Kindprozess (`features/F26/nachweis-ws1.md`) — der erste real
FEHLGESCHLAGEN am Parsen (erklärender Satz vor dem JSON-Codezaun, trotz
expliziten Codezaun-Verbots im ersten Promptentwurf), der Prompt real
nachgebessert (explizite "erste/letzte Zeile ist { / }"-Anweisung), der
zweite Lauf real `ABGESCHLOSSEN`/`ERFOLGREICH` mit schemakonformem
Ergebnis. Ein `chat-ai-workforce`-Kernartefakt real geschrieben und gegen
`schemas/kontrollzustand-lineage-payload.schema.json` validiert (0
Verstöße) — die Nachricht liegt im freien `daten`-Feld, `eingaben` bleibt
leer.

Reviewer-/QA-Pass (frischer Kontext, F-046): Reviewer freigegeben mit
Hinweisen — (1) `registriereAuftrag` lief vor der Worker-/Eingaben-
Auflösung und hätte bei deren Scheitern einen Orphan-Auftrag hinterlassen
(anders als beim Router-Endpunkt, der einen bestehenden Auftrag nur lädt);
Reihenfolge getauscht, Auftrag wird jetzt erst nach erfolgreicher Prüfung
registriert. (2) Duplizierte Worker-Auflösung zwischen Router- und
Chat-Endpunkt — als "Bekannte Grenze" dokumentiert, kein Blocker (YAGNI bei
zwei Aufrufern). QA freigegeben mit Hinweisen — (1) **kritisch für WS-2**:
Schema/Validator erzwangen `auftrag`/`aktion` nicht in Abhängigkeit von
`art`, ein WS-2-Client hätte sich auf ein Unterobjekt verlassen können, das
gar nicht da ist; behoben über `allOf`/`if`/`then` im Schema plus
gespiegelte Prüfung in `validiereErgebnisJarvis`, zwei neue
Beispieldateien und zwei neue Unit-Tests. (2) UTF-16-unsichere
Titel-Kürzung (`.slice` statt Codepoint-Array) konnte ein unpaariges
Surrogat in die Auftragsakte schreiben; behoben (`[...nachricht].slice(…)`).
(3) Keine Obergrenze für `nachricht` (Kosten-/Log-Bloat-Risiko für WS-2);
behoben (8000-Zeichen-Grenze, 400 bei Überschreitung, Gate-Fall ergänzt).
(4)/(5) dokumentierte, nicht behobene Beobachtungen (fehlende
`lineage-chat`-Verdrahtung, AK6-Nachweis deckt nur eine Nachrichtenart) —
in "Bekannte Grenzen" aufgenommen. Alle Befunde behoben bzw. dokumentiert,
`npm run check` danach erneut grün bestätigt.

### WS-2a
`npm run check` grün (554 Tests, alle Gates inkl. erweitertem
`scripts/check-f26-jarvis.mjs` Abschnitt (f): reale HTTP-Integration mit
fake `fuehreAufgabeDurchFn`, Grün-/Rotfall für den automatischen
Lineage-Write). Realer Nachweis: drei echte Jarvis-Läufe über
`POST /api/chat` gegen den echten Leitstand-Prozess
(`features/F26/nachweis-ws2a.md`) — Codex real `FEHLGESCHLAGEN` (neuer Fund
F-423), `claude-code` real `VERWEIGERT` (an diesem Lauf das
`KLAERUNG_ERFORDERLICH`-während-aktiv-Verhalten real gefunden und in
`chat.js` sofort behoben), `claude-code` real `ABGESCHLOSSEN`/
`ERFOLGREICH` mit automatisch geschriebenem, gegen `validiereLineageEintrag`
gültigem Lineage-Eintrag (`versionSequenz: 3`, ohne Glue-Skript). Vorfilter-
Logik direkt mit Node verifiziert (Mustererkennung + Textbildung); kein
Browser-/DOM-Test der View selbst (siehe "Bekannte Grenzen").

Reviewer-/QA-Pass (frischer Kontext, F-046): Reviewer freigegeben mit
Hinweisen — (1) `GET /api/chat` sollte `listeVersionen` statt eines rohen,
selbstgebauten `ladeGueltigeCheckpoints`-Aufrufs nutzen, sonst würde ein
(aktuell hypothetischer) `stale_entscheidung`-Eintrag in derselben Kette
ungefiltert als kaputter Verlaufseintrag beim Client ankommen; behoben.
(2) `baueProjektHandlerMap`s "Selbst"-Kollaps könnte bei einem künftigen
zweiten Registereintrag mit identischem `repoWurzel` zwei Projekt-ids
dieselbe Chat-Historie zeigen lassen; als "Bekannte Grenze" dokumentiert,
kein Blocker (aktuell nur ein Registereintrag betroffen). (3) Erinnerung,
`feature.md` zu aktualisieren — dieser Abschnitt. QA **nicht freigegeben**
im ersten Durchgang — vier reale, reproduzierte Befunde: (1) **kritisch**:
ein Projektwechsel während eines ausstehenden Chat-Laufs ließ die View für
immer gegen den falschen `api.js`-Präfix pollen (404 bei jedem Tick,
Senden-Button dauerhaft gesperrt, nur ein voller Reload half) — behoben
über den neuen Hook `abonniereProjektWechsel` (`projekt-kontext.js`), den
`chat.js` für einen vollständigen lokalen Zustands-Reset bei jedem
Projektwechsel nutzt. (2) lokale Vorfilter-/Fehleinträge blieben ohne
diesen Reset projektübergreifend sichtbar — mit demselben Fix geschlossen.
(3) der deterministische `"Status"`-Vorfilter (`/^status\b/i`, nur vorne
verankert) verschluckte jeden Nachsatz einer echten, mit "Status"
beginnenden Frage kommentarlos, ohne Weg zu Jarvis — behoben, jetzt
symmetrisch zu `"was braucht mich"` beidseitig verankert. (4) ein
transienter `GET /api/chat`-Fehlschlag exakt im Moment der
Lauf-Terminierung ließ die fertige Antwort spurlos verschwinden — behoben,
der ausstehende Lauf bleibt markiert, bis das Neuladen wirklich
erfolgreich war. Kleinere, nicht behobene Beobachtungen (Reload während
eines ausstehenden Laufs, kein Enter-zum-Senden, kein clientseitiger
Zeichenzähler außer `maxlength`, roher `409: <grund>`-Fehlertext) als
"Bekannte Grenzen" bzw. akzeptierter Stil dokumentiert. Alle kritischen und
mittleren Befunde behoben, `npm run check` danach erneut grün bestätigt
(554 Tests).

### WS-3 (Nachzug) — F-423-Fix

`npm run check` grün, bestehende WS-1/2a/2b-Tests liefen ohne Anpassung
durch (28/28 in `src/jarvis/jarvis.test.ts`). Spike (max. 30 Min, vor dem
Umbau, `features/F26/nachweis-f423.md` Teil 1) klärte real gegen Codex-CLI
0.153.4, was dessen Structured-Output-Endpunkt akzeptiert: kein optionales
Feld (jede `properties`-Eigenschaft muss in `required` stehen, Optionalität
nur über `["typ","null"]`), kein `oneOf` (immer abgelehnt), kein
`allOf`/`if`/`then`. Schema entsprechend umgebaut, die drei Kopplungen
(`art`→`auftrag`/`aktion`, `aktion.typ 'anpassen'`→`bezug.auftrag_id`) aus
dem Schema in `validiereErgebnisJarvis` verschoben — der Validator behandelt
ein fehlendes Feld und ein explizit auf `null` gesetztes Feld gleichwertig
(zentraler Helper `istGesetzt`, D5, Reviewer-Befund), damit die ältere
`claude-code`-Form (Feld weggelassen) und die neue, Codex-erzwungene Form
(Feld `null`) beide gültig bleiben. `baueJarvisAuftragstext` minimal
nachgezogen (QA-Befund: veraltete „vier Felder"-Angabe bei tatsächlich fünf
Top-Level-Feldern, plus ein Satz, dass ein strukturiert antwortender Worker
ein nicht gesetztes Feld auch auf `null` setzen darf). Gate
`scripts/check-f26-jarvis.mjs` erweitert: (b2) rekursiver Scan, dass das
Schema kein `allOf`/`if`/`then`/`oneOf` mehr enthält (mit eigener
Kalibrierung, Scan-Funktion Reviewer-Befund D5-parametrisiert statt
dupliziert), (b3) Rot-/Grünfall-Paare für alle drei Kopplungen in der
Codex-Form (Feld `null` statt weggelassen).

Realer Nachweis (`features/F26/nachweis-f423.md` Teil 2+3): drei echte
Jarvis-Läufe über `POST /api/chat` gegen den echten Leitstand-Prozess — (A)
`startvorlagen/ai-workforce.json` (Codex konfiguriert), `art: 'antwort'`,
Lauf real `ABGESCHLOSSEN`/`ERFOLGREICH` mit worker `codex`, Ergebnis in der
vorhergesagten Null-Form, Lineage-Eintrag geschrieben (kein
`invalid_json_schema` mehr); (B) `startvorlagen/beispielprojekt.json`
(`claude-code`-Fallback), `art: 'antwort'`, Lauf real
`ABGESCHLOSSEN`/`ERFOLGREICH`, Ergebnis weiterhin in der älteren,
schlankeren Form (Felder weggelassen), ebenfalls gültig und mit
Lineage-Eintrag; (C, QA-Nachforderung) Codex-Worker mit `art: 'aktion'`,
`aktion.typ: 'anpassen'`, `bezug.auftrag_id` gesetzt — der Pfad mit dem
höchsten strukturellen Risiko des ursprünglichen Bugs (gekoppeltes
Unterobjekt + `bezug`-Exklusivität in der Null-Form) — ebenfalls real
`ABGESCHLOSSEN`/`ERFOLGREICH` durch die volle Pipeline.

Reviewer-/QA-Pass (frischer Kontext, F-046): Reviewer freigegeben mit
Hinweisen — keine funktionalen Bugs in der Null-Handling-Logik; Schema,
Validator, Typen und Gate-Abschnitte intern konsistent geprüft (Rot-/
Grünfall-Kombinationen von Hand nachgerechnet, `(b2)`-Kalibrierung verifiziert,
Beispieldateien-/Testzahlen-Claims gegengeprüft). Vier Hinweise, alle
übernommen: (1) `'X' in obj && obj.X !== null` mehrfach verstreut →
zentraler Helper `istGesetzt` (D5); (2) `(b2)`s Scan-/Kalibrierungsfunktion
fast identisch dupliziert → parametrisiert; (3) `(b3)`s `rotAktionNull` ohne
unmittelbaren Grünfall-Nachbarn in derselben Codex-Null-Form → `gruenAktion`
ergänzt; (4) dieser Platzhalter selbst muss vor Commit ersetzt werden (F-046)
→ dieser Absatz. QA freigegeben mit Hinweisen — ein Befund vor
Freigabe geschlossen: der reale Nachweis deckte ursprünglich nur
`art: 'antwort'` mit Codex ab, nicht den strukturell riskanteren
`aktion.typ: 'anpassen'`-Pfad → dritter realer Lauf nachgeholt (siehe oben,
Nachweis Abschnitt C). Weitere, niedrigschwellige QA-Beobachtungen ohne
Freigabe-Blockade: (a) veraltete Feldzahl im Prompt (behoben, siehe oben);
(b) das Prompt-Beispiel-JSON suggeriert bedingtes Weglassen, was für den
Codex-Pfad strukturell nicht mehr zutrifft (Codex liefert wegen des
erzwungenen Schemas immer alle fünf Felder) — funktional folgenlos, da
Codex' `--output-schema` die Form ohnehin mechanisch erzwingt, unabhängig
vom Prompt-Wortlaut, minimal klargestellt (siehe oben); (c) der Validator
erzwingt nur „art X ⇒ Unterobjekt Y gesetzt", nie die Gegenrichtung
(„Unterobjekt Y gesetzt ⇒ art X" bzw. „art X ⇒ ein nicht zugehöriges
Unterobjekt ist null") — bestand bereits vor F-423 identisch in der
`allOf`/`if`/`then`-Fassung, keine Regression durch diesen Fix, aktuell
folgenlos (weder `chat.js` noch der Server werten `auftrag`/`aktion`
art-abhängig aus), aber vor einer künftigen WS, die das tut, erneut zu
prüfen — bewusst nicht in diesem Nachzug behoben (Scope: Codex-Kompatibilität,
keine neue Vertragsregel). `npm run check` nach allen Reviewer-/QA-Korrekturen
erneut grün bestätigt.

## Rollback
Rolle `jarvis` aus `ROLLENVERTRAEGE`/`rollen.test.ts`/
`check-f17-rollenvertrag.mjs` und den F346_AUSNAHMEN-Eintrag entfernen;
`schemas/ergebnis-jarvis.schema.json` + Beispiele, `src/jarvis/`,
`POST /api/chat` + `GET /api/chat` (`scripts/leitstand-server.mjs`,
inkl. `verarbeiteJarvisChatErgebnis` und der `projektId`-Option),
`scripts/check-f26-jarvis.mjs` (+ Eintrag in `npm run check`) und
`scripts/jarvis-chat-nachweis.mjs` entfernen; WS-2a zusätzlich
`public/leitstand/jarvis-vorfilter.js`, `public/leitstand/views/chat.js`,
den `#/chat`-Nav-Link/View-Container in `index.html`, die
`abonniereProjektWechsel`-Ergänzung in `projekt-kontext.js` und die
`sendeChatNachricht`/`holeChatVerlauf`-Wrapper in `api.js` entfernen — rein
additiv, kein bestehender Pfad ändert sein Verhalten.
