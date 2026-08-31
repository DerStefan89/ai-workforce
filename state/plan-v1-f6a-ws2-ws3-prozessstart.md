# Plan v1 — Feature F6a, WS2/WS3: Prozessstart, Beobachtungsbasis, realer Nachweis

Slug: `f6a-ws2-ws3-prozessstart`
Stand: 31.08.2026 (Fassung 2, nach Advisor-Pass-Korrektur)

Grundlage: `state/plan-v1-f6a-claude-code-gateway.md` Abschnitt 2 Punkte
6–11, Abschnitt 4 Design-Entscheidungen 4/5, Abschnitt 5 (bleibt
unverändert stehen, wird hier nicht überschrieben) · `state/plan-v2-f6a-claude-code-gateway.md`
Delta 2 (F2-Anbindung) und Delta 3 (`state/gates.md`-Zusage) · WS1 real
gebaut und gemerged (`src/claude-code-gateway/index.ts`, PR #37) ·
Challenge-Nachtrag F-030 (`features/F6a/journal.md`, 31.08.2026, Finding
**F-057**: Argv-Array-Start, kein Shell-String).

**Korrektur gegenüber Fassung 1 (unveröffentlicht, nie über diese
Branch hinaus gelangt):** Fassung 1 verlangte für WS2/WS3 die volle
F3-Autorisierung und F4-Startfreigabe (E-183+E-188). Der Advisor-Pass
(`state/advisor-findings-f6a-ws2-ws3-prozessstart.md`, Befund 1) hat das
zurückgewiesen: `ARCHITECTURE.md` §3 und `docs/projekt/zielfassung.md`
§16.4 skalieren diese Prüfung wörtlich auf „Execution **mit
Schreibwirkung**"/den „**schreibenden** Pfad" — WS2/WS3 sind laut
eigenem Non-Scope aber lese-beschränkt, keine Schreibwirkung. Die
Ausweitung hätte außerdem Stefans bereits im WS1-Advisor-Pass
getroffene Entscheidung („F6a bleibt unabhängig von F-053") still
umgekehrt. **Stefan hat die Frage erneut entschieden: Option B — es
bleibt beim Lesepfad-Check.** WS2/WS3 rufen **nicht** F3 und **nicht**
die volle `pruefeStartfreigabe` auf. F-053 bleibt vollständig außerhalb
des Geltungsbereichs von F6a (WS1 **und** WS2/WS3). Diese Fassung 2
ersetzt Fassung 1 vollständig, bevor irgendetwas gemergt wurde.

## 0. Selbstverifikation (real gelesen, nicht angenommen)

- `src/invocation-policy/index.ts:385` — `pruefeStartfreigabe`
  existiert, wird von WS2/WS3 **nicht** aufgerufen (Entscheidung
  Option B). WS1s bereits gebautes `pruefeUndVerweigereBeiTreffer`
  (`src/claude-code-gateway/index.ts`) bleibt der einzige F4-Berührpunkt.
- `ARCHITECTURE.md` §3, zweite Schicht, wörtlich: „vor jeder Execution
  **mit Schreibwirkung**". `docs/projekt/zielfassung.md` §16.4, Titel
  wörtlich: „Startbedingungen des **schreibenden** Pfades". WS2/WS3
  sind laut eigenem Scope (unten, Abschnitt 3) nicht davon erfasst.
- `src/checkpoint-store/index.ts:530` — `schreibeWirkungsmarke(laufId, profilReferenz, art, zusatz, optionen)`,
  wirft synchron bei ungültiger `art`/`ergebnis`-Kombination.
- `src/lineage-registry/index.ts:85` — `registriereKernArtefakt(artefaktId, profilReferenz, herkunft, daten, eingaben?, optionen?)`.
- `.gitignore` (real gelesen): enthält `kontrollzustand-test/` und
  `programm/`, **nicht** `kontrollzustand-roh/` — muss ergänzt werden.
- `state/tp-nachtrag.md` — Volltextsuche nach `model` (case-insensitiv):
  **null Treffer** (Advisor-Befund 2, selbst nachgeprüft). Die exakte
  Feldbezeichnung für `modell_beobachtet` ist damit **nicht** aus
  diesem Dokument belegbar — Design-Entscheidung 5 unten entsprechend
  als Annahme, nicht als Fakt geführt.
- `state/findings.md` F-053 (Zeile ~573–589): unverändert „Auswirkung
  … null bei F6a … Nicht Teil von F6a." Bleibt mit dieser Fassung 2
  konsistent, braucht **keine** Änderung.

## 1. Ziel (prüfbar)

Ein per WS1 freigegebenes Tokens-Array löst einen tatsächlichen,
werkzeugseitig lese-beschränkten Claude-Code-Prozessstart aus — nach
WS1s bereits vorhandenem E-182-Check und einer `RUN_PREPARED`-
Wirkungsmarke. Der Start selbst läuft über ein Argv-Array (nie einen
Shell-String, F-057). Ergebnis: zwei getrennte Ablagen (Laufakte,
Rohstrom, E-190), Laufakte über F2 registriert, kein Terminalzustand
bei einem Lauf ohne gültiges Ergebnisobjekt. F-053 bleibt für dieses
gesamte Feature (WS1 wie WS2/WS3) irrelevant — WS3 ist ein normaler,
manueller Nachweislauf ohne besonderen Rot-Fall-Schritt.

## 2. Scope — WS2 (dieser Vertrag)

1. `starteGateway(eingaben, optionen): Promise<GatewayErgebnis>` in
   `src/claude-code-gateway/index.ts` — der Name war seit WS1 bewusst
   freigehalten, jetzt legitim, weil hier tatsächlich ein Prozess
   startet. Ablauf:
   1. `pruefeUndVerweigereBeiTreffer` (WS1, F4 E-182) — unverändert
      wiederverwendet, kein zweiter Aufruf von `pruefeAufrufparameter`,
      kein F3-, kein volles F4-Startfreigabe-Gate (Option B).
   2. Bei `ok: true`: `schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared')`
      (F1B) — **vor** jedem Prozessstart.
   3. `starteProzess(tokens, optionen)` — `child_process.execFile('claude', tokens, ...)`
      (Node-Standardbibliothek, Argv-Array, **kein** Shell-String,
      F-057). Austauschbar über `optionen.starter` (Attrappe für die
      Standardkette, Muster wie F1Bs `optionen.schreiber`).
   4. Ergebnis auswerten, **ohne Klassifikation** (F7-Scope bleibt
      unberührt, AK12-Grep unverändert):
      - Valides `"type":"result"`-JSON → Laufakte (`LAUFAKTE_V0`) mit
        `modell_beobachtet` (Rang `OBSERVED`, siehe Design-Entscheidung
        5 — Annahme, im Bau gegen reale Fixture-Daten zu verifizieren),
        Gültigkeitsschlüssel-Anteile **soweit ohne F4-Vollcheck
        vorhanden** (siehe Design-Entscheidung 3 unten), Rohstrom-Hash-
        Referenz, `beobachtungsbasis_vollstaendig: true`. **Kein**
        `ergebnis`-Feld, **keine** `permission_denials`-Auswertung.
      - Kein valides Ergebnisobjekt (Abbruch/Zeitüberschreitung,
        TP-01e-Muster, Exit 137/124) → Laufakte mit
        `beobachtungsbasis_vollstaendig: false`, **keine**
        Terminal-Wirkungsmarke (Design-Entscheidung aus plan-v1
        unverändert bestätigt).
   5. Rohereignisstrom (rohe `stdout`/`stderr`) nach
      `kontrollzustand-roh/<lauf_id>/` schreiben, nicht committen.
   6. Laufakte über F2s `registriereKernArtefakt` registrieren (Delta 2
      aus plan-v2, unverändert übernommen). Rohstrom **nicht** über F2
      (kein Produktartefakt, bleibt hash-referenziert).
2. **Attrappen-Werkzeug** (`optionen.starter`) für die Standardkette:
   zwei fest hinterlegte, wörtlich aus `state/tp-nachtrag.md`
   übernommene Formen — (a) reales `"type":"result"`-JSON mit
   `permission_denials: []` (Messfall 1/2), (b) leeres `stdout`/`stderr`
   mit Exit 137 oder 124 (TP-01e Messfall A/B). Kein echter Prozess,
   kein Netzzugriff in `npm run test`/`npm run check`.
3. `schemas/kontrollzustand-laufakte-payload.schema.json` +
   `schemas/examples/kontrollzustand-laufakte-*.json` (Muster
   F5/F9-Schemata, `additionalProperties: false`).
4. `.gitignore`: neuer Eintrag `kontrollzustand-roh/`.
5. Gate-Skript-Erweiterung `scripts/check-f6a-claude-code-gateway.mjs`:
   Fixture-Validierung `LAUFAKTE_V0` · Grep-Regel gegen Shell-String-
   Zusammenbau (F-057, analog zur bestehenden AK1-Grep-Regel aus WS1) ·
   bestehende AK12-Grep-Regel unverändert.
6. `state/memory-map.md`, `package.json` bei Bedarf (Option-B-
   npm-Skript-Muster, kein separater Vertrag).

## Scope — WS3 (eigener, späterer Vertrag; hier nur Design)

- `scripts/verify-f6a-real-run.mjs`, manuell ausgeführt, **nicht** in
  der Standardkette (Präzedenz `scripts/verify-rename-atomicity.mjs`,
  F1, `state/gates.md` Zeile 970).
- Ein echter `claude -p`-Lauf mit ausschließlich lesenden Tools, Muster
  `state/tp-nachtrag.md` Messfall 1/2. **Kein** Rot-Fall-Schritt, kein
  Schreibvorgang im externen Autorisierungs-Repo — F-053 ist nicht
  Gegenstand von WS3 (Option B).
- `state/gates.md`-Eintrag (Delta 3 aus plan-v2, unverändert übernommen).

## 3. NICHT (Non-Scope, mit Grund)

- Klassifikation, `permission_denials`-Auswertung, die drei
  Terminalausgänge — F7 (AK12-Grep erzwingt das mechanisch).
- **F3 (Authorization Boundary) und die volle F4-Startfreigabe
  (E-183/E-188).** WS2/WS3 sind kein „schreibender Pfad" im Sinn von
  ARCHITECTURE §3/§16.4 — beide Prüfungen bleiben F6b vorbehalten
  (Option B, Stefans Entscheidung nach Advisor-Pass, 31.08.2026).
- Echte schreibende Tools im gestarteten Claude-Code-Prozess — WS2/WS3
  bleiben lese-beschränkt (`--tools` ohne Edit/Write/Bash-mit-Wirkung).
  Ein Werkzeugsatz mit echten Schreibrechten ist F6b.
- F-053 (E-188-Rot-Fall-Nachweis) — bleibt vollständig außerhalb dieses
  Features, für WS1 wie WS2/WS3 (unverändert gegenüber der
  ursprünglichen `feature.md`-Fassung, `state/findings.md` bleibt
  unverändert).
- Orchestrierung mehrerer Executions, Resume — Execution Controller
  (F8, nicht gebaut).
- Windows-`.cmd`-Wrapper-Sonderfälle für `execFile` vorab lösen — real
  erst mit WS3 auf der Zielplattform geprüft (Offene Unsicherheit 2).

## 4. Design-Entscheidungen

**1. Funktionsname `starteGateway`, jetzt zulässig.** WS1 hat ihn
bewusst nicht verwendet, um keinen Prozessstart vorzutäuschen; WS2
startet tatsächlich einen Prozess. `[Fakt]` — Konsequenz aus der
WS1/WS2-Trennung selbst.

**2. Kein F3-, kein volles F4-Gate (Option B, korrigiert).** Siehe
Kopf-Nachtrag und Abschnitt 3. `[Entscheidung Stefan, 31.08.2026,
zweite Runde nach Advisor-Pass]`.

**3. Gültigkeitsschlüssel-Anteile in der Laufakte: nur, was ohne
F4-Vollcheck real vorliegt.** Da `pruefeStartbedingung1/2` hier nicht
läuft, liefert WS2 keinen durch F4 geprüften `Gueltigkeitsschluessel`
— die Laufakte trägt stattdessen nur deskriptive Anteile, die WS2
selbst messen kann (`werkzeug_version_deklariert`,
`arbeitsverzeichnis_pfad` roh, `berechtigungskontext` durchgereicht wie
in WS1 Design-Entscheidung 2). `[EMPFEHLUNG]` — reversibel, betrifft
nur das Payload-Schema; sollte F6b später den vollen Gültigkeitsschlüssel
brauchen, entsteht dort eine eigene, geprüfte Instanz.

**4. Prozessstart-Primitiv: `child_process.execFile`, kein Shell.**
Bindet F-057 technisch fest: `execFile` übergibt das Tokens-Array
direkt als `argv`, umgeht den Shell-Parser vollständig. `[Fakt]` —
direkte Umsetzung eines bereits entschiedenen Findings.

**5. `modell_beobachtet`-Extraktion — Annahme, nicht Fakt (korrigiert,
Advisor-Befund 2).** Wert soll aus dem geparsten `"type":"result"`-JSON
der realen Laufausgabe kommen (Rang `OBSERVED`, E-185) — welches Feld
das genau ist, ist **nicht** durch `state/tp-nachtrag.md` belegt (dort
kein `model`-Wortlaut, selbst nachgeprüft). `[Annahme]` — WS2-Bau
verifiziert das Feld gegen reale Fixture-Daten oder eine frische
Testausgabe, bevor der Wert als „vorhanden" gilt.

## 5. Ablageort

- `src/claude-code-gateway/index.ts` — ergänzt um `starteGateway`,
  `starteProzess`-Aufruf (WS1s `baueAufruf`/`pruefeUndVerweigereBeiTreffer`
  bleiben unverändert).
- `src/claude-code-gateway/prozessstart.ts` — `starteProzess`-Primitiv
  (`execFile`-Wrapper) + Attrappen-Implementierung für Tests.
- `src/claude-code-gateway/claude-code-gateway.test.ts` — WS1s
  bestehende fünf Testfälle bleiben, WS2 ergänzt eigene.
- `schemas/kontrollzustand-laufakte-payload.schema.json` +
  `schemas/examples/kontrollzustand-laufakte-*.json`.
- `kontrollzustand-roh/` — neuer, nicht committeter Pfad, `.gitignore`
  ergänzt.
- `scripts/check-f6a-claude-code-gateway.mjs` — erweitert.
- `scripts/verify-f6a-real-run.mjs` — WS3, eigener späterer Vertrag.

## 6. Budget & Pässe

Ein Baudurchgang (WS2) → Advisor-Pass (frischer Kontext) → plan-v2 bei
Bedarf → Handoff-Vertrag → Bau → Reviewer-/QA-Pass vor Merge
(Definition of Done, F-046). WS3 danach als eigener, separat
freigegebener Vertrag — von Stefan selbst ausgeführt/beaufsichtigt.

## 7. Akzeptanzkriterien (Delta zu `features/F6a/feature.md` AK1-13)

Neu:
- **AK14** — kein Prozessstart-Code im Modul fügt Tokens per
  Shell-String zusammen; Gate-Grep erzwingt das mechanisch (F-057).
  (Die zuvor vorgesehene F3-AK14 aus Fassung 1 entfällt — Option B.)

Aktualisiert:
- AK5-9, AK11 — WS2 (Wirkungsmarke, zwei Ablagen, `OBSERVED`,
  Fehllauf-Behandlung) bzw. WS3 (realer Nachweis, ohne Rot-Fall-Schritt).
- AK10, AK12, AK13 — Gate, weiterhin WS2/WS3 gemeinsam betreffend.

## 8. Offene Unsicherheiten dieses Plans

1. **Exaktes JSON-Feld für `modell_beobachtet`** — siehe Design-
   Entscheidung 5, ausdrücklich als Annahme geführt, nicht als Fakt.
2. **`execFile`-Verhalten unter Windows für den Namen `claude`** — real
   erst mit WS3 auf der Zielmaschine geprüft; bei Problemen dort
   ESCALATE, keine stillschweigende Anpassung.
3. **Wie viele Zeilen/Bytes Rohereignisstrom im WS2-Test real erzeugt
   werden** — Attrappe schreibt vorab fixierte, kleine Beispielausgaben.
4. **Ob ein gemeinsamer Lese-Helfer für die geschützte-Repo-Sequenz
   sinnvoll wäre** (Advisor-Befund 3, F3/F4 duplizieren sie bereits
   zweimal) — für WS2 nicht relevant, da hier kein dritter Aufrufer
   entsteht (Option B). Bleibt eine allgemeine Beobachtung für F6b.
