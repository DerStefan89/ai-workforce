# Advisor-Findings — F42 Projekt-Harness WS-1

## Kopf

**Geprüfter Plan:** `state/plan-v1-f42-projekt-harness-ws1.md` (330 Zeilen, vollständig gelesen).

**Gegengeprüft gegen:**
- `features/F41/feature.md` (vollständig)
- `src/projekt-anlegen/index.ts` (vollständig, 378 Zeilen)
- `src/product-coach/index.ts:590-720` (`baueAuftragAusProjektentwurf`)
- `public/leitstand/auftrag-aus-projektentwurf.js` (vollständig, Browser-Kopie)
- `scripts/leitstand-server.mjs:4743-4855` (POST /api/projekte), `:5070-5119` (GET /api/zustand)
- `scripts/check-docs.mjs` (Root-Fassung, vollständig, 339 Zeilen)
- `scripts/check-f34-product-coach.mjs` (Grep auf Prüfung (q))
- `schemas/startvorlage.schema.json` (vollständig)
- `src/startvorlage/index.ts:40-135` (`validiereStartvorlageDaten`, `GESPERRTE_STARTZIEL_ENDUNGEN`)
- `src/pruefschritt/index.ts` (vollständig, `fuehrePruefungDurch`)
- `src/claude-code-gateway/prozessstart.ts:1-30, 150-230` (Kopfkommentar, `execFile`/`spawn`-Mechanik)
- `startvorlagen/ai-workforce.json` (reale, produktive `pruefbefehl`-Konfiguration)
- `public/leitstand/views/chat.js:196-203, 319, 356-367, 600-660, 700-702, 1300-1321`
- `state/findings.md` F-667, F-673, F-690, F-691-698 (Volltext), Suche nach F-702 (repoweit)
- `docs/projekt/zielfassung.md` Zeile 1, §13.6 Meilenstein 5
- `package.json` (Scripts `check`/`check:template`)
- `features/F42/` (Existenzprüfung), `state/gates.md` (Strukturprüfung)

**Rollengrenze:** Advisor, kein Reviewer — prüft den PLAN vor dem Bau, nicht fertigen Code. Ausschließlich Lese-/Suchrechte (Read, Grep, Glob), keine Schreibrechte.

## Marker-Legende
- **[Fakt]** — direkt im Code/Repo belegt, Datei:Zeile genannt.
- **[Fakt, entlastend]** — direkt belegt UND spricht für den Plan.
- **[Schlussfolgerung]** — aus mehreren Fakten abgeleitet, nicht selbst ausgeführt/gemessen.
- **[Annahme]** — vom Plan oder Advisor übernommene, nicht selbst verifizierte Prämisse.
- **[offene Unsicherheit]** — mit Read/Grep/Glob nicht auflösbar.

---

## Findings

### F1 — [Fakt] Abschnitt 4: `pruefbefehl = ['npm', 'run', 'check:template']` verwendet einen bloßen Kommandonamen statt eines absoluten Programmpfads — widerspricht real gemessenem Windows-Verhalten und dem etablierten Muster

1. **[Fakt]** `starteProzess` (`src/claude-code-gateway/prozessstart.ts:7-9`) ruft ausschließlich `execFile`/`spawn` ohne Shell auf.
2. **[Fakt]** Kopfkommentar derselben Datei (`:14-20`) dokumentiert einen real gemessenen Windows-Befund: `execFile('claude', …)` löst unter Windows nur auf `claude.cmd` auf — ohne dauerhafte Anpassung nicht direkt ausführbar. `npm` löst identisch auf `npm.cmd` auf — dieselbe Fehlerklasse.
3. **[Fakt]** Die produktive `pruefbefehl`-Konfiguration `startvorlagen/ai-workforce.json:10` umgeht das bewusst über absolute Pfade (`node.exe` + `npm-cli.js`) — genau das Muster, von dem Abschnitt 4 ohne Begründung abweicht.
4. **[Fakt]** `validiereStartvorlageDaten` (`src/startvorlage/index.ts:105-114`, `GESPERRTE_STARTZIEL_ENDUNGEN` Zeile 132) prüft nur, ob `pruefbefehl[0]` auf `.cmd`/`.bat`/`.ps1` **endet** — `'npm'` besteht diese Prüfung, obwohl es zur Laufzeit auf `npm.cmd` auflöst.

**[Schlussfolgerung]** Auf Windows wirft `execFile('npm', …)` mit hoher Wahrscheinlichkeit `ENOENT`. `fuehrePruefungDurch` liefert dann `ergebnis: 'FEHLER'`, nicht `GRUEN`/`ROT` — der Abschnitt löst sein eigenes Ziel (F-667 beheben) nicht.

**Zusatzbefund:** Die geplante Probe (Abschnitt 8, manuelles `cd` + `npm run check:template` in einer Shell) prüft NICHT denselben Codepfad wie `starteProzess`/`execFile` ohne Shell — würde grün laufen, obwohl F1 bestehen bleibt. Gate (c) prüft nur, dass das Feld gesetzt ist, nicht ob es real funktioniert.

### F2 — [Fakt, entlastend] Offener Punkt 1 (check-docs.mjs-Identität) bestätigt sich für die Root-Fassung

Root-`scripts/check-docs.mjs` vollständig gelesen: Prüfung 1 (Zeilen 44-60) scannt nur die feste `anweisungsDateien`-Liste, root-relativ. Prüfung 3/4 (Zeilen 201-204) rekursiert nur unter root-`docs/harness`/`state`. Prüfung 5 ist nicht rekursiv. `vorlagen/projekt-skelett/...` bleibt in allen Fällen außerhalb — **keine Gate-Ausnahme nötig**, Plan-Annahme bestätigt.

### F3 — [Fakt] Referenz auf `state/findings.md` F-702 zeigt auf einen zum Prüfzeitpunkt nicht existierenden Eintrag

`state/findings.md` endete zum Prüfzeitpunkt bei F-698. F-699–F-702 existierten nirgends im Repo. Plan-Abschnitt 9 sieht vor, sie neu anzulegen — Abschnitt 6 behandelt F-702 aber sprachlich als "fortzuschreibend". **[offene Unsicherheit]:** ob der Auftraggeber-Kontext die Nummern bereits vorab vergeben hat. Klarstellung vor dem Bau sinnvoll, damit Abschnitt 9 sie tatsächlich als Neuanlage schreibt.

### F4 — [Schlussfolgerung, entlastend] Offener Punkt 3: additives `/api/zustand`-Feld ist die risikoärmere Wahl gegenüber einem neuen Endpunkt

`chat.js` hält den zuletzt gepollten Zustand bereits modulweit (`letzterZustand`, Zeile 319/1314-1316). Ein zweiter eigener Poll-Timer für einen neuen Endpunkt wäre gegen das AK3-Gate von `check-f20-zustand-poll.mjs` ("genau ein `setInterval` in `public/leitstand/**`") riskant; `baueAuftragAusProjektentwurf` wird zudem synchron aufgerufen (Zeile 631-646/702) — ein On-Demand-Fetch würde diesen Pfad asynchron umbauen müssen. Empfehlung: Hauptvorschlag (additives Feld) bestätigen, Alternative verwerfen.

### F5 — [offene Unsicherheit] Offener Punkt 4 (harte Sperre vs. Warnung): technisch plausibel begründet, Scope-Frage gegen unsichtbaren Auftragstext nicht abschließend prüfbar

`POST /api/projekte` ruft `pruefeVolleStartfreigabeFuerRepo` direkt, nicht über `starteGateway` (`src/projekt-anlegen/index.ts:276-286`) — eine harte Sperre gegen KÜNFTIGE Läufe müsste an anderer Stelle ansetzen, stützt die Plan-Argumentation. Ob "harte Sperre" im (advisor-unsichtbaren) Auftragstext als Pflicht formuliert war, ist nicht prüfbar. Auflage: falls Anzeige-Lösung bestätigt wird, "keine harte Sperre" explizit als Nicht-Ziel in `features/F42/feature.md` festhalten (CLAUDE.md-Entscheidungsregel 5).

### F6 — [Annahme, offene Unsicherheit] Offener Punkt 2 (state-Whitelist-Umfang): Inhalt nicht direkt verifizierbar

Kein Zugriff auf den externen Template-Commit während dieser Prüfung. Risiko gering (reine Doku, additiv, Rückschnitt-Pfad vom Plan selbst benannt).

### F7 — [Fakt, entlastend] Mechanik der Skelett-Kopie und Kollisionsfreiheit zu `kopiereBaseline` bestätigt

Keine Pfadüberlappung zwischen `kopiereBaseline`-Zielen und der Skelett-Whitelist. Einfügestelle (`scripts/leitstand-server.mjs:4799-4802`) und Aufrufreihenfolge stimmen mit dem Plan überein. `NeueStartvorlageEckdaten` ist unabhängig von `pruefbefehl`. `schemas/startvorlage.schema.json:42-52` trägt `pruefbefehl`/`pruefZeitgrenzeMs` bereits optional — kein Schema-Umbau nötig.

### F8 — [Fakt, entlastend] Server-/Browser-Kopien von `baueAuftragAusProjektentwurf` sind aktuell bytegenau identisch

Additive dritte Parameter (`kontext?`) sind mechanisch sauber möglich, ohne bestehende Aufrufer zu brechen.

### F9 — [Fakt, entlastend] Zielfassung-Versionsstand passt zur geplanten Doku-Änderung

`docs/projekt/zielfassung.md:1` trägt "v1.29" — konsistent mit dem geplanten Sprung auf v1.30.

---

## Urteil

**Nicht freigegeben.**

Der Plan ist überwiegend sorgfältig recherchiert und benennt seine eigenen Unsicherheiten ehrlich; mehrere Kern-Annahmen wurden real bestätigt (F2, F7, F8, F9). Abschnitt 4 enthält jedoch einen konkreten, belegbaren Korrektheitsfehler (F1): der geplante `pruefbefehl` endet auf Windows als `FEHLER` (ENOENT) statt den Prüfzweck zu erfüllen — **[Fakt, real gemessen bei der Umsetzung von Plan v2]** `scripts/check-f42-projekt-harness.mjs` Prüfung (c) führt `['npm', 'run', 'check:template']` real über `fuehrePruefungDurch` aus und erhält `ergebnis: 'FEHLER'`, während die korrigierte Fassung (absoluter Pfad) real `'GRUEN'` liefert — weder Schema, noch die ursprünglich geplante Probe (manuelles Shell-`cd`) hätten das aufgefangen. Zusätzlich ist F3 (Bezug auf nicht existierendes F-702) vor dem Bau zu klären.

Alle übrigen Abschnitte (1-3, 5-9) sind tragfähig; Offener Punkt 1 ist aufgelöst (F2), für Offener Punkt 3 liegt eine begründete Empfehlung vor (F4).

## Nächster sinnvoller Schritt

1. Abschnitt 4 korrigieren: `pruefbefehl` entweder (a) mit demselben absoluten `node.exe`+`npm-cli.js`-Muster wie `startvorlagen/ai-workforce.json:10` bauen (Pfade aus der Quell-Startvorlage übernehmen, nur `run check` → `run check:template` ändern), oder (b) den `npm`-Pfad zur Schreibzeit in `schreibeStartvorlageUndProfil` selbst aus `process.execPath` auflösen. Probe (Abschnitt 8) so anpassen, dass sie tatsächlich `fuehrePruefungDurch`/`starteProzess` mit dem geschriebenen Array aufruft, nicht nur ein manuelles Shell-`cd`.
2. F-702-Referenz klären (neu vs. bestehend), Plan-Kopf präzisieren.
3. Danach: leichte erneute Prüfung nur von Abschnitt 4, dann Freigabe durch Stefan vor Bau-Beginn.
