# Plan v1 — Feature F6a: Claude-Code-Gateway, Lesepfad

Slug: f6a-claude-code-gateway
Stand: 2026-08-31
Rolle: Planner (Claude-Code-Sitzung, Repo-Zugriff)
Grundlage: `features/F6a/feature.md` (Ziel/Scope/Nicht-Ziele/AK1-13,
Journal), Challenge-Entscheidungen Stefan 31.08.2026 (Zuschnitt 6a→7→6b,
Abnahme über Beobachtungsbasis statt geschlossenen Lauf).

## 0. Verifikation (F-013-Muster — nicht annehmen, prüfen)

- **`docs/projekt/zielfassung.md` §9.4/§16.2/§16.8 real gelesen:**
  - §16.2, Modultabelle Zeile 334/335: „**Claude-Code-Gateway** | einzige
    Komponente, die Werkzeugprozesse startet; behandelt Pfade,
    Shell-Semantik, Werkzeugnamen, Zeilenenden | keine fachliche
    Bewertung, keine Fließtextdeutung" — deckt die F6a/F7-Grenze (AK12).
    „**Result Evaluator** | klassifiziert Läufe ausschließlich aus
    Ergebnishülle und Ereignisstrom | keine Ableitung aus Konsolentext"
    — bestätigt, dass die drei Terminalausgänge NICHT in dieser Akte
    gebaut werden.
  - E-182 (Verbotsliste), E-185 (`--model` explizit, `OBSERVED`-Rang),
    E-187 (`--tools` + MCP-Konfiguration, zwei Mechanismen), E-188
    (Gültigkeitsschlüssel-Felder), E-190 (zwei getrennte Ablagen) —
    wörtlich wie in `state/plan-v1-f4-invocation-policy.md` Abschnitt 0
    bereits zitiert, hier nicht erneut vollständig übernommen.
  - §16.8 Punkt 8 (Gültigkeitsschlüssel-Repräsentation, weiterhin offen)
    — F6a legt für die zwei Anteile, die nur das Gateway kennt
    (Berechtigungskontext, Arbeitsverzeichnispfad), erstmals eine
    konkrete Repräsentation fest (Abschnitt 4, Design-Entscheidung 2).
    Das schließt Punkt 8 nicht insgesamt — F4s `normalisierePfadFuerVergleich`
    bleibt die einzige Normalisierungsstelle, F6a liefert nur den rohen
    Wert.
- **`ARCHITECTURE.md` §3/§4/§7 real gelesen:** drei Terminalausgänge
  (§4, F7-Scope), zwei Ablagen (§4, E-190, hier AK6), kein automatischer
  Neustart (§4, hier AK5/AK9), Verbot „Laufergebnis aus Konsolentext
  ableiten" (§7, hier AK12 mechanisch geprüft).
- **`src/invocation-policy/index.ts` real gelesen (nicht nur F4s
  `feature.md`):**
  - `pruefeAufrufparameter(parameter: string[])` (`verbotene-
    aufrufparameter.ts:18`) prüft `parameter.includes(verbotenerWert)`
    elementweise gegen `VERBOTENE_AUFRUFPARAMETER`. Der Eintrag
    `'--permission-mode bypassPermissions'` ist im Array ein einzelner
    String mit eingebettetem Leerzeichen — bestätigt F-048 exakt am
    Code, nicht nur aus dem Findings-Text übernommen.
  - `pruefeStartfreigabe(eingaben, optionen): Starturteil` (`index.ts:385`)
    liefert bei `ABGELEHNT` `{ starturteil, grund,
    werkzeugsatz_begrenzung: 'DEKLARIERT' }`, bei `FREIGEGEBEN`
    zusätzlich `berechtigungskontext: eingaben.istUebrigeFelder.
    berechtigungskontext` zurück — F6a muss diesen Wert also VOR dem
    Aufruf in `istUebrigeFelder` hineinreichen (Abschnitt 4, Design-
    Entscheidung 2), nicht erst danach ermitteln.
  - `verweigereStart(laufId, profilReferenz, grund, optionen)`
    (`index.ts:413`) ruft `schreibeWirkungsmarke(…, 'terminal', {
    ergebnis: 'VERWEIGERT', … })` unverändert durch — F6a ruft das bei
    `ABGELEHNT` unverändert auf, baut keine eigene Verweigerungs-
    Wirkungsmarke nach (D5).
- **`src/checkpoint-store/index.ts` real gelesen:**
  `schreibeWirkungsmarke(laufId, profilReferenz, art, zusatz, optionen)`
  akzeptiert bei `art: 'terminal'` nur `ergebnis` aus `'ERFOLGREICH' |
  'VERWEIGERT' | 'FEHLGESCHLAGEN'` — es gibt **keinen** vierten Wert für
  „unvollständige Beobachtungsbasis". Das ist kein Manko, sondern
  bestätigt Entscheidung 2 aus dem Challenge (Option A): ein Fehllauf
  ohne Ergebnisobjekt schreibt schlicht **kein** Terminalartefakt. F1Bs
  `stelleLaufstatusFest` liefert dann korrekt `KLAERUNG_ERFORDERLICH` für
  die offene `RUN_PREPARED`-Marke — das ist der vorgesehene Zustand
  (ARCHITECTURE §4 „Blockieren ist ein normaler Ausgang, kein Fehler"),
  kein neuer Terminaltyp nötig. AK9 der Feature-Akte ist damit ohne
  Schema-Änderung an F1B umsetzbar.
- **`state/tp-nachtrag.md` real geprüft:** Abschnitt „TP-01 e", Messfall
  A (Abbruch, `kill -9`, Exit 137) und B (Zeitüberschreitung, `timeout
  5s`, Exit 124) — beide: kein `"type":"result"`-Objekt in stdout, leeres
  stderr, kein Rest-/Kindprozess über `Get-CimInstance Win32_Process`.
  Genau diese beiden aufgezeichneten Formen bilden die Attrappen-
  Fixtures für AK9/AK10 (Abschnitt 6).
- **`state/findings.md` F-030 real geprüft:** `.claude/settings.json`
  `permissions.allow` erlaubt aktuell nur `npm run
  check|check:template|lint|typecheck|test`. **Blockierend** — dieser
  Plan geht davon aus, dass der F-030-Vertrag den Bash-Kanal freigibt,
  BEVOR WS2 (Prozessstart) gebaut wird. WS1 (Aufrufkonstruktion) ist
  davon unabhängig planbar und baubar.

## 1. Ziel (prüfbar)

Ein Aufruf an einen realen Claude-Code-Prozess lässt sich aus einem
Kontextpaket (F5) und einem Starturteil (F4) heraus als Tokens-Array
konstruieren, vor jedem Start durch F4 freigeben lassen, mit einer
`RUN_PREPARED`-Wirkungsmarke (F1B) einleiten, real starten und in zwei
getrennten Ablagen (kanonische Laufakte, Rohereignisstrom) festhalten —
ohne die Laufausgabe fachlich zu bewerten. Ein Lauf ohne terminales
Ergebnisobjekt bleibt bewusst `KLAERUNG_ERFORDERLICH`, bis F7 existiert.

## 2. SCOPE

1. Neues, eigenständiges Modul `src/claude-code-gateway/`.
2. Aufrufrepräsentation: `AufrufTokens = string[]` — durchgehend, kein
   zusammengesetzter Kommandozeilen-String an keiner Stelle des Moduls.
3. **F-048-Fix in F4 (nicht in F6a):** `pruefeAufrufparameter` in
   `src/invocation-policy/verbotene-aufrufparameter.ts` wird zusätzlich
   zum bestehenden elementweisen Vergleich um eine Fenster-Prüfung
   ergänzt — jeder mehrwortige Eintrag aus `VERBOTENE_AUFRUFPARAMETER`
   wird in seine Leerzeichen-getrennten Tokens zerlegt und als
   zusammenhängende Teilfolge im `parameter`-Array gesucht (Fenster der
   passenden Länge, elementweiser Stringvergleich je Position). Bestehende
   einwortige Einträge bleiben über den unveränderten `includes`-Pfad
   erfasst — additiv, kein Verhaltensbruch für den bereits getesteten
   Grünfall. Grund für den Ort der Änderung: `VERBOTENE_AUFRUFPARAMETER`
   und `pruefeAufrufparameter` gehören F4 (D5 — F6a ruft von außen auf,
   baut keinen zweiten Regelsatz). F6a liefert nur das Tokens-Array, das
   diese gehärtete Prüfung durchläuft.
4. Aufrufkonstruktion: `baueAufruf(kontextpaket, starturteil, profil):
   AufrufTokens` — hängt `--model <wert>` (E-185, Pflicht, kein
   impliziter Default), `--output-format json`, `--setting-sources
   project` und eine explizite Werkzeugsatz-Begrenzung an (E-187,
   `DEKLARIERT`, siehe Nicht-Ziele/§16.8 Punkt 4).
5. Startfreigabe: `starteGateway(eingaben, optionen)` ruft zuerst
   `pruefeStartfreigabe` (F4) auf. Bei `ABGELEHNT`: `verweigereStart`
   (F4), Rückgabe `{ ok: false, grund }`, **kein** Prozessstart.
6. Gültigkeitsschlüssel-Anteile materialisieren (E-188, F4 reicht sie
   heute nur durch): `berechtigungskontext` (String, vom Aufrufer/Profil
   übergeben — F6a erzeugt ihn nicht, siehe Design-Entscheidung 2) und
   `arbeitsverzeichnis_pfad` (`process.cwd()` zum Zeitpunkt des
   Aufrufs, unnormalisiert — Normalisierung bleibt F4s
   `normalisierePfadFuerVergleich`, F6a verdoppelt sie nicht).
7. Bei `FREIGEGEBEN`: `schreibeWirkungsmarke(laufId, profilReferenz,
   'run_prepared')` (F1B) vor jedem Prozessstart.
8. Prozessstart-Primitiv `starteProzess(tokens, optionen):
   ProzessErgebnis` — dünner Wrapper, austauschbar über
   `optionen.starter` (Muster wie F1Bs `optionen.schreiber`), damit die
   Standardkette ohne echten Prozessstart testet (AK10).
9. Zwei getrennte Ablagen je Lauf (E-190):
   - Kanonische Laufakte: neues Payload-Schema `LAUFAKTE_V0`
     (`schemas/kontrollzustand-laufakte-payload.schema.json`), als
     Terminal-Wirkungsmarke bei vorhandenem Ergebnisobjekt registriert
     — trägt `modell_beobachtet` (Rang `OBSERVED`), Gültigkeitsschlüssel-
     Anteile, Rohstrom-Hash-Referenz. Trägt **nicht**: `ergebnis`-
     Klassifikation, `permission_denials`-Auswertung (F7-Scope, AK12).
   - Rohereignisstrom: rohe `stdout`/`stderr`-Bytes des Laufs, unter
     `kontrollzustand-roh/<lauf_id>/` (neuer Pfad, außerhalb des
     Commit-Baums — analog zur bestehenden Trennung `kontrollzustand/`
     vs. Testverzeichnisse), referenziert aus der Laufakte nur über
     seinen Inhalts-Hash.
10. Fehllauf-Behandlung: liefert `starteProzess` kein valides
    `"type":"result"`-Objekt (Abbruch/Zeitüberschreitung, Muster TP-01e),
    wird **keine** Terminal-Wirkungsmarke geschrieben. Die Laufakte
    erhält trotzdem einen Eintrag mit Kennzeichen
    `beobachtungsbasis_vollstaendig: false` — rein deskriptiv, keine
    Klassifikation (unterscheidet sich von einem F7-Terminalausgang).
11. Gate-Skript `scripts/check-f6a-claude-code-gateway.mjs`: Fixture-
    Validierung (`LAUFAKTE_V0`), AK12-Grep (kein
    `permission_denials`/`non_execution_kind`/Terminalausgangs-Code im
    Modul), AK1-Grep (kein zusammengesetzter Kommandozeilen-String —
    kein `.join(' ')`/Template-String mit Leerzeichen auf dem
    Aufruf-Array vor der Übergabe an `starteProzess`).

## 3. NICHT (Non-Scope, mit Grund)

- Klassifikation, `permission_denials`/`non_execution_kind`-Auswertung,
  die drei Terminalausgänge — F7 (§16.2 Zeile 335, feature.md Nicht-
  Ziele, AK12 erzwingt das mechanisch).
- Schreibwirkung, E-183/E-188 scharf (Rot-Fall-Nachweis, F-053) — F6b.
  Der Werkzeugsatz in WS2s Attrappen-Test enthält keine schreibenden
  Werkzeuge.
- `ERZWUNGEN` für die Werkzeugsatz-Begrenzung (E-187) — bleibt
  `DEKLARIERT` wie in F4, §16.8 Punkt 4 weiterhin offen.
- Orchestrierung mehrerer Executions, Resume — Execution Controller
  (F8).
- Eigene Kontextpaket-/Autorisierungs-/Startfreigabe-Logik — F6a ruft
  F5/F3(indirekt über F4)/F4 unverändert von außen auf (D5).
- Ein echter Claude-Code-Lauf innerhalb von `npm run check` — WS3
  bleibt manuell, Präzedenzfall `scripts/verify-rename-atomicity.mjs`
  (F1, `state/gates.md` Zeile 970).

## 4. Design-Entscheidungen

**1. Aufrufrepräsentation: Tokens-Array, nicht Kommandozeilen-String.**
Grund: F-048 entsteht genau aus der String-Form; ein Array macht die
Mehrwort-Verbotsprüfung überhaupt sauber lösbar (Design-Entscheidung 2
unten) und entspricht `process.argv`. `[EMPFEHLUNG]` — reversibel,
lokal auf `baueAufruf`/`pruefeAufrufparameter` begrenzt, kein
Architektur-Touch.

**2. Berechtigungskontext wird vom Aufrufer/Profil übergeben, nicht von
F6a ermittelt.** F4s `pruefeStartbedingung2` erwartet
`berechtigungskontext` bereits in `istUebrigeFelder` (vor F6as
Existenz so angelegt, siehe `state/advisor-findings-f4-invocation-
policy.md` „F6/F7 — ob und wie F4 Berechtigungskontext materialisieren
soll"). F6a **materialisiert** ihn nicht neu, sondern reicht einen vom
Profil/der aufrufenden Rolle stammenden Wert durch — ein String, dessen
konkrete Herkunft (z. B. Berechtigungsstufe der Rolle) außerhalb des
Scopes dieser Akte bleibt (F6/F7-Randnotiz im F4-Journal). `[EMPFEHLUNG]`
— sollte verworfen werden, sobald ein zweiter realer Aufrufer mit
abweichendem Berechtigungsmodell auftaucht (YAGNI-Grenze).

**3. Arbeitsverzeichnispfad unnormalisiert an F4 übergeben.** F4 besitzt
bereits `normalisierePfadFuerVergleich` (Advisor F12) — eine zweite
Normalisierung in F6a wäre Duplikat-Logik gegen D5. F6a liefert
`process.cwd()` roh. `[EMPFEHLUNG]` — reversibel, betrifft nur eine
Zeile.

**4. Rohereignisstrom-Ablageort `kontrollzustand-roh/`, nicht
`kontrollzustand/`.** E-190 verlangt „nicht committet" — ein eigener
Top-Level-Pfad macht das für `.gitignore` und für Menschen sofort
sichtbar, statt eine Ausnahme innerhalb von `kontrollzustand/` zu
pflegen. `[EMPFEHLUNG]` — reversibel vor dem ersten realen Lauf (WS3),
danach nur mit Migrationsaufwand.

**5. Kein neuer Terminalzustand für „Beobachtungsbasis unvollständig".**
Bestätigt durch Abschnitt 0 (F1Bs `schreibeWirkungsmarke` kennt nur drei
`ergebnis`-Werte). Der Fehllauf schreibt schlicht keine Terminal-Marke;
`KLAERUNG_ERFORDERLICH` aus F1B ist der korrekte, bereits vorhandene
Zustand. `[Fakt]` — keine Wahl, sondern Konsequenz aus Entscheidung 2 des
Challenge plus dem real gelesenen F1B-Code.

## 5. Ablageort

- `src/claude-code-gateway/index.ts` — `baueAufruf`, `starteGateway`,
  Typen `AufrufTokens`, `LaufakteEintrag`.
- `src/claude-code-gateway/prozessstart.ts` — `starteProzess`-Primitiv
  und Attrappen-Implementierung für Tests.
- `src/claude-code-gateway/claude-code-gateway.test.ts`.
- `schemas/kontrollzustand-laufakte-payload.schema.json` +
  `schemas/examples/kontrollzustand-laufakte-*.json` (Muster F5/F9).
- `kontrollzustand-roh/` — neuer, nicht committeter Pfad (WS2/WS3, siehe
  Design-Entscheidung 4). In `.gitignore` aufzunehmen.
- `scripts/check-f6a-claude-code-gateway.mjs`, eingehängt in `npm run
  check` und `npm run check:template`.
- `scripts/verify-f6a-real-run.mjs` (WS3, nicht in der Standardkette,
  Muster `verify-rename-atomicity.mjs`).

## 6. Budget & Pässe

- Attrappen-Werkzeug für WS2/AK10 gibt zwei aufgezeichnete Formen
  zurück: (a) reales, valides `"type":"result"`-JSON mit
  `permission_denials: []` (Muster `state/tp-nachtrag.md`, Messfall 1/2),
  (b) leeres stdout/stderr, Exit 137 oder 124 (TP-01e Messfall A/B) —
  keine Netzwerk- oder echten Prozessaufrufe in der Standardkette.
- Ein Baudurchgang (WS1) plus ein Baudurchgang (WS2) plus ein
  eigenständiger, manueller Nachweis (WS3) — drei separat abnehmbare
  Schritte statt einem großen (Zuschnitt-Heuristik CLAUDE.md,
  Begründung bereits in `features/F6a/feature.md` Abschnitt
  „Workstream-Liste").

## 7. Akzeptanzkriterien (technisch)

Deckungsgleich mit `features/F6a/feature.md` AK1-13, hier nur die
technische Zuordnung zu Workstreams:

- AK1-4 (Tokens-Array, F-048-Schluss, `--model`, Startfreigabe) → WS1,
  ohne Prozessstart testbar.
- AK5-9, AK11 (Wirkungsmarke, zwei Ablagen, Gültigkeitsschlüssel-
  Anteile, `OBSERVED`, Fehllauf-Behandlung, WS3-Nachweis) → WS2/WS3.
- AK10, AK12, AK13 (Attrappen-Tests, F7-Grenze per Grep, `npm run
  check`) → Gate, beide Workstreams betreffend.

## 8. Offene Unsicherheiten dieses Plans (nicht stillschweigend gelöst)

1. **Exakte Fensterlänge-Suche für F-048-Fix (Design-Entscheidung 1/2).**
   Groß-/Kleinschreibung und Whitespace-Varianten bleiben laut F-048
   selbst weiterhin ungetestet — dieser Plan schließt nur die
   Token-Fenster-Lücke, keine Normalisierung. Wenn der Advisor-Pass hier
   mehr verlangt, wäre das eine Scope-Erweiterung von F-048, nicht dieser
   Akte.
2. **Wie viele Zeilen/Bytes Rohereignisstrom im WS2-Test real erzeugt
   werden**, ohne einen echten Prozess zu starten — vorgesehen: die
   Attrappe schreibt vorab fixierte, kleine Beispielausgaben (aus
   `state/tp-nachtrag.md` wörtlich übernommen), keine synthetische
   Generierung.
3. **Ob `kontrollzustand-roh/` einen eigenen `.gitignore`-Eintrag oder
   eine Erweiterung eines bestehenden Musters braucht** — hängt vom
   aktuellen Stand der `.gitignore` ab, hier nicht geprüft.

## 9. Rollen für diesen Workstream

- Planner (diese Sitzung) → Advisor-Pass (frischer Kontext, prüft
  insbesondere Design-Entscheidung 1-3 und den F-048-Fix-Ort) → plan-v2
  → Handoff-Vertrag → Bau (WS1, dann WS2, dann WS3) → Reviewer-/QA-Pass
  vor dem Merge (Definition of Done, F-046).

## 10. Nächste Schritte nach diesem Plan (nicht Teil dieses Auftrags)

- F-030-Harness-Vertrag (Bash-Kanal-Freigabe) — läuft parallel, muss vor
  WS2-Bau abgeschlossen sein (Stefans Entscheidung, 31.08.2026).
- Advisor-Pass für diesen Plan.
- plan-v2, Handoff-Vertrag, Bau.
