# Plan v2 — F25 WS-1 (Projektregister, Handler-Instanzen, cwd-Threading)

Delta gegenüber `state/plan-v1-f25-ws1-projektregister.md`, nach
Advisor-Pass (`state/advisor-findings-f25-ws1-projektregister.md`, Urteil:
Nicht freigegeben — zwei Hochbefunde). v1 bleibt unverändert als
historischer Stand stehen. Nur die geänderten Abschnitte werden hier
vollständig neu gefasst; alles andere aus v1 (Abschnitte 0, 1, 5, 8) gilt
unverändert, mit der Korrektur aus Befund 6 (v1 Abschnitt 0):
`STANDARD_AKTUELLE_AUTORISIERUNG_PFAD` steht real in
`src/claude-code-gateway/index.ts:81`, nicht in `scripts/leitstand-server.mjs`.

## Delta A — D13: additiv statt Rename (löst Befund 1)

Kein Rename von `laufAktiv`/`laufAktivLaufId`/`laufAktivAbortController`.
`scripts/check-f11-auftrag.mjs:297,312` verlangt die wörtlichen
Quelltext-Substrings `if (laufAktiv)` und `laufAktiv = false` — ein Rename
auf `globalerLaufZustand.aktiv` lässt dieses Gate (Teil von `npm run
check`) scheitern und verletzt AK2/AK7. Stattdessen: **zwei unabhängige,
parallele Sperren**, defense-in-depth statt Ersatz.

1. `erzeugeRequestHandler(optionen)` bekommt einen zusätzlichen
   destrukturierten Parameter `globalerLaufZustand = { aktiv: false,
   laufId: null, abortController: null }` (frisches Objekt als Default —
   für jeden bestehenden Aufrufer, der ihn nicht kennt, ohne jede
   Wirkung).
2. An JEDER bestehenden `if (laufAktiv) { …409…}`-Stelle (mind. 5
   Fundstellen laut Advisor-Bericht Befund 5) wird UNMITTELBAR eine
   zweite, eigenständige Prüfung ergänzt:
   ```js
   if (laufAktiv) {
     // ... unverändert, exakt wie heute ...
   }
   if (globalerLaufZustand.aktiv) {
     sendeJson(res, 409, { fehler: `Ein anderer Lauf ist bereits aktiv (laufId: ${globalerLaufZustand.laufId})` })
     return
   }
   ```
   Die 409-Antwortkörper beider Prüfungen werden über eine gemeinsame
   kleine Hilfsfunktion gebaut (kein neuer Zustand, nur DRY für die
   Antwortform), damit sich der Text nicht an fünf Stellen unabhängig
   verselbständigt.
3. An jeder "Sperre setzen"-Stelle (mind. 3 Fundstellen) wird zusätzlich
   `globalerLaufZustand.aktiv = true; globalerLaufZustand.laufId = laufId`
   gesetzt. Der `AbortController` wird NICHT verdoppelt — dieselbe Instanz
   wird beiden Namen zugewiesen: `laufAktivAbortController =
   globalerLaufZustand.abortController = new AbortController()`
   (ein Abbruch wirkt so ohnehin nur auf den einen tatsächlich laufenden
   Prozess, unabhängig davon, über welchen Namen man ihn liest).
4. An beiden Reset-Stellen (.then UND .catch, je Aufrufpunkt) wird
   zusätzlich zurückgesetzt: `globalerLaufZustand.aktiv = false;
   globalerLaufZustand.laufId = null; globalerLaufZustand.abortController
   = null` — **nach** dem bestehenden `laufAktiv = false` (Reihenfolge
   ohne Belang, Text bleibt in jedem Fall vorhanden;
   `check-f11-auftrag.mjs`s Regex `/laufAktiv\s*=\s*false/` matcht
   unabhängig von Folgezeilen).
5. CLI-Bindeblock: EIN gemeinsames `{ aktiv: false, laufId: null,
   abortController: null }`-Objekt wird erzeugt und an JEDE
   `erzeugeRequestHandler`-Instanz (Default + alle Registereinträge)
   durchgereicht. Der lokale `laufAktiv` bleibt je Instanz isoliert
   (unverändertes Verhalten für Einzelinstanz-Tests/Gates), der neue
   `globalerLaufZustand` ist über alle Instanzen dieselbe Referenz und
   trägt damit AK5 tatsächlich (ein Arbeitsstrang je Workforce-Instanz
   über alle Projekte).

Ergebnis: `check-f11-auftrag.mjs` sieht denselben Quelltext-Vertrag wie
heute (Sperre vor `laufIdBelegt`, Reset in `.then`/`.catch`) unverändert
erfüllt — der Advisor-Befund ist damit strukturell aufgelöst, nicht nur
umgangen.

## Delta B — cwd auch für Codex-Pfad (löst Befund 2)

`src/codex-gateway/types.ts:78-85` (`CodexGatewayOptionen`) bekommt
`cwd?: string`, Kopfkommentar ergänzt (Muster `zeitgrenzeMs`). `src/codex-
gateway/index.ts:283-288` (`starteProzess`-Aufruf in `starteCodexGateway`)
bekommt `cwd: optionen.cwd,`. `src/execution-controller/index.ts:338-346`
(Codex-Zweig-Aufruf) bekommt `cwd: optionen.cwd,` ergänzt — analog zum
bereits vorhandenen `settingsPfad`/`aktuelleAutorisierungPfad`-Muster im
Claude-Code-Zweig (Zeilen 356-366). `AusfuehrungsOptionen.cwd` (Delta aus
v1 Abschnitt 2, Schritt 5) gilt damit für BEIDE Worker-Zweige, wie es die
gemeinsame Typdefinition ohnehin nahelegt — keine stille Lücke mehr für
projektregistrierte Codex-Workflow-Schritte.

## Delta C — Ein Validierungsweg für `projekte.json` (löst Befund 3)

v1 Abschnitt 1s Verweis auf `check-datenformate.mjs` entfällt ersatzlos.
Stattdessen, Muster F19 (`src/ressourcen/index.ts` +
`scripts/check-f19-ressourcen.mjs`):

- Neues Modul `src/projekte/index.ts`: `validiereProjekteDaten(daten:
  unknown): { ok: true; projekte: ProjektEintrag[] } | { ok: false;
  grund: string }` — handgeschriebene Validierung (Pflichtfelder, Enum-
  Prüfung für `status`, `additionalProperties`-äquivalente Ablehnung
  unbekannter Felder), plus `ladeProjektregister(pfad: string)` (liest +
  parst + validiert `projekte.json`, wirft bei Schemaverstoß — Muster
  `ladeStartvorlage`, ein Konfigurationsfehler des Servers ist kein
  Fachergebnis).
- `src/projekte/types.ts`: `ProjektEintrag`-Interface, `status`-Union.
- `schemas/projekte.schema.json` bleibt als deklarative Dokumentation
  bestehen (Muster `schemas/ressourcen.schema.json` — Schema UND
  Handvalidator koexistieren im Bestand, kein Widerspruch), wird aber von
  KEINEM Gate automatisch gegen den Handvalidator abgeglichen (identisch
  zum F19-Bestand — keine neue Anforderung, die es dort auch nicht gibt).
- `scripts/check-f25-projekte.mjs` importiert `validiereProjekteDaten`
  direkt und kalibriert Rot-/Grün-Fall (Muster
  `check-f19-ressourcen.mjs` Regel 1).

## Delta D — Export statt Widerspruch (löst Befund 4)

v1 Abschnitt 3s Satz "nicht als exportierte Funktion" entfällt. Statt-
dessen: `baueProjektHandlerMap` und `erzeugeMultiProjektDispatcher`
werden aus `scripts/leitstand-server.mjs` exportiert (Muster
`erzeugeRequestHandler`, `pruefeStartauftrag`, `VERBOTENE_OPTIONEN_FELDER`
— bereits heute alle exportiert und von Gate-Skripten importiert).
`scripts/check-f25-projekte.mjs` importiert beide direkt, baut eigene
Test-Fixturen (temp-Verzeichnisse, Attrappen-`fuehreAufgabeDurchFn`),
Muster jedes bestehenden Gate-Skripts.

## Reihenfolge (ersetzt v1 Abschnitt 8)

1. `src/projekte/{types,index}.ts` + `schemas/projekte.schema.json` +
   `projekte.json` (Starteintrag `ai-workforce`) — isoliert testbar.
2. cwd-Kette Claude-Code-Pfad (v1 Abschnitt 2, Schritte 1-4,7).
3. cwd-Kette Codex-Pfad (Delta B).
4. `AusfuehrungsOptionen.cwd` + `execution-controller/index.ts` beide
   Zweige + `VERBOTENE_OPTIONEN_FELDER` (v1 Schritt 5,6 + Delta B).
5. D13 additive Doppelsperre (Delta A) — `npm run check` inkl.
   `check-f11-auftrag.mjs` nach diesem Schritt zwingend grün, bevor
   weitergebaut wird.
6. `erzeugeRequestHandler` um `settingsPfad`/`aktuelleAutorisierungPfad`/
   `cwd`/`globalerLaufZustand`-Annahme ergänzen (v1 AK4).
7. `baueProjektHandlerMap` + `erzeugeMultiProjektDispatcher` (exportiert,
   Delta D) + CLI-Bindeblock-Verdrahtung (v1 AK2), inkl. Schleife über
   `belegeInstanzLock` je Registereintrag.
8. Gate `check-f25-projekte.mjs` (Delta C+D kombiniert), kalibriert.
9. Realer Zwei-Projekte-Test (AK8), Nachweisdatei
   `features/F25/nachweis-ws1.md`.
10. Findings F-413/F-414 nachtragen, `features/F25/feature.md`
    aktualisieren (Status → FEATURE_GATE), `npm run check` grün,
    Reviewer-/QA-Pass, Commit/PR.

## Weiterhin offene Punkte (aus v1 Abschnitt 6, unverändert gültig)

- `profil_pfad`-Pflicht ohne Leseeffekt in WS-1 (bewusst, spätere WS).
- AK8s zweites Test-Repo: Anlage außerhalb des Repos, nicht in die
  committete `projekte.json` aufgenommen — Nachweis separat dokumentiert.
- Keine statische Auslieferung unter `/api/projekte/<id>/...` in WS-1.
- `repo_pfad: '.'` beim Starteintrag wird relativ zu `process.cwd()` zum
  Server-Startzeitpunkt aufgelöst (einzige Ausnahme, dokumentiert).
