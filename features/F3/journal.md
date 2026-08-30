# Journal — F3

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-08-30 — Akte angelegt

`features/F3/feature.md` aus dem Auftrag dieser Sitzung erstellt
(Ziel/Scope/Nicht-Ziele wörtlich übernommen, Akzeptanzkriterien und
Nicht-Ziele-Feinschliff aus `docs/projekt/zielfassung.md` §16.2/§16.3
sowie `ARCHITECTURE.md` §3 abgeleitet), `Status: READY_FOR_TECH`.
Grundlage: F0–F2 und F1B fertig und gemergt (`main` `8520714`). D16
(„Autorisierungsartefakte liegen außerhalb der Schreibreichweite des
Ausführungswerkzeugs") und E-189 („eine im Produkt-Repository sichtbare
Kopie oder Referenz ist niemals alleinige Autoritätsquelle") bisher nur
als Dokument, nicht im Code. Verweigerung nutzt F1Bs Terminalartefakt
`VERWEIGERT` weiter (`schreibeWirkungsmarke`), kein neuer
Terminalzustand. Kein Produktcode in diesem Schritt.

## 2026-08-30 — plan-v1

`state/plan-v1-f3-authorization-boundary.md` erstellt: konkreter
Vorschlag für Pfad/Init des externen Ordners, Referenzformat im
Kontrollzustand, Modulschnitt (`src/authorization-boundary/` als eigenes
Modul, nicht Erweiterung von F1B — anders als F1Bs eigener Präzedenzfall,
weil `zielfassung.md` §16.2 die Authorization Boundary ausdrücklich als
eigenen Modul-Eintrag führt), Testaufbau mit einem echten
Wegwerf-Git-Repository als Fixture. Zentrale, bewusst nicht
stillschweigend entschiedene Grenze: D16/E-189 verlangen eine
Pfad-/Prozessgrenze plus Manipulationserkennung (Hash-Vergleich gegen
den echten Ort) — keine technisch unüberwindbare OS-Schreibsperre, die
außerhalb des Scopes dieser Akte läge (kein Prozessstart, keine
Rechteverwaltung laut Nicht-Ziele des Zielbilds). Konkreter externer
Pfad als Vorschlag markiert, nicht als Vorgabe — Bestätigung durch
Stefan vor dem Bau nötig (Offener Punkt 1), weil das Anlegen eines
dauerhaften externen Zustandsorts schwer rückgängig zu machen ist. Kein
Produktcode in diesem Schritt.

## 2026-08-30 — Plan fixiert, zwei Advisor-Pässe, Handoff-Vertrag

Die drei offenen Punkte aus plan-v1 Abschnitt 10 von Stefan entschieden:
externer Pfad `C:\Users\stefa\ai-workforce-autorisierung\` bestätigt,
Pfad-/Prozessgrenze statt OS-Sperre reicht, genau eine Autorisierung je
`lauf_id` (keine `sequenz`-Zählung). Plan entsprechend fixiert
(SCOPE.1-3, NICHT-Abschnitt, Abschnitt 6, Abschnitt 10 direkt bearbeitet
— keine neue Datei, da direkte menschliche Entscheidung, kein
Advisor-Delta).

Erster Advisor-Pass (`architecture-advisor`, frischer Kontext,
`state/advisor-findings-f3-authorization-boundary.md`): **NICHT
FREIGEGEBEN** — B1 (D3 schließt nur die „Veränderung"-Hälfte von E-189,
Plantext überzog das), B2 (A4/A10 mit dem realen F1B-Code, so wie
beschrieben, technisch nicht erfüllbar — `stelleLaufstatusFest` liefert
ohne vorherige `RUN_PREPARED`-Marke `NICHT_GESTARTET`), B3
(Windows-CRLF/LF-Risiko beim Arbeitsbaum-vs.-`git show`-Vergleich
unbehandelt), B4 (Hashing-Präzedenz falsch zitiert — realer
Präzedenzfall ist `sha256Hex(inhalt)` roh, nicht `kanonischesJson`)
blockierend. B5 (Pfad-Ableitung) niedrige Schwere. B6-B10 (D1 eigenes
Modul, D2 Commit-Pinning, kein F1B-Touch nötig, AC2-Umsetzung,
Zuordnung) bestätigt, entlastend.

`state/plan-v2-f3-authorization-boundary.md`: Delta 1 löst B1
(D3-Formulierung korrigiert, Erzeugungs-Lücke explizit als bereits
entschiedene Scope-Grenze dokumentiert), Delta 2 löst B2 (Testfixtures
schreiben zuerst `RUN_PREPARED`, `verweigereAutorisierung` selbst bleibt
unverändert), Delta 3 löst B3 (`.gitattributes: * -text` vor dem ersten
Commit), Delta 4 löst B4 (Hashing-Regel korrigiert), Delta 5 löst B5
(Präfix-Ableitungsregel).

Zweiter, auf das Delta beschränkter Advisor-Pass
(`state/advisor-findings-f3-authorization-boundary-v2.md`):
**FREIGEGEBEN MIT HINWEISEN.** B1-B4 real gegen den Code (u. a.
`stelleLaufstatusFest`-Ablauf Schritt für Schritt durchgerechnet)
vollständig gelöst. Drei Nachbesserungen benannt: B17
(`verweigereAutorisierung` braucht `profilReferenz` als expliziten
Parameter, in plan-v1/v2 nicht spezifiziert), B18 (`.gitattributes`
sollte aktiv geprüft werden, nicht nur als Empfehlung stehen — sonst
keine unterscheidende Fehlermeldung bei einer vergessenen Regel), B20
(Pfad-Präfixvergleich muss case-insensitive und trennernormalisiert
sein, sonst falsch-negative Windows-Pfadvergleiche). Handoff-Vertrag
`state/tasks/f3-authorization-boundary.md` angelegt, alle drei
Korrekturen wörtlich aufgenommen. Kein Produktcode in diesem Schritt.

## 2026-08-30 — Ausführung

Vertrag `state/tasks/f3-authorization-boundary.md` umgesetzt.
SCHRITT-0-Prüfung: Arbeitsverzeichnis und Branch stimmten,
`C:\Users\stefa\ai-workforce-autorisierung\` existierte bereits real mit
`.gitattributes: * -text` (Commit `ebde7fa`, vor jedem Autorisierungs-
Commit) — Startbedingung erfüllt, kein ESCALATE nötig.

Neues, eigenständiges Modul `src/authorization-boundary/{index,types}.ts`
(D1, kein F1B-Touch — real bestätigt: `schreibeWirkungsmarke`/
`stelleLaufstatusFest` unverändert von außen aufgerufen). `pruefeAutorisierung`
setzt die drei Advisor-Nachbesserungen um: `profilReferenz` als expliziter
Parameter in `verweigereAutorisierung` (B17), aktive `.gitattributes: *
-text`-Prüfung vor jedem Hash-Vergleich mit eigener, unterscheidbarer
Fehlermeldung (B18), case-insensitive/trennernormalisierte
Pfad-Präfixprüfung mit Ableitung des repo-relativen Pfads aus dem
Original (nicht kleingeschriebenen) Pfad (B20). `datei_hash` roh gehasht
(`sha256Hex`, kein `kanonischesJson` — Delta 4/B4). Neues Schema
`schemas/kontrollzustand-autorisierung-payload.schema.json`, neues Gate
`scripts/check-f3-authorization-boundary.mjs`, sechs `node:test`-Fälle in
`authorization-boundary.test.ts` (AC7 Fall 1–4, B18, B2/B17-
Regressionsbeleg).

Kalibrierung real durchgespielt, mit einer Abweichung vom bisherigen
Muster: ein temporärer Code-Eingriff in die reale Prüf-Logik
(`src/authorization-boundary/index.ts`, Hash-Vergleich testweise
deaktiviert) wurde vom Auto-Mode-Classifier blockiert, sofort
zurückgenommen (`grep "if (false" src/authorization-boundary/index.ts`
liefert keinen Treffer). Auf Stefans Anweisung stattdessen: alle
Rot-Fälle über manipulierte Testfixtures belegt, ohne Produktcode
anzufassen — ein echtes Wegwerf-Git-Repo, `pruefeAutorisierung` einmal
mit falschem `datei_hash` (Ablehnung: „Inhalt am referenzierten Ort
weicht von der Referenz ab"), einmal mit falschem `commit_hash`
(Ablehnung: „Commit oder Pfad im externen Repo nicht auffindbar"),
danach mit der korrekten Referenz gegen dieselbe Datei (Annahme). Sechs
Schema-Rot-/Grün-Fälle gegen `validiereAutorisierungEintrag`. Divergenz-,
Fehlt- und fehlende-`.gitattributes`-Fälle sind im Gate-Skript und in der
Testdatei dauerhafte, echte Fixtures (kein Wegwerf-Rot-Fall nötig, da sie
bei jedem Lauf gegen unveränderten Code geprüft werden). Details und
volle Belege in `state/gates.md`, F3-Authorization-Boundary-Gate-Zeile.

`npm run check` und `npm run check:template` grün, `tests 30, pass 30,
fail 0`.

## Status
- [x] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
`git status` prüfen, Diff zur Freigabe zeigen, `state/freigabe-commit.md`
abwarten, dann committen (gezielte Pfade, `git-flow`-Skill) und pushen.
