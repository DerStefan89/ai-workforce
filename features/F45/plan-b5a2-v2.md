# Plan v2 — F45 B5a-2 „Akte anzeigen“ (Oberfläche)

Stand 24.10.2026. v1: `features/F45/plan-b5a2.md` (bleibt unverändert). Advisor: `features/F45/advisor-b5a2.md` („Nicht freigegeben“,
kleine Änderungen genügen). Diese Fassung übernimmt v1 vollständig; unten nur, was sich ändert, und die Bauauflagen.

## Entscheidungen zu den Vorab-Punkten

- **B1 (F-1177 qa 4, unvollständige Akte) = Weg (b).** Grundlage ist der Bauauftrag: „Unvollständige Akten: Vorbelegung gemäß F-1177
  (Formular startet mit dem, was der Leser liefert)“. Das Formular bleibt also auch bei `unvollstaendig`. Es trägt dann **fest oben** den
  Warnhinweis „Diese Akte ist unvollständig — der Leitstand kann Ziel, Nicht-Ziele und Abnahmekriterien nicht lesen. Speichern ersetzt
  diese Abschnitte durch deine Eingaben. Öffne die Akte vorher und übernimm, was bleiben soll.“ mit dem VS-Code-Link auf die Akte und den
  Servergrund wörtlich. Gate-Fall (b5). Die Teilwerte (additiv, Server) bleiben in F-1177 offen → B5b-1. Stefan kann (a) bei der Abnahme
  noch wählen; der Umbau wäre klein (Formular für `unvollstaendig` nicht anbieten).
- **B2:** Die Änderung an `package.json` ist meine eigene im Arbeitsbaum (nicht auf main): Leerzeichen behoben und neues Gate eingetragen.
  Das Gate entsteht in diesem Paket; bis dahin ist `npm run check` erwartbar rot.
- **B3:** `nachtrag.akteLadung` (Zähler wie `ablaufLadung`). `ladeAkteUndRoadmap(nachtrag)` erhöht ihn, setzt `akte = undefined`, rendert,
  und verwirft eine Antwort, wenn `detailNachtrag !== nachtrag` oder der Zähler weiter ist. Aufrufer: Öffnen, „Neu laden“ (Hash-409), nach
  200. Test über die reine Hilfsfunktion `istAktuelleLadung` nicht nötig — der Zähler steht im Gate statisch (b6) und im Render-Nachweis.
- **Baustein 5 (Kanban-Knopf) entfällt** (B4: Karte ist ein Link mit eigener Klick-, Fokus- und CSS-Logik; keine Vorlage geprüft). Neues
  Finding F-1181 für B5b.
- **Zuschnitt:** ein Paket wie beauftragt (Bausteine 1–4, 6, 7). Risiko der Korrekturrunde bewusst; bei Überlauf wird im Bericht
  geteilt statt gestreckt.

## Bauauflagen

- **B5:** Ist das Formular eines Features offen, ist „Auftrag vorbereiten“ gesperrt (`auftragsSperre` ⇒ `{ grund: 'akte', workflowId: null }`,
  Text „Erst die Akte speichern oder das Bearbeiten abbrechen“). Damit entsteht kein Auftrag aus einer halb bearbeiteten Akte.
- **B6:** `ladeDetail`: Findet sich die ID in einer geladenen Liste nicht, lädt es die Workitems **einmal je Öffnen** neu (Merker im
  `detailNachtrag`); solange zeigt das Detail „lädt“ statt „nicht gefunden“.
- **B7:** Kachel: `<code>`Kennung + Text ohne `**` und ohne führende Kennung, gekürzt; „die letzten fünf in Aktenreihenfolge“; Test
  `workboard-detail.test.mjs` (bisher „kommt“ erwartet) mitziehen; Gate (c) prüft nur die Kachel „Entscheidungen“.
- **B8:** `darfAkteBearbeiten` prüft `akte.featureStatus` gegen `FEATURE_ENDSTATUS` (kein neuer Zwilling).
- **B9:** `zaehleWartendeAufStefan(zustand)` liegt in `attention-daten.js` neben `zaehleOffeneEntscheidungen`; persona-state.js und
  views/start.js importieren sie.
- **B10:** Coach: `git: null` ⇒ Satz „Git-Block nicht bestimmbar“. „Als Feature anlegen“ steht unabhängig vom Auftragsweg in einer eigenen
  Zeile unter der Brücke jedes `scope_entwurf` (auch wenn zu diesem Turn schon ein Auftrag angelegt wurde — beides ist erlaubt). Grenze
  „nach Neuladen wieder anlegbar“ im Dateikopf und als Finding F-1182 (Rückverweis Turn → Akte, Muster F-625, braucht Server).
- **B11:** Änderungsgrund `maxlength="500"`.
- **Offener Punkt 1:** Fokus nach „Abbrechen“/„Schließen“ zurück auf „Bearbeiten“; `renderDetailOhneWorkitem` leert auch
  `#workboard-akte-formular`; neues Sicht-Feld `akteFormularOffen` (und `akteBearbeitbar`) im Dateikopf von `workboard-detail.js`.
- **Offener Punkt 2:** Werte werden vor jedem Neuschreiben des Formulars aus dem DOM gelesen; Wechsel zu einem anderen Detail verwirft das
  Formular (Grenze im Dateikopf von `workboard.js`).
- **Offener Punkt 5:** Indizes in Servermeldungen beziehen sich auf die gesendete Liste (Satz im Dateikopf von `akte-bearbeiten.js`).
- **Offener Punkt 6:** Knopf „Neu laden (Eingaben gehen verloren)“.

## Gate-Ergänzungen (zu v1)
(b5) Formular einer unvollständigen Akte trägt den Warnhinweis und den Akte-Link; Gegenprobe: Akte `ok` ohne Hinweis.
(b6) `workboard.js` führt `akteLadung` in `ladeAkteUndRoadmap` (statisch). (e) prüft `zaehleWartendeAufStefan` aus `attention-daten.js`.

## Findings (zusätzlich zu v1)
F-1181 Kanban-Knopf „Auftrag vorbereiten“ (Empfehlung Challenger, für B5b); F-1182 Rückverweis Coach-Turn → angelegte Akte (Server).
