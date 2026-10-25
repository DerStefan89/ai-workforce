# Plan v2 — F45 B5b-2b-2 „Roadmap: Bereinigungsliste“

Grundlage: `plan-b5b2b2.md` (v1) → `advisor-b5b2b2.md` (Freigegeben mit Hinweisen, kein weiterer Schnitt). v1 gilt weiter, außer
wo hier geändert. Kein zweiter Advisor-Pass (Regel 3a). Reihenfolge: Server, Vorprüfungs-Tests, Gate (a), dann Client.

## Änderungen gegenüber v1

- **A1** Testfall „Akte-Gate rot“: Akte mit ungültiger Planungszeile (`Priorität: X`) — Grund „schon vor der Bearbeitung“, nicht
  „Akte ohne Pflichtabschnitt“ (ergäbe 200).
- **A2** Tabelle ergänzt bzw. geschärft:
  - `entferneStatusAusnahme` Rundlauf weicht ab — erreichbar (gesuchter Eintrag einzeilig als letztes Element, Element davor
    mehrzeilig) ⇒ Test.
  - `setzeMeilensteinStatus` Lage — erreichbar mit `"status"` vor `"id"` im Meilenstein ⇒ Test (keine Begründungs-Alternative).
  - „bliebe Abweichung“ — unerreichbar (nach ABGESCHLOSSEN bzw. LAEUFT keine Abweichung, `roadmap-regeln.ts:106, 109`); getestet
    wird „R1 neu“ (verwaiste Ausnahme bei LAEUFT).
- **A3** Nachweis: Variante (a) — vor jeder Lage `git reset --hard` + `git clean -fdx` in der Kopie auf ihren Basis-Commit (nach
  `pruefeKopie`); der Basis-Commit enthält wie 2b-1 die Änderungen und neuen Dateien des Arbeitsbaums plus die Präparation (zweite
  Standardform für F22). Vor dem echten POST prüft das Skript `moeglich: true` für M4/F20, sonst Abbruch (B10).
- **A4** Begründete Abweichung vom Auftrag „nur bei n > 0“: der Abschnitt steht auch bei n = 0, solange ein Erfolg (Git-Block) offen
  ist — sonst ginge er nach der letzten Bestätigung verloren —, und bei einem Ladefehler bzw. `ungueltig` (Fehlerzustand mit
  „Erneut laden“). Während des Ladens (`laden: 'laedt'`) und bei `nicht_vorhanden` steht nichts da (kein Flackern; der Abschnitt
  erscheint mit den Daten).
- **O2 (Radio)** direkt umschalten ohne Neuschreiben (Muster `beiAnpassenEingabe`): Wahl, Grund, Häkchen in den Zustand, Knöpfe und
  Hinweis direkt schalten. Neu geschrieben wird nur über Klicks (Bestätigen…, Zurück, Jetzt schreiben, Schließen).
- **Bestätigungsschritt inline statt `<dialog>`**: Entscheidung aus `advisor-b5b2b.md` O2 und `plan-b5b2b-v2.md` §6 (die Seite wird
  bei jeder Zustandsänderung neu geschrieben, ein Modal ginge dabei verloren).
- **B1** Äquivalenz-Schleife im Test: je Attrappe alle Vorschläge aller Einträge — `moeglich` ⇒ POST 200 (frische Kopie der
  Attrappe), sonst 422 mit genau diesem `grund`, nichts geschrieben.
- **B2** Meilenstein-ID nur aus Leerraum: DEKLARIERT im Kopf von `routen-planung.mjs` (GET bietet an, POST 400) — keine Regeländerung
  in diesem Paket.
- **B3** Test „STATUS.md nennt X schon als ABGESCHLOSSEN“: möglich, 200 mit `hinweis`.
- **B4** GET-Vorprüfung je Vorschlag in `try/catch` (`console.error`, `moeglich: false`, Grund „Vorprüfung gescheitert …“).
- **B5** Die Liste zeigt `befunde` (R1-Befunde der Listenebene) im Abschnitt; `verstoesse` im GET nicht (B6 aus advisor-b5b2b).
- **B6** `deuteBestaetigungAntwort` fällt außer bei 200 auf `deutePlanungAntwort` zurück.
- **B7** Eintrag ohne Vorschlag: „Kein Vorschlag — von Hand“; fehlende `quelle.status_md`: „–“.
- **B8** Zähler pluralisiert (`anzahl`/`zahl`).
- **B9** Ein Ladeweg: `ladeRoadmap` lädt die Liste mit (Erstladen, Projektwechsel, „Erneut laden“); nach 200 lädt
  `ladeRoadmap({ behalten: true })` beides; nach 409/422/Fehler lädt nur `ladeBereinigung()`.
- **B10** Nachweis zusätzlich: Meldung (409 Hash-Konflikt über `page.route`) am Eintrag.
- **B11** Kopie-Code aus `nachweise/b5b2b/erzeuge-nachweis.mjs` übernommen (Verweis im Kopf).
- **B12** Platz: zwischen `.rm-gesamt` und Entwicklungsstand; die Trennzeile springt per Knopf dorthin (Fokus auf die Überschrift).
