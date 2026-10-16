# F45 B2b-3c — Plan (Budget je Arbeitspaket + Umfangs-Abgleich)

Branch `f45/b2b3c-budget-umfang` (von origin/main `3957946`, #346). Grundlage: F-981 (Verbrauch je Lauf nicht begrenzt;
Halt-Regeln aus B2b-1a erledigt, offen: Budget je Arbeitspaket), F-978 (kein Umfangs-Abgleich), Entscheidungen
Challenger (Auftrag B2b-3c, nicht neu verhandelt). Nicht: Rückfrage-Kanal (B2b-3b), USD-Kosten, Abbruch mitten im Lauf;
keine Änderung an `.claude/`, `projekte.json`, `ressourcen.json`, `vorlagen/`, `.githooks`, `workflow-vorlagen/`,
`startvorlagen/`; `starteWorkflowSchritt(` bleibt 6×, F-228-Zählung (14 / 13) unverändert.

## 1 Budget-Defaults (abgeleitet)

Skript `features/F45/nachweise/b2b3c/budget-ableitung.mjs` (nur lesend, Lineage-Registry), Ergebnis
`features/F45/nachweise/b2b3c/budget-ableitung.json`. Je Ablauf alle `lauf_id` aller Versionen (Korrekturrunden
inklusive), `verbrauch` der Laufakten summiert (input + output + cache_read + cache_write), Vorlage aus dem
Router-Ergebnis (`vorlage`, angehoben wie `bestimmeEffektiveKontrolltiefe`), sonst aus den Schrittrollen; Läufe ohne
`verbrauch` zählen nicht (nie geschätzt). Median × 3, aufgerundet auf 100 000.

Grundlage: `kontrollzustand/` dieses Repos ergibt nur standard n = 3, hoch n = 1, fast-lane n = 0 — zu wenig für hoch
und fast-lane. Deshalb zusätzlich die realen Workforce-Läufe in den Fremdprojekten `haushaltsbuch2` und `haushaltsbuch`
(je eigenes `kontrollzustand/`); die Worktree-Kopien `aiw-f725-ws1a`/`aiw-main-ansicht` enthalten nur Duplikate (gleiche
Ablauf-Kennung, zählen einmal). Mindestens 3 Abläufe je Vorlage.

| Vorlage | Abläufe | Summen (Tokens) | Median | × 3, gerundet | Default |
|---|---|---|---|---|---|
| standard | 4 | 628 379 · 4 382 221 · 5 405 895 · 6 008 388 | 4 894 058 | 14 700 000 | **14 700 000** |
| hoch | 5 | 579 784 · 2 122 674 · 4 753 252 · 10 453 182 · 28 745 473 | 4 753 252 | 14 300 000 | **14 700 000** (Regel unten) |
| fast-lane | 0 | — | — | — | **5 300 000** (fester Wert, Finding) |

- **hoch ≥ standard (monoton):** hoch enthält alle Schritte von standard plus Architekt und Advisor; ein kleinerer
  Default wäre ein Artefakt der Stichprobe (der Median-Ablauf hoch hatte 2 gemessene von 5 Läufen weniger). Deshalb
  `hoch = max(14,3 Mio., standard)`.
- **fast-lane fest:** kein einziger gemessener fast-lane-Ablauf. fast-lane = genau ein Ausführungsschritt ⇒ Median der
  19 gemessenen Ausführungsläufe aller Abläufe (1 759 131) × 3 = 5 300 000. Neues Finding: neu kalibrieren, sobald
  ≥ 3 fast-lane-Abläufe gemessen sind (gleiches Skript).
- Auffällig: `cache_read` dominiert die Summen (Entscheidung: alle vier Felder zählen). Notiert im Finding.

## 2 Budget (Server)

**`src/budget/`** (neu, rein, typisiert, keine I/O; `index.ts`, `types.ts`, `budget.test.ts`):
- `BUDGET_DEFAULTS` (fast-lane 5 300 000, standard 14 700 000, hoch 14 700 000) mit Verweis auf §1.
- `tokensDesVerbrauchs(v)` → Summe der vier Felder oder `null` (fehlend/ungültig).
- `kontrolltiefeAusSchritten(schritte)` → Rückfall ohne Router-Ergebnis (architekt/advisor ⇒ hoch, code-reviewer ⇒
  standard, sonst fast-lane) — dieselbe Regel wie im Ableitungsskript.
- `bestimmeBudget(arbeitspaketTokens, kontrolltiefe)` → `{ tokens, quelle: 'arbeitspaket' | 'default' }`.
- `istUeberschritten(summe, budget)` = `summe > budget` (genau erreicht ist kein Halt).
- `baueBudgetHaltGrund(summe, budget)` → „Budget erreicht: X von Y Tokens — …“ (Server-Grund; die Oberfläche baut
  ihren Text selbst aus Zahlen, ohne Kennungen).
- `erhoehtesBudget(summe, schritt)` = `summe + schritt` (`schritt` = Default der Kontrolltiefe; immer > Summe).
- `wendeBudgetAn(naechster, stand)` → bei Überschreitung und `naechster.art ∈ { starte, haltFreigabe }`:
  `{ art: 'haltKlaerung', grund, aktiverSchrittId: naechster.aktiverSchrittId }` (Cursor auf dem Schritt, der laufen
  würde); sonst unverändert (Halt bleibt Halt, `fertig` bleibt `fertig`).

**Arbeitspaket (additiv):** `budget_tokens` (Integer ≥ 1, optional) in
`schemas/kontrollzustand-auftrag-payload.schema.json`, `validiereArbeitspaketFelder`, `optionenAusAuftrag`,
`registriereAuftrag`, `types.ts`. Löst keinen Arbeitspaket-Block aus (`traegtArbeitspaket` unverändert ⇒ Aufträge
bitgleich).

**Budget-Stand (I/O, `scripts/leitstand/budget-stand.mjs`, neu):** `ermittleBudgetStand(workflowId, workflowDaten,
ladeOptionen)` → `{ summe, gemessen, ohneMessung, tokens, quelle, kontrolltiefe, ueberschritten, schritt }`. Läufe =
alle `lauf_id` aus `listeVersionen('workflow-<id>')`; Kontrolltiefe aus `router-<auftrag_id>` (effektiv mit Herkunft),
sonst `kontrolltiefeAusSchritten`; Budget aus der neuesten Auftragsversion. Wirft nie (Fehler ⇒ `null`, protokolliert;
ohne Stand kein Halt — fail-open, weil ein Budget eine Verbrauchsgrenze ist, keine Sicherheitsgrenze).

**Prüfung nach jedem Schritt (kein neuer Schreiber):**
1. Nachlauf in `starteWorkflowSchritt` (bestehender Schreibvorgang mit Identitätsprüfung): `budgetStand` nach dem
   Registrieren der Laufakte, im Updater `naechster = wendeBudgetAn(…)` in beiden Zweigen (normal und Plan-Rückweg).
   Damit startet keine Auto-Fortsetzung und keine Freigabe-Frage, der Ablauf steht auf KLAERUNG_ERFORDERLICH mit dem
   Budget-Grund; `fertig` bleibt `fertig` (nach dem letzten Schritt entsteht kein weiterer Verbrauch — die Abnahme zeigt
   die Überschreitung, Entscheidung zur Prüfung im Advisor-Pass).
2. Automatische Korrekturrunde (`wendeAutomatischeAnpassungAn`, bestehender Schreibvorgang): derselbe `wendeBudgetAn`
   auf ihren Ausgang ⇒ Neubau zurückgesetzt, Cursor auf der Ausführung, Halt mit Budget-Grund statt Freigabe-Frage.
   Gilt auch für Stefans „Anpassung wünschen“ (selbe Funktion).
3. Rückfallsicherung (nur Lesen): `starteWorkflowSchritt` — die eine Stelle jedes Startwegs, neben der
   Einrichtungsprüfung — lehnt bei Überschreitung ab (`konflikt`, Budget-Grund); POST …/freigabe (FREIGEGEBEN) prüft
   dasselbe VOR dem Festhalten (409 `art: 'budgetErreicht'`, Muster Einrichtung). So umgeht weder „Starten“ noch
   „Freigeben“ den Halt.

**Aktion „Budget erhöhen“ — POST `/api/workflows/<id>/budget`** (Body `{ aktion: 'erhoehen' }`):
- Vorbedingungen: kein aktiver Lauf (409), Ablauf vorhanden (404), Status KLAERUNG_ERFORDERLICH (409), Budget
  überschritten (409 „nicht erreicht“), Auftrag ladbar (404).
- Schreibt eine neue **Auftragsversion** mit `budget_tokens = erhoehtesBudget(summe, schritt)` über
  `registriereAuftrag` (Muster POST …/einrichtung). Bewusste Abweichung vom Wortlaut „im Ablauf“: das Budget gehört je
  Entscheidung zum Arbeitspaket, und ein neuer Workflow-Schreiber ist durch F-228 ausgeschlossen. Zählt nicht als
  Rückweg (berührt den Ablauf nicht; `max_replans` unverändert).
- Antwort 200 `{ workflowId, budget: <neuer Stand>, naechster: 'starte' | 'haltFreigabe' | … }`. Die Oberfläche ruft
  bei `starte` danach POST …/starten (Muster „Review wiederholen“); bei `haltFreigabe` zeigt sie die bestehende Freigabe.
- „Ablehnen“: bestehende Wege — Abnahme „Ablehnen“ (ABGELEHNT, KLAERUNG_ERFORDERLICH, sobald ein Bau gelaufen ist) bzw.
  „Stoppen“ im Ablauf-Detail. Kein neuer Ausweg.

**Projektion `budget`** (GET …/abnahme und GET /api/workflows/<id>): `{ summe, tokens, quelle, ueberschritten,
gemessen, ohneMessung, erhoehbar }`, `erhoehbar` = Status KLAERUNG_ERFORDERLICH ∧ überschritten. Im Detail wird
`naechster` bei Überschreitung über `wendeBudgetAn` gezeigt (keine Freigabe-Karte im Budget-Halt).

## 3 Umfangs-Abgleich

**`src/umfang/`** (neu, rein; `index.ts`, `umfang.test.ts`): `gleicheUmfangAb(dateien, bereiche)` → `null` ohne
`bereiche` (kein Abgleich), sonst `{ ausserhalb: string[] }`. Präfix-Abgleich auf Ordner/Module: Bereich normalisiert
(`\` → `/`, führendes `./`, abschließendes `/`, `/**`, `/*` weg); Treffer = `pfad === b` oder `pfad` beginnt mit
`b + '/'`. Geprüft werden `pfad` und bei Umbenennung `alter_pfad`; Ergebnis sortiert, eindeutig. `baueUmfangsZeile`
für den Review.

- Quelle: Änderungsübersicht des Ausführungsschritts (`aenderungsuebersicht-<lauf_id>`), `bereiche` der neuesten
  Auftragsversion. Zur Lesezeit berechnet, nichts persistiert.
- Treffer ⇒ nur Hinweis, nie Halt.
- Review: eine zusätzliche Zeile im Auftrag des code-reviewer-Schritts, NACH dem Policy-Block (der Auftrag vor der Karte
  bleibt bitgleich, Gate f45-b2a2 (b)); ohne Treffer kein Text.
- Projektion `umfang` in GET …/abnahme und GET /api/workflows/<id>: `{ status: 'kein_abgleich' | 'ok' |
  'keine_uebersicht', ausserhalb }`.

## 4 Anzeige

- Abnahme (`views/workflow-abnahme.js`) und Ablauf-Detail (`views/workflows.js`/`workflow-detail.js`): Zeile
  „Verbrauch: X von Y Tokens“ (Zahlen nach Sprache formatiert; amber bei Überschreitung; „ohne Messung: n Läufe“ nur
  wenn > 0), Umfangs-Hinweis „Außerhalb der vorgesehenen Bereiche geändert:“ mit Dateiliste (Pfade sind Inhalt, keine
  Kennungen).
- Halt-Notiz bei `erhoehbar`: „Budget erreicht: X von Y Tokens.“ + Satz zum Ausweg + Knopf „Budget erhöhen“ (primär) →
  POST …/budget, bei `starte` POST …/starten; Fehler sichtbar.
- i18n de/en/ru/tr (Plural ru), keine Feldnamen/Kennungen. Kein neues Token, keine neue Farbe.

## 5 Gate `scripts/check-f45-b2b3c-budget-umfang.mjs` (neu, in `check:gates`)

Muster `check-f45-b2b2-pruefer.mjs` (echter HTTP-Testserver, gestubbter Worker mit real registrierten Laufakten samt
`verbrauch`):
- (b1) Budget überschritten nach dem Ausführungslauf ⇒ KLAERUNG_ERFORDERLICH mit Budget-Grund, Review startet nicht,
  Cursor auf dem Review; GET …/abnahme `budget.ueberschritten`/`erhoehbar`.
- (b2) POST …/starten im Budget-Halt ⇒ 409, kein Lauf; POST …/freigabe ⇒ 409, nichts festgehalten.
- (b3) POST …/budget ⇒ neue Auftragsversion mit `budget_tokens`, danach …/starten ⇒ Review läuft, ABGESCHLOSSEN;
  keine Kern-Abnahme-Version (kein Rückweg).
- (b4) Arbeitspaket ohne `budget_tokens` ⇒ Default der Kontrolltiefe (`quelle: 'default'`, Zahl = `BUDGET_DEFAULTS`).
- (b5) Halt am Ende (`fertig`) nicht; Korrekturrunde bei Überschreitung ⇒ Halt mit Budget-Grund statt Freigabe.
- (u1) Datei außerhalb `bereiche` ⇒ `umfang.ausserhalb`, kein Halt, Review-Auftrag mit der Zeile.
- (u2) ohne `bereiche` ⇒ `kein_abgleich`, Review-Auftrag ohne Zeile.
- (f) `starteWorkflowSchritt(` 6×, Schreiber-Zählung 14 / 13 (Quelltext).

## 6 Render-Nachweis `features/F45/nachweise/b2b3c/`

Testinstanz mit Attrappe (`scripts/render-nachweis.mjs`-Muster): Lagen Budget-Halt mit Knopf; Abnahme mit
Umfangs-Hinweis. Ansichten de 1440 dunkel, de 1440 hell, de 390, ru 390 hell, de 1440 200 %; `scrollWidth` je
Ansicht; Klicktabelle. Danach design-guardian.

## 7 Akzeptanz

- Unit-Tests `src/budget`, `src/umfang`, Auftrag (`budget_tokens`), Abnahme-View rot → grün.
- Gate (b1)–(b5), (u1), (u2), (f) grün; `npm run check:gates`, `npm run check` grün (oder Speicherabbruch gemeldet).
- code-reviewer, qa, design-guardian; höchstens eine Korrekturrunde.

## 8 Risiken

- Poll-Last: GET …/abnahme und Ablauf-Detail lesen je Abfrage alle Versionen und Laufakten des Ablaufs (typisch
  4–10). Bei Bedarf Zwischenspeicher je `versionSequenz` (wie `standCache`).
- Bereiche als Prosa (kein Pfad) ⇒ jede Datei „außerhalb“ — nur ein Hinweis; Finding, falls beobachtet.
- Stichprobe klein (n = 4/5/0); Defaults neu kalibrieren (Finding).
- Grund-Text des Workflows bleibt nach „Budget erhöhen“ bis zum nächsten Start stehen (kein Schreiber); die Oberfläche
  zeigt den Halt aus der Projektion, nicht aus dem Grund.

## 9 Zuschnitt und Schätzung

≈ 0,75–1 AT (Server ≈ 0,4, Gate ≈ 0,2, Oberfläche + Render ≈ 0,25). Trennlinie, falls zu groß: Umfangs-Abgleich (§3,
Gate (u1)/(u2), Hinweis in der Anzeige) als eigener Bau B2b-3d.
