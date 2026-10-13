# F45 B2a-2 — Plan (Arbeitspaket)

Branch `f45/b2a2-arbeitspaket`, Basis `b3fcbf9` (main mit B2a-1, #329). Grundlage: Auftrag F45 B2a-2 (13.10.2026),
Fixpaket-Zeile B2a-2, Findings F-938, F-989, F-1071 (K31), F-1082 (7) (QA L3). Entscheidungen Challenger 13.10.2026:
Arbeitspaket = Auftrag v0 additiv (kein neuer Artefakttyp, kein DoD-Feld — DoD kommt über die Projektkarte); QA L3:
Prüfmaßstab des Reviews (DoD aus CLAUDE.md, ARCHITECTURE.md) im Stand VOR dem Bau.

## Plan v1

### Befunde vorab (Code gegen b3fcbf9)
- Auftrag v0 (`src/auftrag`, Schema `kontrollzustand-auftrag-payload`) trägt `herkunft.art`, `akzeptanzkriterien`,
  `nicht_ziele`. Validator `validiereAuftragDaten` ist handgeschrieben (kein ajv), `registriereAuftrag` validiert nicht.
- Click-to-Work aus einem Finding (`public/leitstand/views/workboard.js` `starteBearbeitung`) legt sofort per POST
  `/api/auftraege` an (`baueAuftragstext`: Titel, Beschreibung, Fundstelle, `workitem:finding:<id>`), ohne AK, ohne
  herkunft. Das Finding-Workitem trägt `massnahme`.
- Feature-Akte (`POST /api/features/<id>/auftrag`, `scripts/leitstand/routen-f35.mjs`) setzt herkunft `feature_akte`,
  AK, Nicht-Ziele; der Auftragstext enthält Ziel, Nicht-Ziele und AK bereits als Text (`baueAuftragAusFeatureAkte`).
  „Bauen aus der Roadmap“ geht über denselben Weg (Workboard-Einstieg der Feature-Akte).
- Schrittstart `starteWorkflowSchritt` (`scripts/leitstand-server.mjs` Z. 6041): architekt bekommt
  `baueArchitektAuftragstext(auftragstext, …)`, ausfuehrung den rohen Auftragstext plus Instruktionen; code-reviewer den
  AK-Block (`baueAkPruefInstruktion`, Z. 6252) und die Projektkarte; die Karte (Vorhaben) wiederholt für architekt/advisor
  Titel, Ziel, AK, Nicht-Ziele und sagt „Feature-Akte: kein Feature-Bezug im Auftrag (folgt mit B2a-2)“.
- Verknüpfung Feature ↔ Ablauf (`public/leitstand/entwicklung-daten.js` `baueVerknuepfung`) nur über
  `workitem_referenz` (aus dem Auftragstext gelesen, `leseWorkitemReferenz`, GET `/api/auftraege`).
- Architekt-Ergebnis `schemas/ergebnis-architektur.schema.json` (Codex-Strict-Dialekt: jede Eigenschaft in `required`,
  `additionalProperties: false` je Ebene); Validator `validiereErgebnisArchitektur` (`src/architekt`), Leser
  `leseArchitekturErgebnisAusLaufakte` (Server Z. 4289), Nachlauf Regel 1c Z. 6549.
- `ausfuehrung` hat in allen Vorlagen `freigabe: ZWINGEND` → der Start kommt über POST `/api/workflows/<id>/freigabe`
  (Z. 9818 → `starteWorkflowSchritt` Z. 10144); ein Fehlstart dort schreibt einen Halt (`schreibeStartfehlerHalt`).
- Prüfmaßstab des Reviews heute: `leseProjektkarteEingaben` (Z. 5260) liest DoD über `leseHarnessInventar(laufWurzel)`
  und ARCHITECTURE.md über `leseKarteDatei` — beides nach dem Bau. Basis-Commit: Arbeitsordner-Artefakt
  `basis_commit` (HEAD beim Anlegen); ohne Arbeitsordner gibt es heute keinen festgehaltenen Start-HEAD.

### 1 Auftrag v0 additiv (`schemas/kontrollzustand-auftrag-payload.schema.json`, `src/auftrag`)
- Neue optionale Felder: `bereiche: string[]` (≥ 1, je nicht leer, eindeutig), `risiko: 'niedrig'|'mittel'|'hoch'`,
  `feature_ref: string` (`^F[0-9]+[A-Za-z]?$`, Muster `roadmap.schema.json`), `einrichtung: [{ id (^E[0-9]+$, eindeutig),
  schritt (nicht leer), wann: 'vor_dem_bau'|'waehrend_des_baus', status: 'offen'|'erledigt' }]` (darf leer sein).
- `herkunft.art` additiv `finding`.
- Pflichtregel je Herkunft (eine Funktion `validiereAuftragPflichtfelder`): `finding` und `feature_akte` verlangen
  ≥ 1 AK. Aufgerufen von `validiereAuftragDaten` und vom POST-Formular. Im Schema als Beschreibung (das Schema dieses
  Repos nutzt kein `if/then`; der Validator ist die Durchsetzung).
- `registriereAuftrag`: Optionen additiv um die vier Felder und `erstelltAm` (neue Version behält das erste
  `erstellt_am`); validiert die Daten vor dem Schreiben (wirft mit Verstoßliste — alle Aufrufer fangen schon).
  `optionenAusAuftrag(daten)` übernimmt alle optionalen Felder einer bestehenden Version (für neue Versionen, damit kein
  Feld verloren geht). Alte Aufträge bleiben gültig (Beispiele `schemas/examples/` valid alt/neu, invalid je Regel).

### 2 Renderfunktion `baueArbeitspaketBlock(daten, ziel)` (`src/auftrag`, rein)
- Liefert `null`, wenn der Auftrag kein Arbeitspaket-Feld trägt (keins von `bereiche`, `risiko`, `einrichtung`;
  `herkunft.art` ≠ `finding`) → Auftragstext bitgenau wie heute. `feature_ref` allein löst keinen Block aus (er ist
  kein Blockfeld; er wirkt in Karte und Verknüpfung).
- Sonst ein Block `## Arbeitspaket`: Ziel (Workflow-Ziel, sonst Titel), AK mit IDs, Nicht-Ziele, Betroffene Bereiche
  (oder „nicht benannt“), Risiko (oder „nicht eingestuft“), Einrichtung durch Stefan (je Schritt id, Status, wann),
  Feature-Akte (`features/<ref>/feature.md`, falls gesetzt). Doppelung vermeiden: bei `herkunft.art = feature_akte`
  stehen AK/Nicht-Ziele schon im Auftragstext → nur die AK-IDs mit Verweis „Wortlaut oben im Auftrag“.
- Server: einzige Stelle in `starteWorkflowSchritt`, für `architekt` und `ausfuehrung` (nach dem Rollenzweig, vor den
  Hinweisen), kein zweiter Textbau. code-reviewer: unverändert AK-Block, kein Arbeitspaket-Block (Doppelung).
- Projektkarte (Vorhaben) entdoppeln: trägt der Auftrag einen Arbeitspaket-Block, verweist die Karte für architekt auf
  ihn („Ziel, AK, Nicht-Ziele: siehe Arbeitspaket in diesem Auftrag“) statt sie zu wiederholen; Feature-Akte-Zeile mit
  `feature_ref` → Pfad, sonst „kein Feature-Bezug im Auftrag.“ (der veraltete Zusatz „(folgt mit B2a-2)“ fällt weg —
  einzige Textänderung für alte Aufträge, und nur in der Karte, deren Text ohnehin mit jedem Quellstand wechselt).
  Löst F-1082 (2).

### 3 F-938 Click-to-Work mit AK-Entwurf
- `workboard.js`: „Auftrag vorbereiten“ an einem Finding öffnet zuerst die Phase `entwurf` im Click-to-Work-Bereich:
  AK-Entwurf aus der Maßnahme (reine Funktion `baueAkEntwurf(workitem)` → `[{id:'AK1', text: Maßnahme}]`; leere
  Maßnahme → ein leeres Feld), je AK ein Textfeld, „AK hinzufügen“, „Entfernen“, „Auftrag anlegen“ (gesperrt ohne
  mindestens ein nicht leeres AK), „Abbrechen“. Erst „Auftrag anlegen“ ruft POST `/api/auftraege` mit
  `herkunft: {art:'finding'}` und `akzeptanzkriterien` (IDs neu durchnummeriert); danach wie heute routen.
- Server `pruefeAuftragsformular`: optionale `akzeptanzkriterien`, `nicht_ziele`, `bereiche`, `risiko`, `feature_ref`
  über die Validatoren aus `src/auftrag`; Pflichtregel je Herkunft → 400 mit Grund.
- Feature-Akten erfüllen die Regel schon (`baueAuftragAusFeatureAkte` lehnt eine Akte ohne AK ab).

### 4 F-989 Feature-Bezug
- `baueUndRegistriereAuftragAusFeatureAkte` setzt `feature_ref: featureId`.
- GET `/api/auftraege` (`baueAuftragKopfdaten`) liefert `feature_ref`; `baueVerknuepfung` nutzt
  `workitem:feature:<feature_ref>` vor `workitem_referenz`.

### 5 F-1071 Einrichtung
- `ergebnis-architektur.schema.json`: Feld `einrichtung` (Array `{schritt, wann}`) — im Codex-Dialekt strukturell in
  `required` (wie `kategorie`), darf leer sein; Validator behandelt ein fehlendes Feld wie `[]` (alte Ergebnisse).
  Beschreibung im Schema erklärt dem Architekten, was hineingehört (Konten, Schlüssel, Dienste, Berechtigungen, die
  Stefan einrichten muss). Keine Änderung der Rolleninstruktion (hielte den Auftragstext alter Aufträge nicht bitgenau).
- `leseArchitekturErgebnisAusLaufakte` liefert zusätzlich `einrichtung`. Nachlauf des Architekt-Schritts (Regel 1c,
  nur gültiges Ergebnis): nicht leere Liste → neue Auftragsversion über `registriereAuftrag` (IDs E1…En, Status `offen`;
  ein Schritt mit gleichem Text und gleichem `wann` behält `erledigt` bei einem Replan); gleiche Liste → keine neue
  Version. Scheitert die Übernahme, wird sie ein Verstoß der Regel 1c (Halt, sichtbar) — der Bau startet nie ohne Liste.
- GET `/api/workflows/<id>` liefert `einrichtung` (aus dem Auftrag, sonst `null`).
- POST `/api/workflows/<id>/einrichtung` `{ id, status }`: CSRF/Host zentral, Laufsperre `pruefeGlobaleLaufSperre`,
  400/404/409 mit Grund; schreibt eine neue Auftragsversion über `registriereAuftrag`.
- Startsperre: `starteWorkflowSchritt` lehnt `ausfuehrung` mit offenem `vor_dem_bau`-Schritt ab (`art: 'konflikt'`,
  Grund nennt die Schritte) — gilt für alle sechs Startwege. Zusätzlich prüft POST `/freigabe` bei FREIGEGEBEN für
  einen `ausfuehrung`-Schritt VOR dem Festhalten der Entscheidung → 409 `einrichtungOffen` mit Grund, nichts
  geschrieben; nach dem Abhaken startet dieselbe Freigabe.
- Leitstand (Ablauf, `views/workflow-detail.js` `renderTimeline`): vor dem Ausführungsschritt ein Eintrag
  „Einrichtung durch dich“ mit jedem Schritt (Text, wann, Status) und Knopf „Erledigt“ bzw. „Wieder öffnen“
  (`views/workflows.js` Aktion `einrichtung`), Hinweis, dass der Bau erst nach den Vor-dem-Bau-Schritten startet.
  Texte über i18n (de/en). Render-Nachweis 1440/390.

### 6 QA L3 (F-1082 (7)): Prüfmaßstab im Stand vor dem Bau
- Workflow v0 additiv `basis_commit` (optional, `^[0-9a-f]{40,64}$`): beim ersten Schrittstart ohne Arbeitsordner
  setzt der Server HEAD des Projekts (`git rev-parse HEAD`, lesend) in dieselbe Workflow-Version, die den Schritt auf
  LAEUFT setzt. Mit Arbeitsordner gilt dessen `basis_commit`.
- `leseProjektkarteEingaben` für `code-reviewer`: CLAUDE.md und ARCHITECTURE.md per `git show <basis>:<datei>` (lesend,
  im Laufordner); DoD über `leseDodPunkte(text)`. Weicht der aktuelle Stand im Laufordner ab (oder ist die Datei neu /
  gelöscht), steht in der Karte (Qualität, oben, nicht kürzbar): „Prüfmaßstab im Bau geändert: <Datei> — die Änderung ist
  Teil des Reviews“. Kein Basis-Commit (Altbestand) oder `git show` scheitert → Lücke in `fehlend` („… im Stand vor dem
  Bau nicht lesbar (<Grund>) — Stand nach dem Bau verwendet“) und Rückfall auf den Nachher-Stand mit diesem Hinweis.
- Architekt/Advisor unverändert (vor dem Bau ohnehin derselbe Stand). ADRs des Reviews bleiben Nachher-Stand (nicht im
  Auftrag) → Rest als neues Finding.

### 7 Gate `scripts/check-f45-b2a2-arbeitspaket.mjs` (in `npm run check`)
(a) alter Auftrag (Beispiel ohne neue Felder) gültig, neuer (alle Felder) gültig; (b) `baueArbeitspaketBlock` = null
ohne neue Felder und über den echten HTTP-Pfad (Attrappe `fuehreAufgabeDurch`, Gerüst wie f45-b2a1): Ausführungs-
auftrag eines alten Auftrags enthält keinen Arbeitspaket-Block und ist gleich dem erwarteten Text; neuer Auftrag → Block
genau einmal; (c) POST `/api/auftraege` mit `herkunft finding` ohne AK → 400, mit AK → 201; `registriereAuftrag` wirft;
(d) Workflow mit offenem `vor_dem_bau` → Freigabe 409 mit Grund, Workflow unverändert; POST `/einrichtung` erledigt →
Freigabe startet den Bau; (e) Review-Karte: Basis-Commit mit CLAUDE.md A, Arbeitsordner-Stand B → Karte zeigt DoD aus A
und den Hinweis „Prüfmaßstab im Bau geändert: CLAUDE.md“; ohne Basis → Lücke in `fehlend`. Rotfälle kalibriert: je Fall
ein bewusst falscher Eingang, an dem die Prüfung rot wird (Muster der bestehenden Gates).
Unit-Tests: `src/auftrag`, `src/architekt`, `src/projektkarte`, `src/workflow` (basis_commit),
`entwicklung-daten.test.mjs` (feature_ref), Workboard-Entwurf, `workflow-detail.test.mjs` (Einrichtung).

### 8 Doku/Register
F-938, F-989, F-1071 erledigt bzw. Nachtrag; F-1082 (2) und (7) erledigt; neues Finding für Reste (ADRs im
Nachher-Stand; AK-Entwurf nur aus der Maßnahme). Fixpaket-Zeile B2a-2 Ist, Akte F45, STATUS, ARCHITECTURE.md (§1 Satz
zu `src/auftrag` Arbeitspaket). K36/K37 nicht doppelt.

### Offene Punkte
- **O1** Einrichtungs-Hinweis an den Architekten nur über die Schema-Beschreibung (bitgenau-Vorgabe) — reicht das, oder
  ein Satz in der Rolleninstruktion (ändert jeden Architekt-Auftrag)?
- **O2** `basis_commit` am Workflow (Schemaänderung WORKFLOW_V0) gegenüber „HEAD zur Review-Zeit“ (ohne Arbeitsordner
  committet der Bau nie; nur ein menschlicher Commit dazwischen verschiebt HEAD).
- **O3** AK-Entwurf als Phase im Click-to-Work-Bereich statt modalem `<dialog>` (gleiches Muster wie „Vorschlag“).
- **O4** POST `/einrichtung` unter der Laufsperre: Abhaken während eines laufenden Schritts ist gesperrt (wie die
  anderen Routen) — auch wenn es nur den Auftrag betrifft.

## Advisor-Pass (13.10.2026, frischer Kontext, `architecture-advisor`)
Urteil **Nicht freigegeben**. Vor dem Bau: (V1) O1 — claude-code bekommt kein `--output-schema`, die Rolleninstruktion
fordert „GENAU diese Form … kein weiteres Feld“ (`src/architekt/index.ts:560–571`) → `einrichtung` muss in den Formblock
der Instruktion; (V2) bitgenau-Definition widersprüchlich (auch Abschnitt 6 ändert die Review-Karte alter Abläufe);
(V3) `check-f35-ws1-feature-auftrag.mjs:248–257` (F35 AK2) verlangt 400 für `akzeptanzkriterien` im POST-Formular;
(V4) gescheiterte Übernahme umgehbar über POST `/entscheidung` (Z. 9666/9732), Replan mit leerer Liste schreibt keine
Version; (V5) `feature_ref` deckt den F-989-Fall (freier Auftrag, Chat) nicht, `bereiche`/`risiko` setzt niemand.
Läuft mit: i18n vier Sprachen; CSRF-Gate-Routenform; Gate f13 (kein `registriereAuftrag(` zwischen
`/api/entscheidungen` und Rückfall); f39 (d) keine `undefined`-Schlüssel aus `pruefeAuftragsformular`; Entwurf liest
DOM erst beim Klick; eigener Sperrgrund beim Abhaken; Gate (b) mit festem Vergleichstext aus `b3fcbf9`; Gate-Fall
Projektmodus (Vorher-Stand = Skelett); Herkunft der Liste (lauf_id) offen; Ort der Einrichtung (Projektordner vs.
Arbeitsordner) offen; O2-Alternative `basis_ref` der Änderungsübersicht; Zuschnitt an der Grenze.
Hinweis Prozess: Der Bau der risikoarmen Teile (Auftrag-Schema/Validator, Architekt-Feld, `feature_ref`, Karte,
AK-Entwurf) lief parallel zum Pass an — Abweichung vom Ablauf, im Bericht genannt.

## Plan v2
Änderungen gegenüber v1 (Rest unverändert). Entscheidungen im Bau, im Rahmen des Auftrags getroffen und im Bericht
zur Bestätigung durch den Challenger markiert (E1–E4):
- **E1 (V1) Architekt-Instruktion:** `einrichtung` steht im Formblock der Rolleninstruktion (beide Modi) plus ein Satz,
  was hineingehört. Folge von Umfang 5 (Schema); ohne das liefert ein claude-code-Architekt das Feld nie und Codex
  bekäme widersprüchliche Vorgaben.
- **E2 (V2) bitgenau:** gilt für den Text, den der Auftrag liefert: Für einen Auftrag ohne neue Felder ist der
  Ausführungsauftrag bitgenau wie in `b3fcbf9` (Gate (b) mit festem Vergleichstext, aus `b3fcbf9` erzeugt), der
  Review-Auftrag außerhalb der Projektkarte ebenso. Ausgenommen: die Projektkarte (wechselt ohnehin mit jedem Quellstand;
  neue Feature-Akte-Zeile, Prüfmaßstab-Zeilen/Lücken) und der Formblock der Architekt-Instruktion (E1).
- **E3 (V3) POST-Formular:** `akzeptanzkriterien` nur zusammen mit `herkunft.art = finding` (dann Pflicht ≥ 1); ohne diese
  Herkunft bleibt das Formular für AK zu (F35 AK2 unverändert, Gate unverändert). `nicht_ziele`, `bereiche`, `risiko`,
  `feature_ref` bleiben im Formular zu.
- **E4 (V5) Reichweite:** `feature_ref` nur dort, wo der Bezug bekannt ist (Feature-Akte = auch „Bauen aus der Roadmap“,
  wie im Auftrag); F-989 → teilweise (freier Auftrag/Chat ohne Bezug bleibt „Ablauf ohne Feature“). `bereiche`/`risiko`:
  Schema und Darstellung da, gesetzt von niemandem (keine Kopplung an die Kontrolltiefe) → Rest-Finding.
- **V4 Übernahme ohne Umgehung:** eine Funktion `gleicheEinrichtungAb(workflowDaten, auftragVersion)` liest das
  Ergebnis des Architekt-Schritts, auf den der Ausführungsschritt verweist, und schreibt bei jeder Abweichung (auch einer
  leeren Liste, wenn der Auftrag schon eine trägt) eine neue Auftragsversion; gleiche Liste → nichts. Aufgerufen im
  Nachlauf des Architekten (Liste früh sichtbar; Fehler → Verstoß Regel 1c) UND vor jedem Ausführungsstart (Startsperre
  in `starteWorkflowSchritt` und Vorprüfung in POST `/freigabe`): scheitert der Abgleich, wird der Start mit Grund
  abgelehnt. Damit greift die Sperre auch nach POST `/entscheidung`.
- **Abhaken:** eigene Sperrmeldung („während ein Lauf aktiv ist, kann die Einrichtung nicht geändert werden“) statt der
  D13-Formulierung; Route vor `/api/entscheidungen` (Gate f13), Routenform für das CSRF-Gate. Hinweis im Leitstand: was
  eingerichtet wird, muss für den Bau erreichbar sein (Umgebungsvariable bzw. Arbeitsordner) — Abgrenzung zu F-1072 (B2b).
- **QA L3:** wie v1 (`basis_commit` am Workflow, Auftrag: „HEAD beim Ablaufstart“). Gate-Fall Projektmodus: Vorher-Stand
  Skelett-ARCHITECTURE.md, nachher gefüllt → Karte zeigt Vorher-Stand („noch nicht beschrieben“) plus Hinweis „im Bau
  geändert“. Checkliste und ADRs bleiben Nachher-Stand → Rest-Finding.
- **Rest-Finding (neu):** Herkunft der Einrichtungsliste (lauf_id des Architekten) nicht im Auftrag; `bereiche`/`risiko`
  ohne Setzer; F-989 für freie Aufträge; ADRs/Checkliste des Reviews im Nachher-Stand; AK-Entwurf nur aus der Maßnahme.

## Advisor-Nachpass Plan v2 (13.10.2026, frischer Kontext)
Urteil **Freigegeben mit Hinweisen**. Übernommen: (H1) ist das Architekt-Ergebnis ungültig oder unlesbar, bleibt die
Liste des Auftrags unverändert und der Ausführungsstart wird mit Grund abgelehnt — nie mit `[]` überschreiben; (H2)
„gleiche Liste“ = gleiche Folge der Paare (`schritt`, `wann`), Status zählt nicht — Abhaken übersteht jeden weiteren
Abgleich; (H3) neue Kommentare ohne die von f15/f2b/f2b2/b2a1 gezählten Zeichenketten; (H4) nach dem Abgleich die
Auftragsversion neu laden; Gate (d) prüft „Workflow unverändert“; (H5) Formular ohne `undefined`-Schlüssel, Gate-Fall
„finding ohne AK → 400“. Rotfälle in Gate (d): „ungültiges Ergebnis löscht die Liste nicht“, „Abhaken übersteht den
nächsten Start“.
