# F26 — Jarvis Chat v1

## ID
F26

## Titel
Rolle "jarvis", Schema, Dispatch-Endpunkt, realer CLI-Nachweis — WS-1

## Status
Status: FEATURE_GATE

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Natürliche Eingabe im Projektkontext, die in Auftrag + Router mündet oder
eine Statusfrage deterministisch beantwortet (Zielbild §11–§13; „Behebe
F-123" oder „Was blockiert?" ohne Formular). WS-1 liefert die Mechanik bis
zum real per HTTP ausgelösten, schemakonformen Jarvis-Lauf — Rolle, Schema,
Dispatch-Endpunkt (`POST /api/chat`) — und einen realen Nachweis, dass eine
Jarvis-Antwort als `lineage-chat-<projektId>`-Kernartefakt geschrieben und
gegen `schemas/kontrollzustand-lineage-payload.schema.json` validiert werden
kann. Ohne Chat-View, ohne sichtbaren Verlauf, ohne clientseitigen
Vorfilter — das ist WS-2.

## Nicht-Ziele
- Chat-View im Leitstand, sichtbarer Verlauf, automatische
  `lineage-chat-<projekt>`-Schreibung bei jeder Nachricht — WS-2.
- Deterministischer Vorfilter ohne Modell (Muster „Was braucht mich",
  „Status <Projekt>") — läuft laut Plan CLIENTSEITIG (F21-Entscheidung, kein
  `/api/attention`-Endpunkt) und ist damit WS-2-Scope (Chat-View).
- Vorschlag-aus-Chat → F22-Pfad (Auftrag anlegen, Routen, Freigabe) und
  Anpassungswunsch → F23-ADJUST-Pfad — beide brauchen die WS-2-View, um
  einen Vorschlag überhaupt anzuzeigen und eine Aktion auszulösen.
- Streaming, mehrstufige Dialoge im Lauf (One-Shot bleibt, Muster
  router/scout), globaler Chat über Projekte (v1: nur Projektkontext), neuer
  Provider.
- Ein zweiter serverseitiger Attention-Regelsatz (bewusst NICHT gebaut,
  siehe Klärung 3 unten).

## Workstreams
- WS-1 — Rolle/Schema/Vorfilter-Grundlage/CLI-Nachweis. **FEATURE_GATE**
  (AK1-AK6, siehe unten).
- WS-2 — View + Verlauf. Offen, eigener Bauauftrag nach diesem Feature
  Review.

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
  `/api/projekte/<id>/…`), über den `POST /api/chat` zusätzlich zum
  unpräfigierten Pfad für `ai-workforce` auch projektspezifisch erreichbar
  ist. Bekannte Grenze: `erzeugeRequestHandler` bekommt seine Projekt-id
  nicht als Option (F25 WS-1) — die automatische Verlauf-Schreibung bei
  jeder Chat-Nachricht bleibt deshalb WS-2-Scope (siehe "Bekannte Grenzen").

## Betroffene Primitive
`ROLLENVERTRAEGE`, `schemas/ergebnis-jarvis.schema.json`,
`src/jarvis/index.ts`, `POST /api/chat`, `leseJarvisErgebnisAusLaufakte`,
`src/lineage-registry/index.ts` (`registriereKernArtefakt` für
`chat-<projektId>`, unverändert, additiv genutzt).

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
- `POST /api/chat` schreibt in WS-1 KEINEN `lineage-chat-<projektId>`-
  Eintrag automatisch — die Handler-Instanz, die den Endpunkt bedient,
  kennt ihre eigene Projekt-id nicht (`erzeugeRequestHandler` bekommt sie
  nicht als Option, F25 WS-1). Der reale Nachweis dieses Auftrags
  (`features/F26/nachweis-ws1.md`) schreibt/validiert den Lineage-Eintrag
  deshalb über ein eigenständiges Glue-Skript
  (`scripts/jarvis-chat-nachweis.mjs`, Muster `scripts/route-auftrag.mjs`)
  AUSSERHALB des Endpunkts. WS-2 („Verlauf als Kernartefakte", AK4 der
  Plan-Akte: „Reload verliert nichts") verdrahtet das automatisch — dafür
  muss die Projekt-id entweder als zusätzliche `erzeugeRequestHandler`-
  Option durchgereicht oder aus dem `/api/projekte/<id>/…`-Präfix vor dem
  Dispatcher-Rewrite abgeleitet werden (siehe F25 `loeseProjektPfade`).
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
- AK6s realer Nachweis deckt nur eine Statusfrage (`art: antwort`) ab, keinen
  realen Lauf mit `art: auftrag_vorschlag`/`aktion`, keine Leerraum-/
  Sonderzeichen-Nachricht (QA-Befund) — für WS-1-Scope vertretbar (die Form
  dieser Fälle ist über die Schema-Beispiele und `validiereErgebnisJarvis`-
  Unit-Tests abgedeckt, nur kein echter Kindprozess-Lauf dafür), aber ein
  guter erster Testfall für WS-2, sobald eine Chat-View reale
  Auftragsvorschläge anzeigen muss.

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

## Rollback
Rolle `jarvis` aus `ROLLENVERTRAEGE`/`rollen.test.ts`/
`check-f17-rollenvertrag.mjs` und den F346_AUSNAHMEN-Eintrag entfernen;
`schemas/ergebnis-jarvis.schema.json` + Beispiele, `src/jarvis/`,
`POST /api/chat` (`scripts/leitstand-server.mjs`),
`scripts/check-f26-jarvis.mjs` (+ Eintrag in `npm run check`) und
`scripts/jarvis-chat-nachweis.mjs` entfernen — rein additiv, kein
bestehender Pfad ändert sein Verhalten.
