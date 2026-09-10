# F15 WS-3b — Realer Oberflächen-Nachweis und Rotkalibrierung

Datum: 10.09.2026 · Branch `f15/ws3-workflow-ansicht` · AK8, zweiter von zwei
Commits.

## Was hier belegt wird und was nicht

**Belegt:** die beiden realen Fälle aus dem Bauauftrag, gefahren in einem
**echten Chrome** (headless, über das DevTools-Protokoll gesteuert) auf der
**echten Seite** `public/leitstand/` gegen einen **echten
Leitstand-Server**. Geklickt wurde, was ein Mensch klicken würde; geprüft
wurde anschließend das **Artefakt auf der Platte**, nie die Selbstauskunft
der Seite.

**Nicht belegt:** der Werkzeuglauf selbst. `fuehreAufgabeDurchFn` ist eine
Attrappe — hier steht die Bedienung zur Prüfung, nicht F8. Der reale
Kindprozess mit echtem Claude-Code-Lauf liegt in
`scripts/check-f15-automat-real.mjs`; die Attrappe hängt in Fall 2 so lange,
wie ein realer Lauf hinge, und endet nach dem Abbruch als `FEHLGESCHLAGEN`,
weil ein abgebrochener Lauf real so endet.

Das Nachweis-Skript ist ein Wegwerf-Skript und liegt bewusst nicht im Repo:
es startet einen Browser und ist damit weder in `npm run check` einhängbar
noch auf einer Maschine ohne Chrome reproduzierbar. Was dauerhaft gilt,
steht in den beiden Gates (`scripts/check-f15-workflow.mjs`,
`scripts/check-f15-workflow-oberflaeche.mjs`).

## Fall 1 (F-253) — der Halt ohne persistierten Status

Ein Workflow, dessen **erster** Schritt `freigabe: ZWINGEND` trägt. Nichts
ist gelaufen, also steht nirgends `WARTET_FREIGABE` — genau der Zustand, in
dem der Mensch die einzige Entscheidungsinstanz ist und den die Ansicht bis
WS-3a nicht zeigte.

```
Fall 1 (F-253): 'ws3b-zwingend-e69d0299' — status OFFEN, Schritt 1 freigabe ZWINGEND, lauf_id null
   Nichts ist gelaufen, nirgends steht WARTET_FREIGABE — genau der Zustand ohne persistierten Halt.
   Die LISTE zeigt: "wartet auf dich — Freigabe nötig (schritt-1)"
   Die BEDIENUNG bietet an: ["freigeben","ablehnen","stoppen"]
   Die Schrittzeile ist markiert: "schritt-1 Cursor fällig code-reviewer claude-code
                                   nachweis-modell ZWINGEND (hält an) — OFFEN kein Lauf Ende 600000"
   -> "Freigeben" geklickt.
   ARTEFAKT danach: status ABGESCHLOSSEN, Schritt 1 status ERFOLGREICH,
                    lauf_id "4b00cde7-982a-40c9-b8b6-1996e67e2938", freigabe_erteilt true
   ENTSCHEIDUNG: FREIGEGEBEN — "Nachweis WS-3b: Freigabe über die Oberfläche, ohne persistierten Halt."
```

Der Halt ist in der **Liste** ausgewiesen (ohne den Workflow zu öffnen), der
fällige Schritt ist in der Tabelle markiert, `ZWINGEND` ist als „hält an"
gekennzeichnet — und die Freigabe über die Oberfläche startet den Schritt
real und hinterlässt ihre Entscheidung als Artefakt.

## Fall 2 (F-240, F-218) — der Reparaturzug

Zweistufiger Workflow, Stopp **mitten** im laufenden Schritt, danach die
Reparaturfassung ohne eine einzige Handbewegung am JSON.

```
Fall 2: 'ws3b-reparatur-3c7a8dfa' — zweistufig, Stopp MITTEN im laufenden Schritt
   Schritt 1 läuft (Attrappe hängt, wie ein echter Kindprozess).
   -> "Stoppen" geklickt.
   [leitstand] gestoppt — laufender Schritt 'schritt-1' (Lauf '900440cc-…') abgebrochen.
   [leitstand] ist GESTOPPT — Schritt 'schritt-1' hat seinen Ausgang (FEHLGESCHLAGEN) bekommen,
               die Kette wird NICHT fortgesetzt
   ARTEFAKT nach dem Stopp: status GESTOPPT, Cursor null, Schritt 1 FEHLGESCHLAGEN/"900440cc-…"
   -> "Reparaturfassung vorbereiten" geklickt.
      Entwurf: status OFFEN, Cursor "schritt-1", Schritt 1 OFFEN/null,
               grund "Vom Menschen gestoppt: Nachweis WS-3b: Stopp mitten im lauf…"
   WARNUNGEN: F-219: Die lauf_id von 'schritt-1' -> 'schritt-2' wird zurückgesetzt. Der
              Folgeschritt startet dann ohne vorgaengerLaufId — der Lineage-Verweis auf den
              Vorlauf fehlt. Kein Fehler, aber eine Entscheidung.
              F-240: Der Halt-Grund ("Vom Menschen gestoppt: Nachweis WS-3b: Stopp mitten im
              laufenden Schritt.") wird beim Einreichen auf null normalisiert und ist danach in
              keiner Ansicht mehr zu lesen. Wenn er festgehalten gehört, kopiere ihn vorher —
              die Stopp-Entscheidung selbst bleibt als Artefakt bestehen.
   -> "Einreichen" geklickt (ohne Handarbeit am JSON).
   MELDUNG: Neue Fassung von 'ws3b-reparatur-3c7a8dfa' angenommen (Version 5).
   -> "Starten" geklickt.
   ARTEFAKT danach: status ABGESCHLOSSEN, Schritt 1 ERFOLGREICH, Schritt 2 ERFOLGREICH
```

Alle vier Korrekturen aus F-240 sind im Entwurf sichtbar: `status` auf
`OFFEN` (1), die Schrittfelder des abgebrochenen Schritts zurückgesetzt (2),
der Cursor von `null` auf den ersten Schritt ohne `lauf_id` (3, der Fall aus
F-218), der Halt-`grund` steht weiterhin im Entwurf (4). Die F-219-Warnung
erscheint genau dort, wo sie zutrifft, und die Kette läuft danach real zu
Ende.

## Rotkalibrierung (F-211)

Jede neue oder verschärfte Gate-Zusage wurde **einzeln** rot kalibriert:
Quelldatei gezielt manipuliert, Gate laufen lassen, geprüft, dass es rot
wird **und** genau den erwarteten Befund nennt (ein Absturz oder ein fremder
Befund zählt nicht — Lehre aus F-243), Datei vollständig zurückgebaut.

**65 von 65 Zusagen rot** (56 aus dem Bau, 9 aus der Nachlese von Reviewer-
und QA-Pass). Rückbau über SHA-256 gegengeprüft, Stand nach der Nachlese:

| Datei | Hash vorher | Hash nachher |
|---|---|---|
| `public/leitstand/app.js` | `262822e05b15a520…` | `262822e05b15a520…` |
| `public/leitstand/index.html` | `2b6da07880b09f18…` | `2b6da07880b09f18…` |
| `scripts/leitstand-server.mjs` | `e2e151e6259e87f0…` | `e2e151e6259e87f0…` |

Verteilung: 5 auf `index.html` (drei neue Container-ids, der umgedrehte
Einleitungssatz in beiden Richtungen), 3 auf den umgestellten
„Fassung ungültig"-Zweig (F-247), 4 auf die umgedrehte Scope-Zusage,
26 auf Verdikt/Lage/Bedienung, 20 auf den Reparaturzug, 7 auf die beiden
Server-Projektionen.

**Dabei real gefunden:** die Zusage „die Verstöße werden gerendert" war
zunächst durch die eigene Funktionsdeklaration erfüllbar
(`renderWorkflowUngueltig(verstoesse)` steht auch in `function
renderWorkflowUngueltig(verstoesse)`). Die Kalibrierung hat es aufgedeckt,
das Gate sucht seither die Aufrufstelle. Genau dafür ist F-211 da.

## Nachlese aus Reviewer- und QA-Pass (beide mit frischem Kontext)

Beide Pässe: freigegeben mit Hinweisen, keine kritischen Probleme. Im selben
Commit behoben: der fehlende Überholschutz des Reparaturentwurfs (ein
Doppelklick oder ein Schließen während des Ladens konnte eingetippte
Änderungen überschreiben); die Reparatur wird jetzt auch bei einer ungültigen
Fassung angeboten und der Stopp-Knopf dort weggelassen; zwei weitere
Warnungen über dem Entwurf (verlorener Halt-`grund`, bereits erreichte
`max_schritte`); die F-226-Warnung wird beim Tippen neu gerechnet; jede
Bedienung quittiert auch den Erfolg und wertet `laufAbgebrochen`/`bezeugt`
aus; der Workflow-Kopf erscheint auch bei unlesbarer Schrittliste; zwei
Code-Kommentare, die mehr behaupteten als sie belegen konnten, sind auf das
korrigiert, was gilt. Nicht behoben, sondern als F-262 bis F-267
festgehalten.

**Ein QA-Befund war ein Fehlbefund** und ist nachgeprüft: ein
Reparaturentwurf mit `status: "ABGESCHLOSSEN"` mauert den Workflow NICHT zu —
`POST /api/workflows` lehnt einen Body mit gesperrtem `status` bereits mit 400
ab („ein so eingereichter Workflow wäre weder startbar noch ersetzbar", die
Prüfung liegt VOR der Bestandsprüfung, auf die sich der Befund stützte).
