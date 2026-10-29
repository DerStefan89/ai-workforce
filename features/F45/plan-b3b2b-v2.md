# Plan F45 B3b-2b „Bewertung der Darstellung im qa-Schritt“ (v2)

Stand 29.10.2026. v1 `features/F45/plan-b3b2b.md` gilt weiter, außer den Änderungen hier. Advisor
`features/F45/advisor-b3b2b.md` „Freigegeben mit Hinweisen“.

## Änderungen gegenüber v1

- **B1** qa-Text nennt den Bildpfad: „Die Bilder liegen unter `.render-nachweis/<Name aus der Spalte>` — lies sie per
  Read mit diesem Pfad (der Ordner ist git-ignoriert, eine Suche findet ihn womöglich nicht)“. Test.
- **B2** Harness: `dod-526c5ddb` (Workforce-DoD, Klicktabelle F-622) und `dod-9f7fb386` (Referenzen gelesen, frontend-design
  genutzt) bleiben `bewusst_nicht` mit neuer Begründung. Agent design-guardian, `dod-be1977f5`, `dod-bef0bed6`,
  `dod-6e75626d`, `dod-42d163ec`, `dod-d2613977` ⇒ `ersetzt_durch` qa, Begründung „nur mit `render.json`; der Abgleich
  belegt den gelaufenen qa-Schritt, nicht den Render (DEKLARIERT)“; bei Bewegung: „im CSS, End-Bilder zeigen sie nicht“.
- **B3** F-1270 „erledigt (DEKLARIERT: Leseregel im qa-Schritt; wieder öffnen, wenn R2/F30 einen Befund aus veralteten
  Bildern zeigt)“; Skelett unverändert.
- **B4 (gebaut)** `ladeQaDarstellung(workflowDaten, ladeOptionen, laufWurzel)`: bei 'fehlt' und vorhandener
  `<laufWurzel>/render.json` ⇒ `{ergebnis:'FEHLER', ausgabe_ende:'kein Render-Nachweis zu diesem Bau, obwohl render.json
  vorliegt …'}` ⇒ Satz „nicht prüfbar“. Ohne `render.json` ⇒ null (bitgleich; ai-workforce selbst). Server-Test:
  Projektordner mit `render.json` ⇒ „nicht prüfbar“ statt „ohne Abschnitt“; ohne `render.json` ⇒ bitgleich (Unit-Test).
- **B5** F-1272-Nachtrag: FEHLER-Text der Karte erledigt; N3 (`render.ts`) und N4 (Skelett-Meldung) nicht in B3b-2b
  (Nicht-Ziel) ⇒ „bei Bedarf“ neu zugeordnet; M3 durch B4 entschärft (qa meldet nicht prüfbar).
- **B6** Abschlusszeilen-Regel: „zeigt das Ausgabe-Ende einen Fehler des Projekts (Build, Skript des Projekts) statt
  einer fehlenden Umgebung (Chromium, playwright), ist das zusätzlich ein Befund HOCH“. F-1268: ROT ⇒ qa-Befund,
  ZEITGRENZE/FEHLER bleiben bewusst Hinweis.
- **B7 nicht übernommen** (Auftrag: ZEITGRENZE auf der Karte unverändert) ⇒ neues Finding.
- **B8** Rückfall festgelegt: wird der Zwei-Schritt-Servertest zu groß, belegen Unit-Tests von `ladeQaDarstellung` plus
  Quelltextprüfung die Einbindung.
- **B9** Kopf ergänzt; Zaun länger als jede `~`-Folge im Ausgabe-Ende; `ergebnis` als `PruefergebnisWert | string`.
