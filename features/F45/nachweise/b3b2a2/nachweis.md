# Nachweis F45 B3b-2a-2 — Render „Karte Darstellung (Render-Nachweis) in der Abnahme“

Stand 29.10.2026, Branch `feature/f45-b3b2a2-karte`, Basis main `ae2d89b`. Plan `features/F45/plan-b3b2a2.md` (v1.1),
Advisor `features/F45/advisor-b3b2a2.md` („Freigegeben mit Hinweisen“).

Testinstanz `features/F45/nachweise/b3b2a2/instanz.mjs` (neutrale Umgebung, Port 4403, Wegwerf-Ablage, echte Vorlage
standard über den echten HTTP-Pfad, Attrappe statt CLI). Je Ablauf registriert sie für den Ausführungslauf
`pruefergebnis-<laufId>` GRÜN (Render real nur nach GRÜN, Advisor H4) und `render-nachweis-<laufId>`; danach fährt sie die
Klickfolgen über `scripts/render-nachweis.mjs`. Je Ordner Bild(er) als WebP, `klickfolge.json`, `protokoll.md`/`.json`.
Pfadprobe in allen Folgen „sauber“ (keine persönlichen Pfade im Bild).

| Folge | Zeigt |
|---|---|
| `gruen-de-1440`, `-de-1440-hell`, `-de-390`, `-de-390-hell` | „entscheidbar“: Karte nach „Prüfung aus Nutzersicht“, Badge GRÜN (grün), „Dauer 48,2 s“, Ausgabe-Ende zugeklappt, Ortssatz; kein Hinweis; „Abnehmen“ angeboten |
| `rot-de-1440`, `-de-1440-hell`, `-de-390`, `-de-390-hell`, `-ru-390-hell` | wie oben mit Badge ROT (amber) und amber Hinweis „Darstellung mit Befunden — Abnahme trotzdem möglich. Sieh dir das Ausgabe-Ende an …“ (ru: längere Texte, design-guardian 2/qa N4); `02-ausgabe.webp` mit aufgeklapptem Ausgabe-Ende (Befundzeilen des Skeletts) |
| `fehler-de-1440` | Badge FEHLER, Hinweis, Ausgabe-Ende von selbst aufgeklappt mit dem Grund („… .render-nachweis/ steht nicht in .gitignore …“); kein Ortssatz (keine Bilder, qa N1) |
| `vorab-de-1440-hell`, `vorab-de-390` | Halt nach Review BLOCKIERT (`max_replans` 0): Abschnitt mit h4 flach wie seine Nachbarn (ohne Kartenrahmen, design-guardian 1) im Block „Ergebnis ablehnen oder Anpassung wünschen“ nach „Prüfbericht & Nachweise“; Hinweis „… sie ist nicht der Grund für den Halt“ (dort ist „Abnehmen“ gesperrt, qa N2) |

Klicktabelle (Spalten je Folge): Karte · Karte im Block vorab · Hinweis amber · Badge grün · Badge amber · Ausgabe
aufgeklappt · Abnehmen — gruen: true/false/false/true/false/false/true; rot (nach Klick): true/false/true/false/true/true/true;
fehler: true/false/true/false/true/true/true; vorab: true/true/true/false/true/false/false.

Überlaufmessung: in allen 12 Folgen kein waagerechter Überlauf — 1440 ⇒ 1440/1440, 390 ⇒ 390/390 (de und ru).

Korrektur im Bau: Die erste Fassung zeigte im Block „vorab“ denselben Satz „Abnahme trotzdem möglich“, obwohl dort
„Abnehmen“ gesperrt ist. Seitdem trägt der Block den eigenen Satz (`abnahme.render.hinweisVorab`), die Vorab-Folgen sind
neu erzeugt. Die erste Instanz lief mit einem Review ohne den Pflichtsatz des Review-Vertrags und hielt in jedem Ablauf
(Klicktabelle zeigte „Block vorab“ überall); die Attrappe trägt den Satz jetzt, alle Folgen sind neu erzeugt.

Korrekturrunde (Prüfpass 29.10.2026, code-reviewer/qa/design-guardian je „Freigegeben mit Hinweisen“): Hinweis ohne
Verweis auf Bilder (qa N1, cr 2), bei FEHLER kein Ortssatz, Satz im Block „vorab“ „… nicht der Grund für den Halt“ (qa N2),
Block „vorab“ ohne Kartenrahmen (design-guardian 1), literale i18n-Schlüssel (cr 1), Folge `rot-ru-390-hell` (design-guardian
2, qa N4), Folgenzahl 12 (qa M1/cr 3). Alle 12 Folgen danach gegen eine frische Instanz neu erzeugt.

Grenzen: Reduzierte Bewegung und 200 % Zoom nicht im Bild (die Karte hat keine Animation; design-guardian 3). Der Zeitpunkt, an dem die Karte im Poll erscheint, ist nicht im Bild (der Render läuft vor dem Statuswechsel,
Advisor H3); die Kennung belegt der Unit-Test `abnahme-render.test.mjs`. ZEITGRENZE nur im Unit-Test.
