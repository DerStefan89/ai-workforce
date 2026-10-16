# F45 B2b-3e-2 — Delta-Advisor-Pass zu Plan v2 (`features/F45/plan-b2b3e2-v2.md`)

Subagent `architecture-advisor`, frischer Kontext, 16.10.2026. Rollengrenze: nur Read/Grep/Glob — nicht ausgeführt: tsc,
Biome, node:test, Rot gegen main, `Intl.NumberFormat` je Sprache, `rmSync` bei Junctions/schreibgeschützten Dateien,
`mkdtemp`-Zeichenvorrat, Kontrollzustand anderer Projekte, Render-Nachweis.

Geprüft gegen: plan-b2b3e.md, advisor-b2b3e.md, state/findings.md (F-1121, F-1122, F-1123, F-1125), ARCHITECTURE.md §1/§2,
biome.json, src/auftrag/index.ts, src/umfang/index.ts (+test), src/budget/index.ts, src/aenderungsuebersicht/index.ts,
schemas/kontrollzustand-auftrag-payload.schema.json, public/leitstand/{arbeitspaket-felder.js, i18n.js, index.html,
views/projekt.js(+test), views/workflow-abnahme.js, style.css, i18n/de.js}, scripts/{neutrale-umgebung*.mjs,
check-f45-b2b3e1-pfade.mjs, check-f45-b2b3d-umfang.mjs, check-f44-i18n.mjs, check-f34-product-coach.mjs,
leitstand/umfang-stand.mjs, leitstand/budget-stand.mjs}, leitstand-server.mjs (Ausschnitte), nachweise/*/instanz*.mjs.

Marker: [Fakt] · [Fakt, entlastend] · [Schlussfolgerung] · [Annahme] · [offene Unsicherheit].

## Befunde

1. **MITTEL — §5: 60 s für Ordner ohne `pid` zu knapp.** [Fakt] Wurzel global für alle Worktrees
   (neutrale-umgebung.mjs:29-33); mtime ≈ Anlegezeit (:57-59); CLAUDE.md erlaubt parallele Worktrees. [Schlussfolgerung]
   Eine Instanz mit dem 3e-1-Starter in einem anderen Worktree verliert nach 60 s ihren Laufordner; §9 „nach dem Merge gibt
   es keinen“ stimmt nicht. Vorschlag: große Schwelle (z. B. 24 h).
2. **MITTEL — §5: `pid`-Prüfung und Fehlerpfade.** (a) leere/halbe `pid`-Datei ⇒ nur positive Ganzzahl gilt, sonst
   mtime-Regel ([Fakt] Vorbild `pidLebt`, leitstand-server.mjs:12973-12985, wertet ungültig als tot — für Löschen falsch;
   [Annahme] posix `kill(0|-1, 0)`). (b) Verhalten bei scheiterndem `markiereLauf` festlegen. (c) Nur `ESRCH` = tot.
3. **NIEDRIG–MITTEL — §5: Grenzen beim rekursiven Löschen.** Dirent + `isDirectory()` (keine Symlinks/Junctions [Annahme]),
   `eigener` über Basisnamen, `readdir`-Fehler ⇒ Warnung + `[]`; [Fakt] Gate/Tests dürfen den Starter nie importieren (A5).
   [Fakt, entlastend] Platz außerhalb von `richteNeutraleUmgebungEin` richtig begründet (neutrale-umgebung.test.mjs:44-56,
   check-f45-b2b3e1-pfade.mjs:79-91, :190, :209-218).
4. **NIEDRIG–MITTEL — §2: Hinweistext „ganzes Arbeitspaket“, gezählt wird je Ablauf.** [Fakt] budget-stand.mjs:4-5, :37-42;
   src/budget/index.ts:4-5; ARCHITECTURE §1; F-1122 (2). Vorschlag: „Tokens je Ablauf dieses Auftrags, über alle Schritte
   einschließlich Korrekturrunde“.
5. **Entlastend — §2 erfüllt A9, verträgt sich mit i18n** (i18n.js:199, :203-221; projekt.js:469-472;
   check-f44-i18n.mjs:7-24, :55; biome.json:9). Läuft mit: Schlüssel `auftrag.budget.platzhalter` nennen, F-1121 um den
   JS-Zwilling ergänzen. [Annahme] Zahlen im Hinweis liest `leseBudget` wieder ein.
6. **NIEDRIG — §1 `pruefeBudgetTokens`:** `typeof wert === 'number' &&` voranstellen (tsc); Schema `budget_tokens` ohne
   `maximum` (schema.json:53-57) ergänzen oder begründen; Fehlertext für > MAX_SAFE falsch.
7. **NIEDRIG — §1 Grenzfälle.** [Fakt, entlastend] `*/`, `.\`, `src/**/`, `src/*/`, `**/x`, `src/***`, `' /etc/'` konsistent mit
   `normalisiereBereich` (umfang/index.ts:38-62). [Schlussfolgerung] Lücke: innere `.`-Segmente (`src/./`, `a/./b`) gültig,
   treffen im Abgleich still nichts — in (r1)/(r3) aufnehmen, abweisen oder normalisieren. Läuft mit: Doppelte getrimmt
   vergleichen; `?`, `[`, `{`, U+2028/2029, Bidi nur Hinweis.
8. **Entlastend — §3 (13):** einziger Aufrufer umfang-stand.mjs:34; Gate b2b3d ohne Umbenennungsfall (:177-240);
   `validiereUmfang` (aenderungsuebersicht/index.ts:96-103). Läuft mit: JSDoc umfang/index.ts:78-79, :87.
9. **NIEDRIG — §6:** A10-Teil von (r3) und `['src/**/'] ⇒ 201` in (r4) sind auf main grün ⇒ als Invarianten führen. (r4)
   einfacher über das reine `pruefeAuftragsformular` (leitstand-server.mjs:1807-1839).
10. **Entlastend — Server bleibt unberührt** (leitstand-server.mjs:1837-1839, :11501-11507). [offene Unsicherheit]
    Kontrollzustand anderer Projekte.
11. **Entlastend — §4:** Port 4406 frei; (p2b) erfasst die neue Instanz (check-f45-b2b3e1-pfade.mjs:16-17, :177-188).
12. **MITTEL — Zuschnitt:** ≈ 27 Dateien statt ≈ 20; §5 hängt nicht am Formular, eigenes Risiko (Löschen). Mit §5
    grenzwertig, ohne §5 realistisch.

## Urteil

**Freigegeben mit Auflagen.** Vor Baubeginn: **B1** §5 abtrennen als 3e-3 mit den F-1125-Restpunkten (Empfehlung) oder mit
den Auflagen aus 1–3 behalten; **B2** Wortlaut des Hinweistexts „je Ablauf“ (Stefan). Läuft mit: 5, 6, 7, 8, 9, 3 (Regel
„Starter nie importieren“).

Zuschnitt: der Advisor würde §5 abtrennen.

## Nächster sinnvoller Schritt

Stefan entscheidet B1 und B2; danach Plan v2 um die Auflagen ergänzen (ohne weiteren Pass, solange §5 abgetrennt wird oder
nur die genannten Punkte übernimmt), dann bauen.
