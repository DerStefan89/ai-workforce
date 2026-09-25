# F42 — Projekt-Harness

## ID
F42

## Titel
Projekt-Harness (E-F41-3 = B, direkt nach F41, vor F35) — WS-1: Skelett,
echter Prüfbefehl, Trust-Hinweis; WS-2: Architekt darf einen offenen Stack
nicht mehr selbst festlegen (löst F-685)

## Status
Status: IN_ARBEIT

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel (WS-1)
Ein über `POST /api/projekte` angelegtes Projekt (F41) bekommt zusätzlich
zur Baseline (Schicht 1, unverändert, E-F41-1) das Template-Skelett
(Schicht 2), einen echten, real lauffähigen Prüfbefehl und einen
Trust-Hinweis — löst die in `features/F41/feature.md` "Bekannte Grenzen"
und `state/findings.md` benannten strukturellen Lücken eines neu angelegten
Projekts: F-667 (kein `pruefbefehl`), F-673 (keine `.claude/skills/`), F-690
(Workspace-Trust nicht hergestellt). E-F41-3 = B (Stefan): Projekt-Harness
ist ein eigenes Feature nach F41, vor F35, mit einem Drei-Schichten-Modell
(`docs/projekt/zielfassung.md` §13.6):

1. **Baseline** (`.claude/settings.json`, Hooks,
   `state/aktuelle-autorisierung.json`) — byte-identisch aus ai-workforce,
   hash-geprüft, UNVERÄNDERT (E-F41-1). Dieses Feature rührt sie nicht an.
2. **Skelett** — `vorlagen/projekt-skelett/` (Snapshot von
   `claude-projekt-template` @ `template-baseline`, Commit `9189959`,
   Herkunft `vorlagen/projekt-skelett/HERKUNFT.md`), nicht gehasht.
3. **Füllung** — später per Workflow (Architekt Projektmodus →
   Ausführung), NICHT in WS-1.

E-PH-1 = B (Stefan): der Kern schreibt NIE in `~/.claude.json`. Er erkennt
fehlenden Workspace-Trust (read-only: nur
`projects[<pfad>].hasTrustDialogAccepted`) und meldet ihn — Stefan setzt
Trust selbst.

## Ziel (WS-2, löst F-685)
Solange der Stack eines Projekts noch offen ist (`istStackOffen`,
`src/architekt/index.ts` — `CLAUDE.md` fehlt oder trägt den
Füllungs-Marker `[FÜLLUNG]` bei "Technischer Stack"), darf der Architekt
ihn nicht mehr selbst als ADR-Entwurf festlegen, sondern muss ihn
deterministisch als Entscheidung mit `kategorie: 'stack'` in
`entscheidungen_mensch[]` vorlegen (mindestens zwei Optionen mit
Vor-/Nachteilen, eine referenzierte Empfehlung). `validiereErgebnisArchitektur`
erzwingt das über den neuen, rückwärtskompatiblen Parameter `stackOffen`;
real durchgesetzt in `scripts/leitstand-server.mjs`s
`leseArchitekturErgebnisAusLaufakte` (der Stelle, an der ein
Architektur-Lauf-Ergebnis nach Laufende tatsächlich validiert wird — nicht
nur im Gate).

## Nicht-Ziele
- Füllung des Skeletts (Coach-Interview/Architekt/Ausführung für das
  konkrete neue Projekt) — eigener, künftiger Workflow-Durchlauf, kein
  Bestandteil dieses WS.
- Rollen-Skills (F-672, eigener Baustein, nicht hier).
- Jede Änderung an Baseline, Allowlist oder Hooks (E-F41-1 bleibt
  unverändert — Schicht 1 gewinnt jeden Konflikt mit Schicht 2).
- Jedes Schreiben in `~/.claude.json` (E-PH-1 = B — nur read-only-Erkennung,
  keine programmatische Trust-Vergabe).
- **Harte Sperre schreibender Läufe gegen ein Projekt ohne bestätigten
  Workspace-Trust** (Advisor-Auflage, `state/advisor-findings-f42-projekt-
  harness-ws1.md` F5) — nur Anzeige/Warnung in
  `naechste_schritte.trust`. Eine harte Sperre müsste in
  `starteGateway`/F6a/F8 eingreifen, außerhalb des Auftragsumfangs
  `POST /api/projekte`-Antwort. `state/findings.md` F-702 bleibt dazu
  offen.
- `state/findings.md` F-701 beheben (Coach-Text-Hardcoding war bereits
  bekannt, F42 löst nur den in F-701 beschriebenen Symptomteil, nicht das
  gesamte Finding) — F-701 selbst bleibt als Fortschreibungs-Hinweis offen,
  falls weitere hartkodierte ai-workforce-Annahmen im Coach auftauchen.
- `haushaltsbuch`/andere bereits bestehende F41-Projekte rückwirkend
  nachrüsten — dieses Feature wirkt nur auf künftig NEU angelegte Projekte.

## Akzeptanzkriterien
- **AK1** Neu angelegtes Projekt enthält das Skelett, die Baseline bleibt
  byte-identisch, Startbedingung 1+2 grün. Belegt: `scripts/check-f41-
  projekt-anlegen.mjs` (6) (Skelett-Kopie über den realen Route-Pfad,
  Baseline-Bytegleichheit unverändert geprüft) + `scripts/check-f42-
  projekt-harness.mjs` (a)/(b).
- **AK2** `npm run check:template` im neuen Projekt liefert Exit 0. Real
  belegt (25.09.2026): Probe gegen ein Wegwerf-Projekt in
  `%TEMP%\projekt-harness-probe-<random>` (außerhalb aller Repos) —
  `fuehrePruefungDurch` liefert `ergebnis: "GRUEN"`, `exit_code: 0`,
  `dauer_ms: 1480` (`state/plan-v2-f42-projekt-harness-ws1.md` Abschnitt 8).
- **AK3** Coach-Auftrag im Fremdprojekt nennt nur den real konfigurierten
  Prüfbefehl (oder "kein Prüfbefehl konfiguriert"), keine
  ai-workforce-eigenen Prüfpfade (`validiereRoadmapDaten`,
  `check-feature.mjs`); in ai-workforce selbst unverändert. Belegt:
  `scripts/check-f34-product-coach.mjs` (q) (erweitert um vier
  Kontext-Fixtures + explizite Korrektheitsprüfung), `scripts/check-f42-
  projekt-harness.mjs` (d).
- **AK4** Trust-Status `true`/`false`/`fehlend` korrekt erkannt; kein
  Schreibzugriff auf `~/.claude.json` (`pruefeWorkspaceTrust` importiert
  keine Schreibfunktion, nur `readFileSync`/`existsSync`). Belegt:
  `scripts/check-f42-projekt-harness.mjs` (e), vier Fixture-Varianten plus
  ein bewusster Grenzfall (abweichende Laufwerksbuchstabe-Schreibweise →
  `'fehlend'`, siehe "Bekannte Grenzen").
- **AK5** Bestehende ai-workforce-Läufe werden nicht blockiert. Belegt:
  `npm run check` vollständig grün (775 Tests, alle Gates inkl. der
  angepassten `check-f41-projekt-anlegen.mjs`), `check:template`-
  Zusammensetzung selbst unverändert (F-701 bewusst nicht angefasst, siehe
  Nicht-Ziele).
- **AK6** Gate mit dokumentierten Rot-Fällen in `state/gates.md`.
- **AK7** (QA-Befund, nachgetragen 25.09.2026: `naechste_schritte.trust` wurde
  server-seitig berechnet, aber im Leitstand nie gerendert — E-PH-1s
  "meldet ihn" blieb dadurch nur eine API-Zusage) Der Trust-Hinweis
  erscheint sichtbar in der Leitstand-Erfolgsbox nach `POST /api/projekte`
  — `zeigeAnlegenErfolg` (`public/leitstand/views/projekte-uebersicht.js`)
  liest zusätzlich `naechsteSchritte.trust.hinweis` und zeigt ihn in einem
  neuen `#projekte-anlegen-erfolg-trust`-Element (`public/leitstand/
  index.html`), nur wenn `trust.status !== 'true'` (Server liefert dann
  `hinweis: null`). Löst F-690 im UI-Anzeige-Teil; die in F-690s Maßnahme
  zusätzlich verlangte Klärung "welche Rechte hat ein schreibender Lauf
  ohne Trust tatsächlich" bleibt offen (eigene, künftige Untersuchung).
- **AK8** (WS-2, löst F-685) Stack offen + Architekt legt nur fachliche
  Entscheidungen vor → Architekt-Ergebnis ungültig, zur Laufzeit wirksam in
  `scripts/leitstand-server.mjs`s `leseArchitekturErgebnisAusLaufakte` (alle
  drei Aufrufer). Belegt: `scripts/check-f42-projekt-harness.mjs` (f2, Rot-
  Fall), `src/architekt/architekt.test.ts`.
- **AK9** (WS-2) Stack offen + Entscheidung mit `kategorie: 'stack'`
  vorgelegt → gültig. Belegt: `scripts/check-f42-projekt-harness.mjs` (f2,
  Grün-Fall).
- **AK10** (WS-2) ai-workforce selbst (Stack bereits gefüllt,
  `istStackOffen(process.cwd())` → `false`) und jeder bestehende
  Architekt-Aufruf ohne `stackOffen`-Argument bleiben unverändert — auch
  eine bestehende `entscheidungen_mensch[]`-Ausgabe ganz ohne `kategorie`-
  Feld bleibt gültig. Belegt: `scripts/check-f42-projekt-harness.mjs` (f1,
  f2), alle bestehenden `src/architekt/architekt.test.ts`-Fälle unverändert
  grün, `npm run check` vollständig grün (784 Tests).
- **AK11** (WS-2) Die Rolleninstruktion (Feature- und Projektmodus) trägt
  den Zusatz "Stack nicht selbst festlegen" NUR, wenn `stackOffen` gesetzt
  ist. Belegt: `scripts/check-f42-projekt-harness.mjs` (f3),
  `src/architekt/architekt.test.ts`.

## Dependencies
- F41 — Neues Projekt anlegen (`src/projekt-anlegen/index.ts`,
  `POST /api/projekte`, `scripts/leitstand-server.mjs`). F42 erweitert
  dieselbe Datei additiv (`kopiereSkelett`, `pruefeWorkspaceTrust`,
  `schreibeStartvorlageUndProfil` geändert), ruft F41s Funktionen
  unverändert weiter auf.
- F34 — Product Coach (`baueAuftragAusProjektentwurf`,
  `src/product-coach/index.ts` + Browser-Kopie
  `public/leitstand/auftrag-aus-projektentwurf.js`) — additiver dritter
  Parameter `kontext`.
- F20 — Zustands-Poll (`GET /api/zustand`) — additive Felder
  `pruefbefehl`/`istAiWorkforce`, kein neuer Poll-Timer (AK3-Gate
  `check-f20-zustand-poll.mjs` bleibt unverändert bestehen).
- F-652 — Deterministischer Prüfschritt (`src/pruefschritt/index.ts`,
  `fuehrePruefungDurch`) — F42 ist der erste Aufrufer, der einen
  `pruefbefehl` mit absolutem Programmpfad statt eines manuell in
  `startvorlagen/ai-workforce.json` eingetragenen Pfads schreibt.
- F39 — Architekt (`src/architekt/index.ts`, `validiereErgebnisArchitektur`,
  `schemas/ergebnis-architektur.schema.json`) — WS-2 erweitert dieselbe
  Datei additiv (neuer `istStackOffen`, neuer optionaler `stackOffen`-
  Parameter, neues optionales `kategorie`-Feld in `entscheidungen_mensch[]`),
  ruft F39s bestehende Funktionen unverändert weiter auf.

## Betroffene Primitive
- `src/projekt-anlegen/index.ts` — `kopiereSkelett` (neu),
  `pruefeWorkspaceTrust` (neu), `schreibeStartvorlageUndProfil` (pruefbefehl
  jetzt gesetzt statt gelöscht).
- `scripts/leitstand-server.mjs` — `POST /api/projekte` (kopiereSkelett +
  Trust-Hinweis in `naechste_schritte`), `GET /api/zustand` (additive
  Felder).
- `src/product-coach/index.ts` + `src/product-coach/types.ts` (neuer Typ
  `AuftragKontext`) + `public/leitstand/auftrag-aus-projektentwurf.js` +
  `public/leitstand/views/chat.js` — `baueAuftragAusProjektentwurf`.
- `public/leitstand/index.html` + `public/leitstand/views/projekte-uebersicht.js` —
  `#projekte-anlegen-erfolg-trust`-Element, `zeigeAnlegenErfolg` zeigt den
  Trust-Hinweis (AK7, nachgetragen nach QA-Befund).
- `vorlagen/projekt-skelett/` — neuer Ordner, 37 Dateien + `HERKUNFT.md`.
- `scripts/check-f42-projekt-harness.mjs` — neues Gate; WS-2 ergänzt Block
  (f) additiv.
- `scripts/check-f41-projekt-anlegen.mjs`, `scripts/check-f34-product-
  coach.mjs` — Assertions an das geänderte Verhalten angepasst
  (Regressionsschutz, keine Verhaltensänderung an F41/F34 selbst über das
  additiv Beschriebene hinaus).
- (WS-2) `src/architekt/index.ts` — `istStackOffen` (neu), `validiereErgebnisArchitektur`
  (neuer optionaler dritter Parameter `stackOffen`, Default `false`),
  `baueArchitektAuftragstext`/`baueFeatureRolleninstruktion`/
  `baueProjektRolleninstruktion` (neuer `stackOffen`-Parameter, Zusatzhinweis).
- (WS-2) `src/architekt/types.ts` — neuer Typ `EntscheidungKategorie`,
  `EntscheidungMensch.kategorie` (optional).
- (WS-2) `schemas/ergebnis-architektur.schema.json` — `entscheidungen_mensch[].kategorie`
  ergänzt (Codex-Dialekt: strukturell in `required`, aber nullable —
  rückwärtskompatibel gegenüber dem handgeschriebenen Validator).
- (WS-2) `scripts/leitstand-server.mjs` — `leseArchitekturErgebnisAusLaufakte`
  (neuer optionaler `stackOffen`-Parameter), alle drei Aufrufer geben
  `istStackOffen(repoWurzel)` mit.

## Risiken
- Skelett-Snapshot kann von der Template-Quelle driften (F-700, TECH_DEBT,
  bewusst nicht automatisiert nachgezogen — `HERKUNFT.md` trägt die SHA für
  einen späteren manuellen Abgleich).
- `pruefZeitgrenzeMs: 120000` ist eine begründete Schätzung
  (`state/plan-v2-f42-projekt-harness-ws1.md` Abschnitt 4), kein über
  mehrere reale Projekte gemitteltes Maß — real gemessen bei der Probe:
  1480 ms, reichlich Puffer.
- `state/tooling.md` im Skelett trägt noch Template-eigene Beispielzeilen
  (siehe "Bekannte Grenzen").

## Bekannte Grenzen (dokumentiert statt stillschweigend behoben — CLAUDE.md-Entscheidungsregel 5)
- **Trust-Erkennung ist an die exakte Laufwerksbuchstabe-/Trenner-
  Schreibweise gebunden** (F-702, weiterhin offen): `pruefeWorkspaceTrust`
  vergleicht `cwdPfad.split(sep).join('/')` exakt gegen den in
  `~/.claude.json` gespeicherten Schlüssel. Ein Trust, der unter einer
  anderen Schreibweise (z. B. `c:/...` statt `C:/...`) gesetzt wurde, wird
  als `'fehlend'` gemeldet, obwohl Claude Code ihn ggf. real akzeptiert
  (Windows-Pfade sind case-insensitive, die Trust-Datei nicht zwingend).
  Bewusst in Kauf genommen statt eines Ratens, das in die andere Richtung
  falsch läge — ein fälschlich als `'true'` gemeldeter Trust wäre die
  schlechtere Fehlrichtung. Löst F-702 NICHT vollständig, nur den
  read-only-Erkennungsteil.
- **`state/tooling.md` im Skelett trägt Template-eigenen Inhalt**
  (`vorlagen/projekt-skelett/HERKUNFT.md`): Beispielzeilen (gitleaks,
  `ponytail`-Versionspin) beschreiben den Tooling-Stand des
  TEMPLATE-Projekts, nicht des neuen Projekts. Snapshot ist eine literale
  Kopie (keine Content-Bereinigung — Füllung ist WS-1-Nicht-Ziel), muss
  beim ersten echten `werkzeug-auswahl`-Lauf im neuen Projekt korrigiert
  werden.
- **Skelett-Whitelist-Umfang bei den zusätzlichen `state/*.md`-Vorlagen**
  (`state/gates.md`, `state/memory-map.md`, `state/assumption-ledger.md`,
  `state/reibung.md`, `state/triggers.md`,
  `state/zwischenstand/VORLAGE.md`) geht über das im Auftrag explizit
  Benannte hinaus — Advisor-Finding F6 (`state/advisor-findings-f42-
  projekt-harness-ws1.md`): geringes Risiko, reine Doku, additiv, bei
  Bedarf auf `state/tooling.md` + `state/tasks/.gitkeep` zurückschneidbar.
- **`check:template`-Zusammensetzung selbst bleibt F-701-widrig** (bewusst
  nicht in diesem WS behoben, siehe Nicht-Ziele): ai-workforces eigenes
  `check:template` (`package.json`) enthält weiterhin
  `check-f1b…f13`-Gates, obwohl `CLAUDE.md` es als "stackunabhängig"
  bezeichnet. Das neue Projekt bekommt sein EIGENES, sauberes
  `check:template` aus dem Skelett — dieses Feature ändert ai-workforces
  eigenes `check:template` nicht.

## Rollback
`vorlagen/projekt-skelett/`, `scripts/check-f42-projekt-harness.mjs`
entfernen; in `src/projekt-anlegen/index.ts` `kopiereSkelett`/
`pruefeWorkspaceTrust` entfernen und `schreibeStartvorlageUndProfil` auf
`delete startvorlage.pruefbefehl`/`delete startvorlage.pruefZeitgrenzeMs`
zurücksetzen (F41-Stand); in `scripts/leitstand-server.mjs` den
`kopiereSkelett`-Aufruf und das `trust`-Feld aus `POST /api/projekte`
sowie `pruefbefehl`/`istAiWorkforce` aus `GET /api/zustand` entfernen; in
`src/product-coach/index.ts`/`types.ts` und der Browser-Kopie den
`kontext`-Parameter entfernen (dritter Parameter war additiv, Aufrufer
ohne ihn bleiben gültig); `package.json`s `check`-Zeile um
`check-f42-projekt-harness.mjs` kürzen; die Assertions in
`scripts/check-f41-projekt-anlegen.mjs`/`check-f34-product-coach.mjs` auf
den F41/F34-Vorzustand zurücksetzen.

**WS-2 (löst F-685):** `istStackOffen` aus `src/architekt/index.ts`
entfernen; `validiereErgebnisArchitektur`/`baueArchitektAuftragstext`/
`baueFeatureRolleninstruktion`/`baueProjektRolleninstruktion` auf ihre
WS-1-Signatur (ohne `stackOffen`-Parameter) zurücksetzen; `kategorie` aus
`schemas/ergebnis-architektur.schema.json` und `EntscheidungMensch`
(`src/architekt/types.ts`) entfernen; in `scripts/leitstand-server.mjs`
den `stackOffen`-Parameter aus `leseArchitekturErgebnisAusLaufakte` und die
drei `istStackOffen(repoWurzel)`-Aufrufstellen entfernen; Block (f) aus
`scripts/check-f42-projekt-harness.mjs` sowie die WS-2-Testfälle aus
`src/architekt/architekt.test.ts` entfernen — jeder Schritt additiv
rückbaubar, ohne WS-1 zu berühren.
