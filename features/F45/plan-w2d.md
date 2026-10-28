# F45 W2d — Doku-Diät — Plan v1

Stand 28.10.2026, Branch `f45/w2d-doku-diaet` (Basis main `66f774a`, nach #391). Auftrag: Challenger 28.10.2026 („Bauauftrag
F45 W2d Doku-Diät“). Ziel: Akte und Architektur-Kern wieder handhabbar. Am Inhalt ändert sich nichts — nur wörtliches
Verschieben, nichts umgeschrieben oder gekürzt.

## Basis (lesend geprüft, gemessen 28.10.2026 auf Windows, `66f774a`)

- `state/findings.md`: 9 297 Zeilen, 1 094 735 Bytes, 780 Einträge, LF, ohne BOM, endet mit einem `\n`. Höchste ID F-1241
  (offen). Keine Zwischenüberschriften zwischen den Einträgen — ein Block = Kopfzeile bis vor die nächste Kopfzeile.
- Archivregel E-K-1 (Kopf `state/findings-archiv.md`, Gate `check-f21-workboard` (6), `ARCHIVREGEL` =
  `/^(gelöst|behoben|erledigt|korrigiert)/i` auf den Kopfzeilen-Status ohne `**`): **25 Einträge** (Challenger ≈ 22):
  F-015, F-261, F-563, F-912, F-917, F-979, F-991, F-995, F-1010, F-1087, F-1137, F-1138, F-1141, F-1143, F-1144, F-1145,
  F-1146, F-1157, F-1160, F-1174, F-1175, F-1176, F-1194, F-1197, F-1201.
  - Hinweis: bei F-917, F-979, F-1087, F-1157 steht im Körper noch eine ältere Zeile `Status: offen …`/`teilweise …`; die
    Kopfzeile wurde später auf erledigt gesetzt (Anhängeprotokoll). Maßgeblich ist laut Regel und Gate die Kopfzeile ⇒ sie
    wandern mit. Kein Status wird geändert.
- `state/findings-archiv.md`: 5 673 Zeilen, 691 760 Bytes, endet mit einem `\n` (letzter Block ohne Leerzeile danach).
- `scripts/leitstand-server.mjs:1722`: Kommentar „state/findings.md (≈ 13 000 Zeilen)“ — veraltet.
- `features/F45/feature.md`: 2 018 Zeilen, 231 440 Bytes, LF. 41 Abschnitte `## Stand …` (Zeile 195–2018), davor ID, Titel,
  Status, Ziel, Grundlage, Entscheidungen, Scope, Workstreams (Zeile 1–194). Alle 41 Pakete sind gemergt (Workstreams-Tabelle,
  git): B0 … W2b-1 (#389), W2b-2 (#390), W2c-1 (#391).
- **Wer liest Stand-Abschnitte** (grep über `scripts/`, `src/`, `public/`):
  - Kein Code liest einen Abschnitt `## Stand …` der echten Akte. Leser der echten F45-Akte:
    `check-f45-b5a2-akte-anzeige` (h) — nur `## Ziel`; `check-f45-b5b1a-planung` (i) — nur `lesePlanung` (Priorität,
    Abgenommen, `## Workstreams`); `check-f45-b5b1b2-bereinigung` — Attrappe im tmp, nicht die echte Akte.
  - `check-f45-b5a1-akte` und `src/feature-auftrag/akte-schreiben.test.ts`: `'## Stand X'` nur in einer synthetischen Akte.
  - `check-f15-workflow`, `check-f15-automat-real`: kein Bezug auf `features/F45/feature.md` oder `## Stand`.
  - `check-kette.mjs:9` und `public/leitstand/befund-zuordnung.js:9`: nur Kommentarverweise „Abschnitt „Stand W2a““ bzw.
    „Stand B5b-2c-1“ in `features/F45/feature.md` — nach dem Lauf über den Kopfhinweis der Akte auffindbar (siehe 2.).
  - Leitstand: GET `/api/features/<id>/akte` (`scripts/leitstand/routen-f35.mjs`) liefert Titel, Status, Ziel, Nicht-Ziele,
    AKs, Hash, Entscheidungen — keine Stand-Abschnitte. `routen-roadmap.mjs` liest Titel, Status, Planung. Die Ansicht
    `projektakte` betrifft die Projektakte, nicht `features/<id>/feature.md`. Der Schreiber `bearbeiteFeatureAkte` ersetzt nur
    Ziel/Nicht-Ziele/AK und die Zeile unter `## Änderungen`; R7 (`ist_nach_abnahme`) schreibt nur die Workstream-Zeile.
  - ⇒ **Kein Produktpfad und keine Nutzeranzeige braucht die Stand-Abschnitte** — kein STOPP.
- `ARCHITECTURE.md`: 17 793 Bytes (17 468 Zeichen), Deckel 17 800. Gates mit Wortlaut-Bedingungen am Kern:
  `check-f45-b2b3b1b-auswertung` (f) und `check-f45-b2b3b2b1b-r1` (f) — §4 trägt `abgelehnt_durch_stefan`, `ERFOLGREICH`,
  `DEKLARIERT`, `ablehnung_hash`, `R1`; `check-f45-b2b3b2b1a-rest` (f) — §3 trägt `E-B7` und `herkunft`;
  `check-f45-b2b3b2a-absicherung` (f) — `F-1131` binnen 4 000 Zeichen nach „Wachstumsbremse (F45 W1“; `check-f45-k-kontext`
  (v1) Verweise, (v2) Rückverweise.
- **Projektkarte Code-Reviewer** (Logik `src/projektkarte` `bestand()` nachgerechnet): Abschnitte je ≤ 2 000 Zeichen, Auszug ≤
  9 000. Heute 10 580 Zeichen Auszug, `### Verbotene Patterns` beginnt bei 8 620 ⇒ in der Karte, aber nur die ersten ≈ 380
  Zeichen von §7. §1 (4 382), §2 (3 847), §3 (3 407) sind ohnehin auf 2 000 gekürzt.

## Vorgehen

1. **Archivlauf Register** (Skript im Scratchpad, nicht im Repo):
   - Register in Kopf + Blöcke zerlegen (Block = Kopfzeile bis vor die nächste, inklusive Leerzeile).
   - Die 25 Blöcke in Registerreihenfolge ausschneiden und an `state/findings-archiv.md` anhängen: ein `\n` als Trenner
     (das Archiv endet heute ohne Leerzeile), danach die Blöcke byte-gleich; beim letzten angehängten Block entfällt die
     Leerzeile am Ende, damit die Datei wieder mit genau einem `\n` endet. Kopf beider Dateien unverändert.
   - F-1241 bleibt im Register (höchste ID, offen); nach Schritt 4 ist F-1242 die höchste ID, ebenfalls im Register.
   - `scripts/leitstand-server.mjs:1722`: nur die Zahl „≈ 13 000“ → gemessene Zeilenzahl nach dem Lauf (≈ 9 100; Zeilenzahl
     des Servers unverändert, Wachstumsbremse unberührt).
2. **Akten-Archiv F45** — neue Datei `features/F45/akte-archiv.md`:
   - Kopf: Titel, Regel (siehe unten), `---`. Dann die Stand-Abschnitte B0 … W2b-1 (38 Abschnitte) wörtlich, in der
     Reihenfolge der Akte. In der Akte bleiben „Stand W2b-2“, „Stand W2c-1“ und der neue „Stand W2d“ — die letzten 3.
   - **Regel (wortgleich im Kopf beider Dateien):** „Akten-Archiv (F45 W2d, analog E-K-1; gilt für jede Feature-Akte):
     Stand-Abschnitte (`## Stand …`) erledigter Pakete werden als ganze Abschnitte (Überschrift bis vor die nächste `## `)
     wörtlich und in der Reihenfolge der Akte nach `features/<id>/akte-archiv.md` verschoben; die letzten drei
     Stand-Abschnitte bleiben in der Akte, alle anderen Abschnitte bleiben unverändert. Kontrolle: Akte und Archiv zusammen
     enthalten jeden Abschnitt der Akte vor dem Lauf byte-gleich. Lesen nur bei Bedarf.“ In der Akte steht die Regel als
     Absatz zwischen `# F45 — …` und `## ID` (kein `## `-Abschnitt, damit Parser und Gates unberührt bleiben), mit dem Satz
     „Ältere Stand-Abschnitte (B0 bis W2b-1): `features/F45/akte-archiv.md`.“
   - Grenze: im Archiv beginnt jeder Block mit `## Stand`; es trägt keine `## Status`/`## Workstreams` (kein zweiter Parser-
     Treffer; `parseFeatureAkten` liest nur `feature.md`).
   - `state/memory-map.md` Zeile „Feature-Akte“: Zusatz „ältere Stand-Abschnitte wörtlich in `features/<id>/akte-archiv.md`
     (nur bei Bedarf)“ (Pflicht der Aufteilungsregel im Kopf von ARCHITECTURE.md: Eintrag mit „nicht hierhin“-Spalte).
3. **ARCHITECTURE.md** (≥ 1 000 Bytes Luft, Deckel bleibt 17 800):
   - Die vier Unterpunkte von §2 „Weitere Ausnahmen …“ (`faehigkeiten.lokal.json`, `plugin-kopien/…`, `_lauf/…`,
     `faehigkeiten.stand.json`; 1 284 Bytes) wandern wörtlich ans Ende von `docs/architektur/lokale-dateien.md` unter
     `## Kurzfassung aus dem Kern §2 (F45 W2d, wörtlich verschoben)`.
   - Im Kern bleibt die Einleitungszeile unverändert, ergänzt um die vier Namen als Liste in einer Zeile (die Ausnahmen
     bleiben im Kern benannt — „erst hier, dann im Code“), etwa: „… (Einzelheiten: `docs/architektur/lokale-dateien.md`):
     `~/.ai-workforce/faehigkeiten.lokal.json`, `…/plugin-kopien/<plugin-id>/<kopie_hash>/` und `…/_lauf/<lauf_kopie_hash>/`,
     `~/.ai-workforce/faehigkeiten.stand.json`.“ ⇒ ≈ 16 680 Bytes, ≈ 1 100 Bytes Luft.
   - Warum §2 und nicht §3/§4: §4 und §3 tragen Wortlaut, den vier Gates prüfen; §2 hat keinen Wortlaut-Test, eine Detaildatei
     mit dem Volltext existiert, und die Projektkarte ändert sich nicht (§2 bleibt > 2 000 Zeichen ⇒ gleicher Auszug, §7 bei
     8 620). Einzelregeln mit Durchsetzungsgrad stehen in diesen Unterpunkten nicht.
4. **Register und Akte**:
   - Neu am Ende von `state/findings.md`: **F-1242** · `TECH_DEBT` · P2 · erledigt (F45 W2d) — „ARCHITECTURE.md hatte nur noch
     7 Bytes Luft (17 793/17 800)“, Fundstelle, Auswirkung (jeder Satz im Kern zwang zum Auslagern), Maßnahme (W2d: §2-Unterpunkte
     nach `lokale-dateien.md`, Kern danach x Bytes).
   - Akte: Workstreams-Zeile W2, Notiz: „W2c-1 Ratschen + Formatierer“ → „W2c-1 Ratschen + Formatierer (#391), erledigt; W2d
     Doku-Diät“ (Status der Zeile bleibt `laeuft`). Neuer Abschnitt `## Stand W2d` am Ende. Unter `## Entscheidungen` am Ende eine
     Zeile: „Sichtung des offenen Registerbestands (vor allem 363 P3) wandert in die P1-Sichtung vor F30 (Challenger, 28.10.2026,
     W2d).“
5. **Byte-Kontrolle** per Skript (Scratchpad, Ausgabe im Bericht):
   - Register + Archiv: Blockmenge vorher = nachher (je Block ohne abschließende Leerzeilen verglichen), plus F-1242 neu;
     Reihenfolge Register erhalten, Archiv = alter Bestand + 25 in Registerreihenfolge; Kopf beider Dateien byte-gleich.
   - Akte + Akten-Archiv: jeder `## `-Abschnitt der Akte vorher steht nachher byte-gleich in Akte oder Archiv; geändert nur
     `## Workstreams` (eine Notiz) und `## Entscheidungen` (eine Zeile angehängt); neu `## Stand W2d` und der Kopfabsatz.
   - ARCHITECTURE: die verschobenen 1 284 Bytes stehen byte-gleich in `lokale-dateien.md`.

## Prüfung (E-PRUEF-2 B, lokal)

`npm run lint`, `npm run typecheck`, `npm run test`, `node scripts/erzeuge-lagebild.mjs --check`, check-f21-workboard,
check-f45-k-kontext, check-ratsche, check-docs, check-rules, check-status-akten, check-feature, check-akte-meilenstein,
check-contract, check-f45-b2a1-projektkarte, check-f45-b5a1-akte, check-f45-b5a2-akte-anzeige, check-f45-b5b1a-planung,
check-f45-b5b1b2-bereinigung, check-f15-workflow, check-f15-automat-real; zusätzlich (Wortlaut am Kern)
check-f45-b2b3b1b-auswertung, check-f45-b2b3b2b1b-r1, check-f45-b2b3b2b1a-rest, check-f45-b2b3b2a-absicherung, check-wachstumsbremse-server.

## Risiken

- Ein Gate zählt Einträge oder Zeilen des Registers als feste Zahl ⇒ rot; dann STOPP und melden (nicht anpassen).
- Der Kopfabsatz der Akte stört einen Parser (check-feature, akte-schreiben) ⇒ Absatz als HTML-Kommentar oder unter `## ID`
  vermeiden; erst prüfen.
- Kommentarverweise („Stand W2a“, „Stand B5b-2c-1“) zeigen danach auf das Archiv — der Kopfhinweis der Akte trägt das; keine
  Codeänderung.

## Nicht im Umfang

Finding-Texte, Status, P3-Sichtung, andere Akten, Grenzen, Produktverhalten, `docs/STATUS.md`.
