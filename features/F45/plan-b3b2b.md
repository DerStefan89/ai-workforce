# Plan F45 B3b-2b „Bewertung der Darstellung im qa-Schritt“ (v1)

Stand 29.10.2026, Branch `feature/f45-b3b2b-qa-darstellung`, Basis main `8d5b7d3` (#398). Challenger GO_STANDARD,
≈ 0,25–0,35 AT. Zeile B3b-2b in `docs/projekt/fixpaket-f45.md`; Entscheidung E-B3B2-1 = A (Stefan 29.10.2026).
Abhängigkeit (CONTEXT): B3b-2a-1 registriert nach erfolgreicher Ausführung im Arbeitsordner mit grünem Prüfschritt
`render-nachweis-<laufId>` (Prüfergebnis-Schema v0) — **vor** `meldeLaufende` (`await`, `scripts/leitstand-server.mjs`
~6712), der Folgeschritt sieht das Artefakt also sicher. `projiziereRenderNachweis` + `findeAusfuehrungsSchritt` liefern
`{status:'ok', ergebnis, ausgabe_ende (≤ 40 Zeilen), …}` oder `{status:'fehlt'}`. Alle Schritte eines Ablaufs laufen im
selben Laufort (`ermittleLaufort` je Workflow) — der qa-Schritt sieht `.render-nachweis/` des Ausführungslaufs.

## Spike (erledigt, grün)

`features/F45/nachweise/b3b2b/spike-qa-darstellung.md`: claude-code 2.1.300, `claude-sonnet-5`, Prompt =
`baueQaAuftragstext` mit `darstellung` ROT. (a) zwei PNG per Read (End-Bilder, das 0-ms-Bild nicht), zwei `tool_result` mit
`image`; (b) roter Punkt (Überlauf 390 px) als Q1 HOCH, Fundstelle „Darstellung: / / mobil-hell“; (c) Schema hält,
`validiereErgebnisQa` leer. 0,22 USD, 91 s, 9 Turns (qa ohne Bilder: 0,14 USD, 2 Turns).

## Befund beim Lesen (weicht vom Auftrag ab)

Der Auftrag nimmt an, alte Bilder (F-1270) gibt es nur bei ZEITGRENZE/FEHLER. Tatsächlich endet das Skelett-Skript bei
fehlendem Chromium (`launch()` wirft), fehlendem playwright, fehlender render.json und bei einem gescheiterten
`npm run build &&` (Gate-Vorlage, K2 = b) mit **Exit 1 ⇒ ROT**, ohne den Ordner zu leeren. Ein ROT kann also ein altes
Protokoll mit alten Bildern neben sich haben. Lösung ohne Kern- und Skelett-Änderung: bei ROT bekommt der qa-Schritt das
Ausgabe-Ende und die Regel „ohne Abschlusszeile `Render-Nachweis: <n> Ansichten, …` (letzte stdout-Zeile des Skeletts)
⇒ nicht prüfbar“. Der Kern deutet keinen Konsolentext (§4), er reicht ihn weiter; die Deutung ist Urteil des qa-Modells.
Alternative (verworfen): Skelett leert den Ordner vor `bereiteVor` — deckt den Build-Fehler davor nicht ab.

## Bau

1. **`src/qa/index.ts`** (rein): `export interface QaDarstellung { ergebnis; ausgabe_ende }`; `baueQaAuftragstext(…,
   darstellung: QaDarstellung | null = null)`; Abschnitt vor „Auftrag:“ über `baueDarstellungsAbschnitt`:
   - GRUEN/ROT: Protokoll lesen (fehlt ⇒ ein Testfall „Darstellung“ nicht_pruefbar, kein Befund, keine Bilder); je
     Tabellenzeile das letzte Bild der Spalte „Bilder“ (End-Bild, nicht die Bildfolge); bei ROT zusätzlich alle Bilder der
     unter „Befunde“ genannten Seite/Variante; Vergleich mit `docs/design/referenzen/` (falls vorhanden) und Design-Regeln
     (CLAUDE.md, Token-Gate, prefers-reduced-motion, 390 px, Zoom 200 %, Kontrast); jeder Punkt unter „Befunde“ ⇒ Befund
     ≥ HOCH; Fundstelle „Darstellung: <Seite>/<Variante>“ oder Datei:Zeile im CSS; Testfälle „Darstellung: …“. Bei ROT
     zuerst Abschlusszeilen-Regel (oben) und das Ausgabe-Ende in einem `~~~~`-Block am Abschnittsende.
   - ZEITGRENZE/FEHLER: ein Satz „Darstellung nicht prüfbar (<Zeitgrenze überschritten|Fehler>: <letzte nicht leere Zeile
     des Ausgabe-Endes, ohne Steuerzeichen, ≤ 300 Zeichen>)“, ein Testfall „Darstellung“ nicht_pruefbar, kein Befund,
     keine Dateien unter `.render-nachweis/` lesen.
   - null oder unbekanntes Ergebnis: kein Abschnitt — Text bitgleich (Test mit SHA-256 des heutigen Texts).
2. **`scripts/leitstand/abnahme-pruefung.mjs`**: `ladeQaDarstellung(workflowDaten, ladeOptionen)` =
   `projiziereRenderNachweis(findeAusfuehrungsSchritt(workflowDaten), …)` ⇒ `{ergebnis, ausgabe_ende}` bei 'ok', sonst
   null (lesend, kein Importzyklus: `abnahme-stand.mjs` importiert nichts).
3. **Server** (Zweig `output_schema === 'ergebnis-qa'`, ~6985): vierter Parameter `ladeQaDarstellung(workflowDaten,
   ladeOptionen)`; Import in die bestehende Importzeile von `abnahme-pruefung.mjs`; Kommentar in der bestehenden Zeile
   ergänzt. **W1: netto 0 Zeilen.** Korrekturrunde: der neue Ausführungslauf hat einen eigenen (oder keinen) Nachweis —
   der qa-Schritt bekommt immer den des letzten Ausführungslaufs, `fehlt` ⇒ bitgleich.
4. **Abnahme-Karte** `public/leitstand/views/abnahme-render.js`: bei FEHLER eigener Hinweis
   `abnahme.render.hinweisFehler` („Darstellung nicht geprüft — den Grund zeigt das Ausgabe-Ende. Abnahme trotzdem
   möglich.“) bzw. `hinweisFehlerVorab` („… — sie ist nicht der Grund für den Halt.“); GRÜN/ROT/ZEITGRENZE unverändert.
   i18n de/en/ru/tr (literale Schlüssel für das i18n-Gate).
5. **`harness-abgleich/standard.json`** (Text der DoD-Punkte unverändert ⇒ IDs bleiben):
   - Agent `design-guardian`: `bewusst_nicht` ⇒ `ersetzt_durch` `{rolle: 'qa'}` mit `fehlt_im_ablauf` wie der qa-Eintrag;
     Begründung: Darstellung bewertet der qa-Schritt mit dem Render-Nachweis des Kerns (E-B3B2-1 = A), sobald das Projekt
     `render.json` trägt; der Abgleich belegt nur den gelaufenen qa-Schritt, ob ein Nachweis vorlag zeigt die Karte —
     DEKLARIERT.
   - UI-DoD `dod-be1977f5` (lange Texte), `dod-bef0bed6` (mobil), `dod-6e75626d` (Design treu), `dod-526c5ddb` (Render-
     Nachweis, F-622), `dod-9f7fb386` (Referenzen), `dod-42d163ec` (Bewegung), `dod-d2613977` (`check:render` grün):
     `bewusst_nicht` ⇒ `ersetzt_durch` qa, Begründung je Punkt (Render führt der Kern aus, B3b-2a-1; Bewertung im
     qa-Schritt; bei `dod-9f7fb386` bleibt „frontend-design genutzt“ ungeprüft — Mittel des Builders, nicht Ergebnis).
   - Die zwei Review-Einträge (`dod-…` Reviewer-/QA-Pass): Satz „design-guardian als Schritt erst mit B3“ ⇒ „Darstellung
     bewertet der qa-Schritt (F45 B3b-2b, E-B3B2-1 = A)“.
6. **Tests**: `src/qa/qa.test.ts` (bitgleich per Hash und mit `null`; GRUEN ohne Ausgabe-Block; ROT mit Befund-Regel,
   Abschlusszeilen-Regel, Ausgabe-Ende; FEHLER/ZEITGRENZE mit Grund, ohne Bildanweisung; Steuerzeichen/Kürzung; unbekannt
   ⇒ bitgleich); `scripts/leitstand/abnahme-pruefung.test.mjs` (`ladeQaDarstellung` ok/fehlt/ohne Schritt);
   `scripts/render-im-lauf.test.mjs` (Server-Zweig: Zwei-Schritt-Ablauf Ausführung → qa, Attrappe merkt den
   Auftragstext je Rolle: Arbeitsordner mit ROT ⇒ Abschnitt mit Ausgabe-Ende; Projektordner ⇒ ohne Abschnitt); View-Test
   FEHLER-Text in `abnahme-render.test.mjs` (beide Lagen). Pfade nur mit `join`/`/`, keine Laufwerksbuchstaben.
7. **Register/Fixpaket**: F-1268, F-1270 erledigt (F-1270 über die Leseregeln, nicht im Skelett); F-911 Rest erledigt;
   F-1272 Nachtrag (FEHLER-Text der Karte); Zeile B3b-2b gebaut, B3b abgeschlossen; neue Findings ab F-1275; Lagebild neu
   erzeugen, falls ein P1 dazukommt (F-1274).

## Nicht-Ziele

Kein design-guardian-Schritt, keine Workflow-Regel, keine Schemaänderung, keine Bild-Route, keine Änderung an
`src/pruefschritt/render.ts` oder am Skelett-Skript.

## Risiken

- Kosten/Kontext je Seite (fünf End-Bilder) — Beobachtungspunkt von E-B3B2-1, kein Code.
- Die Abschlusszeilen- und Nicht-prüfbar-Regeln sind Modell-Urteil (DEKLARIERT), nicht ERZWUNGEN; belegt ist nur der Text.
- `ersetzt_durch` qa belegt den gelaufenen qa-Schritt, nicht den gelaufenen Render (DEKLARIERT, s. o.).
