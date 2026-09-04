# Plan v2 — Feature F8: Execution Controller

Slug: f8-execution-controller
Stand: 2026-09-04
Grundlage: `state/plan-v1-f8-execution-controller.md` (unverändert stehen
gelassen) + `state/advisor-findings-f8-execution-controller.md`
(Urteil: Freigegeben mit Hinweisen).

Dieser Abschnitt enthält nur die Deltas gegenüber v1. Alle nicht hier
genannten Abschnitte von v1 gelten unverändert fort — insbesondere
Abschnitt 0 (Verifikation), 1 (Ziel), 2.1 (WS-1-Ablauf), 3 (Nicht-Ziele),
4 D1/D4/D5, 5, 7, 8.

## Delta 1 — Fehlerpfad WS-2a (Advisor-Finding 10)

`AusfuehrungsErgebnis` (v1 Abschnitt 2.1) erhält keinen vierten
Ausgangs-Varianten-Zweig für einen Wurf innerhalb der Eskalationsschritte
(`erfasseBedarf`/`erzeugeTransportpaket`/`haendigeAus`). Stattdessen gilt
explizit, als Teil dieses Plans, nicht erst als Implementierungsdetail:

- Ein `throw` aus einem der drei WS-2a-Aufrufe wird **nicht** vom
  Controller gefangen. Er propagiert unverändert als Promise-Rejection an
  den Aufrufer von `fuehreAufgabeDurch` — konsistent mit dem im Repo
  etablierten Idiom „throw = Vorbedingungsverletzung, kein Fachergebnis"
  (`lineage-registry/index.ts:243-245`, `human-transport/index.ts:90-92`),
  das WS-1 für F5/F6a/F7-Aufrufe bereits genauso handhabt (dort werfen die
  Aufrufe laut Abschnitt 0 nicht regulär, sondern liefern `ok: false`).
- Zu diesem Zeitpunkt ist `stelleLaufstatusFest(ausloesenderLaufId)`
  bereits `ABGESCHLOSSEN`/`VERWEIGERT` (Schritt 4 aus 2.1 lief vor der
  Eskalation). Ein Wurf in WS-2a ändert daran nichts — kein Schreibzugriff
  in WS-2a berührt `kontrollzustand/${ausloesenderLaufId}/checkpoints/`
  (F-091-Nachweis, v1 Abschnitt 2.2). Der auslösende Lauf bleibt in jedem
  Fall in seinem Endzustand, unabhängig davon, ob die Eskalation
  durchläuft oder wirft.
- Der Handoff-Vertrag für WS-2a benennt diesen Punkt ausdrücklich als
  Akzeptanzkriterium (Ergänzung zu AK6): ein Testfall, der einen Wurf in
  `erfasseBedarf` simuliert (z. B. per Attrappe) und prüft, dass (a) die
  Rejection unverändert beim Aufrufer ankommt und (b)
  `stelleLaufstatusFest(ausloesenderLaufId)` danach weiterhin
  `ABGESCHLOSSEN` liefert.

## Delta 2 — Aufrufreihenfolge Eskalation vs. Schritt 5 (Advisor-Finding 12)

v1 Abschnitt 2.1/2.2 ließ die genaue Einordnung der WS-2a-Eskalation
relativ zu Schritt 5 (`stelleLaufstatusFest`) nur implizit aus der
Abschnittsgliederung erschließbar. Festgelegt:

**Reihenfolge:** Schritt 4 (`klassifiziereLauf`) → **Eskalationsprüfung
und ggf. WS-2a vollständig** → Schritt 5 (`stelleLaufstatusFest(
ausloesenderLaufId)`).

Begründung: `stelleLaufstatusFest` liest ausschließlich
`kontrollzustand/${ausloesenderLaufId}/checkpoints/*` (v1 Abschnitt 0),
die Eskalation schreibt ausschließlich unter `eskLaufId` — die
Reihenfolge zwischen beiden ist für das *Ergebnis* von Schritt 5 beweisbar
irrelevant (F-091-Nachweis). Sie wird dennoch fest vor Schritt 5 platziert,
nicht parallel oder danach, damit `AusfuehrungsErgebnis.laufStatus` (der
Rückgabewert von `fuehreAufgabeDurch`) bei `VERWEIGERT`-mit-Bypass-Verdacht
denselben, bereits ausgelösten Eskalationsschritt widerspiegelt, statt
dass ein Aufrufer den `laufStatus` erhält, bevor die Eskalation überhaupt
angestoßen wurde. Diese Festlegung ersetzt die bisher nur implizite
Lesart und ist im Handoff-Vertrag für WS-2a als feste Schrittfolge zu
übernehmen (nicht als Optimierungsspielraum).

## Delta 3 — Redaktionelle Präzisierung Offene Frage 1 (Advisor-Finding 7)

v1 Abschnitt 10, Frage 1 bleibt in `plan-v1` unverändert stehen (Regel 10
des Advisor-Verfahrens: keine stillschweigende Korrektur der Vorlage).
Für den weiteren Umgang gilt ab diesem Plan:

Der Advisor-Pass hat belegt (Findings 5–7), dass die Lineage-Kette
strukturell nie laufId-skaliert war, sondern durchgängig
`artefaktId`-skaliert ist (`lineage-<artefaktId>`,
`lineage-registry/index.ts:47-49`), und dass F8s Verwendung desselben
synthetischen `artefakt:<id>`-Schlüssels für einen Lauf-zu-Lauf-Verweis
denselben, bereits von F9 genutzten und advisor-geprüften Codepfad nutzt
(`human-transport/index.ts:128,333`). D2 (v1 Abschnitt 4) ist damit **keine
offene fachliche Frage mehr**, sondern durch diesen Advisor-Pass mit
Codebeleg entschieden: der synthetische Schlüssel trägt die
Lauf-zu-Lauf-Referenz zulässig. Frage 1 aus v1 Abschnitt 10 gilt als
beantwortet und wird nicht in den Handoff-Vertrag als offener Punkt
übernommen.

## Unverändert offen (v1 Abschnitt 10, Fragen 2–4)

Diese drei Punkte bleiben wie in v1 vor dem jeweils betroffenen
Bauauftrag zu klären (Frage 2/4 vor WS-2b bzw. im WS-2-Handoff-Vertrag,
Frage 3 als bewusst offene, nicht blockierende Designfrage):

2. Wiederaufnahme-`laufId`-Konvention (`-retry-N` vs. freie ID).
3. Mehrfach-Eskalation innerhalb desselben auslösenden Laufs — fachlich
   offen, kein Blocker (D3 verhindert nur die ID-Kollision).
4. `GatewayOptionen`-Durchreichung — Detailfrage für den Handoff-Vertrag.

## Zusätzlich aus dem Advisor-Pass mitzuführen (nicht blockierend)

- Finding 4 (laufId-Format): `#` ist durch `pruefeLaufId` nicht verboten,
  aber durch `context-builder/index.ts:97-103`s `Anfrage.pfad`-Validierung
  verboten. Für WS-2a/WS-2b optionaler Hygiene-Testfall im
  Handoff-Vertrag: laufId mit `#` führt zu `ungueltiger_pfad`-Abbruch statt
  stillem Verlust — kein Codeänderungsbedarf, nur ein Testfall-Kandidat.
- Finding 11: `features/F8/feature.md` hat eine kleine interne
  Inkonsistenz (F4 in Zeile 30-31 als direkt aufgerufen gelistet, in
  Zeile 115 korrekt als „weich/mittelbar" geführt) — Korrektur der
  feature.md empfohlen, außerhalb dieses Plans.
- Finding 13: Windows-Pfadlänge durch `-eskalation-<uuid>`-Suffix
  (48 Zeichen zusätzlich) — keine bekannte Falle im Repo, keine Aktion
  nötig, nur als Beobachtung vermerkt.

## Status
- [x] Freigegeben mit Hinweisen (Advisor-Pass, `state/advisor-findings-f8-execution-controller.md`)
- [ ] Freigegeben ohne Einschränkung
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Freigabe von Plan v2 durch Stefan, danach Handoff-Vertrag für WS-1 (kein
offener Punkt betrifft WS-1). Für WS-2 vorab: Fragen 2–4 aus v1 Abschnitt
10 klären, Delta 1/Delta 2 aus diesem Plan als feste Vorgabe in den
WS-2a-Handoff-Vertrag übernehmen.
