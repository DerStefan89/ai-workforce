# Plan B5b-3 „Ist nach Abnahme“ (R7) + Kleinpunkte — v1

Stand 27.10.2026, Basis `2bb2989` (main). Auftrag: Challenger-Bauauftrag B5b-3 (R7, `docs/projekt/fixpaket-f45.md` §2 R7).

## 1 Ziel
Nach jeder Abnahme (ANGENOMMEN) eines Ablaufs mit `feature_ref` schreibt der Kern die eine laufende Workstream-Zeile der Akte
fort: Status `erledigt`, Abgenommen = Tag der Abnahme, Ist = Arbeitstage Begonnen → Abnahme. Ohne Handarbeit; bei Mehrdeutigkeit
nichts, aber sichtbar.

## 2 Befund im Code (Belege)
- POST `…/abnahme` ANGENOMMEN ändert den Workflow-Status nicht (`scripts/leitstand-server.mjs:12676`); zweite Entscheidung zum
  selben Ausführungslauf ⇒ 409 (`:12483`). ANPASSUNG/ABGELEHNT laufen vorher in eigene Zweige.
- „Bereit zum Sichern“ ist abgeleitet aus dem **Arbeitsordner** des Ablaufs (`scripts/leitstand/ablauf-sichern.mjs`, GET
  `…/code?workflow=<id>` mit Laufort `ermittleLaufort`, `leitstand-server.mjs:6252`), Status ABGESCHLOSSEN; die Dateiliste kommt aus
  `git status` dort, der Befehlsblock stagt genau die gelisteten Pfade.
- „Review veraltet“ wird nur bei offener Abnahme berechnet (`vergleicheReviewStand`, `:6314`) — eine Änderung im Arbeitsordner
  nach ANGENOMMEN erzeugt keinen Veraltet-Hinweis.
- Sperre `findeSperrendenAblauf` (`routen-f35.mjs:244`): offen = nicht ABGESCHLOSSEN/GESTOPPT. Der eigene Ablauf ist bei der
  Abnahme ABGESCHLOSSEN, sperrt also nicht.
- Akte-Schreibkern: `src/feature-auftrag/planung-schreiben.ts` (`workstreamZeilen`, Zellersetzung, `haengeAenderungAn`,
  `pruefeAkteGate`, Rundlauf über `lesePlanung`), Schreiben mit Rücklesen `schreibeMitRueckbau` (`routen-planung.mjs`).
- Ist-Regel: `arbeitstageBis(datum, heute)` (`src/workboard/roadmap-planung.ts`, Mo–Fr, ohne Starttag).
- Auftrag trägt `feature_ref` (optional), `erstellt_am` (Pflicht).
- Server steht genau auf der Grenze (13 240 = `obergrenze_zeilen`), ARCHITECTURE.md 17 798 / 17 800 B.

## 3 Entscheidung zur Schreibstelle (Abnahme ↔ Sichern)
**Geschrieben wird im POST `…/abnahme`, Zweig ANGENOMMEN, nach dem Registrieren der Entscheidung, in die Akte im Laufort des
Ablaufs** (`ermittleLaufort`: Arbeitsordner, wenn Pflicht und BEREIT; sonst Projektordner).
- Reihenfolge im Ablauf: Bau → ABGESCHLOSSEN → Abnahme → „Bereit zum Sichern“ → Stefan committet/pusht/merged. Die Abnahme
  liegt vor dem Sichern; was sie im Arbeitsordner schreibt, steht danach in derselben Dateiliste und demselben Commit-Block wie der
  Bau — ein Commit, ein PR. Schriebe man in den Projektordner, entstünde eine zweite, vom Ablauf getrennte Änderung auf main (nicht im
  Block „Bereit zum Sichern“) und ein Konflikt, sobald der Branch die Akte ebenfalls ändert.
- Schreiben beim Sichern geht nicht: Sichern ist keine Route, sondern ein Befehlsblock, den Stefan ausführt.
- Erst nach der Entscheidung: scheitert das Schreiben, bleibt die Abnahme gültig (Antwort 200 mit Hinweis); R7 ist Nebenwirkung,
  keine Bedingung der Abnahme.
- Ablauf ohne Arbeitsordner (kein Bedarf/Bestand): Laufort = Projektordner; dann gilt die Sperre `findeSperrendenAblauf` (ohne den
  eigenen Ablauf) wie bei PUT …/planung, die Antwort trägt den Git-Block (`baueGitBlock`). Mit Arbeitsordner keine Sperre (der Ordner
  gehört nur diesem Ablauf).
- Arbeitsordner Pflicht, aber nicht BEREIT/fehlt: nichts, Hinweis „Arbeitsordner nicht verfügbar — von Hand nachtragen“.

## 4 Regel (rein, `src/feature-auftrag/ist-nach-abnahme.ts`)
`schreibeIstNachAbnahme(inhalt, { workflowId, datum, begonnenErsatz })` → `{ art: 'geschrieben', inhalt, workstream, ist } |
{ art: 'schon_geschrieben' } | { art: 'hinweis', grund }`:
1. CRLF in der Akte ⇒ Hinweis „Akte hat CRLF-Zeilenenden — von Hand nachtragen“ (Auftrag; keine Ausnahme wie B5a-1).
2. Status ABGESCHLOSSEN/ABGEBROCHEN ⇒ Hinweis.
3. Idempotenz: steht unter `## Änderungen` schon eine Zeile mit `Abnahme <workflowId>` ⇒ `schon_geschrieben` (nichts).
4. Kein strenger Abschnitt / Formfehler ⇒ Hinweis.
5. Laufende Zeilen zählen: ≠ 1 ⇒ Hinweis „Workstream nicht eindeutig (n laufende Zeilen) — von Hand nachtragen“.
6. Zeile: Status `erledigt`, Abgenommen = datum; Begonnen leer ⇒ `begonnenErsatz` (s. u.) wird eingetragen; Ist =
   `arbeitstageBis(begonnen, datum)`, nur wenn Begonnen ≤ datum, sonst Ist `–` (keine erfundenen Werte). Zahl mit Komma wie
   `formatiereSchaetzung`.
7. Änderungszeile `- <datum> · Workstream <ID> erledigt, Ist <x> AT · Abnahme <workflowId>` (Grund = „Abnahme <Ablauf-ID>“).
8. Akte-Gate (`pruefeAkteGate`) und Rundlauf (`lesePlanung`: Zeile erledigt, Abgenommen = datum) ⇒ sonst Hinweis.
Gemeinsame Teile (`workstreamZeilen`, Zellersetzung) aus `planung-schreiben.ts` exportiert, nicht kopiert.

**Begonnen fehlt (Abweichung von der Challenger-Vorgabe „beim Start setzen“):** statt eines zweiten Schreibwegs beim Start nimmt die
Abnahme das Datum `erstellt_am` des Auftrags (lokaler Tag) als Begonnen — ein festgehaltener Wert, keine Schätzung, ein
Schreibweg. Ist das Datum nicht lesbar ⇒ Begonnen und Ist bleiben `–`.

## 5 Verdrahtung
- Neues Modul `scripts/leitstand/ist-nach-abnahme.mjs`: `fuehreIstNachAbnahmeDurch({ wurzel, featureRef, workflowId, auftrag,
  datum, sperre? , schreibe? })` — Akte auflösen (`loeseFeatureAktePfadAuf`, exakter Ordnername), fehlt ⇒ `{ art: 'keine_akte' }`
  ohne Hinweis; lesen, UTF-8, reine Regel, schreiben + zurücklesen (Rückbau bei Abweichung), Ergebnis
  `{ art, workstream?, ist?, hinweis?, pfad?, git? }`. Wirft nicht (catch + console.error ⇒ Hinweis).
- Server, Zweig ANGENOMMEN: ein Aufruf, Feld `ist_nach_abnahme` in der 200-Antwort. Ohne `feature_ref` ⇒ Feld fehlt.
  Ausgleich der Server-Zeilen durch Auslagern eines reinen Helfers (Ratsche bleibt ≤ 13 240).
- Leitstand (`views/workflows.js`, Erfolgstext der Abnahme): „Workstream <ID> fortgeschrieben (erledigt, Ist x AT) — erscheint
  unter „Bereit zum Sichern““ bzw. Hinweis im Hinweis-Stil; i18n de/en/tr/ru.
- ARCHITECTURE.md §2 (Arbeitsordner-Ausnahme) um „schreibt bei der Abnahme die Workstream-Zeile der Akte (R7)“ ergänzen, byte-
  neutral (Kürzung anderswo), Detail in `docs/architektur/arbeitsordner.md`.

## 6 Kleinpunkte (zuerst, getrennt stagebar)
- Pille bei Befund-Zeilen und Befund-/Pflege-Detail „Offen“ statt „Geplant“: ein Helfer für die drei Stellen (`views/roadmap.js`
  Zeile, Detail, `standZeile`), Schlüssel `uebersicht.stand.offen` vorhanden; Spur-Farbe unverändert.
- F30-Akte und fixpaket §3: F30 beginnt nach Brain Stufe 3; F45 LAEUFT bis zur ersten Abnahme in F30.
- F45-Akte: E-W2-1 wörtlich; `## Workstreams` und fixpaket §3: W2 vor V1 (Reihenfolge B5b-3 → W2 → V1 → B3 → Brain 1–3 → F30).
- findings: neue IDs (P1 JS ohne Typprüfung; P2 Biome; P2 Dateigrenze; P2 Last-Instabilität; P3 Lagebild-Pflicht), F-1190 ergänzt.
- Lagebild neu erzeugen, `--check`.

## 7 Tests (node:test, Temp-Repo)
Rein: eindeutige Zeile ⇒ geschrieben (Status, Abgenommen, Ist, Änderungszeile); 0 und 2 laufende ⇒ Hinweis mit n; CRLF ⇒ Hinweis;
zweiter Aufruf ⇒ schon_geschrieben; Begonnen fehlt ⇒ Ersatz; Begonnen > Datum ⇒ Ist `–`; ABGESCHLOSSEN ⇒ Hinweis.
Modul/Route gegen Temp-Repo: ANGENOMMEN schreibt im Arbeitsordner (Datei in `git status` dort), ANPASSUNG/ABGELEHNT schreiben nicht,
zweite Abnahme 409 und kein Doppel, Fremdprojekt ohne Akte ⇒ nichts, kein Fehler.

## 8 Risiken / DEKLARIERT
- Die Akte im Arbeitsordner stammt vom Stand beim Anlegen; eine zwischenzeitliche Änderung auf main kann beim Merge kollidieren.
- Hinweis nur in der Antwort der Abnahme (nach Neuladen nicht mehr sichtbar); die geschriebene Änderung sieht man in „Bereit zum
  Sichern“.
- Ist ohne Starttag: Begonnen = Abnahme-Tag ⇒ Ist 0 (dieselbe Regel wie die Ist-Zone).
- Ein Workstream mit mehreren Abläufen wird mit der ersten Abnahme erledigt.

## 9 Schätzung
0,3–0,4 AT (Kleinpunkte ≈ 0,1).
