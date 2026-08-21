<!-- Ziel-Pfad im Repo: state/advisor-findings-harness-setup.md -->
# Advisor-Findings — HARNESS_SETUP

## Kopf

Geprüft wurde `state/plan-v1-harness-setup.md` (Plan v1, 20.08.2026) durch den
Agent `architecture-advisor`, Rollengrenze `Read, Grep, Glob`, kein
Schreibrecht, kein Bash, kein Git.

**Exemplar-Hinweis (im Nachgang ergänzt, nicht Teil des Advisor-Laufs
selbst):** Der Lauf erfolgte, entgegen der ursprünglichen Anweisung, im
Arbeitsverzeichnis `C:\Users\stefa\Projekte\claude-projekt-template-main`
(ZIP-Ableitung von `main`), nicht in der zu diesem Zweck vorbereiteten
Lesekopie `_lesekopie` (frischer `git clone`, SHA
`9189959a7d4de0486a4fee1e30b57ea8e5644661`, bestätigt gegen main HEAD
`9189959`). Ein anschließender inhaltlicher Abgleich (Existenzprüfung
einzelner Dateien in `_lesekopie`) hat die Kernaussagen des Advisors nicht
entwertet — siehe Befund 0 im begleitenden Chat-Protokoll.

Fokus laut Auftrag: Verifikation der sieben `[Fakt]`-Behauptungen aus
Abschnitt 2, innere Widersprüche zwischen Arbeitspaketen und Abschnitt 6,
Reihenfolge (Abschnitt 5), Prüfbar-Bedingungen je Arbeitspaket,
Umfangsvergrößerung. Ausdrücklich nicht im Auftrag: offene Punkte 2, 4, 5, 6
aus Plan v1 Abschnitt 7 (Messfragen, mit Read/Grep nicht beantwortbar).

## Marker-Legende

`[Fakt]` belegt · `[Schlussfolgerung]` abgeleitet · `[Annahme]` ungeprüft ·
`[offene Unsicherheit]` ungeklärt · `[Fakt, entlastend]` geprüft und in
Ordnung.

---

## 1. Sieben [Fakt]-Behauptungen aus Abschnitt 2

| # | Behauptung | Urteil | Beleg |
|---|---|---|---|
| 1a | „Ein Repository für die AI Workforce existiert nicht" | nicht überprüfbar — Rollengrenze | kein Netz-/GitHub-Zugriff |
| 1b | Arbeitsbaum `regel/zielverzeichnis`, HEAD `7ad0086`, vier Hooks | nicht überprüfbar — Rollengrenze | zweiter Arbeitsbaum außerhalb des Zugriffs |
| 1c | ZIP-Download, fünf Hooks | `[Fakt, entlastend]` bestätigt | `.claude/hooks/` enthält exakt fünf Dateien |
| 1d | „…kein Git-Repository" | widerlegt für den *damaligen* Zustand des ZIP-Ordners | `.git` mit einem Commit „Ausgangsstand main" vorgefunden — im Nachgang geklärt: eigener, vom Plan unabhängiger lokaler Schritt, siehe Exemplar-Hinweis oben |
| 2 | Zielumgebung Windows/PowerShell/Node v24.16.0/Git 2.54.0/Claude Code 2.1.237 | nicht überprüfbar — Rollengrenze | nur per Bash messbar |
| 3 | „main steht bei 9189959; Challenge 2 wurde gegen diesen Stand geführt" | nicht überprüfbar — Rollengrenze | im Nachgang extern bestätigt (Lesekopie-SHA) |
| 4 | Prüfkette `lint && typecheck && check-docs && check-rules && check-contract && test`, drei Platzhalter mit Exit 1 | `[Fakt, entlastend]` bestätigt | `package.json:11-14` |
| 5 | `ci.yml` führt `check:template`, nicht `check` | `[Fakt, entlastend]` bestätigt | `.github/workflows/ci.yml:37` |
| 6 | `check-docs.mjs`, Prüfung 4 (`dokumentPaare`), leeres Array | `[Fakt, entlastend]` bestätigt | `scripts/check-docs.mjs:250-252` |
| 7 | `state/tooling.md` — gitleaks „vermutlich nie über werkzeug-auswahl geprüft" | `[Fakt, entlastend]` bestätigt | `state/tooling.md:8` |

## 2. Widersprüche AP-Text vs. Abschnitt 6

- AP 7 (`.env`/`.env.local` in `.claudeignore`, Vermerk „(035)") vs. Abschnitt
  6 („Keine Änderung am generischen Template — Harness-Kandidaten 1–8
  bleiben gemeldet"). Der Advisor konnte „035" im Arbeitsbaum nicht auflösen.
  **Im Nachgang geklärt:** „035" referenziert Entscheidungsregister-Eintrag
  35 (Secret-Ausschluss aus Modellkontext), nicht einen der acht
  Harness-Kandidaten aus Challenge 2 — zwei getrennte Nummernkreise. Die
  Zielfassung v1.3, Abschnitt 11, führt „`.env`/`.env.local` in
  `.claudeignore`" ausdrücklich unter „Projektbezogen konfigurieren", nicht
  unter „Nicht bauen". Kein Widerspruch.
- `check-rules.mjs` bleibt leer, keine neuen Linter-Regeln über die zwei
  entschiedenen hinaus — `[Fakt, entlastend]` deckungsgleich mit AP 4 und
  Abschnitt 6.
- AP 2 verlangt „mindestens eine echte Testdatei", Abschnitt 1/6 „kein
  Produktcode" — geringe Schwere, keine Planänderung nötig, aber die
  Testdatei ist als Harness-Selbsttest zu verstehen, nicht als Produktcode.

## 3. Reihenfolge (Abschnitt 5)

- **Hohe Schwere, übernommen (Befund 2):** AP 4s Kalibrierung der
  CI-/Branch-Protection-Zeilen (`state/gates.md:14-15`) ist nur aussagekräftig,
  wenn CI bereits die Produktkette fährt (Ergebnis von AP 3). Abschnitt 5
  nennt AP 4 nur als „nach AP 2", nicht „nach AP 3". → In Plan v2
  linearisiert: AP 0 → AP 1 → AP 2 → AP 3 → AP 4.
- **Mittlere Schwere, übernommen (Befund 1):** AP 5s Rot-Fall ist mit dem
  aktuellen `[FÜLLUNG]`-Inhalt von `HARNESS-LEARNING-STATE.md` und
  `HARNESS-CHANGELOG.md` nicht auslösbar — `check-docs.mjs:274-275`
  überspringt den Vergleich still ohne gültigen Stand-Marker. → In Plan v2
  Vorbedingung ergänzt.
- AP 6 vor AP 0–4 würde nur Dinge dokumentieren, die AP 1–4 ohnehin beheben —
  Reihenfolge bleibt frei, aber sinnvoll spät.

## 4. Prüfbar-Bedingungen je AP

- AP 0: schwächer als Anspruch — verhindert nicht, dass ein unsauberer
  Ausgangszustand unbemerkt als erfüllt durchgeht. **Übernommen und erweitert
  (Befund 3):** zusätzliche Prüfzeile zur Herkunft von `state/tasks/`.
- AP 2: schwächer als der eigene Warnhinweis (kein Ausschluss trivialer
  Tests). Zur Kenntnis genommen, keine Planänderung — Abgrenzung zu AP 4 ist
  beabsichtigt.
- AP 4: schwächer als die „besondere Auflage" — **übernommen**, Auflage wird
  in Plan v2 zur harten Bedingung.
- AP 5: `[Schlussfolgerung]` nach aktuellem Code-Pfad wahrscheinlich unerfüllbar — **übernommen
  (Befund 1)**.
- AP 7: keine Prüfbar-Zeile — **übernommen (Befund 1)**.

## 5. Umfangsvergrößerung

- AP 7 ohne Zuordnung zu einem der sechs Abschlusskriterien — **übernommen
  (Befund 1)**: Kennzeichnung als „ohne Kriteriumsbezug, Altlastenbeseitigung".
- Keine neuen Abstraktionen oder Dependencies in AP 1–4 — `[Fakt, entlastend]`.

## Gesamturteil des Advisor-Laufs

**Nicht freigegeben** — vier Blocker (AP 5, AP 7, AP 4/AP 3, AP 0), sämtlich
mit Stefan durchgesprochen und in Plan v2 eingearbeitet. Ein weiterer,
eigenständiger Befund (Harness-Fix-Programm-Altlast in `state/` und
`state/tasks/`) kam erst durch die Nachprüfung des Exemplars zutage und ist
ebenfalls in Plan v2 eingearbeitet.

## Nächster sinnvoller Schritt

Plan v2 (`state/plan-v2-harness-setup.md`) ist geschrieben. Als Nächstes:
Handoff-Vertrag nach dem Sieben-Sektionen-Format, danach Pre-Build-Halt, erst
danach Bau — wie in der Sitzungsübergabe vom 20.08.2026, Abschnitt 4,
festgelegt.
