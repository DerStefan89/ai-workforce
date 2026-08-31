# Advisor-Findings — Plan v1 F6a WS2/WS3: Prozessstart, Beobachtungsbasis, realer Nachweis

Slug: f6a-ws2-ws3-prozessstart
Stand: 2026-08-31
Rolle: Advisor (frischer Kontext, Repo-Lesezugriff über device_bash,
kein Schreibrecht)
Geprüfter Plan: `state/plan-v1-f6a-ws2-ws3-prozessstart.md`

## Kopf — was gegen welche Quellen geprüft wurde

- `state/plan-v1-f6a-ws2-ws3-prozessstart.md` (vollständig)
- `features/F6a/feature.md` (vollständig, alle Abschnitte: Ziel, Scope,
  Nicht-Ziele, Akzeptanzkriterien, Zuordnung, Dependencies,
  Workstream-Liste, Entscheidungs-Referenzen)
- `features/F6a/journal.md` (vollständig, alle Einträge vom 31.08.2026,
  insbesondere „Challenge und Zuschnitt", „Advisor-Pass", „Challenge
  F-030" und „Challenge WS2/WS3")
- `ARCHITECTURE.md` §3 („Auth", wörtlich, vollständig)
- `docs/projekt/zielfassung.md` §16.2 (Modultabelle, Zeile Invocation
  Policy), §16.4 („Startbedingungen des schreibenden Pfades", wörtlich)
- `src/invocation-policy/index.ts` (vollständig, 420 Zeilen):
  `pruefeStartfreigabe` (385), `pruefeStartbedingung1` (270),
  `pruefeStartbedingung2` (337), `verweigereStart` (413),
  `StartfreigabeEingaben` (61), `STANDARD_REPO_WURZEL` (49)
- `src/invocation-policy/types.ts`: `BaselineReferenz` (9)
- `src/authorization-boundary/index.ts`: `pruefeAutorisierung` (155),
  `verweigereAutorisierung` (211), `STANDARD_REPO_WURZEL` (31),
  exportierte Primitiven `leiteRepoRelativenPfadAb`, `leseAusCommit`,
  `gitattributesPinntZeilenenden`
- `src/checkpoint-store/index.ts`: `schreibeWirkungsmarke` (530),
  `stelleLaufstatusFest` (697)
- `src/lineage-registry/index.ts`: `registriereKernArtefakt` (85),
  `registriereWerkzeugReferenz` (116)
- `src/claude-code-gateway/index.ts` und `types.ts` (vollständig, realer
  gemergter WS1-Stand): `baueAufruf`, `pruefeUndVerweigereBeiTreffer`,
  `AufrufTokens = string[]`
- `schemas/kontrollzustand-invocation-policy-wirksamkeitsnachweis-payload.schema.json`
  (Beschreibungstext, wörtlich)
- `.gitignore` (vollständig)
- `state/findings.md`: F-030 (242–267), F-053 (573–589), F-057
  (668–675) im Volltext
- `state/tp-nachtrag.md`: TP-03d Messfall 1/2 (Zeilen 15–65) und
  Volltextsuche nach `"model"`/`modell_beobachtet` (kein Treffer)
- `state/plan-v1-f6a-claude-code-gateway.md`, `state/plan-v2-f6a-claude-code-gateway.md`
  (Delta 2/Delta 3, Gegenprobe zu „bleibt unverändert stehen")
- `state/gates.md` Zeile 970 (F1-Präzedenzfall `verify-rename-atomicity.mjs`)
- `state/advisor-findings-f6a-claude-code-gateway.md` (Formatvorbild
  UND inhaltlich relevant — Befund 1 dort ist die unmittelbare Vorstufe
  von Befund 1 hier)
- `git log --oneline -12`, `git status --short` (realer Repo-Zustand,
  WS1-Merge PR #37, aktueller Plan bereits committet)

**Rollengrenze:** Nur Lesezugriff. `starteGateway`,
`src/claude-code-gateway/prozessstart.ts` und das Laufakte-Schema
existieren noch nicht im Repo — die Prüfung bleibt auf Ebene Plan-Text
gegen reale Sollquelle/realen Code, nicht auf real ausgeführtem
WS2-Bau.

## Marker-Legende

`[Fakt]` im Code/Dokument belegt · `[Schlussfolgerung]` aus Fakten
abgeleitet · `[Annahme]` plausibel, nicht abschließend geprüft ·
`[offene Unsicherheit]` weder belegt noch widerlegt.

## Befunde

### Befund 1 (kritisch) — Der Plan begründet die Ausweitung auf F3+volle
`pruefeStartfreigabe` mit einer Lesart von ARCHITECTURE §3/§16.4, die
dem wörtlichen Text widerspricht, kehrt damit eine bereits von Stefan
getroffene Entscheidung um, ohne das als neue Abzweigung zu kennzeichnen
— und das Repo trägt jetzt drei sich widersprechende Fassungen derselben
Frage gleichzeitig

**[Fakt]** `ARCHITECTURE.md` §3, zweite Schicht, wörtlich: „**Invocation
Policy / Protection Validator** — vor jeder Execution **mit
Schreibwirkung**, lokal und ohne Werkzeugaufruf: ist die
Werkzeugkonfiguration gültig … und liegt ein gültiger
Wirksamkeitsnachweis für den Gültigkeitsschlüssel vor." `docs/projekt/
zielfassung.md` §16.4 trägt den Titel „**Startbedingungen des
schreibenden Pfades**" für exakt dieselben zwei Bedingungen (E-183,
E-188).

**[Fakt]** Der geprüfte Plan definiert WS2/WS3 selbst als nicht
schreibend: Abschnitt 3 (Non-Scope), wörtlich: „Echte schreibende
Werkzeuge im gestarteten Claude-Code-Prozess — WS2/WS3 bleiben
lese-beschränkt (`--tools` ohne Edit/Write/Bash-mit-Wirkung). Ein
Werkzeugsatz mit echten Schreibrechten ist F6b, nicht Teil dieser
Akte." Der Plan beschreibt seinen eigenen Gegenstand also ausdrücklich
als **nicht** „Execution mit Schreibwirkung" im Sinn von ARCHITECTURE
§3 — verlangt aber trotzdem in Abschnitt 1 (Ziel) und Abschnitt 2.1,
dass „beide Autorisierungsschichten (F3 **und** F4, vollständig)"
davor geprüft haben.

**[Fakt]** Das ist keine neue Abwägung, sondern die **Umkehrung einer
bereits getroffenen, von Stefan bestätigten Entscheidung**. Der
WS1-Advisor-Pass (`state/advisor-findings-f6a-claude-code-gateway.md`,
Befund 1) hatte exakt diese Frage — volle `pruefeStartfreigabe` für den
Lesepfad ja/nein — als ❓ ENTSCHEIDUNG MENSCH gestellt; laut
`features/F6a/journal.md` (Eintrag „Advisor-Pass", 31.08.2026):
„**Entschieden: Option A** — F6a ruft nur `pruefeAufrufparameter`
(E-182) auf, nicht die volle `pruefeStartfreigabe`. … F6a bleibt damit
unabhängig von F-053." Diese Entscheidung ist in `features/F6a/feature.md`
an vier Stellen unverändert stehen geblieben (siehe unten). Der später
im selben Journal protokollierte Eintrag „Challenge WS2/WS3" kehrt sie
um: „**Befund A:** … Korrigiert: `starteGateway` ruft `pruefeAutorisierung`
(F3) **und** `pruefeStartfreigabe` (F4) vor `RUN_PREPARED`." Als
Begründung dient dort wörtlich: „§16.4 hängt die volle
`pruefeStartfreigabe` an jeden Werkzeugstart, **nicht an das
Vorhandensein schreibender Tools**." Diese Behauptung ist am Wortlaut
von §16.4 (Titel „Startbedingungen des **schreibenden** Pfades") und
ARCHITECTURE §3 („vor jeder Execution **mit Schreibwirkung**") nicht
haltbar — beide Quellen sagen das Gegenteil von dem, was als
Begründung für die Umkehrung zitiert wird. Die Umkehrung selbst wird im
Journal als bereits erledigte Korrektur geführt, nicht als neue,
Stefan vorgelegte Abzweigung — anders als die erste Runde, in der genau
dieselbe Frage korrekt als ❓ ENTSCHEIDUNG MENSCH eskaliert wurde.

**[Fakt]** `features/F6a/feature.md` ist dadurch **aktuell intern
widersprüchlich**, nicht nur historisch:
- Scope-Abschnitt, wörtlich (unverändert seit der ersten Korrektur):
  „Startfreigabe (korrigiert nach Advisor-Pass Befund 1, Option A,
  31.08.2026): F6a ruft für den Lesepfad ausschließlich F4s
  `pruefeAufrufparameter` (E-182) auf, **nicht** die volle
  `pruefeStartfreigabe` (E-183/E-188)."
- AK4, wörtlich (unverändert): „Vor jedem Prozessstart wird
  ausschließlich F4s `pruefeAufrufparameter` (E-182) geprüft — **nicht**
  die volle `pruefeStartfreigabe` (E-183/E-188) …"
- Dependencies, F4-Zeile, wörtlich (unverändert): „`pruefeStartfreigabe`
  (E-183/E-188, volle Startfreigabe) wird von F6a **nicht** aufgerufen
  — … bleibt F6b vorbehalten (Advisor-Pass Befund 1, Option A,
  31.08.2026)."
- Nicht-Ziele, wörtlich (unverändert): „**Execution mit
  Schreibwirkung.** E-183/E-188 scharf, der bislang nie erbrachte
  Rot-Fall-Nachweis der Wirksamkeitsprüfung (§16.8 Punkt 3, Finding
  F-053) … gehören zu F6b."

  gegen, im selben Dokument, weiter unten:
- Dependencies, neuer Absatz „Korrigiert 31.08.2026 (WS2/WS3-Challenge,
  Befund B)": „F-053 … ist **nicht** erst für F6b relevant — WS2/WS3
  starten real einen (lese-beschränkten) Prozess, §16.4 hängt die volle
  `pruefeStartfreigabe` an jeden Werkzeugstart …"
- Workstream-Liste, WS2: „**beide Autorisierungsschichten** (F3
  `pruefeAutorisierung` **und** F4 `pruefeStartfreigabe` vollständig —
  korrigiert 31.08.2026, Befund A der WS2/WS3-Challenge) …"

  Vier Textstellen sagen „F6a/WS2 ruft die volle `pruefeStartfreigabe`
  **nicht**", zwei sagen „doch". Das ist keine Auslegungsfrage des
  Advisors — es ist ein am Dokument selbst nachweisbarer, ungelöster
  Widerspruch, den der geprüfte Plan voraussetzt statt aufzulösen.

**[Fakt]** `state/findings.md`, F-053 (Zeile 573–589), Status weiterhin
**„offen"**, wörtlich unverändert: „Auswirkung: hoch bei F6b, **null
bei F6a** (F6a führt keine Schreibwirkung aus, siehe
`features/F6a/feature.md` Nicht-Ziele). Maßnahme: … blockierend vor dem
ersten Lauf mit Schreibwirkung. **Nicht Teil von F6a.**" Der
Findings-Eintrag selbst — das laut Projektregel maßgebliche Register —
wurde bei der „Befund B"-Korrektur **nicht** nachgezogen. Der geprüfte
Plan (Abschnitt 4, Design-Entscheidung 6; Abschnitt „Scope — WS3")
behandelt „WS3 schließt F-053" bereits als entschiedene Tatsache, ohne
dass das Register das trägt.

**[Schlussfolgerung, hohe Relevanz]** Drei Artefakte des Projekts —
`feature.md` (in sich selbst gespalten), `findings.md` (unverändert
gegen die neue Lesart) und der geprüfte Plan (setzt die neue Lesart
bereits als entschieden voraus) — sagen derzeit nicht dasselbe. Das ist
kein kosmetisches Dokupflege-Problem:

- **AK14** des Plans (F3-Prüfung vor jedem Prozessstart) hätte, wenn
  Befund A tatsächlich falsch gelesen ist, keine Grundlage — F3 würde
  dann für einen rein lesenden Lauf eingeführt, den weder
  ARCHITECTURE §3 noch §16.4 dafür verlangen.
- Der WS3-Scope-Punkt „bewusst herbeigeführter Rot-Fall … danach den
  echten `wirksamkeitsnachweis` … in die externe Autorisierungs-Ablage
  schreiben" ist ein realer, von Stefan persönlich auszuführender
  Schreibvorgang in einem geschützten externen Repo — eine schwer
  reversible, nicht triviale Handlung, die laut der **vorherigen**
  Stefan-Entscheidung („F6a bleibt unabhängig von F-053") gar nicht
  nötig wäre.
- Sollte Befund A/B **richtig** sein (d. h. Stefan entscheidet sich nach
  Prüfung bewusst dafür, F6a doch der vollen Startfreigabe zu
  unterwerfen), dann ist es die Ausweitung selbst — nicht ihre
  technische Umsetzung —, die als ❓ ENTSCHEIDUNG MENSCH gehört, weil
  sie laut den Fast-Prototyping-Eskalationsregeln „eine bestehende
  Architekturentscheidung ändern" würde (hier: die bereits getroffene
  WS1-Entscheidung) und den Scope/das Nutzerverhalten (F-053 wird
  WS3-Voraussetzung, mit realem externen Schreibvorgang) wesentlich
  verändert.

**[offene Unsicherheit]** Welche der beiden Lesarten inhaltlich korrekt
ist, entscheidet der Advisor nicht — beide sind vertretbar (Defense-
in-Depth vs. wörtliche Skopierung auf Schreibwirkung). Nicht vertretbar
ist, dass der Plan die Umkehrung als bereits erledigt behandelt, mit
einer am Wortlaut widerlegbaren Begründung, ohne die drei
widersprüchlichen Artefakte zu bereinigen und ohne sie erneut als
Abzweigung vorzulegen.

### Befund 2 (mittel) — Design-Entscheidung 5 behauptet, Advisor-Befund
4 zu schließen; die zitierte Quelle belegt das Feld nicht

**[Fakt]** Der vorherige Advisor-Pass (Befund 4,
`state/advisor-findings-f6a-claude-code-gateway.md`) hatte offen
gelassen, aus welchem Feld der realen `"type":"result"`-JSON-Ausgabe
`modell_beobachtet` gelesen wird, und ausdrücklich vermerkt: „TP-Nachtrag
zitiert es an keiner Stelle wörtlich."

**[Fakt]** Der geprüfte Plan, Design-Entscheidung 5: „Wert kommt
ausschließlich aus dem geparsten `"type":"result"`-JSON der realen
Laufausgabe (**Feld dort vorhanden, siehe `state/tp-nachtrag.md`-
Wortlaut**)." Eine Volltextsuche über `state/tp-nachtrag.md` nach
`"model"` liefert **null Treffer**; die wörtlich zitierten
JSON-Ausschnitte (TP-03d Messfall 1/2, Zeilen 15–65) enthalten
ausschließlich `permission_denials` und `result`, kein `model`-Feld.

**[Schlussfolgerung]** Die Behauptung „schließt Advisor-Befund 4" ist
nicht durch die zitierte Quelle gedeckt — die offene Unsicherheit
besteht faktisch unverändert fort, wird im Plan aber als geschlossen
dargestellt. Auswirkung gering (WS2-Bau-Detail, Plan selbst benennt
unter Offene Unsicherheit 1 korrekt, dass das Feld „nicht aus
offizieller CLI-Dokumentation verifiziert" ist — das widerspricht sich
sogar leicht mit Design-Entscheidung 5s „Feld dort vorhanden"-Behauptung
im selben Dokument), aber die Formulierung sollte nicht als „Fakt"
markiert bleiben.

### Befund 3 (mittel) — `wirksamkeitsnachweisReferenz`-Lesepfad
dupliziert eine bereits zweimal vorhandene Sequenz ein drittes Mal, ohne
dass der Plan das als Frage behandelt

**[Fakt]** Der Lesepfad für `baselineReferenz` (Pfad-Präfixprüfung →
`.gitattributes`-Prüfung → Arbeitsbaum-Hash → Commit-Hash-Vergleich →
JSON.parse → Schema-Validierung) ist bereits zweimal implementiert:
einmal in `pruefeAutorisierung` (`authorization-boundary/index.ts:155`,
F3) und einmal in `pruefeStartbedingung1`
(`invocation-policy/index.ts:270`, F4) — beide nutzen dieselben, aus
`authorization-boundary/index.ts` exportierten Primitiven
(`leiteRepoRelativenPfadAb`, `leseAusCommit`,
`gitattributesPinntZeilenenden`), aber jede Orchestrierung ist eigener,
nicht gemeinsam exportierter Code.

**[Fakt]** Der Plan (Abschnitt 2, Punkt 2) sieht vor, dass
`starteGateway` denselben Ablauf für `wirksamkeitsnachweisReferenz`
selbst implementiert („liest, parst, validiert"), bevor
`validiereWirksamkeitsnachweisEintrag` (F4) aufgerufen wird — eine
**dritte** Instanz derselben sieben-schrittigen Sequenz, jetzt in einem
dritten Modul.

**[Schlussfolgerung]** Nicht architekturverletzend (D5-Muster bleibt
gewahrt: keine eigene Validierungslogik, nur eine eigene
Lese-Orchestrierung) und im Rahmen von YAGNI vertretbar, solange kein
vierter Aufrufer folgt. Der Plan behandelt die Frage „sollte F4 stattdessen
einen wiederverwendbaren Lese-Helfer exportieren, statt dass jeder
Aufrufer die Sequenz neu schreibt" aber nirgends explizit — weder als
`[EMPFEHLUNG]` noch als zurückgestellter Punkt. Geringe, aber reale
Lücke in der technischen Konkretisierung.

### Befund 4 (gering) — Zitat in Abschnitt 0 bezieht sich auf bereits
ersetzten Text

**[Fakt]** Plan Abschnitt 0, letzter Bullet vor Befund B: „`features/F6a/feature.md`,
Dependencies-Abschnitt, wörtlich: „F-053 … blockierend erst für F6b, F6a
schreibt nicht." Widerspricht der eigenen Workstream-Liste derselben
Akte." Diese exakte Formulierung existiert im aktuellen
Dependencies-Abschnitt **nicht mehr wörtlich** — sie wurde durch den
neuen Absatz „Korrigiert 31.08.2026 (WS2/WS3-Challenge, Befund B)"
ersetzt (siehe Befund 1 oben).

**[Schlussfolgerung]** Vermutlich als Beschreibung des Zustands **vor**
der eigenen Korrektur gemeint (chronologische Erzählung), aber als
„wörtlich" markiertes Zitat einer inzwischen ersetzten Textstelle
ungenau und geeignet, eine spätere Prüfung in die Irre zu führen. Geht
in der Substanz vollständig in Befund 1 auf (dort mit dem tatsächlich
noch aktuellen Widerspruch belegt).

## Entlastende Befunde

**[Fakt, entlastend]** Alle in Abschnitt 0 des Plans zitierten
Funktionssignaturen sind exakt am Code verifiziert: `pruefeStartfreigabe`
(`invocation-policy/index.ts:385`), `pruefeAutorisierung`
(`authorization-boundary/index.ts:155`), `schreibeWirkungsmarke`
(`checkpoint-store/index.ts:530`), `registriereKernArtefakt`
(`lineage-registry/index.ts:85`) — Zeilennummern, Parameterlisten und
Rückgabetypen stimmen. `eingaben.wirksamkeitsnachweis: unknown` (kein
Pfad, F4 liest nicht selbst von Platte) ist am Interface
`StartfreigabeEingaben` (Zeile 61–66) bestätigt.

**[Fakt, entlastend]** WS1-Beschreibung korrekt: `src/claude-code-
gateway/index.ts` enthält real genau `baueAufruf` und
`pruefeUndVerweigereBeiTreffer`, keinen `starteGateway`, keinen
Prozessstart-Code; Kopfkommentar bestätigt wörtlich „Heißt bewusst
nicht starteGateway". `AufrufTokens = string[]` (`types.ts:11`) ist
bereits ein reines Argv-Array, kein zusammengesetzter String — der
Ausgangspunkt für F-057s Fix ist damit korrekt beschrieben.

**[Fakt, entlastend]** `schemas/kontrollzustand-invocation-policy-
wirksamkeitsnachweis-payload.schema.json`, Beschreibungstext, exakt wie
zitiert: „Ablageort dieser Instanz ist bewusst nicht durch dieses Schema
festgelegt (Design-Entscheidung 3, plan-v1-f4-invocation-policy.md) …" —
Plan korrigiert diese offene Stelle konsistent, ohne sie zu
verschweigen.

**[Fakt, entlastend]** `wirksamkeitsnachweisReferenz` = „gleiche Form
wie `baselineReferenz`" ist am Typ verifiziert: `BaselineReferenz`
(`invocation-policy/types.ts:9`) trägt exakt `{pfad, commit_hash,
datei_hash}` — dieselbe schlanke Referenzform, plausibel wiederverwendbar.
Der externe Repo-Pfad `C:\Users\stefa\ai-workforce-autorisierung`
stimmt exakt mit `STANDARD_REPO_WURZEL` in beiden Modulen
(`authorization-boundary/index.ts:31`, `invocation-policy/index.ts:49`)
überein.

**[Fakt, entlastend]** `.gitignore`-Behauptung korrekt: `kontrollzustand-
test/` und `programm/` vorhanden, `kontrollzustand-roh/` fehlt tatsächlich
— Plan benennt das selbst korrekt als zu ergänzenden Punkt (Scope 2.5),
keine verschwiegene Lücke.

**[Fakt, entlastend]** `git log --oneline -12` bestätigt: WS1 real
gemergt (`1a15d66`, PR #37), F-030-Reprüfung und F-056/F-057 real
nachgetragen (`e3cf0ed`, PR #38), der geprüfte Plan selbst bereits
committet (`2eb7d60`) — kein Diskrepanz zwischen Plan-Erzählung und
Repo-Historie.

**[Fakt, entlastend]** `state/gates.md` Zeile 970 trägt tatsächlich den
zitierten F1-Präzedenzfall (`verify-rename-atomicity.mjs`, manueller,
nicht in die Standardkette eingehängter Nachweis) — die WS3-Analogie ist
sachlich korrekt, nicht nur behauptet.

**[Fakt, entlastend]** `state/plan-v1-f6a-claude-code-gateway.md` und
`state/plan-v2-f6a-claude-code-gateway.md` existieren unverändert neben
dem neuen Plan; Delta 2 (F2-Anbindung, `registriereKernArtefakt` für die
Laufakte, keine F2-Registrierung für den Rohstrom) und Delta 3
(`state/gates.md`-Zusage für WS3) sind dort real vorhanden und decken
sich mit dem, was der neue Plan in Scope 1.8 und der WS3-Sektion daraus
übernimmt — keine stillschweigende Überschreibung, wie in Abschnitt 8
des neuen Plans zugesagt.

**[Fakt, entlastend]** F-057-Registereintrag (`state/findings.md`,
668–675) deckt sich inhaltlich mit Design-Entscheidung 4 des Plans
(`execFile`, Argv-Array, kein Shell-String) — korrekt zitiert und
technisch fest gebunden.

## Urteil

**Nicht freigegeben, Überarbeitung nötig.**

Begründung: Der Plan liest die meisten realen Quellen sorgfältig und
belegt seine technischen Kernbehauptungen überwiegend korrekt am
Quelltext (Funktionssignaturen, WS1-Stand, Schema-Text, `.gitignore`,
`gates.md`-Präzedenzfall, Delta-2/Delta-3-Konsistenz). Das ist real
mehr Sorgfalt, als plan-v1-Dokumente in diesem Projekt typischerweise
zeigen.

Der Plan setzt jedoch seine gesamte WS2/WS3-Architektur (AK14, die
F3-Anbindung, die Kurzschluss-Kette in Abschnitt 2.1, und vor allem den
realen, von Stefan persönlich auszuführenden Rot-Fall-Schreibvorgang in
WS3) auf einer einzigen Weichenstellung auf, die (a) dem wörtlichen
Text von ARCHITECTURE §3 und Zielfassung §16.4 widerspricht, (b) eine
bereits getroffene, im selben Journal dokumentierte Stefan-Entscheidung
stillschweigend umkehrt, ohne das als neue Abzweigung zu benennen oder
neue Evidenz für die Umkehrung zu liefern, und (c) dazu führt, dass drei
Artefakte des Projekts (`feature.md`, `findings.md`, der neue Plan)
derzeit **nicht** dieselbe Aussage tragen — `feature.md` ist an vier
gegen zwei Textstellen intern gespalten, `findings.md`s F-053-Eintrag
ist unverändert gegen die neue Lesart. Das ist kein „Nacharbeiten mit
dem Bau" (wie Befund 3/4), sondern eine Grundsatzfrage, die laut den
projekteigenen Eskalationsregeln vor jedem Handoff-Vertrag als ❓
ENTSCHEIDUNG MENSCH klar an Stefan gehört — unabhängig davon, welche
Antwort am Ende richtig ist.

**Vor dem Handoff-Vertrag zwingend zu klären:**

- **Befund 1** — Soll WS2/WS3 (laut eigenem Non-Scope „lese-beschränkt",
  keine Schreibwirkung) die volle `pruefeStartfreigabe` (F4,
  E-183+E-188) **und** `pruefeAutorisierung` (F3) durchlaufen, obwohl
  ARCHITECTURE §3 und Zielfassung §16.4 diese Prüfung wörtlich auf
  „Execution mit Schreibwirkung"/„den schreibenden Pfad" skalieren —
  und obwohl Stefan im WS1-Advisor-Pass bereits das Gegenteil
  entschieden hatte? Diese Entscheidung bestimmt direkt, ob AK14
  (F3-Prüfung) überhaupt Teil von WS2 wird, ob F-053 WS3 blockiert, und
  ob WS3 tatsächlich einen realen, schwer reversiblen Schreibvorgang in
  das externe Autorisierungs-Repo braucht. Erst danach `feature.md`
  (Scope, Nicht-Ziele, AK4, Dependencies-F4-Zeile — alle vier derzeit
  gegenläufig zu Workstream-Liste/F-053-Absatz) und `findings.md`
  (F-053) auf **einen** konsistenten Stand bringen, unabhängig davon,
  welche Richtung entschieden wird.

**Dürfen mit plan-v2 nachgezogen werden (kein Blocker für die
Grundsatzfrage, aber vor dem Bau zu schließen):**

- **Befund 2** — Design-Entscheidung 5 nicht als „schließt Advisor-
  Befund 4" führen, solange `state/tp-nachtrag.md` kein `model`-Feld
  wörtlich zeigt; Formulierung auf „Annahme, im WS2-Bau gegen die reale
  Ausgabe zu verifizieren" zurückstufen (deckt sich mit der bereits im
  Plan selbst stehenden Offenen Unsicherheit 1).
- **Befund 3** — kurzer Satz, ob der `wirksamkeitsnachweisReferenz`-
  Lesepfad bewusst als dritte, eigenständige Implementierung geführt
  wird (YAGNI, kein gemeinsamer Helfer nötig) oder ob F4/F3 einen
  gemeinsamen Lese-Helfer exportieren sollten.

**Kein Blocker im engeren Sinn:**

- **Befund 4** — reine Zitatgenauigkeit in Abschnitt 0, keine
  inhaltliche Konsequenz über Befund 1 hinaus.

## Nächster sinnvoller Schritt

1. Befund 1 als ❓ ENTSCHEIDUNG MENSCH an Stefan: volle
   `pruefeStartfreigabe`+F3 für den lese-beschränkten WS2/WS3-Pfad
   ja/nein — mit ausdrücklichem Hinweis, dass dies die im WS1-Advisor-
   Pass bereits getroffene Option-A-Entscheidung umkehren würde und
   Konsequenzen für F-053s Blockierungsstatus sowie für den realen
   WS3-Schreibvorgang im externen Repo hat.
2. Nach der Entscheidung: `features/F6a/feature.md` (alle vier
   betroffenen Stellen) und `state/findings.md` (F-053) auf einen
   konsistenten Stand bringen — **bevor** plan-v2 oder ein
   Handoff-Vertrag entsteht.
3. plan-v2 mit Befund 1 (entsprechend der Entscheidung), Befund 2
   (Formulierung zurückstufen), Befund 3 (Lese-Helfer-Frage explizit
   entscheiden) nachziehen — plan-v1 bleibt unverändert stehen.
4. Erst danach Handoff-Vertrag für WS2 erstellen.
