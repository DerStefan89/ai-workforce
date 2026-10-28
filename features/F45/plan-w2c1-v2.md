# F45 W2c-1 — Ratschen + Formatierer für neue Dateien — Plan v2 (Delta zu v1)

Stand 28.10.2026. Grundlage: `plan-w2c1.md` (v1, unverändert), `advisor-w2c1.md` (Nicht freigegeben, kein Schnitt).
Entscheidung Stefan **E-RATSCHE-1 = A** (28.10.2026): `public/leitstand/i18n/*.js` aus der Dateigrenze ausgenommen
(Daten, kein Code; Lint, Formatierer und checkJs-Regeln gelten weiter). Alles nicht Genannte gilt wie in v1.

| Befund | Änderung gegenüber v1 |
|---|---|
| 1 i18n | Dateigrenze nimmt `scripts/leitstand-server.mjs` (W1) und `public/leitstand/i18n/*.js` (E-RATSCHE-1) aus — Konstante `AUSGENOMMEN_ZEILEN` im Gate. Die übrigen 38 Dateien > 800 eingefroren; die großen Views (`workboard.js` 2 375, `chat.js` 2 076, …) sind ab jetzt zeilenneutral zu ändern — Risiko in Akte und Gate-Kopf. |
| 2 Ersterhebung | `--aktualisiere` startet vom lokalen Bestand; fehlt er, von der Referenz-JSON (min(Referenz, Ist)); nur wenn **beide** fehlen, Ersterhebung — und auch dann nur Einträge für Dateien, die auf der merge-base existieren. Neue Paketdateien bekommen nie einen Eintrag (müssen sauber sein). Reihenfolge im Bau: neue Dateien zuerst formatieren und befundfrei machen, dann erheben. Ohne lesbare merge-base keine Ersterhebung (rot). |
| 3 Ausgaben | Werkzeuge per `execFileSync(process.execPath, [bin, …], { maxBuffer: 64 MiB })`; Exit ≠ 0 mit gültiger Ausgabe ist normal. Vollständigkeit: Anzahl Diagnosen = `summary.errors + warnings + infos` und `diagnosticsNotPrinted = 0`, sonst rot. Ausgewertet werden nur Code-Dateien; in Code-Dateien ist jede Kategorie außer `lint/*` und `format` (z. B. `parse`, `suppressions/*`, zu groß) rot. tsc: Zeile `error TS…` ohne Pfad ⇒ rot. Kalibrierung: Test lässt das echte Biome auf einem Wegwerf-Ordner (`scripts/_wegwerf.ts`, Kopie der echten `biome.json`) mit einer Datei mit bekanntem Befund und einer unformatierten Datei laufen; tsc-Parser an mitgeschnittenen echten Zeilen. |
| 4 Kopplung | Code-Dateien = `git ls-files -z --cached --others --exclude-standard` (wie `teste.mjs`), Muster `CODE_MUSTER` (`scripts/**/*.{ts,mjs,js}`, `src/**/*.{ts,mjs,js}`, `public/**/*.{js,mjs}`); `biome.json` bekommt `vcs` (`enabled`, `clientKind: git`, `useIgnoreFile: true`) ⇒ gleiche Grundlage. Test: jede Code-Datei liegt in `biome.json` `files.includes` (Umfang gekoppelt). Ohne git ⇒ rot (keine Dateiliste). |
| 5 Schlupflöcher | `grenze_zeilen` entfällt aus der JSON, Konstante `GRENZE_ZEILEN = 800` im Gate. DEKLARIERT im Gate-Kopf und ARCHITECTURE-Satz: Bearbeiten von Gate, JSON, `biome.json`, `tsconfig.checkjs.json` und Unterdrückungen im Code (`biome-ignore`, `@ts-nocheck`, `@ts-expect-error`). |
| 6 Folgekosten | Risiko benannt (Gate-Kopf, Akte): neue Module unter `scripts/leitstand/` brauchen 0 checkJs-Fehler, Formatierung, Komplexität ≤ 15; Verschieben komplexer Funktionen in Bestandsdateien erhöht deren Zählung. |
| 7 Autofix | **Gestrichen.** Kein Eingriff in Bestandscode. |
| 8 (g4) | **Gestrichen.** `--aktualisiere` nimmt formatierte Dateien auf; das Gate meldet sie nur als Hinweis. |
| 9 Referenz | Eigene Funktion; (g3) liest `git ls-tree -r --name-only <merge-base>` immer an der merge-base, nie an der Spitze. Dritte Kopie der Referenzlogik als Finding für W2 (F-1241). |
| 10 zaehleZeilen | Kopiert (4 Zeilen), kein Import aus dem W1-Gate. Gate hat nur `node:`-Importe. |
| 11 Lint-Schwere | Wie v1. ARCHITECTURE-Satz: „ERZWUNGEN durch `check-ratsche`“ (alle Schweren), warn/error zusätzlich durch `npm run lint`. |
| 12 Deckel | Kopfkommentar von `ARCHITECTURE.md` Z. 2-8 (Marker `[FÜLLUNG — GANZE DATEI]`, „Fülle sie erst …“) streichen (≈ 350 Bytes, F-015 Nachtrag); Aufteilungsregel bleibt. Neue `docs/architektur/ratsche.md` ohne Versionsnummern, Rückverweis aus §6. Keine Deckel-Entscheidung nötig. |
| 13 | `tsconfig.checkjs.json` (Arbeitsbaum, ungetrackt) ist die Endfassung. |
| 14 Bedienung | Rotmeldung (g3)/(g1) nennt `npx biome format --write <datei>`; Umbenennen einer Bestandsdatei: Ausweg „Bestand anheben nur mit Entscheidung Stefans, (c) bewusst einmal rot“ (Gate-Kopf, Detaildatei). DEKLARIERT: checkJs-Zählung einer gelisteten Datei kann sich durch Änderungen an importierten `public/leitstand/*.js` ändern. |

## Prüfregeln (endgültig)

(a) Ist > Bestand · (b) Ist < Bestand (senken) · (c) Bestandswert > merge-base (fehlt dort = 0) · (d) Listeneintrag der
merge-base fehlt, Datei existiert · (e) Befund/Datei ohne Eintrag (= (a) mit Bestand 0) · (f) JSON fehlt/kaputt/Form,
Werkzeugausgabe unvollständig oder fremde Kategorie · (g1) gelistete Datei unformatiert · (g2) gelisteter Pfad ohne Datei ·
(g3) Code-Datei nicht auf der merge-base und nicht in der Liste. Ohne Referenz: (c)/(d)/(g3) „nicht geprüft“ (Hinweis).

## Findings (Auftrag Punkt 6 + Advisor)

F-1235..F-1240 wie beauftragt; zusätzlich F-1241 TECH_DEBT P3: dritte Kopie der merge-base-Referenzlogik (W1-Gate,
`check-f45-k-kontext`, `check-ratsche`) — in W2 zusammenführen.
