# Delta-Advisor-Pass F45 B2b-4a „Bereit zum Sichern“ — Plan v2

Geprüft: `features/F45/plan-b2b4a.md` (v2) gegen `d7f207c`, Vorgänger `advisor-b2b4.md`. Subagent `architecture-advisor`,
frischer Kontext, nur Read/Grep/Glob, 19.10.2026. Inhaltlich übernommen, Gliederung gestrafft.

Grenzen der Prüftiefe: PowerShell-Vorabversuch nicht wiederholt; `npm run check`, Gates, Tests nicht ausgeführt;
Serverzeilen nicht gezählt (Grenze 13416 aus `wachstumsbremse-server.json:2`); nicht gelesen: STATUS, Lagebild,
fixpaket-f45, feature.md, `code-stand.js`, `workflow-abnahme.js` (`abnahmeLage`), `nachweise/b2b3b2b2a3/instanz.mjs`,
`check-f813-csrf.mjs` (aus dem Vorgänger übernommen); i18n nur an einer Stelle; kein Browser (Einzug/Umbruch aus CSS
geschlossen).

## Abgleich mit advisor-b2b4.md

Zuschnitt: Auflagen (a)–(c) erfüllt, Umfang durch F-1088 (5) und Commit-Vorschlag wieder gewachsen (→ 7). Zwei
Aufzählungen: im Grundsatz gelöst, neue Formfehler (→ 2). Regel 7: gelöst über `nurPush`, Bedeutung von `voraus` (→ 3).
O1: entschieden, aber unerreichbar/falsch (→ 1). 9e: Quelle des Titels offen (→ 4). F-1088 (5): gelöst, Rest Prüfstand/
Jarvis (P1). Entlastend erledigt: 6 (deklariert), 9a (Ort fraglich → 11), 9b, 10, 12, 13 (Workboard-Handler fehlt → 15),
14 (Doppelung Modus null → 8), 17, 18 (Muster-Gate legt echten Worktree an und wartet auf BEREIT,
`check-f45-b2b3b2b2b2b1-projekt-cli.mjs:120-122`, `:152`; lokales `main` genügt `findeBasisRef`, `routen-code.mjs:356-363`).

## Befunde — vor Bau

1. **Regel 2 „abgelehnt“ unerreichbar bzw. im Reparaturpfad falsch.** [Fakt] ABGELEHNT setzt den Workflow auf GESTOPPT
   (`leitstand-server.mjs:12750-12758`, `:12561`); nach Reparatur gilt die alte Entscheidung als veraltet (`:12655-12658`,
   `ermittleAbnahmeStand` `:2134-2140`; Client `workflows.js:686-687`). [Schlussfolgerung] Direkt nach Ablehnung greift
   Regel 1; im Reparaturpfad meldete das rohe Ergebnis fälschlich „abgelehnt“. Korrektur: Regel 2 und Grund streichen (O1
   bleibt über GESTOPPT ⇒ Regel 1 erfüllt) — oder nur bei `ermittleAbnahmeStand(...).entscheidungStatus === 'ok'` setzen.
2. **`arbeitsordnerGrund` passt nicht zur Eingabe.** [Fakt] Projektion liefert bei Pflicht nie `null`, sondern
   `{ status: 'fehlt' }` (`:6656`), ohne Pflicht `kein_bedarf`/`bestand` (`:6653`); im Routenpfad bekäme die Ableitung
   `laufort.arbeitsordner = { pfad, branch }` (`:6502`) ohne Status. Korrektur: `'fehlt'` → `nichtAngelegt`, unbekannt →
   `nichtBestimmbar`; Regel 4 aus `leiteSichernLageAb` streichen (Route ruft nur nach `ermittleLaufort.ok`); bei `ok:false`
   und Schlüssel `null` (Wettlauf `existsSync`) → `nichtBestimmbar`, Gate-Fall „ok:false ⇒ Schlüssel ≠ null“.
3. **`basis.voraus` zählt nicht ungepushte Commits.** [Fakt] `rev-list --left-right --count <origin/main|main>...HEAD`
   (`routen-code.mjs:372-378`). [Schlussfolgerung] nach `git push -u` bleibt `voraus > 0`, Anzeige bleibt auf „bereit“ mit
   Push-Block (harmlos, aber irreführend). Korrektur: Wortlaut „Commits noch nicht auf main“; „gepusht“ in dieselbe Grenze
   und dasselbe P3-Finding wie „gemergt“ (Alternative `@{u}` teurer; Empfehlung: deklarieren).
4. **Quelle des Titels offen.** [Fakt] Workflow hat nur `ziel` und `auftrag_id`
   (`schemas/kontrollzustand-workflow-payload.schema.json:11-24`); den Titel trägt der Auftrag
   (`kontrollzustand-auftrag-payload.schema.json:12`); Workboard kennt `workitem.titel` (`workboard.js:1141`),
   `workflows.js` `daten.ziel` (`:420`). Korrektur: Server liefert `ablauf.titel` aus `auftrag-<auftrag_id>` (Muster `:11463`),
   beide Ansichten nehmen ihn aus der Antwort.
5. **Einzug „  “ kollidiert mit dem hängenden Einzug und schwächt Prüfungen.** [Fakt] `style.css:9737-9741`
   (`padding-left: 2ch; text-indent: -2ch`, `befehlsblock.js:19-20`); `routen-code.test.mjs:349` (`startsWith('git add ')`),
   `check-f45-b2a3b-review-stand.mjs:153` (`startsWith('git push')` würde still wirkungslos). Korrektur: kein Einzug —
   `['& {', ortZeile, ...folge, '}']`.
6. **Workboard-Regel `=== 'BEREIT'` lässt F-1087 teilweise offen.** [Fakt] sonst „heutiger Weg“ = Projektordner
   (`workboard.js:769-777`). Korrektur: jeder Pflicht-Ablauf (Status ∉ {`kein_bedarf`, `bestand`}) über `?workflow=`, bei
   Bedarf 409-Grund; nur ohne Pflicht der heutige Weg.
7. **Zuschnitt: 4a ist zu groß.** [Fakt] Schätzung ganzes B2b-4 ≈ 0,3–0,4 AT (`fixpaket-f45.md:152`); 4a umfasst Modul +
   Route + Auslagerung + Grenze + LAUFID, neue Befehlsform mit sieben Golden-Stellen in vier Dateien, Commit-Vorschlag,
   `zaehleBefehle`, Stand-Modul, Karte, `workflows.js`, Workboard, i18n ×4, CSS, Gate mit 7 Teilen, Render-Nachweis,
   PowerShell-Beleg, fünf Doku-Stellen. [Schlussfolgerung] gut das Anderthalbfache der Schätzung für ganz B2b-4; mit
   1–6 ist eine zweite Korrekturrunde wahrscheinlich. **Nach CLAUDE.md-Heuristik zu groß.** Vorschlag: **4a-1 = A + B**
   (Modul, Route, Ratsche, LAUFID, Gate (a)–(d), (g); keine Oberfläche, kein Render-Nachweis) / **4a-2 = C** (Befehlsform
   F-1088 (5), Commit-Vorschlag, Stand-Modul, Karte, `workflows.js`, Workboard, i18n, Render-Nachweis, Gate (e)(f),
   Abschluss F-979/F-1087). Nachteil: 4a-1 ohne sichtbaren Nutzen. Bleibt 4a ganz, senken 1 und 5 den Umfang spürbar.

## Befunde — mitlaufen (Bauauflagen)

8. Zwei „Aufräumen“-Knöpfe im Modus null (`workflows.js:883`, `arbeitsordner-anzeige.js:163-166`, `:205-207`) — Karte lässt
   ihren Knopf dort weg (Kontext-Flag) oder Doppelung benennen.
9. Golden-Stellen vollständig: `code-daten.test.mjs` Z. 37, 85, 91, 102, 107 (126-131 bleiben); `routen-code.test.mjs`
   Z. 347-351 (Z. 351 `${cd}; ${zeile}` wird mit `& {` Syntaxfehler); `check-f45-b2a3b-review-stand.mjs` Z. 152-153
   (`block.length !== 2`) und Rotfälle Z. 480-482; `pruefeBloecke` dient auch dem Prüfstand (Z. 205). Empfehlung: der
   PowerShell-Test in `routen-code.test.mjs` führt den echten Block ohne Commit als ein `-Command` aus.
10. `zaehleBefehle` wirkt auch im Chat (`befehlsblock.js:28`, 99-101, 131) — benennen + Chat-Fall in
    `befehlsblock.test.mjs:43-44`, oder Anzahl als Option übergeben.
11. LAUFID (~40 Verwendungen, `:1852`, `:8770`, `:12236`, `:12569`; Kommentar `:2202`) nicht in ein „Sichern“-Modul,
    sondern neutral (z. B. `scripts/leitstand/kennung.mjs`); 200-Zeichen-Grenze als neue Regel nur dieser Route nennen.
    [Fakt, entlastend] kein Gate liest die Konstante aus dem Quelltext.
12. „Einmal je workflowId“ zeigt nach einer Anpassungsrunde alte Befehle — Schlüssel workflowId + `lauf_id` der Ausführung
    oder beim Übergang nach ABGESCHLOSSEN neu laden.
13. `nurPush`-Zweig muss Branch/losgelöst/main/`basis.status` prüfen; ohne origin eigener Grund; `sicherBefehle`-Gründe
    (`gekappt`, `keinBranch`, `keinVorschlag`) im Abschnitt zeigen (Muster `workboard.js:777`).
14. Kartensignatur (`kontext`) festlegen; Freigabe-Seite ruft ohne Kontext (`workflow-entscheiden.js:309`, entlastend);
    `arbeitsordner.sichern` (`i18n/de.js:2534` u. a.) verweist auf „bis „Bereit zum Sichern“ kommt“ — anpassen/entfernen;
    `check-f44-i18n` prüft keine ungenutzten Schlüssel (entlastend).
15. Workboard: `[data-sichern-aktualisieren]` an `#workboard-bearbeitung` (`workboard.js:1739-1745`) ergänzen.
16. Kommentare nachziehen: Kopf `code-daten.js` Z. 14-16, Doku `befehlsBloecke` Z. 172-177, `sicherBefehle` Z. 184-195;
    `src/capabilities-ansicht/index.ts:109` und Serverkopf `:19` (Ort von `entferneCodezaun`).
17. Render-Nachweis auch #/code-Sichern bei 390 mit langer `git add`-Zeile; Zustand „abgelehnt“ streichen.
18. PowerShell-Beleg: nur 5.1, Einfügen nachgebildet (ehrlich deklariert); [offene Unsicherheit] Stefans Shell;
    [Annahme] stderr von git unter 5.1 mit Umleitung als NativeCommandError — Fall mit stderr ergänzen; Klick-Fall „echtes
    Einfügen“. [Fakt, entlastend] `git commit` nach Fehler von `git add` läuft weiter wie heute.
19. „P3“ doppelt belegt (Priorität und offener Punkt) — umbenennen.
20. `check-f813-csrf` durchsucht auch Tests und `text-auszug.mjs` nach `.method`.

## Entlastend

21. Prüfreihenfolge 403 → 400 → 404 → 409 (`:8497-8503`), id nur in Laden/Laufort/Projektion, `cwd` aus dem Kontrollzustand
    (`:6502`); Ratsche (Block Z. 3958-4040 rein, ≈ 83 Zeilen; Laufzeit-Importe nur `check-f22-click-to-work.mjs:62`,
    `check-f31-gedaechtnis.mjs:49`; Rechnung ≈ −60 schlüssig); kein neues Routen-Literal (`wachstumsbremse-server.json:10-11`);
    ARCHITECTURE §1 eingehalten; Gate b2a3 unberührt (cdZeile/Jarvis gleich); `auftrag-umgebung.js:249` behält `cdZeile`;
    `baueCodeProjektion` hat schon `git`/`jetzt` (`routen-code.mjs:586`).

## Offene Punkte P1–P4

- P1: Empfehlung neue Form für alle Leitstand-Blöcke (Option `abbruch` entfällt; Golden `code-daten.test.mjs:131`,
  `check-f45-b2a3b-review-stand.mjs:205`); F-1088 (5) dann „erledigt für Leitstand-Blöcke, Jarvis-Regel → 4b“, sonst nur
  „teilweise“.
- P2: `nurPush` nur im Ablauf-Block beibehalten.
- P3 (Kappung): mit Auftragstitel 72 Zeichen genügt (Test); mit `ziel` Pflicht.
- P4: tragfähig; als Grenze deklarieren, Befund 12 beachten.

## Urteil: Nicht freigegeben

Architektur trägt (abgeleitet, keine Route, kein Schema, Prüfreihenfolge, Ratsche). Sechs Spezifikationsfehler (1–6), die
der Bau wortgetreu falsch umsetzen würde, und Zuschnitt (7): **4a zu groß**. Korrekturen sind Planänderungen ohne neue
Architektur.

## Nächster sinnvoller Schritt

Stefan entscheidet: Zuschnitt (4a-1 = A+B / 4a-2 = C, oder 4a ganz mit Kürzungen 1 und 5); Regel 2 streichen statt
umbauen; Titel-Quelle (`ablauf.titel` aus dem Auftrag); P1 (neue Form überall im Leitstand); Befund 3 (deklarieren). Danach
Plan v3 mit 1–6 eingearbeitet und 8–20 als Bauauflagen, kurzer Delta-Pass mit frischem Kontext.
