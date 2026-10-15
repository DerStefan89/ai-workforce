# Nachweis F45 B2b-2b-2 — Render („qa-Schritt live“: Prüfung aus Nutzersicht in der Abnahme)

Testinstanz `features/F45/nachweise/b2b2b2/instanz.mjs` (Port 4402, Wegwerf-Ablage, Projekt = Wegwerf-Repo mit CLAUDE.md
dieses Repos, Startvorlage ohne Prüfbefehl). Drei Abläufe aus der **echten Vorlage standard** (`waehleWorkflowVorlage`:
Ausführung → Review (Codex) → qa (Claude)) laufen über den echten HTTP-Pfad; Ausführung, Review und qa sind Attrappen (kein
CLI, kein Netz) mit echten Laufakten im Rohstromformat ihres Workers. Klickfolgen `render/erzeuge-nachweis.mjs`, je Ordner
Screenshot, `klickfolge.json` und `protokoll.md` (Klicktabelle mit Überlaufmessung). 15.10.2026.

| Folge | Zeigt |
|---|---|
| `render/bereit-hoch-de-1440`, `-de-1440-hell`, `-de-390`, `-ru-390-hell`, `-de-1440-zoom200` | (a) Abnahme „entscheidbar“: Kacheln Prüfung · Review (Codex, Bereit) · Nachweise, darunter die Karte „Prüfung aus Nutzersicht“ mit Badge „Bereit“ in amber, „Claude“, Empfehlung, amber Notiz „Hinweise zur Prüfung aus Nutzersicht“ (schwerer Befund trotz „bereit“), Befund Q1 (HOCH, lange Fundstelle, ID, Evidenz, Korrekturrichtung) und die Testfälle zugeklappt mit Zahlenzeile (aufgeklappt je Fall Bestanden ✓, Durchgefallen ✗, Nicht prüfbar ? mit Schritten und Erwartung); „Abnehmen“ bleibt angeboten; „Auf einen Blick“ mit Urteil, Befundzahl und Hinweiszahl |
| `render/halt-de-1440`, `-de-1440-hell`, `-de-390`, `-ru-390-hell`, `-de-1440-zoom200` | (b) Halt am qa nach Werkzeugausfall: rote Notiz „Prüfung aus Nutzersicht“ mit Ursache ohne Kennungen, dem Ausweg in einem Satz („Ohne Prüfung aus Nutzersicht ist keine Abnahme möglich — wiederhole sie …, repariere den Ablauf, wünsche eine Anpassung oder lehne ab.“) und dem Knopf „Prüfung aus Nutzersicht wiederholen“ auf eigener Zeile; kein „Abnehmen“ |
| `render/blockiert-de-1440`, `-de-390` | (c) Halt am qa mit gültigem BLOCKIERT (`max_replans` 0, Advisor A1/A3): rote Notiz mit Badge „Blockiert“, dem neutralen Satz „Der Ablauf hält nach der Prüfung aus Nutzersicht …“ und den qa-Befunden; kein Knopf |
| `render/halt-klick-de-1440` | (b) Klick auf „Prüfung aus Nutzersicht wiederholen“ → nur der qa läuft erneut (POST …/pruefer-wiederholen, danach …/starten) → Abnahme mit Karte; Meldung „Prüfung aus Nutzersicht neu gestartet — nur dieser Schritt läuft erneut, Umsetzung und Review bleiben.“ |

Klicktabelle (Spalten je Folge): qa-Karte, Review-Kachel, Hinweis amber/rot, Badge amber (Karte; F-1114 (13)), drei
Testfälle, qa-Befundliste, Knopf, Zahl im Blick, Abnehmen — (a) Karte/amber/Badge amber/Testfälle/Befunde/Abnehmen true,
rot/Knopf false; (b) rot/Knopf true, Karte/Abnehmen false; (c) rot/Befunde true, Knopf false; Klick: danach Karte und
Abnehmen true, Knopf false.

Überlaufmessung: in allen 13 Folgen kein waagerechter Überlauf — 1440 px ⇒ 1440/1440, 390 px ⇒ 390/390 (de und ru),
200 % ⇒ 720/720 CSS-px.

Korrektur im Bau: die erste Fassung zeigte die Testfälle dreispaltig (Name · Schritte · Erwartet); bei 390 px brach ru
„Ожидается“ mitten im Wort. Seither stehen sie untereinander wie ein Befund (`.abnahme-testfall`, `style.css`).

Korrekturrunde (Prüfpass 15.10.2026): Testfälle aufklappbar, die Zusammenfassung trägt die Zahlen („Testfälle · 1 bestanden ·
1 durchgefallen · 1 nicht prüfbar“, design-guardian 1); im Vorab-Block „Befunde“ als h4 ohne Linie unter dem letzten Befund
(design-guardian 2); Satz bei Halt mit gültigem Ergebnis „… eine automatische Korrekturrunde startet nicht. Prüfe die Urteile
von Review und Prüfung aus Nutzersicht …“ ohne den Hinweis „bevor du abnimmst“ (qa 2); Blick „1 — Details unten“
(design-guardian 3); ein laufender qa ist kein Hinweis (Status „läuft“, code-reviewer 1/qa 1 — im Bild nicht zu sehen, die
Attrappe endet sofort; Gate (v7) und Unit-Test). Alle 13 Folgen danach gegen eine frische Instanz neu erzeugt.

Zweite Runde (Entscheidung Challenger, 15.10.2026): Blick „1 — Details bei der Prüfung“ ohne Richtungswort (F-1118 (2));
ein hängender qa-Lauf nach einem Neustart nennt Ursache und Ausweg (F-1118 (1), Unit-Test und Gate (v7b), kein Bild — die
Attrappe kann den Neustart nicht zeigen); neue Folge `render/review-beanstandet-de-1440` (Ablauf (d): Review BLOCKIERT, qa
BEREIT, `max_replans` 0 ⇒ Halt am qa; die rote Notiz zeigt „Befunde“ des qa und zusätzlich „Befunde des Reviews“, Spalte
„Review-Befunde in der qa-Notiz“ true; F-1119 (1)). Neu erzeugt: `bereit-hoch-*` (5), `halt-de-390`,
`review-beanstandet-de-1440` — kein waagerechter Überlauf (1440/1440, 390/390, 720/720). Die übrigen Folgen (`halt-de-1440`,
`-hell`, `-ru-390-hell`, `-zoom200`, `halt-klick-de-1440`, `blockiert-*`) stammen aus der ersten Runde und zeigen im Blick
noch „Details unten“.

Grenzen: Der Rollen-Kreis (Satellit qa) steht auf Übersicht und Workboard, nicht auf dieser Seite — belegt per Unit-Test
(`rollen-kreis.test.mjs`), kein Bild. Bei 390 px und 200 % verdeckt „Frag Jarvis“ Teile des rechten Rands (bekannt, F-1112).
