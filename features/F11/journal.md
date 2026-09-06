# Journal — F11

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-06 — Akte angelegt (Status READY_FOR_TECH)

`features/F11/feature.md` neu angelegt auf Grundlage der Meilenstein-2-
Challenge (`docs/projekt/zielfassung.md` §13.3, `docs/projekt/
umsetzungsplan-fassung-1.md` Abschnitt 1b) und der beiden Stefan-
Entscheidungen vom 06.09.2026:

- **E-M2-1** — der Auftragstext bekommt ein eigenes Feld in
  `AusfuehrungsEingaben` und wird dem aus dem Kontextpaket gebauten
  Evidenzteil des Prompts als getrennter Abschnitt vorangestellt. Er
  wird nie ein Kontextpaket-Element — die F-124-Entscheidung bleibt in
  Kraft.
- **E-M2-2** — ein Auftrag ist ein Kontrollartefakt und hält N Läufe,
  ohne Automat. Welcher Lauf als Nächstes startet, wählt weiterhin
  ausschließlich der Mensch (Orchestrierungs-Stufe 1).

Neun Akzeptanzkriterien (AK1–AK9), drei Workstreams (WS-1 → WS-2 → WS-3),
Blocker gegen den Doku-PR, der Meilenstein 2 erst in der Sollquelle
verankert (F-129).

## 2026-09-06 — WS-1 umgesetzt (AK1, AK2, AK3), Status IN_ARBEIT

Grundlage: `state/plan-v1-f11-auftrag-ws1.md` (Advisor-freigegeben mit
Hinweisen, `71cf0c7`), `state/tasks/f11-auftrag-ws1.md`. Vier offene
Fragen des Plans vorab von Stefan entschieden: Option B für den
`leitstand-server.mjs`-Konflikt, Trennzeichen `===`, `check-f11-
auftrag.mjs` bereits ab WS-1, keine eigene `auftrag_id`-Zeichenregel.

- **AK1** — neues, eigenständiges Modul `src/auftrag/{index,types}.ts`
  (D1, ruft F2s `registriereKernArtefakt` nur von außen auf). Ein Auftrag
  wird als `AUFTRAG_V0` unter `auftrag-<auftragId>` registriert, `eingaben:
  []` (D2, Wurzelknoten). Schema `schemas/kontrollzustand-auftrag-payload.
  schema.json` plus drei Beispiele. Ein `node:test`-Fall in
  `src/auftrag/auftrag.test.ts`.
- **AK2** — `AusfuehrungsEingaben` bekommt das Pflichtfeld `auftragstext:
  string`. `fuehreAufgabeDurch` baut `promptText` jetzt als
  `Auftrag:\n<auftragstext>` (leeres Kontextpaket) bzw.
  `Auftrag:\n<auftragstext>\n\n===\n\n<evidenzText>` (nichtleeres
  Kontextpaket) — `bauePromptAusKontextpaket` selbst bleibt unverändert
  (F-124-Vertrag). Zwei neue Tests in `execution-controller.test.ts`
  belegen beide Fälle über die real an F6a übergebenen `-p`-Tokens.
- **AK3** — mechanisch zweistufig geprüft: (a) Grep-Gate in
  `scripts/check-f11-auftrag.mjs` mit Selbsttest, dass `auftragstext` nie
  im anfragen-Konstruktionsblock von `src/execution-controller/index.ts`
  auftaucht, nur im Prompt-Zusammensetzungsteil danach; (b) Laufzeit-Test
  in `execution-controller.test.ts` — zwei reale Läufe mit
  unterschiedlichem `auftragstext` (einer mit UUID-Marke) belegen, dass
  die Marke nie im registrierten Kontextpaket auftaucht und die
  Elementanzahl unverändert bleibt.
- **Option B** (`leitstand-server.mjs`): `ERLAUBTE_STARTAUFTRAG_FELDER`,
  `PFLICHT_STARTAUFTRAG_FELDER` und `pruefeStartauftrag`s
  `eingaben`-Rückgabe um `auftragstext` erweitert — reine Formprüfungs-
  Erweiterung, keine Verhaltens-/Routen-Änderung. `scripts/check-f10-
  leitstand.mjs`s `gueltigerStartauftrag`-Fixture ebenso, plus ein neuer
  Testfall: Startauftrag ohne `auftragstext` → 400 "Pflichtfeld
  'auftragstext' fehlt".
- `scripts/check-f11-auftrag.mjs` in `npm run check` und
  `npm run check:template` eingehängt (`package.json`).
- Nicht angefasst: F6a (`starteGateway`/`GatewayEingaben`),
  `public/leitstand/`, `baueAufruf`, AK4-9, Lauf→Auftrag-Lineage (an WS-2
  delegiert, plan Abschnitt 2.2/D5), keine eigene `auftrag_id`-
  Zeichenregel (D5, erbt F1s `pruefeLaufId`).
- `npm run check` → Exit 0, `tests 137, pass 137, fail 0` (siehe
  `state/gates.md` für die vollständigen Rot-/Grün-Fall-Belege).
- Status `READY_FOR_TECH` → `IN_ARBEIT` (WS-2/WS-3 stehen noch aus, kein
  `ABGESCHLOSSEN`).

**Reviewer-/QA-Pass (frischer Kontext, F-046), beide „Freigegeben mit
Hinweisen", keine Blocker:**

- **code-reviewer:** `FUNKTIONSSTART_MARKER` in `scripts/check-f11-
  auftrag.mjs` weicht bewusst vom Vertragswortlaut (state/tasks/f11-
  auftrag-ws1.md Punkt 9(b), Ganze-Datei-Teilung) ab — notwendige
  Korrektur, da eine Ganze-Datei-Teilung sich an der eigenen
  Dateikopf-Prosa von `src/execution-controller/index.ts` (die
  `auftragstext` bereits vor der Funktion erwähnt) falsch-positiv
  gemeldet hätte (real geprüft). Nachgetragen: erklärender Kommentar im
  Gate-Skript selbst.
- **qa:** AK3(a)-Grep-Gate ist ein reiner Substring-Vergleich, keine
  AST-/Semantikprüfung — ein künftiger, nicht-adversarialer Refactor
  (ausgelagerte Hilfsfunktion/Konstante außerhalb des geprüften Fensters,
  oder ein zweiter `baueKontextpaket`-Aufruf) würde nicht erkannt. Kein
  WS-1-Blocker (das Gate deckt genau den in AK3 benannten Verstoßtyp ab),
  jetzt im Gate-Skript als bekannte Grenze dokumentiert statt implizit.
  Drei weitere, als unkritisch eingestufte Lücken (kein Typ-Check für
  nicht-string `auftragstext` im Leitstand-Body — bewusst, konsistent mit
  den übrigen Feldern ohne Typ-Check, siehe `state/tasks/f11-auftrag-
  ws1.md`; kein Test für `===` im Auftragstext selbst; keine
  Laufzeit-Validierung von `titel`/`auftragstext` auf Nichtleere in
  `registriereAuftrag`, konsistent mit F5s `baueKontextpaket`, das
  ebenfalls nicht zur Laufzeit validiert) — alle drei bewusst nicht in
  WS-1 behoben, ggf. Gegenstand von WS-2.
