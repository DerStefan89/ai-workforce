# F45 B2b-3d — Plan v2 (Umfangs-Abgleich + Eingabefeld Bereiche)

Plan v1: `features/F45/plan-b2b3d.md` (bleibt stehen). Advisor-Pass zu v1 (frischer Kontext, 16.10.2026, nur
Read/Grep/Glob): **FREIGEGEBEN MIT HINWEISEN**, Zuschnitt „zu groß, knapp“. Entscheidungen Challenger (16.10.2026):
- **Zuschnitt:** nur das Budget-Feld wird abgetrennt (→ **B2b-3e**: Formularfeld „Budget“, GET `/api/budget/standard`,
  Platzhalter mit Standardwert, Lesen der Zahl). Das Feld „Bereiche“ bleibt bei 3d — ohne es setzt in Produktion
  niemand `bereiche`, der Abgleich wäre wieder tot (Advisor 5, B5 aus B2b-3c).
- **Formular (O3):** nur „Auftrag & Start“. Click-to-Work am Finding (AK-Entwurf, B2a-2) bekommt das Feld nicht (eigenes
  Finding).

Der Server nimmt in POST /api/auftraege trotzdem schon `bereiche` **und** `budget_tokens` an (eine Prüfung über
`validiereArbeitspaketFelder`, Advisor 10 — kein Mehraufwand); Gate (u5) belegt, dass ein so gesetztes Budget im
Budget-Halt wirkt. Nur das Eingabefeld dafür folgt mit 3e.

Was v1 sagt und hier nicht geändert ist, gilt weiter.

## Änderungen gegenüber v1 (je Advisor-Befund)

**A1 (MITTEL) `umfang` darf nie einen Halt auslösen.** Die Übersicht wird als Ganzes validiert; ein Verstoß verhindert
ihre Registrierung, Regel 1j hält dann fail-closed (`leitstand-server.mjs` 6845–6869, 7775–7778). Deshalb: `umfang`
VOR dem Zusammensetzen für sich prüfen (`validiereUmfang` im Validator der Übersicht, exportiert); bei Wurf oder Verstoß
Feld weglassen und protokollieren. Gate-Rotfall: ein ungültiges `umfang` (über eine austauschbare Abgleich-Funktion nicht
möglich ohne Eingriff) — stattdessen Unit-Test des Validators und Gate-Fall „Bereiche, die nur aus Leerraum bestehen,
lehnt POST /api/auftraege ab“; der Nachlauf-Pfad mit Wurf ist per Code-Struktur (eigenes try) abgesichert.

**A2 (MITTEL) Degradierte Übersicht ⇒ kein `umfang`.** Ist `istAenderungsuebersichtDegradiert`, wird nichts
festgehalten (kein falsches „alles innerhalb“). Projektion `umfang.status`: `kein_abgleich` (ohne `bereiche`) |
`nicht_bestimmbar` (Bereiche gesetzt, aber keine Übersicht, degradiert oder ohne Feld) | `ok`. Die Abnahme zeigt nur
`ok` mit Treffern; `nicht_bestimmbar` als eine graue Zeile „Ob Dateien außerhalb der vereinbarten Bereiche liegen, ist
nicht bestimmbar.“ (sonst bliebe „kein Hinweis“ mehrdeutig).

**A3 (MITTEL) Ordnerpfade aus `git status`.** Neue, ungetrackte Ordner stehen als `docs/` in der Übersicht. Semantik: ein
Ordnerpfad (endet auf `/`) ist innerhalb, wenn ein Bereich ihn ganz umfasst (Bereich ist Präfix des Ordners oder gleich),
sonst außerhalb — auch wenn ein Bereich tiefer im Ordner liegt (bewusst: der Inhalt ist unbekannt). Unit-Fall dazu. Gate-
Fixture trackt `src/` und `docs/` im Init-Commit.

**A4 (MITTEL) Sauberer Baum je Szenario.** Ohne Arbeitsordner prüft der Start den Baum (3229–3239). Gate: je Szenario ein
eigenes Wegwerf-Projekt (eigener Testserver je Projekt), kein Reset.

**A7 (Prozess) Vorbau.** `src/umfang` (index + Test) entstand während des Advisor-Passes, vor dem Urteil — im Bericht
benannt. Regel „leer“: der Code gilt (ein leerer Bereich trifft nichts, nur `.` trifft alles); v1 §1 Satz „leer nach
Normalisierung trifft alles“ ist damit überholt.

**A8 → B2b-3e** (Lesen der Budget-Zahl).

**A9 (NIEDRIG)** Gesetzte `bereiche` schalten den Arbeitspaket-Block für Architekt und Ausführung ein (gewollt: die
Ausführung kennt die Bereiche). Gate (u1) prüft „Betroffene Bereiche: src/“ im Ausführungsauftrag.

**A10 (NIEDRIG)** `pruefeAuftragsformular` ruft `validiereArbeitspaketFelder` mit genau `{ bereiche?, budget_tokens? }`.

**A11 (NIEDRIG)** Die Zeile steht an EINER Stelle direkt nach dem Policy-Block, für `code-reviewer || istQaSchritt`.

**A12 (NIEDRIG)** Neue Kommentare ohne die wörtlichen Aufrufmuster, die Gate (f) zählt.

**A13 (NIEDRIG)** Formular: Einträge mit absolutem Pfad (`/…`, `C:…`) oder `..` werden mit Hinweis abgewiesen; Hinweis
„Ein Ordner oder eine Datei je Zeile, relativ zum Projekt“; die Liste in der Abnahme kappt wie die Zeile bei 50 + „… und
n weitere“.

**A14 (NIEDRIG) Doku:** ARCHITECTURE.md §1 (`src/umfang`, Durchsetzungsgrad Hinweis/DEKLARIERT), JSDoc von
`starteLaufUndVergiss`; F-978 erledigt, F-1083 (1) teilweise (nur `bereiche`, `risiko` offen), F-1122 (1) → B2b-3e,
F-1122 (2) erledigt (E-B2b-3c-1 = ja), STATUS, fixpaket.

**A15 (NIEDRIG)** Pfade mit Leerzeichen/Sonderzeichen kommen aus Porcelain v1 in Anführungszeichen — bestehende Grenze der
Übersicht, ggf. Fehlhinweis; Risiko.

**A16 (NIEDRIG)** Review/qa sehen die Bereiche nicht; die Zeile nennt nur Dateien (Wortlaut Challenger). Kein Anhang.

**E2** Der Abgleich hängt NICHT an `laufImArbeitsordner` (anders als die Löschliste) — Übersicht und Abgleich lesen
dieselbe `nachlaufWurzel`; im Arbeitsordner ist die Übersicht kumulativ gegen den Basis-HEAD (richtige Lesart für die
Abnahme).

## Gate `scripts/check-f45-b2b3d-umfang.mjs` (neu, in `check:gates`)

- (u1) `bereiche: ['src/']`, Ausführung ändert `src/a.ts` und `docs/x.md` (beide Ordner getrackt) ⇒ Übersicht
  `umfang.ausserhalb = ['docs/x.md']`, kein Halt (Review läuft, Ablauf ABGESCHLOSSEN), GET …/abnahme `umfang`
  `{ status: 'ok', ausserhalb: ['docs/x.md'] }`; Ausführungsauftrag enthält „Betroffene Bereiche: src/“.
- (u2) nur `src/a.ts` ⇒ `ausserhalb` leer, Review-Auftrag ohne Zeile.
- (u3) ohne `bereiche` ⇒ kein Feld, `umfang.status` `kein_abgleich`, Review-Auftrag ohne Zeile.
- (u4) in (u1) enthalten Review- und qa-Auftrag die Zeile mit `docs/x.md`, beim Review nach dem Policy-Block.
- (u5) POST /api/auftraege mit `bereiche` und `budget_tokens` ⇒ Auftrag trägt beide; ungültige Werte ⇒ 400 (leere Liste,
  Leerraum-Eintrag, `budget_tokens` 0); mit kleinem `budget_tokens` ⇒ nach der Ausführung Budget-Halt mit
  `quelle: 'arbeitspaket'`.
- (u7) Bereiche gesetzt, Übersicht degradiert (kein git-Repo als Projekt) ⇒ kein Halt durch den Umfang, `umfang.status`
  `nicht_bestimmbar` — falls der Halt durch Regel 1j (Übersicht degradiert) ohnehin greift, nur die Projektion prüfen.
- (f) `starteWorkflowSchritt(` 6×, F-228-Zählung unverändert.

## Leitstand

Formular „Auftrag & Start“: aufklappbarer Bereich „Vereinbarte Bereiche · optional“ (Muster Kontext) mit Textfeld, ein
Eintrag je Zeile; Lesen in `public/leitstand/arbeitspaket-felder.js` (`leseBereiche` → `{ bereiche }` oder
`{ fehler }`, Unit-Test). Abnahme: Hinweis wie v1 + Zustand `nicht_bestimmbar`. i18n de/en/ru/tr.

## Render-Nachweis `features/F45/nachweise/b2b3d/`

Lagen: Abnahme mit Umfangs-Hinweis; Formular mit dem Feld „Bereiche“ (aufgeklappt). Ansichten de 1440 dunkel, de 1440
hell, de 390, ru 390 hell, de 1440 200 %; `scrollWidth`. Danach design-guardian.

## Schätzung

3d ≈ 0,4–0,5 AT; 3e (Budget-Feld) ≈ 0,15–0,2 AT, folgt.
