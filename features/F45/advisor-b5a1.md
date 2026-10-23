# Advisor-Pass F45 B5a-1 „Akte schreiben“: Plan v1

Wörtlich abgelegter Bericht des Subagenten `architecture-advisor` (frischer Kontext, 23.10.2026).

**Geprüfter Plan:** `features/F45/plan-b5a1.md` (Plan v1, unversioniert im Branch `f45/b5a1-akte-schreiben`, Basis main `5c94d69`)
**Repo-Wurzel:** `C:\Users\stefa\Projekte\ai-workforce`

**Geprüft gegen diese Quellen:**
- Regeln: `ARCHITECTURE.md` (§1, §2, §7), `docs/architektur/wachstumsbremse.md`, `docs/architektur/arbeitsordner.md`, `scripts/architektur-kern.json`, `.gitattributes`
- Entscheidungen: `docs/projekt/zielfassung.md` §13.6 (E-F45-1, E-F45-3), `features/F45/feature.md` (Entscheidungen), `docs/projekt/fixpaket-f45.md:110`, `state/findings.md` (F-912, F-995, F-1166, F-1174 bis F-1176)
- Server: `scripts/leitstand-server.mjs` (1358, 1520–1624, 2886, 4734, 5537, 5714, 8117–8146, 8580–8606, 9504–9538, 12958–12998, 13057–13085)
- Routen-Module: `scripts/leitstand/routen-f35.mjs`, `scripts/leitstand/routen-faehigkeit-vorschlag.mjs`, `scripts/leitstand/routen-arbeitsordner.mjs:22`
- Kern-Code: `src/feature-auftrag/index.ts`, `src/product-coach/index.ts`, `src/workboard/feature-status.ts`, `src/workboard/feature-abschnitte.ts`, `src/workboard/features.ts`, `src/workflow/index.ts:88,159–160`
- Gates: `scripts/check-feature.mjs`, `scripts/check-akte-meilenstein.mjs` (+ Test), `scripts/check-status-akten.mjs`, `scripts/check-f813-csrf.mjs`, `scripts/check-f35-ws1-feature-auftrag.mjs`, `scripts/check-f21-workboard.mjs`
- Client: `public/leitstand/code-daten.js`, `public/leitstand/entwicklung-daten.js`, `public/leitstand/views/workboard.js:1295`
- Echte Akten als Formstichprobe: F23, F27, F35, F36, F45

**Rollengrenze:** nur Read, Grep, Glob — kein Bash, kein git, keine Ausführung. Nicht geprüft: ob F-1174…F-1176 und die Nachträge F-912/F-995 committet sind; Byte-Größe von `ARCHITECTURE.md` gegen den Deckel 17800; kein Gate/Test lief (Aussagen zu `check-f813-csrf` (3)/(4) aus dem Quelltext abgeleitet); PowerShell-Argumentweitergabe nicht nachgestellt.

## Marker-Legende
- **[Fakt]** direkt belegt (Datei:Zeile) · **[Fakt, entlastend]** belegt und in Ordnung · **[Schlussfolgerung]** abgeleitet, nicht ausgeführt · **[Annahme]** plausibel, nicht belegt · **[offene Unsicherheit]** mit diesen Rechten nicht entscheidbar.

## A. Vor dem Bau klären: braucht eine Entscheidung von Stefan

**A1: Der Plan schreibt im Projektordner, ARCHITECTURE.md verbietet das.** [Fakt] `ARCHITECTURE.md:95` „im Projektordner bleibt der Kern lesend“, ebenso `docs/architektur/arbeitsordner.md:15`. PUT und POST schreiben `features/<id>/feature.md` in die `repoWurzel`. Inhaltlich durch E-F45-1 gedeckt (`docs/projekt/zielfassung.md:1007–1011`), die Architekturregel ist aber nicht angepasst, Plan §6 nennt `ARCHITECTURE.md` nicht. [Schlussfolgerung] Ausnahme in Kern und Detail mit Durchsetzungsgrad (Muster FB-1b, `arbeitsordner.md:16–39`): nur `features/<id>/feature.md`, nur auf direkte Eingabe, Hash-409, Sperre, nie überschreiben bei der Anlage. [offene Unsicherheit] Deckel 17800 Bytes (`scripts/architektur-kern.json`) nicht gemessen.

**A2: „Zeilenenden erhalten“ widerspricht dem CRLF-Verbot.** [Fakt] `ARCHITECTURE.md:171`: „CRLF in Dateien, die der Kern schreibt … der Kern schreibt ausnahmslos LF“, Ausnahme „keine“. Auftrag und Plan-AK1 verlangen CRLF-Erhalt. [Fakt] `.gitattributes:13` `* text=auto eol=lf`; CRLF betrifft vor allem Fremdprojekte (E-F41-2). [Schlussfolgerung] Entscheidung und eingetragene Ausnahme in §7 nötig; Vorschlag: bestehende Akte behält ihr Zeilenende, neue Akte (POST) wird LF geschrieben.

**A3: Text vor dem ersten Punkt eines Listenabschnitts geht still verloren.** [Fakt] `leseTopLevelBullets` (`src/feature-auftrag/index.ts:120–135`) verwirft alles vor dem ersten Bullet und hängt jede nicht-leere Spalte-0-Zeile an den vorigen Bullet (auch `###`, Absätze, Tabellen). `bearbeiteFeatureAkte` ersetzt den Abschnitt ganz; die Rundlauf-Probe sieht den Verlust nicht (gleicher Leser). [Fakt] Neuformatierung auch unveränderter Einträge: F35 `- AK1 Text` ohne Doppelpunkt (`features/F35/feature.md:112`), F36 geschachtelte Listen (`features/F36/feature.md:533–534`), Checkboxen gehen verloren; R5 unterschätzt das. [Schlussfolgerung] (a) Bearbeitbarkeitsprüfung: nur Bullets, eingerückte Folgezeilen, Leerzeilen und `keine`, sonst 422 „Abschnitt von Hand bereinigen“ (Empfehlung) oder (b) Vortext/Unterüberschriften bytegleich erhalten (aufwendiger). Neuformatierung in R5 als DEKLARIERT.

**A4: Die Methode wird im Modul geprüft, das weicht vom Zwischenmuster ab.** [Fakt] E-FB1-2 (`docs/architektur/wachstumsbremse.md:10`, `ARCHITECTURE.md:60–61`): das Modul erkennt nur den Pfad, der Server prüft die Methode hinter dem CSRF-Haken. Plan verlegt 405 ins Modul. [Schlussfolgerung] `check-f813-csrf` (4) fängt `methode` textlich nicht (`scripts/check-f813-csrf.mjs:301`), die Absicht wird trotzdem unterlaufen. Empfehlung: zurück zum Muster.

## B. Vor dem Bau in Plan v2 festlegen: ohne neue Entscheidung

**B1: Der Dispatch-Entwurf macht `check-f813-csrf` (3) rot.** [Schlussfolgerung aus Fakt] Zeile `req.method === 'PUT' || req.method === 'POST' ? await leseJsonBegrenzt(…)` ohne Pfad-Literal/Regex/`…Treffer` in derselben Zeile ⇒ „nicht ableitbar“ (`scripts/check-f813-csrf.mjs:133–150`). Lösung nach `leitstand-server.mjs:8584`: Methode im Server mit `!==` je Routenart (`/api/features` nur POST; `…/akte` GET liest, PUT ins Modul, sonst 405), erst danach Body lesen. GET-Block ist 14 Zeilen (9525–9538).

**B2: Im Gate fehlt die CSRF-Probe je Route.** [Fakt] Zwischenmuster verlangt eine CSRF-Probe je Route im Feature-Gate, direkt und über `/api/projekte/<id>/…` (`wachstumsbremse.md:10`). Für PUT `…/akte` und POST `/api/features` nachtragen.

**B3: Ein bestehendes Gate wird durch die neuen GET-Felder rot.** [Fakt] `scripts/check-f35-ws1-feature-auftrag.mjs:281–294` vergleicht den GET-Körper per `JSON.stringify`; `hash`/`entscheidungen` machen (g) rot. [Fakt, entlastend] Client `pruefeAkte` (`public/leitstand/views/workboard.js:1295–1300`) verträgt Zusatzfelder.

**B4: Die Sperre ist unvollständig.** [Fakt] Anzeige verknüpft über `feature_ref`, sonst `workitem_referenz` (`public/leitstand/entwicklung-daten.js:126`; `baueAuftragKopfdaten`, `leitstand-server.mjs:1362–1363`). Alt-Aufträge und `POST /api/auftraege` mit Referenzzeile sperren nach dem Plan nicht. Regel für „kein Auftrag ladbar“ fehlt. [Schlussfolgerung] `kontext.auftraege = () => sammleAuftraege(basisVerzeichnis)` (asynchron, gecacht, beide Felder, 1380–1398), Regel wie `baueVerknuepfung`; Auftrag nicht ladbar/nicht in der Liste ⇒ 409 mit `workflowId` (fail-closed).

**B5: Rundlauf-Probe „genau wie Anfrage“ gegen die Normalisierung des Schreibers.** [Schlussfolgerung] Schreiber trimmt/entfernt Leerzeilen, Leser entfernt Checkbox-Präfix (`index.ts:111,127`) und trimmt das Ziel ⇒ zulässige Anfragen scheitern mit 422. Normalisierung einmal definieren und vor Vergleich und `geaendert` anwenden; Nicht-Normalisierbares (Checkbox-Präfix, Steuerzeichen) mit 400. `geaendert` muss Zeilenenden normalisieren (CRLF-Ziel mit inneren `\r\n`, `index.ts:209`).

**B6: Hash und Inhalt beim GET aus einem einzigen Lesevorgang.** [Fakt + Schlussfolgerung] Heute `readFileSync(pfad, 'utf8')` (`routen-f35.mjs:138`). Zwei Lesevorgänge ⇒ Hash B mit Inhalt A ⇒ verlorenes Update. Einmal als Buffer lesen, Hash darauf, dann `toString('utf8')`; beim PUT zusätzlich `Buffer.from(text).equals(roh)`, sonst 422 (kaputtes UTF-8). [Fakt] Helfer `sha256Hex` (`src/checkpoint-store/index.ts:62`), `SHA256_MUSTER` (`src/faehigkeiten`).

**B7: Abschnittsgrenzen aus derselben Funktion wie beim Leser.** [Schlussfolgerung] Leser per Regex auf dem ganzen Text (`^##\s+Ziel\b.*$`, `\s+` greift über Zeilenenden; Grenze `^##\s+`, trifft auch `##\n`; `index.ts:85–90`). Empfehlung: `findeAbschnitt(inhalt, name) → { kopfEnde, koerperEnde } | null` exportieren, `leseAbschnitt` darauf umstellen, Schreiber nutzt dieselbe Spanne.

## C. Kann im Bau mitlaufen

- **C1** [Fakt] Entscheidungs-Regel zu weit: `features/F45/feature.md:41` bekäme `E-F45-7` (doppelt mit Zeile 29), „E-Mail“ würde Kennung. Nur Kennung am Bullet-Anfang (optional in `**`); Leser in `src/feature-auftrag/index.ts` neben `leseAkte` (F-995 „eine Regel mit dem Bau-Auftrag“).
- **C2** [Fakt + Schlussfolgerung] POST bereinigt Scope-Texte nicht (`validiereScope` nur nicht-leer, `product-coach/index.ts:131–147`); `## `-Zeilen, mehrzeilige Einträge, Titel mit Umbruch zerlegen die Akte; `check-feature` prüft bei ENTWURF nur Status/optionale Abschnitte (`check-feature.mjs:74–96`). Dieselben Feldprüfungen und Rundlauf-Probe wie PUT; 422 oder Herabstufung festlegen; leere Listen `keine`.
- **C3** [Fakt] Abgebrochene Anlage hinterlässt leeren Ordner (`check-feature.mjs:68–70`; ID verbraucht, `leitstand-server.mjs:4737–4739`) — selbst angelegten Ordner bei Fehler entfernen.
- **C4** [Schlussfolgerung] `writeFileSync` direkt kann die Akte bei Abbruch kürzen — Temp-Datei + Rename (Windows mit Wiederholung, `mitWiederholung`, `routen-faehigkeit-vorschlag.mjs:420`) oder schreiben + zurücklesen + Hash prüfen (500 mit Hinweis); als DEKLARIERT festhalten.
- **C5** Git-Block: [Fakt] `befehlsBlock` ⇒ `null` ohne absoluten Pfad (`code-daten.js:197–199`); [Fakt] Sichern-Kette verweigert `main` (`code-daten.js:273`), Akte-Block kennt keinen Branch — Hinweis für B5a-2; [Annahme] PowerShell 5.1 verstümmelt `"` in einfach gequoteten Argumenten an native Programme — `"` in `grund` für die Commit-Nachricht ersetzen oder ablehnen; Steuerzeichen ablehnen.
- **C6** [Fakt] Status-Regex nicht ein drittes Mal kopieren (`check-status-akten.mjs:60–63` mit `[ \t]*`; `check-feature`/`routen-f35.mjs:42` mit `\s*`). Einmal in `src/workboard/feature-akte-pruefung.ts`.
- **C7** Ohne `aktenStatus` bisheriges Verhalten (Test `check-akte-meilenstein.test.mjs:20–85`); fehlender/unbekannter Status ⇒ Pflicht. [offene Unsicherheit] E-B5-2 „ab READY_FOR_TECH“ vs. F-1176 „jeder andere Status“ (ABGEBROCHEN/BLOCKIERT nach ENTWURF).
- **C8** [Fakt] `## Akzeptanzkriterien WS-2` vor `## Akzeptanzkriterien` (`features/F27/feature.md:27/35`, F28 47/56): Leser trifft die WS-Überschrift; in R2 aufnehmen.
- **C9** [Fakt + Schlussfolgerung] `sammleWorkflows` gibt die Event-Loop frei (`leitstand-server.mjs:1621`); ein vor dem PUT registrierter Auftrag trägt den alten Stand (`routen-f35.mjs:79`). R3 als DEKLARIERT; optional Ordnernamen im synchronen Abschnitt vergleichen.
- **C10** [Fakt] Doku eilt dem Code voraus: F-1176 „erledigt“ mit `leseAktenStatus`, Nachträge F-912/F-995 nennen geplante Funktionen; F-1174…F-1176 existieren schon (nächste freie ID F-1177); E-B5-1/E-B5-2 stehen schon in der Akte. Nach dem Bau abgleichen.
- **C11** [Fakt] `check-f813-csrf` (4) liest alle `scripts/leitstand/*.mjs` inkl. Tests (`check-f813-csrf.mjs:120,301`) — kein `.method` in `routen-f35.test.mjs`.
- **C12** `heutigesDatum()` gibt es im Server nicht — Modul bildet das Datum lokal, `kontext.datum` nur in Tests. AK-ID `^AK[1-9]\d*$`.
- **C13** [Schlussfolgerung] Zuschnitt grenzwertig; Rückfalloption B5a-1a (PUT/GET, Prüf-Auszug, ARCHITECTURE) und B5a-1b (POST, E-B5-2).
- **C14** [Schlussfolgerung] O6 hilft alten Akten wenig (Körper `unvollstaendig` ohne ziel/nicht_ziele/AK, `routen-f35.mjs:143`); optional additiv mitliefern, sonst Grenze für B5a-2.
- **C15** [offene Unsicherheit] Bearbeiten von ABGESCHLOSSEN/ABGEBROCHEN-Akten ungeregelt (`STATUS_NICHT_BAUBAR`, `routen-f35.mjs:41`).

## D. Offene Punkte O1–O6

| Punkt | Urteil | Begründung |
|---|---|---|
| O1 AK als `{id,text}[]` | tragfähig | [Fakt, entlastend] gleiche Form wie GET (`index.ts:191`), Leser übernimmt `AK<n>:` (`index.ts:72`); ID-Muster ergänzen, neue AKs vergibt der Client. |
| O2 fehlenden Abschnitt einfügen | tragfähig | [Fakt] nötig für Reparatur (F45 ohne Nicht-Ziele/AK); einfache Positionsregel angemessen. |
| O3 „nichts geändert“ → 422 | tragfähig | [Schlussfolgerung] Hash-Vergleich vor Bearbeitung ⇒ veralteter Client bekommt 409. |
| O4 globale Laufsperre ignorieren | tragfähig mit Annahme | [Fakt] `arbeitsordner` im Handler standardmäßig `false` (`leitstand-server.mjs:5711–5714`); [Annahme] Produktion schreibt immer im Worktree (E-F45-3) — in der Ausnahme (A1) als Voraussetzung nennen. |
| O5 Regeln nach `src/workboard/feature-akte-pruefung.ts` | tragfähig | [Fakt] `check-feature.mjs` nicht importierbar (39–108); Richtung scripts → src stimmt; `continue` bei ungültigem Status genau übernehmen; Statusregel dort (C6). |
| O6 `hash`/`entscheidungen` auch bei `unvollstaendig` | tragfähig | mit Grenze C14. |

## E. Geprüft und in Ordnung
1. [Fakt, entlastend] CSRF-Haken zentral für jede nicht-lesende Methode inkl. PUT (`leitstand-server.mjs:8132–8138`).
2. [Fakt, entlastend] Multi-Projekt-Dispatcher methodenneutral (`13065–13084`).
3. [Fakt, entlastend] eigenes `basisVerzeichnis` je Projekt (`12983–12986`) — Sperre je Projekt.
4. [Fakt, entlastend] Terminal genau ABGESCHLOSSEN/GESTOPPT (`src/workflow/index.ts:88,159–160`, `routen-arbeitsordner.mjs:22`, `views/workflows.js:490`).
5. [Schlussfolgerung, entlastend] asynchrone Sperre vor synchronem Abschnitt löst zwei gleichzeitige PUTs sauber (Muster FB-1b, `routen-faehigkeit-vorschlag.mjs:27–29,601–603`).
6. [Fakt, entlastend] ENTWURF gültig (`feature-status.ts:13`), POST-Akte besteht `check-feature` und den Workboard-Parser (`features.ts:63–71`).
7. [Fakt, entlastend] `sammleBestehendeIds` synchron, wirft nicht; `naechsteFreieNummer` überspringt Irreguläres; mit `wx` rennsicher.
8. [Fakt, entlastend] `leseJsonBegrenzt` 413/400, leerer Body `{}` (`5537–5558`).
9. [Fakt, entlastend] `befehlsBlock`/`psArgument`/`gitPfadArgument` vorhanden, Import aus `scripts/leitstand` belegt; `git add` mit benanntem Pfad (`ARCHITECTURE.md:101`); kein git-Prozess.
10. [Fakt, entlastend] Pfadsicherheit `loeseFeatureAktePfadAuf`/`FEATURE_ID_MUSTER` wiederverwendbar; Body-Prüfer nach `pruefeVorschlagKoerper`.
11. [Schlussfolgerung, entlastend] 64 KiB reicht (F36 AK ≈ 15 KB).
12. [Fakt, entlastend] Wachstumsbremse erreichbar (Regex-Dispatch `featureAkteTreffer` entfällt).
13. [Fakt, entlastend] `baueAuftragAusScope` unverändert, `validiereScope` nur exportiert.

## Urteil
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [x] Nicht freigegeben
- [ ] Blockiert

**Begründung:** Grundanlage tragfähig; Plan v1 widerspricht zwei Architekturregeln ohne Ausnahme (A1, A2), weicht ohne Entscheidung vom Zwischenmuster ab (A4), die Dispatch-Zeile machte `check-f813-csrf` rot (B1), Gate f35 (g) bricht (B3), CSRF-Probe fehlt (B2), stiller Datenverlust in Listenabschnitten (A3), Sperre weicht von der Verknüpfungsregel ab (B4). Kein Blockiert: jeder Punkt hat einen kleinen Ausweg.

**Nach Schwere:** (1) vor dem Bau mit Entscheidung Stefan: A1, A2, A3, A4; (2) vor dem Bau in Plan v2: B1–B7; (3) im Bau mitlaufend: C1–C15.

## Nächster sinnvoller Schritt
1. Stefan entscheidet A1, A2, A3 (Empfehlung 422-Bearbeitbarkeitsprüfung), A4 (Empfehlung Zwischenmuster).
2. Plan v2 mit B1–B7 und C-Punkten; Findings ab F-1177; F-1176 und Nachträge nach dem Bau gegen den echten Stand.
3. Zuschnitt prüfen (C13), ggf. B5a-1a/B5a-1b.
4. Plan v2 ohne zweiten Advisor-Pass (Regel 3a) über die Freigabe in den Bau; `code-reviewer` und `qa` danach mit frischem Kontext.
