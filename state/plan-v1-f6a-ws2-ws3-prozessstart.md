# Plan v1 — Feature F6a, WS2/WS3: Prozessstart, Beobachtungsbasis, realer Nachweis

Slug: `f6a-ws2-ws3-prozessstart`
Stand: 31.08.2026

Grundlage: `state/plan-v1-f6a-claude-code-gateway.md` Abschnitt 2 Punkte
6–11, Abschnitt 4 Design-Entscheidungen 4/5, Abschnitt 5 (bleibt
unverändert stehen, wird hier nicht überschrieben) · `state/plan-v2-f6a-claude-code-gateway.md`
Delta 2 (F2-Anbindung) und Delta 3 (`state/gates.md`-Zusage) · WS1 real
gebaut und gemerged (`src/claude-code-gateway/index.ts`, PR #37) ·
Challenge-Nachtrag F-030 (`features/F6a/journal.md`, 31.08.2026, Finding
**F-057**: Argv-Array-Start, kein Shell-String) · heutige WS2/WS3-
Challenge, zwei neue Befunde, mit Stefan entschieden (Option A zu Befund
B).

## 0. Selbstverifikation (real gelesen, nicht angenommen)

- `src/invocation-policy/index.ts:385` — `pruefeStartfreigabe(eingaben, optionen): Starturteil`,
  ruft intern `pruefeStartbedingung1` (E-183) dann `pruefeStartbedingung2`
  (E-188), Kurzschluss beim ersten Fehlschlag. `eingaben.wirksamkeitsnachweis`
  ist ein bereits geparster Wert (`unknown`), **kein** Pfad — F4 liest ihn
  nicht selbst von Platte (anders als `baselineReferenz`).
- `src/authorization-boundary/index.ts:155` — `pruefeAutorisierung(referenz, optionen): AutorisierungsErgebnis`,
  liest/validiert gegen ein externes, geschütztes Git-Repo
  (`STANDARD_REPO_WURZEL`), niemals gegen eine Repo-lokale Kopie.
- `ARCHITECTURE.md` §3, wörtlich: „zwei voneinander unabhängige
  Schichten" (Authorization Boundary + Invocation Policy) · „Ein
  Pflichtdokument, das nur eine der beiden Schichten kennt, kann
  versehentlich unterlaufen werden — deshalb stehen beide hier." Bisher
  ruft weder WS1 noch der bisherige plan-v1/plan-v2 für WS2 `pruefeAutorisierung`
  auf — **Befund A dieser Challenge**.
- `src/checkpoint-store/index.ts:530` — `schreibeWirkungsmarke(laufId, profilReferenz, art, zusatz, optionen)`,
  wirft synchron bei ungültiger `art`/`ergebnis`-Kombination, sonst
  regulärer Schreibpfad.
- `src/lineage-registry/index.ts:85` — `registriereKernArtefakt(artefaktId, profilReferenz, herkunft, daten, eingaben?, optionen?)`.
- `schemas/kontrollzustand-invocation-policy-wirksamkeitsnachweis-payload.schema.json`,
  Beschreibungstext wörtlich: „Ablageort dieser Instanz ist bewusst
  nicht durch dieses Schema festgelegt … spätere Ablageort-Entscheidung."
  Noch offen — diese Akte trifft sie (Design-Entscheidung 3 unten).
- `.gitignore` (Stand 31.08.2026, real gelesen): enthält
  `kontrollzustand-test/` und `programm/`, **nicht** `kontrollzustand-roh/`
  — löst plan-v1s Offene Unsicherheit 3 auf: Eintrag fehlt tatsächlich,
  muss ergänzt werden.
- `features/F6a/feature.md`, Dependencies-Abschnitt, wörtlich: „F-053 …
  blockierend erst für F6b, F6a schreibt nicht." Widerspricht der
  eigenen Workstream-Liste derselben Akte (WS2 „Prozessstart", WS3 „ein
  echter claude -p-Lauf") — **Befund B dieser Challenge**, mit Stefan
  entschieden (Option A: WS3 schließt F-053 selbst).

## 1. Ziel (prüfbar)

Ein per WS1 freigegebenes Tokens-Array löst einen tatsächlichen, aber
werkzeugseitig lese-beschränkten Claude-Code-Prozessstart aus — nur
nachdem beide Autorisierungsschichten (F3 **und** F4, vollständig)
geprüft haben und eine `RUN_PREPARED`-Wirkungsmarke geschrieben wurde.
Der Start selbst läuft über ein Argv-Array (nie einen Shell-String,
F-057). Ergebnis: zwei getrennte Ablagen (Laufakte, Rohstrom, E-190),
Laufakte über F2 registriert, kein Terminalzustand bei einem Lauf ohne
gültiges Ergebnisobjekt. WS3 liefert zusätzlich den ersten echten
E-188-Rot-Fall-Nachweis dieses Projekts und schließt damit F-053.

## 2. Scope — WS2 (dieser Vertrag)

1. `starteGateway(eingaben, optionen): Promise<GatewayErgebnis>` in
   `src/claude-code-gateway/index.ts` — der Name war seit WS1 bewusst
   freigehalten („heißt bewusst nicht starteGateway", WS1-Kommentar),
   jetzt legitim, weil hier tatsächlich ein Prozess startet. Ablauf,
   striktes Kurzschluss-Muster:
   1. `pruefeAutorisierung` (F3, `../authorization-boundary/index.ts`)
      — bei `ok: false` oder `entscheidung: 'VERWEIGERT'`:
      `verweigereAutorisierung` (F3), kein Start (**Befund A**, neu
      gegenüber plan-v1/plan-v2).
   2. `pruefeUndVerweigereBeiTreffer` (WS1, F4 E-182) — unverändert
      wiederverwendet, kein zweiter Aufruf von `pruefeAufrufparameter`.
   3. `pruefeStartfreigabe` (F4, E-183+E-188 vollständig) — bei
      `ABGELEHNT`: `verweigereStart` (F4), kein Start.
   4. Bei `FREIGEGEBEN`: `schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared')`
      (F1B) — **vor** jedem Prozessstart, unverändert §16.4.
   5. `starteProzess(tokens, optionen)` — `child_process.execFile('claude', tokens, ...)`
      (Node-Standardbibliothek, Argv-Array, **kein** Shell-String,
      F-057). Austauschbar über `optionen.starter` (Attrappe für die
      Standardkette, Muster wie F1Bs `optionen.schreiber`).
   6. Ergebnis auswerten, **ohne Klassifikation** (F7-Scope bleibt
      unberührt, AK12-Grep unverändert):
      - Valides `"type":"result"`-JSON → Laufakte (`LAUFAKTE_V0`) mit
        `modell_beobachtet` (Rang `OBSERVED`, aus dem Ergebnis-JSON
        ausgelesen — schließt Advisor-Befund 4), den fünf
        Gültigkeitsschlüssel-Anteilen, Rohstrom-Hash-Referenz,
        `beobachtungsbasis_vollstaendig: true`. **Kein** `ergebnis`-Feld,
        **keine** `permission_denials`-Auswertung.
      - Kein valides Ergebnisobjekt (Abbruch/Zeitüberschreitung,
        TP-01e-Muster, Exit 137/124) → Laufakte mit
        `beobachtungsbasis_vollstaendig: false`, **keine**
        Terminal-Wirkungsmarke (Design-Entscheidung 5 aus plan-v1,
        unverändert bestätigt).
   7. Rohereignisstrom (rohe `stdout`/`stderr`) nach
      `kontrollzustand-roh/<lauf_id>/` schreiben, nicht committen.
   8. Laufakte über F2s `registriereKernArtefakt` registrieren (Delta 2
      aus plan-v2, unverändert übernommen). Rohstrom **nicht** über F2
      (kein Produktartefakt, bleibt hash-referenziert).
2. **`wirksamkeitsnachweisReferenz`-Auflösung** (löst die in F4s eigenem
   Schema offen gelassene Ablageort-Frage): gleiche Form/gleicher Ort wie
   `baselineReferenz` — externes, geschütztes Repo
   `C:\Users\stefa\ai-workforce-autorisierung`. `starteGateway` liest,
   parst, validiert (`validiereWirksamkeitsnachweisEintrag`, F4 von
   außen aufgerufen, D5-Muster), übergibt das Ergebnis an
   `pruefeStartfreigabe`. `[EMPFEHLUNG]` — reversibel, betrifft nur den
   Lese-Pfad in `starteGateway`, kein neues Speicherformat.
3. **Attrappen-Werkzeug** (`optionen.starter`) für die Standardkette:
   zwei fest hinterlegte, wörtlich aus `state/tp-nachtrag.md`
   übernommene Formen — (a) reales `"type":"result"`-JSON mit
   `permission_denials: []` (Messfall 1/2), (b) leeres `stdout`/`stderr`
   mit Exit 137 oder 124 (TP-01e Messfall A/B). Kein echter Prozess,
   kein Netzzugriff in `npm run test`/`npm run check`.
4. `schemas/kontrollzustand-laufakte-payload.schema.json` +
   `schemas/examples/kontrollzustand-laufakte-*.json` (Muster
   F5/F9-Schemata, `additionalProperties: false`, Pflichtfelder wie
   oben in Scope 1.6 benannt).
5. `.gitignore`: neuer Eintrag `kontrollzustand-roh/`, mit Begründung
   analog zum bestehenden `kontrollzustand-test/`-Eintrag.
6. Gate-Skript-Erweiterung `scripts/check-f6a-claude-code-gateway.mjs`:
   Fixture-Validierung `LAUFAKTE_V0` · Grep-Regel gegen Shell-String-
   Zusammenbau (kein `child_process.exec(`/`execSync(` mit
   Template-String oder `.join(' ')` auf dem Tokens-Array — F-057
   mechanisch erzwungen, analog zur bestehenden AK1-Grep-Regel aus WS1)
   · bestehende AK12-Grep-Regel unverändert.
7. `state/memory-map.md`, `package.json` bei Bedarf (neue
   Kalibrierungs-npm-Skripte folgen dem bereits etablierten Option-B-
   Muster direkt hier, kein separater Vertrag — F-030-Korrektur).

## Scope — WS3 (eigener, späterer Vertrag; hier nur Design, nicht Bauauftrag)

- `scripts/verify-f6a-real-run.mjs`, manuell ausgeführt, **nicht** in
  der Standardkette (Präzedenz `scripts/verify-rename-atomicity.mjs`,
  F1, `state/gates.md` Zeile 970).
- Ein echter `claude -p`-Lauf mit ausschließlich lesenden Tools, Muster
  `state/tp-nachtrag.md` Messfall 1/2.
- **Neu, Stefans Entscheidung (Option A) aus der WS2/WS3-Challenge:**
  vor dem Erfolgslauf ein bewusst herbeigeführter Rot-Fall (z. B. ein
  einzelnes Zeichen im referenzierten Schutzskript verändert, oder ein
  absichtlich falscher `werkzeug_konfiguration_hash` im
  `wirksamkeitsnachweis`) — erwartete Verweigerung real auslösen und im
  Wortlaut festhalten. Erst danach den echten `wirksamkeitsnachweis` mit
  diesem `rot_fall_beleg` in die externe Autorisierungs-Ablage
  schreiben — von Stefan selbst, außerhalb der Schreibreichweite des
  Kerns (D16/E-189-konform, gleiches Prinzip wie die Freigabedatei).
  **Schließt F-053.**
- `state/gates.md`-Eintrag (Delta 3 aus plan-v2, hierher übernommen,
  unverändert).

## 3. NICHT (Non-Scope, mit Grund)

- Klassifikation, `permission_denials`-Auswertung, die drei
  Terminalausgänge — F7, unverändert (AK12-Grep erzwingt das
  mechanisch, auch für WS2).
- Echte schreibende Tools im gestarteten Claude-Code-Prozess — WS2/WS3
  bleiben lese-beschränkt (`--tools` ohne Edit/Write/Bash-mit-Wirkung).
  Ein Werkzeugsatz mit echten Schreibrechten ist F6b, nicht Teil dieser
  Akte.
- Orchestrierung mehrerer Executions, Resume — Execution Controller
  (F8, nicht gebaut). `starteGateway` startet genau einen Lauf, kennt
  keine Warteschlange.
- Eine eigene, zweite `wirksamkeitsnachweis`-Validierungslogik — WS2
  ruft F4s `validiereWirksamkeitsnachweisEintrag` von außen auf (D5).
- Windows-`.cmd`-Wrapper-Sonderfälle für `execFile` vorab lösen — real
  erst mit WS3 (dem echten Lauf auf der Zielplattform) geprüft, siehe
  Offene Unsicherheit 2.

## 4. Design-Entscheidungen

**1. Funktionsname `starteGateway`, jetzt zulässig.** WS1 hat ihn
bewusst nicht verwendet, um keinen Prozessstart vorzutäuschen; WS2
startet tatsächlich einen Prozess, der Name passt jetzt. `[Fakt]` —
keine Wahl, Konsequenz aus der WS1/WS2-Trennung selbst.

**2. F3 vor F4, Kurzschluss bei erstem Fehlschlag (Befund A).**
`ARCHITECTURE.md` §3 nennt beide Schichten als unabhängig und gleich
verbindlich — die Reihenfolge selbst ist beliebig, aber **beide**
müssen vor `RUN_PREPARED` grün sein. F3 zuerst, weil eine fehlende
menschliche Autorisierung die billigste, am frühesten prüfbare
Bedingung ist. `[EMPFEHLUNG]` — reversibel, reine Reihenfolgefrage ohne
Sicherheitsauswirkung.

**3. `wirksamkeitsnachweisReferenz`-Ablageort = externes
Autorisierungs-Repo, gleiche Form wie `baselineReferenz`.** F4 selbst
hat diese Entscheidung offen gelassen (siehe Schema-Beschreibungstext,
Abschnitt 0). Ein zweites, neues Speicherformat nur für diesen einen
Wert wäre unbegründete Abweichung vom bereits etablierten,
geschützten-Repo-Muster. `[EMPFEHLUNG]` — reversibel vor WS3s erstem
echten Eintrag, danach nur mit Migrationsaufwand für diesen einen Wert.

**4. Prozessstart-Primitiv: `child_process.execFile`, kein Shell.**
Bindet F-057 (`features/F6a/journal.md`, 31.08.2026) technisch fest:
`execFile` übergibt das Tokens-Array direkt als `argv`, umgeht den
Shell-Parser vollständig — dynamischer Prompt-Inhalt im `-p`-Argument
kann keine Shell-Metazeichen mehr ausnutzen. `[Fakt]` — keine Wahl,
direkte Umsetzung eines bereits entschiedenen Findings.

**5. `modell_beobachtet`-Extraktion (schließt Advisor-Befund 4).** Wert
kommt ausschließlich aus dem geparsten `"type":"result"`-JSON der realen
Laufausgabe (Feld dort vorhanden, siehe `state/tp-nachtrag.md`-Wortlaut).
WS2 liest das Feld nur aus, konstruiert keine eigene Modell-Logik.
`[Fakt]` — Konsequenz aus E-185 („Modellidentität aus der Laufausgabe
hat Rang `OBSERVED`").

**6. WS3 schließt F-053 (Stefans Entscheidung, Option A).** Siehe Scope
WS3 oben. `[Entscheidung Stefan, 31.08.2026]`.

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
- `scripts/check-f6a-claude-code-gateway.mjs` — erweitert (bestehende
  Einhängung in `npm run check`/`check:template` bleibt).
- `scripts/verify-f6a-real-run.mjs` — WS3, eigener späterer Vertrag.

## 6. Budget & Pässe

Ein Baudurchgang (WS2) → Advisor-Pass (frischer Kontext) → plan-v2 bei
Bedarf → Handoff-Vertrag → Bau → Reviewer-/QA-Pass vor Merge
(Definition of Done, F-046). WS3 danach als eigener, separat
freigegebener Vertrag — von Stefan selbst ausgeführt/beaufsichtigt,
gleiches Muster wie `tp-nachtrag.md`, TP-01e, F6a-WS1-Build.

## 7. Akzeptanzkriterien (Delta zu `features/F6a/feature.md` AK1-13)

Neu:
- **AK14** — `starteGateway` ruft `pruefeAutorisierung` (F3) vor jedem
  Prozessstart auf; bei Verweigerung kein Start, `verweigereAutorisierung`
  aufgerufen. Rot-/Grün-Fall per Fixture-Autorisierungseintrag testbar.
- **AK15** — kein Prozessstart-Code im Modul fügt Tokens per
  Shell-String zusammen; Gate-Grep erzwingt das mechanisch (F-057).

Aktualisiert (technische Zuordnung, `feature.md` selbst wird gesondert
korrigiert):
- AK5-9, AK11 — jetzt WS2 (Wirkungsmarke, zwei Ablagen, Gültigkeits-
  schlüssel-Anteile, `OBSERVED`, Fehllauf-Behandlung) bzw. WS3 (realer
  Nachweis inkl. neuem Rot-Fall-Schritt).
- AK10, AK12, AK13 — Gate, weiterhin WS2/WS3 gemeinsam betreffend.

## 8. Offene Unsicherheiten dieses Plans (nicht stillschweigend gelöst)

1. **Exaktes JSON-Feld für `modell_beobachtet`** — nur aus dem Wortlaut
   in `state/tp-nachtrag.md` bekannt, nicht aus offizieller CLI-
   Dokumentation verifiziert. WS2-Bau prüft das gegen die real
   hinterlegten Fixture-Daten, nicht gegen eine Annahme.
2. **`execFile`-Verhalten unter Windows für den Namen `claude`** — Node
   hat auf Windows bekannte Fallstricke bei `.cmd`-Wrapper-Binarien ohne
   Extension (`execFile` sucht `PATHEXT`-Varianten anders als eine
   Shell). In der Standardkette irrelevant (Attrappe), real erst mit
   WS3 auf der Zielmaschine geprüft — wenn dort ein Problem auftritt,
   ist das ein WS3-ESCALATE-Fall, keine stillschweigende Anpassung.
3. **Wie viele Zeilen/Bytes Rohereignisstrom im WS2-Test real erzeugt
   werden** (aus plan-v1 übernommen, unverändert offen) — Attrappe
   schreibt vorab fixierte, kleine Beispielausgaben, keine synthetische
   Generierung.
