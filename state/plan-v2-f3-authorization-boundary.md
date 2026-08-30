# Plan v2 — Feature F3: Authorization Boundary (minimal)

Slug: f3-authorization-boundary
Stand: 2026-08-30
Grundlage: `state/plan-v1-f3-authorization-boundary.md` (bleibt
unverändert stehen, wird hier nicht überschrieben) plus Advisor-Urteil
`state/advisor-findings-f3-authorization-boundary.md`: **NICHT
FREIGEGEBEN** — blockierend waren B1 (D3 überzieht: schließt nur die
„Veränderung"-Hälfte von E-189, nicht die „Erzeugung"-Hälfte, ohne das
im Plantext zu benennen), B2 (A4/A10 wie beschrieben technisch nicht
erfüllbar — `stelleLaufstatusFest` liefert ohne vorherige
`RUN_PREPARED`-Marke `NICHT_GESTARTET`, nicht `ABGESCHLOSSEN`), B3
(Windows-CRLF/LF-Risiko bei D3s Arbeitsbaum-vs.-`git show`-Vergleich
unbehandelt) und B4 (SCOPE.3s Hashing-Präzedenz falsch zitiert —
realer Code nutzt für externe, werkzeug-/mensch-erzeugte Inhalte
`sha256Hex(inhalt)`, nicht `kanonischesJson`). B5 (Ableitung des
repo-relativen Pfads) ist laut Advisor niedrige Schwere, kein
Blocker — wird hier trotzdem miterledigt, da der Fix klein ist. B6-B10
sind laut Advisor **bestätigt, entlastend** — D1 (eigenes Modul), D2
(Commit-Pinning), AC2-Umsetzung (Referenzformat), die Zuordnung
(Deliverable 2) und die Kein-F1B-Touch-Behauptung brauchen keinen
Umbau.

Alle Abschnitte von plan-v1, die hier nicht erwähnt werden, gelten
unverändert fort: Abschnitt 0 (Verifikation), 1 (Ziel), D1 (eigenes
Modul), D2 (Commit-Pinning-Grundidee), 5 (Ablageort), 8 (Rollen), 9
(Nächste Schritte) bleiben unverändert. Betroffen sind SCOPE.1/2/3/4/6
(Delta 1-4 unten), ein neuer Nicht-Ziele-Punkt (Delta 2), D3 (Delta 1),
die Akzeptanzkriterien (Delta-Tabelle unten) und Abschnitt 10 (jetzt
vollständig aufgelöst).

Diese Deltas sind technische Präzisierungen und Korrekturen innerhalb
der bereits von Stefan getroffenen Scope-Entscheidungen (externer Pfad,
Pfad-/Prozessgrenze statt OS-Sperre, genau eine Autorisierung je
`lauf_id`) — keine neue Grundsatzentscheidung. Diese Sitzung löst B1-B5
direkt auf, statt sie erneut zu eskalieren (CLAUDE.md-Entscheidungsregel:
Wartbarkeit/Komplexität reduzieren, Entscheidung dokumentieren, nicht
stillschweigend).

---

## Delta 1 (löst B1) — D3 auf „Veränderung" begrenzen, „Erzeugung"-Lücke explizit als Restrisiko dokumentieren

### Problem (Advisor B1)

plan-v1 Abschnitt 4, D3 behauptete, der Git-Objekt-Lesezugriff sei „die
einzige Stelle in diesem Plan, die diese Lücke schließt" — ohne
zwischen den zwei von E-189 benannten Bedrohungen zu unterscheiden
(„Erzeugung **und** Veränderung"). `git show <hash>:<pfad>` schließt
nachweislich nur die Veränderungs-Hälfte (eine bereits committete Datei
kann nicht unbemerkt nachträglich verändert werden). Ob der referenzierte
Commit selbst von einem Menschen oder vom Ausführungswerkzeug erzeugt
wurde, prüft `pruefeAutorisierung` an keiner Stelle — Autor-/
Committer-Felder sind trivial fälschbar und werden nicht geprüft.

### Lösung: Korrigierte D3-Formulierung + explizite Restlücke

**D3 (korrigiert):** „`git show <hash>:<pfad>` statt reinem
Arbeitsbaum-Lesen schließt die **Veränderungs**-Lücke aus E-189 (eine
committete Datei kann nicht unbemerkt nachträglich verändert werden,
ohne dass sich `commit_hash` oder `datei_hash` ändern). Die
**Erzeugungs**-Lücke (wurde der referenzierte Commit tatsächlich von
einem Menschen und nicht vom Ausführungswerkzeug selbst erzeugt) bleibt
in diesem Feature ungeprüft — Autor-/Committer-Metadaten sind fälschbar
und werden nicht validiert."

**Diese Restlücke ist kein Bau-Fehler, sondern eine bereits getroffene
Scope-Entscheidung, jetzt explizit benannt statt stillschweigend
überzogen:** Stefan hat bestätigt (plan-v1 Abschnitt 10, Punkt 2), dass
eine Pfad-/Prozessgrenze ohne OS-Sperre für diesen Zuschnitt ausreicht.
Eine echte „Erzeugung"-Prüfung (z. B. GPG-/SSH-Commit-Signing mit
gepinntem, außerhalb des Werkzeugs verwalteten Schlüssel, oder eine
OS-Rechteverwaltung, die dem Ausführungswerkzeug keinen Schreibzugriff
auf den externen Pfad gibt) würde entweder eine Rechteverwaltungsmaßnahme
voraussetzen (`zielfassung.md` Zeile 320, „Bewusste Nicht-Anforderung")
oder einen eigenen Prozessstart/Schlüsselverwaltungsmechanismus
(Invocation Policy, Deliverable 2 Feature #4) — beides ausdrücklicher
Nicht-Ziel-Rand von F3.

**SCOPE-Ergänzung:** `features/F3/feature.md` Nicht-Ziele-Abschnitt
trägt bereits „OS-seitige Durchsetzung der Schreibsperre [...] keine
technisch unüberwindbare Schreibverhinderung". Diese Formulierung
bleibt gültig — plan-v2 präzisiert nur, dass die **verbleibende Lücke
konkret die „Erzeugung"-Hälfte von E-189 ist**, nicht diffus „OS-Sperre
allgemein". Ergänzung in `features/F3/journal.md` (nicht in feature.md
selbst — Anhängeprotokoll ändert bestehende Einträge nicht,
Nicht-Ziele-Formulierung war bereits korrekt, nur unpräzise begründet).

**Wer liefert die initiale Referenz (`commit_hash`/`datei_hash`)?**
plan-v1 ließ offen, wer `referenz` vor dem Aufruf von
`pruefeAutorisierung` befüllt. Klarstellung: Das ist **außerhalb dieses
Features** — ein künftiger Aufrufer (Execution Controller, Deliverable
3, #8) liest die Datei nach ihrer Erstellung durch Stefan im externen
Repo, berechnet Hash/Commit selbst und trägt sie in den Kontrollzustand
ein. F3 liefert nur die Prüffunktion, nicht die Erzeugung der Referenz —
analog zu F1Bs Nicht-Ziel „Vergabe der `lauf_id` bleibt
Aufrufer-Verantwortung". Ergänzung in plan-v1 Abschnitt 3 (NICHT):
zusätzlicher Punkt „Erzeugung der `referenz` (`pfad`/`commit_hash`/
`datei_hash`) aus dem externen Repo — Aufrufer-Verantwortung,
außerhalb von F3, analog zur `lauf_id`-Vergabe in F1B."

---

## Delta 2 (löst B2) — `run_prepared`-Präzedenz vor dem Terminal, als Testvoraussetzung statt Funktionsänderung

### Problem (Advisor B2)

`stelleLaufstatusFest` (F1B, real geprüft) liefert für eine `lauf_id`
ohne vorangehende `run_prepared`-Marke `NICHT_GESTARTET`, nicht
`ABGESCHLOSSEN` — auch wenn ein Terminal-Eintrag existiert (Feld
`terminaleOhneRunPrepared`). plan-v1s A4/A10 verlangten einen Beleg
über `ABGESCHLOSSEN`/`VERWEIGERT` nach einem reinen
`verweigereAutorisierung`-Aufruf, ohne vorherige `RUN_PREPARED`-Marke —
technisch nicht erfüllbar wie beschrieben.

### Lösung: `verweigereAutorisierung` bleibt unverändert, Testaufbau/AC korrigiert

Keine Änderung an `verweigereAutorisierung` selbst nötig — es bleibt
ein dünner Aufrufer von `schreibeWirkungsmarke(..., "terminal", ...)`
(D-Entscheidung aus plan-v1 unverändert gültig). Stattdessen:

- **Neuer Nicht-Ziele-Punkt** (feature.md-Ergänzung im Handoff-Vertrag,
  nicht rückwirkend in feature.md selbst): „F3 schreibt keine
  `RUN_PREPARED`-Marke — das bleibt Aufrufer-Verantwortung
  (Execution Controller), analog zur `lauf_id`-Vergabe in F1B. Eine
  Verweigerung setzt eine bereits vorhandene `RUN_PREPARED`-Marke in
  derselben `lauf_id`-Kette voraus."
- **A4/A10 (korrigiert):** Testfixture schreibt zuerst über F1Bs
  bestehende `schreibeWirkungsmarke(laufId, ..., "run_prepared", ...)`
  eine `RUN_PREPARED`-Marke, **danach** `verweigereAutorisierung(laufId,
  referenz, begruendung)`. Erst danach liefert `stelleLaufstatusFest`
  real `ABGESCHLOSSEN`/`VERWEIGERT` — exakt wie F1Bs eigener A9/A10-Test
  bereits aufgebaut ist (`checkpoint-store.test.ts`, gleiches Muster,
  hier nur mit `verweigereAutorisierung` statt direktem
  `schreibeWirkungsmarke`-Aufruf für das Terminal).
- **Zusätzlicher Testfall (Ergänzung zu AC7, nicht in `feature.md`
  gezählt, aber Teil des Handoff-Vertrags):** `verweigereAutorisierung`
  **ohne** vorangehende `RUN_PREPARED`-Marke → `stelleLaufstatusFest`
  liefert real `NICHT_GESTARTET` mit `terminaleOhneRunPrepared:
  [<sequenz>]` — belegt, dass F3 dieses bereits vorhandene F1B-Verhalten
  nicht umgeht oder verschleiert (Regressionsbeleg gegen B2).

---

## Delta 3 (löst B3) — Zeilenenden-Regel für das externe Repo, Gate-Testfall

### Problem (Advisor B3)

`git show <hash>:<pfad>` liest den rohen Blob-Inhalt ohne
Checkout-Filter; ein `readFileSync` auf den Arbeitsbaum kann bei
aktivem `core.autocrlf` (Git-for-Windows-Standard häufig `true`) einen
CRLF-konvertierten Inhalt liefern. Eine unveränderte, korrekt committete
Datei könnte dadurch fälschlich als Divergenz-Fall (Rot) erkannt werden
— der wichtigste Grün-Testfall (A2) wäre auf diesem Windows-System
potenziell spurious rot, exakt die in `CLAUDE.md` dokumentierte
CRLF/LF-Fallenklasse.

### Lösung: `.gitattributes` im externen Repo, Gate-Testfall

- **SCOPE.1-Ergänzung:** Beim `git init` des externen Ordners (Stefans
  Aufgabe, plan-v1 Abschnitt 6) legt Stefan zusätzlich eine
  `.gitattributes`-Datei mit `* -text` (kein Zeilenenden-Handling für
  jede Datei in diesem Repo) an, bevor die erste Autorisierungsdatei
  committet wird. Alternative gleichwertig: `core.autocrlf=false` lokal
  für dieses Repo (`git config core.autocrlf false`) — `.gitattributes`
  ist robuster, weil repo-gebunden statt konfigurationsabhängig, und
  wird deshalb als Empfehlung in den Handoff-Vertrag aufgenommen.
- **SCOPE.6-Ergänzung (Gate-Skript):** `scripts/
  check-f3-authorization-boundary.mjs` legt sein Wegwerf-Git-Repo mit
  `* -text` in `.gitattributes` an (gleiche Regel wie produktiv erwartet)
  **und** prüft zusätzlich einen Testfall mit einer Datei, die
  `\r\n`-Zeilenenden enthält, um zu belegen, dass `pruefeAutorisierung`
  bei korrekt konfiguriertem `.gitattributes` unabhängig vom
  Zeilenende-Stil den Grün-Fall liefert.
- **A2-Ergänzung:** A2 gilt jetzt ausdrücklich nur unter der
  Voraussetzung `.gitattributes: * -text` im externen Repo — diese
  Voraussetzung ist Teil des Handoff-Vertrags als Startbedingung, nicht
  stillschweigend vorausgesetzt.

---

## Delta 4 (löst B4) — Hashing-Regel korrigiert: roher `sha256Hex(inhalt)`, nicht `kanonischesJson`

### Problem (Advisor B4)

plan-v1 SCOPE.3 zitierte „gleiche `kanonischeJson`-Regel wie F0/F1" für
`datei_hash` — das ist der Präzedenzfall für **kern-erzeugte** Payloads
(`src/lineage-registry/index.ts:94`, `registriereKernArtefakt`). Die
Autorisierungsdatei in F3 ist nach der vom Plan selbst zitierten
Eigentümerschaftsregel (§16.2, A7) der andere Fall: extern erzeugt,
außerhalb der Kern-Schreibhoheit. Der reale Präzedenzfall dafür ist
`registriereWerkzeugReferenz` (`src/lineage-registry/index.ts:127`):
`sha256Hex(inhalt)` — roher String-Hash, keine Kanonisierung.

### Lösung: SCOPE.3 korrigiert

`"datei_hash": "<sha256 des rohen Dateiinhalts als Bytefolge — sha256Hex(inhalt),
gleiche Regel wie registriereWerkzeugReferenz in src/lineage-registry/index.ts,
NICHT kanonischesJson (das gilt nur für kern-erzeugte Payloads wie F0/F1)>"`

Konsequenz für SCOPE.4 (`pruefeAutorisierung`): beide gelesenen Inhalte
(Arbeitsbaum via `readFileSync`, Commit via `git show`) werden roh, ohne
JSON-Parsing/Neuserialisierung, gehasht und verglichen — die
Schema-Validierung (Payload gültig?) passiert **danach**, als separater
Schritt auf dem geparsten Inhalt, nicht vermischt mit der
Hash-Berechnung. Diese Trennung war in plan-v1 bereits implizit so
beschrieben (SCOPE.4, „berechnet den Hash [...] validiert die Payload
gegen das Schema" — zwei Sätze, zwei Schritte), Delta 4 macht sie
explizit, um eine versehentliche Kanonisierung vor dem Hashing
auszuschließen.

---

## Delta 5 (löst B5, niedrige Schwere, direkt miterledigt) — Ableitung des repo-relativen Pfads

`pruefeAutorisierung` leitet den für `git show` benötigten
repo-relativen Pfad durch Abschneiden des fest bekannten Repo-Root-
Präfixes (`C:\Users\stefa\ai-workforce-autorisierung\`, SCOPE.1) von
`referenz.pfad` ab, danach Normalisierung der Pfadtrenner (`\` → `/`,
da Git intern `/` erwartet, auch unter Windows). Liegt `referenz.pfad`
nicht unter diesem Präfix, ist das ein Validierungsfehler (`{ ok: false,
grund: "pfad ausserhalb des erwarteten externen Repos" }`) — fail-closed,
kein `git show`-Aufruf mit einem unerwarteten/leeren Pfad.

---

## Akzeptanzkriterien — Delta-Tabelle (ersetzt betroffene A-Nummern aus plan-v1 Abschnitt 7)

| Nr. | plan-v1 | plan-v2 (Delta) |
|---|---|---|
| A2 | echte, committete, unveränderte Freigabe → `{ ok: true, ... }` | unverändert, jetzt mit expliziter Voraussetzung `.gitattributes: * -text` im externen Repo (Delta 3) |
| A4 | `verweigereAutorisierung` → `stelleLaufstatusFest` liefert `ABGESCHLOSSEN`/`VERWEIGERT` | Testfixture schreibt zuerst `schreibeWirkungsmarke(..., "run_prepared", ...)`, danach `verweigereAutorisierung` — erst dann `ABGESCHLOSSEN`/`VERWEIGERT` (Delta 2) |
| A10 | Test „echte Verweigerung" | wie A4-Delta, plus neuer Testfall „Verweigerung ohne vorangehende `RUN_PREPARED`-Marke" → `NICHT_GESTARTET`/`terminaleOhneRunPrepared` (Delta 2) |
| A18 | Hauptkriterium unverändert | Formulierung ergänzt: „innerhalb der in Delta 1 benannten Grenze (Erzeugungs-Lücke bleibt Aufrufer-/Deliverable-3-Verantwortung, kein Teil dieses Features)" |

Alle übrigen A1, A3, A5-A9, A11-A17 aus plan-v1 gelten unverändert fort.

## Ehemals offene Punkte — vollständig aufgelöst

Plan-v1 Abschnitt 10 (drei ehemals offene Punkte) war bereits vor
diesem Advisor-Pass von Stefan entschieden. Dieser Advisor-Pass hat
keine neue offene Scope-Frage aufgeworfen — B1-B5 sind technische
Präzisierungen innerhalb der bestätigten Entscheidungen (siehe
Delta-Begründungen oben). Es verbleibt kein offener Punkt vor dem
Handoff-Vertrag.
