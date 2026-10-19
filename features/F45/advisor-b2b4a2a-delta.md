# Delta-Advisor-Pass F45 B2b-4a-2a „Blockform“ — Plan v2

Geprüft: `features/F45/plan-b2b4a2a.md` gegen `7a56d86`, Vorgänger `advisor-b2b4a2.md`. Subagent `architecture-advisor`, frischer
Kontext, nur Read/Grep/Glob, 19.10.2026. Inhaltlich übernommen, gestrafft. Nichts ausgeführt.

## Abgleich

- V4 und Bauauflagen 3, 4, 7, 9 (soweit 4a-2a) eingearbeitet; `code-daten.test.mjs` Z. 100/102/107/114 bleiben mit `slice(2, -1)` gültig.
- Golden-Liste vollständig [Fakt]: Suche nach `cd '`, `cd &#39;`, `startsWith('cd`, `sicherBefehle`/`pruefstandBefehle`, `befehlsblock` in
  `public/`, `scripts/`, `src/` findet nur die fünf Dateien und Jarvis (`check-f45-b2a3-codex-review.mjs:205/230`, `jarvis.test.ts:186`).
- Import-Richtung `befehlsblock.js → code-daten.js` unbedenklich [Fakt]: `code-daten.js` importiert nichts, kein DOM beim Import; Server
  importiert weiter nur `cdZeile` (`leitstand-server.mjs:535`, `:4950`).
- Gate (b) trägt (Verhalten belegt `nachweise/b2b4a1/powershell-versuch.md:32-35`); Rotfall ohne `-ErrorAction Stop` trennt.
- Enter-Hinweis an der Form (eine Quelle `istBlockform`) richtig; Klasse `befehlsblock-enter` getrennt von `.befehlsblock-hinweis` (Strg+C).
- Zuschnitt passt.

## Vor dem Bau (Planklarstellung, kein neuer Pass)

1. Ausnahmen in Gate (a) widersprechen sich [Fakt]: `code-daten.js:169` enthält selbst `` `cd ``, `code-daten.test.mjs:120-124` ruft
   `cdZeile(` — Quelltextprüfungen auf `public/leitstand/views/**` und `befehlsblock.js` beschränken; `code-daten.js` decken die
   Verhaltensproben ab.

## Mitlaufen

2. `zaehleBefehle` zieht Kopf/Fuß nur bei `istBlockform` ab (sonst zählt jede `}` im Chat nicht, z. B. `if`, JSON); `istBlockform` getrimmt.
3. Fall (d) vor §1.2 ausführen.
4. `auftrag-umgebung.test.mjs`: Fall mit relativem `absoluterPfad` ⇒ kein Block (`basis` ist jeder String, `auftrag-umgebung.js:183`).
5. `routen-code.test`: `$LASTEXITCODE` meldet nur die letzte Zeile — Prüfung über `porcelain` trägt, zusätzlich stderr ohne `fatal:`.
6. Serverkommentar `leitstand-server.mjs:4945` („die eine Quelle der Befehlsblöcke“) veraltet — Kommentar ohne neue Zeile oder für 4b vormerken.
7. Grenze im Bericht: „Nächste Schritte“ (`projekte-uebersicht.js:453`, Server `:8673`) sind kein Befehlsblock. „Alle Leitstand-Blöcke“
   = alle `renderBefehlsblock`-Erzeuger (`code.js:232`, `workboard.js:777`, `auftrag-umgebung.js:249`).
8. Meldung `check-f45-b2a3b-review-stand.mjs:207` („erste Zeile cd“) mit umstellen.

## Urteil: Freigegeben mit Hinweisen

## Nächster sinnvoller Schritt

§3 präzisieren (1), Fall (d) zuerst, dann bauen; 2–8 als Bauauflagen.
