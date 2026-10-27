# Advisor-Pass B5b-3 „Ist nach Abnahme“ (R7)

Stand 27.10.2026. Geprüft: `features/F45/plan-b5b3.md` (v1) im frischen Kontext (Subagent `architecture-advisor`, nur lesend).
Plan v2: `features/F45/plan-b5b3-v2.md`.

**Urteil: FREIGEGEBEN MIT AUFLAGEN.** Die Schreibstelle (POST …/abnahme, Zweig ANGENOMMEN, Akte im Laufort) ist richtig und minimal.

## Auflagen
- **A1 [Fakt] Hoch:** Plan §4.6/§7 „Begonnen > Datum ⇒ Ist – und trotzdem schreiben“ widerspricht dem Akte-Gate („Begonnen liegt
  nach Abgenommen“, `src/workboard/feature-planung.ts:211`). Korrektur: Hinweis, nichts schreiben.
- **A2 [Fakt + Schlussfolgerung] Hoch:** Kein Code setzt eine Zeile auf `laeuft` (nur lesend, `roadmap-planung.ts:102`); repoweit
  standen genau zwei `laeuft`-Zeilen (F45 B5b-1b-2 und T, beide gemergt), B5b-3 auf `geplant`. Ein Ablauf auf F45 träfe heute n=2.
  Der Arbeitsordner entsteht aus einem Commit — `laeuft` muss vor dem Start committet sein. Stefan entscheidet die Vorbedingung;
  dann B5b-1b-2/T bereinigen und Warnung „vor dem Start auf laeuft setzen und committen“.
- **A3 [Fakt] Mittel:** Ist = 0 ist bei 0,3-AT-Paketen der Normalfall (arbeitstageBis ohne Starttag, `roadmap-planung.ts:115-129`);
  „Plan gegen Ist“ zählt 0 mit (`:222`). Wahl Stefans: (a) Ist „–“ bei 0 (empfohlen), (b) +1, (c) 0 DEKLARIERT.
- **A4 [Fakt] Mittel:** ARCHITECTURE.md:91-96 erlaubt im Arbeitsordner nur Löschliste und Fähigkeit-Vorschläge, im Projektordner
  die Akte nur „auf Eingabe“ (Detail: „direkte Eingabe“, `docs/architektur/arbeitsordner.md:19, 35`). Die Ergänzung muss beide
  Orte nennen.
- **A5 [Fakt] Mittel:** „Abnahme → Sichern“ ist nicht erzwungen (Sichern hängt nur an ABGESCHLOSSEN, `ablauf-sichern.mjs:90`):
  gesichert vor der Abnahme ⇒ neue Änderung auf schon gemergtem Branch; Aufräumen mit Verwerfen nach ANGENOMMEN verwirft die
  Zeile. DEKLARIERT + Hinweis „erst abnehmen, dann sichern“.
- **A6 [Schlussfolgerung] Mittel:** Zuschnitt knapp: den ausgelagerten Server-Helfer benennen, Kleinpunkte als eigener Commit,
  Render-Nachweis (Pille, Erfolgstext); 0,3–0,4 AT optimistisch.

## Hinweise
- H1: Beleg „ANGENOMMEN ändert den Status nicht“ ist `leitstand-server.mjs:12604-12612`, nicht `:12676`.
- H2: Idempotenz-Token exakt am Zeilenende prüfen, nicht als Teilstring.
- H3: `feature_ref` setzt nur der Akte-Weg (`routen-f35.mjs:137`), das Formular nie (`leitstand-server.mjs:1816`) — DEKLARIERT.
- H4: Teilerfolg im Hinweis-Stil über das bestehende `{ text, art }` (`views/workflows.js:638-641`).

## Zu den Prüfpunkten
1. Schreibstelle [entlastend]: Aufräumen gesperrt bei offener Abnahme (`:12095`), zweite Entscheidung 409 (`:12484`), globale
   Laufsperre vor dem Schreiben (`:12501-12507`), Umfang-Abgleich aus der Übersicht am Laufende (`:8684-8690`), „Review veraltet“
   nur bei offener Abnahme (`:6319`), Fähigkeit-Vorschläge betreffen nur `.claude/`.
2. Begonnen: Abweichung vom Challenger begründet (Schreiben beim Start landete im Bau-Diff); `erstellt_am` ist „Auftrag
   geschrieben“ — Vorschlag erster Checkpoint der Workflow-Kette; Herkunft in die Änderungszeile.
5. Hinweis nur in der Antwort: für Fassung 1 ausreichend, wenn DEKLARIERT; abgeleitete Anzeige in GET …/abnahme als Finding.
6. **Vorschlag (abweichend vom Challenger), ausdrücklich nicht jetzt:** optionales `workstream_ref` im Auftrag würde A2 lösen,
   braucht Schema, Formular und Gate — bei der Challenger-Regel bleiben, A2 DEKLARIEREN, Finding nach F30-M1.

## Entscheidungen Stefan (27.10.2026)
A2 = Vorbedingung tragen (Bereinigung B5b-1b-2/T in diesem Auftrag, `workstream_ref` als Finding). A3 = Ist „–“ bei 0.
