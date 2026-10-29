# Nachweis F45 B3b-2a-1 „Render-Nachweis im Lauf: Kern + API + Skelett“

Stand 29.10.2026, Branch `feature/f45-b3b2a-render-im-lauf`, Basis main `12d5ee9`. Plan `features/F45/plan-b3b2a-v2.md`,
Advisor `features/F45/advisor-b3b2a.md` (zu groß ⇒ Schnitt, Stefan), Delta `features/F45/advisor-b3b2a-delta.md`
(Freigegeben mit Hinweisen). Karte in der Abnahme: B3b-2a-2.

## Was der Kern jetzt tut

Nach einem Lauf der Rolle `ausfuehrung` mit Ergebnis ERFOLGREICH im Arbeitsordner, grünem Prüfschritt und `render.json`
in der Wurzel des Arbeitsordners: `git check-ignore .render-nachweis/` (lesend) ⇒ `npm run check:render`
(`[node, npm-cli.js, 'run', 'check:render']`, 180 s, ohne `LEITSTAND_*`) ⇒ Artefakt `render-nachweis-<laufId>` im
Prüfergebnis-Schema v0. Nicht ignoriert ⇒ kein Lauf, FEHLER „nicht ausgeführt: .render-nachweis/ steht nicht in
.gitignore — Zeile .render-nachweis/ in .gitignore ergänzen“; kein Skript `check:render` in der package.json ⇒ FEHLER
statt ROT (QA M2). Kein Halt, keine Korrekturrunde. GET …/abnahme liefert `renderNachweis` (`ok` mit ergebnis, dauer_ms,
ausgabe_ende (letzte 40 Zeilen), gestartet_am — sonst `fehlt`).

## Belege (Tests)

| Fall | Test |
|---|---|
| Fälligkeit: nur Ausführung im Arbeitsordner, nur GRUEN, render.json als Datei | `src/pruefschritt/render.test.ts` |
| nicht ignoriert ⇒ FEHLER mit Grund, kein Prozess; kein git-Repo ⇒ FEHLER „nicht auswertbar“; kein Skript check:render ⇒ FEHLER, kein Prozess; ZEITGRENZE | `src/pruefschritt/render.test.ts` |
| Stub GRUEN/ROT, argv-Form node + npm-cli.js + run check:render, werfender Rückruf ⇒ Meldung statt Wurf | `src/pruefschritt/render.test.ts` |
| Arbeitsordner, echtes `npm run check:render` (Stub exit 1) ⇒ ROT, Ablauf ABGESCHLOSSEN, `renderNachweis` ok/ROT | `scripts/render-im-lauf.test.mjs` |
| D13: während des Renders (Prüfergebnis schon da) ⇒ 409 „noch aktiv (D13)“, danach „bereits vergeben“ (frei, ohne zweiten Lauf) | `scripts/render-im-lauf.test.mjs` |
| Projektordner mit render.json ⇒ kein Render, `renderNachweis` fehlt | `scripts/render-im-lauf.test.mjs` |
| VERWEIGERT ohne Bypass-Verdacht ⇒ Prüfschritt ja, Render nein | `scripts/render-im-lauf.test.mjs` |
| Projektionen (vier Status, versionSequenz; ok/fehlt, 40 Zeilen, schemawidrig oder Laden wirft ⇒ fehlt, exakte Kennungen) | `scripts/leitstand/abnahme-pruefung.test.mjs` |
| Skelett F-1262: LCP nicht messbar ⇒ Hinweis, Bytes-Budget bleibt Befund; Protokoll nur mit Hinweisen grün; Gründe auf stdout (QA M1) | `scripts/skelett-render-nachweis.test.mjs` |

Mutationsprobe: mit dem Prädikat `laufort?.loeschliste === true` (ohne Arbeitsordner/ERFOLGREICH) werden die Fälle
Projektordner und VERWEIGERT rot; mit dem gebauten Prädikat grün.

## Leser-Isolation

Alle Leser von Prüfergebnissen lesen die exakte Kennung `pruefergebnis-<laufId>` (Regel 1f, Halt-Grund, „Prüfung
wiederholen“, Abnahme, Detail, `pruefergebnis-@`, Harness-Abgleich); kein Präfix-Scan. `render-nachweis-<laufId>` liest
nur `projiziereRenderNachweis`.

## Zeilenbilanz W1

`scripts/leitstand-server.mjs` 13 198 ⇒ 13 176 (beide Prüfergebnis-Projektionen nach `scripts/leitstand/abnahme-pruefung.mjs`
ausgelagert; +2 Importe, Nachlauf, Prädikat als eine Konstante für Löschliste und Render, +1 Abnahme-Feld); Grenze in
`scripts/wachstumsbremse-server.json` gesenkt.

## DEKLARIERT / Grenzen

- Kill des Prozessbaums bei ZEITGRENZE best effort (F-181); der Render ist nicht abbrechbar (bis zu 180 s belegt).
- Build in `check:render`: Build-Ausgabe in `.gitignore` nur deklariert (Gate-Vorlage), erzwungen ist `.render-nachweis/`.
- Kein Render nach „Prüfung wiederholen“ (F-1271); Altprojekte ohne Eintrag bekommen den Grund (F-1267); Restpunkte
  aus QA/Review in F-1272.
- Kein echter Browserlauf in diesem Paket (Stub); der Browserlauf des Skelett-Skripts ist in `features/F45/nachweise/b3b1/` belegt.
