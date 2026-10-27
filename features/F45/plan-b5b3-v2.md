# Plan B5b-3 „Ist nach Abnahme“ (R7) — v2

Stand 27.10.2026. Grundlage `features/F45/plan-b5b3.md` (v1). Advisor-Pass (frischer Kontext): FREIGEGEBEN MIT AUFLAGEN A1–A6,
Hinweise H1–H4. Entscheidungen Stefan (27.10.2026): **A2 = Vorbedingung tragen** (Regel des Challengers bleibt, `workstream_ref`
als Finding nach F30-M1), **A3 = Ist „–“ bei 0**. Kein Delta-Pass: A3 übernimmt die Empfehlung des Advisors; A1 macht aus einem
Schreibfall einen Hinweis (weniger, nicht mehr Wirkung).

## Änderungen gegenüber v1
- **A1**: Begonnen > Abnahmedatum ⇒ Hinweis, nichts schreiben (das Akte-Gate meldet „Begonnen nach Abgenommen“,
  `src/workboard/feature-planung.ts:211`).
- **A2**: Vorbedingung DEKLARIERT: R7 greift nur, wenn die Zeile vor dem Start auf `laeuft` steht **und committet ist** (der
  Arbeitsordner entsteht aus einem Commit). Hinweis in der Abnahme nennt das. Bereinigung in diesem Auftrag: F45 B5b-1b-2
  (gemergt 24.10.2026, `28cba04`) und T (gemergt 25.10.2026, `dad8920`) → `erledigt`, Abgenommen = Merge-Datum, Ist nach
  derselben Regel; B5b-3 → `laeuft`, Begonnen 2026-10-27. Neues Finding: `workstream_ref` (Advisor-Vorschlag 6) nach F30-M1.
- **A3**: Ist = `arbeitstageBis(Begonnen, Abnahme)`; Ergebnis 0 ⇒ `–` (keine erfundene 0). Status, Begonnen, Abgenommen werden
  trotzdem geschrieben.
- **Begonnen-Ersatz** (Advisor 2): statt `erstellt_am` des Auftrags der lokale Tag des ersten Checkpoints der Workflow-Kette
  (`ladeGueltigeCheckpoints('lineage-workflow-<id>')[0].payload.erstellt_am`, belegt an einem echten Ablauf) = Anlage des Ablaufs.
  Fehlt er ⇒ Begonnen und Ist bleiben `–`. Die Änderungszeile nennt die Herkunft („Begonnen aus der Anlage des Ablaufs“).
- **A4**: ARCHITECTURE.md §2 und `docs/architektur/arbeitsordner.md`: die Akte-Ausnahme gilt für Arbeitsordner **und**
  Projektordner und umfasst die Workstream-Zeile als Nebenwirkung der Abnahme (ANGENOMMEN ist die Eingabe). Kern byte-neutral.
- **A5**: DEKLARIERT in §8 und als Satz im Erfolgstext: „erst abnehmen, dann sichern“; Sichern vor der Abnahme ⇒ die Akte-Änderung
  landet als neue Änderung auf dem schon gesicherten Branch; Aufräumen mit Verwerfen nach ANGENOMMEN verwirft auch die Akte-Zeile.
- **A6**: Server-Ausgleich: `findeAusfuehrungsSchritt` und `ermittleAbnahmeStand` (rein) wandern nach
  `scripts/leitstand/abnahme-stand.mjs`; der Server importiert sie und exportiert `ermittleAbnahmeStand` weiter (Test
  `scripts/leitstand-abnahme-stand.test.mjs` unverändert). Kleinpunkte als eigener Commit. Render-Nachweis (Pille, Erfolgstext).
  Schätzung 0,4–0,6 AT.
- **H1**: Beleg „ANGENOMMEN ändert den Status nicht“ = `scripts/leitstand-server.mjs:12604-12612`.
- **H2**: Idempotenz: eine Änderungszeile endet mit dem Token `· Abnahme <workflowId>` (exakter Vergleich am Zeilenende).
- **H3**: DEKLARIERT: Zuordnung nur über `feature_ref`; Aufträge aus dem Formular tragen keinen, nur der Akte-Weg.
- **H4**: Erfolgstext über das bestehende `{ text, art }` (`views/workflows.js:638-641`).

## Regel (rein, `src/feature-auftrag/ist-nach-abnahme.ts`)
`schreibeIstNachAbnahme(inhalt, { workflowId, datum, begonnenErsatz })` ⇒ `geschrieben` (inhalt, workstream, ist|null) |
`schon_geschrieben` | `hinweis` (grund). Reihenfolge: CRLF ⇒ Hinweis · Status ABGESCHLOSSEN/ABGEBROCHEN ⇒ Hinweis ·
Änderungszeile mit Token ⇒ schon_geschrieben · kein strenger Abschnitt/Formfehler ⇒ Hinweis · laufende Zeilen ≠ 1 ⇒ „Workstream
nicht eindeutig (n laufende Zeilen) — von Hand nachtragen“ · Begonnen leer ⇒ Ersatz (fehlt er: Begonnen/Ist `–`) · Begonnen >
datum ⇒ Hinweis · Zellen Status/Ist/Begonnen/Abgenommen ersetzen · Änderungszeile
`- <datum> · Workstream <ID> erledigt, Ist <x|–> AT[, Begonnen aus der Anlage des Ablaufs] · Abnahme <workflowId>` · Akte-Gate
und Rundlauf ⇒ sonst Hinweis. Zellersetzung und `workstreamZeilen` aus `planung-schreiben.ts` exportiert (eine Stelle).

## Verdrahtung
- `scripts/leitstand/ist-nach-abnahme.mjs` `fuehreIstNachAbnahmeDurch({ wurzel, imArbeitsordner, featureRef, workflowId, datum,
  begonnenErsatz, sperre, schreibe? })`: Akte über `loeseFeatureAktePfadAuf` + exakter Ordnername; fehlt ⇒ `keine_akte` (kein
  Hinweis); ohne Arbeitsordner Sperre (`findeSperrendenAblauf`, eigener Ablauf ist ABGESCHLOSSEN) ⇒ Hinweis; lesen, UTF-8, Regel,
  schreiben + zurücklesen (Rückbau), Ergebnis `{ art, workstream?, ist?, hinweis?, pfad?, git? }` (git nur im Projektordner).
  Wirft nie.
- Server, Zweig ANGENOMMEN nach dem Registrieren: ein Aufruf mit Laufort (`ermittleLaufort`; nicht ok ⇒ Hinweis „Arbeitsordner
  nicht verfügbar“), Feld `ist_nach_abnahme` in der 200 nur mit `feature_ref`.
- Leitstand: Erfolgstext ANGENOMMEN + Satz zu R7 (geschrieben ⇒ „Workstream X erledigt (Ist …) — steht unter „Bereit zum Sichern“;
  erst abnehmen, dann sichern“; Hinweis ⇒ art `hinweis`); i18n de/en/tr/ru.

## Tests
Rein: eindeutig ⇒ geschrieben; 0 und 2 laufende ⇒ Hinweis mit n; CRLF ⇒ Hinweis; zweiter Aufruf ⇒ schon_geschrieben; Ersatz
eingetragen; kein Ersatz ⇒ `–`; Begonnen > datum ⇒ Hinweis; Ist 0 ⇒ `–`; ABGESCHLOSSEN ⇒ Hinweis. Route gegen Temp-Repo (Muster
`scripts/leitstand-abnahme-stand.test.mjs`): ANGENOMMEN schreibt, ANPASSUNG/ABGELEHNT nicht, zweite Abnahme 409 ohne Doppel,
Projekt ohne Akte ⇒ kein Feld-Hinweis, kein Fehler, zwei laufende ⇒ Hinweis.

## DEKLARIERT
Vorbedingung `laeuft` + Commit vor dem Start (A2) · Zuordnung nur über `feature_ref` (H3) · Hinweis nur in der Antwort der Abnahme
(nach Neuladen weg; Erfolg bleibt über Änderungszeile und „Bereit zum Sichern“ sichtbar) · Reihenfolge Abnahme → Sichern nicht
erzwungen (A5) · Akte im Arbeitsordner vom Stand beim Anlegen (Merge-Konflikt möglich) · ein Workstream mit mehreren Abläufen wird
mit der ersten Abnahme erledigt · keine Feiertage.
