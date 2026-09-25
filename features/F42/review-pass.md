# F42 — Review-Pass vor FEATURE_GATE

Unabhängiger Review-Pass, zwei Subagenten (`code-reviewer`, `qa`), jeweils
frischer Kontext, read-only. Branch `review/f42-review-pass` (von
`origin/main` nach #252, Commit `33afed5`). Grundlage: `features/F42/
feature.md`, `features/F42/nachweis-ws3-reallauf.md`, Merges #249–#252
(`f1eea46^..33afed5`), `state/findings.md` F-667, F-684, F-685, F-690,
F-695, F-699–F-716.

## a) Erfüllt jede AK ihren Nachweis — Gate, Test oder Reallauf?

**Befund: Ja, mit einer methodischen Einschränkung.** Beide Pässe haben
unabhängig voneinander die Gate-Blöcke (a)–(i) in
`scripts/check-f42-projekt-harness.mjs` gelesen und bestätigt, dass sie
real existieren und die behaupteten Assertions tatsächlich enthalten —
keine leeren Platzhalter, keine reine Behauptung ohne Code-Gegenstück.

- [Fakt] AK1/AK2 (Skelett + Baseline-Bytegleichheit): Block (a)/(b),
  inkl. Rot-Fall (fehlendes Skelett) und dem Nachweis, dass eine
  bestehende Baseline-Datei NIE überschrieben wird.
- [Fakt] AK3 (Coach-Text ohne ai-workforce-Pfade): Block (d), prüft
  explizit auf `validiereRoadmapDaten`/`check-feature.mjs` als
  Rot-Kriterium.
- [Fakt] AK4 (Trust-Status, kein Schreibzugriff): Block (e) + Quelltext
  von `pruefeWorkspaceTrust` (`src/projekt-anlegen/index.ts:544-567`) —
  nur `existsSync`/`readFileSync`, kein `writeFileSync` im
  Funktionskörper.
- [Fakt] AK7 (Trust-Hinweis sichtbar im Leitstand): real verifiziert —
  `zeigeAnlegenErfolg` (`public/leitstand/views/
  projekte-uebersicht.js:147-158`) liest `naechsteSchritte.trust?.hinweis`,
  Element existiert in `public/leitstand/index.html:253`.
- [Fakt] AK8–AK11 (WS-2, Stack-Erzwingung): Block (f1)/(f2) mit
  Rot-/Grün-Fall und Rückwärtskompatibilitätsprüfung.
- [Fakt] AK12 (F-712, Scope-Allowlist): Block (g2)–(g5) ist der
  stärkste Beleg im gesamten Gate — echter HTTP-Request-Handler gegen
  ein echtes Wegwerf-Git-Repo, `POST /api/auftraege` →
  `POST /api/workflows/<id>/starten`, realer `git status`-Diff.
  Inklusive eines QA-Nachtrags (g5): Regel 1g greift auch OHNE
  `architekt`-Vorgänger.
- [Fakt] AK13 (F-714, CLAUDE.md+ADR-Pflicht): Block (h1)–(h3), gleicher
  realer Aufrufpfad, inkl. des "Halb-erfüllt"-Falls.
- [Fakt] AK14 (F-711, Vorauswahl): Block (i) ist ein statisches
  Quelltext-Gate (Grep), kein Browser-DOM-Test — schwächer, aber die
  Akte behauptet auch nur das, verschweigt die Schwäche nicht.
- [Fakt] AK15 (Feature-Modus bitgenau unverändert):
  `src/architekt/architekt.test.ts:175-183` prüft
  `baueUmsetzungsInstruktion()` per `deepStrictEqual` gegen
  `baueUmsetzungsInstruktion('feature')`.
- [Annahme] AK2/AK5/AK15 zitieren konkrete Zahlen (1480 ms,
  775/784/806 Tests) — von keinem der beiden Pässe selbst
  reproduziert (kein `npm run check`-Lauf im read-only-Pass).

**Methodische Einschränkung (neu, F-721):** Der als "Reallauf-Nachweis"
verstandene WS-3-Durchlauf gegen `haushaltsbuch2` fand VOR WS-4 statt und
zeigte selbst zwei nicht-grüne Zeilen (Z6/Z8 in
`nachweis-ws3-reallauf.md`) — genau die Lücken, die WS-4 schließt. WS-4
selbst ist NICHT erneut gegen ein echtes drittes Fremdprojekt belegt,
sondern nur gegen ein synthetisches Wegwerf-Git-Repo im Gate. Das ist
methodisch vertretbar und in der Akte korrekt benannt ("gegen ein echtes
Wegwerf-Git-Repo"), aber ein schwächerer Nachweisgrad als ein echter
zweiter/dritter Fremdprojekt-Durchlauf, der den ursprünglichen Auslösefall
(Lauf `3e0c0a31`) wiederholt.

## b) Sind die neuen Regeln an den realen Aufrufpfaden verdrahtet?

**Befund: Ja, real verifiziert für alle im Auftrag genannten Stellen.**

- [Fakt] `kopiereSkelett` → `scripts/leitstand-server.mjs:4899`,
  innerhalb `POST /api/projekte`.
- [Fakt] `pruefeWorkspaceTrust` → `scripts/leitstand-server.mjs:4937`,
  selber Handler.
- [Fakt] `istStackOffen` → drei Aufrufstellen in `leitstand-server.mjs`
  (4189, 4478, 5150/6621) mit `repoWurzel` (dem Projekt, nicht
  `installWurzel`) — die von F-707 korrigierte Stelle trägt den
  F-707-Kommentar.
- [Fakt] Regel 1g (`pruefeProjektmodusScope`): Aufrufer berechnet
  `scopeVerletzung` in `leitstand-server.mjs:4546-4550` nur bei
  `herkunft.art === 'projekt_interview'`, `src/workflow/index.ts:890-896`
  liest es real aus.
- [Fakt] Regel 1h: analoge Verdrahtung
  `leitstand-server.mjs:4562-4577` → `src/workflow/index.ts:903-909`.

Das im Auftrag benannte Risikomuster (F-703/F-707/F-708: Funktion isoliert
korrekt, aber am realen Aufrufpfad nicht verdrahtet) trat in F42 selbst
bereits zweimal auf und wurde beide Male per Nachtrag behoben — WS-4 hat
zusätzlich einen eigenen Gate-Block (g5) speziell dafür geschrieben
(Regel 1g auch ohne `architekt`-Vorgänger). [Schlussfolgerung] Innerhalb
des Zeitbudgets beider Pässe wurde keine weitere, bisher unentdeckte
Instanz dieses Musters gefunden — das ist aber keine vollständige
Verifikation aller Aufrufpfade in der sehr großen `leitstand-server.mjs`
[offene Unsicherheit].

## c) Bleibt der Featuremodus (ai-workforce selbst) unverändert?

**Befund: Ja, strukturell und verhaltensseitig abgesichert, nicht nur
behauptet.**

- [Fakt] `baueUmsetzungsInstruktion()` ohne Argument ist laut
  `deepStrictEqual`-Test bitgenau `baueUmsetzungsInstruktion('feature')`;
  der Rückgabeblock (`src/architekt/index.ts:529-536`) ist der
  ursprüngliche F39-WS-3a-Text.
- [Fakt] `modus` wird einmalig aus
  `auftragVersion.daten.herkunft?.art === 'projekt_interview'`
  berechnet (`leitstand-server.mjs:4174`) — für jeden bestehenden
  Auftrag ohne dieses Feld bleibt `modus === 'feature'`.
- [Fakt] Regel 1g/1h prüfen `!== undefined`/`=== true`; Aufrufer
  berechnen `scopeVerletzung`/`stackNichtGefuellt` nur im
  Projektmodus-Zweig — im Feature-Modus bleiben beide Felder
  `undefined`. `src/workflow/workflow.test.ts:766-780` deckt den
  "Feld fehlt → bitgenau unverändert"-Fall ab.
- [Fakt] Block (g4) des Gates ist ein expliziter Regressionstest:
  dieselbe Scope-Überschreitung OHNE `herkunft.art` bleibt FOLGENLOS.

Ein Nutzer, der im Alltag an ai-workforce selbst weiterarbeitet, merkt
laut beiden Pässen strukturell nichts von F42.

## d) Sicherheits- oder Invarianten-Risiken

- [Fakt] E-F41-1 (Baseline unverändert): `kopiereSkelett` überschreibt
  nachweislich keine bestehende Datei (Gate b, Kopierlogik in
  `src/projekt-anlegen/index.ts:240ff`). Kein Fund.
- [Fakt] E-PH-1 (kein Schreibzugriff auf `~/.claude.json`):
  `pruefeWorkspaceTrust` importiert im Funktionskörper nur
  `readFileSync`/`existsSync`. Kein Fund.
- [Fakt, neu → **F-717** P3] `pruefeProjektmodusScope`
  (`src/architekt/index.ts:584-586`) prüft die Allowlist über naiven
  `startsWith`-Vergleich — bei isolierter Betrachtung nicht robust gegen
  `../`-Pfad-Tricks. [Schlussfolgerung] Am real verdrahteten Aufrufpfad
  praktisch nicht ausnutzbar, weil der einzige Aufrufer
  (`parseUntrackedDateien`, `src/aenderungsuebersicht/index.ts:217-221`)
  ausschließlich git-normalisierte Pfade liefert — diese Annahme ist
  aber nirgends als bewusste Grenze dokumentiert oder getestet.
- [Fakt] Trust-Erkennung (F-702, bekannt) ist bewusst konservativ
  (Fehlrichtung: eher ein Fehlalarm als ein übersehener fehlender
  Trust) — [Schlussfolgerung] birgt aber ein Verhaltensrisiko
  (Warnungsmüdigkeit bei wiederholten Fehlalarmen durch
  Schreibweise-Divergenz), das in der Akte nicht weiter adressiert ist.
  Kein neues Finding — bereits in F-702 erfasst, hier nur bestätigt.
- [Annahme, neu → **F-719** P3] Nicht verifiziert, ob
  `pruefeWorkspaceTrust` bei syntaktisch kaputtem `~/.claude.json`
  (kein valides JSON) sauber `'fehlend'` liefert oder eine unbehandelte
  Exception wirft — kein Fixture dafür im Gate.

## e) Welche offenen Findings sind für die Abnahme relevant?

Zur Einordnung: F-703, F-707, F-711, F-712, F-714 sind bereits **gelöst**.

**Abnahme-relevant, aber unschädlich (bewusst begrenzter Scope, im
Feature selbst dokumentiert):**
- F-690 (P1, offen) — Workspace-Trust nicht automatisch hergestellt;
  UI-Teil (AK7) gelöst, Rest bewusst Nicht-Ziel (Advisor-Auflage F5).
- F-708 (P2, offen) — Prozesslehre "Gate am realen Aufrufpfad"; in WS-4
  selbst bereits demonstrativ befolgt (Blöcke g/h).
- F-713 (P2, offen) — im Projektmodus durch F-712s Allowlist bereits
  geschlossen; Feature-Modus-Rest bewusst außerhalb des F42-Scopes.

**Bewusst vertagt/dokumentiert, für Abnahme unschädlich:** F-667, F-695,
F-699, F-700, F-701, F-702, F-704, F-706, F-709, F-710, F-715, F-716 —
jeweils mit expliziter Nicht-Ziel-/YAGNI-Begründung, keines widerspricht
einer AK oder Invariante.

**Neu in diesem Review-Pass gefunden** (`state/findings.md`,
nächste freie ID F-717): F-717 (P3, Pfad-Traversal-Härtung
undokumentiert), F-718 (P2, keine Kombinationsprüfung Regel 1g+1h),
F-719 (P3, Malformed-JSON-Fall bei Trust-Check unverifiziert), F-720 (P3,
kein Laufzeit-Hinweis auf Template-Reste in `state/tooling.md`), F-721
(P2, WS-4 noch ohne erneuten realen Fremdprojekt-Nachweis). Keines davon
widerspricht einer AK oder einer der vier Invarianten (E-F41-1, E-PH-1,
Featuremodus-Neutralität, Allowlist-Durchsetzung) — alle fünf sind
Härtungs-/Nachweis-Lücken, keine beobachteten Fehlfunktionen im
gemergten Code.

## Gesamteindruck

Beide unabhängigen Pässe kommen zum selben Ergebnis: ungewöhnlich hohe
Nachweisgüte, insbesondere WS-4 (Blöcke g/h) prüft konsequent am realen
HTTP-/Git-Aufrufpfad statt nur die isolierte Funktion — genau das Muster,
an dem F42 selbst zweimal zuvor gescheitert war (F-703, F-707). Kein P1-
oder AK-widersprechender Befund. Die fünf neu gefundenen Findings sind
durchweg P2/P3-Härtungs- und Nachweislücken, keine Blocker.

## Status
- [x] Freigegeben mit Hinweisen
- [ ] Freigegeben
- [ ] Nicht freigegeben
- [ ] Blockiert

Hinweise: F-718 (Kombinationsfall Regel 1g+1h ungeprüft) und F-721
(WS-4 noch ohne erneuten realen Fremdprojekt-Nachweis) sollten vor dem
nächsten Fremdprojekt-Durchlauf nachgezogen werden; F-717/F-719/F-720
sind kleinere Härtungs-/Doku-Lücken ohne Zeitdruck.

## Nächster sinnvoller Schritt
`features/F42/feature.md` auf FEATURE_GATE setzen, `docs/STATUS.md`
nachziehen (dieser Review-Pass erlaubt das laut Auftrag bei
"Freigegeben mit Hinweisen"). Abnahme (ABGESCHLOSSEN) bleibt Stefans
Entscheidung.
