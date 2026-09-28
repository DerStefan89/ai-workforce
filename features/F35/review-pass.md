# F35 — Review-Pass vor FEATURE_GATE

Unabhängiger Review-Pass, ein Subagent (`code-reviewer`), frischer Kontext,
read-only (Read/Grep/Glob), 28.09.2026. Branch `docs/f35-reallauf-nachweis`
(von `main` nach #265, Commit `a96597c`). Neutraler Auftrag ohne
Bewertungsvorgabe (F-665), wörtlich:

> Prüfe features/F35/feature.md (Akzeptanzkriterien und Workstreams) gegen
> den Code auf diesem Stand und gegen features/F35/nachweis-reallauf.md.
> Welche AK sind durch Code, Gates und Reallauf belegt, welche nicht, welche
> nur teilweise? Nenne Lücken mit Fundstelle. Urteil nach
> .claude/skills/advisor-pass (lies die Skill-Datei für Urteilsstufen und
> Evidenz-Marker).

Das Ergebnis steht unten wörtlich und ungeglättet. Zeilenangaben beziehen
sich auf den Stand zum Zeitpunkt des Passes. Von V10 hat derselbe Branch
danach den Akte-Status und `docs/STATUS.md` nachgezogen. Der Stand von
F-728/F-729 in `state/findings.md` liegt außerhalb dieses Vertrags und
bleibt offen.

---

# Code Review: F35 „Feature bauen aus Akte“, Abgleich der AK gegen Code, Gates und Reallauf

## Geprüft

- **Soll:** `features/F35/feature.md` mit AK1–AK23 und den Workstreams WS-1 bis WS-3.
- **Code, Stand main nach #265:**
  - `src/feature-auftrag/index.ts`
  - `src/auftrag/index.ts`
  - `schemas/kontrollzustand-auftrag-payload.schema.json`
  - `src/router/index.ts`
  - `scripts/leitstand/routen-f35.mjs`
  - `scripts/leitstand-server.mjs`, Ausschnitte: Route, `pruefeAuftragsformular`, `starteWorkflowSchritt`-Rückruf, `wendeAutomatischeAnpassungAn`, GET/POST `.../abnahme`
  - `src/ak-pruefung/index.ts`
  - `schemas/ergebnis-code-reviewer.schema.json`
  - `src/workflow/index.ts` (Regel 1i)
  - `scripts/leitstand/f35-ws3-adjust-automatik.mjs`
  - `public/leitstand/views/workboard.js`, `public/leitstand/views/workflows.js`, `public/leitstand/api.js`
  - `public/leitstand/auftrag-aus-projektentwurf.js`
- **Gates und Tests:**
  - `scripts/check-f35-ws1-feature-auftrag.mjs`, `check-f35-ws2-urteil-je-ak.mjs`, `check-f35-ws3-adjust-automatik.mjs` (alle drei laut `package.json` in `npm run check`)
  - `src/feature-auftrag/feature-auftrag.test.ts`, `src/ak-pruefung/ak-pruefung.test.ts`, `src/auftrag/auftrag.test.ts`
  - `src/workflow/workflow.test.ts` (Regel 1i)
  - `scripts/leitstand/f35-ws3-adjust-automatik.test.mjs`
- **Nachweis:** `features/F35/nachweis-reallauf.md`
- **Kontext:** `docs/STATUS.md`, `state/findings.md` (F-728, F-729, F-732, F-762 bis F-768), `state/tasks/f35-reallauf-nachweis.md`

**Wo meine Prüfung endet:**
- Ich hatte nur Lesezugriff (Read/Grep/Glob), kein Bash und kein Git.
- `npm run check`, `check-feature`, das F-639-Gate und `check-f23-abnahme` habe ich **nicht ausgeführt**. Deren Grün-Status ist hier nicht bestätigt.
- Den Kontrollzustand von `haushaltsbuch2` habe ich nicht gegengelesen. Die Reallauf-Fakten stammen ungeprüft aus dem Nachweis `[Annahme]`.
- Die Oberfläche habe ich nicht im Browser gesehen.

**Marker:**
- `[Fakt]` im Code oder in der Datei belegt
- `[Schlussfolgerung]` aus Fakten abgeleitet
- `[Annahme]` unbelegte Prämisse
- `[offene Unsicherheit]` weder belegt noch widerlegt
- `[Fakt, entlastend]` geprüft und in Ordnung

## Ergebnis

- [ ] Freigegeben / [x] Nicht vollständig freigegeben

Der Übergang auf FEATURE_GATE ist mit Hinweisen vertretbar. **Für die Abnahme (ABGESCHLOSSEN) ist F35 noch nicht reif**, weil AK18 im Code in einem Fall widersprochen wird (siehe K1).

## Einordnung je AK

Legende: **belegt** = Code und Gate/Test tragen das AK · **teilweise** = nur Code oder nur ein Teil des AK geprüft · **nicht bestätigbar** = geht nur durch Ausführung · **widersprochen** = Code weicht vom AK ab

| AK | Einordnung | Code | Gate/Test | Reallauf | Lücke |
|---|---|---|---|---|---|
| AK1 | **teilweise** | – | `check-feature` nicht ausgeführt | – | Die Nicht-Ziele passen nicht mehr zum Schnitt WS-1..3 (V1). |
| AK2 | **belegt, mit Hinweis** | `src/auftrag/index.ts:21,125-199`, Formular-Allowlist `leitstand-server.mjs:1729` | `auftrag.test.ts:54-97`, WS1-Gate (e) | Z1 | `herkunft.art 'feature_akte'` ist über `POST /api/auftraege` weiter setzbar (V6). |
| AK3 | **belegt** | `src/feature-auftrag/index.ts:115-164` | `feature-auftrag.test.ts:39-103`, WS1-Gate (a)/(b)/(b2) | Z1 (AK1–AK3 mit expliziten IDs) | – |
| AK4 | **belegt, mit Hinweis** | `routen-f35.mjs:47-110`, Route `leitstand-server.mjs:5733-5747` | WS1-Gate (a)/(c)/(d) mit Fremdprojekt als repoWurzel | implizit (Auftrag `8b138eac` in haushaltsbuch2) | Der Präfixpfad `/api/projekte/<id>/…` ist nicht im Gate (V2). |
| AK5 | **belegt** | `src/router/index.ts:64,235-242`, Aufruf `leitstand-server.mjs:3061` | WS1-Gate (f) | neutral: Router wählte selbst `hoch` | Die Untergrenze wurde real nicht ausgelöst. |
| AK6 | **teilweise** | `workboard.js:306-312,404-422,528-534`, `api.js:101`, serverseitige Statusgrenze `routen-f35.mjs:37,76-80` | kein Gate für den Knopf; „Akte unverändert“ nirgends geprüft | nicht ausdrücklich beschrieben | Kein Render-Nachweis (K2), keine Vorher/Nachher-Prüfung der Akte (V3). |
| AK7 | **belegt, mit Hinweis** | – | WS1-Gate: echter HTTP-Server, Fremdprojekt, Grün- und Rot-Fälle | – | Das Gate ruft `erzeugeRequestHandler` direkt, nicht den Multiprojekt-Dispatcher (V2). |
| AK8 | **nicht bestätigbar** | – | – | – | Nur durch Ausführung belegbar. F-762 (flakiges CI) ist offen. |
| AK9 | **belegt, Gate-Lauf nicht bestätigt** | Schema `:8,42-66` (required, additionalProperties:false) | `check-fix-f639-schema-strict-modus.mjs` in der Kette | Z5: codex `--output-schema` liefert `ak_urteile` | – |
| AK10 | **belegt** | `src/ak-pruefung/index.ts:62-100` | `ak-pruefung.test.ts:16-69` | – | – |
| AK11 | **belegt** | `leitstand-server.mjs:4512-4514`, `ak-pruefung/index.ts:112-130` | WS2-Gate (a) und (e) bitgenau | Z5 | – |
| AK12 | **teilweise** | `src/workflow/index.ts:842-845` | nur `workflow.test.ts:498-512` | nicht beobachtet: Regel 1b hatte Vorrang | Das WS2-Gate prüft den 1i-Grund nicht mehr (V4). |
| AK13 | **teilweise** | `workflows.js:330-340,356`, Projektion `leitstand-server.mjs:5424` | kein Gate, kein Render-Nachweis | im Nachweis nicht erwähnt | K2 |
| AK14 | **belegt** | `feature-auftrag/index.ts:70-97`, Vorgabe `auftrag-aus-projektentwurf.js:147-148` | `feature-auftrag.test.ts:115-163` | Z1 (`- AK<n>:`-Format) | – |
| AK15 | **belegt, mit Hinweis** | – | WS2-Gate (a)–(e) über echten HTTP-Rundlauf | – | (b)/(c) prüfen inzwischen WS-3-Verhalten; veraltete Kommentare (V4). |
| AK16 | **nicht bestätigbar** | – | – | – | wie AK8 |
| AK17 | **belegt, Gate-Lauf nicht bestätigt** | eine Funktion `leitstand-server.mjs:3735`, zwei Aufrufer `:5088` (`'kern'`) und `:8106` (`'mensch'`) | WS3-Gate (f), `check-f23-abnahme` in der Kette | Z6 (Version 3 `mensch`) | „bitgenau unverändert“ belegt nur ein grünes f23-Gate. |
| AK18 | **widersprochen in einem Fall** | `f35-ws3-adjust-automatik.mjs:98-117`, `leitstand-server.mjs:5083-5095` | Unit-Tests und WS3-Gate (e) nur ohne AK-Verstöße | nicht berührt | K1 |
| AK19 | **belegt, inhaltlich mit Befund** | `wendeAutomatischeAnpassungAn` schreibt dieselbe Form, erzeuger nur in der Herkunft | WS3-Gate (a)/(b) | Z6 | F-765: Die Korrekturschleife stellt Kern-Entscheidungen als menschliche dar (V5). |
| AK20 | **belegt** | `leitstand-server.mjs:5062-5096` (Hook startet nie selbst) | WS3-Gate (a)/(b) | Z6: Versionen 15 und 26 `WARTET_FREIGABE`, Start erst nach menschlicher Freigabe | – |
| AK21 | **belegt** | `f35-ws3-adjust-automatik.mjs:37,54-56,113-115` | WS3-Gate (d), Unit-Tests `:80-85` | nur 2 von 3 Anpassungen genutzt | – |
| AK22 | **teilweise** | GET `leitstand-server.mjs:5472-5473`, Anzeige `workflows.js:391-394,401,407` | WS3-Gate (a) nur für GET | im Nachweis nicht erwähnt | Oberfläche ohne Render-Nachweis (K2); irreführende Rahmung (V7). |
| AK23 | **belegt, Gate-Lauf nicht bestätigt** | – | WS3-Gate (a)–(f) | – | Teil „`npm run check` grün“ wie AK8 |

**Zusammenfassung:**
- **Belegt, ganz oder mit Hinweis:** AK2, 3, 4, 5, 7, 9, 10, 11, 14, 15, 17, 19, 20, 21, 23.
- **Teilweise:** AK1, 6, 12, 13, 22.
- **Widersprochen in einem Fall:** AK18.
- **Nur durch Ausführung bestätigbar:** AK8 und AK16, dazu die Gate-Läufe hinter AK9, 17 und 23.

## Kritische Probleme (vor der Abnahme zu beheben oder als Bekannte Grenze festzuhalten)

**K1. AK18 ist verletzt: Fehlt das Review-Urteil, legt der Kern trotzdem automatisch eine Anpassung an, sobald der Auftrag AK trägt** `[Schlussfolgerung aus Fakten]`

Die Kette im Code:
- `leseUrteilAusLaufakte` gibt `null` zurück, wenn kein lesbares `urteil` vorliegt (`scripts/leitstand-server.mjs:3150-3154`).
- Daraus wird `ak_urteile ?? []`, und `pruefeAkUrteile` meldet dann für jedes AK „hat kein Urteil“ (`leitstand-server.mjs:4739-4740`, `src/ak-pruefung/index.ts:93-97`).
- `ermittleAutomatischeAnpassung` löst bei `hatAkVerstoesse` aus, ganz gleich wie das Urteil lautet (`scripts/leitstand/f35-ws3-adjust-automatik.mjs:108-116`).

Die Folge:
- Ein Review-Lauf, der ERFOLGREICH endet, aber keine lesbare Ausgabe hat, erzeugt bei einem Feature-Akte-Auftrag eine Kern-Anpassung mit der Begründung „nach Review-Urteil unbekannt“.
- Dasselbe gilt für ein Urteil außerhalb der Wertemenge, sobald ein AK nicht ERFUELLT ist.
- AK18 verlangt ausdrücklich: „fehlendes/unbekanntes Urteil … bleibt beim Menschen“.

Warum die Tests das nicht finden:
- WS3-Gate (e) umgeht den Fall bewusst mit vollständigen ERFUELLT-`ak_urteile` (`scripts/check-f35-ws3-adjust-automatik.mjs:407-420`).
- Die Unit-Tests haben keinen Fall „urteil null + AK-Verstöße“ (`f35-ws3-adjust-automatik.test.mjs:50-85`).

Was die Wirkung begrenzt `[Fakt, entlastend]`: Der Start bleibt an `ZWINGEND` gebunden, der Kern startet nichts selbst. Trotzdem:
- Der Halt-Grund aus Regel 1b wird durch `WARTET_FREIGABE` überschrieben.
- Die nächste Ausführung bekommt die Begründung als menschliche Entscheidung vorgelegt (F-765).

Wie oft der Fall real auftritt, ist offen `[offene Unsicherheit]`. Bei codex mit `--output-schema` ist er unwahrscheinlich, bei Workern ohne Schema-Zwang wahrscheinlicher.

**K2. Drei UI-AK haben keinen Render-Nachweis (DoD, F-622)** `[Fakt]`

- Betroffen sind AK6 („Bauen“-Knopf), AK13 (Tabelle AK · Urteil · Beleg) und der UI-Teil von AK22 (Hinweis „Automatisch angelegt“).
- `features/F35/` enthält nur `feature.md` und `nachweis-reallauf.md`.
- `scripts/render-nachweis.mjs` ist ein generisches Werkzeug ohne F35-Klickfolge.
- Der Reallauf-Nachweis beschreibt keine Beobachtung in der Oberfläche, nur Artefakte und Rohströme.
- Nach CLAUDE.md-DoD ist das eine Pflicht vor der Übergabe an Stefan.

## Verbesserungen (sollten behoben werden)

**V1. Die Nicht-Ziele der Akte widersprechen dem eigenen Schnitt** `[Fakt]`
- `features/F35/feature.md:37-41` führt „Reviewer-Schema und Urteil je AK (WS-2)“ und „ADJUST-Automatik (WS-3)“ als Nicht-Ziele.
- `:47` nennt WS-1 „(dieser Auftrag)“.
- `:64-109` und AK9–AK23 verlangen genau diese Workstreams.
- Würde die Akte selbst über `baueAuftragAusFeatureAkte` gebaut, verlangte `baueAkPruefInstruktion` für WS-2/WS-3-Code Befunde mit `schwere HOCH` `[Schlussfolgerung]`.
- AK1 („hält … die Nicht-Ziele fest“) ist deshalb nur teilweise erfüllt.

**V2. Das Gate prüft den Präfixpfad nicht** `[Fakt]`
- WS1-Gate `check-f35-ws1-feature-auftrag.mjs:157-162` ruft `/api/features/<id>/auftrag` direkt auf dem Handler auf.
- Der Weg, den die Oberfläche nutzt (`api.js:101` `mitPraefix` über `erzeugeMultiProjektDispatcher`), bleibt ungeprüft.
- Der Reallauf belegt ihn nur implizit, der Nachweis nennt weder Pfad noch Knopf.

**V3. AK6 „Akte bleibt unverändert“ ist nirgends als Prüfung festgehalten**
- `[Fakt, entlastend]` Die Route liest nur (`routen-f35.mjs:75`).
- `[Fakt]` Kein Gate vergleicht die Akte vor und nach dem Aufruf.
- `[Fakt]` Im Reallauf hat die Ausführung in Iteration 1 die Akte in haushaltsbuch2 geändert (`nachweis-reallauf.md:36`). Das ist erlaubt („bestehende Wege“, `feature.md:42-44`), aber im Nachweis nicht vom Routenverhalten getrennt.

**V4. Regel 1i (AK12) ist nur auf Unit-Ebene belegt; im WS2-Gate stehen veraltete Kommentare** `[Fakt]`
- WS2-Gate (b)/(c) prüfen seit WS-3 das Kern-Abnahme-Artefakt statt des Halt-Grunds (`check-f35-ws2-urteil-je-ak.mjs:261-305`).
- Im Reallauf hatte Regel 1b Vorrang (BLOCKIERT), belegt durch `workflow.test.ts:542`.
- Die Kommentare `:123`, `:237-243` und `:262-267` sprechen von „beide AUTOMATISCH / bleibt LAEUFT“, die Fixture setzt aber `freigabe: 'ZWINGEND'` (`:146`).

**V5. F-765 gehört als Bekannte Grenze zu AK19** `[Fakt]`
- AK19 ist wörtlich erfüllt.
- Genau diese Eigenschaft („liest nie `herkunft.erzeuger`“) führt dazu, dass `src/korrekturschleife/index.ts:50,86` Kern-Entscheidungen als menschliche darstellen.
- In `feature.md` „Bekannte Grenzen“ steht davon noch nichts.

**V6. `herkunft.art 'feature_akte'` ist über das Formular fälschbar** `[Fakt]`
- `ERLAUBTE_AUFTRAG_FELDER` enthält `herkunft` (`leitstand-server.mjs:1729`).
- `HERKUNFT_ARTEN` enthält `feature_akte` (`src/auftrag/index.ts:21`).
- Ein manueller Auftrag kann sich damit als Akte-Auftrag ausgeben, ohne AK zu tragen. Die direkte Wirkung ist harmlos (nur eine höhere Untergrenze), aber die Herkunftsangabe verliert ihre Aussagekraft.
- AK2 („lehnt die neuen Felder ab“) deckt nur `akzeptanzkriterien`/`nicht_ziele` ab.

**V7. Der Kern-Hinweis erscheint unter einer irreführenden Überschrift** `[Schlussfolgerung]`, im Browser nicht geprüft
- Nach der automatischen Anpassung ist `lauf_id` der Ausführung `null`. Die Projektion steht deshalb sofort auf `'veraltet'` (`leitstand-server.mjs:5466`).
- Der Hinweis erscheint dann unter „Vorherige Entscheidung (bezieht sich auf eine frühere Fassung)“ (`workflows.js:405-407`).

**V8. Fehlerfall ohne Logging** `[Fakt]`
- `routen-f35.mjs:106-108` gibt bei einem Registrierungsfehler 500 zurück, ohne `console.error`.
- Das Muster in `/api/auftraege` loggt (`leitstand-server.mjs:5720`). DoD: „catch + Logging“.

**V9. Veraltete oder verschobene Kommentare** `[Fakt]`
- `leitstand-server.mjs:8097` verortet `wendeAutomatischeAnpassungAn` in `f35-ws3-adjust-automatik.mjs`, tatsächlich liegt sie in `leitstand-server.mjs:3735`.
- Das JSDoc von `renderAbnahmeEntscheidung` (`workflows.js:359-388`) steht jetzt über `formatiereAutomatischeAnpassungHinweis`.

**V10. Doku widerspricht sich; muss vor dem Commit angeglichen werden (Vertragsschritte 3, 4 und 5 sind noch offen)** `[Fakt]`
- `feature.md:10` sagt `Status: IN_ARBEIT`, `nachweis-reallauf.md:41` sagt „F35 steht auf `FEATURE_GATE`“.
- `docs/STATUS.md:77` und `:524-529` führen F35 als „noch nicht begonnen“ und mit altem Zuschnitt („Challenge-Flow“, qa-Schritt, Befund-Projektion).
- `state/findings.md:10124,10133` führen F-728 und F-729 noch als „in Arbeit“.

**V11. Der Nachweis ordnet Z1–Z7 keinen AK zu** `[Fakt]`
- Der Nachweis sagt das selbst (`nachweis-reallauf.md:29-30`).
- Die Zuordnung in der Tabelle oben ist meine Ableitung und keine Aussage des Nachweises.

**V12. Unversionierte Dateien im Arbeitsbaum** `[offene Unsicherheit]`
- `stdin-check.js` im Repo-Wurzelverzeichnis und `state/nachweis-runde2-*` sind ungetrackt.
- Ob Biome oder das Doku-Gate sie lokal erfasst und `npm run check` dadurch abweicht, konnte ich ohne Ausführung nicht klären.
- Gezielt stagen, kein `-A`.

## Was geprüft und in Ordnung war

- `[Fakt, entlastend]` `baueAuftragAusFeatureAkte` hat kein I/O, keine Zeit- und keine Zufallskomponente. Doppelte IDs führen zur Ablehnung statt zu stillem Überschreiben (`feature-auftrag/index.ts:132-139`).
- `[Fakt, entlastend]` Die Route ist gegen Pfadausbruch doppelt geschützt: ID-Muster plus Präfixvergleich (`routen-f35.mjs:47-52,66-73`). Die Statusgrenze gilt auch serverseitig (`:76-80`, Gate b3). Eine zweite, unabhängige Schemaprüfung steht vor der Registrierung (`:92-96`).
- `[Fakt, entlastend]` Die AK-Prüfung schlägt im Zweifel fehl: Eine fehlende Laufakte oder nicht lesbare `ak_urteile` erzeugen Verstöße und halten den Workflow an (`leitstand-server.mjs:4737-4742`). Ohne AK am Auftrag bleibt das Alt-Verhalten bitgenau erhalten (WS2-Gate e).
- `[Fakt, entlastend]` Der Automat startet strukturell nichts selbst (`leitstand-server.mjs:5062-5096`). Der Reallauf bestätigt das zweimal (Z6).
- `[Fakt, entlastend]` Die Grenze von 3 wird vor dem Schreiben gezählt. Auslöser und GET-Projektion nutzen dieselbe Zählfunktion (`zaehleKernVersionen`), es gibt keinen zweiten Regelsatz.
- `[Fakt, entlastend]` Das Schema `ak_urteile` hat an allen Stellen `additionalProperties:false` und `required`. Der Reallauf-Review über codex mit `--output-schema` hat es angenommen (Z5).
- `[Fakt, entlastend]` Die Oberfläche maskiert alle Ausgaben mit `escapeHtml`. Der „Bauen“-Knopf nutzt denselben Zustandsautomaten wie Finding-Click-to-Work.

## Status

- [ ] Freigegeben
- [x] Freigegeben mit Hinweisen, für den Übergang auf **FEATURE_GATE**
- [ ] Nicht freigegeben
- [ ] Blockiert

**Begründung, nach Schwere sortiert:**
- K1 ist eine echte Abweichung von AK18. Sie ist aber nicht autonom schädlich, weil jeder Start die menschliche Freigabe braucht.
- K2 ist eine DoD-Lücke bei drei UI-AK.
- Beides muss **vor der Abnahme (ABGESCHLOSSEN)** entweder behoben oder bewusst als Bekannte Grenze entschieden sein.
- V10 (Status-, STATUS.md- und Findings-Stand) gehört **vor den Commit** dieses Nachweis-Branches.
- V1–V9, V11 und V12 können mitlaufen.
- AK8 und AK16 sowie die Gate-Läufe hinter AK9, 17 und 23 sind erst mit einem grünen `npm run check` belegt. Das konnte ich hier nicht bestätigen.

Hinweis für den Auftraggeber: Laut ESCALATE-Klausel in `state/tasks/f35-reallauf-nachweis.md:46` ist zu entscheiden, ob AK18 (teilweise widersprochen) als „für FEATURE_GATE zwingend“ gilt.

## Nächster sinnvoller Schritt

1. Stefan entscheidet zu K1: Entweder löst `ermittleAutomatischeAnpassung` nur aus, wenn das Urteil bekannt ist (`urteil` ∈ {BEREIT, BEREIT_NACH_KORREKTUR, BLOCKIERT}); dazu ein Unit-Test und ein Rot-Fall „urteil fehlt + AK“ im WS3-Gate. Oder der Fall wird als Bekannte Grenze in `feature.md` eingetragen.
2. Im selben Branch V10 angleichen: `feature.md` auf FEATURE_GATE setzen, Bekannte Grenzen um K1, K2, V1 und F-765 ergänzen, `docs/STATUS.md` und F-728/F-729 aktualisieren. Dann `npm run check` ausführen.
3. Vor der Abnahme einen Render-Nachweis mit `npm run render-nachweis` für „Bauen“, die AK-Tabelle und den Kern-Hinweis erstellen (K2).
